import React from 'react';
import { motion } from 'motion/react';
import { Crown, Check, ChevronRight, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/currencies';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { soundManager } from '../utils/audio';

interface VipTier {
  name: string;
  subtitle: string;
  price: number;
  features: string[];
  color: string;
  shadow: string;
}

const VIP_TIERS: VipTier[] = [
  {
    name: "VIP 1",
    subtitle: "Copper Network",
    price: 200,
    features: ["Standard Earnings", "Basic Support", "1 Withdrawal/Day"],
    color: "from-[#B87333] to-[#8A5A29]",
    shadow: "shadow-[0_0_30px_rgba(184,115,51,0.15)]"
  },
  {
    name: "VIP 2",
    subtitle: "Bronze Node",
    price: 500,
    features: ["1.5x Earning Rate", "Bronze Badge", "Daily 500 BDT Limit"],
    color: "from-[#CD7F32] to-[#A0522D]",
    shadow: "shadow-[0_0_30px_rgba(205,127,50,0.15)]"
  },
  {
    name: "VIP 3",
    subtitle: "Silver Protocol",
    price: 1000,
    features: ["2x Earning Rate", "Priority Support", "Daily 1000 BDT Limit"],
    color: "from-gray-300 to-gray-500",
    shadow: "shadow-[0_0_30px_rgba(209,213,219,0.15)]"
  },
  {
    name: "VIP 4",
    subtitle: "Gold Validator",
    price: 2000,
    features: ["3x Earning Rate", "24/7 VIP Concierge", "Daily 5000 BDT Limit"],
    color: "from-[#FFD700] to-[#FFA000]",
    shadow: "shadow-[0_0_30px_rgba(255,215,0,0.15)]"
  },
  {
    name: "VIP 5",
    subtitle: "Platinum Syndicate",
    price: 3000,
    features: ["5x Earning Rate", "Platinum Agent", "Daily 10000 BDT Limit"],
    color: "from-cyan-300 to-blue-500",
    shadow: "shadow-[0_0_30px_rgba(6,182,212,0.15)]"
  },
  {
    name: "VIP 6",
    subtitle: "Palladium Core",
    price: 4000,
    features: ["7x Earning Rate", "0% Deposit Fees", "Unlimited Withdrawals"],
    color: "from-blue-400 to-indigo-600",
    shadow: "shadow-[0_0_30px_rgba(59,130,246,0.15)]"
  },
  {
    name: "VIP 7",
    subtitle: "Titanium Vault",
    price: 5000,
    features: ["10x Earning Rate", "Global Events Access", "Free Upgrades"],
    color: "from-purple-400 to-violet-600",
    shadow: "shadow-[0_0_30px_rgba(139,92,246,0.15)]"
  },
  {
    name: "VIP 8",
    subtitle: "Emerald Nexus",
    price: 7000,
    features: ["15x Earning Rate", "Personal Manager", "VIP Gift Boxes"],
    color: "from-emerald-400 to-green-600",
    shadow: "shadow-[0_0_30px_rgba(16,185,129,0.15)]"
  },
  {
    name: "VIP 9",
    subtitle: "Ruby Elite",
    price: 8000,
    features: ["20x Earning Rate", "0% Transaction Fees", "Priority Payments"],
    color: "from-red-400 to-rose-600",
    shadow: "shadow-[0_0_30px_rgba(239,68,68,0.15)]"
  },
  {
    name: "VIP 10",
    subtitle: "Diamond Sovereign",
    price: 10000,
    features: ["Max Multiplier", "Black Card Access", "Lifetime Revenue Split"],
    color: "from-fuchsia-300 to-pink-600",
    shadow: "shadow-[0_0_30px_rgba(236,72,153,0.15)]"
  }
];

export const VipTab: React.FC = () => {
  const { profile, setVerificationDeposit, setActiveTab, showToast, updateProfileData } = useApp();

  const handleActivatePlan = async (tier: VipTier) => {
    if (!profile) return;
    if ((profile.balance || 0) < tier.price) {
      showToast("Insufficient Balance! Please deposit first.");
      return;
    }

    if (profile.activePlan === tier.name) {
      showToast("Protocol tier is already active!");
      return;
    }

    soundManager.playPop();
    try {
      await updateProfileData({
        balance: (profile.balance || 0) - tier.price,
        activePlan: tier.name
      });
      showToast(`${tier.name} Protocol Initialized Successfully!`);
    } catch (err: any) {
      showToast(err?.message || "Failed to initialize VIP tier.");
    }
  };

  if (!profile?.isVerified) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-gold/20 blur-[50px] rounded-full" />
          <div className="w-24 h-24 rounded-full bg-[#0A0A0A] border border-white/10 flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
            <Lock className="w-10 h-10 text-gold" />
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white mb-2">Classified Access</h2>
          <p className="text-slate text-sm max-w-xs mx-auto leading-relaxed">
            VIP tiers are encrypted. You must verify your account to unlock high-yield protocol tasks.
          </p>
        </div>

        <button
          id="vip-verify-btn"
          onClick={() => {
            setActiveTab('wallet');
            setVerificationDeposit(true);
          }}
          className="w-full max-w-xs bg-white text-black py-4 rounded-full font-black tracking-widest shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-95 transition-all text-sm mt-8 flex justify-center items-center gap-2 cursor-pointer"
        >
          VERIFY IDENTITY <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-8 pt-6 pb-32 min-h-screen">
      <div className="text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 blur-[80px] pointer-events-none" />
        <Crown className="w-12 h-12 text-gold mx-auto mb-4 drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
        <h2 className="text-4xl font-black tracking-tighter text-white mb-2 uppercase">Elite Tiers</h2>
        <p className="text-slate/60 text-xs uppercase tracking-widest font-bold">
          High Yield Earnings &amp; Status
        </p>
      </div>

      <div className="space-y-6">
        {VIP_TIERS.map((tier, idx) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05 }}
            className={`bg-[#0A0A0A] border border-white/5 rounded-[2rem] p-8 relative overflow-hidden group hover:border-white/20 transition-colors ${tier.shadow}`}
          >
            <div
              className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-br ${tier.color} opacity-[0.03] blur-[40px] rounded-full group-hover:opacity-[0.08] transition-opacity`}
            />

            <div className="flex justify-between items-end mb-8 border-b border-white/5 pb-6">
              <div>
                <p
                  className={`text-[10px] uppercase tracking-[0.2em] font-bold bg-clip-text text-transparent bg-gradient-to-r ${tier.color} mb-2`}
                >
                  {tier.subtitle}
                </p>
                <h3 className="text-white font-black text-3xl tracking-tight">{tier.name}</h3>
              </div>
              <div className="text-right">
                <span className="text-white font-mono text-2xl font-black tracking-tighter">
                  {formatCurrency(tier.price, profile?.currency)}
                </span>
              </div>
            </div>

            <ul className="space-y-4 relative z-10 mb-8">
              {tier.features.map((feature, fIdx) => (
                <li key={fIdx} className="flex items-center gap-4">
                  <div
                    className={`w-6 h-6 rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center shadow-lg opacity-80`}
                  >
                    <Check className="w-3 h-3 text-black stroke-[3]" />
                  </div>
                  <span className="text-slate/80 text-sm font-medium tracking-wide">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              id={`activate-${tier.name.toLowerCase().replace(' ', '-')}-btn`}
              onClick={() => handleActivatePlan(tier)}
              className="w-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white py-4 rounded-xl border border-white/10 font-bold tracking-widest uppercase text-xs flex justify-center items-center gap-2 cursor-pointer"
            >
              {profile?.activePlan === tier.name ? "Protocol Active" : "Initialize Protocol"}{" "}
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
