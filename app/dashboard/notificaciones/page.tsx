'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  Calendar,
  Clock,
  MessageSquare,
  Info,
  Trash2,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ArrowUpDown,
  X,
  AlertTriangle,
  RotateCcw,
  Inbox,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  Check,
  Filter,
} from 'lucide-react';
import {
  useNotificaciones,
  useMarcarNotificacionLeida,
  useMarcarTodasNotificacionesLeidas,
  useEliminarNotificacion,
  useLimpiarNotificaciones,
  useGenerarNotificacionesEjemplo,
} from '@/hooks/use-notificaciones';
import type { NotificacionDto } from '@/types';

type CategoriaFiltro = 'todas' | 'no_leidas' | 'cita' | 'recordatorio' | 'mensaje' | 'sistema';
type OrdenTipo = 'recientes' | 'antiguas' | 'no_leidas_primero';

interface SortOption {
  value: OrdenTipo;
  label: string;
  desc: string;
  icon: typeof Sparkles;
}

const SORT_OPTIONS: SortOption[] = [
  {
    value: 'recientes',
    label: 'Más recientes primero',
    desc: 'Orden cronológico reciente a antiguo',
    icon: Sparkles,
  },
  {
    value: 'antiguas',
    label: 'Más antiguas primero',
    desc: 'Historial en orden ascendente',
    icon: Clock,
  },
  {
    value: 'no_leidas_primero',
    label: 'No leídas primero',
    desc: 'Priorizar alertas pendientes por leer',
    icon: Bell,
  },
];

function getNotificationVisuals(tipo?: string) {
  const t = (tipo || '').toLowerCase();
  if (t.includes('cita')) {
    return {
      Icon: Calendar,
      label: 'Cita Médica',
      bg: 'bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800/80',
      accentColor: 'text-blue-600 dark:text-blue-400',
      badgeBg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/40',
    };
  }
  if (t.includes('recordatorio')) {
    return {
      Icon: Clock,
      label: 'Recordatorio',
      bg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800/80',
      accentColor: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40',
    };
  }
  if (t.includes('mensaje')) {
    return {
      Icon: MessageSquare,
      label: 'Mensaje / Reseña',
      bg: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/80',
      accentColor: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40',
    };
  }
  return {
    Icon: ShieldAlert,
    label: 'Sistema',
    bg: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-800/80',
    accentColor: 'text-indigo-600 dark:text-indigo-400',
    badgeBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40',
  };
}

