import { expedientesApi, getAuthHeaders } from '@/lib/api-client';
import type { NotificacionDto, CrearNotificacionRequest, MarcarLeidaResponse } from '@/types';

/**
 * GET /api/Notificaciones
 * Obtener notificaciones del usuario autenticado.
 * @param soloNoLeidas Opcional: true si solo deseas las no leídas, false para el historial completo.
 */
export async function fetchNotificaciones(
  token: string,
  soloNoLeidas?: boolean
): Promise<NotificacionDto[]> {
  try {
    const params = new URLSearchParams();
    if (typeof soloNoLeidas === 'boolean') {
      params.set('soloNoLeidas', String(soloNoLeidas));
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const { data } = await expedientesApi.get<NotificacionDto[]>(
      `/api/notificaciones${queryString}`,
      getAuthHeaders(token)
    );

    return Array.isArray(data) ? data : [];
  } catch (err) {
    // Retornar lista vacía si el backend no tiene el endpoint activo o está inalcanzable
    return [];
  }
}

/**
 * PUT /api/Notificaciones/{notCodigo}/leer
 * Marcar una notificación como leída.
 */
export async function marcarNotificacionLeida(
  token: string,
  notCodigo: string
): Promise<MarcarLeidaResponse> {
  const { data } = await expedientesApi.put<MarcarLeidaResponse>(
    `/api/notificaciones/${notCodigo}/leer`,
    {},
    getAuthHeaders(token)
  );

  return data || { mensaje: 'Notificación marcada como leída.' };
}

/**
 * POST /api/Notificaciones
 * Crear una notificación manualmente (para pruebas o administración).
 */
export async function crearNotificacion(
  token: string,
  payload: CrearNotificacionRequest
): Promise<{ mensaje: string }> {
  const { data } = await expedientesApi.post<{ mensaje: string }>(
    '/api/notificaciones',
    payload,
    getAuthHeaders(token)
  );

  return data || { mensaje: 'Notificación creada correctamente.' };
}
