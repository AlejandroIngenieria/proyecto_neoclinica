'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { usePacienteTitular } from '@/hooks/use-pacientes';
import { ArrowLeft, Bell, ChevronDown, LogOut, Settings, Stethoscope, UserRound, Users, Home, Star, Heart, Calendar, Target, Pill, BookUser, CalendarDays, Activity, Moon, Sun } from 'lucide-react';

function getNavStyles(label: string) {
    const l = label.toLowerCase();
    if (l.includes('inicio') || l.includes('home')) return { Icon: Home, from: 'from-[#0052FF]', to: 'to-[#002B99]' };
    if (l.includes('directorio')) return { Icon: BookUser, from: 'from-[#0052FF]', to: 'to-[#002B99]' };
    if (l.includes('especialidad')) return { Icon: Star, from: 'from-[#56CCF2]', to: 'to-[#2F80ED]' };
    if (l.includes('medicamento') || l.includes('farmacia')) return { Icon: Pill, from: 'from-[#E11D48]', to: 'to-[#9F1239]' };
    if (l.includes('cita')) return { Icon: CalendarDays, from: 'from-[#2563EB]', to: 'to-[#1E40AF]' };
    return { Icon: Activity, from: 'from-[#4F46E5]', to: 'to-[#3730A3]' };
}
import { AnimatePresence, motion } from 'framer-motion';
import { NotificacionesPopover } from '@/components/notificaciones-popover';
import ConfirmLogoutModal from '@/components/confirm-logout-modal';
import { useUIStore } from '@/stores/ui-store';

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
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { isDarkMode, toggleDarkMode } = useUIStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeDarkMode = mounted ? isDarkMode : false;

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

  // Navbar inteligente (Smart Sticky): se oculta al hacer scroll hacia abajo y aparece al hacer scroll hacia arriba
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const lastScrollY = lastScrollYRef.current;
      const diff = currentScrollY - lastScrollY;

      if (currentScrollY < 20) {
        setIsVisible(true);
      } else if (diff > 8 && currentScrollY > 60) {
        if (!isUserMenuOpen) {
          setIsVisible(false);
        }
      } else if (diff < -6) {
        setIsVisible(true);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isUserMenuOpen]);

  return (
    <div
      id="app-navbar"
      className={`sticky top-0 z-[950] w-full bg-transparent border-none shadow-none transition-transform duration-300 ease-in-out ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="w-full">
        <header className="bg-transparent border-none shadow-none">
        <div className="flex items-center justify-between gap-2 sm:gap-4 h-14 sm:h-16 py-2 px-4 sm:px-6 lg:px-8 max-w-[1800px] mx-auto">
        {/* ── Logo ── */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {backHref === 'back' ? (
            <button
              onClick={() => router.back()}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
              aria-label="Volver"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : backHref ? (
            <Link
              href={backHref}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
              aria-label="Volver"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          ) : (
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-md shadow-sky-200 shrink-0">
              <Stethoscope className="h-5 w-5" />
            </div>
          )}
          <div className="whitespace-nowrap min-w-0 flex items-center">
            <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
              NeoClínica
            </span>
          </div>
        </div>

        {/* ── Desktop Nav links ── */}
        {navLinks.length > 0 && (
          <nav className="hidden md:inline-flex items-center p-1 bg-[#eff4ff]/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/60 gap-1 text-xs sm:text-sm">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const { Icon } = getNavStyles(link.label);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-[#006194] dark:text-sky-300 font-bold shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
                  }`}
                >
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />}
                  <Icon className={`w-3.5 h-3.5 transition-all ${isActive ? 'text-[#006194] dark:text-sky-300' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* ── Spacer cuando no hay nav links ── */}
        {navLinks.length === 0 && <div className="flex-1" />}

        {/* ── Actions (Notificaciones y Usuario) ── */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 z-[120]">
          <NotificacionesPopover />

          {/* ── User menu ── */}
          <div ref={userMenuRef} className="relative shrink-0 z-[120]">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((v) => !v)}
              className="inline-flex items-center gap-2 sm:gap-2.5 rounded-full bg-transparent p-1 sm:pr-3 text-left transition-all hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
              aria-haspopup="menu"
              aria-expanded={isUserMenuOpen}
            >
              <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs sm:text-sm font-black text-primary shrink-0">
                {userImage ? (
                  <img src={userImage} alt={userName} className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover" />
                ) : (
                  userInitials
                )}
              </span>
              <span className="hidden sm:inline text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-[140px]">
                {userName}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div
                className="absolute right-0 z-[120] mt-3 w-64 sm:w-72 overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_12px_40px_rgba(11,28,48,0.08)] text-slate-900 dark:text-slate-100"
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* 1. Cabecera: Avatar, nombre y correo electrónico */}
                <div className="bg-[#eff4ff]/40 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/80 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-700 shadow-2xs text-sm sm:text-base font-black text-[#006194] dark:text-sky-400 shrink-0">
                      {userImage ? (
                        <img src={userImage} alt={userName} className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl object-cover" />
                      ) : (
                        userInitials
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900 dark:text-white">{userName}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{userEmail}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Opciones de Perfil, Pacientes, Puntos y Configuración */}
                <div className="p-2 space-y-1">
                  {/* Mi perfil */}
                  <Link
                    href="/dashboard/perfil"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      pathname === '/dashboard/perfil'
                        ? 'bg-[#eff4ff] text-[#006194] dark:bg-slate-800 dark:text-sky-300 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-[#eff4ff]/60 hover:text-[#006194] dark:hover:bg-slate-800/60 dark:hover:text-sky-300'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <UserRound className="h-4 w-4 shrink-0" />
                      <span>Mi perfil</span>
                    </span>
                    {pathname === '/dashboard/perfil' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />
                    )}
                  </Link>

                  {/* Mi expediente / Familiares */}
                  <Link
                    href="/dashboard/perfil/pacientes"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      pathname.startsWith('/dashboard/perfil/pacientes')
                        ? 'bg-[#eff4ff] text-[#006194] dark:bg-slate-800 dark:text-sky-300 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-[#eff4ff]/60 hover:text-[#006194] dark:hover:bg-slate-800/60 dark:hover:text-sky-300'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Users className="h-4 w-4 shrink-0" />
                      <span>Pacientes afiliados</span>
                    </span>
                    {pathname.startsWith('/dashboard/perfil/pacientes') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />
                    )}
                  </Link>

                  {/* Puntos y Recompensas */}
                  <Link
                    href="/dashboard/perfil/puntos"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      pathname.startsWith('/dashboard/perfil/puntos')
                        ? 'bg-[#eff4ff] text-[#006194] dark:bg-slate-800 dark:text-sky-300 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-[#eff4ff]/60 hover:text-[#006194] dark:hover:bg-slate-800/60 dark:hover:text-sky-300'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Star className="h-4 w-4 shrink-0" />
                      <span>Puntos y Recompensas</span>
                    </span>
                    {pathname.startsWith('/dashboard/perfil/puntos') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />
                    )}
                  </Link>

                  {/* Configuraciones */}
                  <Link
                    href="/dashboard/perfil/configuracion"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      pathname.startsWith('/dashboard/perfil/configuracion')
                        ? 'bg-[#eff4ff] text-[#006194] dark:bg-slate-800 dark:text-sky-300 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-[#eff4ff]/60 hover:text-[#006194] dark:hover:bg-slate-800/60 dark:hover:text-sky-300'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Settings className="h-4 w-4 shrink-0" />
                      <span>Configuraciones</span>
                    </span>
                    {pathname.startsWith('/dashboard/perfil/configuracion') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />
                    )}
                  </Link>

                  {/* Modo Oscuro */}
                  <button
                    type="button"
                    onClick={toggleDarkMode}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-[#eff4ff]/60 hover:text-[#006194] dark:hover:bg-slate-800/60 dark:hover:text-sky-300 cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      {activeDarkMode ? <Moon className="h-4 w-4 text-sky-400 shrink-0" /> : <Sun className="h-4 w-4 text-amber-500 shrink-0" />}
                      <span>Modo Oscuro</span>
                    </span>
                    <div className={`relative flex h-5 w-9 items-center rounded-full transition-colors ${activeDarkMode ? 'bg-[#006194]' : 'bg-slate-300 dark:bg-slate-700'}`}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${activeDarkMode ? 'translate-x-4.5' : 'translate-x-1'}`} />
                    </div>
                  </button>

                  {/* Línea divisoria horizontal */}
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  {/* Cerrar sesión */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setShowLogoutModal(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 transition hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Mobile Nav links bar (Horizontal scrollable) ── */}
      {navLinks.length > 0 && (
        <div className="flex md:hidden overflow-x-auto scrollbar-none items-center gap-1.5 py-2 px-1 border-t border-slate-200/50 dark:border-slate-800/50">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const { Icon } = getNavStyles(link.label);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#006194] text-white shadow-xs'
                    : 'bg-[#eff4ff]/60 text-slate-600 hover:bg-[#eff4ff] dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 transition-all ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Contenido extra (buscadores, filtros, etc.) ── */}
      {children && (
        <div className="border-t border-slate-200/50 px-2 py-3 sm:px-4 sm:py-4 lg:px-6">
          {children}
        </div>
      )}
      </header>
      </div>

      {/* Modal de confirmación de salida minimalista */}
      <ConfirmLogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
      />
    </div>
  );
}
