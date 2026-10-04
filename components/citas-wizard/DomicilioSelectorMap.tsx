'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import {
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  Search,
  Building,
  Home,
  Compass,
  Edit3,
  Check,
  ShieldCheck,
  Info,
} from 'lucide-react';
import type { AreaDomicilioDto } from '@/types/citas';
import type { DoctorResponse } from '@/types';
import { useCitaStore } from '@/store/use-cita-store';

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Coordenadas base de referencia para municipios y zonas en Guatemala
const GUATEMALA_CENTER = { lat: 14.6349, lng: -90.5069 };

const MUNICIPIO_COORDINATES: Record<string, { lat: number; lng: number }> = {
  guatemala: { lat: 14.6349, lng: -90.5069 },
  mixco: { lat: 14.6333, lng: -90.6067 },
  'villa nueva': { lat: 14.5256, lng: -90.5886 },
  'santa catarina pinula': { lat: 14.5667, lng: -90.4950 },
  'san miguel petapa': { lat: 14.4989, lng: -90.5606 },
  amatitlan: { lat: 14.4833, lng: -90.6167 },
  amatitlán: { lat: 14.4833, lng: -90.6167 },
  chinautla: { lat: 14.7083, lng: -90.4983 },
  'antigua guatemala': { lat: 14.5586, lng: -90.7295 },
};

const ZONA_COORDINATES: Record<string, { lat: number; lng: number; radiusMeters: number }> = {
  // Ciudad de Guatemala
  'guatemala-1': { lat: 14.642, lng: -90.513, radiusMeters: 2000 },
  'guatemala-2': { lat: 14.656, lng: -90.509, radiusMeters: 2000 },
  'guatemala-3': { lat: 14.629, lng: -90.530, radiusMeters: 2000 },
  'guatemala-4': { lat: 14.621, lng: -90.518, radiusMeters: 1400 },
  'guatemala-5': { lat: 14.625, lng: -90.495, radiusMeters: 2000 },
  'guatemala-6': { lat: 14.655, lng: -90.485, radiusMeters: 2200 },
  'guatemala-7': { lat: 14.638, lng: -90.548, radiusMeters: 2500 },
  'guatemala-8': { lat: 14.619, lng: -90.525, radiusMeters: 1800 },
  'guatemala-9': { lat: 14.611, lng: -90.516, radiusMeters: 1800 },
  'guatemala-10': { lat: 14.598, lng: -90.513, radiusMeters: 2000 },
  'guatemala-11': { lat: 14.615, lng: -90.551, radiusMeters: 2200 },
  'guatemala-12': { lat: 14.590, lng: -90.545, radiusMeters: 2200 },
  'guatemala-13': { lat: 14.580, lng: -90.530, radiusMeters: 2000 },
  'guatemala-14': { lat: 14.582, lng: -90.518, radiusMeters: 2000 },
  'guatemala-15': { lat: 14.595, lng: -90.485, radiusMeters: 2200 },
  'guatemala-16': { lat: 14.612, lng: -90.472, radiusMeters: 2600 },
  'guatemala-17': { lat: 14.660, lng: -90.450, radiusMeters: 2600 },
  'guatemala-18': { lat: 14.680, lng: -90.440, radiusMeters: 3000 },
  'guatemala-21': { lat: 14.550, lng: -90.550, radiusMeters: 2500 },

  // Mixco
  'mixco-1': { lat: 14.633, lng: -90.606, radiusMeters: 2200 },
  'mixco-2': { lat: 14.620, lng: -90.590, radiusMeters: 2200 },
  'mixco-3': { lat: 14.638, lng: -90.585, radiusMeters: 2200 },
  'mixco-4': { lat: 14.645, lng: -90.560, radiusMeters: 2200 },
  'mixco-7': { lat: 14.650, lng: -90.575, radiusMeters: 2200 },
  'mixco-8': { lat: 14.598, lng: -90.582, radiusMeters: 2500 },
  'mixco-10': { lat: 14.615, lng: -90.585, radiusMeters: 2200 },
  'mixco-11': { lat: 14.635, lng: -90.565, radiusMeters: 2500 },
  'mixco-15': { lat: 14.595, lng: -90.580, radiusMeters: 2500 },
};

