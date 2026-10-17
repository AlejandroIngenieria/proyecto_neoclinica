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
    SlidersHorizontal,
    ArrowRight,
    Check,
} from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

import type { DoctorResponse, DoctorClinica } from '@/types';
import { buildDoctorFullName, isDoctorActive, cleanZonaText, cleanZonasDomicilio } from '@/types/doctor';
import { Navbar } from '@/components/navbar';
import { DoctorCard, type DoctorCardData } from '@/components/doctor-card';
import { DoctorCardExpandible } from '@/components/doctor-card-expandible';
import { DoctorCardMobile } from '@/components/doctor-card-mobile';
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
import { useFavoritos } from '@/hooks/use-favoritos';
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
    const [isMapVisible, setIsMapVisible] = useState(false);
    const [hoveredDoctorId, setHoveredDoctorId] = useState<string | null>(null);
    const rafHoverRef = useRef<number | null>(null);
    const handleDoctorHover = useCallback((docId: string | null) => {
        if (!isMapVisible) return;
        if (rafHoverRef.current) cancelAnimationFrame(rafHoverRef.current);
        rafHoverRef.current = requestAnimationFrame(() => {
            setHoveredDoctorId(docId);
        });
    }, [isMapVisible]);
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
    const [hasMapEverOpened, setHasMapEverOpened] = useState(false);

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

    const scrollToDoctorView = (docId?: string) => {
        if (cardsScrollContainerRef.current) {
            cardsScrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
        const target = (docId ? document.getElementById(`doctor-card-${docId}`) : null)
            || document.getElementById('doctores');

        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };

    const handleDoctorCardSelect = useCallback((data: DoctorCardData) => {
        const isCurrentlySelected = selectedDoctorId === data.doctor.exp_codigo;
        const nextSelectedId = isCurrentlySelected ? null : data.doctor.exp_codigo;

        setSelectedDoctorId(nextSelectedId);
        
        const hasClinicas = (data.doctor.clinicas && data.doctor.clinicas.length > 0);
        const hasDomicilio = (data.doctor.atencion_domicilio && data.doctor.atencion_domicilio.length > 0);
        const isDomicilioActive = modality === 'domicilio';
        const defaultClinicIndex = nextSelectedId
            ? ((isDomicilioActive && hasDomicilio) ? -1 : (hasClinicas ? 0 : (hasDomicilio ? -1 : 0)))
            : null;
        setSelectedClinicIndex(defaultClinicIndex);

        if (nextSelectedId) {
            if (!userLocation) {
                requestLocation();
            }
            if (!isMobileScreen) {
                setIsMapVisible(true);
            }
            if (currentPage !== 1) setCurrentPage(1);
            setTimeout(() => {
                scrollToDoctorView(nextSelectedId);
            }, 80);
        } else {
            setSelectedBuilding(null);
            setIsMapVisible(false);
            setShowMapMobile(false);
        }
    }, [selectedDoctorId, isMobileScreen, currentPage, setCurrentPage, modality, userLocation, requestLocation]);

    const handleCloseSelectedDoctor = useCallback(() => {
        setSelectedDoctorId(null);
        setSelectedBuilding(null);
        setIsMapVisible(false);
        setShowMapMobile(false);
        setSelectedClinicIndex(null);
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
        setSelectedDoctorId(expCodigo);
        setSelectedClinicIndex(typeof clinicIndex === 'number' ? clinicIndex : null);
        if (!isMapVisible) setIsMapVisible(true);
        if (currentPage !== 1) setCurrentPage(1);
        setTimeout(() => {
            scrollToDoctorView(expCodigo);
        }, 80);
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
        const activeTags = [...searchTags, deferredSearchTerm.trim()].filter(Boolean);
        const normalizedLocation = normalizeText(locationTerm.trim());

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

            const matchesLocation = !normalizedLocation || normalizeText(doctor.locationLabel).includes(normalizedLocation);
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
                    if (m === 'presencial') return doctorModalities.some((item) => item.includes('presencial'));
                    if (m === 'hybrid') return doctorModalities.some((item) => item.includes('telemedicina') || item.includes('virtual')) && doctorModalities.some((item) => item.includes('presencial'));
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
    }, [locationTerm, activeModalities, availability, priceLimit, resolvedDoctors, deferredSearchTerm, showOnlyActive, showOnlyFavorites, favoritos, sortBy, activeSpecialties, searchTags, selectedLanguages, selectedInsurances, isNearMeActive, searchedLocation, getDistanceToDoctorCustom, sessionSeed, gender, radarRadiusKm]);


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

    const gridContainerRef = useRef<HTMLDivElement | null>(null);
    const cardsScrollContainerRef = useRef<HTMLDivElement | null>(null);

    // ─── Columnas adaptativas y Paginación dinámica inteligente (basada en el ancho real del contenedor) ───
    const [columnsPerRow, setColumnsPerRow] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const width = window.innerWidth;
            if (width >= 2250) return 6;
            if (width >= 1650) return 5;
            if (width >= 1100) return 4;
            if (width >= 768) return 3;
            if (width >= 550) return 2;
            return 1;
        }
        return 4;
    });

    useEffect(() => {
        const updateColumns = () => {
            const el = gridContainerRef.current;
            if (el && el.clientWidth > 0) {
                // Ancho de tarjeta compacta ~275px + gap 20px
                const cols = Math.max(1, Math.floor((el.clientWidth + 20) / (275 + 20)));
                setColumnsPerRow(cols);
                return;
            }

            const width = window.innerWidth;
            if (isMapVisible) {
                // Modo mapa lateral activo: el listado de doctores ocupa ~48%-52% del ancho disponible
                const effectiveW = width * 0.48;
                const cols = Math.max(1, Math.floor((effectiveW + 16) / (275 + 16)));
                setColumnsPerRow(cols);
            } else {
                // Modo listado completo
                const cols = Math.max(1, Math.floor((width + 24) / (280 + 24)));
                setColumnsPerRow(cols);
            }
        };

        updateColumns();

        const el = gridContainerRef.current;
        let observer: ResizeObserver | null = null;
        if (el && typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(() => {
                updateColumns();
            });
            observer.observe(el);
        }

        window.addEventListener('resize', updateColumns);
        return () => {
            window.removeEventListener('resize', updateColumns);
            if (observer) observer.disconnect();
        };
    }, [isMapVisible]);

    // La cantidad de elementos por página se calcula como: número de elementos por fila x 4 filas completas
    const itemsPerPage = useMemo(() => {
        if (columnsPerRow <= 1) return 8;
        return columnsPerRow * 4;
    }, [columnsPerRow]);

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
                {/* FILA ÚNICA ULTRA-LIMPIA ESTILO AIRBNB CENTRADA */}
                <div className={`w-full flex justify-center items-center my-4 relative ${isSearchFocused || isLocationSearchFocused || isModalityMenuOpen || isFiltersModalOpen ? 'z-[700]' : 'z-[400]'}`}>
                    
                    {/* Píldora Triple estilo Airbnb centrada y con ancho generoso */}
                    <div className="w-full max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto h-14 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-full shadow-sm hover:shadow-md transition-all flex items-center p-1.5 divide-x divide-slate-200 dark:divide-slate-800 relative z-40">
                            
                            {/* Segmento 1 (Especialista - Proporción líder para tags y búsqueda) */}
                            <div ref={searchMenuRef} className="flex-[1.35] h-full px-3.5 sm:px-4 lg:px-5 py-1 flex flex-col justify-center relative min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 leading-none mb-1 select-none truncate">
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
                                <div className="absolute left-0 top-[calc(100%+8px)] z-[700] w-[420px] sm:w-[480px] max-w-[90vw] overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface dark:bg-slate-900 shadow-[0_25px_60px_rgba(0,0,0,0.25)] text-on-surface dark:text-slate-100">
                                    {!searchTerm.trim() ? (
                                        <div className="p-3 space-y-4 max-h-[380px] overflow-y-auto">
                                            <div>
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-outline dark:text-slate-400 px-3 py-1 flex items-center gap-1.5">
                                                    <Users className="w-3.5 h-3.5 text-primary" /> Médicos Vistos Recientemente
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
                                                                className="flex w-full items-center justify-between px-3 py-2 rounded-xl hover:bg-surface-container-high dark:hover:bg-slate-800 transition text-left group"
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden relative border border-outline-variant/20">
                                                                        {doc.image ? (
                                                                            <Image src={doc.image} alt={doc.fullName} fill sizes="36px" className="object-cover" />
                                                                        ) : (
                                                                            doc.fullName.charAt(0)
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-bold text-on-surface dark:text-white leading-tight truncate group-hover:text-primary transition-colors">{doc.fullName}</p>
                                                                        <p className="text-xs text-outline dark:text-slate-400 truncate">{doc.specialty} · {doc.locationLabel}</p>
                                                                    </div>
                                                                </div>
                                                                <ChevronRight className="w-4 h-4 text-outline dark:text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="mx-3 my-1.5 p-3 rounded-xl bg-surface-container/60 dark:bg-slate-800/60 border border-outline-variant/20 dark:border-slate-800 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                            <Users className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <p className="text-xs text-outline dark:text-slate-400 font-medium leading-relaxed">
                                                            Tus perfiles de médicos visitados aparecerán aquí automáticamente al hacer clic en un médico.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            {specialtyPicks.length > 0 && (
                                                <div>
                                                    <p className="text-[11px] font-bold uppercase tracking-wider text-outline dark:text-slate-400 px-3 py-1">
                                                        Especialidades Populares
                                                    </p>
                                                    <div className="mt-1 flex flex-wrap gap-1.5 px-3 py-1">
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
                                                                className="px-3 py-1.5 bg-surface-container hover:bg-primary/10 hover:text-primary dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-on-surface dark:text-slate-200 transition"
                                                            >
                                                                {spec}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-3 space-y-4 max-h-[380px] overflow-y-auto">
                                            <div>
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-outline dark:text-slate-400 px-3 py-1 flex items-center gap-1.5">
                                                    <Search className="w-3.5 h-3.5 text-primary" /> Sugerencias para "{searchTerm}"
                                                </p>
                                                <div className="mt-1 space-y-0.5">
                                                    {searchSuggestions.length > 0 ? searchSuggestions.map((suggestion, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => {
                                                                if (suggestion.type === 'doctor') {
                                                                    const docMatch = resolvedDoctors.find(d => d.fullName === suggestion.label);
                                                                    if (docMatch) {
                                                                        handleDoctorVisit({
                                                                            doctor: docMatch.doctor,
                                                                            fullName: docMatch.fullName,
                                                                            specialtyPreview: docMatch.specialtyPreview,
                                                                            modalityPreview: docMatch.modalityPreview,
                                                                            locationPreview: docMatch.locationPreview,
                                                                        });
                                                                        router.push(`/dashboard/${docMatch.doctor.exp_codigo}`);
                                                                        setIsSearchFocused(false);
                                                                        return;
                                                                    }
                                                                }
                                                                if (!searchTags.includes(suggestion.label)) {
                                                                    const term = suggestion.label;
                                                                    setSearchTags(prev => [...prev, term]);
                                                                    if (suggestion.type === 'specialty' || specialtyPicks.includes(term)) {
                                                                        let next = activeSpecialties.filter(s => s !== 'all');
                                                                        if (!next.includes(term)) next.push(term);
                                                                        setSpecialtyParam(next.join(','));
                                                                    }
                                                                }
                                                                setSearchTerm('');
                                                                setIsSearchFocused(false);
                                                            }}
                                                            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-left transition hover:bg-surface-container-high dark:hover:bg-slate-800"
                                                        >
                                                            <Search className="h-4 w-4 text-primary shrink-0" />
                                                            <div className="min-w-0 flex-1">
                                                                <span className="text-sm font-medium text-on-surface dark:text-slate-100">{suggestion.label}</span>
                                                                {suggestion.sublabel && (
                                                                    <span className="ml-2 text-xs text-outline dark:text-slate-400">({suggestion.sublabel})</span>
                                                                )}
                                                            </div>
                                                        </button>
                                                    )) : (
                                                        <div className="px-3 py-2 text-sm text-outline dark:text-slate-400">Sin coincidencias de catálogo</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Segmento 2 (Ubicación - Proporción equilibrada con GPS) */}
                        <div ref={locationSearchRef} className="flex-1 h-full px-3 sm:px-4 lg:px-4 py-1 flex items-center justify-between gap-1.5 sm:gap-2 relative min-w-0">
                            <div className="flex-1 flex flex-col justify-center min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 leading-none mb-1 select-none truncate">
                                    Ubicación
                                </span>
                                <input
                                    id="locationSearchInput"
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
                                    placeholder="Zona o clínica..."
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

                            {/* Dropdown de Sugerencias de Ubicación (Google Places + Catálogo) */}
                            {isLocationSearchFocused && (
                                <div className="absolute left-0 sm:left-auto sm:right-0 lg:left-0 lg:right-auto top-[calc(100%+8px)] z-[800] w-[380px] sm:w-[450px] max-w-[90vw] overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface dark:bg-slate-900 shadow-[0_25px_60px_rgba(0,0,0,0.25)] text-on-surface dark:text-slate-100 p-3 space-y-3 max-h-[380px] overflow-y-auto">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 px-3 py-1 flex items-center gap-1.5 border-b border-outline-variant/15">
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
                                                    className="flex w-full items-center justify-between px-3 py-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-slate-800 transition text-left group cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
                                                            <MapPin className="w-4 h-4 text-sky-600" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-on-surface dark:text-white truncate leading-tight group-hover:text-sky-600 transition-colors">
                                                                {place.main_text}
                                                            </p>
                                                            {place.secondary_text && (
                                                                <p className="text-xs text-outline dark:text-slate-400 truncate">{place.secondary_text}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-2.5 py-1 rounded-full border border-sky-200 dark:border-sky-800 shrink-0">
                                                        Centrar mapa
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Sugerencias del Catálogo de Clínicas */}
                                    {catalogLocationSuggestions.length > 0 && (
                                        <div className="pt-2 border-t border-outline-variant/15 space-y-0.5">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-outline dark:text-slate-400 px-3 py-1">
                                                Zonas y Sedes del Catálogo
                                            </p>
                                            {catalogLocationSuggestions.map((loc, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => handleGeocodeSearchText(loc)}
                                                    className="flex w-full items-center justify-between px-3 py-2 rounded-xl hover:bg-surface-container-high dark:hover:bg-slate-800 transition text-left group cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                                                        <span className="text-sm font-semibold text-on-surface dark:text-slate-200 truncate">{loc}</span>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-outline shrink-0 group-hover:translate-x-0.5 transition-transform" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {placeSuggestions.length === 0 && catalogLocationSuggestions.length === 0 && (
                                        <div className="p-3 text-center text-xs font-medium text-outline">
                                            Presiona <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded font-mono text-[10px]">Enter</kbd> para buscar "{locationSearchTerm}" en Google Maps
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Segmento 3 (Modalidad + Acciones - Proporción equilibrada) */}
                        <div className="flex-[1.15] h-full pl-3 sm:pl-4 lg:px-4 pr-1.5 py-1 flex items-center justify-between gap-1.5 sm:gap-2 min-w-0">
                            {/* Trigger y Dropdown de Modalidad - Posicionamiento relativo dedicado */}
                            <div ref={modalityMenuRef} className="relative flex-1 h-full flex flex-col justify-center min-w-0">
                                <button
                                    type="button"
                                    onClick={() => setIsModalityMenuOpen(!isModalityMenuOpen)}
                                    className="w-full flex flex-col justify-center text-left min-w-0 cursor-pointer group pr-1"
                                >
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 leading-none mb-1 group-hover:text-blue-600 transition-colors select-none truncate">
                                        Modalidad
                                    </span>
                                    <div className="flex items-center gap-1 min-w-0">
                                        <span className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 truncate leading-tight font-normal">
                                            {modalityLabel}
                                        </span>
                                        <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${isModalityMenuOpen ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                {/* Dropdown de Modalidad - Alineado directamente debajo del selector de Modalidad */}
                                {isModalityMenuOpen && (
                                    <div className="absolute left-0 top-[calc(100%+8px)] z-[800] w-52 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.18)] text-slate-800 dark:text-slate-100 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
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
                                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <span>{option.label}</span>
                                                {modality === option.value && (
                                                    <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Acciones de la derecha: Filtros + Favoritos */}
                            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                                {/* Botón circular de Filtros (a la izquierda de favoritos) */}
                                <button
                                    ref={filterButtonRef}
                                    type="button"
                                    onClick={() => setIsFiltersModalOpen(!isFiltersModalOpen)}
                                    title="Filtros avanzados"
                                    aria-label="Filtros avanzados"
                                    className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer border shrink-0 ${
                                        isFiltersModalOpen || consolidatedFiltersCount > 0
                                            ? 'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300'
                                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/40'
                                    }`}
                                >
                                    <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    {consolidatedFiltersCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                                            {consolidatedFiltersCount}
                                        </span>
                                    )}
                                </button>

                                {/* Botón circular de Favoritos */}
                                <button
                                    type="button"
                                    onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                                    title="Ver mis favoritos"
                                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer border shrink-0 ${
                                        showOnlyFavorites
                                            ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400'
                                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/40'
                                    }`}
                                >
                                    <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${showOnlyFavorites ? 'fill-current text-rose-600' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Dropdown Panel Horizontal de Filtros (Responsive, ancho inteligente y separación clara) */}
                    {isFiltersModalOpen && (
                        <div
                            ref={filterDropdownRef}
                            className="absolute left-0 right-0 top-[calc(100%+8px)] z-[850] w-full max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.18)] p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100 max-h-[85vh] overflow-y-auto"
                        >
                            {/* Contenido en 4 Columnas Inteligentes:
                                Col 1: Disponibilidad (ancho exacto y justo)
                                Col 2: Arriba: Precio / Abajo: Aseguradoras
                                Col 3: Arriba: Idiomas / Abajo: Sexo (Género)
                                Col 4: Ordenar
                            */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[auto_1fr_1fr_auto] gap-6 pt-1 items-start divide-y md:divide-y-0 divide-slate-100 dark:divide-slate-800">
                                {/* 1. DISPONIBILIDAD (Columna 1 - Ancho exacto y justo sin márgenes excesivos) */}
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

                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            { label: 'Cualquier fecha', val: '' },
                                            { label: 'Hoy', val: format(new Date(), 'yyyy-MM-dd') },
                                            {
                                                label: 'Mañana',
                                                val: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
                                            },
                                        ].map((p) => {
                                            const isSelected = availability === p.val;
                                            return (
                                                <button
                                                    key={p.label}
                                                    type="button"
                                                    onClick={() => {
                                                        setAvailability(p.val);
                                                        if (p.val) setCalendarMonth(new Date(p.val + 'T00:00:00'));
                                                        else setCalendarMonth(new Date());
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-sky-600 text-white font-bold shadow-2xs'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                    }`}
                                                >
                                                    {p.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="pt-1.5 w-fit">
                                        <div className="w-[260px]">
                                            {/* Cabecera personalizada de mes ajustada al ancho del calendario */}
                                            <div className="flex items-center justify-between mb-2 px-0.5">
                                                <span className="text-xs font-bold capitalize text-slate-800 dark:text-slate-100">
                                                    {format(calendarMonth, 'MMMM yyyy', { locale: es })}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                                                        }}
                                                        disabled={isPastCalendarMonth(calendarMonth)}
                                                        className={`h-7 w-7 inline-flex items-center justify-center rounded-lg transition ${
                                                            isPastCalendarMonth(calendarMonth)
                                                                ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40'
                                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer active:scale-95'
                                                        }`}
                                                        title={isPastCalendarMonth(calendarMonth) ? 'Mes actual' : 'Mes anterior'}
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                                                        }}
                                                        className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer active:scale-95"
                                                        title="Mes siguiente"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div
                                                style={
                                                    {
                                                        '--rdp-day-height': '34px',
                                                        '--rdp-day-width': '36px',
                                                        '--rdp-day_button-height': '32px',
                                                        '--rdp-day_button-width': '34px',
                                                        '--rdp-accent-color': '#0284c7',
                                                    } as React.CSSProperties
                                                }
                                                className="w-full flex justify-start"
                                            >
                                                <DayPicker
                                                    mode="single"
                                                    locale={es}
                                                    month={calendarMonth}
                                                    onMonthChange={setCalendarMonth}
                                                    hideNavigation
                                                    selected={availability ? new Date(availability + 'T00:00:00') : undefined}
                                                    onSelect={(date) => {
                                                        const val = date ? format(date, 'yyyy-MM-dd') : '';
                                                        setAvailability(val);
                                                        if (date) setCalendarMonth(date);
                                                    }}
                                                    disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                                                    className="!m-0 text-xs w-full"
                                                    classNames={{
                                                        month_caption: "hidden",
                                                        selected: "bg-sky-600 !text-white font-bold hover:bg-sky-700 shadow-xs",
                                                        today: "font-bold text-sky-600 dark:text-sky-400",
                                                        day: "hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs font-medium",
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. COLUMNA 2: ARRIBA PRECIO | ABAJO ASEGURADORAS */}
                                <div className="md:col-span-1 xl:col-span-1 md:border-l md:border-slate-200/80 dark:md:border-slate-800 md:pl-6 xl:pr-6 space-y-5 pt-3 md:pt-0 min-w-0">
                                    {/* Arriba: Precio Consulta */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                <DollarSign className="w-3.5 h-3.5 text-sky-600" />
                                                Precio Consulta
                                            </label>
                                            {priceLimit < PRICE_LIMIT_MAX && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPriceLimit(PRICE_LIMIT_MAX);
                                                        setLocalPriceLimit(PRICE_LIMIT_MAX);
                                                    }}
                                                    className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                                                >
                                                    Restablecer
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">
                                                    Q
                                                </span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={PRICE_LIMIT_MAX}
                                                    step={25}
                                                    placeholder={`Hasta ${PRICE_LIMIT_MAX}`}
                                                    value={localPriceLimit === 0 ? '' : localPriceLimit}
                                                    onChange={(e) => {
                                                        const raw = e.target.value;
                                                        const num = raw === '' ? 0 : Math.max(0, Number(raw));
                                                        setLocalPriceLimit(num);
                                                        setPriceLimit(num);
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

                                    {/* Abajo: Aseguradoras */}
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

                                {/* 3. COLUMNA 3: ARRIBA IDIOMAS | ABAJO SEXO (GÉNERO) */}
                                <div className="md:col-span-1 xl:col-span-1 md:border-t md:border-slate-200/80 dark:md:border-slate-800 md:pt-6 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6 xl:pr-6 space-y-5 pt-3 md:pt-0 min-w-0">
                                    {/* Arriba: Idiomas */}
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

                                    {/* Abajo: Sexo (Género) */}
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

                                {/* 4. COLUMNA 4: ORDENAR POR */}
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



                {/* Lista de Médicos */}
                <div className="w-full space-y-3 mb-3">
                    {error ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            No fue posible cargar la lista de médicos.
                        </div>
                    ) : null}

                    <section id="doctores" className="scroll-mt-24 sm:scroll-mt-28 space-y-3 relative z-0 min-h-[400px]">
                        <div className="flex flex-col lg:flex-row items-start relative z-0 w-full gap-6">
                            {/* Contenedor de Tarjetas (Framer Motion layout: se ajusta automáticamente y contiene el scroll cuando el mapa está abierto) */}
                            <motion.div
                                ref={cardsScrollContainerRef}
                                layout
                                transition={{ type: "spring", stiffness: 220, damping: 26, mass: 0.8 }}
                                className={`w-full min-w-0 flex flex-col gap-4 ${
                                    isMapVisible
                                        ? 'lg:flex-[1.1] xl:flex-[1.15] lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto lg:pr-2.5 scrollbar-thin scroll-smooth'
                                        : 'flex-1'
                                } ${showMapMobile ? 'hidden lg:flex' : 'flex'}`}
                            >
                                {searchedLocation && (
                                    <div className="flex items-center justify-between bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-4 py-2.5 rounded-2xl mb-2 shadow-xs">
                                        <div className="flex items-center gap-2 text-xs font-bold text-sky-900 dark:text-sky-200 min-w-0">
                                            <MapPin className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 animate-bounce" />
                                            <span className="truncate">Mostrando médicos y sedes más cercanos a: <strong className="text-sky-700 dark:text-sky-300">{searchedLocation.address}</strong></span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchedLocation(null);
                                                setIsNearMeActive(false);
                                            }}
                                            className="text-xs font-bold text-sky-700 dark:text-sky-300 hover:text-rose-600 dark:hover:text-rose-400 underline transition cursor-pointer flex items-center gap-1 shrink-0 ml-2"
                                        >
                                            <X className="w-3.5 h-3.5" /> Limpiar filtro
                                        </button>
                                    </div>
                                )}

                                {isPaginating ? (
                                    <div className="flex h-[400px] flex-col items-center justify-center">
                                        <div className="h-20 w-20 animate-spin rounded-full border-8 border-slate-200 border-t-sky-600" />
                                    </div>
                                ) : orderedDoctors.length > 0 ? (
                                    <div ref={gridContainerRef} className="w-full">
                                        <AnimatedList
                                            className="grid gap-5 w-full items-stretch"
                                            style={{
                                                gridTemplateColumns: isMapVisible
                                                    ? 'repeat(auto-fill, minmax(min(100%, 285px), 1fr))'
                                                    : 'repeat(auto-fill, minmax(min(100%, 305px), 1fr))',
                                            }}
                                        >
                                            {orderedDoctors.map((doctor) => {
                                                const isExpanded = selectedDoctorId === doctor.doctor.exp_codigo;

                                                return (
                                                    <div
                                                        key={doctor.doctor.exp_codigo}
                                                        id={`doctor-card-${doctor.doctor.exp_codigo}`}
                                                        className={`w-full h-full flex justify-center ${isExpanded ? 'col-span-full' : ''}`}
                                                    >
                                                        {/* Vista Móvil: Tarjeta horizontal de 3 zonas */}
                                                        <div className="block md:hidden w-full">
                                                            <DoctorCardMobile
                                                                data={doctor}
                                                                onVisit={handleDoctorVisit}
                                                                onSelect={handleDoctorCardSelect}
                                                                isSelected={isExpanded}
                                                            />
                                                        </div>

                                                        {/* Vista Escritorio / Tablet: Tarjeta Expandible Unificada */}
                                                        <div className="hidden md:block w-full h-full flex justify-center">
                                                            <DoctorCardExpandible
                                                                data={doctor}
                                                                isExpanded={isExpanded}
                                                                onExpand={() => {
                                                                    handleDoctorCardSelect(doctor);
                                                                    if (!isMapVisible) setIsMapVisible(true);
                                                                }}
                                                                onCollapse={() => {
                                                                    setSelectedDoctorId(null);
                                                                    setSelectedClinicIndex(null);
                                                                    setIsMapVisible(false);
                                                                    setShowMapMobile(false);
                                                                    setSelectedBuilding(null);
                                                                }}
                                                                onVisit={handleDoctorVisit}
                                                                onSelectClinic={setSelectedClinicIndex}
                                                                selectedClinicIndex={isExpanded ? selectedClinicIndex : 0}
                                                                userLocation={effectiveLocation}
                                                                isHovered={isMapVisible && hoveredDoctorId === doctor.doctor.exp_codigo}
                                                                isHighlightedByLocation={selectedBuildingDoctorCodes.has(doctor.doctor.exp_codigo)}
                                                                highlightedLocationName={selectedBuilding?.name}
                                                                onMouseEnter={isMapVisible ? () => handleDoctorHover(doctor.doctor.exp_codigo) : undefined}
                                                                onMouseLeave={isMapVisible ? () => handleDoctorHover(null) : undefined}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </AnimatedList>
                                    </div>
                                ) : (
                                    <section className="rounded-4xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                                            <Search className="h-7 w-7" />
                                        </div>
                                        <h4 className="mt-4 text-2xl font-black tracking-tight text-slate-900">No hay coincidencias</h4>
                                        <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                                             Prueba con otro nombre, especialidad, correo o colegiado.
                                        </p>
                                        {hasActiveFilters && (
                                            <button
                                                type="button"
                                                onClick={handleClearAllFilters}
                                                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-sky-700 transition cursor-pointer"
                                            >
                                                <X className="w-4 h-4" /> Limpiar todos los filtros
                                            </button>
                                        )}
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
                            </motion.div>

                            {/* Contenedor del Mapa (Framer Motion layout + AnimatePresence, FIJO durante scroll) */}
                            <AnimatePresence>
                                {(isMapVisible || showMapMobile) && (
                                    <motion.div
                                        key="directorio-map-panel"
                                        layout
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{
                                            width: showMapMobile ? "100%" : "46%",
                                            opacity: 1,
                                        }}
                                        exit={{ width: 0, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 220, damping: 26, mass: 0.8 }}
                                        className={`shrink-0 ${
                                            showMapMobile
                                                ? 'relative block w-full h-[calc(100vh-140px)]'
                                                : 'hidden lg:block lg:flex-1 h-[calc(100vh-140px)] sticky top-20'
                                        }`}
                                    >
                                        <div className="w-full h-full rounded-3xl overflow-hidden relative shadow-xl border border-slate-200/90 dark:border-slate-800">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsMapVisible(false);
                                                    setSelectedDoctorId(null);
                                                    setShowMapMobile(false);
                                                }}
                                                className="absolute top-4 right-4 z-20 px-3.5 py-1.5 rounded-full bg-slate-900/90 text-white font-bold text-xs shadow-xl hover:bg-slate-800 transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
                                            >
                                                <X className="w-3.5 h-3.5 text-rose-400" />
                                                <span>Ocultar mapa</span>
                                            </button>

                                            <DirectoryMap
                                                doctors={visibleDoctors.length > 0 ? visibleDoctors : paginatedDoctors}
                                                hoveredDoctorId={hoveredDoctorId}
                                                selectedDoctorId={selectedDoctorId}
                                                selectedClinicIndex={selectedClinicIndex}
                                                radarRadiusKm={radarRadiusKm}
                                                userLocation={effectiveLocation}
                                                searchedLocation={searchedLocation}
                                                isNearMeActive={isNearMeActive || !!searchedLocation}
                                                onDoctorHover={setHoveredDoctorId}
                                                onDoctorSelect={handleDoctorSelectFromMap}
                                                onNavigateToProfile={handleNavigateToProfile}
                                                onBuildingSelect={handleBuildingSelect}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </section>
                </div>
            </div>

            {/* Botón Flotante para Móvil: Toggle Mapa / Lista */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden">
                <button
                    type="button"
                    onClick={() => {
                        if (showMapMobile) {
                            setShowMapMobile(false);
                            setIsMapVisible(false);
                            setSelectedDoctorId(null);
                        } else {
                            setSelectedDoctorId(null); // Garantiza mostrar todos los punteros de los médicos
                            setShowMapMobile(true);
                            setIsMapVisible(true);
                        }
                    }}
                    className={`inline-flex items-center gap-2 px-5 py-3 rounded-full font-bold text-xs shadow-xl transition-all duration-150 active:scale-95 cursor-pointer ${
                        showMapMobile
                            ? 'bg-slate-900 text-white border border-slate-700'
                            : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/30'
                    }`}
                >
                    {showMapMobile ? (
                        <>
                            <List className="w-4 h-4 text-sky-400" />
                            <span>Ver Lista</span>
                        </>
                    ) : (
                        <>
                            <MapPin className="w-4 h-4 text-white" />
                            <span>Ver Mapa</span>
                        </>
                    )}
                </button>
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
