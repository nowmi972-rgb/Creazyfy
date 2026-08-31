import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  BadgeCheck, 
  Bell, 
  CircleHelp, 
  Copy, 
  Gift, 
  ShieldAlert,
  Compass,
  MapPin,
  Sparkles,
  Share2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { soundManager } from '../utils/audio';
import { formatCurrency } from '../utils/currencies';
import { LuckBoard } from './LuckBoard';
import { NotificationModal } from './NotificationModal';
import { PAYMENT_PARTNERS } from '../utils/paymentPartners';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const HomeTab: React.FC = () => {
  const { profile, showToast, setActiveTab, setVerificationDeposit, updateProfileData } = useApp();
  const [claimSecondsLeft, setClaimSecondsLeft] = useState<number>(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [topReferrers, setTopReferrers] = useState<Array<{ name: string; count: number }>>([
    { name: "Jahid Hasan", count: 48 },
    { name: "Rakib Ahmed", count: 42 },
    { name: "Sajid Khan", count: 37 },
    { name: "Tanvir Rahman", count: 29 },
    { name: "Mehedi Hasan", count: 24 }
  ]);

  // Real-time top referrers listener from Firestore (with fallback)
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const usersCol = collection(db, 'users');
      unsubscribe = onSnapshot(usersCol, (snapshot) => {
        const liveList: Array<{ name: string; count: number }> = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.todayReferrals && data.todayReferrals > 0) {
            liveList.push({
              name: data.name || 'Anonymous',
              count: data.todayReferrals
            });
          }
        });

        if (liveList.length > 0) {
          liveList.sort((a, b) => b.count - a.count);
          setTopReferrers(liveList.slice(0, 5));
        }
      }, (err) => {
        console.warn("Top referrers notice (using fallback list):", err);
      });
    } catch (err) {
      console.warn("Top referrers initialization notice:", err);
    }

    return () => unsubscribe();
  }, []);

  // Timer for daily bonus claim
  useEffect(() => {
    if (!profile?.lastClaimDate) {
      setClaimSecondsLeft(0);
      return;
    }

    const checkTimer = () => {
      const lastClaim = new Date(profile.lastClaimDate!).getTime();
      const nextClaim = lastClaim + 24 * 60 * 60 * 1000;
      const diffSecs = Math.floor((nextClaim - Date.now()) / 1000);
      setClaimSecondsLeft(diffSecs > 0 ? diffSecs : 0);
    };

    checkTimer();
    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [profile?.lastClaimDate]);

  // Listener to reward referrer when referred users verify
  useEffect(() => {
    if (!profile?.uid) return;

    let unsubscribe = () => {};
    try {
      const q = query(
        collection(db, 'users'),
        where('referrerUid', '==', profile.uid)
      );

      unsubscribe = onSnapshot(q, async (snapshot) => {
        let newVerifiedCount = 0;
        const newRewardedMap: Record<string, boolean> = { ...(profile.rewardedReferrals || {}) };

        snapshot.forEach((docSnap) => {
          const refUser = docSnap.data();
          if (refUser.isVerified && !profile.rewardedReferrals?.[docSnap.id]) {
            newVerifiedCount++;
            newRewardedMap[docSnap.id] = true;
          }
        });

        if (newVerifiedCount > 0) {
          soundManager.playPop();
          const rewardBonus = 25 * newVerifiedCount;
          const extraClaims = 7 * newVerifiedCount;

          await updateProfileData({
            balance: (profile.balance || 0) + rewardBonus,
            availableClaims: (profile.availableClaims || 0) + extraClaims,
            rewardedReferrals: newRewardedMap
          });
          showToast(`+${formatCurrency(rewardBonus, profile.currency)} Referral Bonus Received!`);
        }
      }, (err) => {
        console.warn("Referral tracking notice:", err);
      });
    } catch (err) {
      console.warn("Referral listener initialization notice:", err);
    }

    return () => unsubscribe();
  }, [profile?.uid, profile?.balance, profile?.availableClaims, profile?.rewardedReferrals, profile?.currency, showToast, updateProfileData]);

  const handleDailyClaim = async () => {
    if (!profile) return;
    if (claimSecondsLeft > 0) {
      showToast("Next daily bonus not ready yet!");
      return;
    }
    if ((profile.availableClaims || 0) <= 0) {
      showToast("No claims left. Refer friends or upgrade VIP!");
      return;
    }

    soundManager.playPop();

    let bonusAmount = 30;
    if (profile.activePlan) {
      const planMultiplier = parseInt(profile.activePlan.replace("VIP ", "")) || 1;
      bonusAmount = 30 * (planMultiplier + 1);
    }

    try {
      await updateProfileData({
        balance: (profile.balance || 0) + bonusAmount,
        lastClaimDate: new Date().toISOString(),
        availableClaims: Math.max(0, (profile.availableClaims || 1) - 1)
      });
      showToast(`+${formatCurrency(bonusAmount, profile.currency)} Claimed Successfully!`);
    } catch (err: any) {
      showToast(err?.message || "Failed to claim bonus.");
    }
  };

  // Fixed referral link generation for GitHub Pages, Telegram Mini Apps & Custom Domains
  const referralLink = useMemo(() => {
    if (!profile?.uid) return '';
    try {
      const cleanUrl = window.location.href.split('?')[0].split('#')[0].replace(/\/$/, '');
      return `${cleanUrl}/?ref=${profile.uid}`;
    } catch {
      return `${window.location.origin}/?ref=${profile?.uid || ''}`;
    }
  }, [profile?.uid]);

  const copyReferralLink = () => {
    soundManager.playPop();
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    showToast("Referral Link Copied to Clipboard!");
  };

  const shareReferralLink = () => {
    soundManager.playPop();
    if (navigator.share && referralLink) {
      navigator.share({
        title: "Join Binance Cloud Task & Earning Platform",
        text: "Sign up and earn daily rewards and bonuses on Binance Cloud!",
        url: referralLink
      }).catch(() => {
        copyReferralLink();
      });
    } else {
      copyReferralLink();
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const verifiedReferralsCount = Object.keys(profile?.rewardedReferrals || {}).length;

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center px-2 py-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border border-white/20 text-white"
            style={{ backgroundColor: profile?.avatarColor || "#333" }}
          >
            {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="text-xs text-slate uppercase tracking-wider">Welcome back</div>
            <div className="text-white font-medium flex items-center gap-1 text-lg">
              {profile?.name || 'User'}
              {profile?.isVerified && <BadgeCheck className="w-5 h-5 text-blue-500" />}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            id="support-ticket-btn"
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate hover:text-white transition-colors cursor-pointer"
            onClick={() => {
              soundManager.playPop();
              showToast("Live Support Active 24/7");
            }}
          >
            <CircleHelp size={20} />
          </button>
          <button
            id="notifications-btn"
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate hover:text-white relative transition-colors cursor-pointer"
            onClick={() => {
              soundManager.playPop();
              setIsNotifOpen(true);
            }}
          >
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-void" />
          </button>
        </div>
      </header>

      {/* Top Banner with Clean Binance Branding */}
      <div className="relative w-full aspect-video rounded-[1.5rem] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/5 bg-[#0A0A0A] flex items-center justify-center isolate">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_center,_#FCD53520_0%,_transparent_70%)] pointer-events-none" />
        <div className="flex flex-col items-center justify-center z-10 space-y-2">
          <img
            src={PAYMENT_PARTNERS.find(p => p.id === 'binance')?.logo}
            alt="Binance"
            className="w-16 h-16 object-contain drop-shadow-[0_0_20px_rgba(252,213,53,0.6)]"
          />
          <h1 className="text-white text-3xl font-black tracking-tight drop-shadow-md">
            BINANCE
          </h1>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-5 z-20">
          <h2 className="text-[#FCD535] font-black text-xl tracking-tight drop-shadow-md">
            Official Task &amp; Earning Cloud
          </h2>
          <p className="text-white/80 text-xs font-medium tracking-wide uppercase mt-1">
            Instant Deposits, Fast Withdrawals &amp; Live Spins
          </p>
        </div>
      </div>

      {/* Balance Summary Card */}
      <div className="glass-panel rounded-[1.5rem] p-5">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex border-r border-white/10 flex-col">
            <span className="text-slate text-xs uppercase mb-1">Total Balance</span>
            <span className="text-gold text-2xl font-bold tracking-tight">
              {formatCurrency(profile?.balance || 0, profile?.currency)}
            </span>
          </div>
          <div className="flex flex-col pl-2">
            <span className="text-slate text-xs uppercase mb-1">Withdrawals</span>
            <span className="text-white text-2xl font-bold tracking-tight">
              {formatCurrency(profile?.totalWithdraw || 0, profile?.currency)}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            id="quick-deposit-btn"
            onClick={() => {
              setVerificationDeposit(false);
              setActiveTab('wallet');
            }}
            className="flex-1 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl py-3 flex justify-center items-center gap-2 text-sm font-medium transition-colors cursor-pointer"
          >
            <ArrowDownRight className="w-4 h-4 text-green-400" /> Deposit
          </button>
          <button
            id="quick-withdraw-btn"
            onClick={() => {
              setVerificationDeposit(false);
              setActiveTab('wallet');
            }}
            className="flex-1 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl py-3 flex justify-center items-center gap-2 text-sm font-medium transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-red-400" /> Withdraw
          </button>
        </div>
      </div>

      {/* Daily Bonus / Verification Banner */}
      {profile?.isVerified ? (
        <button
          id="daily-claim-btn"
          onClick={handleDailyClaim}
          disabled={claimSecondsLeft > 0}
          className="w-full glass-panel rounded-[1.5rem] p-1 overflow-hidden relative group disabled:opacity-80 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between px-5 py-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                <Gift className="w-6 h-6 text-gold" />
              </div>
              <div className="text-left">
                <div className="text-white font-medium flex items-center">
                  {profile.activePlan ? `${profile.activePlan} Demo Tasks` : 'Daily Bonus'}
                  <span className="text-gold text-[10px] ml-2 px-2 py-0.5 rounded-full bg-gold/10">
                    {profile.availableClaims || 0} Days Left
                  </span>
                </div>
                <div className="text-slate text-sm">
                  {profile.activePlan
                    ? `Execute protocol task (+${30 * ((parseInt(profile.activePlan.replace("VIP ", "")) || 1) + 1)} BDT)`
                    : 'Claim 30 BDT Everyday'}
                </div>
              </div>
            </div>
            <div className="text-right">
              {claimSecondsLeft > 0 ? (
                <span className="text-gold font-mono font-bold">{formatTimer(claimSecondsLeft)}</span>
              ) : (
                <span className="gold-gradient px-4 py-2 rounded-lg text-sm transition-transform active:scale-95 text-black font-bold uppercase">
                  {profile.activePlan ? "Execute" : "Claim Now"}
                </span>
              )}
            </div>
          </div>
        </button>
      ) : (
        <div className="glass-panel p-1 rounded-[1.5rem] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/30 via-transparent to-transparent opacity-50" />
          <div className="relative z-10 p-5 flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-1">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-white font-bold text-lg">Account Verification Needed</h3>
            <p className="text-slate text-sm">
              Your account is not verified yet. Pay the 100 BDT verification fee to unlock daily claims, spins, VIP tasks, and instant cashouts.
            </p>
            <button
              id="verify-account-now-btn"
              onClick={() => {
                setActiveTab('wallet');
                setVerificationDeposit(true);
              }}
              className="mt-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-6 py-3 rounded-xl font-bold tracking-wide w-full active:scale-95 transition-all cursor-pointer"
            >
              VERIFY ACCOUNT NOW ({formatCurrency(100, profile?.currency)})
            </button>
          </div>
        </div>
      )}

      {/* Luck Board Wheel */}
      <LuckBoard />

      {/* Referral Link Card */}
      <div className="glass-panel rounded-[1.5rem] p-5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-medium flex items-center gap-2">
            Your Referral Link
          </h3>
          <span className="text-gold text-xs font-semibold">+25 BDT / Verified Ref</span>
        </div>
        <div className="flex items-center bg-black/50 border border-white/10 rounded-xl p-2 gap-2">
          <input
            id="referral-link-input"
            type="text"
            readOnly
            value={referralLink}
            className="bg-transparent flex-1 outline-none text-slate text-xs font-mono px-2 truncate"
          />
          <button
            id="copy-ref-link-btn"
            onClick={copyReferralLink}
            className="bg-white/10 hover:bg-white/20 p-2.5 text-white rounded-lg transition-colors active:scale-95 cursor-pointer"
            title="Copy Link"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            id="share-ref-link-btn"
            onClick={shareReferralLink}
            className="bg-gold hover:brightness-110 p-2.5 text-black rounded-lg transition-colors active:scale-95 cursor-pointer"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
        <p className="text-slate text-xs mt-3">
          Earn {formatCurrency(25, profile?.currency)} and +7 claim days for every friend who joins &amp; verifies!
        </p>
      </div>

      {/* Top Referrers Board */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-white font-medium">Top Referrers</h3>
          <span className="text-gold text-xs uppercase tracking-wider">Live Updates</span>
        </div>
        <div className="space-y-3">
          {topReferrers.map((item, idx) => (
            <div
              key={idx}
              className="glass-panel p-4 rounded-2xl flex items-center justify-between border border-white/5"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    idx === 0
                      ? "bg-gold text-black shadow-[0_0_15px_rgba(255,215,0,0.5)]"
                      : "bg-white/10 text-white"
                  }`}
                >
                  #{idx + 1}
                </div>
                <span className="text-white font-medium">{item.name}</span>
              </div>
              <div className="text-gold font-bold">
                {item.count} <span className="text-xs text-slate font-normal ml-1">refs</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kashmir Tour Campaign Card (কাশ্মীর ভ্রমণ) */}
      <div className="relative w-full rounded-[1.8rem] overflow-hidden shadow-[0_10px_40px_rgba(14,165,233,0.25)] border border-sky-500/40 bg-gradient-to-b from-[#06182B] via-[#051329] to-[#020b17] mb-8 group isolate">
        {/* Background ambient lighting */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/15 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/15 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 p-6 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-300 text-[11px] font-bold uppercase tracking-widest mb-3">
            <Compass className="w-3.5 h-3.5 text-sky-400 animate-spin" style={{ animationDuration: '8s' }} /> কাশ্মীর লাক্সারি ট্যুর ২০২৬
          </div>

          <h3 className="text-white text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2 drop-shadow-[0_0_15px_rgba(56,189,248,0.7)] flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-gold" />
            কাশ্মীর ভ্রমণ প্যাকেজ
          </h3>

          <p className="text-sky-200/90 text-xs font-medium max-w-xs leading-relaxed mb-5">
            শ্রীনগর • গুলমার্গ স্নো ভ্যালি • পাহেলগাম • ডাল লেক শিকারা রাইড (সম্পূর্ণ ফ্রি ৫ দিন ৪ রাত লাক্সারি প্যাকেজ)
          </p>

          <div className="bg-black/60 border border-sky-500/30 rounded-2xl p-5 w-full flex flex-col items-center backdrop-blur-md shadow-[inset_0_0_20px_rgba(56,189,248,0.15)]">
            <div className="text-slate text-xs mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-sky-400" /> কোয়ালিফাই করার রিকোয়ারমেন্ট
            </div>
            <div className="text-gold font-black text-3xl tracking-tight drop-shadow-md my-1">
              ১,০০০ জন
            </div>
            <div className="text-white/70 text-[10px] uppercase tracking-widest font-bold">
              ভেরিফাইড রেফারেল
            </div>

            <div className="w-full bg-white/10 h-3 rounded-full mt-4 overflow-hidden relative border border-white/5">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((verifiedReferralsCount / 1000) * 100, 100)}%`
                }}
              />
            </div>
            <div className="w-full flex justify-between text-[11px] text-white/60 font-semibold mt-2">
              <span>আপনার স্কোর: {verifiedReferralsCount}</span>
              <span>টার্গেট: ১,০০০</span>
            </div>
          </div>

          <button
            id="claim-kashmir-tour-btn"
            className="mt-5 w-full py-4 rounded-xl font-black uppercase tracking-wider text-xs sm:text-sm transition-all shadow-[0_0_25px_rgba(14,165,233,0.4)] border border-sky-400 text-white bg-gradient-to-r from-sky-600 to-blue-600 hover:brightness-110 disabled:opacity-50 disabled:grayscale cursor-pointer"
            disabled={verifiedReferralsCount < 1000}
            onClick={() => {
              soundManager.playPop();
              if (verifiedReferralsCount >= 1000) {
                showToast("অভিনন্দন! আপনার কাশ্মীর ট্যুর পাস কনফার্ম করা হয়েছে।");
              } else {
                showToast(`টার্গেট পূরণে আরও ${1000 - verifiedReferralsCount} টি ভেরিফাইড রেফার প্রয়োজন।`);
              }
            }}
          >
            {verifiedReferralsCount >= 1000 ? "CLAIM KASHMIR TOUR PASS" : "ক্যাম্পেইনে অংশ নিন (রেফার করুন)"}
          </button>
        </div>
      </div>

      {/* Payment Partners Footer */}
      <div className="pt-4 pb-28 text-center opacity-80">
        <div className="text-[10px] text-slate uppercase tracking-widest mb-6 font-bold">
          Supported Gateways &amp; Networks
        </div>
        <div className="flex justify-center gap-4 items-center flex-wrap px-4 max-w-2xl mx-auto">
          {PAYMENT_PARTNERS.map((p) => (
            <img
              key={p.id}
              src={p.logo}
              alt={p.name}
              className={`h-5 object-contain grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100 ${p.invert ? 'invert' : ''}`}
              title={p.name}
            />
          ))}
        </div>
      </div>

      {/* Instant Notification Center Modal */}
      <NotificationModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
      />
    </div>
  );
};
