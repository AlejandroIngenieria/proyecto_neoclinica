'use client';

import { type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

type AnimatedModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Título que aparece en el header del modal */
  title?: ReactNode;
  /** Subtítulo debajo del título */
  subtitle?: ReactNode;
  /** Texto del label superior */
  label?: ReactNode;
  /** Estilo del modal: 'default' con cabecera azul o 'minimal' limpio y sin gradiente */
  variant?: 'default' | 'minimal';
  /** Ancho máximo personalizado (ej. 'max-w-lg') */
  maxWidth?: string;
};

export function AnimatedModal({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  label,
  variant = 'default',
  maxWidth,
}: AnimatedModalProps) {
  const isMinimal = variant === 'minimal';

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
            className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Contenido */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : 'Modal'}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${
              maxWidth || (isMinimal ? 'max-w-lg' : 'max-w-4xl')
            } overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_20px_60px_rgba(11,28,48,0.12)] text-slate-900 dark:text-slate-100`}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            {(title || label) && (
              <div className="flex items-start justify-between gap-4 px-6 py-4.5 border-b border-slate-100 dark:border-slate-800/80 bg-[#eff4ff]/30 dark:bg-slate-800/30">
                <div className="min-w-0 flex-1">
                  {label && (
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#006194] dark:text-sky-400 mb-0.5">
                      {label}
                    </p>
                  )}
                  {title && (
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {subtitle}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
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
