'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { crearResena, fetchResenasMedico, actualizarResena, eliminarResena, type CrearResenaRequest } from '@/services/resenas';
import type { ResenaDto } from '@/types';

function useAuthInfo() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  return { token, isAuthenticated: !!token };
}

export function useResenasMedico(codDoc: string | null) {
  const { token } = useAuthInfo();

  return useQuery<ResenaDto[]>({
    queryKey: ['resenasMedico', codDoc],
    queryFn: () => fetchResenasMedico(codDoc!, token),
    enabled: !!codDoc,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCrearResena() {
  const { token } = useAuthInfo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CrearResenaRequest) => crearResena(token!, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resenasMedico', variables.codDoc] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctorByCode', variables.codDoc] });
      queryClient.invalidateQueries({ queryKey: ['lealtadEstado'] });
    },
  });
}

export function useActualizarResena() {
  const { token } = useAuthInfo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ resCodigo, payload }: { resCodigo: string; payload: Partial<CrearResenaRequest> }) =>
      actualizarResena(token!, resCodigo, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resenasMedico'] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
  });
}

export function useEliminarResena() {
  const { token } = useAuthInfo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resCodigo: string) => eliminarResena(token!, resCodigo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resenasMedico'] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
  });
}
