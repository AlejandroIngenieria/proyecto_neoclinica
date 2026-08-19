'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  Calendar,
  Clock,
  MessageSquare,
  Info,
  Sparkles,
  ChevronRight,
  X,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import {
  useNotificaciones,
  useMarcarNotificacionLeida,
} from '@/hooks/use-notificaciones';
import type { NotificacionDto } from '@/types';

function getNotificationIcon(tipo?: string) {
  const t = (tipo || '').toLowerCase();
  if (t.includes('cita')) {
    return {
      Icon: Calendar,
      label: 'Cita Médica',
      bg: 'bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
    };
  }
  if (t.includes('recordatorio')) {
    return {
      Icon: Clock,
      label: 'Recordatorio',
      bg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
    };
  }
  if (t.includes('mensaje')) {
    return {
      Icon: MessageSquare,
      label: 'Mensaje / Opinión',
      bg: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
    };
  }
  return {
    Icon: Info,
    label: 'Sistema',
    bg: 'bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400',
    border: 'border-sky-200 dark:border-sky-800',
  };
}

function formatFecha(fechaIso?: string) {
  if (!fechaIso) return '';
  try {
    const d = new Date(fechaIso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMin < 1) return 'Ahora mismo';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHrs < 24) return `Hace ${diffHrs} h`;

    return d.toLocaleDateString('es-GT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return fechaIso;
  }
}

