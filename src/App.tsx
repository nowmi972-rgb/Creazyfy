import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { House, Crown, Wallet, User } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { HomeTab } from './components/HomeTab';
import { VipTab } from './components/VipTab';
import { WalletTab } from './components/WalletTab';
import { ProfileTab } from './components/ProfileTab';
import { AuthModal } from './components/AuthModal';
import { Toast } from './components/Toast';
import { soundManager } from './utils/audio';

const MainLayout: React.FC = () => {
  const { user, authReady, activeTab, setActiveTab, setVerificationDeposit } = useApp();
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const current = e.currentTarget.scrollTop;
    if (current > lastScrollTop && current > 60) {
      setIsNavVisible(false);
    } else {
      setIsNavVisible(true);
    }
    setLastScrollTop(current);
  };

  const navItems = [
    { id: 'home', icon: House, label: 'Home' },
    { id: 'vip', icon: Crown, label: 'VIP' },
    { id: 'wallet', icon: Wallet, label: 'Wallet' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  const handleTabChange = (tabId: string) => {
    if (activeTab !== tabId) {
      soundManager.playPop();
      if (tabId === 'wallet') {
        setVerificationDeposit(false);
      }
      setActiveTab(tabId);
    }
  };

  if (!authReady) {
    return (
      <div className="h-screen bg-void flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-void overflow-hidden">
      <main
        onScroll={handleScroll}
        className="flex-1 overflow-x-hidden overflow-y-auto pb-20 no-scrollbar relative"
      >
        <AnimatePresence mode="wait" custom={activeTab}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="h-full origin-top"
          >
            {activeTab === 'home' && <HomeTab />}
            {activeTab === 'vip' && <VipTab />}
            {activeTab === 'wallet' && <WalletTab />}
            {activeTab === 'profile' && <ProfileTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Persistent Bottom Floating Glass Navigation */}
      <motion.nav
        initial={{ y: 0 }}
        animate={{ y: isNavVisible ? 0 : 100 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed bottom-0 w-full glass-panel border-t border-white/10 rounded-t-3xl pb-safe pt-2 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-40"
      >
        <ul className="flex justify-between items-center py-2 relative">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <li key={item.id} className="relative z-10 w-16 flex flex-col items-center">
                <button
                  id={`bottom-nav-${item.id}-btn`}
                  onClick={() => handleTabChange(item.id)}
                  className="flex flex-col items-center w-full focus:outline-none cursor-pointer"
                >
                  <motion.div
                    animate={{
                      y: isActive ? -4 : 0,
                      scale: isActive ? 1.1 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <Icon
                      size={24}
                      className={`mb-1 transition-colors ${
                        isActive ? 'text-gold' : 'text-slate'
                      }`}
                    />
                  </motion.div>
                  <span
                    className={`text-[10px] font-medium transition-colors ${
                      isActive ? 'text-white' : 'text-slate'
                    }`}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="navIndicator"
                      className="absolute -bottom-3 w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_8px_#FFD700]"
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </motion.nav>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
      <Toast />
    </AppProvider>
  );
}
