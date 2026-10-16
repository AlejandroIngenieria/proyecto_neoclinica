'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Stethoscope } from 'lucide-react';

export function Footer() {
  const pathname = usePathname();

  // No renderizar en páginas de autenticación completas ni en landing raíz
  if (
    !pathname ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/olvide-password' ||
    pathname === '/restablecer-password' ||
    pathname === '/admin/login' ||
    pathname.startsWith('/(auth)')
  ) {
    return null;
  }

  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-500 dark:text-slate-400 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          {/* Marca y Derechos Reservados */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-2xs">
                <Stethoscope className="w-3.5 h-3.5" />
              </div>
              <span className="font-extrabold tracking-tight text-sm text-slate-900 dark:text-white">NeoClínica</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              © {currentYear} Todos los derechos reservados.
            </span>
          </div>

          {/* Enlaces de Navegación y Legales */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center font-medium text-[11.5px]">
            <Link
              href="/dashboard/directorio"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Directorio
            </Link>
            <Link
              href="/dashboard/citas"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Citas
            </Link>
            <Link
              href="/dashboard/medicamentos"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Medicamentos
            </Link>
            <Link
              href="/dashboard/perfil"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Mi Perfil
            </Link>
            <span className="text-slate-300 dark:text-slate-700 hidden md:inline">•</span>
            <span className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer">
              Privacidad
            </span>
            <span className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer">
              Términos
            </span>
            <a
              href="mailto:soporte@neoclinica.com"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Soporte
            </a>
          </div>

          {/* Estado del Sistema */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Sistema Operativo</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
