'use client';

import { use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, CalendarDays, ArrowRight, ShieldCheck } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { useCitaByCodigo } from '@/hooks/use-flujo-citas';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Inicio' },
  { href: '/dashboard/directorio', label: 'Directorio' },
  { href: '/dashboard/medicamentos', label: 'Medicamentos' },
  { href: '/dashboard/citas', label: 'Citas' },
];

export default function CitaExitoPage({ params }: { params: Promise<{ citaId: string }> }) {
  const { citaId } = use(params);
  const { data: cita } = useCitaByCodigo(citaId);

  const docName = (cita as any)?.medicoNombre || (cita as any)?.nombreMedico || 'Especialista Médico';
  const docPhoto = (cita as any)?.fotoPerfilMedico || `https://ui-avatars.com/api/?name=${encodeURIComponent(docName)}&background=0284c7&color=fff`;
  const docSpecialty = (cita as any)?.medicoEspecialidad || (cita as any)?.especialidad || '';
  const ctaFecha = (cita as any)?.ctaFecha || (cita as any)?.fecha;
  const ctaHora = (cita as any)?.ctaHora || (cita as any)?.hora;
  const ctaServicio = (cita as any)?.servicioNombre || (cita as any)?.servicio;
  const ctaModalidad = (cita as any)?.ctaModalidad || (cita as any)?.modalidad;
  const clinicaNombre = (cita as any)?.clinicaNombre;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white">
      <Navbar subtitle="Cita agendada" navLinks={NAV_LINKS} />
      
      <motion.main
        className="mx-auto flex max-w-xl flex-col items-center px-4 py-12 sm:py-16 text-center"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Success Icon Badge */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30">
            <Check className="w-9 h-9 stroke-[3]" />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
          ¡Cita Programada con Éxito!
        </h1>
        
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
          Tu consulta médica ha sido reservada correctamente en SaludYa.
        </p>

        {/* Doctor Info with Circular Photo */}
        <div className="w-full rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 p-5 shadow-sm mb-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-emerald-500/30 shadow-md shrink-0 bg-slate-100 dark:bg-slate-800 mx-auto sm:mx-0">
            <img
              src={docPhoto}
              alt={docName}
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 block mb-0.5">
              Especialista Asignado
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">
              {docName}
            </h3>
            {docSpecialty && (
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {docSpecialty}
              </p>
            )}
          </div>
        </div>

        {/* Appointment Summary Card */}
        {cita && (
          <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-5 text-left space-y-3 mb-8 shadow-sm">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-400 uppercase tracking-wider">Detalles de la Cita</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" /> Confirmada
              </span>
            </div>

            {ctaFecha && (
              <div className="text-xs sm:text-sm">
                <span className="text-slate-400 font-semibold block text-[11px] uppercase">Fecha y Hora</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {format(new Date(ctaFecha), "EEEE dd 'de' MMMM, yyyy", { locale: es })} · {ctaHora ? String(ctaHora).slice(0, 5) : ''}
                </span>
              </div>
            )}

            {ctaServicio && (
              <div className="text-xs sm:text-sm">
                <span className="text-slate-400 font-semibold block text-[11px] uppercase">Servicio</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {ctaServicio}
                </span>
              </div>
            )}

            {ctaModalidad && (
              <div className="text-xs sm:text-sm">
                <span className="text-slate-400 font-semibold block text-[11px] uppercase">Modalidad</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                  {ctaModalidad} {clinicaNombre ? `· ${clinicaNombre}` : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <Link 
            href="/dashboard/citas" 
            className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-sky-600/25 transition"
          >
            <CalendarDays className="h-4 w-4" />
            <span>Ver mis Citas</span>
          </Link>
          <Link 
            href="/dashboard" 
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] px-7 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <span>Volver al Inicio</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.main>
    </div>
  );
}
