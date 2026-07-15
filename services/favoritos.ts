import { getAuthHeaders } from '@/lib/api-client';
import type { MedicoFavorito } from '@/types/doctor';

/**
 * Obtiene la lista de médicos favoritos del paciente.
 */
export async function fetchFavoritos(token: string, codPac: string): Promise<MedicoFavorito[]> {
  const url = `/api/pacientes/${codPac}/favoritos`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`fetchFavoritos Error ${res.status}:`, errorText);
    throw new Error('Error al obtener favoritos');
  }

  return res.json();
}

/**
 * Agrega un médico a la lista de favoritos del paciente.
 */
export async function addFavorito(token: string, codPac: string, codDoc: string): Promise<void> {
  const url = `/api/pacientes/${codPac}/agregar`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ codDoc }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`addFavorito Error ${res.status}:`, errorText);
    if (res.status === 409) {
      throw new Error('El médico ya está en tus favoritos');
    }
    throw new Error(errorText || 'Error al agregar a favoritos');
  }
}

/**
 * Elimina un médico de la lista de favoritos del paciente.
 */
export async function removeFavorito(token: string, codPac: string, codDoc: string): Promise<void> {
  const url = `/api/pacientes/${codPac}/eliminar/${codDoc}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`removeFavorito Error ${res.status}:`, errorText);
    throw new Error(errorText || 'Error al eliminar de favoritos');
  }
}
