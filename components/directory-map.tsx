'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  MapPin,
  Building2,
  Stethoscope,
  Navigation,
  ChevronLeft,
  ChevronRight,
  Home,
  Car,
} from 'lucide-react';
import type { DoctorCardData } from './doctor-card';
import type { DoctorClinica } from '@/types';
import { getDoctorPriceDisplay, buildDoctorShortName, cleanZonaText } from '@/types/doctor';

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const GOOGLE_MAPS_LIBRARIES: ('places' | 'marker' | 'routes')[] = ['places', 'marker', 'routes'];

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

export const DOMICILIO_MUNICIPIO_COORDINATES: Record<string, { lat: number; lng: number }> = {
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

export const DOMICILIO_ZONA_COORDINATES: Record<string, { lat: number; lng: number; radiusMeters: number }> = {
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

export type DomicilioCircle = {
  lat: number;
  lng: number;
  radiusMeters: number;
  label: string;
  muni: string;
};

export type DomicilioCoverageResult = {
  circles: DomicilioCircle[];
  centroid: { lat: number; lng: number };
  labels: string;
};

export function resolveDomicilioCoverage(atencionList?: any[] | null): DomicilioCoverageResult | null {
  if (!atencionList || atencionList.length === 0) return null;

  const circles: DomicilioCircle[] = [];

  atencionList.forEach((ad) => {
    const muniRaw = ad.mun_descripcion || 'Guatemala';
    const muniKey = muniRaw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const rawZonas = ad.lad_zonas || '';
    const parts = rawZonas.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean);
    const zoneNumbers: string[] = [];

    parts.forEach((p: string) => {
      const nums = p.match(/\d+/g);
      if (nums && nums.length > 0) {
        nums.forEach((n) => zoneNumbers.push(n));
      }
    });

    if (zoneNumbers.length > 0) {
      const uniqueNumbers = Array.from(new Set(zoneNumbers));
      uniqueNumbers.forEach((num) => {
        const key = `${muniKey}-${num}`;
        const coord = DOMICILIO_ZONA_COORDINATES[key] || DOMICILIO_ZONA_COORDINATES[`guatemala-${num}`];
        if (coord) {
          circles.push({
            lat: coord.lat,
            lng: coord.lng,
            radiusMeters: coord.radiusMeters,
            label: `Zona ${num}`,
            muni: muniRaw,
          });
        }
      });
    }

    if (circles.length === 0 && DOMICILIO_MUNICIPIO_COORDINATES[muniKey]) {
      const muniCoord = DOMICILIO_MUNICIPIO_COORDINATES[muniKey];
      circles.push({
        lat: muniCoord.lat,
        lng: muniCoord.lng,
        radiusMeters: 3800,
        label: muniRaw,
        muni: muniRaw,
      });
    }
  });

  if (circles.length === 0) {
    circles.push({
      lat: GUATEMALA_CENTER.lat,
      lng: GUATEMALA_CENTER.lng,
      radiusMeters: 3000,
      label: 'Ciudad de Guatemala',
      muni: 'Guatemala',
    });
  }

  const avgLat = circles.reduce((sum, c) => sum + c.lat, 0) / circles.length;
  const avgLng = circles.reduce((sum, c) => sum + c.lng, 0) / circles.length;

  return {
    circles,
    centroid: { lat: avgLat, lng: avgLng },
    labels: Array.from(new Set(circles.map((c) => c.label))).join(', '),
  };
}

export type DoctorAtBuilding = {
  expCodigo: string;
  doctorData: DoctorCardData;
  clinicIndex: number;
  clinic: DoctorClinica;
  priceLabel: string;
  isPrimary: boolean;
};

export type BuildingLocation = {
  id: string;
  name: string;
  address: string;
  zona: string;
  lat: number;
  lng: number;
  doctors: DoctorAtBuilding[];
  phone?: string | null;
  directMapsUrl: string;
  directWazeUrl?: string | null;
};

type DirectoryMapProps = {
  doctors: DoctorCardData[];
  hoveredDoctorId: string | null;
  selectedDoctorId: string | null;
  selectedClinicIndex?: number | null;
  radarRadiusKm?: number;
  userLocation?: { lat: number; lng: number } | null;
  searchedLocation?: { lat: number; lng: number; address: string } | null;
  isNearMeActive?: boolean;
  onDoctorHover: (expCodigo: string | null) => void;
  onDoctorSelect: (expCodigo: string, clinicIndex?: number | null) => void;
  onNavigateToProfile: (expCodigo: string) => void;
  onBuildingSelect?: (building: BuildingLocation | null) => void;
};

// Componente para trazar un círculo de radar (Circle) en el mapa de Google
export function MapCircle({
  center,
  radius = 10000,
  options,
}: {
  center: { lat: number; lng: number };
  radius?: number;
  options?: google.maps.CircleOptions;
}) {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        center,
        radius,
        map,
        fillColor: '#0284c7',
        fillOpacity: 0.08,
        strokeColor: '#0284c7',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        clickable: false,
        ...options,
      });
    } else {
      circleRef.current.setCenter(center);
      circleRef.current.setRadius(radius);
      circleRef.current.setMap(map);
      circleRef.current.setOptions({ clickable: false, ...options });
    }

    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    };
  }, [map, center.lat, center.lng, radius, options]);

  return null;
}

export type RouteInfo = {
  distance: string;
  duration: string;
};

