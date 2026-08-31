import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, RefreshCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { soundManager } from '../utils/audio';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface WheelSlice {
  label: string;
  value: number;
  color: string;
  textColor: string;
}

const SLICES: WheelSlice[] = [
  { label: "100 BDT", value: 100, color: "#10b981", textColor: "#ffffff" },
  { label: "20 BDT", value: 20, color: "#3b82f6", textColor: "#ffffff" },
  { label: "500 BDT", value: 500, color: "#8b5cf6", textColor: "#ffffff" },
  { label: "450 BDT", value: 450, color: "#ec4899", textColor: "#ffffff" },
  { label: "500 BDT", value: 500, color: "#6366f1", textColor: "#ffffff" },
  { label: "1000 BDT", value: 1000, color: "#ef4444", textColor: "#ffffff" },
  { label: "10K BDT", value: 10000, color: "#FCD535", textColor: "#000000" },
  { label: "10 BDT", value: 10, color: "#14b8a6", textColor: "#ffffff" },
  { label: "200 BDT", value: 200, color: "#f97316", textColor: "#ffffff" },
  { label: "REAPPLY", value: 0, color: "#1e293b", textColor: "#94a3b8" }
];

export const LuckBoard: React.FC = () => {
  const { profile, showToast, updateProfileData } = useApp();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [wonSlice, setWonSlice] = useState<WheelSlice | null>(null);

  const verifiedRefCount = Object.keys(profile?.rewardedReferrals || {}).length;
  const spinsUsed = profile?.spinsUsed || 0;
  const availableSpins = Math.floor(verifiedRefCount / 5) - spinsUsed;

  const handleSpin = async () => {
    if (!profile) return;
    if (availableSpins <= 0) {
      showToast("Need 5 verified referrals for 1 spin!");
      return;
    }

    setIsSpinning(true);
    soundManager.playPop();

    // Probability logic
    const isCommon = Math.random() < 0.99999;
    let targetIndex = 0;
    if (isCommon) {
      const commonPool = [0, 1, 9];
      targetIndex = commonPool[Math.floor(Math.random() * commonPool.length)];
    } else {
      const rarePool = [2, 3, 4, 5, 6, 7, 8];
      targetIndex = rarePool[Math.floor(Math.random() * rarePool.length)];
    }

    const selectedSlice = SLICES[targetIndex];
    const sliceAngle = 360 / SLICES.length;
    const baseRounds = (Math.floor(rotation / 360) + 6) * 360;
    const randomOffset = (Math.random() - 0.5) * (sliceAngle * 0.6);
    const finalRotation = baseRounds - targetIndex * sliceAngle + randomOffset;

    setRotation(finalRotation);

    setTimeout(async () => {
      setIsSpinning(false);
      setWonSlice(selectedSlice);
      setShowModal(true);

      const updates: Partial<any> = {
        spinsUsed: spinsUsed + 1
      };
      if (selectedSlice.value > 0) {
        updates.balance = (profile.balance || 0) + selectedSlice.value;
      }

      await updateProfileData(updates);

      if (selectedSlice.value > 0) {
        showToast(`Congratulations! You won ${selectedSlice.value} BDT!`);
      } else {
        showToast("Oops! Better luck next time.");
      }
    }, 5000);
  };

  return (
    <div id="luck-board-card" className="glass-panel p-5 rounded-[1.5rem] mt-6 flex flex-col items-center overflow-hidden relative border-t-2 border-gold/40">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 blur-[40px] pointer-events-none" />
      <div className="absolute -right-12 top-6 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-[10px] tracking-widest uppercase py-1 px-12 rotate-45 shadow-[0_0_15px_rgba(239,68,68,0.5)] border border-red-400/50 z-10">
        Special
      </div>

      <h3 className="text-white font-black text-2xl tracking-tighter mb-1 flex items-center justify-center gap-2 w-full">
        <Gift className="text-gold w-6 h-6" /> LUCK BOARD
      </h3>
      <p className="text-slate text-[10px] uppercase tracking-widest font-bold mb-4 text-center">
        Spin &amp; Win Mega Rewards!
      </p>

      <div className="text-sm font-bold text-center mb-8 relative z-10">
        {availableSpins > 0 ? (
          <span className="text-green-400 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/30">
            🔥 {availableSpins} Spins Available
          </span>
        ) : (
          <span className="text-slate/80">
            Needs 5 verified referrals per spin. <br />
            <span className="text-gold font-bold text-xs mt-1 inline-block">
              (You have {verifiedRefCount} verified refs)
            </span>
          </span>
        )}
      </div>

      {/* Wheel graphics */}
      <div className="relative w-[260px] h-[260px] mb-8 pointer-events-none select-none">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 drop-shadow-[0_4px_15px_rgba(255,215,0,0.6)] flex flex-col items-center">
          <svg width="40" height="48" viewBox="0 0 40 48" fill="none" className="transform origin-top">
            <path
              d="M20 48L4 20C4 20 8 0 20 0C32 0 36 20 36 20L20 48Z"
              fill="url(#pointer-gradient)"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <circle cx="20" cy="14" r="5" fill="#0A0A0A" />
            <circle cx="20" cy="14" r="2" fill="#FCD535" />
            <defs>
              <linearGradient id="pointer-gradient" x1="20" y1="0" x2="20" y2="48" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFE066" />
                <stop offset="1" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <motion.div
          className="w-full h-full rounded-full shadow-[0_0_50px_rgba(255,215,0,0.15)] relative overflow-hidden"
          animate={{ rotate: rotation }}
          transition={{ duration: 5, ease: [0.15, 0.85, 0.15, 1] }}
          style={{ transformOrigin: "center" }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
            <defs>
              <radialGradient id="gloss" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                <stop offset="70%" stopColor="rgba(255,255,255,0.1)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
              </radialGradient>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="0.5" floodColor="#000" floodOpacity="0.8" />
              </filter>
            </defs>

            <circle cx="50" cy="50" r="49" fill="#222" stroke="#FCD535" strokeWidth="2" />
            <circle cx="50" cy="50" r="47" fill="#0a0a0a" />

            <g>
              {SLICES.map((item, idx) => {
                const angle1 = idx * 36 - 90 - 18;
                const angle2 = (idx + 1) * 36 - 90 - 18;
                const x1 = 50 + 47 * Math.cos((angle1 * Math.PI) / 180);
                const y1 = 50 + 47 * Math.sin((angle1 * Math.PI) / 180);
                const x2 = 50 + 47 * Math.cos((angle2 * Math.PI) / 180);
                const y2 = 50 + 47 * Math.sin((angle2 * Math.PI) / 180);
                const pathData = `M 50 50 L ${x1} ${y1} A 47 47 0 0 1 ${x2} ${y2} Z`;

                return (
                  <g key={idx}>
                    <path d={pathData} fill={item.color} stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
                    <text
                      x="50"
                      y="14"
                      transform={`rotate(${idx * 36}, 50, 50)`}
                      textAnchor="middle"
                      fill={item.textColor}
                      fontSize="4.5"
                      fontWeight="900"
                      dominantBaseline="middle"
                      filter="url(#shadow)"
                      style={{ textShadow: "0px 1px 2px rgba(0,0,0,0.8)" }}
                    >
                      {item.label}
                    </text>
                  </g>
                );
              })}
            </g>

            <circle cx="50" cy="50" r="47" fill="url(#gloss)" pointerEvents="none" style={{ mixBlendMode: "overlay" }} />

            {[...Array(20)].map((_, i) => {
              const angle = i * 18 - 90;
              const x = 50 + 48.2 * Math.cos((angle * Math.PI) / 180);
              const y = 50 + 48.2 * Math.sin((angle * Math.PI) / 180);
              return <circle key={`dot-${i}`} cx={x} cy={y} r="0.6" fill={i % 2 === 0 ? "#ffffff" : "#FCD535"} opacity="0.8" />;
            })}

            <circle cx="50" cy="50" r="9" fill="#111" stroke="#FCD535" strokeWidth="1.5" filter="url(#shadow)" />
            <circle cx="50" cy="50" r="6" fill="#FCD535" opacity="0.1" />
            <circle cx="50" cy="50" r="3" fill="#FFE066" />
          </svg>
        </motion.div>
      </div>

      <button
        id="spin-now-btn"
        onClick={handleSpin}
        disabled={isSpinning || availableSpins <= 0}
        className="w-full max-w-[200px] gold-gradient text-black font-black py-4 rounded-xl shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-50 disabled:grayscale cursor-pointer"
      >
        {isSpinning ? "SPINNING..." : "SPIN NOW"}
      </button>

      <AnimatePresence>
        {showModal && wonSlice && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 max-w-sm w-full flex flex-col items-center text-center shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
              <div
                className={`absolute top-0 right-0 w-64 h-64 blur-[80px] pointer-events-none rounded-full ${
                  wonSlice.value > 0 ? "bg-gold/20" : "bg-white/5"
                }`}
              />

              {wonSlice.value > 0 ? (
                <>
                  <Gift className="w-20 h-20 text-gold mb-6 drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]" />
                  <h2 className="text-3xl font-black text-white mb-2 uppercase">You Won!</h2>
                  <p className="text-5xl font-black text-gold mb-8 drop-shadow-md">{wonSlice.label}</p>
                </>
              ) : (
                <>
                  <RefreshCcw className="w-20 h-20 text-slate mb-6" />
                  <h2 className="text-3xl font-black text-white mb-2 uppercase">Try Again!</h2>
                  <p className="text-lg font-bold text-slate mb-8">Better luck next time.</p>
                </>
              )}

              <button
                id="close-reward-modal-btn"
                onClick={() => setShowModal(false)}
                className="w-full bg-white text-black py-4 rounded-xl font-bold uppercase tracking-widest active:scale-95 transition-transform cursor-pointer"
              >
                Awesome
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
