'use client';

import { Suspense, useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Filter,
  Loader2,
  MapPin,
  Monitor,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  X,
  Calendar as CalendarIcon,
  Phone,
  FileSignature,
  Edit,
  Check,
  ArrowLeft,
  Link as LinkIcon,
  Edit2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  Info,
  Upload,
  CalendarPlus,
  Layers,
  Sparkles,
  UserCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Navbar } from '@/components/navbar';
import { NeoLoader } from '@/components/neo-loader';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCitasPaciente,
  useAllCitasPacientes,
  usePacientesSeleccion,
  useCancelarCita,
  useDesvincularGrupo,
  useEliminarGrupo,
  useGruposMap,
  useUpdateCita,
  useAutoCompletarCitasPasadas,
  isCitaPasada,
} from '@/hooks/use-flujo-citas';
import { usePacientesByUsuario } from '@/hooks/use-pacientes';
import { useDoctorByCode, useDoctors } from '@/hooks/use-doctors';
import { fetchGruposCita, createGrupo, updateCita } from '@/services/flujo-citas';
import type { CitaListDto, CitaEstado, GrupoCitaDto } from '@/types/citas';
import { buildDoctorFullName } from '@/types/doctor';
import { AnimatedModal } from '@/components/animated-modal';
import { CitaCard } from '@/components/cita-card';
import { Plus, FolderPlus, FolderMinus } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { withProgress } from '@/lib/request-handler';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Inicio' },
  { href: '/dashboard/directorio', label: 'Directorio' },
  { href: '/dashboard/citas', label: 'Citas' },
  { href: '/dashboard/medicamentos', label: 'Medicamentos' },
];

function safeFormatDate(dateStr: string | undefined, formatStr: string): string {
  if (!dateStr) return 'Fecha sin definir';
  try {
    return format(parseISO(dateStr), formatStr, { locale: es });
  } catch {
    return 'Fecha inválida';
  }
}

function safeSliceTime(timeStr: string | undefined): string {
  if (!timeStr) return '--:--';
  return timeStr.slice(0, 5);
}

function getStatusBadge(estado: CitaEstado) {
  switch (estado) {
    case 'confirmada':
      return <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-emerald-200">Confirmada</span>;
    case 'programada':
      return <span className="bg-sky-50 text-sky-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-sky-200">Programada</span>;
    case 'pospuesta':
      return <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-amber-200">Pospuesta</span>;
    case 'completada':
      return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-slate-300">Completada</span>;
    case 'cancelada':
      return <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-rose-200">Cancelada</span>;
    case 'rechazada':
      return <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-rose-200">Rechazada</span>;
    case 'no_asistio':
      return <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-rose-200">No asistió</span>;
    default:
      return <span className="bg-slate-50 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">{String(estado || '').replace(/_/g, ' ')}</span>;
  }
}

/** Formatea cualquier nombre a [Primer Nombre] [Primer Apellido] */
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

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM DROPDOWN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface CustomDropdownProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  onClear?: () => void;
  options: DropdownOption<T>[];
  icon?: React.ReactNode;
  placeholder?: string;
  className?: string;
}

