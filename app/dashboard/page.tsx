'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Calendar,
  Clock,
  Star,
  Gift,
  Search,
  Stethoscope,
  ChevronRight,
  MapPin,
  ArrowRight,
  Video,
  Activity,
  RefreshCw,
  Plus,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  User,
  TrendingUp,
  TrendingDown,
  CalendarCheck,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  SlidersHorizontal,
  Home,
  Bell,
  Eye,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

import { NeoLoader } from '@/components/neo-loader';
import { usePacienteTitular } from '@/hooks/use-pacientes';
import {
  useAllCitasPacientes,
  usePacientesSeleccion,
  useAutoCompletarCitasPasadas,
  isCitaPasada,
  useSolicitudesCambioPendientes,
} from '@/hooks/use-flujo-citas';
import { useDoctors } from '@/hooks/use-doctors';
import { useLealtadEstado } from '@/hooks/use-lealtad';
import { useTotalPuntos } from '@/hooks/use-recompensas';
import { readRecentDoctors, type RecentDoctorItem } from '@/lib/recent-doctors';
import { buildPacienteFullName } from '@/types';
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

function getDoctorInitials(name: string | undefined): string {
  if (!name) return 'Dr';
  const parts = name.replace(/^Dr\(a\)\.\s*|^Dr\.\s*|^Dra\.\s*/i, '').trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getPrimerNombrePrimerApellido(paciente?: {
  pac_primer_nombre?: string;
  pac_primer_apellido?: string;
  nombreCompleto?: string;
  nombre?: string;
}): string {
  if (!paciente) return 'Paciente';
  if (paciente.pac_primer_nombre && paciente.pac_primer_apellido) {
    return `${paciente.pac_primer_nombre.trim()} ${paciente.pac_primer_apellido.trim()}`;
  }
  const raw = (paciente.nombreCompleto || paciente.nombre || '').trim();
  if (!raw) return 'Paciente';
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} ${parts[1]}`;
  if (parts.length >= 3) {
    return `${parts[0]} ${parts[2]}`;
  }
  return raw;
}

function isWithinPeriod(dateStr?: string, periodo: 'mes' | '30dias' | 'anio' | 'todo' = 'mes'): boolean {
  if (!dateStr || periodo === 'todo') return true;
  try {
    const d = parseISO(dateStr.split('T')[0]);
    const now = new Date();
    if (periodo === 'mes') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (periodo === '30dias') {
      const diffMs = Math.abs(now.getTime() - d.getTime());
      return diffMs <= 30 * 24 * 60 * 60 * 1000;
    }
    if (periodo === 'anio') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  } catch {
    return true;
  }
}

function isWithinPreviousPeriod(dateStr?: string, periodo: 'mes' | '30dias' | 'anio' | 'todo' = 'mes'): boolean {
  if (!dateStr || periodo === 'todo') return false;
  try {
    const d = parseISO(dateStr.split('T')[0]);
    const now = new Date();
    if (periodo === 'mes') {
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
    }
    if (periodo === '30dias') {
      const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays > 30 && diffDays <= 60;
    }
    if (periodo === 'anio') {
      return d.getFullYear() === now.getFullYear() - 1;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
};

// ─── Main Content ────────────────────────────────────────────────────────────

function HomeContent() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { titular, isLoading: isLoadingTitular } = usePacienteTitular();
  const pacCodigo = titular?.pac_codigo || null;

  // Pacientes asociados a la cuenta (Titular + Dependientes)
  const { data: pacientesList = [] } = usePacientesSeleccion();

  const codigosPacientes = useMemo(() => {
    const list = pacientesList.map((p) => p.pacCodigo);
    if (pacCodigo && !list.includes(pacCodigo)) {
      list.push(pacCodigo);
    }
    return list;
  }, [pacientesList, pacCodigo]);

  // Nombre del titular formateado
  const titularName = useMemo(() => {
    if (!titular) return 'Paciente';
    return titular.pac_primer_nombre && titular.pac_primer_apellido
      ? `${titular.pac_primer_nombre.trim()} ${titular.pac_primer_apellido.trim()}`
      : getPrimerNombrePrimerApellido({ nombreCompleto: buildPacienteFullName(titular) });
  }, [titular]);

  const primerNombreTitular = titular?.pac_primer_nombre || 'Paciente';

  // Mapa de nombres de pacientes
  const pacientesMap = useMemo(() => {
    const map = new Map<string, string>();
    if (titular?.pac_codigo) {
      map.set(titular.pac_codigo, titularName);
    }
    pacientesList.forEach((p) => {
      const nom = getPrimerNombrePrimerApellido({ nombreCompleto: p.nombreCompleto });
      map.set(p.pacCodigo, nom);
    });
    return map;
  }, [titular, titularName, pacientesList]);

  // Citas reales para todos los miembros de la cuenta
  const {
    data: allCitas = [],
    isLoading: isLoadingCitas,
    refetch: refetchCitas,
    isFetching: isFetchingCitas,
  } = useAllCitasPacientes(codigosPacientes);

  // Solicitudes de cambio pendientes
  const { data: solicitudesPendientes = [] } = useSolicitudesCambioPendientes();

  // Control de última sincronización
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date>(new Date());
  const [isRefreshingCitas, setIsRefreshingCitas] = useState(false);

  const horaActualizacionStr = useMemo(() => {
    try {
      return format(ultimaActualizacion, 'HH:mm');
    } catch {
      return '--:--';
    }
  }, [ultimaActualizacion]);

  const handleRefreshCitas = async () => {
    if (isRefreshingCitas || isFetchingCitas) return;
    setIsRefreshingCitas(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['citasTodosPacientes'] }),
        queryClient.invalidateQueries({ queryKey: ['solicitudesCambioPendientes'] }),
        queryClient.invalidateQueries({ queryKey: ['lealtadEstado'] }),
        queryClient.invalidateQueries({ queryKey: ['puntosTotal'] }),
      ]);
      await refetchCitas();
      setUltimaActualizacion(new Date());
      toast.success('Métricas y citas actualizadas');
    } catch {
      toast.error('No se pudieron actualizar los datos');
    } finally {
      setIsRefreshingCitas(false);
    }
  };

  // Auto-completar citas pasadas de forma transparente
  useAutoCompletarCitasPasadas(allCitas);

  // Doctores reales del backend
  const { data: doctorsList = [] } = useDoctors();

  // Lealtad y Puntos
  const { data: lealtadEstado } = useLealtadEstado();
  const { data: puntosData } = useTotalPuntos(pacCodigo ?? undefined);

  // Médicos recientes vistos en localStorage
  const [recentDoctors, setRecentDoctors] = useState<RecentDoctorItem[]>([]);
  useEffect(() => {
    setRecentDoctors(readRecentDoctors());
  }, []);

  // Mapa de fotos y especialidades de doctores
  const doctorDataMap = useMemo(() => {
    const map: Record<string, { image?: string; specialty?: string }> = {};

    doctorsList.forEach((doc) => {
      map[doc.exp_codigo] = {
        image: doc.exp_foto_perfil || undefined,
        specialty: doc.exp_profesion || doc.especialidades?.[0]?.especialidad || undefined,
      };
    });

    recentDoctors.forEach((doc) => {
      if (doc.image) {
        map[doc.exp_codigo] = {
          ...map[doc.exp_codigo],
          image: doc.image,
        };
      }
    });

    return map;
  }, [doctorsList, recentDoctors]);

  // Lista de 3 Médicos Frecuentes / Destacados
  const displayDoctors = useMemo(() => {
    const result: Array<{
      exp_codigo: string;
      fullName: string;
      specialty: string;
      image?: string;
    }> = [];

    const seen = new Set<string>();

    recentDoctors.forEach((doc) => {
      if (!seen.has(doc.exp_codigo)) {
        seen.add(doc.exp_codigo);
        result.push({
          exp_codigo: doc.exp_codigo,
          fullName: doc.fullName,
          specialty: doc.specialty,
          image: doc.image || doctorDataMap[doc.exp_codigo]?.image,
        });
      }
    });

    doctorsList.forEach((doc) => {
      if (result.length < 3 && !seen.has(doc.exp_codigo)) {
        seen.add(doc.exp_codigo);
        result.push({
          exp_codigo: doc.exp_codigo,
          fullName: `${doc.exp_primer_nom || ''} ${doc.exp_primer_ape || ''}`.trim() || 'Médico',
          specialty: doc.exp_profesion || doc.especialidades?.[0]?.especialidad || 'Médico Especialista',
          image: doc.exp_foto_perfil || undefined,
        });
      }
    });

    return result.slice(0, 3);
  }, [recentDoctors, doctorsList, doctorDataMap]);

  // Puntos calculados
  const totalPuntos = lealtadEstado?.puntosActuales ?? puntosData?.totalPuntos ?? 0;
  const maxPuntosMensuales = 5;
  const puntosMes = Math.min(totalPuntos, maxPuntosMensuales);
  const progresoMes = Math.min(100, Math.round((puntosMes / maxPuntosMensuales) * 100));
  const anchoProgreso = progresoMes > 0 ? Math.max(4, progresoMes) : 0;

  // Fecha de hoy en formato ISO YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // ─── Filtros Globales (Control y Contexto Visual) ───────────────────────────
  const [selectedFamiliarId, setSelectedFamiliarId] = useState<string>('todos');
  const [periodoFiltro, setPeriodoFiltro] = useState<'mes' | '30dias' | 'anio' | 'todo'>('mes');
  const [modalidadFiltro, setModalidadFiltro] = useState<'todas' | 'presencial' | 'virtual'>('todas');

  const familiarOptions = useMemo(() => {
    const list = [{ id: 'todos', label: 'Todos' }];
    list.push({ id: titular?.pac_codigo || 'titular', label: primerNombreTitular });

    pacientesList.forEach((p) => {
      if (p.pacCodigo !== titular?.pac_codigo) {
        const first = p.nombreCompleto?.split(' ')[0] || 'Familiar';
        list.push({ id: p.pacCodigo, label: first });
      }
    });

    return list;
  }, [titular, primerNombreTitular, pacientesList]);

  // Citas segmentadas por familiar
  const citasPorFamiliar = useMemo(() => {
    if (selectedFamiliarId === 'todos') return allCitas;
    if (selectedFamiliarId === (titular?.pac_codigo || 'titular')) {
      return allCitas.filter((c) => !c.ctaCodpac || c.ctaCodpac === titular?.pac_codigo);
    }
    return allCitas.filter((c) => c.ctaCodpac === selectedFamiliarId);
  }, [allCitas, selectedFamiliarId, titular]);

  // Citas próximas generales (no pasadas, no canceladas)
  const upcomingCitas = useMemo(() => {
    return citasPorFamiliar
      .filter((c) => {
        const estado = (c.ctaEstado || '').toLowerCase().trim();
        if (['cancelada', 'rechazada', 'completada', 'finalizada', 'atendida', 'atendido', 'realizada', 'no_asistio', 'noasistio'].includes(estado)) return false;
        if (isCitaPasada(c.ctaFecha, c.ctaHora)) return false;
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.ctaFecha.split('T')[0]}T${a.ctaHora || '00:00:00'}`).getTime();
        const dateB = new Date(`${b.ctaFecha.split('T')[0]}T${b.ctaHora || '00:00:00'}`).getTime();
        return dateA - dateB;
      });
  }, [citasPorFamiliar]);

  // Citas próximas dentro del período seleccionado y modalidad
  const upcomingCitasPeriodo = useMemo(() => {
    return upcomingCitas.filter((c) => {
      if (!isWithinPeriod(c.ctaFecha, periodoFiltro)) return false;
      if (modalidadFiltro === 'todas') return true;
      const mod = (c.ctaModalidad || '').toLowerCase();
      if (modalidadFiltro === 'virtual') return mod.includes('virtual') || mod.includes('video');
      return !mod.includes('virtual') && !mod.includes('video');
    });
  }, [upcomingCitas, periodoFiltro, modalidadFiltro]);

  // Consultas completadas dentro del período
  const completedCitasPeriodo = useMemo(() => {
    return citasPorFamiliar.filter((c) => {
      const estado = (c.ctaEstado || '').toLowerCase().trim();
      const isCompleted = ['completada', 'finalizada', 'atendida', 'atendido', 'realizada'].includes(estado) || isCitaPasada(c.ctaFecha, c.ctaHora);
      if (!isCompleted) return false;
      if (!isWithinPeriod(c.ctaFecha, periodoFiltro)) return false;
      if (modalidadFiltro === 'todas') return true;
      const mod = (c.ctaModalidad || '').toLowerCase();
      if (modalidadFiltro === 'virtual') return mod.includes('virtual') || mod.includes('video');
      return !mod.includes('virtual') && !mod.includes('video');
    });
  }, [citasPorFamiliar, periodoFiltro, modalidadFiltro]);

  // Consultas completadas en el período previo para comparativa de tendencia
  const completedCitasPrevio = useMemo(() => {
    return citasPorFamiliar.filter((c) => {
      const estado = (c.ctaEstado || '').toLowerCase().trim();
      const isCompleted = ['completada', 'finalizada', 'atendida', 'atendido', 'realizada'].includes(estado) || isCitaPasada(c.ctaFecha, c.ctaHora);
      if (!isCompleted) return false;
      return isWithinPreviousPeriod(c.ctaFecha, periodoFiltro);
    });
  }, [citasPorFamiliar, periodoFiltro]);

  const comparativaCompletadas = useMemo(() => {
    const actual = completedCitasPeriodo.length;
    const previo = completedCitasPrevio.length;
    if (previo === 0) {
      return {
        valor: actual > 0 ? '+100%' : '0%',
        positivo: actual >= 0,
        esCero: actual === 0,
      };
    }
    const diff = Math.round(((actual - previo) / previo) * 100);
    return {
      valor: `${diff >= 0 ? '+' : ''}${diff}%`,
      positivo: diff >= 0,
      esCero: diff === 0,
    };
  }, [completedCitasPeriodo, completedCitasPrevio]);

  // Citas agendadas para el día de hoy
  const citasHoy = useMemo(() => {
    return upcomingCitas.filter((c) => c.ctaFecha?.split('T')[0] === todayStr);
  }, [upcomingCitas, todayStr]);

  // Alertas críticas que requieren acción
  const alertasUrgentesCount = (solicitudesPendientes?.length || 0) + citasHoy.length;

  // Cita inmediata (Hero) y siguientes citas
  const immediateCita = upcomingCitasPeriodo[0] || upcomingCitas[0] || null;
  const otherUpcomingCitas = (upcomingCitasPeriodo.length > 0 ? upcomingCitasPeriodo : upcomingCitas).filter(
    (c) => c.ctaCodigo !== immediateCita?.ctaCodigo
  );

  // Formato de fecha y hora para la cita inmediata
  const immediateDateDisplay = useMemo(() => {
    if (!immediateCita) return '';
    const cDate = immediateCita.ctaFecha ? immediateCita.ctaFecha.split('T')[0] : '';
    const hora = immediateCita.ctaHora ? immediateCita.ctaHora.slice(0, 5) : '--:--';
    const isToday = cDate === todayStr;
    const dayText = isToday ? 'Hoy' : safeFormatDate(immediateCita.ctaFecha, 'EEE d MMM');
    return `${dayText} • ${hora}`;
  }, [immediateCita, todayStr]);

  const formattedDateStr = useMemo(() => {
    if (!immediateCita?.ctaFecha) return '';
    const d = safeFormatDate(immediateCita.ctaFecha, "EEEE d 'de' MMMM");
    return d.charAt(0).toUpperCase() + d.slice(1);
  }, [immediateCita]);

  const formattedTimeStr = useMemo(() => {
    if (!immediateCita?.ctaHora) return '--:--';
    const [h, m] = immediateCita.ctaHora.split(':');
    const hourNum = parseInt(h, 10);
    if (isNaN(hourNum)) return immediateCita.ctaHora.slice(0, 5);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  }, [immediateCita]);

  const mapsUrl = useMemo(() => {
    if (!immediateCita) return null;
    if (immediateCita.cliUrlGoogleMaps) return immediateCita.cliUrlGoogleMaps;
    if (immediateCita.cliUrlWaze) return immediateCita.cliUrlWaze;
    if (immediateCita.clinicaNombre) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(immediateCita.clinicaNombre)}`;
    }
    return null;
  }, [immediateCita]);

  const [copiedCode, setCopiedCode] = useState(false);
  const handleCopyCodigo = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success('Código de cita copiado');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const immediateDocInfo = immediateCita ? doctorDataMap[immediateCita.ctaCoddoc] : undefined;
  const immediateDocPhoto = immediateDocInfo?.image;
  const immediateDocInitials = immediateCita ? getDoctorInitials(immediateCita.medicoNombre) : 'Dr';
  const immediateDocSpecialty = immediateCita?.medicoEspecialidad || immediateDocInfo?.specialty || 'Medicina General';

  const immediatePacienteName = useMemo(() => {
    if (!immediateCita) return '';
    if (immediateCita.ctaCodpac && pacientesMap.has(immediateCita.ctaCodpac)) {
      return pacientesMap.get(immediateCita.ctaCodpac)!;
    }
    return immediateCita.pacienteNombre ? getPrimerNombrePrimerApellido({ nombre: immediateCita.pacienteNombre }) : titularName;
  }, [immediateCita, pacientesMap, titularName]);

  const immediateColaUrl = immediateCita
    ? `/dashboard/citas/sala-espera?citaId=${immediateCita.ctaCodigo}&doc=${immediateCita.ctaCoddoc}&fecha=${immediateCita.ctaFecha ? immediateCita.ctaFecha.split('T')[0] : ''}`
    : '/dashboard/citas';

  const isVirtual = immediateCita?.ctaModalidad?.toLowerCase().includes('virtual') || immediateCita?.ctaModalidad?.toLowerCase().includes('video');

  // Distribución de modalidades (Presencial vs Virtual vs Domicilio)
  const distribucionModalidad = useMemo(() => {
    let presencial = 0;
    let virtual = 0;
    let domicilio = 0;

    citasPorFamiliar.forEach((c) => {
      const mod = (c.ctaModalidad || '').toLowerCase();
      if (mod.includes('domicilio')) {
        domicilio += 1;
      } else if (mod.includes('virtual') || mod.includes('video')) {
        virtual += 1;
      } else {
        presencial += 1;
      }
    });

    const total = presencial + virtual + domicilio;
    const baseTotal = total || 1;

    return {
      presencial,
      virtual,
      domicilio,
      total,
      pctPresencial: Math.round((presencial / baseTotal) * 100),
      pctVirtual: Math.round((virtual / baseTotal) * 100),
      pctDomicilio: Math.round((domicilio / baseTotal) * 100),
    };
  }, [citasPorFamiliar]);

  if (isLoadingTitular) {
    return <NeoLoader />;
  }

  return (
    <main className="min-h-[calc(100vh-64px)] w-full py-6 sm:py-8 text-slate-900 dark:text-white">
      <motion.div
        className="mx-auto w-full px-4 sm:px-6 lg:w-[90%] lg:px-0 max-w-[1800px] flex flex-col gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ── 1. Cabecera con Control y Contexto Visual ───────────────────────── */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Hola, {primerNombreTitular}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span>Panel ejecutivo de salud y citas médicas</span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Actualizado hoy a las {horaActualizacionStr}
              </span>
              <button
                type="button"
                onClick={handleRefreshCitas}
                disabled={isRefreshingCitas || isFetchingCitas}
                title="Sincronizar métricas ahora"
                className="p-1 rounded-full text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCitas || isFetchingCitas ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Filtros Globales y Acción Primaria */}
          <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
            {/* Filtro por Período de Tiempo */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full p-1 flex text-xs font-semibold shadow-xs">
              {(
                [
                  { id: 'mes', label: 'Este Mes' },
                  { id: '30dias', label: '30 Días' },
                  { id: 'anio', label: 'Este Año' },
                  { id: 'todo', label: 'Todo' },
                ] as const
              ).map((p) => {
                const isSelected = periodoFiltro === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPeriodoFiltro(p.id)}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-blue-600 font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Selector por Familiar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full p-1 flex text-xs font-medium shadow-xs">
              {familiarOptions.map((f) => {
                const isSelected = selectedFamiliarId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFamiliarId(f.id)}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 font-bold border border-blue-200/60 dark:border-blue-900/60 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Botón "+ Nueva Cita" */}
            <Link
              href="/dashboard/directorio"
              className="h-9 px-4 rounded-full bg-slate-900 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0 ml-auto lg:ml-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Cita</span>
            </Link>
          </div>
        </motion.div>

        {/* ── 2. Indicadores Clave de Rendimiento (KPIs Arriba a la Izquierda) ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Próximas Citas */}
          <div
            onClick={() => router.push(`/dashboard/citas?tab=proximas${selectedFamiliarId !== 'todos' ? `&pacienteId=${selectedFamiliarId}` : ''}`)}
            className="group rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4" />
                </div>
                {citasHoy.length > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {citasHoy.length} hoy
                  </span>
                ) : immediateCita ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Próx: {safeFormatDate(immediateCita.ctaFecha, 'd MMM')}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    Sin pendientes
                  </span>
                )}
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {upcomingCitasPeriodo.length}
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                Consultas Programadas
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center justify-between">
              <span>Ver agenda activa</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>

          {/* KPI 2: Consultas Realizadas y Comparativa */}
          <div
            onClick={() => router.push(`/dashboard/citas?tab=historial${selectedFamiliarId !== 'todos' ? `&pacienteId=${selectedFamiliarId}` : ''}`)}
            className="group rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-800 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    comparativaCompletadas.esCero
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      : comparativaCompletadas.positivo
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/60'
                  }`}
                >
                  {comparativaCompletadas.positivo && !comparativaCompletadas.esCero ? (
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                  ) : !comparativaCompletadas.esCero ? (
                    <TrendingDown className="w-3 h-3 text-rose-600" />
                  ) : null}
                  <span>{comparativaCompletadas.valor} vs mes ant.</span>
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {completedCitasPeriodo.length}
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                Consultas Completadas
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              <span>Ver historial de citas</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>

          {/* KPI 3: Puntos NeoClub y Cumplimiento */}
          <div
            onClick={() => router.push('/dashboard/perfil/puntos')}
            className="group rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-teal-300 dark:hover:border-teal-800 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Gift className="w-4 h-4" />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/60 dark:border-teal-900/60">
                  <Check className="w-2.5 h-2.5 text-teal-600" />
                  {progresoMes}% meta mensual
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {totalPuntos}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">pts</span>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                Puntos Activos Acumulados
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-teal-600 dark:text-teal-400 flex items-center justify-between">
              <span>Canjear beneficios</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>

          {/* KPI 4: Alertas Operativas y Turnos */}
          <div
            onClick={() => router.push('/dashboard/citas')}
            className={`group rounded-2xl border p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
              alertasUrgentesCount > 0
                ? 'border-amber-200 dark:border-amber-900/70 bg-amber-50/40 dark:bg-amber-950/20 hover:border-amber-400'
                : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    alertasUrgentesCount > 0
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                </div>
                {alertasUrgentesCount > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    Requiere atención
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Al día
                  </span>
                )}
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {alertasUrgentesCount}
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                {alertasUrgentesCount > 0 ? 'Acciones Pendientes' : 'Sin Alertas Pendientes'}
              </p>
            </div>
            <div
              className={`pt-3 mt-3 border-t text-[11px] font-bold flex items-center justify-between ${
                alertasUrgentesCount > 0
                  ? 'border-amber-200/70 text-amber-800 dark:text-amber-300'
                  : 'border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              <span>{alertasUrgentesCount > 0 ? 'Resolver pendientes' : 'Agenda sincronizada'}</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
        </motion.div>

        {/* ── 3. Banner de Alertas Visuales Inmediatas (si aplica) ───────────── */}
        {alertasUrgentesCount > 0 && (
          <motion.div variants={itemVariants}>
            {solicitudesPendientes.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Tienes {solicitudesPendientes.length} propuesta{solicitudesPendientes.length > 1 ? 's' : ''} de intercambio de turno
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Otro paciente ha solicitado cederte o intercambiar su horario de cita. Revisa los detalles para aceptar o declinar.
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/citas"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs shrink-0 self-stretch sm:self-auto text-center"
                >
                  Ver Solicitud
                </Link>
              </div>
            ) : citasHoy.length > 0 ? (
              <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white">
                        Consulta Hoy
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {citasHoy[0].medicoNombre || 'Médico'} a las {citasHoy[0].ctaHora?.slice(0, 5) || '--:--'}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Modalidad {citasHoy[0].ctaModalidad || 'Presencial'}. Te recomendamos conectarte o presentarte con 10 min de anticipación.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto">
                  <Link
                    href={`/dashboard/citas/sala-espera?citaId=${citasHoy[0].ctaCodigo}&doc=${citasHoy[0].ctaCoddoc}&fecha=${citasHoy[0].ctaFecha?.split('T')[0]}`}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs text-center"
                  >
                    Entrar a Sala de Espera
                  </Link>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}

        {/* ── 4. Detalle Operativo (Bento Grid Principal) ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Cita Inmediata Hero (col-span-1 lg:col-span-8) */}
          <motion.div variants={itemVariants} className="col-span-1 lg:col-span-8 flex">
            <div className="w-full h-full rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs flex flex-col justify-between relative overflow-hidden">
              {immediateCita ? (
                <>
                  {/* Cabecera: Etiqueta + Código a la izquierda, Fecha y hora fusionada a la derecha */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
                        Tu Cita Inmediata
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCodigo(immediateCita.ctaCodigo)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                        title="Copiar código de cita"
                      >
                        <span>#{immediateCita.ctaCodigo.slice(-8).toUpperCase()}</span>
                        {copiedCode ? (
                          <Check className="w-2.5 h-2.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 text-slate-400" />
                        )}
                      </button>
                    </div>

                    {/* Fecha y Hora fusionadas en una sola píldora */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs">
                      <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>{immediateDateDisplay}</span>
                    </div>
                  </div>

                  {/* Cuerpo Principal del Médico y Cita */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-blue-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 shadow-2xs">
                      {immediateDocPhoto ? (
                        <img
                          src={immediateDocPhoto}
                          alt={immediateCita.medicoNombre || 'Médico'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-lg text-blue-600 dark:text-blue-400 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-800 dark:to-slate-700">
                          {immediateDocInitials}
                        </div>
                      )}
                      <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center border border-white dark:border-slate-900 shadow-xs">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate mb-0.5">
                        {immediateDocSpecialty}
                      </p>
                      <h2 className="text-lg font-black text-slate-900 dark:text-white truncate tracking-tight">
                        {immediateCita.medicoNombre || 'Médico Especialista'}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {immediateCita.servicioNombre || 'Consulta Médica General'}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <User className="w-2.5 h-2.5 text-slate-500" />
                          <span>Paciente: {immediatePacienteName}</span>
                        </span>
                        {isVirtual ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
                            <Video className="w-2.5 h-2.5" />
                            Videollamada NeoMeet
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/60 dark:border-sky-900/60">
                            <Activity className="w-2.5 h-2.5" />
                            Consulta Presencial
                          </span>
                        )}
                        {immediateCita.ctaPrecio > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60">
                            Q{immediateCita.ctaPrecio.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sub-tarjetas de Horario y Ubicación */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-2">
                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <CalendarDays className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Horario
                        </p>
                        <div className="text-xs font-bold text-slate-900 dark:text-white capitalize flex flex-wrap items-baseline gap-x-1.5">
                          <span>{formattedDateStr}</span>
                          <span className="text-blue-600 dark:text-blue-400 whitespace-nowrap font-semibold">({formattedTimeStr})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0">
                        {isVirtual ? (
                          <Video className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <MapPin className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {isVirtual ? 'Acceso Virtual' : 'Ubicación'}
                        </p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {isVirtual ? 'Sala NeoMeet Encriptada' : immediateCita.clinicaNombre || 'NeoClínica Especializada'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Fila de Botones de Acción */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                      <span>
                        {(immediateCita.ctaEstado || '').toLowerCase() === 'en_proceso'
                          ? 'Consulta médica en curso'
                          : 'Turno confirmado en agenda'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                      <Link
                        href={`/dashboard/citas/${immediateCita.ctaCodigo}/editar`}
                        className="h-9 px-3.5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Reprogramar</span>
                      </Link>

                      {isVirtual ? (
                        <Link
                          href={immediateColaUrl}
                          className="h-9 px-4 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                        >
                          <Video className="w-4 h-4" />
                          <span>Unirse a llamada</span>
                        </Link>
                      ) : (
                        <>
                          {mapsUrl && (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-9 px-3.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer"
                            >
                              <MapPin className="w-3.5 h-3.5 text-rose-500" />
                              <span>Cómo llegar</span>
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </a>
                          )}

                          <Link
                            href={immediateColaUrl}
                            className="h-9 px-4 rounded-full bg-slate-900 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            <span>Sala de Espera</span>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Estado sin citas inmediatas */
                <div className="flex flex-col items-center justify-center text-center py-10 my-auto">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                    <CalendarDays className="w-7 h-7" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mb-1.5">
                    Sin Citas Inmediatas
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    No tienes consultas pendientes programadas
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-0.5 mb-4">
                    Encuentra especialistas verificados y agenda tu consulta presencial o virtual en minutos.
                  </p>
                  <Link
                    href="/dashboard/directorio"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold shadow-md transition active:scale-95"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Buscar Especialista</span>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          {/* Siguientes Citas (col-span-1 lg:col-span-4) */}
          <motion.div variants={itemVariants} className="col-span-1 lg:col-span-4 flex">
            <div className="w-full h-full rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Siguientes Citas</h3>
                    {otherUpcomingCitas.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {otherUpcomingCitas.length}
                      </span>
                    )}
                  </div>
                  <Link
                    href="/dashboard/citas"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>Ver agenda</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {isLoadingCitas ? (
                  <div className="space-y-2 py-1">
                    <div className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    <div className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  </div>
                ) : otherUpcomingCitas.length > 0 ? (
                  <div className="space-y-2">
                    {otherUpcomingCitas.slice(0, 3).map((cita) => {
                      const docInfo = doctorDataMap[cita.ctaCoddoc];
                      const docPhoto = docInfo?.image;
                      const initials = getDoctorInitials(cita.medicoNombre);
                      const fechaQuery = cita.ctaFecha ? cita.ctaFecha.split('T')[0] : '';
                      const colaUrl = `/dashboard/citas/sala-espera?citaId=${cita.ctaCodigo}&doc=${cita.ctaCoddoc}&fecha=${fechaQuery}`;

                      return (
                        <div
                          key={cita.ctaCodigo}
                          onClick={() => router.push(colaUrl)}
                          className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:border-blue-200 dark:hover:border-blue-900/60 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xs">
                              {docPhoto ? (
                                <img src={docPhoto} alt={cita.medicoNombre} className="w-full h-full object-cover" />
                              ) : (
                                <span>{initials}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {cita.medicoNombre || 'Médico'}
                                </h4>
                                <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0 capitalize">
                                  {cita.ctaModalidad || 'Presencial'}
                                </span>
                              </div>
                              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 truncate mt-0.5 capitalize">
                                {safeFormatDate(cita.ctaFecha, 'EEE d MMM')} • {cita.ctaHora?.slice(0, 5) || '--:--'}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-5 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <CalendarDays className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      No hay más citas en cola
                    </p>
                    <Link
                      href="/dashboard/directorio"
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline mt-0.5 inline-block"
                    >
                      Programar otra cita →
                    </Link>
                  </div>
                )}
              </div>

              {/* Pie de Siguientes Citas */}
              <div className="flex items-center justify-between pt-2.5 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <span>Total en agenda: <strong className="text-slate-800 dark:text-slate-200 font-bold">{upcomingCitas.length}</strong></span>
                <Link
                  href="/dashboard/citas"
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 text-xs"
                >
                  <span>Ver todas</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* ── Fila 2: Diseño, Gráficos Correctos y Usabilidad (3 Columnas de 4) ── */}

          {/* Widget 1: Distribución por Modalidad (Gráfico de Barras Minimalista) */}
          <motion.div variants={itemVariants} className="col-span-1 lg:col-span-4 flex">
            <div className="w-full h-full rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Modalidad de Atención</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {distribucionModalidad.total} consultas
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalidadFiltro(modalidadFiltro === 'todas' ? 'virtual' : modalidadFiltro === 'virtual' ? 'presencial' : 'todas')}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                    title="Alternar filtro de modalidad"
                  >
                    <span>{modalidadFiltro === 'todas' ? 'Todas' : modalidadFiltro === 'virtual' ? 'Virtual' : 'Presencial'}</span>
                  </button>
                </div>

                {/* Barra Segmentada de Distribución (Minimalista, evita pasteles saturados) */}
                <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden my-3">
                  {distribucionModalidad.presencial > 0 && (
                    <div
                      style={{ width: `${distribucionModalidad.pctPresencial}%` }}
                      className="bg-slate-800 dark:bg-slate-400 transition-all duration-500"
                      title={`Presencial: ${distribucionModalidad.pctPresencial}%`}
                    />
                  )}
                  {distribucionModalidad.virtual > 0 && (
                    <div
                      style={{ width: `${distribucionModalidad.pctVirtual}%` }}
                      className="bg-blue-600 dark:bg-blue-500 transition-all duration-500"
                      title={`Virtual: ${distribucionModalidad.pctVirtual}%`}
                    />
                  )}
                  {distribucionModalidad.domicilio > 0 && (
                    <div
                      style={{ width: `${distribucionModalidad.pctDomicilio}%` }}
                      className="bg-teal-500 dark:bg-teal-400 transition-all duration-500"
                      title={`Domicilio: ${distribucionModalidad.pctDomicilio}%`}
                    />
                  )}
                </div>

                {/* Desglose en Barras de Categorías para Usabilidad Óptima (Drill-down interactivo) */}
                <div className="space-y-2 mt-4">
                  <div
                    onClick={() => setModalidadFiltro(modalidadFiltro === 'presencial' ? 'todas' : 'presencial')}
                    className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      modalidadFiltro === 'presencial'
                        ? 'border-slate-800 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/80 font-bold'
                        : 'border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-800 dark:bg-slate-300 shrink-0" />
                      <span className="text-xs text-slate-800 dark:text-slate-200">Presencial en Clínica</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>{distribucionModalidad.presencial}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({distribucionModalidad.pctPresencial}%)</span>
                    </div>
                  </div>

                  <div
                    onClick={() => setModalidadFiltro(modalidadFiltro === 'virtual' ? 'todas' : 'virtual')}
                    className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      modalidadFiltro === 'virtual'
                        ? 'border-blue-600 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/40 font-bold'
                        : 'border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                      <span className="text-xs text-slate-800 dark:text-slate-200">Videollamada NeoMeet</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>{distribucionModalidad.virtual}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({distribucionModalidad.pctVirtual}%)</span>
                    </div>
                  </div>

                  {distribucionModalidad.domicilio > 0 && (
                    <div className="p-2 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
                        <span className="text-xs text-slate-800 dark:text-slate-200">Atención a Domicilio</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>{distribucionModalidad.domicilio}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({distribucionModalidad.pctDomicilio}%)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2.5 mt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Haz clic en una modalidad para filtrar</span>
                {modalidadFiltro !== 'todas' && (
                  <button
                    type="button"
                    onClick={() => setModalidadFiltro('todas')}
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Widget 2: Mis Puntos NeoClub */}
          <motion.div variants={itemVariants} className="col-span-1 lg:col-span-4 flex">
            <div className="w-full h-full rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Mis Puntos NeoClub</h3>
                  <Link
                    href="/dashboard/perfil/puntos"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Catálogo
                  </Link>
                </div>

                {/* Saldo Acumulado con Botón Canjear */}
                <div className="flex items-center justify-between mt-2 mb-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {totalPuntos}
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      pts activos
                    </span>
                  </div>

                  <Link
                    href="/dashboard/perfil/puntos"
                    className="h-8 px-3.5 rounded-full bg-slate-900 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span>Canjear</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Barra de progreso de la meta mensual */}
                <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      Meta mensual ({puntosMes} / {maxPuntosMensuales} pts)
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {progresoMes}% cumplido
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-sky-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${anchoProgreso}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                    Ganas puntos por cada consulta médica completada para canjear en farmacia y beneficios exclusivos.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Widget 3: Médicos Frecuentes (Atención Directa) */}
          <motion.div variants={itemVariants} className="col-span-1 lg:col-span-4 flex">
            <div className="w-full h-full rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Médicos Frecuentes</h3>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/40">
                      Rápido
                    </span>
                  </div>
                  <Link
                    href="/dashboard/directorio"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>Directorio</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Lista compacta de Médicos Frecuentes */}
                <div className="space-y-2 mt-3">
                  {displayDoctors.map((doc) => (
                    <div
                      key={doc.exp_codigo}
                      className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-2.5 flex items-center justify-between hover:bg-white dark:hover:bg-slate-800 hover:shadow-xs hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-50 dark:bg-slate-700 border border-white dark:border-slate-700 shadow-2xs shrink-0">
                          {doc.image ? (
                            <img src={doc.image} alt={doc.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                              {getDoctorInitials(doc.fullName)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                            {doc.fullName}
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {doc.specialty}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/dashboard/agendar/${doc.exp_codigo}`}
                        className="h-7 px-3 bg-white hover:bg-blue-600 text-slate-700 hover:text-white dark:bg-slate-700 dark:hover:bg-blue-600 dark:text-slate-200 border border-slate-200/80 dark:border-slate-600 text-[11px] font-bold rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
                      >
                        Agendar
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2.5 mt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Especialistas verificados</span>
                <Link
                  href="/dashboard/directorio"
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  <span>Explorar todos</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </main>
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
