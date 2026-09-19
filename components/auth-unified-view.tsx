'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Calendar,
  X,
  ShieldCheck,
  AlertCircle,
  Info,
  Mail,
  Lock,
  Stethoscope,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { useGoogleLogin, type TokenResponse } from '@react-oauth/google';
import FacebookLogin, { type FailResponse, type SuccessResponse } from '@greatsumini/react-facebook-login';
import { SocialButton } from '@/components/base/buttons/social-button';
import { EmailAutocompleteInput } from '@/components/email-autocomplete-input';
import { CapsLockWarning } from '@/components/caps-lock-warning';
import { AuthErrorModal } from '@/components/auth-error-modal';
import { useCapsLock } from '@/hooks/use-caps-lock';
import {
  getRememberedEmail,
  setRememberedEmail,
  deleteRememberedEmail,
  saveEmailToHistory,
} from '@/lib/email-history';

import {
  loginSchema,
  recoverySchema,
  registerSchema,
  type LoginFormValues,
  type RecoveryFormValues,
  type RegisterFormValues,
} from '@/lib/validations/auth';
import { withProgress } from '@/lib/request-handler';
import SessionReloginModal, { type SessionReauthReason } from '@/components/session-relogin-modal';

interface AuthUnifiedViewProps {
  initialTab?: 'login' | 'register';
}

