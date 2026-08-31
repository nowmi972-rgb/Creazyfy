import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  return (
    <AnimatePresence>
      {toast.isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-24 left-0 right-0 mx-auto w-max max-w-[90vw] z-50 pointer-events-none"
        >
          <div className="bg-void/95 backdrop-blur-md border border-gold/30 shadow-lg shadow-gold/10 px-6 py-3 rounded-full flex items-center justify-center gap-3">
            <div className="w-2 h-2 rounded-full bg-gold animate-pulse shrink-0" />
            <span className="text-white font-medium text-sm tracking-wide text-center">
              {toast.message}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
