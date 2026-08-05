export interface Recompensa {
  rcpCodigo: number;
  rcpTitulo: string;
  rcpCostoPuntos: number;
  rcpTipo: 'cita_gratis' | 'descuento' | 'premium_recordatorios' | 'premium_archivos';
  rcpValorDescuento?: number;
  rcpDiasDuracion?: number;
  descripcion?: string;
  icono?: string;
}

export interface RecompensaAdquirida {
  praCodigo: string; // GUID
  praCodpac: string; // GUID
  praCodrcp: number;
  tituloRecompensa: string;
  tipoRecompensa: string;
  praFechaAdquisicion: string; // ISO Date
  praFechaExpiracion?: string; // ISO Date
  praEstado: 'disponible' | 'usada' | 'expirada';
  codigoCanje?: string;
}

export interface TotalPuntosResponse {
  totalPuntos: number;
}

export interface AgregarPuntosPayload {
  puntos: number;
  tipo: 'ganancia' | 'canje' | 'ajuste';
  motivo: string;
}

export interface CanjearRecompensaPayload {
  rcpCodigo: number;
}

export interface AsignarReferidoPayload {
  codigoReferencia: string;
}

export interface LigaNivel {
  id: string;
  nombre: string;
  puntosMinimos: number;
  puntosMaximos: number;
  colorGradient: string;
  badgeIcon: string;
  beneficios: string[];
}

export interface HistorialMovimientoPuntos {
  id: string;
  fecha: string;
  motivo: string;
  tipo: 'ganancia' | 'canje' | 'ajuste';
  puntos: number;
}
