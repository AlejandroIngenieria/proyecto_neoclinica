'use client';

import { useCitaStore } from '@/store/use-cita-store';
import { ChevronLeft, ArrowRight } from 'lucide-react';

export function WizardFooter() {
  const { 
    step, nextStep, prevStep,
    modalidad, clinicaSeleccionada, areaDomicilio, fecha, hora,
    pacienteSeleccionado, motivo
  } = useCitaStore();

  const isStep1Complete = (() => {
    const isScheduleEnabled = 
      (modalidad === 'virtual') || 
      (modalidad === 'presencial' && clinicaSeleccionada) || 
      (modalidad === 'domicilio' && areaDomicilio);
    return isScheduleEnabled && !!fecha && !!hora;
  })();

  const isStep2Complete = pacienteSeleccionado !== null && motivo !== '';
  
  const isComplete = step === 1 ? isStep1Complete : (step === 2 ? isStep2Complete : true);

  return (
    <div className="sticky bottom-0 z-30 bg-transparent flex justify-between items-center py-4 border-t border-slate-200/60 dark:border-slate-800/40 mt-8">
        <div className="flex-1">
          {step > 1 && (
            <button
              onClick={prevStep}
              className="font-bold py-3.5 px-8 rounded-xl transition-all flex items-center gap-2 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0F172A] shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" /> Regresar
            </button>
          )}
        </div>
        
        <div className="flex-1 flex justify-end">
          {step < 3 && (
            <button
              onClick={nextStep}
              disabled={!isComplete}
              className={`font-bold py-3.5 px-10 rounded-xl transition-all flex items-center gap-2 ${
                isComplete 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              Continuar al Siguiente Paso <ArrowRight className="h-5 w-5" />
            </button>
          )}
        </div>
    </div>
  );
}
