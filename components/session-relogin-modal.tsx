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
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.25)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar aviso"
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-5 px-6 py-7 sm:px-7 sm:py-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <AlertTriangle className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{content.title}</h2>
            <p className="text-sm leading-6 text-slate-600">{content.description}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 hover:bg-slate-100"
            >
              Más tarde
            </button>
            <button
              type="button"
              onClick={onPrimaryAction}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-[#003ea8]"
            >
              {content.primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
