import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Clock, 
  Copy, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Lock, 
  ChevronRight,
  BadgeCheck,
  Zap,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/currencies';
import { soundManager } from '../utils/audio';
import { PAYMENT_PARTNERS } from '../utils/paymentPartners';
import { TransactionRecord } from '../types';
import { collection, query, where, onSnapshot, addDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export const WalletTab: React.FC = () => {
  const { profile, showToast, isVerificationDeposit, setVerificationDeposit, updateProfileData } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [paymentAddresses, setPaymentAddresses] = useState<Record<string, string>>({
    bkash: "01893723415",
    nagad: "01326275135",
    binance: "202316886",
    payoneer: "pay@binance-cloud.com"
  });

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [amount, setAmount] = useState<string>(isVerificationDeposit ? '100' : '');
  const [trxId, setTrxId] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('bkash');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState<boolean>(false);

  useEffect(() => {
    setAmount(isVerificationDeposit ? '100' : '');
  }, [isVerificationDeposit]);

  // Load payment config from Firestore if available
  useEffect(() => {
    const configDocRef = doc(db, 'config', 'payment_numbers');
    const unsubscribe = onSnapshot(configDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Record<string, string>;
        setPaymentAddresses(prev => ({
          ...prev,
          ...data,
          bkash: data.bkash || "01893723415",
          nagad: data.nagad || "01326275135"
        }));
      }
    }, (err) => {
      console.warn("Config listener notice:", err);
    });

    return () => unsubscribe();
  }, []);

  // Real-time user transactions (Deposits & Withdrawals) from Firestore
  useEffect(() => {
    if (!profile?.uid) return;

    const depQuery = query(
      collection(db, 'deposits'),
      where('uid', '==', profile.uid)
    );

    const withQuery = query(
      collection(db, 'withdrawals'),
      where('uid', '==', profile.uid)
    );

    const unsubDep = onSnapshot(depQuery, (snap) => {
      const deps: TransactionRecord[] = [];
      snap.forEach(d => {
        deps.push({ id: d.id, _category: 'deposit', ...(d.data() as any) });
      });

      setTransactions(prev => {
        const withoutDeps = prev.filter(t => t._category !== 'deposit');
        return [...withoutDeps, ...deps].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      });
    }, (err) => {
      console.warn("Deposit transactions notice:", err);
    });

    const unsubWith = onSnapshot(withQuery, (snap) => {
      const withs: TransactionRecord[] = [];
      snap.forEach(d => {
        withs.push({ id: d.id, _category: 'withdrawal', ...(d.data() as any) });
      });

      setTransactions(prev => {
        const withoutWiths = prev.filter(t => t._category !== 'withdrawal');
        return [...withoutWiths, ...withs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      });
    }, (err) => {
      console.warn("Withdrawal transactions notice:", err);
    });

    return () => {
      unsubDep();
      unsubWith();
    };
  }, [profile?.uid]);

  const copyAddress = (val: string) => {
    soundManager.playPop();
    navigator.clipboard.writeText(val);
    showToast("Payment Address Copied!");
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = isVerificationDeposit ? 100 : parseFloat(amount);
    if (!finalAmount || !trxId || !profile) return;

    try {
      soundManager.playPop();
      const newDepositRecord = {
        uid: profile.uid,
        name: profile.name,
        amount: finalAmount,
        method: selectedMethod,
        trxId: trxId.trim().toUpperCase(),
        type: isVerificationDeposit ? 'verification' : 'deposit',
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      try {
        await addDoc(collection(db, 'deposits'), newDepositRecord);
      } catch (dbErr) {
        console.warn("Deposit write notice:", dbErr);
      }

      // Add to local state immediately
      setTransactions(prev => [
        { id: `dep-${Date.now()}`, _category: 'deposit', ...newDepositRecord },
        ...prev
      ]);

      if (isVerificationDeposit) {
        showToast("Verification deposit submitted for approval.");
        setVerificationDeposit(false);
      } else {
        showToast("Deposit request submitted successfully.");
      }

      setAmount('');
      setTrxId('');
    } catch (err: any) {
      showToast(err?.message || "Failed to submit deposit.");
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // Strict verification check: Withdrawal is strictly locked for unverified accounts
    if (!profile.isVerified) {
      soundManager.playPop();
      showToast("উইথড্র করতে প্রথমে অ্যাকাউন্ট ভেরিফাই করুন (১০০ টাকা)");
      setActiveSubTab('deposit');
      setVerificationDeposit(true);
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || isNaN(parsedAmount) || !destination.trim()) {
      showToast("সঠিক নাম্বার ও পরিমাণ লিখুন");
      return;
    }

    if (parsedAmount < 250) {
      showToast("সর্বনিম্ন উইথড্র ২৫০ টাকা (Min: 250 BDT)");
      return;
    }

    if (parsedAmount > (profile.balance || 0)) {
      showToast("অপর্যাপ্ত ব্যালেন্স! আপনার একাউন্টে পর্যাপ্ত টাকা নেই");
      return;
    }

    setIsSubmittingWithdraw(true);
    soundManager.playPop();

    try {
      const newWithdrawalRecord = {
        uid: profile.uid,
        name: profile.name,
        amount: parsedAmount,
        method: selectedMethod,
        destination: destination.trim(),
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      // Deduct balance from user profile & update totalWithdraw
      await updateProfileData({
        balance: Math.max(0, (profile.balance || 0) - parsedAmount),
        totalWithdraw: (profile.totalWithdraw || 0) + parsedAmount
      });

      // Save record to Firestore
      try {
        await addDoc(collection(db, 'withdrawals'), newWithdrawalRecord);
      } catch (dbErr) {
        console.warn("Withdrawal write notice:", dbErr);
      }

      // Add to local state
      setTransactions(prev => [
        { id: `with-${Date.now()}`, _category: 'withdrawal', ...newWithdrawalRecord },
        ...prev
      ]);

      showToast("উইথড্রয়াল রিকোয়েস্ট সফলভাবে জমা হয়েছে!");
      setAmount('');
      setDestination('');
      setActiveSubTab('history');
    } catch (err: any) {
      showToast(err?.message || "উইথড্র সাবমিট করতে সমস্যা হয়েছে।");
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const methods = [
    { id: "bkash", name: "bKash", color: "#E2136E", logo: PAYMENT_PARTNERS.find(p => p.id === 'bkash')?.logo },
    { id: "nagad", name: "Nagad", color: "#F7931E", logo: PAYMENT_PARTNERS.find(p => p.id === 'nagad')?.logo },
    { id: "binance", name: "Binance", color: "#FCD535", logo: PAYMENT_PARTNERS.find(p => p.id === 'binance')?.logo },
    { id: "payoneer", name: "Payoneer", color: "#FF4800", logo: PAYMENT_PARTNERS.find(p => p.id === 'payoneer')?.logo }
  ];

  return (
    <div className="p-4 space-y-6 pt-6 pb-32 min-h-screen">
      {/* Portfolio Top Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-[2rem] p-8 overflow-hidden isolate"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent border border-white/10 rounded-[2rem] z-[-1] backdrop-blur-2xl" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gold/20 blur-[80px] rounded-full z-[-1]" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-500/20 blur-[80px] rounded-full z-[-1]" />

        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-gold" />
            <span className="text-slate uppercase tracking-widest text-[10px] font-bold">
              Total Portfolio Value
            </span>
          </div>
          <span className={`text-[10px] uppercase px-3 py-1 rounded-full font-bold tracking-wider backdrop-blur-md flex items-center gap-1 ${
            profile?.isVerified ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"
          }`}>
            {profile?.isVerified ? (
              <>
                <BadgeCheck className="w-3 h-3 text-emerald-400" /> VERIFIED
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 text-red-400" /> UNVERIFIED
              </>
            )}
          </span>
        </div>

        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/70 tracking-tight mb-2 flex items-center">
          {formatCurrency(profile?.balance || 0, profile?.currency)}
        </h1>
      </motion.div>

      {/* Sub Tabs Selector */}
      <div className="flex bg-[#0A0A0A] p-1 rounded-2xl shadow-inner relative z-10 border border-white/5">
        <button
          id="tab-btn-deposit"
          onClick={() => {
            soundManager.playPop();
            setActiveSubTab('deposit');
          }}
          className={`flex-1 py-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'deposit'
              ? "bg-gradient-to-r from-white/10 to-white/5 text-white shadow-lg border border-white/10"
              : "text-slate hover:text-white/80"
          }`}
        >
          <ArrowDownRight className="w-4 h-4 text-emerald-400" /> Deposit
        </button>

        <button
          id="tab-btn-withdraw"
          onClick={() => {
            soundManager.playPop();
            setActiveSubTab('withdraw');
          }}
          className={`flex-1 py-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'withdraw'
              ? "bg-gradient-to-r from-white/10 to-white/5 text-white shadow-lg border border-white/10"
              : "text-slate hover:text-white/80"
          }`}
        >
          {profile?.isVerified ? (
            <ArrowUpRight className="w-4 h-4 text-red-400" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-red-400" />
          )}
          Withdraw
          {!profile?.isVerified && (
            <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30">
              Locked
            </span>
          )}
        </button>

        <button
          id="tab-btn-history"
          onClick={() => {
            soundManager.playPop();
            setActiveSubTab('history');
          }}
          className={`flex-1 py-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'history'
              ? "bg-gradient-to-r from-white/10 to-white/5 text-white shadow-lg border border-white/10"
              : "text-slate hover:text-white/80"
          }`}
        >
          <Clock className="w-4 h-4 text-sky-400" /> History
        </button>
      </div>

      {/* Sub Tab Contents */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {activeSubTab === 'deposit' && (
            <motion.div
              key="deposit"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {isVerificationDeposit && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-red-900/20 to-black border border-red-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
                    <div>
                      <h4 className="text-white text-xs font-bold uppercase tracking-wider">Account Verification Mode</h4>
                      <p className="text-slate text-[11px]">Pay 100 BDT fee to unlock withdrawals &amp; daily claims</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setVerificationDeposit(false)}
                    className="text-slate hover:text-white text-xs px-2 py-1 rounded bg-white/5"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-slate text-[10px] uppercase font-bold tracking-widest pl-2">
                  Select Gateway / Network
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {methods.map(m => (
                    <button
                      key={m.id}
                      id={`method-dep-${m.id}`}
                      onClick={() => setSelectedMethod(m.id)}
                      className={`relative p-4 rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col items-center justify-center gap-2 cursor-pointer ${
                        selectedMethod === m.id
                          ? "bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] border-white/30"
                          : "bg-[#0A0A0A] border-white/5 hover:border-white/20 hover:bg-white/5"
                      }`}
                    >
                      {m.logo && <img src={m.logo} alt={m.name} className="h-6 object-contain relative z-10" />}
                      <span className="text-white text-xs font-bold relative z-10">{m.name}</span>
                      {selectedMethod === m.id && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deposit Address Box */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-[1.5rem] p-5 relative overflow-hidden shadow-2xl">
                <h3 className="text-slate text-[10px] uppercase font-bold tracking-widest mb-3">
                  Official Deposit Number / Address
                </h3>
                <div className="flex items-center justify-between bg-black/50 p-4 rounded-xl border border-white/5 backdrop-blur-md">
                  <span className="text-white font-mono text-sm sm:text-base font-bold tracking-wider truncate mr-2">
                    {paymentAddresses[selectedMethod] || "Loading..."}
                  </span>
                  <button
                    id="copy-address-btn"
                    onClick={() => copyAddress(paymentAddresses[selectedMethod])}
                    className="bg-white text-black p-2 rounded-lg hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] cursor-pointer shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-slate/60 text-[10px] mt-4 leading-relaxed font-medium">
                  Send {isVerificationDeposit ? "100 BDT verification fee" : "amount"} to the number/address above, then paste the Transaction ID / TrxID below.
                </p>
              </div>

              {/* Deposit Form */}
              <form onSubmit={handleDepositSubmit} className="space-y-4">
                <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-2 relative">
                  <label className="text-slate text-[10px] uppercase font-bold tracking-widest absolute top-3 left-4">
                    {isVerificationDeposit ? "Verification Fee Amount (BDT)" : "Deposit Amount (BDT)"}
                  </label>
                  <input
                    id="deposit-amount-input"
                    type="number"
                    required
                    readOnly={isVerificationDeposit}
                    min={isVerificationDeposit ? "100" : "10"}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className={`w-full bg-transparent px-4 pt-8 pb-3 text-white text-xl font-mono focus:outline-none placeholder:text-slate/30 ${
                      isVerificationDeposit ? "text-gold font-bold" : ""
                    }`}
                    placeholder="0.00"
                  />
                </div>

                <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-2 relative">
                  <label className="text-slate text-[10px] uppercase font-bold tracking-widest absolute top-3 left-4">
                    Transaction ID / Hash (TrxID)
                  </label>
                  <input
                    id="deposit-trxid-input"
                    type="text"
                    required
                    value={trxId}
                    onChange={e => setTrxId(e.target.value)}
                    className="w-full bg-transparent px-4 pt-8 pb-3 text-white font-mono focus:outline-none placeholder:text-slate/30 uppercase"
                    placeholder="e.g. 7A9B3XYZ"
                  />
                </div>

                <button
                  id="submit-deposit-btn"
                  type="submit"
                  className={`w-full py-5 rounded-2xl font-black tracking-widest text-shadow transition-all active:scale-[0.98] mt-2 flex justify-center items-center gap-2 cursor-pointer ${
                    isVerificationDeposit
                      ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:shadow-[0_0_40px_rgba(220,38,38,0.5)]"
                      : "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)]"
                  }`}
                >
                  {isVerificationDeposit ? "COMPLETE 100 BDT VERIFICATION" : "CONFIRM DEPOSIT"}{" "}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </form>
            </motion.div>
          )}

          {activeSubTab === 'withdraw' && (
            <motion.div
              key="withdraw"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* If user is NOT verified, show prominent LOCKED Screen */}
              {!profile?.isVerified ? (
                <div className="bg-[#0A0A0A] rounded-[2rem] border border-red-500/20 p-6 sm:p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 blur-3xl rounded-full pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-gold/10 blur-3xl rounded-full pointer-events-none" />

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-950/40 to-black flex items-center justify-center mb-5 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                      <Lock className="w-9 h-9 text-red-500 animate-pulse" />
                    </div>

                    <h3 className="text-white font-black text-2xl mb-2 tracking-tight uppercase">
                      উইথড্রয়াল লক করা আছে
                    </h3>
                    <p className="text-slate text-xs sm:text-sm mb-6 max-w-sm leading-relaxed">
                      উইথড্রয়াল সুবিধা আনলক করতে আপনার অ্যাকাউন্টটি ১০০ টাকা ফি দিয়ে ভেরিফাই করতে হবে। ভেরিফাইয়ের পর ইনস্ট্যান্ট ক্যাশআউট চালু হবে।
                    </p>

                    {/* Unlocked benefits preview */}
                    <div className="w-full bg-black/50 border border-white/5 rounded-2xl p-4 mb-6 text-left space-y-2.5">
                      <div className="text-slate text-[10px] uppercase font-bold tracking-widest text-gold mb-1">
                        ভেরিফাই করার সুবিধা:
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/90">
                        <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>বিকাশ ও নগদ ইনস্ট্যান্ট উইথড্রয়াল (Payouts)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/90">
                        <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>সর্বনিম্ন উইথড্র মাত্র ২৫০ টাকা (Min 250 BDT)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/90">
                        <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>প্রতিদিন ফ্রি ডেইলি বোনাস ক্লেইম (Daily 30 BDT)</span>
                      </div>
                    </div>

                    <button
                      id="verify-from-withdraw-btn"
                      onClick={() => {
                        soundManager.playPop();
                        setActiveSubTab('deposit');
                        setVerificationDeposit(true);
                      }}
                      className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white py-4 sm:py-5 rounded-2xl font-black tracking-widest shadow-[0_0_30px_rgba(225,29,72,0.4)] active:scale-95 transition-all text-xs sm:text-sm flex justify-center items-center gap-2 cursor-pointer"
                    >
                      এখনই ভেরিফাই করুন (১০০ টাকা) <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Unlocked Withdrawal Form for Verified Users */
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <BadgeCheck className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-emerald-300 text-xs font-bold uppercase tracking-wider">অ্যাকাউন্ট ভেরিফাইড (Unlocked)</h4>
                        <p className="text-slate text-[11px]">আপনার ক্যাশআউট সুবিধা সম্পূর্ণ সক্রিয় রয়েছে</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-1 rounded">
                      24/7 ACTIVE
                    </span>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-slate text-[10px] uppercase font-bold tracking-widest pl-2">
                      Withdrawal Method / গেটওয়ে নির্বাচন করুন
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {methods.map(m => (
                        <button
                          key={m.id}
                          id={`method-with-${m.id}`}
                          onClick={() => setSelectedMethod(m.id)}
                          className={`relative p-4 rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col items-center justify-center gap-2 cursor-pointer ${
                            selectedMethod === m.id
                              ? "bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] border-white/30"
                              : "bg-[#0A0A0A] border-white/5 hover:border-white/20 hover:bg-white/5"
                          }`}
                        >
                          {m.logo && <img src={m.logo} alt={m.name} className="h-6 object-contain relative z-10" />}
                          <span className="text-white text-xs font-bold relative z-10">{m.name}</span>
                          {selectedMethod === m.id && (
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Withdraw Form */}
                  <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                    <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-2 relative">
                      <label className="text-slate text-[10px] uppercase font-bold tracking-widest absolute top-3 left-4">
                        প্রাপক একাউন্ট / নাম্বার / ওয়ালেট এড্রেস ({selectedMethod.toUpperCase()})
                      </label>
                      <input
                        id="withdraw-destination-input"
                        type="text"
                        required
                        value={destination}
                        onChange={e => setDestination(e.target.value)}
                        className="w-full bg-transparent px-4 pt-8 pb-3 text-white font-mono focus:outline-none placeholder:text-slate/30"
                        placeholder="e.g. 017XXXXXXXX"
                      />
                    </div>

                    <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-2 relative">
                      <div className="flex justify-between items-center absolute top-3 left-4 right-4">
                        <label className="text-slate text-[10px] uppercase font-bold tracking-widest">
                          Withdraw Amount (BDT)
                        </label>
                        <span className="text-gold text-[10px] font-mono">
                          Min: 250 BDT | Bal: {formatCurrency(profile?.balance || 0, profile?.currency)}
                        </span>
                      </div>
                      <input
                        id="withdraw-amount-input"
                        type="number"
                        required
                        min="250"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full bg-transparent px-4 pt-8 pb-3 text-white text-xl font-mono focus:outline-none placeholder:text-slate/30"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Quick Amount Selectors */}
                    <div className="flex gap-2">
                      {[250, 500, 765, 1000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setAmount(amt.toString())}
                          className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono text-slate hover:text-white transition-colors"
                        >
                          {amt} BDT
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setAmount((profile.balance || 0).toString())}
                        className="flex-1 py-2 bg-gold/10 hover:bg-gold/20 border border-gold/30 rounded-xl text-xs font-mono text-gold transition-colors font-bold"
                      >
                        MAX
                      </button>
                    </div>

                    <div className="bg-[#0A0A0A] p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                      <span className="text-slate text-xs">Network &amp; Processing Fee</span>
                      <span className="text-emerald-400 font-mono text-sm font-bold">0 BDT (FREE)</span>
                    </div>

                    <button
                      id="submit-withdraw-btn"
                      type="submit"
                      disabled={isSubmittingWithdraw}
                      className="w-full py-5 bg-gradient-to-r from-gold via-yellow-400 to-amber-500 text-black rounded-2xl font-black tracking-widest shadow-[0_0_30px_rgba(255,215,0,0.3)] hover:brightness-110 transition-all active:scale-[0.98] cursor-pointer flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                      {isSubmittingWithdraw ? "REQUESTING..." : "REQUEST CASHOUT (উইথড্র নিশ্চিত করুন)"} <ChevronRight className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          )}

          {activeSubTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <h3 className="text-slate text-[10px] uppercase font-bold tracking-widest pl-2">
                Transaction History
              </h3>
              {transactions.length === 0 ? (
                <div className="bg-[#0A0A0A] rounded-2xl p-12 text-center border border-white/5">
                  <Clock className="w-8 h-8 text-slate/40 mx-auto mb-3" />
                  <p className="text-slate text-xs">No transactions recorded yet.</p>
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-[#0A0A0A] p-4 rounded-2xl border border-white/5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          tx._category === 'deposit'
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {tx._category === 'deposit' ? (
                          <ArrowDownRight className="w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                          {tx._category === 'deposit' ? (
                            tx.type === 'verification' ? 'Verification Fee' : 'Deposit'
                          ) : (
                            'Cashout'
                          )}
                          <span className="text-slate text-[10px] font-normal lowercase">({tx.method})</span>
                        </div>
                        <div className="text-slate/60 text-[10px] font-mono">
                          {new Date(tx.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`font-mono font-bold text-sm ${
                          tx._category === 'deposit' ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {tx._category === 'deposit' ? "+" : "-"}
                        {formatCurrency(tx.amount, profile?.currency)}
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        {tx.status === 'approved' && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                        )}
                        {tx.status === 'rejected' && (
                          <span className="text-[10px] text-red-400 flex items-center gap-0.5">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        )}
                        {tx.status === 'pending' && (
                          <span className="text-[10px] text-yellow-400 flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
