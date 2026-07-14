'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, CheckCircle2, Circle, ArrowRight, ArrowLeft } from 'lucide-react';
import Swal from 'sweetalert2';
import { registerSchema, type RegisterFormValues } from '../../../lib/validations/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { 
      primerNombre: '', 
      segundoNombre: '', 
      primerApellido: '', 
      segundoApellido: '', 
      apellidoCasado: '', 
      correo: '', 
      password: '', 
      confirmPassword: '' 
    },
    mode: 'onChange',
  });

  const watchPassword = watch('password') || '';
  const hasLength = watchPassword.length >= 8 && watchPassword.length <= 15;
  const hasUpperCase = /[A-Z]/.test(watchPassword);
  const hasLowerCase = /[a-z]/.test(watchPassword);
  const hasSpecialChar = /[%&@\-_]/.test(watchPassword);
  
  const isPasswordValid = hasLength && hasUpperCase && hasLowerCase && hasSpecialChar;

  const handleNextStep = async () => {
    // Validar solo los campos del Paso 1 antes de continuar
    const isStep1Valid = await trigger([
      'primerNombre', 
      'segundoNombre', 
      'primerApellido', 
      'segundoApellido', 
      'apellidoCasado'
    ]);
    if (isStep1Valid) {
      setStep(2);
    }
  };

  const handlePrevStep = () => {
    setStep(1);
  };

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      const response = await fetch('/api/autenticacion/registrar-paciente', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
           correo: values.correo,
           password: values.password,
           primerNombre: values.primerNombre,
           segundoNombre: values.segundoNombre || '',
           primerApellido: values.primerApellido,
           segundoApellido: values.segundoApellido || '',
           apellidoCasado: values.apellidoCasado || ''
        }),
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

      await Swal.fire({
        title: '¡Registro exitoso!',
        text: 'Tu cuenta ha sido creada correctamente.',
        icon: 'success',
        confirmButtonColor: '#0ea5e9'
      });

      router.replace('/login');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar.';
      Swal.fire({
        title: 'Error',
        text: message,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
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
              
              {/* Stepper Indicator */}
              <div className="mx-auto mb-6 flex w-full max-w-108 items-center justify-center gap-2 text-sm font-medium">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${step >= 1 ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300' : 'border-slate-500 text-slate-500'}`}>
                  1
                </div>
                <div className={`h-0.5 w-10 ${step === 2 ? 'bg-cyan-400' : 'bg-slate-600'}`}></div>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${step === 2 ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300' : 'border-slate-500 text-slate-500'}`}>
                  2
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="mx-auto w-full max-w-108 space-y-3 sm:space-y-4" noValidate>
                
                {/* ---------------- PASO 1 ---------------- */}
                <div className={step === 1 ? 'block space-y-3 sm:space-y-4 animate-in fade-in duration-300' : 'hidden'}>
                  {/* Nombres */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="sr-only">Primer Nombre</label>
                      <div className="flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-[#0b234c] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                        <input {...register('primerNombre')} disabled={isSubmitting} placeholder="Primer Nombre*" className="autofill-fix h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70 sm:text-[0.95rem]" />
                      </div>
                      {errors.primerNombre ? <p className="mt-2 text-sm text-rose-300">{errors.primerNombre.message}</p> : null}
                    </div>
                    <div className="flex-1">
                      <label className="sr-only">Segundo Nombre</label>
                      <div className="flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-[#0b234c] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                        <input {...register('segundoNombre')} disabled={isSubmitting} placeholder="Segundo Nombre" className="autofill-fix h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70 sm:text-[0.95rem]" />
                      </div>
                    </div>
                  </div>

                  {/* Apellidos */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="sr-only">Primer Apellido</label>
                      <div className="flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-[#0b234c] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                        <input {...register('primerApellido')} disabled={isSubmitting} placeholder="Primer Apellido*" className="autofill-fix h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70 sm:text-[0.95rem]" />
                      </div>
                      {errors.primerApellido ? <p className="mt-2 text-sm text-rose-300">{errors.primerApellido.message}</p> : null}
                    </div>
                    <div className="flex-1">
                      <label className="sr-only">Segundo Apellido</label>
                      <div className="flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-[#0b234c] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                        <input {...register('segundoApellido')} disabled={isSubmitting} placeholder="Segundo Apellido" className="autofill-fix h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70 sm:text-[0.95rem]" />
                      </div>
                    </div>
                  </div>

                  {/* Apellido Casado */}
                  <div>
                    <label className="sr-only">Apellido de Casado(a)</label>
                    <div className="flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-[#0b234c] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <input {...register('apellidoCasado')} disabled={isSubmitting} placeholder="Apellido de Casado(a)" className="autofill-fix h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70 sm:text-[0.95rem]" />
                    </div>
                  </div>

                  <button 
                    type="button" 
                    onClick={handleNextStep}
                    className="mt-4 inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-sky-500 via-blue-500 to-blue-600 py-3 font-bold uppercase tracking-wide text-white shadow-[0_18px_45px_rgba(37,99,235,0.35)] transition hover:brightness-110 sm:h-14"
                  >
                    Continuar
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>

                {/* ---------------- PASO 2 ---------------- */}
                <div className={step === 2 ? 'block space-y-3 sm:space-y-4 animate-in fade-in duration-300' : 'hidden'}>
                  {/* Correo */}
                  <div>
                    <label className="sr-only">Correo</label>
                    <div className="flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-[#0b234c] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <input {...register('correo')} disabled={isSubmitting} placeholder="Correo electrónico*" className="autofill-fix h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70 sm:text-[0.95rem]" />
                    </div>
                    {errors.correo ? <p className="mt-2 text-sm text-rose-300">{errors.correo.message}</p> : null}
                  </div>

                  {/* Contraseña */}
                  <div>
                    <label className="sr-only">Contraseña</label>
                    <div className="flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-[#0b234c] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-sky-300/70 focus-within:ring-2 focus-within:ring-sky-400/25">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        {...register('password')}
                        disabled={isSubmitting}
                        placeholder="Contraseña*"
                        className="autofill-fix h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70 sm:text-[0.95rem]"
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
                        <li className={`flex items-center gap-2 ${hasSpecialChar ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {hasSpecialChar ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                          Un símbolo (%, &, @, -, _)
                        </li>
                      </ul>
                    </div>
                    {errors.password && watchPassword.length === 0 ? <p className="mt-2 text-sm text-rose-300">{errors.password.message}</p> : null}
                  </div>

                  {/* Confirmar Contraseña */}
                  <div>
                    <label className="sr-only">Confirmar contraseña</label>
                    <div className="flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-[#0b234c] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-sky-300/70 focus-within:ring-2 focus-within:ring-sky-400/25">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...register('confirmPassword')}
                        disabled={isSubmitting}
                        placeholder="Confirmar contraseña*"
                        className="autofill-fix h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70 sm:text-[0.95rem]"
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

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button 
                      type="button" 
                      onClick={handlePrevStep}
                      className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-600 bg-transparent py-3 font-bold uppercase tracking-wide text-slate-300 transition hover:bg-white/5 hover:text-white sm:h-14"
                    >
                      <ArrowLeft className="h-5 w-5" />
                      Atrás
                    </button>
                    
                    <button 
                      type="submit" 
                      disabled={isSubmitting || !isValid || !isPasswordValid} 
                      className="inline-flex h-13 flex-[2] items-center justify-center rounded-2xl bg-linear-to-r from-sky-500 via-blue-500 to-blue-600 py-3 font-bold uppercase tracking-wide text-white shadow-[0_18px_45px_rgba(37,99,235,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 sm:h-14"
                    >
                      {isSubmitting ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Registrando
                        </span>
                      ) : (
                        'Registrarse'
                      )}
                    </button>
                  </div>
                </div>

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
