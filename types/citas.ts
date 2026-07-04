export type ModalidadCita = 'presencial' | 'virtual' | 'domicilio';

export interface ModalidadDto {
  modCodigo: number;
  modDescripcion: string;
}

export interface ClinicaCitaDto {
  mclCodigo: number;
  cliCodigo: number;
  cliDescripcion: string;
  cliDireccionCompleta: string;
  cliZona: string;
  mclPrecioBase: number;
}

export interface AreaDomicilioDto {
  ladCodigo: number;
  pais: string;
  departamento: string;
  municipio: string;
  ladZonas: string;
  ladObservaciones: string;
}

export interface HorarioCitaDto {
  horDiaSemana: number;
  horHoraInicio: string; // "08:00:00"
  horHoraFin: string; // "17:00:00"
}

export interface PacienteSeleccionDto {
  pacCodigo: string;
  pacTitular: boolean;
  nombreCompleto: string;
  pacFechaNacimiento: string | null;
}

export interface GrupoCitaDto {
  grcCodigo: string;
  grcTema: string;
  grcTituloTema: string;
}

export interface CrearCitaRequest {
  codPaciente: string;
  codMedico: string;
  grupoId?: string | null;
  consultorioId?: number | null; // mclCodigo / cliCodigo
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm:ss
  modalidad: ModalidadCita;
  precio: number;
  motivo?: string;
}

export type CitaEstado = 'programada' | 'confirmada' | 'pospuesta' | 'completada' | 'cancelada' | 'rechazada' | 'no_asistio';

export interface CitaEtapaDto {
  fecha: string;
  estado: string;
  descripcion: string;
}

export interface CitaDocumentoDto {
  nombre: string;
  url: string;
}

export interface CitaListDto {
  ctaCodigo: string;
  ctaCodpac: string;
  pacienteNombre: string;
  ctaCoddoc: string;
  medicoNombre: string;
  medicoEspecialidad: string;
  ctaGrupoId: string | null;
  ctaConsultorioId: number | null;
  clinicaNombre: string | null;
  ctaFecha: string; // "YYYY-MM-DDTHH:mm:ss"
  ctaHora: string; // "HH:mm:ss"
  ctaEstado: CitaEstado;
  ctaTipo: string;
  ctaModalidad: ModalidadCita;
  ctaPrecio: number;
  ctaMotivo: string | null;
  ctaEtapaActual: number;
  ctaTotalEtapas: number;
  ctaCalificacion: number | null;
  fechaGrabacion: string;
  grupoTema?: string | null; // Keep optional if it might be populated later
  etapas?: CitaEtapaDto[];
  documentos?: CitaDocumentoDto[];
}

export interface UpdateCitaRequest {
  consultorioId: number | null;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm:ss
  modalidad: ModalidadCita;
  precio: number;
  motivo: string | null;
  grupoId: string | null;
}