function CustomDropdown<T extends string = string>({
  value,
  onChange,
  onClear,
  options,
  icon,
  placeholder = 'Seleccionar...',
  className = '',
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);
  const isCustomSelected = value !== '' && value !== 'todas';

  return (
    <div className={`relative text-left ${className || 'inline-block'}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border cursor-pointer select-none ${
          isCustomSelected
            ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-xs'
            : 'bg-white dark:bg-slate-850 border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-2 truncate min-w-0 flex-1">
          {icon && <span className="shrink-0 text-slate-400 dark:text-slate-500">{icon}</span>}
          <span className="truncate text-left">
            {selectedOption?.label || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isCustomSelected && onClear && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onClear();
                setIsOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onClear();
                  setIsOpen(false);
                }
              }}
              className="p-0.5 rounded-md hover:bg-blue-200/70 dark:hover:bg-blue-900/70 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 cursor-pointer transition-colors"
              title="Quitar filtro"
              aria-label="Quitar filtro"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}

          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
            }`}
          />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 mt-2 min-w-full w-max max-w-[320px] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-700 p-1.5 z-50 overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto scrollbar-thin py-0.5 space-y-0.5">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
function CitasContent() {
  const router = useRouter();

  // Queries de Pacientes
  const { data: pacientesUsuario = [], isLoading: loadingPacientesUsuario } = usePacientesByUsuario();
  const { data: pacientesSeleccion = [], isLoading: loadingPacientesSeleccion } = usePacientesSeleccion();

  const loadingPacientes = loadingPacientesUsuario || loadingPacientesSeleccion;
  const pacientePrincipal = pacientesSeleccion?.find((p) => p.pacTitular) || pacientesSeleccion?.[0];

  const codigosPacientes = useMemo(() => {
    const set = new Set<string>();
    pacientesSeleccion.forEach((p) => set.add(p.pacCodigo));
    pacientesUsuario.forEach((p) => set.add(p.pac_codigo));
    return Array.from(set);
  }, [pacientesSeleccion, pacientesUsuario]);

  const { data: citasData, isLoading: loadingCitas } = useAllCitasPacientes(codigosPacientes);

  // Auto-sincronizar en la base de datos las citas pasadas
  useAutoCompletarCitasPasadas(citasData);

  // Sort all citas by date descending
  const citas = useMemo(() => {
    if (!citasData) return [];
    return [...citasData].sort((a, b) => new Date(b.ctaFecha).getTime() - new Date(a.ctaFecha).getTime());
  }, [citasData]);

  // UI State
  const [tabActual, setTabActual] = useState<'proximas' | 'historial'>('proximas');
  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null);
  const [medicoSeleccionado, setMedicoSeleccionado] = useState<string>('');
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>('');
  const [linkGroupCita, setLinkGroupCita] = useState<CitaListDto | null>(null);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState<'todas' | '24hrs' | 'semana'>('todas');
  const [viewFilter, setViewFilter] = useState<'todas' | 'unicas' | 'series'>('todas');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isConsultasIndividualesOpen, setIsConsultasIndividualesOpen] = useState(true);
  const [isSeriesSectionOpen, setIsSeriesSectionOpen] = useState(true);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (viewFilter !== 'todas') count++;
    if (tabActual === 'proximas' && quickFilter !== 'todas') count++;
    if (medicoSeleccionado !== '') count++;
    if (grupoSeleccionado !== '') count++;
    return count;
  }, [viewFilter, quickFilter, medicoSeleccionado, grupoSeleccionado, tabActual]);

  useEffect(() => {
    if (!isFiltersOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsFiltersOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFiltersOpen]);

  const { mutateAsync: cancelarCita, isPending: isCanceling } = useCancelarCita();
  const desvincularMutation = useDesvincularGrupo();
  const eliminarGrupoMutation = useEliminarGrupo();

  const [citaToCancel, setCitaToCancel] = useState<CitaListDto | null>(null);
  const [citaToUnlink, setCitaToUnlink] = useState<CitaListDto | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<{ id: string; tema: string } | null>(null);

  const handleConfirmCancel = (cita: CitaListDto) => {
    setCitaToCancel(cita);
  };

  const handleConfirmUnlink = (cita: CitaListDto) => {
    setCitaToUnlink(cita);
  };

  const handleConfirmEliminarGrupo = (grupoId: string, temaNombre: string) => {
    setGroupToDelete({ id: grupoId, tema: temaNombre });
  };

  const executeCancel = async () => {
    if (!citaToCancel) return;
    try {
      await withProgress(() => cancelarCita(citaToCancel), {
        progressTitle: 'Cancelando Consulta',
        initialMessage: 'Notificando cancelación al consultorio...',
        successTitle: 'Cita Cancelada',
        successText: 'La cita ha sido cancelada correctamente.',
      });
      toast.success('Cita cancelada correctamente');
      setCitaToCancel(null);
    } catch {}
  };

  const executeUnlink = async () => {
    if (!citaToUnlink) return;
    try {
      await withProgress(() => desvincularMutation.mutateAsync(citaToUnlink), {
        progressTitle: 'Desanclando Cita',
        initialMessage: 'Desvinculando consulta del tema de seguimiento...',
        successTitle: 'Cita Desanclada',
        successText: 'La cita ahora es una consulta individual independiente.',
      });
      toast.success('Cita desanclada del tema de seguimiento');
      setCitaToUnlink(null);
    } catch {}
  };

  const executeDeleteGroup = async () => {
    if (!groupToDelete) return;
    try {
      await withProgress(() => eliminarGrupoMutation.mutateAsync(groupToDelete.id), {
        progressTitle: 'Eliminando tema',
        initialMessage: 'Desvinculando citas del tema de seguimiento...',
        successTitle: 'Tema Eliminado',
        successText: 'El tema de seguimiento ha sido eliminado.',
      });
      toast.success('Tema de seguimiento eliminado correctamente');
      setGroupToDelete(null);
    } catch (e: any) {
      console.error('Error al eliminar grupo:', e);
      const msg = e?.response?.data?.mensaje || e?.message || 'Error al eliminar el tema de seguimiento';
      toast.error(msg);
    }
  };

  // 1. Extraer médicos únicos
  const medicosUnicosIds = useMemo(() => {
    const ids = new Set<string>();
    citas.forEach((c) => ids.add(c.ctaCoddoc));
    return Array.from(ids);
  }, [citas]);

  const { data: gruposMap } = useGruposMap(pacientePrincipal?.pacCodigo || null, medicosUnicosIds);

  const citasConTemas = useMemo(() => {
    const now = new Date();
    return citas.map((c) => {
      let estado = c.ctaEstado;
      let isPast = false;
      try {
        const citaDateTime = new Date(`${c.ctaFecha.split('T')[0]}T${c.ctaHora || '00:00:00'}`);
        if (citaDateTime < now) {
          isPast = true;
          if (estado === 'programada' && now.getTime() - citaDateTime.getTime() >= 60 * 60 * 1000) {
            estado = 'no_asistio' as CitaEstado;
          }
        }
      } catch (e) {}

      return {
        ...c,
        ctaEstado: estado,
        isPast,
        grupoTema: c.ctaGrupoId && gruposMap ? gruposMap.get(c.ctaGrupoId.toLowerCase()) || c.grupoTema : c.grupoTema,
      };
    });
  }, [citas, gruposMap]);

  // Lista consolidada de pacientes con "Primer Nombre y Primer Apellido"
  const pacientesTabsList = useMemo(() => {
    const map = new Map<
      string,
      {
        pacCodigo: string;
        pacTitular: boolean;
        primerNombre: string;
        primerApellido: string;
        nombreCorto: string;
        fotoPerfilUrl?: string;
        parentesco?: string;
      }
    >();

    // 1. Desde pacientesUsuario
    pacientesUsuario.forEach((p) => {
      const primerNombre = p.pac_primer_nombre?.trim() || 'Paciente';
      const primerApellido = p.pac_primer_apellido?.trim() || '';
      const nombreCorto = primerApellido ? `${primerNombre} ${primerApellido}` : primerNombre;
      map.set(p.pac_codigo, {
        pacCodigo: p.pac_codigo,
        pacTitular: p.pac_titular,
        primerNombre,
        primerApellido,
        nombreCorto,
        fotoPerfilUrl: p.pac_foto_perfil_url || undefined,
        parentesco: p.pac_titular ? 'Titular' : p.parentesco_descripcion || 'Dependiente',
      });
    });

    // 2. Desde pacientesSeleccion
    pacientesSeleccion.forEach((p) => {
      if (!map.has(p.pacCodigo)) {
        const nombreCorto = getPrimerNombrePrimerApellido({ nombreCompleto: p.nombreCompleto });
        const parts = nombreCorto.split(' ');
        map.set(p.pacCodigo, {
          pacCodigo: p.pacCodigo,
          pacTitular: p.pacTitular,
          primerNombre: parts[0] || 'Paciente',
          primerApellido: parts[1] || '',
          nombreCorto,
          fotoPerfilUrl: p.pacFotoPerfilUrl,
          parentesco: p.pacTitular ? 'Titular' : 'Dependiente',
        });
      }
    });

    // 3. Fallback con citas
    citasConTemas.forEach((c) => {
      if (c.ctaCodpac && !map.has(c.ctaCodpac)) {
        const nombreCorto = getPrimerNombrePrimerApellido({ nombre: c.pacienteNombre });
        const parts = nombreCorto.split(' ');
        map.set(c.ctaCodpac, {
          pacCodigo: c.ctaCodpac,
          pacTitular: false,
          primerNombre: parts[0] || 'Paciente',
          primerApellido: parts[1] || '',
          nombreCorto,
          fotoPerfilUrl: undefined,
          parentesco: 'Paciente',
        });
      }
    });

    return Array.from(map.values());
  }, [pacientesUsuario, pacientesSeleccion, citasConTemas]);

  // Auto-seleccionar paciente si la cuenta solo tiene un paciente (ej. cuenta independizada o individual)
  useEffect(() => {
    if (pacientesTabsList.length === 1 && !selectedPacienteId) {
      setSelectedPacienteId(pacientesTabsList[0].pacCodigo);
    }
  }, [pacientesTabsList, selectedPacienteId]);

  const medicosUnicos = useMemo(() => {
    const map = new Map<string, string>();
    citasConTemas.forEach((c) => map.set(c.ctaCoddoc, c.medicoNombre));
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [citasConTemas]);

  const gruposUnicos = useMemo(() => {
    const map = new Map<string, { id: string; tema: string; medicoNombre?: string }>();
    citasConTemas.forEach((c) => {
      const normId = (c.ctaGrupoId || '').toLowerCase().trim();
      if (normId && c.grupoTema && !map.has(normId)) {
        map.set(normId, {
          id: c.ctaGrupoId || normId,
          tema: c.grupoTema,
          medicoNombre: c.medicoNombre,
        });
      }
    });
    return Array.from(map.values()).map((g) => ({
      id: g.id,
      tema: g.medicoNombre ? `${g.tema} - ${g.medicoNombre}` : g.tema,
    }));
  }, [citasConTemas]);

  // Citas categorizadas para el Tab actual y Filtros activos
  const citasFiltradas = useMemo(() => {
    const now = new Date();
    const msIn24Hrs = 24 * 60 * 60 * 1000;
    const msInWeek = 7 * 24 * 60 * 60 * 1000;
    const historialEstados = ['cancelada', 'no_asistio', 'completada', 'rechazada'];

    return citasConTemas.filter((c) => {
      // Filtro de Médico
      if (medicoSeleccionado && c.ctaCoddoc !== medicoSeleccionado) return false;
      // Filtro de Grupo
      if (grupoSeleccionado && c.ctaGrupoId !== grupoSeleccionado) return false;

      const estadoNorm = (c.ctaEstado || '').toLowerCase().trim();
      const isHistorial = historialEstados.includes(estadoNorm);
      const isUpcoming = !isHistorial;

      const activeTab = selectedPacienteId ? tabActual : 'proximas';
      if (activeTab === 'proximas' && !isUpcoming) return false;
      if (activeTab === 'historial' && !isHistorial) return false;

      // Filtro de Vista (única vs serie)
      if (viewFilter === 'unicas' && c.ctaGrupoId) return false;
      if (viewFilter === 'series' && !c.ctaGrupoId) return false;

      // Filtro Rápido de Tiempo (en próximas)
      if (activeTab === 'proximas' && quickFilter !== 'todas') {
        const citaDate = new Date(`${c.ctaFecha.split('T')[0]}T${c.ctaHora}`);
        const diff = citaDate.getTime() - now.getTime();
        if (quickFilter === '24hrs' && (diff < 0 || diff > msIn24Hrs)) return false;
        if (quickFilter === 'semana' && (diff < 0 || diff > msInWeek)) return false;
      }

      return true;
    });
  }, [citasConTemas, medicoSeleccionado, grupoSeleccionado, tabActual, selectedPacienteId, quickFilter, viewFilter]);

  // Secciones de citas agrupadas por paciente (standalone + series)
  const seccionesPorPaciente = useMemo(() => {
    const sortFn = (a: CitaListDto, b: CitaListDto) => {
      const dateA = new Date(`${a.ctaFecha.split('T')[0]}T${a.ctaHora}`).getTime();
      const dateB = new Date(`${b.ctaFecha.split('T')[0]}T${b.ctaHora}`).getTime();
      return tabActual === 'proximas' ? dateA - dateB : dateB - dateA;
    };

    return pacientesTabsList.map((pac) => {
      const citasPaciente = citasFiltradas.filter((c) => c.ctaCodpac === pac.pacCodigo);
      const standalone: CitaListDto[] = [];
      const seriesMap: Record<string, CitaListDto[]> = {};
      const seriesStats: Record<string, { total: number; completed: number }> = {};

      // Calcular estadísticas globales de series para este paciente (de todas las citas, no solo filtradas)
      citasConTemas.forEach((c) => {
        if (c.ctaCodpac !== pac.pacCodigo) return;
        if (c.ctaGrupoId) {
          if (!seriesStats[c.ctaGrupoId]) {
            seriesStats[c.ctaGrupoId] = { total: 0, completed: 0 };
          }
          seriesStats[c.ctaGrupoId].total += 1;
          if (c.ctaEstado === 'completada') {
            seriesStats[c.ctaGrupoId].completed += 1;
          }
        }
      });

      citasPaciente.forEach((c) => {
        if (c.ctaGrupoId) {
          if (!seriesMap[c.ctaGrupoId]) seriesMap[c.ctaGrupoId] = [];
          seriesMap[c.ctaGrupoId].push(c);
        } else {
          standalone.push(c);
        }
      });

      standalone.sort(sortFn);
      Object.values(seriesMap).forEach((arr) => arr.sort(sortFn));

      return {
        paciente: pac,
        standalone,
        series: seriesMap,
        seriesStats,
        totalCitas: citasPaciente.length,
      };
    });
  }, [pacientesTabsList, citasFiltradas, citasConTemas, tabActual]);

  // Estado para vista Master-Detail de pacientes
  const selectedSection = useMemo(() => {
    if (!selectedPacienteId) return null;
    return seccionesPorPaciente.find((s) => s.paciente.pacCodigo === selectedPacienteId) || null;
  }, [seccionesPorPaciente, selectedPacienteId]);

  // Conteo específico para el paciente seleccionado (Próximas vs Historial)
  const { pacienteProximasCount, pacienteHistorialCount } = useMemo(() => {
    if (!selectedPacienteId) return { pacienteProximasCount: 0, pacienteHistorialCount: 0 };
    const historialEstados = ['cancelada', 'no_asistio', 'completada', 'rechazada'];
    const pacCitas = citasConTemas.filter((c) => c.ctaCodpac === selectedPacienteId);
    const historial = pacCitas.filter((c) =>
      historialEstados.includes((c.ctaEstado || '').toLowerCase().trim())
    ).length;
    const proximas = pacCitas.filter((c) =>
      !historialEstados.includes((c.ctaEstado || '').toLowerCase().trim())
    ).length;
    return { pacienteProximasCount: proximas, pacienteHistorialCount: historial };
  }, [citasConTemas, selectedPacienteId]);

  const totalCitasFiltradas = citasFiltradas.length;

  return (
    <div className="min-h-screen text-slate-900 pb-20 bg-slate-50/40 dark:bg-slate-950 transition-colors">
      <motion.main
        className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* ── Contenido Principal: Master-Detail por Paciente ── */}
        {loadingCitas || loadingPacientes ? (
          <div className="py-20 flex flex-col items-center justify-center text-sky-600">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p className="font-bold animate-pulse">Cargando citas médicas...</p>
          </div>
        ) : seccionesPorPaciente.length === 0 ? (
          <div className="p-12 sm:p-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-3xl bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto shadow-inner">
              <CalendarDays className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                No se encontraron citas
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                No tienes citas médicas registradas en este momento.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard/directorio')}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-2xl shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Agendar Nueva Cita
              </button>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {!selectedPacienteId || !selectedSection ? (
              /* ── VISTA PRINCIPAL: Cuadrícula de Pacientes ── */
              <motion.div
                key="patient-master-grid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Encabezado de la Vista Principal */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                      <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      <span>Pacientes y Citas</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Selecciona un paciente para ver sus citas programadas, historial y tratamientos
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard/directorio')}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-sm hover:shadow transition active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Nueva Cita
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                  {seccionesPorPaciente.map(({ paciente: pac, standalone, series, totalCitas }) => (
                    <PatientCard
                      key={pac.pacCodigo}
                      paciente={pac}
                      totalCitas={totalCitas}
                      standalone={standalone}
                      series={series}
                      tabActual={tabActual}
                      onSelect={() => {
                        setSelectedPacienteId(pac.pacCodigo);
                        setTabActual('proximas');
                      }}
                      onAgendar={() => router.push(`/dashboard/directorio?paciente=${pac.pacCodigo}`)}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              /* ── VISTA DETALLE: Desglose de Citas del Paciente Seleccionado ── */
              <motion.div
                key={`patient-detail-${selectedPacienteId}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* ── Encabezado: Volver (Izq) | Paciente y Relación (Centro) | Agrupar Citas (Der) ── */}
                <div className="relative flex items-center justify-between gap-4 pb-1">
                  {/* Izquierda: Volver a pacientes (solo si hay más de 1 paciente registrado) */}
                  <div className="flex items-center justify-start shrink-0 z-10">
                    {pacientesTabsList.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setSelectedPacienteId(null)}
                        className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all active:scale-95 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Volver a pacientes</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold">
                        <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="hidden sm:inline">Mis Citas Médicas</span>
                      </div>
                    )}
                  </div>

                  {/* Centro: Nombre del paciente y relación */}
                  <div className="flex items-center justify-center gap-2.5 sm:gap-3 min-w-0 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                    {/* Avatar compacto */}
                    {selectedSection.paciente.fotoPerfilUrl ? (
                      <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0">
                        <Image
                          src={selectedSection.paciente.fotoPerfilUrl}
                          alt={selectedSection.paciente.nombreCorto}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-2xs shrink-0">
                        {selectedSection.paciente.primerNombre
                          ? selectedSection.paciente.primerNombre.charAt(0).toUpperCase()
                          : 'P'}
                      </div>
                    )}

                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                      {selectedSection.paciente.nombreCorto}
                    </h2>

                    <span className="text-[10px] sm:text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                      {selectedSection.paciente.parentesco}
                    </span>
                  </div>

                  {/* Derecha: Botón Agrupar citas */}
                  <div className="flex items-center justify-end shrink-0 z-10">
                    <button
                      type="button"
                      onClick={() => setIsCreateGroupOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 px-3 py-1.5 rounded-xl transition cursor-pointer border border-indigo-200/60 dark:border-indigo-800/40 shadow-2xs active:scale-95"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Agrupar citas</span>
                    </button>
                  </div>
                </div>

                {/* ── Barra de Navegación de Citas del Paciente (Pestañas Próximas / Historial + Filtros + Nueva Cita) ── */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-0 pt-1">
                  {/* Pestañas Tradicionales (Extremo Izquierdo) */}
                  <nav className="flex items-center gap-6 sm:gap-8 -mb-px overflow-x-auto scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setTabActual('proximas')}
                      className={`group relative pb-3.5 flex items-center gap-2.5 text-sm sm:text-base font-bold transition-colors cursor-pointer shrink-0 ${
                        tabActual === 'proximas'
                          ? 'text-blue-600 dark:text-blue-400 font-black'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold'
                      }`}
                    >
                      <CalendarDays
                        className={`w-4 h-4 sm:w-5 sm:h-5 ${
                          tabActual === 'proximas'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600'
                        }`}
                      />
                      <span>Próximas Citas</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
                          tabActual === 'proximas'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {pacienteProximasCount}
                      </span>
                      {/* Línea inferior gruesa indicadora */}
                      {tabActual === 'proximas' && (
                        <motion.div
                          layoutId="activeTabIndicator"
                          className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 dark:bg-blue-400 rounded-t-full"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTabActual('historial')}
                      className={`group relative pb-3.5 flex items-center gap-2.5 text-sm sm:text-base font-bold transition-colors cursor-pointer shrink-0 ${
                        tabActual === 'historial'
                          ? 'text-blue-600 dark:text-blue-400 font-black'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold'
                      }`}
                    >
                      <Clock
                        className={`w-4 h-4 sm:w-5 sm:h-5 ${
                          tabActual === 'historial'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600'
                        }`}
                      />
                      <span>Historial</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
                          tabActual === 'historial'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {pacienteHistorialCount}
                      </span>
                      {/* Línea inferior gruesa indicadora */}
                      {tabActual === 'historial' && (
                        <motion.div
                          layoutId="activeTabIndicator"
                          className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 dark:bg-blue-400 rounded-t-full"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                    </button>
                  </nav>

                  {/* Botones de Acción (Extremo Derecho) */}
                  <div className="flex items-center gap-2.5 pb-2.5 sm:pb-3 shrink-0">
                    {/* Botón Filtros */}
                    <button
                      type="button"
                      onClick={() => setIsFiltersOpen((prev) => !prev)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold border transition-all duration-200 cursor-pointer select-none active:scale-95 ${
                        isFiltersOpen
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-xs'
                          : activeFiltersCount > 0
                          ? 'bg-white dark:bg-slate-850 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-2xs'
                          : 'bg-white dark:bg-slate-850 border-slate-200/90 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
                      }`}
                      aria-expanded={isFiltersOpen}
                      title={isFiltersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
                    >
                      <SlidersHorizontal
                        className={`w-3.5 h-3.5 ${
                          isFiltersOpen || activeFiltersCount > 0
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      />
                      <span>Filtros</span>
                      {activeFiltersCount > 0 && (
                        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-black shadow-2xs">
                          {activeFiltersCount}
                        </span>
                      )}
                    </button>

                    {/* Botón Nueva Cita (Preseleccionando al paciente actual) */}
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/dashboard/directorio?paciente=${selectedPacienteId}`)
                      }
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-2xl shadow-sm hover:shadow transition active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Nueva Cita
                    </button>
                  </div>
                </div>

                {/* ── Fila de Filtros Desplegable (específica del paciente seleccionado) ── */}
                <AnimatePresence>
                  {(isFiltersOpen || activeFiltersCount > 0) && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, height: 0, y: -6 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -6 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-wrap items-center gap-2.5 w-full pt-1 pb-1 relative z-20"
                    >
                      {/* 1. Tipo de Consulta */}
                      <AnimatePresence>
                        {(isFiltersOpen || viewFilter !== 'todas') && (
                          <motion.div
                            key="filter-view"
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.18 }}
                          >
                            <CustomDropdown
                              className="w-44 sm:w-48"
                              value={viewFilter}
                              onChange={(val) => setViewFilter(val as 'todas' | 'unicas' | 'series')}
                              onClear={() => setViewFilter('todas')}
                              options={[
                                { value: 'todas', label: 'Todas las Vistas' },
                                { value: 'unicas', label: 'Citas Únicas' },
                                { value: 'series', label: 'Tratamientos / Series' },
                              ]}
                              icon={<Layers className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* 2. Período de Tiempo (en próximas) */}
                      <AnimatePresence>
                        {tabActual === 'proximas' && (isFiltersOpen || quickFilter !== 'todas') && (
                          <motion.div
                            key="filter-quick"
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.18 }}
                          >
                            <CustomDropdown
                              className="w-44 sm:w-48"
                              value={quickFilter}
                              onChange={(val) => setQuickFilter(val as 'todas' | '24hrs' | 'semana')}
                              onClear={() => setQuickFilter('todas')}
                              options={[
                                { value: 'todas', label: 'Cualquier fecha' },
                                { value: '24hrs', label: 'Próximas 24 horas' },
                                { value: 'semana', label: 'Próxima semana' },
                              ]}
                              icon={<Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* 3. Médico Especialista */}
                      <AnimatePresence>
                        {(isFiltersOpen || medicoSeleccionado !== '') && (
                          <motion.div
                            key="filter-medico"
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.18 }}
                          >
                            <CustomDropdown
                              className="w-52 sm:w-56"
                              value={medicoSeleccionado}
                              onChange={setMedicoSeleccionado}
                              onClear={() => setMedicoSeleccionado('')}
                              options={[
                                { value: '', label: 'Todos los Médicos' },
                                ...medicosUnicos.map((m) => ({ value: m.id, label: m.nombre })),
                              ]}
                              icon={<User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* 4. Tema de Seguimiento */}
                      <AnimatePresence>
                        {(isFiltersOpen || grupoSeleccionado !== '') && (
                          <motion.div
                            key="filter-grupo"
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.18 }}
                          >
                            <CustomDropdown
                              className="w-52 sm:w-56"
                              value={grupoSeleccionado}
                              onChange={setGrupoSeleccionado}
                              onClear={() => setGrupoSeleccionado('')}
                              options={[
                                { value: '', label: 'Temas de Seguimiento' },
                                ...gruposUnicos.map((g) => ({ value: g.id, label: g.tema })),
                              ]}
                              icon={<RefreshCw className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Contenido de Citas del Paciente */}
                {selectedSection.totalCitas === 0 ? (
                  <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner">
                      <CalendarDays className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Sin citas {tabActual === 'proximas' ? 'próximas' : 'en el historial'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      {selectedSection.paciente.primerNombre} no tiene citas {tabActual === 'proximas' ? 'programadas en este momento' : 'registradas en el historial'}.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/directorio?paciente=${selectedSection.paciente.pacCodigo}`)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/60 dark:border-blue-800/40 transition cursor-pointer"
                      >
                        <CalendarPlus className="w-4 h-4" />
                        Agendar para {selectedSection.paciente.primerNombre}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Standalone con timeline */}
                    {selectedSection.standalone.length > 0 && (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setIsConsultasIndividualesOpen(!isConsultasIndividualesOpen)}
                          aria-expanded={isConsultasIndividualesOpen}
                          className="w-full flex items-center justify-between py-2 px-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 transition-all cursor-pointer group select-none text-left shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
                              <CalendarIcon className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              Consultas Individuales ({selectedSection.standalone.length})
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                            <span className="text-[11px] font-bold hidden sm:inline text-slate-400 dark:text-slate-500">
                              {isConsultasIndividualesOpen ? 'Minimizar' : 'Mostrar'}
                            </span>
                            <div className="w-6 h-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs group-hover:border-slate-300 dark:group-hover:border-slate-600 transition">
                              {isConsultasIndividualesOpen ? (
                                <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                              )}
                            </div>
                          </div>
                        </button>

                        <AnimatePresence initial={false}>
                          {isConsultasIndividualesOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="flex flex-col gap-2.5 relative before:absolute before:inset-y-0 before:left-3 sm:before:left-4 before:w-px before:bg-slate-200 dark:before:bg-slate-800 pt-1">
                                {selectedSection.standalone.map((cita) => (
                                  <div key={`standalone-${cita.ctaCodigo}`} className="relative z-10 pl-8 sm:pl-10">
                                    <div className="absolute left-2.5 sm:left-[15px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-500 border-[3px] border-white dark:border-slate-900 shadow-sm" />
                                    <CitaCard
                                      cita={cita}
                                      layout="row"
                                      isPast={
                                        (cita as any).isPast ||
                                        !['programada', 'confirmada', 'pospuesta'].includes(cita.ctaEstado)
                                      }
                                      onModify={(c) => router.push(`/dashboard/citas/${c.ctaCodigo}/editar`)}
                                      onCancel={(c) => handleConfirmCancel(c)}
                                      onLinkGroup={(c) => setLinkGroupCita(c)}
                                    />
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Series */}
                    {Object.entries(selectedSection.series).length > 0 && (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setIsSeriesSectionOpen(!isSeriesSectionOpen)}
                          aria-expanded={isSeriesSectionOpen}
                          className="w-full flex items-center justify-between py-2 px-3 rounded-2xl bg-sky-50/50 dark:bg-slate-800/40 hover:bg-sky-100/60 dark:hover:bg-slate-800/70 border border-sky-100 dark:border-slate-800 transition-all cursor-pointer group select-none text-left shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-sky-100/80 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-2xs">
                              <RefreshCw className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                              Temas de Seguimiento / Series ({Object.keys(selectedSection.series).length})
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                            <span className="text-[11px] font-bold hidden sm:inline text-slate-400 dark:text-slate-500">
                              {isSeriesSectionOpen ? 'Minimizar' : 'Mostrar'}
                            </span>
                            <div className="w-6 h-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs group-hover:border-slate-300 dark:group-hover:border-slate-600 transition">
                              {isSeriesSectionOpen ? (
                                <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                              )}
                            </div>
                          </div>
                        </button>

                        <AnimatePresence initial={false}>
                          {isSeriesSectionOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-4 pt-1">
                                {Object.entries(selectedSection.series).map(([grupoId, citasGrupo]) => (
                                  <SerieCard
                                    key={`grupo-${grupoId}`}
                                    grupoId={grupoId}
                                    citasGrupo={citasGrupo}
                                    totalCitasSerie={selectedSection.seriesStats[grupoId]?.total || citasGrupo.length}
                                    completedCitasSerie={selectedSection.seriesStats[grupoId]?.completed || 0}
                                    router={router}
                                    handleConfirmCancel={handleConfirmCancel}
                                    onUnlinkGroup={handleConfirmUnlink}
                                    onDeleteGroup={handleConfirmEliminarGrupo}
                                  />
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Botón inferior de retorno */}
                    <div className="pt-4 flex items-center justify-between border-t border-slate-200/80 dark:border-slate-800">
                      {pacientesTabsList.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPacienteId(null);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          Volver a pacientes
                        </button>
                      ) : <div />}

                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/directorio?paciente=${selectedSection.paciente.pacCodigo}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition cursor-pointer"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        Agendar nueva cita
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.main>

      {/* ── Modales de Citas y Grupos ── */}
      <LinkGroupModal
        isOpen={!!linkGroupCita}
        onClose={() => setLinkGroupCita(null)}
        cita={linkGroupCita}
        onLinked={(msg) => toast.success(msg)}
      />

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        pacientes={pacientesSeleccion || []}
        citas={citasConTemas}
        pacientePreseleccionado={selectedPacienteId}
        onCreated={(msg) => toast.success(msg)}
      />

      {/* Modal para Cancelar Cita */}
      <ConfirmModal
        isOpen={!!citaToCancel}
        onClose={() => setCitaToCancel(null)}
        onConfirm={executeCancel}
        title="¿Cancelar Cita?"
        description={
          citaToCancel ? (
            <div className="space-y-2">
              <p>
                Estás a punto de cancelar tu cita con{' '}
                <strong className="text-slate-900 dark:text-white">{citaToCancel.medicoNombre}</strong> el{' '}
                {safeFormatDate(citaToCancel.ctaFecha, "d 'de' MMMM")}.
              </p>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                Esta acción cambiará el estado de la cita a cancelada y liberará el turno en el sistema.
              </p>
            </div>
          ) : undefined
        }
        confirmText="Confirmar Cancelación"
        cancelText="Mantener cita"
        variant="danger"
        isLoading={isCanceling}
      />

      {/* Modal para Quitar Cita del Grupo */}
      <ConfirmModal
        isOpen={!!citaToUnlink}
        onClose={() => setCitaToUnlink(null)}
        onConfirm={executeUnlink}
        title="¿Quitar Cita del Grupo?"
        description={
          citaToUnlink ? (
            <div className="space-y-2">
              <p>
                ¿Estás seguro de que deseas quitar la cita con{' '}
                <strong className="text-slate-900 dark:text-white">{citaToUnlink.medicoNombre}</strong> del
                grupo{' '}
                <strong className="text-slate-900 dark:text-white">
                  "{citaToUnlink.grupoTema || 'Seguimiento'}"
                </strong>
                ?
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                La cita se mantendrá en tu historial como una consulta individual independiente.
              </p>
            </div>
          ) : undefined
        }
        confirmText="Sí, Quitar del Grupo"
        cancelText="Cancelar"
        variant="warning"
        isLoading={desvincularMutation.isPending}
      />

      {/* Modal para Eliminar Tema de Seguimiento */}
      <ConfirmModal
        isOpen={!!groupToDelete}
        onClose={() => setGroupToDelete(null)}
        onConfirm={executeDeleteGroup}
        title="¿Eliminar tema de seguimiento?"
        description={
          groupToDelete ? (
            <div className="space-y-3">
              <p>
                Estás a punto de eliminar el tema de seguimiento{' '}
                <strong className="text-slate-900 dark:text-white">"{groupToDelete.tema}"</strong>.
              </p>
              <div className="text-xs text-left bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 space-y-1.5">
                <p className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <span>ℹ️</span> <span>Las citas asociadas se conservarán:</span>
                </p>
                <p>
                  • <strong className="text-slate-700 dark:text-slate-200">No se borrará ninguna cita</strong>;
                  permanecerán en tu historial y próximas citas como consultas individuales.
                </p>
                <p>• Este tema ya no aparecerá como opción para reutilizar en nuevas citas.</p>
              </div>
            </div>
          ) : undefined
        }
        confirmText="Sí, eliminar tema"
        cancelText="Cancelar"
        variant="danger"
        isLoading={eliminarGrupoMutation.isPending}
      />
    </div>
  );
}

interface PatientCardProps {
  paciente: {
    pacCodigo: string;
    pacTitular: boolean;
    primerNombre: string;
    primerApellido: string;
    nombreCorto: string;
    fotoPerfilUrl?: string;
    parentesco?: string;
  };
  totalCitas: number;
  standalone: CitaListDto[];
  series: Record<string, CitaListDto[]>;
  tabActual: 'proximas' | 'historial';
  onSelect: () => void;
  onAgendar: () => void;
}

function PatientCard({
  paciente: pac,
  totalCitas,
  standalone,
  series,
  tabActual,
  onSelect,
  onAgendar,
}: PatientCardProps) {
  const initial = pac.primerNombre ? pac.primerNombre.charAt(0).toUpperCase() : 'P';
  const hasCitas = totalCitas > 0;

  // Encontrar la próxima cita más relevante
  const todasCitas = useMemo(() => {
    const list = [...standalone, ...Object.values(series).flat()];
    return list.sort((a, b) => {
      const dateA = new Date(`${a.ctaFecha.split('T')[0]}T${a.ctaHora}`).getTime();
      const dateB = new Date(`${b.ctaFecha.split('T')[0]}T${b.ctaHora}`).getTime();
      return tabActual === 'proximas' ? dateA - dateB : dateB - dateA;
    });
  }, [standalone, series, tabActual]);

  const proximaCita = todasCitas[0];
  const totalSeries = Object.keys(series).length;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2 }}
      onClick={onSelect}
      className="group relative flex flex-col justify-between p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200 cursor-pointer overflow-hidden"
    >
      {/* Indicador de acento en hover */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div>
        {/* Cabecera de la Tarjeta */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatar */}
            {pac.fotoPerfilUrl ? (
              <div className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                <Image src={pac.fotoPerfilUrl} alt={pac.nombreCorto} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-lg sm:text-xl flex items-center justify-center shadow-md shadow-blue-500/15 shrink-0">
                {initial}
              </div>
            )}

            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-tight truncate">
                {pac.nombreCorto}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 inline-flex items-center gap-1">
                  {pac.pacTitular && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                  {pac.parentesco}
                </span>
              </div>
            </div>
          </div>

          {/* Badge de Conteo */}
          {hasCitas ? (
            <span className="text-xs px-3 py-1 rounded-full font-black bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 shrink-0 shadow-2xs">
              {totalCitas} {totalCitas === 1 ? 'cita' : 'citas'}
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
              0 citas
            </span>
          )}
        </div>

        {/* Snippet de Próxima Cita */}
        {proximaCita ? (
          <div className="mt-4 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                {tabActual === 'proximas' ? 'Próxima consulta' : 'Última consulta'}
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-extrabold">
                {safeSliceTime(proximaCita.ctaHora)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 capitalize truncate">
                {safeFormatDate(proximaCita.ctaFecha, "EEEE, d 'de' MMMM")}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate pt-0.5">
              Con <span className="font-bold text-slate-700 dark:text-slate-300">{proximaCita.medicoNombre}</span>
              {proximaCita.medicoEspecialidad ? ` · ${proximaCita.medicoEspecialidad}` : ''}
            </div>
          </div>
        ) : (
          <div className="mt-4 p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              {tabActual === 'proximas' ? 'Sin citas próximas programadas' : 'Sin citas en el historial'}
            </p>
          </div>
        )}
      </div>

      {/* Pie de Tarjeta */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        <span className="font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors flex items-center gap-1">
          Ver citas
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </span>

        <div className="flex items-center gap-2">
          {totalSeries > 0 && (
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 text-sky-500" />
              {totalSeries} {totalSeries === 1 ? 'serie' : 'series'}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAgendar();
            }}
            title={`Agendar para ${pac.primerNombre}`}
            className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SerieCard({
  grupoId,
  citasGrupo,
  totalCitasSerie,
  completedCitasSerie,
  router,
  handleConfirmCancel,
  onUnlinkGroup,
  onDeleteGroup,
}: {
  grupoId: string;
  citasGrupo: CitaListDto[];
  totalCitasSerie: number;
  completedCitasSerie: number;
  router: any;
  handleConfirmCancel: (c: CitaListDto) => void;
  onUnlinkGroup: (c: CitaListDto) => void;
  onDeleteGroup: (grupoId: string, temaNombre: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const doctorCode = citasGrupo[0]?.ctaCoddoc;
  const { data: doctor } = useDoctorByCode(doctorCode || '');

  const nombreGrupo = citasGrupo[0]?.grupoTema || 'Tema de Seguimiento';
  const medicoNombre = citasGrupo[0]?.medicoNombre || '';
  const medicoEspecialidad = citasGrupo[0]?.medicoEspecialidad || '';

  const initials =
    medicoNombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('') || 'MD';

  const total = totalCitasSerie || citasGrupo.length;
  const completed = completedCitasSerie;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-sky-50/40 dark:bg-[#1E293B] rounded-3xl border border-sky-100 dark:border-slate-700 p-4 sm:p-5 shadow-sm overflow-hidden transition-all">
      {/* Encabezado dividido estrictamente en dos bloques */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
          isExpanded ? 'mb-4 pb-4 border-b border-sky-200/60 dark:border-slate-700' : 'mb-0 pb-0'
        }`}
      >
        {/* BLOQUE IZQUIERDO: Foto, Título, Doctor y Progreso */}
        <div
          className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer group/title"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="relative group/avatar cursor-help shrink-0">
            <div className="w-12 h-12 rounded-full bg-white dark:bg-[#0F172A] border-2 border-sky-200 dark:border-slate-600 overflow-hidden relative flex items-center justify-center shrink-0 shadow-sm">
              {doctor?.exp_foto_perfil ? (
                <Image src={doctor.exp_foto_perfil} alt={medicoNombre} fill sizes="48px" className="object-cover" />
              ) : (
                <span className="text-sm font-black text-sky-600 dark:text-blue-400">{initials}</span>
              )}
            </div>

            {/* Tooltip del Médico */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-slate-800 text-white rounded-xl p-3 shadow-xl opacity-0 invisible group-hover/avatar:opacity-100 group-hover/avatar:visible transition-all z-20 pointer-events-none">
              <p className="text-xs font-bold mb-1">{medicoEspecialidad}</p>
              <p className="text-[10px] text-slate-300">+10 años de experiencia</p>
              <p className="text-[10px] text-slate-300">Certificación Internacional</p>
              <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-slate-800"></div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate group-hover/title:text-sky-600 dark:group-hover/title:text-sky-400 transition-colors">
              {nombreGrupo}
            </h4>
            <p className="text-xs font-bold text-sky-700 dark:text-sky-400 mt-0.5 truncate">
              Dr. {medicoNombre.split(' ').slice(0, 2).join(' ')}
            </p>

            {/* Progreso */}
            <div className="flex items-center gap-2.5 mt-1.5 max-w-xs">
              <div className="w-20 sm:w-28 bg-sky-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden shrink-0">
                <div
                  className="bg-sky-500 dark:bg-sky-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {completed} de {total} sesiones ({percent}%)
              </span>
            </div>
          </div>
        </div>

        {/* BLOQUE DERECHO: Botones de Acción */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-end sm:self-center">
          {/* 1. Botón "Nueva Cita" con autocompletado */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const firstCita = citasGrupo[0];
              const docCode = firstCita?.ctaCoddoc || doctorCode;
              const pacCode = firstCita?.ctaCodpac;
              const mod = firstCita?.ctaModalidad;
              const syp = (firstCita as any)?.sypCodigo || (firstCita as any)?.codServicio;

              const qParams = new URLSearchParams();
              if (grupoId) qParams.set('grupoId', grupoId);
              if (nombreGrupo) qParams.set('tema', nombreGrupo);
              if (pacCode) qParams.set('pacCodigo', pacCode);
              if (mod) qParams.set('modalidad', mod);
              if (syp) qParams.set('sypCodigo', String(syp));

              router.push(`/dashboard/agendar/${docCode}?${qParams.toString()}`);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-sky-700 dark:text-sky-300 bg-white dark:bg-[#0F172A] hover:bg-sky-50 dark:hover:bg-sky-900/40 border border-sky-200 dark:border-sky-800 shadow-2xs hover:shadow transition-all active:scale-95 cursor-pointer shrink-0"
            title="Agendar nueva cita asociada a este tema de seguimiento"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Nueva Cita</span>
          </button>

          {/* 2. Botón "Ver serie" */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/citas/grupos/${grupoId}`);
            }}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 bg-white dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
            title="Ver detalle completo de la serie"
          >
            <span>Ver serie</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          {/* 3. Botón Eliminar tema de seguimiento */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteGroup(grupoId, nombreGrupo);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-[#0F172A] hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-900 shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0 group/delbtn"
            title="Eliminar tema de seguimiento (Las citas no se borrarán)"
          >
            <X className="w-3.5 h-3.5 text-slate-400 group-hover/delbtn:text-rose-600 dark:group-hover/delbtn:text-rose-400 transition-colors" />
            <span>Eliminar tema</span>
          </button>

          {/* 4. Botón Minimizar / Mostrar */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white dark:bg-[#0F172A] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
            title={isExpanded ? 'Minimizar tema de seguimiento' : 'Mostrar citas del tema de seguimiento'}
            aria-label={isExpanded ? 'Minimizar' : 'Mostrar'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <ChevronDown className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>

      {/* Lista de Citas del Grupo */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 relative before:absolute before:inset-y-0 before:left-3 sm:before:left-4 before:w-px before:bg-sky-200 dark:before:bg-slate-600 pt-1">
              {citasGrupo.map((cita) => (
                <div key={`grupo-cita-${cita.ctaCodigo}`} className="relative z-10 pl-8 sm:pl-10">
                  <div
                    className={`absolute left-2.5 sm:left-[15px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-[3px] border-white dark:border-[#1E293B] shadow-sm ${
                      ['programada', 'confirmada', 'pospuesta'].includes(cita.ctaEstado)
                        ? 'bg-sky-400 dark:bg-blue-400'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                  <CitaCard
                    cita={cita}
                    layout="row"
                    isPast={
                      (cita as any).isPast ||
                      !['programada', 'confirmada', 'pospuesta'].includes(cita.ctaEstado)
                    }
                    onModify={(c) => {
                      router.push(`/dashboard/citas/${c.ctaCodigo}/editar`);
                    }}
                    onCancel={(c) => {
                      handleConfirmCancel(c);
                    }}
                    onUnlinkGroup={onUnlinkGroup}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LinkGroupModal({
  isOpen,
  onClose,
  cita,
  onLinked,
}: {
  isOpen: boolean;
  onClose: () => void;
  cita: CitaListDto | null;
  onLinked: (msg: string) => void;
}) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken || '';
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [grupos, setGrupos] = useState<GrupoCitaDto[]>([]);
  const [selectedGrupoId, setSelectedGrupoId] = useState<string>('');
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewTitle('');
      setNewTopic('');
      if (cita && token) {
        setLoading(true);
        fetchGruposCita(token, cita.ctaCodpac, cita.ctaCoddoc)
          .then((data) => {
            // Deduplicar grupos por grupoId normalizado para evitar keys repetidas
            const map = new Map<string, GrupoCitaDto>();
            (data || []).forEach((item) => {
              const normId = String(item.grupoId || (item as any).id || '').toLowerCase().trim();
              if (normId && !map.has(normId)) {
                map.set(normId, { ...item, grupoId: normId });
              }
            });
            const unique = Array.from(map.values());
            setGrupos(unique);
            if (unique.length > 0) {
              setSelectedGrupoId(unique[0].grupoId);
              setMode('select');
            } else {
              setMode('create');
            }
          })
          .catch(() => setGrupos([]))
          .finally(() => setLoading(false));
      }
    }
  }, [isOpen, cita, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cita || !token) return;

    setLoading(true);
    try {
      let targetGrupoId = selectedGrupoId;
      if (mode === 'create') {
        if (!newTitle.trim()) {
          toast.error('El nombre del tema es requerido');
          setLoading(false);
          return;
        }
        const created = await createGrupo(
          token,
          cita.ctaCodpac,
          cita.ctaCoddoc,
          newTopic.trim() || newTitle.trim(),
          newTitle.trim()
        );
        targetGrupoId = created.grupoId;
      }

      if (!targetGrupoId) {
        toast.error('Selecciona o crea un tema para agrupar');
        setLoading(false);
        return;
      }

      // Persistir la asociación de la cita al grupo
      await updateCita(token, cita.ctaCodigo, {
        fecha: cita.ctaFecha ? cita.ctaFecha.split('T')[0] : '',
        hora: cita.ctaHora || '',
        modalidad: cita.ctaModalidad as any,
        precio: cita.ctaPrecio,
        grupoId: targetGrupoId,
        consultorioId: cita.ctaConsultorioId,
        codServicio: (cita as any).ctaCodsyp,
        motivo: (cita as any).ctaMotivo,
      });

      queryClient.invalidateQueries({ queryKey: ['citasPaciente'] });
      queryClient.invalidateQueries({ queryKey: ['citasTodosPacientes'] });
      queryClient.invalidateQueries({ queryKey: ['gruposCita'] });
      queryClient.invalidateQueries({ queryKey: ['gruposMap'] });

      toast.success(mode === 'create' ? 'Tema creado y cita agrupada exitosamente' : 'Cita agrupada exitosamente');
      onLinked(mode === 'create' ? 'Cita agrupada al nuevo tema' : 'Cita agrupada');
      onClose();
    } catch (err: any) {
      console.error('Error al agrupar la cita:', err);
      toast.error('Error al agrupar la cita');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !cita) return null;

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      variant="minimal"
      maxWidth="max-w-lg"
      title="Incluir en un Grupo"
      subtitle={`Asocia esta cita con ${cita.medicoNombre} a un grupo de seguimiento clínico.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {grupos.length > 0 && (
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('select');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                mode === 'select'
                  ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Seleccionar grupo existente
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('create');
                setNewTitle('');
                setNewTopic('');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                mode === 'create'
                  ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Crear nuevo grupo
            </button>
          </div>
        )}

        {mode === 'select' && grupos.length > 0 ? (
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Grupo de citas:
            </label>
            <select
              value={selectedGrupoId}
              onChange={(e) => setSelectedGrupoId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-hidden"
            >
              {grupos.map((g, idx) => {
                const nombreTema = g.titulo || g.descripcion || 'Tema de Seguimiento';
                const label = cita?.medicoNombre ? `${nombreTema} - ${cita.medicoNombre}` : nombreTema;
                return (
                  <option key={`link-opt-${g.grupoId}-${idx}`} value={g.grupoId}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nombre del tema:
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej. Control de Ortodoncia, Terapia Física..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Especialidad / Observación (Opcional):
              </label>
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="Ej. Odontología General"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-hidden"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Agrupando...' : 'Agrupar'}
          </button>
        </div>
      </form>
    </AnimatedModal>
  );
}

function CreateGroupModal({
  isOpen,
  onClose,
  pacientes,
  citas,
  pacientePreseleccionado,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  pacientes: any[];
  citas: CitaListDto[];
  pacientePreseleccionado?: string | null;
  onCreated: (msg: string) => void;
}) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken || '';
  const [loading, setLoading] = useState(false);

  const [selectedPac, setSelectedPac] = useState('');
  const [selectedDoc, setSelectedDoc] = useState('');
  const [titulo, setTitulo] = useState('');
  const [tema, setTema] = useState('');

  // Médicos únicos de las citas (priorizando los relacionados con el paciente preseleccionado)
  const medicos = useMemo(() => {
    const map = new Map<string, string>();
    citas.forEach((c) => {
      if (pacientePreseleccionado && c.ctaCodpac !== pacientePreseleccionado) return;
      map.set(c.ctaCoddoc, c.medicoNombre);
    });
    if (map.size === 0) {
      citas.forEach((c) => map.set(c.ctaCoddoc, c.medicoNombre));
    }
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [citas, pacientePreseleccionado]);

  // Obtener nombre del paciente preseleccionado
  const pacienteActual = useMemo(() => {
    const pacId = pacientePreseleccionado || selectedPac;
    return pacientes.find((p) => (p.pacCodigo || p.pac_codigo) === pacId);
  }, [pacientes, pacientePreseleccionado, selectedPac]);

  const pacienteActualNombre = useMemo(() => {
    if (!pacienteActual) return '';
    return getPrimerNombrePrimerApellido({
      nombreCompleto:
        pacienteActual.nombreCompleto ||
        (pacienteActual.pac_primer_nombre
          ? `${pacienteActual.pac_primer_nombre} ${pacienteActual.pac_primer_apellido || ''}`
          : ''),
    });
  }, [pacienteActual]);

  useEffect(() => {
    if (isOpen) {
      if (pacientePreseleccionado) {
        setSelectedPac(pacientePreseleccionado);
      } else if (pacientes.length > 0) {
        setSelectedPac(pacientes[0].pacCodigo || pacientes[0].pac_codigo);
      }
      if (medicos.length > 0) {
        setSelectedDoc(medicos[0].id);
      }
      setTitulo('');
      setTema('');
    }
  }, [isOpen, pacientePreseleccionado, pacientes, medicos]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const codPac = pacientePreseleccionado || selectedPac;
    if (!token || !codPac || !selectedDoc || !titulo.trim()) {
      toast.error('Completa los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      await createGrupo(token, codPac, selectedDoc, tema || titulo, titulo);
      toast.success('Tema de seguimiento creado exitosamente');
      onCreated('Tema de seguimiento creado');
      onClose();
    } catch {
      toast.error('Error al crear el tema');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      variant="minimal"
      maxWidth="max-w-lg"
      title="Agrupar Citas"
      subtitle="Crea un grupo para vincular citas de un mismo tratamiento o especialidad médica."
    >
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Paciente:
          </label>
          {pacientePreseleccionado && pacienteActualNombre ? (
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">{pacienteActualNombre}</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-md shrink-0">
                Preseleccionado
              </span>
            </div>
          ) : (
            <select
              value={selectedPac}
              onChange={(e) => setSelectedPac(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-hidden"
            >
              {pacientes.map((p) => {
                const nombreCorto = getPrimerNombrePrimerApellido({ nombreCompleto: p.nombreCompleto });
                const code = p.pacCodigo || p.pac_codigo;
                return (
                  <option key={code} value={code}>
                    {nombreCorto} {p.pacTitular ? '(Titular)' : ''}
                  </option>
                );
              })}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Médico Responsable:
          </label>
          <select
            value={selectedDoc}
            onChange={(e) => setSelectedDoc(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-hidden"
          >
            {medicos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Nombre del Grupo:
          </label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej. Control de Ortodoncia, Terapia Física, Diabetes..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-hidden"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Especialidad / Categoría (Opcional):
          </label>
          <input
            type="text"
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            placeholder="Ej. Odontología, Medicina General"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-hidden"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Creando...' : 'Crear Grupo'}
          </button>
        </div>
      </form>
    </AnimatedModal>
  );
}

export default function CitasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <NeoLoader />
        </div>
      }
    >
      <CitasContent />
    </Suspense>
  );
}