function normalizeKey(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Extrae el número de zona de un string como "Zona 11", "15", "Zona 4"
function extractZoneNumber(str: string): string {
  const match = str.match(/\d+/);
  return match ? match[0] : '';
}

// Componente para dibujar círculos de cobertura de las zonas del médico
function CoverageCircles({
  zones,
}: {
  zones: { lat: number; lng: number; radiusMeters: number; label: string }[];
}) {
  const map = useMap();
  const circlesRef = useRef<google.maps.Circle[]>([]);

  useEffect(() => {
    if (!map || typeof window === 'undefined' || !(window as any).google?.maps) return;

    // Limpiar anteriores
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];

    zones.forEach((z) => {
      const circle = new google.maps.Circle({
        center: { lat: z.lat, lng: z.lng },
        radius: z.radiusMeters,
        map,
        fillColor: '#10B981',
        fillOpacity: 0.12,
        strokeColor: '#059669',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        clickable: false,
      });
      circlesRef.current.push(circle);
    });

    return () => {
      circlesRef.current.forEach((c) => c.setMap(null));
      circlesRef.current = [];
    };
  }, [map, zones]);

  return null;
}

// Controlador de cámara para Google Maps
function MapCameraController({ targetCoords }: { targetCoords: { lat: number; lng: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !targetCoords) return;
    map.panTo(targetCoords);
  }, [map, targetCoords]);

  return null;
}

interface DomicilioSelectorMapProps {
  doctor?: DoctorResponse;
  areas: AreaDomicilioDto[];
  onLocationConfirmed?: () => void;
}

