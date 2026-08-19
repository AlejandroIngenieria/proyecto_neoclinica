'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DoctorClinica } from '@/types/doctor';

export type UserLocation = {
  lat: number;
  lng: number;
};

function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocalización no soportada');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn('Location permission denied or unavailable:', err.message);
        setError(err.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 min cache
      }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const getDistanceToDoctor = useCallback(
    (clinicas: DoctorClinica[]): { distanceKm: number | null; formatted: string | null } => {
      if (!location || !clinicas || clinicas.length === 0) {
        return { distanceKm: null, formatted: null };
      }

      let minDistance = Infinity;

      for (const c of clinicas) {
        if (typeof c.cli_latitud === 'number' && typeof c.cli_longitud === 'number' && !isNaN(c.cli_latitud) && !isNaN(c.cli_longitud)) {
          const dist = calculateHaversineDistanceKm(location.lat, location.lng, c.cli_latitud, c.cli_longitud);
          if (dist < minDistance) {
            minDistance = dist;
          }
        }
      }

      if (minDistance === Infinity) {
        return { distanceKm: null, formatted: null };
      }

      const formatted = minDistance < 1
        ? `A ${Math.round(minDistance * 1000)} m`
        : `A ${minDistance.toFixed(1)} km`;

      return { distanceKm: minDistance, formatted };
    },
    [location]
  );

  return {
    location,
    loading,
    error,
    requestLocation,
    getDistanceToDoctor,
  };
}
