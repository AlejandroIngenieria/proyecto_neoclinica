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
  UpdateCitaRequest
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
  const { data } = await expedientesApi.post<string | { id: string }>(
    `/api/flujo-citas`,
    request,
    getAuthHeaders(token)
  );
  return typeof data === 'string' ? data : data.id;
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
        'Content-Type': undefined, // Let Axios handle it
      },
    }
  );
}
export async function fetchCitasPaciente(token: string, codPaciente: string): Promise<CitaListDto[]> {
  // Using the Next.js API route as a proxy
  // Alternatively, just hit the backend directly if expedientesApi is configured for it.
  // We'll use expedientesApi which prepends the backend URL
  const { data } = await expedientesApi.get<CitaListDto[]>(`/api/flujo-citas?codPaciente=${codPaciente}`, getAuthHeaders(token));
  return data;
}

export async function cancelarCita(token: string, citaId: string): Promise<void> {
  await expedientesApi.post(`/api/flujo-citas/${citaId}/cancelar`, undefined, getAuthHeaders(token));
}

export async function updateCita(token: string, citaId: string, payload: UpdateCitaRequest): Promise<void> {
  await expedientesApi.put(`/api/flujo-citas/${citaId}`, payload, getAuthHeaders(token));
}
