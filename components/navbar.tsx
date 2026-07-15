'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { usePacienteTitular } from '@/hooks/use-pacientes';
import { ArrowLeft, Bell, ChevronDown, LogOut, Settings, Stethoscope, UserRound, Home, Star, Heart, Calendar, Target, Pill, BookUser, CalendarDays, Activity, Moon, Sun } from 'lucide-react';

function getNavStyles(label: string) {
    const l = label.toLowerCase();
    if (l.includes('directorio') || l.includes('inicio')) return { Icon: BookUser, from: 'from-[#0052FF]', to: 'to-[#002B99]' };
    if (l.includes('especialidad')) return { Icon: Star, from: 'from-[#56CCF2]', to: 'to-[#2F80ED]' };
    if (l.includes('medicamento') || l.includes('farmacia')) return { Icon: Pill, from: 'from-[#E11D48]', to: 'to-[#9F1239]' };
    if (l.includes('cita')) return { Icon: CalendarDays, from: 'from-[#0D9488]', to: 'to-[#0F766E]' };
    return { Icon: Activity, from: 'from-[#4F46E5]', to: 'to-[#3730A3]' };
}
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
  const router = useRouter();
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark') {
        setTheme('dark');
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    if (theme === 'light') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setTheme('light');
    }
  };

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
    <div className="relative z-50 w-full bg-transparent shadow-none">
      <div className="mx-auto w-[90%] max-w-[1800px]">
        <header className="bg-transparent border-none shadow-none">
        <div className="flex items-center justify-between gap-4 py-4">
        {/* ── Logo ── */}
        <div className="flex shrink-0 items-center gap-3">
          {backHref === 'back' ? (
            <button
              onClick={() => router.back()}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
              aria-label="Volver"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : backHref ? (
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
          <nav className="flex min-w-0 flex-1 flex-nowrap items-center justify-center gap-5 overflow-visible text-sm py-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const { Icon, from, to } = getNavStyles(link.label);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-2 px-4 py-3 transition-colors ${
                    isActive
                      ? 'text-primary font-bold border-b-2 border-primary'
                      : 'text-on-surface-variant hover:text-primary font-medium border-b-2 border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
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
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-transparent text-on-surface hover:bg-surface-container transition-all"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-on-error ring-2 ring-[#FFFFFF]">
            3
          </span>
        </button>

        {/* ── User menu ── */}
        <div ref={userMenuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((v) => !v)}
            className="inline-flex items-center gap-3 rounded-full bg-transparent p-1.5 pr-4 text-left transition-all hover:bg-surface-container whitespace-nowrap"
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
          >
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-black text-primary">
              {userImage ? (
                <img src={userImage} alt={userName} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                userInitials
              )}
            </span>
            <span className="hidden flex-col text-left sm:flex">
              <span className="text-sm font-bold text-on-surface">{userName}</span>
              <span className="text-xs text-on-surface-variant font-medium">{userEmail}</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-on-surface-variant transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
          {isUserMenuOpen && (
            <motion.div
              className="absolute right-0 z-50 mt-3 w-72 overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-lowest shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="border-b border-outline-variant/20 px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-base font-black text-primary">
                    {userImage ? (
                      <img src={userImage} alt={userName} className="h-12 w-12 rounded-2xl object-cover" />
                    ) : (
                      userInitials
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-on-surface">{userName}</p>
                    <p className="truncate text-xs text-on-surface-variant">{userEmail}</p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container hover:text-primary"
                >
                  <span className="flex items-center gap-3">
                    {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    Modo Oscuro
                  </span>
                  <div className={`relative flex h-5 w-9 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-outline-variant'}`}>
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                </button>
                <Link
                  href="/dashboard/perfil"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container hover:text-primary"
                >
                  <UserRound className="h-4 w-4" />
                  Mi perfil
                </Link>
                <Link
                  href="/dashboard/perfil/configuracion"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container hover:text-primary"
                >
                  <Settings className="h-4 w-4" />
                  Configuraciones
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-error transition hover:bg-error/10"
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
    </div>
  );
}
