'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { fetchDoctors, fetchDoctorByCode } from '@/services/expedientes';
import type { DoctorResponse } from '@/types';

type SessionWithAccess = {
  accessToken?: string;
};

/**
 * Hook para obtener la lista completa de doctores.
 *
 * - Cache automático (staleTime: 5 min)
 * - Refetch en background al volver a la pestaña
 * - No fetcha hasta que haya token de sesión
 */
export function useDoctors() {
  const { data: session, status } = useSession();
  const token = (session as SessionWithAccess | null)?.accessToken;

  return useQuery<DoctorResponse[]>({
    queryKey: ['doctors'],
    queryFn: () => fetchDoctors(token!),
    enabled: status === 'authenticated' && !!token,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para obtener un doctor por su código de expediente.
 *
 * - Se inicializa desde el cache de la lista si ya existe
 * - Cache individual por código
 */
export function useDoctorByCode(expCodigo: string) {
  const { data: session, status } = useSession();
  const token = (session as SessionWithAccess | null)?.accessToken;

  return useQuery<DoctorResponse>({
    queryKey: ['doctor', expCodigo],
    queryFn: () => fetchDoctorByCode(token!, expCodigo),
    enabled: status === 'authenticated' && !!token && !!expCodigo,
    staleTime: 5 * 60 * 1000,
  });
}