export function NotificacionesPopover() {
  const router = useRouter();
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'todas' | 'no_leidas'>('todas');
  const [selectedNotification, setSelectedNotification] = useState<NotificacionDto | null>(null);

  const { notificaciones, unreadCount, isLoading } = useNotificaciones();
  const marcarLeidaMutation = useMarcarNotificacionLeida();

  // Cerrar popover al hacer clic fuera o Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSelectedNotification(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const filteredItems = notificaciones.filter((n) => {
    if (filter === 'no_leidas') return !n.leida;
    return true;
  });

  const handleItemClick = (item: NotificacionDto) => {
    if (!item.leida) {
      marcarLeidaMutation.mutate(item.notCodigo);
    }
    setSelectedNotification(item);
  };

  const handleMarcarTodasLeidas = () => {
    const unread = notificaciones.filter((n) => !n.leida);
    unread.forEach((item) => marcarLeidaMutation.mutate(item.notCodigo));
  };



  return (
    <div ref={popoverRef} className="relative shrink-0 z-[9999]">
      {/* Botón Campana con Insignia de No Leídas */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-surface-container/60 dark:bg-slate-800/80 text-on-surface hover:bg-primary/10 hover:text-primary transition-all duration-200 cursor-pointer border border-outline-variant/20 dark:border-slate-700/60 shadow-2xs"
        aria-label="Notificaciones"
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4 sm:h-5 sm:w-5" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-sky-600 text-[10px] font-black text-white ring-2 ring-surface dark:ring-slate-900 animate-in zoom-in-75 duration-200 shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover desplegable */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 mt-3 w-80 sm:w-96 overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface dark:bg-slate-900 shadow-[0_25px_60px_rgba(0,0,0,0.35)] text-on-surface dark:text-slate-100 z-[99999]"
          >
            {/* Header del Popover */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/15 dark:border-slate-800 bg-surface-container-lowest/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black tracking-tight text-on-surface dark:text-white">
                      Notificaciones
                    </h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                        {unreadCount} nuevas
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarcarTodasLeidas}
                  className="flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition cursor-pointer"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Leídas</span>
                </button>
              )}
            </div>

            {/* Pestañas de Filtro */}
            <div className="flex items-center gap-1 px-4 py-2 bg-surface-container/30 dark:bg-slate-800/40 border-b border-outline-variant/15 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setFilter('todas')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filter === 'todas'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-outline dark:text-slate-400 hover:bg-surface-container dark:hover:bg-slate-800'
                }`}
              >
                Todas ({notificaciones.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('no_leidas')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filter === 'no_leidas'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-outline dark:text-slate-400 hover:bg-surface-container dark:hover:bg-slate-800'
                }`}
              >
                Sin leer ({unreadCount})
              </button>
            </div>

            {/* Lista de Notificaciones */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-outline-variant/10 dark:divide-slate-800/60">
              {isLoading ? (
                <div className="p-8 text-center text-xs font-semibold text-outline animate-pulse">
                  Cargando notificaciones...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-on-surface dark:text-white">
                    {filter === 'no_leidas' ? 'No tienes notificaciones sin leer' : 'Sin notificaciones por ahora'}
                  </p>
                  <p className="text-xs text-outline dark:text-slate-400">
                    Las novedades y recordatorios de tus citas aparecerán aquí.
                  </p>
                </div>
              ) : (
                filteredItems.map((item) => {
                  const { Icon, bg, border } = getNotificationIcon(item.tipo);
                  return (
                    <button
                      key={item.notCodigo}
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className={`flex w-full items-start gap-3.5 px-4 py-3.5 text-left transition-all group cursor-pointer ${
                        !item.leida
                          ? 'bg-sky-50/70 dark:bg-sky-950/30 hover:bg-sky-100/60 dark:hover:bg-sky-950/50'
                          : 'hover:bg-surface-container/60 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-2xl ${bg} ${border} border flex items-center justify-center shrink-0 shadow-2xs mt-0.5`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs font-bold truncate ${!item.leida ? 'text-sky-900 dark:text-sky-200' : 'text-on-surface dark:text-slate-200'}`}>
                            {item.titulo}
                          </p>
                          <span className="text-[10px] font-medium text-outline dark:text-slate-400 shrink-0">
                            {formatFecha(item.fecha)}
                          </span>
                        </div>

                        <p className="text-xs text-outline dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {item.mensaje}
                        </p>

                        {item.accionUrl && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 group-hover:translate-x-0.5 transition-transform pt-1">
                            Ver detalles <ChevronRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      {!item.leida && (
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0 mt-1.5 ring-4 ring-sky-200/50 dark:ring-sky-900/50 animate-pulse" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-outline-variant/15 dark:border-slate-800 bg-surface-container-lowest/80 dark:bg-slate-900/80 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-outline dark:text-slate-400">
                NeoClínica Hub
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Detalle de Notificación */}
      <AnimatePresence>
        {selectedNotification && (() => {
          const { Icon, bg, border, label } = getNotificationIcon(selectedNotification.tipo);
          return (
            <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 12 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-lg bg-surface dark:bg-slate-900 rounded-3xl border border-outline-variant/30 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6"
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl ${bg} ${border} border flex items-center justify-center shrink-0 shadow-sm`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-surface-container dark:bg-slate-800 text-outline dark:text-slate-300 border border-outline-variant/20">
                        {label}
                      </span>
                      <p className="text-xs font-semibold text-outline dark:text-slate-400 mt-1">
                        {formatFecha(selectedNotification.fecha)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedNotification(null)}
                    className="p-2 text-outline hover:text-on-surface hover:bg-surface-container dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
                    aria-label="Cerrar modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="space-y-4">
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-on-surface dark:text-white leading-snug">
                    {selectedNotification.titulo}
                  </h3>

                  <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest/60 dark:bg-slate-800/60 border border-outline-variant/15 dark:border-slate-800">
                    <p className="text-sm font-medium text-on-surface-variant dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      {selectedNotification.mensaje}
                    </p>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl w-fit border border-emerald-200/60 dark:border-emerald-800/40">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Notificación leída</span>
                </div>

                {/* Modal Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-outline-variant/15 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedNotification(null)}
                    className="w-full sm:w-auto px-5 py-3 rounded-2xl text-xs font-bold text-outline hover:bg-surface-container dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cerrar
                  </button>

                  {selectedNotification.accionUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        const url = selectedNotification.accionUrl!;
                        setSelectedNotification(null);
                        setIsOpen(false);
                        router.push(url);
                      }}
                      className="w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
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
    </div>
  );
}
