/**
 * Taxonomía de Tiempos de Caché para Entornos de Salud (SaludYa / NeoClínica)
 * Diseñado conforme a los estándares de Integridad Clínica y DevSecOps.
 */

export const CLINICAL_STALE_TIMES = {
  /** 0 ms: Datos en tiempo real de sala de espera, cola de turnos del día y estados críticos */
  REALTIME: 0,
  /** 15 segundos: Disponibilidad de horarios médicos, cupos de citas y solicitudes de cambio */
  TRANSACTIONAL: 15 * 1000,
  /** 1 minuto: Datos del paciente, listado general de citas activas y balance de lealtad */
  STANDARD: 60 * 1000,
  /** 5 minutos: Historial médico archivado, recetas anteriores y expedientes finalizados */
  HISTORY: 5 * 60 * 1000,
  /** 12 horas: Catálogos de referencia estáticos (países, departamentos, especialidades, aseguradoras) */
  STATIC: 12 * 60 * 60 * 1000,
} as const;

export const CLINICAL_GC_TIMES = {
  SHORT: 5 * 60 * 1000,
  STANDARD: 15 * 60 * 1000,
  LONG: 24 * 60 * 60 * 1000,
} as const;

/**
 * Jerarquía de Query Keys Médicas para invalidación coordinada post-mutación.
 */
export const clinicaQueryKeys = {
  all: ['neoclinica'] as const,
  paciente: (id?: string | null) => [...clinicaQueryKeys.all, 'paciente', id ?? 'current'] as const,
  citas: (pacId?: string | null) => [...clinicaQueryKeys.paciente(pacId), 'citas'] as const,
  citaDetalle: (citaId: number | string) => [...clinicaQueryKeys.all, 'cita', citaId] as const,
  colaDia: (codMedico?: string | null, fecha?: string | null) => [...clinicaQueryKeys.all, 'cola-dia', codMedico, fecha] as const,
  horarios: (codMedico?: string | null, fecha?: string | null) => [...clinicaQueryKeys.all, 'horarios', codMedico, fecha] as const,
  catalogos: () => [...clinicaQueryKeys.all, 'catalogos'] as const,
  aseguradoras: () => [...clinicaQueryKeys.catalogos(), 'aseguradoras'] as const,
  ubicaciones: () => [...clinicaQueryKeys.catalogos(), 'ubicaciones'] as const,
};