export default function AuthUnifiedView({ initialTab = 'login' }: AuthUnifiedViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const reasonParam = searchParams.get('reason');
  const tabParam = searchParams.get('tab');

  const reauthReason: SessionReauthReason | null =
    reasonParam === 'login-required' || reasonParam === 'session-expired' || reasonParam === 'auth-error'
      ? reasonParam
      : null;

  // Single card mode: 'login' | 'register'
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(() => {
    if (tabParam === 'register' || initialTab === 'register') return 'register';
    return 'login';
  });

  // Login subview: 'login' | 'recovery'
  const [loginView, setLoginView] = useState<'login' | 'recovery'>('login');

  // Register steps: 1 (Datos Personales) | 2 (Cuenta y Seguridad)
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);

  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Feedback states
  const [loginAuthError, setLoginAuthError] = useState('');
  const [loginStatusText, setLoginStatusText] = useState('');
  const [recoveryNotice, setRecoveryNotice] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Social login loading & retry feedback
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const [fbAttempts, setFbAttempts] = useState(0);
  const isProcessingTokenRef = useRef(false);
  const popupOpenTimeRef = useRef<number>(0);
  const popupWindowRef = useRef<Window | null>(null);

  const resetSocialState = useCallback(() => {
    if (isProcessingTokenRef.current) return;
    setSocialLoading(null);
    setLoginStatusText('');
  }, []);

  // Clean up expired session if reasonParam is present
  useEffect(() => {
    if (reasonParam) {
      signOut({ redirect: false });
    }
  }, [reasonParam]);

  // Update tab if URL param changes
  useEffect(() => {
    if (tabParam === 'register') {
      setActiveTab('register');
    } else if (tabParam === 'login') {
      setActiveTab('login');
    }
  }, [tabParam]);

  // Max birthdate for 18+ years
  const today = new Date();
  const maxBirthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
    .toISOString()
    .split('T')[0];

  // ─── LOGIN FORM ─────────────────────────────────────────────────────────────
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    getValues: getLoginValues,
    setValue: setValueLogin,
    formState: { errors: loginErrors, isSubmitting: isLoginSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { correo: '', password: '' },
    mode: 'onTouched',
  });

  const [rememberMe, setRememberMe] = useState(true);
  const hasLoadedCookieRef = useRef(false);

  // Detección de Bloq Mayús (Caps Lock)
  const {
    isCapsLockOn: isLoginCapsLock,
    checkCapsLock: checkLoginCapsLock,
    resetCapsLock: resetLoginCapsLock,
  } = useCapsLock();

  const {
    isCapsLockOn: isRegCapsLock,
    checkCapsLock: checkRegCapsLock,
    resetCapsLock: resetRegCapsLock,
  } = useCapsLock();

  // Leer y autocompletar correo guardado (Cookie + LocalStorage) al cargar la vista (solo una vez)
  useEffect(() => {
    if (hasLoadedCookieRef.current) return;
    hasLoadedCookieRef.current = true;
    const savedEmail = getRememberedEmail();
    // Si fue el correo de prueba temporal, limpiar
    if (savedEmail === 'paciente.demo@saludya.com') {
      deleteRememberedEmail();
      return;
    }
    if (savedEmail) {
      setValueLogin('correo', savedEmail);
      setRememberMe(true);
    }
  }, [setValueLogin]);

  // Auto-focus inteligente según contexto y estado de datos
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'login') {
        if (loginView === 'login') {
          const savedEmail = getRememberedEmail();
          if (savedEmail) {
            document.getElementById('login_password')?.focus();
          } else {
            document.getElementById('login_correo')?.focus();
          }
        } else if (loginView === 'recovery') {
          document.getElementById('recovery_correo')?.focus();
        }
      } else if (activeTab === 'register') {
        if (registerStep === 1) {
          document.getElementById('reg_primerNombre')?.focus();
        } else if (registerStep === 2) {
          document.getElementById('reg_fechaNacimiento')?.focus();
        }
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [activeTab, loginView, registerStep]);

  const onLoginSubmit = async (values: LoginFormValues) => {
    setLoginAuthError('');
    setLoginStatusText('');

    // Guardar o eliminar correo de Cookie + LocalStorage según preferencia
    if (rememberMe && values.correo) {
      setRememberedEmail(values.correo.trim(), 30);
    } else {
      deleteRememberedEmail();
    }

    const maxAttempts = 3;
    let lastError = '';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (attempt > 1) {
          setLoginStatusText(`Conectando con el servidor (intento ${attempt} de ${maxAttempts})...`);
        }

        const result = await signIn('credentials', {
          redirect: false,
          correo: values.correo,
          password: values.password,
        });

        if (result?.ok) {
          // Guardar en historial de cuentas recientes usadas exitosamente
          saveEmailToHistory(values.correo);
          setLoginStatusText('¡Inicio de sesión exitoso! Redirigiendo...');
          try {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('neoclinica_random_seed', String(Math.floor(Math.random() * 1000000) + 1));
            }
          } catch {}

          const returnUrl = searchParams.get('returnUrl') || searchParams.get('callbackUrl');
          router.replace(returnUrl || '/dashboard');
          return;
        }

        if (result?.error) {
          lastError = result.error;
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 1000 * attempt));
            continue;
          }
        }
      } catch {
        lastError = 'NetworkError';
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }
      }
    }

    setLoginStatusText('');
    setLoginAuthError(
      lastError === 'CredentialsSignin'
        ? 'Credenciales inválidas o correo no registrado.'
        : 'No se pudo contactar al servidor de autenticación. Revisa tu conexión o intenta de nuevo.',
    );
  };

  // ─── GOOGLE LOGIN ──────────────────────────────────────────────────────────
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse: TokenResponse) => {
      isProcessingTokenRef.current = true;

      if (!tokenResponse.access_token) {
        isProcessingTokenRef.current = false;
        resetSocialState();
        setLoginAuthError('No se recibió la autorización de Google.');
        return;
      }

      setLoginAuthError('');
      setLoginStatusText('Autenticando con Google...');

      const timer1 = setTimeout(() => {
        setLoginStatusText('Conectando con el servidor de autenticación...');
      }, 3000);

      const timer2 = setTimeout(() => {
        setLoginStatusText('Iniciando recursos compartidos del servidor, un momento...');
      }, 8000);

      try {
        const result = await signIn('credentials', {
          redirect: false,
          googleAccessToken: tokenResponse.access_token,
        });

        clearTimeout(timer1);
        clearTimeout(timer2);

        if (result?.ok) {
          setLoginStatusText('¡Inicio de sesión exitoso! Redirigiendo...');
          try {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('neoclinica_random_seed', String(Math.floor(Math.random() * 1000000) + 1));
            }
          } catch {}

          const returnUrl = searchParams.get('returnUrl') || searchParams.get('callbackUrl');
          router.replace(returnUrl || '/dashboard');
          return;
        }

        isProcessingTokenRef.current = false;
        resetSocialState();
        setLoginAuthError(result?.error ? 'Error de autenticación con Google.' : 'Credenciales inválidas de Google.');
      } catch {
        clearTimeout(timer1);
        clearTimeout(timer2);
        isProcessingTokenRef.current = false;
        resetSocialState();
        setLoginAuthError('No se pudo contactar al servidor de autenticación.');
      }
    },
    onError: (errorResponse) => {
      console.warn('Google login popup cerrado o con error:', errorResponse);
      if (!isProcessingTokenRef.current) {
        resetSocialState();
      }
    },
    onNonOAuthError: (nonOAuthError) => {
      console.warn('Google login non-OAuth error (popup cerrado o bloqueado):', nonOAuthError);
      if (!isProcessingTokenRef.current) {
        resetSocialState();
        if (nonOAuthError?.type === 'popup_failed_to_open') {
          setLoginAuthError('El navegador bloqueó la ventana emergente de Google. Por favor, habilita las ventanas emergentes en tu navegador.');
        }
      }
    },
  });

  // ─── FACEBOOK LOGIN ────────────────────────────────────────────────────────
  const handleFacebookSuccess = async (response: SuccessResponse) => {
    isProcessingTokenRef.current = true;

    if (!response.accessToken) {
      isProcessingTokenRef.current = false;
      resetSocialState();
      setLoginAuthError('No se recibió el token de acceso de Facebook.');
      return;
    }

    setLoginAuthError('');
    setLoginStatusText('Autenticando con Facebook...');

    const timer1 = setTimeout(() => {
      setLoginStatusText('Conectando con el servidor de autenticación...');
    }, 3000);

    const timer2 = setTimeout(() => {
      setLoginStatusText('Iniciando recursos del servidor, un momento...');
    }, 8000);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        facebookAccessToken: response.accessToken,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (result?.ok) {
        setLoginStatusText('¡Inicio de sesión exitoso! Redirigiendo...');
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('neoclinica_random_seed', String(Math.floor(Math.random() * 1000000) + 1));
          }
        } catch {}

        const returnUrl = searchParams.get('returnUrl') || searchParams.get('callbackUrl');
        router.replace(returnUrl || '/dashboard');
        return;
      }

      isProcessingTokenRef.current = false;
      resetSocialState();
      setLoginAuthError(result?.error ? 'Error de autenticación con Facebook.' : 'Credenciales inválidas de Facebook.');
    } catch {
      clearTimeout(timer1);
      clearTimeout(timer2);
      isProcessingTokenRef.current = false;
      resetSocialState();
      setLoginAuthError('No se pudo contactar al servidor de autenticación.');
    }
  };

  // Interceptar window.open para rastrear de forma nativa cuando la ventana emergente es cerrada
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalOpen = window.open;
    window.open = function (...args) {
      const popup = originalOpen.apply(window, args);
      popupWindowRef.current = popup;

      if (popup && typeof popup === 'object') {
        const pollInterval = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(pollInterval);
              if (!isProcessingTokenRef.current) {
                resetSocialState();
              }
            }
          } catch {
            // Restricción COOP del navegador: limpiar intervalo y delegar a los eventos de foco y visibilidad
            clearInterval(pollInterval);
          }
        }, 350);

        setTimeout(() => clearInterval(pollInterval), 25000);
      }

      return popup;
    };

    return () => {
      window.open = originalOpen;
    };
  }, [resetSocialState]);

  // Monitor multicanal: foco de ventana, cambio de visibilidad e interacción para detectar cierre del popup
  useEffect(() => {
    if (!socialLoading) return;

    let checkTimer: NodeJS.Timeout | null = null;

    const handleReturnToTab = () => {
      // Ignorar rebotes de foco en los primeros 700ms tras abrir la ventana
      const elapsed = Date.now() - popupOpenTimeRef.current;
      if (elapsed < 700) return;

      if (checkTimer) clearTimeout(checkTimer);

      checkTimer = setTimeout(() => {
        // Solo desbloquear si el proveedor NO entregó credenciales válidas que estemos autenticando
        if (!isProcessingTokenRef.current) {
          if (socialLoading === 'facebook') {
            try {
              if (typeof window !== 'undefined' && (window as any).FB) {
                (window as any).FB.getLoginStatus((res: any) => {
                  if (res.status !== 'connected' && !isProcessingTokenRef.current) {
                    resetSocialState();
                  }
                });
                return;
              }
            } catch {}
          }
          resetSocialState();
        }
      }, 600);
    };

    // Si el usuario hace clic o interactúa en la pestaña principal tras haber abierto el popup
    const handleUserInteraction = () => {
      const elapsed = Date.now() - popupOpenTimeRef.current;
      if (elapsed > 1000 && !isProcessingTokenRef.current) {
        resetSocialState();
      }
    };

    window.addEventListener('focus', handleReturnToTab);
    document.addEventListener('visibilitychange', handleReturnToTab);
    window.addEventListener('pointerdown', handleUserInteraction);

    // Timeout de seguridad máximo (15s): garantiza que la interfaz NUNCA quede bloqueada
    const maxSafetyTimer = setTimeout(() => {
      if (!isProcessingTokenRef.current) {
        resetSocialState();
      }
    }, 15000);

    return () => {
      if (checkTimer) clearTimeout(checkTimer);
      clearTimeout(maxSafetyTimer);
      window.removeEventListener('focus', handleReturnToTab);
      document.removeEventListener('visibilitychange', handleReturnToTab);
      window.removeEventListener('pointerdown', handleUserInteraction);
    };
  }, [socialLoading, resetSocialState]);

  // ─── RECOVERY FORM ─────────────────────────────────────────────────────────
  const {
    register: registerRecovery,
    handleSubmit: handleRecoverySubmit,
    setValue: setRecoveryValue,
    formState: { errors: recoveryErrors, isSubmitting: isRecoverySubmitting },
  } = useForm<RecoveryFormValues>({
    resolver: zodResolver(recoverySchema),
    defaultValues: { correo: '', nuevaPassword: '' },
    mode: 'onTouched',
  });

  const onRecoverPassword = async (values: RecoveryFormValues) => {
    setLoginAuthError('');
    setRecoveryNotice('');

    try {
      const response = await fetch('/api/autenticacion/solicitar-recuperacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const contentType = response.headers.get('content-type') ?? '';
      const responseBody = contentType.includes('application/json') ? await response.json() : await response.text();

      if (response.status === 429) {
        setLoginAuthError('Has realizado varios intentos recientemente. Por favor espera unos minutos antes de solicitar otro enlace.');
        return;
      }

      if (!response.ok) {
        const errorMessage = typeof responseBody === 'string' ? responseBody : responseBody?.mensaje || 'Error al solicitar recuperación.';
        setLoginAuthError(errorMessage);
        return;
      }

      setRecoveryNotice('Si el correo está registrado, te hemos enviado un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o carpeta de spam.');
    } catch {
      setLoginAuthError('No se pudo contactar al servidor. Intenta de nuevo.');
    }
  };

  const switchToRecovery = () => {
    setLoginAuthError('');
    setRecoveryNotice('');
    const typedEmail = getLoginValues('correo')?.trim() || '';
    if (typedEmail) {
      setRecoveryValue('correo', typedEmail);
    }
    setLoginView('recovery');
  };

  const backToLogin = () => {
    setLoginAuthError('');
    setRecoveryNotice('');
    setLoginView('login');
  };

  // ─── REGISTER FORM ─────────────────────────────────────────────────────────
  const {
    register: registerPatient,
    handleSubmit: handleRegisterSubmit,
    watch: watchRegister,
    trigger: triggerRegister,
    reset: resetRegister,
    formState: { errors: registerErrors, isSubmitting: isRegisterSubmitting, isValid: isRegisterValid },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    shouldUnregister: false,
    defaultValues: {
      primerNombre: '',
      segundoNombre: '',
      primerApellido: '',
      segundoApellido: '',
      apellidoCasado: '',
      fechaNacimiento: '',
      correo: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  const watchRegPassword = watchRegister('password') || '';
  const hasLength = watchRegPassword.length >= 8 && watchRegPassword.length <= 15;
  const hasUpperCase = /[A-Z]/.test(watchRegPassword);
  const hasLowerCase = /[a-z]/.test(watchRegPassword);
  const hasNumber = /\d/.test(watchRegPassword);
  const hasSpecialChar = /[%&@\-_]/.test(watchRegPassword);
  const isRegPasswordValid = hasLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

  const handleNextRegisterStep = async () => {
    const isStep1Valid = await triggerRegister([
      'primerNombre',
      'segundoNombre',
      'primerApellido',
      'segundoApellido',
      'apellidoCasado',
    ]);
    if (isStep1Valid) {
      setRegisterStep(2);
    }
  };

  const onPatientRegister = async (values: RegisterFormValues) => {
    try {
      await withProgress(
        async () => {
          const response = await fetch('/api/autenticacion/registrar-paciente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              correo: values.correo,
              password: values.password,
              primerNombre: values.primerNombre,
              segundoNombre: values.segundoNombre || '',
              primerApellido: values.primerApellido,
              segundoApellido: values.segundoApellido || '',
              apellidoCasado: values.apellidoCasado || '',
              fechaNacimiento: values.fechaNacimiento,
            }),
          });

          const contentType = response.headers.get('content-type') ?? '';
          const responseBody = contentType.includes('application/json')
            ? await response.json()
            : await response.text();

          if (!response.ok) {
            const errorMessage =
              typeof responseBody === 'string'
                ? responseBody
                : responseBody?.mensaje || responseBody?.message || 'Error al registrar la cuenta.';
            throw new Error(errorMessage);
          }

          return responseBody;
        },
        {
          progressTitle: 'Creando tu Cuenta',
          initialMessage: 'Registrando tus datos como paciente en NeoClínica...',
          successTitle: '¡Registro Exitoso!',
          successText: 'Tu cuenta de paciente ha sido creada correctamente. Ahora puedes iniciar sesión.',
        },
      );

      toast.success('¡Cuenta creada con éxito! Inicia sesión con tus credenciales.');
      resetRegister();
      setRegisterStep(1);
      setActiveTab('login');
      setLoginView('login');
      // Autocompletar y guardar para facilitar el inicio de sesión inmediato
      setValueLogin('correo', values.correo, { shouldValidate: true, shouldDirty: true });
      setRememberedEmail(values.correo.trim(), 30);
      saveEmailToHistory(values.correo);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear la cuenta de paciente';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen w-full bg-[#0B172A] text-white selection:bg-blue-500 selection:text-white relative font-sans overflow-x-hidden lg:overflow-hidden flex flex-col lg:flex-row">
      {/* Re-auth Modal if triggered */}
      <SessionReloginModal
        open={Boolean(reauthReason)}
        reason={reauthReason ?? 'login-required'}
        onClose={() => {
          signOut({ redirect: false }).then(() => {
            window.location.href = '/login';
          });
        }}
        onPrimaryAction={() => {
          signOut({ redirect: false }).then(() => {
            setLoginView('login');
            setActiveTab('login');
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '/login');
            }
          });
        }}
      />

      {/* Terms & Conditions Modal */}
      <AnimatePresence>
        {showTermsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 text-left"
            >
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Términos y Condiciones
                </h3>
              </div>

              <div className="max-h-[60vh] overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pr-2 leading-relaxed">
                <p>
                  Bienvenido a <strong>NeoClínica / SaludYa</strong>. Al acceder a esta plataforma y crear una cuenta, usted acepta cumplir y estar sujeto a los siguientes términos y condiciones de servicio.
                </p>
                <h4 className="font-bold text-slate-800 dark:text-white">1. Confidencialidad y Datos Clínicos</h4>
                <p>
                  Sus registros médicos, citas, recetas y antecedentes se tratan bajo estrictas normas de encriptación de 256 bits y confidencialidad médica conforme a las leyes aplicables en la República de Guatemala.
                </p>
                <h4 className="font-bold text-slate-800 dark:text-white">2. Responsabilidad de Cuenta</h4>
                <p>
                  El usuario es responsable de mantener la seguridad de sus credenciales. Queda prohibido compartir cuentas o utilizar identidades falsas al programar citas médicas o teleconsultas.
                </p>
                <h4 className="font-bold text-slate-800 dark:text-white">3. Políticas de Citas y Turnos</h4>
                <p>
                  Las cancelaciones o reprogramaciones deben realizarse con la debida anticipación. NeoClínica se reserva el derecho de limitar turnos repetitivos en caso de inasistencia reiterada.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition"
                >
                  Entendido y Acepto
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── LADO IZQUIERDO: IMAGEN MÉDICA VERTICAL RECTA 50% ─── */}
      <div className="hidden lg:block w-full lg:w-1/2 h-full lg:h-screen relative select-none shrink-0 overflow-hidden">
        <Image
          src="/loginImg.png"
          alt="NeoClínica Atención Médica Especializada"
          fill
          priority
          className="object-cover object-center"
          sizes="50vw"
        />
        {/* Overlay sutil para profundidad y legibilidad del logotipo */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B172A]/40 via-transparent to-[#0B172A]/20 pointer-events-none" />

        {/* Isotipo y Logotipo NeoClínica en esquina superior */}
        <div className="absolute top-8 left-8 xl:top-10 xl:left-10 z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-lg">
            <Stethoscope className="w-5 h-5 text-sky-300" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5 font-sans drop-shadow-md">
              NeoClínica
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </span>
            <p className="text-[11px] font-medium text-blue-100/90 drop-shadow">Salud y Tecnología Integral</p>
          </div>
        </div>
      </div>

      {/* ─── LADO DERECHO: CONTENEDOR OSCURO #0B172A CON TARJETA BLANCA FLOTANTE ─── */}
      <div className="w-full lg:w-1/2 min-h-screen lg:min-h-0 h-full lg:h-screen flex flex-col justify-center items-center bg-[#0B172A] p-4 sm:p-6 lg:p-6 overflow-y-auto relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Resplandores ambientales contenidos sin desbordar el scroll del contenedor */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        </div>

        {/* Header en mobile para pantallas < lg */}
        <div className="lg:hidden flex items-center justify-center gap-2.5 pt-2 pb-4 z-10 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-md">
            <Stethoscope className="w-5 h-5 text-sky-300" />
          </div>
          <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5 font-sans">
            NeoClínica
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </span>
        </div>

        {/* Tarjeta de login: bg-white rounded-[2rem] shadow-2xl p-6 sm:p-8 max-w-md w-full con borde */}
        <div className="w-full max-w-md z-10 my-auto">
          <div className="w-full bg-white text-slate-900 rounded-[2rem] border border-white/60 shadow-2xl p-6 sm:p-8 transition-all">

          {/* Top NeoClínica Brand Icon */}
          <div className="flex justify-center mb-3">
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-md shadow-blue-500/20 flex items-center justify-center transition-transform duration-200 hover:scale-105">
              <Image
                src="/iconNeo.png"
                alt="NeoClínica"
                width={48}
                height={48}
                className="w-full h-full object-contain"
                priority
              />
            </div>
          </div>

          {/* Smooth switch between: LOGIN, RECOVERY, REGISTER */}
          <AnimatePresence mode="wait">
            {activeTab === 'login' ? (
              loginView === 'login' ? (
                /* ═══════════════════════════════════════════════════════════════ */
                /* 1. VISTA: INICIAR SESIÓN                                        */
                /* ═══════════════════════════════════════════════════════════════ */
                <motion.div
                  key="view-login"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-center mb-3.5">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      Iniciar Sesión
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Ingresa a tu cuenta médica de NeoClínica
                    </p>
                  </div>

                  {/* Botones Sociales — estilo unificado: fondo blanco, borde, logo izquierda, texto centrado */}
                  <div className="flex w-full flex-col gap-2.5 mb-3">

                    {/* ── Botón Google (useGoogleLogin directo) ── */}
                    <button
                      type="button"
                      id="google-social-btn"
                      disabled={socialLoading !== null}
                      onClick={() => {
                        if (socialLoading !== null) return;
                        setSocialLoading('google');
                        popupOpenTimeRef.current = Date.now();
                        isProcessingTokenRef.current = false;
                        setLoginAuthError('');
                        setLoginStatusText('Abriendo Google...');
                        handleGoogleLogin();
                      }}
                      className={`
                        group relative flex h-11 w-full items-center rounded-xl
                        border border-slate-200 bg-white
                        shadow-[0_1px_3px_rgba(0,0,0,0.06)]
                        transition-all duration-150
                        ${socialLoading === 'google'
                          ? 'cursor-wait bg-slate-50 opacity-90'
                          : socialLoading !== null
                          ? 'opacity-60 cursor-not-allowed'
                          : 'hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_2px_6px_rgba(0,0,0,0.10)] active:scale-[0.99] active:shadow-none cursor-pointer'
                        }
                      `}
                    >
                      {/* Logo o Spinner a la izquierda */}
                      <span className="absolute left-4 flex items-center">
                        {socialLoading === 'google' ? (
                          <Loader2 className="w-[18px] h-[18px] text-blue-600 animate-spin" />
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4"/>
                            <path d="M12.24 24.0008C15.4764 24.0008 18.2058 22.9382 20.1944 21.1039L16.3274 18.1055C15.2516 18.8375 13.8626 19.252 12.2444 19.252C9.11376 19.252 6.45934 17.1399 5.50693 14.3003H1.51648V17.3912C3.55359 21.4434 7.70278 24.0008 12.24 24.0008Z" fill="#34A853"/>
                            <path d="M5.50253 14.3003C4.99987 12.8099 4.99987 11.1961 5.50253 9.70575V6.61481H1.51649C-0.18551 10.0056 -0.18551 14.0004 1.51649 17.3912L5.50253 14.3003Z" fill="#FBBC04"/>
                            <path d="M12.24 4.74966C13.9508 4.7232 15.6043 5.36697 16.8433 6.54867L20.2694 3.12262C18.1 1.0855 15.2207 -0.034466 12.24 0.000808666C7.70277 0.000808666 3.55359 2.55822 1.51648 6.61481L5.50252 9.70575C6.45052 6.86173 9.10935 4.74966 12.24 4.74966Z" fill="#EA4335"/>
                          </svg>
                        )}
                      </span>
                      {/* Texto centrado en el botón completo */}
                      <span className="w-full text-center text-sm font-semibold text-slate-700">
                        {socialLoading === 'google' ? 'Iniciando con Google...' : 'Continuar con Google'}
                      </span>
                    </button>

                    {/* ── Botón Facebook — mismo estilo unificado ── */}
                    <FacebookLogin
                      appId={process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '4624725251186454'}
                      scope="email,public_profile"
                      onSuccess={handleFacebookSuccess}
                      onFail={(error: FailResponse) => {
                        console.warn('Facebook login status:', error);
                        if (!isProcessingTokenRef.current) {
                          resetSocialState();

                          // Cancelación silenciosa si el usuario cerró la ventana o si el SDK apenas estaba cargando
                          if (error?.status === 'loginCancelled' || error?.status === 'facebookNotLoaded') {
                            return;
                          }
                          setFbAttempts((prev) => prev + 1);

                          if (typeof window !== 'undefined' && window.location.protocol === 'http:') {
                            setLoginAuthError(
                              'Meta (Facebook) exige una conexión segura HTTPS para iniciar sesión con FB.login. Inicia el servidor con HTTPS (npm run dev:https) o pruébalo en producción.'
                            );
                          } else {
                            setLoginAuthError(
                              'No se pudo completar el inicio de sesión con Facebook. Si la app está en modo desarrollo, asegúrate de que tu cuenta de Facebook esté agregada como Tester en Meta for Developers.'
                            );
                          }
                        }
                      }}
                      render={({ onClick }) => (
                        <button
                          type="button"
                          id="facebook-social-btn"
                          disabled={socialLoading !== null}
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            if (socialLoading !== null) return;

                            if (typeof window !== 'undefined' && window.location.protocol === 'http:') {
                              e.preventDefault();
                              e.stopPropagation();
                              setLoginAuthError(
                                'Meta (Facebook) bloquea llamadas a FB.login desde páginas HTTP sin certificado SSL. Para probarlo localmente, inicia Next.js con HTTPS (npm run dev:https).'
                              );
                              return;
                            }

                            setLoginAuthError('');

                            // Llamada sincrónica directa (preserva User Activation para no bloquear el popup)
                            if (typeof window !== 'undefined' && !(window as any).FB) {
                              setLoginAuthError('El servicio de Facebook aún se está cargando. Espera 2 segundos y presiona de nuevo.');
                              return;
                            }

                            setSocialLoading('facebook');
                            popupOpenTimeRef.current = Date.now();
                            isProcessingTokenRef.current = false;
                            setLoginStatusText('Abriendo Facebook...');
                            onClick?.();
                          }}
                          className={`
                            group relative flex h-11 w-full items-center rounded-xl
                            border border-slate-200 bg-white
                            shadow-[0_1px_3px_rgba(0,0,0,0.06)]
                            transition-all duration-150
                            ${socialLoading === 'facebook'
                              ? 'cursor-wait bg-slate-50 opacity-90'
                              : socialLoading !== null
                              ? 'opacity-60 cursor-not-allowed'
                              : 'hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_2px_6px_rgba(0,0,0,0.10)] active:scale-[0.99] active:shadow-none cursor-pointer'
                            }
                          `}
                        >
                          {/* Logo o Spinner a la izquierda */}
                          <span className="absolute left-4 flex items-center">
                            {socialLoading === 'facebook' ? (
                              <Loader2 className="w-[18px] h-[18px] text-[#1877F2] animate-spin" />
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 17.9895 4.3882 22.954 10.125 23.8542V15.4688H7.07812V12H10.125V9.35625C10.125 6.34875 11.9166 4.6875 14.6576 4.6875C15.9701 4.6875 17.3438 4.92188 17.3438 4.92188V7.875H15.8306C14.34 7.875 13.875 8.80008 13.875 9.75V12H17.2031L16.6711 15.4688H13.875V23.8542C19.6118 22.954 24 17.9895 24 12Z" fill="#1877F2"/>
                              </svg>
                            )}
                          </span>
                          {/* Texto centrado en el botón completo */}
                          <span className="w-full text-center text-sm font-semibold text-slate-700">
                            {socialLoading === 'facebook' ? 'Iniciando con Facebook...' : 'Continuar con Facebook'}
                          </span>
                        </button>
                      )}
                    />

                    {/* Escape hatch inmediato si el usuario cerró la ventana o desea cancelar */}
                    {socialLoading && (
                      <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 border border-slate-200 dark:border-slate-700 animate-in fade-in duration-150">
                        <span className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                          {socialLoading === 'google' ? 'Ventana de Google abierta...' : 'Ventana de Facebook abierta...'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            isProcessingTokenRef.current = false;
                            resetSocialState();
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 font-semibold cursor-pointer underline underline-offset-2 hover:scale-102 transition-transform"
                        >
                          Cancelar y reintentar
                        </button>
                      </div>
                    )}

                    {/* Soporte amigable si Facebook ha fallado repetidamente */}
                    {fbAttempts >= 2 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/85 p-3 text-xs text-amber-900 animate-in fade-in duration-200 shadow-2xs">
                        <div className="flex items-start gap-2.5">
                          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-semibold text-amber-950 text-xs">¿Problemas para acceder con Facebook?</p>
                            <p className="text-amber-800 leading-relaxed text-[11px]">
                              Si tu aplicación en Meta está en <strong>Modo Desarrollo</strong>, Facebook bloquea a cualquier cuenta que no esté dada de alta como <em>Tester</em> en Meta for Developers.
                            </p>
                            <p className="text-amber-800 leading-relaxed text-[11px]">
                              Te recomendamos ingresar con <strong>Google</strong> (que ya está listo) o usando tu <strong>correo y contraseña</strong> abajo.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                    {/* Divisor con líneas sutiles */}
                    <div className="flex items-center gap-3 pt-1 pb-1">
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                        o con tu correo
                      </span>
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                    </div>

                    {/* Formulario de credenciales con cajas cerradas y etiquetas exteriores */}
                    <form onSubmit={handleLoginSubmit(onLoginSubmit)} noValidate className="space-y-3">
                    {/* Campo: Correo Electrónico */}
                    <div>
                      <label htmlFor="login_correo" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 tracking-wide">
                        Correo Electrónico
                      </label>
                      <div className="flex h-11 items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 px-3.5 shadow-2xs transition focus-within:border-blue-600 focus-within:ring-3 focus-within:ring-blue-500/15 focus-within:bg-white dark:focus-within:bg-slate-800">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0 mr-2.5 pointer-events-none select-none" />
                        <EmailAutocompleteInput
                          id="login_correo"
                          autoComplete="username email"
                          placeholder="ejemplo@correo.com"
                          showHistory={true}
                          aria-describedby={loginErrors.correo ? 'login_correo_error' : undefined}
                          aria-invalid={!!loginErrors.correo}
                          className="w-full h-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none autofill-fix cursor-text"
                          {...registerLogin('correo')}
                        />
                      </div>
                      {loginErrors.correo ? (
                        <p id="login_correo_error" role="alert" className="mt-1 text-xs text-rose-500 font-medium">
                          {loginErrors.correo.message}
                        </p>
                      ) : null}
                    </div>

                    {/* Campo: Contraseña */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="login_password" className="block text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wide">
                          Contraseña
                        </label>
                        <button
                          type="button"
                          onClick={switchToRecovery}
                          className="text-xs text-blue-600 dark:text-sky-400 hover:text-blue-700 dark:hover:text-sky-300 font-semibold transition cursor-pointer"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                      <div className="flex h-11 items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 px-3.5 shadow-2xs transition focus-within:border-blue-600 focus-within:ring-3 focus-within:ring-blue-500/15 focus-within:bg-white dark:focus-within:bg-slate-800">
                        <Lock className="w-4 h-4 text-slate-400 shrink-0 mr-2.5 pointer-events-none select-none" />
                        <input
                          id="login_password"
                          type={showLoginPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="Ingresa tu contraseña"
                          onKeyDown={checkLoginCapsLock}
                          onKeyUp={checkLoginCapsLock}
                          aria-describedby={loginErrors.password ? 'login_password_error' : undefined}
                          aria-invalid={!!loginErrors.password}
                          className="w-full h-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none autofill-fix cursor-text"
                          {...registerLogin('password', { onBlur: resetLoginCapsLock })}
                        />
                        <button
                          type="button"
                          aria-label={showLoginPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 cursor-pointer"
                        >
                          {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <CapsLockWarning isVisible={isLoginCapsLock} />
                      {loginErrors.password ? (
                        <p id="login_password_error" role="alert" className="mt-1 text-xs text-rose-500 font-medium">
                          {loginErrors.password.message}
                        </p>
                      ) : null}
                    </div>

                    {/* Fila de Autocompletar / Recordar Datos */}
                    <div className="flex items-center justify-between pt-0.5 pb-0.5">
                      <label htmlFor="login_remember" className="flex items-center gap-2 cursor-pointer select-none group">
                        <input
                          id="login_remember"
                          name="rememberMe"
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer accent-blue-600"
                        />
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
                          Recordar mis datos
                        </span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-normal">
                        Guardado seguro
                      </span>
                    </div>

                    {/* Botón de Acción Principal */}
                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={isLoginSubmitting || Boolean(loginStatusText)}
                        className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-wide shadow-md shadow-blue-500/20 transition active:scale-[0.99] disabled:opacity-85 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer px-3"
                      >
                        {isLoginSubmitting || loginStatusText ? (
                          <span className="flex items-center gap-2 truncate text-xs sm:text-sm">
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <span className="truncate">{loginStatusText || 'Iniciando sesión...'}</span>
                          </span>
                        ) : (
                          'Iniciar Sesión'
                        )}
                      </button>

                      {/* Sello sutil de Seguridad 256-bit */}
                      <div className="flex items-center justify-center gap-1.5 pt-2.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Conexión cifrada SSL 256-bit de grado médico</span>
                      </div>
                    </div>
                  </form>

                  {/* Alternar a Registro */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-center">
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      ¿No tienes una cuenta?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setLoginAuthError('');
                          setActiveTab('register');
                        }}
                        className="font-bold text-blue-600 dark:text-sky-400 hover:underline transition ml-1 cursor-pointer"
                      >
                        Regístrate
                      </button>
                    </p>
                  </div>
                </motion.div>
              ) : (
                /* ═══════════════════════════════════════════════════════════════ */
                /* 2. VISTA: RECUPERAR CONTRASEÑA                                  */
                /* ═══════════════════════════════════════════════════════════════ */
                <motion.div
                  key="view-recovery"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-center mb-3.5">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      Recuperar Contraseña
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Ingresa tu correo electrónico y te enviaremos el enlace para restablecer tu contraseña.
                    </p>
                  </div>

                  {recoveryNotice ? (
                    <div className="mb-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 p-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{recoveryNotice}</span>
                    </div>
                  ) : null}

                  <form onSubmit={handleRecoverySubmit(onRecoverPassword)} noValidate className="space-y-3">
                    <div>
                      <label htmlFor="recovery_correo" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 tracking-wide">
                        Correo Electrónico
                      </label>
                      <div className="flex h-11 items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 px-3.5 shadow-2xs transition focus-within:border-blue-600 focus-within:ring-3 focus-within:ring-blue-500/15 focus-within:bg-white dark:focus-within:bg-slate-800">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
                        <EmailAutocompleteInput
                          id="recovery_correo"
                          autoComplete="email"
                          placeholder="ejemplo@correo.com"
                          aria-describedby={recoveryErrors.correo ? 'recovery_correo_error' : undefined}
                          aria-invalid={!!recoveryErrors.correo}
                          className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none autofill-fix"
                          {...registerRecovery('correo')}
                        />
                      </div>
                      {recoveryErrors.correo ? (
                        <p id="recovery_correo_error" role="alert" className="mt-1 text-xs text-rose-500 font-medium">
                          {recoveryErrors.correo.message}
                        </p>
                      ) : null}
                    </div>

                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={isRecoverySubmitting}
                        className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-wide shadow-md shadow-blue-500/20 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                      >
                        {isRecoverySubmitting ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enviando enlace...
                          </span>
                        ) : (
                          'Enviar Enlace'
                        )}
                      </button>
                    </div>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={backToLogin}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 font-semibold transition cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Volver a iniciar sesión
                      </button>
                    </div>
                  </form>
                </motion.div>
              )
            ) : (
              /* ═══════════════════════════════════════════════════════════════ */
              /* 3. VISTA: CREAR CUENTA (REGISTRO)                               */
              /* ═══════════════════════════════════════════════════════════════ */
              <motion.div
                key="view-register"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-center mb-3">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Crear Cuenta
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Regístrate como paciente en NeoClínica
                  </p>

                  {/* Indicador de pasos */}
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setRegisterStep(1)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        registerStep === 1 ? 'w-8 bg-blue-600' : 'w-2.5 bg-slate-300 dark:bg-slate-700'
                      }`}
                      aria-label="Paso 1: Datos Personales"
                    />
                    <button
                      type="button"
                      onClick={() => handleNextRegisterStep()}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        registerStep === 2 ? 'w-8 bg-blue-600' : 'w-2.5 bg-slate-300 dark:bg-slate-700'
                      }`}
                      aria-label="Paso 2: Cuenta y Seguridad"
                    />
                  </div>
                </div>

                <form onSubmit={handleRegisterSubmit(onPatientRegister)} noValidate className="space-y-2.5">
                  <AnimatePresence mode="wait">
                    {registerStep === 1 ? (
                      /* ─── PASO 1: DATOS PERSONALES ─── */
                      <motion.div
                        key="reg-step-1"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleNextRegisterStep();
                          }
                        }}
                        className="space-y-3.5"
                      >
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-center">
                          Paso 1: Datos Personales
                        </p>

                        {/* Primer Nombre y Segundo Nombre */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="reg_primerNombre" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 tracking-wide">
                              Primer Nombre*
                            </label>
                            <div className="flex h-11 items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 px-3 shadow-2xs transition focus-within:border-blue-600 focus-within:ring-3 focus-within:ring-blue-500/15 focus-within:bg-white dark:focus-within:bg-slate-800">
                              <input
                                id="reg_primerNombre"
                                type="text"
                                placeholder="Nombre"
                                autoComplete="given-name"
                                aria-describedby={registerErrors.primerNombre ? 'reg_primerNombre_error' : undefined}
                                aria-invalid={!!registerErrors.primerNombre}
                                className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none autofill-fix"
                                {...registerPatient('primerNombre')}
                              />
                            </div>
                            {registerErrors.primerNombre ? (
                              <p id="reg_primerNombre_error" role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">
                                {registerErrors.primerNombre.message}
                              </p>
                            ) : null}
                          </div>

                          <div>
                            <label htmlFor="reg_segundoNombre" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 tracking-wide">
                              Segundo Nombre
                            </label>
                            <div className="flex h-11 items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 px-3 shadow-2xs transition focus-within:border-blue-600 focus-within:ring-3 focus-within:ring-blue-500/15 focus-within:bg-white dark:focus-within:bg-slate-800">
                              <input
                                id="reg_segundoNombre"
                                type="text"
                                placeholder="Opcional"
                                autoComplete="additional-name"
                                className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none autofill-fix"
                                {...registerPatient('segundoNombre')}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Primer Apellido y Segundo Apellido */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="reg_primerApellido" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 tracking-wide">
                              Primer Apellido*
                            </label>
                            <div className="flex h-11 items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 px-3 shadow-2xs transition focus-within:border-blue-600 focus-within:ring-3 focus-within:ring-blue-500/15 focus-within:bg-white dark:focus-within:bg-slate-800">
                              <input
                                id="reg_primerApellido"
                                type="text"
                                placeholder="Apellido"
                                autoComplete="family-name"
                                aria-describedby={registerErrors.primerApellido ? 'reg_primerApellido_error' : undefined}
                                aria-invalid={!!registerErrors.primerApellido}
                                className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none autofill-fix"
                                {...registerPatient('primerApellido')}
                              />
                            </div>
                            {registerErrors.primerApellido ? (
                              <p id="reg_primerApellido_error" role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">
                                {registerErrors.primerApellido.message}
                              </p>
                            ) : null}
                          </div>

                          <div>
                            <label htmlFor="reg_segundoApellido" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 tracking-wide">
                              Segundo Apellido
                            </label>
                            <div className="flex h-11 items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 px-3 shadow-2xs transition focus-within:border-blue-600 focus-within:ring-3 focus-within:ring-blue-500/15 focus-within:bg-white dark:focus-within:bg-slate-800">
                              <input
                                id="reg_segundoApellido"
                                type="text"
                                placeholder="Opcional"
                                autoComplete="family-name"
                                className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none autofill-fix"
                                {...registerPatient('segundoApellido')}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Apellido de Casada */}
                        <div>
                          <label htmlFor="reg_apellidoCasado" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 tracking-wide">
                            Apellido de Casada (opcional)
                          </label>
                          <div className="flex h-11 items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 px-3 shadow-2xs transition focus-within:border-blue-600 focus-within:ring-3 focus-within:ring-blue-500/15 focus-within:bg-white dark:focus-within:bg-slate-800">
                            <input
                              id="reg_apellidoCasado"
                              type="text"
                              placeholder="Opcional"
                              autoComplete="family-name"
                              className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none autofill-fix"
                              {...registerPatient('apellidoCasado')}
                            />
                          </div>
                        </div>

                        {/* Botón Siguiente Paso */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={handleNextRegisterStep}
                            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-wide shadow-md shadow-blue-500/20 transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <span>Continuar</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      /* ─── PASO 2: CUENTA Y SEGURIDAD ─── */
                      <motion.div
                        key="reg-step-2"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                      >
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-center">
                          Paso 2: Cuenta y Seguridad
                        </p>

                        {/* Fecha de Nacimiento */}
                        <div>
                          <label htmlFor="reg_fechaNacimiento" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 tracking-wide">
                            Fecha de Nacimiento (&gt;18 años)*
                          </label>
                          <div className="flex h-11 items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 px-3 shadow-2xs transition focus-within:border-blue-600 focus-within:ring-3 focus-within:ring-blue-500/15 focus-within:bg-white dark:focus-within:bg-slate-800">
                            <Calendar className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                            <input
                              id="reg_fechaNacimiento"
                              type="date"
                              autoComplete="bday"
                              max={maxBirthDate}
                              aria-describedby={registerErrors.fechaNacimiento ? 'reg_fechaNacimiento_error' : undefined}
                              aria-invalid={!!registerErrors.fechaNacimiento}
                              className="w-full bg-transparent text-sm text-slate-900 dark:text-white outline-none [color-scheme:light] dark:[color-scheme:dark]"
                              {...registerPatient('fechaNacimiento')}
                            />
                          </div>
                          {registerErrors.fechaNacimiento ? (
                            <p id="reg_fechaNacimiento_error" role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">
                              {registerErrors.fechaNacimiento.message}
                            </p>
                          ) : null}
                        </div>

                        {/* Correo Electrónico */}
                        <div>
                          <label htmlFor="reg_correo" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 tracking-wide">
                            Correo Electrónico*
                          </label>
                          <div className="flex h-11 items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 px-3 shadow-2xs transition focus-within:border-blue-600 focus-within:ring-3 focus-within:ring-blue-500/15 focus-within:bg-white dark:focus-within:bg-slate-800">
                            <Mail className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                            <EmailAutocompleteInput
                              id="reg_correo"
                              autoComplete="email"
                              placeholder="ejemplo@correo.com"
                              aria-describedby={registerErrors.correo ? 'reg_correo_error' : undefined}
                              aria-invalid={!!registerErrors.correo}
                              className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none autofill-fix"
                              {...registerPatient('correo')}
                            />
                          </div>
                          {registerErrors.correo ? (
                            <p id="reg_correo_error" role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">
                              {registerErrors.correo.message}
                            </p>
                          ) : null}
                        </div>

                        {/* Contraseña */}
                        <div>
                          <label htmlFor="reg_password" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 tracking-wide">
                            Contraseña*
                          </label>
                          <div className="flex h-11 items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 px-3 shadow-2xs transition focus-within:border-blue-600 focus-within:ring-3 focus-within:ring-blue-500/15 focus-within:bg-white dark:focus-within:bg-slate-800">
                            <Lock className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                            <input
                              id="reg_password"
                              type={showRegPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              placeholder="8-15 caracteres con mayúscula, número y símbolo"
                              onKeyDown={checkRegCapsLock}
                              onKeyUp={checkRegCapsLock}
                              aria-describedby={registerErrors.password ? 'reg_password_error' : undefined}
                              aria-invalid={!!registerErrors.password}
                              className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none autofill-fix"
                              {...registerPatient('password', { onBlur: resetRegCapsLock })}
                            />
                            <button
                              type="button"
                              aria-label={showRegPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                              onClick={() => setShowRegPassword(!showRegPassword)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 cursor-pointer"
                            >
                              {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <CapsLockWarning isVisible={isRegCapsLock} />

                          {/* Requisitos de seguridad en tiempo real */}
                          <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                            <span className={`flex items-center gap-1.5 ${hasLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                              {hasLength ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5" />}
                              8 a 15 caracteres
                            </span>
                            <span className={`flex items-center gap-1.5 ${hasUpperCase ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                              {hasUpperCase ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5" />}
                              1 Mayúscula
                            </span>
                            <span className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                              {hasNumber ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5" />}
                              1 Número
                            </span>
                            <span className={`flex items-center gap-1.5 ${hasSpecialChar ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                              {hasSpecialChar ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5" />}
                              Símbolo (%&@-_)
                            </span>
                          </div>
                        </div>

                        {/* Confirmar Contraseña */}
                        <div>
                          <label htmlFor="reg_confirmPassword" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 tracking-wide">
                            Confirmar Contraseña*
                          </label>
                          <div className="flex h-11 items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 px-3 shadow-2xs transition focus-within:border-blue-600 focus-within:ring-3 focus-within:ring-blue-500/15 focus-within:bg-white dark:focus-within:bg-slate-800">
                            <Lock className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                            <input
                              id="reg_confirmPassword"
                              type={showRegConfirmPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              placeholder="Repite tu contraseña"
                              onKeyDown={checkRegCapsLock}
                              onKeyUp={checkRegCapsLock}
                              aria-describedby={registerErrors.confirmPassword ? 'reg_confirmPassword_error' : undefined}
                              aria-invalid={!!registerErrors.confirmPassword}
                              className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none autofill-fix"
                              {...registerPatient('confirmPassword', { onBlur: resetRegCapsLock })}
                            />
                            <button
                              type="button"
                              aria-label={showRegConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                              onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 cursor-pointer"
                            >
                              {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <CapsLockWarning isVisible={isRegCapsLock} />
                          {registerErrors.confirmPassword ? (
                            <p id="reg_confirmPassword_error" role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">
                              {registerErrors.confirmPassword.message}
                            </p>
                          ) : null}
                        </div>

                        {/* Botones: Atrás y Crear Cuenta */}
                        <div className="pt-1 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setRegisterStep(1)}
                            className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                          >
                            Atrás
                          </button>
                          <button
                            type="submit"
                            disabled={isRegisterSubmitting || !isRegisterValid || !isRegPasswordValid}
                            className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-wide shadow-md shadow-blue-500/20 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                          >
                            {isRegisterSubmitting ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Creando cuenta...
                              </span>
                            ) : (
                              'Crear Cuenta'
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>

                {/* Alternar a Iniciar Sesión */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-center">
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    ¿Ya tienes cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setLoginAuthError('');
                        setActiveTab('login');
                      }}
                      className="font-bold text-blue-600 dark:text-sky-400 hover:underline transition ml-1 cursor-pointer"
                    >
                      Inicia sesión
                    </button>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer discreto con Términos y Condiciones */}
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setShowTermsModal(true)}
            className="text-xs text-blue-200/80 hover:text-white font-medium transition cursor-pointer"
          >
            Términos y Condiciones
          </button>
        </div>
      </div>
    </div>

    {/* Popup minimalista para errores de acceso con opción de copiar */}
    <AuthErrorModal
      open={Boolean(loginAuthError)}
      onClose={() => setLoginAuthError('')}
      errorMessage={loginAuthError}
    />
  </div>
  );
}
