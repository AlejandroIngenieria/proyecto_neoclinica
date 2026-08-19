export type TipoNotificacion = 'sistema' | 'mensaje' | 'recordatorio' | 'cita';
export type TipoUsuarioNotificacion = 'paciente' | 'doctor';

export interface NotificacionDto {
  notCodigo: string;
  tipo: TipoNotificacion | string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  accionUrl?: string | null;
  fecha: string;
}

export interface CrearNotificacionRequest {
  usuarioId: string;
  usuarioTipo: TipoUsuarioNotificacion | string;
  tipo: TipoNotificacion | string;
  titulo: string;
  mensaje: string;
  accionUrl?: string | null;
}

export interface MarcarLeidaResponse {
  mensaje: string;
}
