'use client';

import { Suspense, useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stethoscope, Search, X, ChevronLeft, ChevronRight, ArrowRight, ArrowLeft, Filter, MapPin } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { NeoLoader } from '@/components/neo-loader';
import { useDoctors } from '@/hooks/use-doctors';
import { DoctorCard, type DoctorCardData } from '@/components/doctor-card';
import { buildDoctorFullName, isDoctorActive } from '@/types/doctor';
import type { DoctorResponse } from '@/types';
import { AnimatedList } from '@/components/animated-list';
import { useParamString, useParamBoolean, useParamNumber, useResetParams } from '@/hooks/use-search-params-state';
import { useUIStore } from '@/stores/ui-store';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Directorio' },
  { href: '/dashboard/especialidades', label: 'Especialidades' },
  { href: '/dashboard/citas', label: 'Citas' },
  { href: '/dashboard/medicamentos', label: 'Medicamentos' },
];

type SortOption = 'name-asc' | 'name-desc' | 'services-desc';
const PRICE_LIMIT_MAX = 5000;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getDoctorPricePoints(doctor: DoctorResponse) {
  return [
    ...doctor.servicios.map((s) => s.syp_costo_total),
    ...doctor.clinicas.map((c) => c.mcl_precio_base),
  ].filter((price): price is number => typeof price === 'number' && Number.isFinite(price) && price >= 0);
}

function matchesPriceLimit(prices: number[], priceLimit: number) {
  if (priceLimit >= PRICE_LIMIT_MAX) return true;
  if (!prices.length) return false;
  return prices.some((price) => price <= priceLimit);
}

function mapToDoctorCardData(doctor: DoctorResponse): DoctorCardData {
  return {
    doctor,
    fullName: buildDoctorFullName(doctor) || 'Médico sin nombre',
    specialtyPreview: doctor.especialidades.map((e) => e.especialidad).filter(Boolean),
    modalityPreview: doctor.modalidades.map((m) => m.modalidad).filter(Boolean),
    locationPreview: Array.from(new Set([
        ...doctor.clinicas.map(c => [c.cli_descripcion, c.cli_zona ? `Zona ${c.cli_zona}` : ''].filter(Boolean).join(', ')).filter(Boolean),
        ...(doctor.atencion_domicilio || []).map(d => `Domicilio: ${[d.mun_descripcion, d.lad_zonas ? `Zonas ${d.lad_zonas}` : ''].filter(Boolean).join(', ')}`).filter(Boolean)
    ]))
  };
}

// ─── Carrusel de Médicos con Flechas ──────────────────────────────────────────

