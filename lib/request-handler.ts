import Swal, { SweetAlertOptions, SweetAlertResult } from 'sweetalert2';

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
  /** Título principal del modal de carga */
  progressTitle?: string;
  /** Mensaje inicial mientras se procesa */
  initialMessage?: string;
  /** Lista de mensajes progresivos según el tiempo transcurrido */
  customMessages?: ProgressMessage[];
  /** Título del modal cuando la solicitud se completa con éxito */
  successTitle?: string;
  /** Mensaje del modal de éxito */
  successText?: string;
  /** Si debe mostrar modal de éxito automático (default: true) */
  showSuccessSwal?: boolean;
  /** Si debe mostrar modal de error automático al fallar (default: true) */
  showErrorSwal?: boolean;
  /** Permite al usuario cancelar la operación desde el modal (default: true) */
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
  {
    afterMs: 28000,
    text: 'El servidor está tardando en responder...',
    subtext: 'Se realizará un reintento automático si es necesario',
  },
];

/**
 * Determina si un error es transitorio y merece reintento automático.
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;

  // Si fue cancelado por el usuario, no reintentar
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
    // 500, 502, 503, 504, 408 (Request Timeout), 429 (Too Many Requests - esperar)
    if ([408, 429, 500, 502, 503, 504].includes(status)) {
      return true;
    }
    // Errores de cliente (400, 401, 403, 404, 409, 422) NO son reintentables
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

// ─── Wrapper Visual con SweetAlert2 y Mensajes Progresivos ──────────────────

/**
 * Ejecuta una petición mostrando un diálogo SweetAlert2 moderno con:
 * - Indicador de carga animado
 * - Mensajes progresivos que cambian automáticamente según el tiempo
 * - Botón opcional de cancelación
 * - Transición fluida a estado de éxito o error con tono auditivo y háptico
 */
export async function withProgressSwal<T>(
  requestFn: (signal?: AbortSignal) => Promise<T>,
  options: ResilientRequestOptions = {}
): Promise<T> {
  const {
    progressTitle = 'Procesando tu solicitud',
    initialMessage = 'Un momento por favor...',
    customMessages = DEFAULT_PROGRESS_MESSAGES,
    successTitle = '¡Operación Exitosa!',
    successText,
    showSuccessSwal = true,
    showErrorSwal = true,
    cancelable = true,
    cancelButtonText = 'Cancelar espera',
    enableSound = true,
  } = options;

  let isCancelled = false;
  let intervalId: any = null;
  const abortController = new AbortController();

  const startTime = Date.now();

  // Función para actualizar el contenido del modal Swal abierto
  const updateSwalContent = (text: string, subtext?: string) => {
    const titleElem = Swal.getTitle();
    const htmlContainer = Swal.getHtmlContainer();

    if (htmlContainer) {
      htmlContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center text-center space-y-2.5 py-1">
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all duration-300">
            ${text}
          </p>
          ${
            subtext
              ? `<p class="text-xs text-slate-400 dark:text-slate-400 transition-all duration-300">
                  ${subtext}
                </p>`
              : ''
          }
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
            <div class="h-full bg-blue-600 rounded-full animate-pulse w-3/4 mx-auto"></div>
          </div>
        </div>
      `;
    }
  };

  // Abrir Swal de carga con spinner y diseño consistente
  const swalPromise = Swal.fire({
    title: progressTitle,
    html: `
      <div class="flex flex-col items-center justify-center text-center space-y-2.5 py-1">
        <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">
          ${initialMessage}
        </p>
        <p class="text-xs text-slate-400 dark:text-slate-400">
          Conectando con el servidor seguro
        </p>
        <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
          <div class="h-full bg-blue-600 rounded-full animate-pulse w-1/2 mx-auto"></div>
        </div>
      </div>
    `,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    showCancelButton: cancelable,
    cancelButtonText: cancelButtonText,
    customClass: {
      popup: 'rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white max-w-md p-6',
      title: 'text-lg font-black text-slate-900 dark:text-white tracking-tight',
      cancelButton: 'rounded-xl font-bold px-5 py-2.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition active:scale-95 cursor-pointer mt-2',
    },
    didOpen: () => {
      Swal.showLoading(Swal.getCancelButton() as any);

      // Iniciar el temporizador para rotar mensajes según tiempo transcurrido
      let lastMessageIndex = 0;
      intervalId = setInterval(() => {
        const elapsed = Date.now() - startTime;
        // Encontrar el mensaje más reciente según elapsed
        for (let i = customMessages.length - 1; i >= 0; i--) {
          if (elapsed >= customMessages[i].afterMs) {
            if (lastMessageIndex !== i) {
              lastMessageIndex = i;
              updateSwalContent(customMessages[i].text, customMessages[i].subtext);
            }
            break;
          }
        }
      }, 1000);
    },
  });

  // Manejar si el usuario presiona el botón cancelar
  swalPromise.then((result: SweetAlertResult) => {
    if (result.dismiss === Swal.DismissReason.cancel) {
      isCancelled = true;
      abortController.abort();
    }
  });

  try {
    // Ejecutar la petición con soporte de reintentos
    const result = await resilientRequest(
      async (signal, attempt) => {
        if (isCancelled) {
          const err = new Error('Operación cancelada por el usuario.');
          (err as any).isCancelled = true;
          throw err;
        }
        return await requestFn(abortController.signal);
      },
      options,
      (text, subtext) => {
        updateSwalContent(text, subtext);
      }
    );

    clearInterval(intervalId);

    if (isCancelled) {
      const err = new Error('Operación cancelada por el usuario.');
      (err as any).isCancelled = true;
      throw err;
    }

    // Modal de éxito
    if (showSuccessSwal) {
      if (enableSound) {
        playSuccessChime();
      }

      await Swal.fire({
        icon: 'success',
        title: successTitle,
        text: successText || 'La solicitud se completó correctamente.',
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'Continuar',
        customClass: {
          popup: 'rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white max-w-md p-6',
          title: 'text-lg font-black text-slate-900 dark:text-white tracking-tight',
          confirmButton: 'rounded-xl font-bold px-6 py-2.5 text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-md transition active:scale-95 cursor-pointer',
        },
      });
    } else {
      Swal.close();
      if (enableSound) {
        playSuccessChime();
      }
    }

    return result;
  } catch (error: any) {
    clearInterval(intervalId);

    if (error?.isCancelled || isCancelled) {
      Swal.close();
      throw error;
    }

    if (enableSound) {
      playErrorChime();
    }

    if (showErrorSwal) {
      const errorMsg = extractErrorMessage(error);
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo completar la solicitud',
        text: errorMsg,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Entendido',
        customClass: {
          popup: 'rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white max-w-md p-6',
          title: 'text-lg font-black text-slate-900 dark:text-white tracking-tight',
          confirmButton: 'rounded-xl font-bold px-6 py-2.5 text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-md transition active:scale-95 cursor-pointer',
        },
      });
    } else {
      Swal.close();
    }

    throw error;
  }
}
