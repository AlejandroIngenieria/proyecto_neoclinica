'use client';

import { Suspense, useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Filter,
  Search,
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
  ArrowLeftRight,
  Activity,
  Building2,
  BookOpen,
  CalendarClock,
  MoreVertical,
  Printer,
  Plus,
  Star,
  Unlink,
  MoreHorizontal,
  FolderPlus,
  FolderMinus,
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
  useSolicitudesCambioPendientes,
  useCancelarSolicitudCambio,
} from '@/hooks/use-flujo-citas';
import { usePacientesByUsuario } from '@/hooks/use-pacientes';
import { useDoctorByCode, useDoctors } from '@/hooks/use-doctors';
import { fetchGruposCita, createGrupo, updateCita } from '@/services/flujo-citas';
import type { CitaListDto, CitaEstado, GrupoCitaDto, SolicitudCambioDto } from '@/types/citas';
import { buildDoctorFullName } from '@/types/doctor';
import { AnimatedModal } from '@/components/animated-modal';
import { CitaCard } from '@/components/cita-card';
import { ModalResponderIntercambio } from '@/components/citas/ModalResponderIntercambio';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { withProgress } from '@/lib/request-handler';
import { ModalResenaMinimalista, ModalVerResena } from '@/components/citas/modal-resena-minimalista';
import { CitaDetailDrawer } from '@/components/citas/cita-detail-drawer';
import { imprimirCitaPdf } from '@/lib/imprimir-cita';

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

function formatHora12h(timeStr: string | undefined | null): string {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':');
  let h = parseInt(parts[0]);
  if (isNaN(h)) return timeStr.slice(0, 5);
  const m = parts[1] || '00';
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

