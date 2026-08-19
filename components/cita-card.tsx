'use client';

import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { CalendarDays, Clock, MapPin, Video, Home, Edit2, XCircle, Loader2, MoreVertical, FileText, Navigation, Paperclip, ExternalLink, X, Star } from 'lucide-react';
import type { CitaListDto } from '@/types/citas';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { useState, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';

type CitaCardProps = {
  cita: CitaListDto;
  onModify: (cita: CitaListDto) => void;
  onCancel: (cita: CitaListDto) => void;
  onLinkGroup?: (cita: CitaListDto) => void;
  isPast?: boolean;
  bottomActions?: React.ReactNode;
  size?: 'normal' | 'small';
  layout?: 'card' | 'row' | 'series-child';
};

export function CitaCard({ cita, onModify, onCancel, onLinkGroup, isPast = false, bottomActions, size = 'normal', layout = 'card' }: CitaCardProps) {
  const router = useRouter();
  const { data: doctor, isLoading } = useDoctorByCode(cita.ctaCoddoc);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [mostrarModalArchivos, setMostrarModalArchivos] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const navButtonRef = useRef<HTMLButtonElement | null>(null);
  const navMenuRef = useRef<HTMLDivElement | null>(null);

  const listaArchivos = useMemo(() => {
    const raw = cita.archivos || cita.documentos || [];
    return raw.map((a: any, idx: number) => ({
      arcCodigo: a.arcCodigo || a.id || `file-${idx}`,
      arcNombre: a.arcNombre || a.nombre || `Archivo ${idx + 1}`,
      arcUrl: a.arcUrl || a.url || '#',
      arcTipoArchivo: a.arcTipoArchivo || a.tipoArchivo || a.tipo || (String(a.arcUrl || a.url || '').match(/\.(png|jpg|jpeg|webp)$/i) ? 'image/png' : 'application/pdf'),
    }));
  }, [cita.archivos, cita.documentos]);

  const tieneArchivos = listaArchivos.length > 0;

  const handleToggleNavMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isNavMenuOpen) {
      setIsNavMenuOpen(false);
    } else {
      if (navButtonRef.current) {
        const rect = navButtonRef.current.getBoundingClientRect();
        setMenuPos({
          top: rect.bottom + window.scrollY + 6,
          left: Math.max(10, rect.left + window.scrollX - 20),
        });
      }
      setIsNavMenuOpen(true);
    }
  };

  useEffect(() => {
    if (!isNavMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        navButtonRef.current && !navButtonRef.current.contains(event.target as Node) &&
        navMenuRef.current && !navMenuRef.current.contains(event.target as Node)
      ) {
        setIsNavMenuOpen(false);
      }
    };
    const handleScroll = () => setIsNavMenuOpen(false);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isNavMenuOpen]);

  const getModalityIcon = (tipo: string) => {
    switch (tipo) {
      case 'presencial': return <MapPin className="h-4 w-4" />;
      case 'virtual': return <Video className="h-4 w-4" />;
      case 'domicilio': return <Home className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const getStatusDotColor = (estado: string) => {
    switch (estado) {
      case 'programada': return 'bg-sky-500';
      case 'confirmada': return 'bg-emerald-500';
      case 'pospuesta': return 'bg-amber-500';
      case 'completada': return 'bg-slate-400';
      case 'cancelada': return 'bg-rose-500';
      default: return 'bg-slate-400';
    }
  };

  const getStatusTextColor = (estado: string) => {
    switch (estado) {
      case 'programada': return 'text-sky-600 dark:text-sky-400';
      case 'confirmada': return 'text-emerald-600 dark:text-emerald-400';
      case 'pospuesta': return 'text-amber-600 dark:text-amber-400';
      case 'completada': return 'text-slate-600 dark:text-slate-400';
      case 'cancelada': return 'text-rose-600 dark:text-rose-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'programada': return 'bg-sky-100 text-sky-700';
      case 'confirmada': return 'bg-emerald-100 text-emerald-700';
      case 'pospuesta': return 'bg-amber-100 text-amber-700';
      case 'completada': return 'bg-slate-100 text-slate-700';
      case 'cancelada': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const dateObj = parseISO(cita.ctaFecha);

  const initials = cita.medicoNombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('') || 'MD';

  const canModify = !isPast && ['programada', 'confirmada', 'pospuesta'].includes((cita.ctaEstado || '').toLowerCase());

  const isCompletedState =
    (cita.ctaEstado || '').toLowerCase() === 'completada' ||
    (cita.ctaEstado || '').toLowerCase() === 'finalizada' ||
    (isPast && !['programada', 'confirmada', 'pospuesta', 'cancelada', 'rechazada', 'no_asistio'].includes((cita.ctaEstado || '').toLowerCase()));

  const mapQuery = [cita.medicoNombre, cita.clinicaNombre].filter(Boolean).join(', ');
  const gmapsUrl = cita.cliUrlGoogleMaps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
  const wazeUrl = cita.cliUrlWaze || `https://waze.com/ul?q=${encodeURIComponent(cita.clinicaNombre || mapQuery)}`;

  const renderModalPortal = () => {
    if (!mostrarModalArchivos || typeof window === 'undefined') return null;
    return createPortal(
      <div 
        className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
        onClick={(e) => { e.stopPropagation(); setMostrarModalArchivos(false); }}
      >
        <div 
          className="relative w-full max-w-2xl bg-white dark:bg-[#0F172A] rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-2xl">
                <Paperclip className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Archivos y Exámenes Adjuntos</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {cita.pacienteNombre ? `Paciente: ${cita.pacienteNombre}` : ''} ({format(dateObj, "d 'de' MMMM", { locale: es })})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMostrarModalArchivos(false)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {listaArchivos.map((archivo) => {
              const esImagen = String(archivo.arcTipoArchivo).includes('image') || String(archivo.arcUrl).match(/\.(png|jpg|jpeg|webp)$/i);
              return (
                <div 
                  key={archivo.arcCodigo}
                  className="flex flex-col bg-slate-50 dark:bg-[#1E293B] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 hover:border-sky-300 dark:hover:border-sky-600 transition group"
                >
                  {esImagen ? (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3 bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <img src={archivo.arcUrl} alt={archivo.arcNombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  ) : (
                    <div className="w-full h-36 rounded-xl mb-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400">
                      <FileText className="w-12 h-12 text-sky-500 mb-2" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Documento PDF / Archivo</span>
                    </div>
                  )}

                  <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate mb-3" title={archivo.arcNombre}>
                    {archivo.arcNombre}
                  </p>

                  <a
                    href={archivo.arcUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver Documento</span>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  if (layout === 'row') {
    return (
      <div className="group relative flex flex-col sm:flex-row bg-white dark:bg-[#0B1120] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-sky-300 dark:hover:border-sky-600 transition-all overflow-visible">
        {/* Franja lateral de estado basada en código de color */}
        <div className={`w-1.5 sm:w-2 shrink-0 rounded-l-2xl ${getStatusDotColor(cita.ctaEstado)}`} />
        
        <div className="flex flex-1 flex-col sm:flex-row items-start sm:items-center p-4 gap-4 sm:gap-6">
          
          {/* Col 1: Cuándo & Indicador de Estado Sutil */}
          <div className="flex flex-col min-w-[125px] shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Fecha y Hora</p>
            <p className="text-sm font-black text-slate-900 dark:text-white capitalize leading-tight break-words">
              {format(dateObj, "EEE d MMM", { locale: es })}
            </p>
            <p className="text-sm font-bold text-sky-600 dark:text-sky-400">
              {cita.ctaHora.slice(0, 5)}
            </p>
            {/* Indicador de estado sutil como texto con punto de color */}
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${getStatusDotColor(cita.ctaEstado)}`} />
              <span className={`text-xs font-bold capitalize ${getStatusTextColor(cita.ctaEstado)}`}>
                {cita.ctaEstado}
              </span>
            </div>

            {tieneArchivos && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMostrarModalArchivos(true);
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/80 border border-sky-200/80 dark:border-sky-800/80 transition active:scale-95 cursor-pointer shadow-2xs w-fit"
                title="Ver archivos adjuntos de la cita"
              >
                <Paperclip className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>{listaArchivos.length} {listaArchivos.length === 1 ? 'adjunto' : 'adjuntos'}</span>
              </button>
            )}
          </div>

          {/* Col 2: Quién (Médico) */}
          <div className="flex items-center gap-3 flex-1 min-w-[170px]">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden relative flex items-center justify-center">
              {doctor?.exp_foto_perfil ? (
                <Image src={doctor.exp_foto_perfil} alt={cita.medicoNombre} fill sizes="40px" className="object-cover" />
              ) : (
                <span className="text-xs font-black text-slate-500 dark:text-slate-400">{initials}</span>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight break-words">Dr. {cita.medicoNombre.split(' ').slice(0,2).join(' ')}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 break-words leading-tight mt-0.5">{cita.medicoEspecialidad}</p>
            </div>
          </div>

          {/* Col 3: Dónde & Modalidad con Ícono interactivo a la izquierda */}
          <div className="flex items-center gap-3 flex-1 min-w-[190px]">
            {/* Ícono de la izquierda: Interactivo para Presencial / Domicilio o Estático para Virtual */}
            {cita.ctaModalidad === 'presencial' || cita.ctaModalidad === 'domicilio' ? (
              <div className="relative shrink-0">
                <button
                  ref={navButtonRef}
                  type="button"
                  onClick={handleToggleNavMenu}
                  className="group relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20 hover:shadow-lg hover:shadow-sky-500/35 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20"
                  title="Ver cómo llegar en mapa (Google Maps / Waze)"
                >
                  {/* Efecto de onda (pulse ring) sutil que sugiere interacción */}
                  <span className="absolute -inset-0.5 rounded-2xl bg-sky-400 opacity-40 animate-ping pointer-events-none" />
                  {cita.ctaModalidad === 'domicilio' ? (
                    <Home className="h-4 w-4 relative z-10 text-white transition-transform group-hover:scale-110" />
                  ) : (
                    <MapPin className="h-4 w-4 relative z-10 text-white transition-transform group-hover:rotate-12" />
                  )}
                </button>

                {/* Portal del menú desplegable de mapas fuera del DOM de la tarjeta */}
                {isNavMenuOpen && menuPos && typeof window !== 'undefined' && createPortal(
                  <motion.div
                    ref={navMenuRef}
                    initial={{ opacity: 0, scale: 0.92, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 6 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute',
                      top: `${menuPos.top}px`,
                      left: `${menuPos.left}px`,
                      zIndex: 999999,
                    }}
                    className="min-w-[150px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-2xl shadow-slate-900/30 dark:shadow-black/70 text-on-surface dark:text-slate-100"
                  >
                    <p className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      ¿Cómo llegar?
                    </p>
                    <a
                      href={gmapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsNavMenuOpen(false);
                      }}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 transition"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                        <MapPin className="h-3 w-3" />
                      </span>
                      Google Maps
                    </a>
                    <a
                      href={wazeUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsNavMenuOpen(false);
                      }}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-600 dark:hover:text-sky-400 transition"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400">
                        <Navigation className="h-3 w-3" />
                      </span>
                      Waze
                    </a>
                  </motion.div>,
                  document.body
                )}
              </div>
            ) : (
              /* Ícono representativo para modalidad virtual */
              <div className="w-9 h-9 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-200/50 dark:border-sky-800/40 shadow-2xs">
                <Video className="h-4.5 w-4.5" />
              </div>
            )}

            <div className="flex flex-col min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize leading-tight break-words">
                {cita.ctaModalidad}
              </p>
              {cita.ctaModalidad === 'presencial' && cita.clinicaNombre && (
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 break-words leading-tight mt-0.5">
                  {cita.clinicaNombre}
                </p>
              )}
              {cita.ctaModalidad === 'virtual' && (
                <p className="text-[11px] font-medium text-sky-600 dark:text-sky-400 break-words leading-tight mt-0.5">
                  Consulta por videollamada
                </p>
              )}
              {cita.ctaModalidad === 'domicilio' && (
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 break-words leading-tight mt-0.5">
                  Visita a domicilio
                </p>
              )}
            </div>
          </div>

          {/* Col 4: Jerarquía clara de botones de acción alineados a la derecha */}
          <div className="flex items-center justify-start sm:justify-end gap-2 sm:ml-auto w-full sm:w-auto shrink-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
            {isCompletedState && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/paciente/resenas/nueva?cita=${cita.ctaCodigo}&doc=${cita.ctaCoddoc}`);
                }}
                className="h-9 px-3.5 inline-flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 fill-white text-white" />
                <span>Escribir reseña</span>
              </button>
            )}

            {canModify && (
              <>
                {onLinkGroup && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onLinkGroup(cita); }}
                    className="h-9 px-3.5 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all border border-sky-600 dark:border-sky-500 text-sky-700 dark:text-sky-300 bg-transparent hover:bg-sky-50 dark:hover:bg-sky-950/40 whitespace-nowrap active:scale-95"
                    title="Anclar a Tema de Seguimiento"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span>{cita.ctaGrupoId ? 'Cambiar Tema' : 'Anclar Tema'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onModify(cita); }}
                  className="h-9 px-4 inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
                >
                  <Edit2 className="w-3.5 h-3.5 shrink-0 text-white" />
                  <span>Modificar</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onCancel(cita); }}
                  className="h-9 px-2.5 inline-flex items-center justify-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline transition-all whitespace-nowrap active:scale-95"
                >
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Cancelar</span>
                </button>
              </>
            )}
          </div>

        </div>

        {renderModalPortal()}
      </div>
    );
  }

  if (layout === 'series-child') {
    return (
      <div className="group relative flex flex-col sm:flex-row bg-white dark:bg-[#0B1120] rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow hover:border-sky-200 transition-all overflow-visible py-3 px-4 w-full">
        <div className="flex flex-1 flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          
          {/* Col 1: Cuándo */}
          <div className="flex flex-col min-w-[120px] shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Fecha y Hora</p>
            <p className="text-sm font-black text-slate-900 dark:text-white capitalize leading-tight break-words">
              {format(dateObj, "EEE d MMM", { locale: es })}
            </p>
            <p className="text-xs font-bold text-sky-600 dark:text-sky-400">
              {cita.ctaHora.slice(0, 5)}
            </p>
          </div>

          {/* Col 2: Dónde (Modalidad) */}
          <div className="flex items-center gap-2.5 flex-1 min-w-[150px]">
            <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              {getModalityIcon(cita.ctaModalidad)}
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize leading-tight break-words">{cita.ctaModalidad}</p>
              {cita.ctaModalidad === 'presencial' && cita.clinicaNombre && (
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 break-words leading-tight mt-0.5">{cita.clinicaNombre}</p>
              )}
            </div>
          </div>

          {/* Col 3: Estado y Acciones Directas */}
          <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
            <span className={`inline-flex px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md ${getEstadoColor(cita.ctaEstado)}`}>
              {cita.ctaEstado}
            </span>
            {isCompletedState && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/paciente/resenas/nueva?cita=${cita.ctaCodigo}&doc=${cita.ctaCoddoc}`);
                }}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Star className="w-3 h-3 fill-white text-white" /> Escribir reseña
              </button>
            )}
            {canModify && (
              <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onModify(cita); }}
                  className="px-2 py-1 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 hover:bg-sky-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-sky-200/50 dark:border-sky-800/40"
                >
                  <Edit2 className="w-3 h-3" /> Modificar
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onCancel(cita); }}
                  className="px-2 py-1 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-rose-200/50 dark:border-rose-800/40"
                >
                  <XCircle className="w-3 h-3" /> Cancelar
                </button>
              </div>
            )}
            {bottomActions && (
              <div className="flex gap-2">
                {bottomActions}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // === CARD LAYOUT (Original) ===
  return (
    <div className={`group relative block overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/5 transition-all duration-300 hover:shadow-2xl border border-slate-100 ${
      size === 'small' ? 'opacity-95 hover:opacity-100' : ''
    }`}>
      <div className="flex flex-row h-full">
        
        {/* === IMAGEN === */}
        <div className={`relative overflow-hidden shrink-0 bg-slate-900 min-h-[140px] ${
          size === 'small' ? 'w-[30%] sm:w-[25%] lg:w-[30%]' : 'w-[40%] sm:w-[35%] lg:w-[35%]'
        }`}>
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center bg-slate-100">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : doctor?.exp_foto_perfil ? (
            <Image
              src={doctor.exp_foto_perfil}
              alt={cita.medicoNombre}
              fill
              sizes="(max-width: 640px) 30vw, 25vw"
              className={`object-cover object-center transition-transform duration-700 group-hover:scale-105 ${cita.ctaEstado === 'cancelada' ? 'grayscale opacity-80' : ''}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-3xl sm:text-5xl font-black text-slate-600">
              {initials}
            </div>
          )}
          
          <div className="absolute top-3 left-3 hidden sm:block">
            <span className={`inline-flex px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-full shadow-sm ${getEstadoColor(cita.ctaEstado)}`}>
              {cita.ctaEstado}
            </span>
          </div>
        </div>

        {/* === DETALLES === */}
        <div className={`flex flex-1 flex-col justify-between ${
          size === 'small' ? 'p-4 sm:p-5' : 'p-5 sm:p-7'
        }`}>
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className={`font-black text-slate-900 ${size === 'small' ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'}`}>{cita.medicoNombre}</h3>
            </div>
            
            {canModify && (
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onModify(cita); }}
                  className="h-9 px-3.5 inline-flex items-center justify-center gap-1.5 bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 rounded-xl text-xs font-bold transition-all border border-sky-200/70 dark:border-sky-800/50 whitespace-nowrap shadow-2xs active:scale-95"
                  title="Modificar Cita"
                >
                  <Edit2 className="w-4 h-4 text-sky-600 dark:text-sky-400" /> Modificar
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onCancel(cita); }}
                  className="h-9 px-3.5 inline-flex items-center justify-center gap-1.5 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl text-xs font-bold transition-all border border-rose-200/70 dark:border-rose-800/50 whitespace-nowrap shadow-2xs active:scale-95"
                  title="Cancelar Cita"
                >
                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" /> Cancelar
                </button>
              </div>
            )}
          </div>
          <p className={`font-semibold text-sky-600 mb-3 sm:mb-4 uppercase tracking-wider ${size === 'small' ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'}`}>
            {cita.medicoEspecialidad}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 sm:gap-y-4 gap-x-4 sm:gap-x-6">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className={`mt-0.5 rounded-xl bg-sky-50 text-sky-600 shrink-0 ${size === 'small' ? 'p-1.5' : 'p-2'}`}>
                <CalendarDays className={`${size === 'small' ? 'h-4 w-4' : 'h-5 w-5'}`} />
              </div>
              <div>
                <p className={`font-bold uppercase tracking-widest text-slate-400 ${size === 'small' ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>Fecha</p>
                <p className={`font-semibold text-slate-700 capitalize ${size === 'small' ? 'text-xs' : 'text-sm'}`}>
                  {format(dateObj, "EEEE d 'de' MMMM", { locale: es })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className={`mt-0.5 rounded-xl bg-sky-50 text-sky-600 shrink-0 ${size === 'small' ? 'p-1.5' : 'p-2'}`}>
                <Clock className={`${size === 'small' ? 'h-4 w-4' : 'h-5 w-5'}`} />
              </div>
              <div>
                <p className={`font-bold uppercase tracking-widest text-slate-400 ${size === 'small' ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>Hora</p>
                <p className={`font-semibold text-slate-700 ${size === 'small' ? 'text-xs' : 'text-sm'}`}>
                  {cita.ctaHora.slice(0, 5)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 sm:gap-3 sm:col-span-2">
              <div className={`mt-0.5 rounded-xl bg-sky-50 text-sky-600 shrink-0 ${size === 'small' ? 'p-1.5' : 'p-2'}`}>
                {getModalityIcon(cita.ctaModalidad)}
              </div>
              <div>
                <p className={`font-bold uppercase tracking-widest text-slate-400 ${size === 'small' ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>Modalidad</p>
                <p className={`font-semibold text-slate-700 capitalize ${size === 'small' ? 'text-xs' : 'text-sm'}`}>
                  Consulta {cita.ctaModalidad} {cita.ctaModalidad === 'presencial' && cita.clinicaNombre ? `- ${cita.clinicaNombre}` : ''}
                </p>
              </div>
            </div>

            {/* Desplegable interactivo para Waze y Google Maps */}
            {cita.ctaModalidad === 'presencial' && (
              <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                <a
                  href={gmapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3 py-1.5 rounded-xl text-xs font-bold transition border border-blue-200/70 dark:border-blue-800/50 active:scale-95"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Google Maps
                </a>
                <a
                  href={wazeUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 px-3 py-1.5 rounded-xl text-xs font-bold transition border border-sky-200/70 dark:border-sky-800/50 active:scale-95"
                >
                  <Navigation className="w-3.5 h-3.5 text-sky-500" /> Waze
                </a>
              </div>
            )}

            {cita.ctaMotivo && (
              <div className={`sm:col-span-2 border-t border-slate-100 ${size === 'small' ? 'pt-3 mt-1' : 'pt-4 mt-2'}`}>
                <p className={`font-bold uppercase tracking-widest text-slate-400 mb-0.5 sm:mb-1 ${size === 'small' ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>Motivo / Tema</p>
                <p className={`font-medium text-slate-600 line-clamp-2 ${size === 'small' ? 'text-xs' : 'text-sm'}`}>
                  {cita.grupoTema ? `[${cita.grupoTema}] ` : ''}{cita.ctaMotivo}
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
            {isCompletedState && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/paciente/resenas/nueva?cita=${cita.ctaCodigo}&doc=${cita.ctaCoddoc}`);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md transition active:scale-95 cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 fill-white text-white" />
                <span>Escribir reseña</span>
              </button>
            )}
            {tieneArchivos && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMostrarModalArchivos(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200/80 dark:border-sky-800/60 transition active:scale-95 shadow-2xs"
                title="Ver archivos adjuntos de la cita"
              >
                <Paperclip className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Ver archivos adjuntos ({listaArchivos.length})</span>
              </button>
            )}
            {canModify && onLinkGroup && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onLinkGroup(cita); }}
                className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3.5 py-1.5 rounded-xl text-xs font-bold transition border border-indigo-200"
              >
                <FileText className="w-3.5 h-3.5" /> {cita.ctaGrupoId ? 'Cambiar Tema de Seguimiento' : 'Anclar a Tema de Seguimiento'}
              </button>
            )}
            {bottomActions}
          </div>
        </div>
      </div>

      {renderModalPortal()}
    </div>
  );
}
