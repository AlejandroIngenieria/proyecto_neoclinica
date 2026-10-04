'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  LogOut,
  Moon,
  Settings,
  Star,
  Sun,
  UserRound,
  Users,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import ConfirmLogoutModal from '@/components/confirm-logout-modal';

// ─── Navigation Items ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/dashboard/perfil', label: 'Datos Personales', icon: UserRound },
  { href: '/dashboard/perfil/pacientes', label: 'Pacientes', icon: Users },
  { href: '/dashboard/perfil/puntos', label: 'Puntos y Recompensas', icon: Star },
  { href: '/dashboard/perfil/configuracion', label: 'Configuración', icon: Settings },
];

export function ProfileSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');

  // Sincronizar tema con document y localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark =
        document.documentElement.classList.contains('dark') ||
        localStorage.getItem('theme') === 'dark';
      setTheme(isDark ? 'dark' : 'light');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard/perfil') {
      return pathname === '/dashboard/perfil';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all">
        {/* ── Header ── */}
        <SidebarHeader className="p-2">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2 w-full py-1">
              <SidebarTrigger className="h-8 w-8 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors" />
              <Link
                href="/dashboard"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white hover:scale-105 transition-transform shadow-xs shrink-0"
                title="Volver al Dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 px-1 py-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 rounded-xl p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition group overflow-hidden"
                title="Volver al menú principal"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <ArrowLeft className="h-4 w-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white truncate">
                    NeoClínica
                  </span>
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                    Volver al Dashboard
                  </span>
                </div>
              </Link>

              <SidebarTrigger className="h-8 w-8 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0" />
            </div>
          )}
        </SidebarHeader>

        <SidebarSeparator className="my-1" />

        {/* ── Content Navigation ── */}
        <SidebarContent className="px-2 py-2">
          <SidebarGroup className="p-0">
            {!isCollapsed && (
              <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-wider text-sidebar-foreground/60 px-2 mb-1.5">
                Menú del Perfil
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href} className="flex justify-center">
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        size="default"
                        className={`rounded-xl transition-all ${
                          isCollapsed
                            ? 'size-8! p-0! justify-center! items-center!'
                            : 'w-full px-3 py-2.5'
                        } text-xs font-bold ${
                          active
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 data-[active=true]:bg-blue-600 data-[active=true]:text-white'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Link
                          href={item.href}
                          className={`flex items-center ${
                            isCollapsed
                              ? 'justify-center w-full h-full'
                              : 'gap-3 w-full'
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              active ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          />
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                          {active && !isCollapsed && (
                            <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-80" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* ── Footer ── */}
        <SidebarFooter className="p-2 space-y-2 border-t border-sidebar-border">
          <SidebarMenu className="gap-2">
            {/* Theme Toggle Button */}
            <SidebarMenuItem className="flex justify-center">
              <SidebarMenuButton
                onClick={toggleTheme}
                tooltip={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                className={`rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer ${
                  isCollapsed
                    ? 'size-8! p-0! justify-center! items-center!'
                    : 'w-full px-3 py-2'
                }`}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-400 shrink-0" />
                ) : (
                  <Moon className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                )}
                {!isCollapsed && (
                  <span className="truncate">
                    {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
                  </span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Logout Button */}
            <SidebarMenuItem className="flex justify-center">
              <SidebarMenuButton
                onClick={() => setShowLogoutModal(true)}
                tooltip="Cerrar sesión"
                className={`rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300 cursor-pointer transition-colors ${
                  isCollapsed
                    ? 'size-8! p-0! justify-center! items-center!'
                    : 'w-full px-3 py-2'
                }`}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="truncate">Cerrar sesión</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/* Modal de confirmación de salida */}
      <ConfirmLogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
      />
    </>
  );
}
