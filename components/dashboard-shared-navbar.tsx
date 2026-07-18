'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/navbar';

const NAV_LINKS = [
    { href: '/dashboard', label: 'Directorio' },
    { href: '/dashboard/citas', label: 'Citas' },
    { href: '/dashboard/medicamentos', label: 'Medicamentos' },
];

export function DashboardSharedNavbar() {
    const pathname = usePathname();

    if (pathname === '/dashboard') {
        return <Navbar subtitle="Directorio médico" navLinks={NAV_LINKS} />;
    }
    if (pathname === '/dashboard/citas') {
        return <Navbar subtitle="Gestión de Citas" navLinks={NAV_LINKS} />;
    }
    if (pathname === '/dashboard/medicamentos') {
        return <Navbar subtitle="Medicamentos" navLinks={NAV_LINKS} />;
    }

    return null;
}