// Componente para trazar la ruta de navegación (DirectionsRenderer) entre el usuario y el consultorio
export function MapRouteRenderer({
  origin,
  destination,
  onRouteCalculated,
}: {
  origin?: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  onRouteCalculated?: (info: RouteInfo | null) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const onRouteCalculatedRef = useRef(onRouteCalculated);

  useEffect(() => {
    onRouteCalculatedRef.current = onRouteCalculated;
  }, [onRouteCalculated]);

  // Inicializar DirectionsService y DirectionsRenderer con Google Maps
  useEffect(() => {
    if (!routesLib || !map) return;

    const ds = new routesLib.DirectionsService();
    const dr = new routesLib.DirectionsRenderer({
      map,
      suppressMarkers: true, // Mantiene los marcadores de alta fidelidad personalizados de SaludYa
      preserveViewport: true, // Controlamos el encuadre manualmente para que los indicadores y popups nunca queden tapados
      polylineOptions: {
        strokeColor: '#0284c7', // Azul corporativo de NeoClínica
        strokeWeight: 5,
        strokeOpacity: 0.85,
      },
    });

    setDirectionsService(ds);
    setDirectionsRenderer(dr);

    return () => {
      dr.setMap(null);
    };
  }, [routesLib, map]);

  // Calcular y renderizar la ruta vial cuando existan origen y destino
  useEffect(() => {
    if (!directionsRenderer) return;

    if (!origin || !destination || !directionsService) {
      try {
        directionsRenderer.set('directions', null);
      } catch {
        // Safe ignore
      }
      onRouteCalculatedRef.current?.(null);
      return;
    }

    let isCancelled = false;

    directionsService.route(
      {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (isCancelled) return;

        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result);
          const leg = result.routes[0]?.legs?.[0];
          if (leg) {
            onRouteCalculatedRef.current?.({
              distance: leg.distance?.text || '',
              duration: leg.duration?.text || '',
            });
          }

          // Ajustar bounds con padding generoso para asegurar que los marcadores, popups e indicadores no queden tapados por la barra superior ni los bordes
          const routeBounds = result.routes[0]?.bounds;
          if (routeBounds && map) {
            map.fitBounds(routeBounds, {
              top: 270, // Margen superior amplio para que el popup del edificio y el badge flotante nunca se superpongan
              bottom: 90, // Margen inferior para el indicador de "Tu ubicación"
              left: 80,
              right: 80,
            });
          }
        } else {
          console.warn('Google Maps Directions no pudo trazar ruta:', status);
          try {
            directionsRenderer.set('directions', null);
          } catch {
            // Safe ignore
          }
          onRouteCalculatedRef.current?.(null);
        }
      }
    );

    return () => {
      isCancelled = true;
    };
  }, [directionsService, directionsRenderer, origin?.lat, origin?.lng, destination?.lat, destination?.lng, map]);

  return null;
}

// Controlador interno para manejar el centrado y zoom suave del mapa
function MapController({
  userLocation,
  isNearMeActive,
  targetCoords,
  targetZoom,
  isDoctorDomicilioSelected,
  defaultCenterCoords,
  selectedDoctorBuildings,
  selectedDoctorId,
  hasActiveRoute = false,
  searchedLocation,
}: {
  userLocation?: { lat: number; lng: number } | null;
  isNearMeActive?: boolean;
  targetCoords?: { lat: number; lng: number } | null;
  targetZoom?: number;
  isDoctorDomicilioSelected?: boolean;
  defaultCenterCoords?: { lat: number; lng: number } | null;
  selectedDoctorBuildings?: BuildingLocation[];
  selectedDoctorId?: string | null;
  hasActiveRoute?: boolean;
  searchedLocation?: { lat: number; lng: number; address: string } | null;
}) {
  const map = useMap();
  const lastCenteredNearMeRef = useRef<boolean>(false);
  const hasCenteredDefaultRef = useRef(false);
  const prevSelectedDoctorIdRef = useRef<string | null | undefined>(undefined);
  const prevTargetKeyRef = useRef<string | null>(null);
  const prevSearchedLocationKeyRef = useRef<string | null>(null);

  // Desactivar iconos cliqueables de Google
  useEffect(() => {
    if (!map) return;
    map.setOptions({
      clickableIcons: false,
    });
  }, [map]);

  // Sincronizar Google Maps con transiciones de apertura/cierre del contenedor lateral
  useEffect(() => {
    if (!map) return;
    const container = map.getDiv();
    if (!container) return;

    let rafId: number | null = null;
    const observer = new ResizeObserver(() => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (typeof window !== 'undefined' && (window as any).google?.maps?.event) {
          (window as any).google.maps.event.trigger(map, 'resize');
        }
      });
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [map]);

  // Centrado cuando cambia el médico seleccionado o cuando se deselecciona
  useEffect(() => {
    if (!map) return;

    // Solo actuar si realmente cambió el médico seleccionado (evita recentrar abruptamente al arrastrar el mapa)
    if (prevSelectedDoctorIdRef.current === selectedDoctorId) {
      return;
    }

    const wasDoctorSelected = !!prevSelectedDoctorIdRef.current;
    prevSelectedDoctorIdRef.current = selectedDoctorId;

    if (selectedDoctorId) {
      // Si hay una ruta activa trazada entre el usuario y la sede, DirectionsRenderer ya encuadra el trayecto
      if (hasActiveRoute) {
        return;
      }

      // Si el médico seleccionado está en modo atención a domicilio
      if (isDoctorDomicilioSelected && targetCoords) {
        map.panTo(targetCoords);
        map.setZoom(targetZoom || 13);
      } else if (selectedDoctorBuildings && selectedDoctorBuildings.length > 0) {
        // Si hay clínicas físicas, encuadrar sus ubicaciones con suficiente campo visual
        if (selectedDoctorBuildings.length === 1) {
          map.panTo({ lat: selectedDoctorBuildings[0].lat, lng: selectedDoctorBuildings[0].lng });
          map.setZoom(targetZoom || 15);
        } else {
          const bounds = new google.maps.LatLngBounds();
          selectedDoctorBuildings.forEach((b) => bounds.extend({ lat: b.lat, lng: b.lng }));
          if (userLocation) {
            bounds.extend(userLocation);
          }
          map.fitBounds(bounds, { top: 250, bottom: 90, left: 80, right: 80 });
        }
      }
    } else if (wasDoctorSelected) {
      // Si antes había un médico seleccionado y ahora se deseleccionó, volver a la vista general una sola vez
      const target = defaultCenterCoords || GUATEMALA_CENTER;
      map.panTo(target);
      map.setZoom(13.5);
      prevTargetKeyRef.current = null;
    }
  }, [map, selectedDoctorId, isDoctorDomicilioSelected, targetCoords, targetZoom, selectedDoctorBuildings, defaultCenterCoords, hasActiveRoute, userLocation]);

  // Centrado cuando el usuario selecciona una sede / clínica específica o atención a domicilio
  useEffect(() => {
    if (!map) return;

    const currentKey = targetCoords ? `${targetCoords.lat.toFixed(5)}_${targetCoords.lng.toFixed(5)}_${targetZoom || 15}` : null;
    if (currentKey === prevTargetKeyRef.current) {
      return;
    }
    prevTargetKeyRef.current = currentKey;

    if (hasActiveRoute) {
      return;
    }

    if (targetCoords) {
      if (userLocation && !isDoctorDomicilioSelected) {
        const distKm = Math.hypot(targetCoords.lat - userLocation.lat, targetCoords.lng - userLocation.lng) * 111;
        if (distKm < 0.35) {
          map.panTo(targetCoords);
          map.setZoom(15.5);
        } else {
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(targetCoords);
          bounds.extend(userLocation);
          map.fitBounds(bounds, { top: 250, bottom: 90, left: 80, right: 80 });
        }
      } else {
        map.panTo(targetCoords);
        map.setZoom(targetZoom || 15);
      }
    }
  }, [map, targetCoords, targetZoom, hasActiveRoute, userLocation, isDoctorDomicilioSelected]);

  // Manejo de "Cerca de ti" y centrado inicial dentro de Ciudad de Guatemala
  useEffect(() => {
    if (!map) return;

    if (isNearMeActive && userLocation) {
      if (!lastCenteredNearMeRef.current) {
        map.panTo(userLocation);
        map.setZoom(14);
        lastCenteredNearMeRef.current = true;
      }
      return;
    }

    if (!isNearMeActive) {
      lastCenteredNearMeRef.current = false;
    }

    if (!hasCenteredDefaultRef.current && !targetCoords && !selectedDoctorId) {
      const target = defaultCenterCoords || GUATEMALA_CENTER;
      map.panTo(target);
      map.setZoom(14);
      hasCenteredDefaultRef.current = true;
    }
  }, [map, userLocation, isNearMeActive, targetCoords, defaultCenterCoords, selectedDoctorId]);

  // Centrado suave cuando el usuario busca o selecciona una ubicación específica en el buscador
  useEffect(() => {
    if (!map || !searchedLocation) {
      prevSearchedLocationKeyRef.current = null;
      return;
    }
    const key = `${searchedLocation.lat.toFixed(5)}_${searchedLocation.lng.toFixed(5)}`;
    if (prevSearchedLocationKeyRef.current === key) return;
    prevSearchedLocationKeyRef.current = key;

    map.panTo({ lat: searchedLocation.lat, lng: searchedLocation.lng });
    map.setZoom(15);
  }, [map, searchedLocation]);

  return null;
}

