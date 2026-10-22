'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  Info,
  Mail,
  Lock,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { useGoogleLogin, type TokenResponse } from '@react-oauth/google';
import FacebookLogin, { type FailResponse, type SuccessResponse } from '@greatsumini/react-facebook-login';
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
  solicitarRecuperacionSchema,
  registerSchema,
  type LoginFormValues,
  type SolicitarRecuperacionFormValues,
  type RegisterFormValues,
} from '@/lib/validations/auth';
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
  const [loginSlowNotice, setLoginSlowNotice] = useState(false);
  const [registerStatusText, setRegisterStatusText] = useState('');
  const [registerSlowNotice, setRegisterSlowNotice] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState('');
  const [recoverySlowNotice, setRecoverySlowNotice] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Cancellation and timeout timers
  const loginAbortRef = useRef<boolean>(false);
  const registerAbortRef = useRef<boolean>(false);
  const recoveryAbortRef = useRef<boolean>(false);
  const loginTimersRef = useRef<NodeJS.Timeout[]>([]);
  const registerTimersRef = useRef<NodeJS.Timeout[]>([]);
  const recoveryTimersRef = useRef<NodeJS.Timeout[]>([]);

  // Social login loading & retry feedback
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const [fbAttempts, setFbAttempts] = useState(0);
  const isProcessingTokenRef = useRef(false);
  const popupOpenTimeRef = useRef<number>(0);
  const popupWindowRef = useRef<Window | null>(null);

  const clearLoginTimers = useCallback(() => {
    loginTimersRef.current.forEach(clearTimeout);
    loginTimersRef.current = [];
  }, []);

  const clearRegisterTimers = useCallback(() => {
    registerTimersRef.current.forEach(clearTimeout);
    registerTimersRef.current = [];
  }, []);

  const clearRecoveryTimers = useCallback(() => {
    recoveryTimersRef.current.forEach(clearTimeout);
    recoveryTimersRef.current = [];
  }, []);

  const resetSocialState = useCallback(() => {
    if (isProcessingTokenRef.current) return;
    setSocialLoading(null);
    setLoginStatusText('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLoginTimers();
      clearRegisterTimers();
      clearRecoveryTimers();
    };
  }, [clearLoginTimers, clearRegisterTimers, clearRecoveryTimers]);

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
    watch: watchLogin,
    formState: { errors: loginErrors, isSubmitting: isLoginSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { correo: '', password: '' },
    mode: 'onTouched',
  });

  const watchLoginEmail = watchLogin('correo') || '';
  const isLoginEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(watchLoginEmail.trim());

  const [rememberMe, setRememberMe] = useState(true);
  const hasLoadedCookieRef = useRef(false);

  // Caps Lock detection
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

  // Read remembered email
  useEffect(() => {
    if (hasLoadedCookieRef.current) return;
    hasLoadedCookieRef.current = true;
    const savedEmail = getRememberedEmail();
    if (savedEmail === 'paciente.demo@saludya.com') {
      deleteRememberedEmail();
      return;
    }
    if (savedEmail) {
      setValueLogin('correo', savedEmail);
      setRememberMe(true);
    }
  }, [setValueLogin]);

  // Auto-focus
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

  // Cancel login attempt without page reload
  const handleCancelLogin = () => {
    loginAbortRef.current = true;
    clearLoginTimers();
    setLoginStatusText('');
    setLoginSlowNotice(false);
    toast.info('Inicio de sesión cancelado. Tus credenciales siguen intactas para reintentar.');
  };

  const onLoginSubmit = async (values: LoginFormValues) => {
    loginAbortRef.current = false;
    clearLoginTimers();
    setLoginAuthError('');
    setLoginSlowNotice(false);
    setLoginStatusText('Verificando credenciales...');

    if (rememberMe && values.correo) {
      setRememberedEmail(values.correo.trim(), 30);
    } else {
      deleteRememberedEmail();
    }

    // Schedule progressive reassurance for slow network / backend wake-up
    const t1 = setTimeout(() => {
      if (!loginAbortRef.current) setLoginStatusText('Conectando con el servidor clínico...');
    }, 3500);

    const t2 = setTimeout(() => {
      if (!loginAbortRef.current) setLoginStatusText('El servidor está procesando tu solicitud...');
    }, 7500);

    const t3 = setTimeout(() => {
      if (!loginAbortRef.current) {
        setLoginSlowNotice(true);
        setLoginStatusText('Está tomando más tiempo de lo habitual...');
      }
    }, 12000);

    loginTimersRef.current = [t1, t2, t3];

    let lastError = '';

    try {
      const result = await signIn('credentials', {
        redirect: false,
        correo: values.correo.trim(),
        password: values.password,
      });

      if (loginAbortRef.current) {
        clearLoginTimers();
        setLoginStatusText('');
        return;
      }

      if (result?.ok) {
        clearLoginTimers();
        saveEmailToHistory(values.correo);
        setLoginStatusText('Acceso concedido. Redirigiendo...');
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('neoclinica_random_seed', String(Math.floor(Math.random() * 1000000) + 1));
          }
        } catch {}

        const returnUrl = searchParams.get('returnUrl') || searchParams.get('callbackUrl') || '/dashboard';
        window.location.assign(returnUrl);
        return;
      }

      if (result?.error) {
        lastError = result.error;
      }
    } catch {
      lastError = 'NetworkError';
    }

    clearLoginTimers();
    setLoginStatusText('');
    setLoginSlowNotice(false);

    if (!loginAbortRef.current) {
      setLoginAuthError(
        lastError === 'CredentialsSignin'
          ? 'Credenciales incorrectas o correo no registrado. Por favor verifica tus datos.'
          : 'El servidor tardó en responder o no se pudo establecer conexión. Puedes presionar "Reintentar ahora" sin recargar la página.',
      );
    }
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
      setLoginStatusText('Conectando con Google...');

      const timer1 = setTimeout(() => {
        setLoginStatusText('Iniciando sesión segura...');
      }, 3000);

      const timer2 = setTimeout(() => {
        setLoginStatusText('Sincronizando expediente...');
      }, 7000);

      try {
        const result = await signIn('credentials', {
          redirect: false,
          googleAccessToken: tokenResponse.access_token,
        });

        clearTimeout(timer1);
        clearTimeout(timer2);

        if (result?.ok) {
          setLoginStatusText('Redirigiendo...');
          try {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('neoclinica_random_seed', String(Math.floor(Math.random() * 1000000) + 1));
            }
          } catch {}

          const returnUrl = searchParams.get('returnUrl') || searchParams.get('callbackUrl') || '/dashboard';
          window.location.assign(returnUrl);
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
        setLoginAuthError('No se pudo contactar al servidor de autenticación. Intenta nuevamente.');
      }
    },
    onError: (errorResponse) => {
      console.warn('Google login popup cerrado o con error:', errorResponse);
      if (!isProcessingTokenRef.current) {
        resetSocialState();
      }
    },
    onNonOAuthError: (nonOAuthError) => {
      console.warn('Google login non-OAuth error:', nonOAuthError);
      if (!isProcessingTokenRef.current) {
        resetSocialState();
        if (nonOAuthError?.type === 'popup_failed_to_open') {
          setLoginAuthError('El navegador bloqueó la ventana emergente de Google. Por favor permite las ventanas emergentes.');
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
    setLoginStatusText('Conectando con Facebook...');

    const timer1 = setTimeout(() => {
      setLoginStatusText('Verificando perfil de Meta...');
    }, 3000);

    const timer2 = setTimeout(() => {
      setLoginStatusText('Sincronizando cuenta médica...');
    }, 7000);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        facebookAccessToken: response.accessToken,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (result?.ok) {
        setLoginStatusText('Redirigiendo...');
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('neoclinica_random_seed', String(Math.floor(Math.random() * 1000000) + 1));
          }
        } catch {}

        const returnUrl = searchParams.get('returnUrl') || searchParams.get('callbackUrl') || '/dashboard';
        window.location.assign(returnUrl);
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
      setLoginAuthError('No se pudo contactar al servidor de autenticación. Intenta nuevamente.');
    }
  };

  // Track popup window close safely
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

  // Focus and visibility tracking for social popup close detection
  useEffect(() => {
    if (!socialLoading) return;

    let checkTimer: NodeJS.Timeout | null = null;

    const handleReturnToTab = () => {
      const elapsed = Date.now() - popupOpenTimeRef.current;
      if (elapsed < 700) return;

      if (checkTimer) clearTimeout(checkTimer);

      checkTimer = setTimeout(() => {
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

    const handleUserInteraction = () => {
      const elapsed = Date.now() - popupOpenTimeRef.current;
      if (elapsed > 1000 && !isProcessingTokenRef.current) {
        resetSocialState();
      }
    };

    window.addEventListener('focus', handleReturnToTab);
    document.addEventListener('visibilitychange', handleReturnToTab);
    window.addEventListener('pointerdown', handleUserInteraction);

    const maxSafetyTimer = setTimeout(() => {
      if (!isProcessingTokenRef.current) {
        resetSocialState();
      }
    }, 18000);

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
    watch: watchRecovery,
    formState: { errors: recoveryErrors, isSubmitting: isRecoverySubmitting },
  } = useForm<SolicitarRecuperacionFormValues>({
    resolver: zodResolver(solicitarRecuperacionSchema),
    defaultValues: { correo: '' },
    mode: 'onTouched',
  });

  const watchRecoveryEmail = watchRecovery('correo') || '';
  const isRecoveryEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(watchRecoveryEmail.trim());

  const handleCancelRecovery = () => {
    recoveryAbortRef.current = true;
    clearRecoveryTimers();
    setRecoverySlowNotice(false);
    toast.info('Solicitud cancelada.');
  };

  const onRecoverPassword = async (values: SolicitarRecuperacionFormValues) => {
    recoveryAbortRef.current = false;
    clearRecoveryTimers();
    setLoginAuthError('');
    setRecoveryNotice('');
    setRecoverySlowNotice(false);

    const t1 = setTimeout(() => {
      if (!recoveryAbortRef.current) {
        setRecoverySlowNotice(true);
      }
    }, 10000);
    recoveryTimersRef.current = [t1];

    try {
      const response = await fetch('/api/autenticacion/solicitar-recuperacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: values.correo.trim() }),
      });

      clearRecoveryTimers();
      setRecoverySlowNotice(false);

      if (recoveryAbortRef.current) return;

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

      setRecoveryNotice('Si el correo está registrado en NeoClínica, te hemos enviado un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o carpeta de spam.');
      toast.success('Enlace de recuperación enviado. Revisa tu correo.');
    } catch {
      clearRecoveryTimers();
      setRecoverySlowNotice(false);
      if (!recoveryAbortRef.current) {
        setLoginAuthError('No se pudo contactar al servidor. Revisa tu conexión a internet o presiona Reintentar.');
      }
    }
  };

  const switchToRecovery = () => {
    setLoginAuthError('');
    setRecoveryNotice('');
    setLoginSlowNotice(false);
    clearLoginTimers();
    const typedEmail = getLoginValues('correo')?.trim() || '';
    if (typedEmail) {
      setRecoveryValue('correo', typedEmail);
    }
    setLoginView('recovery');
  };

  const backToLogin = () => {
    setLoginAuthError('');
    setRecoveryNotice('');
    setRecoverySlowNotice(false);
    clearRecoveryTimers();
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

  const watchRegEmail = watchRegister('correo') || '';
  const isRegEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(watchRegEmail.trim());

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

  const handleCancelRegister = () => {
    registerAbortRef.current = true;
    clearRegisterTimers();
    setRegisterStatusText('');
    setRegisterSlowNotice(false);
    toast.info('Registro cancelado. Tus datos se conservan para que puedas reintentar.');
  };

  const onPatientRegister = async (values: RegisterFormValues) => {
    registerAbortRef.current = false;
    clearRegisterTimers();
    setRegisterSlowNotice(false);
    setRegisterStatusText('Registrando tus datos...');

    const t1 = setTimeout(() => {
      if (!registerAbortRef.current) setRegisterStatusText('Cifrando información médica...');
    }, 3500);

    const t2 = setTimeout(() => {
      if (!registerAbortRef.current) setRegisterStatusText('Verificando disponibilidad de expediente...');
    }, 7500);

    const t3 = setTimeout(() => {
      if (!registerAbortRef.current) {
        setRegisterSlowNotice(true);
        setRegisterStatusText('El servidor está tardando más de lo habitual...');
      }
    }, 12000);

    registerTimersRef.current = [t1, t2, t3];

    try {
      const response = await fetch('/api/autenticacion/registrar-paciente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo: values.correo.trim(),
          password: values.password,
          primerNombre: values.primerNombre.trim(),
          segundoNombre: values.segundoNombre?.trim() || '',
          primerApellido: values.primerApellido.trim(),
          segundoApellido: values.segundoApellido?.trim() || '',
          apellidoCasado: values.apellidoCasado?.trim() || '',
          fechaNacimiento: values.fechaNacimiento,
        }),
      });

      clearRegisterTimers();
      setRegisterSlowNotice(false);

      if (registerAbortRef.current) {
        setRegisterStatusText('');
        return;
      }

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

      setRegisterStatusText('¡Cuenta creada! Preparando acceso...');
      toast.success('¡Cuenta creada con éxito! Ya puedes iniciar sesión con tus credenciales.');
      resetRegister();
      setRegisterStep(1);
      setActiveTab('login');
      setLoginView('login');

      // Autofill email for immediate sign-in
      setValueLogin('correo', values.correo.trim(), { shouldValidate: true, shouldDirty: true });
      setRememberedEmail(values.correo.trim(), 30);
      saveEmailToHistory(values.correo.trim());
    } catch (err: unknown) {
      clearRegisterTimers();
      setRegisterSlowNotice(false);
      if (!registerAbortRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Error al crear la cuenta de paciente.';
        toast.error(errorMessage);
        setLoginAuthError(errorMessage);
      }
    } finally {
      setRegisterStatusText('');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] dark:bg-[#0b172a] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors relative selection:bg-sky-500 selection:text-white">
      {/* Background Soft Lighting Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-sky-200/40 via-sky-100/20 to-transparent dark:from-sky-950/20 dark:via-blue-900/10 dark:to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-100/30 dark:bg-sky-900/10 rounded-full blur-3xl" />
      </div>

      {/* Header with NeoClínica Branding (matches mockup top-left logo) */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 sm:py-8 flex items-center justify-between z-10 shrink-0">
        <Link href="/" className="inline-flex items-center gap-2.5 group transition-transform active:scale-98">
          <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
            <Image
              src="/iconNeo.png"
              alt="NeoClínica"
              width={32}
              height={32}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            NeoClínica
          </span>
        </Link>
      </header>

      {/* Main Centered Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-4 sm:py-8 z-10 w-full max-w-md mx-auto">
        {/* Header Title Section: PORTAL DE PACIENTES • Iniciar Sesión */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 mb-1.5">
            <span>PORTAL DE PACIENTES</span>
            <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {activeTab === 'login'
              ? loginView === 'login'
                ? 'Iniciar Sesión'
                : 'Recuperar Contraseña'
              : 'Crear Cuenta'}
          </h1>
        </div>

        {/* Card Component (matches mockup clinical white card with soft shadow and rounded corners) */}
        <div className="w-full bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800/80 shadow-[0_12px_45px_rgba(2,132,199,0.06)] dark:shadow-[0_12px_45px_rgba(0,0,0,0.3)] p-6 sm:p-9 transition-all">
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
                  className="space-y-4"
                >
                  {/* Inline Error Notice with instant retry */}
                  {loginAuthError && (
                    <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1.5">
                        <p className="font-semibold text-rose-950 dark:text-rose-100">{loginAuthError}</p>
                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setLoginAuthError('');
                              handleLoginSubmit(onLoginSubmit)();
                            }}
                            className="inline-flex items-center gap-1 font-bold text-rose-800 dark:text-rose-200 hover:underline cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reintentar ahora
                          </button>
                          <span className="text-rose-300 dark:text-rose-700">•</span>
                          <button
                            type="button"
                            onClick={() => setLoginAuthError('')}
                            className="text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                          >
                            Descartar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Slow Request Helper Banner */}
                  {loginSlowNotice && (
                    <div className="rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50/90 dark:bg-sky-950/50 p-3.5 text-xs text-sky-900 dark:text-sky-200 space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-[#0284c7] shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 dark:text-white">Conexión en progreso</p>
                          <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                            El servidor está procesando tu solicitud de forma segura. No necesitas recargar la página.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            handleCancelLogin();
                            setTimeout(() => {
                              handleLoginSubmit(onLoginSubmit)();
                            }, 120);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reintentar ahora
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelLogin}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleLoginSubmit(onLoginSubmit)} noValidate className="space-y-4">
                    {/* Campo: Correo Electrónico */}
                    <div>
                      <label
                        htmlFor="login_correo"
                        className="block text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 tracking-wide"
                      >
                        Correo electrónico
                      </label>
                      <div className="flex h-12 items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-4 transition-all focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-[#0284c7]/20 focus-within:bg-white dark:focus-within:bg-slate-800">
                        <EmailAutocompleteInput
                          id="login_correo"
                          autoComplete="username email"
                          placeholder="tu@correo.com"
                          showHistory={true}
                          aria-describedby={loginErrors.correo ? 'login_correo_error' : undefined}
                          aria-invalid={!!loginErrors.correo}
                          className="w-full h-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none autofill-fix cursor-text"
                          {...registerLogin('correo')}
                        />
                        {/* Green dot indicator when valid email is entered (matches user mockup) */}
                        {isLoginEmailValid && (
                          <span
                            title="Formato de correo válido"
                            className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 ml-2 animate-in fade-in zoom-in-75 duration-200 shadow-xs"
                          />
                        )}
                      </div>
                      {loginErrors.correo && (
                        <p id="login_correo_error" role="alert" className="mt-1 text-xs text-rose-500 font-medium">
                          {loginErrors.correo.message}
                        </p>
                      )}
                    </div>

                    {/* Campo: Contraseña */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="login_password"
                          className="block text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-300 tracking-wide"
                        >
                          Contraseña
                        </label>
                        <button
                          type="button"
                          onClick={switchToRecovery}
                          className="text-xs font-semibold text-[#0284c7] dark:text-sky-400 hover:underline transition cursor-pointer"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                      <div className="flex h-12 items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-4 transition-all focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-[#0284c7]/20 focus-within:bg-white dark:focus-within:bg-slate-800">
                        <input
                          id="login_password"
                          type={showLoginPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="••••••••"
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
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 cursor-pointer shrink-0 ml-1"
                        >
                          {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <CapsLockWarning isVisible={isLoginCapsLock} />
                      {loginErrors.password && (
                        <p id="login_password_error" role="alert" className="mt-1 text-xs text-rose-500 font-medium">
                          {loginErrors.password.message}
                        </p>
                      )}
                    </div>

                    {/* Fila Recordar Datos */}
                    <div className="flex items-center justify-between pt-0.5">
                      <label htmlFor="login_remember" className="flex items-center gap-2 cursor-pointer select-none group">
                        <input
                          id="login_remember"
                          name="rememberMe"
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-[#0284c7] focus:ring-[#0284c7]/20 cursor-pointer accent-[#0284c7]"
                        />
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
                          Recordar mis datos
                        </span>
                      </label>
                    </div>

                    {/* Botón Principal: Acceder a mi cuenta (Pill shape matches mockup) */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isLoginSubmitting || Boolean(loginStatusText)}
                        className="w-full h-12 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-sm tracking-wide shadow-md shadow-sky-500/20 transition active:scale-[0.99] disabled:opacity-85 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer px-4"
                      >
                        {isLoginSubmitting || loginStatusText ? (
                          <span className="flex items-center gap-2 truncate text-xs sm:text-sm">
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <span className="truncate">{loginStatusText || 'Iniciando sesión...'}</span>
                          </span>
                        ) : (
                          'Acceder a mi cuenta'
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Divisor con líneas sutiles */}
                  <div className="flex items-center gap-3 pt-2">
                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                    <span className="text-[11px] font-medium tracking-wider uppercase text-slate-400 dark:text-slate-500">
                      o continuar con
                    </span>
                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                  </div>

                  {/* Botones Sociales (Google y Facebook) */}
                  <div className="flex flex-col gap-2.5">
                    {/* Botón Google */}
                    {socialLoading === 'google' ? (
                      <div className="relative flex h-11 w-full items-center rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/30 px-4 transition-all">
                        <span className="flex items-center">
                          <Loader2 className="w-4 h-4 text-[#0284c7] animate-spin" />
                        </span>
                        <span className="w-full text-center text-xs font-semibold text-slate-700 dark:text-slate-200 select-none">
                          Ventana de Google abierta...
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Reintentar"
                            onClick={() => {
                              popupOpenTimeRef.current = Date.now();
                              isProcessingTokenRef.current = false;
                              setLoginAuthError('');
                              setLoginStatusText('Conectando...');
                              handleGoogleLogin();
                            }}
                            className="p-1 text-slate-400 hover:text-[#0284c7] transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Cancelar"
                            onClick={() => {
                              isProcessingTokenRef.current = false;
                              resetSocialState();
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
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
                          setLoginStatusText('Conectando...');
                          handleGoogleLogin();
                        }}
                        className={`group relative flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 shadow-2xs transition-all ${
                          socialLoading !== null
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/60 active:scale-[0.99] cursor-pointer'
                        }`}
                      >
                        <span className="absolute left-4 flex items-center">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4"/>
                            <path d="M12.24 24.0008C15.4764 24.0008 18.2058 22.9382 20.1944 21.1039L16.3274 18.1055C15.2516 18.8375 13.8626 19.252 12.2444 19.252C9.11376 19.252 6.45934 17.1399 5.50693 14.3003H1.51648V17.3912C3.55359 21.4434 7.70278 24.0008 12.24 24.0008Z" fill="#34A853"/>
                            <path d="M5.50253 14.3003C4.99987 12.8099 4.99987 11.1961 5.50253 9.70575V6.61481H1.51649C-0.18551 10.0056 -0.18551 14.0004 1.51649 17.3912L5.50253 14.3003Z" fill="#FBBC04"/>
                            <path d="M12.24 4.74966C13.9508 4.7232 15.6043 5.36697 16.8433 6.54867L20.2694 3.12262C18.1 1.0855 15.2207 -0.034466 12.24 0.000808666C7.70277 0.000808666 3.55359 2.55822 1.51648 6.61481L5.50252 9.70575C6.45052 6.86173 9.10935 4.74966 12.24 4.74966Z" fill="#EA4335"/>
                          </svg>
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Continuar con Google
                        </span>
                      </button>
                    )}

                    {/* Botón Facebook */}
                    <FacebookLogin
                      appId={process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '4624725251186454'}
                      scope="email,public_profile"
                      onSuccess={handleFacebookSuccess}
                      onFail={(error: FailResponse) => {
                        console.warn('Facebook login status:', error);
                        if (!isProcessingTokenRef.current) {
                          resetSocialState();
                          if (error?.status === 'loginCancelled' || error?.status === 'facebookNotLoaded') {
                            return;
                          }
                          setFbAttempts((prev) => prev + 1);
                          if (typeof window !== 'undefined' && window.location.protocol === 'http:') {
                            setLoginAuthError(
                              'Facebook exige una conexión segura HTTPS para iniciar sesión. Si estás probando localmente, ejecuta en modo HTTPS o usa correo y contraseña.',
                            );
                          } else {
                            setLoginAuthError(
                              'No se pudo completar el inicio de sesión con Facebook. Intenta nuevamente o usa tu correo.',
                            );
                          }
                        }
                      }}
                      render={({ onClick }) =>
                        socialLoading === 'facebook' ? (
                          <div className="relative flex h-11 w-full items-center rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/30 px-4 transition-all">
                            <span className="flex items-center">
                              <Loader2 className="w-4 h-4 text-[#1877F2] animate-spin" />
                            </span>
                            <span className="w-full text-center text-xs font-semibold text-slate-700 dark:text-slate-200 select-none">
                              Ventana de Facebook abierta...
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                title="Reintentar"
                                onClick={() => {
                                  popupOpenTimeRef.current = Date.now();
                                  isProcessingTokenRef.current = false;
                                  setLoginAuthError('');
                                  setLoginStatusText('Conectando...');
                                  onClick?.();
                                }}
                                className="p-1 text-slate-400 hover:text-[#1877F2] transition cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Cancelar"
                                onClick={() => {
                                  isProcessingTokenRef.current = false;
                                  resetSocialState();
                                }}
                                className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
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
                                  'Facebook exige una conexión segura HTTPS. En entorno local usa correo y contraseña o activa HTTPS.',
                                );
                                return;
                              }
                              setLoginAuthError('');
                              setSocialLoading('facebook');
                              popupOpenTimeRef.current = Date.now();
                              isProcessingTokenRef.current = false;
                              setLoginStatusText('Conectando...');
                              onClick?.();
                            }}
                            className={`group relative flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 shadow-2xs transition-all ${
                              socialLoading !== null
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/60 active:scale-[0.99] cursor-pointer'
                            }`}
                          >
                            <span className="absolute left-4 flex items-center">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 17.9895 4.3882 22.954 10.125 23.8542V15.4688H7.07812V12H10.125V9.35625C10.125 6.34875 11.9166 4.6875 14.6576 4.6875C15.9701 4.6875 17.3438 4.92188 17.3438 4.92188V7.875H15.8306C14.34 7.875 13.875 8.80008 13.875 9.75V12H17.2031L16.6711 15.4688H13.875V23.8542C19.6118 22.954 24 17.9895 24 12Z" fill="#1877F2"/>
                              </svg>
                            </span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                              Continuar con Facebook
                            </span>
                          </button>
                        )
                      }
                    />
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
                  className="space-y-4"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                    Ingresa tu correo registrado y te enviaremos las instrucciones de recuperación.
                  </p>

                  {recoveryNotice && (
                    <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{recoveryNotice}</span>
                    </div>
                  )}

                  {loginAuthError && (
                    <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{loginAuthError}</span>
                    </div>
                  )}

                  {recoverySlowNotice && (
                    <div className="rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50/90 dark:bg-sky-950/50 p-3 text-xs text-sky-900 dark:text-sky-200 space-y-2">
                      <p className="font-semibold">La solicitud está tardando más de lo habitual...</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            handleCancelRecovery();
                            setTimeout(() => {
                              handleRecoverySubmit(onRecoverPassword)();
                            }, 120);
                          }}
                          className="px-3 py-1 rounded-lg bg-[#0284c7] text-white font-semibold text-xs"
                        >
                          Reintentar ahora
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelRecovery}
                          className="px-3 py-1 rounded-lg border border-slate-300 text-slate-700 dark:text-slate-300 text-xs"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleRecoverySubmit(onRecoverPassword)} noValidate className="space-y-4">
                    <div>
                      <label
                        htmlFor="recovery_correo"
                        className="block text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 tracking-wide"
                      >
                        Correo electrónico
                      </label>
                      <div className="flex h-12 items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-4 transition-all focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-[#0284c7]/20 focus-within:bg-white dark:focus-within:bg-slate-800">
                        <EmailAutocompleteInput
                          id="recovery_correo"
                          autoComplete="email"
                          placeholder="tu@correo.com"
                          aria-describedby={recoveryErrors.correo ? 'recovery_correo_error' : undefined}
                          aria-invalid={!!recoveryErrors.correo}
                          className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none autofill-fix"
                          {...registerRecovery('correo')}
                        />
                        {isRecoveryEmailValid && (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 ml-2 animate-in fade-in zoom-in-75 duration-200 shadow-xs" />
                        )}
                      </div>
                      {recoveryErrors.correo && (
                        <p id="recovery_correo_error" role="alert" className="mt-1 text-xs text-rose-500 font-medium">
                          {recoveryErrors.correo.message}
                        </p>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isRecoverySubmitting}
                        className="w-full h-12 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-sm tracking-wide shadow-md shadow-sky-500/20 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                      >
                        {isRecoverySubmitting ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enviando enlace...
                          </span>
                        ) : (
                          'Enviar enlace de recuperación'
                        )}
                      </button>
                    </div>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={backToLogin}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-[#0284c7] dark:hover:text-sky-400 font-semibold transition cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Volver a Iniciar Sesión
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
                className="space-y-4"
              >
                {/* Indicador de pasos */}
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {registerStep === 1 ? 'Paso 1: Datos Personales' : 'Paso 2: Cuenta y Seguridad'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRegisterStep(1)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        registerStep === 1 ? 'w-6 bg-[#0284c7]' : 'w-2 bg-slate-200 dark:bg-slate-700'
                      }`}
                      aria-label="Paso 1: Datos Personales"
                    />
                    <button
                      type="button"
                      onClick={() => handleNextRegisterStep()}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        registerStep === 2 ? 'w-6 bg-[#0284c7]' : 'w-2 bg-slate-200 dark:bg-slate-700'
                      }`}
                      aria-label="Paso 2: Cuenta y Seguridad"
                    />
                  </div>
                </div>

                {/* Slow Register Notice */}
                {registerSlowNotice && (
                  <div className="rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50/90 dark:bg-sky-950/50 p-3.5 text-xs text-sky-900 dark:text-sky-200 space-y-2">
                    <p className="font-semibold">El registro está tardando más de lo habitual...</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleCancelRegister();
                          setTimeout(() => {
                            handleRegisterSubmit(onPatientRegister)();
                          }, 120);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#0284c7] text-white font-semibold text-xs shadow-xs"
                      >
                        Reintentar ahora
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelRegister}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit(onPatientRegister)} noValidate className="space-y-3.5">
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
                        {/* Primer Nombre y Segundo Nombre */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="reg_primerNombre" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Primer Nombre*
                            </label>
                            <div className="flex h-11 items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-3 transition focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-[#0284c7]/20 focus-within:bg-white dark:focus-within:bg-slate-800">
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
                            {registerErrors.primerNombre && (
                              <p id="reg_primerNombre_error" role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">
                                {registerErrors.primerNombre.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <label htmlFor="reg_segundoNombre" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Segundo Nombre
                            </label>
                            <div className="flex h-11 items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-3 transition focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-[#0284c7]/20 focus-within:bg-white dark:focus-within:bg-slate-800">
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
                            <label htmlFor="reg_primerApellido" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Primer Apellido*
                            </label>
                            <div className="flex h-11 items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-3 transition focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-[#0284c7]/20 focus-within:bg-white dark:focus-within:bg-slate-800">
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
                            {registerErrors.primerApellido && (
                              <p id="reg_primerApellido_error" role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">
                                {registerErrors.primerApellido.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <label htmlFor="reg_segundoApellido" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Segundo Apellido
                            </label>
                            <div className="flex h-11 items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-3 transition focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-[#0284c7]/20 focus-within:bg-white dark:focus-within:bg-slate-800">
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

                        {/* Apellido de matrimonio */}
                        <div>
                          <label htmlFor="reg_apellidoCasado" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Apellido de matrimonio (opcional)
                          </label>
                          <div className="flex h-11 items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-3 transition focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-[#0284c7]/20 focus-within:bg-white dark:focus-within:bg-slate-800">
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

                        {/* Botón Continuar */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleNextRegisterStep}
                            className="w-full h-12 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-sm tracking-wide shadow-md shadow-sky-500/20 transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
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
                        className="space-y-3.5"
                      >
                        {/* Fecha de Nacimiento */}
                        <div>
                          <label htmlFor="reg_fechaNacimiento" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Fecha de Nacimiento (&gt;18 años)*
                          </label>
                          <div className="flex h-11 items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-3 transition focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-[#0284c7]/20 focus-within:bg-white dark:focus-within:bg-slate-800">
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
                          {registerErrors.fechaNacimiento && (
                            <p id="reg_fechaNacimiento_error" role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">
                              {registerErrors.fechaNacimiento.message}
                            </p>
                          )}
                        </div>

                        {/* Correo Electrónico */}
                        <div>
                          <label htmlFor="reg_correo" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Correo Electrónico*
                          </label>
                          <div className="flex h-11 items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-3 transition focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-[#0284c7]/20 focus-within:bg-white dark:focus-within:bg-slate-800">
                            <EmailAutocompleteInput
                              id="reg_correo"
                              autoComplete="email"
                              placeholder="tu@correo.com"
                              aria-describedby={registerErrors.correo ? 'reg_correo_error' : undefined}
                              aria-invalid={!!registerErrors.correo}
                              className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none autofill-fix"
                              {...registerPatient('correo')}
                            />
                            {isRegEmailValid && (
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 ml-2 animate-in fade-in zoom-in-75 duration-200 shadow-xs" />
                            )}
                          </div>
                          {registerErrors.correo && (
                            <p id="reg_correo_error" role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">
                              {registerErrors.correo.message}
                            </p>
                          )}
                        </div>

                        {/* Contraseña */}
                        <div>
                          <label htmlFor="reg_password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Contraseña*
                          </label>
                          <div className="flex h-11 items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-3 transition focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-[#0284c7]/20 focus-within:bg-white dark:focus-within:bg-slate-800">
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
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 cursor-pointer shrink-0 ml-1"
                            >
                              {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <CapsLockWarning isVisible={isRegCapsLock} />

                          {/* Requisitos de seguridad */}
                          <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                            <span className={`flex items-center gap-1.5 ${hasLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                              {hasLength ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5" />}
                              8 a 15 caracteres
                            </span>
                            <span className={`flex items-center gap-1.5 ${hasUpperCase ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                              {hasUpperCase ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5" />}
                              1 Mayúscula
                            </span>
                            <span className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                              {hasNumber ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5" />}
                              1 Número
                            </span>
                            <span className={`flex items-center gap-1.5 ${hasSpecialChar ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                              {hasSpecialChar ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5" />}
                              Símbolo (%&@-_)
                            </span>
                          </div>
                        </div>

                        {/* Confirmar Contraseña */}
                        <div>
                          <label htmlFor="reg_confirmPassword" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Confirmar Contraseña*
                          </label>
                          <div className="flex h-11 items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-3 transition focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-[#0284c7]/20 focus-within:bg-white dark:focus-within:bg-slate-800">
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
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 cursor-pointer shrink-0 ml-1"
                            >
                              {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <CapsLockWarning isVisible={isRegCapsLock} />
                          {registerErrors.confirmPassword && (
                            <p id="reg_confirmPassword_error" role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">
                              {registerErrors.confirmPassword.message}
                            </p>
                          )}
                        </div>

                        {/* Botones Paso 2: Atrás y Crear Cuenta */}
                        <div className="pt-2 flex gap-2.5">
                          <button
                            type="button"
                            onClick={() => setRegisterStep(1)}
                            className="h-12 px-5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                          >
                            Atrás
                          </button>
                          <button
                            type="submit"
                            disabled={isRegisterSubmitting || Boolean(registerStatusText) || !isRegisterValid || !isRegPasswordValid}
                            className="flex-1 h-12 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-sm tracking-wide shadow-md shadow-sky-500/20 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer px-4"
                          >
                            {isRegisterSubmitting || registerStatusText ? (
                              <span className="flex items-center gap-2 truncate text-xs sm:text-sm">
                                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                <span className="truncate">{registerStatusText || 'Creando cuenta...'}</span>
                              </span>
                            ) : (
                              'Crear cuenta'
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Link below card (matches mockup "¿Eres nuevo en NeoClínica? Crear cuenta") */}
        <div className="mt-6 text-center">
          {activeTab === 'login' ? (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              ¿Eres nuevo en NeoClínica?{' '}
              <button
                type="button"
                onClick={() => {
                  setLoginAuthError('');
                  setLoginSlowNotice(false);
                  setActiveTab('register');
                  setRegisterStep(1);
                }}
                className="font-bold text-slate-900 dark:text-white hover:text-[#0284c7] dark:hover:text-sky-400 transition cursor-pointer ml-1"
              >
                Crear cuenta
              </button>
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              ¿Ya tienes una cuenta?{' '}
              <button
                type="button"
                onClick={() => {
                  setLoginAuthError('');
                  setRegisterSlowNotice(false);
                  setActiveTab('login');
                  setLoginView('login');
                }}
                className="font-bold text-slate-900 dark:text-white hover:text-[#0284c7] dark:hover:text-sky-400 transition cursor-pointer ml-1"
              >
                Iniciar sesión
              </button>
            </p>
          )}

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium transition cursor-pointer"
            >
              Términos y Condiciones
            </button>
          </div>
        </div>
      </main>

      {/* Terms & Conditions Modal */}
      <AnimatePresence>
        {showTermsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 shadow-[0_20px_60px_rgba(11,28,48,0.12)] p-6 sm:p-8 text-left text-slate-900 dark:text-slate-100"
            >
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-[#eff4ff] dark:bg-slate-800 border border-[#006194]/20 dark:border-slate-700/60 text-[#006194] dark:text-sky-400 flex items-center justify-center shrink-0">
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

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="px-5 py-2.5 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                >
                  Entendido y Acepto
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* Error modal for detail inspection */}
      <AuthErrorModal
        open={Boolean(loginAuthError)}
        onClose={() => setLoginAuthError('')}
        errorMessage={loginAuthError}
      />
    </div>
  );
}
