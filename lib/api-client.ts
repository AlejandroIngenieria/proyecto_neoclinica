import axios from 'axios';
import type { Pais, Departamento, Municipio } from '@/types';

// ─── Instancias de Axios ─────────────────────────────────────────────────────

/** Cliente para el backend de autenticación y servicios geográficos. */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

/** Cliente para el proxy de expedientes (Next.js API routes). */
export const expedientesApi = axios.create({
  baseURL: '',
  timeout: 30000,
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

// ─── Interceptores con Reintento Transparente ────────────────────────────────

const setupRetryInterceptor = (axiosInstance: typeof api) => {
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config;
      if (!config || config.__isRetry) {
        return Promise.reject(error);
      }

      const status = error.response?.status;
      const isNetworkOrTimeout =
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ERR_NETWORK' ||
        error.message?.includes('Network Error') ||
        error.message?.includes('timeout');

      // Reintentar una vez si es 502, 503, 504 o caída de conexión
      if (isNetworkOrTimeout || status === 502 || status === 503 || status === 504) {
        config.__isRetry = true;
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return axiosInstance(config);
      }

      return Promise.reject(error);
    }
  );
};

setupRetryInterceptor(api);
setupRetryInterceptor(expedientesApi);
