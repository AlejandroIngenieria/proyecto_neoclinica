'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowLeft, CheckCircle2, Circle, Eye, EyeOff, Loader2, RotateCcw, AlertCircle, Info } from 'lucide-react';
import {
  restablecerPasswordSchema,
  type RestablecerPasswordFormValues,
} from '@/lib/validations/auth';
import { CapsLockWarning } from '@/components/caps-lock-warning';
import { useCapsLock } from '@/hooks/use-caps-lock';

function RestablecerPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const correo = searchParams.get('correo') ?? '';
  const token = searchParams.get('token') ?? '';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSlow, setIsSlow] = useState(false);

  const abortRef = useRef<boolean>(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  // Caps Lock detection
  const { isCapsLockOn, checkCapsLock, resetCapsLock } = useCapsLock();

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

  useEffect(() => {
    const timer = setTimeout(() => {
      document.getElementById('nuevaPassword')?.focus();
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const watchPassword = watch('nuevaPassword') || '';
  const hasLength = watchPassword.length >= 8 && watchPassword.length <= 15;
  const hasUpperCase = /[A-Z]/.test(watchPassword);
  const hasLowerCase = /[a-z]/.test(watchPassword);
  const hasNumber = /\d/.test(watchPassword);
  const hasSpecialChar = /[%&@\-_]/.test(watchPassword);
  const isPasswordValid = hasLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

  const handleCancel = () => {
    abortRef.current = true;
    clearTimers();
    setIsSlow(false);
  };

  const onSubmit = async (values: RestablecerPasswordFormValues) => {
    abortRef.current = false;
    clearTimers();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSlow(false);

    if (!correo || !token) {
      setErrorMsg('El enlace de recuperación es inválido o ha expirado.');
      return;
    }

    const t = setTimeout(() => {
      if (!abortRef.current) setIsSlow(true);
    }, 9000);
    timersRef.current = [t];

    try {
      const response = await fetch('/api/autenticacion/restablecer-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo,
          token,
          nuevaPassword: values.nuevaPassword,
        }),
      });

      clearTimers();
      setIsSlow(false);

      if (abortRef.current) return;

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

      setSuccessMsg('Tu contraseña ha sido actualizada exitosamente.');
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch {
      clearTimers();
      setIsSlow(false);
      if (!abortRef.current) {
        setErrorMsg('No se pudo conectar con el servidor. Revisa tu conexión a internet o presiona reintentar.');
      }
    }
  };

  if (successMsg) {
    return (
      <div className="text-center space-y-4 py-2">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">¡Contraseña Actualizada!</h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
          {successMsg} Te redirigiremos a la pantalla de inicio de sesión...
        </p>
        <div className="pt-2">
          <Link
            href="/login"
            className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-sm font-semibold text-white shadow-md shadow-sky-500/20 transition active:scale-[0.99]"
          >
            Iniciar Sesión Ahora
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-rose-950 dark:text-rose-100">{errorMsg}</p>
            <button
              type="button"
              onClick={() => handleSubmit(onSubmit)()}
              className="inline-flex items-center gap-1 font-bold text-rose-800 dark:text-rose-200 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reintentar ahora
            </button>
          </div>
        </div>
      )}

      {isSlow && (
        <div className="rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50/90 dark:bg-sky-950/50 p-3.5 text-xs text-sky-900 dark:text-sky-200 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-[#0284c7] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">La solicitud está tardando más de lo habitual...</p>
              <p className="text-slate-600 dark:text-slate-300 mt-0.5">Puedes esperar o reintentar sin recargar la página.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => {
                handleCancel();
                setTimeout(() => handleSubmit(onSubmit)(), 120);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              Reintentar ahora
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Nueva Contraseña */}
        <div>
          <label htmlFor="nuevaPassword" className="block text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 tracking-wide">
            Nueva Contraseña
          </label>
          <div className="flex h-12 items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-4 transition-all focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-[#0284c7]/20 focus-within:bg-white dark:focus-within:bg-slate-800">
            <input
              id="nuevaPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              onKeyDown={checkCapsLock}
              onKeyUp={checkCapsLock}
              aria-describedby={errors.nuevaPassword ? 'nuevaPassword_error' : undefined}
              aria-invalid={!!errors.nuevaPassword}
              className="w-full h-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none autofill-fix"
              {...register('nuevaPassword', { onBlur: resetCapsLock })}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 cursor-pointer shrink-0 ml-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <CapsLockWarning isVisible={isCapsLockOn} />

          {/* Requisitos de seguridad */}
          <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
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

          {errors.nuevaPassword && watchPassword.length === 0 && (
            <p id="nuevaPassword_error" role="alert" className="mt-1 text-xs text-rose-500 font-medium">
              {errors.nuevaPassword.message}
            </p>
          )}
        </div>

        {/* Confirmar Contraseña */}
        <div>
          <label htmlFor="confirmarPassword" className="block text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 tracking-wide">
            Confirmar Contraseña
          </label>
          <div className="flex h-12 items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-4 transition-all focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-[#0284c7]/20 focus-within:bg-white dark:focus-within:bg-slate-800">
            <input
              id="confirmarPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              onKeyDown={checkCapsLock}
              onKeyUp={checkCapsLock}
              aria-describedby={errors.confirmarPassword ? 'confirmarPassword_error' : undefined}
              aria-invalid={!!errors.confirmarPassword}
              className="w-full h-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none autofill-fix"
              {...register('confirmarPassword', { onBlur: resetCapsLock })}
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 cursor-pointer shrink-0 ml-1"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <CapsLockWarning isVisible={isCapsLockOn} />
          {errors.confirmarPassword && (
            <p id="confirmarPassword_error" role="alert" className="mt-1 text-xs text-rose-500 font-medium">
              {errors.confirmarPassword.message}
            </p>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !isValid || !isPasswordValid}
            className="w-full h-12 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-sm tracking-wide shadow-md shadow-sky-500/20 transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando nueva contraseña...
              </span>
            ) : (
              'Guardar nueva contraseña'
            )}
          </button>
        </div>

        <div className="pt-2 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-[#0284c7] dark:hover:text-sky-400 font-semibold transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Cancelar y volver a Iniciar Sesión
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function RestablecerPasswordPage() {
  return (
    <div className="min-h-screen w-full bg-[#f8fafc] dark:bg-[#0b172a] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors relative selection:bg-sky-500 selection:text-white">
      {/* Background Soft Lighting Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-sky-200/40 via-sky-100/20 to-transparent dark:from-sky-950/20 dark:via-blue-900/10 dark:to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-100/30 dark:bg-sky-900/10 rounded-full blur-3xl" />
      </div>

      {/* Header with NeoClínica Branding */}
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
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 mb-1.5">
            <span>PORTAL DE PACIENTES</span>
            <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Restablecer Contraseña
          </h1>
        </div>

        <div className="w-full bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800/80 shadow-[0_12px_45px_rgba(2,132,199,0.06)] dark:shadow-[0_12px_45px_rgba(0,0,0,0.3)] p-6 sm:p-9 transition-all">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-[#0284c7]" />
              </div>
            }
          >
            <RestablecerPasswordForm />
          </Suspense>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            ¿Recordaste tu contraseña anterior?{' '}
            <Link
              href="/login"
              className="font-bold text-slate-900 dark:text-white hover:text-[#0284c7] dark:hover:text-sky-400 transition ml-1"
            >
              Iniciar sesión
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
