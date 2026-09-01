'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { useColaDelDia } from '@/hooks/use-cola-dia';
import type { CitaListDto } from '@/types/citas';

interface ColaTurnosWidgetProps {
  citaHoy: CitaListDto;
  pacienteActualId?: string | null;
}

export function ColaTurnosWidget({ citaHoy, pacienteActualId }: { citaHoy: CitaListDto; pacienteActualId?: string | null }) {
  const fechaCita = citaHoy.ctaFecha ? citaHoy.ctaFecha.split('T')[0] : '';
  const { data: turnos = [], isLoading, isRefetching, refetch } = useColaDelDia(
    citaHoy.ctaCoddoc,
    fechaCita,
    pacienteActualId || citaHoy.ctaCodpac
  );

  // Encontrar el turno del paciente y el turno en consulta
  const miTurno = useMemo(() => {
    return turnos.find((t) => t.esMiTurno || t.ctaCodigo === citaHoy.ctaCodigo);
  }, [turnos, citaHoy.ctaCodigo]);

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

  const horaFormateadaMiTurno = miTurno?.ctaHora ? miTurno.ctaHora.slice(0, 5) : citaHoy.ctaHora?.slice(0, 5) || '--:--';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl border-2 border-blue-500/40 dark:border-blue-500/30 bg-gradient-to-br from-white via-blue-50/20 to-white dark:from-[#1E293B] dark:via-[#0F172A]/80 dark:to-[#1E293B] p-5 sm:p-6 lg:p-7 shadow-xl shadow-blue-500/5 backdrop-blur-xl"
    >
      {/* Decorative Glow Background */}
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      {/* Header Widget */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30">
            <Activity className="h-6 w-6" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 dark:bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                SALA DE ESPERA EN VIVO
              </span>

              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Cita para Hoy
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
              Cola de Atención • {citaHoy.medicoNombre || 'Médico'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {citaHoy.medicoEspecialidad || 'Consulta Médica'} • {citaHoy.clinicaNombre || 'NeoClinica'} • Modalidad {citaHoy.ctaModalidad || 'Presencial'}
            </p>
          </div>
        </div>

        {/* Live Refresh Button & Summary Badge */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer"
            title="Actualizar estado de la cola"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin text-blue-600' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Patient Dynamic Status Banner */}
      <div className="my-5">
        {esMiTurnoEnConsulta ? (
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25 animate-pulse">
            <Stethoscope className="h-6 w-6 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-wide">¡Es tu turno ahora!</p>
              <p className="text-xs text-blue-100 font-medium mt-0.5">
                El médico te está atendiendo en consulta en este momento.
              </p>
            </div>
          </div>
        ) : esSiguienteTurno ? (
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
            <Sparkles className="h-6 w-6 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-wide">¡Eres el siguiente turno!</p>
              <p className="text-xs text-amber-100 font-medium mt-0.5">
                Prepárate para ingresar a tu consulta médica (Turno #{miTurno?.turnoNumero} - {horaFormateadaMiTurno}).
              </p>
            </div>
          </div>
        ) : esMiTurnoCompletado ? (
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-wide">Consulta Finalizada</p>
              <p className="text-xs text-emerald-100 font-medium mt-0.5">
                Tu cita médica ha sido completada exitosamente.
              </p>
            </div>
          </div>
        ) : miTurno ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/40">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white text-sm font-black shadow-xs shrink-0">
                #{miTurno.turnoNumero}
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  Tu Turno Asignado: <span className="text-blue-600 dark:text-blue-400">Turno #{miTurno.turnoNumero}</span> ({horaFormateadaMiTurno})
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                  {turnosAntesDeMi > 0
                    ? `Faltan ${turnosAntesDeMi} turno(s) antes del tuyo para ser atendido.`
                    : 'La consulta está por iniciar.'}
                </p>
              </div>
            </div>

            {turnoEnConsulta && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300/60 dark:border-amber-900/50 text-[11px] font-bold text-amber-800 dark:text-amber-300 self-start sm:self-auto">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                En consulta: Turno #{turnoEnConsulta.turnoNumero}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Turnos Grid / Timeline (Privacy-Safe for Patients) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Avance de Turnos del Día ({turnos.length} programados)
          </p>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Atendidos ({turnosAtendidos})</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> En Consulta</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" /> En Espera</span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
            ))}
          </div>
        ) : turnos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
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
                  className={`relative flex flex-col justify-between rounded-2xl p-3 sm:p-3.5 transition-all ${
                    isMine
                      ? 'border-2 border-blue-500 bg-blue-50/70 dark:bg-blue-950/50 shadow-md ring-2 ring-blue-500/20'
                      : isEnProceso
                      ? 'border-2 border-amber-400 bg-amber-50/50 dark:bg-amber-950/30'
                      : isCompletada
                      ? 'border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 opacity-80'
                      : 'border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-800/40'
                  }`}
                >
                  {/* Badge Tu Turno */}
                  {isMine && (
                    <div className="absolute -top-2.5 left-2.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-xs">
                        <Sparkles className="h-2.5 w-2.5" /> Tu Cita
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-1 pt-1">
                    <span className={`text-xs sm:text-sm font-black ${isMine ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>
                      Turno #{t.turnoNumero}
                    </span>

                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      <Clock className="h-3 w-3" />
                      {horaTurno}
                    </span>
                  </div>

                  {/* Estado Visual */}
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    {isEnProceso ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/50 px-2 py-0.5 rounded-md w-full justify-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                        En Consulta
                      </span>
                    ) : isCompletada ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md w-full justify-center">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Atendido
                      </span>
                    ) : isNoAsistio ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md w-full justify-center">
                        No Asistió
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md w-full justify-center">
                        En Espera
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-500 dark:text-slate-400">
            No se registran otros turnos en la cola para hoy.
          </div>
        )}
      </div>
    </motion.div>
  );
}
