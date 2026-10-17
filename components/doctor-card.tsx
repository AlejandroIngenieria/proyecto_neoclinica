'use client';

import { useState, useEffect, useMemo, memo, useRef } from 'react';
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
  Navigation2,
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
  BadgeCheck,
  Info,
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
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { resolveDomicilioCoverage, MapCircle, type DomicilioCircle } from '@/components/directory-map';

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const GUATEMALA_CENTER = { lat: 14.601, lng: -90.515 };
const ZONA_OFFSETS: Record<string, { lat: number; lng: number }> = {
  '10': { lat: 14.598, lng: -90.513 },
  '14': { lat: 14.582, lng: -90.518 },
  '9': { lat: 14.611, lng: -90.516 },
  '1': { lat: 14.642, lng: -90.513 },
  '11': { lat: 14.615, lng: -90.551 },
  '15': { lat: 14.595, lng: -90.485 },
  '16': { lat: 14.612, lng: -90.472 },
  '4': { lat: 14.621, lng: -90.518 },
};

// Controlador interno para trazar ruta desde usuario al médico y ajustar límites de visualización
function MiniMapRouteAndBounds({
  origin,
  destination,
  coverageCircles,
  isDomicilio,
}: {
  origin?: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number };
  coverageCircles?: DomicilioCircle[];
  isDomicilio?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof window === 'undefined' || !(window as any).google?.maps) return;
    const googleMaps = (window as any).google.maps;

    let directionsRenderer: any = null;
    let fallbackPolyline: any = null;

    const bounds = new googleMaps.LatLngBounds();

    if (isDomicilio && coverageCircles && coverageCircles.length > 0) {
      coverageCircles.forEach((c) => {
        const latDelta = c.radiusMeters / 111000;
        const lngDelta = c.radiusMeters / (111000 * Math.cos(c.lat * (Math.PI / 180)));
        bounds.extend({ lat: c.lat + latDelta, lng: c.lng + lngDelta });
        bounds.extend({ lat: c.lat - latDelta, lng: c.lng - lngDelta });
      });
      if (origin) {
        bounds.extend(origin);
      }
      map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
    } else if (origin) {
      bounds.extend(origin);
      bounds.extend(destination);
      map.fitBounds(bounds, { top: 55, bottom: 55, left: 55, right: 55 });
    } else {
      map.panTo(destination);
      map.setZoom(15);
    }

    // Trazo de ruta de la ubicación del usuario al médico / centroide de cobertura
    if (origin) {
      const directionsService = new googleMaps.DirectionsService();
      directionsService.route(
        {
          origin,
          destination,
          travelMode: googleMaps.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          if (status === googleMaps.DirectionsStatus.OK && result) {
            directionsRenderer = new googleMaps.DirectionsRenderer({
              map,
              directions: result,
              suppressMarkers: true,
              preserveViewport: true,
              polylineOptions: {
                strokeColor: isDomicilio ? '#059669' : '#0284C7',
                strokeOpacity: 0.85,
                strokeWeight: 4,
              },
            });
          } else {
            fallbackPolyline = new googleMaps.Polyline({
              path: [origin, destination],
              geodesic: true,
              strokeColor: isDomicilio ? '#059669' : '#0284C7',
              strokeOpacity: 0.85,
              strokeWeight: 3.5,
              map,
              icons: [
                {
                  icon: {
                    path: googleMaps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 3,
                    strokeColor: isDomicilio ? '#047857' : '#0073B1',
                    fillColor: isDomicilio ? '#059669' : '#0284C7',
                    fillOpacity: 1,
                  },
                  offset: '100%',
                },
              ],
            });
          }
        }
      );
    }

    return () => {
      if (directionsRenderer) directionsRenderer.setMap(null);
      if (fallbackPolyline) fallbackPolyline.setMap(null);
    };
  }, [map, origin?.lat, origin?.lng, destination.lat, destination.lng, isDomicilio, coverageCircles]);

  return null;
}

