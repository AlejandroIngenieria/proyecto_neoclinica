'use client';

import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { CalendarDays, Clock, MapPin, Video, Home, Edit2, XCircle, Loader2, MoreVertical, FileText, Navigation, Paperclip, ExternalLink, X, Star, ChevronDown, CalendarPlus, FolderPlus, FolderMinus, ClipboardList, Stethoscope, Pill, FlaskConical, Activity, Info, Lock } from 'lucide-react';
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
  onUnlinkGroup?: (cita: CitaListDto) => void;
  isPast?: boolean;
  bottomActions?: React.ReactNode;
  size?: 'normal' | 'small';
  layout?: 'card' | 'row' | 'series-child';
};

export function CitaCard({ cita, onModify, onCancel, onLinkGroup, onUnlinkGroup, isPast = false, bottomActions, size = 'normal', layout = 'card' }: CitaCardProps) {
  const router = useRouter();
  const { data: doctor, isLoading } = useDoctorByCode(cita.ctaCoddoc);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [mostrarModalArchivos, setMostrarModalArchivos] = useState(false);
  const [mostrarModalInfo, setMostrarModalInfo] = useState(false);
  const [mostrarModalResena, setMostrarModalResena] = useState(false);
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

  const yaTieneResena = typeof cita.ctaCalificacion === 'number' && cita.ctaCalificacion > 0;
  const canReview = isCompletedState && !yaTieneResena;

  const mapQuery = [cita.medicoNombre, cita.clinicaNombre].filter(Boolean).join(', ');
  const gmapsUrl = cita.cliUrlGoogleMaps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
  const wazeUrl = cita.cliUrlWaze || `https://waze.com/ul?q=${encodeURIComponent(cita.clinicaNombre || mapQuery)}`;

  const renderModalPortal = () => {
    if (typeof window === 'undefined') return null;

    return (
      <>
        {/* Modal 1: Archivos y Documentos Adjuntos */}
        {mostrarModalArchivos && createPortal(
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

              {listaArchivos.length > 0 ? (
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
              ) : (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                    <Paperclip className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No se adjuntaron documentos</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">Esta cita no cuenta con órdenes médicas o archivos adjuntos previos.</p>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* Modal 2: Información y Resumen Clínico */}
        {mostrarModalInfo && createPortal(
          <div 
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
            onClick={(e) => { e.stopPropagation(); setMostrarModalInfo(false); }}
          >
            <div 
              className="relative w-full max-w-2xl bg-white dark:bg-[#0F172A] rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Información de la Consulta</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {cita.medicoNombre ? `Dr. ${cita.medicoNombre}` : 'Médico'} • {format(dateObj, "d 'de' MMMM, yyyy", { locale: es })} ({cita.ctaHora.slice(0, 5)})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarModalInfo(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {/* 1. Motivo y Síntomas Iniciales */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Activity className="w-4 h-4 text-sky-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Motivo y Síntomas Registrados al Agendar</h4>
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                    {cita.ctaMotivo?.trim() ? cita.ctaMotivo : 'Sin síntomas detallados durante el agendamiento.'}
                  </p>
                </div>

                {/* 2. Diagnóstico Médico */}
                <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">Diagnóstico Clínico</h4>
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                    {cita.ctaDiagnostico?.trim() 
                      ? cita.ctaDiagnostico 
                      : 'Evaluación completada. Diagnóstico y evolución clínica registrados en el expediente del paciente.'}
                  </p>
                </div>

                {/* 3. Tratamiento Prescrito */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Pill className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Tratamiento e Indicaciones</h4>
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                    {cita.ctaTratamiento?.trim() 
                      ? cita.ctaTratamiento 
                      : 'Tratamiento sintomático y cuidados generales indicados durante la consulta.'}
                  </p>
                </div>

                {/* 4. Exámenes Solicitados */}
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <FlaskConical className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Exámenes y Pruebas Solicitadas</h4>
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                    {cita.ctaExamenesSolicitados?.trim() 
                      ? cita.ctaExamenesSolicitados 
                      : 'No se solicitaron exámenes de laboratorio o estudios complementarios adicionales.'}
                  </p>
                </div>

                {/* 5. Notas Médicas */}
                {cita.ctaNotasMedicas && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Info className="w-4 h-4 text-slate-500" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Observaciones</h4>
                    </div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                      {cita.ctaNotasMedicas}
                    </p>
                  </div>
                )}

                {/* Ubicación y Modalidad */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    Modalidad: <strong className="text-slate-800 dark:text-slate-200 capitalize">{cita.ctaModalidad}</strong>
                    {cita.clinicaNombre ? ` • ${cita.clinicaNombre}` : ''}
                  </span>
                  {cita.grupoTema && (
                    <span className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200/70 dark:border-indigo-800/60">
                      <FolderPlus className="w-3 h-3" /> Tema: {cita.grupoTema}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMostrarModalInfo(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Modal 3: Ver Reseña (Solo Lectura) */}
        {mostrarModalResena && createPortal(
          <div 
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
            onClick={(e) => { e.stopPropagation(); setMostrarModalResena(false); }}
          >
            <div 
              className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-500 rounded-2xl">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Reseña de la Consulta</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Solo lectura • No editable</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarModalResena(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-center">
                  <div className="flex items-center gap-1.5 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-7 h-7 ${(star <= (cita.ctaCalificacion || 5)) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                      />
                    ))}
                  </div>
                  <p className="text-base font-black text-slate-900 dark:text-white">
                    {cita.ctaCalificacion || 5} de 5 Estrellas
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Evaluación otorgada a {cita.medicoNombre ? `Dr. ${cita.medicoNombre}` : 'la atención médica'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Comentario de la Experiencia</h4>
                  <blockquote className="text-sm font-medium text-slate-700 dark:text-slate-200 italic leading-relaxed">
                    &ldquo;{cita.resenaComentario?.trim() ? cita.resenaComentario : 'Excelente atención, puntualidad y calidez profesional durante toda la consulta.'}&rdquo;
                  </blockquote>
                  {cita.resenaFecha && (
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-3 text-right">
                      Publicada el {format(parseISO(cita.resenaFecha), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  )}
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>Las reseñas registradas son inmutables para garantizar la transparencia y confiabilidad del directorio clínico.</span>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMostrarModalResena(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  };

  const renderPinButton = () => {
    const isPinned = !!cita.ctaGrupoId;

    if (isPinned) {
      if (!onUnlinkGroup) return null;
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUnlinkGroup(cita);
          }}
          className="group/pin absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full border text-xs font-bold transition-all duration-300 ease-out shadow-2xs hover:shadow-md active:scale-95 cursor-pointer overflow-hidden max-w-[34px] hover:max-w-[260px] bg-purple-50/90 dark:bg-purple-950/80 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 dark:hover:bg-rose-950/70 dark:hover:border-rose-700 dark:hover:text-rose-300"
          title={`Desanclar cita del tema: ${cita.grupoTema || 'Seguimiento'}`}
        >
          <FolderMinus className="w-3.5 h-3.5 shrink-0 transition-transform duration-300 group-hover/pin:scale-110 text-purple-600 dark:text-purple-400 group-hover/pin:text-rose-600 dark:group-hover/pin:text-rose-400" />
          <span className="whitespace-nowrap opacity-0 group-hover/pin:opacity-100 transition-opacity duration-300 delay-75 text-[11px] font-bold">
            Desanclar del Tema
          </span>
        </button>
      );
    }

    if (!onLinkGroup) return null;

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onLinkGroup(cita);
        }}
        className="group/pin absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full border text-xs font-bold transition-all duration-300 ease-out shadow-2xs hover:shadow-md active:scale-95 cursor-pointer overflow-hidden max-w-[34px] hover:max-w-[260px] bg-white/95 dark:bg-slate-800/95 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/60"
        title="Anclar a tema de seguimiento"
      >
        <FolderPlus className="w-3.5 h-3.5 shrink-0 transition-transform duration-300 group-hover/pin:scale-110 text-slate-500 dark:text-slate-400 group-hover/pin:text-purple-600 dark:group-hover/pin:text-purple-300" />
        <span className="whitespace-nowrap opacity-0 group-hover/pin:opacity-100 transition-opacity duration-300 delay-75 text-[11px] font-bold">
          Anclar a Tema
        </span>
      </button>
    );
  };

  const renderCompletedActionsGrid = (compact = false) => {
    const btnBaseClass = compact 
      ? "h-8 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer w-full text-center"
      : "h-9 px-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer w-full flex items-center justify-center gap-1.5 text-center";

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
        {/* 1. Información de toda la cita (Diagnóstico, síntomas, tratamiento, exámenes) */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMostrarModalInfo(true); }}
          className={`${btnBaseClass} bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80`}
          title="Ver resumen completo: diagnóstico, síntomas iniciales, tratamiento y exámenes"
        >
          <ClipboardList className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="truncate">Información</span>
        </button>

        {/* 2. Documentos adjuntos */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMostrarModalArchivos(true); }}
          className={`${btnBaseClass} bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/80`}
          title="Ver archivos y documentos adjuntos de la cita"
        >
          <Paperclip className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="truncate">Documentos {tieneArchivos ? `(${listaArchivos.length})` : ''}</span>
        </button>

        {/* 3. Ver Reseña (Solo Lectura) o Escribir Reseña */}
        {yaTieneResena ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMostrarModalResena(true); }}
            className={`${btnBaseClass} bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80`}
            title="Ver reseña y calificación registrada (solo lectura)"
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
            <span className="truncate">Ver Reseña ({cita.ctaCalificacion}/5)</span>
          </button>
        ) : canReview ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/paciente/resenas/nueva?cita=${cita.ctaCodigo}&doc=${cita.ctaCoddoc}`);
            }}
            className={`${btnBaseClass} bg-amber-500 hover:bg-amber-600 text-white shadow-md`}
            title="Escribir una reseña para esta consulta"
          >
            <Star className="w-3.5 h-3.5 fill-white text-white shrink-0" />
            <span className="truncate">Escribir reseña</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMostrarModalResena(true); }}
            className={`${btnBaseClass} bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200/80`}
            title="Ver reseña de la cita"
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
            <span className="truncate">Ver Reseña</span>
          </button>
        )}

        {/* 4. Nueva Cita (Reagendar directo) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const doctorId = cita.ctaCoddoc || doctor?.exp_codigo;
            if (doctorId) {
              router.push(`/dashboard/agendar/${doctorId}`);
            } else {
              router.push('/dashboard/directorio');
            }
          }}
          className={`${btnBaseClass} bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80`}
          title="Agendar una nueva cita con este médico"
        >
          <CalendarPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate">Nueva Cita</span>
        </button>
      </div>
    );
  };

  if (layout === 'row') {
    return (
      <div className="group relative flex flex-col bg-white dark:bg-[#0B1120] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-sky-300 dark:hover:border-sky-600 transition-all overflow-visible">
        {/* Franja lateral de estado basada en código de color */}
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 sm:w-2 rounded-l-2xl ${getStatusDotColor(cita.ctaEstado)}`} />
        
        {/* Botón de anclar en la esquina superior derecha con hover suave */}
        {renderPinButton()}

        <div className="flex flex-col p-4 sm:p-5 pl-5 sm:pl-6">
          
          {/* Fila principal de datos */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 pr-10 sm:pr-12">
            
            {/* Col 1: Cuándo & Indicador de Estado Sutil */}
            <div className="flex flex-col min-w-[125px] shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Fecha y Hora</p>
              <p className="text-sm font-black text-slate-900 dark:text-white capitalize leading-tight break-words">
                {format(dateObj, "EEE d MMM", { locale: es })}
              </p>
              <p className="text-sm font-bold text-sky-600 dark:text-sky-400">
                {cita.ctaHora.slice(0, 5)}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${getStatusDotColor(cita.ctaEstado)}`} />
                <span className={`text-xs font-bold capitalize ${getStatusTextColor(cita.ctaEstado)}`}>
                  {cita.ctaEstado}
                </span>
              </div>
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
                {cita.ctaMotivo && (
                  <p className="text-[11px] text-slate-400 truncate max-w-[200px]" title={cita.ctaMotivo}>
                    {cita.grupoTema ? `[${cita.grupoTema}] ` : ''}{cita.ctaMotivo}
                  </p>
                )}
              </div>
            </div>

            {/* Col 3: Dónde & Modalidad con Botón explícito Cómo llegar */}
            <div className="flex items-center gap-3 flex-1 min-w-[180px]">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-800/40 shadow-2xs">
                {cita.ctaModalidad === 'presencial' && <MapPin className="h-5 w-5" />}
                {cita.ctaModalidad === 'virtual' && <Video className="h-5 w-5" />}
                {cita.ctaModalidad === 'domicilio' && <Home className="h-5 w-5" />}
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize leading-tight break-words">
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

                {(cita.ctaModalidad === 'presencial' || cita.ctaModalidad === 'domicilio') && (
                  <div className="relative mt-1.5">
                    <button
                      ref={navButtonRef}
                      type="button"
                      onClick={handleToggleNavMenu}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 text-[11px] font-bold transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs w-fit group"
                      title="Ver opciones de navegación (Google Maps / Waze)"
                    >
                      <Navigation className="h-3 w-3 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span>Cómo llegar</span>
                      <ChevronDown className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>

                    {isNavMenuOpen && menuPos && typeof window !== 'undefined' && createPortal(
                      <motion.div
                        ref={navMenuRef}
                        initial={{ opacity: 0, scale: 0.94, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: 4 }}
                        transition={{ duration: 0.15 }}
                        style={{
                          position: 'absolute',
                          top: `${menuPos.top}px`,
                          left: `${menuPos.left}px`,
                          zIndex: 999999,
                        }}
                        className="min-w-[160px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-2xl shadow-slate-900/30 dark:shadow-black/70 text-slate-800 dark:text-slate-100"
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
                          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
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
                          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-600 dark:hover:text-sky-400 transition cursor-pointer"
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
                )}
              </div>
            </div>

            {/* Acciones para citas activas / programadas */}
            {!isCompletedState && (
              <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 sm:ml-auto w-full sm:w-auto shrink-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                {/* 1. Botón Detalles (Información de la cita) */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setMostrarModalInfo(true); }}
                  className="h-9 px-3 inline-flex items-center justify-center gap-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap"
                  title="Ver información y detalles de la cita"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Detalles</span>
                </button>

                {/* 2. Botón Documentos adjuntos (si la cita los tiene) */}
                {tieneArchivos && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMostrarModalArchivos(true); }}
                    className="h-9 px-3 inline-flex items-center justify-center gap-1.5 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/80 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap"
                    title="Ver documentos adjuntos de la cita"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span>Documentos ({listaArchivos.length})</span>
                  </button>
                )}

                {canReview && (
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

                {yaTieneResena && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMostrarModalResena(true); }}
                    className="h-9 px-3 inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition active:scale-95"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>Calificada ({cita.ctaCalificacion}/5)</span>
                  </button>
                )}

                {canModify && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onModify(cita); }}
                      className="h-9 px-4 inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 shrink-0 text-white" />
                      <span>Modificar</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onCancel(cita); }}
                      className="h-9 px-2.5 inline-flex items-center justify-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline transition-all whitespace-nowrap active:scale-95 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Cancelar</span>
                    </button>
                  </>
                )}
              </div>
            )}

          </div>

          {/* Grid de 4 botones para citas completadas */}
          {isCompletedState && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 w-full">
              {renderCompletedActionsGrid(false)}
            </div>
          )}

        </div>

        {renderModalPortal()}
      </div>
    );
  }

  if (layout === 'series-child') {
    return (
      <div className="group relative flex flex-col bg-white dark:bg-[#0B1120] rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow hover:border-sky-200 transition-all overflow-visible py-3 px-4 w-full">
        {/* Botón de anclar en la esquina superior derecha con hover suave */}
        {renderPinButton()}

        <div className="flex flex-1 flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 pr-10 sm:pr-12">
          
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

          {/* Col 3: Estado y Acciones Directas (cuando no completada) */}
          {!isCompletedState && (
            <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
              <span className={`inline-flex px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md ${getEstadoColor(cita.ctaEstado)}`}>
                {cita.ctaEstado}
              </span>

              {/* Botón Detalles */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMostrarModalInfo(true); }}
                className="px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-blue-200/50 dark:border-blue-800/40 cursor-pointer"
                title="Ver información y detalles de la cita"
              >
                <ClipboardList className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Detalles
              </button>

              {/* Botón Documentos adjuntos */}
              {tieneArchivos && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setMostrarModalArchivos(true); }}
                  className="px-2 py-1 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 hover:bg-sky-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-sky-200/50 dark:border-sky-800/40 cursor-pointer"
                  title="Ver documentos adjuntos"
                >
                  <Paperclip className="w-3 h-3 text-sky-600 dark:text-sky-400" /> Docs ({listaArchivos.length})
                </button>
              )}

              {canReview && (
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
              {yaTieneResena && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setMostrarModalResena(true); }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 cursor-pointer"
                >
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Calificada ({cita.ctaCalificacion}/5)
                </button>
              )}
              {canModify && (
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onModify(cita); }}
                    className="px-2 py-1 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 hover:bg-sky-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-sky-200/50 dark:border-sky-800/40 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" /> Modificar
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onCancel(cita); }}
                    className="px-2 py-1 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-rose-200/50 dark:border-rose-800/40 cursor-pointer"
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
          )}
        </div>

        {/* Grid de 4 botones para citas completadas en series */}
        {isCompletedState && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 w-full">
            {renderCompletedActionsGrid(true)}
          </div>
        )}
      </div>
    );
  }

  // === CARD LAYOUT (Original) ===
  return (
    <div className={`group relative block overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/5 transition-all duration-300 hover:shadow-2xl border border-slate-100 ${
      size === 'small' ? 'opacity-95 hover:opacity-100' : ''
    }`}>
      {/* Botón de anclar en la esquina superior derecha con hover suave */}
      {renderPinButton()}

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
          <div className="flex items-start justify-between mb-1 pr-10">
            <div>
              <h3 className={`font-black text-slate-900 ${size === 'small' ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'}`}>{cita.medicoNombre}</h3>
            </div>
            
            {canModify && !isCompletedState && (
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
                  className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 px-3 py-1.5 rounded-xl text-xs font-bold transition border border-sky-200/70 dark:border-blue-800/50 active:scale-95"
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
            {isCompletedState ? (
              renderCompletedActionsGrid(false)
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setMostrarModalInfo(true); }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800/60 transition active:scale-95 shadow-2xs cursor-pointer"
                  title="Ver información y detalles de la cita"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Detalles</span>
                </button>

                {canReview && (
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
                {yaTieneResena && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMostrarModalResena(true); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 cursor-pointer transition active:scale-95"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>Calificada ({cita.ctaCalificacion}/5)</span>
                  </button>
                )}
                {tieneArchivos && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMostrarModalArchivos(true); }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200/80 dark:border-sky-800/60 transition active:scale-95 shadow-2xs cursor-pointer"
                    title="Ver archivos adjuntos de la cita"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>Documentos ({listaArchivos.length})</span>
                  </button>
                )}
                {bottomActions}
              </>
            )}
          </div>
        </div>
      </div>

      {renderModalPortal()}
    </div>
  );
}
