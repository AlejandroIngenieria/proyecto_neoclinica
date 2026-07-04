'use client';

import { useMemo } from 'react';
import { useHorarios } from '@/hooks/use-flujo-citas';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { useCitaStore } from '@/store/use-cita-store';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { NeoLoader } from '@/components/neo-loader';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import type { HorarioCitaDto } from '@/types/citas';
import 'react-day-picker/style.css';

export function Step2FechaHora() {
  const { 
    codMedico, modalidad, clinicaSeleccionada, areaDomicilio, 
    fecha, setFecha, hora, setHora, 
    prevStep, nextStep 
  } = useCitaStore();

  const { data: doctor, isLoading: loadingDoctor } = useDoctorByCode(codMedico!);

  const mclCodigo = modalidad === 'presencial' ? clinicaSeleccionada?.mclCodigo || null : 0; 
  const { data: horariosClinica = [], isLoading: loadingHorarios } = useHorarios(mclCodigo);

  const isLoading = loadingDoctor || loadingHorarios;

  const horarios = useMemo(() => {
    if (modalidad === 'presencial') {
      return horariosClinica;
    }
    
    // Si es virtual o domicilio, extraemos TODOS los horarios del doctor (combinados de todas sus clínicas)
    if (!doctor) return [];
    
    const combined: HorarioCitaDto[] = [];
    doctor.clinicas?.forEach(c => {
      c.horarios_atencion?.forEach(h => {
        combined.push({
          horDiaSemana: h.hor_dia_semana,
          horHoraInicio: h.hor_hora_inicio,
          horHoraFin: h.hor_hora_fin,
        });
      });
    });
    
    return combined;
  }, [modalidad, horariosClinica, doctor]);

  const disabledDays = useMemo(() => {
    if (!horarios.length) return [{ from: new Date(1900, 1, 1), to: new Date(2100, 1, 1) }]; // Disable all if no horarios
    const allowedDays = horarios.map(h => h.horDiaSemana); // 0=Sun, 1=Mon...
    return [
      { before: new Date() }, // Past days
      (date: Date) => !allowedDays.includes(date.getDay()) // Days not in allowedDays
    ];
  }, [horarios]);

  const availableTimeSlots = useMemo(() => {
    if (!fecha || !horarios.length) return [];
    const dayOfWeek = fecha.getDay();
    const horariosDia = horarios.filter(h => h.horDiaSemana === dayOfWeek);
    
    if (!horariosDia.length) return [];

    const slots = new Set<string>();
    
    horariosDia.forEach(horarioDia => {
      let current = new Date(`1970-01-01T${horarioDia.horHoraInicio}`);
      const end = new Date(`1970-01-01T${horarioDia.horHoraFin}`);

      while (current < end) {
        slots.add(current.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }));
        current.setMinutes(current.getMinutes() + 30);
      }
    });

    const uniqueSlots = Array.from(slots).sort();
    
    // Si es hoy, filtrar horarios que ya pasaron
    const now = new Date();
    if (fecha.toDateString() === now.toDateString()) {
      const currentTimeString = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      return uniqueSlots.filter(s => s > currentTimeString);
    }

    return uniqueSlots;
  }, [fecha, horarios]);

  if (isLoading) {
    return <div className="py-12"><NeoLoader fullScreenPortal={true} /></div>;
  }

  const isComplete = fecha && hora;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Fecha y Hora</h2>
        <p className="mt-1 text-slate-500">Selecciona el momento ideal para tu cita.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/2">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm flex justify-center">
            <DayPicker
              mode="single"
              selected={fecha || undefined}
              onSelect={(d) => setFecha(d || null)}
              locale={es}
              disabled={disabledDays}
              modifiersClassNames={{
                selected: 'bg-sky-600 text-white hover:bg-sky-700',
                today: 'font-bold text-sky-600'
              }}
              classNames={{
                day: 'p-0',
                day_button: 'h-10 w-10 font-medium hover:bg-sky-50 rounded-xl transition-colors',
                month_caption: 'flex justify-between pt-1 relative items-center mb-4',
                caption_label: 'text-sm font-bold capitalize',
                button_previous: 'h-8 w-8 flex items-center justify-center bg-transparent hover:bg-slate-100 p-1 rounded-md transition-colors',
                button_next: 'h-8 w-8 flex items-center justify-center bg-transparent hover:bg-slate-100 p-1 rounded-md transition-colors',
                month_grid: 'w-full border-collapse',
                weekday: 'text-slate-400 font-bold text-xs uppercase w-10 h-10',
              }}
            />
          </div>
        </div>

        <div className="md:w-1/2">
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            {fecha ? 'Horarios disponibles' : 'Selecciona un día'}
          </h3>
          
          {fecha ? (
            availableTimeSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {availableTimeSlots.map((slot) => {
                  const isSelected = hora === slot;
                  return (
                    <button
                      key={slot}
                      onClick={() => setHora(slot)}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                        isSelected
                          ? 'border-sky-500 bg-sky-600 text-white shadow-md'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50'
                      }`}
                    >
                      <Clock className="h-4 w-4" />
                      {slot}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                No hay horarios disponibles para este día. Por favor selecciona otro.
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Elige una fecha en el calendario para ver los horarios.
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-between border-t border-slate-100 pt-6">
        <button
          onClick={prevStep}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <button
          onClick={nextStep}
          disabled={!isComplete}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Siguiente
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
