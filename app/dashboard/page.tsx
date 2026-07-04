'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
    BadgeCheck,
    ChevronRight,
    Filter,
    MapPin,
    Search,
    ShieldCheck,
    Sparkles,
    Users,
    X,
} from 'lucide-react';

import type { DoctorResponse } from '@/types';
import { buildDoctorFullName, isDoctorActive } from '@/types/doctor';
import { Navbar } from '@/components/navbar';
import { DoctorCard, type DoctorCardData } from '@/components/doctor-card';
import { AnimatedList } from '@/components/animated-list';
import { AnimatedModal } from '@/components/animated-modal';
import { NeoLoader } from '@/components/neo-loader';
import { useDoctors } from '@/hooks/use-doctors';
import { useParamString, useParamBoolean, useParamNumber, useResetParams } from '@/hooks/use-search-params-state';
import { useUIStore } from '@/stores/ui-store';
import { addRecentDoctor, readRecentDoctors, type RecentDoctorItem } from '@/lib/recent-doctors';

type ResolvedDoctor = {
    doctor: DoctorResponse;
    fullName: string;
    specialty: string;
    locationLabel: string;
    specialtyPreview: string[];
    modalityPreview: string[];
    languagePreview: string[];
    serviceCount: number;
    educationCount: number;
    recognitionCount: number;
    activeLabel: string;
    searchIndex: string;
};

type SortOption = 'name-asc' | 'name-desc' | 'services-desc';

const PRICE_LIMIT_MAX = 5000;

