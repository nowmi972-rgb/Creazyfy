import React, { useState, useEffect } from 'react';
import { 
  BadgeCheck, 
  ShieldAlert, 
  Users, 
  Crown, 
  Save, 
  Globe, 
  ExternalLink, 
  LogOut 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CURRENCIES } from '../utils/currencies';
import { soundManager } from '../utils/audio';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const ProfileTab: React.FC = () => {
  const { profile, showToast, signOut, updateProfileData } = useApp();
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [referrerName, setReferrerName] = useState('Loading...');
  const [teamMembersCount, setTeamMembersCount] = useState(0);
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false);

  useEffect(() => {
    if (profile?.name) {
      setDisplayName(profile.name);
    }
  }, [profile?.name]);

  // Fetch referrer name and direct referral count
  useEffect(() => {
    if (!profile) return;

    const fetchRefData = async () => {
      try {
        if (profile.referrerUid) {
          const refDoc = await getDoc(doc(db, 'users', profile.referrerUid));
          if (refDoc.exists()) {
            setReferrerName(refDoc.data()?.name || 'Unknown');
          } else {
            setReferrerName('None');
          }
        } else {
          setReferrerName('None');
        }

        const teamQuery = query(
          collection(db, 'users'),
          where('referrerUid', '==', profile.uid)
        );
        const teamSnap = await getDocs(teamQuery);
        setTeamMembersCount(teamSnap.size);
      } catch (err) {
        console.warn("Referral data notice:", err);
      }
    };

    fetchRefData();
  }, [profile?.uid, profile?.referrerUid]);

  const handleSaveName = async () => {
    if (!profile || !displayName.trim() || displayName.trim() === profile.name) return;

    setIsSaving(true);
    try {
      soundManager.playPop();
      await updateProfileData({ name: displayName.trim() });
      showToast("Display Name Updated Successfully");
    } catch {
      showToast("Error updating name");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCurrencyChange = async (newCode: string) => {
    if (!profile || newCode === (profile.currency || 'BDT')) return;

    setIsUpdatingCurrency(true);
    try {
      soundManager.playPop();
      await updateProfileData({ currency: newCode });
      showToast(`Currency updated to ${newCode}`);
    } catch {
      showToast("Error updating currency");
    } finally {
      setIsUpdatingCurrency(false);
    }
  };

  return (
    <div className="p-4 space-y-6 pt-6 relative pb-32">
      {/* Avatar & Verification Badge */}
      <div className="flex flex-col items-center mb-8 relative">
        <div className="absolute inset-0 top-1/2 -z-10 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute -top-10 w-48 h-48 bg-white/5 blur-[50px] rounded-full pointer-events-none z-[-1]" />

        <div
          className="w-32 h-32 rounded-[2.5rem] flex items-center justify-center font-black text-5xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-2 border-white/10 mb-4 transform rotate-3 relative overflow-hidden text-white"
          style={{
            background: `linear-gradient(135deg, ${profile?.avatarColor || '#333'} 0%, #000000 150%)`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent mix-blend-overlay" />
          <span className="relative z-10 drop-shadow-lg">
            {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-2">
          {profile?.isVerified ? (
            <span className="bg-gradient-to-r from-blue-500/20 to-blue-500/5 text-blue-400 text-xs font-bold px-4 py-1.5 rounded-full border border-blue-500/30 flex items-center gap-1.5 shadow-[0_0_20px_rgba(59,130,246,0.15)] backdrop-blur-md">
              <BadgeCheck className="w-4 h-4" /> VERIFIED
            </span>
          ) : (
            <span className="bg-[#0A0A0A] text-slate text-xs font-bold px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 shadow-inner">
              <ShieldAlert className="w-4 h-4" /> UNVERIFIED
            </span>
          )}
        </div>
      </div>

      {/* Referral Team & Leader Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 blur-[20px] rounded-full" />
          <Users className="w-6 h-6 text-blue-400 mb-2 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          <span className="text-white text-xl font-black">{teamMembersCount}</span>
          <span className="text-[10px] text-slate font-bold uppercase tracking-widest mt-1">
            Ref Members
          </span>
        </div>

        <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute -top-4 -left-4 w-16 h-16 bg-gold/10 blur-[20px] rounded-full" />
          <Crown className="w-6 h-6 text-gold mb-2 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]" />
          <span className="text-white text-sm font-bold truncate w-full px-2" title={referrerName}>
            {referrerName}
          </span>
          <span className="text-[10px] text-slate font-bold uppercase tracking-widest mt-1">
            Ref Leader
          </span>
        </div>
      </div>

      {/* Account Info Form */}
      <div className="bg-[#0A0A0A] p-6 rounded-[2rem] space-y-6 border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="relative">
          <label className="text-slate/60 text-[10px] uppercase font-bold tracking-widest mb-2 block pl-2">
            Display Name
          </label>
          <div className="flex gap-2">
            <input
              id="profile-display-name-input"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="flex-1 bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:outline-none focus:border-white/30 transition-colors shadow-inner"
            />
            <button
              id="save-display-name-btn"
              onClick={handleSaveName}
              disabled={isSaving || displayName.trim() === profile?.name}
              className="bg-white text-black p-4 rounded-2xl hover:scale-105 active:scale-95 disabled:opacity-30 transition-all font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:shadow-none cursor-pointer"
            >
              <Save className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="relative">
          <label className="text-slate/60 text-[10px] uppercase font-bold tracking-widest mb-2 block pl-2">
            Registered Email
          </label>
          <div className="w-full bg-black/30 border border-transparent rounded-2xl px-5 py-4 text-white/50 font-medium truncate">
            {profile?.email}
          </div>
        </div>

        <div className="relative">
          <label className="text-slate/60 text-[10px] uppercase font-bold tracking-widest mb-2 block pl-2">
            Unique Identity (UID)
          </label>
          <div className="w-full bg-black/30 border border-transparent rounded-2xl px-5 py-4 text-slate/40 font-mono text-xs overflow-x-auto">
            {profile?.uid}
          </div>
        </div>

        <div className="relative">
          <label className="text-slate/60 text-[10px] uppercase font-bold tracking-widest mb-2 block pl-2">
            Display Currency
          </label>
          <div className="flex bg-black/50 border border-white/10 rounded-2xl p-1 relative items-center">
            <Globe className="w-5 h-5 text-slate absolute left-4 pointer-events-none" />
            <select
              id="currency-select"
              className="w-full bg-transparent appearance-none text-white font-bold pl-12 pr-5 py-3 outline-none cursor-pointer"
              value={profile?.currency || 'BDT'}
              onChange={e => handleCurrencyChange(e.target.value)}
              disabled={isUpdatingCurrency}
            >
              {CURRENCIES.map(curr => (
                <option key={curr.code} value={curr.code} className="bg-[#0A0A0A] text-white">
                  {curr.code} - {curr.name} ({curr.symbol})
                </option>
              ))}
            </select>
            {isUpdatingCurrency && (
              <div className="absolute right-4 w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            )}
          </div>
        </div>
      </div>

      {/* Info & Legal Buttons */}
      <div className="bg-[#0A0A0A] p-2 rounded-[1.5rem] mt-6 border border-white/5 shadow-2xl">
        <button
          id="terms-service-btn"
          onClick={() => showToast("Aviator Terms of Service (Version 2.4)")}
          className="w-full px-5 py-4 flex items-center justify-between text-slate hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
        >
          <span className="text-xs font-bold uppercase tracking-wider">Terms of Service</span>
          <ExternalLink className="w-4 h-4" />
        </button>
        <div className="w-full h-[1px] bg-white/5 my-1" />
        <button
          id="privacy-policy-btn"
          onClick={() => showToast("Aviator Privacy Policy Protected")}
          className="w-full px-5 py-4 flex items-center justify-between text-slate hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
        >
          <span className="text-xs font-bold uppercase tracking-wider">Privacy Policy</span>
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Sign Out Button */}
      <div className="pt-6 pb-20 space-y-4">
        <button
          id="logout-account-btn"
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600/10 to-red-500/10 text-red-500 py-5 rounded-2xl font-black tracking-widest hover:from-red-600/20 hover:to-red-500/20 border border-red-500/20 transition-all active:scale-[0.98] uppercase text-sm cursor-pointer"
        >
          <LogOut className="w-5 h-5" /> Secure Logout
        </button>
      </div>
    </div>
  );
};
