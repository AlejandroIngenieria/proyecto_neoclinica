'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, X, Loader2 } from 'lucide-react';

interface ConfirmLogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  callbackUrl?: string;
}

export default function ConfirmLogoutModal({
  isOpen,
  onClose,
  callbackUrl = '/login',
}: ConfirmLogoutModalProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Cerrar al presionar la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoggingOut) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoggingOut, onClose]);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({ callbackUrl });
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Fondo desenfocado minimalista */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => {
              if (!isLoggingOut) onClose();
            }}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          />

          {/* Tarjeta modal minimalista */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl p-6 text-center select-none z-10"
          >
            {/* Botón de cerrar (X) */}
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              aria-label="Cancelar y cerrar"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Ícono minimalista de cierre de sesión */}
            <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center mb-3.5 shadow-2xs">
              <LogOut className="w-5 h-5 ml-0.5" />
            </div>

            {/* Título y descripción */}
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              ¿Deseas cerrar sesión?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              ¿Realmente deseas salir de tu cuenta? Tendrás que iniciar sesión nuevamente para acceder.
            </p>

            {/* Botones de acción */}
            <div className="flex items-center gap-2.5 mt-5">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={onClose}
                className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm transition cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleConfirmLogout}
                className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm shadow-md shadow-rose-500/20 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saliendo...</span>
                  </>
                ) : (
                  'Sí, salir'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
