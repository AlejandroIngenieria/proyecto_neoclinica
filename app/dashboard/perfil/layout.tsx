import { ProfileSidebar } from '@/components/profile-sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

export const metadata = {
  title: 'Mi Perfil — NeoClinica',
  description: 'Gestiona tu perfil, pacientes afiliados, puntos y configuración en NeoClínica.',
};

export default function PerfilLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <ProfileSidebar />
      <SidebarInset className="min-h-screen bg-slate-50/50 dark:bg-slate-950/40">
        {/* Disparador móvil exclusivo para pantallas pequeñas (< md) */}
        <div className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 md:hidden">
          <SidebarTrigger className="h-8 w-8 rounded-lg text-slate-700 dark:text-slate-200" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Menú del Perfil</span>
        </div>

        {/* Contenido principal del perfil sin navbar redundante en desktop */}
        <div className="mx-auto w-full px-4 sm:px-6 lg:w-[92%] xl:w-[88%] max-w-[1800px] py-4 sm:py-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
