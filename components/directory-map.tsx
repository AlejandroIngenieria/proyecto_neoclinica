'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import {
  Star,
  MapPin,
  ExternalLink,
  Building2,
  Stethoscope,
  X,
  User,
  Navigation,
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
} from 'lucide-react';
import type { DoctorCardData } from './doctor-card';
import type { DoctorClinica } from '@/types';
import { getDoctorPriceDisplay, buildDoctorShortName } from '@/types/doctor';

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

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
  selectedClinicIndex?: number;
  radarRadiusKm?: number;
  userLocation?: { lat: number; lng: number } | null;
  searchedLocation?: { lat: number; lng: number; address: string } | null;
  isNearMeActive?: boolean;
  onDoctorHover: (expCodigo: string | null) => void;
  onDoctorSelect: (expCodigo: string, clinicIndex?: number) => void;
  onNavigateToProfile: (expCodigo: string) => void;
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
}: {
  userLocation?: { lat: number; lng: number } | null;
  isNearMeActive?: boolean;
  targetCoords?: { lat: number; lng: number } | null;
  defaultCenterCoords?: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  const lastCenteredNearMeRef = useRef<boolean>(false);
  const hasCenteredDefaultRef = useRef(false);

  // Centrado suave cuando se selecciona un médico o edificio específico
  useEffect(() => {
    if (!map || !targetCoords) return;

    map.panTo(targetCoords);
    map.setZoom(16);
  }, [map, targetCoords?.lat, targetCoords?.lng]);

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

    if (!hasCenteredDefaultRef.current && !targetCoords) {
      const target = defaultCenterCoords || GUATEMALA_CENTER;
      map.panTo(target);
      map.setZoom(14);
      hasCenteredDefaultRef.current = true;
    }
  }, [map, userLocation, isNearMeActive, targetCoords, defaultCenterCoords]);

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
}: DirectoryMapProps) {
  const router = useRouter();

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
          const zonaLabel = cli.cli_zona ? `Zona ${cli.cli_zona}` : 'Guatemala';
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
            const zona = cli.cli_zona?.toString() || '';
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

  // Edificio más cercano a la ubicación del usuario
  const closestBuilding = useMemo(() => {
    if (buildings.length === 0) return null;
    const refPoint = userLocation || GUATEMALA_CENTER;

    let minDistance = Infinity;
    let closest = buildings[0];

    for (const b of buildings) {
      const dist = Math.hypot(b.lat - refPoint.lat, b.lng - refPoint.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closest = b;
      }
    }
    return closest;
  }, [buildings, userLocation]);

  // Edificio activo o seleccionado
  const activeBuilding = useMemo(() => {
    return buildings.find((b) => b.id === activeBuildingId) || null;
  }, [buildings, activeBuildingId]);

  // Edificio asociado al doctor seleccionado en la lista lateral
  const selectedDoctorBuilding = useMemo(() => {
    if (!selectedDoctorId) return null;
    return (
      buildings.find((b) =>
        b.doctors.some(
          (d) => d.expCodigo === selectedDoctorId && d.clinicIndex === selectedClinicIndex
        )
      ) ||
      buildings.find((b) => b.doctors.some((d) => d.expCodigo === selectedDoctorId)) ||
      null
    );
  }, [selectedDoctorId, selectedClinicIndex, buildings]);

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

  // Sincronización: Al seleccionar un doctor en la lista lateral, abrir el edificio y posicionar el carrusel en ese doctor
  useEffect(() => {
    if (selectedDoctorId && selectedDoctorBuilding) {
      setActiveBuildingId(selectedDoctorBuilding.id);

      const docIndexInBuilding = selectedDoctorBuilding.doctors.findIndex(
        (d) => d.expCodigo === selectedDoctorId && d.clinicIndex === selectedClinicIndex
      );
      setCarouselDoctorIndex(docIndexInBuilding >= 0 ? docIndexInBuilding : 0);
    } else if (!selectedDoctorId) {
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

  // Doctor actualmente enfocado en el carrusel del pop-up del edificio
  const currentCarouselDoctor = useMemo(() => {
    if (!activeBuilding || activeBuilding.doctors.length === 0) return null;
    const safeIndex = Math.min(
      Math.max(0, carouselDoctorIndex),
      activeBuilding.doctors.length - 1
    );
    return activeBuilding.doctors[safeIndex];
  }, [activeBuilding, carouselDoctorIndex]);

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
            defaultCenterCoords={
              closestBuilding
                ? { lat: closestBuilding.lat, lng: closestBuilding.lng }
                : null
            }
          />

          {/* 🎯 Círculo de Radar Ajustable para "Cerca de ti" */}
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

          {/* 📍 Marcador de Ubicación del Usuario */}
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

          {/* 📍 Marcador y Círculo de Radar para Ubicación Buscada */}
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

          {/* 🏥 PINES CONSOLIDADOS POR EDIFICIO / HOSPITAL (2 Estados con Pico de Ubicación) */}
          {buildings.map((building) => {
            const hasMultipleDoctors = building.doctors.length > 1;
            
            // Prioridad 1: Hover directo del mouse sobre ESTE pin del mapa
            const isThisBuildingHovered = hoveredBuildingId === building.id;

            // Prioridad 2: Edificio actualmente seleccionado (si no se está haciendo hover en otro pin)
            const isThisBuildingActive =
              !hoveredBuildingId && activeBuildingId === building.id && !!selectedDoctorId;

            // Prioridad 3: Hover desde la tarjeta del médico en la lista lateral (si no hay hover en el mapa ni médico seleccionado)
            const isDoctorFromListHovered =
              !hoveredBuildingId &&
              !selectedDoctorId &&
              !!hoveredDoctorId &&
              building.doctors.some(
                (d) => d.expCodigo === hoveredDoctorId && d.clinicIndex === selectedClinicIndex
              );

            const isHighlighted = isThisBuildingHovered || isThisBuildingActive || isDoctorFromListHovered;

            return (
              <AdvancedMarker
                key={building.id}
                position={{ lat: building.lat, lng: building.lng }}
                onClick={() => {
                  if (activeBuildingId === building.id && selectedDoctorId) {
                    setActiveBuildingId(null);
                    onDoctorSelect('', 0);
                  } else {
                    setActiveBuildingId(building.id);
                    setCarouselDoctorIndex(0);
                    if (building.doctors.length > 0) {
                      onDoctorSelect(building.doctors[0].expCodigo, building.doctors[0].clinicIndex);
                    }
                  }
                }}
                onMouseEnter={() => setHoveredBuildingId(building.id)}
                onMouseLeave={() => setHoveredBuildingId((prev) => (prev === building.id ? null : prev))}
                zIndex={isHighlighted ? 9999 : 3000}
              >
                <div className="relative flex flex-col items-center select-none group cursor-pointer -translate-y-full pb-1 pointer-events-auto">
                  {isHighlighted ? (
                    /* ─── ESTADO 1: SELECCIONADO / HOVER (Información Completa + Pico) ─── */
                    <div className="flex flex-col items-center transition-all duration-200 animate-in zoom-in-95 duration-200">
                      <div className="px-3.5 py-1.5 rounded-2xl font-black text-xs shadow-2xl border-2 transition-all whitespace-nowrap flex items-center gap-2.5 bg-slate-950 text-white border-sky-400 ring-4 ring-sky-400/40">
                        <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-400/30">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="max-w-[180px] truncate text-xs font-extrabold leading-tight text-white">
                            {building.name}
                          </span>
                          <span className="text-[10px] text-sky-300 font-bold">
                            {hasMultipleDoctors
                              ? `${building.doctors.length} especialistas`
                              : (building.doctors[0] ? buildDoctorShortName(building.doctors[0].doctorData.doctor) : null) || 'Especialista'}
                          </span>
                        </div>
                        {hasMultipleDoctors && (
                          <span className="flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-sky-500 text-white text-[10px] font-black shadow-inner ml-0.5">
                            {building.doctors.length}
                          </span>
                        )}
                      </div>

                      {/* Pico / Punta inferior que apunta al suelo */}
                      <div className="w-3.5 h-3.5 bg-slate-950 border-r-2 border-b-2 border-sky-400 rotate-45 -mt-2 shadow-xs" />
                      {/* Sombra de punto de contacto */}
                      <div className="w-3.5 h-1 bg-slate-950/40 rounded-full blur-[1px] mt-0.5" />
                    </div>
                  ) : (
                    /* ─── ESTADO 2: NO SELECCIONADO / REPOSO (Solo Icono + Pico + Mini Badge) ─── */
                    <div className="flex flex-col items-center transition-transform duration-200 hover:scale-125">
                      <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-sky-600 dark:bg-sky-500 text-white shadow-lg border-2 border-white dark:border-slate-800">
                        {hasMultipleDoctors ? (
                          <Building2 className="w-4 h-4 text-white" />
                        ) : (
                          <Stethoscope className="w-4 h-4 text-white" />
                        )}

                        {/* Mini Badge con número si hay más de 1 médico */}
                        {hasMultipleDoctors && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-slate-950 text-sky-300 text-[9px] font-black border border-white dark:border-slate-700 shadow-md">
                            {building.doctors.length}
                          </span>
                        )}
                      </div>

                      {/* Pico / Punta inferior que apunta exactamente al lugar */}
                      <div className="w-2.5 h-2.5 bg-sky-600 dark:bg-sky-500 border-r border-b border-white dark:border-slate-800 rotate-45 -mt-1.5 shadow-xs" />
                      {/* Sombra de punto de contacto */}
                      <div className="w-2 h-0.5 bg-slate-900/30 rounded-full blur-[0.5px] mt-0.5" />
                    </div>
                  )}
                </div>
              </AdvancedMarker>
            );
          })}
        </GoogleMap>

        {/* 🪟 POP-UP / TARJETA FLOTANTE CON CARRUSEL DE MÉDICOS DEL EDIFICIO */}
        {activeBuilding && currentCarouselDoctor && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:w-[360px] z-[9999] bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-2xl border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Cabecera del Edificio / Hospital */}
            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 text-xs font-black uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{currentCarouselDoctor.clinic.cli_descripcion || activeBuilding.name}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  {currentCarouselDoctor.clinic.cli_direccion_completa || activeBuilding.address}
                </p>
              </div>

              {/* Botón Cerrar Pop-up */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveBuildingId(null);
                  onDoctorSelect('', 0);
                }}
                className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shrink-0"
                aria-label="Cerrar ventana"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido del Médico Actual en el Carrusel */}
            <div className="pt-3 space-y-3">
              {/* Navegación del Carrusel (Si hay más de 1 médico en la sede) */}
              {activeBuilding.doctors.length > 1 && (
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                    <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>
                      Médico {carouselDoctorIndex + 1} de {activeBuilding.doctors.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevDoctor}
                      className="p-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-sky-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition cursor-pointer shadow-2xs"
                      aria-label="Médico anterior"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextDoctor}
                      className="p-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-sky-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition cursor-pointer shadow-2xs"
                      aria-label="Médico siguiente"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Tarjeta del Médico Seleccionado */}
              <div
                onClick={() => onDoctorSelect(currentCarouselDoctor.expCodigo, currentCarouselDoctor.clinicIndex)}
                className="flex gap-3 items-center p-2 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                {/* Foto de Perfil */}
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 border border-slate-300 dark:border-slate-600 shadow-sm">
                  {currentCarouselDoctor.doctorData.doctor.exp_foto_perfil ? (
                    <Image
                      src={currentCarouselDoctor.doctorData.doctor.exp_foto_perfil}
                      alt={buildDoctorShortName(currentCarouselDoctor.doctorData.doctor) || currentCarouselDoctor.doctorData.fullName}
                      fill
                      className="object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-black text-xl text-slate-500">
                      {(buildDoctorShortName(currentCarouselDoctor.doctorData.doctor) || currentCarouselDoctor.doctorData.fullName).charAt(0)}
                    </div>
                  )}
                </div>

                {/* Datos del Doctor */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                      {buildDoctorShortName(currentCarouselDoctor.doctorData.doctor) || currentCarouselDoctor.doctorData.fullName}
                    </h4>
                    {currentCarouselDoctor.doctorData.doctor.promedio_valoracion > 0 && (
                      <div className="flex items-center gap-0.5 text-[11px] font-black text-amber-500 shrink-0">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>
                          {currentCarouselDoctor.doctorData.doctor.promedio_valoracion.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                    {currentCarouselDoctor.doctorData.specialtyPreview[0] || 'Especialidad Médica'}
                  </p>

                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {currentCarouselDoctor.priceLabel === 'Por definir'
                        ? 'Precio en consulta'
                        : `Consulta ${currentCarouselDoctor.priceLabel}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Carrusel de Miniaturas Rápidas (Si hay más de 2 médicos) */}
              {activeBuilding.doctors.length > 2 && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 scrollbar-none">
                  {activeBuilding.doctors.map((docItem, idx) => {
                    const isSelectedDoc = idx === carouselDoctorIndex;
                    return (
                      <button
                        key={`${docItem.expCodigo}-${idx}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCarouselDoctorIndex(idx);
                          onDoctorSelect(docItem.expCodigo, docItem.clinicIndex);
                        }}
                        className={`relative w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                          isSelectedDoc
                            ? 'border-sky-500 ring-2 ring-sky-400/50 scale-110'
                            : 'border-slate-300 dark:border-slate-700 opacity-60 hover:opacity-100'
                        }`}
                        title={buildDoctorShortName(docItem.doctorData.doctor) || docItem.doctorData.fullName}
                      >
                        {docItem.doctorData.doctor.exp_foto_perfil ? (
                          <Image
                            src={docItem.doctorData.doctor.exp_foto_perfil}
                            alt={buildDoctorShortName(docItem.doctorData.doctor) || docItem.doctorData.fullName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-200 dark:bg-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-300">
                            {(buildDoctorShortName(docItem.doctorData.doctor) || docItem.doctorData.fullName).charAt(0)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Botones de Acción: Agendar Cita (Principal) + Ver Perfil + Google Maps */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/agendar/${currentCarouselDoctor.expCodigo}`);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-extrabold text-xs shadow-md shadow-sky-500/20 hover:shadow-lg transition-all active:scale-98 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Agendar Cita</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToProfile(currentCarouselDoctor.expCodigo);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200/80 dark:border-slate-700 transition-all active:scale-98 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    <span>Ver Perfil</span>
                  </button>

                  <a
                    href={currentCarouselDoctor.clinic.cli_url_google_maps || activeBuilding.directMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200/80 dark:border-slate-700 transition-all active:scale-98"
                  >
                    <Navigation className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>Cómo Llegar</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </APIProvider>
    </div>
  );
}
