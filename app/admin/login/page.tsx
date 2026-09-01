'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, signOut } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Shield, Lock, Mail, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const adminLoginSchema = z.object({
  correo: z
    .string()
    .min(1, 'El correo electrónico es requerido.')
    .email('Ingresa un correo electrónico válido.'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida.'),
});

type AdminLoginFormValues = z.infer<typeof adminLoginSchema>;

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/admin';

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginFormValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      correo: '',
      password: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = async (values: AdminLoginFormValues) => {
    setErrorMessage('');
    setIsAuthenticating(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        correo: values.correo.trim(),
        password: values.password,
      });

      if (!result || result.error) {
        setErrorMessage('Credenciales inválidas. Verifica tu correo y contraseña administrativa.');
        setIsAuthenticating(false);
        return;
      }

      // Validar la sesión para confirmar que tiene rol 'admin'
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();

      if (session?.user?.role !== 'admin') {
        await signOut({ redirect: false });
        setErrorMessage('Acceso denegado: Esta cuenta no posee privilegios administrativos.');
        setIsAuthenticating(false);
        return;
      }

      // Redirigir al panel administrativo
      router.replace(returnUrl);
    } catch {
      setErrorMessage('No se pudo conectar con el servidor de autenticación. Intenta nuevamente.');
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Header Card */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-sky-500/20 border border-amber-500/30 shadow-lg shadow-amber-500/10 mb-2">
          <Shield className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Portal Administrativo
        </h1>
        <p className="text-sm text-slate-400">
          Acceso restringido únicamente para personal autorizado de NeoClínica.
        </p>
      </div>

      {/* Login Box */}
      <div className="rounded-3xl border border-slate-800 bg-[#0d1f3d]/90 p-7 shadow-2xl backdrop-blur-xl sm:p-8 space-y-5">
        {errorMessage && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Campo Correo */}
          <div>
            <label htmlFor="correo" className="block mb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              Correo Administrativo
            </label>
            <div className="flex h-13 items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 px-4 transition focus-within:border-amber-400/80 focus-within:ring-2 focus-within:ring-amber-400/20">
              <Mail className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                id="correo"
                type="email"
                autoComplete="email"
                placeholder="admin@neoclinica.com"
                className="h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                {...register('correo')}
              />
            </div>
            {errors.correo && (
              <p className="mt-1.5 text-xs text-rose-400">{errors.correo.message}</p>
            )}
          </div>

          {/* Campo Contraseña */}
          <div>
            <label htmlFor="password" className="block mb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              Contraseña
            </label>
            <div className="flex h-13 items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 px-4 transition focus-within:border-amber-400/80 focus-within:ring-2 focus-within:ring-amber-400/20">
              <Lock className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-full w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                {...register('password')}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShowPassword(!showPassword)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs text-rose-400">{errors.password.message}</p>
            )}
          </div>

          {/* Botón Submit */}
          <button
            type="submit"
            disabled={isAuthenticating}
            className="w-full h-13 mt-2 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 font-bold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
          >
            {isAuthenticating ? (
              <span className="inline-flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                Validando Acceso...
              </span>
            ) : (
              'Ingresar al Panel'
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-800">
          <Link
            href="/login"
            className="text-xs font-medium text-slate-400 hover:text-slate-200 transition inline-flex items-center gap-1.5"
          >
            ← Volver al portal general de pacientes
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#060e1f] px-4 py-12">
      {/* Background Glow effects */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/10 rounded-full blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[400px] h-[300px] bg-sky-500/10 rounded-full blur-[120px]" />

      <Suspense fallback={
        <div className="flex items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        </div>
      }>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
