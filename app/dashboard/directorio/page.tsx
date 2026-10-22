'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState, useDeferredValue, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DirectoryMap, type BuildingLocation } from '@/components/directory-map';
import { useSession } from 'next-auth/react';
import {
    BadgeCheck,
    Building2,
    ChevronLeft,
    ChevronRight,
    Filter,
    MapPin,
    Search,
    ShieldCheck,
    User,
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
    Heart,
    Globe,
    Check,
    Columns2,
    LayoutGrid,
    Share2,
    SlidersHorizontal,
    ArrowRight,
    Star,
    Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

import type { DoctorResponse, DoctorClinica } from '@/types';
import { buildDoctorFullName, isDoctorActive, cleanZonaText, cleanZonasDomicilio, getDoctorPriceDisplay } from '@/types/doctor';
import { Navbar } from '@/components/navbar';
import { DoctorCard, type DoctorCardData } from '@/components/doctor-card';
import { DoctorCardExpandible } from '@/components/doctor-card-expandible';
import { DoctorCardMobile } from '@/components/doctor-card-mobile';
import { DoctorCompactCard } from '@/components/doctor-compact-card';
import { DoctorDetailPanel } from '@/components/doctor-detail-panel';
import { DoctorExpandableModal } from '@/components/doctor-expandable-modal';
import { ShareDoctorModal } from '@/components/share-doctor-modal';
import { InsuranceLogoBadge } from '@/components/insurance-logo-badge';
import { useUserLocation } from '@/hooks/use-user-location';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedList } from '@/components/animated-list';
import { AnimatedModal } from '@/components/animated-modal';
import { NeoLoader } from '@/components/neo-loader';
import { useDoctors } from '@/hooks/use-doctors';
import { useParamString, useParamBoolean, useParamNumber, useResetParams } from '@/hooks/use-search-params-state';
import { useUIStore } from '@/stores/ui-store';
import { addRecentDoctor, readRecentDoctors, RECENT_DOCTORS_EVENT, type RecentDoctorItem } from '@/lib/recent-doctors';
import { useFavoritos, useAddFavorito, useRemoveFavorito } from '@/hooks/use-favoritos';
import { usePacienteTitular } from '@/hooks/use-pacientes';

type ResolvedDoctor = {
    doctor: DoctorResponse;
    fullName: string;
    specialty: string;
    locationLabel: string;
    locationPreview: string[];
    specialtyPreview: string[];
    modalityPreview: string[];
    languagePreview: string[];
    insurancePreview: string[];
    serviceCount: number;
    educationCount: number;
    recognitionCount: number;
    activeLabel: string;
    searchIndex: string;
};

type SortOption = 'default' | 'name-asc' | 'name-desc' | 'rating-desc' | 'price-asc' | 'distance';

const PRICE_LIMIT_MAX = 5000;

