'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Stethoscope,
  MapPin,
  Video,
  Home,
  Monitor,
  Calendar,
  Shield,
  User,
  ExternalLink,
  Volume2,
  VolumeX,
  Megaphone,
  Play,
  Loader2,
  History,
  CheckCheck,
  XCircle,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useColaDelDia } from '@/hooks/use-cola-dia';
import {
  useAllCitasPacientes,
  usePacientesSeleccion,
  useCambiarEstadoCita,
  useCrearSolicitudCambio,
  useSolicitudesCambioPendientes,
  useTodasSolicitudesUsuario,
  useCancelarSolicitudCambio,
} from '@/hooks/use-flujo-citas';
import { ModalSolicitarCambio } from '@/components/citas-wizard/ModalSolicitarCambio';
import { ModalResponderIntercambio } from '@/components/citas/ModalResponderIntercambio';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { CalendarioDropdown } from '@/components/citas/CalendarioDropdown';
import { usePacienteTitular } from '@/hooks/use-pacientes';
import { useDoctors, useDoctorByCode } from '@/hooks/use-doctors';
import { useTurnVoice } from '@/hooks/use-turn-voice';
import { NeoLoader } from '@/components/neo-loader';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ColaTurnoDto, SolicitudCambioDto } from '@/types/citas';

function safeFormatDate(dateStr: string | undefined | null, formatStr: string): string {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), formatStr, { locale: es });
  } catch {
    return dateStr;
  }
}

interface TurnoCardProps {
  t: ColaTurnoDto;
  miTurno: ColaTurnoDto | null | undefined;
  llamarTurno: (data?: { turnoNumero?: number; pacienteNombre?: string | null }) => void;
  cambiarEstadoMutation: any;
  loadingCitaId: string | null;
  loadingAction: 'en_proceso' | 'completada' | null;
  handleCambiarEstado: (
    citaId: string,
    nuevoEstado: 'en_proceso' | 'completada',
    turnoNumero: number,
    pacienteNombre?: string | null
  ) => void;
  onSolicitarCambio?: (turno: ColaTurnoDto) => void;
  misCitasCodigos?: Set<string>;
  solicitudEnviada?: SolicitudCambioDto | null;
  solicitudOfrecida?: SolicitudCambioDto | null;
  onCancelarSolicitud?: (solicitud: SolicitudCambioDto) => void;
  solicitudRecibida?: SolicitudCambioDto | null;
  onResponderSolicitud?: (solicitud: SolicitudCambioDto) => void;
  intentoGastado?: boolean;
  yaEnvioSolicitudEnEstaCola?: boolean;
}

