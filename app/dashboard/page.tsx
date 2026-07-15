'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState, useDeferredValue } from 'react';
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
    ArrowDownUp,
    Calendar,
    Video,
    DollarSign,
    Target,
    ChevronDown,
    Grid,
    List,
    Home,
} from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

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

type SortOption = 'name-asc' | 'name-desc' | 'rating-desc' | 'price-asc';

const PRICE_LIMIT_MAX = 5000;

function normalizeText(value: string) {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

const specialtyHomologues: Record<string, string[]> = {
    'traumatologo': ['traumatología', 'traumatologia', 'traumatologo', 'ortopedia'],
    'urologo': ['urología', 'urologia', 'urologo'],
    'cardiologo': ['cardiología', 'cardiologia', 'cardiologo'],
    'ginecologo': ['ginecología', 'ginecologia', 'ginecologo', 'obstetricia'],
    'pediatra': ['pediatría', 'pediatria', 'pediatra'],
    'dermatologo': ['dermatología', 'dermatologia', 'dermatologo'],
    'oftalmologo': ['oftalmología', 'oftalmologia', 'oftalmologo'],
    'neurologo': ['neurología', 'neurologia', 'neurologo'],
    'psiquiatra': ['psiquiatría', 'psiquiatria', 'psiquiatra'],
    'psicologo': ['psicología', 'psicologia', 'psicologo'],
    'gastroenterologo': ['gastroenterología', 'gastroenterologia', 'gastroenterologo'],
    'otorrino': ['otorrinolaringología', 'otorrinolaringologia', 'otorrinolaringologo', 'otorrino'],
    'endocrinologo': ['endocrinología', 'endocrinologia', 'endocrinologo'],
    'oncologo': ['oncología', 'oncologia', 'oncologo'],
    'neumologo': ['neumología', 'neumologia', 'neumologo'],
    'nefrologo': ['nefrología', 'nefrologia', 'nefrologo'],
    'reumatologo': ['reumatología', 'reumatologia', 'reumatologo'],
    'alergologo': ['alergología', 'alergologia', 'alergologo'],
    'odontologo': ['odontología', 'odontologia', 'odontologo', 'dentista'],
    'nutricionista': ['nutrición', 'nutricion', 'nutricionista']
};

function getNormalizedHomologues(term: string): string[] {
    const normalized = normalizeText(term);
    
    // Si el término encaja en una de nuestras llaves o valores de homólogos, devolvemos todo ese grupo normalizado
    for (const [key, values] of Object.entries(specialtyHomologues)) {
        const normalizedValues = values.map(normalizeText);
        if (normalizeText(key) === normalized || normalizedValues.includes(normalized)) {
            return [normalizeText(key), ...normalizedValues];
        }
    }
    return [normalized];
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

    // Restringimos el índice a lo que el usuario realmente buscaría: Nombres, Especialidades y Colegiado
    const searchIndex = normalizeText(
        [
            fullName,
            doctor.exp_colegiado_gt ?? '',
            ...doctor.especialidades.map((item) => item.especialidad),
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

function CustomDropdown({
    icon: Icon,
    title,
    options,
    value,
    onChange
}: {
    icon: any;
    title: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (val: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value) || options[0];

    return (
        <div ref={dropdownRef} className="relative w-full">
            <button 
                type="button" 
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between py-1 transition hover:opacity-80"
            >
                <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm`}>
                        <Icon className={`h-5 w-5 text-white`} />
                    </div>
                    <div className="text-left">
                        <div className="text-[0.95rem] font-bold text-white">{title}</div>
                        <div className="text-sm font-medium text-sky-100">{selectedOption.label}</div>
                    </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                        {options.map((option) => {
                            const isSelected = value === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition ${
                                        isSelected 
                                        ? 'bg-sky-500/20 text-sky-300' 
                                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <span className={`flex items-center gap-2`}>
                                        {isSelected && title === 'Ordenar por' && <ArrowDownUp className="h-4 w-4" />}
                                        {option.label}
                                    </span>
                                    {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-sky-400"></div>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function DashboardContent() {
    const router = useRouter();
    const { status } = useSession();

    // React Query — datos del servidor
    const { data: doctors = [], isLoading, error } = useDoctors();

    // Local search state for ultra-fast typing
    const [searchTerm, setSearchTerm] = useState('');
    const [locationTerm, setLocationTerm] = useParamString('location');
    const [sortBy, setSortBy] = useParamString('sort', 'name-asc') as [SortOption, (v: string) => void];
    const [availability, setAvailability] = useParamString('availability', '');
    const [modality, setModality] = useParamString('modality', 'all');
    const [specialtyParam, setSpecialtyParam] = useParamString('specialty', 'all');
    const [showOnlyActive, setShowOnlyActive] = useParamBoolean('active');
    const [priceLimit, setPriceLimit] = useParamNumber('price', PRICE_LIMIT_MAX);
    const [localPriceLimit, setLocalPriceLimit] = useState(priceLimit);
    useEffect(() => {
        setLocalPriceLimit(priceLimit);
    }, [priceLimit]);
    const [activeSidebarFilter, setActiveSidebarFilter] = useState<'especialidad' | 'disponibilidad' | 'modalidad' | 'precio' | null>(null);

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
    
    const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
    const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const [isListView, setIsListView] = useState(false);
    const [isChangingView, setIsChangingView] = useState(false);
    const [specialtySearch, setSpecialtySearch] = useState('');
    const [searchTags, setSearchTags] = useState<string[]>([]);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [selectedInsurances, setSelectedInsurances] = useState<string[]>([]);
    
    const deferredSearchTerm = useDeferredValue(searchTerm);

    const advancedFiltersRef = useRef<HTMLDivElement | null>(null);
    const sortMenuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (searchMenuRef.current && !searchMenuRef.current.contains(target)) {
                setIsSearchFocused(false);
            }
            if (advancedFiltersRef.current && !advancedFiltersRef.current.contains(target)) {
                setIsAdvancedFiltersOpen(false);
            }
            if (sortMenuRef.current && !sortMenuRef.current.contains(target)) {
                setIsSortMenuOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsSearchFocused(false);
                closeFilters();
                setIsAdvancedFiltersOpen(false);
                setIsSortMenuOpen(false);
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
        const activeTags = [...searchTags, deferredSearchTerm.trim()].filter(Boolean);
        const normalizedLocation = normalizeText(locationTerm.trim());

        const filteredDoctors = resolvedDoctors.map((doctor) => {
            let isMatch = true;
            let matchedSpecialty: string | undefined = undefined;
            let searchHighlight: string | undefined = undefined;

            for (const tag of activeTags) {
                const homologues = getNormalizedHomologues(tag);
                const matchedHomologue = homologues.find(h => doctor.searchIndex.includes(h));
                if (!matchedHomologue) {
                    isMatch = false;
                    break;
                }

                if (!searchHighlight) searchHighlight = tag;
                
                // Buscar si la coincidencia fue en una especialidad
                if (!matchedSpecialty) {
                    for (const spec of doctor.specialtyPreview) {
                        const normSpec = normalizeText(spec);
                        if (homologues.some(h => normSpec.includes(h))) {
                            matchedSpecialty = spec;
                            break;
                        }
                    }
                }
            }

            if (!isMatch) return null;

            const matchesLocation = !normalizedLocation || normalizeText(doctor.locationLabel).includes(normalizedLocation);
            const matchesActive = !showOnlyActive || isDoctorActive(doctor.doctor);
            
            const doctorModalities = doctor.doctor.modalidades.map((item) => normalizeText(item.modalidad));
            let matchesModality = true;
            if (modality === 'virtual') matchesModality = doctorModalities.some((item) => item.includes('telemedicina') || item.includes('virtual'));
            if (modality === 'presencial') matchesModality = doctorModalities.some((item) => item.includes('presencial'));
            if (modality === 'hybrid') matchesModality = doctorModalities.some((item) => item.includes('telemedicina') || item.includes('virtual')) && doctorModalities.some((item) => item.includes('presencial'));
            
            const matchesAvailability = true; 
            
            const matchesPrice = matchesPriceLimit(getDoctorPricePoints(doctor.doctor), priceLimit);

            const matchesSpecialtyParam = specialtyParam === 'all' || doctor.specialtyPreview.some((s) => s === specialtyParam);
            
            const matchesLanguages = selectedLanguages.length === 0 || selectedLanguages.some(lang => doctor.languagePreview?.includes(lang));
            const matchesInsurances = selectedInsurances.length === 0 || selectedInsurances.some(ins => doctor.doctor.aseguradoras?.some(a => a.aseguradora === ins));

            if (!(matchesLocation && matchesActive && matchesModality && matchesAvailability && matchesPrice && matchesSpecialtyParam && matchesLanguages && matchesInsurances)) {
                return null;
            }

            return {
                ...doctor,
                matchedSpecialty,
                searchHighlight,
            };
        }).filter(Boolean) as (typeof resolvedDoctors[0] & { matchedSpecialty?: string, searchHighlight?: string })[];

        return filteredDoctors.sort((leftDoctor, rightDoctor) => {
            if (sortBy === 'name-desc') {
                return rightDoctor.fullName.localeCompare(leftDoctor.fullName, 'es');
            }
            if (sortBy === 'rating-desc') {
                return rightDoctor.recognitionCount - leftDoctor.recognitionCount;
            }
            if (sortBy === 'price-asc') {
                const minPriceL = Math.min(...getDoctorPricePoints(leftDoctor.doctor)) || Infinity;
                const minPriceR = Math.min(...getDoctorPricePoints(rightDoctor.doctor)) || Infinity;
                return minPriceL - minPriceR;
            }

            return leftDoctor.fullName.localeCompare(rightDoctor.fullName, 'es');
        });
    }, [locationTerm, modality, availability, priceLimit, resolvedDoctors, deferredSearchTerm, showOnlyActive, sortBy, specialtyParam, searchTags, selectedLanguages, selectedInsurances]);

    const recentDoctorItems = useMemo(() => recentDoctors.slice(0, 3), [recentDoctors]);
    const searchSuggestions = useMemo(() => {
        const query = searchTerm.trim();
        const normalizedQuery = normalizeText(query);
        
        if (!normalizedQuery) {
            return recentDoctorItems.map(doc => ({ type: 'recent' as const, label: doc.fullName, sublabel: doc.specialty }));
        }

        const suggestions = new Map<string, { type: 'specialty' | 'location' | 'doctor', label: string, sublabel?: string }>();
        
        resolvedDoctors.forEach(doc => {
            // Check specialty
            doc.specialtyPreview.forEach(s => {
                if (normalizeText(s).includes(normalizedQuery) && !searchTags.includes(s)) {
                    suggestions.set(`spec_${s}`, { type: 'specialty', label: s });
                }
            });
            // Check location
            if (normalizeText(doc.locationLabel).includes(normalizedQuery) && !searchTags.includes(doc.locationLabel)) {
                suggestions.set(`loc_${doc.locationLabel}`, { type: 'location', label: doc.locationLabel });
            }
            // Check name
            if (normalizeText(doc.fullName).includes(normalizedQuery) && !searchTags.includes(doc.fullName)) {
                suggestions.set(`doc_${doc.fullName}`, { type: 'doctor', label: doc.fullName, sublabel: doc.specialtyPreview[0] });
            }
        });

        return Array.from(suggestions.values()).slice(0, 8);
    }, [recentDoctorItems, searchTerm, resolvedDoctors, searchTags]);

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

    const itemsPerPage = 8;
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
        () => Array.from(new Set(resolvedDoctors.flatMap((doctor) => doctor.specialtyPreview))).sort(),
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
    
    const languagePicks = useMemo(
        () => Array.from(new Set(resolvedDoctors.flatMap((doctor) => doctor.languagePreview || []))).sort(),
        [resolvedDoctors],
    );
    const insurancePicks = useMemo(
        () => Array.from(new Set(resolvedDoctors.flatMap((doctor) => doctor.doctor.aseguradoras?.map(a => a.aseguradora) || []))).sort(),
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
                    { href: '/dashboard/citas', label: 'Citas' },
                    { href: '/dashboard/medicamentos', label: 'Medicamentos' },
                ]}
            />

            <div className="mx-auto w-[90%] max-w-[1800px] mt-8 flex flex-col gap-8">
                {/* 1. Hero Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-display font-black text-primary leading-tight">Encuentra a tu especialista</h1>
                        <p className="text-on-surface-variant text-body-md mt-2">Más de 200 profesionales de la salud listos para atenderte hoy.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative z-40" ref={sortMenuRef}>
                            <button
                                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                                className={`inline-flex items-center gap-3 bg-surface rounded-xl pl-4 pr-3 py-2.5 text-label-md font-semibold focus:outline-none transition-all shadow-[0_2px_4px_rgba(0,0,0,0.02)] border ${
                                    isSortMenuOpen ? 'border-primary text-primary ring-2 ring-primary/20' : 'border-outline-variant/30 text-on-surface hover:border-outline-variant/60 hover:bg-surface-container'
                                }`}
                            >
                                <span>
                                    {sortBy === 'name-asc' && 'Nombre A-Z'}
                                    {sortBy === 'name-desc' && 'Nombre Z-A'}
                                    {sortBy === 'rating-desc' && 'Mejor valorados'}
                                    {sortBy === 'price-asc' && 'Precio menor'}
                                </span>
                                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isSortMenuOpen ? 'rotate-180 text-primary' : 'text-on-surface-variant'}`} />
                            </button>
                            
                            {isSortMenuOpen && (
                                <div className="absolute right-0 top-[calc(100%+8px)] w-48 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
                                    {[
                                        { id: 'name-asc', label: 'Nombre A-Z' },
                                        { id: 'name-desc', label: 'Nombre Z-A' },
                                        { id: 'rating-desc', label: 'Mejor valorados' },
                                        { id: 'price-asc', label: 'Precio menor' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => {
                                                setSortBy(opt.id as SortOption);
                                                setIsSortMenuOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2.5 rounded-xl text-body-md font-medium transition-colors ${
                                                sortBy === opt.id 
                                                    ? 'bg-primary/10 text-primary' 
                                                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex bg-surface-container-high rounded-xl p-1 border border-outline-variant/30">
                            <button
                                onClick={() => {
                                    if (!isListView) return;
                                    setIsChangingView(true);
                                    setTimeout(() => { setIsListView(false); setTimeout(() => setIsChangingView(false), 300); }, 50);
                                }}
                                className={`p-2 rounded-lg transition-colors ${!isListView ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}
                                aria-label="Vista en cuadrícula"
                            >
                                <Grid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => {
                                    if (isListView) return;
                                    setIsChangingView(true);
                                    setTimeout(() => { setIsListView(true); setTimeout(() => setIsChangingView(false), 300); }, 50);
                                }}
                                className={`p-2 rounded-lg transition-colors ${isListView ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}
                                aria-label="Vista en lista"
                            >
                                <List className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Barra de búsqueda */}
                <div className="flex flex-col lg:flex-row gap-4">
                    <div ref={searchMenuRef} className="relative flex-1 rounded-2xl bg-surface border border-outline-variant/30 shadow-sm flex items-center px-4 h-14 overflow-hidden">
                        <Search className="h-5 w-5 shrink-0 text-outline mr-2" />
                        
                        <div className="flex items-center gap-2 h-full flex-nowrap shrink-0 overflow-x-auto no-scrollbar">
                            {searchTags.map((tag, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 h-8 rounded-lg bg-primary/10 text-primary px-3 text-sm font-medium whitespace-nowrap">
                                    {tag}
                                    <button 
                                        type="button" 
                                        onClick={() => setSearchTags(tags => tags.filter((_, i) => i !== idx))}
                                        className="hover:bg-primary/20 rounded-full p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>

                        <input
                            id="searchTerm"
                            value={searchTerm}
                            onFocus={() => setIsSearchFocused(true)}
                            onChange={(event) => {
                                setSearchTerm(event.target.value);
                                setIsSearchFocused(true);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && searchTerm.trim()) {
                                    e.preventDefault();
                                    if (!searchTags.includes(searchTerm.trim())) {
                                        setSearchTags(prev => [...prev, searchTerm.trim()]);
                                    }
                                    setSearchTerm('');
                                } else if (e.key === 'Backspace' && !searchTerm && searchTags.length > 0) {
                                    setSearchTags(prev => prev.slice(0, -1));
                                }
                            }}
                            placeholder={searchTags.length === 0 ? "Buscar por doctor, especialidad o ubicación..." : "Añadir filtro..."}
                            className="flex-1 h-full bg-transparent min-w-[140px] px-2 text-body-md font-medium text-on-surface outline-none placeholder:text-outline/70"
                        />
                        {(searchTerm || searchTags.length > 0) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchTerm('');
                                    setSearchTags([]);
                                    setIsSearchFocused(true);
                                }}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-outline transition hover:bg-surface-container-high hover:text-on-surface ml-2"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}

                        {/* Search Suggestions Dropdown */}
                        {isSearchFocused && searchSuggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface shadow-lg">
                                <div className="border-b border-outline-variant/20 px-4 py-3 flex items-center gap-2">
                                    {searchTerm ? (
                                        <>
                                            <Sparkles className="h-4 w-4 text-primary" />
                                            <p className="text-xs font-bold text-outline">
                                                Sugerencias para "{searchTerm}"
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-xs font-bold uppercase tracking-wider text-outline">Búsquedas recientes</p>
                                    )}
                                </div>
                                <div className="py-2">
                                    {searchSuggestions.map((suggestion, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                if (!searchTags.includes(suggestion.label)) {
                                                    setSearchTags(prev => [...prev, suggestion.label]);
                                                }
                                                setSearchTerm('');
                                                setIsSearchFocused(false);
                                            }}
                                            className="flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-surface-container-lowest"
                                        >
                                            <Search className="h-5 w-5 text-primary" />
                                            <span className="text-body-md text-on-surface">{suggestion.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <button
                        type="button"
                        onClick={() => alert('Buscando médicos cerca de tu ubicación actual...')}
                        className="inline-flex h-14 shrink-0 items-center gap-2 rounded-2xl bg-secondary-container px-6 text-label-md font-semibold text-on-secondary-container transition hover:bg-secondary-container/90"
                    >
                        <Target className="h-5 w-5" />
                        Cerca de ti
                    </button>

                    <div className="relative" ref={advancedFiltersRef}>
                        <button
                            type="button"
                            onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
                            className={`inline-flex h-14 shrink-0 items-center gap-2 rounded-2xl border px-6 text-label-md font-semibold transition ${
                                isAdvancedFiltersOpen
                                    ? 'border-primary bg-primary text-on-primary'
                                    : 'border-outline-variant bg-surface text-on-surface hover:bg-surface-container'
                            }`}
                        >
                            <Filter className="h-5 w-5" />
                            Filtros Avanzados
                            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isAdvancedFiltersOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isAdvancedFiltersOpen && (
                            <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[540px] rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-[0_12px_48px_rgba(0,0,0,0.12)]">
                                <div className="flex gap-8 max-h-[60vh] overflow-y-auto pr-2" style={{scrollbarWidth: 'thin'}}>
                                    
                                    {/* Columna Idiomas */}
                                    <div className="flex-1">
                                        <h4 className="text-label-md font-bold mb-3 text-on-surface uppercase tracking-wider text-xs">Idiomas</h4>
                                        <div className="flex flex-col gap-1">
                                            {languagePicks.length > 0 ? languagePicks.map(lang => (
                                                <label key={lang} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-lowest cursor-pointer transition-colors group">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedLanguages.includes(lang)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedLanguages(prev => [...prev, lang]);
                                                            else setSelectedLanguages(prev => prev.filter(l => l !== lang));
                                                        }}
                                                        className="rounded-md border-outline-variant/50 text-primary focus:ring-primary focus:ring-offset-0 h-5 w-5 transition-colors cursor-pointer bg-transparent" 
                                                    />
                                                    <span className="text-body-md font-medium text-on-surface-variant group-hover:text-on-surface">{lang}</span>
                                                </label>
                                            )) : <span className="text-body-sm text-outline p-2.5">No hay idiomas registrados</span>}
                                        </div>
                                    </div>
                                    
                                    {/* Divisor vertical suave */}
                                    <div className="w-[1px] bg-outline-variant/20"></div>

                                    {/* Columna Aseguradoras */}
                                    <div className="flex-1">
                                        <h4 className="text-label-md font-bold mb-3 text-on-surface uppercase tracking-wider text-xs">Aseguradoras</h4>
                                        <div className="flex flex-col gap-1">
                                            {insurancePicks.length > 0 ? insurancePicks.map(ins => (
                                                <label key={ins} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-lowest cursor-pointer transition-colors group">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedInsurances.includes(ins)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedInsurances(prev => [...prev, ins]);
                                                            else setSelectedInsurances(prev => prev.filter(i => i !== ins));
                                                        }}
                                                        className="rounded-md border-outline-variant/50 text-primary focus:ring-primary focus:ring-offset-0 h-5 w-5 transition-colors cursor-pointer bg-transparent" 
                                                    />
                                                    <span className="text-body-md font-medium text-on-surface-variant group-hover:text-on-surface">{ins}</span>
                                                </label>
                                            )) : <span className="text-body-sm text-outline p-2.5">No hay aseguradoras registradas</span>}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mx-auto w-[90%] max-w-[1800px] py-8">
                <div className={`flex gap-8 items-start transition-all duration-300`}>
                    {/* Sidebar */}
                    <aside className={`hidden lg:flex shrink-0 transition-all duration-500 rounded-2xl bg-surface border border-outline-variant/20 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] h-fit overflow-visible sticky top-8 z-40 ${activeSidebarFilter ? 'w-[380px]' : 'w-[80px]'}`}>
                        {/* Slim Icon Rail */}
                        <div className="w-[80px] shrink-0 flex flex-col items-center gap-6 py-6 bg-surface z-10 relative border-r border-outline-variant/10">
                            
                            {/* Filter: Especialidad */}
                            <div className="relative group">
                                <button 
                                    onClick={() => setActiveSidebarFilter(activeSidebarFilter === 'especialidad' ? null : 'especialidad')}
                                    className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${activeSidebarFilter === 'especialidad' ? 'bg-[#0d9488]/10 text-[#0d9488]' : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-[#0d9488]'}`}
                                >
                                    <Filter className="w-5 h-5" />
                                </button>
                                <div className="absolute left-8 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-surface/95 backdrop-blur-sm border border-outline-variant/20 shadow-[0_8px_24px_rgba(13,148,136,0.15)] text-on-surface text-sm font-bold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300 whitespace-nowrap z-50 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#0d9488]"></div>
                                    Especialidad
                                </div>
                            </div>

                            <div className="w-8 border-b border-outline-variant/20"></div>

                            {/* Filter: Disponibilidad */}
                            <div className="relative group">
                                <button 
                                    onClick={() => setActiveSidebarFilter(activeSidebarFilter === 'disponibilidad' ? null : 'disponibilidad')}
                                    className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${activeSidebarFilter === 'disponibilidad' ? 'bg-[#0284c7]/10 text-[#0284c7]' : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-[#0284c7]'}`}
                                >
                                    <Calendar className="w-5 h-5" />
                                </button>
                                <div className="absolute left-8 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-surface/95 backdrop-blur-sm border border-outline-variant/20 shadow-[0_8px_24px_rgba(2,132,199,0.15)] text-on-surface text-sm font-bold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300 whitespace-nowrap z-50 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#0284c7]"></div>
                                    Disponibilidad
                                </div>
                            </div>

                            <div className="w-8 border-b border-outline-variant/20"></div>

                            {/* Filter: Modalidad */}
                            <div className="relative group">
                                <button 
                                    onClick={() => setActiveSidebarFilter(activeSidebarFilter === 'modalidad' ? null : 'modalidad')}
                                    className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${activeSidebarFilter === 'modalidad' ? 'bg-[#4f46e5]/10 text-[#4f46e5]' : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-[#4f46e5]'}`}
                                >
                                    <Video className="w-5 h-5" />
                                </button>
                                <div className="absolute left-8 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-surface/95 backdrop-blur-sm border border-outline-variant/20 shadow-[0_8px_24px_rgba(79,70,229,0.15)] text-on-surface text-sm font-bold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300 whitespace-nowrap z-50 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#4f46e5]"></div>
                                    Modalidad
                                </div>
                            </div>

                            <div className="w-8 border-b border-outline-variant/20"></div>

                            {/* Filter: Precio */}
                            <div className="relative group">
                                <button 
                                    onClick={() => setActiveSidebarFilter(activeSidebarFilter === 'precio' ? null : 'precio')}
                                    className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${activeSidebarFilter === 'precio' ? 'bg-[#059669]/10 text-[#059669]' : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-[#059669]'}`}
                                >
                                    <DollarSign className="w-5 h-5" />
                                </button>
                                <div className="absolute left-8 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-surface/95 backdrop-blur-sm border border-outline-variant/20 shadow-[0_8px_24px_rgba(5,150,105,0.15)] text-on-surface text-sm font-bold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300 whitespace-nowrap z-50 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#059669]"></div>
                                    Precio máximo
                                </div>
                            </div>
                        </div>

                        {/* Expanded Content Panel */}
                        <div className={`flex-1 flex flex-col transition-opacity duration-300 bg-surface overflow-hidden ${activeSidebarFilter ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="p-5 flex-1 min-w-[300px] max-w-[300px]">
                                {activeSidebarFilter === 'especialidad' && (
                                    <div className="animate-in fade-in duration-300">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-semibold text-lg text-[#0d9488]">Especialidad</h3>
                                            <button onClick={() => setActiveSidebarFilter(null)} className="p-1 hover:bg-surface-container rounded-lg text-outline"><X className="w-4 h-4"/></button>
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder="Buscar especialidad..." 
                                            value={specialtySearch}
                                            onChange={(e) => setSpecialtySearch(e.target.value)}
                                            className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-sm outline-none focus:border-primary mb-3"
                                        />
                                        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2" style={{scrollbarWidth: 'thin'}}>
                                            <label className="flex items-center gap-2 cursor-pointer group/item">
                                                <div className={`w-4 h-4 rounded-full border ${specialtyParam === 'all' ? 'border-[#0d9488] border-[4px]' : 'border-outline group-hover/item:border-[#0d9488]'} transition-all`} onClick={() => setSpecialtyParam('all')}></div>
                                                <span className="text-body-md text-on-surface-variant">Todas</span>
                                            </label>
                                            {specialtyPicks.filter(s => s.toLowerCase().includes(specialtySearch.toLowerCase())).map(opt => (
                                                <label key={opt} className="flex items-center gap-2 cursor-pointer group/item">
                                                    <div className={`w-4 h-4 rounded-full border ${specialtyParam === opt ? 'border-[#0d9488] border-[4px]' : 'border-outline group-hover/item:border-[#0d9488]'} transition-all`} onClick={() => setSpecialtyParam(opt)}></div>
                                                    <span className="text-body-md text-on-surface-variant">{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeSidebarFilter === 'disponibilidad' && (
                                    <div className="animate-in fade-in duration-300">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-semibold text-lg text-[#0284c7]">Disponibilidad</h3>
                                            <button onClick={() => setActiveSidebarFilter(null)} className="p-1 hover:bg-surface-container rounded-lg text-outline"><X className="w-4 h-4"/></button>
                                        </div>
                                        <div className="flex justify-center" style={{ '--rdp-cell-size': '38px', '--rdp-caption-font-size': '16px' } as React.CSSProperties}>
                                            <DayPicker
                                                mode="single"
                                                locale={es}
                                                selected={availability ? new Date(availability + 'T00:00:00') : undefined}
                                                onSelect={(date) => setAvailability(date ? format(date, 'yyyy-MM-dd') : '')}
                                                disabled={{ before: new Date() }}
                                                className="!m-0"
                                                classNames={{
                                                    selected: "bg-[#0284c7] !text-white font-bold hover:bg-[#0284c7]/90",
                                                    today: "font-bold text-[#0284c7]",
                                                    day: "hover:bg-surface-container rounded-lg transition-colors",
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeSidebarFilter === 'modalidad' && (
                                    <div className="animate-in fade-in duration-300">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-semibold text-lg text-[#4f46e5]">Modalidad</h3>
                                            <button onClick={() => setActiveSidebarFilter(null)} className="p-1 hover:bg-surface-container rounded-lg text-outline"><X className="w-4 h-4"/></button>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {[{id: 'all', label: 'Todas', icon: <Search className="w-4 h-4"/>}, {id: 'presencial', label: 'Presencial', icon: <MapPin className="w-4 h-4"/>}, {id: 'virtual', label: 'Virtual', icon: <Video className="w-4 h-4"/>}, {id: 'domicilio', label: 'Domicilio', icon: <Home className="w-4 h-4"/>}].map(opt => (
                                                <label
                                                    key={opt.id}
                                                    className={`flex items-center gap-3 p-3 cursor-pointer select-none group/item rounded-xl border transition-all ${modality === opt.id ? 'border-[#4f46e5] bg-[#4f46e5]/5' : 'border-outline-variant/50 hover:bg-surface-container'}`}
                                                >
                                                    <div className={`shrink-0 w-4 h-4 rounded-full border ${modality === opt.id ? 'border-[#4f46e5] border-[4px]' : 'border-outline group-hover/item:border-[#4f46e5]'} transition-all`} onClick={() => setModality(opt.id)}></div>
                                                    <div className={`flex items-center gap-2 text-body-md font-medium ${modality === opt.id ? 'text-[#4f46e5]' : 'text-on-surface-variant'}`}>
                                                        {opt.icon}
                                                        {opt.label}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeSidebarFilter === 'precio' && (
                                    <div className="animate-in fade-in duration-300">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-semibold text-lg text-[#059669]">Precio máximo</h3>
                                            <button onClick={() => setActiveSidebarFilter(null)} className="p-1 hover:bg-surface-container rounded-lg text-outline"><X className="w-4 h-4"/></button>
                                        </div>
                                        <div className="font-bold text-[#059669] text-xl mb-4 text-center">
                                            Q{localPriceLimit}
                                        </div>
                                        <div className="relative pt-2 pb-2">
                                            <input
                                                type="range"
                                                min={0}
                                                max={PRICE_LIMIT_MAX}
                                                step={50}
                                                value={localPriceLimit}
                                                onChange={(e) => setLocalPriceLimit(Number(e.target.value))}
                                                onMouseUp={() => setPriceLimit(localPriceLimit)}
                                                onTouchEnd={() => setPriceLimit(localPriceLimit)}
                                                className="w-full accent-[#059669]"
                                            />
                                            <div className="flex justify-between text-caption text-outline mt-2">
                                                <span>Q0</span>
                                                <span>Q{PRICE_LIMIT_MAX}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>

                    <div className="flex-1 min-w-0 space-y-6">
                    {error ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            No fue posible cargar la lista de médicos.
                        </div>
                    ) : null}

                    <section id="doctores" className="space-y-5 relative min-h-[400px]">
                        {isPaginating || isChangingView ? (
                            <div className="flex h-[400px] flex-col items-center justify-center">
                                <div className="h-20 w-20 animate-spin rounded-full border-8 border-slate-200 border-t-sky-600" />
                            </div>
                        ) : paginatedDoctors.length ? (
                            <AnimatedList className={isListView ? "grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-7xl mx-auto w-full" : "grid gap-6 grid-cols-[repeat(auto-fill,minmax(280px,1fr))] max-w-[1360px] mx-auto w-full"}>
                                {paginatedDoctors.map((doctor) => (
                                    <DoctorCard key={doctor.doctor.exp_codigo} data={doctor} onVisit={handleDoctorVisit} isListView={isListView} />
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
