import { expedientesApi, getAuthHeaders } from '@/lib/api-client';
import type {
  ModalidadDto,
  ClinicaCitaDto,
  ServicioMedicoCitaDto,
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
  GuardarTarjetaRequest,
  Cita,
  CambiarEstadoCitaPayload,
  ColaTurnoDto,
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

export async function fetchServiciosMedico(token: string | undefined, codMedico: string): Promise<ServicioMedicoCitaDto[]> {
  const { data } = await expedientesApi.get<ServicioMedicoCitaDto[]>(
    `/api/flujo-citas/medicos/${codMedico}/servicios`,
    getAuthHeaders(token || '')
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
  const { data } = await expedientesApi.post<any>(
    `/api/flujo-citas/grupos?codPaciente=${codPaciente}`,
    { codMedico, tema, tituloTema },
    getAuthHeaders(token)
  );
  const id = data?.id || data?.grupoId || (typeof data === 'string' ? data : '');
  return {
    ...data,
    id,
    grupoId: id,
    codPaciente,
    codMedico,
    tema,
    tituloTema
  };
}

export async function eliminarGrupoCita(token: string, grupoId: string): Promise<void> {
  await expedientesApi.delete(
    `/api/flujo-citas/grupos/${grupoId}`,
    getAuthHeaders(token)
  );
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
  if (request.codServicio !== undefined && request.codServicio !== null) {
    formData.append('CodServicio', String(request.codServicio));
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

/**
 * Obtiene todas las citas del sistema (panel de administración)
 */
export async function fetchAllCitas(token?: string): Promise<CitaListDto[]> {
  const headers = token ? getAuthHeaders(token) : undefined;
  const { data } = await expedientesApi.get<CitaListDto[]>('/api/flujo-citas', headers);
  return Array.isArray(data) ? data : [];
}

/**
 * Cambia el estado de una cita médica vía PATCH /api/flujo-citas/{citaId}/estado
 */
export async function cambiarEstadoCita(
  token: string,
  citaId: string,
  nuevoEstado: CambiarEstadoCitaPayload['nuevoEstado'] | string,
): Promise<{ mensaje: string }> {
  const payload: CambiarEstadoCitaPayload = {
    nuevoEstado: nuevoEstado as CambiarEstadoCitaPayload['nuevoEstado'],
  };

  const { data } = await expedientesApi.patch<{ mensaje: string }>(
    `/api/flujo-citas/${citaId}/estado`,
    payload,
    getAuthHeaders(token),
  );

  return data;
}

/**
 * Función directa para cambiar estado de cita
 */
export const cambiarEstadoCitaDirect = async (citaId: string, nuevoEstado: string, token?: string) => {
  const payload: CambiarEstadoCitaPayload = {
    nuevoEstado: nuevoEstado as CambiarEstadoCitaPayload['nuevoEstado'],
  };

  const headers = token ? getAuthHeaders(token) : undefined;
  const { data } = await expedientesApi.patch<{ mensaje: string }>(
    `/api/flujo-citas/${citaId}/estado`,
    payload,
    headers,
  );
  return data;
};

export async function cancelarCita(token: string, citaId: string): Promise<void> {
  await expedientesApi.post(`/api/flujo-citas/${citaId}/cancelar`, undefined, getAuthHeaders(token));
}

export async function desvincularGrupoCita(token: string, citaId: string): Promise<void> {
  await expedientesApi.post(`/api/flujo-citas/${citaId}/desvincular-grupo`, undefined, getAuthHeaders(token));
}

export async function completarCita(token: string, citaInput: string | CitaListDto): Promise<void> {
  const citaId = typeof citaInput === 'string' ? citaInput : citaInput.ctaCodigo;

  // 1. Intentar POST /api/flujo-citas/{citaId}/completar
  try {
    await expedientesApi.post(`/api/flujo-citas/${citaId}/completar`, undefined, getAuthHeaders(token));
    return;
  } catch {
    // Continuar al siguiente intento
  }

  // 2. Intentar PUT /api/flujo-citas/{citaId}/completar
  try {
    await expedientesApi.put(`/api/flujo-citas/${citaId}/completar`, undefined, getAuthHeaders(token));
    return;
  } catch {
    // Continuar al siguiente intento
  }

  // 3. Intentar PUT /api/flujo-citas/{citaId} con el modelo de actualización completo
  if (typeof citaInput !== 'string') {
    try {
      const formData = new FormData();
      formData.append('Fecha', citaInput.ctaFecha ? citaInput.ctaFecha.split('T')[0] : '');
      formData.append('Hora', citaInput.ctaHora || '00:00:00');
      formData.append('Modalidad', citaInput.ctaModalidad || 'presencial');
      formData.append('Precio', String(citaInput.ctaPrecio || 0));
      formData.append('Estado', 'completada');
      formData.append('CtaEstado', 'completada');

      if (citaInput.ctaConsultorioId) formData.append('ConsultorioId', String(citaInput.ctaConsultorioId));
      if (citaInput.ctaGrupoId) formData.append('GrupoId', citaInput.ctaGrupoId);
      if (citaInput.ctaMotivo) formData.append('Motivo', citaInput.ctaMotivo);
      if (citaInput.direccionDomicilio) formData.append('DireccionDomicilio', citaInput.direccionDomicilio);
      if (citaInput.referenciasDomicilio) formData.append('ReferenciasDomicilio', citaInput.referenciasDomicilio);
      if (citaInput.enlaceVideollamada) formData.append('EnlaceVideollamada', citaInput.enlaceVideollamada);

      const authHeaders = getAuthHeaders(token).headers as any;
      await expedientesApi.put(`/api/flujo-citas/${citaId}`, formData, {
        headers: {
          Authorization: authHeaders.Authorization,
          'Content-Type': undefined,
        },
      });
    } catch {
      // Manejo silencioso si el backend de desarrollo no permite actualización directa
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
  if (payload.codServicio !== undefined && payload.codServicio !== null) {
    formData.append('CodServicio', String(payload.codServicio));
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

export async function fetchColaDelDia(
  codMedico: string,
  fecha: string,
  codPaciente?: string
): Promise<ColaTurnoDto[]> {
  const params = new URLSearchParams();
  if (codMedico) params.set('codMedico', codMedico);
  if (fecha) params.set('fecha', fecha);
  if (codPaciente) params.set('codPaciente', codPaciente);

  const { data } = await expedientesApi.get<ColaTurnoDto[]>(
    `/api/flujo-citas/cola-dia?${params.toString()}`
  );
  return Array.isArray(data) ? data : [];
}