function TurnoCard({
  t,
  miTurno,
  llamarTurno,
  cambiarEstadoMutation,
  loadingCitaId,
  loadingAction,
  handleCambiarEstado,
  onSolicitarCambio,
  misCitasCodigos,
  solicitudEnviada,
  solicitudOfrecida,
  onCancelarSolicitud,
  solicitudRecibida,
  onResponderSolicitud,
  intentoGastado = false,
  yaEnvioSolicitudEnEstaCola = false,
}: TurnoCardProps) {
  const estado = (t.ctaEstado || '').toLowerCase();
  const isEnProceso = estado === 'en_proceso';
  const isCompletada = estado === 'completada';
  const isNoAsistio = estado === 'no_asistio';
  const isMine = t.esMiTurno || (miTurno && t.ctaCodigo === miTurno.ctaCodigo) || (misCitasCodigos?.has(t.ctaCodigo) ?? false);
  const horaTurno = t.ctaHora ? t.ctaHora.slice(0, 5) : '--:--';
  const modTurno = (t.ctaModalidad || 'presencial').toLowerCase();

  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl p-4 sm:p-5 transition-all ${
        isMine
          ? 'border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/60 dark:to-indigo-950/40 shadow-lg ring-2 ring-blue-500/20'
          : isEnProceso
          ? 'border-2 border-amber-400 bg-amber-50/60 dark:bg-amber-950/40 shadow-md'
          : isCompletada
          ? 'border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20'
          : isNoAsistio
          ? 'border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20'
          : 'border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
      }`}
    >
      {isMine && (
        <div className="absolute -top-3 left-4">
          <span className="inline-flex items-center rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
            Tu Cita Asignada
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2 pt-1">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black shrink-0 ${
              isMine
                ? 'bg-blue-600 text-white shadow-xs'
                : isEnProceso
                ? 'bg-amber-500 text-white'
                : isCompletada
                ? 'bg-emerald-600 text-white'
                : isNoAsistio
                ? 'bg-rose-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            #{t.turnoNumero}
          </div>

          <div>
            <p className={`text-sm font-black ${isMine ? 'text-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-white'}`}>
              {isMine ? (t.pacienteNombre || 'Tu Consulta') : `Turno #${t.turnoNumero}`}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {isMine ? (t.servicioNombre || 'Consulta Médica') : 'Consulta programada'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-right">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              llamarTurno({
                turnoNumero: t.turnoNumero,
                pacienteNombre: isMine ? t.pacienteNombre : null,
              });
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition active:scale-95 cursor-pointer"
            title={`Anunciar por voz: Turno #${t.turnoNumero}`}
          >
            <Volume2 className="h-3.5 w-3.5" />
          </button>

          <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 dark:bg-slate-800 px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
            <Clock className="h-3 w-3 text-slate-400" />
            {horaTurno}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-2">
        {/* Modalidad bien visible */}
        <div>
          {modTurno === 'virtual' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shadow-2xs">
              <Video className="w-3.5 h-3.5 text-sky-500" />
              <span>Virtual</span>
            </span>
          ) : modTurno === 'domicilio' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
              <Home className="w-3.5 h-3.5 text-amber-500" />
              <span>A Domicilio</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Presencial</span>
            </span>
          )}
        </div>

        {/* Estado de la consulta */}
        <div>
          {isEnProceso ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-900/60 px-2.5 py-1 rounded-lg">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              En Consulta
            </span>
          ) : isCompletada ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-900/50 px-2.5 py-1 rounded-lg">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Atendido
            </span>
          ) : isNoAsistio ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100/90 dark:bg-rose-900/50 px-2.5 py-1 rounded-lg">
              <XCircle className="h-3.5 w-3.5 text-rose-600" />
              No Asistió
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
              En Espera
            </span>
          )}
        </div>
      </div>

      {/* Botones de simulación médica: Iniciar consulta y Finalizar consulta */}
      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={cambiarEstadoMutation.isPending && loadingCitaId === t.ctaCodigo}
          onClick={(e) => {
            e.stopPropagation();
            handleCambiarEstado(t.ctaCodigo, 'en_proceso', t.turnoNumero, t.pacienteNombre);
          }}
          title="Simular que el médico inicia la consulta (actualiza a en_proceso en BD y anuncia turno)"
          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
            isEnProceso
              ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/50'
              : 'bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
          }`}
        >
          {cambiarEstadoMutation.isPending && loadingCitaId === t.ctaCodigo && loadingAction === 'en_proceso' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className={`w-3.5 h-3.5 ${isEnProceso ? 'fill-white text-white' : 'fill-emerald-600 dark:fill-emerald-400 text-emerald-600 dark:text-emerald-400'}`} />
          )}
          <span>{isEnProceso ? 'En consulta' : 'Iniciar consulta'}</span>
        </button>

        <button
          type="button"
          disabled={cambiarEstadoMutation.isPending && loadingCitaId === t.ctaCodigo}
          onClick={(e) => {
            e.stopPropagation();
            handleCambiarEstado(t.ctaCodigo, 'completada', t.turnoNumero, t.pacienteNombre);
          }}
          title="Simular que el médico finaliza la consulta (actualiza a completada en BD)"
          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
            isCompletada
              ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400/50'
              : 'bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700'
          }`}
        >
          {cambiarEstadoMutation.isPending && loadingCitaId === t.ctaCodigo && loadingAction === 'completada' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          <span>{isCompletada ? 'Atendido' : 'Finalizar consulta'}</span>
        </button>
      </div>

      {/* Estado si ya hay una solicitud de intercambio enviada para este turno */}
      {!isMine && solicitudEnviada && (
        <div className="mt-2.5 pt-2.5 border-t border-amber-200/60 dark:border-amber-800/80 flex items-center justify-between gap-2 bg-amber-50/50 dark:bg-amber-950/20 px-2.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/50">
          <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 font-semibold min-w-0">
            <Clock className="w-3.5 h-3.5 shrink-0 animate-pulse text-amber-600" />
            <span className="truncate">Solicitud enviada</span>
          </div>
          {onCancelarSolicitud && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancelarSolicitud(solicitudEnviada);
              }}
              title="Cancelar solicitud de intercambio"
              className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline shrink-0"
            >
              Cancelar
            </button>
          )}
        </div>
      )}

      {/* Si es mi turno y tengo una solicitud de intercambio pendiente donde ofrezco esta cita */}
      {isMine && solicitudOfrecida && (
        <div className="mt-2.5 pt-2.5 border-t border-blue-200/60 dark:border-blue-800/80 flex items-center justify-between gap-2 bg-blue-50/50 dark:bg-blue-950/20 px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/50">
          <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300 font-semibold min-w-0">
            <ArrowLeftRight className="w-3.5 h-3.5 shrink-0 text-blue-600" />
            <span className="truncate">Ofrecida en cambio</span>
          </div>
          {onCancelarSolicitud && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancelarSolicitud(solicitudOfrecida);
              }}
              title="Cancelar solicitud de intercambio"
              className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline shrink-0 cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </div>
      )}

      {/* Si es mi turno y recibí una solicitud de intercambio de otro paciente */}
      {isMine && solicitudRecibida && (
        <div className="mt-2.5 pt-2.5 border-t border-purple-200/60 dark:border-purple-800/80 flex items-center justify-between gap-2 bg-purple-50/60 dark:bg-purple-950/30 px-2.5 py-1.5 rounded-xl border border-purple-200 dark:border-purple-900/50">
          <div className="flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300 font-semibold min-w-0">
            <ArrowLeftRight className="w-3.5 h-3.5 shrink-0 text-purple-600 animate-pulse" />
            <span className="truncate">Te solicitaron este turno</span>
          </div>
          {onResponderSolicitud && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onResponderSolicitud(solicitudRecibida);
              }}
              title="Revisar propuesta de intercambio de horario"
              className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 hover:bg-purple-200 dark:hover:bg-purple-800 px-2.5 py-0.5 rounded-lg shrink-0 cursor-pointer"
            >
              Responder
            </button>
          )}
        </div>
      )}

      {/* Botón para solicitar intercambio de horario (solo si no es propio, no hay solicitud enviada, no tiene intento gastado y no ha mandado solicitud en esta cola) */}
      {!isMine && !solicitudEnviada && !intentoGastado && !yaEnvioSolicitudEnEstaCola && !isCompletada && !isNoAsistio && onSolicitarCambio && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSolicitarCambio(t);
            }}
            title={`Solicitar intercambio de horario con el Turno #${t.turnoNumero}`}
            className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer bg-white dark:bg-slate-900 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-300 dark:border-orange-700/60"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Solicitar este horario</span>
          </button>
        </div>
      )}

      {/* Si el usuario ya utilizó su intento en este turno específico y no está pendiente */}
      {!isMine && intentoGastado && !solicitudEnviada && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span>Intento ya utilizado</span>
        </div>
      )}
    </div>
  );
}

function SalaEsperaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const citaIdParam = searchParams.get('citaId');
  const docParam = searchParams.get('doc');
  const fechaParam = searchParams.get('fecha');

  const { titular } = usePacienteTitular();
  const pacCodigo = titular?.pac_codigo || null;

  const { data: pacientesList = [] } = usePacientesSeleccion();
  const codigosPacientes = useMemo(() => {
    const list = pacientesList.map((p) => p.pacCodigo);
    if (pacCodigo && !list.includes(pacCodigo)) {
      list.push(pacCodigo);
    }
    return list;
  }, [pacientesList, pacCodigo]);

  const { data: citas = [], isLoading: isLoadingCitas } = useAllCitasPacientes(codigosPacientes);
  const misCitasCodigos = useMemo(() => new Set(citas.map((c) => c.ctaCodigo)), [citas]);
  const { data: doctorsList = [] } = useDoctors();

  // Encontrar la cita correspondiente
  const citaSeleccionada = useMemo(() => {
    if (citaIdParam) {
      const found = citas.find((c) => c.ctaCodigo === citaIdParam);
      if (found) return found;
    }
    if (docParam) {
      const found = citas.find((c) => c.ctaCoddoc === docParam);
      if (found) return found;
    }
    // Fallback a la primera cita programada o activa
    return citas.find((c) => (c.ctaEstado || '').toLowerCase() !== 'cancelada') || null;
  }, [citas, citaIdParam, docParam]);

  const codMedico = citaSeleccionada?.ctaCoddoc || docParam || '';
  const { data: doctorDetail } = useDoctorByCode(codMedico);
  const citaDeReferencia = citaSeleccionada;

  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const fechaCitaInicial = useMemo(() => {
    return fechaParam || citaSeleccionada?.ctaFecha?.split('T')[0] || todayStr;
  }, [fechaParam, citaSeleccionada, todayStr]);

  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(fechaCitaInicial);

  useEffect(() => {
    if (fechaParam && fechaParam !== fechaSeleccionada) {
      setFechaSeleccionada(fechaParam);
    } else if (!fechaSeleccionada && fechaCitaInicial) {
      setFechaSeleccionada(fechaCitaInicial);
    }
  }, [fechaParam, fechaCitaInicial]);

  const fechaCita = fechaSeleccionada || fechaCitaInicial;

  const cambiarFecha = (nuevaFecha: string) => {
    setFechaSeleccionada(nuevaFecha);
    try {
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('fecha', nuevaFecha);
      router.replace(`/dashboard/citas/sala-espera?${params.toString()}`, { scroll: false });
    } catch {}
  };

  const handleDiaAnterior = () => {
    try {
      const d = parseISO(fechaCita);
      const anterior = subDays(d, 1);
      cambiarFecha(format(anterior, 'yyyy-MM-dd'));
    } catch {}
  };

  const handleDiaSiguiente = () => {
    try {
      const d = parseISO(fechaCita);
      const siguiente = addDays(d, 1);
      cambiarFecha(format(siguiente, 'yyyy-MM-dd'));
    } catch {}
  };

  const handleIrAHoy = () => {
    cambiarFecha(todayStr);
  };

  // Cita de referencia del usuario con este especialista
  const fechaDeMiCita = citaDeReferencia?.ctaFecha?.split('T')[0];
  const esFechaDeMiCita = Boolean(fechaDeMiCita && fechaDeMiCita === fechaCita);

  const {
    data: turnos = [],
    isLoading: isLoadingCola,
    isRefetching,
    refetch,
  } = useColaDelDia(codMedico, fechaCita, pacCodigo || citaSeleccionada?.ctaCodpac);

  const doctorInfo = useMemo(() => {
    return doctorsList.find((d) => d.exp_codigo === codMedico);
  }, [doctorsList, codMedico]);

  const isToday = fechaCita === todayStr;

  // Manejo de citas no iniciadas ni finalizadas: al llegar el horario de otro turno, pasan a 'no_asistio'
  const turnosProcesados = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    return turnos.map((t) => {
      const st = (t.ctaEstado || '').toLowerCase();
      if (st !== 'programada') return t;

      // Si la fecha ya pasó por completo:
      if (fechaCita < todayStr) {
        return { ...t, ctaEstado: 'no_asistio' };
      }

      // Si es hoy, verificar si llegó el horario de otro turno posterior o se inició otro turno posterior:
      if (fechaCita === todayStr) {
        const tHora = t.ctaHora ? t.ctaHora.slice(0, 5) : '';
        const hayTurnoPosteriorActivoOLlegado = turnos.some((otro) => {
          const otroHora = otro.ctaHora ? otro.ctaHora.slice(0, 5) : '';
          const otroEstado = (otro.ctaEstado || '').toLowerCase();
          const esPosterior = otroHora > tHora || otro.turnoNumero > t.turnoNumero;
          if (!esPosterior) return false;
          // Si otro turno posterior ya está en consulta o completada, o su hora ya llegó:
          return otroEstado === 'en_proceso' || otroEstado === 'completada' || currentTimeStr >= otroHora;
        });

        if (hayTurnoPosteriorActivoOLlegado) {
          return { ...t, ctaEstado: 'no_asistio' };
        }
      }

      return t;
    });
  }, [turnos, fechaCita, todayStr]);

  const turnoEnConsulta = useMemo(() => {
    return turnosProcesados.find((t) => (t.ctaEstado || '').toLowerCase() === 'en_proceso');
  }, [turnosProcesados]);

  const turnosAtendidos = useMemo(() => {
    return turnosProcesados.filter((t) => (t.ctaEstado || '').toLowerCase() === 'completada').length;
  }, [turnosProcesados]);

  const turnosNoAsistio = useMemo(() => {
    return turnosProcesados.filter((t) => (t.ctaEstado || '').toLowerCase() === 'no_asistio').length;
  }, [turnosProcesados]);

  // Turnos activos en espera (excluye completadas y no asistió)
  const turnosActivos = useMemo(() => {
    return turnosProcesados.filter((t) => {
      const st = (t.ctaEstado || '').toLowerCase();
      return st !== 'completada' && st !== 'no_asistio';
    });
  }, [turnosProcesados]);

  // Turnos concluídos / historial del día
  const turnosHistorial = useMemo(() => {
    return turnosProcesados.filter((t) => {
      const st = (t.ctaEstado || '').toLowerCase();
      return st === 'completada' || st === 'no_asistio';
    });
  }, [turnosProcesados]);

  const miTurno = useMemo(() => {
    return turnosProcesados.find((t) => t.esMiTurno || (citaSeleccionada && t.ctaCodigo === citaSeleccionada.ctaCodigo));
  }, [turnosProcesados, citaSeleccionada]);

  const turnosAntesDeMi = useMemo(() => {
    if (!miTurno) return 0;
    return turnosProcesados.filter(
      (t) =>
        t.turnoNumero < miTurno.turnoNumero &&
        (t.ctaEstado || '').toLowerCase() !== 'completada' &&
        (t.ctaEstado || '').toLowerCase() !== 'no_asistio'
    ).length;
  }, [turnosProcesados, miTurno]);

  const esMiTurnoEnConsulta = miTurno && (miTurno.ctaEstado || '').toLowerCase() === 'en_proceso';
  const esMiTurnoCompletado = miTurno && (miTurno.ctaEstado || '').toLowerCase() === 'completada';
  const esSiguienteTurno = miTurno && turnosAntesDeMi === 0 && !esMiTurnoEnConsulta && !esMiTurnoCompletado;

  const doctorPhoto = doctorDetail?.exp_foto_perfil || doctorInfo?.exp_foto_perfil || undefined;
  const doctorName =
    citaSeleccionada?.medicoNombre ||
    (doctorDetail
      ? `${doctorDetail.exp_primer_nom} ${doctorDetail.exp_primer_ape}`
      : doctorInfo
      ? `${doctorInfo.exp_primer_nom} ${doctorInfo.exp_primer_ape}`
      : 'Médico Especialista');
  const doctorSpecialty =
    citaSeleccionada?.medicoEspecialidad ||
    doctorDetail?.exp_profesion ||
    doctorInfo?.exp_profesion ||
    'Especialidad Médica';

  const clinicaNombre = useMemo(() => {
    if (citaSeleccionada?.clinicaNombre) return citaSeleccionada.clinicaNombre;
    if (citaDeReferencia?.clinicaNombre) return citaDeReferencia.clinicaNombre;
    const turnoConClinica = turnos.find((t) => t.clinicaNombre)?.clinicaNombre;
    if (turnoConClinica) return turnoConClinica;
    if (doctorDetail?.clinicas && doctorDetail.clinicas.length > 0) {
      return doctorDetail.clinicas[0].cli_descripcion || (doctorDetail.clinicas[0] as any).cli_nombre || 'Consultorio Médico';
    }
    return 'Consultorio Médico';
  }, [citaSeleccionada, citaDeReferencia, turnos, doctorDetail]);

  const clinicaDireccion = useMemo(() => {
    if ((citaSeleccionada as any)?.clinicaDireccion) return (citaSeleccionada as any).clinicaDireccion;
    if ((citaDeReferencia as any)?.clinicaDireccion) return (citaDeReferencia as any).clinicaDireccion;
    if (doctorDetail?.clinicas && doctorDetail.clinicas.length > 0) {
      return doctorDetail.clinicas[0].cli_direccion_completa || (doctorDetail.clinicas[0] as any).cli_direccion || null;
    }
    return null;
  }, [citaSeleccionada, citaDeReferencia, doctorDetail]);

  const { audioEnabled, isPlaying, toggleAudio, llamarTurno } = useTurnVoice({
    turnoActual: turnoEnConsulta?.turnoNumero ?? null,
    doctorNombre: doctorName,
    pacienteNombre: turnoEnConsulta?.pacienteNombre,
    consultorioNombre: clinicaNombre,
    autoAnnounce: isToday,
  });

  const cambiarEstadoMutation = useCambiarEstadoCita();
  const [loadingCitaId, setLoadingCitaId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<'en_proceso' | 'completada' | null>(null);

  // Estado para modal de solicitud de cambio de horario
  const [turnoParaCambio, setTurnoParaCambio] = useState<ColaTurnoDto | null>(null);
  const crearSolicitudMutation = useCrearSolicitudCambio();
  const cancelarSolicitudMutation = useCancelarSolicitudCambio();

  // Consultar solicitudes de intercambio pendientes y todo el historial del usuario
  const { data: solicitudesPendientes = [], refetch: refetchSolicitudes } = useSolicitudesCambioPendientes();
  const { data: todasLasSolicitudes = [], refetch: refetchTodasSolicitudes } = useTodasSolicitudesUsuario();
  const [solicitudACancelar, setSolicitudACancelar] = useState<SolicitudCambioDto | null>(null);
  const [solicitudParaResponder, setSolicitudParaResponder] = useState<SolicitudCambioDto | null>(null);

  // Solicitudes enviadas por el usuario (en cualquier estado: pendiente, rechazada, cancelada, aceptada)
  const solicitudesEnviadasPorMi = useMemo(() => {
    return todasLasSolicitudes.filter(
      (sol) => sol.tipoRelacion === 'enviada' || misCitasCodigos.has(sol.citaSolicitanteId)
    );
  }, [todasLasSolicitudes, misCitasCodigos]);

  // Turnos objetivo donde el usuario ya utilizó su intento
  const turnosConIntentoGastado = useMemo(() => {
    const set = new Set<string>();
    solicitudesEnviadasPorMi.forEach((sol) => {
      if (sol.citaObjetivoId) set.add(sol.citaObjetivoId);
    });
    return set;
  }, [solicitudesEnviadasPorMi]);

  // ¿El usuario ya envió al menos 1 solicitud de cambio de horario en esta misma cola?
  const yaEnvioSolicitudEnEstaCola = useMemo(() => {
    return solicitudesEnviadasPorMi.some((s) => {
      const fechaSol = s.fechaDeseada ? s.fechaDeseada.split('T')[0] : '';
      const mismaFecha = fechaSol === fechaCita;
      const mismoMedico = s.codMedico === codMedico;
      const esTurnoDeEstaCola = turnos.some((t) => t.ctaCodigo === s.citaObjetivoId);
      return (mismaFecha && mismoMedico) || esTurnoDeEstaCola;
    });
  }, [solicitudesEnviadasPorMi, fechaCita, codMedico, turnos]);

  // Mapeo de solicitudes activas para asociar a los turnos
  const mapaSolicitudesEnviadasPorObjetivo = useMemo(() => {
    const map = new Map<string, SolicitudCambioDto>();
    solicitudesPendientes.forEach((sol) => {
      if (sol.estado === 'pendiente' && (sol.tipoRelacion === 'enviada' || misCitasCodigos.has(sol.citaSolicitanteId))) {
        map.set(sol.citaObjetivoId, sol);
      }
    });
    return map;
  }, [solicitudesPendientes, misCitasCodigos]);

  const mapaSolicitudesOfrecidasPorSolicitante = useMemo(() => {
    const map = new Map<string, SolicitudCambioDto>();
    solicitudesPendientes.forEach((sol) => {
      if (sol.estado === 'pendiente' && (sol.tipoRelacion === 'enviada' || misCitasCodigos.has(sol.citaSolicitanteId))) {
        map.set(sol.citaSolicitanteId, sol);
      }
    });
    return map;
  }, [solicitudesPendientes, misCitasCodigos]);

  const mapaSolicitudesRecibidas = useMemo(() => {
    const map = new Map<string, SolicitudCambioDto>();
    solicitudesPendientes.forEach((sol) => {
      if (sol.estado === 'pendiente' && (sol.tipoRelacion === 'recibida' || misCitasCodigos.has(sol.citaObjetivoId))) {
        map.set(sol.citaObjetivoId, sol);
      }
    });
    return map;
  }, [solicitudesPendientes, misCitasCodigos]);

  // Citas activas del paciente con este especialista que pueden ofrecerse a cambio
  const citasElegibles = useMemo(() => {
    if (!codMedico) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Citas que ya utilizaron su intento de cambio
    const citasConIntentoGastado = new Set(solicitudesEnviadasPorMi.map((s) => s.citaSolicitanteId));

    return citas.filter((c) => {
      // Debe pertenecer al mismo médico
      if (c.ctaCoddoc !== codMedico) return false;

      // No debe ser el mismo turno que se desea solicitar
      if (turnoParaCambio && c.ctaCodigo === turnoParaCambio.ctaCodigo) return false;

      // Si la cita ya utilizó su único intento permitido
      if (citasConIntentoGastado.has(c.ctaCodigo)) return false;

      // Estados activos únicamente
      const st = (c.ctaEstado || '').toLowerCase();
      if (st === 'cancelada' || st === 'rechazada' || st === 'completada' || st === 'no_asistio') {
        return false;
      }

      // No debe ser una fecha anterior a hoy
      if (c.ctaFecha) {
        const fClean = c.ctaFecha.split('T')[0];
        const [y, m, d] = fClean.split('-').map(Number);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          const citaD = new Date(y, m - 1, d);
          if (citaD < today) return false;
        }
      }

      return true;
    });
  }, [citas, codMedico, turnoParaCambio, solicitudesEnviadasPorMi]);

  const handleSolicitarCambio = (turno: ColaTurnoDto) => {
    if (turno.esMiTurno || misCitasCodigos.has(turno.ctaCodigo)) {
      toast.info('Este turno ya te pertenece.');
      return;
    }

    if (yaEnvioSolicitudEnEstaCola) {
      toast.error('Ya has enviado una solicitud de cambio de horario en esta cola. Solo se permite 1 solicitud por cola.');
      return;
    }

    if (turnosConIntentoGastado.has(turno.ctaCodigo)) {
      toast.error('Ya has utilizado tu único intento de solicitud de cambio para este horario.');
      return;
    }

    if (citasElegibles.length === 0) {
      toast.error('Para solicitar un intercambio de horario, necesitas tener al menos una cita activa con intento disponible con este especialista.');
      return;
    }

    setTurnoParaCambio(turno);
  };

  const handleConfirmarSolicitud = (_slot: string, mensaje: string, citaSolicitanteId?: string) => {
    if (!turnoParaCambio) return;

    const idCitaFinal = citaSolicitanteId || miTurno?.ctaCodigo || citasElegibles[0]?.ctaCodigo;
    if (!idCitaFinal) {
      toast.error('No se encontró una cita válida para ofrecer en el intercambio.');
      return;
    }

    crearSolicitudMutation.mutate(
      {
        citaSolicitanteId: idCitaFinal,
        codMedico: codMedico,
        fechaDeseada: fechaCita,
        horaDeseada: turnoParaCambio.ctaHora,
        mensaje: mensaje || undefined,
      },
      {
        onSuccess: () => {
          refetch();
          refetchSolicitudes();
          refetchTodasSolicitudes();
          toast.success('Solicitud de cambio enviada correctamente.');
        },
        onError: (err: any) => {
          toast.error(err?.message || 'Error al enviar la solicitud de cambio');
        },
      }
    );
    setTurnoParaCambio(null);
  };

  const handleConfirmarCancelacion = () => {
    if (!solicitudACancelar) return;
    cancelarSolicitudMutation.mutate(
      {
        solCodigo: solicitudACancelar.solCodigo,
        motivo: 'Cancelada voluntariamente por el paciente desde la sala de espera',
      },
      {
        onSuccess: () => {
          toast.success('Solicitud de cambio cancelada correctamente');
          refetch();
          refetchSolicitudes();
          refetchTodasSolicitudes();
          setSolicitudACancelar(null);
        },
        onError: (err: any) => {
          toast.error(err?.message || 'Error al cancelar la solicitud de cambio');
        },
      }
    );
  };

  const handleCambiarEstado = (
    citaId: string,
    nuevoEstado: 'en_proceso' | 'completada',
    turnoNumero: number,
    pacienteNombre?: string | null
  ) => {
    setLoadingCitaId(citaId);
    setLoadingAction(nuevoEstado);
    cambiarEstadoMutation.mutate(
      { citaId, nuevoEstado },
      {
        onSuccess: () => {
          refetch();
          if (nuevoEstado === 'en_proceso') {
            llamarTurno({
              turnoNumero,
              pacienteNombre: pacienteNombre || undefined,
            });
            toast.success(`Consulta iniciada: Turno #${turnoNumero}`);
          } else {
            toast.success(`Consulta finalizada: Turno #${turnoNumero}`);
          }
        },
        onSettled: () => {
          setLoadingCitaId(null);
          setLoadingAction(null);
        },
      }
    );
  };

  const fechaFormateada = useMemo(() => {
    if (!fechaCita) return 'Hoy';
    try {
      return format(parseISO(fechaCita), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    } catch {
      return fechaCita;
    }
  }, [fechaCita]);

  const fechaCorta = useMemo(() => {
    if (!fechaCita) return '';
    try {
      return format(parseISO(fechaCita), "EEE, d MMM", { locale: es });
    } catch {
      return fechaCita;
    }
  }, [fechaCita]);

  if (isLoadingCitas && !citaSeleccionada) {
    return <NeoLoader />;
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-white pb-12 bg-slate-50/50 dark:bg-[#0B1120]">
      {/* ── HEADER STICKY SIN BORDE (MÁS ALTO, CON VOZ Y ACTUALIZAR TURNOS) ── */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md shadow-xs transition-all border-none">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:py-5 lg:py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Lado izquierdo: Botón regresar + Avatar + Médico + Clínica con alta presencia */}
            <div className="flex items-center gap-3.5 sm:gap-5 min-w-0">
              {/* Botón de regresar arriba a la izquierda */}
              <Link
                href="/dashboard"
                className="inline-flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer shadow-xs"
                title="Regresar al Dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>

              {/* Avatar / Foto del médico más alto */}
              <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black shadow-md overflow-hidden ring-2 ring-blue-500/20">
                {doctorPhoto ? (
                  <img src={doctorPhoto} alt={doctorName} className="h-full w-full object-cover" />
                ) : (
                  <Stethoscope className="h-7 w-7" />
                )}
              </div>

              {/* Info del médico & Ubicación con alta presencia */}
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight truncate">
                    {doctorName}
                  </h1>
                  <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/70 px-2.5 py-0.5 rounded-xl">
                    {doctorSpecialty}
                  </span>
                </div>

                {/* Clínica / Ubicación con alta visibilidad */}
                <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                  <span className="inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-bold">
                    <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
                    <span className="truncate">{clinicaNombre}</span>
                  </span>
                  {clinicaDireccion && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline truncate max-w-sm">
                      • {clinicaDireccion}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Lado derecho: Botones Voz Activada + Actualizar Turnos + Fecha destacada & Selector */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap justify-between lg:justify-end">
              {/* Botón para Llamar Turno actual en consulta (solo ícono sin bordes) */}
              {turnoEnConsulta && (
                <button
                  type="button"
                  onClick={() => llamarTurno()}
                  disabled={isPlaying}
                  className="inline-flex items-center justify-center p-2.5 rounded-2xl border-0 bg-transparent text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition active:scale-90 cursor-pointer animate-pulse shadow-none"
                  title={`Anunciar por voz el Turno #${turnoEnConsulta.turnoNumero}`}
                >
                  <Megaphone className={`h-6 w-6 ${isPlaying ? 'animate-bounce text-blue-600' : ''}`} />
                </button>
              )}

              {/* Botón de Sonido / Voz (solo ícono sin bordes) */}
              <button
                type="button"
                onClick={toggleAudio}
                className={`inline-flex items-center justify-center p-2.5 rounded-2xl border-0 bg-transparent transition active:scale-90 cursor-pointer shadow-none ${
                  audioEnabled
                    ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
                title={audioEnabled ? 'Voz activada (clic para silenciar llamadas de turnos)' : 'Voz silenciada (clic para activar locución de turnos)'}
              >
                {audioEnabled ? (
                  <Volume2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <VolumeX className="h-6 w-6 text-slate-400" />
                )}
              </button>

              {/* Botón de Actualizar Turnos (solo ícono sin bordes) */}
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isRefetching}
                className="inline-flex items-center justify-center p-2.5 rounded-2xl border-0 bg-transparent text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition active:scale-90 cursor-pointer shadow-none"
                title="Actualizar turnos de la cola"
              >
                <RefreshCw className={`h-6 w-6 ${isRefetching ? 'animate-spin text-blue-600' : ''}`} />
              </button>

              {/* Fecha destacada con selector dropdown */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 h-10 sm:h-11 px-3.5 sm:px-4 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-extrabold shadow-2xs">
                  <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="capitalize">{fechaCorta || fechaFormateada}</span>
                  {isToday && (
                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-500 text-white font-black uppercase">
                      Hoy
                    </span>
                  )}
                </div>

                <CalendarioDropdown
                  fechaSeleccionada={fechaCita}
                  onSelectFecha={cambiarFecha}
                  fechaMiCita={fechaDeMiCita}
                  todayStr={todayStr}
                />
              </div>
            </div>

          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">

        {/* Aviso de límite de solicitud por cola */}
        {yaEnvioSolicitudEnEstaCola && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Ya has enviado 1 solicitud de cambio de horario para esta cola (límite máximo de 1 solicitud por cola alcanzado).
            </span>
          </div>
        )}

        {/* Si la cita tiene videollamada activa */}
        {citaSeleccionada?.enlaceVideollamada && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50">
            <div className="flex items-center gap-2.5 text-xs text-blue-800 dark:text-blue-200 font-bold">
              <Video className="w-4 h-4 text-blue-600" />
              <span>Tu cita cuenta con enlace para consulta virtual remota</span>
            </div>
            <a
              href={citaSeleccionada.enlaceVideollamada}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-xs transition"
            >
              <span>Unirse</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-3xl bg-white dark:bg-[#1E293B] p-4 text-center shadow-xs border-none">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Turnos
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              {turnos.length}
            </p>
          </div>

          <div className="rounded-3xl bg-white dark:bg-[#1E293B] p-4 text-center shadow-xs border-none">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Atendidos
            </p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {turnosAtendidos}
            </p>
          </div>

          <div className="rounded-3xl bg-white dark:bg-[#1E293B] p-4 text-center shadow-xs border-none">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              En Consulta
            </p>
            <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {turnoEnConsulta ? `#${turnoEnConsulta.turnoNumero}` : '-'}
            </p>
          </div>

          <div className="rounded-3xl bg-white dark:bg-[#1E293B] p-4 text-center shadow-xs border-none">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Tu Turno
            </p>
            <p className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {miTurno ? `#${miTurno.turnoNumero}` : '-'}
            </p>
            {!miTurno && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Sin cita este día</p>
            )}
          </div>
        </div>

        {/* Turnos Detailed Timeline (Privacy-Safe) */}
        <div className="rounded-3xl bg-white dark:bg-[#1E293B] p-5 sm:p-6 lg:p-8 shadow-xl shadow-slate-900/5 dark:shadow-slate-950/20 space-y-8 border-none">
          
          {/* SECCIÓN 1: COLA DE ATENCIÓN ACTIVA */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Cola de Atención Activa
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/60 px-2.5 py-0.5 text-xs font-bold text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                    {turnosActivos.length} en espera
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Pacientes pendientes o actualmente en consulta médica.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> En Consulta</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" /> En Espera</span>
              </div>
            </div>

            {isLoadingCola ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : turnosActivos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                {turnosActivos.map((t) => (
                  <TurnoCard
                    key={t.ctaCodigo || t.turnoNumero}
                    t={t}
                    miTurno={miTurno}
                    llamarTurno={llamarTurno}
                    cambiarEstadoMutation={cambiarEstadoMutation}
                    loadingCitaId={loadingCitaId}
                    loadingAction={loadingAction}
                    handleCambiarEstado={handleCambiarEstado}
                    onSolicitarCambio={handleSolicitarCambio}
                    misCitasCodigos={misCitasCodigos}
                    solicitudEnviada={mapaSolicitudesEnviadasPorObjetivo.get(t.ctaCodigo)}
                    solicitudOfrecida={mapaSolicitudesOfrecidasPorSolicitante.get(t.ctaCodigo)}
                    solicitudRecibida={mapaSolicitudesRecibidas.get(t.ctaCodigo)}
                    intentoGastado={turnosConIntentoGastado.has(t.ctaCodigo)}
                    yaEnvioSolicitudEnEstaCola={yaEnvioSolicitudEnEstaCola}
                    onCancelarSolicitud={(sol) => setSolicitudACancelar(sol)}
                    onResponderSolicitud={(sol) => setSolicitudParaResponder(sol)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-slate-50/50 dark:bg-slate-900/30">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  ¡No hay turnos pendientes en la cola activa!
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Todos los pacientes registrados para esta fecha han sido atendidos o pasaron al historial del día.
                </p>
              </div>
            )}
          </div>

          {/* SECCIÓN 2: HISTORIAL DEL DÍA (PACIENTES ATENDIDOS) */}
          <div className="space-y-4 pt-4 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Historial del Día (Concluidos / No Asistió)
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                      {turnosAtendidos} atendidos
                    </span>
                    {turnosNoAsistio > 0 && (
                      <span className="inline-flex items-center rounded-full bg-rose-100 dark:bg-rose-900/60 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                        {turnosNoAsistio} no asistió
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Consultas concluidas o turnos no asistidos de esta fecha. Sus horarios quedan liberados en el sistema.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800">
                <CheckCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Horarios liberados en el sistema</span>
              </div>
            </div>

            {isLoadingCola ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {[1, 2].map((i) => (
                  <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : turnosHistorial.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                {turnosHistorial.map((t) => (
                  <TurnoCard
                    key={t.ctaCodigo || t.turnoNumero}
                    t={t}
                    miTurno={miTurno}
                    llamarTurno={llamarTurno}
                    cambiarEstadoMutation={cambiarEstadoMutation}
                    loadingCitaId={loadingCitaId}
                    loadingAction={loadingAction}
                    handleCambiarEstado={handleCambiarEstado}
                    onSolicitarCambio={handleSolicitarCambio}
                    misCitasCodigos={misCitasCodigos}
                    solicitudEnviada={mapaSolicitudesEnviadasPorObjetivo.get(t.ctaCodigo)}
                    solicitudOfrecida={mapaSolicitudesOfrecidasPorSolicitante.get(t.ctaCodigo)}
                    solicitudRecibida={mapaSolicitudesRecibidas.get(t.ctaCodigo)}
                    intentoGastado={turnosConIntentoGastado.has(t.ctaCodigo)}
                    yaEnvioSolicitudEnEstaCola={yaEnvioSolicitudEnEstaCola}
                    onCancelarSolicitud={(sol) => setSolicitudACancelar(sol)}
                    onResponderSolicitud={(sol) => setSolicitudParaResponder(sol)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                Aún no se han completado consultas el día de hoy.
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modal de solicitud de cambio de horario */}
      {turnoParaCambio && (
        <ModalSolicitarCambio
          isOpen={!!turnoParaCambio}
          onClose={() => setTurnoParaCambio(null)}
          fechaTexto={fechaFormateada}
          horaDisplay={turnoParaCambio.ctaHora?.slice(0, 5) ?? '--:--'}
          slotRaw={turnoParaCambio.ctaHora}
          medicoNombre={turnoParaCambio.medicoNombre || doctorName}
          onConfirmar={handleConfirmarSolicitud}
          citasCandidatas={citasElegibles}
          citaPreseleccionadaId={miTurno?.ctaCodigo || citasElegibles[0]?.ctaCodigo}
        />
      )}

      {/* Modal de confirmación para cancelar solicitud de cambio enviada */}
      <ConfirmModal
        isOpen={!!solicitudACancelar}
        onClose={() => setSolicitudACancelar(null)}
        onConfirm={handleConfirmarCancelacion}
        title="¿Cancelar solicitud de cambio de horario?"
        description={
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <p>
              Si cancelas esta solicitud, <strong>tu cita original se mantendrá intacta</strong> en su fecha y hora programadas.
            </p>
            <p className="text-amber-600 dark:text-amber-400 font-medium">
              Nota: Se notificará al otro paciente por correo y ya no podrás volver a solicitar un cambio para este turno.
            </p>
          </div>
        }
        confirmText="Sí, cancelar solicitud"
        cancelText="Mantener solicitud"
        variant="danger"
        isLoading={cancelarSolicitudMutation.isPending}
      />

      {/* Modal para responder solicitud de intercambio recibida */}
      {solicitudParaResponder && (
        <ModalResponderIntercambio
          isOpen={!!solicitudParaResponder}
          onClose={() => {
            setSolicitudParaResponder(null);
            refetch();
            refetchSolicitudes();
          }}
          solicitud={solicitudParaResponder}
        />
      )}
    </div>
  );
}

export default function SalaEsperaPage() {
  return (
    <Suspense fallback={<NeoLoader />}>
      <SalaEsperaContent />
    </Suspense>
  );
}