export function DomicilioSelectorMap({
  doctor,
  areas = [],
  onLocationConfirmed,
}: DomicilioSelectorMapProps) {
  const {
    paisDomicilio,
    departamentoDomicilio,
    municipioDomicilio,
    zonaDomicilio,
    aldeaDomicilio,
    direccionDomicilio,
    referenciasDomicilio,
    latitudDomicilio,
    longitudDomicilio,
    coberturaDomicilioValida,
    ubicacionDomicilioConfirmada,
    setDatosDomicilio,
    setUbicacionDomicilioConfirmada,
  } = useCitaStore();

  // 1. Extraer catálogo de cobertura del médico (combinando areas de API y doctor.atencion_domicilio)
  const coverageData = useMemo(() => {
    const list: {
      ladCodigo?: number;
      pais: string;
      departamento: string;
      municipio: string;
      zonasRaw: string;
      zonas: string[];
      observaciones?: string;
    }[] = [];

    // Priorizar datos de la tabla de áreas
    areas.forEach((a) => {
      const zonas = (a.ladZonas || '')
        .split(',')
        .map((z) => z.trim())
        .filter(Boolean);
      list.push({
        ladCodigo: a.ladCodigo,
        pais: a.pais || 'Guatemala',
        departamento: a.departamento || 'Guatemala',
        municipio: a.municipio || 'Mixco',
        zonasRaw: a.ladZonas || '',
        zonas,
        observaciones: a.ladObservaciones || '',
      });
    });

    // Complementar con doctor.atencion_domicilio si no estaban ya
    if (doctor?.atencion_domicilio) {
      doctor.atencion_domicilio.forEach((ad) => {
        const muni = ad.mun_descripcion || 'Guatemala';
        const exists = list.some((item) => normalizeKey(item.municipio) === normalizeKey(muni));
        if (!exists) {
          const zonas = (ad.lad_zonas || '')
            .split(',')
            .map((z) => z.trim())
            .filter(Boolean);
          list.push({
            pais: ad.pai_descripcion || 'Guatemala',
            departamento: ad.dep_descripcion || 'Guatemala',
            municipio: muni,
            zonasRaw: ad.lad_zonas || '',
            zonas,
            observaciones: ad.lad_observaciones || '',
          });
        }
      });
    }

    // Si aún estuviera vacío por alguna razón, brindar fallback seguro a Guatemala
    if (list.length === 0) {
      list.push({
        pais: 'Guatemala',
        departamento: 'Guatemala',
        municipio: 'Guatemala',
        zonasRaw: 'Zona 10, Zona 14, Zona 15',
        zonas: ['Zona 10', 'Zona 14', 'Zona 15'],
      });
    }

    return list;
  }, [areas, doctor]);

  // Lista de departamentos disponibles del médico
  const availableDepartamentos = useMemo(() => {
    return Array.from(new Set(coverageData.map((c) => c.departamento).filter(Boolean)));
  }, [coverageData]);

  // Estado local del formulario
  const [selectedPais, setSelectedPais] = useState<string>(paisDomicilio || 'Guatemala');
  const [selectedDepto, setSelectedDepto] = useState<string>(
    departamentoDomicilio || availableDepartamentos[0] || 'Guatemala'
  );
  
  // Municipios disponibles para el departamento seleccionado
  const availableMunicipios = useMemo(() => {
    const filtered = coverageData.filter(
      (c) => normalizeKey(c.departamento) === normalizeKey(selectedDepto)
    );
    return Array.from(new Set(filtered.map((c) => c.municipio).filter(Boolean)));
  }, [coverageData, selectedDepto]);

  const [selectedMuni, setSelectedMuni] = useState<string>(
    municipioDomicilio || availableMunicipios[0] || 'Mixco'
  );

  // Zonas del médico para el municipio seleccionado
  const availableZonas = useMemo(() => {
    const currentCoverage = coverageData.find(
      (c) =>
        normalizeKey(c.departamento) === normalizeKey(selectedDepto) &&
        normalizeKey(c.municipio) === normalizeKey(selectedMuni)
    );
    if (!currentCoverage) return [];
    return currentCoverage.zonas;
  }, [coverageData, selectedDepto, selectedMuni]);

  const [selectedZona, setSelectedZona] = useState<string>(
    zonaDomicilio || availableZonas[0] || 'Zona 11'
  );
  const [aldea, setAldea] = useState<string>(aldeaDomicilio || '');
  const [calleDetalle, setCalleDetalle] = useState<string>('');
  const [referencias, setReferencias] = useState<string>(referenciasDomicilio || '');

  // Coordenadas del pin de ubicación en el mapa
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number }>(() => {
    if (latitudDomicilio && longitudDomicilio) {
      return { lat: latitudDomicilio, lng: longitudDomicilio };
    }
    // Coordenada por defecto según municipio y zona
    const muniKey = normalizeKey(selectedMuni);
    const numZone = extractZoneNumber(selectedZona);
    const specificKey = `${muniKey}-${numZone}`;
    if (ZONA_COORDINATES[specificKey]) {
      return { lat: ZONA_COORDINATES[specificKey].lat, lng: ZONA_COORDINATES[specificKey].lng };
    }
    return MUNICIPIO_COORDINATES[muniKey] || GUATEMALA_CENTER;
  });

  const [targetCoords, setTargetCoords] = useState<{ lat: number; lng: number } | null>(markerPos);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userGpsLoading, setUserGpsLoading] = useState<boolean>(false);

  // Círculos de cobertura de todas las zonas del doctor para el municipio actual
  const coverageCircles = useMemo(() => {
    const muniKey = normalizeKey(selectedMuni);
    const circles: { lat: number; lng: number; radiusMeters: number; label: string }[] = [];

    availableZonas.forEach((z) => {
      const num = extractZoneNumber(z);
      const key = `${muniKey}-${num}`;
      if (ZONA_COORDINATES[key]) {
        circles.push({
          lat: ZONA_COORDINATES[key].lat,
          lng: ZONA_COORDINATES[key].lng,
          radiusMeters: ZONA_COORDINATES[key].radiusMeters,
          label: z,
        });
      }
    });

    return circles;
  }, [selectedMuni, availableZonas]);

  // Validar si la posición o selección actual está dentro de la cobertura del médico
  const validateCoverage = useCallback(
    (muniName: string, zoneStr: string, lat: number, lng: number): boolean => {
      const normMuni = normalizeKey(muniName);
      const zoneNum = extractZoneNumber(zoneStr);

      // 1. Verificar si el municipio coincide con el catálogo del doctor
      const matchMuni = coverageData.some((c) => normalizeKey(c.municipio) === normMuni);
      if (!matchMuni) return false;

      // 2. Si coincide el municipio, verificar si la zona está en las zonas del médico
      const currentCov = coverageData.find((c) => normalizeKey(c.municipio) === normMuni);
      if (currentCov) {
        const matchesZone = currentCov.zonas.some((z) => {
          const zNum = extractZoneNumber(z);
          return zNum === zoneNum || normalizeKey(z) === normalizeKey(zoneStr);
        });
        if (matchesZone) return true;
      }

      // 3. Validación por distancia euclidiana/haversine hacia alguno de los centros de cobertura
      for (const circle of coverageCircles) {
        const R = 6371000; // metros
        const dLat = (lat - circle.lat) * (Math.PI / 180);
        const dLon = (lng - circle.lng) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(circle.lat * (Math.PI / 180)) *
            Math.cos(lat * (Math.PI / 180)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (d <= circle.radiusMeters * 1.25) {
          return true;
        }
      }

      return false;
    },
    [coverageData, coverageCircles]
  );

  // Estado de validez de la cobertura actual
  const isWithinCoverage = useMemo(() => {
    return validateCoverage(selectedMuni, selectedZona, markerPos.lat, markerPos.lng);
  }, [selectedMuni, selectedZona, markerPos, validateCoverage]);

  // Al cambiar Municipio, auto-seleccionar la primera zona y centrar el mapa
  const handleMunicipioChange = (muni: string) => {
    setSelectedMuni(muni);
    const cov = coverageData.find((c) => normalizeKey(c.municipio) === normalizeKey(muni));
    const firstZona = cov?.zonas[0] || 'Zona 1';
    setSelectedZona(firstZona);

    // Mover mapa al centro de esa zona o municipio
    const muniKey = normalizeKey(muni);
    const num = extractZoneNumber(firstZona);
    const key = `${muniKey}-${num}`;
    const newCoords = ZONA_COORDINATES[key] || MUNICIPIO_COORDINATES[muniKey] || GUATEMALA_CENTER;

    setMarkerPos({ lat: newCoords.lat, lng: newCoords.lng });
    setTargetCoords({ lat: newCoords.lat, lng: newCoords.lng });
  };

  // Al cambiar Zona, centrar el mapa en esa zona
  const handleZonaChange = (zona: string) => {
    setSelectedZona(zona);
    const muniKey = normalizeKey(selectedMuni);
    const num = extractZoneNumber(zona);
    const key = `${muniKey}-${num}`;
    if (ZONA_COORDINATES[key]) {
      const coords = { lat: ZONA_COORDINATES[key].lat, lng: ZONA_COORDINATES[key].lng };
      setMarkerPos(coords);
      setTargetCoords(coords);
    }
  };

  // Geocodificación inversa con Google Maps Geocoder al hacer clic o arrastrar el pin
  const handleMapLocationChange = useCallback(
    (lat: number, lng: number) => {
      setMarkerPos({ lat, lng });

      if (typeof window !== 'undefined' && (window as any).google?.maps) {
        setIsGeocoding(true);
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
          setIsGeocoding(false);
          if (status === 'OK' && results?.[0]) {
            const result = results[0];
            const components = result.address_components || [];

            // Detectar municipio
            const muniComp = components.find(
              (c: any) =>
                c.types.includes('locality') ||
                c.types.includes('administrative_area_level_2') ||
                c.types.includes('sublocality_level_1')
            );
            if (muniComp) {
              const detectedMuni = muniComp.long_name;
              const match = availableMunicipios.find(
                (m) => normalizeKey(m) === normalizeKey(detectedMuni)
              );
              if (match) setSelectedMuni(match);
            }

            // Detectar zona o aldea en la dirección
            const fullAddress = result.formatted_address || '';
            const zoneMatch = fullAddress.match(/Zona\s*(\d+)/i);
            if (zoneMatch) {
              const detectedZone = `Zona ${zoneMatch[1]}`;
              setSelectedZona(detectedZone);
            }

            // Si la calle está vacía, prellenarla con la calle sugerida
            if (!calleDetalle) {
              const routeComp = components.find((c: any) => c.types.includes('route'));
              const streetNum = components.find((c: any) => c.types.includes('street_number'));
              if (routeComp) {
                setCalleDetalle(
                  `${routeComp.long_name}${streetNum ? ` ${streetNum.long_name}` : ''}`
                );
              }
            }
          }
        });
      }
    },
    [availableMunicipios, calleDetalle]
  );

  // Buscar dirección en Google Maps Geocoder
  const handleSearchAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (typeof window !== 'undefined' && (window as any).google?.maps) {
      setIsGeocoding(true);
      const geocoder = new (window as any).google.maps.Geocoder();
      const queryWithContext = `${searchQuery}, ${selectedMuni}, Guatemala`;

      geocoder.geocode({ address: queryWithContext }, (results: any, status: string) => {
        setIsGeocoding(false);
        if (status === 'OK' && results?.[0]) {
          const loc = results[0].geometry.location;
          const lat = loc.lat();
          const lng = loc.lng();
          handleMapLocationChange(lat, lng);
          setTargetCoords({ lat, lng });
        }
      });
    }
  };

  // Usar ubicación actual del dispositivo
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    setUserGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserGpsLoading(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        handleMapLocationChange(lat, lng);
        setTargetCoords({ lat, lng });
      },
      (err) => {
        setUserGpsLoading(false);
        console.warn('Error al obtener ubicación GPS:', err);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Confirmar ubicación
  const handleConfirmLocation = () => {
    if (!isWithinCoverage) return;

    // Buscar área correspondiente
    const matchedArea = areas.find(
      (a) => normalizeKey(a.municipio) === normalizeKey(selectedMuni)
    );

    const formattedAddressParts = [
      calleDetalle || 'Dirección de visita en domicilio',
      aldea ? `Aldea/Col: ${aldea}` : '',
      selectedZona,
      selectedMuni,
      selectedDepto,
      selectedPais,
    ].filter(Boolean);

    const fullFormattedAddress = formattedAddressParts.join(', ');

    setDatosDomicilio({
      pais: selectedPais,
      departamento: selectedDepto,
      municipio: selectedMuni,
      zona: selectedZona,
      aldea: aldea,
      direccion: fullFormattedAddress,
      referencias: referencias,
      latitud: markerPos.lat,
      longitud: markerPos.lng,
      coberturaValida: true,
      confirmada: true,
      area: matchedArea || null,
    });

    setUbicacionDomicilioConfirmada(true);
    onLocationConfirmed?.();
  };

  // Re-editar ubicación
  const handleEditLocation = () => {
    setUbicacionDomicilioConfirmada(false);
  };

  // Resumen de cobertura del médico para mostrar al paciente
  const coverageSummaryText = useMemo(() => {
    return coverageData
      .map((c) => `${c.municipio} (${c.zonas.join(', ') || 'Todo el municipio'})`)
      .join(' • ');
  }, [coverageData]);

  // Si la ubicación ya fue confirmada, mostrar una tarjeta resumen limpia y moderna
  if (ubicacionDomicilioConfirmada && coberturaDomicilioValida) {
    return (
      <div className="w-full bg-white dark:bg-[#1E293B] rounded-2xl p-6 border-2 border-emerald-500/40 shadow-sm relative overflow-hidden transition-all animate-in fade-in zoom-in-[0.99] duration-300">
        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[11px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-xs">
          <Check className="w-3.5 h-3.5 stroke-[3]" /> Cobertura Verificada
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
              <Home className="w-6 h-6" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Dirección de Visita a Domicilio
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-semibold">
                  {selectedMuni} · {selectedZona}
                </span>
              </div>

              <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                {direccionDomicilio || `${selectedZona}, ${selectedMuni}, ${selectedDepto}`}
              </h4>

              {referenciasDomicilio && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Ref:</span>{' '}
                  {referenciasDomicilio}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleEditLocation}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Cambiar Ubicación</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-[#1E293B] rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      {/* Encabezado con banner de cobertura del médico */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Home className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Ubicación para Cita a Domicilio</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Indica tu ubicación exacta para verificar que esté dentro del área de servicio del médico.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-semibold shrink-0">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Servicio a Domicilio</span>
          </div>
        </div>

        {/* Cobertura del especialista */}
        <div className="mt-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Zonas con cobertura médica del especialista:
            </span>{' '}
            <span className="text-slate-600 dark:text-slate-400">{coverageSummaryText}</span>
          </div>
        </div>
      </div>

      {/* Grid: Formulario Demográfico (Izquierda) + Mapa de Google con Marcador (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna 1: Datos Demográficos y Dirección (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* País */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                País
              </label>
              <select
                value={selectedPais}
                onChange={(e) => setSelectedPais(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500"
              >
                <option value="Guatemala">Guatemala</option>
              </select>
            </div>

            {/* Departamento */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Departamento
              </label>
              <select
                value={selectedDepto}
                onChange={(e) => setSelectedDepto(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500"
              >
                {availableDepartamentos.map((depto) => (
                  <option key={depto} value={depto}>
                    {depto}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Municipio */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Municipio <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedMuni}
                onChange={(e) => handleMunicipioChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-900/60 text-xs font-bold text-blue-900 dark:text-blue-300 outline-none focus:border-blue-500 shadow-xs"
              >
                {availableMunicipios.map((muni) => (
                  <option key={muni} value={muni}>
                    {muni}
                  </option>
                ))}
              </select>
            </div>

            {/* Zona / Sector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Zona de Cobertura <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedZona}
                onChange={(e) => handleZonaChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-900/60 text-xs font-bold text-blue-900 dark:text-blue-300 outline-none focus:border-blue-500 shadow-xs"
              >
                {availableZonas.map((zona) => (
                  <option key={zona} value={zona}>
                    {zona}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Aldea / Colonia / Caserío */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Aldea, Colonia o Residencial
            </label>
            <input
              type="text"
              value={aldea}
              onChange={(e) => setAldea(e.target.value)}
              placeholder="Ej. Aldea El Manzanillo, Col. San José, Condominio..."
              className="w-full bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          {/* Dirección Exacta */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Dirección Específica (Calle, Avenida, No. de Casa) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={calleDetalle}
              onChange={(e) => setCalleDetalle(e.target.value)}
              placeholder="Ej. 5ta Avenida 12-45, Lote 14"
              className="w-full bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          {/* Referencias */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Referencias de Llegada
            </label>
            <textarea
              rows={2}
              value={referencias}
              onChange={(e) => setReferencias(e.target.value)}
              placeholder="Ej. Portón café de 2 hojas, frente a la tienda 'El Rosal'..."
              className="w-full bg-slate-50 dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Columna 2: Google Maps Interactivo con Pin y Áreas de Cobertura (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          {/* Barra de Búsqueda sobre el Mapa + Botón GPS */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchAddress} className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Buscar dirección o punto en ${selectedMuni}...`}
                className="w-full bg-slate-50 dark:bg-slate-900 pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </form>

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={userGpsLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-xs disabled:opacity-50"
              title="Detectar mi ubicación actual vía GPS"
            >
              <Navigation className={`w-3.5 h-3.5 ${userGpsLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Mi Ubicación</span>
            </button>
          </div>

          {/* Contenedor del Mapa */}
          <div className="w-full h-[320px] sm:h-[350px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative shadow-inner bg-slate-100 dark:bg-slate-900">
            {MAPS_API_KEY ? (
              <APIProvider apiKey={MAPS_API_KEY} libraries={['places', 'marker']}>
                <GoogleMap
                  mapId="DOMICILIO_MAP_ID"
                  defaultCenter={markerPos}
                  defaultZoom={14}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  onClick={(e) => {
                    if (e.detail?.latLng) {
                      handleMapLocationChange(e.detail.latLng.lat, e.detail.latLng.lng);
                    }
                  }}
                  className="w-full h-full"
                >
                  <MapCameraController targetCoords={targetCoords} />
                  <CoverageCircles zones={coverageCircles} />

                  {/* Marcador del Paciente para la visita */}
                  <AdvancedMarker
                    position={markerPos}
                    draggable={true}
                    onDragEnd={(e) => {
                      if (e.latLng) {
                        handleMapLocationChange(e.latLng.lat(), e.latLng.lng());
                      }
                    }}
                  >
                    <div className="flex flex-col items-center cursor-grab active:cursor-grabbing group">
                      <div className="px-2 py-0.5 rounded-full bg-slate-900/90 text-white text-[10px] font-bold shadow-md whitespace-nowrap mb-1 flex items-center gap-1 border border-white/40">
                        <Home className="w-3 h-3 text-sky-400" />
                        <span>Visita médica aquí</span>
                      </div>
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white">
                          <MapPin className="w-5 h-5 fill-white text-blue-600" />
                        </div>
                        <div className="w-2.5 h-1 bg-black/40 rounded-full mx-auto mt-0.5 blur-[1px]" />
                      </div>
                    </div>
                  </AdvancedMarker>
                </GoogleMap>
              </APIProvider>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-500">
                <MapPin className="w-8 h-8 text-blue-500 mb-2" />
                <p className="text-xs font-bold">Mapa de Cobertura</p>
                <p className="text-[11px] mt-1 max-w-xs">
                  {selectedMuni} · {selectedZona} (Lat: {markerPos.lat.toFixed(4)}, Lng:{' '}
                  {markerPos.lng.toFixed(4)})
                </p>
              </div>
            )}

            {/* Píldora de instrucción flotante en el mapa */}
            <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-[11px] font-semibold text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-md">
                <Compass className="w-3.5 h-3.5 text-blue-600" />
                Haz clic o arrastra el marcador a tu casa
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            * Los círculos verdes en el mapa representan las zonas donde el especialista brinda atención a domicilio.
          </p>
        </div>
      </div>

      {/* Banner de Validación y Botón de Confirmación */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Estado de cobertura */}
        <div className="flex-1 w-full">
          {isWithinCoverage ? (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold">✓ Ubicación dentro de la cobertura médica:</span>{' '}
                <span>
                  El doctor atiende a domicilio en {selectedMuni}, {selectedZona}.
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-semibold">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <span className="font-bold">⚠️ Fuera de zona de cobertura:</span>{' '}
                <span>
                  El médico únicamente atiende a domicilio en: {coverageSummaryText}. Selecciona una de sus zonas
                  cubiertas para continuar.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Botón de Confirmar Ubicación */}
        <button
          type="button"
          onClick={handleConfirmLocation}
          disabled={!isWithinCoverage}
          className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shrink-0 ${
            isWithinCoverage
              ? 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white cursor-pointer shadow-blue-500/25'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
          }`}
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Confirmar Ubicación y Elegir Horario</span>
        </button>
      </div>
    </div>
  );
}
