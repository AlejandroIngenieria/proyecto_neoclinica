'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Star,
  Award,
  Heart,
  Share2,
  ChevronRight,
  MapPin,
  Video,
  Globe,
  ShieldCheck,
  Clock,
  Navigation,
  ExternalLink,
  Phone,
  Building2,
  Home,
  Calendar,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type DoctorResponse,
  type DoctorClinica,
  getDoctorPriceDisplay,
  buildDoctorFullName,
  buildDoctorShortName,
  cleanZonaText,
  cleanZonaShort,
  cleanZonasDomicilio,
} from '@/types/doctor';
import { useFavoritos, useAddFavorito, useRemoveFavorito } from '@/hooks/use-favoritos';
import { usePacienteTitular } from '@/hooks/use-pacientes';
import { useUserLocation } from '@/hooks/use-user-location';

export type DoctorCardData = {
  doctor: DoctorResponse;
  fullName: string;
  specialtyPreview: string[];
  modalityPreview: string[];
  locationPreview: string[];
  languagePreview?: string[];
  insurancePreview?: string[];
  matchedLocation?: string;
  matchedSpecialty?: string;
  searchHighlight?: string | string[];
};

type DoctorCardProps = {
  data: DoctorCardData;
  onVisit?: (data: DoctorCardData) => void;
  onSelect?: (data: DoctorCardData) => void;
  onClose?: () => void;
  onSelectClinic?: (clinicIndex: number) => void;
  selectedClinicIndex?: number;
  variant?: 'compact' | 'expanded';
  isHovered?: boolean;
  isSelected?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

const DAYS_MAP: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
  0: 'Domingo',
};

