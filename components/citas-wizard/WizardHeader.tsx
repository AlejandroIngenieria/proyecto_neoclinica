'use client';

import { useRouter } from 'next/navigation';
import { useCitaStore } from '@/store/use-cita-store';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { ChevronLeft, MapPin, Building2, CalendarDays, CalendarClock } from 'lucide-react';

export function WizardHeader() {
  const router = useRouter();
  const { 
    codMedico, modalidad, clinicaSeleccionada, areaDomicilio,
    fecha, hora, step
  } = useCitaStore();

  const { data: doctor } = useDoctorByCode(codMedico || "");

  // We show 4 steps maximum in the wizard UI
  const displayStep = step > 4 ? 4 : step;

  return (
    <div className="sticky top-0 z-30 bg-slate-50/90 dark:bg-transparent backdrop-blur-md flex flex-col xl:flex-row xl:items-center gap-6 mb-8 py-4">
      
      {/* Doctor Info */}
      <div className="flex items-center gap-2 pr-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center justify-center p-1 text-blue-700 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#1E293B] rounded-full transition-colors mr-2"
        >
          <ChevronLeft className="h-8 w-8" strokeWidth={1.5} />
        </button>
        
        {doctor && (
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-slate-100 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 shrink-0 shadow-sm">
              <img 
                src={doctor.exp_foto_perfil || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.exp_primer_nom + ' ' + doctor.exp_primer_ape)}&background=0D8ABC&color=fff`} 
                alt={`${doctor.exp_primer_nom} ${doctor.exp_primer_ape}`}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">
                Dr{doctor.exp_sexo === 'F' ? 'a' : ''}. {doctor.exp_primer_nom} {doctor.exp_primer_ape}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                {doctor.especialidades?.map(e => e.especialidad).join(', ') || 'Especialista'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="hidden xl:block w-px h-12 bg-slate-200 dark:bg-slate-800"></div>

      {/* Info Strip (Right side) */}
      <div className="flex flex-1 flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pl-0 xl:pl-6">
        <div className="flex flex-col gap-1.5 mt-2 xl:mt-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] font-medium text-slate-600 dark:text-slate-300">
              <span className="capitalize flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" /> 
                {modalidad || 'Pendiente'}
              </span>
              
              {modalidad !== 'virtual' && (
                <>
                  <span className="text-slate-300 dark:text-slate-700 text-xs">•</span>
                  <span className="leading-snug max-w-[200px] xl:max-w-[250px] whitespace-normal break-words flex items-start gap-1.5 pt-0.5">
                    <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-[2px]" />
                    <span className="flex-1">
                      {modalidad === 'presencial' ? (clinicaSeleccionada?.cliDescripcion || 'Pendiente') : 
                       modalidad === 'domicilio' ? (areaDomicilio?.municipio || 'Pendiente') : 'Virtual'}
                    </span>
                  </span>
                </>
              )}
              
              <span className="text-slate-300 dark:text-slate-700 text-xs">•</span>
              
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                {fecha ? `${fecha.getDate()} ${fecha.toLocaleString('es', { month: 'short' })}` : 'Pendiente'}
              </span>
              
              <span className="text-slate-300 dark:text-slate-700 text-xs">•</span>
              
              <span className="flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                {hora || 'Pendiente'}
              </span>
            </div>
        </div>

        {/* Step Number at Far Right */}
        <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0F172A] px-5 py-2 rounded-xl border border-slate-100 dark:border-slate-800 min-w-[80px]">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Paso</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-blue-600 dark:text-blue-400 leading-none">{displayStep}</span>
            <span className="text-sm font-bold text-slate-400 dark:text-slate-500">/ 4</span>
          </div>
        </div>
      </div>
    </div>
  );
}
