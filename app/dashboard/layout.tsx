import { DashboardSharedNavbar } from '@/components/dashboard-shared-navbar';
import { ForceChangePasswordModal } from '@/components/force-change-password-modal';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {/* Navbar compartido del dashboard */}
            <DashboardSharedNavbar />
            <ForceChangePasswordModal />
            {children}
        </>
    );
}
