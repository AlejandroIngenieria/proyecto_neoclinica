import { expedientesApi, getAuthHeaders } from '@/lib/api-client';
import type { ResenaDto } from '@/types';

export interface CrearResenaRequest {
  codDoc: string;
  codPac: string;
  codCta: string;
  valoracion: number;
  texto?: string | null;
}

export interface ActualizarResenaRequest {
  valoracion?: number;
  texto?: string | null;
}

export interface CrearResenaResponse {
  mensaje?: string;
  puntosGanados?: number;
  [key: string]: any;
}

/** POST /api/expedientes - Crear una nueva reseña */
export async function crearResena(token: string, payload: CrearResenaRequest): Promise<CrearResenaResponse> {
  // Envía las propiedades limpias sin duplicados para evitar colisiones en System.Text.Json
  const body = {
    codDoc: payload.codDoc,
    codPac: payload.codPac,
    codCta: payload.codCta,
    valoracion: Math.min(5, Math.max(1, Math.round(Number(payload.valoracion)))),
    texto: payload.texto ? payload.texto.trim().slice(0, 500) : null,
  };

  const { data } = await expedientesApi.post<CrearResenaResponse>(
    '/api/expedientes',
    body,
    getAuthHeaders(token)
  );
  return data;
}

/** GET /api/expedientes/medico/{codDoc}/resenas - Obtener reseñas del médico */
export async function fetchResenasMedico(codDoc: string, token?: string): Promise<ResenaDto[]> {
  const headers = token ? getAuthHeaders(token) : undefined;
  const { data } = await expedientesApi.get<ResenaDto[]>(
    `/api/expedientes/medico/${codDoc}/resenas`,
    headers
  );
  return Array.isArray(data) ? data : [];
}

/** PUT /api/expedientes/{resCodigo} - Actualizar reseña */
export async function actualizarResena(
  token: string,
  resCodigo: string,
  payload: ActualizarResenaRequest
): Promise<void> {
  const body: Record<string, any> = {};
  if (typeof payload.valoracion === 'number') {
    body.valoracion = Math.min(5, Math.max(1, Math.round(payload.valoracion)));
  }
  if (payload.texto !== undefined) {
    body.texto = payload.texto ? payload.texto.trim().slice(0, 500) : null;
  }

  await expedientesApi.put(
    `/api/expedientes/${resCodigo}`,
    body,
    getAuthHeaders(token)
  );
}

/** DELETE /api/expedientes/{resCodigo} - Eliminar reseña */
export async function eliminarResena(token: string, resCodigo: string): Promise<void> {
  await expedientesApi.delete(
    `/api/expedientes/${resCodigo}`,
    getAuthHeaders(token)
  );
}
