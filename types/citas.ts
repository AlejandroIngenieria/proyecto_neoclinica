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

export interface GrupoCitaItemDto {
  citaId: string;
  fecha: string;
  hora: string;
  modalidad?: string | null;
  estado?: string | null;
  codServicio?: number | null;
  codMetodoPago?: number | null;
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
  codServicio?: number | null;
  codMetodoPago?: number | null;
  consultorioId?: number | null;
  citas?: GrupoCitaItemDto[];
}

export interface ServicioMedicoCitaDto {
  sypCodigo: number;
  servicio: string;
  costoSinIva: number;
  costoIva: number;
  costoTotal: number;
  observaciones?: string | null;
}

export interface CrearCitaRequest {
  codPaciente: string;
  codMedico: string;
  grupoId?: string | null;
  consultorioId?: number | null; // mclCodigo / cliCodigo
  codServicio?: number | null; // ID del servicio médico (sypCodigo)
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm:ss
  modalidad: ModalidadCita;
  precio: number;
  motivo?: string | null;
  direccionDomicilio?: string | null;
  referenciasDomicilio?: string | null;
  enlaceVideollamada?: string | null;
  recompensaCodigo?: number | null;
  rcpCodigo?: number | null;
  archivos?: File[];
}

export type CitaEstado = 'programada' | 'confirmada' | 'pospuesta' | 'completada' | 'cancelada' | 'rechazada' | 'no_asistio';

export interface CitaEtapaDto {
  fecha: string;
  estado: string;
  descripcion: string;
}

export interface CitaArchivoDto {
  arcCodigo?: string;
  arcNombre?: string;
  arcUrl?: string;
  arcTipoArchivo?: string;
  id?: string;
  nombre?: string;
  url?: string;
  tipo?: string;
}

export interface CitaDocumentoDto {
  nombre: string;
  url: string;
}

export interface Cita {
  ctaCodigo: string;
  ctaCodpac: string;
  pacienteNombre: string;
  ctaCoddoc: string;
  medicoNombre: string;
  medicoEspecialidad: string;
  ctaGrupoId?: string;
  ctaConsultorioId?: number;
  clinicaNombre?: string;
  cliUrlGoogleMaps?: string;
  cliUrlWaze?: string;
  ctaCodsyp?: number;
  servicioNombre?: string;
  ctaFecha: string; // YYYY-MM-DD
  ctaHora: string;  // HH:mm:ss
  ctaEstado: 'programada' | 'confirmada' | 'cancelada' | 'rechazada' | 'pospuesta' | 'completada' | 'no_asistio';
  ctaTipo: string;
  ctaModalidad: string;
  ctaPrecio: number;
  ctaMotivo?: string;
  direccionDomicilio?: string;
  referenciasDomicilio?: string;
  enlaceVideollamada?: string;
  ctaEtapaActual: number;
  ctaTotalEtapas: number;
  ctaCalificacion?: number;
  fechaGrabacion: string;
  archivos: any[];
  ctaNotificacionResenaEnviada: boolean; // NUEVO
}

export interface CambiarEstadoCitaPayload {
  nuevoEstado: 'programada' | 'confirmada' | 'cancelada' | 'rechazada' | 'pospuesta' | 'completada' | 'no_asistio';
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
  ctaCodsyp?: number | null;
  servicioNombre?: string | null;
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
  ctaDiagnostico?: string | null;
  ctaTratamiento?: string | null;
  ctaExamenesSolicitados?: string | null;
  ctaNotasMedicas?: string | null;
  resenaComentario?: string | null;
  resenaFecha?: string | null;
  resenaCodigo?: string | null;
  fechaGrabacion: string;
  grupoTema?: string | null;
  etapas?: CitaEtapaDto[];
  documentos?: CitaDocumentoDto[];
  archivos?: CitaArchivoDto[];
  ctaNotificacionResenaEnviada?: boolean;
}

export interface UpdateCitaRequest {
  consultorioId?: number | null;
  codServicio?: number | null;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm:ss
  modalidad: ModalidadCita;
  precio: number;
  motivo?: string | null;
  grupoId?: string | null;
  direccionDomicilio?: string | null;
  referenciasDomicilio?: string | null;
  enlaceVideollamada?: string | null;
  archivos?: File[];
  archivosConservados?: string[];
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

export interface ColaTurnoDto {
  turnoNumero: number;
  ctaCodigo: string;
  ctaHora: string;
  ctaEstado: string; // "programada", "en_proceso", "completada", "no_asistio", "cancelada"
  ctaModalidad: string;
  esMiTurno: boolean;
  pacienteNombre?: string | null;
  medicoNombre: string;
  medicoEspecialidad: string;
  clinicaNombre?: string | null;
  servicioNombre?: string | null;
}