function getDoctorHash(exp_codigo: string, seed: number = 0) {
    let hash = seed;
    for (let i = 0; i < exp_codigo.length; i++) {
        hash = (hash << 5) - hash + exp_codigo.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

function normalizeText(value: string) {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

const specialtyHomologues: Record<string, string[]> = {
    'traumatologo': ['traumatología', 'traumatologia', 'traumatologo', 'traumatologa', 'ortopedia', 'ortopedista'],
    'urologo': ['urología', 'urologia', 'urologo', 'urologa'],
    'cardiologo': ['cardiología', 'cardiologia', 'cardiologo', 'cardiologa'],
    'ginecologo': ['ginecología', 'ginecologia', 'ginecologo', 'ginecologa', 'ginecologas', 'obstetricia', 'obstetra'],
    'pediatra': ['pediatría', 'pediatria', 'pediatra', 'pediatras'],
    'dermatologo': ['dermatología', 'dermatologia', 'dermatologo', 'dermatologa'],
    'oftalmologo': ['oftalmología', 'oftalmologia', 'oftalmologo', 'oftalmologa'],
    'neurologo': ['neurología', 'neurologia', 'neurologo', 'neurologa'],
    'psiquiatra': ['psiquiatría', 'psiquiatria', 'psiquiatra', 'psiquiatras'],
    'psicologo': ['psicología', 'psicologia', 'psicologo', 'psicologa'],
    'gastroenterologo': ['gastroenterología', 'gastroenterologia', 'gastroenterologo', 'gastroenterologa'],
    'otorrino': ['otorrinolaringología', 'otorrinolaringologia', 'otorrinolaringologo', 'otorrinolaringologa', 'otorrino'],
    'endocrinologo': ['endocrinología', 'endocrinologia', 'endocrinologo', 'endocrinologa'],
    'oncologo': ['oncología', 'oncologia', 'oncologo', 'oncologa'],
    'neumologo': ['neumología', 'neumologia', 'neumologo', 'neumologa'],
    'nefrologo': ['nefrología', 'nefrologia', 'nefrologo', 'nefrologa'],
    'reumatologo': ['reumatología', 'reumatologia', 'reumatologo', 'reumatologa'],
    'alergologo': ['alergología', 'alergologia', 'alergologo', 'alergologa'],
    'odontologo': ['odontología', 'odontologia', 'odontologo', 'odontologa', 'dentista'],
    'nutricionista': ['nutrición', 'nutricion', 'nutricionista', 'nutricionistas']
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
    const specialtyPreview = doctor.especialidades.map((item) => item.especialidad).filter(Boolean);
    const modalitySet = new Set(doctor.modalidades.map((item) => item.modalidad).filter(Boolean));
    if (doctor.atencion_domicilio && doctor.atencion_domicilio.length > 0) {
        modalitySet.add('Domicilio');
    }
    const modalityPreview = Array.from(modalitySet).slice(0, 3);
    const languagePreview = doctor.idiomas.map((item) => item.idioma).filter(Boolean);
    const insurancePreview = (doctor.aseguradoras || []).map((item) => item.aseguradora).filter(Boolean);
    const locationPreview = Array.from(new Set([
        ...doctor.clinicas.map(c => [c.cli_descripcion, cleanZonaText(c.cli_zona)].filter(Boolean).join(', ')).filter(Boolean),
        ...(doctor.atencion_domicilio || []).map(d => `Domicilio: ${[d.mun_descripcion, cleanZonasDomicilio(d.lad_zonas)].filter(Boolean).join(', ')}`).filter(Boolean)
    ]));

    // Restringimos el índice a lo que el usuario realmente buscaría: Nombres, Especialidades, Colegiado y Género
    const isFemale = (doctor.exp_sexo || '').toUpperCase() === 'F';
    const genderKeywords = isFemale ? 'doctora doctoras dra mujer femenina ginecologa' : 'doctor doctores dr hombre masculino';

    const searchIndex = normalizeText(
        [
            fullName,
            genderKeywords,
            doctor.exp_colegiado_gt ?? '',
            ...doctor.especialidades.map((item) => item.especialidad),
            ...locationPreview
        ]
            .filter(Boolean)
            .join(' '),
    );

    return {
        doctor,
        fullName,
        specialty,
        locationLabel,
        locationPreview,
        specialtyPreview,
        modalityPreview,
        languagePreview,
        insurancePreview,
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
    const { titular } = usePacienteTitular();
    const codPac = titular?.pac_codigo || undefined;
    const { data: favoritos = [] } = useFavoritos(codPac);

    // Local search state for ultra-fast typing
    const [searchTerm, setSearchTerm] = useState('');
    const [locationTerm, setLocationTerm] = useParamString('location');
    const [sortBy, setSortBy] = useParamString('sort', 'default') as [SortOption, (v: string) => void];
    const [availability, setAvailability] = useParamString('availability', '');
    const [calendarMonth, setCalendarMonth] = useState<Date>(() => availability ? new Date(availability + 'T00:00:00') : new Date());

    useEffect(() => {
        if (availability) {
            setCalendarMonth(new Date(availability + 'T00:00:00'));
        }
    }, [availability]);

    const isPastCalendarMonth = useCallback((date: Date) => {
        const today = new Date();
        return (
            date.getFullYear() < today.getFullYear() ||
            (date.getFullYear() === today.getFullYear() && date.getMonth() <= today.getMonth())
        );
    }, []);

    const [modality, setModality] = useParamString('modality', 'all');
    const [specialtyParam, setSpecialtyParam] = useParamString('specialty', 'all');
    const [gender, setGender] = useParamString('gender', 'all');

    // Semilla aleatoria estable por sesión: inicializada inmediatamente sin provocar re-ordenamiento tras montar
    const [sessionSeed, setSessionSeed] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            try {
                const stored = sessionStorage.getItem('neoclinica_random_seed');
                if (stored) return parseInt(stored, 10);
                const newSeed = Math.floor(Math.random() * 10000000) + 1;
                sessionStorage.setItem('neoclinica_random_seed', newSeed.toString());
                return newSeed;
            } catch {}
        }
        return 42;
    });
    
    const activeModalities = useMemo(() => (!modality || modality === 'all') ? ['all'] : [modality], [modality]);
    const activeSpecialties = useMemo(() => specialtyParam ? specialtyParam.split(',') : ['all'], [specialtyParam]);

    const toggleModality = (id: string) => {
        if (id === 'all' || modality === id) {
            setModality('all');
        } else {
            setModality(id);
        }
    };



    const [showOnlyActive, setShowOnlyActive] = useParamBoolean('active');
    const [showOnlyFavorites, setShowOnlyFavorites] = useParamBoolean('favorites');
    const [viewMode, setViewMode] = useParamString('view', 'split');
    const [priceLimit, setPriceLimit] = useParamNumber('price', PRICE_LIMIT_MAX);
    const [localPriceLimit, setLocalPriceLimit] = useState(priceLimit);
    const [radarRadiusKm, setRadarRadiusKm] = useParamNumber('radar', 10);
    useEffect(() => {
        setLocalPriceLimit(priceLimit);
    }, [priceLimit]);

    const [activePopover, setActivePopover] = useState<'fechas' | 'modalidad' | 'precio' | 'aseguradoras' | 'idiomas' | 'radar' | 'genero' | null>(null);
    const popoverRef = useRef<HTMLDivElement | null>(null);
    const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement | null>(null);
    const filterButtonRef = useRef<HTMLButtonElement | null>(null);
    const [isModalityMenuOpen, setIsModalityMenuOpen] = useState(false);
    const modalityMenuRef = useRef<HTMLDivElement | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

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
    
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const [specialtySearch, setSpecialtySearch] = useState('');
    const [searchTags, setSearchTags] = useState<string[]>([]);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [selectedInsurances, setSelectedInsurances] = useState<string[]>([]);

    const { location: userLocation, requestLocation, loading: locationLoading, getDistanceToDoctor } = useUserLocation();
    const [isNearMeActive, setIsNearMeActive] = useState(false);
    const [isMapVisible, setIsMapVisible] = useState(true);
    const [mainPanelView, setMainPanelView] = useState<'map' | 'details'>('map');
    const [mobileTab, setMobileTab] = useState<'list' | 'map' | 'details'>('list');
    const [modalDoctor, setModalDoctor] = useState<DoctorCardData | null>(null);
    const [doctorToShare, setDoctorToShare] = useState<DoctorCardData | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const addFavMutation = useAddFavorito();
    const removeFavMutation = useRemoveFavorito();

    const handleToggleFavorito = useCallback((expCodigo: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!codPac) {
            toast.error('Debes iniciar sesión para guardar favoritos');
            return;
        }
        const isFav = favoritos.some((f) => f.expCodigo === expCodigo);
        if (isFav) {
            removeFavMutation.mutate({ codPac, codDoc: expCodigo });
        } else {
            addFavMutation.mutate({ codPac, codDoc: expCodigo });
        }
    }, [codPac, favoritos, addFavMutation, removeFavMutation]);

    const handleShareDoctor = useCallback((doc: DoctorCardData, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setDoctorToShare(doc);
        setIsShareModalOpen(true);
    }, []);
    const [hoveredDoctorId, setHoveredDoctorId] = useState<string | null>(null);
    const rafHoverRef = useRef<number | null>(null);
    const handleDoctorHover = useCallback((docId: string | null) => {
        if (rafHoverRef.current) cancelAnimationFrame(rafHoverRef.current);
        rafHoverRef.current = requestAnimationFrame(() => {
            setHoveredDoctorId(docId);
        });
    }, []);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
    const [selectedClinicIndex, setSelectedClinicIndex] = useState<number | null>(null);
    const [selectedBuilding, setSelectedBuilding] = useState<BuildingLocation | null>(null);
    const handleBuildingSelect = useCallback((bld: BuildingLocation | null) => {
        setSelectedBuilding((prev) => {
            if (prev?.id === bld?.id) return prev;
            return bld;
        });
    }, []);
    const [showMapMobile, setShowMapMobile] = useState(false);
    const [isMobileScreen, setIsMobileScreen] = useState(false);
    const [hasMapEverOpened, setHasMapEverOpened] = useState(true);

    useEffect(() => {
        if (isMapVisible || showMapMobile) {
            setHasMapEverOpened(true);
        }
    }, [isMapVisible, showMapMobile]);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobileScreen(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const selectedBuildingDoctorCodes = useMemo(() => {
        if (!selectedBuilding) return new Set<string>();
        return new Set(selectedBuilding.doctors.map((d) => d.expCodigo));
    }, [selectedBuilding]);

    // Estado para ubicación buscada por Google Places / Geocoding
    const [searchedLocation, setSearchedLocation] = useState<{
        lat: number;
        lng: number;
        address: string;
    } | null>(null);

    const [locationSearchTerm, setLocationSearchTerm] = useState('');
    const [isLocationSearchFocused, setIsLocationSearchFocused] = useState(false);
    const locationSearchRef = useRef<HTMLDivElement | null>(null);

    const [placeSuggestions, setPlaceSuggestions] = useState<{
        place_id: string;
        description: string;
        main_text: string;
        secondary_text?: string;
    }[]>([]);

    const autocompleteServiceRef = useRef<any>(null);
    const geocoderRef = useRef<any>(null);

    // Autocompletar sugerencias de Google Places mientras el usuario escribe en el buscador exclusivo de ubicación
    useEffect(() => {
        const query = locationSearchTerm.trim() || searchTerm.trim();
        if (query.length < 2) {
            setPlaceSuggestions([]);
            return;
        }

        if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
            const maps = (window as any).google.maps;
            if (maps.places && !autocompleteServiceRef.current) {
                autocompleteServiceRef.current = new maps.places.AutocompleteService();
            }
            if (autocompleteServiceRef.current) {
                try {
                    autocompleteServiceRef.current.getPlacePredictions(
                        {
                            input: query,
                            componentRestrictions: { country: 'gt' },
                        },
                        (predictions: any[], status: any) => {
                            if (status === maps.places.PlacesServiceStatus.OK && predictions) {
                                setPlaceSuggestions(
                                    predictions.slice(0, 5).map((p) => ({
                                        place_id: p.place_id,
                                        description: p.description,
                                        main_text: p.structured_formatting?.main_text || p.description,
                                        secondary_text: p.structured_formatting?.secondary_text,
                                    }))
                                );
                            } else {
                                setPlaceSuggestions([]);
                            }
                        }
                    );
                } catch (e) {
                    console.warn('Google Places Autocomplete exception:', e);
                }
            }
        }
    }, [locationSearchTerm, searchTerm]);

    // Seleccionar una sugerencia de Google Places y obtener sus coordenadas exactas (Geocoding)
    const handleSelectPlaceSuggestion = (placeId: string, description: string) => {
        setLocationSearchTerm(description);
        setIsLocationSearchFocused(false);
        setIsSearchFocused(false);

        if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
            const maps = (window as any).google.maps;
            if (!geocoderRef.current) {
                geocoderRef.current = new maps.Geocoder();
            }
            geocoderRef.current.geocode({ placeId }, (results: any[], status: any) => {
                if (status === maps.GeocoderStatus.OK && results && results[0]) {
                    const loc = results[0].geometry.location;
                    setSearchedLocation({
                        lat: loc.lat(),
                        lng: loc.lng(),
                        address: description,
                    });
                    setIsNearMeActive(true);
                    setIsMapVisible(true);
                }
            });
        }
    };

    // Geocodificar término libre en caso de presionar Enter sobre una ubicación
    const handleGeocodeSearchText = (text: string) => {
        if (!text.trim()) return;
        setLocationSearchTerm(text);
        setIsLocationSearchFocused(false);
        setIsSearchFocused(false);

        if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
            const maps = (window as any).google.maps;
            if (!geocoderRef.current) {
                geocoderRef.current = new maps.Geocoder();
            }
            geocoderRef.current.geocode(
                { address: `${text}, Guatemala`, componentRestrictions: { country: 'gt' } },
                (results: any[], status: any) => {
                    if (status === maps.GeocoderStatus.OK && results && results[0]) {
                        const loc = results[0].geometry.location;
                        setSearchedLocation({
                            lat: loc.lat(),
                            lng: loc.lng(),
                            address: results[0].formatted_address || text,
                        });
                        setIsNearMeActive(true);
                        setIsMapVisible(true);
                    }
                }
            );
        }
    };

    // Ubicación efectiva (ubicación buscada por Places/Geocoding o GPS del usuario)
    const effectiveLocation = useMemo(() => {
        if (searchedLocation) {
            return { lat: searchedLocation.lat, lng: searchedLocation.lng };
        }
        if (isNearMeActive && userLocation) {
            return userLocation;
        }
        return userLocation || null;
    }, [searchedLocation, isNearMeActive, userLocation]);

    // Función para calcular distancia de clínicas a la ubicación efectiva
    const getDistanceToDoctorCustom = useCallback(
        (clinicas: DoctorClinica[]): { distanceKm: number | null; formatted: string | null } => {
            if (!effectiveLocation || !clinicas || clinicas.length === 0) {
                return { distanceKm: null, formatted: null };
            }

            let minDistance = Infinity;

            for (const c of clinicas) {
                if (typeof c.cli_latitud === 'number' && typeof c.cli_longitud === 'number' && !isNaN(c.cli_latitud) && !isNaN(c.cli_longitud)) {
                    const R = 6371; // Radio de la tierra en km
                    const dLat = (c.cli_latitud - effectiveLocation.lat) * (Math.PI / 180);
                    const dLon = (c.cli_longitud - effectiveLocation.lng) * (Math.PI / 180);
                    const a =
                        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(effectiveLocation.lat * (Math.PI / 180)) *
                        Math.cos(c.cli_latitud * (Math.PI / 180)) *
                        Math.sin(dLon / 2) *
                        Math.sin(dLon / 2);
                    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                    if (dist < minDistance) {
                        minDistance = dist;
                    }
                }
            }

            if (minDistance === Infinity) {
                return { distanceKm: null, formatted: null };
            }

            const formatted = minDistance < 1
                ? `A ${Math.round(minDistance * 1000)} m`
                : `A ${minDistance.toFixed(1)} km`;

            return { distanceKm: minDistance, formatted };
        },
        [effectiveLocation]
    );

    const doctorListContainerRef = useRef<HTMLDivElement | null>(null);

    const scrollToDoctorTop = useCallback((docId?: string) => {
        if (!docId) return;
        setTimeout(() => {
            const container = doctorListContainerRef.current;
            const target = document.getElementById(`doctor-card-${docId}`);
            if (container && target) {
                const containerRect = container.getBoundingClientRect();
                const targetRect = target.getBoundingClientRect();
                const scrollOffset = container.scrollTop + (targetRect.top - containerRect.top) - 10;
                container.scrollTo({
                    top: Math.max(0, scrollOffset),
                    behavior: 'smooth',
                });
            }
        }, 70);
    }, []);

    const handleDoctorVisit = useCallback((cardData: DoctorCardData) => {
        const item: RecentDoctorItem = {
            exp_codigo: cardData.doctor.exp_codigo,
            fullName: cardData.fullName,
            specialty: cardData.doctor.exp_profesion || 'Especialidad médica',
            locationLabel: [cardData.doctor.pais_nacimiento, cardData.doctor.nacionalidad].filter(Boolean).join(' · ') || 'Ubicación no registrada',
            image: cardData.doctor.exp_foto_perfil,
            visitedAt: new Date().toISOString(),
        };
        setRecentDoctors(addRecentDoctor(item));
    }, []);

    const handleDoctorCardSelect = useCallback((data: DoctorCardData) => {
        setSelectedDoctorId(data.doctor.exp_codigo);
        
        const hasClinicas = (data.doctor.clinicas && data.doctor.clinicas.length > 0);
        const hasDomicilio = (data.doctor.atencion_domicilio && data.doctor.atencion_domicilio.length > 0);
        const isDomicilioActive = modality === 'domicilio';
        const defaultClinicIndex = (isDomicilioActive && hasDomicilio) ? -1 : (hasClinicas ? 0 : (hasDomicilio ? -1 : 0));
        setSelectedClinicIndex(defaultClinicIndex);

        if (!userLocation) {
            requestLocation();
        }

        // Mantener siempre el mapa en el panel principal para ver los punteros de las ubicaciones del médico
        setMainPanelView('map');

        handleDoctorVisit(data);

        // Desplaza su información suavemente al inicio de la lista
        scrollToDoctorTop(data.doctor.exp_codigo);
    }, [modality, userLocation, requestLocation, handleDoctorVisit, scrollToDoctorTop]);

    const handleCloseSelectedDoctor = useCallback(() => {
        setSelectedDoctorId(null);
        setSelectedBuilding(null);
        setSelectedClinicIndex(null);
        setMainPanelView('map');
    }, []);

    const handleDoctorSelectFromMap = (expCodigo: string, clinicIndex?: number | null) => {
        if (!expCodigo) {
            setSelectedDoctorId(null);
            setSelectedClinicIndex(null);
            return;
        }
        if (!userLocation) {
            requestLocation();
        }
        const docMatch = resolvedDoctors.find(d => d.doctor.exp_codigo === expCodigo);
        if (docMatch) {
            handleDoctorVisit(docMatch);
        }
        setSelectedDoctorId(expCodigo);
        setSelectedClinicIndex(typeof clinicIndex === 'number' ? clinicIndex : null);
        if (!isMapVisible) setIsMapVisible(true);
        if (currentPage !== 1) setCurrentPage(1);
        scrollToDoctorTop(expCodigo);
    };

    const handleNavigateToProfile = (expCodigo: string) => {
        const docMatch = resolvedDoctors.find(d => d.doctor.exp_codigo === expCodigo);
        if (docMatch) handleDoctorVisit(docMatch);
        router.push(`/dashboard/${expCodigo}`);
    };

    const activeFilterCount = useMemo(() => {
        return [
            Boolean(availability),
            modality !== 'all',
            priceLimit < PRICE_LIMIT_MAX,
            selectedLanguages.length > 0,
            selectedInsurances.length > 0,
            specialtyParam !== 'all',
            gender !== 'all',
        ].filter(Boolean).length;
    }, [availability, modality, priceLimit, selectedLanguages, selectedInsurances, specialtyParam, gender]);

    const consolidatedFiltersCount = useMemo(() => {
        let count = 0;
        if (availability) count++;
        if (priceLimit < PRICE_LIMIT_MAX) count++;
        if (selectedInsurances.length > 0) count++;
        if (selectedLanguages.length > 0) count++;
        if (gender !== 'all') count++;
        if (sortBy !== 'default') count++;
        return count;
    }, [availability, priceLimit, selectedInsurances, selectedLanguages, gender, sortBy]);

    const modalityLabel = useMemo(() => {
        if (!modality || modality === 'all') return 'Todas';
        if (modality === 'presencial') return 'Presencial';
        if (modality === 'virtual') return 'Virtual';
        if (modality === 'domicilio') return 'A domicilio';
        return modality;
    }, [modality]);

    const handleClearConsolidatedFilters = () => {
        setAvailability('');
        setPriceLimit(PRICE_LIMIT_MAX);
        setLocalPriceLimit(PRICE_LIMIT_MAX);
        setSelectedInsurances([]);
        setSelectedLanguages([]);
        setGender('all');
        setSortBy('default');
    };
    
    const deferredSearchTerm = useDeferredValue(searchTerm);

    const hasActiveFilters = 
        searchTags.length > 0 || 
        searchTerm !== '' || 
        sortBy !== 'default' || 
        selectedLanguages.length > 0 || 
        selectedInsurances.length > 0 || 
        priceLimit !== PRICE_LIMIT_MAX || 
        modality !== 'all' || 
        specialtyParam !== 'all' || 
        availability !== '' || 
        gender !== 'all' ||
        showOnlyFavorites ||
        showOnlyActive ||
        isNearMeActive ||
        searchedLocation !== null;

    const handleClearAllFilters = () => {
        // 1. Resetear estados locales de React (no persistidos en la URL)
        setSearchTerm('');
        setSearchTags([]);
        setSelectedLanguages([]);
        setSelectedInsurances([]);
        setLocalPriceLimit(PRICE_LIMIT_MAX);
        setSpecialtySearch('');
        setLocationSearchTerm('');
        setSearchedLocation(null);
        setIsNearMeActive(false);
        setRadarRadiusKm(10);
        setSelectedDoctorId(null);
        setSelectedClinicIndex(0);
        setTargetPage(null);
        setActivePopover(null);
        setGender('all');
        setModality('all');
        setAvailability('');
        setSpecialtyParam('all');
        setLocationTerm('');
        setSortBy('default');
        setShowOnlyActive(false);
        setShowOnlyFavorites(false);
        setPriceLimit(PRICE_LIMIT_MAX);

        // 2. Limpiar todos los parámetros de la URL en una sola navegación limpia y reordenar aleatoriamente
        const newSeed = Math.floor(Math.random() * 10000000) + 1;
        setSessionSeed(newSeed);
        try {
            sessionStorage.setItem('neoclinica_random_seed', newSeed.toString());
        } catch {}
        resetParams();
    };

    const sortMenuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (searchMenuRef.current && !searchMenuRef.current.contains(target)) {
                setIsSearchFocused(false);
            }
            if (locationSearchRef.current && !locationSearchRef.current.contains(target)) {
                setIsLocationSearchFocused(false);
            }
            if (modalityMenuRef.current && !modalityMenuRef.current.contains(target)) {
                setIsModalityMenuOpen(false);
            }
            if (sortMenuRef.current && !sortMenuRef.current.contains(target)) {
                setIsSortMenuOpen(false);
            }
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(target) && !filterButtonRef.current?.contains(target)) {
                setIsFiltersModalOpen(false);
            }
            if (popoverRef.current && !popoverRef.current.contains(target)) {
                setActivePopover(null);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsSearchFocused(false);
                setIsLocationSearchFocused(false);
                setIsModalityMenuOpen(false);
                setIsFiltersModalOpen(false);
                closeFilters();
                setIsSortMenuOpen(false);
                setActivePopover(null);
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
        const handleRecentUpdate = () => {
            const stored = readRecentDoctors();
            if (stored.length > 0) {
                setRecentDoctors(stored);
            }
        };
        window.addEventListener(RECENT_DOCTORS_EVENT, handleRecentUpdate);
        window.addEventListener('focus', handleRecentUpdate);
        return () => {
            window.removeEventListener(RECENT_DOCTORS_EVENT, handleRecentUpdate);
            window.removeEventListener('focus', handleRecentUpdate);
        };
    }, []);

    const resolvedDoctors = useMemo(
        () => doctors.map((doctor) => resolveDoctor(doctor)).sort((a, b) => a.fullName.localeCompare(b.fullName, 'es')),
        [doctors],
    );

    const hasInitializedRecentRef = useRef(false);

    useEffect(() => {
        if (hasInitializedRecentRef.current) return;

        const stored = readRecentDoctors();
        if (stored.length > 0) {
            setRecentDoctors(stored);
            hasInitializedRecentRef.current = true;
        } else if (resolvedDoctors.length > 0) {
            const initialPicks: RecentDoctorItem[] = resolvedDoctors.slice(0, 3).map(doc => ({
                exp_codigo: doc.doctor.exp_codigo,
                fullName: doc.fullName,
                specialty: doc.specialtyPreview[0] || doc.specialty || 'Especialidad médica',
                locationLabel: doc.locationPreview[0] || doc.locationLabel || 'Guatemala',
                image: doc.doctor.exp_foto_perfil,
                visitedAt: new Date().toISOString(),
            }));
            setRecentDoctors(initialPicks);
            hasInitializedRecentRef.current = true;
        }
    }, [resolvedDoctors]);

    const visibleDoctors = useMemo(() => {
        const activeTags = [
            ...searchTags,
            ...(deferredSearchTerm.trim() ? deferredSearchTerm.trim().split(/\s+/) : []),
        ].filter(Boolean);
        const effectiveLocationQuery = locationSearchTerm.trim() || locationTerm.trim();
        const normalizedLocation = normalizeText(effectiveLocationQuery);

        const filteredDoctors = resolvedDoctors.map((doctor) => {
            let isMatch = true;
            let matchedSpecialty: string | undefined = undefined;
            let matchedLocation: string | undefined = undefined;

            for (const tag of activeTags) {
                const homs = getNormalizedHomologues(tag);
                const isBroadMatch = homs.some(h => doctor.searchIndex.includes(h));
                
                if (!isBroadMatch) {
                    isMatch = false;
                    break;
                }

                const specMatch = doctor.doctor.especialidades.find(
                    (s) => homs.some(h => normalizeText(s.especialidad).includes(h))
                );
                if (specMatch) {
                    matchedSpecialty = specMatch.especialidad;
                }

                const locMatch = doctor.locationPreview.find(
                    (l) => homs.some(h => normalizeText(l).includes(h))
                );
                if (locMatch) {
                    matchedLocation = locMatch;
                }
            }

            if (!isMatch) return null;

            const matchesLocation = !normalizedLocation
                || normalizeText(doctor.locationLabel).includes(normalizedLocation)
                || doctor.locationPreview.some(loc => normalizeText(loc).includes(normalizedLocation));
            const matchesActive = !showOnlyActive || isDoctorActive(doctor.doctor);
            const isFavorite = favoritos.some(f => f.expCodigo === doctor.doctor.exp_codigo);
            if (showOnlyFavorites && !isFavorite) return null;
            
            const doctorModalities = doctor.doctor.modalidades.map((item) => normalizeText(item.modalidad));
            if (doctor.doctor.atencion_domicilio && doctor.doctor.atencion_domicilio.length > 0) {
                doctorModalities.push('domicilio');
            }
            let matchesModality = true;
            if (!activeModalities.includes('all')) {
                matchesModality = activeModalities.some(m => {
                    if (m === 'virtual') return doctorModalities.some((item) => item.includes('telemedicina') || item.includes('virtual'));
                    if (m === 'presencial') return doctorModalities.some((item) => item.includes('presencial')) || (doctor.doctor.clinicas && doctor.doctor.clinicas.length > 0);
                    if (m === 'hybrid') return (doctorModalities.some((item) => item.includes('telemedicina') || item.includes('virtual'))) && (doctorModalities.some((item) => item.includes('presencial')) || (doctor.doctor.clinicas && doctor.doctor.clinicas.length > 0));
                    if (m === 'domicilio') return doctorModalities.some((item) => item.includes('domicilio'));
                    return true;
                });
            }
            
            let matchesAvailability = true;
            if (availability) {
                const selectedDate = new Date(availability + 'T00:00:00');
                const jsDay = selectedDate.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
                const isoDay = jsDay === 0 ? 7 : jsDay; // 1=Lun, ..., 7=Dom
                const allDoctorHorarios = doctor.doctor.clinicas.flatMap(c => c.horarios_atencion || []);
                if (allDoctorHorarios.length > 0) {
                    matchesAvailability = allDoctorHorarios.some(h => h.hor_dia_semana === jsDay || h.hor_dia_semana === isoDay);
                }
            }
            
            const matchesPrice = matchesPriceLimit(getDoctorPricePoints(doctor.doctor), priceLimit);

            const matchesSpecialtyParam = activeSpecialties.includes('all') || activeSpecialties.some(activeSpec => {
                const homs = getNormalizedHomologues(activeSpec);
                return doctor.specialtyPreview.some(s => homs.some(h => normalizeText(s).includes(h)));
            });
            
            const matchesLanguages = selectedLanguages.length === 0 || selectedLanguages.some(lang => doctor.languagePreview?.includes(lang));
            const matchesInsurances = selectedInsurances.length === 0 || selectedInsurances.some(ins => doctor.doctor.aseguradoras?.some(a => a.aseguradora === ins));

            // Filtro de Radar configurable (en Km) si "Cerca de ti" o una ubicación buscada está activa
            let matchesRadar = true;
            if (isNearMeActive || searchedLocation) {
                const distInfo = getDistanceToDoctorCustom(doctor.doctor.clinicas);
                if (distInfo.distanceKm !== null && distInfo.distanceKm > radarRadiusKm) {
                    matchesRadar = false;
                }
            }

            // Filtro de Sexo / Género del Doctor
            const matchesGender = gender === 'all' || (doctor.doctor.exp_sexo || '').toUpperCase() === gender.toUpperCase();

            if (!(matchesLocation && matchesActive && matchesModality && matchesAvailability && matchesPrice && matchesSpecialtyParam && matchesLanguages && matchesInsurances && matchesRadar && matchesGender)) {
                return null;
            }

            return {
                doctor: doctor.doctor,
                fullName: doctor.fullName,
                specialtyPreview: doctor.specialtyPreview,
                modalityPreview: doctor.modalityPreview,
                locationPreview: doctor.locationPreview,
                languagePreview: doctor.languagePreview,
                insurancePreview: doctor.insurancePreview,
                matchedSpecialty,
                matchedLocation,
                searchHighlight: [...searchTags, deferredSearchTerm.trim()].filter(Boolean),
                selectedInsurances,
            };
        }).filter(Boolean) as (typeof resolvedDoctors[0] & { matchedSpecialty?: string; matchedLocation?: string; searchHighlight?: string[]; selectedInsurances?: string[] })[];

        return filteredDoctors.sort((leftDoctor, rightDoctor) => {
            if (sortBy === 'name-asc') {
                return leftDoctor.fullName.localeCompare(rightDoctor.fullName, 'es');
            }
            if (sortBy === 'name-desc') {
                return rightDoctor.fullName.localeCompare(leftDoctor.fullName, 'es');
            }
            if (sortBy === 'rating-desc') {
                const diffRating = (rightDoctor.doctor.promedio_valoracion || 0) - (leftDoctor.doctor.promedio_valoracion || 0);
                if (Math.abs(diffRating) > 0.01) return diffRating;
                return (rightDoctor.doctor.total_resenas || 0) - (leftDoctor.doctor.total_resenas || 0);
            }
            if (sortBy === 'price-asc') {
                const minPriceL = Math.min(...getDoctorPricePoints(leftDoctor.doctor)) || Infinity;
                const minPriceR = Math.min(...getDoctorPricePoints(rightDoctor.doctor)) || Infinity;
                return minPriceL - minPriceR;
            }

            if (isNearMeActive || searchedLocation || sortBy === 'distance') {
                const distL = getDistanceToDoctorCustom(leftDoctor.doctor.clinicas).distanceKm ?? Infinity;
                const distR = getDistanceToDoctorCustom(rightDoctor.doctor.clinicas).distanceKm ?? Infinity;
                return distL - distR;
            }

            // Por defecto: Presentación aleatoria (única y diferente en cada inicio de sesión)
            return getDoctorHash(leftDoctor.doctor.exp_codigo, sessionSeed) - getDoctorHash(rightDoctor.doctor.exp_codigo, sessionSeed);
        });
    }, [locationTerm, locationSearchTerm, activeModalities, availability, priceLimit, resolvedDoctors, deferredSearchTerm, showOnlyActive, showOnlyFavorites, favoritos, sortBy, activeSpecialties, searchTags, selectedLanguages, selectedInsurances, isNearMeActive, searchedLocation, getDistanceToDoctorCustom, sessionSeed, gender, radarRadiusKm]);


    const catalogLocationSuggestions = useMemo(() => {
        const query = normalizeText(locationSearchTerm.trim());
        if (!query) return [];

        const set = new Map<string, string>();
        resolvedDoctors.forEach((doc) => {
            doc.locationPreview.forEach((loc) => {
                if (normalizeText(loc).includes(query)) {
                    set.set(loc, loc);
                }
            });
            if (doc.doctor.pais_nacimiento && normalizeText(doc.doctor.pais_nacimiento).includes(query)) {
                set.set(doc.doctor.pais_nacimiento, doc.doctor.pais_nacimiento);
            }
        });

        const commonZones = [
            'Zona 1, Ciudad de Guatemala',
            'Zona 4, Ciudad de Guatemala',
            'Zona 9, Ciudad de Guatemala',
            'Zona 10, Ciudad de Guatemala',
            'Zona 13, Ciudad de Guatemala',
            'Zona 14, Ciudad de Guatemala',
            'Zona 15, Ciudad de Guatemala',
            'Carretera a El Salvador, Guatemala',
            'Paseo Cayalá, Zona 16, Guatemala',
            'San Cristóbal, Mixco',
            'Antigua Guatemala, Sacatepéquez',
            'Quetzaltenango, Guatemala',
        ];

        commonZones.forEach((cz) => {
            if (normalizeText(cz).includes(query)) {
                set.set(cz, cz);
            }
        });

        return Array.from(set.values()).slice(0, 5);
    }, [locationSearchTerm, resolvedDoctors]);

    const searchSuggestions = useMemo(() => {
        const query = searchTerm.trim();
        const normalizedQuery = normalizeText(query);
        
        if (!normalizedQuery) {
            return [];
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
    }, [searchTerm, resolvedDoctors, searchTags]);

    const gridContainerRef = useRef<HTMLDivElement | null>(null);
    const cardsScrollContainerRef = useRef<HTMLDivElement | null>(null);

    // En Split View, la lista lateral compacta utiliza 10 médicos por página para una navegación ágil
    const itemsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(visibleDoctors.length / itemsPerPage));
    const currentPageForView = Math.min(currentPage, totalPages);
    const paginatedDoctors = useMemo(
        () => visibleDoctors.slice((currentPageForView - 1) * itemsPerPage, currentPageForView * itemsPerPage),
        [currentPageForView, visibleDoctors, itemsPerPage],
    );

    // Si hay un médico seleccionado, se separa para mostrarse al inicio en su propia fila completa
    const selectedDoctorCard = useMemo(() => {
        if (!selectedDoctorId) return null;
        const found = visibleDoctors.find((d) => d.doctor.exp_codigo === selectedDoctorId);
        if (found) return found;
        const res = resolvedDoctors.find((d) => d.doctor.exp_codigo === selectedDoctorId);
        return res ? { ...res, selectedInsurances } : null;
    }, [selectedDoctorId, visibleDoctors, resolvedDoctors, selectedInsurances]);

    // Filtrar médicos en el mapa: cuando se selecciona un médico, el mapa se enfoca exclusivamente en sus sedes/ubicaciones
    const mapDoctors = useMemo(() => {
        if (selectedDoctorId && selectedDoctorCard) {
            return [selectedDoctorCard];
        }
        return visibleDoctors.length > 0 ? visibleDoctors : paginatedDoctors;
    }, [selectedDoctorId, selectedDoctorCard, visibleDoctors, paginatedDoctors]);

    // Cuando se selecciona/expande una card, se pasa al inicio de la lista de médicos para máxima visibilidad
    const orderedDoctors = useMemo(() => {
        if (!selectedDoctorId) return paginatedDoctors;
        const selectedDoc = paginatedDoctors.find((d) => d.doctor.exp_codigo === selectedDoctorId)
            || visibleDoctors.find((d) => d.doctor.exp_codigo === selectedDoctorId)
            || selectedDoctorCard;

        if (!selectedDoc) return paginatedDoctors;

        const rest = paginatedDoctors.filter((d) => d.doctor.exp_codigo !== selectedDoctorId);
        return [selectedDoc, ...rest];
    }, [selectedDoctorId, paginatedDoctors, visibleDoctors, selectedDoctorCard]);

    const doctorsForGrid = useMemo(() => {
        if (!selectedDoctorId) return paginatedDoctors;
        return paginatedDoctors.filter((d) => d.doctor.exp_codigo !== selectedDoctorId);
    }, [selectedDoctorId, paginatedDoctors]);

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
    const insurancePicks = useMemo(() => {
        const map = new Map<string, { aseguradora: string; imagen: string | null }>();
        for (const doc of resolvedDoctors) {
            for (const asg of doc.doctor.aseguradoras || []) {
                if (asg.aseguradora) {
                    const existing = map.get(asg.aseguradora);
                    if (!existing || (!existing.imagen && asg.imagen)) {
                        map.set(asg.aseguradora, { aseguradora: asg.aseguradora, imagen: asg.imagen || null });
                    }
                }
            }
        }
        return Array.from(map.values()).sort((a, b) => a.aseguradora.localeCompare(b.aseguradora, 'es'));
    }, [resolvedDoctors]);

    const toggleSpecialty = (id: string) => {
        if (id === 'all') {
            setSpecialtyParam('all');
            setSearchTags(prev => prev.filter(tag => !specialtyPicks.includes(tag)));
        } else {
            let next = activeSpecialties.filter(s => s !== 'all');
            if (next.includes(id)) {
                next = next.filter(s => s !== id);
                setSearchTags(prev => prev.filter(tag => tag !== id));
            } else {
                next.push(id);
                setSearchTags(prev => [...prev, id]);
            }
            setSpecialtyParam(next.length === 0 ? 'all' : next.join(','));
        }
    };

    if (status === 'loading' || (status === 'authenticated' && isLoading)) {
        return <NeoLoader />;
    }

    return (
        <main className="min-h-screen text-slate-900 pb-16">
            <div className="mx-auto w-[92%] 2xl:w-[94%] max-w-[2400px] mt-2 flex flex-col gap-2">
                {/* VISTA DIVIDIDA (SPLIT VIEW): Panel Lateral (Lista Compacta) + Panel Principal (Mapa / Detalles) */}
                <div className="w-full mb-6">
                    {error ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
                            No fue posible cargar la lista de médicos.
                        </div>
                    ) : null}

                    {/* ─── FILA GLOBAL: PÍLDORA DE FILTROS CENTRADA CON ANCHO ÓPTIMO ─── */}
                    <div className={`w-full max-w-4xl xl:max-w-5xl mx-auto mt-4 mb-4 relative transition-all ${
                        isSearchFocused || isLocationSearchFocused || isModalityMenuOpen || isFiltersModalOpen ? 'z-[600]' : 'z-30'
                    }`}>
                        {/* Píldora Triple estilo Airbnb integrada en el header del mapa */}
                                    <div className="w-full flex items-center justify-between gap-2 relative">
                                        <div className="w-full h-13 sm:h-14 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-full shadow-2xs hover:shadow-xs transition-all flex items-center px-4 sm:px-5 relative z-40">
                                            {/* Segmento 1: Especialista (flex-1 para distribución proporcional) */}
                                            <div ref={searchMenuRef} className="flex-1 h-full pr-3 sm:pr-4 flex flex-col justify-center relative min-w-0">
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 leading-none mb-0.5 select-none truncate">
                                                    Especialista
                                                </span>
                                                <div className="flex items-center gap-1.5 w-full min-w-0">
                                                    {searchTags.length > 0 && (
                                                        <div className="flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar max-w-[40%]">
                                                            {searchTags.map((tag, idx) => (
                                                                <span key={idx} className="inline-flex items-center gap-1 h-5 rounded-md bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 px-1.5 text-[10px] font-bold whitespace-nowrap">
                                                                    {tag}
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => {
                                                                            const tagToRemove = tag;
                                                                            setSearchTags(tags => tags.filter((_, i) => i !== idx));
                                                                            if (specialtyPicks.includes(tagToRemove)) {
                                                                                let next = activeSpecialties.filter(s => s !== 'all' && s !== tagToRemove);
                                                                                setSpecialtyParam(next.length === 0 ? 'all' : next.join(','));
                                                                            }
                                                                        }}
                                                                        className="hover:bg-sky-200 dark:hover:bg-sky-800 rounded-full p-0.5"
                                                                    >
                                                                        <X className="h-2.5 w-2.5" />
                                                                    </button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <input
                                                        id="searchTerm"
                                                        name="doctor-search-input"
                                                        type="text"
                                                        autoComplete="off"
                                                        autoCorrect="off"
                                                        autoCapitalize="off"
                                                        spellCheck={false}
                                                        role="combobox"
                                                        aria-autocomplete="list"
                                                        aria-expanded={isSearchFocused}
                                                        data-lpignore="true"
                                                        data-1p-ignore="true"
                                                        value={searchTerm}
                                                        onClick={() => {
                                                            setRecentDoctors(readRecentDoctors());
                                                            setIsSearchFocused(true);
                                                        }}
                                                        onFocus={() => {
                                                            setRecentDoctors(readRecentDoctors());
                                                            setIsSearchFocused(true);
                                                        }}
                                                        onChange={(event) => {
                                                            setSearchTerm(event.target.value);
                                                            setIsSearchFocused(true);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && searchTerm.trim()) {
                                                                e.preventDefault();
                                                                const term = searchTerm.trim();
                                                                if (!searchTags.includes(term)) {
                                                                    setSearchTags(prev => [...prev, term]);
                                                                    if (specialtyPicks.includes(term)) {
                                                                        let next = activeSpecialties.filter(s => s !== 'all');
                                                                        if (!next.includes(term)) next.push(term);
                                                                        setSpecialtyParam(next.join(','));
                                                                    }
                                                                }
                                                                setSearchTerm('');
                                                            } else if (e.key === 'Backspace' && !searchTerm && searchTags.length > 0) {
                                                                const tagToRemove = searchTags[searchTags.length - 1];
                                                                setSearchTags(prev => prev.slice(0, -1));
                                                                if (specialtyPicks.includes(tagToRemove)) {
                                                                    let next = activeSpecialties.filter(s => s !== 'all' && s !== tagToRemove);
                                                                    setSpecialtyParam(next.length === 0 ? 'all' : next.join(','));
                                                                }
                                                            }
                                                        }}
                                                        placeholder={searchTags.length === 0 ? "Nombre o especialidad..." : "Añadir..."}
                                                        className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent outline-none flex-1 min-w-0 truncate leading-tight"
                                                    />

                                                    {(searchTerm || searchTags.length > 0 || specialtyParam !== 'all') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSearchTerm('');
                                                                setSearchTags([]);
                                                                setSpecialtyParam('all');
                                                                setIsSearchFocused(true);
                                                            }}
                                                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Dropdown de Sugerencias de Médicos */}
                                                {isSearchFocused && (
                                                    <div className="absolute left-0 top-[calc(100%+8px)] z-[800] w-[400px] sm:w-[460px] max-w-[90vw] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_25px_60px_rgba(0,0,0,0.25)] text-slate-900 dark:text-slate-100">
                                                        {!searchTerm.trim() ? (
                                                            <div className="p-3 space-y-4 max-h-[360px] overflow-y-auto">
                                                                <div>
                                                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-1 flex items-center gap-1.5">
                                                                        <Users className="w-3.5 h-3.5 text-sky-600" /> Médicos Vistos Recientemente
                                                                    </p>
                                                                    {recentDoctors.length > 0 ? (
                                                                        <div className="mt-1 space-y-1">
                                                                            {recentDoctors.map((doc) => (
                                                                                <button
                                                                                    key={doc.exp_codigo}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        handleDoctorVisit({
                                                                                            doctor: resolvedDoctors.find(d => d.doctor.exp_codigo === doc.exp_codigo)?.doctor || ({} as any),
                                                                                            fullName: doc.fullName,
                                                                                            specialtyPreview: [doc.specialty],
                                                                                            modalityPreview: [],
                                                                                            locationPreview: [doc.locationLabel],
                                                                                        });
                                                                                        router.push(`/dashboard/${doc.exp_codigo}`);
                                                                                        setIsSearchFocused(false);
                                                                                    }}
                                                                                    className="flex w-full items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left group"
                                                                                >
                                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                                        <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden relative border border-slate-200">
                                                                                            {doc.image ? (
                                                                                                <Image src={doc.image} alt={doc.fullName} fill sizes="36px" className="object-cover" />
                                                                                            ) : (
                                                                                                doc.fullName.charAt(0)
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="min-w-0">
                                                                                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate group-hover:text-sky-600 transition-colors">{doc.fullName}</p>
                                                                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{doc.specialty} · {doc.locationLabel}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="mx-3 my-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                                                            <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                                                                                <Users className="w-4 h-4 text-sky-600" />
                                                                            </div>
                                                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                                                                Tus perfiles de médicos visitados aparecerán aquí automáticamente al hacer clic en un médico.
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {specialtyPicks.length > 0 && (
                                                                    <div>
                                                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-1">
                                                                            Especialidades Populares
                                                                        </p>
                                                                        <div className="mt-1 flex flex-wrap gap-1.5 px-3">
                                                                            {specialtyPicks.slice(0, 8).map((spec) => (
                                                                                <button
                                                                                    key={spec}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        if (!searchTags.includes(spec)) {
                                                                                            setSearchTags(prev => [...prev, spec]);
                                                                                            let next = activeSpecialties.filter(s => s !== 'all');
                                                                                            if (!next.includes(spec)) next.push(spec);
                                                                                            setSpecialtyParam(next.join(','));
                                                                                        }
                                                                                        setIsSearchFocused(false);
                                                                                    }}
                                                                                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-600 transition"
                                                                                >
                                                                                    {spec}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="p-2 max-h-[360px] overflow-y-auto space-y-1">
                                                                {searchSuggestions.map((item, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (item.type === 'specialty') {
                                                                                if (!searchTags.includes(item.label)) {
                                                                                    setSearchTags(prev => [...prev, item.label]);
                                                                                    let next = activeSpecialties.filter(s => s !== 'all');
                                                                                    if (!next.includes(item.label)) next.push(item.label);
                                                                                    setSpecialtyParam(next.join(','));
                                                                                }
                                                                            } else if (item.type === 'doctor') {
                                                                                setSearchTerm(item.label);
                                                                            } else {
                                                                                setLocationTerm(item.label);
                                                                            }
                                                                            setIsSearchFocused(false);
                                                                        }}
                                                                        className="flex w-full items-center justify-between px-3 py-2 rounded-xl hover:bg-sky-50 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                                                                    >
                                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                                            <Search className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                                                            <div className="truncate">
                                                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{item.label}</p>
                                                                                {item.sublabel && (
                                                                                    <p className="text-[10px] text-slate-500 truncate">{item.sublabel}</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <span className="text-[10px] font-bold text-slate-400 capitalize">{item.type}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Línea divisoria simétrica 1 */}
                                            <div className="w-px h-6 sm:h-7 bg-slate-200 dark:bg-slate-800 shrink-0 self-center" aria-hidden="true" />

                                            {/* Segmento 2: Ubicación (flex-1 proporcional a especialista) */}
                                            <div ref={locationSearchRef} className="flex-1 h-full px-3 sm:px-4 py-1 flex items-center justify-between relative min-w-0">
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 leading-none mb-0.5 select-none truncate">
                                                        Ubicación
                                                    </span>
                                                    <input
                                                        id="locationSearch"
                                                        name="location-search-input"
                                                        type="text"
                                                        autoComplete="off"
                                                        autoCorrect="off"
                                                        autoCapitalize="off"
                                                        spellCheck={false}
                                                        role="combobox"
                                                        aria-autocomplete="list"
                                                        aria-expanded={isLocationSearchFocused}
                                                        data-lpignore="true"
                                                        data-1p-ignore="true"
                                                        value={locationSearchTerm}
                                                        onClick={() => setIsLocationSearchFocused(true)}
                                                        onFocus={() => setIsLocationSearchFocused(true)}
                                                        onChange={(e) => {
                                                            setLocationSearchTerm(e.target.value);
                                                            setIsLocationSearchFocused(true);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && locationSearchTerm.trim()) {
                                                                e.preventDefault();
                                                                handleGeocodeSearchText(locationSearchTerm.trim());
                                                            }
                                                        }}
                                                        placeholder="Zona, clínica o dirección..."
                                                        className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent outline-none w-full truncate leading-tight"
                                                    />
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    {(locationSearchTerm || searchedLocation) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setLocationSearchTerm('');
                                                                setSearchedLocation(null);
                                                                setIsNearMeActive(false);
                                                                setIsLocationSearchFocused(false);
                                                            }}
                                                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-500 transition"
                                                        >
                                                            <X className="h-3.5 w-3.5 text-rose-500" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Dropdown de Sugerencias de Ubicación */}
                                                {isLocationSearchFocused && (
                                                    <div className="absolute left-0 top-[calc(100%+8px)] z-[800] w-[360px] sm:w-[420px] max-w-[90vw] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_25px_60px_rgba(0,0,0,0.25)] text-slate-900 dark:text-slate-100 p-3 space-y-3 max-h-[360px] overflow-y-auto">
                                                        <p className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 px-3 py-1 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800">
                                                            <MapPin className="w-3.5 h-3.5 text-sky-600" /> Lugares y Direcciones (Guatemala)
                                                        </p>

                                                        {/* Sugerencias de Google Places API */}
                                                        {placeSuggestions.length > 0 && (
                                                            <div className="space-y-0.5">
                                                                {placeSuggestions.map((place) => (
                                                                    <button
                                                                        key={place.place_id}
                                                                        type="button"
                                                                        onClick={() => handleSelectPlaceSuggestion(place.place_id, place.description)}
                                                                        className="flex w-full items-center justify-between px-3 py-2 rounded-xl hover:bg-sky-50 dark:hover:bg-slate-800 transition text-left group cursor-pointer"
                                                                    >
                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                            <div className="w-7 h-7 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
                                                                                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight group-hover:text-sky-600 transition-colors">
                                                                                    {place.main_text}
                                                                                </p>
                                                                                {place.secondary_text && (
                                                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{place.secondary_text}</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <span className="text-[9px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800 shrink-0">
                                                                            Ubicar
                                                                        </span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Sugerencias del Catálogo de Clínicas */}
                                                        {catalogLocationSuggestions.length > 0 && (
                                                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
                                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                                                                    Zonas y Sedes Populares
                                                                </p>
                                                                {catalogLocationSuggestions.map((loc, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        type="button"
                                                                        onClick={() => handleGeocodeSearchText(loc)}
                                                                        className="flex w-full items-center justify-between px-3 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left group cursor-pointer"
                                                                    >
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{loc}</span>
                                                                        </div>
                                                                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Línea divisoria simétrica 2 */}
                                            <div className="w-px h-6 sm:h-7 bg-slate-200 dark:bg-slate-800 shrink-0 self-center" aria-hidden="true" />

                                            {/* Segmento 3: Modalidad (ancho fijo menor) */}
                                            <div ref={modalityMenuRef} className="w-28 sm:w-32 lg:w-36 shrink-0 h-full px-3 sm:px-4 flex flex-col justify-center relative min-w-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsModalityMenuOpen(!isModalityMenuOpen)}
                                                    className="w-full flex flex-col justify-center text-left min-w-0 cursor-pointer group pr-1"
                                                >
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 leading-none mb-0.5 select-none truncate">
                                                        Modalidad
                                                    </span>
                                                    <div className="flex items-center gap-1 min-w-0">
                                                        <span className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 truncate leading-tight font-normal">
                                                            {modalityLabel}
                                                        </span>
                                                        <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${isModalityMenuOpen ? 'rotate-180' : ''}`} />
                                                    </div>
                                                </button>

                                                {/* Dropdown de Modalidad */}
                                                {isModalityMenuOpen && (
                                                    <div className="absolute left-0 top-[calc(100%+8px)] z-[800] w-48 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.18)] text-slate-800 dark:text-slate-100 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                                                        {[
                                                            { value: 'all', label: 'Todas' },
                                                            { value: 'presencial', label: 'Presencial' },
                                                            { value: 'virtual', label: 'Virtual' },
                                                            { value: 'domicilio', label: 'A domicilio' },
                                                        ].map((option) => (
                                                            <button
                                                                key={option.value}
                                                                type="button"
                                                                onClick={() => {
                                                                    setModality(option.value);
                                                                    setIsModalityMenuOpen(false);
                                                                }}
                                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition cursor-pointer ${
                                                                    modality === option.value
                                                                        ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                                                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                                }`}
                                                            >
                                                                <span>{option.label}</span>
                                                                {modality === option.value && (
                                                                    <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Línea divisoria simétrica 3 */}
                                            <div className="w-px h-6 sm:h-7 bg-slate-200 dark:bg-slate-800 shrink-0 self-center" aria-hidden="true" />

                                            {/* Acciones: Selector de Tipo de Vista + Filtros Avanzados + Favoritos */}
                                            <div className="flex items-center self-center pl-3 sm:pl-4 gap-3 sm:gap-3.5 shrink-0">
                                                {/* Selector de Tipo de Vista: Dividida (Mapa) vs Cuadrícula (Grid) */}
                                                <div className="flex items-center p-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewMode('split')}
                                                        title="Vista de mapa y lista"
                                                        aria-label="Vista de mapa y lista"
                                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                                            viewMode !== 'grid'
                                                                ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-2xs'
                                                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                                        }`}
                                                    >
                                                        <Columns2 className="w-3.5 h-3.5" />
                                                        <span className="hidden sm:inline text-[11px]">Mapa</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewMode('grid')}
                                                        title="Vista en cuadrícula de médicos"
                                                        aria-label="Vista en cuadrícula de médicos"
                                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                                            viewMode === 'grid'
                                                                ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-2xs'
                                                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                                        }`}
                                                    >
                                                        <LayoutGrid className="w-3.5 h-3.5" />
                                                        <span className="hidden sm:inline text-[11px]">Grid</span>
                                                    </button>
                                                </div>

                                                {/* Botones circulares con margen y gap aumentados */}
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        ref={filterButtonRef}
                                                        type="button"
                                                        onClick={() => setIsFiltersModalOpen(!isFiltersModalOpen)}
                                                        title="Filtros avanzados"
                                                        aria-label="Filtros avanzados"
                                                        className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border shrink-0 ${
                                                            isFiltersModalOpen || consolidatedFiltersCount > 0
                                                                ? 'border-sky-300 bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:border-sky-800 dark:text-sky-300'
                                                                : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-sky-600 hover:border-sky-200 hover:bg-sky-50 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400'
                                                        }`}
                                                    >
                                                        <SlidersHorizontal className="w-3.5 h-3.5" />
                                                        {consolidatedFiltersCount > 0 && (
                                                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                                                                {consolidatedFiltersCount}
                                                            </span>
                                                        )}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                                                        title="Ver mis favoritos"
                                                        aria-label="Ver mis favoritos"
                                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border shrink-0 ${
                                                            showOnlyFavorites
                                                                ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400'
                                                                : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400'
                                                        }`}
                                                    >
                                                        <Heart className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-current text-rose-600' : ''}`} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dropdown Panel Horizontal de Filtros Avanzados (flotando sobre el mapa) */}
                                    {isFiltersModalOpen && (
                                        <div
                                            ref={filterDropdownRef}
                                            className="absolute left-2 right-2 top-[calc(100%+8px)] z-[850] max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.18)] p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100 max-h-[75vh] overflow-y-auto"
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[auto_1fr_1fr_auto] gap-6 pt-1 items-start divide-y md:divide-y-0 divide-slate-100 dark:divide-slate-800">
                                                {/* Columna 1: Disponibilidad */}
                                                <div className="md:col-span-1 xl:col-span-1 pr-0 xl:pr-6 space-y-3 pt-3 md:pt-0 w-fit">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                            <Calendar className="w-3.5 h-3.5 text-sky-600" />
                                                            Disponibilidad
                                                        </label>
                                                        {availability && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setAvailability('');
                                                                    setCalendarMonth(new Date());
                                                                }}
                                                                className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                                                            >
                                                                Restablecer
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex justify-center scale-90 sm:scale-95 origin-top-left">
                                                        <DayPicker
                                                            mode="single"
                                                            selected={availability ? new Date(availability + 'T00:00:00') : undefined}
                                                            onSelect={(date) => {
                                                                if (date) {
                                                                    const y = date.getFullYear();
                                                                    const m = String(date.getMonth() + 1).padStart(2, '0');
                                                                    const d = String(date.getDate()).padStart(2, '0');
                                                                    setAvailability(`${y}-${m}-${d}`);
                                                                } else {
                                                                    setAvailability('');
                                                                }
                                                            }}
                                                            month={calendarMonth}
                                                            onMonthChange={setCalendarMonth}
                                                            locale={es}
                                                            disabled={{ before: new Date() }}
                                                            classNames={{
                                                                selected: "bg-sky-600 text-white hover:bg-sky-700 font-bold rounded-lg",
                                                                today: "font-black text-sky-600 underline",
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Columna 2: Arriba: Precio / Abajo: Aseguradoras */}
                                                <div className="md:col-span-1 xl:col-span-1 md:border-l md:border-slate-200/80 dark:md:border-slate-800 md:pl-6 xl:border-l xl:pl-6 xl:pr-6 space-y-5 pt-3 md:pt-0 min-w-0">
                                                    {/* Precio Máximo */}
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                                <DollarSign className="w-3.5 h-3.5 text-sky-600" />
                                                                Presupuesto Consulta
                                                            </label>
                                                            {localPriceLimit < PRICE_LIMIT_MAX && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setLocalPriceLimit(PRICE_LIMIT_MAX);
                                                                        setPriceLimit(PRICE_LIMIT_MAX);
                                                                    }}
                                                                    className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                                                                >
                                                                    Restablecer
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            <div className="relative flex-1">
                                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Q</span>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={PRICE_LIMIT_MAX}
                                                                    step={50}
                                                                    value={localPriceLimit === PRICE_LIMIT_MAX ? '' : localPriceLimit}
                                                                    placeholder={`Máx ${PRICE_LIMIT_MAX}`}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value === '' ? PRICE_LIMIT_MAX : Number(e.target.value);
                                                                        setLocalPriceLimit(val);
                                                                        setPriceLimit(val);
                                                                    }}
                                                                    className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                />
                                                            </div>
                                                            <span className="text-xs font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                                                                {localPriceLimit < PRICE_LIMIT_MAX ? `Q${localPriceLimit}` : 'Sin límite'}
                                                            </span>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <input
                                                                type="range"
                                                                min={0}
                                                                max={PRICE_LIMIT_MAX}
                                                                step={50}
                                                                value={Math.min(localPriceLimit, PRICE_LIMIT_MAX)}
                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value);
                                                                    setLocalPriceLimit(val);
                                                                    setPriceLimit(val);
                                                                }}
                                                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-600"
                                                            />
                                                            <div className="flex justify-between text-[10px] font-medium text-slate-400">
                                                                <span>Q0</span>
                                                                <span>Q500</span>
                                                                <span>Q{PRICE_LIMIT_MAX}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                            {[150, 300, 500, 1000].map((preset) => (
                                                                <button
                                                                    key={preset}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setLocalPriceLimit(preset);
                                                                        setPriceLimit(preset);
                                                                    }}
                                                                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                                                                        localPriceLimit === preset
                                                                            ? 'bg-sky-600 text-white shadow-2xs'
                                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                                    }`}
                                                                >
                                                                    Q{preset}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Aseguradoras */}
                                                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                                <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                                                                Aseguradoras
                                                            </label>
                                                            {selectedInsurances.length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedInsurances([])}
                                                                    className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                                                                >
                                                                    Restablecer
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                                            {insurancePicks.map((ins) => {
                                                                const isChecked = selectedInsurances.includes(ins.aseguradora);
                                                                return (
                                                                    <label
                                                                        key={ins.aseguradora}
                                                                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition text-xs select-none ${
                                                                            isChecked
                                                                                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-100 font-bold'
                                                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium'
                                                                        }`}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) setSelectedInsurances((prev) => [...prev, ins.aseguradora]);
                                                                                else setSelectedInsurances((prev) => prev.filter((i) => i !== ins.aseguradora));
                                                                            }}
                                                                            className="rounded text-sky-600 focus:ring-sky-500 h-3.5 w-3.5 shrink-0 border-slate-300"
                                                                        />
                                                                        <InsuranceLogoBadge asg={ins} size="xs" isHighlighted={isChecked} />
                                                                        <span className="truncate text-xs">{ins.aseguradora}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Columna 3: Idiomas y Sexo */}
                                                <div className="md:col-span-1 xl:col-span-1 md:border-t md:border-slate-200/80 dark:md:border-slate-800 md:pt-6 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6 xl:pr-6 space-y-5 pt-3 md:pt-0 min-w-0">
                                                    {/* Idiomas */}
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                                <Globe className="w-3.5 h-3.5 text-sky-600" />
                                                                Idiomas
                                                            </label>
                                                            {selectedLanguages.length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedLanguages([])}
                                                                    className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                                                                >
                                                                    Restablecer
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-wrap gap-1.5">
                                                            {languagePicks.map((lang) => {
                                                                const isSelected = selectedLanguages.includes(lang);
                                                                return (
                                                                    <button
                                                                        key={lang}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (isSelected) setSelectedLanguages((prev) => prev.filter((l) => l !== lang));
                                                                            else setSelectedLanguages((prev) => [...prev, lang]);
                                                                        }}
                                                                        className={`px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer ${
                                                                            isSelected
                                                                                ? 'bg-sky-600 text-white font-bold shadow-2xs'
                                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium'
                                                                        }`}
                                                                    >
                                                                        {lang}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Sexo */}
                                                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                                <User className="w-3.5 h-3.5 text-sky-600" />
                                                                Sexo
                                                            </label>
                                                            {gender !== 'all' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setGender('all')}
                                                                    className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                                                                >
                                                                    Restablecer
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="space-y-1">
                                                            {[
                                                                { id: 'all', label: 'Todos' },
                                                                { id: 'F', label: 'Femenino' },
                                                                { id: 'M', label: 'Masculino' },
                                                            ].map((opt) => {
                                                                const isSelected = gender === opt.id;
                                                                return (
                                                                    <button
                                                                        key={opt.id}
                                                                        type="button"
                                                                        onClick={() => setGender(opt.id)}
                                                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer text-left ${
                                                                            isSelected
                                                                                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold'
                                                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
                                                                        }`}
                                                                    >
                                                                        <span>{opt.label}</span>
                                                                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-sky-600 dark:bg-sky-400 shrink-0" />}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Columna 4: Ordenar por */}
                                                <div className="md:col-span-1 xl:col-span-1 md:border-l md:border-t md:border-slate-200/80 dark:md:border-slate-800 md:pl-6 md:pt-6 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6 space-y-3 pt-3 md:pt-0 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                            <ArrowDownUp className="w-3.5 h-3.5 text-sky-600" />
                                                            Ordenar por
                                                        </label>
                                                        {sortBy !== 'default' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setSortBy('default')}
                                                                className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                                                            >
                                                                Restablecer
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="space-y-1">
                                                        {[
                                                            { id: 'default', label: 'Relevancia' },
                                                            { id: 'name-asc', label: 'Nombre A-Z' },
                                                            { id: 'name-desc', label: 'Nombre Z-A' },
                                                            { id: 'rating-desc', label: 'Mejor valorados' },
                                                            { id: 'price-asc', label: 'Precio menor' },
                                                        ].map((opt) => {
                                                            const isSelected = sortBy === opt.id;
                                                            return (
                                                                <button
                                                                    key={opt.id}
                                                                    type="button"
                                                                    onClick={() => setSortBy(opt.id as SortOption)}
                                                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer text-left ${
                                                                        isSelected
                                                                            ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold'
                                                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
                                                                    }`}
                                                                >
                                                                    <span className="truncate">{opt.label}</span>
                                                                    {isSelected && <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Footer del Dropdown */}
                                            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                    Mostrando <strong className="text-slate-800 dark:text-slate-200">{visibleDoctors.length}</strong> especialistas disponibles
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    {consolidatedFiltersCount > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={handleClearConsolidatedFilters}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                                        >
                                                            Restablecer todo
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsFiltersModalOpen(false)}
                                                        className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                                                    >
                                                        Aplicar y cerrar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                    </div>

                    {/* Selector de pestañas para móvil (< 1024px) - Solo en vista Split */}
                    {viewMode !== 'grid' && (
                        <div className="flex lg:hidden items-center justify-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 mb-4">
                            <button
                                type="button"
                                onClick={() => setMobileTab('list')}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    mobileTab === 'list'
                                        ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                <List className="w-3.5 h-3.5" />
                                <span>Lista ({visibleDoctors.length})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setMobileTab('map');
                                    setMainPanelView('map');
                                }}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    mobileTab === 'map'
                                        ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                <MapPin className="w-3.5 h-3.5" />
                                <span>Mapa</span>
                            </button>
                        </div>
                    )}

                    <section id="doctores" className="scroll-mt-24 relative z-0">
                        {viewMode === 'grid' ? (
                            /* ─── VISTA CUADRÍCULA: GRID DE MÉDICOS (Aceternity Expandable Card Pattern) ─── */
                            <div className="w-full space-y-6">
                                <div className="flex items-center justify-between px-1">
                                    <div>
                                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                            <span>Especialistas Disponibles</span>
                                            <span className="px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 text-xs font-black">
                                                {visibleDoctors.length}
                                            </span>
                                        </h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Haz clic en cualquier médico para expandir su ficha clínica y consultar disponibilidad
                                        </p>
                                    </div>
                                </div>

                                {visibleDoctors.length === 0 ? (
                                    <div className="w-full py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            No se encontraron médicos con los filtros actuales
                                        </p>
                                        <button
                                            type="button"
                                            onClick={resetParams}
                                            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 text-white hover:bg-sky-700 transition cursor-pointer"
                                        >
                                            Limpiar filtros
                                        </button>
                                    </div>
                                ) : (
                                    <ul className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-5 items-stretch">
                                        {visibleDoctors.map((doc) => {
                                            const priceInfo = getDoctorPriceDisplay(doc.doctor);
                                            const primarySpecialty = doc.specialtyPreview[0] || doc.doctor.exp_profesion || 'Especialista';
                                            const initials = doc.fullName.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('') || 'DR';
                                            const clinicas = doc.doctor.clinicas || [];
                                            const aseguradoras = doc.doctor.aseguradoras || [];
                                            const hasPresencial = clinicas.length > 0;
                                            const hasVirtual = (doc.modalityPreview || []).some((m) => m.toLowerCase().includes('virtual'));
                                            const hasDomicilio = (doc.doctor.atencion_domicilio && doc.doctor.atencion_domicilio.length > 0);
                                            const isDocFav = favoritos.some((f) => f.expCodigo === doc.doctor.exp_codigo);
                                            const hasReviews = Boolean(doc.doctor.total_resenas && doc.doctor.total_resenas > 0 && (doc.doctor.promedio_valoracion || 0) > 0);

                                            return (
                                                <motion.li
                                                    layoutId={`card-${doc.doctor.exp_codigo}`}
                                                    key={doc.doctor.exp_codigo}
                                                    onClick={() => setModalDoctor(doc)}
                                                    className="group p-4 flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-600 hover:shadow-xl hover:-translate-y-1 transition-all rounded-3xl cursor-pointer relative overflow-hidden"
                                                >
                                                    <div className="flex flex-col w-full">
                                                        {/* Foto de perfil */}
                                                        <motion.div
                                                            layoutId={`image-${doc.doctor.exp_codigo}`}
                                                            className="relative w-full h-52 sm:h-56 rounded-2xl overflow-hidden bg-gradient-to-br from-sky-100 to-slate-100 dark:from-slate-800 dark:to-slate-900 shrink-0"
                                                        >
                                                            {doc.doctor.exp_foto_perfil ? (
                                                                <img
                                                                    src={doc.doctor.exp_foto_perfil}
                                                                    alt={doc.fullName}
                                                                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-500 to-blue-600 text-white font-black text-3xl">
                                                                    {initials}
                                                                </div>
                                                            )}

                                                            {/* Badge superior izquierdo: Estrellas para quienes tengan referencias o 'Nuevo' */}
                                                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                                                                {hasReviews ? (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 shadow-2xs backdrop-blur-md border border-slate-200/60 dark:border-slate-700">
                                                                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                                                                        <span>{doc.doctor.promedio_valoracion.toFixed(1)}</span>
                                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">({doc.doctor.total_resenas})</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/95 dark:bg-slate-900/95 text-sky-700 dark:text-sky-300 shadow-2xs backdrop-blur-md border border-sky-200/60 dark:border-sky-800/60">
                                                                        <Sparkles className="w-3 h-3 text-sky-500 shrink-0" />
                                                                        <span>Nuevo</span>
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Acciones flotantes en la imagen: Favorito + Compartir */}
                                                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleToggleFavorito(doc.doctor.exp_codigo, e)}
                                                                    title={isDocFav ? "Quitar de favoritos" : "Guardar en favoritos"}
                                                                    aria-label={isDocFav ? "Quitar de favoritos" : "Guardar en favoritos"}
                                                                    className="w-7 h-7 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 hover:scale-110 active:scale-95 flex items-center justify-center transition shadow-2xs cursor-pointer backdrop-blur-md border border-slate-200/60 dark:border-slate-700"
                                                                >
                                                                    <Heart className={`w-3.5 h-3.5 ${isDocFav ? 'fill-rose-500 text-rose-500' : 'text-slate-500 dark:text-slate-400 hover:text-rose-500'}`} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleShareDoctor(doc, e)}
                                                                    title="Compartir especialista"
                                                                    aria-label="Compartir especialista"
                                                                    className="w-7 h-7 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:scale-110 active:scale-95 flex items-center justify-center transition shadow-2xs cursor-pointer backdrop-blur-md border border-slate-200/60 dark:border-slate-700"
                                                                >
                                                                    <Share2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>

                                                            {/* Badge disponible */}
                                                            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold shadow-xs flex items-center gap-1 border border-white/60">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                                <span>Disponible</span>
                                                            </div>
                                                        </motion.div>

                                                        {/* Datos del Médico */}
                                                        <div className="mt-3.5 space-y-1">
                                                            <motion.h3
                                                                layoutId={`title-${doc.doctor.exp_codigo}`}
                                                                className="font-bold text-slate-900 dark:text-white text-base truncate group-hover:text-sky-600 transition-colors flex items-center gap-1 min-w-0"
                                                            >
                                                                <span className="truncate">{doc.fullName}</span>
                                                                <BadgeCheck className="w-4 h-4 text-sky-500 shrink-0" />
                                                            </motion.h3>

                                                            <motion.p
                                                                layoutId={`description-${doc.doctor.exp_codigo}`}
                                                                className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate"
                                                            >
                                                                {doc.doctor.exp_profesion || primarySpecialty}
                                                                {doc.doctor.exp_colegiado_gt && ` · Col. ${doc.doctor.exp_colegiado_gt}`}
                                                            </motion.p>

                                                            {/* Ubicación / Sede principal */}
                                                            {doc.locationPreview.length > 0 && (
                                                                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate pt-0.5">
                                                                    <MapPin className="w-3 h-3 text-sky-600 shrink-0" />
                                                                    <span className="truncate">{doc.locationPreview[0]}</span>
                                                                    {clinicas.length > 1 && (
                                                                        <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold shrink-0">
                                                                            (+{clinicas.length - 1} sedes)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Modalidades */}
                                                        <div className="flex items-center gap-1.5 mt-2.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                                            {hasPresencial && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                                    <MapPin className="w-3.5 h-3.5 text-sky-600" /> Presencial
                                                                </span>
                                                            )}
                                                            {hasVirtual && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
                                                                    <Video className="w-3.5 h-3.5 text-blue-600" /> Virtual
                                                                </span>
                                                            )}
                                                            {hasDomicilio && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                                                                    <Home className="w-3.5 h-3.5 text-emerald-600" /> Domicilio
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Aseguradoras Aceptadas en pequeño con separación respectiva */}
                                                        {aseguradoras.length > 0 && (
                                                            <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100/90 dark:border-slate-800/80">
                                                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                                                                    Seguros:
                                                                </span>
                                                                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                                                    {aseguradoras.slice(0, 4).map((ins, iIdx) => (
                                                                        <InsuranceLogoBadge key={iIdx} asg={ins} size="xs" showName={false} />
                                                                    ))}
                                                                    {aseguradoras.length > 4 && (
                                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                                                                            +{aseguradoras.length - 4}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Pie de la card: Tarifa y Botones de Acción (Ver Perfil y Agendar Cita) */}
                                                    <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                                                                Consulta desde
                                                            </span>
                                                            <span className="text-sm font-black text-[#006194] dark:text-sky-300">
                                                                {priceInfo.hasPrice ? `Q${new Intl.NumberFormat('es-GT').format(priceInfo.price)}` : priceInfo.label}
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    router.push(`/dashboard/${doc.doctor.exp_codigo}`);
                                                                }}
                                                                className="w-full py-2 px-2.5 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                                                                title="Ver perfil completo del especialista"
                                                            >
                                                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                <span>Perfil</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    router.push(`/dashboard/agendar/${doc.doctor.exp_codigo}`);
                                                                }}
                                                                className="w-full py-2 px-2.5 rounded-xl font-bold text-xs bg-sky-600 hover:bg-sky-700 text-white shadow-xs hover:shadow-sky-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                                                                title="Agendar cita con este especialista"
                                                            >
                                                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                                                <span>Agendar</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        ) : (
                            /* ─── VISTA DIVIDIDA (SPLIT VIEW): Lista + Mapa ─── */
                            <div className="flex flex-col lg:flex-row items-start relative z-0 w-full gap-5 xl:gap-6">
{/* PANEL LATERAL: Lista Compacta O Card Expandida del Médico Seleccionado */}
                            <div className={`w-full lg:w-[440px] xl:w-[480px] 2xl:w-[500px] shrink-0 lg:sticky lg:top-20 lg:h-[calc(100vh-155px)] flex flex-col gap-3 min-w-0 ${
                                mobileTab !== 'list' ? 'hidden lg:flex' : 'flex'
                            }`}>
                                {selectedDoctorCard ? (
                                    /* VISTA MÉDICO SELECCIONADO: Ocultar las demás cards y mostrar la card expandida con botón X */
                                    <div className="w-full h-full flex flex-col min-h-0 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                        {/* Panel de detalles expandido con todas sus ubicaciones, modalidades y opciones */}
                                        <div className="flex-1 min-h-0 overflow-hidden">
                                            <DoctorDetailPanel
                                                key={selectedDoctorCard.doctor.exp_codigo}
                                                data={selectedDoctorCard}
                                                onClose={handleCloseSelectedDoctor}
                                                onViewOnMap={(clinicIdx) => {
                                                    if (typeof clinicIdx === 'number') {
                                                        setSelectedClinicIndex(clinicIdx);
                                                    }
                                                    setMainPanelView('map');
                                                    setMobileTab('map');
                                                }}
                                                onSelectClinic={(idx) => {
                                                    setSelectedClinicIndex(idx);
                                                }}
                                                selectedClinicIndex={selectedClinicIndex}
                                                className="h-full border-none shadow-none rounded-none"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Encabezado de la lista lateral */}
                                        <div className="flex items-center justify-between px-1">
                                            <div>
                                                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                    <span>Especialistas Disponibles</span>
                                                    <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 text-xs font-black">
                                                        {visibleDoctors.length}
                                                    </span>
                                                </h2>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                    Selecciona un especialista para ver su perfil completo y ubicación en el mapa
                                                </p>
                                            </div>
                                        </div>

                                        {searchedLocation && (
                                            <div className="flex items-center justify-between bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-3.5 py-2 rounded-2xl shadow-2xs">
                                                <div className="flex items-center gap-2 text-xs font-bold text-sky-900 dark:text-sky-200 min-w-0">
                                                    <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                                    <span className="truncate">Cerca de: <strong>{searchedLocation.address}</strong></span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSearchedLocation(null);
                                                        setIsNearMeActive(false);
                                                    }}
                                                    className="text-xs font-bold text-sky-700 dark:text-sky-300 hover:text-rose-600 underline shrink-0 ml-1 cursor-pointer"
                                                >
                                                    Limpiar
                                                </button>
                                            </div>
                                        )}

                                        {isPaginating ? (
                                            <div className="flex h-80 flex-col items-center justify-center">
                                                <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600" />
                                            </div>
                                        ) : paginatedDoctors.length > 0 ? (
                                            <div
                                                ref={doctorListContainerRef}
                                                className="flex flex-col gap-3 p-1 flex-1 min-h-0 overflow-y-auto pr-2 scroll-smooth [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.4)_transparent] overscroll-contain pb-24"
                                            >
                                                {paginatedDoctors.map((doc) => {
                                                    return (
                                                        <DoctorCompactCard
                                                            key={doc.doctor.exp_codigo}
                                                            data={doc}
                                                            isSelected={false}
                                                            isHovered={hoveredDoctorId === doc.doctor.exp_codigo}
                                                            onSelect={handleDoctorCardSelect}
                                                            onCollapse={handleCloseSelectedDoctor}
                                                            onSelectClinic={(idx) => {
                                                                setSelectedClinicIndex(idx);
                                                                setMainPanelView('map');
                                                            }}
                                                            selectedClinicIndex={selectedClinicIndex}
                                                            onVisit={handleDoctorVisit}
                                                            onShare={(d) => {
                                                                setDoctorToShare(d);
                                                                setIsShareModalOpen(true);
                                                            }}
                                                            onMouseEnter={() => handleDoctorHover(doc.doctor.exp_codigo)}
                                                            onMouseLeave={() => handleDoctorHover(null)}
                                                        />
                                                    );
                                                })}

                                                {/* Paginación */}
                                                {totalPages > 1 && (
                                                    <div className="flex items-center justify-center gap-3 pt-3 pb-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                                            disabled={currentPageForView === 1}
                                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs cursor-pointer"
                                                            aria-label="Página anterior"
                                                        >
                                                            <ChevronLeft className="h-4 w-4" />
                                                        </button>
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                            Página {currentPageForView} de {totalPages}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                                            disabled={currentPageForView >= totalPages}
                                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs cursor-pointer"
                                                            aria-label="Página siguiente"
                                                        >
                                                            <ChevronRight className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-8 text-center shadow-xs">
                                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 mb-3">
                                                    <Search className="h-6 w-6" />
                                                </div>
                                                <h4 className="text-lg font-bold text-slate-900 dark:text-white">No hay coincidencias</h4>
                                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                    Prueba con otro nombre, especialidad o ajusta los filtros.
                                                </p>
                                                {hasActiveFilters && (
                                                    <button
                                                        type="button"
                                                        onClick={handleClearAllFilters}
                                                        className="mt-4 px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-xs hover:bg-sky-700 transition cursor-pointer"
                                                    >
                                                        Limpiar todos los filtros
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

{/* PANEL PRINCIPAL: Mapa Interactivo */}
                            <div className={`flex-1 min-w-0 w-full h-[calc(100vh-155px)] min-h-[620px] lg:sticky lg:top-20 flex flex-col rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 relative z-10 overflow-hidden ${
                                mobileTab === 'list' ? 'hidden lg:flex' : 'flex'
                            }`}>
                                {/* Cuerpo del Panel Principal: Mapa Interactivo */}
                                <div className="flex-1 w-full h-full relative overflow-hidden">
                                    <DirectoryMap
                                        doctors={resolvedDoctors}
                                        hoveredDoctorId={hoveredDoctorId}
                                        selectedDoctorId={selectedDoctorId}
                                        selectedClinicIndex={selectedClinicIndex}
                                        radarRadiusKm={radarRadiusKm}
                                        userLocation={effectiveLocation}
                                        searchedLocation={searchedLocation}
                                        isNearMeActive={isNearMeActive || !!searchedLocation}
                                        onDoctorHover={setHoveredDoctorId}
                                        onDoctorSelect={(expCodigo, clinicIndex) => {
                                            handleDoctorSelectFromMap(expCodigo, clinicIndex);
                                        }}
                                        onNavigateToProfile={handleNavigateToProfile}
                                        onBuildingSelect={handleBuildingSelect}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </section>
                </div>
            </div>

            {/* Modal Expandible estilo Aceternity para Móvil o detalle rápido */}
            <DoctorExpandableModal
                active={modalDoctor}
                onClose={() => setModalDoctor(null)}
                onViewOnMap={(clinicIndex) => {
                    setModalDoctor(null);
                    setMainPanelView('map');
                    setMobileTab('map');
                    if (typeof clinicIndex === 'number') {
                        setSelectedClinicIndex(clinicIndex);
                    }
                }}
            />

            {/* Modal para Compartir Médico */}
            {isShareModalOpen && doctorToShare && (
                <ShareDoctorModal
                    isOpen={isShareModalOpen}
                    onClose={() => {
                        setIsShareModalOpen(false);
                        setDoctorToShare(null);
                    }}
                    doctor={{
                        nombre: doctorToShare.fullName,
                        especialidad: doctorToShare.specialtyPreview[0] || 'Especialista',
                        fotoPerfil: doctorToShare.doctor.exp_foto_perfil || null,
                        expCodigo: doctorToShare.doctor.exp_codigo,
                        url: `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/${doctorToShare.doctor.exp_codigo}`,
                    }}
                />
            )}
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
