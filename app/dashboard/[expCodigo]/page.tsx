'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  Phone,
  Sparkles,
  CalendarDays,
  ShieldCheck,
  Heart,
  Share2,
  Mail,
  Video,
  Home,
  Star,
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  X,
  FileText,
  Navigation,
  CheckCircle2,
  Building2,
  Activity,
  Layers,
  ChevronRight,
  ChevronDown,
  UserCheck,
  Stethoscope,
  Clock,
  Award,
  CreditCard,
  Building,
  Languages,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DoctorClinica, DoctorClinicaHorario, DoctorResponse } from '@/types';
import { buildDoctorFullName, getDoctorPriceDisplay, cleanZonaText } from '@/types/doctor';
import { NeoLoader } from '@/components/neo-loader';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { addRecentDoctor } from '@/lib/recent-doctors';
import { useFavoritos, useAddFavorito, useRemoveFavorito } from '@/hooks/use-favoritos';
import { usePacienteTitular } from '@/hooks/use-pacientes';
import { DoctorReviews } from '@/components/doctor-reviews';

// --- Helper Functions ---

function getSocialIcon(name: string, className = "h-4 w-4") {
  const network = name.trim().toLowerCase();
  switch (network) {
    case 'whatsapp':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case 'x/twitter':
    case 'x':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
        </svg>
      );
    default:
      return null;
  }
}

