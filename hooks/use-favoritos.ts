'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { fetchFavoritos, addFavorito, removeFavorito } from '@/services/favoritos';
import { crearNotificacion } from '@/services/notificaciones';
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
  const { token, userId } = useAuthInfo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ codPac, codDoc }: { codPac: string; codDoc: string }) =>
      addFavorito(token!, codPac, codDoc),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['favoritos', variables.codPac] });
      toast.success('Médico agregado a tus favoritos');

      if (token) {
        crearNotificacion(token, {
          usuarioId: userId || variables.codPac,
          usuarioTipo: 'paciente',
          tipo: 'sistema',
          titulo: 'Favorito Guardado',
          mensaje: 'Has agregado un nuevo especialista a tu lista de médicos favoritos.',
          accionUrl: '/dashboard/directorio',
        }).catch(() => {});
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al agregar a favoritos');
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
      toast.info('Médico eliminado de tus favoritos');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar de favoritos');
    },
  });
}
