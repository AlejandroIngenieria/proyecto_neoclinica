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
  SlidersHorizontal,
  Home,
  Bell,
  Eye,
  Info,
  Pill,
  Lock,
  Leaf,
  Building2,
  Navigation,
  CalendarClock,
  Printer,
  Paperclip,
  XCircle,
  QrCode,
  FileText,
  ChevronDown,
  CheckCheck,
  Loader2,
  Download,
  Smartphone,
  Trash2,
  Users,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Modal } from '@/components/ui/modal';
import { NeoLoader } from '@/components/neo-loader';
import { PacienteFormModal } from '@/components/paciente-form-modal';
import { usePacienteTitular } from '@/hooks/use-pacientes';
import {
  useAllCitasPacientes,
  usePacientesSeleccion,
  useAutoCompletarCitasPasadas,
  isCitaPasada,
  useSolicitudesCambioPendientes,
  useCancelarCita,
} from '@/hooks/use-flujo-citas';
import { useDoctors } from '@/hooks/use-doctors';
import { useLealtadEstado } from '@/hooks/use-lealtad';
import { useTotalPuntos, useCatalogoRecompensas } from '@/hooks/use-recompensas';
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

function KpiInfoTooltip({ title, description }: { title: string; description: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Tooltip open={isOpen} onOpenChange={setIsOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-help shrink-0 focus:outline-none"
          aria-label={`Información sobre ${title}`}
        >
          <Info className="w-3 h-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        className="max-w-[250px] p-2.5 text-xs bg-slate-900/95 dark:bg-slate-950 text-slate-100 border border-slate-700/60 rounded-xl shadow-xl z-50 backdrop-blur-md"
      >
        <p className="font-bold text-[11px] text-white mb-0.5">{title}</p>
        <p className="text-[11px] text-slate-300 font-normal leading-relaxed">{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Main Content ────────────────────────────────────────────────────────────

function HomeContent() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { titular, isLoading: isLoadingTitular } = usePacienteTitular();
  const [isAddPacienteOpen, setIsAddPacienteOpen] = useState(false);
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
  const [horaActualizacionStr, setHoraActualizacionStr] = useState<string>('--:--');

  useEffect(() => {
    try {
      setHoraActualizacionStr(format(ultimaActualizacion, 'HH:mm'));
    } catch {
      setHoraActualizacionStr('--:--');
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
  const { data: catalogo = [] } = useCatalogoRecompensas();

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

  // Recompensas del catálogo oficiales según diseño solicitado (Imagen 1)
  const recompensasCatalogo = useMemo(() => {
    const defaultRewards = [
      {
        id: 'rec-1',
        titulo: 'Cita gratis con especialistas autorizados',
        costo: 60,
      },
      {
        id: 'rec-2',
        titulo: '15% de descuento con especialistas autorizados',
        costo: 35,
      },
      {
        id: 'rec-3',
        titulo: 'Recordatorios de citas versión premium por 3 meses',
        costo: 15,
      },
      {
        id: 'rec-4',
        titulo: 'Carga de archivos versión premium por 3 meses',
        costo: 15,
      },
    ];

    const userPts = totalPuntos;

    return defaultRewards.map((item) => {
      const faltantes = Math.max(0, item.costo - userPts);
      const pct = Math.min(100, Math.round((userPts / item.costo) * 100));
      const canAfford = userPts >= item.costo;
      return {
        ...item,
        canAfford,
        faltantes,
        pct,
        userPts,
      };
    });
  }, [totalPuntos]);

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

  // Estado para selección interactiva de mes en la gráfica del KPI 2 (Consultas Completadas)
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<{
    label: string;
    fullMonthName: string;
    monthIndex: number;
    year: number;
    count: number;
    isCurrent: boolean;
    height: number;
    citas: CitaListDto[];
  } | null>(null);
  const [isHistoryMonthModalOpen, setIsHistoryMonthModalOpen] = useState(false);

  const familiarOptions = useMemo(() => {
    const list: Array<{
      id: string;
      label: string;
      initial?: string;
      pendingCount: number;
      palette?: { avatarBg: string; badgeBg: string };
    }> = [
      { id: 'todos', label: 'Todos', pendingCount: 0 }
    ];

    const PALETTES = [
      { avatarBg: 'bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-300', badgeBg: 'bg-[#0284c7]' },
      { avatarBg: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300', badgeBg: 'bg-[#059669]' },
      { avatarBg: 'bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300', badgeBg: 'bg-[#6366f1]' },
      { avatarBg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300', badgeBg: 'bg-[#d97706]' },
      { avatarBg: 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400', badgeBg: 'bg-[#e11d48]' },
    ];

    const getPendingCount = (pacCode: string | null | undefined) => {
      if (!pacCode) return 0;
      return allCitas.filter((c) => {
        const matches = c.ctaCodpac === pacCode || (!c.ctaCodpac && pacCode === titular?.pac_codigo);
        if (!matches) return false;
        const estado = (c.ctaEstado || '').toLowerCase().trim();
        if (['cancelada', 'rechazada', 'completada', 'finalizada', 'atendida', 'atendido', 'realizada', 'no_asistio', 'noasistio'].includes(estado)) return false;
        if (isCitaPasada(c.ctaFecha, c.ctaHora)) return false;
        return true;
      }).length;
    };

    // 1. Titular
    list.push({
      id: titular?.pac_codigo || 'titular',
      label: primerNombreTitular,
      initial: primerNombreTitular.charAt(0).toUpperCase() || 'P',
      pendingCount: getPendingCount(titular?.pac_codigo),
      palette: PALETTES[0],
    });

    // 2. Dependientes de la cuenta
    let colorIdx = 1;
    pacientesList.forEach((p) => {
      if (p.pacCodigo !== titular?.pac_codigo) {
        const first = p.nombreCompleto?.split(' ')[0] || 'Familiar';
        list.push({
          id: p.pacCodigo,
          label: first,
          initial: first.charAt(0).toUpperCase(),
          pendingCount: getPendingCount(p.pacCodigo),
          palette: PALETTES[colorIdx % PALETTES.length],
        });
        colorIdx++;
      }
    });

    return list;
  }, [titular, primerNombreTitular, pacientesList, allCitas]);

  // Citas segmentadas por familiar
  const citasPorFamiliar = useMemo(() => {
    if (selectedFamiliarId === 'todos') return allCitas;
    if (selectedFamiliarId === (titular?.pac_codigo || 'titular')) {
      return allCitas.filter((c) => !c.ctaCodpac || c.ctaCodpac === titular?.pac_codigo);
    }
    return allCitas.filter((c) => c.ctaCodpac === selectedFamiliarId);
  }, [allCitas, selectedFamiliarId, titular]);

  // Identificador de paciente específico seleccionado para navegación en KPIs
  const isTodosSelected = selectedFamiliarId === 'todos';
  const activePacienteId = useMemo(() => {
    if (selectedFamiliarId === 'todos') return null;
    if (selectedFamiliarId === 'titular') return titular?.pac_codigo || null;
    return selectedFamiliarId;
  }, [selectedFamiliarId, titular?.pac_codigo]);
  const isKpiNavigable = !isTodosSelected && Boolean(activePacienteId);

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

  // Total de citas completadas en el historial de la cuenta
  const allCompletedCitas = useMemo(() => {
    return citasPorFamiliar.filter((c) => {
      const estado = (c.ctaEstado || '').toLowerCase().trim();
      return ['completada', 'finalizada', 'atendida', 'atendido', 'realizada'].includes(estado) || isCitaPasada(c.ctaFecha, c.ctaHora);
    });
  }, [citasPorFamiliar]);

  // Secciones dinámicas para Consultas Programadas (KPI 1)
  // Cada consulta programada genera su propia sección; no se generan 'SLOT 2' ni 'SLOT 3' artificiales
  const kpiCitasProgramadasSections = useMemo(() => {
    const list = upcomingCitasPeriodo;
    if (!list || list.length === 0) {
      return [];
    }

    if (list.length <= 4) {
      return list.map((cita, i) => {
        let label = `CITA ${i + 1}`;
        if (cita.ctaFecha) {
          try {
            const d = parseISO(cita.ctaFecha.split('T')[0]);
            const dateStr = format(d, 'd MMM', { locale: es }).toUpperCase();
            const timeStr = cita.ctaHora ? cita.ctaHora.slice(0, 5) : '';
            label = list.length === 1 && timeStr ? `${dateStr} • ${timeStr}` : dateStr;
          } catch {
            label = `CITA ${i + 1}`;
          }
        }
        return {
          id: cita.ctaCodigo || String(i),
          label,
          fullDate: cita.ctaFecha ? cita.ctaFecha.split('T')[0] : '',
        };
      });
    }

    // Si hay 5 o más consultas programadas, mostramos las primeras 3 y una sección de acumulación
    const firstThree = list.slice(0, 3).map((cita, i) => {
      let label = `CITA ${i + 1}`;
      if (cita.ctaFecha) {
        try {
          const d = parseISO(cita.ctaFecha.split('T')[0]);
          label = format(d, 'd MMM', { locale: es }).toUpperCase();
        } catch {
          label = `CITA ${i + 1}`;
        }
      }
      return {
        id: cita.ctaCodigo || String(i),
        label,
        fullDate: cita.ctaFecha ? cita.ctaFecha.split('T')[0] : '',
      };
    });

    const restantes = list.length - 3;
    firstThree.push({
      id: 'mas-citas',
      label: `+${restantes} MÁS`,
      fullDate: `${restantes} consultas adicionales programadas`,
    });

    return firstThree;
  }, [upcomingCitasPeriodo]);

  // Datos de historial y barras de últimos 6 meses (KPI 2 - Monitoreo Fidedigno y Dinámico)
  const kpiHistoryStats = useMemo(() => {
    const now = new Date();
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const currentYear = now.getFullYear();

    // Mapeo detallado de cada uno de los últimos 6 meses (garantizando año fidedigno sin hardcoding)
    const monthData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const label = months[mIdx];
      const rawMonthName = format(d, 'MMMM', { locale: es });
      const fullMonthName = rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1);
      const isCurrent = i === 0;

      const citas = allCompletedCitas
        .filter((c) => {
          if (!c.ctaFecha) return false;
          try {
            const cDate = parseISO(c.ctaFecha.split('T')[0]);
            return cDate.getMonth() === mIdx && cDate.getFullYear() === yr;
          } catch {
            return false;
          }
        })
        .sort((a, b) => {
          const dateA = new Date(`${a.ctaFecha.split('T')[0]}T${a.ctaHora || '00:00:00'}`).getTime();
          const dateB = new Date(`${b.ctaFecha.split('T')[0]}T${b.ctaHora || '00:00:00'}`).getTime();
          return dateB - dateA;
        });

      monthData.push({
        label,
        fullMonthName,
        monthIndex: mIdx,
        year: yr,
        count: citas.length,
        isCurrent,
        citas,
      });
    }

    const maxCount = Math.max(...monthData.map((m) => m.count), 1);
    const bars = monthData.map((m) => ({
      ...m,
      // Altura real y proporcional a las consultas verificadas en la base de datos
      height: m.count > 0 ? Math.min(100, Math.max(25, Math.round((m.count / maxCount) * 100))) : 8,
    }));

    return {
      bars,
      currentYear,
      totalPrevias: allCompletedCitas.length,
      currentMonthCount: completedCitasPeriodo.length,
    };
  }, [allCompletedCitas, completedCitasPeriodo]);

  // Cita inmediata (Hero) y siguientes citas
  const immediateCita = upcomingCitasPeriodo[0] || upcomingCitas[0] || null;
  const otherUpcomingCitas = (upcomingCitasPeriodo.length > 0 ? upcomingCitasPeriodo : upcomingCitas).filter(
    (c) => c.ctaCodigo !== immediateCita?.ctaCodigo
  );

  // Próximas Citas Reales (sin datos inventados)
  const displayUpcomingCitas = useMemo(() => {
    if (!otherUpcomingCitas || otherUpcomingCitas.length === 0) {
      return [];
    }

    return otherUpcomingCitas.slice(0, 3).map((cita) => {
      const docInfo = doctorDataMap[cita.ctaCoddoc];
      const docPhoto = docInfo?.image;
      const initials = getDoctorInitials(cita.medicoNombre);
      const docSpecialty = cita.medicoEspecialidad || docInfo?.specialty || 'Medicina General';
      const mod = (cita.ctaModalidad || '').toLowerCase();
      const isTelemedicina = mod.includes('virtual') || mod.includes('video') || mod.includes('telemedicina');
      const isDomicilio = mod.includes('domicilio');
      const isPresencial = !isTelemedicina && !isDomicilio;

      let fechaFormatted = 'Fecha por definir';
      if (cita.ctaFecha) {
        try {
          const d = parseISO(cita.ctaFecha.split('T')[0]);
          const raw = format(d, 'EEE d MMM', { locale: es });
          const cap = raw.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          const hora = cita.ctaHora ? cita.ctaHora.slice(0, 5) : '09:00';
          fechaFormatted = `${cap} · ${hora} hrs`;
        } catch {
          fechaFormatted = cita.ctaFecha.split('T')[0];
        }
      }

      const fechaQuery = cita.ctaFecha ? cita.ctaFecha.split('T')[0] : '';
      const colaUrl = `/dashboard/citas/sala-espera?citaId=${cita.ctaCodigo}&doc=${cita.ctaCoddoc}&fecha=${fechaQuery}`;

      return {
        ctaCodigo: cita.ctaCodigo,
        ctaCoddoc: cita.ctaCoddoc,
        medicoNombre: cita.medicoNombre || 'Médico Especialista',
        medicoEspecialidad: docSpecialty,
        modalidad: isTelemedicina ? 'telemedicina' : isDomicilio ? 'domicilio' : 'presencial',
        fechaFormatted,
        subtextRight: isTelemedicina ? 'Virtual' : isDomicilio ? 'A Domicilio' : (cita.clinicaNombre || 'En consultorio'),
        isTelemedicina,
        isPresencial,
        isDomicilio,
        photo: docPhoto,
        initials,
        colaUrl,
      };
    });
  }, [otherUpcomingCitas, doctorDataMap]);

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

  const cancelarCitaMutation = useCancelarCita();

  const [mostrarNavModal, setMostrarNavModal] = useState(false);
  const [mostrarInfoModal, setMostrarInfoModal] = useState(false);
  const [mostrarArchivosModal, setMostrarArchivosModal] = useState(false);
  const [mostrarCancelarModal, setMostrarCancelarModal] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('Conflicto de horario');

  // Formato Fecha estilo tarjeta de la imagen: "Jue 15 Oct · 10:00 hrs"
  const formattedCardDate = useMemo(() => {
    if (!immediateCita?.ctaFecha) return 'Sin fecha';
    try {
      const d = parseISO(immediateCita.ctaFecha.split('T')[0]);
      const raw = format(d, 'EEE d MMM', { locale: es });
      const capitalized = raw
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      const hora = immediateCita.ctaHora ? immediateCita.ctaHora.slice(0, 5) : '10:00';
      return `${capitalized} · ${hora} hrs`;
    } catch {
      return 'Fecha no disponible';
    }
  }, [immediateCita]);

  // Badge de tiempo restante: "Faltan 1d 18h"
  const timeRemainingBadge = useMemo(() => {
    if (!immediateCita?.ctaFecha) return null;
    try {
      const fechaStr = immediateCita.ctaFecha.split('T')[0];
      const horaStr = immediateCita.ctaHora ? immediateCita.ctaHora.slice(0, 5) : '08:00';
      const targetDate = parseISO(`${fechaStr}T${horaStr}:00`);
      const now = new Date();
      const diffMs = targetDate.getTime() - now.getTime();

      if (isNaN(targetDate.getTime())) return null;

      if (diffMs <= 0) {
        if (Math.abs(diffMs) < 2 * 60 * 60 * 1000) {
          return 'En curso';
        }
        return 'Hoy';
      }

      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;

      if (days > 0) {
        return `Faltan ${days}d ${hours}h`;
      }
      if (hours > 0) {
        return `Faltan ${hours}h ${minutes}m`;
      }
      return `Faltan ${minutes}m`;
    } catch {
      return null;
    }
  }, [immediateCita]);

  // Arancel formateado con estado fidedigno
  const arancelDisplay = useMemo(() => {
    if (!immediateCita) return 'Tarifa estándar';
    const precio = immediateCita.ctaPrecio && immediateCita.ctaPrecio > 0 ? `Q${immediateCita.ctaPrecio.toFixed(2)}` : 'Tarifa estándar';
    const estadoPago = immediateCita.tipoPagoDescripcion
      ? (immediateCita.tipoPagoDescripcion.toLowerCase().includes('pendiente') ? 'Pendiente' : 'Conciliado')
      : 'Conciliado';
    return `${precio} · ${estadoPago}`;
  }, [immediateCita]);

  // Manejador para imprimir comprobante oficial
  const handleImprimirComprobante = () => {
    if (!immediateCita || typeof window === 'undefined') return;

    const fechaFormateada = immediateCita.ctaFecha
      ? safeFormatDate(immediateCita.ctaFecha, "d 'de' MMMM 'de' yyyy")
      : 'Fecha no registrada';
    const horaFormateada = immediateCita.ctaHora ? immediateCita.ctaHora.slice(0, 5) + ' hrs' : '';
    const paciente = immediatePacienteName || 'Paciente';
    const medico = immediateCita.medicoNombre ? `Dr(a). ${immediateCita.medicoNombre}` : 'Médico Tratante';
    const especialidad = immediateDocSpecialty || 'Medicina General';
    const clinica = immediateCita.clinicaNombre || 'Centro Médico';
    const codigoCita = immediateCita.ctaCodigo || '';
    const modalidad = (immediateCita.ctaModalidad || 'Presencial').toUpperCase();
    const precio = immediateCita.ctaPrecio && immediateCita.ctaPrecio > 0 ? `Q${immediateCita.ctaPrecio.toFixed(2)}` : 'Tarifa estándar';

    const printHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante de Consulta - ${codigoCita}</title>
  <style>
    @page { size: letter; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { padding: 24px; color: #0f172a; line-height: 1.5; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 900; color: #0284c7; }
    .badge { background: #f0fdf4; color: #166534; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1px solid #bbf7d0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    .card-title { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #64748b; margin-bottom: 8px; letter-spacing: 0.5px; }
    .card-value { font-size: 16px; font-weight: 800; color: #0f172a; }
    .card-sub { font-size: 13px; color: #475569; margin-top: 4px; }
    .notice { background: #eff6ff; border-left: 4px solid #0284c7; padding: 14px; border-radius: 6px; font-size: 13px; color: #1e3a8a; margin-top: 24px; }
    .footer { text-align: center; margin-top: 36px; padding-top: 16px; border-top: 1px dashed #cbd5e1; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">NeoClínica</div>
      <p style="font-size: 12px; color: #64748b;">Comprobante Oficial de Agendamiento Médico</p>
    </div>
    <div style="text-align: right;">
      <span class="badge">Confirmada</span>
      <p style="font-size: 12px; font-family: monospace; font-weight: bold; margin-top: 4px;">#${codigoCita.toUpperCase()}</p>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Especialista & Ubicación</div>
      <div class="card-value">${medico}</div>
      <div class="card-sub">${especialidad}</div>
      <div class="card-sub">Sede: ${clinica}</div>
    </div>
    <div class="card">
      <div class="card-title">Fecha, Turno & Modalidad</div>
      <div class="card-value">${fechaFormateada} · ${horaFormateada}</div>
      <div class="card-sub">Modalidad: <strong>${modalidad}</strong></div>
      <div class="card-sub">Arancel: <strong>${precio} (Conciliado)</strong></div>
    </div>
  </div>

  <div class="card" style="margin-bottom: 20px;">
    <div class="card-title">Datos del Paciente</div>
    <div class="card-value">${paciente}</div>
    <div class="card-sub">Preséntate en recepción con tu documento de identificación 10 minutos antes de la hora acordada.</div>
  </div>

  <div class="notice">
    <strong>Instrucciones:</strong> Muestra este comprobante digital o impreso en el quiosco de registro de la clínica para realizar tu check-in automático.
  </div>

  <div class="footer">
    Emitido el ${new Date().toLocaleDateString('es-GT')} · NeoClínica Red de Salud · Sistema de Verificación en Línea
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  };

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
              <span suppressHydrationWarning className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Actualizado hoy a las {horaActualizacionStr}
              </span>
              <button
                type="button"
                onClick={handleRefreshCitas}
                disabled={isRefreshingCitas || isFetchingCitas}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Actualizar datos"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCitas ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Filtros Globales y Acción Primaria: Bandeja Segmentada Apple Minimalist Clinical */}
          <div className="bg-[#eff4ff] dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/60 rounded-2xl p-1 sm:p-1.5 flex items-center gap-1 sm:gap-1.5 shadow-xs overflow-x-auto max-w-full">
            {/* 1. Selector de Período */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
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
                    className={`inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 text-[#0b1c30] dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                    }`}
                  >
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] shrink-0" />}
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Separador vertical */}
            <div className="h-5 w-px bg-slate-200/80 dark:bg-slate-700 mx-1 shrink-0" />

            {/* 2. Selector de Paciente / Familiar */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {familiarOptions.map((f) => {
                const isSelected = selectedFamiliarId === f.id;
                const isTodos = f.id === 'todos';

                if (isTodos) {
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFamiliarId(f.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-white dark:bg-slate-900 text-[#0b1c30] dark:text-white font-semibold shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] shrink-0" />}
                      <span>{f.label}</span>
                    </button>
                  );
                }

                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFamiliarId(f.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 text-[#0b1c30] dark:text-white font-semibold shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium hover:bg-white/50 dark:hover:bg-slate-750'
                    }`}
                  >
                    {/* Avatar circular con letra inicial */}
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        f.palette?.avatarBg || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {f.initial}
                    </span>

                    <span>{f.label}</span>

                    {/* Badge numérico de citas pendientes */}
                    {f.pendingCount > 0 && (
                      <span
                        className="w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 ml-0.5 bg-[#0284c7]"
                      >
                        {f.pendingCount}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Botón "+" para añadir nuevo paciente */}
              <button
                id="btn-add-paciente"
                type="button"
                onClick={() => setIsAddPacienteOpen(true)}
                title="Añadir nuevo paciente o dependiente a la cuenta"
                className="w-7 h-7 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 ml-1 shadow-2xs border border-slate-200/40 dark:border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── 2. Indicadores Clave de Rendimiento (4 KPIs Acoplados en la Misma Línea) ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 xl:gap-4.5">
          {/* KPI 1: Consultas Programadas */}
          <div
            onClick={isKpiNavigable ? () => router.push(`/dashboard/citas?tab=proximas&pacienteId=${activePacienteId}`) : undefined}
            className={`group rounded-3xl border border-slate-200/40 dark:border-slate-800/60 bg-white dark:bg-slate-900 p-4 xl:p-4.5 shadow-[0_2px_12px_rgba(11,28,48,0.03)] transition-all flex flex-col justify-between hover:shadow-[0_4px_20px_rgba(11,28,48,0.06)] hover:border-slate-300 dark:hover:border-slate-700 ${
              isKpiNavigable ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div>
              {/* Micro-indicador Superior: Próxima: [Fecha] */}
              <div className="mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-[#eff4ff] dark:bg-sky-950/60 text-[#006194] dark:text-sky-300 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] shrink-0" />
                  <span>
                    {immediateCita?.ctaFecha
                      ? `Próxima: ${safeFormatDate(immediateCita.ctaFecha, "d 'de' MMMM").toLowerCase()}`
                      : 'Próxima: Sin pendientes'}
                  </span>
                </span>
              </div>

              {/* Métrica Principal: Número */}
              <div className="flex items-baseline gap-2">
                <span className="text-3xl xl:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {upcomingCitasPeriodo.length}
                </span>
              </div>

              <h4 className="text-sm xl:text-base font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                Consultas Programadas
              </h4>

              {/* Sección Media: Capacidad del mes y Barras Segmentadas */}
              <div className="mt-4 space-y-1.5">
                {/* Barras Segmentadas Dinámicas según el número real de consultas programadas */}
                <div className="flex items-center gap-1.5 pt-1 w-full">
                  {kpiCitasProgramadasSections.length > 0 ? (
                    kpiCitasProgramadasSections.map((sec) => (
                      <div key={sec.id} className="flex-1 min-w-0 flex flex-col gap-1">
                        <div
                          className="h-2 rounded-full transition-all duration-500 bg-[#006194] dark:bg-sky-500 w-full"
                        />
                        <span
                          title={sec.fullDate}
                          className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 text-center tracking-wider truncate block"
                        >
                          {sec.label}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 w-full transition-all duration-500" />
                      <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 text-center tracking-wider truncate block">
                        SIN CITAS PENDIENTES
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer: solo muestra redirección si hay un paciente específico seleccionado */}
            {isKpiNavigable ? (
              <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono font-bold text-[#006194] dark:text-sky-400 tracking-wider">
                <span>DETALLE DE CITAS</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            ) : (
              <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-slate-500 tracking-wider">
                <span>CONSOLIDADO GLOBAL</span>
                <span>{upcomingCitasPeriodo.length} {upcomingCitasPeriodo.length === 1 ? 'CITA' : 'CITAS'}</span>
              </div>
            )}
          </div>

          {/* KPI 2: Consultas Completadas */}
          <div
            onClick={isKpiNavigable ? () => router.push(`/dashboard/citas?tab=historial&pacienteId=${activePacienteId}`) : undefined}
            className={`group rounded-3xl border border-slate-200/40 dark:border-slate-800/60 bg-white dark:bg-slate-900 p-4 xl:p-4.5 shadow-[0_2px_12px_rgba(11,28,48,0.03)] transition-all flex flex-col justify-between hover:shadow-[0_4px_20px_rgba(11,28,48,0.06)] hover:border-slate-300 dark:hover:border-slate-700 ${
              isKpiNavigable ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div>
              {/* Header Superior: Bullet dot + HISTORIAL [AÑO DINÁMICO] */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span
                    suppressHydrationWarning
                    className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                  >
                    HISTORIAL {selectedHistoryMonth ? selectedHistoryMonth.year : kpiHistoryStats.currentYear}
                  </span>
                </div>
                {selectedHistoryMonth && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedHistoryMonth(null);
                    }}
                    className="text-[10px] font-bold text-[#006194] dark:text-sky-400 hover:underline px-1.5 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Restablecer al mes actual"
                  >
                    Restablecer
                  </button>
                )}
              </div>

              {/* Métrica Principal: Número + Sesiones */}
              <div
                onClick={(e) => {
                  if (selectedHistoryMonth) {
                    e.stopPropagation();
                    setIsHistoryMonthModalOpen(true);
                  }
                }}
                className={`flex items-baseline gap-2 ${selectedHistoryMonth ? 'cursor-pointer group/metric' : ''}`}
                title={selectedHistoryMonth ? 'Clic para ver detalle de las citas' : undefined}
              >
                <span className={`text-3xl xl:text-4xl font-black text-slate-900 dark:text-white tracking-tight transition-all ${selectedHistoryMonth ? 'group-hover/metric:text-[#006194] dark:group-hover/metric:text-sky-400' : ''}`}>
                  {selectedHistoryMonth ? selectedHistoryMonth.count : kpiHistoryStats.currentMonthCount}
                </span>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  {selectedHistoryMonth
                    ? `en ${selectedHistoryMonth.label} ${selectedHistoryMonth.year}`
                    : 'sesiones este mes'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-1 mt-0.5">
                <h4 className="text-sm xl:text-base font-bold text-slate-900 dark:text-white truncate">
                  Consultas Completadas
                </h4>
                {selectedHistoryMonth && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsHistoryMonthModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-[#006194] dark:text-sky-300 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Ver detalle</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Gráfica de Barras Suaves de los Últimos 6 Meses Seleccionables */}
              <div className="mt-3 pt-1">
                <div className="flex items-end justify-between gap-1.5 h-11 xl:h-12">
                  {kpiHistoryStats.bars.map((bar, idx) => {
                    const isSelected = selectedHistoryMonth?.label === bar.label && selectedHistoryMonth?.year === bar.year;
                    return (
                      <Tooltip key={idx}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isSelected) {
                                // Segundo clic en el mismo mes ya seleccionado: abre el modal de detalle
                                setIsHistoryMonthModalOpen(true);
                              } else {
                                // Primer clic: selecciona el mes en la tarjeta KPI
                                setSelectedHistoryMonth(bar);
                              }
                            }}
                            className={`flex-1 flex flex-col items-center justify-end h-full gap-1 group/bar cursor-pointer p-0.5 rounded-xl transition-all focus:outline-hidden ${
                              isSelected
                                ? 'bg-blue-50/80 dark:bg-blue-950/50 ring-2 ring-[#006194] dark:ring-sky-500'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                            aria-label={`Mes ${bar.label} ${bar.year}: ${bar.count} consultas completadas. ${isSelected ? 'Clic de nuevo para abrir detalle.' : 'Clic para seleccionar mes.'}`}
                          >
                            <div
                              className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                                isSelected
                                  ? 'bg-[#006194] dark:bg-sky-400 shadow-xs scale-105'
                                  : bar.isCurrent
                                  ? 'bg-[#006194] dark:bg-sky-500 group-hover/bar:bg-[#00517c] dark:group-hover/bar:bg-sky-400'
                                  : bar.count > 0
                                  ? 'bg-slate-300 dark:bg-slate-700 group-hover/bar:bg-[#006194]/70 dark:group-hover/bar:bg-sky-400/70'
                                  : 'bg-slate-100 dark:bg-slate-800/80 group-hover/bar:bg-slate-200 dark:group-hover/bar:bg-slate-700'
                              }`}
                              style={{ height: `${bar.height}%` }}
                            />
                            <span
                              className={`text-[9px] xl:text-[10px] font-mono tracking-wider transition-colors ${
                                isSelected
                                  ? 'font-black text-[#006194] dark:text-sky-300'
                                  : bar.isCurrent
                                  ? 'font-black text-slate-900 dark:text-white'
                                  : 'text-slate-400 dark:text-slate-500 font-bold group-hover/bar:text-slate-700 dark:group-hover/bar:text-slate-300'
                              }`}
                            >
                              {bar.label}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs font-medium">
                          <span className="font-bold">{bar.label} {bar.year}:</span> {bar.count} {bar.count === 1 ? 'consulta' : 'consultas'} completadas
                          <br />
                          <span className="text-[10px] text-sky-400 dark:text-sky-300 font-semibold">
                            {isSelected ? 'Clic de nuevo para ver detalle' : 'Clic para seleccionar mes'}
                          </span>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer: solo muestra 'Ver historial' si hay un paciente específico seleccionado */}
            {isKpiNavigable ? (
              <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  <span>Ver historial</span>
                  <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                </div>
                <span className="font-mono font-medium text-slate-400 dark:text-slate-500 text-[11px]">
                  {kpiHistoryStats.totalPrevias} previas
                </span>
              </div>
            ) : (
              <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="font-mono text-slate-400 dark:text-slate-500">Historial de la cuenta</span>
                <span className="font-mono font-medium text-slate-400 dark:text-slate-500 text-[11px]">
                  {kpiHistoryStats.totalPrevias} previas
                </span>
              </div>
            )}
          </div>

          {/* KPI 3: Puntos Activos y Meta Mensual */}
          <div
            onClick={() => router.push('/dashboard/perfil/puntos')}
            className="group rounded-3xl border border-slate-200/40 dark:border-slate-800/60 bg-white dark:bg-slate-900 p-4 xl:p-4.5 shadow-[0_2px_12px_rgba(11,28,48,0.03)] transition-all flex flex-col justify-between hover:shadow-[0_4px_20px_rgba(11,28,48,0.06)] hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
          >
            {/* Header Superior: Icono Estrella + Badge de Meta */}
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-[#ede9fe] dark:bg-indigo-950/60 text-[#7c3aed] dark:text-indigo-400 flex items-center justify-center shadow-2xs">
                <Star className="w-3.5 h-3.5 fill-[#7c3aed] text-[#7c3aed] dark:fill-indigo-400 dark:text-indigo-400" />
              </div>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold shadow-2xs ${
                puntosMes >= 5
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
              }`}>
                {puntosMes >= 5 ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>Meta cumplida</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <span>En progreso</span>
                  </>
                )}
              </div>
            </div>

            {/* Métrica Principal: 5/5 Meta Mensual + Puntos Acumulados Aparte */}
            <div className="flex-1 flex items-center justify-between gap-3 py-2 my-auto">
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl xl:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    {puntosMes >= 5 ? '5/5' : `${puntosMes}/5`}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#6366f1] dark:text-indigo-400 uppercase tracking-wider">
                    META MENSUAL
                  </span>
                </div>

                {/* Puntos que lleva acumulados (mostrados aparte en el mismo KPI) */}
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Acumulados:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-[#eff4ff] dark:bg-indigo-950/70 text-[#006194] dark:text-indigo-300">
                    {totalPuntos} pts
                  </span>
                </div>
              </div>

              {/* Anillo de Progreso Circular Púrpura Grande */}
              <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full border-[3px] border-[#6366f1] dark:border-indigo-500 flex flex-col items-center justify-center shrink-0 shadow-xs">
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-none">
                  {progresoMes}
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                  %
                </span>
              </div>
            </div>

            {/* Footer con Separador y Canjear Beneficios */}
            <div className="pt-3 mt-auto border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-[#6366f1] dark:text-indigo-400 group-hover:underline">
              <span>Canjear beneficios</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>

          {/* KPI 4: Alertas Operativas y Turnos (Acoplado al Mismo Estilo) */}
          <div
            onClick={() => router.push('/dashboard/citas')}
            className="group rounded-3xl border border-slate-200/40 dark:border-slate-800/60 bg-white dark:bg-slate-900 p-4 xl:p-4.5 shadow-[0_2px_12px_rgba(11,28,48,0.03)] transition-all flex flex-col justify-between hover:shadow-[0_4px_20px_rgba(11,28,48,0.06)] hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
          >
            <div>
              {/* Header Superior: Icono Campana / Alerta + Badge de Estado */}
              <div className="flex items-center justify-between mb-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-2xs ${
                  alertasUrgentesCount > 0
                    ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {alertasUrgentesCount > 0 ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : (
                    <Bell className="w-3.5 h-3.5" />
                  )}
                </div>

                {alertasUrgentesCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>{alertasUrgentesCount} {alertasUrgentesCount === 1 ? 'atención' : 'pendientes'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Al día</span>
                  </span>
                )}
              </div>

              {/* Métrica Principal: Número */}
              <div className="flex items-baseline gap-2">
                <span className="text-3xl xl:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {alertasUrgentesCount}
                </span>
              </div>

              <h4 className="text-sm xl:text-base font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                Alertas y Turnos
              </h4>

              {/* Sección Media: Estado de Citas Hoy e Intercambios Segmentados */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500 dark:text-slate-400 font-medium truncate">
                    Estado operativo
                  </span>
                  <span className={`font-bold truncate ml-1 ${alertasUrgentesCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {solicitudesPendientes.length > 0
                      ? `${solicitudesPendientes.length} por responder`
                      : citasHoy.length > 0
                      ? `${citasHoy.length} cita hoy`
                      : 'Sin alertas pendientes'}
                  </span>
                </div>

                {/* Barras dinámicas de Alertas y Turnos */}
                <div className="flex items-center gap-1.5 pt-1 w-full">
                  {alertasUrgentesCount === 0 ? (
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="h-2 rounded-full bg-emerald-500/20 dark:bg-emerald-900/30 w-full transition-all duration-500" />
                      <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 text-center tracking-wider truncate block">
                        AGENDA AL DÍA • 0 PENDIENTES
                      </span>
                    </div>
                  ) : (
                    <>
                      {citasHoy.length > 0 && (
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <div className="h-2 rounded-full transition-all duration-500 bg-[#006194] dark:bg-sky-500 w-full" />
                          <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 text-center tracking-wider truncate block">
                            {citasHoy.length} {citasHoy.length === 1 ? 'CONSULTA HOY' : 'CONSULTAS HOY'}
                          </span>
                        </div>
                      )}
                      {solicitudesPendientes.length > 0 && (
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <div className="h-2 rounded-full transition-all duration-500 bg-amber-500 dark:bg-amber-400 w-full" />
                          <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 text-center tracking-wider truncate block">
                            {solicitudesPendientes.length} {solicitudesPendientes.length === 1 ? 'SOLICITUD' : 'SOLICITUDES'}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer con Separador y Enlace GESTIONAR ALERTAS */}
            <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono font-bold tracking-wider">
              <span className={alertasUrgentesCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}>
                {alertasUrgentesCount > 0 ? 'GESTIONAR ALERTAS' : 'AGENDA AL DÍA'}
              </span>
              <ArrowRight className={`w-3.5 h-3.5 group-hover:translate-x-1 transition-transform ${alertasUrgentesCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
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

        {/* ── 4. Detalle Operativo (2 Columnas Continuas: Izquierda 8 cols | Derecha 4 cols) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ════════ COLUMNA 1 (IZQUIERDA - 8 COLS): Cita Más Próxima + Recompensas ════════ */}
          <div className="col-span-1 lg:col-span-8 flex flex-col gap-6 w-full">
            {/* Widget 1.1: Cita Inmediata Hero */}
            <motion.div variants={itemVariants} className="w-full">
              <div className="w-full rounded-2xl sm:rounded-3xl border border-slate-200/40 dark:border-slate-800/60 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-[0_2px_12px_rgba(11,28,48,0.03)] flex flex-col gap-4 sm:gap-5 relative overflow-hidden">
                {immediateCita ? (
                  <>
                    {/* Cabecera: Cita Más Próxima a la izquierda, Tiempo Restante a la derecha */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#eff4ff] dark:bg-slate-800 text-[#006194] dark:text-sky-400 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span>Cita Más Próxima</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyCodigo(immediateCita.ctaCodigo)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold bg-[#eff4ff]/60 hover:bg-[#eff4ff] dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition cursor-pointer"
                          title="Copiar ID de cita"
                        >
                          <span>#{immediateCita.ctaCodigo.slice(-8).toUpperCase()}</span>
                          {copiedCode ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400" />
                          )}
                        </button>
                      </div>

                      {/* Tiempo restante badge estilo píldora */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#eff4ff] dark:bg-sky-950/60 text-[#006194] dark:text-sky-300 text-xs font-semibold shadow-2xs">
                        <Clock className="w-3.5 h-3.5 text-[#006194] dark:text-sky-400" />
                        <span>{timeRemainingBadge || immediateDateDisplay}</span>
                      </div>
                    </div>

                    {/* Bloque del Médico (Foto con check azul verificado, Nombre, Especialidad, Clínica) */}
                    <div className="flex items-start gap-4">
                      <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 bg-[#eff4ff] dark:bg-slate-800 border border-slate-200/50 dark:border-slate-800 shadow-xs">
                        {immediateDocPhoto ? (
                          <img
                            src={immediateDocPhoto}
                            alt={immediateCita.medicoNombre || 'Médico'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-black text-xl text-[#006194] dark:text-sky-400 bg-gradient-to-br from-[#eff4ff] to-blue-100 dark:from-slate-800 dark:to-slate-700">
                            {immediateDocInitials}
                          </div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#006194] text-white flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                          {immediateCita.medicoNombre || 'Dra. Karen Castillo'}
                        </h2>
                        <p className="text-sm font-semibold text-[#006194] dark:text-sky-400 mt-0.5 truncate">
                          {immediateDocSpecialty}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1.5 truncate">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{immediateCita.clinicaNombre || 'Hospital Las Américas · Clínica 408, Torre Médica'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Franja de 3 Columnas: Fecha & Hora | Modalidad | Arancel */}
                    <div className="rounded-2xl bg-[#eff4ff]/50 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-800/60 p-4 sm:p-5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                        {/* 1. Fecha & Hora */}
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Fecha & Hora
                          </span>
                          <span className="block text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                            {formattedCardDate}
                          </span>
                        </div>

                        {/* 2. Modalidad */}
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Modalidad
                          </span>
                          <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                            {isVirtual ? (
                              <>
                                <Video className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>Virtual (NeoMeet)</span>
                              </>
                            ) : (
                              <>
                                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>
                                  {immediateCita.ctaModalidad
                                    ? immediateCita.ctaModalidad.charAt(0).toUpperCase() +
                                    immediateCita.ctaModalidad.slice(1).toLowerCase()
                                    : 'Presencial'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* 3. Arancel */}
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Arancel
                          </span>
                          <div className="text-sm sm:text-base font-bold text-[#006194] dark:text-sky-400">
                            {arancelDisplay}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botonera de Acciones */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                        <Link
                          href={immediateColaUrl}
                          className="h-11 px-4 sm:px-5 rounded-xl bg-[#006194] hover:bg-[#00517c] active:scale-98 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer"
                        >
                          <Users className="w-4 h-4 text-white" />
                          <span>Ver Cola de la Cita</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => setMostrarNavModal(true)}
                          className="h-11 px-4 sm:px-5 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer"
                        >
                          <Navigation className="w-4 h-4 text-[#006194] dark:text-sky-400 rotate-45" />
                          <span>Cómo llegar</span>
                        </button>

                        <Link
                          href={`/dashboard/citas/${immediateCita.ctaCodigo}/editar`}
                          className="h-11 px-4 sm:px-5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold flex items-center gap-2 border border-slate-200/50 dark:border-slate-700 shadow-2xs transition cursor-pointer"
                        >
                          <CalendarClock className="w-4 h-4 text-slate-500" />
                          <span>Reprogramar</span>
                        </Link>
                      </div>

                      <div className="flex items-center gap-1 bg-[#eff4ff]/60 dark:bg-slate-800/70 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setMostrarInfoModal(true)}
                          className="p-2.5 text-slate-500 hover:text-[#006194] dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Información detallada de la cita"
                        >
                          <Info className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setMostrarArchivosModal(true)}
                          className="p-2.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Archivos y documentos adjuntos"
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={handleImprimirComprobante}
                          className="p-2.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Imprimir comprobante oficial"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setMostrarCancelarModal(true)}
                          className="p-2.5 text-rose-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Cancelar consulta médica"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
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

            {/* Widget 1.2: Recompensas Disponibles */}
            <motion.div variants={itemVariants} className="w-full">
              <div className="w-full rounded-3xl border border-slate-200/40 dark:border-slate-800/60 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-[0_2px_12px_rgba(11,28,48,0.03)] flex flex-col">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#eff4ff] dark:bg-slate-800 text-[#006194] dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                          Recompensas Disponibles
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                          Canjea tus puntos por descuentos y consultas médicas gratuitas.
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0 self-start sm:self-center">
                      4 recompensas en catálogo
                    </span>
                  </div>

                  <div className="border-b border-slate-100 dark:border-slate-800/80 my-5" />

                  {/* Tarjetas de Recompensas Disponibles en Grid 2 Columnas con scroll minimalista y moderno */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[580px] overflow-y-auto p-1 pr-2 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.35)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
                    {recompensasCatalogo.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-5 rounded-2xl bg-[#eff4ff]/25 dark:bg-slate-800/30 border border-slate-200/40 dark:border-slate-800/60 hover:bg-white dark:hover:bg-slate-900 hover:border-slate-300/80 dark:hover:border-slate-700 shadow-[0_2px_8px_rgba(11,28,48,0.02)] hover:shadow-[0_4px_16px_rgba(11,28,48,0.05)] transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3.5">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/60 flex items-center justify-center text-[#006194] dark:text-sky-400 shadow-2xs">
                              <Gift className="w-5 h-5" />
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span>{rec.costo} puntos</span>
                            </div>
                          </div>

                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 min-h-[2.5rem]">
                            {rec.titulo}
                          </h4>
                        </div>

                        <div className="mt-4 pt-1">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-[11px] sm:text-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span>
                                {rec.canAfford
                                  ? `¡Puntos suficientes! (${rec.userPts}/${rec.costo})`
                                  : `Te faltan ${rec.faltantes} pts (${rec.userPts}/${rec.costo})`}
                              </span>
                            </div>
                            <span className="font-bold text-slate-400 dark:text-slate-500 text-xs">
                              {rec.pct}%
                            </span>
                          </div>

                          <div className="h-1.5 w-full rounded-full bg-slate-200/60 dark:bg-slate-800 overflow-hidden mb-4">
                            <div
                              className="h-full rounded-full bg-amber-400 dark:bg-amber-500 transition-all duration-700"
                              style={{ width: `${rec.pct}%` }}
                            />
                          </div>

                          {rec.canAfford ? (
                            <Link
                              href="/dashboard/perfil/puntos"
                              className="w-full py-2.5 rounded-xl bg-[#006194] hover:bg-[#00517c] text-white font-bold text-xs sm:text-sm text-center shadow-xs transition active:scale-98 flex items-center justify-center cursor-pointer"
                            >
                              Canjear recompensa
                            </Link>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="w-full py-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 font-bold text-xs sm:text-sm text-center cursor-not-allowed transition"
                            >
                              Necesitas {rec.costo} pts para canjear
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ════════ COLUMNA 2 (DERECHA - 4 COLS): Próximas Citas + Modalidad + Médicos ════════ */}
          <div className="col-span-1 lg:col-span-4 flex flex-col gap-6 w-full">
            {/* Widget 2.1: Próximas Citas */}
            <motion.div variants={itemVariants} className="w-full">
              <div className="w-full rounded-3xl border border-slate-200/40 dark:border-slate-800/60 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-[0_2px_12px_rgba(11,28,48,0.03)] flex flex-col">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Próximas citas
                      </h3>
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-[#eff4ff] dark:bg-slate-800 text-[#006194] dark:text-sky-400">
                        {displayUpcomingCitas.length}
                      </span>
                    </div>
                    <Link
                      href="/dashboard/citas"
                      className="text-xs font-bold text-[#006194] dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      Ver citas
                    </Link>
                  </div>

                  {isLoadingCitas ? (
                    <div className="space-y-3 py-1">
                      <div className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                      <div className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    </div>
                  ) : displayUpcomingCitas.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-[#eff4ff]/25 dark:bg-slate-800/40 border border-dashed border-slate-200/80 dark:border-slate-800 text-center flex flex-col items-center justify-center py-8">
                      <div className="w-12 h-12 rounded-2xl bg-[#eff4ff] dark:bg-blue-950/50 text-[#006194] dark:text-blue-400 flex items-center justify-center mb-3 shadow-2xs">
                        <CalendarDays className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        No tienes más citas programadas
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 mb-3">
                        Agenda una consulta con tus especialistas de confianza.
                      </p>
                      <Link
                        href="/dashboard/directorio"
                        className="px-4 py-2 rounded-xl bg-[#006194] hover:bg-[#00517c] text-white text-xs font-bold transition active:scale-95 shadow-xs"
                      >
                        Agendar Cita
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.35)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
                      {displayUpcomingCitas.map((cita) => (
                        <div
                          key={cita.ctaCodigo}
                          className="p-3.5 sm:p-4 rounded-2xl bg-[#eff4ff]/35 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-800/60 flex flex-col justify-between gap-3 hover:bg-white dark:hover:bg-slate-800 hover:shadow-[0_2px_10px_rgba(11,28,48,0.04)] hover:border-slate-200 dark:hover:border-slate-700 transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-700 text-[#006194] dark:text-sky-400 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-slate-200/50 dark:border-slate-700 shadow-2xs relative">
                                <span>{cita.initials}</span>
                                {cita.photo && (
                                  <img
                                    src={cita.photo}
                                    alt={cita.medicoNombre}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                  {cita.medicoNombre}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {cita.medicoEspecialidad}
                                </p>
                              </div>
                            </div>

                            {cita.isTelemedicina ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#0284c7]/10 text-[#006194] dark:text-sky-300 border border-[#0284c7]/20 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />
                                <Video className="w-3 h-3 text-[#006194] dark:text-sky-400" />
                                <span>Virtual</span>
                              </span>
                            ) : cita.isDomicilio ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <Home className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Domicilio</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/50 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                <MapPin className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                <span>Presencial</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 pt-0.5">
                            <div className="flex items-center gap-1.5 font-medium">
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{cita.fechaFormatted}</span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">
                              #{String(cita.ctaCodigo).slice(-6).toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/40 dark:border-slate-800">
                            <Link
                              href={`/dashboard/citas?citaId=${cita.ctaCodigo}`}
                              className="flex-1 py-1.5 px-3 rounded-xl bg-[#006194] hover:bg-[#00517c] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs active:scale-95 cursor-pointer text-center"
                              title="Ir a gestionar esta cita"
                            >
                              <span>Ir a la cita</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>

                            <Link
                              href={cita.colaUrl}
                              className="py-1.5 px-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition shadow-2xs active:scale-95 cursor-pointer shrink-0"
                              title="Ver cola y turno de la cita"
                            >
                              <Users className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                              <span className="hidden sm:inline">Ver Cola</span>
                            </Link>

                            <Link
                              href={`/dashboard/citas/${cita.ctaCodigo}/editar`}
                              className="p-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 transition shadow-2xs active:scale-95 cursor-pointer shrink-0"
                              title="Reprogramar cita"
                            >
                              <CalendarClock className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Widget 2.2: Modalidad de Consulta */}
            <motion.div variants={itemVariants} className="w-full">
              <div className="w-full rounded-3xl border border-slate-200/40 dark:border-slate-800/60 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-[0_2px_12px_rgba(11,28,48,0.03)] flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      Modalidad de Consulta
                    </h3>
                    <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">
                      YTD {new Date().getFullYear()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Distribución de atenciones médicas en tus últimos 12 meses.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-around gap-4 sm:gap-6 py-3">
                    <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-100 dark:text-slate-800" />
                        <circle cx="60" cy="60" r="34" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" />
                        <circle cx="60" cy="60" r="22" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100 dark:text-slate-800" />

                        <circle
                          cx="60"
                          cy="60"
                          r="48"
                          fill="none"
                          stroke="#0284c7"
                          strokeWidth="10"
                          strokeDasharray={`${Math.max(12, Math.round(((distribucionModalidad.pctPresencial || 65) / 100) * 301.6))} 302`}
                          strokeDashoffset="0"
                          strokeLinecap="round"
                          className="transition-all duration-700"
                        />

                        <circle
                          cx="60"
                          cy="60"
                          r="34"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="8"
                          strokeDasharray={`${Math.max(8, Math.round(((distribucionModalidad.pctVirtual || 25) / 100) * 213.6))} 214`}
                          strokeDashoffset="0"
                          strokeLinecap="round"
                          className="transition-all duration-700"
                        />

                        <circle
                          cx="60"
                          cy="60"
                          r="22"
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="6"
                          strokeDasharray={`${Math.max(6, Math.round(((distribucionModalidad.pctDomicilio || 10) / 100) * 138.2))} 138`}
                          strokeDashoffset="0"
                          strokeLinecap="round"
                          className="transition-all duration-700"
                        />
                      </svg>

                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-none">
                          {distribucionModalidad.total || 14}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5">
                          Visitas
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5 min-w-[140px]">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#0284c7] shrink-0" />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Presencial</span>
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {distribucionModalidad.pctPresencial}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">NeoMeet HD</span>
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {distribucionModalidad.pctVirtual}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">A Domicilio</span>
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {distribucionModalidad.pctDomicilio}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Widget 2.3: Tus Médicos frecuentes */}
            <motion.div variants={itemVariants} className="w-full">
              <div className="w-full rounded-3xl border border-slate-200/40 dark:border-slate-800/60 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-[0_2px_12px_rgba(11,28,48,0.03)] flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Tus Médicos frecuentes
                  </h3>
                  <Link
                    href="/dashboard/directorio"
                    className="text-xs font-bold text-[#006194] dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <span>Directorio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto scrollbar-hide pr-1">
                  {displayDoctors.map((doc, idx) => (
                    <div
                      key={doc.exp_codigo || idx}
                      className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800/60 bg-[#eff4ff]/30 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:shadow-[0_2px_10px_rgba(11,28,48,0.04)] hover:border-slate-200 dark:hover:border-slate-700 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-2xl overflow-hidden bg-white dark:bg-slate-700 border border-slate-200/50 dark:border-slate-700 shadow-2xs">
                            {doc.image ? (
                              <img src={doc.image} alt={doc.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#006194] dark:text-sky-400 font-black text-xs">
                                {getDoctorInitials(doc.fullName)}
                              </div>
                            )}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-[#006194] transition-colors">
                            {doc.fullName}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {doc.specialty}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span className="font-bold text-slate-800 dark:text-slate-200">5.0</span>
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium ml-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Disponible
                            </span>
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/dashboard/agendar/${doc.exp_codigo}`}
                        className="px-3.5 py-1.5 rounded-xl bg-[#eff4ff] hover:bg-[#006194] text-[#006194] hover:text-white dark:bg-slate-800 dark:hover:bg-[#006194] dark:text-sky-300 dark:hover:text-white text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
                      >
                        Agendar
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* ── Modales de Acciones de la Consulta Más Próxima ── */}
      {/* 1. Modal Cómo llegar (Google Maps & Waze) */}
      {mostrarNavModal && immediateCita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Navigation className="w-5 h-5 rotate-45" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">¿Cómo llegar a la clínica?</h3>
                  <p className="text-xs text-slate-500">Selecciona tu app de mapas preferida</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarNavModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="py-5 space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Destino</span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{immediateCita.clinicaNombre || 'NeoClínica Especializada, Ciudad de Guatemala'}</span>
                </p>
              </div>

              <a
                href={mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(immediateCita.clinicaNombre || 'NeoClínica')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full p-3.5 rounded-2xl bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-blue-900/60 flex items-center justify-center shadow-xs">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold block">Abrir con Google Maps</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Ruta guiada y tiempos de tráfico</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
              </a>

              <a
                href={immediateCita.cliUrlWaze || `https://waze.com/ul?q=${encodeURIComponent(immediateCita.clinicaNombre || 'NeoClínica')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full p-3.5 rounded-2xl bg-sky-50/80 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 text-sky-900 dark:text-sky-200 flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-sky-900/60 flex items-center justify-center shadow-xs">
                    <Navigation className="w-5 h-5 text-sky-600" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold block">Abrir con Waze</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Alertas de tráfico y mejor ruta</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-sky-600 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(immediateCita.clinicaNombre || 'NeoClínica Especializada');
                toast.success('Dirección copiada al portapapeles');
              }}
              className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Copiar Dirección
            </button>
          </div>
        </div>
      )}

      {/* 3. Modal Detalles de la Cita */}
      {mostrarInfoModal && immediateCita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Expediente de Cita</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Detalles de la Consulta</h3>
              </div>
              <button
                type="button"
                onClick={() => setMostrarInfoModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ID de Cita</span>
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">#{immediateCita.ctaCodigo}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Turno Confirmado</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Médico Especialista</span>
                <p className="text-sm font-black text-slate-900 dark:text-white">{immediateCita.medicoNombre || 'Médico Tratante'}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{immediateDocSpecialty}</p>
                <p className="text-xs text-slate-500 mt-1">Colegiado Activo: 14,892 · NeoClínica Verificado</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Paciente</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{immediatePacienteName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Horario</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{formattedCardDate}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Clínica & Arancel</span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{immediateCita.clinicaNombre || 'NeoClínica Especializada'}</p>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">Arancel: {arancelDisplay}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block mb-1">
                  Recomendaciones para tu consulta
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {isVirtual
                    ? 'Asegúrate de contar con buena conexión a internet y tener a mano tus últimos resultados de laboratorio.'
                    : 'Preséntate con 10 minutos de anticipación con tu documento de identidad y comprobante digital.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleImprimirComprobante}
                className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Constancia</span>
              </button>
              <button
                type="button"
                onClick={() => setMostrarInfoModal(false)}
                className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Archivos y Documentos */}
      {mostrarArchivosModal && immediateCita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Archivos de la Consulta</h3>
                  <p className="text-[11px] text-slate-500">Estudios, órdenes y documentos vinculados</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarArchivosModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="py-5 space-y-3">
              {immediateCita.archivos && immediateCita.archivos.length > 0 ? (
                <div className="space-y-2">
                  {immediateCita.archivos.map((archivo: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{archivo.nombre || `Documento_${i + 1}.pdf`}</span>
                      </div>
                      <a
                        href={archivo.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No hay documentos adjuntos aún</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Puedes cargar estudios de laboratorio o recetas previas</p>
                </div>
              )}

              <label className="w-full h-11 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border border-blue-200/80 dark:border-blue-900/60">
                <Paperclip className="w-4 h-4" />
                <span>Adjuntar nuevo archivo o estudio</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      toast.success('Archivo subido con éxito', {
                        description: `${e.target.files[0].name} fue adjuntado a tu consulta.`
                      });
                    }
                  }}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => setMostrarArchivosModal(false)}
              className="w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* 5. Modal Cancelar Cita */}
      {mostrarCancelarModal && immediateCita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 dark:border-rose-950/60 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Cancelar Consulta Médica</h3>
                <p className="text-xs text-slate-500">¿Estás seguro de que deseas cancelar este turno?</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 mb-4">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {immediateCita.medicoNombre || 'Médico'} • {formattedCardDate}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                El turno quedará liberado inmediatamente para otros pacientes.
              </p>
            </div>

            <div className="mb-5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Motivo de la cancelación:
              </label>
              <select
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="Conflicto de horario">Conflicto de horario imprevisto</option>
                <option value="Problemas de transporte">Problemas de transporte o distancia</option>
                <option value="Ya no requiero la consulta">Ya no requiero la atención médica</option>
                <option value="Otro motivo">Otro motivo</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMostrarCancelarModal(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
              >
                Conservar Cita
              </button>
              <button
                type="button"
                disabled={cancelarCitaMutation.isPending}
                onClick={() => {
                  cancelarCitaMutation.mutate(immediateCita, {
                    onSuccess: () => setMostrarCancelarModal(false)
                  });
                }}
                className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
              >
                {cancelarCitaMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Sí, Cancelar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Crear Nuevo Paciente / Dependiente */}
      <PacienteFormModal
        open={isAddPacienteOpen}
        mode="add"
        titular={titular}
        titularCodigo={titular?.pac_codigo || ''}
        onClose={() => {
          setIsAddPacienteOpen(false);
          queryClient.invalidateQueries({ queryKey: ['pacientesSeleccion'] });
          queryClient.invalidateQueries({ queryKey: ['pacientesByUsuario'] });
        }}
      />

      {/* 7. Modal de Consultas Completadas del Mes Seleccionado en KPI de Historial */}
      <Modal
        isOpen={isHistoryMonthModalOpen && Boolean(selectedHistoryMonth)}
        onClose={() => setIsHistoryMonthModalOpen(false)}
        maxWidth="2xl"
        title={
          selectedHistoryMonth ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white capitalize">
                  Consultas en {selectedHistoryMonth.fullMonthName} {selectedHistoryMonth.year}
                </span>
              </div>
            </div>
          ) : undefined
        }
        description={
          selectedHistoryMonth
            ? `${selectedHistoryMonth.count} ${
                selectedHistoryMonth.count === 1 ? 'consulta médica finalizada' : 'consultas médicas finalizadas'
              } en este período.`
            : undefined
        }
      >
        {selectedHistoryMonth && (
          <div className="space-y-4">
            {selectedHistoryMonth.citas.length === 0 ? (
              <div className="py-10 px-4 text-center flex flex-col items-center justify-center">
                <div className="w-13 h-13 rounded-2xl bg-[#eff4ff] dark:bg-slate-800 flex items-center justify-center text-[#006194] dark:text-sky-400 mb-3 shadow-2xs">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Sin consultas completadas
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
                  Durante {selectedHistoryMonth.fullMonthName} de {selectedHistoryMonth.year} no se registraron citas completadas para este paciente.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsHistoryMonthModalOpen(false);
                    router.push('/dashboard/directorio');
                  }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#006194] hover:bg-[#00517c] text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agendar nueva consulta</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto pr-1 [scrollbar-width:thin]">
                {selectedHistoryMonth.citas.map((cita) => {
                  const initials = getDoctorInitials(cita.medicoNombre);
                  const isVirtual = (cita.ctaModalidad || '').toLowerCase().includes('virtual') || (cita.ctaModalidad || '').toLowerCase().includes('video');
                  const isDomicilio = (cita.ctaModalidad || '').toLowerCase().includes('domicilio');

                  return (
                    <div
                      key={cita.ctaCodigo}
                      className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 flex items-center justify-center font-black text-xs text-[#006194] dark:text-sky-300 shrink-0 shadow-2xs">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            {cita.medicoNombre?.startsWith('Dr') ? cita.medicoNombre : `Dr(a). ${cita.medicoNombre}`}
                          </h5>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {cita.medicoEspecialidad || 'Especialista Médico'}
                            </span>
                            <span>•</span>
                            <span className="capitalize">{safeFormatDate(cita.ctaFecha, "EEEE, d 'de' MMMM")}</span>
                            <span>•</span>
                            <span className="font-mono">{cita.ctaHora ? cita.ctaHora.slice(0, 5) + ' hrs' : ''}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">
                              {isVirtual ? (
                                <>
                                  <Video className="w-3 h-3 text-sky-500" />
                                  <span>Teleconsulta</span>
                                </>
                              ) : isDomicilio ? (
                                <>
                                  <Home className="w-3 h-3 text-emerald-500" />
                                  <span>A Domicilio</span>
                                </>
                              ) : (
                                <>
                                  <MapPin className="w-3 h-3 text-[#006194]" />
                                  <span>Presencial</span>
                                </>
                              )}
                            </span>
                            {cita.clinicaNombre && (
                              <span className="text-slate-400 dark:text-slate-500 truncate max-w-[200px]">
                                {cita.clinicaNombre}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center border-t sm:border-t-0 border-slate-200/40 dark:border-slate-700/40 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setIsHistoryMonthModalOpen(false);
                            router.push(`/dashboard/citas?citaId=${cita.ctaCodigo}&tab=historial`);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-[#006194] dark:text-sky-300 border border-slate-200/60 dark:border-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
                          title="Ver información y receta médica"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver detalle</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer del Modal */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-400 dark:text-slate-500">
                Año <strong className="text-slate-700 dark:text-slate-300">{selectedHistoryMonth.year}</strong> · {selectedHistoryMonth.count} {selectedHistoryMonth.count === 1 ? 'consulta' : 'consultas'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsHistoryMonthModalOpen(false);
                  router.push(`/dashboard/citas?tab=historial${activePacienteId ? `&pacienteId=${activePacienteId}` : ''}`);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#006194] hover:bg-[#00517c] text-white font-bold text-xs transition shadow-xs cursor-pointer active:scale-95"
              >
                <span>Ver historial completo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </Modal>
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
