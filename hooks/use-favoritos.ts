'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import { fetchFavoritos, addFavorito, removeFavorito } from '@/services/favoritos';
import type { MedicoFavorito } from '@/types/doctor';

type SessionWithAccess = {
  accessToken?: string;
  userId?: string;
};

function useAuthInfo() {
  const { data: session, status } = useSession();
  const typed = session as SessionWithAccess | null;
  const token = typed?.accessToken;
  const userId = typed?.userId;

  return { token, userId, status, session };
}

/**
 * Obtiene la lista de médicos favoritos del paciente.
 */
export function useFavoritos(codPac?: string) {
  const { token, status } = useAuthInfo();

  return useQuery<MedicoFavorito[]>({
    queryKey: ['favoritos', codPac],
    queryFn: () => fetchFavoritos(token!, codPac!),
    enabled: status === 'authenticated' && !!token && !!codPac,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Agrega un médico a la lista de favoritos.
 */
export function useAddFavorito() {
  const { token } = useAuthInfo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ codPac, codDoc }: { codPac: string; codDoc: string }) =>
      addFavorito(token!, codPac, codDoc),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['favoritos', variables.codPac] });
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Agregado a favoritos',
        showConfirmButton: false,
        timer: 3000,
      });
    },
    onError: (error: any) => {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: error.message || 'Error al agregar a favoritos',
        showConfirmButton: false,
        timer: 3000,
      });
    },
  });
}

/**
 * Elimina un médico de la lista de favoritos.
 */
export function useRemoveFavorito() {
  const { token } = useAuthInfo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ codPac, codDoc }: { codPac: string; codDoc: string }) =>
      removeFavorito(token!, codPac, codDoc),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['favoritos', variables.codPac] });
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Eliminado de favoritos',
        showConfirmButton: false,
        timer: 3000,
      });
    },
    onError: (error: any) => {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: error.message || 'Error al eliminar de favoritos',
        showConfirmButton: false,
        timer: 3000,
      });
    },
  });
}
