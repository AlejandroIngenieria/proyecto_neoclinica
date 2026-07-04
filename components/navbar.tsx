'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { usePacienteTitular } from '@/hooks/use-pacientes';
import { ArrowLeft, Bell, ChevronDown, LogOut, Settings, Stethoscope, UserRound } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────────────

type NavLink = {
  href: string;
  label: string;
};

type NavbarProps = {
  /** Links de navegación que aparecen en el centro del navbar. */
  navLinks?: NavLink[];
  /** Si se proporciona, muestra un botón "Volver" con este destino. */
  backHref?: string;
  /** Subtítulo que aparece debajo de "NeoClinica". */
  subtitle?: string;
  /** Contenido extra debajo del navbar principal (buscadores, filtros, etc.). */
  children?: React.ReactNode;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function Navbar({ navLinks = [], backHref, subtitle, children }: NavbarProps) {
  const { data: session } = useSession();
  const { titular } = usePacienteTitular();
  const pathname = usePathname();
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const sessionName = session?.user?.name || 'Usuario';
  const userName = titular
    ? `${titular.pac_primer_nombre || ''} ${titular.pac_primer_apellido || ''}`.trim() || sessionName
    : sessionName;
  const userEmail = session?.user?.email || 'Sin correo';
  const userImage = titular?.pac_foto_perfil_url || session?.user?.image || '';

  const userInitials = useMemo(
    () =>
      userName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('') || 'U',
    [userName],
  );

  // Cerrar menú al hacer clic fuera o con Escape
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div className="sticky top-4 z-40 mx-auto w-[90%] max-w-[1800px]">
      <header className="rounded-3xl border border-slate-200/60 bg-white/80 shadow-xl shadow-slate-900/5 backdrop-blur-xl">
      <div className="flex items-center gap-4 px-4 py-4 lg:px-6">
        {/* ── Logo ── */}
        <div className="flex shrink-0 items-center gap-3">
          {backHref ? (
            <Link
              href={backHref}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
              aria-label="Volver"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-200">
              <Stethoscope className="h-6 w-6" />
            </div>
          )}
          <div className="whitespace-nowrap">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-700">NeoClinica</p>
            <h1 className="text-lg font-black tracking-tight text-slate-900">
              {subtitle || (backHref ? 'Perfil médico' : 'Directorio médico')}
            </h1>
          </div>
        </div>

        {/* ── Nav links ── */}
        {navLinks.length > 0 && (
          <nav className="flex min-w-0 flex-1 flex-nowrap items-center justify-center gap-1 overflow-x-auto text-sm font-semibold text-slate-600">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative rounded-full px-4 py-2 transition ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 font-bold'
                      : 'hover:bg-slate-100 hover:text-sky-700'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 h-0.5 w-3/5 -translate-x-1/2 rounded-full bg-sky-600" />
                  )}
                </Link>
              );
            })}
          </nav>
        )}

        {/* ── Spacer cuando no hay nav links ── */}
        {navLinks.length === 0 && <div className="flex-1" />}

        {/* ── Notifications ── */}
        <button
          type="button"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
            3
          </span>
        </button>

        {/* ── User menu ── */}
        <div ref={userMenuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((v) => !v)}
            className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2 py-2 text-left shadow-sm transition hover:border-sky-200 hover:bg-sky-50 whitespace-nowrap"
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
          >
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-sm font-black text-sky-700">
              {userImage ? (
                <img src={userImage} alt={userName} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                userInitials
              )}
            </span>
            <span className="hidden flex-col text-left sm:flex">
              <span className="text-sm font-bold text-slate-900">{userName}</span>
              <span className="text-xs text-slate-500">{userEmail}</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-slate-500 transition ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
          {isUserMenuOpen && (
            <motion.div
              className="absolute right-0 z-40 mt-3 w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.15)]"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="border-b border-slate-100 px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-sky-100 text-base font-black text-sky-700">
                    {userImage ? (
                      <img src={userImage} alt={userName} className="h-12 w-12 rounded-2xl object-cover" />
                    ) : (
                      userInitials
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">{userName}</p>
                    <p className="truncate text-xs text-slate-500">{userEmail}</p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                <Link
                  href="/dashboard/perfil"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-sky-700"
                >
                  <UserRound className="h-4 w-4" />
                  Mi perfil
                </Link>
                <Link
                  href="/dashboard/perfil/configuracion"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-sky-700"
                >
                  <Settings className="h-4 w-4" />
                  Configuraciones
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Contenido extra (buscadores, filtros, etc.) ── */}
      {children && (
        <div className="border-t border-slate-200/50 px-4 py-4 lg:px-6">
          {children}
        </div>
      )}
      </header>
    </div>
  );
}
