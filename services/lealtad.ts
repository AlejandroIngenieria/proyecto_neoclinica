import { expedientesApi, getAuthHeaders } from '@/lib/api-client';

export interface LealtadEstado {
  puntosActuales: number;
  nivelActual: string;
  puntosMinimosNivel: number;
  puntosMaximosNivel: number;
  imagenNivelUrl: string | null;
  progresoPorcentaje: number;
}

export interface LealtadTarea {
  tareaId: number;
  titulo: string;
  descripcion: string;
  puntosRecompensa: number;
  imagenUrl: string | null;
  codigoAccion: string;
  repetible: boolean;
  indicaciones: string;
  completada: boolean;
}

export async function fetchEstadoLealtad(token: string): Promise<LealtadEstado> {
  const { data } = await expedientesApi.get<LealtadEstado>('/api/lealtad/estado', getAuthHeaders(token));
  return data;
}

export async function fetchTareasLealtad(token: string): Promise<LealtadTarea[]> {
  const { data } = await expedientesApi.get<LealtadTarea[]>('/api/lealtad/tareas', getAuthHeaders(token));
  return data;
}

export async function completarTareaLealtad(token: string, codigoAccion: string): Promise<{ mensaje: string }> {
  const { data } = await expedientesApi.post<{ mensaje: string }>(
    '/api/lealtad/completar',
    { codigoAccion },
    getAuthHeaders(token)
  );
  return data;
}
