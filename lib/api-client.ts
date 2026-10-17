import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { Pais, Departamento, Municipio } from '@/types';

// ─── Token en Memoria (In-Memory Token Storage) ──────────────────────────────
let inMemoryAccessToken: string | null = null;

export const setInMemoryToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

export const getInMemoryToken = (): string | null => {
  return inMemoryAccessToken;
};

// ─── Instancias de Axios ─────────────────────────────────────────────────────

/** Cliente para el backend de autenticación y servicios clínicos de NeoClínica. */
export const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://salud-ya-api-eqcvg0eggvg6axed.canadacentral-01.azurewebsites.net'
      : 'http://localhost:5010'),
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

/** Cliente para el proxy de expedientes (Next.js API routes locales). */
export const expedientesApi = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Helpers de Autenticación ────────────────────────────────────────────────

export const getAuthHeaders = (token?: string | null) => ({
  headers: (token || inMemoryAccessToken)
    ? { Authorization: `Bearer ${token || inMemoryAccessToken}` }
    : {},
});

// ─── Request Interceptor: Adjuntar Token en Memoria ──────────────────────────

api.interceptors.request.use((config) => {
  if (!config.headers.Authorization && inMemoryAccessToken) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  return config;
});

// ─── Cola de Peticiones y Control de Refresco Concurrente (Mutex) ────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
  config: InternalAxiosRequestConfig;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else {
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      resolve(api(config));
    }
  });
  failedQueue = [];
};

// ─── Response Interceptor: Refresco Transparente 401 y Reintento de Red ───────

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _isRetry401?: boolean; __isRetry?: boolean }) | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const url = originalRequest.url || '';
    const isAuthEndpoint = url.includes('/api/Autenticacion/login') || url.includes('/api/Autenticacion/refresh');

    // 1. Refresco Silencioso y Transparente ante HTTP 401 Unauthorized
    if (status === 401 && !originalRequest._isRetry401 && !isAuthEndpoint) {
      if (isRefreshing) {
        // Encolar peticiones salientes si ya hay un proceso de refresco activo
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._isRetry401 = true;
      isRefreshing = true;

      try {
        const refreshUrl = `${api.defaults.baseURL}/api/Autenticacion/refresh`;
        const { data } = await axios.post<{ token: string }>(
          refreshUrl,
          {},
          { withCredentials: true }
        );

        const newAccessToken = data.token;
        setInMemoryToken(newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        setInMemoryToken(null);

        // Notificar al frontend si la sesión fue irrevocablemente cerrada/expirada
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('saludya:session-expired'));
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 2. Reintento Transparente ante Fallos de Red o Códigos Transitorios (502, 503, 504)
    const isNetworkOrTimeout =
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ERR_NETWORK' ||
      error.message?.includes('Network Error') ||
      error.message?.includes('timeout');

    if (!originalRequest.__isRetry && (isNetworkOrTimeout || status === 502 || status === 503 || status === 504)) {
      originalRequest.__isRetry = true;
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

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
