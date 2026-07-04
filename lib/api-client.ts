import axios from 'axios';
import type { Pais, Departamento, Municipio } from '@/types';

// ─── Instancias de Axios ─────────────────────────────────────────────────────

/** Cliente para el backend de autenticación y servicios geográficos. */
export const api = axios.create({
  baseURL: process.env.AUTH_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010',
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

/** Cliente para el proxy de expedientes (Next.js API routes). */
export const expedientesApi = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const getAuthHeaders = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// ─── Servicios geográficos (a través del proxy Next.js) ─────────────────────

function mapPais(data: any): Pais {
  return { pai_codigo: data.paiCodigo ?? data.pai_codigo, pai_descripcion: data.paiDescripcion ?? data.pai_descripcion };
}

function mapDepartamento(data: any): Departamento {
  return { 
    dep_codigo: data.depCodigo ?? data.dep_codigo, 
    dep_codpai: data.depCodpai ?? data.dep_codpai, 
    dep_descripcion: data.depDescripcion ?? data.dep_descripcion 
  };
}

function mapMunicipio(data: any): Municipio {
  return { 
    mun_codigo: data.munCodigo ?? data.mun_codigo, 
    mun_coddep: data.munCoddep ?? data.mun_coddep, 
    mun_descripcion: data.munDescripcion ?? data.mun_descripcion 
  };
}

export const getPaises = () => expedientesApi.get<Pais[]>('/api/paises').then(res => ({ ...res, data: res.data.map?.(mapPais) ?? res.data }));
export const getPaisByCodigo = (paiCodigo: number) => expedientesApi.get<Pais>(`/api/paises/${paiCodigo}`).then(res => ({ ...res, data: mapPais(res.data) }));

export const getDepartamentos = () => expedientesApi.get<Departamento[]>('/api/departamentos').then(res => ({ ...res, data: res.data.map?.(mapDepartamento) ?? res.data }));
export const getDepartamentoByCodigo = (depCodigo: number) => expedientesApi.get<Departamento>(`/api/departamentos/${depCodigo}`).then(res => ({ ...res, data: mapDepartamento(res.data) }));
export const getDepartamentosPorPais = (paiCodigo: number) => expedientesApi.get<Departamento[]>(`/api/departamentos/por-pais/${paiCodigo}`).then(res => ({ ...res, data: res.data.map?.(mapDepartamento) ?? res.data }));

export const getMunicipios = () => expedientesApi.get<Municipio[]>('/api/municipios').then(res => ({ ...res, data: res.data.map?.(mapMunicipio) ?? res.data }));
export const getMunicipioByCodigo = (munCodigo: number) => expedientesApi.get<Municipio>(`/api/municipios/${munCodigo}`).then(res => ({ ...res, data: mapMunicipio(res.data) }));
export const getMunicipiosPorDepartamento = (depCodigo: number) => expedientesApi.get<Municipio[]>(`/api/municipios/por-departamento/${depCodigo}`).then(res => ({ ...res, data: res.data.map?.(mapMunicipio) ?? res.data }));

// ─── Interceptores ───────────────────────────────────────────────────────────

api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Lógica global para expiración de sesión
    }
    return Promise.reject(error);
  },
);
