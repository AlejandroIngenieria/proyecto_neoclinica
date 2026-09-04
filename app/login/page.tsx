'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { signIn, signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { AlertTriangle, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import FacebookLogin, { type FailResponse, type SuccessResponse } from '@greatsumini/react-facebook-login';
import { loginSchema, recoverySchema, type LoginFormValues, type RecoveryFormValues } from '@/lib/validations/auth';
import SessionReloginModal, { type SessionReauthReason } from '@/components/session-relogin-modal';

type AuthView = 'choice' | 'login' | 'recovery';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reasonParam = searchParams.get('reason');
  const reauthReason: SessionReauthReason | null =
    reasonParam === 'login-required' || reasonParam === 'session-expired' || reasonParam === 'auth-error'
      ? reasonParam
      : null;

  const [authError, setAuthError] = useState('');
  const [recoveryNotice, setRecoveryNotice] = useState('');
  const [authView, setAuthView] = useState<AuthView>('choice');
  const [showPassword, setShowPassword] = useState(false);
  const [loginStatusText, setLoginStatusText] = useState<string>('');

  useEffect(() => {
    if (reasonParam) {
      // Limpiar cookies de sesión caducadas para evitar conflictos de credenciales
      signOut({ redirect: false });
    }
  }, [reasonParam]);

  const {
    register,
    handleSubmit,
    watch: watchLogin,
    getValues: getLoginValues,
    setValue: setLoginValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      correo: '',
      password: '',
    },
    mode: 'onTouched',
  });

  const typedCorreo = watchLogin('correo')?.trim() || '';

  const {
    register: registerRecovery,
    handleSubmit: handleRecoverySubmit,
    getValues: getRecoveryValues,
    setValue: setRecoveryValue,
    formState: { errors: recoveryErrors, isSubmitting: isRecoverySubmitting },
  } = useForm<RecoveryFormValues>({
    resolver: zodResolver(recoverySchema),
    defaultValues: {
      correo: '',
      nuevaPassword: '',
    },
    mode: 'onTouched',
  });

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setAuthError('No se recibió la credencial de Google.');
      return;
    }

    setAuthError('');
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
        googleIdToken: credentialResponse.credential,
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

      setLoginStatusText('');
      setAuthError(result?.error ? 'Error de autenticación con Google.' : 'Credenciales inválidas de Google.');
    } catch {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setLoginStatusText('');
      setAuthError('No se pudo contactar al servidor de autenticación.');
    }
  };

  const handleFacebookSuccess = async (response: SuccessResponse) => {
    if (!response.accessToken) {
      setAuthError('No se recibió el token de acceso de Facebook.');
      return;
    }

    setAuthError('');
    setLoginStatusText('Autenticando con Facebook...');

    const timer1 = setTimeout(() => {
      setLoginStatusText('Conectando con el servidor de autenticación...');
    }, 3000);

    const timer2 = setTimeout(() => {
      setLoginStatusText('Iniciando recursos compartidos del servidor, un momento...');
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

      setLoginStatusText('');
      setAuthError(result?.error ? 'Error de autenticación con Facebook.' : 'Credenciales inválidas de Facebook.');
    } catch {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setLoginStatusText('');
      setAuthError('No se pudo contactar al servidor de autenticación.');
    }
  };

  const onSubmit = async (values: LoginFormValues) => {
    setAuthError('');
    setLoginStatusText('');

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
          setLoginStatusText('');
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
    setAuthError(
      lastError === 'CredentialsSignin'
        ? 'Credenciales inválidas o correo no registrado.'
        : 'No se pudo contactar al servidor de autenticación. Revisa tu conexión o intenta de nuevo.'
    );
  };

  const onRecoverPassword = async (values: RecoveryFormValues) => {
    try {
      const response = await fetch('/api/autenticacion/solicitar-recuperacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const contentType = response.headers.get('content-type') ?? '';
      const responseBody = contentType.includes('application/json') ? await response.json() : await response.text();

      if (response.status === 429) {
        setAuthError('Has realizado varios intentos recientemente. Por favor espera unos minutos antes de solicitar otro enlace.');
        return;
      }

      if (!response.ok) {
        const errorMessage = typeof responseBody === 'string' ? responseBody : responseBody?.mensaje || 'Error al recuperar contraseña.';
        setAuthError(errorMessage);
        return;
      }

      setRecoveryNotice('Si el correo está registrado, te hemos enviado un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.');
    } catch {
      setAuthError('No se pudo contactar al servidor. Intenta de nuevo.');
    }
  };

  const closeReauthModal = () => {
    signOut({ redirect: false }).then(() => {
      window.location.href = '/login';
    });
  };

  const openEmailLogin = () => {
    signOut({ redirect: false }).then(() => {
      setAuthView('login');
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/login');
      }
    });
  };

  const backToLogin = () => {
    setAuthError('');
    setRecoveryNotice('');
    setShowPassword(false);
    setLoginValue('correo', getRecoveryValues('correo'));
    setAuthView('login');
  };

  const renderSocialButtons = () => (
    <div className="space-y-3">
      <div className="flex w-full justify-center items-center py-0.5">
        <div className="flex justify-center w-[240px] max-w-full overflow-hidden [&>div]:!mx-auto [&>div]:!flex [&>div]:!justify-center [&_iframe]:!mx-auto">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              setAuthError('No se pudo completar el inicio de sesión con Google.');
            }}
            text="continue_with"
            shape="pill"
            size="large"
            theme="outline"
            width="240"
          />
        </div>
      </div>

      <div className="flex w-full justify-center items-center py-0.5">
        <FacebookLogin
          appId={process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || ''}
          onSuccess={handleFacebookSuccess}
          onFail={(error: FailResponse) => {
            console.error('Facebook login failed:', error);
            setAuthError('No se pudo completar el inicio de sesión con Facebook.');
          }}
          render={({ onClick }) => (
            <button
              type="button"
              onClick={onClick}
              className="relative flex h-[40px] w-[240px] max-w-full items-center justify-center rounded-full border border-[#dadce0] bg-white text-[14px] pl-[11px] transition hover:bg-[#f8fafd] hover:border-[#d2e3fc] cursor-pointer select-none antialiased"
              style={{
                fontFamily: 'var(--font-roboto), Roboto, "Google Sans", Arial, sans-serif',
                fontWeight: 500,
                color: '#3c4043',
                letterSpacing: '0.25px',
              }}
            >
              <span className="absolute left-[12px] flex h-[18px] w-[18px] items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="12" fill="#1877F2" />
                  <path
                    d="M15.5 12h-2.5v7h-3v-7h-1.5v-2.5h1.5v-1.8c0-2 1.2-3.2 3.2-3.2 1 0 1.8.1 2 .1v2.4h-1.3c-.9 0-1.1.4-1.1 1.1v1.4h2.5l-.3 2.5z"
                    fill="#ffffff"
                  />
                </svg>
              </span>
              <span className="truncate">Continuar con Facebook</span>
            </button>
          )}
        />
      </div>
    </div>
  );

  const renderAuthBody = () => {
    if (authView === 'choice') {
      return (
        <>
          <button
            type="button"
            onClick={() => setAuthView('login')}
            className="inline-flex h-14 w-full items-center justify-center rounded-2xl border border-sky-400/30 bg-[#2b61be] px-4 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-sky-300/70 hover:bg-[#0d2b59] sm:text-[0.95rem]"
          >
            Iniciar sesión con correo electrónico
          </button>

          <div className="flex items-center gap-4 py-0.5">
            <div className="h-px flex-1 bg-white/15" />
            <div className="text-slate-400">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 12h7l2-4 3 8 2-4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" suppressHydrationWarning />
              </svg>
            </div>
            <div className="h-px flex-1 bg-white/15" />
          </div>

          {renderSocialButtons()}
        </>
      );
    }

    if (authView === 'recovery') {
      return (
        <>
          <div className="rounded-2xl border border-cyan-400/20 bg-[#0b234c] px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-sm font-semibold text-white">Recuperar contraseña</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              Ingresa tu correo electrónico registrado y te enviaremos el enlace para restablecer tu contraseña.
            </p>
          </div>

          <div>
            <label htmlFor="recovery-correo" className="sr-only">
              Correo electrónico
            </label>
            <div className="flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-[#0b234c] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-sky-300/70 focus-within:ring-2 focus-within:ring-sky-400/25">
              <Mail className="h-5 w-5 shrink-0 text-slate-300" />
              <input
                id="recovery-correo"
                type="email"
                autoComplete="email"
                placeholder="Correo electrónico*"
                className="autofill-fix h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 sm:text-[0.95rem]"
                {...registerRecovery('correo')}
              />
            </div>
            {recoveryErrors.correo ? <p className="mt-2 text-sm text-rose-300">{recoveryErrors.correo.message}</p> : null}
          </div>

          <button
            type="submit"
            disabled={isRecoverySubmitting}
            className="inline-flex h-13 w-full items-center justify-center rounded-2xl bg-linear-to-r from-sky-500 via-blue-500 to-blue-600 py-3 font-bold uppercase tracking-wide text-white shadow-[0_18px_45px_rgba(37,99,235,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 sm:h-14"
          >
            {isRecoverySubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando enlace...
              </span>
            ) : (
              'Enviar enlace de recuperación'
            )}
          </button>

          {recoveryNotice ? (
            <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {recoveryNotice}
            </p>
          ) : null}

          <button
            type="button"
            onClick={backToLogin}
            className="w-full text-center text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
          >
            Volver al inicio de sesión
          </button>
        </>
      );
    }

    return (
      <>
        <div>
          <label htmlFor="correo" className="block mb-2 text-sm font-medium text-slate-200">
            Correo electrónico
          </label>
          <div className="flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-[#0b234c] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-sky-300/70 focus-within:ring-2 focus-within:ring-sky-400/25">
            <Mail className="h-5 w-5 shrink-0 text-slate-300" />
            <input
              id="correo"
              type="email"
              autoComplete="email"
              placeholder="Correo electrónico*"
              className="autofill-fix h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 sm:text-[0.95rem]"
              {...register('correo')}
            />
          </div>
          {errors.correo ? <p className="mt-2 text-sm text-rose-300">{errors.correo.message}</p> : null}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="password" className="block text-sm font-medium text-slate-200">
              Contraseña
            </label>
            <Link
              href={typedCorreo ? `/olvide-password?correo=${encodeURIComponent(typedCorreo)}` : '/olvide-password'}
              className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
            >
              Olvidé mi contraseña
            </Link>
          </div>
          <div className="flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-[#0b234c] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-sky-300/70 focus-within:ring-2 focus-within:ring-sky-400/25">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Contraseña"
              className="autofill-fix h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 sm:text-[0.95rem]"
              {...register('password')}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setShowPassword((currentValue) => !currentValue)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>
          {errors.password ? <p className="mt-2 text-sm text-rose-300">{errors.password.message}</p> : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-13 w-full items-center justify-center rounded-2xl bg-linear-to-r from-sky-500 via-blue-500 to-blue-600 py-3 font-bold uppercase tracking-wide text-white shadow-[0_18px_45px_rgba(37,99,235,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 sm:h-14"
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando credenciales
            </span>
          ) : (
            'Continuar'
          )}
        </button>

        <div className="flex items-center gap-4 py-0.5 my-1">
          <div className="h-px flex-1 bg-white/15" />
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">o continuar con</span>
          <div className="h-px flex-1 bg-white/15" />
        </div>

        {renderSocialButtons()}
      </>
    );
  };

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[#071a3b] text-white md:h-screen md:flex-row md:items-stretch">
      <SessionReloginModal
        open={Boolean(reauthReason)}
        reason={reauthReason ?? 'login-required'}
        onClose={closeReauthModal}
        onPrimaryAction={openEmailLogin}
      />

      <div className="relative hidden h-full flex-none overflow-hidden md:block">
        <Image
          src="/loginImg.png"
          alt="Equipo médico NeoClinica"
          width={980}
          height={929}
          priority
          className="h-full w-auto max-w-none object-contain object-left"
          sizes="(min-width: 768px) 100vh, 0vw"
          suppressHydrationWarning
        />
      </div>

      <div className="flex max-h-screen w-full flex-1 items-stretch overflow-y-auto bg-[#071a3b] px-4 py-4 sm:px-6 md:min-w-0 md:px-8 md:py-6 lg:px-10 lg:py-6">
        <div className="flex w-full min-w-0 flex-col justify-center">
          <div className="mx-auto flex w-full max-w-116 flex-col items-center">
            <div className="mb-4 flex flex-col items-center text-center sm:mb-5 lg:mb-6">
              <div className="mb-4 flex items-center justify-center sm:mb-5">
                <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl shadow-[0_8px_32px_rgba(34,211,238,0.25)] ring-1 ring-white/10">
                  <Image
                    src="/IconMedical.png"
                    alt="NeoClinica Logo"
                    width={80}
                    height={80}
                    priority
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.8rem]">
                Neo<span className="text-sky-400">Clinica</span>
              </h1>
              <div className="mt-3 h-1 w-16 rounded-full bg-cyan-400/80" />
            </div>

            <div className="w-full bg-[#071a3b]">
              <form
                className="mx-auto mt-4 w-full max-w-108 space-y-3 sm:mt-5 sm:space-y-4"
                onSubmit={authView === 'recovery' ? handleRecoverySubmit(onRecoverPassword) : handleSubmit(onSubmit)}
                noValidate
              >
                {renderAuthBody()}

                {authError ? (
                  <p className="flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{authError}</span>
                  </p>
                ) : loginStatusText ? (
                  <p className="flex items-center gap-2 rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
                    <Loader2 className="h-4 w-4 animate-spin text-sky-400 shrink-0" />
                    <span>{loginStatusText}</span>
                  </p>
                ) : null}

                {authView !== 'recovery' ? (
                  <p className="pt-2 text-center text-sm text-slate-400 md:hidden">
                    ¿No tienes una cuenta?{' '}
                    <Link href="/register" className="font-medium text-cyan-300 underline underline-offset-4 transition hover:text-cyan-200">
                      Regístrate
                    </Link>
                  </p>
                ) : null}
              </form>
            </div>
          </div>

          <div className="mt-5 hidden text-center text-sm text-slate-400 md:block">
            ¿No tienes una cuenta?{' '}
            <Link href="/register" className="font-medium text-cyan-300 underline underline-offset-4 transition hover:text-cyan-200">
              Regístrate
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
