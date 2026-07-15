'use client';

import { use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, CalendarDays, ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/navbar';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Directorio' },
  { href: '/dashboard/medicamentos', label: 'Medicamentos' },
  { href: '/dashboard/citas', label: 'Citas' },
];

export default function CitaExitoPage({ params }: { params: Promise<{ citaId: string }> }) {
  const { citaId } = use(params);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar subtitle="Cita agendada" navLinks={NAV_LINKS} />
      
      <motion.main
        className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative mb-8">
          <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-20" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/30">
            <Check className="h-12 w-12" />
          </div>
        </div>

        <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-4">
          ¡Cita Confirmada!
        </h1>
        
        <p className="text-lg text-slate-500 max-w-md mx-auto leading-relaxed mb-8">
          Tu cita ha sido agendada exitosamente. Recibirás una notificación con los detalles pronto.
        </p>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm mb-10 inline-block text-left min-w-[300px]">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">ID de Cita</p>
          <p className="font-mono text-sm font-semibold text-slate-700 bg-slate-50 p-2 rounded-xl inline-block border border-slate-100">
            {citaId}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link 
            href="/dashboard/citas" 
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800"
          >
            <CalendarDays className="h-5 w-5" />
            Ver mis citas
          </Link>
          <Link 
            href="/dashboard" 
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-8 py-4 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Volver al inicio
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </motion.main>
    </div>
  );
}
