'use client';

import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, AlertCircle, HelpCircle, CheckCircle2, Info, Loader2, X } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'primary' | 'success' | 'info';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg';
  showCloseButton?: boolean;
  align?: 'left' | 'center';
}

const VARIANT_CONFIG: Record<
  ConfirmVariant,
  {
    icon: typeof AlertTriangle;
    iconBg: string;
    iconColor: string;
    confirmButtonClass: string;
  }
> = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60',
    iconColor: 'text-rose-600 dark:text-rose-400',
    confirmButtonClass: 'bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-sm shadow-rose-600/20',
  },
  warning: {
    icon: AlertCircle,
    iconBg: 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60',
    iconColor: 'text-amber-600 dark:text-amber-400',
    confirmButtonClass: 'bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-sm shadow-amber-600/20',
  },
  primary: {
    icon: HelpCircle,
    iconBg: 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60',
    iconColor: 'text-blue-600 dark:text-blue-400',
    confirmButtonClass: 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-sm shadow-blue-600/20',
  },
  success: {
    icon: CheckCircle2,
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    confirmButtonClass: 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-sm shadow-emerald-600/20',
  },
  info: {
    icon: Info,
    iconBg: 'bg-sky-50 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60',
    iconColor: 'text-sky-600 dark:text-sky-400',
    confirmButtonClass: 'bg-sky-600 hover:bg-sky-700 active:scale-95 text-white shadow-sm shadow-sky-600/20',
  },
};

const MAX_WIDTH_CLASSES: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  children,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'primary',
  isLoading = false,
  maxWidth = 'md',
  showCloseButton = false,
  align = 'left',
}: ConfirmModalProps) {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.primary;
  const IconComponent = config.icon;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

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

  const maxWidthClass = MAX_WIDTH_CLASSES[maxWidth] || 'max-w-md';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Overlay / Backdrop con desenfoque suave */}
          <motion.div
            className="fixed inset-0 bg-slate-950/60 dark:bg-black/75 backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={isLoading ? undefined : onClose}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${maxWidthClass} bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 sm:p-7 z-10`}
          >
            {/* Opcional botón de cerrar X en esquina superior derecha */}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Header con Icono y Textos */}
            <div
              className={`flex ${
                align === 'center'
                  ? 'flex-col items-center text-center'
                  : 'items-start gap-4 text-left'
              }`}
            >
              {/* Badge Icon */}
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  config.iconBg
                } ${align === 'center' ? 'mb-3' : ''}`}
              >
                <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
              </div>

              {/* Título y Descripción */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  {title}
                </h3>
                {description && (
                  <div className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {description}
                  </div>
                )}
              </div>
            </div>

            {/* Contenido extra opcional */}
            {children && <div className="mt-4">{children}</div>}

            {/* Footer con Botones (Cancelar a la izquierda, Acción a la derecha) */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition active:scale-95 cursor-pointer disabled:opacity-50 text-center"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-60 text-center ${config.confirmButtonClass}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <span>{confirmText}</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
