import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { HubConnectionBuilder, HubConnection, LogLevel } from '@microsoft/signalr';
import { toast } from 'sonner';
import {
  fetchNotificaciones,
  marcarNotificacionLeida,
  crearNotificacion,
} from '@/services/notificaciones';
import type { NotificacionDto, CrearNotificacionRequest } from '@/types';

function useAuthToken() {
  const { data: session, status } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const userId = (session as any)?.user?.id || (session as any)?.user?.email;
  return { token, status, userId };
}

/**
 * Hook principal para obtener notificaciones con actualización en tiempo real mediante SignalR y polling.
 */
export function useNotificaciones(soloNoLeidas?: boolean) {
  const { token, status } = useAuthToken();
  const queryClient = useQueryClient();
  const hubConnectionRef = useRef<HubConnection | null>(null);

  const query = useQuery({
    queryKey: ['notificaciones', { soloNoLeidas: !!soloNoLeidas }],
    queryFn: () => fetchNotificaciones(token!, soloNoLeidas),
    enabled: status === 'authenticated' && !!token,
    refetchInterval: 15000, // Polling de respaldo cada 15s
    staleTime: 5000,
  });

  // Conexión en tiempo real con SignalR
  useEffect(() => {
    if (status !== 'authenticated' || !token) return;

    // Solo intentar conexión con Hub de SignalR si está habilitado por variable de entorno
    const enableSignalR = process.env.NEXT_PUBLIC_ENABLE_SIGNALR === 'true';
    if (!enableSignalR) return;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';
    const hubUrl = `${backendUrl}/hubs/notificaciones`;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount >= 3) return null; // Detener reintentos si el backend no tiene Hub
          return 5000;
        },
      })
      .configureLogging(LogLevel.None)
      .build();

    hubConnectionRef.current = connection;

    const handleNuevaNotificacion = (nueva: NotificacionDto) => {
      if (!nueva || !nueva.notCodigo) return;

      // Disparar toast en tiempo real con sonner
      toast(nueva.titulo || 'Nueva notificación', {
        description: nueva.mensaje,
        action: nueva.accionUrl
          ? {
              label: 'Ver detalles',
              onClick: () => {
                if (typeof window !== 'undefined') {
                  window.location.href = nueva.accionUrl!;
                }
              },
            }
          : undefined,
      });

      // Actualizar la caché local de React Query inmediatamente
      queryClient.setQueriesData<NotificacionDto[]>(
        { queryKey: ['notificaciones'] },
        (oldData) => {
          if (!oldData) return [nueva];
          const exists = oldData.some((item) => item.notCodigo === nueva.notCodigo);
          if (exists) return oldData;
          return [nueva, ...oldData];
        }
      );

      // Re-invalidar para asegurar consistencia
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
    };

    connection.on('RecibirNotificacion', handleNuevaNotificacion);
    connection.on('NuevaNotificacion', handleNuevaNotificacion);
    connection.on('NotificacionRecibida', handleNuevaNotificacion);

    // Conectar silenciosamente sin arrojar excepciones no controladas en la consola
    connection.start().catch(() => {
      // Si el Hub de SignalR no está respondiendo en el backend, la app continúa 100% funcional con polling HTTP
    });

    return () => {
      connection.off('RecibirNotificacion', handleNuevaNotificacion);
      connection.off('NuevaNotificacion', handleNuevaNotificacion);
      connection.off('NotificacionRecibida', handleNuevaNotificacion);
      connection.stop().catch(() => {});
      hubConnectionRef.current = null;
    };
  }, [token, status, queryClient]);

  const notificaciones = query.data ?? [];
  const unreadCount = notificaciones.filter((n) => !n.leida).length;

  return {
    ...query,
    notificaciones,
    unreadCount,
  };
}

/**
 * Hook para marcar una notificación como leída (PUT /api/Notificaciones/{notCodigo}/leer).
 */
export function useMarcarNotificacionLeida() {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notCodigo: string) => marcarNotificacionLeida(token!, notCodigo),
    onMutate: async (notCodigo) => {
      // Cancelar consultas salientes
      await queryClient.cancelQueries({ queryKey: ['notificaciones'] });

      // Guardar snapshot previo para rollback si falla
      const previousData = queryClient.getQueriesData<NotificacionDto[]>({ queryKey: ['notificaciones'] });

      // Actualización optimista del estado local
      queryClient.setQueriesData<NotificacionDto[]>(
        { queryKey: ['notificaciones'] },
        (old) => {
          if (!old) return [];
          return old.map((item) =>
            item.notCodigo === notCodigo ? { ...item, leida: true } : item
          );
        }
      );

      return { previousData };
    },
    onError: (_err, _notCodigo, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
    },
  });
}

/**
 * Hook para crear una notificación manualmente (POST /api/Notificaciones).
 */
export function useCrearNotificacion() {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CrearNotificacionRequest) => crearNotificacion(token!, payload),
    onSuccess: (res) => {
      toast.success(res?.mensaje || 'Notificación creada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al crear la notificación');
    },
  });
}
