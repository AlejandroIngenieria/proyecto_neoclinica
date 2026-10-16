'use client';

import { useRouter } from 'next/navigation';
import { useCitaStore, type CitaStep } from '@/store/use-cita-store';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { buildDoctorFullName } from '@/types';
import {
  ChevronLeft,
  CalendarClock,
  User,
  CreditCard,
  ShieldCheck,
  Check,
} from 'lucide-react';

export function WizardHeader() {
  const router = useRouter();
  const { 
    codMedico,
    medicoName,
    step,
    setStep,
    citaConfirmada,
  } = useCitaStore();

  const { data: doctor } = useDoctorByCode(codMedico || '');

  if (citaConfirmada) {
    return null;
  }

  const stepsList: { num: CitaStep; label: string; icon: any }[] = [
    { num: 1, label: 'Horario', icon: CalendarClock },
    { num: 2, label: 'Paciente', icon: User },
    { num: 3, label: 'Pago', icon: CreditCard },
    { num: 4, label: 'Confirmar', icon: ShieldCheck },
  ];

  const nombreDoctor = doctor ? buildDoctorFullName(doctor) : (medicoName || 'Especialista Médico');
  const fotoDoctor = doctor?.exp_foto_perfil || null;
  const especialidades = doctor?.especialidades?.map(e => e.especialidad).join(' & ') || doctor?.exp_profesion || 'Especialista Médico';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <header className="sticky top-2 sm:top-4 z-40 mb-6 sm:mb-8 transition-all px-1 sm:px-0">
      {/* Cápsula Monolítica Flotante - Inspiración Dynamic Island */}
      <div className="w-full max-w-7xl mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-full py-2 sm:py-2.5 px-3 sm:px-5 border border-slate-100/90 dark:border-slate-800/90 shadow-[0_4px_24px_rgba(11,28,48,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] flex items-center justify-between gap-3 sm:gap-4 transition-all">
        
        {/* LADO IZQUIERDO: Botón Regresar + Perfil del Médico con Badge de Verificación */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          {/* Botón circular de retroceso */}
          <button 
            type="button"
            onClick={() => router.back()}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#f8fafc] dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/80 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-[#006194] dark:hover:text-sky-400 transition cursor-pointer shrink-0"
            title="Regresar"
            aria-label="Regresar"
          >
            <ChevronLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
          </button>
          
          {/* Avatar del médico con punto de disponibilidad online */}
          <div className="relative shrink-0">
            {fotoDoctor ? (
              <img 
                src={fotoDoctor} 
                alt={nombreDoctor}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-700 bg-slate-100 dark:bg-slate-800 shadow-2xs"
              />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#eff4ff] dark:bg-slate-800 text-[#006194] dark:text-sky-400 font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 ring-2 ring-white dark:ring-slate-700 shadow-2xs">
                {getInitials(nombreDoctor)}
              </div>
            )}
            {/* Punto indicador de disponibilidad (verde) */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00a86b] rounded-full ring-2 ring-white dark:ring-slate-900" />
          </div>

          {/* Información del médico (Nombre + Check Azul + Especialidad) */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-[#0b1c30] dark:text-white leading-tight truncate tracking-tight">
                {nombreDoctor}
              </h2>
              {/* Badge Azul de Verificación Médica */}
              <span 
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#006194] text-white shrink-0 shadow-2xs"
                title="Especialista Verificado"
              >
                <Check className="w-2.5 h-2.5 stroke-[3.5]" />
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate leading-tight mt-0.5">
              {especialidades}
            </p>
          </div>
        </div>

        {/* LADO DERECHO: Cápsula Recesiva de Progreso (Stepper Dynamic Island) */}
        <div className="bg-[#f8fafc] dark:bg-slate-800/60 rounded-full py-1 sm:py-1.5 px-2 sm:px-3 border border-slate-100 dark:border-slate-700/60 flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {stepsList.map((s, idx, arr) => {
            const IconComponent = s.icon;
            const isPassed = step > s.num;
            const isCurrent = step === s.num;
            const canNavigate = step > s.num;

            return (
              <div key={s.num} className="flex items-center gap-1.5 sm:gap-2">
                {/* Paso Interactivo */}
                <button
                  type="button"
                  onClick={() => canNavigate && setStep(s.num)}
                  disabled={!canNavigate}
                  className={`flex items-center gap-1.5 transition-all duration-200 select-none ${
                    canNavigate ? 'cursor-pointer hover:opacity-85' : 'cursor-default'
                  } ${
                    isCurrent
                      ? 'px-2 sm:px-2.5 py-0.5 rounded-full border border-[#006194]/30 bg-white dark:bg-slate-900 shadow-xs'
                      : 'p-0.5'
                  }`}
                  title={`Paso ${s.num}: ${s.label}${isPassed ? ' (Completado - Clic para volver)' : isCurrent ? ' (Paso actual)' : ''}`}
                >
                  {/* Círculo indicador / Icono */}
                  {isPassed ? (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#00a86b] text-white flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-200">
                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3.5]" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#006194] text-white flex items-center justify-center shrink-0 shadow-xs ring-2 ring-[#006194]/20">
                      <IconComponent className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-slate-300 dark:border-slate-600 bg-transparent text-slate-400 dark:text-slate-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {s.num}
                    </div>
                  )}

                  {/* Etiqueta de texto */}
                  <span className={`text-[11px] sm:text-xs font-bold tracking-tight hidden sm:inline ${
                    isPassed
                      ? 'text-slate-700 dark:text-slate-200'
                      : isCurrent
                      ? 'text-[#006194] dark:text-sky-400 font-extrabold'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {s.label}
                  </span>
                </button>

                {/* Línea conectora entre pasos */}
                {idx < arr.length - 1 && (
                  <div
                    className={`w-2.5 sm:w-3.5 h-0.5 rounded-full transition-colors duration-300 shrink-0 ${
                      step > s.num
                        ? 'bg-[#00a86b]'
                        : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

      </div>
    </header>
  );
}
