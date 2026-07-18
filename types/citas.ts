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
  cliUrlGoogleMaps?: string | null;
  cliUrlWaze?: string | null;
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
  pacFotoPerfilUrl?: string;
}

export interface GrupoCitaDto {
  grupoId: string;
  titulo: string;
  descripcion: string;
  citaId?: string | null;
  fecha?: string | null;
  hora?: string | null;
  modalidad?: string | null;
  estado?: string | null;
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
  motivo?: string | null;
  direccionDomicilio?: string | null;
  referenciasDomicilio?: string | null;
  enlaceVideollamada?: string | null;
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
  ctaGrupoId?: string | null;
  ctaConsultorioId?: number | null;
  clinicaNombre?: string | null;
  cliUrlGoogleMaps?: string | null;
  cliUrlWaze?: string | null;
  ctaFecha: string; // "YYYY-MM-DDTHH:mm:ss"
  ctaHora: string; // "HH:mm:ss"
  ctaEstado: CitaEstado;
  ctaTipo: string;
  ctaModalidad: ModalidadCita;
  ctaPrecio: number;
  ctaMotivo?: string | null;
  direccionDomicilio?: string | null;
  referenciasDomicilio?: string | null;
  enlaceVideollamada?: string | null;
  ctaEtapaActual: number;
  ctaTotalEtapas: number;
  ctaCalificacion?: number | null;
  fechaGrabacion: string;
  grupoTema?: string | null;
  etapas?: CitaEtapaDto[];
  documentos?: CitaDocumentoDto[];
}

export interface UpdateCitaRequest {
  consultorioId?: number | null;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm:ss
  modalidad: ModalidadCita;
  precio: number;
  motivo?: string | null;
  grupoId?: string | null;
  direccionDomicilio?: string | null;
  referenciasDomicilio?: string | null;
  enlaceVideollamada?: string | null;
}

export interface MetodoPagoDto {
  tipoPagoId: number;
  descripcion: string;
  observaciones: string;
}

export interface PagarCitaRequest {
  codTpp: number;
  estadoPago: 'pendiente' | 'pagado' | 'fallido' | 'reembolsado';
  referenciaPago?: string | null;
}

export interface BilleteraMetodoDto {
  id_metodo: string; // UUID
  tipo: 'TARJETA' | 'SEGURO';
  proveedor: string; // "Visa", "GNP", etc.
  descripcion: string; // "**** 1234" o "Póliza: 98765"
  es_principal: boolean;
}

export interface GuardarSeguroRequest {
  codAse: number;
  numeroPoliza: string;
}

export interface GuardarTarjetaRequest {
  tokenProcesador: string;
  ultimos4: string;
  tipoTarjeta: string; // "visa", "mastercard", etc.
}