function DoctorCarousel({ doctors }: { doctors: DoctorCardData[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [doctors]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
    }
  };

  return (
    <div className="group/carousel relative -mx-4 px-4 sm:mx-0 sm:px-0">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.15)] backdrop-blur-md transition hover:scale-110 hover:bg-white sm:-left-6"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.15)] backdrop-blur-md transition hover:scale-110 hover:bg-white sm:-right-6"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {doctors.map((docData) => (
          <div
            key={docData.doctor.exp_codigo}
            className="w-full shrink-0 snap-start sm:w-full lg:w-[calc(50%-12px)] xl:w-[calc(50%-12px)]"
          >
            <DoctorCard data={docData} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Contenido Principal ──────────────────────────────────────────────────────

function EspecialidadesContent() {
  const { data: doctors = [], isLoading } = useDoctors();

  // Estados de Búsqueda y Filtro (Mismos que Directorio)
  const [searchTerm, setSearchTerm] = useParamString('q');
  const [locationTerm, setLocationTerm] = useParamString('location');
  const [sortBy, setSortBy] = useParamString('sort', 'name-asc') as [SortOption, (v: string) => void];
  const [showOnlyActive, setShowOnlyActive] = useParamBoolean('active');
  const [presencial, setPresencial] = useParamBoolean('presencial');
  const [telemedicina, setTelemedicina] = useParamBoolean('telemedicina');
  const [priceLimit, setPriceLimit] = useParamNumber('price', PRICE_LIMIT_MAX);
  const resetParams = useResetParams();
  
  const { isFiltersOpen, openFilters, closeFilters } = useUIStore();

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedSpecialty, setSelectedSpecialtyState] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSelectSpecialty = (specialty: string | null) => {
    setIsTransitioning(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setSelectedSpecialtyState(specialty);
      setIsTransitioning(false);
    }, 400);
  };

  const searchMenuRef = useRef<HTMLDivElement | null>(null);

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

  // Aplicar Filtros Globales a los doctores (Misma lógica que Directorio)
  const visibleDoctors = useMemo(() => {
    const normalizedLocation = normalizeText(locationTerm.trim());
    const hasModalityFilter = presencial || telemedicina;

    const filtered = doctors.filter((doc) => {
      const locationLabel = [doc.pais_nacimiento, doc.nacionalidad].filter(Boolean).join(' · ');
      const matchesLocation = !normalizedLocation || normalizeText(locationLabel).includes(normalizedLocation);
      const matchesActive = !showOnlyActive || isDoctorActive(doc);
      const doctorModalities = doc.modalidades.map((item) => normalizeText(item.modalidad));
      const matchesModality =
        !hasModalityFilter ||
        (presencial && doctorModalities.some((item) => item.includes('presencial'))) ||
        (telemedicina && doctorModalities.some((item) => item.includes('telemedicina') || item.includes('virtual')));
      const matchesPrice = matchesPriceLimit(getDoctorPricePoints(doc), priceLimit);

      return matchesLocation && matchesActive && matchesModality && matchesPrice;
    });

    // Ordenamiento
    return filtered.sort((a, b) => {
      const fullNameA = buildDoctorFullName(a) || '';
      const fullNameB = buildDoctorFullName(b) || '';
      if (sortBy === 'name-desc') return fullNameB.localeCompare(fullNameA, 'es');
      if (sortBy === 'services-desc') return b.servicios.length - a.servicios.length;
      return fullNameA.localeCompare(fullNameB, 'es');
    });
  }, [doctors, locationTerm, presencial, telemedicina, priceLimit, showOnlyActive, sortBy]);

  // Agrupar y ordenar médicos filtrados por especialidad principal
  const groupedDoctors = useMemo(() => {
    const groups: Record<string, DoctorCardData[]> = {};

    visibleDoctors.forEach((doc) => {
      const mainSpecialty = doc.especialidades[0]?.especialidad || 'Medicina General';
      if (!groups[mainSpecialty]) {
        groups[mainSpecialty] = [];
      }
      groups[mainSpecialty].push(mapToDoctorCardData(doc));
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (sortBy === 'name-desc') {
        return b.localeCompare(a, 'es');
      }
      if (sortBy === 'services-desc') {
        const servicesA = groups[a].reduce((sum, doc) => sum + doc.doctor.servicios.length, 0);
        const servicesB = groups[b].reduce((sum, doc) => sum + doc.doctor.servicios.length, 0);
        return servicesB - servicesA;
      }
      return a.localeCompare(b, 'es');
    });

    return sortedKeys.map((specialty) => ({
      specialty,
      doctors: groups[specialty],
    }));
  }, [visibleDoctors, sortBy]);

  // Sugerencias de búsqueda (solo nombres de especialidades)
  const searchSuggestions = useMemo(() => {
    // Si no hay término, mostramos todas (o podríamos mostrar un top)
    if (!searchTerm.trim()) return groupedDoctors.map((g) => g.specialty);
    const normalizedQuery = normalizeText(searchTerm.trim());
    return groupedDoctors
      .map((g) => g.specialty)
      .filter((s) => normalizeText(s).includes(normalizedQuery));
  }, [groupedDoctors, searchTerm]);

  if (isLoading && !doctors.length) {
    return <NeoLoader />;
  }

  // Vista en transición (Loader)
  if (isTransitioning) {
    return (
      <div className="min-h-screen text-slate-900 pb-20">
        <Navbar subtitle="Especialidades médicas" navLinks={NAV_LINKS} backHref={selectedSpecialty ? "/dashboard/especialidades" : undefined} />
        <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <div className="flex h-[400px] flex-col items-center justify-center">
            <div className="h-20 w-20 animate-spin rounded-full border-8 border-slate-200 border-t-sky-600" />
          </div>
        </main>
      </div>
    );
  }

  // Vista Detallada (Grid de todos los médicos de una especialidad)
  if (selectedSpecialty) {
    const group = groupedDoctors.find((g) => g.specialty === selectedSpecialty);
    const docs = group?.doctors || [];

    return (
      <div className="min-h-screen text-slate-900 pb-20">
        <Navbar subtitle="Especialidades médicas" navLinks={NAV_LINKS} backHref="/dashboard/especialidades" />
        
        <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleSelectSpecialty(null)}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
                  aria-label="Volver a todas las especialidades"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900">{selectedSpecialty}</h1>
              </div>
              <span className="rounded-full bg-sky-50 px-4 py-1.5 text-sm font-bold text-sky-700">
                {docs.length} {docs.length === 1 ? 'médico' : 'médicos'}
              </span>
            </div>
          </div>

          <AnimatedList className="grid gap-6 lg:grid-cols-2 xl:grid-cols-2">
            {docs.map((docData) => (
              <DoctorCard key={docData.doctor.exp_codigo} data={docData} />
            ))}
          </AnimatedList>
        </main>
      </div>
    );
  }

  // Vista General (Filtros Globales + Carruseles por Especialidad)
  return (
    <div className="min-h-screen text-slate-900 pb-20">
      <Navbar subtitle="Especialidades médicas" navLinks={NAV_LINKS} />

      <div className="mx-auto w-[90%] max-w-[1800px] mt-8">
        
        {/* Barra superior de filtros e inputs */}
        <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <button
            type="button"
            onClick={() => isFiltersOpen ? closeFilters() : openFilters()}
            className={`inline-flex h-18 items-center gap-2 rounded-2xl border px-5 py-4 text-sm font-semibold transition ${
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
                Buscar por especialidad
            </label>
            <div className="flex items-center gap-3">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <div className="relative min-w-0 flex-1">
                <input
                  id="searchTerm"
                  type="text"
                  value={searchTerm}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  placeholder="Ej. Cardiología, Pediatría..."
                  className="w-full bg-transparent pr-10 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setIsSearchFocused(true);
                      handleSelectSpecialty(null);
                    }}
                    className="absolute right-0 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Suggestions Dropdown (Especialidades) */}
            <AnimatePresence>
              {isSearchFocused && searchSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 right-0 top-full z-40 mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.15)]"
                >
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                      Especialidades Disponibles
                    </p>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {searchSuggestions.map((specialty) => (
                      <button
                        key={specialty}
                        onClick={() => {
                          setIsSearchFocused(false);
                          setSearchTerm('');
                          handleSelectSpecialty(specialty);
                        }}
                        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-sky-50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                          <Stethoscope className="h-5 w-5" />
                        </div>
                        <span className="font-semibold text-slate-700">{specialty}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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

        {/* Layout Principal: Sidebar de Filtros + Contenido */}
        <div className={`py-8 grid items-start gap-8 ${isFiltersOpen ? 'lg:grid-cols-[300px_1fr]' : 'grid-cols-1'}`}>
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

          {/* Carruseles por Especialidad */}
          <div className="min-w-0 space-y-16">
            {groupedDoctors.map((group) => {
              const normalizedQuery = normalizeText(searchTerm.trim());
              if (normalizedQuery && !normalizeText(group.specialty).includes(normalizedQuery)) {
                return null;
              }

              return (
                <section key={group.specialty} className="relative">
                  <div className="mb-6 flex items-baseline justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        {group.specialty}
                      </h2>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 hidden sm:inline-block">
                        {group.doctors.length} {group.doctors.length === 1 ? 'médico' : 'médicos'}
                      </span>
                    </div>
                    
                    {/* Botón Ver Todos */}
                    <button
                      onClick={() => handleSelectSpecialty(group.specialty)}
                      className="group flex items-center gap-1.5 text-sm font-bold text-sky-600 transition hover:text-sky-700"
                    >
                      Ver todos
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </button>
                  </div>

                  <DoctorCarousel doctors={group.doctors} />
                </section>
              );
            })}

            {groupedDoctors.length === 0 && !isLoading && (
              <div className="rounded-4xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <h4 className="text-2xl font-black tracking-tight text-slate-900">Sin especialistas</h4>
                <p className="mx-auto mt-2 max-w-xl text-slate-600">
                  No se encontraron médicos que coincidan con los filtros actuales.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EspecialidadesPage() {
  return (
    <Suspense fallback={<NeoLoader />}>
      <EspecialidadesContent />
    </Suspense>
  );
}
