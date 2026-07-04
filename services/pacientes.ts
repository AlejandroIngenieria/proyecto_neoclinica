import type { Paciente } from '@/types';
import { expedientesApi, getAuthHeaders } from '@/lib/api-client';

// ─── Pacientes Service ──────────────────────────────────────────────────────
// Todas las llamadas pasan por el proxy de Next.js (/app/api/pacientes/...)
// para evitar problemas de CORS en el navegador.

/** Mapea el DTO camelCase del backend a nuestra interfaz Paciente snake_case */
function mapPacienteFromApi(data: any): Paciente {
  return {
    pac_codigo: data.pacCodigo || data.pac_codigo,
    pac_codusu: data.pacCodusu || data.pac_codusu,
    pac_titular: data.pacTitular ?? data.pac_titular,
    pac_codpac: data.pacCodpac || data.pac_codpac,
    pac_codpar: data.pacCodpar || data.pac_codpar,
    parentesco_descripcion: data.parentescoDescripcion || data.parentesco_descripcion,
    pac_primer_nombre: data.pacPrimerNombre || data.pac_primer_nombre,
    pac_segundo_nombre: data.pacSegundoNombre || data.pac_segundo_nombre,
    pac_primer_apellido: data.pacPrimerApellido || data.pac_primer_apellido,
    pac_segundo_apellido: data.pacSegundoApellido || data.pac_segundo_apellido,
    pac_apellido_casado: data.pacApellidoCasado || data.pac_apellido_casado,
    pac_fecha_nacimiento: data.pacFechaNacimiento || data.pac_fecha_nacimiento,
    pac_genero: data.pacGenero || data.pac_genero,
    pac_tipo_sangre: data.pacTipoSangre || data.pac_tipo_sangre,
    pac_ocupacion: data.pacOcupacion || data.pac_ocupacion,
    pac_foto_perfil_url: data.pacFotoPerfilUrl || data.pac_foto_perfil_url,
    pac_foto_carne_seguro: data.pacFotoCarneSeguro || data.pac_foto_carne_seguro,
    pac_pais_nac_id: data.pacPaisNacId || data.pac_pais_nac_id,
    pac_dep_nac_id: data.pacDepNacId || data.pac_dep_nac_id,
    pac_mun_nac_id: data.pacMunNacId || data.pac_mun_nac_id,
    pac_pais_dir_id: data.pacPaisDirId || data.pac_pais_dir_id,
    pac_dep_dir_id: data.pacDepDirId || data.pac_dep_dir_id,
    pac_mun_dir_id: data.pacMunDirId || data.pac_mun_dir_id,
    pac_aldea: data.pacAldea || data.pac_aldea,
    pac_zona: data.pacZona || data.pac_zona,
    pac_colonia: data.pacColonia || data.pac_colonia,
    pac_avenida: data.pacAvenida || data.pac_avenida,
    pac_calle: data.pacCalle || data.pac_calle,
    pac_numero_casa: data.pacNumeroCasa || data.pac_numero_casa,
    pac_celular: data.pacCelular || data.pac_celular,
    pac_telefono_casa: data.pacTelefonoCasa || data.pac_telefono_casa,
    pac_telefono_trabajo: data.pacTelefonoTrabajo || data.pac_telefono_trabajo,
  };
}

/**
 * Obtiene los pacientes asociados a un usuario.
 *
 * Proxy: GET /api/pacientes/perfil
 */
export async function fetchPacientesByUsuario(token: string): Promise<Paciente[]> {
  const { data } = await expedientesApi.get<Paciente | Paciente[]>(
    '/api/pacientes/perfil',
    getAuthHeaders(token),
  );

  if (!data) return [];
  const items = Array.isArray(data) ? data : [data];
  return items.map(mapPacienteFromApi);
}

/**
 * Obtiene todos los pacientes.
 *
 * Proxy: GET /api/pacientes
 */
export async function fetchPacientes(token: string): Promise<Paciente[]> {
  const { data } = await expedientesApi.get<Paciente | Paciente[]>(
    '/api/pacientes',
    getAuthHeaders(token),
  );

  if (!data) return [];
  const items = Array.isArray(data) ? data : [data];
  return items.map(mapPacienteFromApi);
}

/**
 * Obtiene un paciente por su código.
 *
 * Proxy: GET /api/pacientes/{pacCodigo}
 */
export async function fetchPacienteByCode(token: string, pacCodigo: string): Promise<Paciente> {
  const { data } = await expedientesApi.get<Paciente | Paciente[]>(
    `/api/pacientes/${pacCodigo}`,
    getAuthHeaders(token),
  );

  if (Array.isArray(data)) {
    if (data.length === 0) {
      throw new Error('No se encontró el paciente solicitado.');
    }
    return mapPacienteFromApi(data[0]);
  }

  return mapPacienteFromApi(data);
}

/**
 * Crea un nuevo paciente titular.
 *
 * Proxy: POST /api/pacientes
 */
export async function createPaciente(token: string, body: Partial<Paciente>): Promise<Paciente> {
  const { data } = await expedientesApi.post<Paciente>(
    '/api/pacientes',
    body,
    getAuthHeaders(token),
  );

  return mapPacienteFromApi(data);
}

/**
 * Actualiza un paciente existente.
 *
 * Proxy: PUT /api/pacientes/{pacCodigo}
 */
export async function updatePaciente(token: string, pacCodigo: string, body: FormData): Promise<Paciente> {
  const authHeaders = getAuthHeaders(token).headers as any;

  const { data } = await expedientesApi.put<Paciente>(
    `/api/pacientes/${pacCodigo}`,
    body,
    {
      headers: {
        Authorization: authHeaders.Authorization,
        'Content-Type': undefined, // Let Axios set multipart/form-data with correct boundary
      },
    }
  );

  return mapPacienteFromApi(data);
}

/**
 * Crea un paciente dependiente asociado a un titular.
 *
 * Proxy: POST /api/pacientes/dependiente?titularCodigo={guid}&codParentesco={int}
 */
export async function createDependiente(
  token: string,
  body: FormData,
): Promise<Paciente> {
  const authHeaders = getAuthHeaders(token).headers as any;

  const { data } = await expedientesApi.post<Paciente>(
    '/api/pacientes/dependiente',
    body,
    {
      headers: {
        Authorization: authHeaders.Authorization,
        'Content-Type': undefined, // Let Axios set multipart/form-data with correct boundary
      },
    }
  );

  return mapPacienteFromApi(data);
}

/**
 * Elimina una cuenta titular (soft delete) o un dependiente.
 *
 * Proxy: DELETE /api/pacientes/cuenta o /api/pacientes/dependiente/{pacCodigo}
 */
export async function deletePaciente(
  token: string,
  titular: boolean,
  pacCodigo?: string,
): Promise<{ mensaje: string }> {
  const url = titular ? '/api/pacientes/cuenta' : `/api/pacientes/dependiente/${pacCodigo}`;
  const { data } = await expedientesApi.delete<{ mensaje: string }>(
    url,
    getAuthHeaders(token),
  );

  return data;
}
