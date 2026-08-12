'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import {
  CalendarDays,
  Clock,
  Star,
  Gift,
  Search,
  Stethoscope,
  Users,
  ChevronRight,
  MapPin,
  Award,
  Sparkles,
  ArrowRight,
  BookUser,
  Video,
  Home as HomeIcon,
  Monitor,
} from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

import { NeoLoader } from '@/components/neo-loader';
import { usePacienteTitular } from '@/hooks/use-pacientes';
import { useCitasPaciente } from '@/hooks/use-flujo-citas';
import { useLealtadEstado, useLealtadNiveles } from '@/hooks/use-lealtad';
import { useTotalPuntos } from '@/hooks/use-recompensas';
import { readRecentDoctors, type RecentDoctorItem } from '@/lib/recent-doctors';
import { buildPacienteFullName, getPacienteInitials } from '@/types';
import type { CitaListDto } from '@/types/citas';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeFormatDate(dateStr: string | undefined, formatStr: string): string {
  if (!dateStr) return 'Sin fecha';
  try {
    return format(parseISO(dateStr), formatStr, { locale: es });
  } catch {
    return 'Fecha inválida';
  }
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function getModalityIcon(modalidad: string) {
  const m = modalidad?.toLowerCase() || '';
  if (m.includes('video') || m.includes('virtual')) return <Video className="h-3.5 w-3.5" />;
  if (m.includes('domicilio')) return <HomeIcon className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
}

function getDoctorInitials(name: string | undefined): string {
  if (!name) return 'Dr';
  const parts = name.replace(/^Dr\(a\)\.\s*|^Dr\.\s*|^Dra\.\s*/i, '').trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// ─── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};

// ─── Quick Action Card (Responsive & Unified Theme) ─────────────────────────

function QuickAction({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}) {
  return (
    <Link href={href} className="h-full block">
      <motion.div
        variants={itemVariants}
        whileHover={{ scale: 1.02, y: -3 }}
        whileTap={{ scale: 0.98 }}
        className="group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-4 sm:p-5 lg:p-6 shadow-xs hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-300 h-full cursor-pointer overflow-hidden"
      >
        <div>
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 mb-3 sm:mb-4 shadow-xs group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-300">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 transition-colors duration-300" />
          </div>
          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {label}
          </h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {description}
          </p>
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Upcoming Cita Card (Responsive Doctor Avatar & Badge) ─────────────────

function UpcomingCitaCard({
  cita,
  isFirst,
  doctorImageMap,
}: {
  cita: CitaListDto;
  isFirst: boolean;
  doctorImageMap: Record<string, string>;
}) {
  const fechaFormateada = safeFormatDate(cita.ctaFecha, "EEEE d 'de' MMMM");
  const horaFormateada = cita.ctaHora ? cita.ctaHora.slice(0, 5) : '--:--';
  const doctorPhoto = doctorImageMap[cita.ctaCoddoc];
  const initials = getDoctorInitials(cita.medicoNombre);

  return (
    <Link href="/dashboard/citas">
      <motion.div
        variants={itemVariants}
        whileHover={{ scale: 1.015, y: -2 }}
        className={`group relative rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-lg transition-all cursor-pointer ${
          isFirst
            ? 'border-2 border-blue-500 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-md'
            : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B]'
        }`}
      >
        {/* Badge para la cita más urgente */}
        {isFirst && (
          <div className="absolute -top-3 left-4 sm:left-5">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
              <Sparkles className="h-2.5 w-2.5" /> Más Próxima
            </span>
          </div>
        )}

        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="flex items-center gap-3 min-w-0">
            {/* Humanized Avatar: Doctor Photograph or Styled Initials */}
            <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-sm sm:text-base font-black shadow-sm overflow-hidden border-2 border-white dark:border-slate-800">
              {doctorPhoto ? (
                <img src={doctorPhoto} alt={cita.medicoNombre} className="h-full w-full object-cover" />
              ) : (
                <span className="tracking-tighter">{initials}</span>
              )}
            </div>

            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {cita.medicoNombre || 'Médico'}
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-semibold truncate">
                {cita.medicoEspecialidad || 'Especialidad médica'}
              </p>
              {cita.clinicaNombre && (
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                  <MapPin className="h-3 w-3 shrink-0 text-slate-400" /> {cita.clinicaNombre}
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="inline-flex items-center gap-1 rounded-lg sm:rounded-xl bg-blue-100/80 dark:bg-blue-900/60 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-bold text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
              <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {horaFormateada}
            </div>
          </div>
        </div>

        <div className="mt-3 sm:mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 capitalize">{fechaFormateada}</p>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg border border-slate-200/60 dark:border-slate-700">
              {getModalityIcon(cita.ctaModalidad)} {cita.ctaModalidad || 'Presencial'}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Recent Doctor Mini Card (Responsive) ───────────────────────────────────

function RecentDoctorMini({ doctor }: { doctor: RecentDoctorItem }) {
  return (
    <Link href={`/dashboard/${doctor.exp_codigo}`}>
      <motion.div
        variants={itemVariants}
        whileHover={{ scale: 1.02 }}
        className="group flex items-center gap-3 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A]/60 p-3 sm:p-3.5 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800 transition-all cursor-pointer"
      >
        <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          {doctor.image ? (
            <img src={doctor.image} alt={doctor.fullName} className="h-full w-full object-cover" />
          ) : (
            <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {doctor.fullName}
          </p>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate">{doctor.specialty}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
      </motion.div>
    </Link>
  );
}

// ─── Main Content ────────────────────────────────────────────────────────────

function HomeContent() {
  const { data: session } = useSession();
  const { titular, isLoading: isLoadingTitular } = usePacienteTitular();
  const pacCodigo = titular?.pac_codigo || null;

  // Citas
  const { data: citas = [], isLoading: isLoadingCitas } = useCitasPaciente(pacCodigo);

  // Lealtad
  const { data: lealtadEstado } = useLealtadEstado();
  const { data: puntosData } = useTotalPuntos(pacCodigo ?? undefined);
  const { data: niveles = [] } = useLealtadNiveles();

  // Recent doctors
  const [recentDoctors, setRecentDoctors] = useState<RecentDoctorItem[]>([]);
  useEffect(() => {
    setRecentDoctors(readRecentDoctors());
  }, []);

  // Map of doctor photos from recent doctors for fast lookup
  const doctorImageMap = useMemo(() => {
    const map: Record<string, string> = {};
    recentDoctors.forEach((doc) => {
      if (doc.image) {
        map[doc.exp_codigo] = doc.image;
      }
    });
    return map;
  }, [recentDoctors]);

  // Computed
  const totalPuntos = lealtadEstado?.puntosActuales ?? puntosData?.totalPuntos ?? 0;

  const nivelesOrdenados = useMemo(() => [...niveles].sort((a, b) => a.nvlPuntosMin - b.nvlPuntosMin), [niveles]);
  const nivelEncontrado = useMemo(
    () =>
      nivelesOrdenados.find((n) => totalPuntos >= n.nvlPuntosMin && totalPuntos <= n.nvlPuntosMax) ||
      nivelesOrdenados.find((n) => (lealtadEstado?.nivelActual || '').toLowerCase().includes(n.nvlDescripcion.toLowerCase())) ||
      (nivelesOrdenados.length > 0 ? nivelesOrdenados[0] : null),
    [nivelesOrdenados, totalPuntos, lealtadEstado],
  );

  const nivelActual = nivelEncontrado?.nvlDescripcion || lealtadEstado?.nivelActual || 'Sin Nivel';
  const nombreNivel = nivelActual.toLowerCase().startsWith('nivel') ? nivelActual : `Nivel ${nivelActual}`;
  const puntosMax = nivelEncontrado?.nvlPuntosMax ?? lealtadEstado?.puntosMaximosNivel ?? 0;
  const puntosMin = nivelEncontrado?.nvlPuntosMin ?? lealtadEstado?.puntosMinimosNivel ?? 0;
  const rango = puntosMax - puntosMin;
  let progreso = 0;
  if (rango > 0 && totalPuntos >= puntosMin) {
    progreso = ((totalPuntos - puntosMin) / rango) * 100;
  }
  progreso = Math.min(100, Math.max(0, progreso));
  const anchoProgreso = progreso > 0 ? Math.max(2, progreso) : 0;

  // Upcoming citas (only future ones, sorted by date)
  const upcomingCitas = useMemo(() => {
    const now = new Date();
    return citas
      .filter((c) => {
        const estado = c.ctaEstado?.toLowerCase();
        if (estado === 'cancelada' || estado === 'rechazada' || estado === 'completada' || estado === 'no_asistio') return false;
        try {
          return isAfter(parseISO(c.ctaFecha), new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
        } catch {
          return false;
        }
      })
      .sort((a, b) => new Date(a.ctaFecha).getTime() - new Date(b.ctaFecha).getTime())
      .slice(0, 3);
  }, [citas]);

  const fullName = titular ? buildPacienteFullName(titular) : session?.user?.name || 'Usuario';
  const firstName = titular?.pac_primer_nombre || session?.user?.name?.split(' ')[0] || 'Usuario';
  const initials = titular ? getPacienteInitials(titular) : '?';

  if (isLoadingTitular) {
    return <NeoLoader />;
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-white">
      <motion.main
        className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 space-y-6 sm:space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ── Welcome Header (Responsive Layout & Padding) ── */}
        <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="flex h-14 w-14 sm:h-18 sm:w-18 md:h-20 md:w-20 shrink-0 items-center justify-center rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-lg sm:text-2xl font-black shadow-lg shadow-blue-600/20 overflow-hidden">
              {titular?.pac_foto_perfil_url ? (
                <img src={titular.pac_foto_perfil_url} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">{getGreeting()}</p>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                {firstName} 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-semibold mt-0.5">
                Tu salud, en un solo lugar.
              </p>
            </div>
          </div>

          <Link href="/dashboard/directorio" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-700 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <Search className="h-4 w-4" />
              Buscar Médico
            </motion.button>
          </Link>
        </motion.div>

        {/* ── Upcoming Appointments (Responsive Grid: 1 col on mobile, 2 on tablet, 3 on desktop) ── */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white">Próximas Citas</h2>
            </div>
            <Link
              href="/dashboard/citas"
              className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:gap-2 transition-all"
            >
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isLoadingCitas ? (
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-6 sm:p-8 text-center">
              <div className="animate-pulse flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          ) : upcomingCitas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {upcomingCitas.map((cita, idx) => (
                <UpcomingCitaCard
                  key={cita.ctaCodigo}
                  cita={cita}
                  isFirst={idx === 0}
                  doctorImageMap={doctorImageMap}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl sm:rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-6 sm:p-10 text-center">
              <CalendarDays className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400 dark:text-slate-500 mx-auto mb-2 sm:mb-3" />
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">No tienes citas próximas</h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                Agenda una cita con el médico de tu elección desde el directorio.
              </p>
              <Link href="/dashboard/directorio">
                <button className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 sm:px-5 sm:py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer">
                  <Search className="h-4 w-4" /> Buscar Médico
                </button>
              </Link>
            </div>
          )}
        </motion.section>

        {/* ── Quick Actions (Responsive Grid: 1 col on small phones, 2 on mobile/tablet, 4 on desktop) ── */}
        <motion.section variants={itemVariants}>
          <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Acciones Rápidas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <QuickAction
              href="/dashboard/directorio"
              icon={BookUser}
              label="Directorio Médico"
              description="Explora y encuentra al mejor especialista."
            />
            <QuickAction
              href="/dashboard/citas"
              icon={CalendarDays}
              label="Mis Citas"
              description="Consulta y gestiona tus citas médicas."
            />
            <QuickAction
              href="/dashboard/perfil/puntos"
              icon={Star}
              label="Puntos y Nivel"
              description="Canjea recompensas y sube de nivel."
            />
            <QuickAction
              href="/dashboard/especialidades"
              icon={Stethoscope}
              label="Especialidades"
              description="Busca por área médica específica."
            />
          </div>
        </motion.section>

        {/* ── Bottom Row: Points + Recent Doctors (Responsive 12-col grid) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">

          {/* Points Widget */}
          <motion.section variants={itemVariants} className="lg:col-span-5 flex">
            <div className="flex flex-col justify-between w-full rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-5 sm:p-6 shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-4 sm:mb-5">
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Mi Nivel
                  </h2>
                  <Link
                    href="/dashboard/perfil/puntos"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Ver más →
                  </Link>
                </div>

                <div className="flex items-center gap-3.5 sm:gap-4 mb-4 sm:mb-5">
                  <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 shrink-0">
                    {lealtadEstado?.imagenNivelUrl ? (
                      <img src={lealtadEstado.imagenNivelUrl} alt={nivelActual} className="h-9 w-9 sm:h-10 sm:w-10 object-contain" />
                    ) : (
                      <Award className="h-7 w-7 sm:h-8 sm:w-8" />
                    )}
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">{nombreNivel}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold mt-0.5">
                      <span className="text-blue-600 dark:text-blue-400 font-black">{totalPuntos}</span> puntos acumulados
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-black text-slate-700 dark:text-slate-200">
                    <span>{totalPuntos} / {puntosMax > 0 ? puntosMax : '—'} pts</span>
                    <span>{progreso > 0 && progreso < 1 ? progreso.toFixed(1) : Math.round(progreso)}%</span>
                  </div>
                  <div className="h-3 sm:h-3.5 w-full rounded-full bg-slate-200 dark:bg-slate-700/80 overflow-hidden border border-slate-300 dark:border-slate-600 p-0.5">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-400 shadow-xs"
                      initial={{ width: 0 }}
                      animate={{ width: `${anchoProgreso}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 mt-5 sm:mt-6 pt-2">
                <Link href="/dashboard/perfil/puntos?tab=tienda" className="flex-1">
                  <button className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5 cursor-pointer">
                    <Gift className="h-4 w-4" /> Canjear Puntos
                  </button>
                </Link>
                <Link href="/dashboard/perfil/puntos?tab=misiones" className="flex-1">
                  <button className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer">
                    <Star className="h-4 w-4" /> Misiones
                  </button>
                </Link>
              </div>
            </div>
          </motion.section>

          {/* Recent Doctors */}
          <motion.section variants={itemVariants} className="lg:col-span-7 flex">
            <div className="flex flex-col justify-between w-full rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-5 sm:p-6 shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Médicos Recientes
                  </h2>
                  <Link
                    href="/dashboard/directorio"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Ver directorio →
                  </Link>
                </div>

                {recentDoctors.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    {recentDoctors.slice(0, 4).map((doc) => (
                      <RecentDoctorMini key={doc.exp_codigo} doctor={doc} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6 sm:p-8 text-center my-auto">
                    <Users className="h-7 w-7 sm:h-8 sm:w-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                      Los médicos que visites aparecerán aquí.
                    </p>
                    <Link href="/dashboard/directorio">
                      <button className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                        Explorar directorio →
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.section>

        </div>
      </motion.main>
    </div>
  );
}

// ─── Default Export ──────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <Suspense fallback={<NeoLoader />}>
      <HomeContent />
    </Suspense>
  );
}
