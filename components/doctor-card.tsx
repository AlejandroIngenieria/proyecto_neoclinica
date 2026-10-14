'use client';

import { useState, useEffect, useMemo } from 'react';
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
  CalendarDays,
  Map as MapIcon,
  X,
  User,
  Stethoscope,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type DoctorResponse,
  type DoctorClinica,
  getDoctorPriceDisplay,
  getDoctorLocationPrice,
  buildDoctorFullName,
  buildDoctorShortName,
  cleanZonaText,
  cleanZonaShort,
  cleanZonasDomicilio,
} from '@/types/doctor';
import { useFavoritos, useAddFavorito, useRemoveFavorito } from '@/hooks/use-favoritos';
import { usePacienteTitular } from '@/hooks/use-pacientes';
import { useUserLocation } from '@/hooks/use-user-location';
import { ShareDoctorModal } from '@/components/share-doctor-modal';
import { InsuranceLogoBadge } from '@/components/insurance-logo-badge';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';

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
  selectedInsurances?: string[];
};

type DoctorCardProps = {
  data: DoctorCardData;
  onVisit?: (data: DoctorCardData) => void;
  onSelect?: (data: DoctorCardData) => void;
  onClose?: () => void;
  onSelectClinic?: (clinicIndex: number | null) => void;
  selectedClinicIndex?: number | null;
  variant?: 'compact' | 'expanded';
  isHovered?: boolean;
  isSelected?: boolean;
  isHighlightedByLocation?: boolean;
  highlightedLocationName?: string | null;
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

export function HighlightText({ text, highlight }: { text: string; highlight?: string | string[] }) {
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
  isHighlightedByLocation = false,
  highlightedLocationName,
  onMouseEnter,
  onMouseLeave,
}: DoctorCardProps) {
  const router = useRouter();
  const [isHorariosModalOpen, setIsHorariosModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
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

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsShareModalOpen(true);
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

  // Insurance preview & sorting with active filter support
  const rawAseguradoras = doctor.aseguradoras || [];
  const selectedInsurances = data.selectedInsurances || [];
  const sortedAseguradoras = useMemo(() => {
    const list = [...rawAseguradoras];
    if (selectedInsurances.length === 0) return list;
    return list.sort((a, b) => {
      const aMatches = selectedInsurances.includes(a.aseguradora);
      const bMatches = selectedInsurances.includes(b.aseguradora);
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    });
  }, [rawAseguradoras, selectedInsurances]);

  const insurances = (data.insurancePreview && data.insurancePreview.length > 0)
    ? data.insurancePreview
    : rawAseguradoras.map((a) => a.aseguradora).filter(Boolean);

  // Modalities logic
  const modalities = data.modalityPreview && data.modalityPreview.length > 0
    ? data.modalityPreview
    : (doctor.modalidades || []).map((m) => m.modalidad).filter(Boolean);

  const hasVirtual = modalities.some((m) =>
    m.toLowerCase().includes('virtual') || m.toLowerCase().includes('telemedicina')
  );
  const hasPresencial = modalities.some((m) => m.toLowerCase().includes('presencial')) || (doctor.clinicas && doctor.clinicas.length > 0);
  const hasDomicilio = modalities.some((m) => m.toLowerCase().includes('domicilio')) || (doctor.atencion_domicilio && doctor.atencion_domicilio.length > 0);

  // Sedes list for smart grouping and truncation
  const clinicas = doctor.clinicas || [];
  const sedes: { nombre: string; isDomicilio?: boolean }[] = [
    ...clinicas.map((cli, idx) => {
      const cliName = cli.cli_descripcion || `Clínica ${idx + 1}`;
      const zonaClean = cleanZonaShort(cli.cli_zona);
      return {
        nombre: `${cliName}${zonaClean ? `, ${zonaClean}` : ''}`,
        isDomicilio: false,
      };
    }),
    ...(doctor.atencion_domicilio && doctor.atencion_domicilio.length > 0
      ? [
          {
            nombre: `Atención a domicilio ${cleanZonasDomicilio(doctor.atencion_domicilio[0]?.lad_zonas)}`,
            isDomicilio: true,
          },
        ]
      : []),
  ];

  if (sedes.length === 0) {
    sedes.push({
      nombre: locationOrDistance || 'Guatemala',
      isDomicilio: false,
    });
  }

  // Si hay una sede destacada por filtro/mapa, moverla al frente si coincide
  if (highlightedLocationName && sedes.length > 1) {
    const matchIdx = sedes.findIndex((s) =>
      s.nombre.toLowerCase().includes(highlightedLocationName.toLowerCase())
    );
    if (matchIdx > 0) {
      const [matched] = sedes.splice(matchIdx, 1);
      sedes.unshift(matched);
    }
  }

  // Etiquetas / Filtros activos para Variant 2
  const todayDayOfWeek = new Date().getDay();
  const isAvailableToday = clinicas.some((cli) =>
    (cli.horarios_atencion || []).some(
      (h) => h.hor_dia_semana === todayDayOfWeek || (todayDayOfWeek === 0 && h.hor_dia_semana === 7)
    )
  );

  const modalityList = [
    hasPresencial && 'Presencial',
    hasVirtual && 'Virtual',
    hasDomicilio && 'A Domicilio',
  ].filter(Boolean) as string[];
  const modalityLabel = modalityList.length > 1
    ? (hasPresencial && hasVirtual ? 'Presencial / Virtual' : modalityList.join(' / '))
    : (modalityList[0] || 'Presencial');

  const insurancesList = sortedAseguradoras.map((a) => a.aseguradora).filter(Boolean);
  const insurancesLabel = insurancesList.length > 0
    ? (insurancesList.slice(0, 2).join(', ') + (insurancesList.length > 2 ? ` +${insurancesList.length - 2}` : ''))
    : null;

  const languagesLabel = languages.length > 0
    ? Array.from(
        new Set(
          languages.map((l) => {
            const lower = l.toLowerCase().trim();
            if (lower.startsWith('ing') || lower.startsWith('eng')) return 'EN';
            if (lower.startsWith('esp') || lower.startsWith('spa')) return 'ES';
            if (lower.startsWith('fra') || lower.startsWith('fre')) return 'FR';
            if (lower.startsWith('ale') || lower.startsWith('ger') || lower.startsWith('deu')) return 'DE';
            if (lower.startsWith('por')) return 'PT';
            if (lower.startsWith('ita')) return 'IT';
            if (lower.startsWith('man') || lower.startsWith('chi') || lower.startsWith('zho')) return 'ZH';
            return l.slice(0, 2).toUpperCase();
          })
        )
      ).join(', ')
    : 'ES';

  const genderLabel = doctor.exp_sexo === 'F' ? 'Dra.' : 'Dr.';

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
    const hasClinicas = (doctor.clinicas || []).length > 0;
    const hasDomicilio = !!(doctor.atencion_domicilio && doctor.atencion_domicilio.length > 0);
    const isDomicilioSelected = selectedClinicIndex === -1 || (!hasClinicas && hasDomicilio);
    const hasSelectedClinic = !isDomicilioSelected && typeof selectedClinicIndex === 'number' && selectedClinicIndex >= 0 && !!doctor.clinicas?.[selectedClinicIndex];
    const activeClinic: DoctorClinica | undefined = hasSelectedClinic ? doctor.clinicas?.[selectedClinicIndex] : undefined;
    
    // Precio dinámico adaptado a la sede física o modalidad a domicilio seleccionada
    const locationPrice = getDoctorLocationPrice(doctor, selectedClinicIndex);
    
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
          className="scroll-mt-24 sm:scroll-mt-28 w-full bg-white rounded-3xl overflow-hidden border-2 border-[#11698E] shadow-xl p-4 sm:p-5 relative transition-all duration-300 text-slate-900"
        >
          {/* Botón flotante X para cerrar detalle en la esquina izquierda */}
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
            className="absolute top-3.5 left-3.5 z-30 p-2 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 transition-all shadow-md backdrop-blur-xs cursor-pointer"
            title="Cerrar detalle"
            aria-label="Cerrar detalle"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Botones de acción flotantes en la esquina superior derecha (donde estaba la X) */}
          <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleShare}
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors shadow-xs cursor-pointer"
              title="Compartir perfil"
              aria-label="Compartir perfil"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {titular && (
              <button
                type="button"
                onClick={toggleFavorite}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors shadow-xs cursor-pointer"
                aria-label={isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                title={isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    isFavorito
                      ? 'fill-rose-500 text-rose-500'
                      : 'text-slate-500 hover:text-rose-500'
                  }`}
                />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-stretch">
            {/* Columna Izquierda: Foto compacta + Botones de Acción */}
            <div className="w-full sm:w-[175px] md:w-[185px] shrink-0 flex flex-col gap-2 self-stretch">
              {/* Foto con overlays */}
              <div className="w-full aspect-[4/3] sm:aspect-square relative rounded-2xl overflow-hidden bg-slate-100 shadow-inner">
                {doctor.exp_anios_experiencia ? (
                  <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-xs text-slate-800 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs">
                    <Award className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>{doctor.exp_anios_experiencia}a exp.</span>
                  </div>
                ) : null}

                {doctor.exp_foto_perfil ? (
                  <Image
                    src={doctor.exp_foto_perfil}
                    alt={fullName}
                    fill
                    priority
                    sizes="(max-width: 640px) 100vw, 185px"
                    className="object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-black text-slate-300">
                    {initials}
                  </div>
                )}
              </div>

              {/* 1. Primero: Botón Ver Perfil Completo */}
              <button
                type="button"
                onClick={handleVisitProfile}
                className="text-[#11698E] bg-blue-50 hover:bg-blue-100 rounded-xl px-4 py-2 text-sm font-bold w-full transition-colors flex items-center justify-center gap-1 cursor-pointer mt-1"
              >
                <span>Ver Perfil Completo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* 2. Segundo: Botón Agendar Cita */}
              <button
                type="button"
                onClick={handleBookAppointment}
                className="w-full py-2.5 px-3 rounded-xl bg-[#19456B] hover:bg-[#10304a] active:scale-98 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-0.5"
              >
                <CalendarDays className="w-3.5 h-3.5 shrink-0 text-white" />
                <span>Agendar Cita</span>
              </button>

              {/* 3. Abajo del botón agendar: "Desde Q XX.XX" responsive con el alto disponible (sin fondo ni bordes) */}
              {locationPrice.hasPrice ? (
                <div className="w-full flex-1 flex items-center justify-center gap-1.5 py-1 text-center min-h-[28px]">
                  <span className="text-[11px] font-medium text-slate-500">Consulta</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">Desde</span>
                  <span className="text-xs sm:text-sm font-black text-[#19456B] dark:text-sky-400">Q{locationPrice.price}</span>
                </div>
              ) : (
                <div className="w-full flex-1 flex items-center justify-center py-1 text-center min-h-[28px]">
                  <span className="text-[11px] font-medium text-slate-400">
                    {isAvailableToday ? 'Atención disponible hoy' : 'Consulta previa cita'}
                  </span>
                </div>
              )}
            </div>

            {/* Columna Derecha: Información Compacta y Sedes */}
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              {/* Header: Nombre arriba + Metadatos limpios (sin precio flotante) */}
              <div className="flex flex-col gap-2 border-b border-slate-100 pb-2.5">
                {/* Fila 1: Nombre completo y Profesión / Colegiado (pr-20 para dejar espacio a compartir/favorito) */}
                <div className="min-w-0 pr-16 sm:pr-20">
                  <h3 className="text-lg md:text-xl font-black text-slate-900 leading-snug break-words">
                    <HighlightText text={fullDetailedName} highlight={searchHighlight} />
                  </h3>
                  <p className="text-xs font-semibold text-[#11698E] mt-0.5 break-words leading-snug">
                    {doctor.exp_profesion || specialtyPreview[0] || 'Médico y Cirujano'}
                    {doctor.exp_colegiado_gt && (
                      <span className="text-slate-500 font-normal ml-1.5">
                        · Col. {doctor.exp_colegiado_gt}
                      </span>
                    )}
                  </p>
                </div>

                {/* Fila 2: Items secundarios (Distancia, Rating) */}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {activeClinicDistanceFormatted && (
                    <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-lg text-xs font-bold shadow-2xs">
                      <Navigation className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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
              </div>

              {/* Fila de Insignias Limpias y Unificadas: Especialidad + Modalidades + Idiomas + Seguros */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {specialtyPreview.slice(0, 2).map((spec, i) => (
                  <span
                    key={i}
                    className="bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5"
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{spec}</span>
                  </span>
                ))}

                <div className="bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {[hasPresencial && 'Presencial', hasVirtual && 'Virtual', hasDomicilio && 'Domicilio'].filter(Boolean).join(' · ') || 'Consultar'}
                  </span>
                </div>

                <div
                  className="bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5"
                  title={languages.join(', ')}
                >
                  <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate max-w-[100px]">{languages.slice(0, 2).join(', ') || 'Español'}</span>
                </div>

                {sortedAseguradoras.length > 0 && (
                  <div
                    className="bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5"
                    title={`Aseguradoras aceptadas: ${sortedAseguradoras.map((a) => a.aseguradora).join(', ')}`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="hidden sm:inline">Seguros:</span>
                    <div className="flex items-center gap-1">
                      {sortedAseguradoras.slice(0, 4).map((asg, idx) => (
                        <InsuranceLogoBadge
                          key={idx}
                          asg={asg}
                          isHighlighted={selectedInsurances.includes(asg.aseguradora)}
                          size="xs"
                        />
                      ))}
                      {sortedAseguradoras.length > 4 && (
                        <span className="text-[10px] font-bold text-slate-500 ml-0.5">
                          +{sortedAseguradoras.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sedes de Atención y Atención a Domicilio */}
              {(hasClinicas || hasDomicilio) && (
                <div className="w-full mt-1">
                  {/* Selector de Sedes (Tabs Modernos) */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {/* Tabs de clínicas físicas */}
                    {hasClinicas && doctor.clinicas.map((cli, idx) => {
                      const isCliSelected = !isDomicilioSelected && (selectedClinicIndex === idx);
                      const name = cli.cli_descripcion || `Sede ${idx + 1}`;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectClinic?.(idx);
                          }}
                          className={`flex items-center gap-1.5 cursor-pointer shrink-0 transition-all ${
                            isCliSelected
                              ? 'bg-[#11698E] text-white shadow-sm rounded-xl px-4 py-2 text-sm font-bold'
                              : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl px-4 py-2 text-sm font-medium'
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>{name}</span>
                        </button>
                      );
                    })}

                    {/* Tab de Atención a Domicilio */}
                    {hasDomicilio && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClinic?.(-1);
                        }}
                        className={`flex items-center gap-1.5 cursor-pointer shrink-0 transition-all ${
                          isDomicilioSelected
                            ? 'bg-emerald-600 text-white shadow-sm rounded-xl px-4 py-2 text-sm font-bold'
                            : 'bg-white border border-slate-200 text-emerald-800 hover:bg-emerald-50 rounded-xl px-4 py-2 text-sm font-medium'
                        }`}
                      >
                        <Home className="w-3.5 h-3.5 shrink-0" />
                        <span>A Domicilio</span>
                        {doctor.atencion_domicilio[0]?.lad_zonas && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                            isDomicilioSelected ? 'bg-emerald-700/60 text-white' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {cleanZonasDomicilio(doctor.atencion_domicilio[0]?.lad_zonas).replace(/[()]/g, '') || 'Zonas'}
                          </span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Tarjeta de Ubicación Seleccionada (Sólida y Premium) */}
                  {isDomicilioSelected && hasDomicilio ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-4 space-y-3">
                      {/* Fila 1: Título y badge interactivo de zona en mapa */}
                      <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                            <Home className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              Servicio de Atención a Domicilio
                            </h4>
                            <p className="text-xs text-slate-500">
                              El médico se traslada a tu ubicación o residencia
                            </p>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/70 px-3 py-1 rounded-full border border-emerald-200 shrink-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Zona resaltada en mapa</span>
                        </span>
                      </div>

                      {/* Fila 2: Cobertura desglosada por municipio y zonas */}
                      <div className="space-y-2 pt-2 border-t border-slate-200/80">
                        {doctor.atencion_domicilio.map((dom, dIdx) => {
                          const zonasList = (dom.lad_zonas || '')
                            .split(/[,;\n]+/)
                            .map((z) => z.trim())
                            .filter(Boolean);

                          return (
                            <div key={dIdx} className="space-y-1.5">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{dom.mun_descripcion || 'Ciudad de Guatemala'}</span>
                                {dom.dep_descripcion && dom.dep_descripcion !== dom.mun_descripcion && (
                                  <span className="text-[11px] text-slate-400 font-normal">
                                    ({dom.dep_descripcion})
                                  </span>
                                )}
                              </div>

                              {/* Chips de Zonas */}
                              <div className="flex flex-wrap gap-1.5 pl-5">
                                {zonasList.length > 0 ? (
                                  zonasList.map((zona, zIdx) => {
                                    const cleanZ = zona.toLowerCase().startsWith('zona') ? zona : `Zona ${zona}`;
                                    return (
                                      <span
                                        key={zIdx}
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-white text-emerald-800 border border-emerald-200 shadow-2xs"
                                      >
                                        {cleanZ}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="text-xs text-slate-500 italic">
                                    Cobertura en todo el municipio
                                  </span>
                                )}
                              </div>

                              {dom.lad_observaciones && (
                                <p className="text-xs text-slate-500 pl-5 italic">
                                  Nota: {dom.lad_observaciones}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Fila 3: Botón directo para Agendar a Domicilio */}
                      <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-200/80 flex-wrap">
                        <span className="text-xs text-slate-500">
                          Previa confirmación de dirección y disponibilidad
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onVisit?.(data);
                            router.push(`/dashboard/agendar/${doctor.exp_codigo}?modalidad=domicilio`);
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Agendar a Domicilio</span>
                        </button>
                      </div>
                    </div>
                  ) : activeClinic ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-4 space-y-3">
                      {/* Fila 1: Nombre de la clínica + Chip de distancia */}
                      <div className="flex items-center justify-between gap-2 w-full">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className="w-4 h-4 text-[#11698E] shrink-0" />
                          <h4 className="text-sm font-bold text-slate-900 break-words whitespace-normal">
                            {activeClinic.cli_descripcion || 'Clínica Principal'}
                          </h4>
                        </div>

                        {activeClinicDistanceFormatted && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/70 shrink-0">
                            <Navigation className="w-3 h-3 text-emerald-600" />
                            <span>{activeClinicDistanceFormatted}</span>
                          </span>
                        )}
                      </div>

                      {/* Fila 2: Dirección completa y limpia */}
                      {(() => {
                        const cleanZona = cleanZonaText(activeClinic.cli_zona);
                        const rawAddress = (activeClinic.cli_direccion_completa || '').trim();
                        let fullAddress = rawAddress;
                        if (cleanZona && !rawAddress.toLowerCase().includes(cleanZona.toLowerCase())) {
                          fullAddress = rawAddress ? `${rawAddress}, ${cleanZona}` : cleanZona;
                        }

                        return fullAddress ? (
                          <p className="text-xs text-slate-600 break-words whitespace-normal leading-relaxed pl-6 w-full">
                            {fullAddress}
                          </p>
                        ) : null;
                      })()}

                      {/* Fila 3: Tres botones de acción unificados */}
                      <div className="grid grid-cols-3 gap-2 w-full pt-1">
                        {/* Botón Ver Horarios */}
                        {activeClinic.horarios_atencion && activeClinic.horarios_atencion.length > 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsHorariosModalOpen(true);
                            }}
                            className="w-full h-9 px-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 active:scale-98 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer min-w-0"
                            title="Ver horarios de atención"
                          >
                            <Clock className="w-3.5 h-3.5 text-[#11698E] shrink-0" />
                            <span className="truncate">Horarios ({activeClinic.horarios_atencion.length})</span>
                          </button>
                        ) : (
                          <div className="w-full h-9 px-2 rounded-xl bg-white/60 text-slate-400 text-xs font-medium border border-slate-200 flex items-center justify-center gap-1 min-w-0">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">Previa cita</span>
                          </div>
                        )}

                        {/* Botón Google Maps (Unificado) */}
                        {googleMapsUrl ? (
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="w-full h-9 px-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-98 text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer min-w-0"
                            title="Abrir en Google Maps"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335" />
                              <circle cx="12" cy="9" r="2.5" fill="#FFFFFF" />
                            </svg>
                            <span className="truncate">Google Maps</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                          </a>
                        ) : (
                          <div className="w-full h-9 px-2 rounded-xl bg-white/60 text-slate-400 text-xs font-medium border border-slate-200 flex items-center justify-center min-w-0">
                            <span className="truncate">Sin Maps</span>
                          </div>
                        )}

                        {/* Botón Waze (Unificado en #eef2f6 text-[#11698E]) */}
                        {wazeUrl ? (
                          <a
                            href={wazeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="w-full h-9 px-2 rounded-xl bg-[#eef2f6] text-[#11698E] hover:bg-blue-100 active:scale-98 text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer min-w-0"
                            title="Abrir en Waze"
                          >
                            <Navigation className="w-3.5 h-3.5 text-[#11698E] shrink-0" />
                            <span className="truncate">Waze</span>
                            <ExternalLink className="w-3 h-3 text-[#11698E]/60 shrink-0" />
                          </a>
                        ) : (
                          <div className="w-full h-9 px-2 rounded-xl bg-white/60 text-slate-400 text-xs font-medium border border-slate-200 flex items-center justify-center min-w-0">
                            <span className="truncate">Sin Waze</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-3 flex items-center justify-center gap-2 text-xs text-slate-600 font-medium text-center">
                      <MapPin className="w-4 h-4 text-[#11698E] shrink-0" />
                      <span>Selecciona una sede o atención a domicilio para ver los detalles</span>
                    </div>
                  )}
                </div>
              )}
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
  // VARIANT 2: PREMIUM LIGHT GLASSMORPHISM CARD
  // ═════════════════════════════════════════════════════════════════════════════════
  const isCardActive = isSelected || isHovered;

  return (
    <div
      id={`doctor-card-${data.doctor.exp_codigo}`}
      onClick={handleCardClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`doctor-card group relative overflow-hidden rounded-3xl bg-white shadow-xl transition-all duration-150 ease-out z-0 w-full max-w-[365px] mx-auto cursor-pointer flex flex-col ${
        isSelected
          ? 'ring-2 ring-blue-500 shadow-blue-500/20'
          : 'ring-1 ring-slate-200/80 hover:ring-2 hover:ring-blue-400 hover:shadow-2xl'
      } ${isHovered && !isSelected ? 'ring-2 ring-blue-400 shadow-2xl' : ''}`}
    >
      {/* ── 1. FOTOGRAFÍA CON DEGRADADO SUAVE EN BASE ── */}
      <div
        className={`relative w-full shrink-0 overflow-hidden will-change-transform transition-all duration-150 ease-out ${
          isCardActive ? 'h-52' : 'h-[254px] group-hover:h-52'
        }`}
      >

        {/* Fotografía */}
        {doctor.exp_foto_perfil ? (
          <img
            src={doctor.exp_foto_perfil}
            alt={fullName}
            className="absolute inset-0 w-full h-full object-cover object-top will-change-transform"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <span className="text-6xl font-black text-slate-400">{initials}</span>
          </div>
        )}

        {/* ── Badge Rating (Superior Izquierda) ── */}
        <div className="absolute top-3 left-3 z-10">
          {doctor.total_resenas > 0 && doctor.promedio_valoracion > 0 ? (
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold border border-white/10 shadow-lg">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
              <span className="font-bold text-white">{doctor.promedio_valoracion.toFixed(1)}</span>
              <span className="text-[10px] text-white/80 font-normal">({doctor.total_resenas})</span>
            </div>
          ) : (
            <div className="flex items-center text-xs font-semibold text-white/90 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-lg">
              Nuevo
            </div>
          )}
        </div>

        {/* ── Acciones Flotantes (Superior Derecha): Compartir + Favorito ── */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleShare}
                className="p-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white/80 hover:text-sky-300 hover:bg-black/70 hover:border-sky-400/30 transition-colors focus:outline-none cursor-pointer shadow-md"
                aria-label="Compartir perfil"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              Compartir perfil
            </TooltipContent>
          </Tooltip>

          {titular && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleFavorite}
                  className="p-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 hover:bg-black/70 transition-colors focus:outline-none cursor-pointer shadow-md"
                  aria-label={isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                >
                  <Heart
                    className={`w-3.5 h-3.5 transition-colors ${
                      isFavorito
                        ? 'fill-rose-500 text-rose-500'
                        : 'text-white/80 fill-transparent hover:text-rose-400 hover:fill-rose-400/20'
                    }`}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                {isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* ── Badge Precio (Inferior Derecha de la Foto) ── */}
        <div className="absolute bottom-3 right-3 z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-white border border-white/15 shadow-lg cursor-default select-none">
                <span className="text-[10px] text-white/80 font-normal">Desde</span>
                <span className="text-xs font-black text-white tracking-tight">
                  {priceInfo.hasPrice ? `Q${priceInfo.price}` : 'Consultar'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <span className="font-semibold block">Tarifa de consulta</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {priceInfo.hasPrice ? `Precio base desde Q${priceInfo.price}` : 'Precio a consultar con el médico'}
              </span>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* ── 2. SECCIÓN BLANCA: Información del doctor ── */}
      <div
        className={`px-4 pt-2.5 flex flex-col flex-1 justify-between transition-all duration-150 ease-out ${
          isCardActive ? 'pb-1' : 'pb-2.5 group-hover:pb-1'
        }`}
      >

        {/* Nombre + Indicador disponibilidad */}
        <div className="flex items-center gap-2 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <h3
                className="text-[16px] font-bold text-slate-900 leading-snug truncate hover:text-blue-600 transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVisitProfile(e);
                }}
              >
                <HighlightText text={shortName} highlight={searchHighlight} />
              </h3>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <span className="font-semibold block">{fullDetailedName}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Clic para ver perfil médico</span>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ring-2 cursor-pointer transition-transform hover:scale-125 ${
                  isAvailableToday
                    ? 'bg-emerald-500 ring-emerald-500/20'
                    : 'bg-slate-400 ring-slate-400/20'
                }`}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <span className="font-semibold flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isAvailableToday ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                {isAvailableToday ? 'Disponible para atención hoy' : 'Atención con cita previa'}
              </span>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Especialidad */}
        <p className="text-xs font-semibold text-blue-600 leading-tight truncate mt-0.5">
          <HighlightText
            text={data.matchedSpecialty || specialtyPreview[0] || 'Médico Especialista'}
            highlight={searchHighlight}
          />
        </p>

        {/* Fila intermedia: Idiomas + Aseguradoras (Izquierda) | Modalidades (Derecha) */}
        <div className="flex items-center justify-between mt-2 h-5">
          {/* Izquierda: Idiomas + Aseguradoras */}
          <div className="flex items-center gap-2">
            {/* Idiomas */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold cursor-default hover:text-slate-700 transition-colors">
                  <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{languagesLabel}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <span className="font-semibold block">Idiomas de atención</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {languages.length > 0 ? languages.join(', ') : 'Español'}
                </span>
              </TooltipContent>
            </Tooltip>

            {/* Aseguradoras */}
            {sortedAseguradoras.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 cursor-default">
                    {sortedAseguradoras.slice(0, 3).map((asg, idx) => (
                      <InsuranceLogoBadge
                        key={idx}
                        asg={asg}
                        isHighlighted={selectedInsurances.includes(asg.aseguradora)}
                        size="xs"
                      />
                    ))}
                    {sortedAseguradoras.length > 3 && (
                      <div className="w-4.5 h-4.5 border border-slate-200/90 dark:border-slate-700 rounded-[4px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[8px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                        +{sortedAseguradoras.length - 3}
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-xs">
                  <span className="font-semibold block">Aseguradoras aceptadas</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {sortedAseguradoras.map((a) => a.aseguradora).join(', ')}
                  </span>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Derecha: Modalidades */}
          <div className="flex items-center gap-1 text-blue-600">
            {hasPresencial && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 transition-colors flex items-center justify-center cursor-default">
                    <MapPin className="w-3.5 h-3.5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <span className="font-semibold block">Atención Presencial</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Consulta médica en clínica</span>
                </TooltipContent>
              </Tooltip>
            )}
            {hasVirtual && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 transition-colors flex items-center justify-center cursor-default">
                    <Video className="w-3.5 h-3.5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <span className="font-semibold block">Consulta Virtual</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Videollamada / Telemedicina</span>
                </TooltipContent>
              </Tooltip>
            )}
            {hasDomicilio && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 transition-colors flex items-center justify-center cursor-default">
                    <Home className="w-3.5 h-3.5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <span className="font-semibold block">Atención a Domicilio</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Visita médica en casa</span>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. BARRA DE ACCIONES FULL-BLEED (PROGRESIÓN AZUL) ── */}
      <div
        className={`flex w-full overflow-hidden rounded-b-3xl transition-all duration-150 ease-out ${
          isCardActive
            ? 'h-11 max-h-11 mt-2 opacity-100 pointer-events-auto'
            : 'h-0 max-h-0 mt-0 opacity-0 pointer-events-none group-hover:h-11 group-hover:max-h-11 group-hover:mt-2 group-hover:opacity-100 group-hover:pointer-events-auto'
        }`}
      >
        {/* 1. Botón Perfil (Claro/Secundario - Quita peso visual a la izquierda) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleVisitProfile}
              className="flex-1 bg-blue-200 hover:bg-blue-300 text-[#19456B] border-r border-[#11698E]/20 flex items-center justify-center gap-1.5 text-[11px] font-bold transition-colors cursor-pointer"
              aria-label="Ver perfil completo"
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Ver </span>
              <span>Perfil</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Ver perfil completo del especialista
          </TooltipContent>
        </Tooltip>

        {/* 2. Botón Sedes (Azul Medio - #11698E) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
              className="flex-1 bg-[#11698E] hover:bg-[#0f5a7a] text-white border-r border-[#19456B]/20 flex items-center justify-center gap-1.5 text-[11px] font-bold transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{sedes.length > 1 ? `${sedes.length} sedes` : '1 sede'}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-xs">
            <span className="font-semibold block">Ubicaciones y Sedes</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {sedes.map((s) => s.nombre).join(' • ')}
            </span>
          </TooltipContent>
        </Tooltip>

        {/* 3. Botón Agendar (Azul Oscuro/Primario - #19456B) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleBookAppointment}
              className="flex-1 bg-[#19456B] hover:bg-[#10304a] text-white flex items-center justify-center gap-1.5 text-[11px] font-bold transition-colors cursor-pointer"
            >
              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              <span>Agendar</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Agendar cita con el especialista
          </TooltipContent>
        </Tooltip>
      </div>

      <ShareDoctorModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        doctor={{
          nombre: fullDetailedName,
          especialidad: data.specialtyPreview[0] || data.matchedSpecialty || undefined,
          fotoPerfil: doctor.exp_foto_perfil,
          expCodigo: doctor.exp_codigo,
        }}
      />
    </div>
  );
}
