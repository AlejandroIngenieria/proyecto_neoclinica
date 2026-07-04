'use client';

import { type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

type AnimatedModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Título que aparece en el header del modal */
  title?: string;
  /** Subtítulo debajo del título */
  subtitle?: string;
  /** Texto del label superior */
  label?: string;
};

export function AnimatedModal({ isOpen, onClose, children, title, subtitle, label }: AnimatedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Contenido */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title ?? 'Modal'}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.3)]"
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header */}
            {(title || label) && (
              <div className="bg-linear-to-r from-slate-950 via-sky-950 to-sky-800 px-6 py-6 text-white sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {label && (
                      <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-200">{label}</p>
                    )}
                    {title && (
                      <h3 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{title}</h3>
                    )}
                    {subtitle && (
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-100/80">{subtitle}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                    aria-label="Cerrar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="max-h-[80vh] overflow-y-auto p-5 sm:p-6 scrollbar-gutter-stable">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
