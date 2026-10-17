'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowLeft, CheckCircle2, Loader2, RotateCcw, AlertCircle, Info } from 'lucide-react';
import {
  solicitarRecuperacionSchema,
  type SolicitarRecuperacionFormValues,
} from '@/lib/validations/auth';
import { EmailAutocompleteInput } from '@/components/email-autocomplete-input';
import { getRememberedEmail } from '@/lib/email-history';

function OlvidePasswordForm() {
  const searchParams = useSearchParams();
  const initialCorreo = searchParams.get('correo') ?? '';

  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSlow, setIsSlow] = useState(false);
  const abortRef = useRef<boolean>(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SolicitarRecuperacionFormValues>({
    resolver: zodResolver(solicitarRecuperacionSchema),
    defaultValues: {
      correo: initialCorreo,
    },
    mode: 'onTouched',
  });

  const watchEmail = watch('correo') || '';
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(watchEmail.trim());

  useEffect(() => {
    if (!initialCorreo) {
      const remembered = getRememberedEmail();
      if (remembered) {
        setValue('correo', remembered);
      }
    }
    const timer = setTimeout(() => {
      document.getElementById('correo')?.focus();
    }, 120);
    return () => clearTimeout(timer);
  }, [initialCorreo, setValue]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const handleCancel = () => {
    abortRef.current = true;
    clearTimers();
    setIsSlow(false);
  };

  const onSubmit = async (values: SolicitarRecuperacionFormValues) => {
    abortRef.current = false;
    clearTimers();
    setErrorMsg('');
    setIsSlow(false);

    const t = setTimeout(() => {
      if (!abortRef.current) setIsSlow(true);
    }, 9000);
    timersRef.current = [t];

    try {
      const response = await fetch('/api/autenticacion/solicitar-recuperacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: values.correo.trim() }),
      });

      clearTimers();
      setIsSlow(false);

      if (abortRef.current) return;

      if (response.status === 429) {
        setErrorMsg('Has realizado varios intentos recientemente. Por favor espera unos minutos antes de solicitar otro enlace.');
        return;
      }

      if (!response.ok) {
        const text = await response.text();
        let json: any = null;
        try { json = JSON.parse(text); } catch {}
        const msg = json?.mensaje || json?.message || 'Ocurrió un inconveniente al procesar tu solicitud. Intenta más tarde.';
        setErrorMsg(msg);
        return;
      }

      setSubmitted(true);
    } catch {
      clearTimers();
      setIsSlow(false);
      if (!abortRef.current) {
        setErrorMsg('No se pudo conectar con el servidor. Revisa tu conexión a internet o presiona reintentar.');
      }
    }
  };

  if (submitted) {
    return (
      <div className="text-center space-y-4 py-2">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">¡Correo Enviado!</h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
          Hemos enviado un enlace a tu correo electrónico para restablecer la contraseña de tu cuenta.
        </p>
        <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400">
          Revisa tu bandeja principal o carpeta de spam. Puedes cerrar esta ventana.
        </div>
        <div className="pt-2">
          <Link
            href="/login"
            className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-sm font-semibold text-white shadow-md shadow-sky-500/20 transition active:scale-[0.99]"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Iniciar Sesión
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
        <div>
          <label htmlFor="correo" className="block text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 tracking-wide">
            Correo electrónico
          </label>
          <div className="flex h-12 items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-4 transition-all focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-[#0284c7]/20 focus-within:bg-white dark:focus-within:bg-slate-800">
            <EmailAutocompleteInput
              id="correo"
              autoComplete="email"
              placeholder="tu@correo.com"
              aria-describedby={errors.correo ? 'correo_error' : undefined}
              aria-invalid={!!errors.correo}
              className="w-full h-full bg-transparent text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 autofill-fix"
              {...register('correo')}
            />
            {isEmailValid && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 ml-2 animate-in fade-in zoom-in-75 duration-200 shadow-xs" />
            )}
          </div>
          {errors.correo && (
            <p id="correo_error" role="alert" className="mt-1.5 text-xs text-rose-500 font-medium">
              {errors.correo.message}
            </p>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-sm tracking-wide shadow-md shadow-sky-500/20 transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando enlace...
              </span>
            ) : (
              'Enviar enlace'
            )}
          </button>
        </div>

        <div className="pt-2 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-[#0284c7] dark:hover:text-sky-400 font-semibold transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a Iniciar Sesión
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function OlvidePasswordPage() {
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
            Recuperar Contraseña
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
            <OlvidePasswordForm />
          </Suspense>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            ¿Recordaste tu contraseña?{' '}
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
