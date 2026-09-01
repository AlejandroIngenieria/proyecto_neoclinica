'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
} from 'lucide-react';
import { useColaDelDia } from '@/hooks/use-cola-dia';
import { useAllCitasPacientes, usePacientesSeleccion } from '@/hooks/use-flujo-citas';
import { usePacienteTitular } from '@/hooks/use-pacientes';
import { useDoctors } from '@/hooks/use-doctors';
import { NeoLoader } from '@/components/neo-loader';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function SalaEsperaContent() {
  const searchParams = useSearchParams();
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
  const fechaCita = citaSeleccionada?.ctaFecha?.split('T')[0] || fechaParam || new Date().toISOString().split('T')[0];

  const {
    data: turnos = [],
    isLoading: isLoadingCola,
    isRefetching,
    refetch,
  } = useColaDelDia(codMedico, fechaCita, pacCodigo || citaSeleccionada?.ctaCodpac);

  const doctorInfo = useMemo(() => {
    return doctorsList.find((d) => d.exp_codigo === codMedico);
  }, [doctorsList, codMedico]);

  // Encontrar el turno del paciente y métricas
  const miTurno = useMemo(() => {
    return turnos.find((t) => t.esMiTurno || (citaSeleccionada && t.ctaCodigo === citaSeleccionada.ctaCodigo));
  }, [turnos, citaSeleccionada]);

  const turnoEnConsulta = useMemo(() => {
    return turnos.find((t) => (t.ctaEstado || '').toLowerCase() === 'en_proceso');
  }, [turnos]);

  const turnosAtendidos = useMemo(() => {
    return turnos.filter((t) => (t.ctaEstado || '').toLowerCase() === 'completada').length;
  }, [turnos]);

  const turnosAntesDeMi = useMemo(() => {
    if (!miTurno) return 0;
    return turnos.filter(
      (t) =>
        t.turnoNumero < miTurno.turnoNumero &&
        (t.ctaEstado || '').toLowerCase() !== 'completada' &&
        (t.ctaEstado || '').toLowerCase() !== 'no_asistio'
    ).length;
  }, [turnos, miTurno]);

  const esMiTurnoEnConsulta = miTurno && (miTurno.ctaEstado || '').toLowerCase() === 'en_proceso';
  const esMiTurnoCompletado = miTurno && (miTurno.ctaEstado || '').toLowerCase() === 'completada';
  const esSiguienteTurno = miTurno && turnosAntesDeMi === 0 && !esMiTurnoEnConsulta && !esMiTurnoCompletado;

  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const isToday = fechaCita === todayStr;

  const fechaFormateada = useMemo(() => {
    if (!fechaCita) return 'Hoy';
    try {
      return format(parseISO(fechaCita), "EEEE d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return fechaCita;
    }
  }, [fechaCita]);

  const doctorPhoto = doctorInfo?.exp_foto_perfil || undefined;
  const doctorName = citaSeleccionada?.medicoNombre || (doctorInfo ? `${doctorInfo.exp_primer_nom} ${doctorInfo.exp_primer_ape}` : 'Médico Especialista');
  const doctorSpecialty = citaSeleccionada?.medicoEspecialidad || doctorInfo?.exp_profesion || 'Especialidad Médica';

  if (isLoadingCitas && !citaSeleccionada) {
    return <NeoLoader />;
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-white pb-12">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 space-y-6 sm:space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                {isToday ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 dark:bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    EN VIVO
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 dark:bg-blue-400/15 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 border border-blue-500/30">
                    <Calendar className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    CITA PROGRAMADA
                  </span>
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold capitalize">
                  {fechaFormateada}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                Sala de Espera y Cola de Atención
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin text-blue-600' : 'text-slate-400'}`} />
              <span>{isRefetching ? 'Actualizando...' : 'Actualizar Turnos'}</span>
            </button>
          </div>
        </div>

        {/* Doctor & Appointment Details Card with Top-Right Status Badge */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-5 sm:p-6 lg:p-7 shadow-xl shadow-slate-900/5 dark:shadow-slate-950/20">
          {/* Header Row inside card: Title + Top-Right Dynamic Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Información de la Consulta
            </span>

            {/* Dynamic Status Badge in Top-Right Corner (Only live active on today's date) */}
            {isToday ? (
              esMiTurnoEnConsulta ? (
                <div className="inline-flex items-center gap-2 rounded-2xl bg-blue-500/15 border border-blue-500/30 px-3.5 py-1.5 text-xs font-black text-blue-700 dark:text-blue-300 shadow-xs animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
                  <span>En Consulta Médica Activa</span>
                </div>
              ) : esSiguienteTurno ? (
                <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 px-3.5 py-1.5 text-xs font-black text-amber-700 dark:text-amber-300 shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  <span>¡Eres el siguiente turno! (Turno #{miTurno?.turnoNumero} - {miTurno?.ctaHora?.slice(0, 5)})</span>
                </div>
              ) : esMiTurnoCompletado ? (
                <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1.5 text-xs font-black text-emerald-700 dark:text-emerald-300 shadow-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Consulta Finalizada</span>
                </div>
              ) : miTurno ? (
                <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    {turnosAntesDeMi > 0
                      ? `Faltan ${turnosAntesDeMi} turno(s) antes del tuyo (Turno #${miTurno.turnoNumero})`
                      : `Turno #${miTurno.turnoNumero} en espera de llamado`}
                  </span>
                </div>
              ) : null
            ) : (
              <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  {miTurno ? `Turno Asignado: #${miTurno.turnoNumero} (${miTurno.ctaHora?.slice(0, 5)})` : 'Cita Programada'}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-xl sm:text-2xl font-black shadow-lg overflow-hidden border-2 border-white dark:border-slate-800">
                {doctorPhoto ? (
                  <img src={doctorPhoto} alt={doctorName} className="h-full w-full object-cover" />
                ) : (
                  <Stethoscope className="h-8 w-8" />
                )}
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Médico Tratante
                </p>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {doctorName}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-semibold">
                  {doctorSpecialty}
                </p>

                {citaSeleccionada?.clinicaNombre && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1.5 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {citaSeleccionada.clinicaNombre}
                  </p>
                )}
              </div>
            </div>

            {/* Modalidad & Links */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3 sm:p-4 border border-slate-200/60 dark:border-slate-700/60 min-w-36">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Modalidad
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white capitalize mt-0.5 flex items-center gap-1.5">
                  <Monitor className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  {citaSeleccionada?.ctaModalidad || 'Presencial'}
                </p>
              </div>

              {citaSeleccionada?.enlaceVideollamada && (
                <a
                  href={citaSeleccionada.enlaceVideollamada}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-3 shadow-md transition active:scale-95"
                >
                  <Video className="h-4 w-4" />
                  <span>Unirse a Videollamada</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-4 text-center shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Turnos
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              {turnos.length}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-4 text-center shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Atendidos
            </p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {turnosAtendidos}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-4 text-center shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              En Consulta
            </p>
            <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {turnoEnConsulta ? `#${turnoEnConsulta.turnoNumero}` : '-'}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-4 text-center shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Tu Turno
            </p>
            <p className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {miTurno ? `#${miTurno.turnoNumero}` : '-'}
            </p>
          </div>
        </div>

        {/* Turnos Detailed Timeline (Privacy-Safe) */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-5 sm:p-6 lg:p-8 shadow-xl shadow-slate-900/5 dark:shadow-slate-950/20 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Cronograma de Turnos del Día
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Los turnos de otros pacientes se muestran de forma anónima por privacidad.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Atendido</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> En Consulta</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" /> En Espera</span>
            </div>
          </div>

          {isLoadingCola ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : turnos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {turnos.map((t) => {
                const estado = (t.ctaEstado || '').toLowerCase();
                const isEnProceso = estado === 'en_proceso';
                const isCompletada = estado === 'completada';
                const isNoAsistio = estado === 'no_asistio';
                const isMine = t.esMiTurno || (miTurno && t.ctaCodigo === miTurno.ctaCodigo);
                const horaTurno = t.ctaHora ? t.ctaHora.slice(0, 5) : '--:--';

                return (
                  <div
                    key={t.ctaCodigo || t.turnoNumero}
                    className={`relative flex flex-col justify-between rounded-2xl p-4 sm:p-5 transition-all ${
                      isMine
                        ? 'border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/60 dark:to-indigo-950/40 shadow-lg ring-2 ring-blue-500/20'
                        : isEnProceso
                        ? 'border-2 border-amber-400 bg-amber-50/60 dark:bg-amber-950/40 shadow-md'
                        : isCompletada
                        ? 'border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 opacity-85'
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

                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 dark:bg-slate-800 px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {horaTurno}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Estado:
                      </span>

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
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                          No Asistió
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                          En Espera
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
              No hay turnos registrados en la cola para esta fecha.
            </div>
          )}
        </div>
      </div>
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
