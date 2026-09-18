'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface AuthErrorModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  errorMessage: string | null;
}

export function AuthErrorModal({
  open,
  onClose,
  title = 'Aviso de Autenticación',
  errorMessage,
}: AuthErrorModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!errorMessage) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(errorMessage);
        setCopied(true);
        toast.success('Mensaje copiado al portapapeles');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      toast.error('No se pudo copiar el texto');
    }
  };

  return (
    <AnimatePresence>
      {open && errorMessage ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          {/* Backdrop con desenfoque */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
          />

          {/* Modal Minimalista */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-white z-101"
          >
            {/* Botón de cerrar superior */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ventana modal"
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Encabezado */}
            <div className="flex items-start gap-3.5 mb-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0 pr-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Detalle del problema encontrado al intentar acceder
                </p>
              </div>
            </div>

            {/* Contenido del mensaje con estilo de tarjeta legible */}
            <div className="mb-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-3.5 text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-normal select-text break-words">
                {errorMessage}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copiar contenido</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
