import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  fetchCatalogoRecompensas,
  fetchRecompensasDisponibles,
  fetchTotalPuntos,
  canjearRecompensa,
  vincularCodigoReferido,
  fetchHistorialPuntos,
} from '@/services/recompensas';
import type { CanjearRecompensaPayload, AsignarReferidoPayload } from '@/types/recompensas';

function useAuthToken() {
  const { data: session, status } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  return { token, status };
}

/**
 * Obtener Catálogo de Recompensas
 */
export function useCatalogoRecompensas() {
  const { token, status } = useAuthToken();

  return useQuery({
    queryKey: ['recompensas', 'catalogo', token],
    queryFn: () => fetchCatalogoRecompensas(token),
    enabled: status === 'authenticated' && !!token,
  });
}

/**
 * Obtener Recompensas Disponibles del Paciente
 */
export function useRecompensasDisponibles(pacCodigo?: string) {
  const { token, status } = useAuthToken();

  return useQuery({
    queryKey: ['recompensas', 'disponibles', pacCodigo, token],
    queryFn: () => fetchRecompensasDisponibles(pacCodigo!, token),
    enabled: status === 'authenticated' && !!pacCodigo && !!token,
  });
}

/**
 * Obtener Total de Puntos
 */
export function useTotalPuntos(pacCodigo?: string) {
  const { token, status } = useAuthToken();

  return useQuery({
    queryKey: ['recompensas', 'puntos', pacCodigo, token],
    queryFn: () => fetchTotalPuntos(pacCodigo!, token),
    enabled: status === 'authenticated' && !!pacCodigo && !!token,
  });
}

/**
 * Hook Mutation para Canjear Recompensa
 */
export function useCanjearRecompensa(pacCodigo?: string) {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CanjearRecompensaPayload) =>
      canjearRecompensa(pacCodigo!, payload, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recompensas', 'puntos', pacCodigo] });
      queryClient.invalidateQueries({ queryKey: ['recompensas', 'disponibles', pacCodigo] });
      queryClient.invalidateQueries({ queryKey: ['recompensas', 'historial', pacCodigo] });
      queryClient.invalidateQueries({ queryKey: ['lealtad', 'estado'] });
    },
  });
}

/**
 * Hook Mutation para Vincular Código de Referido
 */
export function useVincularReferido(pacCodigo?: string) {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AsignarReferidoPayload) =>
      vincularCodigoReferido(pacCodigo!, payload, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recompensas', 'puntos', pacCodigo] });
      queryClient.invalidateQueries({ queryKey: ['recompensas', 'historial', pacCodigo] });
      queryClient.invalidateQueries({ queryKey: ['lealtad', 'estado'] });
    },
  });
}

/**
 * Obtener Historial de Movimientos de Puntos
 */
export function useHistorialPuntos(pacCodigo?: string) {
  const { token, status } = useAuthToken();

  return useQuery({
    queryKey: ['recompensas', 'historial', pacCodigo, token],
    queryFn: () => fetchHistorialPuntos(pacCodigo!, token),
    enabled: status === 'authenticated' && !!pacCodigo && !!token,
  });
}
