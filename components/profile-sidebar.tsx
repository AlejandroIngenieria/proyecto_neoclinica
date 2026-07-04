'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  LogOut,
  Menu,
  Settings,
  Stethoscope,
  Star,
  UserPlus,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

// ─── Navigation items ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/dashboard/perfil', label: 'Datos Personales', icon: UserRound },
  { href: '/dashboard/perfil/pacientes', label: 'Pacientes', icon: Users },
  { href: '/dashboard/perfil/puntos', label: 'Puntos', icon: Star },
  { href: '/dashboard/perfil/configuracion', label: 'Configuración', icon: Settings },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function ProfileSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopOpen, setIsDesktopOpen] = useState(true);

  const userName = session?.user?.name || 'Usuario';
  const userEmail = session?.user?.email || 'Sin correo';
  const userImage = session?.user?.image || '';

  const userInitials = useMemo(
    () =>
      userName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'U',
    [userName],
  );

  const isActive = (href: string) => {
    if (href === '/dashboard/perfil') {
      return pathname === '/dashboard/perfil';
    }
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col w-72 relative">
      {/* ── Toggle Collapse Button (Centered Right) ── */}
      <button
        onClick={() => setIsDesktopOpen(false)}
        className="absolute right-0 top-1/2 z-50 flex h-12 w-6 -translate-y-1/2 items-center justify-center rounded-l-lg border-y border-l border-slate-200 bg-white text-slate-400 shadow-sm transition hover:bg-slate-50 hover:text-blue-600 hidden lg:flex"
        aria-label="Ocultar menú"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* ── Top Back Button ── */}
      <div className="pt-4 px-5">
        <Link
          href="/dashboard"
          className="group flex w-fit items-center gap-2 rounded-lg px-2 py-2 text-blue-600 transition-colors hover:bg-blue-50"
        >
          <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-semibold">Volver al menú</span>
        </Link>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                active
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <item.icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom actions ── */}
      <div className="border-t border-slate-100 px-3 py-4 space-y-2">

        <Link
          href="/dashboard/perfil/pacientes"
          onClick={() => setIsMobileOpen(false)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/60 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-100/60"
        >
          <UserPlus className="h-4 w-4 shrink-0" />
          <span className="truncate">Añadir Familiar</span>
        </Link>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="truncate">Cerrar sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Toggle button (mobile always, desktop when closed) ── */}
      <button
        type="button"
        onClick={() => {
          setIsMobileOpen(true);
          setIsDesktopOpen(true);
        }}
        className={`fixed top-6 left-6 z-40 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/30 transition hover:bg-blue-700 ${
          isDesktopOpen ? 'lg:hidden' : 'lg:flex'
        }`}
        aria-label="Abrir menú de perfil"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* ── Desktop sidebar ── */}
      <AnimatePresence initial={false}>
        {isDesktopOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="hidden lg:flex lg:shrink-0 lg:flex-col border-r border-slate-200/60 bg-white/50 backdrop-blur-xl sticky top-0 h-screen overflow-hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
            />

            {/* Panel */}
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>

              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
