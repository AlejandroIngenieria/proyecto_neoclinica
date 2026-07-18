'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useEffect } from 'react';
import { useModalidades, useClinicas, useAreasDomicilio, useHorarios, useHorasOcupadas } from '@/hooks/use-flujo-citas';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { useCitaStore } from '@/store/use-cita-store';
import { ChevronLeft, Stethoscope, MapPin, Video, Home, ArrowRight, CalendarDays, Clock, Building2, CalendarClock } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import type { HorarioCitaDto } from '@/types/citas';
import 'react-day-picker/style.css';
import { NeoLoader } from '@/components/neo-loader';

export function Step1Modalidad() {
  const {
    codMedico, modalidad, setModalidad,
    setClinica, setArea, clinicaSeleccionada, areaDomicilio,
    fecha, setFecha, hora, setHora, nextStep, step
  } = useCitaStore();
  const router = useRouter();

  const { data: modalidades = [], isLoading: loadingModalidades } = useModalidades(codMedico);
  const { data: clinicas = [], isLoading: loadingClinicas } = useClinicas(codMedico, modalidad);
  const { data: areas = [], isLoading: loadingAreas } = useAreasDomicilio(codMedico, modalidad);

  const { data: doctor, isLoading: loadingDoctor } = useDoctorByCode(codMedico!);

  const mclCodigo = modalidad === 'presencial' ? clinicaSeleccionada?.mclCodigo || null : 0;
  const { data: horariosClinica = [], isLoading: loadingHorarios } = useHorarios(mclCodigo);
  
  const { data: horasOcupadas = [] } = useHorasOcupadas(codMedico || null, fecha ? format(fecha, 'yyyy-MM-dd') : null);

  const isLoading = loadingModalidades || loadingDoctor;

  const horarios = useMemo(() => {
    if (modalidad === 'presencial') {
      return horariosClinica;
    }

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
    if (!horarios.length) return [{ from: new Date(1900, 1, 1), to: new Date(2100, 1, 1) }];
    const allowedDays = horarios.map(h => h.horDiaSemana);
    return [
      { before: new Date() },
      (date: Date) => !allowedDays.includes(date.getDay())
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

    const now = new Date();
    let validSlots = uniqueSlots;
    if (fecha.toDateString() === now.toDateString()) {
      const currentTimeString = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      validSlots = uniqueSlots.filter(s => s > currentTimeString);
    }

    return validSlots.map(slot => {
      // slot is in "HH:mm" format. The API returns "HH:mm:ss" (e.g. "08:00:00").
      const slotWithSeconds = `${slot}:00`;
      return {
        time: slot,
        disabled: horasOcupadas.includes(slotWithSeconds)
      };
    });
  }, [fecha, horarios, horasOcupadas]);

  useEffect(() => {
    if (!modalidad && modalidades.length > 0) {
      const hasPresencial = modalidades.some(m => m.modDescripcion.toLowerCase().includes('presencial'));
      setModalidad(hasPresencial ? 'presencial' : modalidades[0].modDescripcion.toLowerCase() as any);
    }
  }, [modalidad, setModalidad, modalidades]);

  if (isLoading) {
    return (
      <div className="py-12"><NeoLoader fullScreenPortal={false} /></div>
    );
  }

  const getIcon = (tipo: string, selected: boolean) => {
    const colorClass = selected ? "text-blue-700" : "text-slate-500";
    switch (tipo) {
      case 'presencial': return <MapPin className={`h-4 w-4 ${colorClass}`} />;
      case 'virtual': return <Video className={`h-4 w-4 ${colorClass}`} />;
      case 'domicilio': return <Home className={`h-4 w-4 ${colorClass}`} />;
      default: return <Stethoscope className={`h-4 w-4 ${colorClass}`} />;
    }
  };

  const getSummaryIcon = (tipo: string) => {
    switch (tipo) {
      case 'presencial': return <MapPin className="h-4 w-4 text-slate-400" />;
      case 'virtual': return <Video className="h-4 w-4 text-slate-400" />;
      case 'domicilio': return <Home className="h-4 w-4 text-slate-400" />;
      default: return <Stethoscope className="h-4 w-4 text-slate-400" />;
    }
  };

  const isScheduleEnabled =
    (modalidad === 'virtual') ||
    (modalidad === 'presencial' && clinicaSeleccionada) ||
    (modalidad === 'domicilio' && areaDomicilio);

  const isComplete = isScheduleEnabled && fecha && hora;

  return (
    <div className="flex flex-col w-full font-sans pb-4">

      {/* The header has been extracted to WizardHeader.tsx */}

      {/* 2. MODALITY TABS (No Heading) */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {modalidades.map((mod) => {
          const normalizedTipo = mod.modDescripcion.toLowerCase().includes('domicilio')
            ? 'domicilio'
            : mod.modDescripcion.toLowerCase() as any;
          const isSelected = modalidad === normalizedTipo;

          return (
            <label key={mod.modCodigo} className="cursor-pointer">
              <input
                type="radio"
                name="modality"
                value={normalizedTipo}
                checked={isSelected}
                onChange={() => setModalidad(normalizedTipo)}
                className="peer sr-only"
              />
              <div className={`flex items-center gap-2 px-6 py-3 transition-colors mb-[-1px] ${isSelected
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-500 rounded-t-lg'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1E293B] border-b-2 border-transparent'
                }`}>
                {getIcon(normalizedTipo, isSelected)}
                <span className={`text-sm font-semibold capitalize ${isSelected ? 'text-blue-900 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  {mod.modDescripcion}
                </span>
              </div>
            </label>
          )
        })}
      </div>

      {/* 3. COLUMNS CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 flex-grow min-h-[360px]">

        {/* Column 1: Ubicación */}
        {modalidad !== 'virtual' && (
          <div className="lg:col-span-4 flex flex-col space-y-4 pt-6 md:pt-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ubicación</h3>

            {modalidad === 'presencial' && (
              <div className="flex flex-col gap-3 h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                {loadingClinicas ? (
                  <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                ) : (
                  clinicas.map((clinica) => {
                    const isSelected = clinicaSeleccionada?.mclCodigo === clinica.mclCodigo;
                    return (
                      <button
                        key={clinica.mclCodigo}
                        onClick={() => setClinica(clinica)}
                        className={`text-left p-4 rounded-lg border transition-all shrink-0 ${isSelected
                          ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-600/50 dark:border-blue-500/50 shadow-sm'
                          : 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                      >
                        <h4 className={`font-semibold text-[15px] leading-tight ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                          {clinica.cliDescripcion}
                        </h4>
                        <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {clinica.cliDireccionCompleta}
                        </p>
                        {clinica.mclPrecioBase > 0 && (
                          <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-300 mt-1">Precio: Q{clinica.mclPrecioBase}</p>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            )}

            {modalidad === 'domicilio' && (
              <div className="flex flex-col gap-3 h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                {loadingAreas ? (
                  <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                ) : (
                  areas.map((area) => {
                    const isSelected = areaDomicilio?.ladCodigo === area.ladCodigo;
                    return (
                      <button
                        key={area.ladCodigo}
                        onClick={() => setArea(area)}
                        className={`text-left p-4 rounded-lg border transition-all flex items-center justify-between shrink-0 ${isSelected
                          ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-600/50 dark:border-blue-500/50 shadow-sm'
                          : 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                      >
                        <span className="font-semibold text-[15px] text-slate-800 dark:text-slate-200">{area.municipio}</span>
                        {area.ladZonas && (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${isSelected ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                            Zonas: {area.ladZonas}
                          </span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Calendar and Time columns grouped inside a soft card */}
        <div className={`lg:col-span-8 bg-slate-50/50 dark:bg-[#0F172A] rounded-2xl p-4 sm:p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-16 border border-slate-100 dark:border-slate-800/50 ${modalidad === 'virtual' ? 'lg:col-span-12' : ''}`}>

          {!isScheduleEnabled ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl h-[320px] bg-white dark:bg-[#1E293B]">
              <CalendarDays className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[200px] text-center">
                Selecciona la {modalidad === 'presencial' ? 'clínica' : 'zona'} a la izquierda para cargar los horarios.
              </p>
            </div>
          ) : (
            <>
              {/* Column 2: Calendar */}
              <div className="flex-1 flex flex-col space-y-4 min-w-0 max-w-full overflow-x-auto">
                <h3 className={`text-lg font-bold text-slate-900 dark:text-white ${modalidad === 'virtual' ? 'text-center md:text-left md:pl-10 lg:pl-20' : ''}`}>Fecha</h3>
                <div className={`flex ${modalidad === 'virtual' ? 'justify-center md:justify-start md:pl-10 lg:pl-20' : 'justify-center sm:justify-start'}`}>
                  <DayPicker
                    mode="single"
                    selected={fecha || undefined}
                    onSelect={(d) => setFecha(d || null)}
                    locale={es}
                    disabled={disabledDays}
                    modifiersClassNames={{
                      selected: 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 font-bold shadow-md rounded-xl',
                      today: 'font-bold text-blue-600 dark:text-blue-400'
                    }}
                    classNames={{
                      day: 'p-0 text-[14px] sm:text-[15px] dark:text-slate-200',
                      day_button: 'h-9 w-9 sm:h-11 sm:w-11 font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all mx-auto flex items-center justify-center',
                      month_caption: 'flex justify-between pt-1 relative items-center mb-5 px-3',
                      caption_label: 'text-base font-bold capitalize text-slate-900 dark:text-white',
                      button_previous: 'h-8 w-8 flex items-center justify-center bg-white dark:bg-[#1E293B] shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded-full transition-colors text-slate-600 dark:text-slate-400',
                      button_next: 'h-8 w-8 flex items-center justify-center bg-white dark:bg-[#1E293B] shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded-full transition-colors text-slate-600 dark:text-slate-400',
                      month_grid: 'w-full border-collapse',
                      weekday: 'text-slate-400 dark:text-slate-500 font-medium text-xs sm:text-sm capitalize w-9 h-9 sm:w-11 sm:h-11',
                    }}
                  />
                </div>
              </div>

              {/* Column 3: Time Slots */}
              <div className={`flex-1 flex flex-col space-y-4 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-8 md:pt-0 md:pl-8 lg:pl-12 ${modalidad === 'virtual' ? 'md:pr-10 lg:pr-20' : ''}`}>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Horarios Disponibles</h3>

                {fecha ? (
                  availableTimeSlots.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 h-[320px] overflow-y-auto pr-2 custom-scrollbar content-start">
                      {availableTimeSlots.map(({ time: slot, disabled }) => {
                        const isSelected = hora === slot;

                        // Format to 12h AM/PM
                        const [h, m] = slot.split(':');
                        let hourNum = parseInt(h);
                        const ampm = hourNum >= 12 ? 'PM' : 'AM';
                        hourNum = hourNum % 12;
                        hourNum = hourNum ? hourNum : 12;
                        const displayTime = `${hourNum}:${m} ${ampm}`;

                        return (
                          <label key={slot} className={`block shrink-0 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`} title={disabled ? "Horario no disponible" : ""}>
                            <input
                              type="radio"
                              name="time"
                              value={slot}
                              checked={isSelected}
                              onChange={() => !disabled && setHora(slot)}
                              disabled={disabled}
                              className="peer sr-only"
                            />
                            <div className={`py-3 px-3 sm:px-4 border rounded-lg text-left text-xs sm:text-sm font-semibold transition-all ${isSelected
                              ? 'border-blue-600/50 bg-blue-50/70 dark:bg-blue-900/30 dark:border-blue-500/50 text-slate-900 dark:text-white shadow-sm'
                              : disabled
                                ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#0B1120] text-slate-400 dark:text-slate-600'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              }`}>
                              {displayTime}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex flex-col items-center justify-center h-[200px] bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                      <Clock className="h-6 w-6 text-slate-300 dark:text-slate-600 mb-2" />
                      No hay horarios para esta fecha.
                    </div>
                  )
                ) : (
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex flex-col items-center justify-center h-[200px] bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <CalendarDays className="h-6 w-6 text-slate-300 dark:text-slate-600 mb-2" />
                    Selecciona una fecha en el calendario.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer Next Button ALWAYS VISIBLE BUT BLOCKED IF NOT COMPLETE */}
      <div className="sticky bottom-0 z-30 bg-transparent flex justify-end items-center py-4 border-t border-slate-200/60 dark:border-slate-800/40 mt-8">
        <button
          onClick={nextStep}
          disabled={!isComplete}
          className={`w-full sm:w-auto font-bold py-3.5 px-8 sm:px-10 rounded-xl transition-all flex items-center justify-center gap-2 ${isComplete
            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer'
            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-70'
            }`}
        >
          <span>Continuar al Siguiente Paso</span> <ArrowRight className="h-5 w-5" />
        </button>
      </div>

    </div>
  );
}
