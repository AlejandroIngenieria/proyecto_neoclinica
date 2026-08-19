'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState, useDeferredValue, useCallback } from 'react';
import { DirectoryMap } from '@/components/directory-map';
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
    Heart,
    Globe,
    SlidersHorizontal,
} from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

import type { DoctorResponse, DoctorClinica } from '@/types';
import { buildDoctorFullName, isDoctorActive } from '@/types/doctor';
import { Navbar } from '@/components/navbar';
import { DoctorCard, type DoctorCardData } from '@/components/doctor-card';
import { useUserLocation } from '@/hooks/use-user-location';
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
    const specialtyPreview = doctor.especialidades.map((item) => item.especialidad).filter(Boolean);
    const modalitySet = new Set(doctor.modalidades.map((item) => item.modalidad).filter(Boolean));
    if (doctor.atencion_domicilio && doctor.atencion_domicilio.length > 0) {
        modalitySet.add('Domicilio');
    }
    const modalityPreview = Array.from(modalitySet).slice(0, 3);
    const languagePreview = doctor.idiomas.map((item) => item.idioma).filter(Boolean);
    const insurancePreview = (doctor.aseguradoras || []).map((item) => item.aseguradora).filter(Boolean);
    const locationPreview = Array.from(new Set([
        ...doctor.clinicas.map(c => [c.cli_descripcion, c.cli_zona ? `Zona ${c.cli_zona}` : ''].filter(Boolean).join(', ')).filter(Boolean),
        ...(doctor.atencion_domicilio || []).map(d => `Domicilio: ${[d.mun_descripcion, d.lad_zonas ? `Zonas ${d.lad_zonas}` : ''].filter(Boolean).join(', ')}`).filter(Boolean)
    ]));

    // Restringimos el índice a lo que el usuario realmente buscaría: Nombres, Especialidades y Colegiado
    const searchIndex = normalizeText(
        [
            fullName,
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
    const [modality, setModality] = useParamString('modality', 'all');
    const [specialtyParam, setSpecialtyParam] = useParamString('specialty', 'all');

    // Semilla aleatoria única por inicio de sesión / sesión de navegación
    const [sessionSeed] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            try {
                const stored = sessionStorage.getItem('neoclinica_random_seed');
                if (stored) {
                    return parseInt(stored, 10);
                }
                const newSeed = Math.floor(Math.random() * 1000000) + 1;
                sessionStorage.setItem('neoclinica_random_seed', newSeed.toString());
                return newSeed;
            } catch {
                return Math.floor(Math.random() * 1000000) + 1;
            }
        }
        return 42;
    });
    
    const activeModalities = useMemo(() => modality ? modality.split(',') : ['all'], [modality]);
    const activeSpecialties = useMemo(() => specialtyParam ? specialtyParam.split(',') : ['all'], [specialtyParam]);

    const toggleModality = (id: string) => {
        if (id === 'all') {
            setModality('all');
        } else {
            let next = activeModalities.filter(m => m !== 'all');
            if (next.includes(id)) {
                next = next.filter(m => m !== id);
            } else {
                next.push(id);
            }
            setModality(next.length === 0 ? 'all' : next.join(','));
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

    const [activePopover, setActivePopover] = useState<'fechas' | 'modalidad' | 'precio' | 'aseguradoras' | 'idiomas' | 'radar' | null>(null);
    const popoverRef = useRef<HTMLDivElement | null>(null);

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
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
    const [selectedClinicIndex, setSelectedClinicIndex] = useState<number>(0);
    const [showMapMobile, setShowMapMobile] = useState(false);

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

    const handleDoctorCardSelect = (data: DoctorCardData) => {
        const isCurrentlySelected = selectedDoctorId === data.doctor.exp_codigo;
        const nextSelectedId = isCurrentlySelected ? null : data.doctor.exp_codigo;

        setSelectedDoctorId(nextSelectedId);
        setSelectedClinicIndex(0);

        if (nextSelectedId) {
            if (!isMapVisible) setIsMapVisible(true);
            if (currentPage !== 1) setCurrentPage(1);
            setTimeout(() => {
                const el = document.getElementById('doctores');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
        }
    };

    const handleDoctorSelectFromMap = (expCodigo: string) => {
        setSelectedDoctorId(expCodigo);
        setSelectedClinicIndex(0);
        if (!isMapVisible) setIsMapVisible(true);
        if (currentPage !== 1) setCurrentPage(1);
        setTimeout(() => {
            const el = document.getElementById('doctores');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
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
        ].filter(Boolean).length;
    }, [availability, modality, priceLimit, selectedLanguages, selectedInsurances, specialtyParam]);
    
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

        // 2. Limpiar todos los parámetros de la URL en una sola navegación limpia
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
            if (sortMenuRef.current && !sortMenuRef.current.contains(target)) {
                setIsSortMenuOpen(false);
            }
            if (popoverRef.current && !popoverRef.current.contains(target)) {
                setActivePopover(null);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsSearchFocused(false);
                setIsLocationSearchFocused(false);
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

            if (!(matchesLocation && matchesActive && matchesModality && matchesAvailability && matchesPrice && matchesSpecialtyParam && matchesLanguages && matchesInsurances && matchesRadar)) {
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
            };
        }).filter(Boolean) as (typeof resolvedDoctors[0] & { matchedSpecialty?: string, matchedLocation?: string, searchHighlight?: string[] })[];

        return filteredDoctors.sort((leftDoctor, rightDoctor) => {
            if (selectedDoctorId) {
                if (leftDoctor.doctor.exp_codigo === selectedDoctorId) return -1;
                if (rightDoctor.doctor.exp_codigo === selectedDoctorId) return 1;
            }

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
    }, [locationTerm, activeModalities, availability, priceLimit, resolvedDoctors, deferredSearchTerm, showOnlyActive, showOnlyFavorites, favoritos, sortBy, activeSpecialties, searchTags, selectedLanguages, selectedInsurances, isNearMeActive, searchedLocation, getDistanceToDoctorCustom, selectedDoctorId, sessionSeed]);

    const matchingRecentDoctors = useMemo(() => {
        const query = normalizeText(searchTerm.trim());
        if (!query) return [];
        return recentDoctors.filter(doc => 
            normalizeText(doc.fullName).includes(query) ||
            normalizeText(doc.specialty).includes(query) ||
            normalizeText(doc.locationLabel).includes(query)
        );
    }, [recentDoctors, searchTerm]);

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

    const itemsPerPage = 15;
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
            <div className="mx-auto w-[90%] max-w-[1800px] mt-6 flex flex-col gap-6">
                {/* FILA 1: Dos Buscadores Gemelos Grandes (Médicos y Ubicación) + Acciones Globales */}
                <div className={`flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-center relative ${isSearchFocused || isLocationSearchFocused ? 'z-[700]' : 'z-[400]'}`}>
                    
                    {/* Contenedor Flex para los 2 Buscadores Gemelos */}
                    <div className="flex flex-col md:flex-row items-center gap-3.5 flex-1 w-full">
                        
                        {/* 1. Buscador de Médicos / Especialidades */}
                        <div ref={searchMenuRef} className={`relative flex-1 w-full rounded-2xl bg-surface border border-outline-variant/30 shadow-md flex items-center px-4 h-14 ${isSearchFocused ? 'z-[700] ring-2 ring-primary/30 border-primary' : 'z-[400]'} focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all`}>
                            <Search className="h-5 w-5 shrink-0 text-[#0ea5e9] mr-2" />
                            
                            <div className="flex items-center gap-2 h-full flex-nowrap shrink-0 overflow-x-auto no-scrollbar max-w-[45%]">
                                {searchTags.map((tag, idx) => (
                                    <span key={idx} className="inline-flex items-center gap-1 h-8 rounded-lg bg-primary/10 text-primary px-3 text-xs font-bold whitespace-nowrap">
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
                                placeholder={searchTags.length === 0 ? "Buscar doctor o especialidad..." : "Añadir filtro..."}
                                className="flex-1 h-full bg-transparent min-w-[140px] px-2 text-sm md:text-base font-semibold text-on-surface outline-none placeholder:text-outline/70"
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
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-outline transition hover:bg-surface-container-high hover:text-on-surface ml-2"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}

                            {/* Dropdown de Sugerencias de Médicos */}
                            {isSearchFocused && (
                                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[700] overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface dark:bg-slate-900 shadow-[0_25px_60px_rgba(0,0,0,0.25)] text-on-surface dark:text-slate-100">
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
                                                    <p className="text-[11px] font-bold uppercase tracking-wider text-outline dark:text-slate-400 px-3 py-1 flex items-center gap-1.5">
                                                        <Sparkles className="w-3.5 h-3.5 text-primary" /> Especialidades Populares
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
                                            {recentDoctors.length > 0 && (
                                                <div>
                                                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary px-3 py-1 flex items-center gap-1.5">
                                                        <Users className="w-3.5 h-3.5 text-primary" /> Médicos Vistos Recientemente
                                                    </p>
                                                    <div className="mt-1 space-y-1">
                                                        {(matchingRecentDoctors.length > 0 ? matchingRecentDoctors : recentDoctors.slice(0, 3)).map((doc) => (
                                                            <button
                                                                key={`rec_${doc.exp_codigo}`}
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
                                                                className="flex w-full items-center justify-between px-3 py-2 rounded-xl bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 transition text-left group border border-primary/20"
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden relative border border-primary/20">
                                                                        {doc.image ? (
                                                                            <Image src={doc.image} alt={doc.fullName} fill sizes="36px" className="object-cover" />
                                                                        ) : (
                                                                            doc.fullName.charAt(0)
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="text-sm font-bold text-on-surface dark:text-white leading-tight truncate group-hover:text-primary transition-colors">{doc.fullName}</p>
                                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary uppercase shrink-0">Reciente</span>
                                                                        </div>
                                                                        <p className="text-xs text-outline dark:text-slate-400 truncate">{doc.specialty} · {doc.locationLabel}</p>
                                                                    </div>
                                                                </div>
                                                                <ChevronRight className="w-4 h-4 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-outline dark:text-slate-400 px-3 py-1 flex items-center gap-1.5">
                                                    <Sparkles className="w-3.5 h-3.5 text-primary" /> Sugerencias para "{searchTerm}"
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

                        {/* 2. Buscador Exclusivo de Ubicación (Mismo Estilo Gemelo a la Par) */}
                        <div ref={locationSearchRef} className={`relative flex-1 w-full rounded-2xl bg-surface border border-outline-variant/30 shadow-md flex items-center px-4 h-14 ${isLocationSearchFocused ? 'z-[700] ring-2 ring-sky-500/30 border-sky-500' : 'z-[400]'} focus-within:ring-2 focus-within:ring-sky-500/30 focus-within:border-sky-500 transition-all`}>
                            <MapPin className="h-5 w-5 shrink-0 text-[#0ea5e9] mr-2" />

                            <input
                                id="locationSearchInput"
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
                                placeholder="Buscar ubicación, zona o lugar..."
                                className="flex-1 h-full bg-transparent min-w-[140px] px-2 text-sm md:text-base font-semibold text-on-surface outline-none placeholder:text-outline/70"
                            />

                            {(locationSearchTerm || searchedLocation) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLocationSearchTerm('');
                                        setSearchedLocation(null);
                                        setIsNearMeActive(false);
                                        setIsLocationSearchFocused(false);
                                    }}
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-outline transition hover:bg-surface-container-high hover:text-on-surface ml-2"
                                >
                                    <X className="h-4 w-4 text-rose-500" />
                                </button>
                            )}

                            {/* Dropdown de Sugerencias de Ubicación (Google Places + Catálogo) */}
                            {isLocationSearchFocused && (
                                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[800] overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface dark:bg-slate-900 shadow-[0_25px_60px_rgba(0,0,0,0.25)] text-on-surface dark:text-slate-100 p-3 space-y-3 max-h-[380px] overflow-y-auto">
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
                    </div>

                    {/* Acciones Globales alineadas a la derecha */}
                    <div className="flex items-center gap-3 shrink-0">
                        {/* Botón Cerca de ti con Configuración de Radar */}
                        <div className="relative flex items-center shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!isNearMeActive) {
                                        requestLocation();
                                        setIsNearMeActive(true);
                                        setIsMapVisible(true);
                                    } else {
                                        setIsNearMeActive(false);
                                        setActivePopover(null);
                                    }
                                }}
                                className={`inline-flex h-14 items-center gap-2 rounded-2xl ${isNearMeActive ? 'rounded-r-none pr-3' : 'px-5'} text-label-md font-semibold transition shrink-0 cursor-pointer ${
                                    isNearMeActive
                                        ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/25 border-y border-l border-sky-400 ring-2 ring-sky-300/50'
                                        : 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/90'
                                }`}
                            >
                                <Target className={`h-5 w-5 ${isNearMeActive ? 'animate-pulse text-white' : ''}`} />
                                <span>{locationLoading ? 'Obteniendo GPS...' : isNearMeActive ? `Radar (${radarRadiusKm} km)` : 'Cerca de ti'}</span>
                                {isNearMeActive && <span className="w-2 h-2 rounded-full bg-white animate-ping" />}
                            </button>

                            {isNearMeActive && (
                                <button
                                    type="button"
                                    onClick={() => setActivePopover(activePopover === 'radar' ? null : 'radar')}
                                    title="Ajustar radio del radar"
                                    className="inline-flex h-14 items-center justify-center px-3.5 rounded-r-2xl bg-sky-700 hover:bg-sky-800 text-white border-y border-r border-sky-400 font-bold text-xs transition cursor-pointer"
                                >
                                    <SlidersHorizontal className="w-4 h-4" />
                                </button>
                            )}

                            {/* Popover de Configuración de Radio de Radar */}
                            {activePopover === 'radar' && isNearMeActive && (
                                <div className="absolute right-0 top-[calc(100%+8px)] z-[900] w-72 rounded-2xl border border-outline-variant/20 bg-surface dark:bg-slate-900 p-4 shadow-2xl space-y-3.5 animate-in fade-in zoom-in-95 duration-150 text-on-surface dark:text-slate-100">
                                    <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                                            <Target className="w-4 h-4" />
                                            <span>Radio del Radar</span>
                                        </div>
                                        <span className="text-xs font-black text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
                                            {radarRadiusKm} km
                                        </span>
                                    </div>

                                    {/* Slider interactivo */}
                                    <div className="space-y-2">
                                        <input
                                            type="range"
                                            min="1"
                                            max="50"
                                            step="1"
                                            value={radarRadiusKm}
                                            onChange={(e) => setRadarRadiusKm(Number(e.target.value))}
                                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-600"
                                        />
                                        <div className="flex justify-between text-[10px] font-bold text-outline">
                                            <span>1 km</span>
                                            <span>25 km</span>
                                            <span>50 km</span>
                                        </div>
                                    </div>

                                    {/* Presets rápidos */}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {[3, 5, 10, 15, 25, 50].map((preset) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => setRadarRadiusKm(preset)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                    radarRadiusKm === preset
                                                        ? 'bg-sky-600 text-white shadow-xs'
                                                        : 'bg-surface-container dark:bg-slate-800 text-on-surface dark:text-slate-300 hover:bg-sky-50 hover:text-sky-600'
                                                }`}
                                            >
                                                {preset} km
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                            className={`inline-flex h-14 items-center gap-2 rounded-2xl px-5 text-label-md font-semibold transition shrink-0 ${
                                showOnlyFavorites
                                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                                    : 'border border-outline-variant/20 bg-surface text-on-surface hover:bg-surface-container'
                            }`}
                        >
                            <Heart className={`h-5 w-5 ${showOnlyFavorites ? 'fill-current' : ''}`} />
                            Mis Favoritos
                        </button>

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleClearAllFilters}
                                className="inline-flex h-14 items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-label-md font-semibold text-red-600 transition hover:bg-red-100 shrink-0 cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                                Limpiar
                            </button>
                        )}
                    </div>
                </div>

                {/* FILA 2: Filtros Rápidos (Pill Buttons) | Ordenar y Vista (Der) */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-[300]" ref={popoverRef}>
                    {/* Barra de Filtros Rápidos "Pill Buttons" (Izquierda) */}
                    <div className="flex items-center gap-3 overflow-visible flex-wrap lg:flex-nowrap py-1 flex-1">
                        
                        {/* 1. [ 📅 Fechas ] */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setActivePopover(activePopover === 'fechas' ? null : 'fechas')}
                                className={`px-6 py-3 rounded-full border text-sm font-bold min-w-[140px] justify-center transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer shadow-2xs ${
                                    activePopover === 'fechas' || availability
                                        ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                                        : 'border-outline-variant/30 bg-surface text-on-surface hover:bg-surface-container hover:border-outline-variant/60'
                                }`}
                            >
                                <Calendar className="w-4 h-4 text-[#0284c7] shrink-0" />
                                <span>{availability ? format(new Date(availability + 'T00:00:00'), 'd MMM', { locale: es }) : 'Fechas'}</span>
                                {availability && <span className="w-2 h-2 rounded-full bg-[#0284c7] shrink-0" />}
                            </button>

                            {activePopover === 'fechas' && (
                                <div className="absolute left-0 top-[calc(100%+8px)] z-[500] rounded-2xl border border-outline-variant/20 bg-surface p-4 shadow-[0_20px_50px_rgba(0,0,0,0.22)] space-y-3 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="flex justify-between items-center text-xs font-bold text-on-surface pb-1 border-b border-outline-variant/15">
                                        <span>Seleccionar fecha</span>
                                        {availability && (
                                            <button type="button" onClick={() => setAvailability('')} className="text-rose-600 hover:underline">Limpiar</button>
                                        )}
                                    </div>
                                    <div style={{ '--rdp-cell-size': '34px', '--rdp-caption-font-size': '14px' } as React.CSSProperties}>
                                        <DayPicker
                                            mode="single"
                                            locale={es}
                                            selected={availability ? new Date(availability + 'T00:00:00') : undefined}
                                            onSelect={(date) => {
                                                setAvailability(date ? format(date, 'yyyy-MM-dd') : '');
                                                setActivePopover(null);
                                            }}
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
                        </div>

                        {/* 2. [ 📹 Modalidad ] */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setActivePopover(activePopover === 'modalidad' ? null : 'modalidad')}
                                className={`px-6 py-3 rounded-full border text-sm font-bold min-w-[140px] justify-center transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer shadow-2xs ${
                                    activePopover === 'modalidad' || modality !== 'all'
                                        ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                                        : 'border-outline-variant/30 bg-surface text-on-surface hover:bg-surface-container hover:border-outline-variant/60'
                                }`}
                            >
                                <Video className="w-4 h-4 text-[#4f46e5] shrink-0" />
                                <span>{modality !== 'all' ? `Modalidad (${activeModalities.length})` : 'Modalidad'}</span>
                            </button>

                            {activePopover === 'modalidad' && (
                                <div className="absolute left-0 top-[calc(100%+8px)] z-[500] w-60 rounded-2xl border border-outline-variant/20 bg-surface p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] space-y-2 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="text-xs font-bold text-on-surface pb-1 border-b border-outline-variant/15">
                                        Modalidad de atención
                                    </div>
                                    <div className="space-y-1">
                                        {[
                                            { id: 'all', label: 'Todas', icon: <Search className="w-3.5 h-3.5" /> },
                                            { id: 'presencial', label: 'Presencial', icon: <MapPin className="w-3.5 h-3.5" /> },
                                            { id: 'virtual', label: 'Virtual', icon: <Video className="w-3.5 h-3.5" /> },
                                            { id: 'domicilio', label: 'Domicilio', icon: <Home className="w-3.5 h-3.5" /> }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => toggleModality(opt.id)}
                                                className={`flex items-center gap-2.5 px-3 py-2 w-full text-left rounded-xl text-xs font-semibold transition-all ${
                                                    activeModalities.includes(opt.id)
                                                        ? 'bg-[#4f46e5]/10 border border-[#4f46e5]/40 text-[#4f46e5]'
                                                        : 'text-on-surface-variant hover:bg-surface-container'
                                                }`}
                                            >
                                                {opt.icon}
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. [ 💲 Precio ] */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setActivePopover(activePopover === 'precio' ? null : 'precio')}
                                className={`px-6 py-3 rounded-full border text-sm font-bold min-w-[140px] justify-center transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer shadow-2xs ${
                                    activePopover === 'precio' || priceLimit < PRICE_LIMIT_MAX
                                        ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                                        : 'border-outline-variant/30 bg-surface text-on-surface hover:bg-surface-container hover:border-outline-variant/60'
                                }`}
                            >
                                <DollarSign className="w-4 h-4 text-[#059669] shrink-0" />
                                <span>{priceLimit < PRICE_LIMIT_MAX ? `Hasta Q${priceLimit}` : 'Precio'}</span>
                            </button>

                            {activePopover === 'precio' && (
                                <div className="absolute left-0 top-[calc(100%+8px)] z-[500] w-64 rounded-2xl border border-outline-variant/20 bg-surface p-4 shadow-[0_20px_50px_rgba(0,0,0,0.22)] space-y-3 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="flex justify-between items-center text-xs font-bold text-on-surface border-b border-outline-variant/15 pb-1">
                                        <span>Precio máximo</span>
                                        <span className="text-[#059669]">Q{localPriceLimit}</span>
                                    </div>
                                    <div className="flex items-center gap-3 pt-1">
                                        <span className="text-xs text-outline">Q0</span>
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
                                        <span className="text-xs text-outline">Q{PRICE_LIMIT_MAX}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 4. [ 🏥 Aseguradoras ] */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setActivePopover(activePopover === 'aseguradoras' ? null : 'aseguradoras')}
                                className={`px-6 py-3 rounded-full border text-sm font-bold min-w-[140px] justify-center transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer shadow-2xs ${
                                    activePopover === 'aseguradoras' || selectedInsurances.length > 0
                                        ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                                        : 'border-outline-variant/30 bg-surface text-on-surface hover:bg-surface-container hover:border-outline-variant/60'
                                }`}
                            >
                                <ShieldCheck className="w-4 h-4 text-[#8b5cf6] shrink-0" />
                                <span>{selectedInsurances.length > 0 ? `Aseguradoras (${selectedInsurances.length})` : 'Aseguradoras'}</span>
                            </button>

                            {activePopover === 'aseguradoras' && (
                                <div className="absolute left-0 top-[calc(100%+8px)] z-[500] w-64 rounded-2xl border border-outline-variant/20 bg-surface p-4 shadow-[0_20px_50px_rgba(0,0,0,0.22)] space-y-3 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="text-xs font-bold text-on-surface pb-1 border-b border-outline-variant/15">
                                        Seleccionar aseguradoras
                                    </div>
                                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                                        {insurancePicks.length > 0 ? insurancePicks.map(ins => (
                                            <label key={ins} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-surface-container cursor-pointer transition-colors text-xs font-medium text-on-surface">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedInsurances.includes(ins)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedInsurances(prev => [...prev, ins]);
                                                        else setSelectedInsurances(prev => prev.filter(i => i !== ins));
                                                    }}
                                                    className="rounded text-[#8b5cf6] focus:ring-[#8b5cf6] h-4 w-4"
                                                />
                                                <span className="truncate">{ins}</span>
                                            </label>
                                        )) : <span className="text-xs text-outline p-2">Sin aseguradoras</span>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 5. [ 🌐 Idiomas ] */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setActivePopover(activePopover === 'idiomas' ? null : 'idiomas')}
                                className={`px-6 py-3 rounded-full border text-sm font-bold min-w-[140px] justify-center transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer shadow-2xs ${
                                    activePopover === 'idiomas' || selectedLanguages.length > 0
                                        ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                                        : 'border-outline-variant/30 bg-surface text-on-surface hover:bg-surface-container hover:border-outline-variant/60'
                                }`}
                            >
                                <Globe className="w-4 h-4 text-[#0ea5e9] shrink-0" />
                                <span>{selectedLanguages.length > 0 ? `Idiomas (${selectedLanguages.length})` : 'Idiomas'}</span>
                            </button>

                            {activePopover === 'idiomas' && (
                                <div className="absolute left-0 top-[calc(100%+8px)] z-[500] w-64 rounded-2xl border border-outline-variant/20 bg-surface p-4 shadow-[0_20px_50px_rgba(0,0,0,0.22)] space-y-3 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="text-xs font-bold text-on-surface pb-1 border-b border-outline-variant/15">
                                        Idiomas hablados
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                                        {languagePicks.length > 0 ? languagePicks.map(lang => {
                                            const isSelected = selectedLanguages.includes(lang);
                                            return (
                                                <button
                                                    key={lang}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isSelected) setSelectedLanguages(prev => prev.filter(l => l !== lang));
                                                        else setSelectedLanguages(prev => [...prev, lang]);
                                                    }}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                                        isSelected
                                                            ? 'bg-[#0ea5e9]/10 border border-[#0ea5e9]/40 text-[#0ea5e9]'
                                                            : 'border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container'
                                                    }`}
                                                >
                                                    {lang}
                                                </button>
                                            );
                                        }) : <span className="text-xs text-outline p-2">Sin idiomas</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Alineados a la Derecha en Fila 2: Ordenar + Vista */}
                    <div className="flex items-center gap-3 shrink-0 self-end lg:self-auto">
                        {/* Dropdown Ordenar */}
                        <div className="relative" ref={sortMenuRef}>
                            <button
                                type="button"
                                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                                className={`inline-flex h-12 items-center gap-2 bg-surface rounded-2xl px-5 text-xs font-bold focus:outline-none transition-all border ${
                                    isSortMenuOpen ? 'border-primary text-primary ring-2 ring-primary/20' : 'border-outline-variant/30 text-on-surface hover:bg-surface-container hover:border-outline-variant/60'
                                }`}
                            >
                                <ArrowDownUp className="w-4 h-4 text-on-surface-variant" />
                                <span>
                                    {sortBy === 'default' && 'Ordenar'}
                                    {sortBy === 'name-asc' && 'Nombre A-Z'}
                                    {sortBy === 'name-desc' && 'Nombre Z-A'}
                                    {sortBy === 'rating-desc' && 'Mejor valorados'}
                                    {sortBy === 'price-asc' && 'Precio menor'}
                                </span>
                                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isSortMenuOpen ? 'rotate-180 text-primary' : 'text-on-surface-variant'}`} />
                            </button>
                            
                            {isSortMenuOpen && (
                                <div className="absolute right-0 top-[calc(100%+8px)] w-48 rounded-2xl border border-outline-variant/20 bg-surface p-2 shadow-[0_20px_50px_rgba(0,0,0,0.22)] z-[500] space-y-0.5">
                                    {[
                                        { id: 'default', label: 'Ordenar (Aleatorio)' },
                                        { id: 'name-asc', label: 'Nombre A-Z' },
                                        { id: 'name-desc', label: 'Nombre Z-A' },
                                        { id: 'rating-desc', label: 'Mejor valorados' },
                                        { id: 'price-asc', label: 'Precio menor' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => {
                                                setSortBy(opt.id as SortOption);
                                                setIsSortMenuOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                                                sortBy === opt.id 
                                                    ? 'bg-primary/10 text-primary font-bold' 
                                                    : 'text-on-surface-variant hover:bg-surface-container'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Botón Mostrar / Ocultar Mapa */}
                        <button
                            type="button"
                            onClick={() => {
                                if (isMapVisible) {
                                    setIsMapVisible(false);
                                } else {
                                    setIsMapVisible(true);
                                }
                            }}
                            className={`inline-flex h-12 items-center gap-2 rounded-2xl px-5 text-xs font-bold transition border cursor-pointer shadow-2xs ${
                                (isMapVisible || selectedDoctorId)
                                    ? 'bg-sky-600 text-white border-sky-500 shadow-md ring-2 ring-sky-300/40'
                                    : 'border-outline-variant/30 bg-surface text-on-surface hover:bg-surface-container hover:border-outline-variant/60'
                            }`}
                        >
                            <MapPin className={`w-4 h-4 ${(isMapVisible || selectedDoctorId) ? 'text-white' : 'text-sky-600'}`} />
                            <span>{(isMapVisible || selectedDoctorId) ? 'Ocultar mapa' : 'Mostrar mapa'}</span>
                        </button>
                    </div>
                </div>

                {/* Lista de Médicos */}
                <div className="w-full space-y-6">
                    {error ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            No fue posible cargar la lista de médicos.
                        </div>
                    ) : null}

                    <section id="doctores" className="space-y-5 relative z-0 min-h-[400px]">
                        <div className="flex flex-col lg:flex-row gap-6 items-start relative z-0">
                            {/* Left Column: Doctor Cards List */}
                            <div className={`w-full transition-all duration-300 ${(isMapVisible || selectedDoctorId) ? 'lg:w-[52%] xl:w-[48%] shrink-0' : 'w-full'}`}>
                                {searchedLocation && (
                                    <div className="flex items-center justify-between bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-4 py-2.5 rounded-2xl mb-4 shadow-xs">
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
                                ) : paginatedDoctors.length ? (
                                    <AnimatedList
                                        className={
                                            (isMapVisible || selectedDoctorId)
                                                ? "grid grid-cols-1 md:grid-cols-2 gap-4 w-full"
                                                : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 w-full"
                                        }
                                    >
                                        {paginatedDoctors.map((doctor) => (
                                            <DoctorCard
                                                key={doctor.doctor.exp_codigo}
                                                data={doctor}
                                                onVisit={handleDoctorVisit}
                                                onSelect={handleDoctorCardSelect}
                                                onSelectClinic={(idx) => setSelectedClinicIndex(idx)}
                                                selectedClinicIndex={selectedClinicIndex}
                                                variant={selectedDoctorId === doctor.doctor.exp_codigo ? 'expanded' : 'compact'}
                                                isHovered={hoveredDoctorId === doctor.doctor.exp_codigo}
                                                isSelected={selectedDoctorId === doctor.doctor.exp_codigo}
                                                onMouseEnter={() => setHoveredDoctorId(doctor.doctor.exp_codigo)}
                                                onMouseLeave={() => setHoveredDoctorId(null)}
                                            />
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
                            </div>

                            {/* Right Column: Sticky Interactive Google Map */}
                            {(isMapVisible || selectedDoctorId) && (
                                <div className="w-full lg:flex-1 h-[calc(100vh-170px)] sticky top-24 shrink-0 transition-all duration-300 animate-in fade-in zoom-in-95 duration-200 relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsMapVisible(false);
                                            setSelectedDoctorId(null);
                                        }}
                                        className="absolute top-4 right-4 z-20 px-3.5 py-1.5 rounded-full bg-slate-900/90 text-white font-bold text-xs shadow-xl hover:bg-slate-800 transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
                                    >
                                        <X className="w-3.5 h-3.5 text-rose-400" />
                                        <span>Ocultar mapa</span>
                                    </button>

                                    <DirectoryMap
                                        doctors={paginatedDoctors}
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
                                    />
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {/* Botón Flotante para Móvil: Toggle Mapa / Lista */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden">
                <button
                    type="button"
                    onClick={() => setShowMapMobile(!showMapMobile)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white font-bold text-xs shadow-2xl shadow-slate-950/40 hover:bg-slate-800 transition-all border border-slate-700 cursor-pointer"
                >
                    {showMapMobile ? (
                        <>
                            <List className="w-4 h-4 text-sky-400" />
                            <span>Ver lista</span>
                        </>
                    ) : (
                        <>
                            <MapPin className="w-4 h-4 text-sky-400" />
                            <span>Ver mapa</span>
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