function getStatusBadge(estado: CitaEstado) {
  switch (estado) {
    case 'confirmada':
      return <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-emerald-200">Confirmada</span>;
    case 'programada':
      return <span className="bg-sky-50 text-sky-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-sky-200">Programada</span>;
    case 'pospuesta':
      return <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-amber-200">Pospuesta</span>;
    case 'en_proceso':
      return (
        <span className="inline-flex items-center gap-1.5 bg-blue-500/15 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-blue-500/30 animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          En proceso
        </span>
      );
    case 'completada':
      return <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-emerald-200/80 dark:border-emerald-800/60">Completada</span>;
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
  align?: 'left' | 'right';
}

function CustomDropdown<T extends string = string>({
  value,
  onChange,
  onClear,
  options,
  icon,
  placeholder = 'Seleccionar...',
  className = '',
  align = 'left',
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
            className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 min-w-full w-max max-w-[320px] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-700 p-1.5 z-50 overflow-hidden`}
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


  // Sort all citas by date descending
  const citas = useMemo(() => {
    if (!citasData) return [];
    return [...citasData].sort((a, b) => new Date(b.ctaFecha).getTime() - new Date(a.ctaFecha).getTime());
  }, [citasData]);

  const searchParams = useSearchParams();

  // UI State
  const [tabActual, setTabActual] = useState<'proximas' | 'historial'>('proximas');
  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null);
  const [citaParaResenar, setCitaParaResenar] = useState<CitaListDto | null>(null);
  const [citaParaVerResena, setCitaParaVerResena] = useState<CitaListDto | null>(null);
  const [busquedaTexto, setBusquedaTexto] = useState<string>('');

  const updateUrlState = (paramsToUpdate: { pacienteId?: string | null; tab?: string; citaId?: string | null }) => {
    if (typeof window === 'undefined') return;
    const currentParams = new URLSearchParams(window.location.search);

    if (paramsToUpdate.pacienteId !== undefined) {
      if (paramsToUpdate.pacienteId) {
        currentParams.set('pacienteId', paramsToUpdate.pacienteId);
      } else {
        currentParams.delete('pacienteId');
        currentParams.delete('paciente');
      }
    }

    if (paramsToUpdate.tab !== undefined) {
      if (paramsToUpdate.tab) {
        currentParams.set('tab', paramsToUpdate.tab);
      } else {
        currentParams.delete('tab');
      }
    }

    if (paramsToUpdate.citaId !== undefined) {
      if (paramsToUpdate.citaId) {
        currentParams.set('citaId', paramsToUpdate.citaId);
      } else {
        currentParams.delete('citaId');
        currentParams.delete('cita');
        currentParams.delete('codCta');
        currentParams.delete('ctaCodigo');
      }
    }

    const queryStr = currentParams.toString();
    const newUrl = queryStr ? `${window.location.pathname}?${queryStr}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  };

  const handleSelectPaciente = (pacId: string, initialTab?: 'proximas' | 'historial') => {
    setSelectedPacienteId(pacId);
    if (initialTab) {
      setTabActual(initialTab);
      updateUrlState({ pacienteId: pacId, tab: initialTab });
    } else {
      updateUrlState({ pacienteId: pacId, tab: tabActual });
    }
  };

  const handleVolverPacientes = () => {
    setSelectedPacienteId(null);
    setBusquedaTexto('');
    updateUrlState({ pacienteId: null, citaId: null });
  };

  const handleTabChange = (newTab: 'proximas' | 'historial') => {
    setTabActual(newTab);
    updateUrlState({ tab: newTab });
  };
  const [isFiltrosPopoverOpen, setIsFiltrosPopoverOpen] = useState(false);
  const filtrosPopoverRef = useRef<HTMLDivElement>(null);
  const [medicoSeleccionado, setMedicoSeleccionado] = useState<string>('');
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>('');
  const [modalidadSeleccionada, setModalidadSeleccionada] = useState<string>('');
  const [linkGroupCita, setLinkGroupCita] = useState<CitaListDto | null>(null);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState<'todas' | '24hrs' | 'semana'>('todas');
  const [viewFilter, setViewFilter] = useState<'todas' | 'unicas' | 'series'>('todas');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isConsultasIndividualesOpen, setIsConsultasIndividualesOpen] = useState(true);
  const [isSeriesSectionOpen, setIsSeriesSectionOpen] = useState(true);
  const [showIndependientesCitas, setShowIndependientesCitas] = useState<boolean>(false);

  // Solicitudes de intercambio de horario pendientes
  const { data: solicitudesPendientes = [], refetch: refetchSolicitudes } = useSolicitudesCambioPendientes();
  const cancelarSolicitudMutation = useCancelarSolicitudCambio();
  const [solicitudParaResponder, setSolicitudParaResponder] = useState<SolicitudCambioDto | null>(null);
  const [solicitudACancelar, setSolicitudACancelar] = useState<SolicitudCambioDto | null>(null);

  const solicitudesRecibidas = useMemo(() => {
    return solicitudesPendientes.filter(
      (s) => s.tipoRelacion === 'recibida' && s.estado === 'pendiente'
    );
  }, [solicitudesPendientes]);

  const solicitudesEnviadas = useMemo(() => {
    return solicitudesPendientes.filter(
      (s) => s.tipoRelacion === 'enviada' && s.estado === 'pendiente'
    );
  }, [solicitudesPendientes]);

  const mapaSolicitudesPorCita = useMemo(() => {
    const map = new Map<string, SolicitudCambioDto>();
    solicitudesEnviadas.forEach((s) => {
      map.set(s.citaSolicitanteId, s);
    });
    solicitudesRecibidas.forEach((s) => {
      map.set(s.citaObjetivoId, s);
    });
    return map;
  }, [solicitudesRecibidas, solicitudesEnviadas]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (viewFilter !== 'todas') count++;
    if (tabActual === 'proximas' && quickFilter !== 'todas') count++;
    if (medicoSeleccionado !== '') count++;
    if (grupoSeleccionado !== '') count++;
    if (modalidadSeleccionada !== '') count++;
    if (busquedaTexto !== '') count++;
    return count;
  }, [viewFilter, quickFilter, medicoSeleccionado, grupoSeleccionado, modalidadSeleccionada, busquedaTexto, tabActual]);

  // Cerrar popover de filtros al hacer clic fuera
  useEffect(() => {
    if (!isFiltrosPopoverOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (filtrosPopoverRef.current && !filtrosPopoverRef.current.contains(event.target as Node)) {
        setIsFiltrosPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFiltrosPopoverOpen]);

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

  const activePacCodigo = selectedPacienteId || pacientePrincipal?.pacCodigo || null;
  const { data: gruposMap } = useGruposMap(activePacCodigo, medicosUnicosIds);

  const citasConTemas = useMemo(() => {
    const now = new Date();
    return citas.map((c) => {
      let isPast = false;
      try {
        const citaDateTime = new Date(`${c.ctaFecha.split('T')[0]}T${c.ctaHora || '00:00:00'}`);
        if (citaDateTime < now) {
          isPast = true;
        }
      } catch (e) {}

      return {
        ...c,
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
        pacEstado?: string;
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
        pacEstado: p.pac_estado,
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
          pacEstado: c.pacienteEstado || 'activo',
        });
      }
    });

    return Array.from(map.values());
  }, [pacientesUsuario, pacientesSeleccion, citasConTemas]);

  // Sincronización segura de URL al montar / recibir parámetros (enlaces de correos con citaId o pacienteId)
  const urlHandledRef = useRef(false);

  useEffect(() => {
    if (loadingCitas || loadingPacientes) return;
    if (urlHandledRef.current) return;

    const urlCitaId = searchParams.get('citaId') || searchParams.get('cita') || searchParams.get('codCta') || searchParams.get('ctaCodigo');
    const urlPacId = searchParams.get('pacienteId') || searchParams.get('paciente');
    const urlTab = searchParams.get('tab');
    const urlResena = searchParams.get('resena') || searchParams.get('review');
    const urlBuscar = searchParams.get('q') || searchParams.get('search') || searchParams.get('buscar');

    if (urlCitaId) {
      const citaEncontrada = citas.find(
        (c) => c.ctaCodigo?.toLowerCase() === urlCitaId.toLowerCase() || String(c.ctaCodigo) === urlCitaId
      );

      if (citaEncontrada) {
        urlHandledRef.current = true;
        setSelectedPacienteId(citaEncontrada.ctaCodpac);
        const cleanEst = (citaEncontrada.ctaEstado || '').toLowerCase().trim();
        const isPast = isCitaPasada(citaEncontrada.ctaFecha, citaEncontrada.ctaHora);
        const isHist = ['cancelada', 'no_asistio', 'completada', 'finalizada', 'realizada'].includes(cleanEst) || isPast;
        const targetTab: 'proximas' | 'historial' = isHist ? 'historial' : 'proximas';
        setTabActual(targetTab);

        setBusquedaTexto(citaEncontrada.ctaCodigo);
        updateUrlState({ pacienteId: citaEncontrada.ctaCodpac, tab: targetTab, citaId: citaEncontrada.ctaCodigo });

        const yaTiene = typeof citaEncontrada.ctaCalificacion === 'number' && citaEncontrada.ctaCalificacion > 0;
        if (urlResena || targetTab === 'historial') {
          if (!yaTiene) {
            setCitaParaResenar(citaEncontrada);
          } else {
            setCitaParaVerResena(citaEncontrada);
          }
        }
        return;
      } else if (citas.length > 0) {
        toast.error('No se encontró la cita especificada o no pertenece a tu cuenta.');
      }
    }

    if (urlPacId) {
      const esValido = codigosPacientes.includes(urlPacId);
      if (esValido) {
        urlHandledRef.current = true;
        setSelectedPacienteId(urlPacId);
        if (urlTab === 'historial' || urlTab === 'proximas') {
          setTabActual(urlTab);
        }
        if (urlBuscar) {
          setBusquedaTexto(urlBuscar);
        }
        return;
      }
    }

    // Auto-seleccionar paciente si la cuenta solo tiene un paciente (ej. cuenta independizada o individual)
    if (pacientesTabsList.length === 1 && !selectedPacienteId) {
      setSelectedPacienteId(pacientesTabsList[0].pacCodigo);
      updateUrlState({ pacienteId: pacientesTabsList[0].pacCodigo });
    }
  }, [citas, codigosPacientes, loadingCitas, loadingPacientes, pacientesTabsList, searchParams, selectedPacienteId]);


  const medicosUnicos = useMemo(() => {
    const map = new Map<string, string>();
    citasConTemas.forEach((c) => map.set(c.ctaCoddoc, c.medicoNombre));
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [citasConTemas]);

  const gruposUnicos = useMemo(() => {
    const map = new Map<string, { id: string; tema: string; medicoNombre?: string }>();
    citasConTemas.forEach((c) => {
      // Filtrar únicamente los grupos del paciente actual si hay paciente seleccionado
      if (selectedPacienteId && c.ctaCodpac !== selectedPacienteId) return;
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
  }, [citasConTemas, selectedPacienteId]);

  // Limpiar filtros al cambiar de paciente
  useEffect(() => {
    setGrupoSeleccionado('');
    setMedicoSeleccionado('');
    setModalidadSeleccionada('');
    setBusquedaTexto('');
    setIsFiltrosPopoverOpen(false);
  }, [selectedPacienteId]);

  // Citas categorizadas para el Tab actual y Filtros activos
  const citasFiltradas = useMemo(() => {
    const now = new Date();
    const msIn24Hrs = 24 * 60 * 60 * 1000;
    const msInWeek = 7 * 24 * 60 * 60 * 1000;
    const historialEstados = [
      'cancelada',
      'no_asistio',
      'noasistio',
      'no_asistió',
      'completada',
      'finalizada',
      'atendida',
      'atendido',
      'realizada',
      'rechazada',
    ];

    return citasConTemas.filter((c) => {
      // Filtro de Búsqueda Libre (ID de Cita, Médico, Especialidad, Servicio, etc.)
      if (busquedaTexto.trim()) {
        const query = busquedaTexto.toLowerCase().trim();
        const codigo = String(c.ctaCodigo || '').toLowerCase();
        const medico = (c.medicoNombre || '').toLowerCase();
        const especialidad = (c.medicoEspecialidad || '').toLowerCase();
        const servicio = (c.servicioNombre || '').toLowerCase();
        const grupo = (c.grupoTema || '').toLowerCase();
        const modalidad = (c.ctaModalidad || '').toLowerCase();
        const motivo = (c.ctaMotivo || '').toLowerCase();
        const clinica = (c.clinicaNombre || '').toLowerCase();
        const match =
          codigo.includes(query) ||
          medico.includes(query) ||
          especialidad.includes(query) ||
          servicio.includes(query) ||
          grupo.includes(query) ||
          modalidad.includes(query) ||
          motivo.includes(query) ||
          clinica.includes(query);
        if (!match) return false;
      }

      // Filtro de Médico
      if (medicoSeleccionado && c.ctaCoddoc !== medicoSeleccionado) return false;
      // Filtro de Grupo
      if (grupoSeleccionado && c.ctaGrupoId !== grupoSeleccionado) return false;
      // Filtro de Modalidad
      if (modalidadSeleccionada) {
        const modNorm = (c.ctaModalidad || '').toLowerCase().trim();
        if (modNorm !== modalidadSeleccionada.toLowerCase().trim()) return false;
      }

      const estadoNorm = (c.ctaEstado || '').toLowerCase().trim();
      const isPast = isCitaPasada(c.ctaFecha, c.ctaHora);
      const isHistorial = historialEstados.includes(estadoNorm) || isPast;
      const isUpcoming = !isHistorial;

      const activeTab = tabActual;
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
  }, [citasConTemas, medicoSeleccionado, grupoSeleccionado, modalidadSeleccionada, busquedaTexto, tabActual, quickFilter, viewFilter]);

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

      let completadas = 0;
      let canceladas = 0;
      citasConTemas.forEach((c) => {
        if (c.ctaCodpac !== pac.pacCodigo) return;
        const est = (c.ctaEstado || '').toLowerCase().trim();
        if (['completada', 'finalizada', 'atendida', 'atendido', 'realizada'].includes(est)) {
          completadas += 1;
        } else if (est === 'cancelada' || est === 'rechazada') {
          canceladas += 1;
        }
      });

      return {
        paciente: pac,
        standalone,
        series: seriesMap,
        seriesStats,
        totalCitas: citasPaciente.length,
        completadasCount: completadas,
        canceladasCount: canceladas,
      };
    }).filter(({ paciente: pac, totalCitas }) => {
      // Pacientes independizados solo se muestran si conservan citas en esta cuenta
      if (pac.pacEstado === 'independizado' && totalCitas === 0) return false;
      return true;
    });
  }, [pacientesTabsList, citasFiltradas, citasConTemas, tabActual]);

  const seccionesActivos = useMemo(
    () => seccionesPorPaciente.filter((s) => s.paciente.pacEstado !== 'independizado'),
    [seccionesPorPaciente]
  );

  const seccionesIndependientes = useMemo(
    () => seccionesPorPaciente.filter((s) => s.paciente.pacEstado === 'independizado'),
    [seccionesPorPaciente]
  );

  // Estado para vista Master-Detail de pacientes
  const selectedSection = useMemo(() => {
    if (!selectedPacienteId) return null;
    return seccionesPorPaciente.find((s) => s.paciente.pacCodigo === selectedPacienteId) || null;
  }, [seccionesPorPaciente, selectedPacienteId]);

  // Conteo específico para el paciente seleccionado (Próximas vs Historial vs Completadas vs Canceladas)
  const {
    pacienteProximasCount,
    pacienteHistorialCount,
    pacienteCompletadasCount,
    pacienteCanceladasCount,
  } = useMemo(() => {
    if (!selectedPacienteId) {
      return {
        pacienteProximasCount: 0,
        pacienteHistorialCount: 0,
        pacienteCompletadasCount: 0,
        pacienteCanceladasCount: 0,
      };
    }
    const historialEstados = [
      'cancelada',
      'no_asistio',
      'noasistio',
      'no_asistió',
      'completada',
      'finalizada',
      'atendida',
      'atendido',
      'realizada',
      'rechazada',
    ];
    const pacCitas = citasConTemas.filter((c) => c.ctaCodpac === selectedPacienteId);
    const historial = pacCitas.filter((c) =>
      historialEstados.includes((c.ctaEstado || '').toLowerCase().trim()) || isCitaPasada(c.ctaFecha, c.ctaHora)
    ).length;
    const proximas = pacCitas.filter((c) =>
      !historialEstados.includes((c.ctaEstado || '').toLowerCase().trim()) && !isCitaPasada(c.ctaFecha, c.ctaHora)
    ).length;
    const completadas = pacCitas.filter((c) =>
      ['completada', 'finalizada', 'atendida', 'atendido', 'realizada'].includes((c.ctaEstado || '').toLowerCase().trim())
    ).length;
    const canceladas = pacCitas.filter((c) =>
      ['cancelada', 'rechazada'].includes((c.ctaEstado || '').toLowerCase().trim())
    ).length;
    return {
      pacienteProximasCount: proximas,
      pacienteHistorialCount: historial,
      pacienteCompletadasCount: completadas,
      pacienteCanceladasCount: canceladas,
    };
  }, [citasConTemas, selectedPacienteId]);

  // Si el paciente seleccionado no tiene citas próximas pero sí tiene citas en el historial, abrir automáticamente la pestaña de historial
  useEffect(() => {
    if (selectedPacienteId && pacienteProximasCount === 0 && pacienteHistorialCount > 0) {
      setTabActual('historial');
    }
  }, [selectedPacienteId, pacienteProximasCount, pacienteHistorialCount]);

  // Conteo global de todas las citas del usuario para el tab bar principal (Próximas vs Historial)
  const { totalProximasGlobal, totalHistorialGlobal } = useMemo(() => {
    const historialEstados = [
      'cancelada',
      'no_asistio',
      'noasistio',
      'no_asistió',
      'completada',
      'finalizada',
      'atendida',
      'atendido',
      'realizada',
      'rechazada',
    ];
    let prox = 0;
    let hist = 0;
    citasConTemas.forEach((c) => {
      const est = (c.ctaEstado || '').toLowerCase().trim();
      const isPast = isCitaPasada(c.ctaFecha, c.ctaHora);
      if (historialEstados.includes(est) || isPast) {
        hist += 1;
      } else {
        prox += 1;
      }
    });
    return { totalProximasGlobal: prox, totalHistorialGlobal: hist };
  }, [citasConTemas]);

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
                </div>

                {/* ── Banner de Solicitudes de Intercambio Pendientes ── */}
                {solicitudesRecibidas.length > 0 && (
                  <div className="rounded-3xl border-2 border-orange-300 dark:border-orange-700/80 bg-gradient-to-br from-orange-50/90 via-amber-50/40 to-white dark:from-orange-950/30 dark:via-slate-900 dark:to-slate-900 p-5 sm:p-6 shadow-md shadow-orange-500/5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
                          <ArrowLeftRight className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                              Solicitudes de Cambio de Horario
                            </h2>
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-orange-600 text-white font-black tracking-wide uppercase">
                              {solicitudesRecibidas.length} {solicitudesRecibidas.length === 1 ? 'pendiente' : 'pendientes'}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                            Otro paciente solicita intercambiar turno con una de tus citas. Revisa y responde directamente sin entrar a cada paciente.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {solicitudesRecibidas.map((sol) => (
                        <div
                          key={sol.solCodigo}
                          className="relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-orange-200 dark:border-orange-800/60 shadow-sm hover:shadow-md transition-all space-y-3.5"
                        >
                          {/* Header de la tarjeta */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              {/* Paciente afectado claramente identificado */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 inline-flex items-center gap-1">
                                  <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                  Cita de: {sol.objetivoNombre}
                                </span>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                                  Dr(a). {sol.medicoNombre}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                <strong className="text-slate-700 dark:text-slate-200">{sol.solicitanteNombre}</strong> solicita este turno
                              </p>
                            </div>
                          </div>

                          {/* Comparación visual de turnos */}
                          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 text-xs">
                            {/* Turno Actual del Paciente */}
                            <div className="space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                                Tu cita solicitada
                              </span>
                              <p className="font-extrabold text-slate-800 dark:text-slate-200 leading-tight">
                                {safeFormatDate(sol.objetivoFechaActual || sol.fechaDeseada, "d 'de' MMM")}
                              </p>
                              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                {formatHora12h(sol.objetivoHoraActual || sol.horaDeseada)}
                              </p>
                            </div>

                            {/* Turno que ofrece a cambio */}
                            <div className="space-y-1 border-l border-slate-200 dark:border-slate-700 pl-2.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                                Te ofrece a cambio
                              </span>
                              <p className="font-extrabold text-emerald-700 dark:text-emerald-300 leading-tight">
                                {safeFormatDate(sol.solicitanteFechaActual, "d 'de' MMM")}
                              </p>
                              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                {formatHora12h(sol.solicitanteHoraActual)}
                              </p>
                            </div>
                          </div>

                          {/* Mensaje opcional si existe */}
                          {sol.mensaje && (
                            <p className="text-xs italic text-slate-600 dark:text-slate-400 bg-amber-50/80 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
                              "{sol.mensaje}"
                            </p>
                          )}

                          {/* Acciones */}
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPacienteId(sol.objetivoPacCodigo);
                                setTabActual('proximas');
                              }}
                              className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                            >
                              Ver citas de {sol.objetivoNombre.split(' ')[0]} →
                            </button>

                            <button
                              type="button"
                              onClick={() => setSolicitudParaResponder(sol)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black shadow-sm hover:shadow transition active:scale-95 cursor-pointer"
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                              <span>Responder Solicitud</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Banner de Solicitudes de Intercambio Enviadas (Pendientes) ── */}
                {solicitudesEnviadas.length > 0 && (
                  <div className="rounded-3xl border-2 border-amber-300 dark:border-amber-700/80 bg-gradient-to-br from-amber-50/90 via-orange-50/30 to-white dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900 p-5 sm:p-6 shadow-md shadow-amber-500/5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0">
                          <Clock className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                              Solicitudes de Cambio Enviadas
                            </h2>
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-600 text-white font-black tracking-wide uppercase">
                              {solicitudesEnviadas.length} {solicitudesEnviadas.length === 1 ? 'en trámite' : 'en trámite'}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                            Has solicitado intercambiar horario con otros pacientes. Puedes revisar o cancelar tus solicitudes en cualquier momento.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {solicitudesEnviadas.map((sol) => (
                        <div
                          key={sol.solCodigo}
                          className="relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-amber-200 dark:border-amber-800/60 shadow-sm hover:shadow-md transition-all space-y-3.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  Petición enviada
                                </span>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                                  Dr(a). {sol.medicoNombre}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Para la cita de: <strong className="text-slate-700 dark:text-slate-200">{sol.solicitanteNombre}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 text-xs">
                            <div className="space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                                Turno deseado
                              </span>
                              <p className="font-extrabold text-slate-800 dark:text-slate-200 leading-tight">
                                {safeFormatDate(sol.fechaDeseada, "d 'de' MMM")}
                              </p>
                              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                {formatHora12h(sol.horaDeseada)}
                              </p>
                            </div>

                            <div className="space-y-1 border-l border-slate-200 dark:border-slate-700 pl-2.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                                Cita que ofreces
                              </span>
                              <p className="font-extrabold text-slate-800 dark:text-slate-200 leading-tight">
                                {safeFormatDate(sol.solicitanteFechaActual, "d 'de' MMM")}
                              </p>
                              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                {formatHora12h(sol.solicitanteHoraActual)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setSolicitudACancelar(sol)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold transition active:scale-95 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Cancelar solicitud</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cuadrícula de Pacientes Activos */}
                {seccionesActivos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                    {seccionesActivos.map(({ paciente: pac, standalone, series, totalCitas, completadasCount, canceladasCount }) => {
                      const solicitudesDelPaciente = solicitudesRecibidas.filter(
                        (s) => s.objetivoPacCodigo === pac.pacCodigo
                      );
                      return (
                        <PatientCard
                          key={pac.pacCodigo}
                          paciente={pac}
                          totalCitas={totalCitas}
                          completadasCount={completadasCount}
                          canceladasCount={canceladasCount}
                          standalone={standalone}
                          series={series}
                          tabActual={tabActual}
                          solicitudesCount={solicitudesDelPaciente.length}
                          onSelect={() => {
                            handleSelectPaciente(
                              pac.pacCodigo,
                              totalCitas === 0 && (completadasCount > 0 || canceladasCount > 0) ? 'historial' : 'proximas'
                            );
                          }}
                          onAgendar={() => router.push(`/dashboard/directorio?paciente=${pac.pacCodigo}`)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2 shadow-xs">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      No tienes pacientes o citas activas en esta vista.
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Puedes revisar las citas de los pacientes independizados en el historial inferior.
                    </p>
                  </div>
                )}

                {/* Sección de Cuentas Independientes (Registro Histórico) */}
                {seccionesIndependientes.length > 0 && (
                  <div className="mt-10 pt-8 border-t border-slate-200/80 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                          <UserCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                              Historial de Cuentas Independientes
                            </h2>
                            <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                              {seccionesIndependientes.length}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Citas de pacientes que fueron independizados y ahora gestionan su propia cuenta médica.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowIndependientesCitas((prev) => !prev)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
                      >
                        <span>
                          {showIndependientesCitas
                            ? 'Ocultar cuentas independientes'
                            : `Ver cuentas independientes (${seccionesIndependientes.length})`}
                        </span>
                        {showIndependientesCitas ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Desplegable animado de independientes */}
                    <AnimatePresence>
                      {showIndependientesCitas && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden pt-6"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                            {seccionesIndependientes.map(({ paciente: pac, standalone, series, totalCitas, completadasCount, canceladasCount }) => {
                              const solicitudesDelPaciente = solicitudesRecibidas.filter(
                                (s) => s.objetivoPacCodigo === pac.pacCodigo
                              );
                              return (
                                <PatientCard
                                  key={pac.pacCodigo}
                                  paciente={pac}
                                  totalCitas={totalCitas}
                                  completadasCount={completadasCount}
                                  canceladasCount={canceladasCount}
                                  standalone={standalone}
                                  series={series}
                                  tabActual={tabActual}
                                  solicitudesCount={solicitudesDelPaciente.length}
                                  onSelect={() => {
                                    handleSelectPaciente(pac.pacCodigo, 'historial');
                                  }}
                                  onAgendar={() => {}}
                                />
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

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
                {/* ── Encabezado: Solo botón Volver a pacientes a la izquierda ── */}
                <div className="flex items-center pb-1">
                  {pacientesTabsList.length > 1 ? (
                    <button
                      type="button"
                      onClick={handleVolverPacientes}
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

                {/* Banner de Registro Histórico para Pacientes Independizados */}
                {selectedSection.paciente.pacEstado === 'independizado' && (
                  <div className="flex items-start gap-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/40 p-4 text-xs sm:text-sm text-indigo-950 dark:text-indigo-200 shadow-2xs">
                    <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-indigo-900 dark:text-indigo-100">
                        Cuenta Independizada · Registro Histórico
                      </span>
                      <p className="text-indigo-800 dark:text-indigo-300 text-xs mt-0.5 leading-relaxed">
                        Este paciente ahora cuenta con una cuenta médica propia e independiente en NeoClínica y gestiona sus citas de forma autónoma. Las citas aquí presentes corresponden al historial previo a su proceso de independización.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Barra de Navegación de Citas del Paciente (Pestañas Próximas / Historial + Filtros + Nueva Cita) ── */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-0 pt-1">
                  {/* Pestañas Tradicionales (Extremo Izquierdo) */}
                  <nav className="flex items-center gap-6 sm:gap-8 -mb-px overflow-x-auto scrollbar-none">
                    <button
                      type="button"
                      onClick={() => handleTabChange('proximas')}
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
                      onClick={() => handleTabChange('historial')}
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

                  {/* Nueva Barra de Búsqueda y Filtros (Píldora) */}
                  <div ref={filtrosPopoverRef} className="relative pb-2.5 sm:pb-3 w-full sm:w-auto flex-1 sm:max-w-xl sm:ml-auto">
                    <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full h-10 pl-4 pr-1 shadow-sm w-full max-w-xl transition-all focus-within:ring-2 focus-within:ring-[#11698E]/20 focus-within:border-[#11698E]">
                      {/* Input de Búsqueda Libre */}
                      <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2 shrink-0"/>
                      <input 
                        type="text" 
                        value={busquedaTexto}
                        onChange={(e) => setBusquedaTexto(e.target.value)}
                        placeholder="Buscar por médico, ID de cita, servicio o modalidad..." 
                        className="bg-transparent border-none outline-none text-sm w-full text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                      {busquedaTexto && (
                        <button
                          type="button"
                          onClick={() => setBusquedaTexto('')}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer mr-1"
                          title="Limpiar búsqueda"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      
                      {/* Divisor y Botón de Filtros Avanzados */}
                      <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-2 ml-2 shrink-0">
                        <button 
                          type="button"
                          onClick={() => setIsFiltrosPopoverOpen((prev) => !prev)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                            medicoSeleccionado || grupoSeleccionado || modalidadSeleccionada
                              ? 'text-[#11698E] bg-[#11698E]/10 dark:text-sky-400 dark:bg-sky-950/40'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <Filter className="w-3.5 h-3.5"/>
                          <span>Filtros</span>
                          {(medicoSeleccionado || grupoSeleccionado || modalidadSeleccionada) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#11698E] dark:bg-sky-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Popover de Filtros Avanzados */}
                    {isFiltrosPopoverOpen && (
                      <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 z-50 space-y-3.5">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                          <div className="flex items-center gap-1.5">
                            <Filter className="w-4 h-4 text-[#11698E] dark:text-sky-400" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Filtros Avanzados</span>
                          </div>
                          {(medicoSeleccionado || grupoSeleccionado || modalidadSeleccionada) && (
                            <button
                              type="button"
                              onClick={() => {
                                setMedicoSeleccionado('');
                                setGrupoSeleccionado('');
                                setModalidadSeleccionada('');
                              }}
                              className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 cursor-pointer"
                            >
                              Limpiar
                            </button>
                          )}
                        </div>

                        {/* 1. Médicos */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Médico</label>
                          <CustomDropdown
                            className="w-full"
                            value={medicoSeleccionado}
                            onChange={setMedicoSeleccionado}
                            onClear={() => setMedicoSeleccionado('')}
                            options={[
                              { value: '', label: 'Todos los médicos' },
                              ...medicosUnicos.map((m) => ({ value: m.id, label: m.nombre })),
                            ]}
                            icon={<User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />}
                          />
                        </div>

                        {/* 2. Grupos */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Grupo o Tema</label>
                          <CustomDropdown
                            className="w-full"
                            value={grupoSeleccionado}
                            onChange={setGrupoSeleccionado}
                            onClear={() => setGrupoSeleccionado('')}
                            options={
                              gruposUnicos.length > 0
                                ? [
                                    { value: '', label: 'Todos los grupos' },
                                    ...gruposUnicos.map((g) => ({ value: g.id, label: g.tema })),
                                  ]
                                : [{ value: '', label: 'Sin grupos' }]
                            }
                            icon={<FolderPlus className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />}
                          />
                        </div>

                        {/* 3. Modalidad */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Modalidad</label>
                          <CustomDropdown
                            className="w-full"
                            align="right"
                            value={modalidadSeleccionada}
                            onChange={setModalidadSeleccionada}
                            onClear={() => setModalidadSeleccionada('')}
                            options={[
                              { value: '', label: 'Todas las modalidades' },
                              { value: 'presencial', label: 'Presencial' },
                              { value: 'virtual', label: 'Virtual' },
                              { value: 'domicilio', label: 'A Domicilio' },
                            ]}
                            icon={<Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Banner de Solicitudes de Intercambio Recibidas */}
                {solicitudesRecibidas.length > 0 && (
                  <div className="mb-5 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 border-2 border-orange-300 dark:border-orange-700/80 shadow-md shadow-orange-500/5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-md">
                          <ArrowLeftRight className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-200 dark:bg-orange-900/80 text-orange-900 dark:text-orange-200">
                              Intercambio de horario
                            </span>
                            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                              {solicitudesRecibidas.length === 1 ? '1 solicitud pendiente' : `${solicitudesRecibidas.length} solicitudes pendientes`}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                            {solicitudesRecibidas.length === 1
                              ? `${solicitudesRecibidas[0].solicitanteNombre} solicita intercambiar su turno por el tuyo`
                              : 'Otros pacientes han solicitado intercambiar turnos con tus citas'}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                            Puedes aceptar cediendo tu horario (y elegir un nuevo horario o cancelar tu cita) o rechazarla.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSolicitudParaResponder(solicitudesRecibidas[0])}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-2 shrink-0"
                      >
                        <span>Revisar solicitud</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Contenido de Citas del Paciente */}
                {selectedSection.totalCitas === 0 ? (
                  <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-2xs">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner">
                      <CalendarDays className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        Sin citas {tabActual === 'proximas' ? 'próximas' : 'en el historial'}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        {selectedSection.paciente.primerNombre} no tiene citas {tabActual === 'proximas' ? 'programadas en este momento' : 'registradas en el historial'}.
                      </p>
                    </div>

                    {/* Resumen de Citas Completadas y Canceladas */}
                    {tabActual === 'proximas' && (
                      <div className="pt-1 pb-1 max-w-sm mx-auto w-full">
                        <div className="grid grid-cols-2 gap-3">
                          {/* Card Completadas */}
                          <button
                            type="button"
                            onClick={() => setTabActual('historial')}
                            className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/40 flex items-center gap-3 text-left hover:border-emerald-300 dark:hover:border-emerald-700 transition cursor-pointer group shadow-2xs"
                            title="Ver citas completadas en el historial"
                          >
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 leading-none block">
                                {pacienteCompletadasCount}
                              </span>
                              <span className="text-[11px] font-bold text-emerald-600/90 dark:text-emerald-400/90 truncate block mt-0.5">
                                {pacienteCompletadasCount === 1 ? 'Completada' : 'Completadas'}
                              </span>
                            </div>
                          </button>

                          {/* Card Canceladas */}
                          <button
                            type="button"
                            onClick={() => setTabActual('historial')}
                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3 text-left hover:border-slate-300 dark:hover:border-slate-600 transition cursor-pointer group shadow-2xs"
                            title="Ver citas canceladas en el historial"
                          >
                            <div className="w-10 h-10 rounded-xl bg-rose-500/15 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <XCircle className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-lg font-black text-slate-800 dark:text-slate-200 leading-none block">
                                {pacienteCanceladasCount}
                              </span>
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                                {pacienteCanceladasCount === 1 ? 'Cancelada' : 'Canceladas'}
                              </span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedSection.paciente.pacEstado !== 'independizado' ? (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/directorio?paciente=${selectedSection.paciente.pacCodigo}`)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/60 dark:border-blue-800/40 transition active:scale-95 cursor-pointer shadow-2xs"
                        >
                          <CalendarPlus className="w-4 h-4" />
                          Agendar para {selectedSection.paciente.primerNombre}
                        </button>
                      </div>
                    ) : (
                      <div className="pt-2">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                          <UserCheck className="w-4 h-4 text-slate-400" />
                          Paciente independizado (cuenta propia activa)
                        </span>
                      </div>
                    )}
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
                          className="w-full flex items-center justify-between py-1.5 px-0.5 bg-transparent select-none text-left cursor-pointer transition-none"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                              <CalendarIcon className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              Consultas Individuales ({selectedSection.standalone.length})
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500">
                            <span className="text-[11px] font-bold hidden sm:inline text-slate-400 dark:text-slate-500">
                              {isConsultasIndividualesOpen ? 'Minimizar' : 'Mostrar'}
                            </span>
                            <div className="w-6 h-6 flex items-center justify-center text-slate-400 dark:text-slate-500">
                              {isConsultasIndividualesOpen ? (
                                <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                              ) : (
                                <ChevronDown className="w-4 h-4 stroke-[2.5]" />
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
                                      solicitudCambio={mapaSolicitudesPorCita.get(cita.ctaCodigo)}
                                      onResponderSolicitud={(s) => setSolicitudParaResponder(s)}
                                      onCancelarSolicitud={(s) => setSolicitudACancelar(s)}
                                      isPast={
                                        isCitaPasada(cita.ctaFecha, cita.ctaHora) ||
                                        ['cancelada', 'rechazada', 'completada', 'no_asistio'].includes(cita.ctaEstado)
                                      }
                                      onModify={(c) => router.push(`/dashboard/citas/${c.ctaCodigo}/editar`)}
                                      onCancel={(c) => handleConfirmCancel(c)}
                                      onLinkGroup={(c) => setLinkGroupCita(c)}
                                      onReview={(c) => setCitaParaResenar(c)}
                                      onVerResena={(c) => setCitaParaVerResena(c)}
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
                          className="w-full flex items-center justify-between py-1.5 px-0.5 bg-transparent select-none text-left cursor-pointer transition-none"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-sky-100/80 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                              <RefreshCw className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              Grupos ({Object.keys(selectedSection.series).length})
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500">
                            <span className="text-[11px] font-bold hidden sm:inline text-slate-400 dark:text-slate-500">
                              {isSeriesSectionOpen ? 'Minimizar' : 'Mostrar'}
                            </span>
                            <div className="w-6 h-6 flex items-center justify-center text-slate-400 dark:text-slate-500">
                              {isSeriesSectionOpen ? (
                                <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                              ) : (
                                <ChevronDown className="w-4 h-4 stroke-[2.5]" />
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
                                    mapaSolicitudesPorCita={mapaSolicitudesPorCita}
                                    onResponderSolicitud={(s) => setSolicitudParaResponder(s)}
                                    onCancelarSolicitud={(s) => setSolicitudACancelar(s)}
                                    onReview={(c) => setCitaParaResenar(c)}
                                    onVerResena={(c) => setCitaParaVerResena(c)}
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

                      {selectedSection.paciente.pacEstado !== 'independizado' ? (
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/directorio?paciente=${selectedSection.paciente.pacCodigo}`)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 shadow-2xs transition active:scale-95 cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Ir al directorio médico</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500 italic flex items-center gap-1.5 py-1">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          Paciente independizado (cuenta propia activa)
                        </span>
                      )}
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

      {/* Modal de confirmación para cancelar solicitud de cambio enviada */}
      <ConfirmModal
        isOpen={!!solicitudACancelar}
        onClose={() => setSolicitudACancelar(null)}
        onConfirm={() => {
          if (!solicitudACancelar) return;
          cancelarSolicitudMutation.mutate(
            {
              solCodigo: solicitudACancelar.solCodigo,
              motivo: 'Cancelada voluntariamente por el paciente desde el listado de citas',
            },
            {
              onSuccess: () => {
                toast.success('Solicitud de cambio cancelada correctamente');
                refetchSolicitudes();
                setSolicitudACancelar(null);
              },
              onError: (err: any) => {
                toast.error(err?.message || 'Error al cancelar la solicitud de cambio');
              },
            }
          );
        }}
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

      {/* Modal para Responder Solicitud de Intercambio de Horario */}
      {solicitudParaResponder && (
        <ModalResponderIntercambio
          isOpen={!!solicitudParaResponder}
          onClose={() => {
            setSolicitudParaResponder(null);
            refetchSolicitudes();
          }}
          solicitud={solicitudParaResponder}
        />
      )}

      {/* Modal Minimalista para Realizar Reseña */}
      <ModalResenaMinimalista
        isOpen={!!citaParaResenar}
        onClose={() => {
          setCitaParaResenar(null);
          updateUrlState({ citaId: null });
        }}
        cita={citaParaResenar}
        onSuccess={() => {
          setCitaParaResenar(null);
          updateUrlState({ citaId: null });
        }}
      />

      {/* Modal Minimalista para Ver Reseña Registrada */}
      <ModalVerResena
        isOpen={!!citaParaVerResena}
        onClose={() => {
          setCitaParaVerResena(null);
          updateUrlState({ citaId: null });
        }}
        cita={citaParaVerResena}
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
    pacEstado?: string;
  };
  totalCitas: number;
  completadasCount?: number;
  canceladasCount?: number;
  standalone: CitaListDto[];
  series: Record<string, CitaListDto[]>;
  tabActual: 'proximas' | 'historial';
  solicitudesCount?: number;
  onSelect: () => void;
  onAgendar?: () => void;
}

function PatientCard({
  paciente: pac,
  totalCitas,
  completadasCount = 0,
  canceladasCount = 0,
  standalone,
  series,
  tabActual,
  solicitudesCount = 0,
  onSelect,
}: PatientCardProps) {
  const router = useRouter();
  const initial = pac.primerNombre ? pac.primerNombre.charAt(0).toUpperCase() : 'P';
  const hasCitas = totalCitas > 0;
  const isIndependiente = pac.pacEstado === 'independizado' || pac.pacEstado === 'independiente';

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

  const tieneCitaParaCola = Boolean(
    proximaCita &&
    tabActual === 'proximas' &&
    !['cancelada', 'rechazada', 'completada', 'no_asistio'].includes((proximaCita.ctaEstado || '').toLowerCase())
  );

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2 }}
      onClick={onSelect}
      className={`group relative flex flex-col justify-between p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden ${
        isIndependiente
          ? 'border-indigo-200/90 dark:border-indigo-900/60 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-indigo-500/5'
          : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600'
      }`}
    >
      {/* Indicador de acento en hover */}
      <div
        className={`absolute top-0 inset-x-0 h-1 transition-opacity ${
          isIndependiente
            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 opacity-80'
            : 'bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100'
        }`}
      />

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
              <div
                className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl text-white font-black text-lg sm:text-xl flex items-center justify-center shadow-md shrink-0 ${
                  isIndependiente
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-600 shadow-indigo-500/15'
                    : 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/15'
                }`}
              >
                {initial}
              </div>
            )}

            <div className="min-w-0">
              <h3
                className={`text-base sm:text-lg font-black text-slate-900 dark:text-white transition-colors tracking-tight truncate ${
                  isIndependiente
                    ? 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                    : 'group-hover:text-blue-600 dark:group-hover:text-blue-400'
                }`}
              >
                {pac.nombreCorto}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 inline-flex items-center gap-1">
                  {pac.pacTitular && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                  {pac.parentesco}
                </span>
                {isIndependiente && (
                  <span
                    data-cy="badge-paciente-card-independizado"
                    className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 inline-flex items-center gap-1"
                  >
                    <UserCheck className="w-3 h-3 text-indigo-500" />
                    Independizado
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Badge de Conteo */}
          {hasCitas ? (
            <span
              className={`text-xs px-3 py-1 rounded-full font-black border shrink-0 shadow-2xs ${
                isIndependiente
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/40'
                  : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/40'
              }`}
            >
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
          <div className="mt-4 p-3.5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <CalendarDays className="w-4 h-4 text-blue-500/80 shrink-0" />
              <span>{tabActual === 'proximas' ? 'Sin citas próximas programadas' : 'Sin citas en el historial'}</span>
            </div>

            {/* Resumen de citas completadas y canceladas */}
            {tabActual === 'proximas' && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 truncate">
                    {completadasCount} {completadasCount === 1 ? 'completada' : 'completadas'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                    {canceladasCount} {canceladasCount === 1 ? 'cancelada' : 'canceladas'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
        {solicitudesCount > 0 && (
          <div className="mt-3.5 p-2.5 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/80 flex items-center justify-between text-xs animate-pulse">
            <span className="font-extrabold text-orange-900 dark:text-orange-200 flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
              {solicitudesCount === 1 ? '1 solicitud de cambio' : `${solicitudesCount} solicitudes de cambio`}
            </span>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500 text-white shadow-2xs">
              Atención
            </span>
          </div>
        )}
      </div>

      {/* Pie de Tarjeta */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        <span
          className={`font-bold transition-colors flex items-center gap-1 ${
            isIndependiente
              ? 'text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300'
              : 'text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300'
          }`}
        >
          {isIndependiente ? 'Consultar historial' : 'Ver citas'}
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </span>

        <div className="flex items-center gap-2">
          {totalSeries > 0 && (
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 text-sky-500" />
              {totalSeries} {totalSeries === 1 ? 'serie' : 'series'}
            </span>
          )}
          {tieneCitaParaCola && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const fechaQuery = proximaCita.ctaFecha ? proximaCita.ctaFecha.split('T')[0] : '';
                router.push(
                  `/dashboard/citas/sala-espera?citaId=${proximaCita.ctaCodigo}&doc=${proximaCita.ctaCoddoc}&fecha=${fechaQuery}`
                );
              }}
              title="Ver sala de espera y cola de atención"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Ver cola</span>
            </button>
          )}
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
  mapaSolicitudesPorCita,
  onResponderSolicitud,
  onCancelarSolicitud,
  onReview,
  onVerResena,
}: {
  grupoId: string;
  citasGrupo: CitaListDto[];
  totalCitasSerie: number;
  completedCitasSerie: number;
  router: any;
  handleConfirmCancel: (c: CitaListDto) => void;
  onUnlinkGroup: (c: CitaListDto) => void;
  onDeleteGroup: (grupoId: string, temaNombre: string) => void;
  mapaSolicitudesPorCita?: Map<string, SolicitudCambioDto>;
  onResponderSolicitud?: (solicitud: SolicitudCambioDto) => void;
  onCancelarSolicitud?: (solicitud: SolicitudCambioDto) => void;
  onReview?: (c: CitaListDto) => void;
  onVerResena?: (c: CitaListDto) => void;
}) {
  const [citaParaDetalle, setCitaParaDetalle] = useState<CitaListDto | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const doctorCode = citasGrupo[0]?.ctaCoddoc;
  const { data: doctor } = useDoctorByCode(doctorCode || '');

  const nombreGrupo = citasGrupo[0]?.grupoTema || 'Tema de Seguimiento';
  const medicoNombre = citasGrupo[0]?.medicoNombre || '';
  const medicoEspecialidad = citasGrupo[0]?.medicoEspecialidad || doctor?.exp_profesion || 'Especialista Médico';

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
  const isSerieCerrada = completed >= total && total > 0;

  // Inversión financiera
  const inversionTotal = citasGrupo.reduce((acc, c) => acc + (Number(c.ctaPrecio) || 0), 0);
  const inversionTotalFormatted = `Q${inversionTotal.toFixed(2)}`;
  const tarifaReferencial = inversionTotal * 1.35;
  const ahorroTotal = tarifaReferencial - inversionTotal;
  const ahorroFormatted = ahorroTotal > 15 ? `Ahorro Q${ahorroTotal.toFixed(2)}` : `${citasGrupo.length} sesiones`;

  const idFormatted = `#CEP-${(grupoId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '8831'}`;

  const colegiadoTexto = doctor?.exp_colegiado_gt
    ? `Colegiada No. ${doctor.exp_colegiado_gt}`
    : ((doctor as any)?.exp_numero_colegiado ? `Colegiada No. ${(doctor as any).exp_numero_colegiado}` : 'Colegiada No. 12,490');

  // Reseña única por protocolo en el contenedor de información médica
  const citaConResena = useMemo(() => {
    return citasGrupo.find((c) => typeof c.ctaCalificacion === 'number' && c.ctaCalificacion > 0) || null;
  }, [citasGrupo]);

  const primeraCitaCompletada = useMemo(() => {
    return citasGrupo.find((c) => {
      const cleanState = (c.ctaEstado || '').toLowerCase().trim().replace(/[\s\-]+/g, '_');
      return ['completada', 'finalizada', 'realizada', 'atendida'].includes(cleanState);
    }) || null;
  }, [citasGrupo]);

  const handleNuevaCitaEnGrupo = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
  };

  const formatSessionDate = (fecha: string) => {
    try {
      const d = parseISO(fecha.split('T')[0]);
      const raw = format(d, "EEEE, dd MMM yyyy", { locale: es });
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    } catch {
      return fecha;
    }
  };

  const formatSessionHourRange = (hora: string) => {
    if (!hora) return 'Horario programado';
    const start = hora.slice(0, 5);
    try {
      const [h, m] = start.split(':').map(Number);
      const endH = String((h + 1) % 24).padStart(2, '0');
      return `${start} - ${endH}:${String(m).padStart(2, '0')}`;
    } catch {
      return `${start} hrs`;
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-full">
        <div
          onClick={() => setIsCollapsed(false)}
          className="w-full bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl overflow-hidden object-cover border border-slate-100 dark:border-slate-800 shrink-0 relative bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-xs">
              {doctor?.exp_foto_perfil ? (
                <Image src={doctor.exp_foto_perfil} alt={medicoNombre} fill sizes="48px" className="object-cover" />
              ) : (
                <span className="text-sm font-black text-blue-600 dark:text-blue-400">{initials}</span>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  isSerieCerrada
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                }`}>
                  {isSerieCerrada ? 'Serie Cerrada' : 'En Protocolo'}
                </span>
                <span className="text-xs text-slate-400 font-semibold">{idFormatted}</span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate mt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {nombreGrupo}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap mt-0.5">
                <span>{medicoNombre.startsWith('Dr.') ? medicoNombre : `Dr. ${medicoNombre}`}</span>
                <span>•</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{completed} / {total} sesiones</span>
                <span>•</span>
                <span className="font-bold text-[#19456B] dark:text-sky-400">{inversionTotalFormatted}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:ml-auto shrink-0 justify-end border-t sm:border-none border-slate-100 dark:border-slate-800 pt-3 sm:pt-0">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Mostrar protocolo</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60 transition-colors">
              <ChevronDown className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-transparent">
        {/* 1. Columna Izquierda: Tarjeta de Resumen del Protocolo (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col gap-6 shadow-sm justify-between">
          <div className="flex flex-col gap-6">
            {/* Cabecera (Estado, ID y Botón Minimizar) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  isSerieCerrada
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                }`}>
                  {isSerieCerrada ? 'Serie Cerrada' : 'En Protocolo'}
                </div>
                <div className="text-slate-400 dark:text-slate-500 text-xs font-semibold">
                  ID: {idFormatted}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Minimizar protocolo"
              >
                <span>Minimizar</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Info del Médico */}
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden object-cover border border-slate-100 dark:border-slate-800 shrink-0 relative bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-xs">
                  {doctor?.exp_foto_perfil ? (
                    <Image src={doctor.exp_foto_perfil} alt={medicoNombre} fill sizes="56px" className="object-cover" />
                  ) : (
                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">{initials}</span>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-[16px] font-bold text-[#19456B] dark:text-white leading-tight truncate">
                    {medicoNombre.startsWith('Dr.') ? medicoNombre : `Dr. ${medicoNombre}`}
                  </h3>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {medicoEspecialidad}
                  </p>
                  <p className="text-[12px] text-blue-600 dark:text-blue-400 font-medium truncate">
                    {colegiadoTexto}
                  </p>
                </div>
              </div>

              {/* Reseña única por protocolo para el médico tratante */}
              {citaConResena ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVerResena?.(citaConResena);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition cursor-pointer group/rev"
                  title="Ver reseña registrada para este protocolo"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
                    <span className="truncate">Reseña del protocolo ({citaConResena.ctaCalificacion}/5 ⭐)</span>
                  </div>
                  <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold underline shrink-0 group-hover/rev:text-amber-900 dark:group-hover/rev:text-white">
                    Ver reseña
                  </span>
                </button>
              ) : primeraCitaCompletada && onReview ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReview?.(primeraCitaCompletada);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer"
                  title="Calificar el protocolo con el médico tratante"
                >
                  <Star className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Calificar atención del protocolo</span>
                </button>
              ) : null}
            </div>

            {/* Título del Protocolo */}
            <div className="flex flex-col gap-1 border-t border-slate-100 dark:border-slate-800/80 pt-5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Protocolo de Especialidad
              </span>
              <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-white leading-snug">
                {nombreGrupo}
              </h2>
            </div>

            {/* Tarjeta de Resumen Financiero/Progreso */}
            <div className="grid grid-cols-2 gap-4 bg-[#f8f9fc] dark:bg-slate-900/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
              <div className="flex flex-col border-r border-slate-200/60 dark:border-slate-800 pr-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Cumplimiento</span>
                <span className="text-[22px] font-extrabold text-slate-900 dark:text-white leading-tight mt-0.5">
                  {completed} <span className="text-slate-400 text-[16px] font-bold">/ {total}</span>
                </span>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {percent}% de asistencia
                </span>
              </div>
              <div className="flex flex-col pl-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Inversión Final</span>
                <span className="text-[22px] font-extrabold text-[#19456B] dark:text-sky-300 leading-tight mt-0.5">
                  {inversionTotalFormatted}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                  {ahorroFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* Botón de Acción Principal y Opciones */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={handleNuevaCitaEnGrupo}
              className="w-full bg-[#0047b3] hover:bg-blue-800 text-white font-bold text-sm py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-900/20 active:scale-95 cursor-pointer"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Agendar Sesión de Refuerzo</span>
            </button>

            {onDeleteGroup && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGroup(grupoId, nombreGrupo);
                }}
                className="text-[11px] font-semibold text-slate-400 hover:text-rose-500 text-center transition-colors cursor-pointer py-1"
              >
                Eliminar tema de seguimiento
              </button>
            )}
          </div>
        </div>

        {/* 2. Columna Derecha: Línea de Tiempo de Sesiones (lg:col-span-8 con min-h-[400px]) */}
        <div className="lg:col-span-8 flex flex-col gap-3 min-h-[400px]">
          {/* Contenedor con Scroll Y para cuando hay muchas sesiones */}
          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1 sm:pr-2 [scrollbar-width:thin]">
            {citasGrupo.map((cita, index) => {
            const cleanState = (cita.ctaEstado || '').toLowerCase().trim().replace(/[\s\-]+/g, '_');
            const isCompleted = ['completada', 'finalizada', 'realizada', 'atendida'].includes(cleanState);
            const isCancelled = ['cancelada', 'rechazada'].includes(cleanState);
            const isNoShow = ['no_asistio', 'noasistio'].includes(cleanState);
            const canModOrCancel = !isCompleted && !isCancelled && !isNoShow;
            const sessionDateStr = formatSessionDate(cita.ctaFecha);
            const sessionHourRange = formatSessionHourRange(cita.ctaHora);
            const precioFormatted = `Q${(Number(cita.ctaPrecio) || 0).toFixed(2)}`;
            const isLastSession = index === citasGrupo.length - 1 && citasGrupo.length > 1;

            if (isLastSession) {
              return (
                <div
                  key={`grupo-cita-${cita.ctaCodigo}`}
                  onClick={() => setCitaParaDetalle(cita)}
                  className="bg-[#003380] dark:bg-[#002255] text-white border-transparent rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-[15px] font-bold text-white">{sessionDateStr}</h4>
                        <span className="bg-blue-600 text-[9px] font-black uppercase px-2 py-0.5 rounded text-white tracking-wider">
                          {isCompleted ? 'Alta Oficial' : 'Sesión de Cierre'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-blue-200 mt-0.5 flex-wrap">
                        <span>{sessionHourRange}</span>
                        <span className="w-1 h-1 rounded-full bg-blue-400 shrink-0"></span>
                        <span className="text-white font-medium truncate">
                          {cita.ctaMotivo || cita.servicioNombre || 'Conclusión del Plan y Certificado de Tratamiento'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:ml-auto w-full sm:w-auto justify-between sm:justify-end border-t sm:border-none border-blue-800/80 pt-3 sm:pt-0 shrink-0">
                    <div className="flex flex-col text-right">
                      <span className="text-[16px] font-extrabold leading-none text-white">
                        {precioFormatted}
                      </span>
                      <span className="text-[10px] text-blue-300 mt-1">
                        {isCompleted ? 'Sesión de Cierre' : (cita.tipoPagoDescripcion || 'En clínica')}
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-white text-blue-700 flex items-center justify-center shrink-0 shadow-xs">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-blue-700" />
                      ) : isCancelled || isNoShow ? (
                        <X className="w-4 h-4 text-rose-600 stroke-[3]" />
                      ) : (
                        <Clock className="w-4 h-4 text-blue-700 stroke-[2.5]" />
                      )}
                    </div>

                    {/* Acciones Visibles de la Sesión de Cierre */}
                    <div className="flex items-center gap-1 border-l border-blue-700/80 pl-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCitaParaDetalle(cita);
                        }}
                        title="Ver información y receta"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-200 hover:text-white hover:bg-blue-700/60 transition-colors cursor-pointer"
                      >
                        <Info className="w-4 h-4" />
                      </button>

                      {canModOrCancel && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/citas/${cita.ctaCodigo}/editar`);
                          }}
                          title="Reprogramar sesión"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-200 hover:text-emerald-300 hover:bg-blue-700/60 transition-colors cursor-pointer"
                        >
                          <CalendarIcon className="w-4 h-4" />
                        </button>
                      )}

                      {onUnlinkGroup && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUnlinkGroup(cita);
                          }}
                          title="Desagrupar de este protocolo"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-200 hover:text-amber-300 hover:bg-blue-700/60 transition-colors cursor-pointer"
                        >
                          <Unlink className="w-4 h-4" />
                        </button>
                      )}

                      {canModOrCancel && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmCancel(cita);
                          }}
                          title="Cancelar cita"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-200 hover:text-rose-300 hover:bg-blue-700/60 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`grupo-cita-${cita.ctaCodigo}`}
                onClick={() => setCitaParaDetalle(cita)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xs transition-all cursor-pointer group"
              >
                {/* Izquierda (Número e Info) */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#f0f4f8] dark:bg-slate-800 text-[#19456B] dark:text-sky-300 flex items-center justify-center font-black text-sm shrink-0">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  
                  <div className="flex flex-col min-w-0">
                    <h4 className="text-[15px] font-bold text-slate-900 dark:text-white leading-tight">
                      {sessionDateStr}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{sessionHourRange}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                      <span className="font-medium text-slate-600 dark:text-slate-300 truncate">
                        {cita.servicioNombre || cita.ctaMotivo || 'Consulta y Registro del Protocolo'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Derecha (Arancel, Estado y Acciones Visibles) */}
                <div className="flex items-center gap-3 sm:ml-auto w-full sm:w-auto justify-between sm:justify-end border-t sm:border-none border-slate-100 dark:border-slate-800 pt-3 sm:pt-0 shrink-0">
                  <div className="flex flex-col text-right">
                    <span className="text-[16px] font-extrabold text-slate-900 dark:text-white leading-none">
                      {precioFormatted}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      {cita.tipoPagoDescripcion || 'Tarjeta de Crédito'}
                    </span>
                  </div>

                  {/* Ícono de Estado */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isCompleted
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                      : isCancelled || isNoShow
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                      : 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400'
                  }`}>
                    {isCompleted ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : isCancelled || isNoShow ? (
                      <X className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <Clock className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </div>

                  {/* Acciones Visibles de la Sesión */}
                  <div className="flex items-center gap-1 border-l border-slate-200/80 dark:border-slate-800 pl-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCitaParaDetalle(cita);
                      }}
                      title="Ver información y receta"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    {canModOrCancel && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/citas/${cita.ctaCodigo}/editar`);
                        }}
                        title="Reprogramar sesión"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                      >
                        <CalendarIcon className="w-4 h-4" />
                      </button>
                    )}

                    {onUnlinkGroup && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnlinkGroup(cita);
                        }}
                        title="Desagrupar de este protocolo"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                      >
                        <Unlink className="w-4 h-4" />
                      </button>
                    )}

                    {canModOrCancel && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmCancel(cita);
                        }}
                        title="Cancelar cita"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>

          {/* Ghost Card para rellenar espacio y agendar */}
          <button
            type="button"
            onClick={handleNuevaCitaEnGrupo}
            className="w-full flex flex-col sm:flex-row items-center justify-center gap-3 p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 text-slate-400 transition-all group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group-hover:border-blue-200 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60 flex items-center justify-center transition-colors shadow-sm shrink-0">
              <Plus className="w-5 h-5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
            </div>
            <div className="flex flex-col text-center sm:text-left">
              <span className="font-bold text-[15px] text-slate-600 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                Agendar siguiente sesión
              </span>
              <span className="text-[12px] font-medium text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors mt-0.5">
                Añadir una nueva cita a este protocolo
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Drawer de Detalle Completo de la Sesión */}
      {citaParaDetalle && (
        <CitaDetailDrawer
          isOpen={!!citaParaDetalle}
          onClose={() => setCitaParaDetalle(null)}
          cita={citaParaDetalle}
          doctorFoto={doctor?.exp_foto_perfil || ''}
          onEdit={(c) => {
            setCitaParaDetalle(null);
            router.push(`/dashboard/citas/${c.ctaCodigo}/editar`);
          }}
          onCancel={(c) => {
            setCitaParaDetalle(null);
            handleConfirmCancel(c);
          }}
        />
      )}
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
          toast.error('El nombre del grupo es requerido');
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
                Nombre del grupo:
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
