import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useApp } from '../context/AppContext';
import { soundManager } from '../utils/audio';

export const AuthModal: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [refId, setRefId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useApp();

  useEffect(() => {
    // 1. Check window.Telegram WebApp start_param if running in Telegram Bot Mini App
    const tgStartParam = (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param;
    if (tgStartParam) {
      setRefId(tgStartParam);
      setIsLogin(false);
      return;
    }

    // 2. Check URL search params
    const searchParams = new URLSearchParams(window.location.search);
    const refFromQuery = searchParams.get('ref') || searchParams.get('startapp') || searchParams.get('tgWebAppStartParam');
    if (refFromQuery) {
      setRefId(refFromQuery);
      setIsLogin(false);
      return;
    }

    // 3. Check hash string (common in Telegram mini apps & GitHub SPA routers)
    const hash = window.location.hash;
    if (hash.includes('ref=')) {
      const hashParts = hash.split('ref=')[1]?.split('&')[0];
      if (hashParts) {
        setRefId(hashParts);
        setIsLogin(false);
        return;
      }
    }
  }, []);

  const getRandomColor = () => {
    const colors = ["#FFD700", "#FF3366", "#33CCFF", "#9933FF", "#00FF99"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (isLogin) {
        soundManager.playPop();
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        showToast("Authentication Successful");
      } else {
        soundManager.playPop();
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const newUser = userCred.user;

        // Check if this is the special preset account (momin@gmail.com)
        const isSpecialMomin = cleanEmail === 'momin@gmail.com';

        // Initialize user document in Firestore
        const userDocRef = doc(db, 'users', newUser.uid);
        const newProfileData = {
          uid: newUser.uid,
          name: fullName.trim() || (isSpecialMomin ? "Momin" : "User"),
          email: newUser.email,
          balance: isSpecialMomin ? 765 : 0,
          totalWithdraw: 0,
          todayReferrals: 0,
          isVerified: isSpecialMomin ? true : false,
          referrerUid: refId || null,
          lastClaimDate: null,
          availableClaims: isSpecialMomin ? 30 : 7,
          avatarColor: getRandomColor(),
          spinsUsed: 0,
          currency: 'BDT',
          createdAt: new Date().toISOString()
        };

        try {
          localStorage.setItem(`cached_profile_${newUser.uid}`, JSON.stringify(newProfileData));
        } catch {}

        try {
          await setDoc(userDocRef, newProfileData);
        } catch (dbErr) {
          console.warn("User profile write notice:", dbErr);
        }

        // If registered via a referral link, increment referrer's todayReferrals counter
        if (refId) {
          try {
            const referrerRef = doc(db, 'users', refId);
            const refSnap = await getDoc(referrerRef);
            if (refSnap.exists()) {
              await updateDoc(referrerRef, {
                todayReferrals: increment(1)
              });
            }
          } catch (refErr) {
            console.warn("Could not update referrer count:", refErr);
          }
        }

        showToast("Registration Successful");
      }
    } catch (err: any) {
      const msg = err?.message?.replace('Firebase: ', '') || "Authentication error";
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-[10%] left-[20%] w-64 h-64 bg-gold/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] right-[20%] w-64 h-64 bg-slate/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm glass-panel p-8 rounded-[2rem] border-white/5 relative z-10"
      >
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-yellow-600 flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.3)]">
            <Shield className="text-black w-8 h-8" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-white mb-1 tracking-tight">BINANCE CLOUD</h1>
        <p className="text-slate text-center text-sm mb-8">Official Task &amp; Earning Cloud</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && refId && (
            <div>
              <label className="text-[10px] uppercase text-gold font-bold tracking-widest pl-1 mb-1 block">
                Referral Inviter ID
              </label>
              <input
                id="auth-ref-id-input"
                type="text"
                value={refId}
                readOnly
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none opacity-70 cursor-not-allowed text-xs font-mono"
              />
            </div>
          )}

          {!isLogin && (
            <div>
              <input
                id="auth-fullname-input"
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate/50 focus:outline-none focus:border-gold transition-colors"
              />
            </div>
          )}

          <div>
            <input
              id="auth-email-input"
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate/50 focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div>
            <input
              id="auth-password-input"
              type="password"
              placeholder="Secure Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate/50 focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full gold-gradient py-4 rounded-xl font-bold uppercase tracking-wider text-black shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:brightness-110 active:scale-95 transition-all mt-6 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Processing..." : (isLogin ? "Sign In" : "Create Account")}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            id="auth-switch-mode-btn"
            type="button"
            onClick={() => {
              soundManager.playPop();
              setIsLogin(!isLogin);
            }}
            className="text-slate hover:text-white text-xs transition-colors cursor-pointer"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
