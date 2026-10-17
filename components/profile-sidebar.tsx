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
import { useUIStore } from '@/stores/ui-store';

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
  const { isDarkMode, toggleDarkMode } = useUIStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const activeDarkMode = mounted ? isDarkMode : false;

  const isActive = (href: string) => {
    if (href === '/dashboard/perfil') {
      return pathname === '/dashboard/perfil';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-slate-200/50 dark:border-slate-800/60 bg-[#eff4ff]/30 dark:bg-slate-900/90 text-sidebar-foreground transition-all">
        {/* ── Header ── */}
        <SidebarHeader className="p-3">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2 w-full py-1">
              <SidebarTrigger className="h-8 w-8 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800 transition-colors" />
              <Link
                href="/dashboard"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#eff4ff] text-[#006194] hover:bg-[#dfeafd] dark:bg-slate-800 dark:text-sky-400 hover:scale-105 transition-all shadow-xs shrink-0"
                title="Volver al Dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 px-1 py-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 rounded-2xl p-1.5 text-[#006194] dark:text-sky-400 hover:bg-[#eff4ff] dark:hover:bg-slate-800/60 transition group overflow-hidden"
                title="Volver al menú principal"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#eff4ff] text-[#006194] dark:bg-slate-800 dark:text-sky-400 shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <ArrowLeft className="h-4 w-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white truncate">
                    NeoClínica
                  </span>
                  <span className="text-[10px] font-semibold text-[#006194] dark:text-sky-400">
                    Volver al Dashboard
                  </span>
                </div>
              </Link>

              <SidebarTrigger className="h-8 w-8 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800 shrink-0 transition-colors" />
            </div>
          )}
        </SidebarHeader>

        <SidebarSeparator className="my-1 border-slate-200/40 dark:border-slate-800/50" />

        {/* ── Content Navigation ── */}
        <SidebarContent className="px-3 py-2">
          <SidebarGroup className="p-0">
            {!isCollapsed && (
              <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-2">
                Menú del Perfil
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
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
                            ? 'size-9! p-0! justify-center! items-center!'
                            : 'w-full px-3 py-2.5'
                        } text-xs font-semibold ${
                          active
                            ? 'bg-white dark:bg-slate-800 text-[#006194] dark:text-sky-300 font-bold shadow-[0_2px_8px_rgba(11,28,48,0.04)] border border-slate-200/50 dark:border-slate-700/60 data-[active=true]:bg-white dark:data-[active=true]:bg-slate-800 data-[active=true]:text-[#006194] dark:data-[active=true]:text-sky-300'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
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
                          {active && !isCollapsed && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] shrink-0" />
                          )}
                          <Icon
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              active ? 'text-[#006194] dark:text-sky-300' : 'text-slate-400 dark:text-slate-500'
                            }`}
                          />
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                          {active && !isCollapsed && (
                            <ChevronRight className="ml-auto h-3.5 w-3.5 text-[#006194] dark:text-sky-400 opacity-80" />
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
        <SidebarFooter className="p-3 space-y-1.5 border-t border-slate-200/50 dark:border-slate-800/60">
          <SidebarMenu className="gap-1">
            {/* Theme Toggle Button */}
            <SidebarMenuItem className="flex justify-center">
              <SidebarMenuButton
                onClick={toggleDarkMode}
                tooltip={activeDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                className={`rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors ${
                  isCollapsed
                    ? 'size-9! p-0! justify-center! items-center!'
                    : 'w-full px-3 py-2'
                }`}
              >
                {activeDarkMode ? (
                  <Sun className="h-4 w-4 text-amber-400 shrink-0" />
                ) : (
                  <Moon className="h-4 w-4 text-[#006194] dark:text-sky-400 shrink-0" />
                )}
                {!isCollapsed && (
                  <span className="truncate">
                    {activeDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
                  </span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Logout Button */}
            <SidebarMenuItem className="flex justify-center">
              <SidebarMenuButton
                onClick={() => setShowLogoutModal(true)}
                tooltip="Cerrar sesión"
                className={`rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300 cursor-pointer transition-colors ${
                  isCollapsed
                    ? 'size-9! p-0! justify-center! items-center!'
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