function normalizeText(value: string) {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function formatCount(value: number) {
    return new Intl.NumberFormat('es-GT').format(value);
}

function getDoctorPricePoints(doctor: DoctorResponse) {
    return [
        ...doctor.servicios.map((s) => s.syp_costo_total),
        ...doctor.clinicas.map((c) => c.mcl_precio_base),
    ].filter((price): price is number => typeof price === 'number' && Number.isFinite(price) && price >= 0);
}

function matchesPriceLimit(prices: number[], priceLimit: number) {
    if (priceLimit >= PRICE_LIMIT_MAX) {
        return true;
    }

    if (!prices.length) {
        return false;
    }

    return prices.some((price) => price <= priceLimit);
}

function resolveDoctor(doctor: DoctorResponse): ResolvedDoctor {
    const fullName = buildDoctorFullName(doctor) || 'Médico sin nombre';
    const specialty = doctor.exp_profesion || 'Especialidad médica';
    const locationLabel = [doctor.pais_nacimiento, doctor.nacionalidad].filter(Boolean).join(' · ') || 'Ubicación no registrada';
    const specialtyPreview = doctor.especialidades.map((item) => item.especialidad).filter(Boolean).slice(0, 3);
    const modalityPreview = doctor.modalidades.map((item) => item.modalidad).filter(Boolean).slice(0, 2);
    const languagePreview = doctor.idiomas.map((item) => item.idioma).filter(Boolean).slice(0, 2);

    const searchIndex = normalizeText(
        [
            fullName,
            specialty,
            doctor.exp_colegiado_gt ?? '',
            doctor.exp_email ?? '',
            doctor.exp_telefono1 ?? '',
            doctor.exp_presentacion ?? '',
            doctor.pais_nacimiento ?? '',
            doctor.nacionalidad ?? '',
            ...doctor.especialidades.map((item) => item.especialidad),
            ...doctor.modalidades.map((item) => item.modalidad),
            ...doctor.idiomas.map((item) => item.idioma),
            ...doctor.sintomas.map((item) => item.sintoma),
            ...doctor.aseguradoras.map((item) => item.aseguradora),
            ...doctor.servicios.map((item) => item.servicio ?? ''),
            ...doctor.educacion.map((item) => `${item.edu_institucion} ${item.edu_titulo_obtenido} ${item.pais}`),
            ...doctor.cursos.map((item) => `${item.cur_institucion} ${item.cur_titulo_obtenido} ${item.tipo_curso}`),
            ...doctor.reconocimientos.map((item) => `${item.descripcion} ${item.institucion} ${item.anio}`),
        ]
            .filter(Boolean)
            .join(' '),
    );

    return {
        doctor,
        fullName,
        specialty,
        locationLabel,
        specialtyPreview,
        modalityPreview,
        languagePreview,
        serviceCount: doctor.servicios.length,
        educationCount: doctor.educacion.length,
        recognitionCount: doctor.reconocimientos.length,
        activeLabel: isDoctorActive(doctor) ? 'Activo' : 'Inactivo',
        searchIndex,
    };
}

function SummaryChip({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                <Icon className="h-4 w-4 text-sky-600" />
                {label}
            </div>
            <div className="mt-3 wrap-break-word text-sm font-semibold leading-6 text-slate-900">{value}</div>
        </div>
    );
}

function SummarySection({
    title,
    items,
    fallback,
}: {
    title: string;
    items: string[];
    fallback: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">{title}</div>
            <div className="mt-3 flex flex-wrap gap-2">
                {items.length ? (
                    items.map((item) => (
                        <span key={item} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
                            {item}
                        </span>
                    ))
                ) : (
                    <span className="text-sm text-slate-500">{fallback}</span>
                )}
            </div>
        </div>
    );
}

function DashboardContent() {
    const router = useRouter();
    const { status } = useSession();

    // React Query — datos del servidor
    const { data: doctors = [], isLoading, error } = useDoctors();

    // URL params — filtros y búsqueda
    const [searchTerm, setSearchTerm] = useParamString('q');
    const [locationTerm, setLocationTerm] = useParamString('location');
    const [sortBy, setSortBy] = useParamString('sort', 'name-asc') as [SortOption, (v: string) => void];
    const [showOnlyActive, setShowOnlyActive] = useParamBoolean('active');
    const [presencial, setPresencial] = useParamBoolean('presencial');
    const [telemedicina, setTelemedicina] = useParamBoolean('telemedicina');
    const [priceLimit, setPriceLimit] = useParamNumber('price', PRICE_LIMIT_MAX);
    const [currentPage, setCurrentPage] = useParamNumber('page', 1);
    const resetParams = useResetParams();

    const [targetPage, setTargetPage] = useState<number | null>(null);
    const isPaginating = targetPage !== null;

    const handlePageChange = (newPage: number) => {
        setTargetPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setCurrentPage(newPage); // Actualiza la URL de forma asíncrona en Next.js
    };

    // Desactivar el loader solo cuando la URL realmente se haya actualizado
    useEffect(() => {
        if (targetPage !== null && currentPage === targetPage) {
            const timer = setTimeout(() => {
                setTargetPage(null);
            }, 300); // Pequeño retraso estético
            return () => clearTimeout(timer);
        }
    }, [currentPage, targetPage]);

    // Zustand — UI global
    const { isFiltersOpen, openFilters, closeFilters } = useUIStore();

    // Local state — only truly local UI
    const searchMenuRef = useRef<HTMLDivElement | null>(null);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [recentDoctors, setRecentDoctors] = useState<RecentDoctorItem[]>(() => readRecentDoctors());

    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (searchMenuRef.current && !searchMenuRef.current.contains(target)) {
                setIsSearchFocused(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsSearchFocused(false);
                closeFilters();
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [closeFilters]);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/login');
        }
    }, [router, status]);

    const resolvedDoctors = useMemo(
        () => doctors.map((doctor) => resolveDoctor(doctor)).sort((a, b) => a.fullName.localeCompare(b.fullName, 'es')),
        [doctors],
    );

    const visibleDoctors = useMemo(() => {
        const normalizedQuery = normalizeText(searchTerm.trim());
        const normalizedLocation = normalizeText(locationTerm.trim());
        const hasModalityFilter = presencial || telemedicina;

        const filteredDoctors = resolvedDoctors.filter((doctor) => {
            const matchesQuery = !normalizedQuery || doctor.searchIndex.includes(normalizedQuery);
            const matchesLocation = !normalizedLocation || normalizeText(doctor.locationLabel).includes(normalizedLocation);
            const matchesActive = !showOnlyActive || isDoctorActive(doctor.doctor);
            const doctorModalities = doctor.doctor.modalidades.map((item) => normalizeText(item.modalidad));
            const matchesModality =
                !hasModalityFilter ||
                (presencial && doctorModalities.some((item) => item.includes('presencial'))) ||
                (telemedicina && doctorModalities.some((item) => item.includes('telemedicina') || item.includes('virtual')));
            const matchesPrice = matchesPriceLimit(getDoctorPricePoints(doctor.doctor), priceLimit);

            return matchesQuery && matchesLocation && matchesActive && matchesModality && matchesPrice;
        });

        return filteredDoctors.sort((leftDoctor, rightDoctor) => {
            if (sortBy === 'name-desc') {
                return rightDoctor.fullName.localeCompare(leftDoctor.fullName, 'es');
            }

            if (sortBy === 'services-desc') {
                return rightDoctor.serviceCount - leftDoctor.serviceCount;
            }

            return leftDoctor.fullName.localeCompare(rightDoctor.fullName, 'es');
        });
    }, [locationTerm, presencial, telemedicina, priceLimit, resolvedDoctors, searchTerm, showOnlyActive, sortBy]);

    const recentDoctorItems = useMemo(() => recentDoctors.slice(0, 3), [recentDoctors]);
    const searchSuggestions = useMemo(() => {
        const normalizedQuery = normalizeText(searchTerm.trim());

        return recentDoctorItems.filter((doctor) => {
            if (!normalizedQuery) {
                return true;
            }

            return normalizeText([doctor.fullName, doctor.specialty, doctor.locationLabel].join(' ')).includes(normalizedQuery);
        });
    }, [recentDoctorItems, searchTerm]);

    const handleDoctorVisit = (cardData: DoctorCardData) => {
        const item: RecentDoctorItem = {
            exp_codigo: cardData.doctor.exp_codigo,
            fullName: cardData.fullName,
            specialty: cardData.doctor.exp_profesion || 'Especialidad médica',
            locationLabel: [cardData.doctor.pais_nacimiento, cardData.doctor.nacionalidad].filter(Boolean).join(' · ') || 'Ubicación no registrada',
            image: cardData.doctor.exp_foto_perfil,
            visitedAt: new Date().toISOString(),
        };
        setRecentDoctors(addRecentDoctor(item));
    };

    const itemsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(visibleDoctors.length / itemsPerPage));
    const currentPageForView = Math.min(currentPage, totalPages);
    const paginatedDoctors = useMemo(
        () => visibleDoctors.slice((currentPageForView - 1) * itemsPerPage, currentPageForView * itemsPerPage),
        [currentPageForView, visibleDoctors],
    );

    const totalSpecialties = useMemo(
        () => new Set(resolvedDoctors.flatMap((doctor) => doctor.specialtyPreview)).size,
        [resolvedDoctors],
    );
    const activeDoctors = useMemo(
        () => resolvedDoctors.filter((doctor) => isDoctorActive(doctor.doctor)).length,
        [resolvedDoctors],
    );
    const specialtyPicks = useMemo(
        () => Array.from(new Set(resolvedDoctors.flatMap((doctor) => doctor.specialtyPreview))).slice(0, 8),
        [resolvedDoctors],
    );
    const locationPicks = useMemo(
        () =>
            Array.from(
                new Set(
                    resolvedDoctors.flatMap((doctor) => {
                        const picks = [doctor.doctor.pais_nacimiento, doctor.doctor.nacionalidad].filter(Boolean) as string[];
                        return picks;
                    }),
                ),
            ).slice(0, 8),
        [resolvedDoctors],
    );

    if (status === 'loading' || (status === 'authenticated' && isLoading)) {
        return <NeoLoader />;
    }

    return (
        <main className="min-h-screen text-slate-900">
            <Navbar
                subtitle="Directorio médico"
                navLinks={[
                    { href: '/dashboard', label: 'Directorio' },
                    { href: '/dashboard/especialidades', label: 'Especialidades' },
                    { href: '/dashboard/citas', label: 'Citas' },
                    { href: '/dashboard/medicamentos', label: 'Medicamentos' },
                ]}
            />

            <div className="mx-auto w-[90%] max-w-[1800px] mt-8">
                <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
                    <button
                        type="button"
                        onClick={() => isFiltersOpen ? closeFilters() : openFilters()}
                        className={`inline-flex h-18 items-center gap-2 rounded-2xl border px-5 text-sm font-semibold transition ${
                            isFiltersOpen 
                            ? 'border-sky-600 bg-sky-600 text-white shadow-lg shadow-sky-500/20' 
                            : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700'
                        }`}
                        aria-label="Alternar filtros"
                    >
                        <Filter className="h-4 w-4" />
                        {isFiltersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
                    </button>

                    <div ref={searchMenuRef} className="relative rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <label htmlFor="searchTerm" className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                            Buscar por nombre, especialidad, correo o colegiado
                        </label>
                        <div className="flex items-center gap-3">
                            <Search className="h-4 w-4 shrink-0 text-slate-400" />
                            <div className="relative min-w-0 flex-1">
                                <input
                                    id="searchTerm"
                                    value={searchTerm}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onChange={(event) => {
                                        setSearchTerm(event.target.value);
                                        setIsSearchFocused(true);
                                    }}
                                    placeholder="Ej. cardiología, López, 1001"
                                    className="w-full bg-transparent pr-10 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                                />

                                {searchTerm ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setIsSearchFocused(true);
                                        }}
                                        className="absolute right-0 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                                        aria-label="Limpiar búsqueda"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        {isSearchFocused && searchSuggestions.length ? (
                            <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.15)]">
                                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Sugerencias recientes</p>
                                        <p className="text-xs text-slate-400">Últimos 3 médicos visitados</p>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {searchSuggestions.map((doctor) => (
                                        <Link
                                            key={doctor.exp_codigo}
                                            href={`/dashboard/${doctor.exp_codigo}`}
                                            onClick={() => {
                                                setIsSearchFocused(false);
                                            }}
                                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sky-50"
                                        >
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-sky-100 text-xs font-black text-sky-700">
                                                {doctor.image ? (
                                                    <Image src={doctor.image} alt={doctor.fullName} width={40} height={40} className="h-10 w-10 object-cover" />
                                                ) : (
                                                    doctor.fullName
                                                        .split(' ')
                                                        .filter(Boolean)
                                                        .slice(0, 2)
                                                        .map((part) => part[0])
                                                        .join('') || 'MD'
                                                )}
                                            </span>

                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-slate-900">{doctor.fullName}</p>
                                                <p className="truncate text-xs text-slate-500">{doctor.specialty}</p>
                                                <p className="truncate text-xs text-slate-400">{doctor.locationLabel}</p>
                                            </div>

                                            <ChevronRight className="h-4 w-4 shrink-0 text-sky-500" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <label htmlFor="locationTerm" className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                            Buscar por ubicación
                        </label>
                        <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                            <div className="relative min-w-0 flex-1">
                                <input
                                    id="locationTerm"
                                    value={locationTerm}
                                    onChange={(event) => setLocationTerm(event.target.value)}
                                    placeholder="País o nacionalidad"
                                    className="w-full bg-transparent pr-10 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                                />

                                {locationTerm ? (
                                    <button
                                        type="button"
                                        onClick={() => setLocationTerm('')}
                                        className="absolute right-0 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                                        aria-label="Limpiar ubicación"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`mx-auto w-[90%] max-w-[1800px] py-8 grid items-start gap-8 ${isFiltersOpen ? 'lg:grid-cols-[300px_1fr]' : 'grid-cols-1'}`}>
                {isFiltersOpen && (
                    <aside className="sticky top-32 space-y-5 rounded-3xl border border-slate-200/60 bg-white/50 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl">
                        <div className="flex items-center justify-between pb-2">
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">Filtros activos</h3>
                            <button
                                type="button"
                                onClick={() => resetParams()}
                                className="text-xs font-semibold text-sky-600 transition hover:text-sky-700 underline underline-offset-2"
                            >
                                Limpiar todo
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Ordenar por */}
                            <div>
                                <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Ordenar por</label>
                                <div className="space-y-2">
                                    {([
                                        { value: 'name-asc' as const, label: 'Nombre (A-Z)' },
                                        { value: 'name-desc' as const, label: 'Nombre (Z-A)' },
                                        { value: 'services-desc' as const, label: 'Más servicios' },
                                    ] as const).map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setSortBy(option.value)}
                                            className={`w-full rounded-2xl border px-4 py-2.5 text-left text-sm transition ${sortBy === option.value
                                                    ? 'border-sky-600 bg-sky-600 text-white shadow-md shadow-sky-500/20'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700'
                                                }`}
                                        >
                                            <span className="font-bold">{option.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Modalidad */}
                            <div>
                                <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Modalidad</label>
                                <div className="space-y-2">
                                    {[
                                        { checked: presencial, onChange: setPresencial, label: 'Presencial' },
                                        { checked: telemedicina, onChange: setTelemedicina, label: 'Telemedicina' },
                                    ].map((option) => (
                                        <label key={option.label} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 transition hover:border-sky-200 hover:bg-sky-50">
                                            <input
                                                checked={option.checked}
                                                onChange={(event) => option.onChange(event.target.checked)}
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-200"
                                            />
                                            <span className="text-sm font-semibold text-slate-800">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Precio */}
                            <div>
                                <label className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                                    <span>Precio máximo</span>
                                    <span className="text-sky-700">{priceLimit >= PRICE_LIMIT_MAX ? 'Sin límite' : `Q${priceLimit}`}</span>
                                </label>
                                <input
                                    type="range"
                                    min={0}
                                    max={PRICE_LIMIT_MAX}
                                    step={50}
                                    value={priceLimit}
                                    onChange={(event) => setPriceLimit(Number(event.target.value))}
                                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-sky-600 mb-3"
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPriceLimit(PRICE_LIMIT_MAX)}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-sky-700"
                                    >
                                        Sin límite
                                    </button>
                                </div>
                            </div>

                            {/* Estado */}
                            <div>
                                <label className="mb-3 block text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Estado</label>
                                <button
                                    type="button"
                                    onClick={() => setShowOnlyActive(!showOnlyActive)}
                                    className={`w-full rounded-2xl border px-4 py-2.5 text-left text-sm font-semibold transition ${showOnlyActive
                                            ? 'border-sky-600 bg-sky-600 text-white shadow-md shadow-sky-500/20'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700'
                                        }`}
                                >
                                    Solo médicos activos
                                </button>
                            </div>
                        </div>
                    </aside>
                )}

                <div className="min-w-0 space-y-6">
                    {error ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            No fue posible cargar la lista de médicos.
                        </div>
                    ) : null}

                    <section id="doctores" className="space-y-5 relative min-h-[400px]">
                        {isPaginating ? (
                            <div className="flex h-[400px] flex-col items-center justify-center">
                                <div className="h-20 w-20 animate-spin rounded-full border-8 border-slate-200 border-t-sky-600" />
                            </div>
                        ) : paginatedDoctors.length ? (
                            <AnimatedList className="grid gap-6 lg:grid-cols-2 xl:grid-cols-2">
                                {paginatedDoctors.map((doctor) => (
                                    <DoctorCard key={doctor.doctor.exp_codigo} data={doctor} onVisit={handleDoctorVisit} />
                                ))}
                            </AnimatedList>
                        ) : (
                            <section className="rounded-4xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                                    <Search className="h-7 w-7" />
                                </div>
                                <h4 className="mt-4 text-2xl font-black tracking-tight text-slate-900">No hay coincidencias</h4>
                                <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                                    Prueba con otro nombre, especialidad, correo o colegiado.
                                </p>
                            </section>
                        )}

                        {visibleDoctors.length > itemsPerPage ? (
                            <div className="flex items-center justify-center px-4 py-4">
                                <div className="flex items-center justify-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                        disabled={currentPageForView === 1}
                                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                        aria-label="Página anterior"
                                    >
                                        <ChevronRight className="h-4 w-4 rotate-180" />
                                    </button>

                                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sm font-black text-sky-700 shadow-sm">
                                        {currentPageForView}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPageForView >= totalPages}
                                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                        aria-label="Página siguiente"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </section>
                </div>
            </div>
        </main>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<NeoLoader />}>
            <DashboardContent />
        </Suspense>
    );
}
