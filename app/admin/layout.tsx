import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NeoClínica | Panel de Administración de Citas',
  description: 'Gestión y control de estados de citas médicas en tiempo real.',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
