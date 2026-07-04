'use client';

import { Stethoscope } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Loader branded de NeoClinica.
 * Muestra el logo, el título "NeoClinica" y un spinner circular.
 */
export function NeoLoader({ fullScreenPortal = false }: { fullScreenPortal?: boolean }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const content = (
    <div className="fixed inset-0 z-[9999] flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-950 via-sky-950 to-slate-900">
      {/* Fondos decorativos */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-sky-500/10 blur-[120px]" />
        <div className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-cyan-400/10 blur-[120px]" />
      </div>

      <div className="relative flex flex-col items-center gap-8">
        {/* Ícono */}
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-sky-600 text-white shadow-2xl shadow-sky-500/30">
          <Stethoscope className="h-10 w-10" />
        </div>

        {/* Título */}
        <h1 className="text-2xl font-black uppercase tracking-[0.35em] text-white">
          NeoClinica
        </h1>

        {/* Spinner */}
        <div className="neo-spinner" />
      </div>

      {/* CSS del spinner */}
      <style>{`
        .neo-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: rgb(56, 189, 248);
          border-radius: 50%;
          animation: neo-spin 0.8s linear infinite;
        }

        @keyframes neo-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  if (fullScreenPortal && mounted && typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
}
