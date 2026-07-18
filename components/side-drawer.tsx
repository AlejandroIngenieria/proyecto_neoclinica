'use client';

import { type ReactNode, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

type SideDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
};

export function SideDrawer({ isOpen, onClose, children, title, subtitle }: SideDrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-[#111827]/20 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Drawer Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title && typeof title === 'string' ? title : 'Panel de detalles'}
            className="relative w-full max-w-[800px] h-full bg-white dark:bg-[#111827] shadow-2xl flex flex-col z-10"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header Limpio y Minimalista */}
            {(title || subtitle) && (
              <div className="flex items-center justify-between gap-4 px-4 sm:px-8 py-4 sm:py-6 border-b border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-[#111827]">
                <div className="flex-1 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-lg p-2 -ml-2 text-[#6B7280] dark:text-slate-400 hover:bg-[#F3F4F6] dark:hover:bg-slate-800 transition-colors"
                    aria-label="Cerrar panel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div>
                    {title && <div className="text-lg sm:text-xl font-black text-[#111827] dark:text-white">{title}</div>}
                    {subtitle && <div className="text-sm font-medium text-[#6B7280] dark:text-slate-400">{subtitle}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Contenido (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-gutter-stable">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
