'use client';

import { Suspense, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import {
  solicitarRecuperacionSchema,
  type SolicitarRecuperacionFormValues,
} from '@/lib/validations/auth';

function OlvidePasswordForm() {
  const searchParams = useSearchParams();
  const initialCorreo = searchParams.get('correo') ?? '';

  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SolicitarRecuperacionFormValues>({
    resolver: zodResolver(solicitarRecuperacionSchema),
    defaultValues: {
      correo: initialCorreo,
    },
    mode: 'onTouched',
  });

  const onSubmit = async (values: SolicitarRecuperacionFormValues) => {
    setErrorMsg('');

    try {
      await fetch('/api/autenticacion/solicitar-recuperacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ correo: values.correo }),
      });

      // Independientemente del resultado técnico o status de la API,
      // mostramos siempre el mensaje fijo por privacidad y seguridad del usuario.
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    }
  };

  return (
    <div className="mx-auto mt-4 w-full max-w-108 space-y-4 sm:mt-5">
      <div className="rounded-2xl border border-cyan-400/20 bg-[#0b234c] px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <p className="text-base font-semibold text-white">¿Olvidaste tu contraseña?</p>
        <p className="mt-1 text-sm leading-6 text-slate-300">
          Ingresa tu correo electrónico registrado y te enviaremos las instrucciones para recuperar tu acceso.
        </p>
      </div>

      {submitted ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-5 text-center shadow-lg backdrop-blur-xs">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
          <h2 className="mt-3 text-lg font-bold text-white">Solicitud enviada</h2>
          <p className="mt-2 text-sm leading-relaxed text-emerald-200">
            Si el correo está registrado, recibirás las instrucciones en tu bandeja de entrada.
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-800 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Iniciar Sesión
            </Link>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {errorMsg ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-sm text-rose-200">
              {errorMsg}
            </div>
          ) : null}

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
            {errors.correo ? (
              <p className="mt-2 text-sm text-rose-300">{errors.correo.message}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-13 w-full items-center justify-center rounded-2xl bg-linear-to-r from-sky-500 via-blue-500 to-blue-600 py-3 font-bold uppercase tracking-wide text-white shadow-[0_18px_45px_rgba(37,99,235,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 sm:h-14"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando enlace...
              </span>
            ) : (
              'Enviar enlace'
            )}
          </button>

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Iniciar Sesión
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function OlvidePasswordPage() {
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
                <OlvidePasswordForm />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
