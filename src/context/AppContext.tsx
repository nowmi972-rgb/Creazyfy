import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, collection, query, where, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { soundManager } from '../utils/audio';

interface ToastState {
  message: string;
  isVisible: boolean;
}

interface AppContextType {
  user: User | null;
  profile: UserProfile | null;
  authReady: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isVerificationDeposit: boolean;
  setVerificationDeposit: (val: boolean) => void;
  toast: ToastState;
  showToast: (msg: string) => void;
  hideToast: () => void;
  signOut: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isVerificationDeposit, setVerificationDeposit] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState>({ message: '', isVisible: false });

  const showToast = (message: string) => {
    setToast({ message, isVisible: true });
    setTimeout(() => {
      setToast({ message: '', isVisible: false });
    }, 2500);
  };

  const hideToast = () => {
    setToast({ message: '', isVisible: false });
  };

  const signOut = async () => {
    soundManager.playPop();
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.warn("Sign out error:", err);
    }
    setUser(null);
    setProfile(null);
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user) return;
    
    // Always update local state & cache immediately for responsive UI
    setProfile(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      try {
        localStorage.setItem(`cached_profile_${user.uid}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, data);
    } catch (err) {
      console.warn("Firestore update notice (saved to local cache):", err);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);

        // Check for locally cached profile first
        const cacheKey = `cached_profile_${currentUser.uid}`;
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          try {
            const cachedProfile = JSON.parse(cachedRaw) as UserProfile;
            setProfile(cachedProfile);
          } catch {}
        }

        const isSpecialMomin = currentUser.email === 'momin@gmail.com';

        const unsubscribeProfile = onSnapshot(userDocRef, async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as UserProfile;
            
            // Special rule for momin@gmail.com
            if (isSpecialMomin) {
              if (!data.isVerified || (data.balance ?? 0) < 765) {
                const patch: Partial<UserProfile> = {
                  isVerified: true,
                  balance: Math.max(data.balance ?? 0, 765),
                  availableClaims: Math.max(data.availableClaims ?? 0, 30)
                };
                try {
                  await updateDoc(userDocRef, patch);
                } catch {}
                const fullUpdated = { ...data, ...patch };
                setProfile(fullUpdated);
                localStorage.setItem(cacheKey, JSON.stringify(fullUpdated));
                setAuthReady(true);
                return;
              }
            }
            
            setProfile(data);
            localStorage.setItem(cacheKey, JSON.stringify(data));
          } else {
            // Profile document doesn't exist in Firestore yet
            const defaultUser: UserProfile = {
              uid: currentUser.uid,
              name: isSpecialMomin ? "Momin" : (currentUser.displayName || currentUser.email?.split('@')[0] || "User"),
              email: currentUser.email || "",
              balance: isSpecialMomin ? 765 : 0,
              totalWithdraw: 0,
              todayReferrals: 0,
              isVerified: isSpecialMomin ? true : false,
              referrerUid: null,
              lastClaimDate: null,
              availableClaims: isSpecialMomin ? 30 : 7,
              avatarColor: "#FFD700",
              spinsUsed: 0,
              currency: 'BDT',
              createdAt: new Date().toISOString()
            };
            try {
              await setDoc(userDocRef, defaultUser);
            } catch (createErr) {
              console.warn("Could not save initial profile to Firestore (using local state):", createErr);
            }
            setProfile(defaultUser);
            localStorage.setItem(cacheKey, JSON.stringify(defaultUser));
          }
          setAuthReady(true);
        }, (error) => {
          console.warn("Firestore user profile snapshot notice (using local profile):", error);
          
          // Fallback to local profile when Firestore permissions are restricted
          setProfile(prev => {
            if (prev) return prev;
            const fallback: UserProfile = {
              uid: currentUser.uid,
              name: isSpecialMomin ? "Momin" : (currentUser.displayName || currentUser.email?.split('@')[0] || "User"),
              email: currentUser.email || "",
              balance: isSpecialMomin ? 765 : 0,
              totalWithdraw: 0,
              todayReferrals: 0,
              isVerified: isSpecialMomin ? true : false,
              referrerUid: null,
              lastClaimDate: null,
              availableClaims: isSpecialMomin ? 30 : 7,
              avatarColor: "#FFD700",
              spinsUsed: 0,
              currency: 'BDT',
              createdAt: new Date().toISOString()
            };
            localStorage.setItem(cacheKey, JSON.stringify(fallback));
            return fallback;
          });
          setAuthReady(true);
        });

        // Listen for approved verification deposits to auto-verify
        let unsubscribeDeposits = () => {};
        try {
          const depQuery = query(
            collection(db, 'deposits'),
            where('uid', '==', currentUser.uid),
            where('type', '==', 'verification'),
            where('status', '==', 'approved')
          );

          unsubscribeDeposits = onSnapshot(depQuery, async (depSnap) => {
            if (!depSnap.empty) {
              try {
                const snap = await getDoc(userDocRef);
                if (snap.exists() && !snap.data()?.isVerified) {
                  await updateDoc(userDocRef, { isVerified: true });
                }
              } catch {}
              setProfile(p => p ? { ...p, isVerified: true } : null);
            }
          }, (err) => {
            console.warn("Deposits listener notice:", err);
          });
        } catch (err) {
          console.warn("Deposits setup notice:", err);
        }

        return () => {
          unsubscribeProfile();
          unsubscribeDeposits();
        };
      } else {
        setProfile(null);
        setAuthReady(true);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        profile,
        authReady,
        activeTab,
        setActiveTab,
        isVerificationDeposit,
        setVerificationDeposit,
        toast,
        showToast,
        hideToast,
        signOut,
        updateProfileData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
