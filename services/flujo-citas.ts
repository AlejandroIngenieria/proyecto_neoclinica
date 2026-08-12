import { expedientesApi, getAuthHeaders } from '@/lib/api-client';
import type {
  ModalidadDto,
  ClinicaCitaDto,
  AreaDomicilioDto,
  HorarioCitaDto,
  PacienteSeleccionDto,
  GrupoCitaDto,
  CrearCitaRequest,
  CitaListDto,
  UpdateCitaRequest,
  MetodoPagoDto,
  PagarCitaRequest,
  BilleteraMetodoDto,
  GuardarSeguroRequest,
  GuardarTarjetaRequest
} from '@/types/citas';

export async function fetchModalidades(token: string, codMedico: string): Promise<ModalidadDto[]> {
  const { data } = await expedientesApi.get<ModalidadDto[]>(
    `/api/flujo-citas/medicos/${codMedico}/modalidades`,
    getAuthHeaders(token)
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchClinicas(token: string, codMedico: string): Promise<ClinicaCitaDto[]> {
  const { data } = await expedientesApi.get<ClinicaCitaDto[]>(
    `/api/flujo-citas/medicos/${codMedico}/clinicas`,
    getAuthHeaders(token)
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchAreasDomicilio(token: string, codMedico: string): Promise<AreaDomicilioDto[]> {
  const { data } = await expedientesApi.get<AreaDomicilioDto[]>(
    `/api/flujo-citas/medicos/${codMedico}/areas-domicilio`,
    getAuthHeaders(token)
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchHorarios(token: string, mclCodigo: number): Promise<HorarioCitaDto[]> {
  const { data } = await expedientesApi.get<HorarioCitaDto[]>(
    `/api/flujo-citas/clinicas/${mclCodigo}/horarios`,
    getAuthHeaders(token)
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchHorasOcupadas(token: string, codMedico: string, fecha: string): Promise<string[]> {
  const { data } = await expedientesApi.get<string[]>(
    `/api/flujo-citas/medicos/${codMedico}/horas-ocupadas?fecha=${fecha}`,
    getAuthHeaders(token)
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchPacientesSeleccion(token: string): Promise<PacienteSeleccionDto[]> {
  const { data } = await expedientesApi.get<PacienteSeleccionDto[]>(
    `/api/flujo-citas/pacientes/seleccion`,
    getAuthHeaders(token)
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchGruposCita(token: string, codPaciente: string, codMedico: string): Promise<GrupoCitaDto[]> {
  const { data } = await expedientesApi.get<GrupoCitaDto[]>(
    `/api/flujo-citas/pacientes/${codPaciente}/medicos/${codMedico}/grupos`,
    getAuthHeaders(token)
  );
  return Array.isArray(data) ? data : [];
}

export async function createGrupo(token: string, codPaciente: string, codMedico: string, tema: string, tituloTema: string): Promise<GrupoCitaDto> {
  const { data } = await expedientesApi.post<GrupoCitaDto>(
    `/api/flujo-citas/grupos?codPaciente=${codPaciente}`,
    { codMedico, tema, tituloTema },
    getAuthHeaders(token)
  );
  return data;
}

export async function createCita(token: string, request: CrearCitaRequest): Promise<string> {
  const formData = new FormData();

  // 1. Campos obligatorios
  formData.append('CodPaciente', request.codPaciente);
  formData.append('CodMedico', request.codMedico);
  formData.append('Fecha', request.fecha);
  formData.append('Hora', request.hora);
  formData.append('Modalidad', request.modalidad);
  formData.append('Precio', String(request.precio));

  // 2. Campos opcionales
  if (request.grupoId) formData.append('GrupoId', request.grupoId);
  if (request.consultorioId !== undefined && request.consultorioId !== null) {
    formData.append('ConsultorioId', String(request.consultorioId));
  }
  if (request.motivo) formData.append('Motivo', request.motivo);
  if (request.direccionDomicilio) formData.append('DireccionDomicilio', request.direccionDomicilio);
  if (request.referenciasDomicilio) formData.append('ReferenciasDomicilio', request.referenciasDomicilio);
  if (request.enlaceVideollamada) formData.append('EnlaceVideollamada', request.enlaceVideollamada);
  if (request.recompensaCodigo) formData.append('RecompensaCodigo', String(request.recompensaCodigo));
  if (request.rcpCodigo) formData.append('RcpCodigo', String(request.rcpCodigo));

  // 3. Archivos adjuntos
  if (request.archivos && request.archivos.length > 0) {
    request.archivos.forEach((archivo) => {
      formData.append('Archivos', archivo);
    });
  }

  const authHeaders = getAuthHeaders(token).headers as any;

  const { data } = await expedientesApi.post<string | { id: string }>(
    `/api/flujo-citas`,
    formData,
    {
      headers: {
        Authorization: authHeaders.Authorization,
        'Content-Type': undefined, // Permite que Axios/browser asigne multipart/form-data con boundary
      },
    }
  );
  return typeof data === 'string' ? data : (data?.id || '');
}

export async function uploadDocumentoCita(
  token: string,
  codPaciente: string,
  codCita: string,
  file: File
): Promise<void> {
  const formData = new FormData();
  formData.append('codPaciente', codPaciente);
  formData.append('codCita', codCita);
  formData.append('nombreArchivo', file.name);
  formData.append('tipoArchivo', file.type);
  formData.append('archivo', file);

  const authHeaders = getAuthHeaders(token).headers as any;

  await expedientesApi.post(
    `/api/flujo-citas/documentos`,
    formData,
    {
      headers: {
        Authorization: authHeaders.Authorization,
        'Content-Type': undefined,
      },
    }
  );
}
export async function fetchCitasPaciente(token: string, codPaciente: string): Promise<CitaListDto[]> {
  const { data } = await expedientesApi.get<CitaListDto[]>(`/api/flujo-citas?codPaciente=${codPaciente}`, getAuthHeaders(token));
  return data;
}

export async function cancelarCita(token: string, citaId: string): Promise<void> {
  await expedientesApi.post(`/api/flujo-citas/${citaId}/cancelar`, undefined, getAuthHeaders(token));
}

export async function completarCita(token: string, citaId: string): Promise<void> {
  try {
    await expedientesApi.post(`/api/flujo-citas/${citaId}/completar`, undefined, getAuthHeaders(token));
  } catch (err: any) {
    if (err?.response?.status === 404 || err?.response?.status === 405) {
      await expedientesApi.put(`/api/flujo-citas/${citaId}/completar`, undefined, getAuthHeaders(token));
    } else {
      throw err;
    }
  }
}

export async function updateCita(token: string, citaId: string, payload: UpdateCitaRequest): Promise<void> {
  const formData = new FormData();

  if (payload.fecha) formData.append('Fecha', payload.fecha);
  if (payload.hora) formData.append('Hora', payload.hora);
  if (payload.modalidad) formData.append('Modalidad', payload.modalidad);
  if (payload.precio !== undefined) formData.append('Precio', String(payload.precio));

  if (payload.grupoId) formData.append('GrupoId', payload.grupoId);
  if (payload.consultorioId !== undefined && payload.consultorioId !== null) {
    formData.append('ConsultorioId', String(payload.consultorioId));
  }
  if (payload.motivo) formData.append('Motivo', payload.motivo);
  if (payload.direccionDomicilio) formData.append('DireccionDomicilio', payload.direccionDomicilio);
  if (payload.referenciasDomicilio) formData.append('ReferenciasDomicilio', payload.referenciasDomicilio);
  if (payload.enlaceVideollamada) formData.append('EnlaceVideollamada', payload.enlaceVideollamada);

  if (payload.archivos && payload.archivos.length > 0) {
    payload.archivos.forEach((archivo) => {
      formData.append('Archivos', archivo);
    });
  }

  if (payload.archivosConservados !== undefined) {
    formData.append('ArchivosConservados', JSON.stringify(payload.archivosConservados));
  }

  const authHeaders = getAuthHeaders(token).headers as any;

  await expedientesApi.put(
    `/api/flujo-citas/${citaId}`,
    formData,
    {
      headers: {
        Authorization: authHeaders.Authorization,
        'Content-Type': undefined,
      },
    }
  );
}

export async function fetchMetodosPago(token: string, codMedico: string): Promise<MetodoPagoDto[]> {
  const { data } = await expedientesApi.get<MetodoPagoDto[]>(
    `/api/flujo-citas/medico/${codMedico}/metodos-pago`,
    getAuthHeaders(token)
  );
  return Array.isArray(data) ? data : [];
}

export async function pagarCita(token: string, citaId: string, request: PagarCitaRequest): Promise<void> {
  await expedientesApi.put(
    `/api/flujo-citas/cita/${citaId}/pago`,
    request,
    getAuthHeaders(token)
  );
}

export async function fetchBilletera(token: string, codPac: string): Promise<BilleteraMetodoDto[]> {
  const { data } = await expedientesApi.get<BilleteraMetodoDto[]>(
    `/api/flujo-citas/paciente/${codPac}/billetera`,
    getAuthHeaders(token)
  );
  return Array.isArray(data) ? data : [];
}

export async function guardarSeguro(token: string, codPac: string, request: GuardarSeguroRequest): Promise<void> {
  await expedientesApi.post(
    `/api/flujo-citas/paciente/${codPac}/seguro`,
    request,
    getAuthHeaders(token)
  );
}

export async function guardarTarjeta(token: string, codPac: string, request: GuardarTarjetaRequest): Promise<void> {
  await expedientesApi.post(
    `/api/flujo-citas/paciente/${codPac}/tarjeta`,
    request,
    getAuthHeaders(token)
  );
}
