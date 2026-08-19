'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Star, MapPin, ExternalLink, Building2, Stethoscope, X, User, Navigation } from 'lucide-react';
import type { DoctorCardData } from './doctor-card';
import { getDoctorPriceDisplay } from '@/types/doctor';

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

type ClinicLocationMarker = {
  id: string;
  expCodigo: string;
  doctorData: DoctorCardData;
  lat: number;
  lng: number;
  priceLabel: string;
  clinicName: string;
  zonaLabel: string;
  isPrimary: boolean;
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
  onDoctorSelect: (expCodigo: string) => void;
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
  selectedDoctorId,
  selectedClinicCoords,
  activeCoords,
  defaultCenterCoords,
}: {
  userLocation?: { lat: number; lng: number } | null;
  isNearMeActive?: boolean;
  selectedDoctorId?: string | null;
  selectedClinicCoords?: { lat: number; lng: number } | null;
  activeCoords?: { lat: number; lng: number }[];
  defaultCenterCoords?: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  const lastCenteredDoctorRef = useRef<string | null>(null);
  const lastCenteredNearMeRef = useRef<boolean>(false);
  const hasCenteredDefaultRef = useRef(false);

  // 1. Enfoque cercano a la clínica seleccionada cuando se elige un médico o cambia de sede
  useEffect(() => {
    if (!map) return;

    if (selectedClinicCoords) {
      map.panTo(selectedClinicCoords);
      map.setZoom(15);
      lastCenteredDoctorRef.current = selectedDoctorId || null;
    } else if (selectedDoctorId && activeCoords && activeCoords.length > 0) {
      map.panTo(activeCoords[0]);
      map.setZoom(15);
      lastCenteredDoctorRef.current = selectedDoctorId;
    }
  }, [map, selectedClinicCoords?.lat, selectedClinicCoords?.lng, selectedDoctorId, activeCoords]);

  // 2. Manejo de "Cerca de ti" y centrado inicial dentro de Ciudad de Guatemala
  useEffect(() => {
    if (!map) return;

    // Si se activa "Cerca de ti"
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

    // Centrado inicial por defecto en Guatemala Ciudad con zoom cercano
    if (!hasCenteredDefaultRef.current && !selectedDoctorId) {
      const target = defaultCenterCoords || GUATEMALA_CENTER;
      map.panTo(target);
      map.setZoom(14);
      hasCenteredDefaultRef.current = true;
    }
  }, [map, userLocation, isNearMeActive, selectedDoctorId, defaultCenterCoords]);

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
  // Estado para el marcador clickeado cuyo contenido se muestra ABAJO del puntero
  const [clickedMarkerId, setClickedMarkerId] = useState<string | null>(null);

  // Construir todos los marcadores de clínicas
  const allClinicMarkers = useMemo<ClinicLocationMarker[]>(() => {
    const list: ClinicLocationMarker[] = [];

    doctors.forEach((docData, docIdx) => {
      const doc = docData.doctor;

      const priceInfo = getDoctorPriceDisplay(doc);
      const priceLabel = priceInfo.hasPrice ? `Q${priceInfo.price}` : 'Por definir';

      if (doc.clinicas && doc.clinicas.length > 0) {
        doc.clinicas.forEach((cli, cliIdx) => {
          let lat: number | null = null;
          let lng: number | null = null;
          const clinicName = cli.cli_descripcion || cli.cli_direccion_completa || `Clínica ${cliIdx + 1}`;
          const zonaLabel = cli.cli_zona ? `Zona ${cli.cli_zona}` : 'Guatemala';

          if (typeof cli.cli_latitud === 'number' && typeof cli.cli_longitud === 'number' && !isNaN(cli.cli_latitud) && !isNaN(cli.cli_longitud)) {
            lat = cli.cli_latitud;
            lng = cli.cli_longitud;
          } else {
            const zona = cli.cli_zona?.toString() || '';
            const baseCoords = ZONA_OFFSETS[zona] || GUATEMALA_CENTER;
            const hash = (docIdx * 5 + cliIdx) * 0.003;
            lat = baseCoords.lat + Math.sin(hash) * 0.012;
            lng = baseCoords.lng + Math.cos(hash) * 0.012;
          }

          list.push({
            id: `${doc.exp_codigo}-cli-${cliIdx}`,
            expCodigo: doc.exp_codigo,
            doctorData: docData,
            lat,
            lng,
            priceLabel,
            clinicName,
            zonaLabel,
            isPrimary: cliIdx === 0,
          });
        });
      } else {
        const hash = docIdx * 0.0035;
        const lat = GUATEMALA_CENTER.lat + Math.sin(hash) * 0.012;
        const lng = GUATEMALA_CENTER.lng + Math.cos(hash) * 0.012;

        list.push({
          id: `${doc.exp_codigo}-cli-0`,
          expCodigo: doc.exp_codigo,
          doctorData: docData,
          lat,
          lng,
          priceLabel,
          clinicName: 'Clínica Principal',
          zonaLabel: 'Guatemala',
          isPrimary: true,
        });
      }
    });

    return list;
  }, [doctors]);

  // Clínica MÁS CERCANA a la ubicación del usuario
  const closestMarker = useMemo(() => {
    if (allClinicMarkers.length === 0) return null;
    const refPoint = userLocation || GUATEMALA_CENTER;

    let minDistance = Infinity;
    let closest = allClinicMarkers[0];

    for (const m of allClinicMarkers) {
      const dist = Math.hypot(m.lat - refPoint.lat, m.lng - refPoint.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closest = m;
      }
    }
    return closest;
  }, [allClinicMarkers, userLocation]);

  // Coordenadas de la clínica seleccionada del doctor activo
  const selectedClinicCoords = useMemo(() => {
    if (!selectedDoctorId) return null;
    const marker = allClinicMarkers.find((m) => m.id === `${selectedDoctorId}-cli-${selectedClinicIndex}`);
    if (marker) return { lat: marker.lat, lng: marker.lng };
    return null;
  }, [selectedDoctorId, selectedClinicIndex, allClinicMarkers]);

  // Al seleccionar un doctor específico, sincronizar el marcador clickeado
  useEffect(() => {
    if (selectedDoctorId) {
      const specificClinic = allClinicMarkers.find((m) => m.id === `${selectedDoctorId}-cli-${selectedClinicIndex}`) ||
        allClinicMarkers.find((m) => m.expCodigo === selectedDoctorId && m.isPrimary) ||
        allClinicMarkers.find((m) => m.expCodigo === selectedDoctorId);
      if (specificClinic) {
        setClickedMarkerId(specificClinic.id);
      }
    } else {
      setClickedMarkerId(null);
    }
  }, [selectedDoctorId, selectedClinicIndex, allClinicMarkers]);

  // ID del doctor actualmente enfocado
  const activeDoctorId = hoveredDoctorId || selectedDoctorId;

  // Filtrar marcadores para el doctor enfocado
  const activeDoctorClinics = useMemo(() => {
    if (!activeDoctorId) return [];
    return allClinicMarkers.filter((m) => m.expCodigo === activeDoctorId);
  }, [allClinicMarkers, activeDoctorId]);

  const activeCoords = useMemo(() => {
    return activeDoctorClinics.map((c) => ({ lat: c.lat, lng: c.lng }));
  }, [activeDoctorClinics]);

  const radarRadiusMeters = (radarRadiusKm || 10) * 1000;

  if (!MAPS_API_KEY) {
    return (
      <div className="w-full h-full min-h-[400px] rounded-3xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-6 text-center">
        <MapPin className="w-10 h-10 text-sky-500 mb-2" />
        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Mapa interactivo de clínicas</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
          Visualiza la ubicación de los médicos en tiempo real.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[500px] rounded-3xl overflow-hidden shadow-lg border border-slate-200/80 dark:border-slate-800 relative z-10">
      <APIProvider apiKey={MAPS_API_KEY} libraries={['places', 'marker']}>
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={selectedClinicCoords || activeCoords[0] || (closestMarker ? { lat: closestMarker.lat, lng: closestMarker.lng } : GUATEMALA_CENTER)}
          defaultZoom={14}
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="w-full h-full min-h-[500px]"
        >
          <MapController
            userLocation={userLocation}
            isNearMeActive={isNearMeActive}
            selectedDoctorId={selectedDoctorId}
            selectedClinicCoords={selectedClinicCoords}
            activeCoords={activeCoords.length > 0 ? activeCoords : undefined}
            defaultCenterCoords={closestMarker ? { lat: closestMarker.lat, lng: closestMarker.lng } : null}
          />

          {/* 🎯 Círculo de Radar Ajustable en Km para "Cerca de ti" */}
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

          {/* 📍 Marcador de Ubicación del Usuario ("Tu Ubicación Actual") */}
          {userLocation && (
            <AdvancedMarker position={userLocation} zIndex={1000}>
              <div className="relative flex items-center justify-center group cursor-pointer">
                {isNearMeActive && (
                  <div className="absolute -inset-3 rounded-full bg-sky-400/30 animate-ping pointer-events-none" />
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white font-extrabold text-xs shadow-2xl border-2 border-sky-400">
                  <Navigation className="w-3.5 h-3.5 fill-sky-400 text-sky-400" />
                  <span>Tu ubicación {isNearMeActive ? `· Radar ${radarRadiusKm} km` : ''}</span>
                </div>
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
              <AdvancedMarker position={{ lat: searchedLocation.lat, lng: searchedLocation.lng }} zIndex={1005}>
                <div className="relative flex items-center justify-center group cursor-pointer">
                  <div className="absolute -inset-3 rounded-full bg-sky-500/25 animate-ping pointer-events-none" />
                  <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-600 text-white font-black text-xs shadow-2xl border-2 border-white">
                    <MapPin className="w-4 h-4 fill-white text-white shrink-0" />
                    <span className="max-w-[170px] truncate">{searchedLocation.address} · Radar {radarRadiusKm} km</span>
                  </div>
                </div>
              </AdvancedMarker>
            </>
          )}

          {/* 🏥 Marcadores de Punteros Limpios */}
          {allClinicMarkers.map((marker) => {
            const isDoctorActive = activeDoctorId === marker.expCodigo;
            const isCardOpen = clickedMarkerId === marker.id;

            if (!marker.isPrimary && !isDoctorActive) {
              return null;
            }

            const doc = marker.doctorData.doctor;
            const mapsDirectUrl = `https://www.google.com/maps/dir/?api=1&destination=${marker.lat},${marker.lng}`;

            return (
              <AdvancedMarker
                key={marker.id}
                position={{ lat: marker.lat, lng: marker.lng }}
                onClick={() => {
                  onDoctorSelect(marker.expCodigo);
                  setClickedMarkerId((prev) => (prev === marker.id ? null : marker.id));
                }}
                zIndex={isCardOpen ? 9999 : isDoctorActive ? 4000 : 3000}
              >
                <div className="relative flex flex-col items-center select-none">
                  {/* Puntero del Médico */}
                  <div
                    onMouseEnter={() => onDoctorHover(marker.expCodigo)}
                    onMouseLeave={() => onDoctorHover(null)}
                    className={`transition-all duration-200 transform cursor-pointer flex items-center justify-center ${
                      isCardOpen || isDoctorActive
                        ? 'scale-110 -translate-y-1'
                        : 'scale-100 hover:scale-105'
                    }`}
                  >
                    {isCardOpen || isDoctorActive ? (
                      <div className="px-4 py-2 rounded-full font-black text-xs shadow-xl border-2 transition-all duration-200 whitespace-nowrap flex items-center gap-2 bg-slate-900 text-white border-white ring-4 ring-sky-400/40">
                        <Stethoscope className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="max-w-[190px] truncate">{marker.doctorData.fullName}</span>
                        <span className="bg-sky-500/30 text-sky-200 px-2 py-0.5 rounded-md text-[10px] truncate max-w-[110px]">
                          {marker.clinicName}
                        </span>
                      </div>
                    ) : (
                      <div className="px-3.5 py-1.5 rounded-full font-bold text-xs shadow-md border transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 bg-white text-slate-800 border-slate-200/90 hover:bg-slate-900 hover:text-white hover:border-slate-900">
                        <Stethoscope className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="max-w-[170px] truncate">{marker.doctorData.fullName}</span>
                      </div>
                    )}
                  </div>

                  {/* 🪟 Tarjeta Informativa Desplegada al hacer CLICK */}
                  {isCardOpen && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToProfile(marker.expCodigo);
                      }}
                      className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-68 bg-white rounded-2xl p-3.5 shadow-2xl border border-slate-200/90 z-[9999] text-slate-900 cursor-pointer animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                      {/* Flechita apuntando hacia arriba al puntero */}
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-t border-l border-slate-200 shadow-xs" />

                      {/* Botón para cerrar la tarjeta */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setClickedMarkerId(null);
                        }}
                        className="absolute top-2 right-2 z-20 p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
                        aria-label="Cerrar tarjeta"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* Contenido de la Tarjeta Informativa */}
                      <div className="relative z-10 space-y-2.5">
                        <div className="relative w-full h-28 rounded-xl overflow-hidden bg-slate-100">
                          {doc.exp_foto_perfil ? (
                            <Image
                              src={doc.exp_foto_perfil}
                              alt={marker.doctorData.fullName}
                              fill
                              className="object-cover object-top hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center font-black text-2xl text-slate-400">
                              {marker.doctorData.fullName.charAt(0)}
                            </div>
                          )}
                          <span className="absolute bottom-2 left-2 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                            {marker.priceLabel === 'Por definir' ? 'Clínica sin precio establecido' : `Desde ${marker.priceLabel}`}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1 pr-5">
                            <h4 className="font-bold text-sm text-slate-900 truncate leading-snug hover:text-sky-600 transition-colors">
                              {marker.doctorData.fullName}
                            </h4>
                            {doc.promedio_valoracion > 0 && (
                              <div className="flex items-center gap-0.5 text-xs font-bold text-slate-900 shrink-0">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span>{doc.promedio_valoracion.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-medium truncate">
                            {marker.doctorData.specialtyPreview[0] || 'Especialidad'}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-1 rounded-lg truncate">
                            <Building2 className="w-3 h-3 shrink-0 text-sky-600" />
                            <span className="truncate">{marker.clinicName} ({marker.zonaLabel})</span>
                          </div>

                          {/* Botones de Acción: Ver Perfil + Google Maps */}
                          <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToProfile(marker.expCodigo);
                              }}
                              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all active:scale-98 cursor-pointer"
                            >
                              <User className="w-3.5 h-3.5" />
                              <span>Ver Perfil</span>
                            </button>

                            <a
                              href={mapsDirectUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition-all active:scale-98"
                            >
                              <Navigation className="w-3.5 h-3.5 fill-white text-white" />
                              <span>Maps</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </AdvancedMarker>
            );
          })}
        </Map>
      </APIProvider>
    </div>
  );
}
