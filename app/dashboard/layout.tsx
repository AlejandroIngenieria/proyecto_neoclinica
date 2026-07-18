import { DashboardSharedNavbar } from '@/components/dashboard-shared-navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {/* Navbar compartido del dashboard */}
            <DashboardSharedNavbar />
            {children}
        </>
    );
}
