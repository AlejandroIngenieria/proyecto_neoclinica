'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday as isDateToday,
} from 'date-fns';
import { es } from 'date-fns/locale';

interface CalendarioDropdownProps {
  fechaSeleccionada: string; // Formato 'YYYY-MM-DD'
  onSelectFecha: (fecha: string) => void;
  fechaMiCita?: string; // Formato 'YYYY-MM-DD'
  todayStr: string;
}

export function CalendarioDropdown({
  fechaSeleccionada,
  onSelectFecha,
  fechaMiCita,
  todayStr,
}: CalendarioDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mes en visualización
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    try {
      return fechaSeleccionada ? parseISO(fechaSeleccionada) : new Date();
    } catch {
      return new Date();
    }
  });

  // Sincronizar mes si cambia la fecha seleccionada externamente
  useEffect(() => {
    if (fechaSeleccionada) {
      try {
        setCurrentMonth(parseISO(fechaSeleccionada));
      } catch {}
    }
  }, [fechaSeleccionada]);

  // Cerrar al hacer clic fuera o presionar Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Generación de días del mes con semanas iniciando en Lunes (weekStartsOn: 1)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const selectedDateObj = useMemo(() => {
    try {
      return fechaSeleccionada ? parseISO(fechaSeleccionada) : null;
    } catch {
      return null;
    }
  }, [fechaSeleccionada]);

  const miCitaDateObj = useMemo(() => {
    try {
      return fechaMiCita ? parseISO(fechaMiCita) : null;
    } catch {
      return null;
    }
  }, [fechaMiCita]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const handleSelectDay = (day: Date) => {
    const yyyy = day.getFullYear();
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    const dd = String(day.getDate()).padStart(2, '0');
    const formatted = `${yyyy}-${mm}-${dd}`;
    onSelectFecha(formatted);
    setIsOpen(false);
  };

  const handleIrAHoy = () => {
    onSelectFecha(todayStr);
    try {
      setCurrentMonth(parseISO(todayStr));
    } catch {}
    setIsOpen(false);
  };

  const handleIrAMiCita = () => {
    if (!fechaMiCita) return;
    onSelectFecha(fechaMiCita);
    try {
      setCurrentMonth(parseISO(fechaMiCita));
    } catch {}
    setIsOpen(false);
  };

  const diasSemana = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Botón Disparador "Elegir Fecha" */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer ${
          isOpen
            ? 'border-[#006194] bg-[#006194] text-white shadow-xs'
            : 'border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
        }`}
      >
        <CalendarIcon className={`h-4 w-4 shrink-0 ${isOpen ? 'text-white' : 'text-[#006194] dark:text-sky-400'}`} />
        <span>Elegir Fecha</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : 'text-slate-400 dark:text-slate-500'}`}
        />
      </button>

      {/* Popover / Dropdown del Calendario Interactivo */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 z-50 w-[310px] sm:w-[330px] rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-[0_20px_60px_rgba(11,28,48,0.12)] backdrop-blur-md"
          >
            {/* Header del Calendario: Mes/Año y botones anterior/siguiente */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-3">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="h-8 w-8 inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <h4 className="text-sm font-bold text-slate-900 dark:text-white capitalize select-none">
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </h4>

              <button
                type="button"
                onClick={handleNextMonth}
                className="h-8 w-8 inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Fila de Nombres de los Días */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
              {diasSemana.map((d) => (
                <span
                  key={d}
                  className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider py-0.5"
                >
                  {d}
                </span>
              ))}
            </div>

            {/* Cuadrícula de Días */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarDays.map((day) => {
                const isCurMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDateObj ? isSameDay(day, selectedDateObj) : false;
                const isToday = isDateToday(day);
                const isMiCitaDay = miCitaDateObj ? isSameDay(day, miCitaDateObj) : false;

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={`relative h-9 w-full rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#006194] text-white font-bold shadow-xs scale-105 z-10'
                        : isCurMonth
                        ? 'text-slate-800 dark:text-slate-200 hover:bg-[#eff4ff] dark:hover:bg-slate-800 hover:text-[#006194] dark:hover:text-sky-300'
                        : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    } ${isToday && !isSelected ? 'border border-[#006194]/40 dark:border-sky-500/40' : ''}`}
                  >
                    <span>{format(day, 'd')}</span>

                    {/* Indicadores inferiores (Puntito si es hoy o es día de la cita) */}
                    <div className="absolute bottom-1 flex items-center justify-center gap-0.5">
                      {isMiCitaDay && (
                        <span
                          className={`h-1 w-1 rounded-full ${
                            isSelected ? 'bg-amber-300' : 'bg-[#006194] dark:bg-sky-400'
                          }`}
                          title="Día de tu cita"
                        />
                      )}
                      {isToday && !isSelected && !isMiCitaDay && (
                        <span className="h-1 w-1 rounded-full bg-[#006194] dark:bg-sky-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pie de página con accesos rápidos */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleIrAHoy}
                  className="rounded-xl px-2.5 py-1 text-[11px] font-semibold text-[#006194] dark:text-sky-300 bg-[#eff4ff] dark:bg-slate-800 hover:bg-[#e0ecff] dark:hover:bg-slate-750 border border-slate-200/50 dark:border-slate-700/50 transition cursor-pointer"
                >
                  Hoy
                </button>

                {fechaMiCita && (
                  <button
                    type="button"
                    onClick={handleIrAMiCita}
                    className="rounded-xl px-2.5 py-1 text-[11px] font-semibold text-[#006194] dark:text-sky-300 bg-[#eff4ff] dark:bg-slate-800 hover:bg-[#e0ecff] dark:hover:bg-slate-750 border border-slate-200/50 dark:border-slate-700/50 transition cursor-pointer"
                  >
                    Mi Cita
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
