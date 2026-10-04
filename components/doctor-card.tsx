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
  X,
  User,
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
import { ShareDoctorModal } from '@/components/share-doctor-modal';
import { InsuranceLogoBadge } from '@/components/insurance-logo-badge';

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
    const hasSelectedClinic = typeof selectedClinicIndex === 'number' && selectedClinicIndex >= 0 && !!doctor.clinicas?.[selectedClinicIndex];
    const activeClinic: DoctorClinica | undefined = hasSelectedClinic ? doctor.clinicas?.[selectedClinicIndex] : undefined;
    
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

                {sortedAseguradoras.length > 0 && (
                  <div
                    className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/70 text-[11px] text-slate-700"
                    title={`Aseguradoras aceptadas: ${sortedAseguradoras.map((a) => a.aseguradora).join(', ')}`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span className="text-[10.5px] font-medium text-slate-500 hidden sm:inline">Seguros:</span>
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
                        <span
                          className="text-[10px] font-bold text-slate-500 ml-0.5"
                          title={sortedAseguradoras.slice(4).map((a) => a.aseguradora).join(', ')}
                        >
                          +{sortedAseguradoras.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sedes de Atención con Botones de Navegación y Ver Horarios en 3 Filas */}
              {doctor.clinicas && doctor.clinicas.length > 0 ? (
                <div className="bg-sky-50/70 p-3 rounded-2xl border border-sky-200/70 space-y-2.5">
                  {/* Selector de Sedes de Atención */}
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
                            onSelectClinic?.(isCliSelected ? null : idx);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            isCliSelected
                              ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-300'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-sky-50 hover:text-sky-700'
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>{name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Tarjeta de la Clínica Activa: 3 Filas Bien Definidas */}
                  {activeClinic ? (
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
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-white border border-dashed border-sky-200 text-xs text-sky-800 font-medium text-center">
                      <MapPin className="w-4 h-4 text-sky-500 shrink-0" />
                      <span>Selecciona una sede arriba o en el mapa para ver horarios y ubicación</span>
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
  // VARIANT 2: COMPACT (MODERN UI FROM MARS REFACTORED CARD)
  // ═════════════════════════════════════════════════════════════════════════════════
  return (
    <div
      id={`doctor-card-${data.doctor.exp_codigo}`}
      onClick={handleCardClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`doctor-card group relative w-full max-w-[365px] mx-auto h-[480px] max-md:h-auto overflow-hidden bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200 cursor-pointer flex flex-col md:block ${
        isHovered ? 'ring-2 ring-blue-400/30 border-blue-400' : ''
      }`}
    >
      {/* 2. Imagen (Capa Fondo Arriba): h-[280px] */}
      <div className="relative max-md:h-[280px] md:absolute md:top-0 md:left-0 w-full h-[280px] z-0 overflow-hidden bg-slate-100 shrink-0">
        {/* Floating Experience Badge Top-Left */}
        {doctor.exp_anios_experiencia ? (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-md text-slate-800 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-xs">
            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{doctor.exp_anios_experiencia} años exp.</span>
          </div>
        ) : null}

        {/* Floating Actions Top-Right (Share + Favorite) */}
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleShare}
            className="p-1.5 rounded-full bg-black/40 backdrop-blur-xs text-white hover:text-sky-300 hover:bg-black/60 transition-all hover:scale-110 focus:outline-none cursor-pointer shadow-xs"
            title="Compartir perfil"
            aria-label="Compartir perfil"
          >
            <Share2 className="w-3.5 h-3.5 drop-shadow-xs" />
          </button>

          {titular && (
            <button
              type="button"
              onClick={toggleFavorite}
              className="p-1.5 rounded-full bg-black/40 backdrop-blur-xs transition-all hover:scale-110 focus:outline-none cursor-pointer shadow-xs hover:bg-black/60"
              aria-label={isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              title={isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            >
              <Heart
                className={`w-3.5 h-3.5 transition-colors drop-shadow-xs ${
                  isFavorito
                    ? 'fill-rose-500 text-rose-500'
                    : 'text-white fill-white/20 hover:text-rose-400'
                }`}
              />
            </button>
          )}
        </div>

        {/* Fotografía (w-full h-full object-cover) */}
        {doctor.exp_foto_perfil ? (
          <Image
            src={doctor.exp_foto_perfil}
            alt={fullName}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-black text-slate-300">
            {initials}
          </div>
        )}
      </div>

      {/* 3. Contenedor de Textos (Capa Media - Animada) */}
      <div className="relative md:absolute md:top-[280px] md:left-0 w-full h-auto md:h-[200px] bg-white p-5 flex flex-col justify-between transition-transform duration-300 md:group-hover:-translate-y-[64px] max-md:transform-none z-10">
        {/* Viñeta de Ubicación arriba del bloque de contenido (aparece en hover) */}
        <div className="absolute -top-3.5 left-4 sm:left-5 z-20 pointer-events-none opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/25 border border-blue-500/30 text-xs font-bold backdrop-blur-md">
            <MapPin className="w-3.5 h-3.5 text-white shrink-0" />
            <span>Haz clic para ver la ubicación</span>
          </span>
        </div>
        <div>
          {/* Header: Nombre + Calificación */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <h3
                className="text-base font-bold text-slate-900 leading-snug truncate hover:text-slate-700 transition-colors cursor-pointer"
                title={fullDetailedName}
                onClick={(e) => {
                  e.stopPropagation();
                  handleVisitProfile(e);
                }}
              >
                <HighlightText text={shortName} highlight={searchHighlight} />
              </h3>
            </div>

            {doctor.total_resenas > 0 && doctor.promedio_valoracion > 0 ? (
              <div className="inline-flex items-center gap-1 shrink-0 bg-amber-50/90 px-2 py-0.5 rounded-lg border border-amber-200/60 text-xs">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                <span className="font-bold text-slate-900">
                  {doctor.promedio_valoracion.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500">({doctor.total_resenas})</span>
              </div>
            ) : (
              <span className="inline-flex items-center text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg shrink-0">
                Nuevo
              </span>
            )}
          </div>

          {/* Fila 2: Especialidad */}
          <div className="mt-0.5">
            <p className="text-xs sm:text-sm font-semibold text-blue-600 leading-tight truncate">
              <HighlightText
                text={data.matchedSpecialty || specialtyPreview[0] || 'Médico Especialista'}
                highlight={searchHighlight}
              />
              {doctor.exp_colegiado_gt && (
                <span className="text-slate-400 font-normal ml-1.5 text-xs">
                  · Col. {doctor.exp_colegiado_gt}
                </span>
              )}
            </p>
          </div>

          {/* Ubicación: Ícono + Clínica/Sede */}
          {sedes.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate mt-1">
              {sedes[0].isDomicilio ? (
                <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              ) : (
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <span className="truncate" title={sedes[0].nombre}>
                <HighlightText text={sedes[0].nombre} highlight={searchHighlight} />
              </span>
              {sedes.length > 1 && (
                <span
                  className="text-blue-600 font-medium shrink-0 ml-0.5"
                  title={sedes.slice(1).map((s) => s.nombre).join(' • ')}
                >
                  +{sedes.length - 1} sedes
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          {/* Fila de Seguros y Precio */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-sm font-bold text-slate-900">
              {priceInfo.hasPrice ? priceInfo.label : 'Consultar precio'}
            </span>

            {sortedAseguradoras.length > 0 && (
              <div
                className="flex -space-x-2 items-center"
                title={`Aseguradoras: ${sortedAseguradoras.map((a) => a.aseguradora).join(', ')}`}
              >
                {sortedAseguradoras.slice(0, 4).map((asg, idx) => (
                  <div
                    key={idx}
                    className="w-6 h-6 border-2 border-white rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs overflow-hidden"
                  >
                    {asg.imagen ? (
                      <img
                        src={asg.imagen}
                        alt={asg.aseguradora}
                        className="w-full h-full object-contain p-0.5"
                      />
                    ) : (
                      <span className="text-[9px] font-bold text-slate-600">
                        {(asg.aseguradora || 'A')[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                ))}
                {sortedAseguradoras.length > 4 && (
                  <div className="w-6 h-6 border-2 border-white rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                    +{sortedAseguradoras.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modalidades: Solo íconos limpios SIN bordes de colores */}
          <div className="flex items-center gap-1.5 mt-1.5">
            {hasPresencial && (
              <span
                title="Atención Presencial en Clínica"
                className="inline-flex items-center justify-center p-1 rounded-md bg-sky-50 text-sky-600"
              >
                <MapPin className="w-3.5 h-3.5" />
              </span>
            )}
            {hasVirtual && (
              <span
                title="Consulta Virtual"
                className="inline-flex items-center justify-center p-1 rounded-md bg-indigo-50 text-indigo-600"
              >
                <Video className="w-3.5 h-3.5" />
              </span>
            )}
            {hasDomicilio && (
              <span
                title="Atención a Domicilio"
                className="inline-flex items-center justify-center p-1 rounded-md bg-emerald-50 text-emerald-600"
              >
                <Home className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          {/* Fila 2 de Detalles: Idiomas a la izquierda y Disponibilidad a la derecha */}
          <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5">
            {/* Idiomas a la izquierda */}
            <div className="flex items-center gap-1.5" title={`Idiomas: ${languages.join(', ') || 'Español'}`}>
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{languagesLabel}</span>
            </div>

            {/* Disponibilidad a la derecha */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
              <span>{isAvailableToday ? 'Disponible Hoy' : 'Con Cita'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Contenedor de Botones (Capa Fondo Abajo) */}
      <div className="relative md:absolute md:bottom-0 md:left-0 w-full h-auto md:h-[64px] px-5 pb-5 pt-1 flex gap-2 z-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 opacity-100 bg-white">
        <button
          type="button"
          onClick={handleBookAppointment}
          className="w-[60%] h-9.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
          title="Agendar Cita con este especialista"
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Agendar Cita</span>
        </button>

        <button
          type="button"
          onClick={handleVisitProfile}
          className="w-[40%] h-9.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 border border-slate-200 transition-all cursor-pointer"
          title="Ver perfil completo"
        >
          <span className="truncate">Ver Perfil</span>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        </button>
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