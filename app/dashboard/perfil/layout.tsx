import { ProfileSidebar } from '@/components/profile-sidebar';

export const metadata = {
  title: 'Mi Perfil — NeoClinica',
  description: 'Gestiona tu perfil, pacientes afiliados, puntos y configuración en NeoClínica.',
};

export default function PerfilLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <ProfileSidebar />
      <main className="flex-1 w-full min-w-0">
        <div className="mx-auto w-[85%] max-w-[1800px]">
          {children}
        </div>
      </main>
    </div>
  );
}
