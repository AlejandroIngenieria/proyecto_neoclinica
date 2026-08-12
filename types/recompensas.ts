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
  id?: string;
  hisCodigo?: number;
  trpCodigo?: string;
  TrpCodigo?: string;
  fecha?: string;
  hisFecha?: string;
  hspFecha?: string;
  fechaMovimiento?: string;
  fechaGrabacion?: string;
  FechaGrabacion?: string;
  motivo?: string;
  hisMotivo?: string;
  hisDescripcion?: string;
  descripcion?: string;
  concepto?: string;
  trpMotivo?: string;
  TrpMotivo?: string;
  tipo?: 'ganancia' | 'canje' | 'ajuste' | string;
  hisTipo?: string;
  hspTipo?: string;
  tipoMovimiento?: string;
  trpTipo?: string;
  TrpTipo?: string;
  puntos?: number;
  hisPuntos?: number;
  hspPuntos?: number;
  montoPuntos?: number;
  cantidadPuntos?: number;
  trpPuntos?: number;
  TrpPuntos?: number;
}

