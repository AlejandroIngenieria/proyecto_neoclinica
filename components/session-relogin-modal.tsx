'use client';

import { AlertTriangle, X } from 'lucide-react';

export type SessionReauthReason = 'login-required' | 'session-expired' | 'auth-error';

type SessionReloginModalProps = {
  open: boolean;
  reason: SessionReauthReason;
  onClose: () => void;
  onPrimaryAction: () => void;
};

const copyByReason: Record<SessionReauthReason, { title: string; description: string; primaryLabel: string }> = {
  'login-required': {
    title: 'Debes iniciar sesión',
    description: 'Para continuar en NeoClínica necesitas volver a iniciar sesión con tu cuenta.',
    primaryLabel: 'Abrir inicio de sesión',
  },
  'session-expired': {
    title: 'Tu sesión expiró',
    description: 'Por seguridad cerramos la sesión. Vuelve a iniciar sesión para recuperar el acceso.',
    primaryLabel: 'Iniciar sesión otra vez',
  },
  'auth-error': {
    title: 'No pudimos verificar tu acceso',
    description: 'Ocurrió un problema al validar la sesión. Intenta iniciar sesión de nuevo para reintentar.',
    primaryLabel: 'Reintentar inicio de sesión',
  },
};

export default function SessionReloginModal({ open, reason, onClose, onPrimaryAction }: SessionReloginModalProps) {
  if (!open) {
    return null;
  }

  const content = copyByReason[reason];

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_20px_60px_rgba(11,28,48,0.12)] text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar aviso"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-5 p-6 sm:p-7">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{content.title}</h2>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400">{content.description}</p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-700 bg-transparent px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Más tarde
            </button>
            <button
              type="button"
              onClick={onPrimaryAction}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#006194] hover:bg-[#00517c] active:scale-95 px-5 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
            >
              {content.primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
