import { expedientesApi, getAuthHeaders } from '@/lib/api-client';
import type {
  Recompensa,
  RecompensaAdquirida,
  TotalPuntosResponse,
  CanjearRecompensaPayload,
  AsignarReferidoPayload,
  AgregarPuntosPayload,
  HistorialMovimientoPuntos,
} from '@/types/recompensas';

/**
 * Obtener Catálogo de Recompensas (Para mostrar las opciones de canje)
 * GET /api/recompensas/catalogo
 */
export async function fetchCatalogoRecompensas(token?: string): Promise<Recompensa[]> {
  try {
    const { data } = await expedientesApi.get<Recompensa[]>(
      '/api/recompensas/catalogo',
      token ? getAuthHeaders(token) : undefined
    );
    return data;
  } catch (error) {
    console.warn('Fallback o error al consultar catálogo de recompensas:', error);
    // Fallback con datos por defecto si el backend aún no responde
    return [
      {
        rcpCodigo: 1,
        rcpTitulo: '15% de Descuento en Consulta',
        rcpCostoPuntos: 350,
        rcpTipo: 'descuento',
        rcpValorDescuento: 15,
        descripcion: 'Aplica un 15% de descuento en el total de tu próxima consulta médica.',
      },
      {
        rcpCodigo: 2,
        rcpTitulo: 'Cita Médica General Gratis',
        rcpCostoPuntos: 800,
        rcpTipo: 'cita_gratis',
        descripcion: 'Canjea tus puntos por una consulta de medicina general totalmente gratuita.',
      },
      {
        rcpCodigo: 3,
        rcpTitulo: 'Recordatorios Premium (30 Días)',
        rcpCostoPuntos: 200,
        rcpTipo: 'premium_recordatorios',
        rcpDiasDuracion: 30,
        descripcion: 'Alertas SMS y WhatsApp personalizadas para la toma de medicamentos.',
      },
      {
        rcpCodigo: 4,
        rcpTitulo: 'Almacenamiento de Archivos Ilimitado (90 Días)',
        rcpCostoPuntos: 500,
        rcpTipo: 'premium_archivos',
        rcpDiasDuracion: 90,
        descripcion: 'Guarda tus exámenes, laboratorios y radiografías en HD sin límite de espacio.',
      },
    ];
  }
}

/**
 * Obtener Inventario del Paciente (Recompensas ya canjeadas y su estado)
 * GET /api/recompensas/{pacCodigo}/disponibles
 */
export async function fetchRecompensasDisponibles(
  pacCodigo: string,
  token?: string
): Promise<RecompensaAdquirida[]> {
  try {
    const { data } = await expedientesApi.get<RecompensaAdquirida[]>(
      `/api/recompensas/${pacCodigo}/disponibles`,
      token ? getAuthHeaders(token) : undefined
    );
    return data;
  } catch (error) {
    console.warn('Fallback o error al consultar inventario de recompensas:', error);
    return [];
  }
}

/**
 * Obtener Total de Puntos Actuales
 * GET /api/recompensas/{pacCodigo}/puntos
 */
export async function fetchTotalPuntos(
  pacCodigo: string,
  token?: string
): Promise<TotalPuntosResponse> {
  try {
    const { data } = await expedientesApi.get<TotalPuntosResponse>(
      `/api/recompensas/${pacCodigo}/puntos`,
      token ? getAuthHeaders(token) : undefined
    );
    return data;
  } catch (error) {
    console.warn('Fallback o error al consultar total de puntos:', error);
    return { totalPuntos: 450 }; // Valor demostrativo por defecto
  }
}

/**
 * Canjear Recompensa
 * POST /api/recompensas/{pacCodigo}/canjear
 */
export async function canjearRecompensa(
  pacCodigo: string,
  payload: CanjearRecompensaPayload,
  token?: string
): Promise<RecompensaAdquirida> {
  try {
    const { data } = await expedientesApi.post<RecompensaAdquirida>(
      `/api/recompensas/${pacCodigo}/canjear`,
      payload,
      token ? getAuthHeaders(token) : undefined
    );
    return data;
  } catch (error: any) {
    if (error.response?.status === 400) {
      const msg =
        error.response?.data?.message ||
        error.response?.data ||
        'No tienes puntos suficientes o se ha alcanzado el límite para esta recompensa.';
      throw new Error(msg);
    }
    throw new Error(error.message || 'Error al canjear la recompensa.');
  }
}

/**
 * Vincular Código de Referido
 * POST /api/recompensas/{pacCodigo}/referido
 */
export async function vincularCodigoReferido(
  pacCodigo: string,
  payload: AsignarReferidoPayload,
  token?: string
): Promise<{ mensaje: string; puntosGanados?: number }> {
  try {
    const { data } = await expedientesApi.post<{ mensaje: string; puntosGanados?: number }>(
      `/api/recompensas/${pacCodigo}/referido`,
      payload,
      token ? getAuthHeaders(token) : undefined
    );
    return data;
  } catch (error: any) {
    if (error.response?.status === 400) {
      throw new Error(error.response?.data?.message || 'El código de referido es inválido o ya fue utilizado.');
    }
    throw new Error(error.message || 'Error al vincular el código de referido.');
  }
}

/**
 * Agregar Puntos (Uso backend/admin o acciones automáticas)
 * POST /api/recompensas/{pacCodigo}/puntos
 */
export async function agregarPuntos(
  pacCodigo: string,
  payload: AgregarPuntosPayload,
  token?: string
): Promise<TotalPuntosResponse> {
  const { data } = await expedientesApi.post<TotalPuntosResponse>(
    `/api/recompensas/${pacCodigo}/puntos`,
    payload,
    token ? getAuthHeaders(token) : undefined
  );
  return data;
}

/**
 * Obtener Historial de Movimientos de Puntos
 * GET /api/recompensas/{pacCodigo}/historial
 */
export async function fetchHistorialPuntos(
  pacCodigo: string,
  token?: string
): Promise<HistorialMovimientoPuntos[]> {
  try {
    const { data } = await expedientesApi.get<HistorialMovimientoPuntos[]>(
      `/api/recompensas/${pacCodigo}/historial`,
      token ? getAuthHeaders(token) : undefined
    );
    return data;
  } catch (error) {
    return [
      {
        id: '1',
        fecha: new Date(Date.now() - 86400000 * 2).toISOString(),
        motivo: 'Completar datos de perfil',
        tipo: 'ganancia',
        puntos: 150,
      },
      {
        id: '2',
        fecha: new Date(Date.now() - 86400000 * 5).toISOString(),
        motivo: 'Primera cita concluidas',
        tipo: 'ganancia',
        puntos: 300,
      },
    ];
  }
}
