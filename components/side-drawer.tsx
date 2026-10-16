'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type SideDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
};

export function SideDrawer({ isOpen, onClose, children, title, subtitle }: SideDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title && typeof title === 'string' ? title : 'Modal de información'}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Modal Centrado Minimalista */}
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-[0_20px_60px_rgba(11,28,48,0.12)] border border-slate-200/50 dark:border-slate-800 text-slate-900 dark:text-slate-100 flex flex-col max-h-[88vh] overflow-hidden z-10"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header Limpio y Minimalista */}
            {(title || subtitle) && (
              <div className="flex items-center justify-between gap-4 px-6 py-4.5 sm:px-7 border-b border-slate-100 dark:border-slate-800/80 bg-[#eff4ff]/30 dark:bg-slate-800/30 shrink-0">
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    {title && <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">{title}</div>}
                    {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</div>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                  aria-label="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Contenido (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-7 scrollbar-gutter-stable">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

