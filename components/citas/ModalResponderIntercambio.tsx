'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeftRight, Clock, Calendar, AlertCircle, X, Check, 
  MessageSquare, XCircle, CalendarDays, ArrowRight, UserCheck, 
  RotateCcw, Sparkles, Stethoscope, ChevronRight, Info, Building2, MapPin
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { 
  useHorarios, 
  useHorasOcupadas, 
  useResponderSolicitudCambio, 
  useClinicas, 
  useCitaByCodigo 
} from '@/hooks/use-flujo-citas';
import { useDoctorByCode } from '@/hooks/use-doctors';
import type { SolicitudCambioDto, HorarioCitaDto, ClinicaCitaDto } from '@/types/citas';
import { toast } from 'sonner';

interface ModalResponderIntercambioProps {
  isOpen: boolean;
  onClose: () => void;
  solicitud: SolicitudCambioDto;
}

export function ModalResponderIntercambio({
  isOpen,
  onClose,
  solicitud,
}: ModalResponderIntercambioProps) {
  const responderMutation = useResponderSolicitudCambio();

  // Paso dentro del modal: 'detalles' | 'elegir_destino' | 'rechazar'
  const [paso, setPaso] = useState<'detalles' | 'elegir_destino' | 'rechazar'>('detalles');
  
  // Accion elegida por el cedente: 'reasignar' | 'cancelar'
  const [tipoAccion, setTipoAccion] = useState<'reasignar' | 'cancelar'>('reasignar');
  
  // Si reasigna: tomar el turno del solicitante o elegir uno nuevo
  const [modoReasignar, setModoReasignar] = useState<'turno_solicitante' | 'otro_horario'>('turno_solicitante');
  
  const [nuevaFecha, setNuevaFecha] = useState<Date | undefined>(() => {
    try {
      return parseISO(solicitud.solicitanteFechaActual);
    } catch {
      return new Date();
    }
  });
  const [nuevaHora, setNuevaHora] = useState<string>(() => solicitud.solicitanteHoraActual?.slice(0, 5) || '');
  const [motivoRechazo, setMotivoRechazo] = useState('');

  // 1. Obtener la cita original del cedente para conocer su consultorio/clínica
  const { data: citaObjetivo } = useCitaByCodigo(solicitud.citaObjetivoId);

  // 2. Obtener las clínicas donde atiende el médico
  const { data: clinicas = [] } = useClinicas(solicitud.codMedico || null, 'presencial');

  // Estado para la clínica seleccionada (mclCodigo)
  const [selectedMclCodigo, setSelectedMclCodigo] = useState<number | null>(null);

  // Inicializar o sincronizar la clínica seleccionada con la de la cita original
  useEffect(() => {
    if (clinicas.length > 0 && selectedMclCodigo === null) {
      const match = clinicas.find(
        (c) => c.cliCodigo === citaObjetivo?.ctaConsultorioId || c.cliDescripcion === citaObjetivo?.clinicaNombre
      );
      if (match) {
        setSelectedMclCodigo(match.mclCodigo);
      } else {
        setSelectedMclCodigo(clinicas[0].mclCodigo);
      }
    }
  }, [clinicas, citaObjetivo, selectedMclCodigo]);

  const clinicaActiva = useMemo(() => {
    return clinicas.find((c) => c.mclCodigo === selectedMclCodigo) || clinicas[0] || null;
  }, [clinicas, selectedMclCodigo]);

  // 3. Consultar horarios del doctor para la clínica/ubicación específica
  const { data: doctor } = useDoctorByCode(solicitud.codMedico || '');
  const { data: horariosClinica = [] } = useHorarios(selectedMclCodigo);
  const fechaQueryStr = nuevaFecha ? format(nuevaFecha, 'yyyy-MM-dd') : null;
  const { data: horasOcupadas = [] } = useHorasOcupadas(solicitud.codMedico, fechaQueryStr);

  const horariosValidos = useMemo<HorarioCitaDto[]>(() => {
    // A. Horarios directos de la relación médico-clínica
    if (horariosClinica && horariosClinica.length > 0) {
      return horariosClinica;
    }

    // B. Horarios en el expediente del doctor para esta clínica
    if (doctor?.clinicas && clinicaActiva) {
      const docClinica = doctor.clinicas.find(
        (c) => c.cli_descripcion === clinicaActiva.cliDescripcion || c.mcl_precio_base === clinicaActiva.mclPrecioBase
      );
      if (docClinica?.horarios_atencion && docClinica.horarios_atencion.length > 0) {
        return docClinica.horarios_atencion.map((h) => ({
          horDiaSemana: h.hor_dia_semana,
          horHoraInicio: h.hor_hora_inicio,
          horHoraFin: h.hor_hora_fin,
        }));
      }
    }

    // C. Si tiene horarios en cualquier clínica registrada
    if (doctor?.clinicas) {
      const list: HorarioCitaDto[] = [];
      doctor.clinicas.forEach((c) => {
        c.horarios_atencion?.forEach((h) => {
          list.push({
            horDiaSemana: h.hor_dia_semana,
            horHoraInicio: h.hor_hora_inicio,
            horHoraFin: h.hor_hora_fin,
          });
        });
      });
      if (list.length > 0) return list;
    }

    // D. Fallback únicamente si la base de datos no tiene horarios configurados
    const fallbackList: HorarioCitaDto[] = [];
    for (let dia = 1; dia <= 5; dia++) {
      fallbackList.push({
        horDiaSemana: dia,
        horHoraInicio: '08:00:00',
        horHoraFin: '17:00:00',
      });
    }
    return fallbackList;
  }, [horariosClinica, doctor, clinicaActiva]);

  const formatHora12h = (timeStr?: string | null) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    let hn = parseInt(h);
    if (isNaN(hn)) return timeStr;
    const ap = hn >= 12 ? 'PM' : 'AM';
    hn = hn % 12 || 12;
    return `${hn}:${m} ${ap}`;
  };

  const fechaDeseadaFormateada = useMemo(() => {
    try {
      return format(parseISO(solicitud.fechaDeseada), "EEEE d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return solicitud.fechaDeseada;
    }
  }, [solicitud.fechaDeseada]);

  const fechaSolicitanteFormateada = useMemo(() => {
    try {
      return format(parseISO(solicitud.solicitanteFechaActual), "EEEE d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return solicitud.solicitanteFechaActual;
    }
  }, [solicitud.solicitanteFechaActual]);

  // Slots disponibles para la fecha elegida con validaciones de horas pasadas y ocupadas
  const { slotsDisponibles, mensajeValidacionSlots } = useMemo(() => {
    if (!nuevaFecha) return { slotsDisponibles: [], mensajeValidacionSlots: 'Por favor selecciona una fecha.' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(nuevaFecha);
    selectedDate.setHours(0, 0, 0, 0);

    // Validación 1: Fechas en el pasado
    if (selectedDate < today) {
      return { slotsDisponibles: [], mensajeValidacionSlots: 'No es posible seleccionar una fecha pasada.' };
    }

    const dayOfWeek = nuevaFecha.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    const diaSchedule = horariosValidos.filter(h => {
      if (dayOfWeek === 0) return h.horDiaSemana === 0 || h.horDiaSemana === 7;
      return h.horDiaSemana === dayOfWeek;
    });

    if (diaSchedule.length === 0) {
      const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      return { 
        slotsDisponibles: [], 
        mensajeValidacionSlots: `El especialista no atiende en esta ubicación los días ${diasNombres[dayOfWeek]}.` 
      };
    }

    const slots: string[] = [];
    diaSchedule.forEach(s => {
      let cur = new Date(`2000-01-01T${s.horHoraInicio}`);
      const end = new Date(`2000-01-01T${s.horHoraFin}`);
      while (cur < end) {
        slots.push(format(cur, 'HH:mm'));
        cur = new Date(cur.getTime() + 30 * 60000);
      }
    });

    // Validación 2: Horas pasadas si la fecha seleccionada es hoy
    const now = new Date();
    const isToday =
      selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getDate() === today.getDate();

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    // Validación 3: Horas ocupadas normalizadas a formato HH:mm
    const horasOcupadasNorm = new Set((horasOcupadas || []).map((h: any) => String(h).slice(0, 5)));

    const fechaSolStr = solicitud.solicitanteFechaActual ? String(solicitud.solicitanteFechaActual).split('T')[0] : '';
    const horaSolNorm = solicitud.solicitanteHoraActual ? String(solicitud.solicitanteHoraActual).slice(0, 5) : '';
    const fechaSelectedStr = format(nuevaFecha, 'yyyy-MM-dd');

    const uniqueSlots = Array.from(new Set(slots)).sort();

    const filtrados = uniqueSlots.filter(s => {
      // Si la fecha es hoy y la hora ya transcurrió, no está disponible
      if (isToday && s <= currentTimeString) {
        return false;
      }

      // Si es el horario del solicitante que se libera tras el intercambio
      if (fechaSelectedStr === fechaSolStr && s === horaSolNorm) {
        return true;
      }

      // Si está en la lista de horas ocupadas del médico
      if (horasOcupadasNorm.has(s)) {
        return false;
      }

      return true;
    });

    if (filtrados.length === 0) {
      return {
        slotsDisponibles: [],
        mensajeValidacionSlots: isToday 
          ? 'Todos los horarios de atención para hoy ya han pasado o están ocupados.' 
          : 'No hay horarios disponibles para la fecha seleccionada (todos están ocupados).'
      };
    }

    return { slotsDisponibles: filtrados, mensajeValidacionSlots: null };
  }, [nuevaFecha, horariosValidos, horasOcupadas, solicitud]);


  const handleConfirmarAceptar = async () => {
    let finalFecha: string | undefined = undefined;
    let finalHora: string | undefined = undefined;

    if (tipoAccion === 'reasignar') {
      if (modoReasignar === 'turno_solicitante') {
        finalFecha = solicitud.solicitanteFechaActual?.split('T')[0];
        finalHora = solicitud.solicitanteHoraActual?.slice(0, 5) + ':00';
      } else {
        if (!nuevaFecha || !nuevaHora) {
          toast.error('Por favor selecciona una fecha y horario para tu cita.');
          return;
        }
        finalFecha = format(nuevaFecha, 'yyyy-MM-dd');
        finalHora = nuevaHora.length === 5 ? `${nuevaHora}:00` : nuevaHora;
      }
    }

    await responderMutation.mutateAsync({
      solCodigo: solicitud.solCodigo,
      payload: {
        aceptada: true,
        accion: tipoAccion,
        nuevaFecha: finalFecha,
        nuevaHora: finalHora,
      },
    });

    onClose();
  };

  const handleConfirmarRechazar = async () => {
    await responderMutation.mutateAsync({
      solCodigo: solicitud.solCodigo,
      payload: {
        aceptada: false,
        motivoRechazo: motivoRechazo.trim() || undefined,
      },
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-xl bg-white dark:bg-[#0F172A] rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow de fondo decorativo */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Encabezado */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 rounded-2xl shadow-xs border border-orange-200 dark:border-orange-800">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                Petición de Intercambio
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Un paciente desearía que le cedas tu horario de consulta
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={responderMutation.isPending}
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO SEGÚN PASO */}
        {paso === 'detalles' && (
          <div className="py-5 space-y-4">
            {/* Tarjeta del Solicitante */}
            <div className="p-4 rounded-2xl bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-800/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-900 dark:text-orange-200">
                  Paciente solicitante:
                </span>
                <span className="text-xs font-black text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-800">
                  {solicitud.solicitanteNombre}
                </span>
              </div>

              <div className="pt-2 border-t border-orange-200/60 dark:border-orange-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Tu horario solicitado:</span>
                  <span className="font-bold text-orange-800 dark:text-orange-300 capitalize">
                    {fechaDeseadaFormateada} · {formatHora12h(solicitud.horaDeseada)}
                  </span>
                </div>
                <div className="sm:text-right">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Horario actual del solicitante:</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300 capitalize">
                    {fechaSolicitanteFormateada} · {formatHora12h(solicitud.solicitanteHoraActual)}
                  </span>
                </div>
              </div>

              {solicitud.mensaje && (
                <div className="mt-2 pt-2 border-t border-orange-200/60 dark:border-orange-900/60">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">Mensaje del paciente:</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-white/60 dark:bg-slate-900/50 p-2.5 rounded-xl border border-orange-100 dark:border-orange-950">
                    &ldquo;{solicitud.mensaje}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Aviso explicativo */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5 leading-relaxed">
              <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <span>
                Si decides ceder tu turno, antes de completar el cambio deberás seleccionar a qué otro horario moverás tu consulta médica o si deseas cancelarla.
              </span>
            </div>

            {/* Botones de acción inicial */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPaso('rechazar')}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                Rechazar solicitud
              </button>

              <button
                type="button"
                onClick={() => setPaso('elegir_destino')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black transition shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Aceptar y ceder horario</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* PASO: ELEGIR DESTINO DEL CEDENTE */}
        {paso === 'elegir_destino' && (
          <div className="py-5 space-y-4">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                ¿Qué deseas hacer con tu consulta médica?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Antes de ceder tu turno a {solicitud.solicitanteNombre}, define a qué horario moverás tu cita o si la cancelarás.
              </p>
            </div>

            {/* 2 Opciones principales: Reasignar vs Cancelar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  tipoAccion === 'reasignar'
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold text-xs">Mover mi cita</span>
                  </div>
                  <input
                    type="radio"
                    name="tipoAccion"
                    value="reasignar"
                    checked={tipoAccion === 'reasignar'}
                    onChange={() => setTipoAccion('reasignar')}
                    className="accent-blue-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Conservar mi consulta médica y reubicarla en otro horario disponible.
                </p>
              </label>

              <label
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  tipoAccion === 'cancelar'
                    ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span className="font-bold text-xs">Cancelar mi cita</span>
                  </div>
                  <input
                    type="radio"
                    name="tipoAccion"
                    value="cancelar"
                    checked={tipoAccion === 'cancelar'}
                    onChange={() => setTipoAccion('cancelar')}
                    className="accent-rose-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Ya no necesito la consulta. Ceder el espacio y cancelar mi cita.
                </p>
              </label>
            </div>

            {/* Si elige reasignar: Sub-opciones */}
            {tipoAccion === 'reasignar' && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Selecciona tu nuevo horario:
                </span>

                {/* Opción rápida: Tomar el turno del solicitante */}
                <label
                  className={`p-3 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                    modoReasignar === 'turno_solicitante'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="modoReasignar"
                      value="turno_solicitante"
                      checked={modoReasignar === 'turno_solicitante'}
                      onChange={() => setModoReasignar('turno_solicitante')}
                      className="accent-emerald-600"
                    />
                    <div>
                      <span className="text-xs font-black block">
                        Intercambio directo: Tomar el turno de {solicitud.solicitanteNombre}
                      </span>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold capitalize">
                        {fechaSolicitanteFormateada} · {formatHora12h(solicitud.solicitanteHoraActual)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                    Recomendado
                  </span>
                </label>

                {/* Opción 2: Elegir otro horario del médico */}
                <label
                  className={`p-3 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                    modoReasignar === 'otro_horario'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="modoReasignar"
                      value="otro_horario"
                      checked={modoReasignar === 'otro_horario'}
                      onChange={() => setModoReasignar('otro_horario')}
                      className="accent-blue-600"
                    />
                    <div>
                      <span className="text-xs font-bold block">
                        Elegir otra fecha u horario disponible
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Selecciona libremente en la agenda del especialista
                      </span>
                    </div>
                  </div>
                </label>

                {/* Selector si modoReasignar === 'otro_horario' */}
                {modoReasignar === 'otro_horario' && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3.5 animate-in fade-in">
                    {/* Ubicación / Consultorio de atención */}
                    {clinicaActiva && (
                      <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50 flex items-start gap-2.5">
                        <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                              {clinicaActiva.cliDescripcion}
                            </span>
                            {clinicas.length > 1 && (
                              <select
                                value={selectedMclCodigo || ''}
                                onChange={(e) => {
                                  setSelectedMclCodigo(Number(e.target.value));
                                  setNuevaHora('');
                                }}
                                className="text-[10px] py-0.5 px-1.5 rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 font-semibold cursor-pointer text-slate-700 dark:text-slate-200"
                              >
                                {clinicas.map((c) => (
                                  <option key={c.mclCodigo} value={c.mclCodigo}>
                                    Cambiar: {c.cliDescripcion}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          {clinicaActiva.cliDireccionCompleta && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                              {clinicaActiva.cliDireccionCompleta}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          <span>Fecha de la consulta:</span>
                        </label>
                        {nuevaFecha && (
                          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 capitalize">
                            {format(nuevaFecha, "EEEE d 'de' MMMM", { locale: es })}
                          </span>
                        )}
                      </div>
                      <input
                        type="date"
                        min={format(new Date(), 'yyyy-MM-dd')}
                        value={nuevaFecha ? format(nuevaFecha, 'yyyy-MM-dd') : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setNuevaFecha(parseISO(e.target.value));
                            setNuevaHora('');
                          }
                        }}
                        className="text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] w-full font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-2xs"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>Horarios Disponibles:</span>
                        </label>
                        {slotsDisponibles.length > 0 && (
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            {slotsDisponibles.length} turno{slotsDisponibles.length !== 1 ? 's' : ''} libre{slotsDisponibles.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {slotsDisponibles.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar p-1 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                          {slotsDisponibles.map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setNuevaHora(s)}
                              className={`p-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                                nuevaHora === s
                                  ? 'bg-blue-600 text-white shadow-xs scale-[0.98]'
                                  : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80'
                              }`}
                            >
                              <span>{formatHora12h(s)}</span>
                              {nuevaHora === s && <Check className="w-3 h-3 text-white" />}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2.5">
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>{mensajeValidacionSlots || 'No hay turnos disponibles para esta fecha.'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Si elige cancelar: Advertencia */}
            {tipoAccion === 'cancelar' && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>
                  Al confirmar, tu cita médica quedará <strong>cancelada</strong> y el horario que ocupabas le será asignado de inmediato a {solicitud.solicitanteNombre}.
                </span>
              </div>
            )}

            {/* Botones de Confirmación Final */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPaso('detalles')}
                disabled={responderMutation.isPending}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Volver
              </button>

              <button
                type="button"
                disabled={responderMutation.isPending || (tipoAccion === 'reasignar' && modoReasignar === 'otro_horario' && (!nuevaFecha || !nuevaHora))}
                onClick={handleConfirmarAceptar}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {responderMutation.isPending ? (
                  <span>Procesando intercambio...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar y Realizar Cambio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* PASO: RECHAZAR */}
        {paso === 'rechazar' && (
          <div className="py-5 space-y-4">
            <div>
              <h4 className="text-sm font-black text-rose-600 dark:text-rose-400">
                Rechazar solicitud de intercambio
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Conservarás tu horario de consulta actual. Le notificaremos a {solicitud.solicitanteNombre} que no pudiste ceder tu espacio.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <span>Motivo de rechazo (opcional):</span>
              </label>
              <textarea
                rows={2}
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Ej. Lo siento, me es imposible cambiar de horario por motivos laborales."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                maxLength={300}
              />
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPaso('detalles')}
                disabled={responderMutation.isPending}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={responderMutation.isPending}
                onClick={handleConfirmarRechazar}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {responderMutation.isPending ? 'Procesando...' : 'Confirmar rechazo y conservar mi horario'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