export function DirectoryMap({
  doctors,
  hoveredDoctorId,
  selectedDoctorId,
  selectedClinicIndex = 0,
  radarRadiusKm = 10,
  userLocation,
  searchedLocation,
  isNearMeActive,
  onDoctorHover,
  onDoctorSelect,
  onNavigateToProfile,
  onBuildingSelect,
}: DirectoryMapProps) {
  const router = useRouter();

  // Estado del edificio/clínica seleccionado cuyo pop-up se muestra
  const [activeBuildingId, setActiveBuildingId] = useState<string | null>(null);

  // Estado del edificio sobre el cual el usuario tiene el mouse (hover directo en el pin)
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null);

  // Índice del doctor actualmente visible en el carrusel del edificio activo
  const [carouselDoctorIndex, setCarouselDoctorIndex] = useState<number>(0);

  // Información de ruta vial en tiempo real (distancia y duración en auto)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  const prevSelectedDoctorIdRef = useRef<string | null>(selectedDoctorId || null);

  // Si se deselecciona explícitamente el médico desde la lista/card, cerrar el edificio activo
  useEffect(() => {
    if (prevSelectedDoctorIdRef.current && !selectedDoctorId) {
      setActiveBuildingId(null);
    }
    prevSelectedDoctorIdRef.current = selectedDoctorId || null;
  }, [selectedDoctorId]);

  // Resetear información de ruta al deseleccionar el médico
  useEffect(() => {
    if (!selectedDoctorId) {
      setRouteInfo(null);
    }
  }, [selectedDoctorId]);

  // Agrupación de todas las clínicas y doctores por EDIFICIO / UBICACIÓN FÍSICA
  const buildings = useMemo<BuildingLocation[]>(() => {
    const buildingMap = new Map<string, BuildingLocation>();

    doctors.forEach((docData, docIdx) => {
      const doc = docData.doctor;
      const priceInfo = getDoctorPriceDisplay(doc);
      const priceLabel = priceInfo.hasPrice ? `Q${priceInfo.price}` : 'Por definir';

      if (doc.clinicas && doc.clinicas.length > 0) {
        doc.clinicas.forEach((cli, cliIdx) => {
          let lat: number;
          let lng: number;

          const clinicName = cli.cli_descripcion?.trim() || cli.cli_direccion_completa?.trim() || `Clínica ${cliIdx + 1}`;
          const zonaLabel = cleanZonaText(cli.cli_zona) || 'Guatemala';
          const address = cli.cli_direccion_completa?.trim() || `${clinicName}, ${zonaLabel}`;

          if (
            typeof cli.cli_latitud === 'number' &&
            typeof cli.cli_longitud === 'number' &&
            !isNaN(cli.cli_latitud) &&
            !isNaN(cli.cli_longitud)
          ) {
            lat = cli.cli_latitud;
            lng = cli.cli_longitud;
          } else {
            const zona = cli.cli_zona?.toString().replace(/[^0-9]/g, '') || '';
            const baseCoords = ZONA_OFFSETS[zona] || GUATEMALA_CENTER;
            // Para clínicas sin coordenadas exactas pero con el mismo nombre y zona, asignar la misma coordenada de edificio
            const nameHash = clinicName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const hash = (nameHash % 100) * 0.0008;
            lat = baseCoords.lat + Math.sin(hash) * 0.008;
            lng = baseCoords.lng + Math.cos(hash) * 0.008;
          }

          // Clave de agrupación: Coordenadas redondeadas a 4 decimales (~11 metros de tolerancia) o nombre de edificio + zona
          const coordKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
          const buildingKey = `${clinicName.toLowerCase()}_${zonaLabel.toLowerCase()}_${coordKey}`;

          const doctorItem: DoctorAtBuilding = {
            expCodigo: doc.exp_codigo,
            doctorData: docData,
            clinicIndex: cliIdx,
            clinic: cli,
            priceLabel,
            isPrimary: cliIdx === 0,
          };

          if (buildingMap.has(buildingKey)) {
            const existing = buildingMap.get(buildingKey)!;
            // Evitar duplicar el mismo doctor en el mismo edificio si ya fue agregado
            const alreadyInBuilding = existing.doctors.some(
              (d) => d.expCodigo === doc.exp_codigo && d.clinicIndex === cliIdx
            );
            if (!alreadyInBuilding) {
              existing.doctors.push(doctorItem);
            }
          } else {
            const directMapsUrl =
              cli.cli_url_google_maps ||
              `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

            const cleanClinicId = clinicName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
            const stableId = `bld_${coordKey.replace(/\./g, '_')}_${cleanClinicId}`;

            buildingMap.set(buildingKey, {
              id: stableId,
              name: clinicName,
              address,
              zona: zonaLabel,
              lat,
              lng,
              doctors: [doctorItem],
              phone: cli.cli_telefono1,
              directMapsUrl,
              directWazeUrl: cli.cli_url_waze,
            });
          }
        });
      } else {
        // Doctor sin clínicas detalladas: se asocia a un centro médico principal
        const baseCoords = GUATEMALA_CENTER;
        const coordKey = `${baseCoords.lat.toFixed(4)}_${baseCoords.lng.toFixed(4)}`;
        const buildingKey = `clinica_principal_${coordKey}`;

        const fallbackClinic: DoctorClinica = {
          cli_tipo: 'clinica',
          cli_descripcion: 'Centro Médico NeoClínica',
          cli_direccion_completa: 'Ciudad de Guatemala',
          cli_zona: '10',
          cli_latitud: baseCoords.lat,
          cli_longitud: baseCoords.lng,
          cli_telefono1: null,
          mcl_precio_base: null,
          horarios_atencion: [],
        };

        const doctorItem: DoctorAtBuilding = {
          expCodigo: doc.exp_codigo,
          doctorData: docData,
          clinicIndex: 0,
          clinic: fallbackClinic,
          priceLabel,
          isPrimary: true,
        };

        if (buildingMap.has(buildingKey)) {
          const existing = buildingMap.get(buildingKey)!;
          if (!existing.doctors.some((d) => d.expCodigo === doc.exp_codigo)) {
            existing.doctors.push(doctorItem);
          }
        } else {
          buildingMap.set(buildingKey, {
            id: `bld_default_${coordKey.replace(/\./g, '_')}`,
            name: 'Centro Médico NeoClínica',
            address: 'Zona 10, Ciudad de Guatemala',
            zona: 'Zona 10',
            lat: baseCoords.lat,
            lng: baseCoords.lng,
            doctors: [doctorItem],
            directMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${baseCoords.lat},${baseCoords.lng}`,
          });
        }
      }
    });

    // Garantizar un orden determinista y estable para los médicos en cada edificio
    // para que la navegación y los indicadores (ej. 1/2, 2/2) no se desfasen ni reordenen
    buildingMap.forEach((building) => {
      building.doctors.sort((a, b) => {
        const nameA = a.doctorData.fullName || a.expCodigo;
        const nameB = b.doctorData.fullName || b.expCodigo;
        const cmp = nameA.localeCompare(nameB, 'es');
        if (cmp !== 0) return cmp;
        return a.clinicIndex - b.clinicIndex;
      });
    });

    return Array.from(buildingMap.values());
  }, [doctors]);

  // Todos los edificios/sedes donde labora el doctor seleccionado
  const selectedDoctorBuildingIds = useMemo(() => {
    if (!selectedDoctorId) return new Set<string>();
    const ids = new Set<string>();
    buildings.forEach((b) => {
      if (b.doctors.some((d) => d.expCodigo === selectedDoctorId)) {
        ids.add(b.id);
      }
    });
    return ids;
  }, [selectedDoctorId, buildings]);

  // Lista con todas las sedes del médico seleccionado
  const selectedDoctorBuildings = useMemo(() => {
    if (!selectedDoctorId) return [];
    return buildings.filter((b) => selectedDoctorBuildingIds.has(b.id));
  }, [selectedDoctorId, selectedDoctorBuildingIds, buildings]);

  // Filtrar los edificios a mostrar en el mapa:
  // Si hay un médico seleccionado, solo se muestran las ubicaciones donde él trabaja.
  // Pero dentro de cada una de esas ubicaciones, se preservan TODOS los médicos que trabajan allí.
  const displayedBuildings = useMemo(() => {
    if (!selectedDoctorId) {
      return buildings;
    }
    return buildings.filter((b) => selectedDoctorBuildingIds.has(b.id));
  }, [buildings, selectedDoctorId, selectedDoctorBuildingIds]);

  // Edificio más cercano a la ubicación del usuario
  const closestBuilding = useMemo(() => {
    const list = displayedBuildings.length > 0 ? displayedBuildings : buildings;
    if (list.length === 0) return null;
    const refPoint = userLocation || GUATEMALA_CENTER;

    let minDistance = Infinity;
    let closest = list[0];

    for (const b of list) {
      const dist = Math.hypot(b.lat - refPoint.lat, b.lng - refPoint.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closest = b;
      }
    }
    return closest;
  }, [displayedBuildings, buildings, userLocation]);

  // Coordenadas fijas por defecto para centrado general
  const defaultCenterCoords = useMemo(() => {
    return closestBuilding ? { lat: closestBuilding.lat, lng: closestBuilding.lng } : null;
  }, [closestBuilding?.lat, closestBuilding?.lng]);

  // Edificio activo o seleccionado
  const activeBuilding = useMemo(() => {
    return displayedBuildings.find((b) => b.id === activeBuildingId) || null;
  }, [displayedBuildings, activeBuildingId]);

  // Datos del doctor actualmente seleccionado en el directorio
  const selectedDoctorData = useMemo(() => {
    if (!selectedDoctorId) return null;
    return doctors.find((d) => d.doctor.exp_codigo === selectedDoctorId) || null;
  }, [doctors, selectedDoctorId]);

  // Determinar si la selección actual corresponde a Atención a Domicilio
  const isDoctorDomicilioSelected = useMemo(() => {
    if (!selectedDoctorData) return false;
    const doc = selectedDoctorData.doctor;
    const hasDomicilio = !!(doc.atencion_domicilio && doc.atencion_domicilio.length > 0);
    if (!hasDomicilio) return false;
    const hasClinicas = !!(doc.clinicas && doc.clinicas.length > 0);
    return selectedClinicIndex === -1 || (!hasClinicas && hasDomicilio);
  }, [selectedDoctorData, selectedClinicIndex]);

  // Círculos y centroide de cobertura a domicilio para el doctor seleccionado
  const domicilioCoverage = useMemo(() => {
    if (!isDoctorDomicilioSelected || !selectedDoctorData) return null;
    return resolveDomicilioCoverage(selectedDoctorData.doctor.atencion_domicilio);
  }, [isDoctorDomicilioSelected, selectedDoctorData]);

  // Edificio asociado al doctor y clínica seleccionada en la lista lateral
  const selectedDoctorBuilding = useMemo(() => {
    if (!selectedDoctorId || isDoctorDomicilioSelected) return null;
    return (
      displayedBuildings.find((b) =>
        b.doctors.some((d) => {
          if (d.expCodigo !== selectedDoctorId) return false;
          if (selectedClinicIndex !== null && selectedClinicIndex !== undefined) {
            return d.clinicIndex === selectedClinicIndex;
          }
          return true;
        })
      ) || null
    );
  }, [selectedDoctorId, isDoctorDomicilioSelected, selectedClinicIndex, displayedBuildings]);

  const onBuildingSelectRef = useRef(onBuildingSelect);
  useEffect(() => {
    onBuildingSelectRef.current = onBuildingSelect;
  }, [onBuildingSelect]);

  const prevNotifiedBuildingIdRef = useRef<string | null | undefined>(undefined);

  // Notificar al componente padre el edificio activo únicamente cuando cambie realmente de ID
  useEffect(() => {
    const currentId = activeBuilding?.id || null;
    if (prevNotifiedBuildingIdRef.current !== currentId) {
      prevNotifiedBuildingIdRef.current = currentId;
      onBuildingSelectRef.current?.(activeBuilding);
    }
  }, [activeBuilding]);

  // Coordenadas objetivo para centrado en el mapa
  const targetCoords = useMemo(() => {
    if (isDoctorDomicilioSelected && domicilioCoverage?.centroid) {
      return domicilioCoverage.centroid;
    }
    if (selectedDoctorBuilding) {
      return { lat: selectedDoctorBuilding.lat, lng: selectedDoctorBuilding.lng };
    }
    if (activeBuilding) {
      return { lat: activeBuilding.lat, lng: activeBuilding.lng };
    }
    return null;
  }, [isDoctorDomicilioSelected, domicilioCoverage, selectedDoctorBuilding, activeBuilding]);

  // Destino seleccionado para cálculo de trazo de ruta (sede física o clínica del médico seleccionado)
  const destinationCoords = useMemo(() => {
    if (!selectedDoctorId || isDoctorDomicilioSelected) return null;

    if (selectedDoctorBuilding) {
      return {
        lat: selectedDoctorBuilding.lat,
        lng: selectedDoctorBuilding.lng,
        title: selectedDoctorBuilding.name,
      };
    }

    if (activeBuilding && activeBuilding.doctors.some((d) => d.expCodigo === selectedDoctorId)) {
      return {
        lat: activeBuilding.lat,
        lng: activeBuilding.lng,
        title: activeBuilding.name,
      };
    }

    const clinic =
      typeof selectedClinicIndex === 'number' && selectedClinicIndex >= 0 && selectedDoctorData?.doctor.clinicas?.[selectedClinicIndex]
        ? selectedDoctorData.doctor.clinicas[selectedClinicIndex]
        : selectedDoctorData?.doctor.clinicas?.[0];

    if (
      clinic &&
      typeof clinic.cli_latitud === 'number' &&
      typeof clinic.cli_longitud === 'number' &&
      !isNaN(clinic.cli_latitud) &&
      !isNaN(clinic.cli_longitud)
    ) {
      return {
        lat: clinic.cli_latitud,
        lng: clinic.cli_longitud,
        title: clinic.cli_descripcion?.trim() || clinic.cli_direccion_completa?.trim() || 'Sede de atención',
      };
    }

    return null;
  }, [selectedDoctorId, isDoctorDomicilioSelected, selectedDoctorBuilding, activeBuilding, selectedDoctorData, selectedClinicIndex]);

  const hasActiveRoute = Boolean(userLocation && destinationCoords);

  const targetZoom = useMemo(() => {
    if (isDoctorDomicilioSelected) {
      return 13;
    }
    return 15;
  }, [isDoctorDomicilioSelected]);

  // Sincronización: Al seleccionar una sede específica del doctor, abrir el edificio y posicionar el carrusel
  useEffect(() => {
    if (!selectedDoctorId) return;

    // Si el doctor está en modo domicilio, no activar popover de ningún edificio físico
    if (isDoctorDomicilioSelected) {
      setActiveBuildingId(null);
      return;
    }

    // 1. Si hay una sede/clínica específica seleccionada (selectedClinicIndex),
    // el edificio activo DEBE ser el edificio correspondiente a esa sede (selectedDoctorBuilding).
    let targetBld: BuildingLocation | null = null;

    if (selectedClinicIndex !== null && selectedClinicIndex !== undefined && selectedDoctorBuilding) {
      targetBld = selectedDoctorBuilding;
    } else {
      const currentActiveBuilding = activeBuildingId
        ? (displayedBuildings.find((b) => b.id === activeBuildingId) || null)
        : null;
      const isDocInCurrentBuilding = !!currentActiveBuilding?.doctors.some(
        (d) => d.expCodigo === selectedDoctorId
      );

      targetBld = (isDocInCurrentBuilding
        ? currentActiveBuilding
        : (selectedDoctorBuilding || displayedBuildings.find((b) => b.doctors.some((d) => d.expCodigo === selectedDoctorId)))) ?? null;
    }

    if (targetBld) {
      if (activeBuildingId !== targetBld.id) {
        setActiveBuildingId(targetBld.id);
      }

      const docIndexInBuilding = targetBld.doctors.findIndex(
        (d) => d.expCodigo === selectedDoctorId && (selectedClinicIndex === null || selectedClinicIndex === undefined || d.clinicIndex === selectedClinicIndex)
      );
      const fallbackIdx = docIndexInBuilding >= 0
        ? docIndexInBuilding
        : targetBld.doctors.findIndex((d) => d.expCodigo === selectedDoctorId);

      setCarouselDoctorIndex(fallbackIdx >= 0 ? fallbackIdx : 0);
    }
  }, [selectedDoctorId, isDoctorDomicilioSelected, selectedDoctorBuilding, selectedClinicIndex, displayedBuildings]);

  // Manejador para navegar al doctor anterior en el carrusel del edificio
  const handlePrevDoctor = (bld: BuildingLocation, e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
    if (!bld || bld.doctors.length <= 1) return;

    const currentDocIdx = bld.doctors.findIndex(
      (d) => d.expCodigo === selectedDoctorId && (selectedClinicIndex === null || selectedClinicIndex === undefined || d.clinicIndex === selectedClinicIndex)
    );
    const fallbackCurrentIdx = currentDocIdx >= 0
      ? currentDocIdx
      : bld.doctors.findIndex((d) => d.expCodigo === selectedDoctorId);

    const currentIdx = fallbackCurrentIdx >= 0
      ? fallbackCurrentIdx
      : Math.max(0, Math.min(carouselDoctorIndex, bld.doctors.length - 1));

    const nextIdx = currentIdx === 0 ? bld.doctors.length - 1 : currentIdx - 1;

    setActiveBuildingId(bld.id);
    setCarouselDoctorIndex(nextIdx);

    const doc = bld.doctors[nextIdx];
    if (doc) {
      onDoctorSelect(doc.expCodigo, doc.clinicIndex);
    }
  };

  // Manejador para navegar al siguiente doctor en el carrusel del edificio
  const handleNextDoctor = (bld: BuildingLocation, e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
    if (!bld || bld.doctors.length <= 1) return;

    const currentDocIdx = bld.doctors.findIndex(
      (d) => d.expCodigo === selectedDoctorId && (selectedClinicIndex === null || selectedClinicIndex === undefined || d.clinicIndex === selectedClinicIndex)
    );
    const fallbackCurrentIdx = currentDocIdx >= 0
      ? currentDocIdx
      : bld.doctors.findIndex((d) => d.expCodigo === selectedDoctorId);

    const currentIdx = fallbackCurrentIdx >= 0
      ? fallbackCurrentIdx
      : Math.max(0, Math.min(carouselDoctorIndex, bld.doctors.length - 1));

    const nextIdx = currentIdx === bld.doctors.length - 1 ? 0 : currentIdx + 1;

    setActiveBuildingId(bld.id);
    setCarouselDoctorIndex(nextIdx);

    const doc = bld.doctors[nextIdx];
    if (doc) {
      onDoctorSelect(doc.expCodigo, doc.clinicIndex);
    }
  };

  const radarRadiusMeters = (radarRadiusKm || 10) * 1000;

  if (!MAPS_API_KEY) {
    return (
      <div className="w-full h-full min-h-[400px] rounded-3xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-6 text-center">
        <MapPin className="w-10 h-10 text-sky-500 mb-2" />
        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
          Mapa interactivo de clínicas
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
          Visualiza la ubicación de los médicos agrupados por clínica y hospital en tiempo real.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[500px] rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-slate-800 relative z-10 bg-slate-100 dark:bg-slate-950 font-sans">
      {/* Badge Flotante con Tiempo Estimado y Distancia de la Ruta en Auto */}
      {routeInfo && destinationCoords && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border border-sky-200/90 dark:border-sky-800/80 text-slate-800 dark:text-slate-100 pointer-events-auto transition-all duration-200 animate-in fade-in slide-in-from-top-2">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 dark:bg-sky-400/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <Car className="w-4 h-4" />
          </div>
          <div className="min-w-0 pr-1">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white">
              <span className="text-sky-600 dark:text-sky-400">{routeInfo.duration}</span>
              <span className="text-slate-300 dark:text-slate-600 font-normal">·</span>
              <span>{routeInfo.distance}</span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-0.5">
                en auto
              </span>
            </div>
            {destinationCoords.title && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px] sm:max-w-[260px] font-medium">
                Ruta hacia {destinationCoords.title}
              </p>
            )}
          </div>
        </div>
      )}

      <APIProvider apiKey={MAPS_API_KEY} libraries={GOOGLE_MAPS_LIBRARIES}>
        <GoogleMap
          mapId="DEMO_MAP_ID"
          clickableIcons={false}
          defaultCenter={
            targetCoords ||
            (closestBuilding
              ? { lat: closestBuilding.lat, lng: closestBuilding.lng }
              : GUATEMALA_CENTER)
          }
          defaultZoom={14}
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="w-full h-full min-h-[500px]"
          onClick={() => {
            if (!selectedDoctorId) {
              setActiveBuildingId(null);
            }
          }}
        >
          <MapController
            userLocation={userLocation}
            isNearMeActive={isNearMeActive}
            targetCoords={targetCoords}
            targetZoom={targetZoom}
            isDoctorDomicilioSelected={isDoctorDomicilioSelected}
            selectedDoctorBuildings={selectedDoctorBuildings}
            selectedDoctorId={selectedDoctorId}
            defaultCenterCoords={defaultCenterCoords}
            hasActiveRoute={hasActiveRoute}
            searchedLocation={searchedLocation}
          />

          {/* Trazo de Ruta (DirectionsRenderer) entre usuario y consultorio */}
          <MapRouteRenderer
            origin={userLocation}
            destination={destinationCoords}
            onRouteCalculated={setRouteInfo}
          />

          {/* Circulo de Radar Ajustable para Cerca de ti */}
          {isNearMeActive && userLocation && !searchedLocation && (
            <MapCircle
              center={{ lat: userLocation.lat, lng: userLocation.lng }}
              radius={radarRadiusMeters}
              options={{
                fillColor: '#0ea5e9',
                fillOpacity: 0.08,
                strokeColor: '#0284c7',
                strokeOpacity: 0.8,
                strokeWeight: 2,
              }}
            />
          )}

          {/* Marcador de Ubicación del Usuario (Minimalista) */}
          {userLocation && (
            <AdvancedMarker position={userLocation} zIndex={1000}>
              <div className="relative flex flex-col items-center select-none group cursor-pointer -translate-y-1/2">
                {isNearMeActive && (
                  <div className="absolute -inset-2.5 rounded-full bg-sky-400/25 animate-ping pointer-events-none" />
                )}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-600 text-white font-bold text-[11px] shadow-md border-2 border-white backdrop-blur-xs">
                  <Navigation className="w-3 h-3 fill-white text-white shrink-0" />
                  <span>Tu ubicación</span>
                </div>
                <div className="w-1.5 h-1.5 bg-sky-600 rounded-full border border-white mt-0.5 shadow-xs" />
              </div>
            </AdvancedMarker>
          )}

          {/* Marcador y Circulo de Radar para Ubicación Buscada (Minimalista) */}
          {searchedLocation && (
            <>
              <MapCircle
                center={{ lat: searchedLocation.lat, lng: searchedLocation.lng }}
                radius={radarRadiusMeters}
                options={{
                  fillColor: '#0ea5e9',
                  fillOpacity: 0.08,
                  strokeColor: '#0284c7',
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                }}
              />
              <AdvancedMarker
                position={{ lat: searchedLocation.lat, lng: searchedLocation.lng }}
                zIndex={1005}
              >
                <div className="relative flex flex-col items-center select-none group cursor-pointer -translate-y-1/2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950 text-white font-bold text-[11px] shadow-lg border border-blue-800">
                    <MapPin className="w-3.5 h-3.5 fill-white text-white shrink-0" />
                    <span className="max-w-[150px] truncate">{searchedLocation.address}</span>
                  </div>
                  <div className="w-1.5 h-1.5 bg-blue-950 rounded-full border border-blue-400 mt-0.5 shadow-xs" />
                </div>
              </AdvancedMarker>
            </>
          )}

          {/* Círculos de Cobertura para Atención a Domicilio */}
          {domicilioCoverage && domicilioCoverage.circles.map((circle, cIdx) => (
            <MapCircle
              key={`domicilio_circle_${cIdx}_${circle.lat}_${circle.lng}`}
              center={{ lat: circle.lat, lng: circle.lng }}
              radius={circle.radiusMeters}
              options={{
                fillColor: '#10B981',
                fillOpacity: 0.18,
                strokeColor: '#059669',
                strokeOpacity: 0.85,
                strokeWeight: 2,
              }}
            />
          ))}

          {/* Marcador Central para Cobertura a Domicilio (Fondo Azul Oscuro Sólido + Contenido Blanco) */}
          {domicilioCoverage && (
            <AdvancedMarker position={domicilioCoverage.centroid} zIndex={1100}>
              <div className="relative flex flex-col items-center select-none group cursor-pointer -translate-y-1/2 animate-in fade-in zoom-in duration-300">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950 text-white font-bold text-[11px] shadow-lg border border-blue-800">
                  <Home className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>Atención a Domicilio</span>
                </div>
                <div className="w-1.5 h-1.5 bg-blue-950 rounded-full border border-blue-400 mt-0.5 shadow-xs" />
              </div>
            </AdvancedMarker>
          )}

          {/* Pines Consolidados por Edificio / Hospital */}
          {displayedBuildings.map((building) => {
            const hasMultipleDoctors = building.doctors.length > 1;

            // Prioridad 1: Hover directo del mouse sobre ESTE pin del mapa
            const isThisBuildingHovered = hoveredBuildingId === building.id;

            // Prioridad 2: Edificio actualmente activo/seleccionado
            const isThisBuildingActive = activeBuildingId === building.id;

            // Prioridad 3: Edificio donde TAMBIÉN trabaja el médico seleccionado (si el médico trabaja en varias clínicas)
            const isThisBuildingDoctorWorkplace =
              !isThisBuildingActive &&
              !!selectedDoctorId &&
              selectedDoctorBuildingIds.has(building.id);

            // Prioridad 4: Hover desde la tarjeta del médico en la lista lateral (si no hay hover en el mapa ni médico seleccionado)
            const isDoctorFromListHovered =
              !hoveredBuildingId &&
              !selectedDoctorId &&
              !!hoveredDoctorId &&
              building.doctors.some(
                (d) => d.expCodigo === hoveredDoctorId && d.clinicIndex === selectedClinicIndex
              );

            return (
              <AdvancedMarker
                key={building.id}
                position={{ lat: building.lat, lng: building.lng }}
                onClick={() => {
                  if (activeBuildingId === building.id) return;
                  setActiveBuildingId(building.id);
                  onBuildingSelect?.(building);
                  if (building.doctors.length > 0) {
                    const docIndex = selectedDoctorId
                      ? building.doctors.findIndex((d) => d.expCodigo === selectedDoctorId)
                      : -1;
                    setCarouselDoctorIndex(docIndex >= 0 ? docIndex : 0);
                  }
                }}
                onMouseEnter={() => setHoveredBuildingId(building.id)}
                onMouseLeave={() => setHoveredBuildingId((prev) => (prev === building.id ? null : prev))}
                zIndex={isThisBuildingActive ? 9999 : isThisBuildingDoctorWorkplace ? 8000 : isThisBuildingHovered ? 7000 : 3000}
              >
                <div className="relative flex flex-col items-center select-none group cursor-pointer -translate-y-full pb-1 pointer-events-auto">
                  {isThisBuildingActive ? (
                    /* ─── ESTADO 1: EDIFICIO ACTIVO / SELECCIONADO (Fondo Azul Oscuro Sólido + Contenido Blanco) ─── */
                    (() => {
                      const selectedIdxInBuilding = building.doctors.findIndex(
                        (d) => d.expCodigo === selectedDoctorId && (selectedClinicIndex === null || selectedClinicIndex === undefined || d.clinicIndex === selectedClinicIndex)
                      );
                      const fallbackIdxInBuilding = selectedIdxInBuilding >= 0
                        ? selectedIdxInBuilding
                        : building.doctors.findIndex((d) => d.expCodigo === selectedDoctorId);

                      const activeDoctorIdx = fallbackIdxInBuilding >= 0
                        ? fallbackIdxInBuilding
                        : Math.max(0, Math.min(carouselDoctorIndex, building.doctors.length - 1));
                      const currentDoctor = building.doctors[activeDoctorIdx];

                      return (
                        <div className="flex flex-col items-center transition-all duration-200 animate-in zoom-in-95 pointer-events-auto">
                          <div className="p-3 rounded-2xl text-xs shadow-2xl border transition-all flex flex-col gap-2.5 bg-blue-950 text-white border-blue-700/80 ring-2 ring-blue-500/30 backdrop-blur-md min-w-[240px] max-w-[290px]">
                            {/* Fila 1: Cabecera con Nombre del Sitio + Flechas */}
                            <div className="flex items-center justify-between gap-2 border-b border-blue-900/80 pb-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="w-6 h-6 rounded-lg bg-blue-900 text-white flex items-center justify-center shrink-0 border border-blue-700/60 shadow-xs">
                                  <Building2 className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div className="flex flex-col min-w-0 text-left">
                                  <span className="truncate text-xs font-bold leading-tight text-white" title={building.name}>
                                    {building.name}
                                  </span>
                                  <span className="text-[10px] text-blue-200 font-medium truncate">
                                    {hasMultipleDoctors ? `${building.doctors.length} especialistas en esta sede` : '1 especialista en esta sede'}
                                  </span>
                                </div>
                              </div>

                              {hasMultipleDoctors && (
                                <div
                                  className="flex items-center gap-1 shrink-0"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => handlePrevDoctor(building, e)}
                                    className="p-1 rounded-md bg-blue-900 hover:bg-blue-850 text-white transition cursor-pointer border border-blue-700/60"
                                    title="Médico anterior"
                                  >
                                    <ChevronLeft className="w-3 h-3 text-white" />
                                  </button>
                                  <span className="text-[10px] font-bold text-blue-200 px-0.5 select-none">
                                    {activeDoctorIdx + 1}/{building.doctors.length}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleNextDoctor(building, e)}
                                    className="p-1 rounded-md bg-blue-900 hover:bg-blue-850 text-white transition cursor-pointer border border-blue-700/60"
                                    title="Siguiente médico"
                                  >
                                    <ChevronRight className="w-3 h-3 text-white" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Fila 2: Fotos de los médicos */}
                            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 px-0.5 scrollbar-none">
                              {building.doctors.map((docItem, idx) => {
                                const isCurrentActive = idx === activeDoctorIdx;
                                const docName = buildDoctorShortName(docItem.doctorData.doctor) || docItem.doctorData.fullName;

                                return (
                                  <button
                                    key={`${docItem.expCodigo}-${idx}`}
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveBuildingId(building.id);
                                      setCarouselDoctorIndex(idx);
                                      onDoctorSelect(docItem.expCodigo, docItem.clinicIndex);
                                    }}
                                    className={`relative w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                                      isCurrentActive
                                        ? 'border-white ring-2 ring-blue-400 scale-105 shadow-sm z-10'
                                        : 'border-blue-900/80 opacity-60 hover:opacity-100'
                                    }`}
                                    title={`${docName} (${docItem.doctorData.specialtyPreview[0] || 'Especialista'})`}
                                  >
                                    {docItem.doctorData.doctor.exp_foto_perfil ? (
                                      <Image
                                        src={docItem.doctorData.doctor.exp_foto_perfil}
                                        alt={docName}
                                        fill
                                        sizes="32px"
                                        className="object-cover object-top"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center bg-blue-900 text-[10px] font-bold text-white">
                                        {docName.charAt(0)}
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Fila 3: Información del médico activo */}
                            {currentDoctor && (
                              <div
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="flex items-center justify-between gap-2 pt-2 border-t border-blue-900/80 text-left"
                              >
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDoctorSelect(currentDoctor.expCodigo, currentDoctor.clinicIndex);
                                  }}
                                  className="flex flex-col min-w-0 flex-1 cursor-pointer group/docinfo hover:opacity-90"
                                  title="Ver detalles en el panel lateral"
                                >
                                  <span className="text-xs font-bold text-white truncate group-hover/docinfo:text-sky-300 transition-colors">
                                    {buildDoctorShortName(currentDoctor.doctorData.doctor) || currentDoctor.doctorData.fullName}
                                  </span>
                                  <span className="text-[10px] text-blue-200 font-semibold truncate">
                                    {currentDoctor.doctorData.specialtyPreview[0] || 'Especialista'}
                                  </span>
                                  <span className="text-[10px] text-emerald-400 font-bold">
                                    Consulta: {currentDoctor.priceLabel}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/dashboard/agendar/${currentDoctor.expCodigo}`);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-[10px] font-bold transition cursor-pointer shadow-md whitespace-nowrap active:scale-95"
                                    title="Agendar cita con este especialista"
                                  >
                                    Agendar
                                  </button>
                                  <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onNavigateToProfile(currentDoctor.expCodigo);
                                    }}
                                    className="px-2 py-1.5 rounded-lg bg-blue-900/90 hover:bg-blue-800 text-white text-[10px] font-bold transition cursor-pointer border border-blue-700/60 whitespace-nowrap active:scale-95"
                                    title="Ver perfil completo del médico"
                                  >
                                    Perfil
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="w-2.5 h-2.5 bg-blue-950 border-r border-b border-blue-800 rotate-45 -mt-1.5 shadow-xs" />
                        </div>
                      );
                    })()
                  ) : isThisBuildingDoctorWorkplace ? (
                    /* ─── ESTADO 2: OTRA SEDE DEL MÉDICO (Fondo Azul Oscuro Sólido + Contenido Blanco) ─── */
                    <div className="flex flex-col items-center transition-all duration-200 animate-in zoom-in-95 pointer-events-auto">
                      <div className="px-3 py-1.5 rounded-2xl font-semibold text-xs shadow-xl border transition-all whitespace-nowrap flex items-center gap-2 bg-blue-950 text-white border-blue-700 ring-2 ring-blue-500/30 hover:scale-105 cursor-pointer backdrop-blur-md">
                        <Building2 className="w-3.5 h-3.5 text-white shrink-0" />
                        <span className="max-w-[150px] truncate text-xs font-bold text-white" title={building.name}>
                          {building.name}
                        </span>
                        <span className="text-[10px] text-blue-200 font-medium">
                          · {building.doctors.length} esp.
                        </span>
                      </div>
                      <div className="w-2 h-2 bg-blue-950 border-r border-b border-blue-800 rotate-45 -mt-1 shadow-xs" />
                    </div>
                  ) : isThisBuildingHovered || isDoctorFromListHovered ? (
                    /* ─── ESTADO 3: HOVER (Fondo Azul Oscuro Sólido + Contenido Blanco) ─── */
                    <div className="flex flex-col items-center transition-all duration-200 animate-in zoom-in-95 pointer-events-auto">
                      <div className="px-3.5 py-1.5 rounded-2xl font-bold text-xs shadow-2xl border transition-all whitespace-nowrap flex items-center gap-2.5 bg-blue-950 text-white border-blue-700 backdrop-blur-md">
                        <div className="w-6 h-6 rounded-lg bg-blue-900 text-white flex items-center justify-center shrink-0 border border-blue-700/60">
                          <Building2 className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="max-w-[170px] truncate text-xs font-bold leading-tight text-white">
                            {building.name}
                          </span>
                          <span className="text-[10px] text-blue-200 font-medium">
                            {hasMultipleDoctors
                              ? `${building.doctors.length} especialistas`
                              : (building.doctors[0] ? buildDoctorShortName(building.doctors[0].doctorData.doctor) : null) || 'Especialista'}
                          </span>
                        </div>
                        {hasMultipleDoctors && (
                          <span className="flex h-4.5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-sky-600 text-white text-[9px] font-black ml-0.5 border border-blue-950">
                            {building.doctors.length}
                          </span>
                        )}
                      </div>
                      <div className="w-2 h-2 bg-blue-950 border-r border-b border-blue-800 rotate-45 -mt-1 shadow-xs" />
                    </div>
                  ) : (
                    /* ─── ESTADO 4: NO SELECCIONADO / REPOSO (Fondo Azul Oscuro Sólido + Contenido Blanco) ─── */
                    <div className="flex flex-col items-center transition-transform duration-200 hover:scale-120 cursor-pointer">
                      <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-blue-950 text-white shadow-lg border border-blue-700/80 hover:border-blue-400 hover:bg-blue-900 transition-colors">
                        {hasMultipleDoctors ? (
                          <Building2 className="w-4 h-4 text-white shrink-0" />
                        ) : (
                          <Stethoscope className="w-4 h-4 text-white shrink-0" />
                        )}

                        {/* Mini Badge con número si hay más de 1 médico */}
                        {hasMultipleDoctors && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-sky-600 text-white text-[9px] font-black border border-blue-950 shadow-xs">
                            {building.doctors.length}
                          </span>
                        )}
                      </div>
                      <div className="w-2 h-2 bg-blue-950 border-r border-b border-blue-800 rotate-45 -mt-1 shadow-xs" />
                    </div>
                  )}
                </div>
              </AdvancedMarker>
            );
          })}
        </GoogleMap>
      </APIProvider>
    </div>
  );
}
