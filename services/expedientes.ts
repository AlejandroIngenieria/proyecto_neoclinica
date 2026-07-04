import type { DoctorResponse } from '@/types';
import { expedientesApi, getAuthHeaders } from '@/lib/api-client';

/**
 * Obtiene la lista completa de doctores.
 *
 * Endpoint proxy: GET /api/expedientes
 */
export async function fetchDoctors(token: string): Promise<DoctorResponse[]> {
  const { data } = await expedientesApi.get<DoctorResponse | DoctorResponse[]>(
    '/api/expedientes',
    getAuthHeaders(token),
  );

  return Array.isArray(data) ? data : [data];
}

/**
 * Obtiene un doctor por su código de expediente.
 *
 * Endpoint proxy: GET /api/expedientes/:expCodigo
 */
export async function fetchDoctorByCode(token: string, expCodigo: string): Promise<DoctorResponse> {
  const { data } = await expedientesApi.get<DoctorResponse | DoctorResponse[]>(
    `/api/expedientes/${expCodigo}`,
    getAuthHeaders(token),
  );

  if (Array.isArray(data)) {
    if (data.length === 0) {
      throw new Error('No se encontró el expediente solicitado.');
    }
    return data[0];
  }

  return data;
}
