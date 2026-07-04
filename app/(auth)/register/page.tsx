'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { registerSchema, type RegisterFormValues } from '../../../lib/validations/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { primerNombre: '', primerApellido: '', correo: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
  });

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      const response = await fetch('/api/autenticacion/registrar-paciente', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const contentType = response.headers.get('content-type') ?? '';
      const responseBody = contentType.includes('application/json') ? await response.json() : await response.text();

      if (!response.ok) {
        const errorMessage =
          typeof responseBody === 'string'
            ? responseBody
            : responseBody?.mensaje || responseBody?.message || 'Error al registrar.';

        throw new Error(errorMessage);
      }

      const loginResult = await signIn('credentials', {
        redirect: false,
        correo: values.correo,
        password: values.password,
      });

      if (loginResult?.error || !loginResult?.ok) {
        throw new Error('El usuario se registró, pero no se pudo iniciar sesión automáticamente.');
      }

      router.replace('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar.';
      alert(message);
    }
  };

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[#071a3b] text-white md:h-screen md:flex-row md:items-stretch">
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
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.8rem]">
                Crear cuenta
              </h1>
              <div className="mt-3 h-1 w-16 rounded-full bg-cyan-400/80" />
            </div>

            <div className="w-full bg-[#071a3b]">
              <form onSubmit={handleSubmit(onSubmit)} className="mx-auto mt-4 w-full max-w-108 space-y-3 sm:mt-5 sm:space-y-4" noValidate>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="sr-only">Primer Nombre</label>
                    <div className="flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-[#0b234c] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <input {...register('primerNombre')} disabled={isSubmitting} placeholder="Primer Nombre" className="h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70 sm:text-[0.95rem]" />
                    </div>
                    {errors.primerNombre ? <p className="mt-2 text-sm text-rose-300">{errors.primerNombre.message}</p> : null}
                  </div>
                  <div className="flex-1">
                    <label className="sr-only">Primer Apellido</label>
                    <div className="flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-[#0b234c] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <input {...register('primerApellido')} disabled={isSubmitting} placeholder="Primer Apellido" className="h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70 sm:text-[0.95rem]" />
                    </div>
                    {errors.primerApellido ? <p className="mt-2 text-sm text-rose-300">{errors.primerApellido.message}</p> : null}
                  </div>
                </div>

                <div>
                  <label className="sr-only">Correo</label>
                  <div className="flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-[#0b234c] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <input {...register('correo')} disabled={isSubmitting} placeholder="Correo electrónico" className="h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70 sm:text-[0.95rem]" />
                  </div>
                  {errors.correo ? <p className="mt-2 text-sm text-rose-300">{errors.correo.message}</p> : null}
                </div>

                <div>
                  <label className="sr-only">Contraseña</label>
                  <div className="flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-[#0b234c] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-sky-300/70 focus-within:ring-2 focus-within:ring-sky-400/25">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      disabled={isSubmitting}
                      placeholder="Contraseña"
                      className="h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70 sm:text-[0.95rem]"
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

                <div>
                  <label className="sr-only">Confirmar contraseña</label>
                  <div className="flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-[#0b234c] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-sky-300/70 focus-within:ring-2 focus-within:ring-sky-400/25">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...register('confirmPassword')}
                      disabled={isSubmitting}
                      placeholder="Confirmar contraseña"
                      className="h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70 sm:text-[0.95rem]"
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                      onClick={() => setShowConfirmPassword((currentValue) => !currentValue)}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/5 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                  {errors.confirmPassword ? <p className="mt-2 text-sm text-rose-300">{errors.confirmPassword.message}</p> : null}
                </div>

                <button type="submit" disabled={isSubmitting} className="inline-flex h-13 w-full items-center justify-center rounded-2xl bg-linear-to-r from-sky-500 via-blue-500 to-blue-600 py-3 font-bold uppercase tracking-wide text-white shadow-[0_18px_45px_rgba(37,99,235,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 sm:h-14">
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Registrando
                    </span>
                  ) : (
                    'Registrarse'
                  )}
                </button>

                <p className="pt-2 text-center text-sm text-slate-400 md:hidden">
                  ¿Ya tienes cuenta?{' '}
                  <Link href="/login" className="font-medium text-cyan-300 underline underline-offset-4 transition hover:text-cyan-200">Inicia sesión</Link>
                </p>
              </form>
            </div>
          </div>

          <div className="mt-5 hidden text-center text-sm text-slate-400 md:block">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-medium text-cyan-300 underline underline-offset-4 transition hover:text-cyan-200">Inicia sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
