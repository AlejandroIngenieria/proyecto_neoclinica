'use client';

import { Suspense, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { AlertCircle, ArrowLeft, CheckCircle2, Circle, Eye, EyeOff, KeyRound, Loader2, Lock } from 'lucide-react';
import {
  restablecerPasswordSchema,
  type RestablecerPasswordFormValues,
} from '@/lib/validations/auth';

function RestablecerPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const correo = searchParams.get('correo') ?? '';
  const token = searchParams.get('token') ?? '';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RestablecerPasswordFormValues>({
    resolver: zodResolver(restablecerPasswordSchema),
    defaultValues: {
      nuevaPassword: '',
      confirmarPassword: '',
    },
    mode: 'onChange',
  });

  const watchPassword = watch('nuevaPassword') || '';
  const hasLength = watchPassword.length >= 8 && watchPassword.length <= 15;
  const hasUpperCase = /[A-Z]/.test(watchPassword);
  const hasLowerCase = /[a-z]/.test(watchPassword);
  const hasNumber = /\d/.test(watchPassword);
  const hasSpecialChar = /[%&@\-_]/.test(watchPassword);

  const isPasswordValid = hasLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

  const onSubmit = async (values: RestablecerPasswordFormValues) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!correo || !token) {
      setErrorMsg('El enlace de recuperación es inválido o ha expirado.');
      return;
    }

    try {
      const response = await fetch('/api/autenticacion/restablecer-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correo,
          token,
          nuevaPassword: values.nuevaPassword,
        }),
      });

      const contentType = response.headers.get('content-type') ?? '';
      const responseBody = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        if (response.status === 400) {
          setErrorMsg('El enlace de recuperación es inválido o ha expirado.');
        } else {
          const message =
            typeof responseBody === 'string'
              ? responseBody
              : responseBody?.mensaje || responseBody?.message || 'Error al restablecer la contraseña.';
          setErrorMsg(message);
        }
        return;
      }

      setSuccessMsg('¡Contraseña restablecida con éxito! Redirigiendo al inicio de sesión...');
      setTimeout(() => {
        router.replace('/login');
      }, 2500);
    } catch {
      setErrorMsg('No se pudo conectar con el servidor. Intenta nuevamente.');
    }
  };

  const isInvalidLink = !correo || !token;

  return (
    <div className="mx-auto mt-4 w-full max-w-108 space-y-4 sm:mt-5">
      <div className="rounded-2xl border border-cyan-400/20 bg-[#0b234c] px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <p className="text-base font-semibold text-white">Restablecer Contraseña</p>
        <p className="mt-1 text-sm leading-6 text-slate-300">
          Crea una nueva contraseña segura para tu cuenta de NeoClinica.
        </p>
      </div>

      {isInvalidLink ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-5 text-center shadow-lg backdrop-blur-xs">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-400" />
          <h2 className="mt-3 text-lg font-bold text-white">Enlace no válido</h2>
          <p className="mt-2 text-sm leading-relaxed text-rose-200">
            El enlace de recuperación es inválido o ha expirado. Por favor, solicita uno nuevo.
          </p>
          <div className="mt-6 space-y-3">
            <Link
              href="/olvide-password"
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-sky-600 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500"
            >
              Solicitar nuevo enlace
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-800 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      ) : successMsg ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-6 text-center shadow-lg backdrop-blur-xs space-y-4">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
          <h2 className="text-xl font-bold text-white">¡Contraseña Guardada con Éxito!</h2>
          <p className="text-sm leading-relaxed text-emerald-200">
            Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión con tus nuevas credenciales. Puede cerrar esta pestaña.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-sky-500 to-blue-600 text-sm font-bold text-white shadow-md transition hover:brightness-110"
            >
              Ir a Iniciar Sesión Ahora
            </Link>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {errorMsg ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-center text-sm text-rose-200 shadow-sm">
              <AlertCircle className="mx-auto mb-1 h-5 w-5 text-rose-400" />
              {errorMsg}
            </div>
          ) : null}

          {/* Nueva Contraseña */}
          <div>
            <label htmlFor="nuevaPassword" className="sr-only">
              Nueva Contraseña
            </label>
            <div className="flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-[#0b234c] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-sky-300/70 focus-within:ring-2 focus-within:ring-sky-400/25">
              <KeyRound className="h-5 w-5 shrink-0 text-slate-300" />
              <input
                id="nuevaPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nueva Contraseña*"
                className="autofill-fix h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 sm:text-[0.95rem]"
                {...register('nuevaPassword')}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShowPassword((prev) => !prev)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>

            {/* Requisitos de Contraseña */}
            <div className="mt-3 rounded-xl bg-[#0b234c]/50 p-3 text-sm">
              <p className="mb-2 font-medium text-slate-300">La contraseña debe contener:</p>
              <ul className="space-y-1.5">
                <li className={`flex items-center gap-2 ${hasLength ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {hasLength ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  Entre 8 y 15 caracteres
                </li>
                <li className={`flex items-center gap-2 ${hasUpperCase ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {hasUpperCase ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  Al menos una mayúscula
                </li>
                <li className={`flex items-center gap-2 ${hasLowerCase ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {hasLowerCase ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  Al menos una minúscula
                </li>
                <li className={`flex items-center gap-2 ${hasNumber ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {hasNumber ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  Al menos un número
                </li>
                <li className={`flex items-center gap-2 ${hasSpecialChar ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {hasSpecialChar ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  Un símbolo (%, &, @, -, _)
                </li>
              </ul>
            </div>

            {errors.nuevaPassword && watchPassword.length === 0 ? (
              <p className="mt-2 text-sm text-rose-300">{errors.nuevaPassword.message}</p>
            ) : null}
          </div>

          {/* Confirmar Contraseña */}
          <div>
            <label htmlFor="confirmarPassword" className="sr-only">
              Confirmar Contraseña
            </label>
            <div className="flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-[#0b234c] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-sky-300/70 focus-within:ring-2 focus-within:ring-sky-400/25">
              <Lock className="h-5 w-5 shrink-0 text-slate-300" />
              <input
                id="confirmarPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirmar Contraseña*"
                className="autofill-fix h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 sm:text-[0.95rem]"
                {...register('confirmarPassword')}
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
            {errors.confirmarPassword ? (
              <p className="mt-2 text-sm text-rose-300">{errors.confirmarPassword.message}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !isValid || !isPasswordValid}
            className="inline-flex h-13 w-full items-center justify-center rounded-2xl bg-linear-to-r from-sky-500 via-blue-500 to-blue-600 py-3 font-bold uppercase tracking-wide text-white shadow-[0_18px_45px_rgba(37,99,235,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 sm:h-14"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando contraseña...
              </span>
            ) : (
              'Guardar'
            )}
          </button>

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancelar y volver al inicio de sesión
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function RestablecerPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[#071a3b] text-white md:h-screen md:flex-row md:items-stretch">
      {/* Imagen decorativa izquierda */}
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

      {/* Formulario derecho */}
      <div className="flex max-h-screen w-full flex-1 items-stretch overflow-y-auto bg-[#071a3b] px-4 py-4 sm:px-6 md:min-w-0 md:px-8 md:py-6 lg:px-10 lg:py-6">
        <div className="flex w-full min-w-0 flex-col justify-center">
          <div className="mx-auto flex w-full max-w-116 flex-col items-center">
            {/* Encabezado Logo */}
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
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12 text-slate-300">
                    <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
                  </div>
                }
              >
                <RestablecerPasswordForm />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
