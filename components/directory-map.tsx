'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import {
  MapPin,
  Building2,
  Stethoscope,
  Navigation,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { DoctorCardData } from './doctor-card';
import type { DoctorClinica } from '@/types';
import { getDoctorPriceDisplay, buildDoctorShortName, cleanZonaText } from '@/types/doctor';

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
function MapCircle({
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

// Controlador interno para manejar el centrado y zoom suave del mapa
function MapController({
  userLocation,
  isNearMeActive,
  targetCoords,
  defaultCenterCoords,
  selectedDoctorBuildings,
}: {
  userLocation?: { lat: number; lng: number } | null;
  isNearMeActive?: boolean;
  targetCoords?: { lat: number; lng: number } | null;
  defaultCenterCoords?: { lat: number; lng: number } | null;
  selectedDoctorBuildings?: BuildingLocation[];
}) {
  const map = useMap();
  const lastCenteredNearMeRef = useRef<boolean>(false);
  const hasCenteredDefaultRef = useRef(false);

  // Desactivar iconos cliqueables de Google y ocultar POIs
  useEffect(() => {
    if (!map) return;
    map.setOptions({
      clickableIcons: false,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      ],
    });
  }, [map]);

  const hadDoctorSelectedRef = useRef(false);

  // Centrado y zoom según selección de sede específica o encuadre de todas las sedes del médico
  useEffect(() => {
    if (!map) return;

    if (targetCoords) {
      map.panTo(targetCoords);
      map.setZoom(16);
      return;
    }

    if (selectedDoctorBuildings && selectedDoctorBuildings.length > 0) {
      hadDoctorSelectedRef.current = true;
      if (selectedDoctorBuildings.length === 1) {
        map.panTo({ lat: selectedDoctorBuildings[0].lat, lng: selectedDoctorBuildings[0].lng });
        map.setZoom(15);
      } else {
        const avgLat = selectedDoctorBuildings.reduce((sum, b) => sum + b.lat, 0) / selectedDoctorBuildings.length;
        const avgLng = selectedDoctorBuildings.reduce((sum, b) => sum + b.lng, 0) / selectedDoctorBuildings.length;
        map.panTo({ lat: avgLat, lng: avgLng });
        map.setZoom(14);
      }
      return;
    }

    // Si antes había un médico seleccionado y ahora ya no (ej. se cerró la selección para ver el mapa general)
    if (hadDoctorSelectedRef.current && (!selectedDoctorBuildings || selectedDoctorBuildings.length === 0)) {
      hadDoctorSelectedRef.current = false;
      const target = defaultCenterCoords || GUATEMALA_CENTER;
      map.panTo(target);
      map.setZoom(13);
    }
  }, [map, targetCoords?.lat, targetCoords?.lng, selectedDoctorBuildings, defaultCenterCoords]);

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

    if (!hasCenteredDefaultRef.current && !targetCoords && (!selectedDoctorBuildings || selectedDoctorBuildings.length === 0)) {
      const target = defaultCenterCoords || GUATEMALA_CENTER;
      map.panTo(target);
      map.setZoom(14);
      hasCenteredDefaultRef.current = true;
    }
  }, [map, userLocation, isNearMeActive, targetCoords, defaultCenterCoords, selectedDoctorBuildings]);

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
  // Estado del edificio/clínica seleccionado cuyo pop-up se muestra
  const [activeBuildingId, setActiveBuildingId] = useState<string | null>(null);

  // Estado del edificio sobre el cual el usuario tiene el mouse (hover directo en el pin)
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null);

  // Índice del doctor actualmente visible en el carrusel del edificio activo
  const [carouselDoctorIndex, setCarouselDoctorIndex] = useState<number>(0);

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

            buildingMap.set(buildingKey, {
              id: `bld-${buildingMap.size + 1}-${coordKey}`,
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
            id: `bld-default-${coordKey}`,
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

  // Edificios a mostrar: si hay un médico seleccionado, mostrar únicamente las sedes del médico seleccionado
  // para que el usuario se concentre en ellas; si no hay médico seleccionado (ej. al presionar "Ver mapa"),
  // mostrar todos los punteros de las ubicaciones.
  const displayedBuildings = useMemo(() => {
    if (selectedDoctorId) {
      return selectedDoctorBuildings;
    }
    return buildings;
  }, [selectedDoctorId, selectedDoctorBuildings, buildings]);

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

  // Edificio activo o seleccionado
  const activeBuilding = useMemo(() => {
    return displayedBuildings.find((b) => b.id === activeBuildingId) || null;
  }, [displayedBuildings, activeBuildingId]);

  // Edificio asociado al doctor y clínica seleccionada en la lista lateral
  const selectedDoctorBuilding = useMemo(() => {
    if (!selectedDoctorId || selectedClinicIndex === null || selectedClinicIndex === undefined) return null;
    return (
      displayedBuildings.find((b) =>
        b.doctors.some(
          (d) => d.expCodigo === selectedDoctorId && d.clinicIndex === selectedClinicIndex
        )
      ) || null
    );
  }, [selectedDoctorId, selectedClinicIndex, displayedBuildings]);

  // Notificar al componente padre el edificio activo
  useEffect(() => {
    onBuildingSelect?.(activeBuilding);
  }, [activeBuilding, onBuildingSelect]);

  // Coordenadas objetivo para centrado en el mapa
  const targetCoords = useMemo(() => {
    if (selectedDoctorBuilding) {
      return { lat: selectedDoctorBuilding.lat, lng: selectedDoctorBuilding.lng };
    }
    if (activeBuilding) {
      return { lat: activeBuilding.lat, lng: activeBuilding.lng };
    }
    return null;
  }, [selectedDoctorBuilding, activeBuilding]);

  // Sincronización: Al seleccionar una sede específica del doctor, abrir el edificio y posicionar el carrusel
  useEffect(() => {
    if (selectedDoctorId && selectedDoctorBuilding) {
      setActiveBuildingId(selectedDoctorBuilding.id);

      const docIndexInBuilding = selectedDoctorBuilding.doctors.findIndex(
        (d) => d.expCodigo === selectedDoctorId && d.clinicIndex === selectedClinicIndex
      );
      setCarouselDoctorIndex(docIndexInBuilding >= 0 ? docIndexInBuilding : 0);
    } else if (!selectedDoctorId || selectedClinicIndex === null || selectedClinicIndex === undefined) {
      setActiveBuildingId(null);
    }
  }, [selectedDoctorId, selectedDoctorBuilding, selectedClinicIndex]);

  // Manejador para navegar al doctor anterior en el carrusel del edificio
  const handlePrevDoctor = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeBuilding || activeBuilding.doctors.length <= 1) return;
    const nextIdx = carouselDoctorIndex === 0 ? activeBuilding.doctors.length - 1 : carouselDoctorIndex - 1;
    setCarouselDoctorIndex(nextIdx);
    const doc = activeBuilding.doctors[nextIdx];
    if (doc) {
      onDoctorSelect(doc.expCodigo, doc.clinicIndex);
    }
  };

  // Manejador para navegar al siguiente doctor en el carrusel del edificio
  const handleNextDoctor = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeBuilding || activeBuilding.doctors.length <= 1) return;
    const nextIdx = carouselDoctorIndex === activeBuilding.doctors.length - 1 ? 0 : carouselDoctorIndex + 1;
    setCarouselDoctorIndex(nextIdx);
    const doc = activeBuilding.doctors[nextIdx];
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
      <APIProvider apiKey={MAPS_API_KEY} libraries={['places', 'marker']}>
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
        >
          <MapController
            userLocation={userLocation}
            isNearMeActive={isNearMeActive}
            targetCoords={targetCoords}
            selectedDoctorBuildings={selectedDoctorBuildings}
            defaultCenterCoords={
              closestBuilding
                ? { lat: closestBuilding.lat, lng: closestBuilding.lng }
                : null
            }
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

          {/* Marcador de Ubicación del Usuario */}
          {userLocation && (
            <AdvancedMarker position={userLocation} zIndex={1000}>
              <div className="relative flex flex-col items-center select-none group cursor-pointer -translate-y-full pb-1">
                {isNearMeActive && (
                  <div className="absolute -inset-3 rounded-full bg-sky-400/30 animate-ping pointer-events-none" />
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white font-extrabold text-xs shadow-2xl border-2 border-sky-400">
                  <Navigation className="w-3.5 h-3.5 fill-sky-400 text-sky-400" />
                  <span>
                    Tu ubicación {isNearMeActive ? `· Radar ${radarRadiusKm} km` : ''}
                  </span>
                </div>
                <div className="w-2.5 h-2.5 bg-slate-900 border-r-2 border-b-2 border-sky-400 rotate-45 -mt-1.5 shadow-xs" />
                <div className="w-2 h-0.5 bg-slate-950/40 rounded-full blur-[0.5px] mt-0.5" />
              </div>
            </AdvancedMarker>
          )}

          {/* Marcador y Circulo de Radar para Ubicación Buscada */}
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
                <div className="relative flex flex-col items-center select-none group cursor-pointer -translate-y-full pb-1">
                  <div className="absolute -inset-3 rounded-full bg-sky-500/25 animate-ping pointer-events-none" />
                  <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-600 text-white font-black text-xs shadow-2xl border-2 border-white">
                    <MapPin className="w-4 h-4 fill-white text-white shrink-0" />
                    <span className="max-w-[170px] truncate">
                      {searchedLocation.address} · Radar {radarRadiusKm} km
                    </span>
                  </div>
                  <div className="w-2.5 h-2.5 bg-sky-600 border-r-2 border-b-2 border-white rotate-45 -mt-1.5 shadow-xs" />
                  <div className="w-2 h-0.5 bg-slate-950/40 rounded-full blur-[0.5px] mt-0.5" />
                </div>
              </AdvancedMarker>
            </>
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
                  setActiveBuildingId(building.id);
                  if (building.doctors.length > 0) {
                    const docIndex = building.doctors.findIndex((d) => d.expCodigo === selectedDoctorId);
                    const chosenDoc = docIndex >= 0 ? building.doctors[docIndex] : building.doctors[0];
                    setCarouselDoctorIndex(docIndex >= 0 ? docIndex : 0);
                    onDoctorSelect(chosenDoc.expCodigo, chosenDoc.clinicIndex);
                  }
                }}
                onMouseEnter={() => setHoveredBuildingId(building.id)}
                onMouseLeave={() => setHoveredBuildingId((prev) => (prev === building.id ? null : prev))}
                zIndex={isThisBuildingActive ? 9999 : isThisBuildingDoctorWorkplace ? 8000 : isThisBuildingHovered ? 7000 : 3000}
              >
                <div className="relative flex flex-col items-center select-none group cursor-pointer -translate-y-full pb-1 pointer-events-auto">
                  {isThisBuildingActive ? (
                    /* ─── ESTADO 1: EDIFICIO ACTIVO / SELECCIONADO (Fondo Negro + Contenido Blanco + Fotos) ─── */
                    <div className="flex flex-col items-center transition-all duration-200 animate-in zoom-in-95 pointer-events-auto">
                      <div className="p-2.5 rounded-2xl font-black text-xs shadow-2xl border-2 transition-all flex flex-col gap-2 bg-slate-950 text-white border-white ring-4 ring-black/50 min-w-[220px] max-w-[300px]">
                        {/* Fila 1: Cabecera con Nombre del Sitio + Flechas de navegación */}
                        <div className="flex items-center justify-between gap-2 border-b border-white/20 pb-1.5">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-6 h-6 rounded-lg bg-white/15 text-white flex items-center justify-center shrink-0 border border-white/30">
                              <Building2 className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="flex flex-col min-w-0 text-left">
                              <span className="truncate text-xs font-black leading-tight text-white" title={building.name}>
                                {building.name}
                              </span>
                              <span className="text-[10px] text-slate-300 font-bold truncate">
                                {hasMultipleDoctors
                                  ? `${building.doctors.length} especialistas disponibles`
                                  : '1 especialista disponible'}
                              </span>
                            </div>
                          </div>

                          {/* Flechas para avanzar entre médicos si hay más de 1 */}
                          {hasMultipleDoctors && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrevDoctor(e);
                                }}
                                className="p-1 rounded-md bg-white/10 hover:bg-white/25 text-white transition cursor-pointer border border-white/20"
                                title="Médico anterior"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-[10px] font-black text-white px-0.5">
                                {carouselDoctorIndex + 1}/{building.doctors.length}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNextDoctor(e);
                                }}
                                className="p-1 rounded-md bg-white/10 hover:bg-white/25 text-white transition cursor-pointer border border-white/20"
                                title="Siguiente médico"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Fila 2: Círculos de fotos de los médicos que trabajan allí */}
                        <div className="flex items-center gap-2 overflow-x-auto py-0.5 px-0.5 scrollbar-none">
                          {building.doctors.map((docItem, idx) => {
                            const isSelectedDoc = docItem.expCodigo === selectedDoctorId;
                            const isCarouselDoc = idx === carouselDoctorIndex;
                            const isCurrentActive = isSelectedDoc || isCarouselDoc;
                            const docName = buildDoctorShortName(docItem.doctorData.doctor) || docItem.doctorData.fullName;

                            return (
                              <button
                                key={`${docItem.expCodigo}-${idx}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCarouselDoctorIndex(idx);
                                  onDoctorSelect(docItem.expCodigo, docItem.clinicIndex);
                                }}
                                className={`relative w-8.5 h-8.5 rounded-full overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                                  isCurrentActive
                                    ? 'border-white ring-2 ring-sky-400 scale-110 shadow-lg shadow-black/80 z-10'
                                    : 'border-white/30 opacity-60 hover:opacity-100 hover:scale-105 hover:border-white'
                                }`}
                                title={`${docName} (${docItem.doctorData.specialtyPreview[0] || 'Especialista'})`}
                              >
                                {docItem.doctorData.doctor.exp_foto_perfil ? (
                                  <Image
                                    src={docItem.doctorData.doctor.exp_foto_perfil}
                                    alt={docName}
                                    fill
                                    sizes="34px"
                                    className="object-cover object-top"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-slate-800 text-[10px] font-black text-white">
                                    {docName.charAt(0)}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Pico / Punta inferior que apunta al suelo */}
                      <div className="w-3.5 h-3.5 bg-slate-950 border-r-2 border-b-2 border-white rotate-45 -mt-2 shadow-md" />
                      {/* Sombra de punto de contacto */}
                      <div className="w-3.5 h-1 bg-black/60 rounded-full blur-[1px] mt-0.5" />
                    </div>
                  ) : isThisBuildingDoctorWorkplace ? (
                    /* ─── ESTADO 2: OTRA SEDE DEL MÉDICO SELECCIONADO (Fondo negro y contenido blanco) ─── */
                    <div className="flex flex-col items-center transition-all duration-200 animate-in zoom-in-95 pointer-events-auto">
                      <div className="px-3.5 py-1.5 rounded-2xl font-black text-xs shadow-2xl border-2 transition-all whitespace-nowrap flex items-center gap-2 bg-slate-950 text-white border-white ring-2 ring-black/40 hover:scale-105 cursor-pointer">
                        <div className="w-6 h-6 rounded-lg bg-white/15 text-white flex items-center justify-center shrink-0 border border-white/30">
                          <Building2 className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="max-w-[160px] truncate text-xs font-black leading-tight text-white" title={building.name}>
                            {building.name}
                          </span>
                          <span className="text-[10px] text-slate-300 font-bold">
                            Sede médica · {building.doctors.length} esp.
                          </span>
                        </div>
                      </div>
                      {/* Pico / Punta inferior que apunta al suelo */}
                      <div className="w-3 h-3 bg-slate-950 border-r-2 border-b-2 border-white rotate-45 -mt-1.5 shadow-md" />
                      <div className="w-3 h-0.5 bg-black/60 rounded-full blur-[1px] mt-0.5" />
                    </div>
                  ) : isThisBuildingHovered || isDoctorFromListHovered ? (
                    /* ─── ESTADO 3: HOVER (Previsualización Fondo Negro + Contenido Blanco) ─── */
                    <div className="flex flex-col items-center transition-all duration-200 animate-in zoom-in-95 duration-200 pointer-events-auto">
                      <div className="px-3.5 py-1.5 rounded-2xl font-black text-xs shadow-2xl border-2 transition-all whitespace-nowrap flex items-center gap-2.5 bg-slate-950 text-white border-white ring-4 ring-black/40">
                        <div className="w-7 h-7 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0 border border-white/30">
                          <Building2 className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="max-w-[180px] truncate text-xs font-black leading-tight text-white">
                            {building.name}
                          </span>
                          <span className="text-[10px] text-slate-300 font-bold">
                            {hasMultipleDoctors
                              ? `${building.doctors.length} especialistas`
                              : (building.doctors[0] ? buildDoctorShortName(building.doctors[0].doctorData.doctor) : null) || 'Especialista'}
                          </span>
                        </div>
                        {hasMultipleDoctors && (
                          <span className="flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-white text-slate-950 text-[10px] font-black shadow-inner ml-0.5">
                            {building.doctors.length}
                          </span>
                        )}
                      </div>

                      {/* Pico / Punta inferior que apunta al suelo */}
                      <div className="w-3.5 h-3.5 bg-slate-950 border-r-2 border-b-2 border-white rotate-45 -mt-2 shadow-md" />
                      {/* Sombra de punto de contacto */}
                      <div className="w-3.5 h-1 bg-black/60 rounded-full blur-[1px] mt-0.5" />
                    </div>
                  ) : (
                    /* ─── ESTADO 4: NO SELECCIONADO / REPOSO (Fondo Negro + Icono Blanco + Borde Blanco) ─── */
                    <div className="flex flex-col items-center transition-transform duration-200 hover:scale-125">
                      <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-slate-950 text-white shadow-2xl border-2 border-white ring-2 ring-black/30">
                        {hasMultipleDoctors ? (
                          <Building2 className="w-4 h-4 text-white shrink-0" />
                        ) : (
                          <Stethoscope className="w-4 h-4 text-white shrink-0" />
                        )}

                        {/* Mini Badge con número si hay más de 1 médico */}
                        {hasMultipleDoctors && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-white text-slate-950 text-[9px] font-black border border-slate-900 shadow-md">
                            {building.doctors.length}
                          </span>
                        )}
                      </div>

                      {/* Pico / Punta inferior que apunta exactamente al lugar */}
                      <div className="w-2.5 h-2.5 bg-slate-950 border-r-2 border-b-2 border-white rotate-45 -mt-1.5 shadow-md" />
                      {/* Sombra de punto de contacto */}
                      <div className="w-3 h-1 bg-black/60 rounded-full blur-[1px] mt-0.5" />
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