function formatFechaCompleta(fechaIso?: string | Date) {
  if (!fechaIso) return '';
  try {
    const d = new Date(fechaIso);
    return d.toLocaleDateString('es-GT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(fechaIso);
  }
}

function formatTiempoRelativo(fechaIso?: string | Date) {
  if (!fechaIso) return '';
  try {
    const d = new Date(fechaIso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMin < 1) return 'Hace un momento';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHrs < 24) return `Hace ${diffHrs} h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return d.toLocaleDateString('es-GT', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function CentroNotificacionesPage() {
  const router = useRouter();

  // Data fetching & mutations
  const { notificaciones, unreadCount, isLoading } = useNotificaciones();
  const marcarLeidaMutation = useMarcarNotificacionLeida();
  const marcarTodasMutation = useMarcarTodasNotificacionesLeidas();
  const eliminarMutation = useEliminarNotificacion();
  const limpiarMutation = useLimpiarNotificaciones();
  const generarEjemplosMutation = useGenerarNotificacionesEjemplo();

  // UI state
  const [categoria, setCategoria] = useState<CategoriaFiltro>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<OrdenTipo>('recientes');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement | null>(null);

  const [selectedNotification, setSelectedNotification] = useState<NotificacionDto | null>(null);
  const [notificationToDelete, setNotificationToDelete] = useState<NotificacionDto | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearOnlyRead, setClearOnlyRead] = useState(false);

  // Cerrar dropdown de orden al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Estadísticas rápidas por categoría
  const totalCitas = useMemo(
    () => notificaciones.filter((n) => (n.tipo || '').toLowerCase().includes('cita')).length,
    [notificaciones]
  );
  const totalRecordatorios = useMemo(
    () => notificaciones.filter((n) => (n.tipo || '').toLowerCase().includes('recordatorio')).length,
    [notificaciones]
  );
  const totalMensajes = useMemo(
    () => notificaciones.filter((n) => (n.tipo || '').toLowerCase().includes('mensaje')).length,
    [notificaciones]
  );
  const totalSistema = useMemo(
    () => notificaciones.filter((n) => (n.tipo || '').toLowerCase().includes('sistema')).length,
    [notificaciones]
  );

  // Filtrado y ordenamiento de notificaciones
  const notificacionesFiltradas = useMemo(() => {
    let result = [...notificaciones];

    // Filtro por categoría / estado
    if (categoria === 'no_leidas') {
      result = result.filter((n) => !n.leida);
    } else if (categoria !== 'todas') {
      result = result.filter((n) => (n.tipo || '').toLowerCase().includes(categoria));
    }

    // Filtro por término de búsqueda
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      result = result.filter(
        (n) =>
          (n.titulo && n.titulo.toLowerCase().includes(q)) ||
          (n.mensaje && n.mensaje.toLowerCase().includes(q))
      );
    }

    // Ordenamiento
    if (orden === 'recientes') {
      result.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    } else if (orden === 'antiguas') {
      result.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    } else if (orden === 'no_leidas_primero') {
      result.sort((a, b) => {
        if (a.leida === b.leida) {
          return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
        }
        return a.leida ? 1 : -1;
      });
    }

    return result;
  }, [notificaciones, categoria, busqueda, orden]);

  const activeSortOption = useMemo(
    () => SORT_OPTIONS.find((opt) => opt.value === orden) || SORT_OPTIONS[0],
    [orden]
  );

  // Manejador para abrir detalle y marcar como leída
  const handleOpenDetail = (notificacion: NotificacionDto) => {
    if (!notificacion.leida) {
      marcarLeidaMutation.mutate(notificacion.notCodigo);
    }
    setSelectedNotification(notificacion);
  };

  // Manejador para ejecutar la acción y navegar
  const handleExecuteAction = (url: string) => {
    setSelectedNotification(null);
    router.push(url);
  };

  // Confirmar eliminación individual
  const handleConfirmDeleteSingle = () => {
    if (notificationToDelete) {
      eliminarMutation.mutate(notificationToDelete.notCodigo);
      if (selectedNotification?.notCodigo === notificationToDelete.notCodigo) {
        setSelectedNotification(null);
      }
      setNotificationToDelete(null);
    }
  };

  // Confirmar limpieza masiva
  const handleConfirmClear = () => {
    limpiarMutation.mutate(clearOnlyRead);
    setShowClearModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-24 pt-6 sm:pt-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        
        {/* ── Breadcrumb & Hero Header ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="hover:text-sky-600 dark:hover:text-sky-400 transition hover:underline"
            >
              Dashboard
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-slate-200 font-bold">Centro de Notificaciones</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/25 shrink-0">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Centro de Notificaciones
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Historial clasificado de citas médicas, recordatorios, reseñas y alertas del sistema.
                  </p>
                </div>
              </div>
            </div>

            {/* Acciones globales */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => generarEjemplosMutation.mutate()}
                disabled={generarEjemplosMutation.isPending}
                title="Generar notificaciones de prueba en todas las categorías"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-sky-400 hover:text-sky-600 transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 text-sky-500 ${generarEjemplosMutation.isPending ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Generar Ejemplos</span>
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => marcarTodasMutation.mutate()}
                  disabled={marcarTodasMutation.isPending}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/50 transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Marcar todo como leído</span>
                </button>
              )}

              {notificaciones.length > 0 && (
                <div className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => {
                      setClearOnlyRead(false);
                      setShowClearModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shadow-xs cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Vaciar historial</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Métricas Resumen ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Alertas
              </p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {notificaciones.length}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <Inbox className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                Sin Leer
              </p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {unreadCount}
                </p>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 animate-pulse">
                    Pendientes
                  </span>
                )}
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-950/70 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Bell className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Citas y Recordatorios
              </p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {totalCitas + totalRecordatorios}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/70 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Mensajes y Reseñas
              </p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {totalMensajes}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* ── Barra de Búsqueda, Filtros y Dropdown de Ordenamiento ── */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por título, contenido o palabra clave..."
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Custom Styled Dropdown de Ordenamiento */}
            <div className="relative flex items-center gap-2 shrink-0" ref={sortDropdownRef}>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0 hidden sm:inline-flex">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span>Ordenar:</span>
              </span>

              {/* Botón Trigger del Dropdown */}
              <button
                type="button"
                id="btn-ordenar-notificaciones"
                onClick={() => setIsSortOpen((prev) => !prev)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs ${
                  isSortOpen
                    ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-400 dark:border-sky-600 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20'
                    : 'bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/90 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <activeSortOption.icon className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="font-extrabold">{activeSortOption.label}</span>
                <motion.div
                  animate={{ rotate: isSortOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0"
                >
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </motion.div>
              </button>

              {/* Menú Popover de Opciones de Ordenamiento */}
              <AnimatePresence>
                {isSortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-1.5 z-50 overflow-hidden"
                  >
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Criterio de Orden
                      </p>
                    </div>

                    <div className="space-y-1">
                      {SORT_OPTIONS.map((option) => {
                        const isSelected = orden === option.value;
                        const OptionIcon = option.icon;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setOrden(option.value);
                              setIsSortOpen(false);
                            }}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                              isSelected
                                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-100 font-bold'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                  isSelected
                                    ? 'bg-sky-500 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                <OptionIcon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold leading-snug truncate">
                                  {option.label}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                                  {option.desc}
                                </p>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Pestañas de Filtro por Categoría */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-t border-slate-100 dark:border-slate-800/80 pt-3">
            {[
              { key: 'todas', label: 'Todas', icon: Inbox, count: notificaciones.length },
              { key: 'no_leidas', label: 'No Leídas', icon: Bell, count: unreadCount },
              { key: 'cita', label: 'Citas Médicas', icon: Calendar, count: totalCitas },
              { key: 'recordatorio', label: 'Recordatorios', icon: Clock, count: totalRecordatorios },
              {
                key: 'mensaje',
                label: 'Mensajes / Reseñas',
                icon: MessageSquare,
                count: totalMensajes,
              },
              {
                key: 'sistema',
                label: 'Sistema',
                icon: ShieldAlert,
                count: totalSistema,
              },
            ].map((tab) => {
              const isActive = categoria === tab.key;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setCategoria(tab.key as CategoriaFiltro)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20 scale-[1.02]'
                      : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  <TabIcon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Feed de Notificaciones ── */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3 shadow-xs">
              <div className="w-10 h-10 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Cargando tu historial de notificaciones...
              </p>
            </div>
          ) : notificacionesFiltradas.length === 0 ? (
            <div className="p-12 sm:p-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-5 shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto shadow-inner">
                {busqueda ? <Search className="w-8 h-8" /> : <Inbox className="w-8 h-8" />}
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {busqueda
                    ? 'No se encontraron resultados'
                    : categoria === 'no_leidas'
                    ? '¡Estás al día!'
                    : 'Sin notificaciones'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  {busqueda
                    ? `No hay alertas que coincidan con "${busqueda}". Intenta con otros términos.`
                    : categoria === 'no_leidas'
                    ? 'No tienes notificaciones pendientes por revisar en este momento.'
                    : 'Aún no has recibido alertas en esta categoría.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {(busqueda || categoria !== 'todas') && (
                  <button
                    type="button"
                    onClick={() => {
                      setBusqueda('');
                      setCategoria('todas');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restablecer filtros</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => generarEjemplosMutation.mutate()}
                  disabled={generarEjemplosMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-600/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generar alertas de prueba</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {notificacionesFiltradas.map((item) => {
                  const { Icon, bg, border, label, badgeBg } = getNotificationVisuals(item.tipo);
                  return (
                    <motion.div
                      key={item.notCodigo}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.18 }}
                      className={`group relative p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all duration-200 ${
                        !item.leida
                          ? 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/60 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 sm:gap-4">
                        {/* Icono de Categoría */}
                        <div
                          className={`w-11 h-11 rounded-2xl ${bg} ${border} border flex items-center justify-center shrink-0 shadow-xs mt-0.5`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Contenido Principal */}
                        <div
                          className="min-w-0 flex-1 space-y-1.5 cursor-pointer"
                          onClick={() => handleOpenDetail(item)}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeBg}`}
                            >
                              {label}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              {formatTiempoRelativo(item.fecha)}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                              · {formatFechaCompleta(item.fecha)}
                            </span>
                          </div>

                          <h3
                            className={`text-sm sm:text-base font-bold leading-snug ${
                              !item.leida
                                ? 'text-sky-950 dark:text-sky-100 font-extrabold'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {item.titulo}
                          </h3>

                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {item.mensaje}
                          </p>

                          {item.accionUrl && (
                            <div className="pt-1">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline">
                                <span>Ver detalles y gestionar</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Acciones del Item */}
                        <div className="flex items-center gap-1.5 shrink-0 self-start">
                          {!item.leida ? (
                            <button
                              type="button"
                              onClick={() => marcarLeidaMutation.mutate(item.notCodigo)}
                              title="Marcar como leída"
                              className="p-2 rounded-xl text-sky-600 hover:bg-sky-100/80 dark:hover:bg-sky-950/60 transition cursor-pointer"
                            >
                              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 block ring-4 ring-sky-200/50 dark:ring-sky-900/50" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(item)}
                              title="Ver detalle"
                              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setNotificationToDelete(item)}
                            title="Eliminar notificación"
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer opacity-70 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

      </div>

      {/* ── Modal de Detalle de Notificación ── */}
      <AnimatePresence>
        {selectedNotification && (() => {
          const { Icon, bg, border, label } = getNotificationVisuals(selectedNotification.tipo);
          return (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl ${bg} ${border} border flex items-center justify-center shrink-0 shadow-sm`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {label}
                      </span>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                        {formatFechaCompleta(selectedNotification.fecha)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedNotification(null)}
                    className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-snug">
                    {selectedNotification.titulo}
                  </h3>

                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                    <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      {selectedNotification.mensaje}
                    </p>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Notificación leída</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNotificationToDelete(selectedNotification)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 p-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar</span>
                  </button>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedNotification(null)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cerrar
                  </button>

                  {selectedNotification.accionUrl && (
                    <button
                      type="button"
                      onClick={() => handleExecuteAction(selectedNotification.accionUrl!)}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
                    >
                      <span>Ir al módulo relacionado</span>
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── Modal de Confirmación para Eliminar Notificación Individual ── */}
      <AnimatePresence>
        {notificationToDelete && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    ¿Eliminar notificación?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Esta alerta se removerá de tu historial.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                  {notificationToDelete.titulo}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {notificationToDelete.mensaje}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setNotificationToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteSingle}
                  disabled={eliminarMutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {eliminarMutation.isPending ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal de Confirmación para Vaciar Historial ── */}
      <AnimatePresence>
        {showClearModal && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Limpiar Notificaciones
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Selecciona qué notificaciones deseas eliminar permanentemente.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <label
                  onClick={() => setClearOnlyRead(false)}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                    !clearOnlyRead
                      ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="clearType"
                    checked={!clearOnlyRead}
                    onChange={() => setClearOnlyRead(false)}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Vaciar todo el historial ({notificaciones.length})
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Elimina todas las notificaciones leídas y no leídas de tu cuenta.
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => setClearOnlyRead(true)}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                    clearOnlyRead
                      ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="clearType"
                    checked={clearOnlyRead}
                    onChange={() => setClearOnlyRead(true)}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Eliminar únicamente las ya leídas ({notificaciones.length - unreadCount})
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Conserva las alertas pendientes que aún no has revisado.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  disabled={limpiarMutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {limpiarMutation.isPending ? 'Limpiando...' : 'Confirmar y Limpiar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
