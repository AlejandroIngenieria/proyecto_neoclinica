import { toast } from 'sonner';

// ─── Web Audio API & Haptic Feedback ─────────────────────────────────────────

/**
 * Genera un sonido sutil y elegante de éxito usando la Web Audio API del navegador
 * sin depender de archivos de audio externos.
 */
export function playSuccessChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Tono 1 (C6 - 1046.5 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tono 2 (E6 - 1318.5 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, now + 0.08);
    gain2.gain.setValueAtTime(0.08, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.35);

    // Vibración háptica en dispositivos móviles
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 30, 40]);
    }
  } catch {
    // Silencioso si el navegador bloquea audio por falta de interacción
  }
}

/**
 * Genera un tono sutil de advertencia/error.
 */
export function playErrorChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([80, 50, 80]);
    }
  } catch {}
}

// ─── Tipos y Configuración ───────────────────────────────────────────────────

export interface ProgressMessage {
  afterMs: number;
  text: string;
  subtext?: string;
}

export interface ResilientRequestOptions {
  /** Número máximo de reintentos en errores transitorios (default: 2) */
  maxRetries?: number;
  /** Tiempo base en ms para backoff exponencial (default: 1500) */
  retryDelayMs?: number;
  /** Título principal del proceso */
  progressTitle?: string;
  /** Mensaje inicial mientras se procesa */
  initialMessage?: string;
  /** Lista de mensajes progresivos según el tiempo transcurrido */
  customMessages?: ProgressMessage[];
  /** Título de la notificación de éxito */
  successTitle?: string;
  /** Mensaje de la notificación de éxito */
  successText?: string;
  /** Si debe mostrar notificación de éxito (default: true) */
  showSuccessToast?: boolean;
  /** Alias retrocompatible para showSuccessToast */
  showSuccessSwal?: boolean;
  /** Si debe mostrar notificación de error al fallar (default: true) */
  showErrorToast?: boolean;
  /** Alias retrocompatible para showErrorToast */
  showErrorSwal?: boolean;
  /** Permite al usuario cancelar la operación (default: true) */
  cancelable?: boolean;
  /** Texto del botón cancelar */
  cancelButtonText?: string;
  /** Reproducir sonido y vibración al finalizar con éxito (default: true) */
  enableSound?: boolean;
}

// Mensajes progresivos predeterminados
const DEFAULT_PROGRESS_MESSAGES: ProgressMessage[] = [
  {
    afterMs: 0,
    text: 'Procesando tu solicitud...',
    subtext: 'Conectando con el servidor seguro',
  },
  {
    afterMs: 4000,
    text: 'Un momento, estamos procesando los datos...',
    subtext: 'El servidor está trabajando en tu solicitud',
  },
  {
    afterMs: 10000,
    text: 'Esto está tomando unos segundos más de lo habitual...',
    subtext: 'Optimizando la respuesta de los recursos compartidos',
  },
  {
    afterMs: 18000,
    text: 'Seguimos trabajando en tu solicitud...',
    subtext: 'Gracias por tu paciencia, no cierres esta ventana',
  },
];

/**
 * Determina si un error es transitorio y merece reintento automático.
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;

  if (error.name === 'AbortError' || error.isCancelled) {
    return false;
  }

  // Error de red o timeout
  if (
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ERR_NETWORK' ||
    error.message?.includes('Network Error') ||
    error.message?.includes('Failed to fetch') ||
    error.message?.includes('timeout')
  ) {
    return true;
  }

  // Status HTTP del backend
  const status = error.status || error.response?.status;
  if (status) {
    if ([408, 429, 500, 502, 503, 504].includes(status)) {
      return true;
    }
    if (status >= 400 && status < 500) {
      return false;
    }
  }

  return false;
}

/**
 * Extrae un mensaje de error legible para el usuario.
 */
export function extractErrorMessage(error: any): string {
  if (!error) return 'Ocurrió un error inesperado al procesar la solicitud.';
  if (typeof error === 'string') return error;

  if (error.response?.data) {
    const data = error.response.data;
    if (typeof data === 'string') return data;
    if (data.mensaje) return data.mensaje;
    if (data.message) return data.message;
    if (data.error) return data.error;
    if (data.title) return data.title;
    if (data.detail) return data.detail;
  }

  if (error.message) {
    if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
      return 'No se pudo contactar al servidor. Por favor verifica tu conexión a internet o intenta nuevamente.';
    }
    return error.message;
  }

  return 'Ocurrió un error al procesar tu solicitud.';
}

// ─── Ejecutor Resiliente con Reintentos ───────────────────────────────────────

/**
 * Ejecuta una función asíncrona con reintentos automáticos y backoff exponencial
 * para errores transitorios de red o servidor.
 */
export async function resilientRequest<T>(
  requestFn: (signal?: AbortSignal, attempt?: number) => Promise<T>,
  options: ResilientRequestOptions = {},
  onProgressUpdate?: (text: string, subtext?: string, attempt?: number) => void
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 1500;

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      if (attempt > 1 && onProgressUpdate) {
        onProgressUpdate(
          `Reintentando solicitud (intento ${attempt} de ${maxRetries + 1})...`,
          'Estableciendo conexión con el servidor...'
        );
      }

      const result = await requestFn(undefined, attempt);
      return result;
    } catch (error: any) {
      lastError = error;

      if (error?.isCancelled) {
        throw error;
      }

      const canRetry = attempt <= maxRetries && isRetryableError(error);

      if (!canRetry) {
        throw error;
      }

      // Esperar con backoff exponencial antes de reintentar
      const delay = retryDelayMs * Math.pow(1.5, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ─── Wrapper de Ejecución con Toasts Laterales ───────────────────────────────

/**
 * Ejecuta una petición mostrando notificaciones laterales profesionales (toasts)
 * sin interrumpir el flujo innecesariamente con modales de carga o éxito.
 */
export async function withProgress<T>(
  requestFn: (signal?: AbortSignal) => Promise<T>,
  options: ResilientRequestOptions = {}
): Promise<T> {
  const {
    successTitle = '¡Operación Exitosa!',
    successText,
    showSuccessToast = true,
    showSuccessSwal = true,
    showErrorToast = true,
    showErrorSwal = true,
    enableSound = true,
  } = options;

  const shouldShowSuccess = showSuccessToast && showSuccessSwal;
  const shouldShowError = showErrorToast && showErrorSwal;

  try {
    const result = await resilientRequest(
      async (signal) => {
        return await requestFn(signal);
      },
      options
    );

    if (enableSound) {
      playSuccessChime();
    }

    if (shouldShowSuccess) {
      toast.success(successTitle, {
        description: successText || 'La solicitud se completó correctamente.',
      });
    }

    return result;
  } catch (error: any) {
    if (error?.isCancelled) {
      throw error;
    }

    if (enableSound) {
      playErrorChime();
    }

    if (shouldShowError) {
      const errorMsg = extractErrorMessage(error);
      toast.error('No se pudo completar la solicitud', {
        description: errorMsg,
      });
    }

    throw error;
  }
}

/**
 * Alias retrocompatible para withProgress (reemplazo sin SweetAlert2)
 */
export const withProgressSwal = withProgress;
