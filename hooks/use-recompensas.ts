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

import { toast } from 'sonner';
import { crearNotificacion } from '@/services/notificaciones';

function useAuthToken() {
  const { data: session, status } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const userId = (session as any)?.userId || (session as any)?.user?.id || (session as any)?.user?.email;
  return { token, userId, status };
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
  const { token, userId } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CanjearRecompensaPayload & { nombreRecompensa?: string; costoPuntos?: number }) =>
      canjearRecompensa(pacCodigo!, payload, token),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recompensas', 'puntos', pacCodigo] });
      queryClient.invalidateQueries({ queryKey: ['recompensas', 'disponibles', pacCodigo] });
      queryClient.invalidateQueries({ queryKey: ['recompensas', 'historial', pacCodigo] });
      queryClient.invalidateQueries({ queryKey: ['lealtad', 'estado'] });

      const nombre = variables.nombreRecompensa ? ` "${variables.nombreRecompensa}"` : '';
      const puntos = variables.costoPuntos ? ` por ${variables.costoPuntos} puntos` : '';

      toast.success('¡Recompensa canjeada con éxito!');

      if (token) {
        crearNotificacion(token, {
          usuarioId: userId || pacCodigo || '',
          usuarioTipo: 'paciente',
          tipo: 'recordatorio',
          titulo: 'Recompensa Canjeada',
          mensaje: `Has canjeado exitosamente la recompensa${nombre}${puntos}. ¡Disfruta tu beneficio!`,
          accionUrl: '/dashboard/premios',
        }).catch(() => {});
      }
    },
  });
}

/**
 * Hook Mutation para Vincular Código de Referido
 */
export function useVincularReferido(pacCodigo?: string) {
  const { token, userId } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AsignarReferidoPayload) =>
      vincularCodigoReferido(pacCodigo!, payload, token),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recompensas', 'puntos', pacCodigo] });
      queryClient.invalidateQueries({ queryKey: ['recompensas', 'historial', pacCodigo] });
      queryClient.invalidateQueries({ queryKey: ['lealtad', 'estado'] });

      toast.success('Código de referido vinculado');

      if (token) {
        crearNotificacion(token, {
          usuarioId: userId || pacCodigo || '',
          usuarioTipo: 'paciente',
          tipo: 'sistema',
          titulo: 'Código Referido Vinculado',
          mensaje: `Has vinculado exitosamente el código de referido (${variables.codigoReferencia}). ¡Has ganado puntos de lealtad adicionales!`,
          accionUrl: '/dashboard/premios',
        }).catch(() => {});
      }
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
