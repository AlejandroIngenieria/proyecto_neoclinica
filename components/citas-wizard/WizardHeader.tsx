'use client';

import { useRouter } from 'next/navigation';
import { useCitaStore, type CitaStep } from '@/store/use-cita-store';
import { useDoctorByCode } from '@/hooks/use-doctors';
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
    codMedico, modalidad,
    servicioSeleccionado,
    fecha, hora, step, setStep,
    pacienteSeleccionado, motivo,
    tipoPagoId, billeteraItemId,
    citaConfirmada
  } = useCitaStore();

  const { data: doctor } = useDoctorByCode(codMedico || "");

  if (citaConfirmada) {
    return null;
  }

  const isStep1Done = step > 1 || !!(modalidad && servicioSeleccionado && fecha && hora);
  const isStep2Done = step > 2 || (isStep1Done && !!(pacienteSeleccionado && motivo));
  const isStep3Done = step > 3 || (isStep2Done && !!(tipoPagoId || billeteraItemId));
  const isStep4Done = step === 4;

  const stepsList: { num: CitaStep; label: string; icon: any; isDone: boolean; isCurrent: boolean; canNavigate: boolean }[] = [
    { num: 1, label: 'Horario', icon: CalendarClock, isDone: isStep1Done, isCurrent: step === 1, canNavigate: step > 1 },
    { num: 2, label: 'Paciente', icon: User, isDone: isStep2Done, isCurrent: step === 2, canNavigate: isStep1Done && step > 2 },
    { num: 3, label: 'Pago', icon: CreditCard, isDone: isStep3Done, isCurrent: step === 3, canNavigate: isStep2Done && step > 3 },
    { num: 4, label: 'Confirmar', icon: ShieldCheck, isDone: isStep4Done, isCurrent: step === 4, canNavigate: false },
  ];

  return (
    <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-[#0B1120]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 py-3.5 px-2 mb-6 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Doctor Profile Info */}
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={() => router.back()}
            className="flex items-center justify-center p-1.5 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-full transition cursor-pointer shrink-0"
            title="Regresar"
            aria-label="Regresar"
          >
            <ChevronLeft className="h-6 w-6 stroke-[2]" />
          </button>
          
          {doctor && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm bg-slate-100 dark:bg-slate-800 shrink-0">
                <img 
                  src={doctor.exp_foto_perfil || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.exp_primer_nom + ' ' + doctor.exp_primer_ape)}&background=0284c7&color=fff`} 
                  alt={`${doctor.exp_primer_nom} ${doctor.exp_primer_ape}`}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                  Dr{doctor.exp_sexo === 'F' ? 'a' : ''}. {doctor.exp_primer_nom} {doctor.exp_primer_ape}
                </h1>
                <p className="text-[11px] text-sky-700 dark:text-sky-400 font-semibold truncate">
                  {doctor.especialidades?.map(e => e.especialidad).join(', ') || 'Especialista Médico'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Minimalist Icon Stepper with Dynamic Checkmarks */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 bg-white dark:bg-[#1E293B] px-3.5 py-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs shrink-0">
          {stepsList.map((s, idx, arr) => {
            const IconComponent = s.icon;
            const isCompleted = s.isDone && !s.isCurrent;

            return (
              <div key={s.num} className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => s.canNavigate && setStep(s.num)}
                  disabled={!s.canNavigate}
                  className={`flex items-center gap-1.5 py-1 px-1.5 sm:px-2 rounded-xl transition-all duration-200 ${
                    s.canNavigate ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                  } ${
                    isCompleted
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : s.isCurrent
                      ? 'text-sky-700 dark:text-sky-300 font-extrabold'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                  title={`Paso ${s.num}: ${s.label}${isCompleted ? ' (Completado - Clic para volver)' : ''}`}
                >
                  {/* Minimalist Icon Badge */}
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-500 text-white shadow-xs ring-2 ring-emerald-200 dark:ring-emerald-900/60'
                        : s.isCurrent
                        ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30 ring-2 ring-sky-300 dark:ring-sky-700'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                    ) : (
                      <IconComponent className="w-3.5 h-3.5" />
                    )}
                  </div>

                  {/* Minimalist Label */}
                  <span className={`text-[11px] font-bold tracking-tight hidden sm:inline ${
                    s.isCurrent ? 'text-slate-900 dark:text-white font-extrabold' : ''
                  }`}>
                    {s.label}
                  </span>
                </button>

                {/* Connecting Track */}
                {idx < arr.length - 1 && (
                  <div
                    className={`w-2 sm:w-3.5 h-0.5 rounded-full transition-colors duration-300 ${
                      s.isDone ? 'bg-emerald-400 dark:bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
