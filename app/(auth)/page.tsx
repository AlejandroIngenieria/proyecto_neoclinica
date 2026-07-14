'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AlertTriangle, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { loginSchema, recoverySchema, type LoginFormValues, type RecoveryFormValues } from '../../lib/validations/auth';
import SessionReloginModal, { type SessionReauthReason } from '../../components/session-relogin-modal';

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

  const {
    register,
    handleSubmit,
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

  const onSubmit = async (values: LoginFormValues) => {
    setAuthError('');

    try {
      const result = await signIn('credentials', {
        redirect: false,
        correo: values.correo,
        password: values.password,
      });

      if (result?.error) {
        setAuthError(
          result.error === 'CredentialsSignin'
            ? 'Credenciales inválidas o sesión no disponible.'
            : 'No fue posible iniciar sesión en este momento.'
        );
        return;
      }

      router.replace('/dashboard');
    } catch {
      setAuthError('No se pudo contactar al servidor de autenticación. Revisa tu conexión o intenta de nuevo.');
    }
  };

  const onRecoverPassword = async (values: RecoveryFormValues) => {
    try {
      const response = await fetch('/api/autenticacion/recuperar-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const contentType = response.headers.get('content-type') ?? '';
      const responseBody = contentType.includes('application/json') ? await response.json() : await response.text();

      if (!response.ok) {
        const errorMessage = typeof responseBody === 'string' ? responseBody : responseBody?.mensaje || 'Error al recuperar contraseña.';
        setAuthError(errorMessage);
        return;
      }

      setRecoveryNotice('Tu contraseña ha sido restablecida correctamente. Puedes iniciar sesión ahora.');
    } catch {
      setAuthError('No se pudo contactar al servidor. Intenta de nuevo.');
    }
  };

  const closeReauthModal = () => {
    router.replace('/login', { scroll: false });
  };

  const openEmailLogin = () => {
    setAuthView('login');
    closeReauthModal();
  };

  const openRecoveryForm = () => {
    setAuthError('');
    setRecoveryNotice('');
    setRecoveryValue('correo', getLoginValues('correo'));
    setRecoveryValue('nuevaPassword', '');
    setAuthView('recovery');
  };

  const backToLogin = () => {
    setAuthError('');
    setRecoveryNotice('');
    setShowPassword(false);
    setLoginValue('correo', getRecoveryValues('correo'));
    setAuthView('login');
  };

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

          <div className="space-y-3">
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 sm:h-12"
            >
              <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-black/5">
                <Image src="/googleIcon.jpg" alt="Google" width={24} height={24} className="h-full w-full rounded-full object-cover" suppressHydrationWarning />
              </span>
              Continuar con Google
            </button>

            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 sm:h-12"
            >
              <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-black/5">
                <Image src="/appleIcon.png" alt="Apple" width={24} height={24} className="h-full w-full rounded-full object-cover" suppressHydrationWarning />
              </span>
              Continuar con Apple
            </button>
          </div>
        </>
      );
    }

    if (authView === 'recovery') {
      return (
        <>
          <div className="rounded-2xl border border-cyan-400/20 bg-[#0b234c] px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-sm font-semibold text-white">Recuperar contraseña</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              Ingresa tu correo y tu nueva contraseña para restablecer el acceso.
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
            
            {/* <div className="mt-4 flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-[#0b234c] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-sky-300/70 focus-within:ring-2 focus-within:ring-sky-400/25">
              <input
                id="recovery-nuevaPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nueva contraseña*"
                className="autofill-fix h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 sm:text-[0.95rem]"
                {...registerRecovery('nuevaPassword')}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShowPassword((currentValue) => !currentValue)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div> */}
            {recoveryErrors.nuevaPassword ? <p className="mt-2 text-sm text-rose-300">{recoveryErrors.nuevaPassword.message}</p> : null}
          </div>

          <button
            type="submit"
            disabled={isRecoverySubmitting}
            className="inline-flex h-13 w-full items-center justify-center rounded-2xl bg-linear-to-r from-sky-500 via-blue-500 to-blue-600 py-3 font-bold uppercase tracking-wide text-white shadow-[0_18px_45px_rgba(37,99,235,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 sm:h-14"
          >
            {isRecoverySubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Restableciendo contraseña
              </span>
            ) : (
              'Restablecer contraseña'
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
          <label htmlFor="correo" className="sr-only">
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
            <button
              type="button"
              onClick={openRecoveryForm}
              className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
            >
              Olvidé mi contraseña
            </button>
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

        {authError ? (
          <p className="flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{authError}</span>
          </p>
        ) : isSubmitting ? (
          <p className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
            La solicitud puede tardar unos segundos.
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => {
            setAuthError('');
            setRecoveryNotice('');
            setShowPassword(false);
            setAuthView('choice');
          }}
          className="w-full text-center font-medium text-cyan-300 underline underline-offset-4 transition hover:text-cyan-200"
        >
          Iniciar sesión con otro método
        </button>
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
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_40px_rgba(34,211,238,0.16)]">
                  <div className="absolute h-10 w-10 rounded-full border-[3px] border-cyan-300/90 border-r-transparent border-b-transparent rotate-[-18deg]" />
                  <div className="absolute left-4.5 top-5 h-5 w-5 rounded-full border-[3px] border-cyan-300/90" />
                  <div className="absolute right-4 top-4.5 h-4 w-4 rounded-full border-[3px] border-cyan-300/90" />
                  <div className="absolute bottom-3.5 left-6.5 h-4 w-0.75 rounded-full bg-cyan-300" />
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