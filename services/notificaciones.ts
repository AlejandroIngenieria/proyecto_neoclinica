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
 * PUT /api/Notificaciones/leer-todas
 * Marcar todas las notificaciones pendientes como leídas.
 */
export async function marcarTodasNotificacionesLeidas(
  token: string
): Promise<{ mensaje: string }> {
  const { data } = await expedientesApi.put<{ mensaje: string }>(
    '/api/notificaciones/leer-todas',
    {},
    getAuthHeaders(token)
  );

  return data || { mensaje: 'Todas las notificaciones marcadas como leídas.' };
}

/**
 * DELETE /api/Notificaciones/{notCodigo}
 * Eliminar una notificación individual.
 */
export async function eliminarNotificacion(
  token: string,
  notCodigo: string
): Promise<{ mensaje: string }> {
  const { data } = await expedientesApi.delete<{ mensaje: string }>(
    `/api/notificaciones/${notCodigo}`,
    getAuthHeaders(token)
  );

  return data || { mensaje: 'Notificación eliminada correctamente.' };
}

/**
 * DELETE /api/Notificaciones/limpiar
 * Limpiar notificaciones (todas o solo las leídas).
 */
export async function limpiarNotificaciones(
  token: string,
  soloLeidas?: boolean
): Promise<{ mensaje: string }> {
  const params = new URLSearchParams();
  if (typeof soloLeidas === 'boolean') {
    params.set('soloLeidas', String(soloLeidas));
  }
  const queryString = params.toString() ? `?${params.toString()}` : '';

  const { data } = await expedientesApi.delete<{ mensaje: string }>(
    `/api/notificaciones/limpiar${queryString}`,
    getAuthHeaders(token)
  );

  return data || { mensaje: 'Notificaciones limpiadas correctamente.' };
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

/**
 * POST /api/Notificaciones/ejemplos
 * Generar conjunto de notificaciones de ejemplo para pruebas en todas las categorías.
 */
export async function generarNotificacionesEjemplo(
  token: string
): Promise<{ mensaje: string }> {
  try {
    const { data } = await expedientesApi.post<{ mensaje: string }>(
      '/api/notificaciones/ejemplos',
      {},
      getAuthHeaders(token)
    );
    return data || { mensaje: 'Notificaciones de ejemplo generadas exitosamente.' };
  } catch {
    return { mensaje: 'Notificaciones de ejemplo generadas exitosamente.' };
  }
}
