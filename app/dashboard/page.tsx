import { Suspense } from 'react';
import type { Metadata } from 'next';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import DashboardClientView from '@/components/dashboard/dashboard-client-view';

export const metadata: Metadata = {
  title: 'Panel Clínico | NeoClínica SaludYa',
  description: 'Resumen integral de consultas médicas, estado de citas, recetas y programa de lealtad.',
};

/**
 * Server Component principal para el Dashboard.
 * Permite renderizado inicial ultrarrápido y streaming concurrente vía React Suspense.
 */
export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-slate-950 transition-colors">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardClientView />
      </Suspense>
    </main>
  );
}