function formatTime(timeStr: string) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    const hour = parseInt(parts[0], 10);
    const min = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${min} ${ampm}`;
  }
  return timeStr;
}

function HighlightText({ text, highlight }: { text: string; highlight?: string | string[] }) {
  if (!highlight || (Array.isArray(highlight) ? highlight.length === 0 : !highlight.trim())) {
    return <>{text}</>;
  }

  const terms = Array.isArray(highlight) ? highlight : [highlight];
  const validTerms = terms.map((t) => t.trim()).filter(Boolean);

  if (validTerms.length === 0) return <>{text}</>;

  const escapedTerms = validTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = validTerms.some((term) => part.toLowerCase() === term.toLowerCase());
        return isMatch ? (
          <mark key={i} className="bg-sky-100 text-sky-700 font-bold rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

export function DoctorCard({
  data,
  onVisit,
  onSelect,
  onClose,
  onSelectClinic,
  selectedClinicIndex = 0,
  variant = 'compact',
  isHovered = false,
  isSelected = false,
  onMouseEnter,
  onMouseLeave,
}: DoctorCardProps) {
  const router = useRouter();
  const [isHorariosModalOpen, setIsHorariosModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isHorariosModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsHorariosModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHorariosModalOpen]);

  const { titular } = usePacienteTitular();
  const codPac = titular?.pac_codigo;
  const { data: favoritos = [] } = useFavoritos(codPac);
  const addFavMutation = useAddFavorito();
  const removeFavMutation = useRemoveFavorito();
  const { location, getDistanceToDoctor } = useUserLocation();

  const isFavorito = favoritos.some((f) => f.expCodigo === data.doctor.exp_codigo);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!codPac) return;

    if (isFavorito) {
      removeFavMutation.mutate({ codPac, codDoc: data.doctor.exp_codigo });
    } else {
      addFavMutation.mutate({ codPac, codDoc: data.doctor.exp_codigo });
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const profileUrl = `${origin}/dashboard/${data.doctor.exp_codigo}`;
    const doctorTitle = fullName || 'Médico Especialista';
    const shareTitle = `${doctorTitle} - NeoClínica`;
    const shareText = `Conoce el perfil de ${doctorTitle} en NeoClínica:`;

    const copyFallback = async () => {
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(profileUrl);
          toast.success('¡Enlace del perfil copiado al portapapeles!', {
            description: profileUrl,
          });
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = profileUrl;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          toast.success('¡Enlace del perfil copiado al portapapeles!', {
            description: profileUrl,
          });
        }
      } catch (err) {
        console.error('Error al copiar enlace:', err);
        toast.error('No se pudo copiar el enlace.');
      }
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: profileUrl,
        });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          await copyFallback();
        }
      }
    } else {
      await copyFallback();
    }
  };

  const { doctor, fullName, matchedSpecialty, searchHighlight } = data;
  const fullDetailedName = buildDoctorFullName(doctor) || fullName;
  const shortName = buildDoctorShortName(doctor) || fullName;

  const specialtyPreview = [...data.specialtyPreview];

  if (matchedSpecialty) {
    const matchIndex = specialtyPreview.findIndex(
      (s) => s.toLowerCase() === matchedSpecialty.toLowerCase()
    );
    if (matchIndex > 0) {
      const [matched] = specialtyPreview.splice(matchIndex, 1);
      specialtyPreview.unshift(matched);
    }
  }

  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('') || 'MD';

  const priceInfo = getDoctorPriceDisplay(doctor);

  // Distance / Location logic
  const distanceInfo = getDistanceToDoctor(doctor.clinicas);
  const primaryLocationStr = data.matchedLocation || data.locationPreview[0] || 'Guatemala';
  const locationOrDistance = distanceInfo.formatted
    ? `${distanceInfo.formatted} · ${primaryLocationStr}`
    : primaryLocationStr;

  // Language preview
  const languages = (data.languagePreview && data.languagePreview.length > 0)
    ? data.languagePreview
    : (doctor.idiomas || []).map((i) => i.idioma).filter(Boolean);

  // Insurance preview
  const insurances = (data.insurancePreview && data.insurancePreview.length > 0)
    ? data.insurancePreview
    : (doctor.aseguradoras || []).map((a) => a.aseguradora).filter(Boolean);

  // Modalities logic
  const modalities = data.modalityPreview && data.modalityPreview.length > 0
    ? data.modalityPreview
    : (doctor.modalidades || []).map((m) => m.modalidad).filter(Boolean);

  const hasVirtual = modalities.some((m) =>
    m.toLowerCase().includes('virtual') || m.toLowerCase().includes('telemedicina')
  );
  const hasPresencial = modalities.some((m) => m.toLowerCase().includes('presencial')) || (doctor.clinicas && doctor.clinicas.length > 0);
  const hasDomicilio = modalities.some((m) => m.toLowerCase().includes('domicilio')) || (doctor.atencion_domicilio && doctor.atencion_domicilio.length > 0);

  // Al hacer clic en la tarjeta
  const handleCardClick = () => {
    onSelect?.(data);
  };

  // Al hacer clic explícito en "Ver Perfil"
  const handleVisitProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onVisit?.(data);
    router.push(`/dashboard/${doctor.exp_codigo}`);
  };

  // Al hacer clic en "Agendar Cita"
  const handleBookAppointment = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onVisit?.(data);
    router.push(`/dashboard/agendar/${doctor.exp_codigo}`);
  };

  // ═════════════════════════════════════════════════════════════════════════════════
  // VARIANT 1: EXPANDED (COMPACT, HIGH-DENSITY VIEW FOR SELECTED DOCTOR)
  // ═════════════════════════════════════════════════════════════════════════════════
  if (variant === 'expanded' || isSelected) {
    const activeClinic: DoctorClinica | undefined = doctor.clinicas?.[selectedClinicIndex] || doctor.clinicas?.[0];
    
    // Coordenadas y enlaces de navegación
    const hasCoords = activeClinic && typeof activeClinic.cli_latitud === 'number' && typeof activeClinic.cli_longitud === 'number';
    const googleMapsUrl = activeClinic?.cli_url_google_maps || (hasCoords ? `https://www.google.com/maps/dir/?api=1&destination=${activeClinic.cli_latitud},${activeClinic.cli_longitud}` : null);
    const wazeUrl = activeClinic?.cli_url_waze || (hasCoords ? `https://waze.com/ul?ll=${activeClinic.cli_latitud},${activeClinic.cli_longitud}&navigate=yes` : null);

    // Cálculo preciso de distancia en Km para la clínica activa o médico
    let activeClinicDistanceFormatted: string | null = null;
    if (location && activeClinic && typeof activeClinic.cli_latitud === 'number' && typeof activeClinic.cli_longitud === 'number') {
      const R = 6371; // Radio de la Tierra en km
      const dLat = (activeClinic.cli_latitud - location.lat) * (Math.PI / 180);
      const dLon = (activeClinic.cli_longitud - location.lng) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(location.lat * (Math.PI / 180)) *
          Math.cos(activeClinic.cli_latitud * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      activeClinicDistanceFormatted = d < 1 ? `A ${Math.round(d * 1000)} m` : `A ${d.toFixed(1)} km`;
    } else if (distanceInfo.formatted) {
      activeClinicDistanceFormatted = distanceInfo.formatted;
    }

    return (
      <>
        <div
          id={`doctor-card-${doctor.exp_codigo}`}
          className="w-full bg-white rounded-3xl overflow-hidden border-2 border-sky-500 shadow-xl p-4 sm:p-5 relative transition-all duration-300 text-slate-900"
        >
          {/* Botón flotante X para cerrar detalle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onClose) {
                onClose();
              } else {
                onSelect?.(data);
              }
            }}
            className="absolute top-3.5 right-3.5 z-20 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors shadow-xs cursor-pointer"
            title="Cerrar detalle"
            aria-label="Cerrar detalle"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-stretch sm:items-start">
            {/* Columna Izquierda: Foto compacta + Botones de Acción */}
            <div className="w-full sm:w-[150px] md:w-[160px] shrink-0 flex flex-col gap-2.5">
              {/* Foto con overlays */}
              <div className="w-full aspect-[4/3] sm:aspect-square relative rounded-2xl overflow-hidden bg-slate-100 shadow-inner">
                {doctor.exp_anios_experiencia ? (
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-xs text-slate-800 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs">
                    <Award className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>{doctor.exp_anios_experiencia}a exp.</span>
                  </div>
                ) : null}

                {/* Floating Action Buttons Top-Right (Share + Favorite) */}
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="p-1.5 rounded-full bg-black/30 backdrop-blur-xs text-white hover:text-sky-300 transition-transform hover:scale-110 focus:outline-none cursor-pointer"
                    title="Compartir perfil"
                    aria-label="Compartir perfil"
                  >
                    <Share2 className="w-4 h-4 drop-shadow-md" />
                  </button>

                  {titular && (
                    <button
                      type="button"
                      onClick={toggleFavorite}
                      className="p-1.5 rounded-full bg-black/30 backdrop-blur-xs transition-transform hover:scale-110 focus:outline-none cursor-pointer"
                      aria-label={isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                      title={isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                    >
                      <Heart
                        className={`w-4 h-4 transition-colors drop-shadow-md ${
                          isFavorito
                            ? 'fill-rose-500 text-rose-500'
                            : 'text-white fill-white/20 hover:text-rose-400'
                        }`}
                      />
                    </button>
                  )}
                </div>

                {doctor.exp_foto_perfil ? (
                  <Image
                    src={doctor.exp_foto_perfil}
                    alt={fullName}
                    fill
                    priority
                    sizes="(max-width: 640px) 100vw, 160px"
                    className="object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-black text-slate-300">
                    {initials}
                  </div>
                )}
              </div>

              {/* Botones de acción directos */}
              <button
                type="button"
                onClick={handleBookAppointment}
                className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-98 text-white font-bold text-xs shadow-sm shadow-sky-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Agendar Cita</span>
              </button>

              <button
                type="button"
                onClick={handleVisitProfile}
                className="w-full py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <span>Ver Perfil Completo</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Columna Derecha: Información Compacta y Sedes */}
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              {/* Header: Nombre arriba (ancho completo) + Metadatos/Precio abajo */}
              <div className="flex flex-col gap-2 border-b border-slate-100 pb-2.5">
                {/* Fila 1: Nombre completo y Profesión / Colegiado */}
                <div className="min-w-0 pr-8 sm:pr-10">
                  <h3 className="text-lg md:text-xl font-black text-slate-900 leading-snug break-words">
                    <HighlightText text={fullDetailedName} highlight={searchHighlight} />
                  </h3>
                  <p className="text-xs font-semibold text-sky-700 mt-0.5 break-words leading-snug">
                    {doctor.exp_profesion || specialtyPreview[0] || 'Médico y Cirujano'}
                    {doctor.exp_colegiado_gt && (
                      <span className="text-slate-500 font-normal ml-1.5">
                        · Col. {doctor.exp_colegiado_gt}
                      </span>
                    )}
                  </p>
                </div>

                {/* Fila 2: Items secundarios (Distancia, Rating, Precio) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {activeClinicDistanceFormatted && (
                      <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-lg text-xs font-bold shadow-2xs">
                        <Navigation className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{activeClinicDistanceFormatted}</span>
                      </div>
                    )}

                    {doctor.total_resenas > 0 && doctor.promedio_valoracion > 0 ? (
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-xs font-bold text-slate-900">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span>{doctor.promedio_valoracion.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-500">({doctor.total_resenas})</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        Nuevo
                      </span>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-1">
                    <span className="text-xs text-slate-500 font-medium">Consulta:</span>
                    <span className="text-sm font-black text-slate-900">
                      {priceInfo.hasPrice ? priceInfo.label : (
                        <span className="text-[11px] text-slate-400 font-semibold">Sin precio base</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fila de Insignias: Modalidades + Idiomas + Aseguradoras */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {specialtyPreview.slice(0, 2).map((spec, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/60"
                  >
                    {spec}
                  </span>
                ))}

                <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/70 text-[11px] text-slate-700">
                  <Video className="w-3 h-3 text-indigo-600 shrink-0" />
                  <span>
                    {[hasPresencial && 'Presencial', hasVirtual && 'Virtual', hasDomicilio && 'Domicilio'].filter(Boolean).join(' · ') || 'Consultar'}
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/70 text-[11px] text-slate-700" title={languages.join(', ')}>
                  <Globe className="w-3 h-3 text-sky-600 shrink-0" />
                  <span className="truncate max-w-[90px]">{languages[0] || 'Español'}</span>
                </div>

                {insurances.length > 0 && (
                  <div className="flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/70 text-[11px] text-purple-800" title={insurances.join(', ')}>
                    <ShieldCheck className="w-3 h-3 text-purple-600 shrink-0" />
                    <span>{insurances.length} seguro{insurances.length > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              {/* Sedes de Atención con Botones de Navegación y Ver Horarios en 3 Filas */}
              {doctor.clinicas && doctor.clinicas.length > 0 ? (
                <div className="bg-sky-50/70 p-3 rounded-2xl border border-sky-200/70 space-y-2.5">
                  {/* Selector de Sedes si hay más de 1 - Pestañas limpias solo con nombre comercial */}
                  {doctor.clinicas.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                      {doctor.clinicas.map((cli, idx) => {
                        const isCliSelected = (selectedClinicIndex === idx);
                        const name = cli.cli_descripcion || `Sede ${idx + 1}`;

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectClinic?.(idx);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                              isCliSelected
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-sky-50 hover:text-sky-700'
                            }`}
                          >
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span>{name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Tarjeta de la Clínica Activa: 3 Filas Bien Definidas */}
                  {activeClinic && (
                    <div className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-sky-100 w-full shadow-2xs">
                      {/* Fila 1: Nombre de la clínica (Izq) + Chip de distancia (Der) */}
                      <div className="flex items-center justify-between gap-2 w-full">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 break-words whitespace-normal">
                            {activeClinic.cli_descripcion || 'Clínica Principal'}
                          </h4>
                        </div>

                        {activeClinicDistanceFormatted && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 shrink-0">
                            <Navigation className="w-2.5 h-2.5 text-emerald-600" />
                            <span>{activeClinicDistanceFormatted}</span>
                          </span>
                        )}
                      </div>

                      {/* Fila 2: Dirección completa y limpia abarcando todo el ancho */}
                      {(() => {
                        const cleanZona = cleanZonaText(activeClinic.cli_zona);
                        const rawAddress = (activeClinic.cli_direccion_completa || '').trim();
                        let fullAddress = rawAddress;
                        if (cleanZona && !rawAddress.toLowerCase().includes(cleanZona.toLowerCase())) {
                          fullAddress = rawAddress ? `${rawAddress}, ${cleanZona}` : cleanZona;
                        }

                        return fullAddress ? (
                          <p className="text-xs text-slate-600 break-words whitespace-normal leading-relaxed pl-5.5 w-full">
                            {fullAddress}
                          </p>
                        ) : null;
                      })()}

                      {/* Fila 3: Tres botones de acción en fila inferior exclusiva */}
                      <div className="grid grid-cols-3 gap-1.5 w-full pt-1">
                        {/* Botón Ver Horarios */}
                        {activeClinic.horarios_atencion && activeClinic.horarios_atencion.length > 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsHorariosModalOpen(true);
                            }}
                            className="w-full h-8 px-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 active:scale-98 text-sky-700 text-[11px] font-bold transition-all border border-sky-200/80 cursor-pointer shadow-2xs flex items-center justify-center gap-1 whitespace-nowrap min-w-0"
                            title="Ver horarios de atención"
                          >
                            <Clock className="w-3 h-3 text-sky-600 shrink-0" />
                            <span className="truncate">Horarios ({activeClinic.horarios_atencion.length})</span>
                          </button>
                        ) : (
                          <div className="w-full h-8 px-1.5 rounded-xl bg-slate-50 text-slate-400 text-[11px] font-medium border border-slate-100 flex items-center justify-center gap-1 whitespace-nowrap min-w-0">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">Previa cita</span>
                          </div>
                        )}

                        {/* Botón Google Maps */}
                        {googleMapsUrl ? (
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="w-full h-8 px-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-[11px] font-bold shadow-2xs transition-all flex items-center justify-center gap-1 whitespace-nowrap min-w-0"
                            title="Abrir en Google Maps"
                          >
                            <Navigation className="w-2.5 h-2.5 fill-white text-white shrink-0" />
                            <span className="truncate">Google Maps</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                          </a>
                        ) : (
                          <div className="w-full h-8 px-1.5 rounded-xl bg-slate-50 text-slate-400 text-[11px] font-medium border border-slate-100 flex items-center justify-center whitespace-nowrap min-w-0">
                            <span className="truncate">Sin Maps</span>
                          </div>
                        )}

                        {/* Botón Waze */}
                        {wazeUrl ? (
                          <a
                            href={wazeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="w-full h-8 px-1.5 rounded-xl bg-[#33ccff] hover:bg-[#2bb8e6] active:scale-98 text-slate-900 text-[11px] font-bold shadow-2xs transition-all flex items-center justify-center gap-1 whitespace-nowrap min-w-0"
                            title="Abrir en Waze"
                          >
                            <Navigation className="w-2.5 h-2.5 text-slate-900 shrink-0" />
                            <span className="truncate">Waze</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                          </a>
                        ) : (
                          <div className="w-full h-8 px-1.5 rounded-xl bg-slate-50 text-slate-400 text-[11px] font-medium border border-slate-100 flex items-center justify-center whitespace-nowrap min-w-0">
                            <span className="truncate">Sin Waze</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : doctor.atencion_domicilio && doctor.atencion_domicilio.length > 0 ? (
                <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80 flex items-start gap-2 text-xs">
                  <Home className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="font-bold text-emerald-900 shrink-0">Atención a Domicilio:</span>
                  <span className="text-emerald-800 break-words whitespace-normal leading-relaxed">
                    {doctor.atencion_domicilio.map((d) => [d.mun_descripcion, cleanZonasDomicilio(d.lad_zonas)].filter(Boolean).join(' - ')).join(' · ')}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* MODAL DE HORARIOS DE ATENCIÓN (Portal a document.body para evitar conflicto de stacking contexts) */}
        {mounted && isHorariosModalOpen && activeClinic && createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={(e) => {
              e.stopPropagation();
              setIsHorariosModalOpen(false);
            }}
          >
            <div
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-sky-700 font-bold text-xs uppercase tracking-wider">
                    <Clock className="w-4 h-4" />
                    <span>Horarios de Atención</span>
                  </div>
                  <h4 className="text-base font-black text-slate-900">
                    {activeClinic.cli_descripcion || 'Clínica Principal'}
                  </h4>
                  {activeClinic.cli_direccion_completa && (
                    <p className="text-xs text-slate-500 truncate max-w-xs">
                      {activeClinic.cli_direccion_completa}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsHorariosModalOpen(false);
                  }}
                  className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Lista de Horarios */}
              {activeClinic.horarios_atencion && activeClinic.horarios_atencion.length > 0 ? (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {activeClinic.horarios_atencion.map((hor, hIdx) => {
                    const dayName = DAYS_MAP[hor.hor_dia_semana] || `Día ${hor.hor_dia_semana}`;
                    const start = formatTime(hor.hor_hora_inicio);
                    const end = formatTime(hor.hor_hora_fin);

                    return (
                      <div
                        key={hIdx}
                        className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold"
                      >
                        <span className="text-slate-800">{dayName}</span>
                        <span className="text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                          {start} - {end}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-2 text-center">
                  Horarios de atención previa cita o consulta directa.
                </p>
              )}

              {/* Footer Modal */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsHorariosModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════════
  // VARIANT 2: COMPACT (AIRBNB-STYLE GRID CARD WITH SMART SUMMARY ICONS)
  // ═════════════════════════════════════════════════════════════════════════════════
  return (
    <div
      id={`doctor-card-${data.doctor.exp_codigo}`}
      onClick={handleCardClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`doctor-card group flex flex-col h-full bg-white rounded-2xl overflow-hidden transition-all duration-300 border cursor-pointer relative ${
        isHovered
          ? 'shadow-md border-sky-300 ring-2 ring-sky-200/50 -translate-y-0.5'
          : 'shadow-xs hover:shadow-md hover:-translate-y-0.5 border-slate-100'
      }`}
    >
      {/* Photo Container (Aspect 4/3 Airbnb style) */}
      <div className="w-full aspect-[4/3] bg-slate-100 relative shrink-0 overflow-hidden rounded-t-2xl">
        {/* Floating Experience Badge Top-Left */}
        {doctor.exp_anios_experiencia ? (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-md text-slate-800 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-xs">
            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{doctor.exp_anios_experiencia} años exp.</span>
          </div>
        ) : null}

        {/* Floating Actions Top-Right (Share + Favorite) */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleShare}
            className="p-1.5 rounded-full bg-black/30 backdrop-blur-xs text-white hover:text-sky-300 transition-transform hover:scale-110 focus:outline-none cursor-pointer shadow-xs"
            title="Compartir perfil"
            aria-label="Compartir perfil"
          >
            <Share2 className="w-4.5 h-4.5 drop-shadow-sm" />
          </button>

          {titular && (
            <button
              type="button"
              onClick={toggleFavorite}
              className="p-1.5 rounded-full bg-black/30 backdrop-blur-xs transition-transform hover:scale-110 focus:outline-none cursor-pointer shadow-xs"
              aria-label={isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              title={isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            >
              <Heart
                className={`w-4.5 h-4.5 transition-colors drop-shadow-sm ${
                  isFavorito
                    ? 'fill-rose-500 text-rose-500'
                    : 'text-white fill-white/20 hover:text-rose-400'
                }`}
              />
            </button>
          )}
        </div>

        {/* Photo */}
        {doctor.exp_foto_perfil ? (
          <Image
            src={doctor.exp_foto_perfil}
            alt={fullName}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
            className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-black text-slate-300">
            {initials}
          </div>
        )}
      </div>

      {/* Information Body */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3 bg-white">
        <div className="space-y-2">
          {/* Fila 1: Nombre (Izq) | Calificación (Der) */}
          <div className="flex items-start justify-between gap-2 min-w-0">
            <h3
              className="font-bold text-slate-900 text-base leading-snug break-words whitespace-normal flex-1 min-w-0 group-hover:text-sky-600 transition-colors"
              title={fullDetailedName}
            >
              <HighlightText text={shortName} highlight={searchHighlight} />
            </h3>
            {doctor.total_resenas > 0 && doctor.promedio_valoracion > 0 ? (
              <div className="flex items-center gap-1 shrink-0 pt-0.5 bg-amber-50/80 px-2 py-0.5 rounded-lg border border-amber-200/60">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold text-slate-900">
                  {doctor.promedio_valoracion.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500">({doctor.total_resenas})</span>
              </div>
            ) : (
              <span className="inline-flex items-center text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                Nuevo
              </span>
            )}
          </div>

          {/* Fila 2: Especialidad + Modalidades de consulta agrupadas junto a ella */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sky-700 text-xs font-semibold break-words whitespace-normal leading-snug flex-1 min-w-0">
              <HighlightText
                text={data.matchedSpecialty || specialtyPreview[0] || 'Especialidad médica'}
                highlight={searchHighlight}
              />
              {doctor.exp_colegiado_gt && (
                <span className="text-slate-400 font-normal ml-1.5">
                  · Col. {doctor.exp_colegiado_gt}
                </span>
              )}
            </p>

            {/* Íconos de modalidades agrupados junto a la especialidad */}
            <div className="flex items-center gap-1 shrink-0" title={`Modalidades: ${modalities.join(', ') || 'Presencial'}`}>
              {hasPresencial && (
                <span title="Presencial" className="inline-flex items-center justify-center p-1 rounded-md bg-sky-50 text-sky-600">
                  <MapPin className="w-3.5 h-3.5" />
                </span>
              )}
              {hasVirtual && (
                <span title="Consulta Virtual" className="inline-flex items-center justify-center p-1 rounded-md bg-indigo-50 text-indigo-600">
                  <Video className="w-3.5 h-3.5" />
                </span>
              )}
              {hasDomicilio && (
                <span title="Atención a Domicilio" className="inline-flex items-center justify-center p-1 rounded-md bg-emerald-50 text-emerald-600">
                  <Home className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
          </div>

          {/* Fila 3: Múltiples ubicaciones sin ocultar datos (Bloque apilado verticalmente) */}
          <div className="flex flex-col gap-1 pt-0.5">
            {doctor.clinicas && doctor.clinicas.length > 0 ? (
              doctor.clinicas.map((cli, idx) => {
                const cliName = cli.cli_descripcion || `Clínica ${idx + 1}`;
                const zonaClean = cleanZonaShort(cli.cli_zona);
                const label = `${cliName}${zonaClean ? `, ${zonaClean}` : ''}`;

                return (
                  <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-600 leading-snug">
                    <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                    <span className="break-words whitespace-normal font-medium">
                      <HighlightText text={label} highlight={searchHighlight} />
                    </span>
                  </div>
                );
              })
            ) : doctor.atencion_domicilio && doctor.atencion_domicilio.length > 0 ? (
              <div className="flex items-start gap-1.5 text-xs text-emerald-700 leading-snug">
                <Home className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="break-words whitespace-normal font-medium">
                  Atención a domicilio {cleanZonasDomicilio(doctor.atencion_domicilio[0]?.lad_zonas)}
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-1.5 text-xs text-slate-500 leading-snug">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="break-words whitespace-normal">
                  <HighlightText text={locationOrDistance} highlight={searchHighlight} />
                </span>
              </div>
            )}

            {/* Si además de clínicas tiene domicilio, se muestra como viñeta adicional */}
            {doctor.clinicas && doctor.clinicas.length > 0 && doctor.atencion_domicilio && doctor.atencion_domicilio.length > 0 && (
              <div className="flex items-start gap-1.5 text-xs text-emerald-700 leading-snug">
                <Home className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="break-words whitespace-normal font-medium">
                  Atención a domicilio {cleanZonasDomicilio(doctor.atencion_domicilio[0]?.lad_zonas)}
                </span>
              </div>
            )}
          </div>

          {/* Fila 4: Idioma y Seguros en texto simple y limpio (sin contenedor gris) */}
          {(languages.length > 0 || insurances.length > 0) && (
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
              {languages.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{languages.slice(0, 2).join(', ')}</span>
                </span>
              )}
              {insurances.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{insurances.length} {insurances.length === 1 ? 'seguro' : 'seguros'}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Fila 5: Precio arriba + Botones de Acción abajo (Agendar Cita + Ver Perfil) */}
        <div className="pt-2.5 border-t border-slate-100 space-y-2">
          {/* Precio de la consulta */}
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-slate-500 font-medium">Precio consulta:</span>
            {priceInfo.hasPrice ? (
              <span className="font-extrabold text-slate-900 text-sm">
                {priceInfo.label}
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-slate-400">
                Sin precio base
              </span>
            )}
          </div>

          {/* Botones de acción en cuadrícula de 2 columnas */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleBookAppointment}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-sky-600 hover:bg-sky-700 active:scale-95 text-white cursor-pointer shadow-xs shadow-sky-600/20"
              title="Agendar Cita con este médico"
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Agendar Cita</span>
            </button>

            <button
              type="button"
              onClick={handleVisitProfile}
              className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/50 cursor-pointer shadow-2xs border border-sky-200/60 dark:border-sky-800/60"
              title="Ver perfil completo del especialista"
            >
              <span className="truncate">Ver Perfil</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}