function formatMoney(value: number | null) {
  if (value === null || Number.isNaN(value)) return '0.00';
  return new Intl.NumberFormat('es-GT', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatClinicSchedule(horarios: DoctorClinicaHorario[]) {
  if (!horarios || horarios.length === 0) return null;
  const dayMap: Record<number, string> = {
    1: 'Lun',
    2: 'Mar',
    3: 'Mié',
    4: 'Jue',
    5: 'Vie',
    6: 'Sáb',
    7: 'Dom',
    0: 'Dom',
  };

  const first = horarios[0];
  const startHour = first.hor_hora_inicio ? first.hor_hora_inicio.slice(0, 5) : '';
  const endHour = first.hor_hora_fin ? first.hor_hora_fin.slice(0, 5) : '';

  const daysSet = Array.from(new Set(horarios.map(h => h.hor_dia_semana))).sort();
  const isWeekdays = daysSet.length === 5 && daysSet.every(d => d >= 1 && d <= 5);
  const isMonToSat = daysSet.length === 6 && daysSet.every(d => d >= 1 && d <= 6);

  if (isWeekdays) {
    return `Lunes a Viernes · ${startHour} a ${endHour} hrs`;
  }
  if (isMonToSat) {
    return `Lunes a Sábado · ${startHour} a ${endHour} hrs`;
  }

  const daysLabels = daysSet.map(d => dayMap[d] || `Día ${d}`);
  return `${daysLabels.join(', ')} · ${startHour} a ${endHour} hrs`;
}

function buildClinicQuery(clinic: DoctorClinica | null, doctorName: string) {
  if (!clinic) return '';
  const parts = [clinic.cli_descripcion, clinic.cli_direccion_completa, doctorName].filter(Boolean);
  return parts.join(', ');
}

function buildMapsLinks(clinic: DoctorClinica | null, query: string) {
  if (!query && !clinic) return { googleMapsHref: '', wazeHref: '' };

  const hasCoords = clinic?.cli_latitud != null && clinic?.cli_longitud != null;
  if (hasCoords) {
    const lat = clinic!.cli_latitud;
    const lng = clinic!.cli_longitud;
    return {
      googleMapsHref: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      wazeHref: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
    };
  }

  const encodedQuery = encodeURIComponent(query);
  return {
    googleMapsHref: clinic?.cli_url_google_maps || `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`,
    wazeHref: clinic?.cli_url_waze || `https://waze.com/ul?q=${encodedQuery}&navigate=yes`,
  };
}

function buildRecentDoctorItem(doctor: DoctorResponse, fullName: string) {
  const spec = doctor.exp_profesion || doctor.especialidades?.[0]?.especialidad || 'Especialidad médica';
  const loc = doctor.clinicas?.[0]?.cli_descripcion || [doctor.pais_nacimiento, doctor.nacionalidad].filter(Boolean).join(' · ') || 'Guatemala';
  return {
    exp_codigo: doctor.exp_codigo,
    fullName,
    specialty: spec,
    locationLabel: loc,
    image: doctor.exp_foto_perfil,
    visitedAt: new Date().toISOString(),
  };
}

type DrawerKey = 'servicios' | 'resenas' | 'trayectoria' | 'seguros' | 'galeria' | null;

interface ServiceIntent {
  motivo: string;
  precio: number | null;
  sypCodigo?: number | null;
}

const symptomColors = [
  'bg-blue-600',
  'bg-indigo-600',
  'bg-violet-600',
  'bg-sky-500',
  'bg-emerald-600',
  'bg-amber-600',
];

function DoctorProfileContent() {
  const params = useParams<{ expCodigo: string }>();
  const router = useRouter();
  const expCodigo = params.expCodigo;

  const { data: doctor, isLoading, error } = useDoctorByCode(expCodigo);
  const [selectedClinicTab, setSelectedClinicTab] = useState<number | 'domicilio'>(0);
  const [activeDrawer, setActiveDrawer] = useState<DrawerKey>(null);
  const [selectedServiceIntent, setSelectedServiceIntent] = useState<ServiceIntent | null>(null);
  const [selectedService, setSelectedService] = useState<DoctorResponse['servicios'][number] | null>(null);
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (doctor?.servicios && doctor.servicios.length > 0) {
      setSelectedService(prev => prev || doctor.servicios[0]);
    }
  }, [doctor]);

  const { titular } = usePacienteTitular();
  const codPac = titular?.pac_codigo;
  const { data: favoritos = [] } = useFavoritos(codPac);
  const addFavMutation = useAddFavorito();
  const removeFavMutation = useRemoveFavorito();
  const isFavorito = favoritos.some(f => f.expCodigo === expCodigo);

  const fullName = useMemo(() => (doctor ? buildDoctorFullName(doctor) : ''), [doctor]);

  useEffect(() => {
    if (doctor) {
      addRecentDoctor(buildRecentDoctorItem(doctor, buildDoctorFullName(doctor)));
    }
  }, [doctor]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!codPac) {
      showToast('Inicia sesión para guardar especialistas favoritos');
      return;
    }
    if (isFavorito) {
      removeFavMutation.mutate({ codPac, codDoc: expCodigo });
      showToast('Especialista removido de tus favoritos');
    } else {
      addFavMutation.mutate({ codPac, codDoc: expCodigo });
      showToast('Especialista guardado en tus favoritos');
    }
  };

  const handleShare = async () => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareTitle = `${fullName || 'Médico Especialista'} - SaludYa`;
    const shareText = `Conoce el perfil médico de ${fullName || 'este especialista'} en SaludYa.`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: currentUrl,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      showToast('Enlace al perfil médico copiado al portapapeles');
    } else {
      showToast('Enlace listo para compartir');
    }
  };

  const handleScheduleService = (serviceName: string, price: number | null, sypCodigo?: number | null) => {
    setSelectedServiceIntent({ motivo: serviceName, precio: price, sypCodigo });
    const query = new URLSearchParams();
    query.set('motivo', serviceName);
    if (sypCodigo) query.set('sypCodigo', String(sypCodigo));
    if (price) query.set('precio', String(price));
    router.push(`/dashboard/agendar/${doctor?.exp_codigo}?${query.toString()}`);
  };

  const handleSelectServiceAndOpenDrawer = (srv?: DoctorResponse['servicios'][0]) => {
    if (srv) {
      setSelectedService(srv);
    }
    setActiveDrawer('servicios');
  };

  if (isLoading || !doctor) {
    return <NeoLoader />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="text-center max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <X className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Error al cargar el perfil</h2>
          <p className="mt-2 text-sm text-slate-500">{error.message}</p>
          <Link
            href="/dashboard/directorio"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Directorio
          </Link>
        </div>
      </div>
    );
  }

  // --- Real Data Processing ---
  const primaryClinic = doctor.clinicas?.[0] ?? null;
  const priceInfo = getDoctorPriceDisplay(doctor);
  const validStartingPrice = priceInfo.hasPrice ? priceInfo.price : null;

  // Real specialties
  const realSpecialties = doctor.especialidades && doctor.especialidades.length > 0
    ? doctor.especialidades.map(e => e.especialidad)
    : [doctor.exp_profesion].filter(Boolean) as string[];
  const mainSpecialty = realSpecialties[0] || doctor.exp_profesion || 'Médico Especialista';
  const otherSpecialties = realSpecialties.slice(1);

  // Real Trajectory items
  const trajectoryItems = [
    ...doctor.educacion.map(edu => ({
      type: 'Educación Formal',
      title: edu.edu_titulo_obtenido,
      inst: edu.edu_institucion,
      detail: [edu.pais, edu.edu_anio_inicio && edu.edu_anio_fin ? `${edu.edu_anio_inicio} - ${edu.edu_anio_fin}` : null].filter(Boolean).join(' · '),
    })),
    ...doctor.cursos.map(cur => ({
      type: cur.tipo_curso || 'Curso / Certificación',
      title: cur.cur_titulo_obtenido,
      inst: cur.cur_institucion,
      detail: [cur.pais, cur.cur_anio ? `Año ${cur.cur_anio}` : null].filter(Boolean).join(' · '),
    })),
    ...doctor.reconocimientos.map(rec => ({
      type: 'Reconocimiento',
      title: rec.descripcion,
      inst: rec.institucion,
      detail: rec.anio ? `Año ${rec.anio}` : '',
    })),
  ];

  // Real photos
  const realPhotos = doctor.fotos_trabajo && doctor.fotos_trabajo.length > 0
    ? doctor.fotos_trabajo.map(f => f.url)
    : [];

  // Real Reviews
  const realReviews = doctor.resenas && doctor.resenas.length > 0 ? doctor.resenas : [];
  const latestReview = realReviews[0] || null;
  const hasReviews = Boolean(doctor.total_resenas && doctor.total_resenas > 0);

  // Real Symptoms
  const realSymptoms = doctor.sintomas && doctor.sintomas.length > 0
    ? doctor.sintomas.map(s => s.sintoma)
    : [];

  // Real Services
  const realServices = doctor.servicios && doctor.servicios.length > 0 ? doctor.servicios : [];

  // Real In-home care
  const hasAtencionDomicilio = doctor.atencion_domicilio && doctor.atencion_domicilio.length > 0;

  // Selected clinic calculation
  const activeClinic = typeof selectedClinicTab === 'number'
    ? (doctor.clinicas[selectedClinicTab] || primaryClinic)
    : null;
  const isDomicilioActive = selectedClinicTab === 'domicilio';

  const clinicQuery = activeClinic ? buildClinicQuery(activeClinic, fullName) : '';
  const { googleMapsHref, wazeHref } = buildMapsLinks(activeClinic, clinicQuery);
  const activeClinicSchedule = activeClinic ? formatClinicSchedule(activeClinic.horarios_atencion) : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased pb-24 lg:pb-12 relative overflow-hidden">
      
      {/* Header Gradient: Tinte celeste médico ultra sutil en la parte superior que se desvanece suavemente hacia abajo */}
      <div className="absolute top-0 inset-x-0 h-[520px] bg-gradient-to-b from-blue-50/50 via-blue-50/20 to-transparent dark:from-blue-950/25 dark:via-blue-950/5 dark:to-transparent pointer-events-none" />

      {/* Bento Grid Container con límites responsivos definidos y mayor aprovechamiento del ancho */}
      <div className="relative z-10 w-full max-w-full sm:max-w-3xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-7">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6 xl:gap-7 items-stretch">

          {/* ========================================================================= */}
          {/* 1. Cabecera (Hero) y Agendamiento Rápido (col-span-12)                    */}
          {/* ========================================================================= */}
          <section className="col-span-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 shadow-sm hover:shadow-md relative overflow-hidden transition-all">
            
            {/* Main Hero Content (Grid de 12 Columnas: 3 Foto, 5 Info, 4 Agendar) */}
            <div className="grid grid-cols-12 gap-5 lg:gap-6 xl:gap-7 items-stretch">
              
              {/* 1. Foto del médico (col-span-12 min-[440px]:col-span-4 lg:col-span-3) */}
              <div className="col-span-12 min-[440px]:col-span-4 lg:col-span-3 relative h-64 min-[440px]:h-full min-h-[260px] self-stretch rounded-2xl overflow-hidden shadow-md bg-slate-100 dark:bg-slate-800 ring-1 ring-black/[0.06] dark:ring-white/10 group">
                {/* Botón Volver al Directorio (solo 1 flecha) en la esquina superior izquierda de la foto */}
                <Link
                  href="/dashboard/directorio"
                  aria-label="Volver al Directorio"
                  className="absolute top-2.5 left-2.5 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-md flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all z-20 group"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-slate-300 group-hover:-translate-x-0.5 transition-transform" />
                </Link>

                {doctor.exp_foto_perfil ? (
                  <Image
                    src={doctor.exp_foto_perfil}
                    alt={fullName}
                    fill
                    sizes="(min-width: 1280px) 340px, (min-width: 640px) 260px, 160px"
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl sm:text-5xl font-bold text-slate-300 dark:text-slate-700">
                    {fullName.charAt(0)}
                  </div>
                )}

                {/* Estado en línea */}
                <div className="absolute bottom-2.5 left-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 ring-1 ring-black/[0.08] dark:ring-white/10 z-10">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-emerald-700 dark:text-emerald-400 uppercase font-bold text-[10px] tracking-wider">
                    {doctor.exp_estado === 'A' ? 'En Línea' : 'Disponible'}
                  </span>
                </div>
              </div>

              {/* 2. Columna de Información (col-span-12 min-[440px]:col-span-8 lg:col-span-5) */}
              <div className="col-span-12 min-[440px]:col-span-8 lg:col-span-5 flex flex-col justify-between h-full @container text-left min-w-0">
                <div className="space-y-2">
                  
                  {/* Fila superior: Insignias a la izquierda + Compartir y Favorito incorporados a la derecha */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {doctor.exp_colegiado_gt && (
                        <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                          Col. GT #{doctor.exp_colegiado_gt}
                        </span>
                      )}
                      {doctor.exp_anios_experiencia ? (
                        <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                          {doctor.exp_anios_experiencia} Años Exp.
                        </span>
                      ) : null}
                      {(cleanZonaText(primaryClinic?.cli_zona) || doctor.nacionalidad) && (
                        <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          {cleanZonaText(primaryClinic?.cli_zona) || doctor.nacionalidad}
                        </span>
                      )}
                    </div>

                    {/* Botones Compartir y Favoritos */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        aria-label="Compartir perfil"
                        onClick={handleShare}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center justify-center active:scale-95 cursor-pointer shadow-2xs"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Guardar especialista"
                        onClick={toggleFavorite}
                        className={`w-8 h-8 rounded-full transition-all flex items-center justify-center active:scale-95 cursor-pointer shadow-2xs ${
                          isFavorito
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isFavorito ? 'fill-rose-600 text-rose-600' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Nombre */}
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight line-clamp-2">
                    {fullName}
                  </h1>

                  {/* Especialidades Médicas */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {realSpecialties.map((esp, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all shadow-2xs ${
                          idx === 0
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60'
                            : 'bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60'
                        }`}
                      >
                        <Stethoscope className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{esp}</span>
                      </span>
                    ))}
                  </div>

                  {/* Bio Presentación con clamp inteligente */}
                  {doctor.exp_presentacion && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 @[500px]:line-clamp-3">
                      {doctor.exp_presentacion}
                    </p>
                  )}

                  {/* Reseñas, Edad e Idiomas */}
                  <div className="pt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                    {hasReviews && (
                      <button
                        type="button"
                        onClick={() => setActiveDrawer('resenas')}
                        className="inline-flex items-center gap-1.5 bg-slate-100/90 hover:bg-slate-200/90 dark:bg-slate-800/90 dark:hover:bg-slate-700/90 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95"
                        title="Ver reseñas en el panel lateral"
                      >
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="font-bold">{doctor.promedio_valoracion > 0 ? doctor.promedio_valoracion.toFixed(1) : '5.0'}</span>
                        {doctor.total_resenas > 0 && (
                          <span className="text-slate-500 font-normal">({doctor.total_resenas})</span>
                        )}
                      </button>
                    )}

                    <div className="inline-flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/90 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-slate-500">Edad:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {doctor.exp_edad_minima_atencion !== null
                          ? (doctor.exp_edad_minima_atencion === 0 ? 'Recién nacidos' : `+${doctor.exp_edad_minima_atencion}a`)
                          : 'Todas'}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/90 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
                      <Languages className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-slate-500">Idiomas:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {doctor.idiomas && doctor.idiomas.length > 0
                          ? doctor.idiomas.map(i => i.idioma).join(', ')
                          : 'Español'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botones de contacto en grid compacto en la base de la columna con nombres siempre presentes */}
                <div className="grid grid-cols-2 sm:grid-cols-3 @[480px]:grid-cols-4 @[620px]:grid-cols-5 gap-2 mt-auto pt-3">
                  {doctor.exp_telefono1 ? (
                    <a
                      href={`https://wa.me/${doctor.exp_telefono1.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, quisiera consultar información sobre cita con ${fullName}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 p-2 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/40 hover:bg-emerald-100/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-2xs"
                    >
                      {getSocialIcon('whatsapp', 'w-4 h-4 text-emerald-600 shrink-0')}
                      <span className="truncate">WhatsApp</span>
                    </a>
                  ) : null}

                  {doctor.exp_telefono1 ? (
                    <a
                      href={`tel:${doctor.exp_telefono1}`}
                      className="flex items-center justify-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 shadow-2xs"
                    >
                      <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate">Llamar</span>
                    </a>
                  ) : null}

                  {doctor.exp_email ? (
                    <a
                      href={`mailto:${doctor.exp_email}`}
                      className="flex items-center justify-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 shadow-2xs"
                    >
                      <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="truncate">Correo</span>
                    </a>
                  ) : null}

                  {doctor.redes_sociales && doctor.redes_sociales.length > 0 && doctor.redes_sociales.map((item) => (
                    <a
                      key={`${item.red_social}-${item.url}`}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      title={item.red_social}
                      className="flex items-center justify-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 shadow-2xs"
                    >
                      {getSocialIcon(item.red_social, "w-4 h-4 shrink-0")}
                      <span className="truncate capitalize">{item.red_social}</span>
                    </a>
                  ))}
                </div>

              </div>

              {/* 3. Tarjeta de Agendamiento (col-span-12 lg:col-span-4) con Aceleradores de Conversión */}
              <div className="col-span-12 lg:col-span-4 flex flex-col justify-stretch">
                <div className="bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-5 sm:p-6 xl:p-7 flex flex-col justify-between space-y-4 h-full shadow-2xs">
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      TARIFA DE CONSULTA
                    </span>
                    <div className="flex items-baseline justify-center sm:justify-start gap-1">
                      <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {validStartingPrice !== null && validStartingPrice > 0
                          ? `Desde Q${formatMoney(validStartingPrice)}`
                          : (selectedService?.syp_costo_total != null && selectedService.syp_costo_total > 0
                            ? `Q${formatMoney(selectedService.syp_costo_total)}`
                            : 'Tarifa a convenir')}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 block truncate">
                      {doctor.modalidades && doctor.modalidades.length > 0
                        ? `Atención ${doctor.modalidades.map(m => m.modalidad.toLowerCase()).join(' o ')}`
                        : 'Por sesión médica integral'}
                    </span>
                  </div>

                  {/* Aceleradores de Conversión */}
                  <div className="space-y-2 py-3 border-y border-slate-200/70 dark:border-slate-700/70 text-xs">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                      <span className="text-slate-500 dark:text-slate-400">Próximo turno:</span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">Disponible hoy a las 15:30 hrs</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="text-amber-500 shrink-0">⚡</span>
                      <span className="text-slate-500 dark:text-slate-400">Tiempo de respuesta:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Suele responder en 10 min</span>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <Link
                      href={`/dashboard/agendar/${doctor.exp_codigo}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full rounded-xl py-3 flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md cursor-pointer"
                    >
                      <span>Agendar Cita Ahora</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>

                    <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Factura FEL</span>
                      </div>
                      {realServices.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveDrawer('servicios')}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                        >
                          Ver servicios ({realServices.length})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* ========================================================================= */}
          {/* 2. Enfoque & Población (col-span-12 sm:col-span-6 lg:col-span-4)          */}
          {/* ========================================================================= */}
          <section className="col-span-12 sm:col-span-6 lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 xl:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h2 className="text-[17px] text-slate-900 dark:text-white font-bold tracking-tight">
                  Enfoque & Población
                </h2>
              </div>
              
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4 mt-3">
                {doctor.exp_presentacion ||
                  'Evaluación y tratamiento integral fundamentado en diagnóstico clínico personalizado y seguimiento médico.'}
              </p>

              {/* Datos Clave en recuadros gris claro con íconos azules */}
              <div className="space-y-2">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-2 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-blue-500 shadow-2xs flex-shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Edades de Atención
                    </span>
                    <span className="text-xs text-slate-500">
                      {doctor.exp_edad_minima_atencion !== null
                        ? (doctor.exp_edad_minima_atencion === 0 ? 'Desde recién nacidos' : `A partir de ${doctor.exp_edad_minima_atencion} años`)
                        : 'Todas las edades'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-2 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-blue-500 shadow-2xs flex-shrink-0">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Especialidad Médica
                    </span>
                    <span className="text-xs text-slate-500">
                      {realSpecialties.join(' · ') || mainSpecialty}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Atención integral</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">Perfil verificado</span>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 3. Síntomas Atendidos (col-span-12 sm:col-span-6 lg:col-span-4)            */}
          {/* ========================================================================= */}
          <section className="col-span-12 sm:col-span-6 lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 xl:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h2 className="text-[17px] text-slate-900 dark:text-white font-bold tracking-tight">
                    Síntomas Atendidos
                  </h2>
                </div>
                {realSymptoms.length > 0 && (
                  <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full">
                    {realSymptoms.length} Motivos
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 mt-2.5 mb-3">
                {realSymptoms.length > 0
                  ? 'Motivos de consulta clínica y síntomas frecuentes evaluados:'
                  : 'Consulte directamente al especialista para la evaluación de su caso.'}
              </p>

              {/* Lista (Píldoras con puntito azul) */}
              {realSymptoms.length > 0 ? (
                <div className="flex flex-wrap">
                  {realSymptoms.map((sym) => (
                    <span
                      key={sym}
                      className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300 inline-block mr-2 mb-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block mr-2"></span>
                      {sym}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center text-xs text-slate-500">
                  Sin síntomas específicos registrados en el expediente.
                </div>
              )}
            </div>

            {/* Botón Ver más en la esquina inferior derecha */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setActiveDrawer('servicios')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Ver más</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 4. Modalidades de Consulta (col-span-12 sm:col-span-12 lg:col-span-4)       */}
          {/* ========================================================================= */}
          <section className="col-span-12 sm:col-span-12 lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 xl:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h2 className="text-[17px] text-slate-900 dark:text-white font-bold tracking-tight">
                    Modalidades de Consulta
                  </h2>
                </div>
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
                  Disponibles
                </span>
              </div>

              {/* Visualización de Modalidades con íconos */}
              <div className="space-y-3 mt-3">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block mb-2">
                    Modalidades de Atención
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {doctor.modalidades && doctor.modalidades.length > 0 ? (
                      doctor.modalidades.map((mod, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-200/60 dark:border-slate-700/60"
                        >
                          {mod.modalidad.toLowerCase().includes('virtual') || mod.modalidad.toLowerCase().includes('telemedicina') ? (
                            <Video className="w-3.5 h-3.5 text-blue-500" />
                          ) : mod.modalidad.toLowerCase().includes('domicilio') ? (
                            <Home className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                          {mod.modalidad}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">Consulta Presencial en Clínica</span>
                    )}
                  </div>
                </div>

                {/* Tipos de Cita con check verde */}
                {doctor.tipos_consulta && doctor.tipos_consulta.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block mb-2">
                      Tipos de Cita Aceptadas
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {doctor.tipos_consulta.map((tc, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium truncate"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span className="truncate">{tc.tipo_consulta}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Botón Ver catálogo en la esquina inferior derecha */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Presencial y virtual</span>
              <button
                type="button"
                onClick={() => setActiveDrawer('servicios')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Ver catálogo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 5. Servicios & Tarifas (col-span-12 lg:col-span-7 xl:col-span-7)           */}
          {/* ========================================================================= */}
          <section className="col-span-12 lg:col-span-7 xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-7 xl:p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <h2 className="text-[18px] text-slate-900 dark:text-white font-bold tracking-tight">
                    Servicios & Tarifas
                  </h2>
                </div>
                <span className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 font-medium px-3 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sin cobros ocultos
                </span>
              </div>

              {/* Lista Desglosada Clickeable */}
              <div className="space-y-2.5 mt-3.5">
                {realServices.length > 0 ? (
                  realServices.map((srv, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectServiceAndOpenDrawer(srv)}
                      className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3.5 sm:p-4 mb-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Ver detalles en el panel lateral"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <span className="text-[13px] sm:text-sm font-bold text-slate-900 dark:text-white block truncate">
                          {srv.servicio}
                        </span>
                        {srv.syp_observaciones && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {srv.syp_observaciones}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <span className="font-black text-slate-900 dark:text-white text-[15px] sm:text-base">
                          {srv.syp_costo_total ? `Q${formatMoney(srv.syp_costo_total)}` : 'Q0.00'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    onClick={() => setActiveDrawer('servicios')}
                    className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 mb-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Ver catálogo en el panel lateral"
                  >
                    <div>
                      <span className="text-[13px] sm:text-sm font-bold text-slate-900 dark:text-white block">
                        Consulta Médica General / Especializada
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5 block">
                        Atención médica según tarifa base de la clínica seleccionada.
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span className="font-black text-slate-900 dark:text-white text-[15px]">
                        {validStartingPrice !== null && validStartingPrice > 0 ? `Desde Q${formatMoney(validStartingPrice)}` : 'A consultar'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Botón Ver catálogo completo en la esquina inferior derecha */}
            <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Facturación FEL deducible de impuestos</span>
              {realServices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveDrawer('servicios')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver catálogo completo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 6. Sedes de Atención (col-span-12 lg:col-span-5 xl:col-span-5)             */}
          {/* ========================================================================= */}
          <section className="col-span-12 lg:col-span-5 xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-7 xl:p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h2 className="text-[17px] sm:text-[18px] text-slate-900 dark:text-white font-bold tracking-tight shrink-0">
                    Sedes de Atención
                  </h2>
                </div>

                {/* Dropdown selector estilo Notion/Vercel (elimina scrollbar nativo) */}
                {(doctor.clinicas.length > 1 || hasAtencionDomicilio) ? (
                  <div className="relative shrink-0 max-w-[210px] sm:max-w-[240px]">
                    <select
                      value={String(selectedClinicTab)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedClinicTab(val === 'domicilio' ? 'domicilio' : Number(val));
                      }}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 rounded-xl pl-3 pr-8 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer truncate max-w-full shadow-2xs appearance-none"
                    >
                      {doctor.clinicas.map((cli, index) => (
                        <option key={index} value={String(index)}>
                          {cli.cli_descripcion ? `${cli.cli_descripcion.split('·')[0].trim()}${index === 0 ? ' (Principal)' : ''}` : `Sede ${index + 1}`}
                        </option>
                      ))}
                      {hasAtencionDomicilio && (
                        <option value="domicilio">🏠 Atención a Domicilio</option>
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 font-medium shrink-0">
                    {cleanZonaText(primaryClinic?.cli_zona) || 'Guatemala'}
                  </span>
                )}
              </div>

              {/* Detalle de la sede seleccionada */}
              <div className="mt-4">

              {/* Detalle de la clínica */}
              {!isDomicilioActive && activeClinic ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {activeClinic.cli_descripcion || 'Clínica Registrada'}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {activeClinic.cli_direccion_completa || 'Dirección no especificada'}
                      </p>
                      {activeClinic.cli_zona && (
                        <p className="text-xs text-slate-400">
                          {cleanZonaText(activeClinic.cli_zona)}, Guatemala
                        </p>
                      )}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold shrink-0">
                      {activeClinic.mcl_precio_base != null && activeClinic.mcl_precio_base > 0
                        ? `Q${formatMoney(activeClinic.mcl_precio_base)}`
                        : 'Tarifa base'}
                    </span>
                  </div>

                  {activeClinicSchedule && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{activeClinicSchedule}</span>
                    </div>
                  )}
                </div>
              ) : hasAtencionDomicilio ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Atención Médica a Domicilio
                  </h3>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1.5 text-xs">
                    {doctor.atencion_domicilio.map((dom, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <span>{[dom.mun_descripcion, dom.dep_descripcion].filter(Boolean).join(', ')}: {dom.lad_zonas || 'Toda la región'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              </div>
            </div>

            {/* Botones Waze/Maps: Mitad y mitad en la parte inferior */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <a
                href={wazeHref || `https://waze.com/ul?q=${encodeURIComponent(clinicQuery)}`}
                target="_blank"
                rel="noreferrer"
                className="w-1/2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl py-2 flex justify-center items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 text-blue-500" />
                <span>Waze</span>
              </a>

              <a
                href={googleMapsHref || `https://maps.google.com/?q=${encodeURIComponent(clinicQuery)}`}
                target="_blank"
                rel="noreferrer"
                className="w-1/2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl py-2 flex justify-center items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span>Google Maps</span>
              </a>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 7. Pagos y Cobertura                                                      */}
          {/* ========================================================================= */}
          <section
            onClick={() => setActiveDrawer('seguros')}
            className={`col-span-12 ${hasReviews ? 'sm:col-span-6 lg:col-span-3' : 'sm:col-span-4 lg:col-span-4'} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 xl:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 cursor-pointer`}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-500">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm text-slate-900 dark:text-white font-bold">
                    Pagos y Cobertura
                  </h3>
                </div>
                {doctor.aseguradoras && doctor.aseguradoras.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold">
                    {doctor.aseguradoras.length} Seguros
                  </span>
                )}
              </div>

              {/* Aseguradoras: Lista sencilla con viñetas */}
              {doctor.aseguradoras && doctor.aseguradoras.length > 0 ? (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-slate-500 mb-1">Aseguradoras:</p>
                  <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    {doctor.aseguradoras.slice(0, 3).map((asg, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                        <span className="truncate">{asg.aseguradora}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-2">
                  Facturación FEL para trámite de reembolso médico.
                </p>
              )}

              {/* Métodos de Pago: Etiquetas grises pequeñas */}
              {doctor.metodos_pago && doctor.metodos_pago.length > 0 && (
                <div className="pt-2">
                  <div className="flex flex-wrap">
                    {doctor.metodos_pago.slice(0, 3).map((mp, idx) => (
                      <span key={idx} className="bg-slate-100 dark:bg-slate-800 text-xs px-2 py-1 rounded-md inline-block mr-1 mb-1 text-slate-600 dark:text-slate-300">
                        {mp.tipo_pago}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Botón Ver más en la esquina inferior derecha */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Facturación</span>
              <button
                type="button"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
              >
                <span>Ver más</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 8. Formación Clínica                                                      */}
          {/* ========================================================================= */}
          <section
            onClick={() => setActiveDrawer('trayectoria')}
            className={`col-span-12 ${hasReviews ? 'sm:col-span-6 lg:col-span-3' : 'sm:col-span-4 lg:col-span-4'} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 xl:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 cursor-pointer`}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-500">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm text-slate-900 dark:text-white font-bold">
                    Formación Clínica
                  </h3>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  {doctor.exp_colegiado_gt ? `Col. #${doctor.exp_colegiado_gt}` : 'Verificado'}
                </span>
              </div>

              {/* Titulación y universidad con fondo bg-slate-50 */}
              <div className="space-y-2 mt-2">
                {doctor.educacion && doctor.educacion.length > 0 ? (
                  doctor.educacion.slice(0, 2).map((edu, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 mb-2">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block leading-tight truncate">
                        {edu.edu_titulo_obtenido}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                        {edu.edu_institucion} {edu.pais ? `· ${edu.pais}` : ''}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">
                    Educación y títulos oficiales del expediente médico.
                  </p>
                )}
              </div>
            </div>

            {/* Botón Ver currículum en la esquina inferior derecha */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>{trajectoryItems.length} registros</span>
              <button
                type="button"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
              >
                <span>Ver currículum</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 9. Galería                                                                */}
          {/* ========================================================================= */}
          <section
            onClick={() => setActiveDrawer('galeria')}
            className={`col-span-12 ${hasReviews ? 'sm:col-span-6 lg:col-span-3' : 'sm:col-span-4 lg:col-span-4'} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 xl:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 cursor-pointer`}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-500">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm text-slate-900 dark:text-white font-bold">
                    Galería
                  </h3>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  {realPhotos.length > 0 ? `${realPhotos.length} Fotos` : 'Consultorio'}
                </span>
              </div>

              {/* Grid 2x1 o 2x2 adaptativo */}
              {realPhotos.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="w-full h-16 sm:h-20 xl:h-22 overflow-hidden rounded-xl relative group">
                    <Image
                      src={realPhotos[0]}
                      alt="Foto consultorio 1"
                      fill
                      sizes="(min-width: 1280px) 160px, 120px"
                      className="w-full h-full object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  </div>

                  {realPhotos[1] ? (
                    <div className="w-full h-16 sm:h-20 xl:h-22 overflow-hidden rounded-xl relative group">
                      <Image
                        src={realPhotos[1]}
                        alt="Foto consultorio 2"
                        fill
                        sizes="(min-width: 1280px) 160px, 120px"
                        className="w-full h-full object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                      />
                      {realPhotos.length > 2 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">+{realPhotos.length - 2}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-16 sm:h-20 xl:h-22 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                      Clínica
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-16 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400 mt-2">
                  Instalaciones oficiales
                </div>
              )}
            </div>

            {/* Botón Ver fotos en la esquina inferior derecha */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Instalaciones</span>
              <button
                type="button"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
              >
                <span>Ver fotos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 10. Reseñas (Solo si el médico tiene reseñas)                             */}
          {/* ========================================================================= */}
          {hasReviews && (
            <section
              onClick={() => setActiveDrawer('resenas')}
              className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 xl:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-500">
                      <Star className="w-4 h-4 fill-amber-500" />
                    </div>
                    <h3 className="text-sm text-slate-900 dark:text-white font-bold">
                      Reseñas {doctor.promedio_valoracion > 0 ? `${doctor.promedio_valoracion.toFixed(1)}★` : ''}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold">
                    {doctor.total_resenas || 0}
                  </span>
                </div>

                {/* Destacado: Reseña más reciente en cursiva */}
                {latestReview ? (
                  <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1.5">
                    <p className="italic text-sm text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      “{latestReview.res_texto || 'Excelente atención médica.'}”
                    </p>
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                        {latestReview.nombre_paciente || 'Paciente Verificado'}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verificado
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs leading-relaxed">
                    Aún no hay reseñas registradas para este especialista.
                  </div>
                )}
              </div>

              {/* Botón Leer todas en la esquina inferior derecha */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Opiniones</span>
                <button
                  type="button"
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                >
                  <span>Leer todas ({doctor.total_resenas || 0})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </section>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE FIXED BOTTOM BAR (STICKY CTA)                                      */}
      {/* ========================================================================= */}
      <div className="fixed bottom-0 left-0 w-full z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 px-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xl lg:hidden">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate max-w-[170px]">
            {selectedService?.servicio || 'Tarifa de Consulta'}
          </span>
          <span className="text-[16px] font-black text-slate-900 dark:text-white">
            {selectedService?.syp_costo_total != null && selectedService.syp_costo_total > 0
              ? `Q${formatMoney(selectedService.syp_costo_total)}`
              : (validStartingPrice !== null && validStartingPrice > 0 ? `Desde Q${formatMoney(validStartingPrice)}` : 'Tarifa a convenir')}
          </span>
        </div>

        <Link
          href={`/dashboard/agendar/${doctor.exp_codigo}${
            selectedService?.servicio
              ? `?motivo=${encodeURIComponent(selectedService.servicio)}&sypCodigo=${selectedService.syp_codigo || ''}&precio=${selectedService.syp_costo_total || ''}`
              : ''
          }`}
          className="py-2.5 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] shadow-sm flex items-center gap-2 active:scale-95 transition-transform cursor-pointer shrink-0"
        >
          <span>Agendar Cita</span>
          <CalendarDays className="w-4 h-4" />
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE SLIDE-OVER SHEET / DRAWER (100% Datos Reales)                  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveDrawer(null)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
            />

            {/* Slide-over Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between overflow-y-auto z-10 border-l border-slate-200 dark:border-slate-800"
            >
              {/* Drawer Sticky Header */}
              <div className="px-6 py-4 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    {activeDrawer === 'servicios' && <Stethoscope className="w-5 h-5" />}
                    {activeDrawer === 'resenas' && <Star className="w-5 h-5 fill-white" />}
                    {activeDrawer === 'trayectoria' && <GraduationCap className="w-5 h-5" />}
                    {activeDrawer === 'seguros' && <ShieldCheck className="w-5 h-5" />}
                    {activeDrawer === 'galeria' && <Sparkles className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-[17px] font-extrabold text-slate-900 dark:text-white leading-tight">
                      {activeDrawer === 'servicios' && 'Servicios & Tarifas'}
                      {activeDrawer === 'resenas' && 'Reseñas de Pacientes'}
                      {activeDrawer === 'trayectoria' && 'Formación y Trayectoria'}
                      {activeDrawer === 'seguros' && 'Seguros y Formas de Pago'}
                      {activeDrawer === 'galeria' && 'Instalaciones y Consultorio'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {fullName} · SaludYa
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Cerrar panel"
                  onClick={() => setActiveDrawer(null)}
                  className="w-9 h-9 rounded-full bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Dynamic Body */}
              <div className="p-6 flex-1 space-y-5 text-slate-900 dark:text-slate-100">

                {/* 2. SERVICIOS DRAWER (Click-to-Select) */}
                {activeDrawer === 'servicios' && (
                  <div className="space-y-2.5">
                    {realServices.length > 0 ? (
                      realServices.map((srv, idx) => {
                        const isSelected = selectedService?.syp_codigo === srv.syp_codigo;
                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedService(srv)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 shadow-xs ring-1 ring-blue-600/30'
                                : 'border-slate-200/80 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-[13px] font-bold text-slate-900 dark:text-white block truncate">
                                {srv.servicio}
                              </span>
                              {srv.syp_observaciones && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 line-clamp-1">
                                  {srv.syp_observaciones}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="text-[15px] font-black text-blue-600">
                                {srv.syp_costo_total ? `Q${formatMoney(srv.syp_costo_total)}` : 'Q0.00'}
                              </span>
                              {isSelected ? (
                                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-slate-500 text-sm">Este especialista no cuenta con catálogo de procedimientos específicos registrados.</p>
                    )}
                  </div>
                )}

                {/* 3. RESEÑAS DRAWER */}
                {activeDrawer === 'resenas' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                      <div>
                        <span className="text-[24px] font-black text-amber-600 block leading-none">
                          {doctor.promedio_valoracion > 0 ? doctor.promedio_valoracion.toFixed(1) : '5.0'}
                        </span>
                        <span className="text-[11px] text-slate-500 mt-1 block">
                          Calificación basada en {doctor.total_resenas || 0} opiniones registradas
                        </span>
                      </div>
                      <div className="flex text-amber-500 gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className="w-5 h-5 fill-amber-500" />
                        ))}
                      </div>
                    </div>

                    <DoctorReviews doctor={doctor} minimalist={true} />
                  </div>
                )}

                {/* 4. TRAYECTORIA DRAWER */}
                {activeDrawer === 'trayectoria' && (
                  <div className="space-y-4">
                    {trajectoryItems.length > 0 ? (
                      <div className="relative border-l-2 border-blue-500/30 ml-4 space-y-6 pb-2">
                        {trajectoryItems.map((item, idx) => (
                          <div key={idx} className="relative pl-6">
                            <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-white dark:ring-slate-900" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-0.5">
                              {item.type} {item.detail ? `· ${item.detail}` : ''}
                            </span>
                            <h4 className="text-[14px] font-bold text-slate-900 dark:text-white">
                              {item.title}
                            </h4>
                            <p className="text-[12px] text-slate-500 mt-0.5">{item.inst}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm">Sin trayectoria académica detallada en el expediente.</p>
                    )}
                  </div>
                )}

                {/* 5. SEGUROS DRAWER */}
                {activeDrawer === 'seguros' && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl space-y-2">
                      <p className="text-[14px] font-bold text-slate-900 dark:text-white">
                        Reembolsos Médicos y Facturación FEL
                      </p>
                      <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Al concluir tu consulta se emite tu factura FEL oficial con el diagnóstico correspondiente para que puedas tramitar tu reembolso con tu póliza de seguro médico.
                      </p>
                    </div>

                    {doctor.aseguradoras && doctor.aseguradoras.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">
                          Aseguradoras Registradas
                        </span>
                        <div className="grid grid-cols-2 gap-2.5">
                          {doctor.aseguradoras.map((asg, i) => (
                            <div key={i} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-blue-600" />
                              <span className="text-[12px] font-bold text-slate-900 dark:text-white">{asg.aseguradora}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {doctor.metodos_pago && doctor.metodos_pago.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">
                          Métodos de Pago Aceptados
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {doctor.metodos_pago.map((mp, i) => (
                            <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[12px] text-slate-800 dark:text-slate-200 font-medium">
                              • {mp.tipo_pago}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. GALERÍA DRAWER */}
                {activeDrawer === 'galeria' && (
                  <div>
                    {realPhotos.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {realPhotos.map((img, i) => (
                          <div
                            key={i}
                            onClick={() => setSelectedLightboxImage(img)}
                            className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer group"
                          >
                            <Image
                              src={img}
                              alt={`Foto ${i + 1}`}
                              fill
                              sizes="(max-width: 768px) 50vw, 300px"
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm">No hay fotografías adicionales registradas en este momento.</p>
                    )}
                  </div>
                )}

              </div>

              {/* Drawer Persistent Sticky Footer */}
              <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 z-20 flex items-center justify-between gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
                <button
                  type="button"
                  onClick={() => setActiveDrawer(null)}
                  className="px-5 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[12px] font-semibold transition-all cursor-pointer"
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDrawer(null);
                    const query = new URLSearchParams();
                    const motivo = selectedService?.servicio || selectedServiceIntent?.motivo;
                    const sypCodigo = selectedService?.syp_codigo ?? selectedServiceIntent?.sypCodigo;
                    const precio = selectedService?.syp_costo_total ?? selectedServiceIntent?.precio;
                    if (motivo) query.set('motivo', motivo);
                    if (sypCodigo) query.set('sypCodigo', String(sypCodigo));
                    if (precio) query.set('precio', String(precio));
                    router.push(`/dashboard/agendar/${doctor.exp_codigo}${query.toString() ? `?${query.toString()}` : ''}`);
                  }}
                  className="flex-1 py-3 px-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
                >
                  <span>
                    {selectedService?.servicio
                      ? `Continuar con ${selectedService.servicio.length > 20 ? selectedService.servicio.slice(0, 18) + '...' : selectedService.servicio}`
                      : 'Continuar al Agendamiento'}
                  </span>
                  <CalendarDays className="w-4 h-4" />
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedLightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLightboxImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          >
            <button
              type="button"
              onClick={() => setSelectedLightboxImage(null)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative max-w-4xl max-h-[85vh] w-full h-[600px]">
              <Image
                src={selectedLightboxImage}
                alt="Vista ampliada"
                fill
                sizes="100vw"
                className="object-contain rounded-2xl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-[13px] font-semibold border border-slate-700/50"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function DoctorProfilePage() {
  return (
    <Suspense fallback={<NeoLoader />}>
      <DoctorProfileContent />
    </Suspense>
  );
}
