'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Compass,
  Home,
  LogIn,
  Stethoscope,
  ArrowLeft,
  Search,
} from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans relative overflow-hidden">
      {/* Fondo con degradado sutil */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg text-center space-y-8">
        {/* Cabecera / Identificador visual */}
        <div className="flex flex-col items-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Compass className="w-10 h-10 stroke-[1.75]" />
            </div>
            <span className="absolute -bottom-2 -right-2 px-2 py-0.5 text-[11px] font-mono font-bold bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-300 rounded-md border border-slate-700">
              404
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 mb-3 border border-slate-200/60 dark:border-slate-700/60">
            Página no encontrada
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            La ubicación solicitada no existe
          </h1>

          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
            La dirección web que intentas consultar no está disponible, el enlace pudo haber expirado o la página fue reubicada dentro del sistema.
          </p>
        </div>

        {/* Opciones Principales de Navegación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition active:scale-[0.98] cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Ir al Inicio</span>
          </Link>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-semibold text-sm shadow-2xs transition active:scale-[0.98] cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Iniciar Sesión</span>
          </Link>
        </div>

        {/* Accesos Secundarios */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <Link
            href="/dashboard/directorio"
            className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition cursor-pointer"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Explorar Directorio Médico</span>
          </Link>

          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-200 font-medium transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Regresar a la página anterior</span>
          </button>
        </div>

        {/* Marca institucional al pie */}
        <div className="pt-4">
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            SaludYa · Plataforma de Servicios de Salud
          </p>
        </div>
      </div>
    </main>
  );
}