function ClinicMiniMap({
  lat,
  lng,
  title,
  address,
  distanceFormatted,
  googleMapsUrl,
  userLocation,
  isDomicilio,
  domicilioZonas,
}: {
  lat: number;
  lng: number;
  title: string;
  address?: string | null;
  distanceFormatted?: string | null;
  googleMapsUrl?: string | null;
  userLocation?: { lat: number; lng: number } | null;
  isDomicilio?: boolean;
  domicilioZonas?: DomicilioCircle[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !MAPS_API_KEY) {
    return (
      <div className="w-full h-full min-h-[300px] lg:min-h-[420px] rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${isDomicilio ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-[#EFF4FF] dark:bg-sky-950/60 text-[#0284C7] dark:text-sky-400'}`}>
          {isDomicilio ? <Home className="w-7 h-7" /> : <MapPin className="w-7 h-7" />}
        </div>
        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</span>
        {address && <span className="text-xs text-[#64748B] dark:text-slate-400 mt-1 max-w-[280px] leading-relaxed">{address}</span>}
        {googleMapsUrl && !isDomicilio && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-700 text-xs font-semibold text-[#0284C7] dark:text-sky-300 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <span>Ver en Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    );
  }

  const effectiveOrigin = userLocation || GUATEMALA_CENTER;

  return (
    <div className="w-full h-full min-h-[300px] lg:min-h-[420px] rounded-2xl overflow-hidden relative bg-slate-100 dark:bg-slate-900 group">
      <APIProvider apiKey={MAPS_API_KEY} libraries={['marker']}>
        <GoogleMap
          mapId="CLINIC_MINI_MAP"
          center={{ lat, lng }}
          defaultZoom={isDomicilio ? 13 : 15}
          gestureHandling="cooperative"
          disableDefaultUI={true}
          zoomControl={true}
          className="w-full h-full min-h-[300px] lg:min-h-[420px]"
        >
          {/* Controlador de bounds y trazo de ruta con DirectionsService */}
          <MiniMapRouteAndBounds
            origin={effectiveOrigin}
            destination={{ lat, lng }}
            coverageCircles={domicilioZonas}
            isDomicilio={isDomicilio}
          />

          {/* Círculos de cobertura resaltada en caso de Atención a Domicilio */}
          {isDomicilio && domicilioZonas && domicilioZonas.map((zone, zIdx) => (
            <MapCircle
              key={`mini_circle_${zIdx}_${zone.lat}_${zone.lng}`}
              center={{ lat: zone.lat, lng: zone.lng }}
              radius={zone.radiusMeters}
              options={{
                fillColor: '#10B981',
                fillOpacity: 0.22,
                strokeColor: '#059669',
                strokeOpacity: 0.85,
                strokeWeight: 2,
              }}
            />
          ))}

          {/* Marcador de Ubicación del Usuario con indicador de pulso */}
          {effectiveOrigin && (
            <AdvancedMarker position={effectiveOrigin} zIndex={100}>
              <div className="relative flex flex-col items-center select-none group cursor-pointer -translate-y-full pb-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-white font-extrabold text-[11px] shadow-xl border-2 border-sky-400">
                  <Navigation className="w-3 h-3 fill-sky-400 text-sky-400 shrink-0" />
                  <span>Tu ubicación</span>
                </div>
                <div className="w-2 h-2 bg-slate-900 border-r-2 border-b-2 border-sky-400 rotate-45 -mt-1 shadow-xs" />
              </div>
            </AdvancedMarker>
          )}

          {/* Marcador del Médico / Sede o Centroide de Cobertura a Domicilio */}
          <AdvancedMarker position={{ lat, lng }} zIndex={110}>
            <div className="relative flex flex-col items-center select-none cursor-pointer -translate-y-full pb-1">
              {isDomicilio ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs shadow-md border-2 border-white ring-1 ring-black/10">
                  <Home className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                  <span className="truncate max-w-[170px]">{title}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#0284C7] to-[#0073B1] text-white font-semibold text-xs shadow-md border-2 border-white ring-1 ring-black/10">
                  <MapPin className="w-3.5 h-3.5 text-sky-200 shrink-0" />
                  <span className="truncate max-w-[170px]">{title}</span>
                </div>
              )}
              <div className={`w-2.5 h-2.5 rotate-45 -mt-1 shadow-xs ${isDomicilio ? 'bg-teal-700' : 'bg-[#0073B1]'}`} />
            </div>
          </AdvancedMarker>
        </GoogleMap>
      </APIProvider>

      {/* Badge flotante superior izquierdo: Estado / Distancia con ruta */}
      <div className={`absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
        isDomicilio ? 'text-emerald-700 dark:text-emerald-300' : 'text-[#0284C7] dark:text-sky-300'
      }`}>
        {isDomicilio ? (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Cobertura a Domicilio</span>
          </>
        ) : (
          <>
            <Navigation className="w-3.5 h-3.5 text-[#0284C7] dark:text-sky-400 shrink-0" />
            <span>{distanceFormatted || 'Ruta trazada'}</span>
          </>
        )}
      </div>

      {/* Botón flotante para abrir en Google Maps (solo para sedes físicas) */}
      {googleMapsUrl && !isDomicilio && (
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-700 hover:text-[#0284C7] dark:text-slate-200 dark:hover:text-white shadow-sm text-xs font-semibold transition-all hover:scale-105"
          title="Abrir en Google Maps"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Google Maps</span>
        </a>
      )}

      {/* Badge flotante inferior con nombre de sede o zonas cubiertas */}
      <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-[#475569] dark:text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm max-w-[280px]">
        {isDomicilio ? (
          <>
            <Home className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">{address || 'Zonas de Cobertura'}</span>
          </>
        ) : (
          <>
            <MapPin className="w-3.5 h-3.5 text-[#0284C7] dark:text-sky-400 shrink-0" />
            <span className="truncate">{title}</span>
          </>
        )}
      </div>
    </div>
  );
}
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
  hideMap?: boolean;
  userLocation?: { lat: number; lng: number } | null;
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

function getInsuranceShortName(name: string): string {
  if (!name) return '';
  const clean = name.trim();
  if (/roble/i.test(clean)) return 'Roble';
  if (/g&t|gyt/i.test(clean)) return 'G&T';
  if (/palig|pan-american/i.test(clean)) return 'Palig';
  if (/universales/i.test(clean)) return 'Universales';
  if (/mapfre/i.test(clean)) return 'Mapfre';
  if (/bupa/i.test(clean)) return 'Bupa';
  if (/bam/i.test(clean)) return 'BAM';
  if (/vivir/i.test(clean)) return 'Vivir';
  if (/agn/i.test(clean)) return 'AGN';
  const cleanPrefix = clean.replace(/^(seguros|aseguradora|seguro)\s+/i, '');
  const words = cleanPrefix.split(' ');
  const firstWord = words[0];
  return firstWord.length > 9 ? firstWord.slice(0, 8) + '…' : firstWord;
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

function DoctorCardComponent({
  data,
  onVisit,
  onSelect,
  onClose,
  onSelectClinic,
  selectedClinicIndex: controlledClinicIndex,
  variant = 'compact',
  hideMap = true,
  userLocation,
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

  const hasDocClinicas = (data.doctor.clinicas || []).length > 0;
  const hasDocDomicilio = !!(data.doctor.atencion_domicilio && data.doctor.atencion_domicilio.length > 0);
  const [internalClinicIndex, setInternalClinicIndex] = useState<number | null>(
    (!hasDocClinicas && hasDocDomicilio) ? -1 : 0
  );

  const selectedClinicIndex = controlledClinicIndex !== undefined ? controlledClinicIndex : internalClinicIndex;
  const handleClinicChange = (idx: number | null) => {
    setInternalClinicIndex(idx);
    onSelectClinic?.(idx);
  };

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
  const effectiveUserOrigin = userLocation || location || GUATEMALA_CENTER;

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
  // SHARED DOCTOR CARD RENDERER (COMPACT CARD: CERO RUIDO ESTRUCTURAL)
  // ═════════════════════════════════════════════════════════════════════════════════
  const renderDoctorCardBase = (isInsideSelected = false) => {
    return (
      <div
        className={`doctor-card group relative overflow-hidden transition-all duration-200 ease-out flex flex-col ${
          isInsideSelected
            ? 'w-full h-full'
            : 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/90 hover:border-[#0284C7] dark:hover:border-sky-400 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:shadow-[0_4px_20px_rgba(2,132,199,0.14)] hover:ring-2 hover:ring-[#0284C7]/20 dark:hover:ring-sky-400/20 w-full max-w-[360px] h-full mx-auto cursor-pointer p-4 sm:p-5 z-0 justify-between'
        } ${
          isSelected && !isInsideSelected
            ? 'ring-2 ring-[#0284C7]/70 border-[#0284C7] shadow-sm'
            : ''
        } ${isHovered && !isSelected ? 'border-[#0284C7] dark:border-sky-400 ring-2 ring-[#0284C7]/30 dark:ring-sky-400/30 shadow-[0_4px_20px_rgba(2,132,199,0.14)]' : ''}`}
      >
        {/* ── 1. FILA SUPERIOR: RATING (SOLO SI TIENE RESEÑAS) + BOTONES ACCIÓN ── */}
        <div className="flex items-center justify-between mb-1.5 min-h-[28px]">
          {/* Micro-indicador Rating si tiene reseñas, vacío si no */}
          {doctor.total_resenas > 0 && doctor.promedio_valoracion > 0 ? (
            <div className="flex items-center gap-1.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/40 px-2 py-0.5 rounded-full text-[11px] shadow-2xs select-none">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0 drop-shadow-[0_1px_2px_rgba(245,158,11,0.4)]" />
              <span className="font-extrabold text-slate-800 dark:text-slate-100">
                {doctor.promedio_valoracion.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-400 font-normal">
                ({doctor.total_resenas})
              </span>
            </div>
          ) : (
            <div />
          )}

          {/* Acciones Superiores: Compartir + Favorito (bordes muy tenues) */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-7 h-7 rounded-full border border-slate-100 dark:border-slate-800/80 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  aria-label="Compartir perfil"
                >
                  <Share2 className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Compartir perfil
              </TooltipContent>
            </Tooltip>

            {titular && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggleFavorite}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                      isFavorito
                        ? 'border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 text-rose-500'
                        : 'border-slate-100 dark:border-slate-800/80 bg-white/80 dark:bg-slate-800/80 text-slate-400 hover:text-rose-500'
                    }`}
                    aria-label={isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                  >
                    <Heart
                      className={`w-3 h-3 transition-colors ${
                        isFavorito
                          ? 'fill-rose-500 text-rose-500'
                          : 'text-slate-400 hover:text-rose-500'
                      }`}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* ── 2. SECCIÓN CENTRAL: AVATAR, NOMBRE Y ESPECIALIDAD ── */}
        <div className="flex flex-col items-center">
          <div className="relative mx-auto mt-1 mb-3.5 flex justify-center">
            {/* Avatar protagonista */}
            <div className="relative w-28 h-28 rounded-full border border-slate-100 dark:border-slate-800 shadow-[0_4px_16px_rgba(15,23,42,0.06)] overflow-hidden bg-white dark:bg-slate-900 isolate">
              {doctor.exp_foto_perfil ? (
                <Image
                  src={doctor.exp_foto_perfil}
                  alt={fullName}
                  fill
                  sizes="112px"
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800">
                  {initials}
                </div>
              )}
            </div>

            {/* Badge Verificado */}
            <div className="absolute bottom-1 right-1 sm:right-2 z-10 rounded-full bg-white dark:bg-slate-900 p-[2px] shadow-sm flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
              <BadgeCheck className="w-5 h-5 text-white fill-[#0284C7]" />
            </div>

            {/* Badge Precio Pill ("Desde Q 275") */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 bg-slate-950/95 dark:bg-[#070e1c] text-white text-xs font-bold px-3.5 py-1 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.3)] whitespace-nowrap border border-sky-500/20 tracking-tight select-none flex items-center gap-1 backdrop-blur-md">
              {priceInfo.hasPrice ? (
                <>
                  <span className="text-[10px] font-normal text-sky-300">Desde</span>
                  <span className="text-xs font-extrabold text-white">Q {priceInfo.price}</span>
                </>
              ) : (
                <span className="text-xs font-semibold text-slate-200">
                  {isAvailableToday ? 'Atención hoy' : 'Previa cita'}
                </span>
              )}
            </div>
          </div>

          {/* Nombre del Doctor + Indicador + Especialidad */}
          <div className="mt-3.5 text-center w-full">
            <div className="flex items-center justify-center gap-1.5 px-1">
              <h3
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight hover:text-[#0284C7] dark:hover:text-sky-400 transition-colors cursor-pointer truncate"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVisitProfile(e);
                }}
                title={fullDetailedName}
              >
                <HighlightText text={shortName} highlight={searchHighlight} />
              </h3>
              <span
                className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shrink-0"
                title={isAvailableToday ? 'Disponible hoy' : 'Atención previa cita'}
              />
            </div>

            <p className="text-[11px] font-bold uppercase tracking-wider text-[#0284C7] dark:text-sky-400 mt-0.5 truncate px-1">
              <HighlightText
                text={data.matchedSpecialty || specialtyPreview[0] || doctor.exp_profesion || 'Médico Especialista'}
                highlight={searchHighlight}
              />
            </p>
          </div>
        </div>

        {/* ── 3. BLOQUE DE ATRIBUTOS (IDIOMAS, SEGUROS, MODALIDADES) ── */}
        <div className="flex flex-col gap-3 mt-5 px-1">
          {/* Fila 1: Idiomas & Seguros */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] sm:text-[13px] font-medium text-slate-600 dark:text-slate-300">
              <Globe className="w-4 h-4 text-slate-400 dark:text-slate-400 shrink-0" />
              <span>{languagesLabel}</span>
            </div>

            {/* Micro-logos de seguros aceptados */}
            <div className="flex items-center gap-1 border border-slate-100 dark:border-slate-800/80 p-0.5 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 select-none">
              {sortedAseguradoras.length > 0 ? (
                <>
                  {sortedAseguradoras.slice(0, 3).map((asg, idx) => {
                    const isSelectedAsg = selectedInsurances.includes(asg.aseguradora);
                    return (
                      <Tooltip key={idx}>
                        <TooltipTrigger asChild>
                          <div
                            className={`inline-flex items-center justify-center p-0.5 rounded-sm border transition-all cursor-pointer ${
                              isSelectedAsg
                                ? 'bg-sky-50 dark:bg-sky-950/70 border-sky-400 dark:border-sky-500 ring-1 ring-sky-400/50 shadow-2xs'
                                : 'bg-white/90 dark:bg-slate-900 border-slate-200/70 dark:border-slate-700/80 hover:border-slate-300 shadow-2xs'
                            }`}
                          >
                            <InsuranceLogoBadge asg={asg} size="xs" showName={false} isHighlighted={isSelectedAsg} />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs font-semibold">
                          {asg.aseguradora}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                  {sortedAseguradoras.length > 3 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center justify-center h-4 px-1 rounded-sm bg-white/90 dark:bg-slate-900 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700 shadow-2xs cursor-pointer">
                          +{sortedAseguradoras.length - 3}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs font-semibold">
                        {sortedAseguradoras.slice(3).map((a) => a.aseguradora).join(', ')}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </>
              ) : (
                <span className="text-slate-400 dark:text-slate-400 px-1.5 py-0.5 rounded text-[10px] font-medium">
                  Particular
                </span>
              )}
            </div>
          </div>

          {/* Fila 2: Modalidades adaptativas */}
          <div className="flex items-center gap-1 sm:gap-1.5 text-[10.5px] sm:text-[11px] font-medium text-slate-600 dark:text-slate-300 w-full min-h-[20px] overflow-hidden">
            {hasPresencial && (
              <div className="flex items-center gap-1 shrink-0" title="Atención Presencial en clínica">
                <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 shrink-0" />
                <span className="text-slate-700 dark:text-slate-200">Presencial</span>
              </div>
            )}
            {hasPresencial && (hasVirtual || hasDomicilio) && (
              <span className="text-slate-300 dark:text-slate-600 font-bold select-none text-[10px] shrink-0">·</span>
            )}
            {hasVirtual && (
              <div className="flex items-center gap-1 shrink-0" title="Consulta Virtual / Telemedicina">
                <Video className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 shrink-0" />
                <span className="text-slate-700 dark:text-slate-200">Virtual</span>
              </div>
            )}
            {hasVirtual && hasDomicilio && (
              <span className="text-slate-300 dark:text-slate-600 font-bold select-none text-[10px] shrink-0">·</span>
            )}
            {hasDomicilio && (
              <div className="flex items-center gap-1 min-w-0 shrink" title="Atención médica a domicilio">
                <Home className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 shrink-0" />
                <span className="text-slate-700 dark:text-slate-200 truncate">Domicilio</span>
              </div>
            )}
            {!hasPresencial && !hasVirtual && !hasDomicilio && (
              <div className="flex items-center gap-1 shrink-0">
                <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 shrink-0" />
                <span className="text-slate-700 dark:text-slate-200">Presencial</span>
              </div>
            )}
          </div>
        </div>

        {/* Fila de Acción Binaria */}
        <div className="flex gap-2.5 border-t border-slate-50 dark:border-slate-800/60 pt-4 mt-auto w-full">
          {/* Botón Secundario: Detalles */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="flex-1 bg-[#EFF4FF] hover:bg-blue-50 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 text-[#0284C7] dark:text-sky-300 font-semibold py-3 rounded-xl text-[13px] transition-colors cursor-pointer text-center"
          >
            Detalles
          </button>

          {/* Botón Primario: Agendar Cita */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleBookAppointment(e);
            }}
            className="flex-[1.5] bg-[#0284C7] hover:bg-[#0073B1] active:scale-[0.98] text-white font-semibold py-3 rounded-xl text-[13px] shadow-[0_2px_8px_rgba(2,132,199,0.2)] transition-colors flex justify-center items-center gap-1.5 cursor-pointer text-center"
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Agendar Cita</span>
          </button>
        </div>
      </div>
    );
  };

  // ═════════════════════════════════════════════════════════════════════════════════
  // VARIANT 1: MODAL EXPANDIDO DE UBICACIONES (RESPONSIVE GRID)
  // ═════════════════════════════════════════════════════════════════════════════════
  if (variant === 'expanded' || isSelected) {
    const hasClinicas = (doctor.clinicas || []).length > 0;
    const hasDomicilio = !!(doctor.atencion_domicilio && doctor.atencion_domicilio.length > 0);
    const isDomicilioSelected = selectedClinicIndex === -1 || (!hasClinicas && hasDomicilio);
    const domicilioCoverage = hasDomicilio ? resolveDomicilioCoverage(doctor.atencion_domicilio) : null;
    
    // Si no es domicilio, determinar la clínica activa de forma segura
    const effectiveClinicIndex = (typeof selectedClinicIndex === 'number' && selectedClinicIndex >= 0 && selectedClinicIndex < (doctor.clinicas?.length || 0))
      ? selectedClinicIndex
      : 0;
    const activeClinic: DoctorClinica | undefined = (!isDomicilioSelected && hasClinicas)
      ? doctor.clinicas?.[effectiveClinicIndex]
      : undefined;
    
    // Consulta de precio específico para la sede seleccionada o a domicilio (-1)
    const activePricingIndex = isDomicilioSelected ? -1 : effectiveClinicIndex;
    const locationPriceInfo = getDoctorLocationPrice(doctor, activePricingIndex);

    // Coordenadas y enlaces de navegación
    const hasCoords = activeClinic && typeof activeClinic.cli_latitud === 'number' && typeof activeClinic.cli_longitud === 'number';
    const googleMapsUrl = activeClinic?.cli_url_google_maps || (hasCoords ? `https://www.google.com/maps/dir/?api=1&destination=${activeClinic.cli_latitud},${activeClinic.cli_longitud}` : null);
    const wazeUrl = activeClinic?.cli_url_waze || (hasCoords ? `https://waze.com/ul?ll=${activeClinic.cli_latitud},${activeClinic.cli_longitud}&navigate=yes` : null);

    // Helper para cálculo preciso de distancia en Km por clínica
    const getClinicDist = (cli: DoctorClinica) => {
      if (location && typeof cli.cli_latitud === 'number' && typeof cli.cli_longitud === 'number' && cli.cli_latitud !== 0) {
        const R = 6371;
        const dLat = (cli.cli_latitud - location.lat) * (Math.PI / 180);
        const dLon = (cli.cli_longitud - location.lng) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(location.lat * (Math.PI / 180)) *
            Math.cos(cli.cli_latitud * (Math.PI / 180)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return d < 1 ? `A ${Math.round(d * 1000)} m` : `A ${d.toFixed(1)} km`;
      }
      return distanceInfo.formatted ? `A ${distanceInfo.formatted}` : null;
    };

    const activeClinicDistanceFormatted = activeClinic
      ? getClinicDist(activeClinic)
      : (distanceInfo.formatted ? `A ${distanceInfo.formatted}` : null);

    const totalUbicaciones = (doctor.clinicas?.length || 0) + (hasDomicilio ? 1 : 0);

    // Coordenadas para el mapa interactivo
    const clinicLat = (typeof activeClinic?.cli_latitud === 'number' && activeClinic.cli_latitud !== 0)
      ? activeClinic.cli_latitud
      : (activeClinic?.cli_zona && ZONA_OFFSETS[cleanZonaShort(activeClinic.cli_zona)])
        ? ZONA_OFFSETS[cleanZonaShort(activeClinic.cli_zona)].lat
        : GUATEMALA_CENTER.lat;

    const clinicLng = (typeof activeClinic?.cli_longitud === 'number' && activeClinic.cli_longitud !== 0)
      ? activeClinic.cli_longitud
      : (activeClinic?.cli_zona && ZONA_OFFSETS[cleanZonaShort(activeClinic.cli_zona)])
        ? ZONA_OFFSETS[cleanZonaShort(activeClinic.cli_zona)].lng
        : GUATEMALA_CENTER.lng;

    const finalMapLat = (isDomicilioSelected && domicilioCoverage)
      ? domicilioCoverage.centroid.lat
      : clinicLat;

    const finalMapLng = (isDomicilioSelected && domicilioCoverage)
      ? domicilioCoverage.centroid.lng
      : clinicLng;

    const finalMapTitle = isDomicilioSelected
      ? 'Atención Médica a Domicilio'
      : (activeClinic?.cli_descripcion || activeClinic?.cli_direccion_completa || 'Sede de Atención');

    const finalMapAddress = (isDomicilioSelected && domicilioCoverage)
      ? domicilioCoverage.labels
      : (activeClinic?.cli_direccion_completa || activeClinic?.cli_zona || 'Ciudad de Guatemala');

    const finalDistanceFormatted = isDomicilioSelected
      ? 'Zona de Cobertura'
      : activeClinicDistanceFormatted;

    return (
      <>
        <div
          id={`doctor-card-${doctor.exp_codigo}`}
          className="doctor-card-selected scroll-mt-24 sm:scroll-mt-28 w-full bg-white dark:bg-slate-900 rounded-[28px] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-[0_10px_35px_rgba(15,23,42,0.06)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.35)] relative transition-all duration-300 text-slate-900 dark:text-white"
        >
          {/* Botón flotante X para cerrar detalle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onClose) onClose();
              else onSelect?.(data);
            }}
            className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-[#F1F4FA] hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer active:scale-95 shadow-xs"
            title="Cerrar detalle"
            aria-label="Cerrar detalle"
          >
            <X className="w-4 h-4" />
          </button>

          {/* ════ RESPONSIVE GRID (grid-cols-1 md:grid-cols-12) ════ */}
          <div className="grid grid-cols-1 md:grid-cols-12 items-start divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800/80 w-full">
            {/* ── 1. COLUMNA IZQUIERDA: PERFIL EXPEDIENTE CLÍNICO ── */}
            <div className={`${hideMap ? 'md:col-span-5 lg:col-span-5' : 'md:col-span-4 lg:col-span-3'} bg-white dark:bg-slate-900 p-4 sm:p-5 xl:p-6 flex flex-col items-start text-left h-fit md:sticky md:top-6`}>
              <div className="w-full">
                {/* Badges superiores: Rating / Nuevo + Acciones Compartir/Favorito */}
                <div className="flex items-center justify-between w-full mb-3.5 sm:mb-4 pr-10 md:pr-0">
                  {doctor.total_resenas > 0 && doctor.promedio_valoracion > 0 ? (
                    <div className="flex items-center gap-1.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 px-2.5 py-1 rounded-full text-xs shadow-2xs select-none">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0 drop-shadow-[0_1px_2px_rgba(245,158,11,0.4)]" />
                      <span className="font-extrabold text-slate-800 dark:text-slate-100">
                        {doctor.promedio_valoracion.toFixed(1)}
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        ({doctor.total_resenas})
                      </span>
                    </div>
                  ) : (
                    <span className="inline-flex items-center text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 select-none">
                      Nuevo
                    </span>
                  )}

                  <div className="flex items-center gap-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={handleShare}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#F1F4FA] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          aria-label="Compartir perfil"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Compartir perfil
                      </TooltipContent>
                    </Tooltip>

                    {titular && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={toggleFavorite}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                              isFavorito
                                ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-500'
                                : 'bg-[#F1F4FA] dark:bg-slate-800 text-[#64748B] hover:text-rose-500'
                            }`}
                            aria-label={isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                          >
                            <Heart
                              className={`w-3.5 h-3.5 transition-colors ${
                                isFavorito ? 'fill-rose-500 text-rose-500' : 'text-slate-400'
                              }`}
                            />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>

                {/* Contenedor responsivo de Foto y Datos (en tablet sm: a md: en fila para ahorrar espacio vertical) */}
                <div className="flex flex-col sm:flex-row md:flex-col items-start gap-3.5 sm:gap-4 md:gap-3.5 w-full">
                  {/* Avatar con borde suave, efecto de elevación y badge verificado */}
                  <div className="relative inline-block shrink-0">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-24 md:h-24 xl:w-28 xl:h-28 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-[0_4px_16px_rgba(15,23,42,0.06)] bg-white dark:bg-slate-900 isolate">
                      {doctor.exp_foto_perfil ? (
                        <Image
                          src={doctor.exp_foto_perfil}
                          alt={fullName}
                          fill
                          sizes="(max-width: 640px) 80px, (max-width: 1280px) 96px, 112px"
                          className="object-cover object-top"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl sm:text-2xl font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800">
                          {initials}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 z-10 rounded-full bg-white dark:bg-slate-900 p-[2px] shadow-sm flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                      <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-[#0284C7]" />
                    </div>
                  </div>

                  {/* Nombre, Especialidad, Tarifas y Badges */}
                  <div className="w-full min-w-0 flex-1">
                    <h3
                      className="text-base sm:text-lg xl:text-xl font-bold text-[#0F172A] dark:text-white tracking-tight hover:text-[#0284C7] dark:hover:text-sky-400 transition-colors cursor-pointer leading-snug break-words"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVisitProfile(e);
                      }}
                      title={fullDetailedName}
                    >
                      <HighlightText text={shortName} highlight={searchHighlight} />
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shrink-0 ml-2 align-middle mb-0.5"
                        title={isAvailableToday ? 'Disponible hoy' : 'Atención previa cita'}
                      />
                    </h3>

                    <p className="text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-[#0284C7] dark:text-sky-400 mt-0.5 sm:mt-1 leading-snug break-words">
                      <HighlightText
                        text={data.matchedSpecialty || specialtyPreview[0] || doctor.exp_profesion || 'Médico Especialista'}
                        highlight={searchHighlight}
                      />
                    </p>

                    {/* Precio de Consulta */}
                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                      {locationPriceInfo.hasPrice ? (
                        <span className="font-medium">
                          Consulta: <strong className="font-extrabold text-[#0F172A] dark:text-white text-xs sm:text-sm">Q {locationPriceInfo.price}</strong>
                        </span>
                      ) : priceInfo.hasPrice ? (
                        <span className="font-medium">
                          Desde: <strong className="font-extrabold text-[#0F172A] dark:text-white text-xs sm:text-sm">Q {priceInfo.price}</strong>
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-500 dark:text-slate-400">
                          {isAvailableToday ? 'Atención hoy' : 'Previa cita'}
                        </span>
                      )}
                    </div>

                    {/* Idiomas & Modalidades chips */}
                    <div className="mt-2.5 sm:mt-3 flex items-center gap-1.5 flex-wrap">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-[#F8F9FF] dark:bg-slate-800 text-[11px] sm:text-xs font-medium text-[#475569] dark:text-slate-300 border border-slate-100 dark:border-slate-700/80">
                        <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0284C7] dark:text-sky-400 shrink-0" />
                        <span>{languagesLabel}</span>
                      </div>

                      {hasPresencial && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-[#F8F9FF] dark:bg-slate-800 text-[11px] sm:text-xs font-medium text-[#475569] dark:text-slate-300 border border-slate-100 dark:border-slate-700/80">
                          <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0284C7] shrink-0" />
                          <span>Presencial</span>
                        </span>
                      )}

                      {hasVirtual && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-[#F8F9FF] dark:bg-slate-800 text-[11px] sm:text-xs font-medium text-[#475569] dark:text-slate-300 border border-slate-100 dark:border-slate-700/80">
                          <Video className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0284C7] shrink-0" />
                          <span>Virtual</span>
                        </span>
                      )}

                      {hasDomicilio && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-[#F8F9FF] dark:bg-slate-800 text-[11px] sm:text-xs font-medium text-[#475569] dark:text-slate-300 border border-slate-100 dark:border-slate-700/80">
                          <Home className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0284C7] shrink-0" />
                          <span>Domicilio</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción: apilados en móvil/escritorio, lado a lado en tablets */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-2 sm:gap-2.5 mt-5 sm:mt-6 w-full">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBookAppointment(e);
                  }}
                  className="flex-1 w-full bg-[#0284C7] hover:bg-[#0073B1] active:scale-[0.98] text-white font-semibold py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <CalendarDays className="w-4 h-4 shrink-0" />
                  <span>Agendar Cita</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVisitProfile(e);
                  }}
                  className="flex-1 w-full bg-[#EFF4FF] hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0284C7] dark:text-sky-300 font-medium py-2.5 sm:py-3 rounded-xl text-xs sm:text-[13px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <User className="w-4 h-4 shrink-0" />
                  <span>Ver perfil completo</span>
                </button>
              </div>
            </div>

            {/* ── 2. COLUMNA CENTRAL: LISTA VERTICAL DE SEDES ── */}
            <div className={`${hideMap ? 'md:col-span-7 lg:col-span-7' : 'md:col-span-8 lg:col-span-5'} p-4 sm:p-5 xl:p-6 flex flex-col justify-between gap-5 bg-slate-50/30 dark:bg-slate-900/40`}>
              <div className="flex flex-col gap-3 w-full">
                <h3 className="text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {totalUbicaciones} {totalUbicaciones === 1 ? 'Ubicación Disponible' : 'Ubicaciones Disponibles'}
                </h3>

                {/* LISTA VERTICAL DE SEDES CLÍNICAS */}
                {hasClinicas && doctor.clinicas.map((cli, idx) => {
                  const isCliActive = !isDomicilioSelected && (effectiveClinicIndex === idx);
                  const dist = getClinicDist(cli);
                  const cleanZona = cleanZonaText(cli.cli_zona);
                  const rawAddress = (cli.cli_direccion_completa || '').trim();
                  let fullAddress = rawAddress;
                  if (cleanZona && !rawAddress.toLowerCase().includes(cleanZona.toLowerCase())) {
                    fullAddress = rawAddress ? `${rawAddress}, ${cleanZona}` : cleanZona;
                  }

                  if (isCliActive) {
                    return (
                      <div
                        key={idx}
                        className="bg-white dark:bg-slate-800 border-2 border-[#0284C7] rounded-2xl p-4 shadow-sm flex flex-col gap-3.5 transition-all"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex flex-col min-w-0">
                            <h4 className="text-[15px] font-bold text-[#0F172A] dark:text-white leading-snug">
                              {cli.cli_descripcion || `Sede ${idx + 1}`}
                            </h4>
                            {fullAddress && (
                              <span className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                {fullAddress}
                              </span>
                            )}
                            {locationPriceInfo.hasPrice && (
                              <span className="text-[11px] font-semibold text-[#0284C7] dark:text-sky-400 mt-1">
                                Consulta: Q {locationPriceInfo.price}
                              </span>
                            )}
                          </div>
                          {dist && (
                            <span className="bg-[#EFF4FF] dark:bg-sky-950/60 text-[#0284C7] dark:text-sky-300 text-[11px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shrink-0">
                              <Navigation className="w-3 h-3" />
                              <span>{dist}</span>
                            </span>
                          )}
                        </div>

                        {/* Detalles Internos de la Sede Activa */}
                        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-700/80 pt-3">
                          {cli.horarios_atencion && cli.horarios_atencion.length > 0 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsHorariosModalOpen(true);
                              }}
                              className="flex flex-col items-center justify-center gap-1 bg-[#F8F9FF] hover:bg-blue-50 dark:bg-slate-700/60 dark:hover:bg-slate-700 py-2.5 rounded-xl text-[11px] font-medium text-slate-600 dark:text-slate-200 transition-colors cursor-pointer"
                            >
                              <Clock className="w-4 h-4 text-[#0284C7] dark:text-sky-400" />
                              <span>Horarios</span>
                            </button>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1 bg-[#F8F9FF] dark:bg-slate-700/40 py-2.5 rounded-xl text-[11px] font-medium text-slate-400 dark:text-slate-400">
                              <Clock className="w-4 h-4" />
                              <span>Previa cita</span>
                            </div>
                          )}

                          {googleMapsUrl ? (
                            <a
                              href={googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex flex-col items-center justify-center gap-1 bg-[#F8F9FF] hover:bg-blue-50 dark:bg-slate-700/60 dark:hover:bg-slate-700 py-2.5 rounded-xl text-[11px] font-medium text-slate-600 dark:text-slate-200 transition-colors cursor-pointer"
                            >
                              <MapIcon className="w-4 h-4 text-rose-500" />
                              <span>Google Maps</span>
                            </a>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1 bg-[#F8F9FF] dark:bg-slate-700/40 py-2.5 rounded-xl text-[11px] font-medium text-slate-400 dark:text-slate-400">
                              <MapIcon className="w-4 h-4" />
                              <span>Maps</span>
                            </div>
                          )}

                          {wazeUrl ? (
                            <a
                              href={wazeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex flex-col items-center justify-center gap-1 bg-[#F8F9FF] hover:bg-blue-50 dark:bg-slate-700/60 dark:hover:bg-slate-700 py-2.5 rounded-xl text-[11px] font-medium text-slate-600 dark:text-slate-200 transition-colors cursor-pointer"
                            >
                              <Navigation2 className="w-4 h-4 text-[#0284C7] dark:text-sky-400" />
                              <span>Waze</span>
                            </a>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1 bg-[#F8F9FF] dark:bg-slate-700/40 py-2.5 rounded-xl text-[11px] font-medium text-slate-400 dark:text-slate-400">
                              <Navigation2 className="w-4 h-4" />
                              <span>Waze</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClinicChange(idx);
                      }}
                      className="bg-white dark:bg-slate-800/80 border border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 rounded-2xl p-4 flex justify-between items-center text-left transition-all group cursor-pointer w-full shadow-2xs hover:shadow-xs"
                    >
                      <div className="flex flex-col min-w-0 pr-3">
                        <h4 className="text-[14px] font-semibold text-slate-600 dark:text-slate-300 group-hover:text-[#0F172A] dark:group-hover:text-white truncate">
                          {cli.cli_descripcion || `Sede ${idx + 1}`}
                        </h4>
                        <span className="text-[12px] text-slate-400 dark:text-slate-400 mt-0.5 truncate">
                          {cleanZona || 'Ciudad de Guatemala'}
                        </span>
                      </div>
                      <span className="text-slate-400 dark:text-slate-400 text-[11px] font-medium shrink-0">
                        {dist || 'Ver'}
                      </span>
                    </button>
                  );
                })}

                {/* ATENCIÓN A DOMICILIO (Si aplica) */}
                {hasDomicilio && (
                  isDomicilioSelected ? (
                    <div className="bg-white dark:bg-slate-800 border-2 border-emerald-600 dark:border-emerald-500 rounded-2xl p-4 shadow-sm flex flex-col gap-3 transition-all">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4 text-emerald-600 shrink-0" />
                            <h4 className="text-[15px] font-bold text-[#0F172A] dark:text-white">
                              Atención Médica a Domicilio
                            </h4>
                          </div>
                          <span className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
                            El especialista se traslada a tu residencia o ubicación
                          </span>
                        </div>
                        <span className="bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shrink-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Activo
                        </span>
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-700/80 pt-2.5 space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                          Zonas de Cobertura
                        </span>
                        {doctor.atencion_domicilio.map((dom, dIdx) => {
                          const zonasList = (dom.lad_zonas || '')
                            .split(/[,;\n]+/)
                            .map((z) => z.trim())
                            .filter(Boolean);
                          return (
                            <div key={dIdx} className="space-y-1">
                              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {dom.mun_descripcion || 'Ciudad de Guatemala'}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {zonasList.length > 0 ? (
                                  zonasList.map((zona, zIdx) => {
                                    const cleanZ = zona.toLowerCase().startsWith('zona') ? zona : `Zona ${zona}`;
                                    return (
                                      <span
                                        key={zIdx}
                                        className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-[#F1F4FA] dark:bg-slate-700/60 text-[#475569] dark:text-emerald-300"
                                      >
                                        {cleanZ}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="text-xs text-slate-400 italic">
                                    Cobertura en todo el municipio
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-700/80 pt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onVisit?.(data);
                            router.push(`/dashboard/agendar/${doctor.exp_codigo}?modalidad=domicilio`);
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Agendar a Domicilio</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClinicChange(-1);
                      }}
                      className="bg-white dark:bg-slate-800/80 border border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 rounded-2xl p-4 flex justify-between items-center text-left transition-all group cursor-pointer w-full shadow-2xs hover:shadow-xs"
                    >
                      <div className="flex flex-col min-w-0 pr-3">
                        <div className="flex items-center gap-1.5">
                          <Home className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                          <h4 className="text-[14px] font-semibold text-slate-600 dark:text-slate-300 group-hover:text-[#0F172A] dark:group-hover:text-white truncate">
                            Atención Médica a Domicilio
                          </h4>
                        </div>
                        <span className="text-[12px] text-slate-400 dark:text-slate-400 mt-0.5 truncate pl-5">
                          Cobertura en zonas metropolitanas
                        </span>
                      </div>
                      <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold shrink-0">
                        Disponible
                      </span>
                    </button>
                  )
                )}
              </div>

              {/* Seguros Aceptados (debajo de la lista de sedes) */}
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-semibold text-[#64748B] dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#0284C7] dark:text-sky-400" />
                    <span>Seguros Aceptados</span>
                  </div>
                  {sortedAseguradoras.length > 0 && (
                    <span className="text-[11px] font-medium text-[#0284C7] dark:text-sky-400 bg-[#EFF4FF] dark:bg-sky-950/60 px-2 py-0.5 rounded-full">
                      {sortedAseguradoras.length} {sortedAseguradoras.length === 1 ? 'convenio' : 'convenios'}
                    </span>
                  )}
                </div>

                {sortedAseguradoras.length > 0 ? (
                  <div className="flex flex-wrap gap-2 w-full pt-1">
                    {sortedAseguradoras.map((asg, idx) => {
                      const isSelectedAsg = selectedInsurances.includes(asg.aseguradora);
                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-colors ${
                            isSelectedAsg
                              ? 'bg-[#EFF4FF] dark:bg-sky-950/70 text-[#0284C7] dark:text-sky-200 font-semibold ring-1 ring-[#0284C7]/30'
                              : 'bg-[#F8F9FF] dark:bg-slate-800 text-[#475569] dark:text-slate-300 font-medium'
                          }`}
                        >
                          <InsuranceLogoBadge asg={asg} size="xs" showName={false} isHighlighted={isSelectedAsg} />
                          <span>{asg.aseguradora}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                    Atención particular únicamente (sin convenios directos).
                  </p>
                )}
              </div>
            </div>

            {/* ── 3. COLUMNA DERECHA: MAPA (Solo cuando NO se navega con el mapa principal) ── */}
            {!hideMap && (
              <div className="lg:col-span-4 p-5 flex flex-col justify-center min-h-[320px] lg:min-h-full lg:self-stretch">
                <div className="w-full h-full min-h-[300px] lg:min-h-[420px] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800/80 relative">
                  <ClinicMiniMap
                    lat={finalMapLat}
                    lng={finalMapLng}
                    title={finalMapTitle}
                    address={finalMapAddress}
                    distanceFormatted={finalDistanceFormatted}
                    googleMapsUrl={isDomicilioSelected ? null : googleMapsUrl}
                    userLocation={effectiveUserOrigin}
                    isDomicilio={isDomicilioSelected}
                    domicilioZonas={domicilioCoverage?.circles}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL DE HORARIOS DE ATENCIÓN */}
        {mounted && isHorariosModalOpen && activeClinic && createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150"
            onClick={(e) => {
              e.stopPropagation();
              setIsHorariosModalOpen(false);
            }}
          >
            <div
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-[0_20px_60px_rgba(11,28,48,0.12)] border border-slate-200/50 dark:border-slate-800 text-slate-900 dark:text-slate-100 space-y-4 animate-in zoom-in-95 duration-150 relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-[#006194] dark:text-sky-400 font-bold text-xs uppercase tracking-wider">
                    <Clock className="w-4 h-4" />
                    <span>Horarios de Atención</span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {activeClinic.cli_descripcion || 'Clínica Principal'}
                  </h4>
                  {activeClinic.cli_direccion_completa && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
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
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Cerrar"
                  aria-label="Cerrar modal"
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
                        className="flex items-center justify-between py-2 px-3 rounded-xl bg-[#eff4ff]/30 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/60 text-xs font-semibold"
                      >
                        <span className="text-slate-800 dark:text-slate-200">{dayName}</span>
                        <span className="text-[#006194] dark:text-sky-400 font-bold bg-[#eff4ff] dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-[#006194]/20 dark:border-slate-700/60">
                          {start} - {end}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2 text-center">
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
                  className="px-5 py-2.5 rounded-xl bg-[#006194] hover:bg-[#00517c] text-white font-semibold text-xs transition active:scale-95 shadow-xs cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {isShareModalOpen && (
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
        )}
      </>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════════
  // VARIANT 2: UNSELECTED DOCTOR CARD (STANDALONE CARD)
  // ═════════════════════════════════════════════════════════════════════════════════
  return (
    <div
      id={`doctor-card-${data.doctor.exp_codigo}`}
      onClick={handleCardClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="w-full h-full flex justify-center"
    >
      {renderDoctorCardBase(false)}

      {isShareModalOpen && (
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
      )}
    </div>
  );
}

function areDoctorCardPropsEqual(prev: DoctorCardProps, next: DoctorCardProps) {
  return (
    prev.data.doctor.exp_codigo === next.data.doctor.exp_codigo &&
    prev.data.fullName === next.data.fullName &&
    prev.data.matchedSpecialty === next.data.matchedSpecialty &&
    prev.data.matchedLocation === next.data.matchedLocation &&
    prev.data.searchHighlight === next.data.searchHighlight &&
    prev.isSelected === next.isSelected &&
    prev.isHovered === next.isHovered &&
    prev.isHighlightedByLocation === next.isHighlightedByLocation &&
    prev.highlightedLocationName === next.highlightedLocationName &&
    prev.selectedClinicIndex === next.selectedClinicIndex &&
    prev.variant === next.variant &&
    prev.hideMap === next.hideMap &&
    prev.userLocation?.lat === next.userLocation?.lat &&
    prev.userLocation?.lng === next.userLocation?.lng
  );
}

export const DoctorCard = memo(DoctorCardComponent, areDoctorCardPropsEqual);
