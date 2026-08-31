import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle2, ShieldCheck, Gift, X } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const notifications = [
    {
      id: 1,
      title: "Binance Partnership Verified",
      desc: "Instant gateway deposits and crypto withdrawals are active 24/7.",
      time: "Just now",
      icon: ShieldCheck,
      color: "text-gold bg-gold/10 border-gold/20"
    },
    {
      id: 2,
      title: "Daily Bonus & Task Boost",
      desc: "Claim your daily earning reward every 24 hours to maximize your earnings.",
      time: "2h ago",
      icon: Gift,
      color: "text-green-400 bg-green-500/10 border-green-500/20"
    },
    {
      id: 3,
      title: "Kashmir Tour Campaign Live",
      desc: "Refer verified members to qualify for the all-inclusive Kashmir trip!",
      time: "1d ago",
      icon: CheckCircle2,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20"
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-sm bg-[#0E0E0E] border border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-gold" />
                </div>
                <h3 className="text-white font-bold text-base">Notifications</h3>
              </div>
              <button
                id="close-notifications-btn"
                onClick={() => {
                  soundManager.playPop();
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
              {notifications.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-white/5 hover:bg-white/[0.08] transition-colors rounded-2xl border border-white/5 flex gap-3 items-start"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${item.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white font-semibold text-xs">{item.title}</h4>
                        <span className="text-[10px] text-slate/60">{item.time}</span>
                      </div>
                      <p className="text-slate/80 text-[11px] mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              id="mark-all-read-btn"
              onClick={() => {
                soundManager.playPop();
                onClose();
              }}
              className="mt-5 w-full py-3 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
            >
              Mark All as Read
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
