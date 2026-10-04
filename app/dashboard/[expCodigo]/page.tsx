'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Masonry from 'react-masonry-css';
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserCheck,
  Stethoscope,
  Clock,
  Award,
  CreditCard,
  Building,
  Languages,
  Globe,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DoctorClinica, DoctorClinicaHorario, DoctorResponse } from '@/types';
import { InsuranceLogoBadge } from '@/components/insurance-logo-badge';
import { ShareDoctorModal } from '@/components/share-doctor-modal';
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

  // WhatsApp
  if (network.includes('whatsapp')) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
      </svg>
    );
  }

  // Facebook
  if (network.includes('facebook')) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    );
  }

  // Instagram
  if (network.includes('instagram')) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    );
  }

  // LinkedIn
  if (network.includes('linkedin')) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    );
  }

  // TikTok
  if (network.includes('tiktok')) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    );
  }

  // Twitter / X
  if (
    network.includes('twitter') ||
    network === 'x' ||
    network.includes('x/') ||
    network.includes('/x') ||
    network.includes('x /') ||
    network.includes('/ x')
  ) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
      </svg>
    );
  }

  // YouTube
  if (network.includes('youtube')) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    );
  }

  return <Globe className={className} />;
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

export interface ProximoHorarioUbicacion {
  name: string;
  type: 'hospital' | 'clinica';
  zone?: string;
}

export interface ProximoHorarioInfo {
  disponible: boolean;
  cuandoTexto: string;
  horaTexto: string;
  diaTexto: string;
  ubicaciones: ProximoHorarioUbicacion[];
  ubicacionesTexto: string;
  isMultiUbicacion: boolean;
}

function getNextAvailableSlot(clinicas: DoctorClinica[] | undefined): ProximoHorarioInfo {
  const fallback: ProximoHorarioInfo = {
    disponible: false,
    cuandoTexto: 'Consultar disponibilidad',
    horaTexto: '',
    diaTexto: '',
    ubicaciones: [],
    ubicacionesTexto: 'Por coordinar',
    isMultiUbicacion: false,
  };

  if (!clinicas || clinicas.length === 0) return fallback;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Revisar los próximos 14 días a partir de hoy (offset 0 = hoy, offset 1 = mañana, etc.)
  for (let offset = 0; offset < 14; offset++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + offset);

    const jsDay = targetDate.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    const isoDay = jsDay === 0 ? 7 : jsDay; // 1 = Lunes, ..., 7 = Domingo

    type SlotCandidate = {
      minute: number;
      clinicName: string;
      clinicType: 'hospital' | 'clinica';
      clinicZone?: string;
    };

    const slotsOnDay: SlotCandidate[] = [];

    clinicas.forEach((c) => {
      if (!c.horarios_atencion || !Array.isArray(c.horarios_atencion)) return;

      const matchingHorarios = c.horarios_atencion.filter((h) => {
        return h.hor_dia_semana === isoDay || h.hor_dia_semana === jsDay;
      });

      matchingHorarios.forEach((h) => {
        if (!h.hor_hora_inicio || !h.hor_hora_fin) return;
        const [startH, startM] = h.hor_hora_inicio.slice(0, 5).split(':').map(Number);
        const [endH, endM] = h.hor_hora_fin.slice(0, 5).split(':').map(Number);

        if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return;

        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;

        for (let m = startTotal; m < endTotal; m += 30) {
          // Si es hoy, validar que la hora no haya pasado todavía
          if (offset === 0 && m <= currentMinutes) {
            continue;
          }

          slotsOnDay.push({
            minute: m,
            clinicName: (c.cli_descripcion || 'Sede Principal').trim(),
            clinicType: (c.cli_tipo || '').trim().toLowerCase() === 'hospital' ? 'hospital' : 'clinica',
            clinicZone: c.cli_zona ? c.cli_zona.trim() : undefined,
          });
        }
      });
    });

    if (slotsOnDay.length > 0) {
      // Ordenar cronológicamente para encontrar el horario más próximo
      slotsOnDay.sort((a, b) => a.minute - b.minute);
      const earliestMinute = slotsOnDay[0].minute;

      // Obtener TODAS las ubicaciones que atienden en ese mismo horario más próximo
      const matchingSlots = slotsOnDay.filter((s) => s.minute === earliestMinute);

      const uniqueLocations: ProximoHorarioUbicacion[] = [];
      const seenNames = new Set<string>();

      matchingSlots.forEach((s) => {
        if (!seenNames.has(s.clinicName)) {
          seenNames.add(s.clinicName);
          uniqueLocations.push({
            name: s.clinicName,
            type: s.clinicType,
            zone: s.clinicZone,
          });
        }
      });

      const slotHour = String(Math.floor(earliestMinute / 60)).padStart(2, '0');
      const slotMinute = String(earliestMinute % 60).padStart(2, '0');
      const horaTexto = `${slotHour}:${slotMinute} hrs`;

      let diaTexto = '';
      let cuandoTexto = '';

      if (offset === 0) {
        diaTexto = 'Hoy';
        cuandoTexto = `Hoy a las ${horaTexto}`;
      } else if (offset === 1) {
        diaTexto = 'Mañana';
        cuandoTexto = `Mañana a las ${horaTexto}`;
      } else {
        const fechaFormateada = format(targetDate, "EEEE d 'de' MMMM", { locale: es });
        diaTexto = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
        cuandoTexto = `${diaTexto} a las ${horaTexto}`;
      }

      let ubicacionesTexto = '';
      if (uniqueLocations.length === 1) {
        ubicacionesTexto = uniqueLocations[0].name;
      } else if (uniqueLocations.length === 2) {
        ubicacionesTexto = `${uniqueLocations[0].name} y ${uniqueLocations[1].name}`;
      } else if (uniqueLocations.length > 2) {
        ubicacionesTexto = `${uniqueLocations.slice(0, -1).map((u) => u.name).join(', ')} y ${uniqueLocations[uniqueLocations.length - 1].name}`;
      }

      return {
        disponible: true,
        cuandoTexto,
        horaTexto,
        diaTexto,
        ubicaciones: uniqueLocations,
        ubicacionesTexto,
        isMultiUbicacion: uniqueLocations.length > 1,
      };
    }
  }

  return fallback;
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

// --- BentoGrid Props ---
interface BentoGridProps {
  setActiveDrawer: (key: DrawerKey) => void;
  handleSelectServiceAndOpenDrawer: (srv?: DoctorResponse['servicios'][0]) => void;
  handleScheduleService: (name: string, price: number | null, sypCodigo?: number | null) => void;
  doctor: DoctorResponse;
  fullName: string;
  proximoHorario: ProximoHorarioInfo;
  validStartingPrice: number | null;
  realSymptoms: string[];
  realServices: DoctorResponse['servicios'];
  realPhotos: string[];
  hasReviews: boolean;
  latestReview: DoctorResponse['resenas'][0] | null;
  universityDegree: DoctorResponse['educacion'][0] | null;
  fellowships: DoctorResponse['cursos'];
  altaSpecialties: { titulo: string; institucion: string | null; pais: string | null; anio: number | null }[];
  subSpecialties: DoctorResponse['especialidades'];
  primarySpecialties: DoctorResponse['especialidades'];
  mainSpecialty: string;
  activeClinic: DoctorClinica | null;
  activeClinicSchedule: string | null;
  primaryClinic: DoctorClinica | null;
  activeCategorySlides: ({ type: 'clinica'; clinica: DoctorClinica; index: number } | { type: 'domicilio' })[];
  currentCategorySlideIndex: number;
  effectiveCategory: 'hospital' | 'clinica' | 'domicilio';
  hospitales: DoctorClinica[];
  clinicas: DoctorClinica[];
  hasAtencionDomicilio: boolean;
  sedeCategory: 'hospital' | 'clinica' | 'domicilio';
  setSedeCategory: (cat: 'hospital' | 'clinica' | 'domicilio') => void;
  setSedeSlideIndex: (i: number) => void;
  handlePrevSede: () => void;
  handleNextSede: () => void;
  isDomicilioActive: boolean;
  googleMapsHref: string;
  wazeHref: string;
  clinicQuery: string;
  codPac: string | undefined;
  selectedService: DoctorResponse['servicios'][number] | null;
  setSelectedService: React.Dispatch<React.SetStateAction<DoctorResponse['servicios'][number] | null>>;
}

function BentoGrid(props: BentoGridProps) {
  const {
    setActiveDrawer, handleSelectServiceAndOpenDrawer, handleScheduleService,
    doctor, fullName, proximoHorario, validStartingPrice,
    realSymptoms, realServices, realPhotos, hasReviews, latestReview,
    universityDegree, fellowships, altaSpecialties, subSpecialties,
    primarySpecialties, mainSpecialty, activeClinic, activeClinicSchedule,
    primaryClinic, activeCategorySlides, currentCategorySlideIndex,
    effectiveCategory, hospitales, clinicas, hasAtencionDomicilio,
    sedeCategory, setSedeCategory, setSedeSlideIndex,
    handlePrevSede, handleNextSede, isDomicilioActive,
    googleMapsHref, wazeHref, clinicQuery, codPac,
    selectedService, setSelectedService,
  } = props;

  const breakpointColumnsObj = {
    default: 3,
    1100: 2,
    700: 1,
  };

  // Shared card classes — pure natural height, no artificial clipping
  const cardClass = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden';
  const cardInner = 'p-5 sm:p-6 xl:p-7 flex flex-col justify-between';
  const cardInnerLg = 'p-5 sm:p-6 lg:p-7 xl:p-8 flex flex-col justify-between';

  return (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="saludya-masonry-grid"
      columnClassName="saludya-masonry-grid_column"
    >

      {/* ================================================================ */}
      {/* 1. Enfoque & Población                                            */}
      {/* ================================================================ */}
      <div key="enfoque" className={cardClass}>
        <div className={cardInner + ' space-y-4'}>
          <div>
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <h2 className="text-[17px] text-slate-900 dark:text-white font-bold tracking-tight">
                Enfoque &amp; Población
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-3.5 mt-2.5">
              Población objetivo, rango de edad de atención y especialización clínica del profesional.
            </p>

            <div className="space-y-2">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-2 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-blue-500 shadow-2xs flex-shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Edades de Atención</span>
                  <span className="text-xs text-slate-500">
                    {doctor.exp_edad_minima_atencion !== null
                      ? (doctor.exp_edad_minima_atencion === 0 ? 'Desde recién nacidos' : `A partir de ${doctor.exp_edad_minima_atencion} años`)
                      : 'Todas las edades'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-2">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-blue-500 shadow-2xs flex-shrink-0 mt-0.5">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Especialidad Médica Principal</span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {primarySpecialties.length > 0 ? primarySpecialties.map((s) => s.especialidad).join(' · ') : mainSpecialty}
                    </span>
                    {subSpecialties.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">Sub-especialidades Clínicas:</span>
                        <div className="flex flex-wrap gap-1">
                          {subSpecialties.map((sub, i) => (
                            <span key={i} className="bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50 px-2 py-0.5 rounded-md text-[11px] font-medium">{sub.especialidad}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(fellowships.length > 0 || altaSpecialties.length > 0) && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">Alta Especialidad &amp; Fellowships:</span>
                        <div className="space-y-1">
                          {fellowships.map((f, i) => (
                            <div key={i} className="text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                              <Award className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{f.cur_titulo_obtenido}</span>
                            </div>
                          ))}
                          {altaSpecialties.map((a, i) => (
                            <div key={i} className="text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{a.titulo}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-3 mt-auto border-t border-slate-100 dark:border-slate-800 flex items-center justify-end text-xs text-slate-500">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">Perfil verificado</span>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 2. Síntomas Atendidos                                             */}
      {/* ================================================================ */}
      <div key="sintomas" className={cardClass}>
        <div className={cardInner + ' space-y-4'}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center"><Activity className="w-5 h-5" /></div>
                <h2 className="text-[17px] text-slate-900 dark:text-white font-bold tracking-tight">Síntomas Atendidos</h2>
              </div>
              {realSymptoms.length > 0 && (
                <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full">{realSymptoms.length} Motivos</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2.5 mb-3">
              {realSymptoms.length > 0 ? 'Motivos de consulta clínica y síntomas frecuentes evaluados:' : 'Consulte directamente al especialista para la evaluación de su caso.'}
            </p>
            {realSymptoms.length > 0 ? (
              <div className="flex flex-wrap">
                {(realSymptoms.length > 5 ? realSymptoms.slice(0, 5) : realSymptoms).map((sym) => (
                  <span key={sym} className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300 inline-block mr-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block mr-2"></span>{sym}
                  </span>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center text-xs text-slate-500">Sin síntomas específicos registrados en el expediente.</div>
            )}
          </div>
          {realSymptoms.length > 5 && (
            <div className="pt-3 mt-auto border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
              <button type="button" onClick={() => setActiveDrawer('servicios')} className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer">
                <span>Ver más (+{realSymptoms.length - 5})</span><ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* 3. Modalidades de Consulta                                        */}
      {/* ================================================================ */}
      {/* ================================================================ */}
      {/* 3. Modalidades de Consulta (Index 2 -> Col 2)                     */}
      {/* ================================================================ */}
      <div key="modalidades" className={cardClass}>
        <div className={cardInner + ' space-y-4'}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center"><Layers className="w-5 h-5" /></div>
                <h2 className="text-[17px] text-slate-900 dark:text-white font-bold tracking-tight">Modalidades de Consulta</h2>
              </div>
              <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">Disponibles</span>
            </div>
            <div className="space-y-2.5 mt-3.5">
              {doctor.modalidades && doctor.modalidades.length > 0 ? doctor.modalidades.map((mod, i) => {
                const isVirtual = mod.modalidad.toLowerCase().includes('virtual') || mod.modalidad.toLowerCase().includes('telemedicina');
                const isDomicilio = mod.modalidad.toLowerCase().includes('domicilio');
                return (
                  <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3.5 flex items-center gap-3.5 border border-slate-100 dark:border-slate-800/80 transition-all hover:bg-slate-100/70 dark:hover:bg-slate-800">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs ${isVirtual ? 'bg-blue-100/80 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : isDomicilio ? 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'}`}>
                      {isVirtual ? <Video className="w-5 h-5" /> : isDomicilio ? <Home className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-bold text-slate-900 dark:text-white block">{mod.modalidad}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block leading-relaxed">{isVirtual ? 'Videollamada médica desde cualquier lugar' : isDomicilio ? 'Visita del médico directamente a tu hogar' : 'Atención presencial en consultorio o clínica'}</span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Modalidad activa"></span>
                  </div>
                );
              }) : (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 flex items-center gap-3.5 border border-slate-100 dark:border-slate-800/80">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center flex-shrink-0"><Building2 className="w-5 h-5" /></div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block">Consulta Presencial</span>
                    <span className="text-xs text-slate-500">Atención presencial en consultorio o clínica</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 4. Formación Clínica (Index 3 -> Col 0)                           */}
      {/* ================================================================ */}
      <div key="formacion" className={cardClass + ' cursor-pointer'} onClick={() => setActiveDrawer('trayectoria')}>
        <div className={cardInner + ' space-y-3.5'}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-500"><GraduationCap className="w-4 h-4" /></div>
                <h3 className="text-sm text-slate-900 dark:text-white font-bold">Formación Clínica</h3>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">{doctor.exp_colegiado_gt ? `Col. #${doctor.exp_colegiado_gt}` : 'Verificado'}</span>
            </div>
            <div className="space-y-2.5 mt-2.5">
              {universityDegree && (
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Título Universitario</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block leading-snug">{universityDegree.edu_titulo_obtenido}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">{universityDegree.edu_institucion} {universityDegree.pais ? `· ${universityDegree.pais}` : ''}</span>
                </div>
              )}
              {fellowships.length > 0 && (
                <div className="bg-amber-50/60 dark:bg-amber-950/20 rounded-xl p-3 border border-amber-200/60 dark:border-amber-800/40">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1"><Award className="w-3.5 h-3.5 text-amber-500" />Fellowship Clínico</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block leading-snug">{fellowships[0].cur_titulo_obtenido}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">{fellowships[0].cur_institucion} {fellowships[0].pais ? `· ${fellowships[0].pais}` : ''}</span>
                </div>
              )}
              {altaSpecialties.length > 0 && altaSpecialties[0].institucion ? (
                <div className="bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl p-3 border border-emerald-200/60 dark:border-emerald-800/40">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-emerald-500" />Alta Especialidad</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block leading-snug">{altaSpecialties[0].titulo}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">{altaSpecialties[0].institucion} {altaSpecialties[0].pais ? `· ${altaSpecialties[0].pais}` : ''}</span>
                </div>
              ) : null}
              {!fellowships.length && (!altaSpecialties.length || !altaSpecialties[0].institucion) && doctor.educacion && doctor.educacion.length > 1 && (
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block leading-snug">{doctor.educacion[1].edu_titulo_obtenido}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">{doctor.educacion[1].edu_institucion}</span>
                </div>
              )}
            </div>
          </div>
          {((doctor.educacion?.length || 0) + (doctor.cursos?.length || 0) + (doctor.reconocimientos?.length || 0)) > 2 && (
            <div className="pt-2 mt-auto border-t border-slate-100 dark:border-slate-800 flex items-center justify-end text-xs text-slate-500">
              <button type="button" className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1">
                <span>Ver currículum</span><ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* 5. Pagos y Cobertura (Index 4 -> Col 1)                           */}
      {/* ================================================================ */}
      <div key="pagos" className={cardClass + ' cursor-pointer'} onClick={() => setActiveDrawer('seguros')}>
        <div className={cardInner + ' space-y-3.5'}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-500"><ShieldCheck className="w-4 h-4" /></div>
                <h3 className="text-sm text-slate-900 dark:text-white font-bold">Pagos y Cobertura</h3>
              </div>
              {doctor.aseguradoras && doctor.aseguradoras.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold">{doctor.aseguradoras.length} Seguros</span>
              )}
            </div>
            <div className="mt-2 space-y-3">
              {doctor.aseguradoras && doctor.aseguradoras.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-500 font-medium mb-1.5">Aseguradoras aceptadas:</p>
                  <div className="flex flex-col gap-1.5">
                    {doctor.aseguradoras.map((asg, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <InsuranceLogoBadge asg={asg} size="xs" />
                        <span className="font-medium">{asg.aseguradora}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-2">Facturación FEL para trámite de reembolso médico.</p>
              )}
              {doctor.metodos_pago && doctor.metodos_pago.length > 0 && (
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                  <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-2">Formas de Pago Aceptadas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {doctor.metodos_pago.map((mp, idx) => {
                      const name = mp.tipo_pago.toLowerCase();
                      const isTarjeta = name.includes('tarjeta') || name.includes('crédito') || name.includes('débito');
                      const isTransfer = name.includes('transferencia') || name.includes('banco') || name.includes('depósito');
                      const isEfectivo = name.includes('efectivo');
                      return (
                        <div key={idx} className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
                          {isTarjeta ? <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" /> : isTransfer ? <Building className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" /> : isEfectivo ? <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                          <span>{mp.tipo_pago}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          {((doctor.aseguradoras?.length || 0) > 0 || (doctor.metodos_pago?.length || 0) > 0) && (
            <div className="pt-2 mt-auto border-t border-slate-100 dark:border-slate-800 flex items-center justify-end text-xs text-slate-500">
              <button type="button" className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1">
                <span>Ver detalles completos</span><ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* 6. Servicios & Tarifas (Index 5 -> Col 2)                         */}
      {/* ================================================================ */}
      <div key="servicios" className={cardClass}>
        <div className={cardInnerLg + ' space-y-4'}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center"><Stethoscope className="w-5 h-5" /></div>
                <h2 className="text-[18px] text-slate-900 dark:text-white font-bold tracking-tight">Servicios &amp; Tarifas</h2>
              </div>
              <span className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 font-medium px-3 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/10">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sin cobros ocultos
              </span>
            </div>
            <div className="space-y-2.5 mt-3.5">
              {realServices.length > 0 ? (
                (realServices.length > 3 ? realServices.slice(0, 3) : realServices).map((srv, idx) => (
                  <div key={idx} onClick={() => handleSelectServiceAndOpenDrawer(srv)} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3.5 sm:p-4 mb-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" title="Ver detalles en el panel lateral">
                    <div className="flex-1 min-w-0 pr-3">
                      <span className="text-[13px] sm:text-sm font-bold text-slate-900 dark:text-white block leading-snug">{srv.servicio}</span>
                      {srv.syp_observaciones && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{srv.syp_observaciones}</p>}
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span className="font-black text-slate-900 dark:text-white text-[15px] sm:text-base">{srv.syp_costo_total ? `Q${formatMoney(srv.syp_costo_total)}` : 'Q0.00'}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))
              ) : (
                <div onClick={() => setActiveDrawer('servicios')} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 mb-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                  <div>
                    <span className="text-[13px] sm:text-sm font-bold text-slate-900 dark:text-white block">Consulta Médica General / Especializada</span>
                    <span className="text-xs text-slate-500 mt-0.5 block">Atención médica según tarifa base de la clínica seleccionada.</span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="font-black text-slate-900 dark:text-white text-[15px]">{validStartingPrice !== null && validStartingPrice > 0 ? `Desde Q${formatMoney(validStartingPrice)}` : 'A consultar'}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              )}
            </div>
          </div>
          {realServices.length > 3 && (
            <div className="pt-3.5 mt-auto border-t border-slate-100 dark:border-slate-800 flex items-center justify-end text-xs text-slate-500">
              <button type="button" onClick={() => setActiveDrawer('servicios')} className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer">
                <span>Ver Catálogo de Servicios ({realServices.length})</span><ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* 7. Galería (Index 6 -> Col 0)                                     */}
      {/* ================================================================ */}
      <div key="galeria" className={cardClass + ' cursor-pointer'} onClick={() => setActiveDrawer('galeria')}>
        <div className={cardInner + ' space-y-3.5'}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-500"><Sparkles className="w-4 h-4" /></div>
                <h3 className="text-sm text-slate-900 dark:text-white font-bold">Galería</h3>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">{realPhotos.length > 0 ? `${realPhotos.length} Fotos` : 'Consultorio'}</span>
            </div>
            {realPhotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="w-full h-16 sm:h-20 xl:h-22 overflow-hidden rounded-xl relative group">
                  <Image src={realPhotos[0]} alt="Foto consultorio 1" fill sizes="(min-width: 1280px) 160px, 120px" className="w-full h-full object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity" />
                </div>
                {realPhotos[1] ? (
                  <div className="w-full h-16 sm:h-20 xl:h-22 overflow-hidden rounded-xl relative group">
                    <Image src={realPhotos[1]} alt="Foto consultorio 2" fill sizes="(min-width: 1280px) 160px, 120px" className="w-full h-full object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity" />
                    {realPhotos.length > 2 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-xs font-bold">+{realPhotos.length - 2}</span></div>}
                  </div>
                ) : (
                  <div className="w-full h-16 sm:h-20 xl:h-22 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">Clínica</div>
                )}
              </div>
            ) : (
              <div className="h-16 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400 mt-2">Instalaciones oficiales</div>
            )}
          </div>
          {realPhotos.length > 2 && (
            <div className="pt-2 mt-auto border-t border-slate-100 dark:border-slate-800 flex items-center justify-end text-xs text-slate-500">
              <button type="button" className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1">
                <span>Ver fotos ({realPhotos.length})</span><ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* 8. Sedes de Atención (Index 7 -> Col 1)                           */}
      {/* ================================================================ */}
      <div key="sedes" className={cardClass}>
        <div className={cardInnerLg + ' space-y-4'}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center shrink-0"><MapPin className="w-5 h-5" /></div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[17px] sm:text-[18px] text-slate-900 dark:text-white font-bold tracking-tight">Sedes de Atención</h2>
                  {activeCategorySlides.length > 0 && (
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">{currentCategorySlideIndex + 1} de {activeCategorySlides.length}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" disabled={activeCategorySlides.length <= 1} onClick={handlePrevSede} aria-label="Sede anterior" className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button type="button" disabled={activeCategorySlides.length <= 1} onClick={handleNextSede} aria-label="Siguiente sede" className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-3.5 inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
              <button type="button" onClick={() => { setSedeCategory('hospital'); setSedeSlideIndex(0); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${effectiveCategory === 'hospital' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                <Building2 className={`w-3.5 h-3.5 ${effectiveCategory === 'hospital' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                <span>Hospitales ({hospitales.length})</span>
              </button>
              <button type="button" onClick={() => { setSedeCategory('clinica'); setSedeSlideIndex(0); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${effectiveCategory === 'clinica' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                <Stethoscope className={`w-3.5 h-3.5 ${effectiveCategory === 'clinica' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                <span>Clínicas ({clinicas.length})</span>
              </button>
              {hasAtencionDomicilio && (
                <button type="button" onClick={() => { setSedeCategory('domicilio'); setSedeSlideIndex(0); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${effectiveCategory === 'domicilio' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                  <Home className={`w-3.5 h-3.5 ${effectiveCategory === 'domicilio' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  <span>A Domicilio ({doctor.atencion_domicilio.length})</span>
                </button>
              )}
            </div>

            <div className="mt-3.5 relative min-h-[140px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${effectiveCategory}-${currentCategorySlideIndex}-${activeClinic?.cli_descripcion || 'domicilio'}`}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }} className="space-y-3"
                >
                  {!isDomicilioActive && activeClinic ? (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{activeClinic.cli_descripcion || (effectiveCategory === 'hospital' ? 'Hospital Afiliado' : 'Clínica Registrada')}</h3>
                            {activeClinic === primaryClinic && <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/40">Principal</span>}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{activeClinic.cli_direccion_completa || 'Dirección no especificada'}</p>
                          {activeClinic.cli_zona && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{cleanZonaText(activeClinic.cli_zona)}, Guatemala</p>}
                        </div>
                        <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-black shrink-0 border border-emerald-500/20">
                          {activeClinic.mcl_precio_base != null && activeClinic.mcl_precio_base > 0 ? `Q${formatMoney(activeClinic.mcl_precio_base)}` : 'Tarifa base'}
                        </span>
                      </div>
                      {activeClinicSchedule && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800/80">
                          <Clock className="w-4 h-4 text-blue-500 shrink-0" /><span className="font-medium">{activeClinicSchedule}</span>
                        </div>
                      )}
                    </div>
                  ) : isDomicilioActive && hasAtencionDomicilio ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Atención Médica a Domicilio</h3>
                        <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-xs font-bold shrink-0">A tu hogar</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-2 text-xs border border-slate-100 dark:border-slate-800">
                        {doctor.atencion_domicilio.map((dom, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <span className="text-slate-700 dark:text-slate-300 font-medium">{[dom.mun_descripcion, dom.dep_descripcion].filter(Boolean).join(', ')}: {dom.lad_zonas || 'Toda la región'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">No hay {effectiveCategory === 'hospital' ? 'hospitales afiliados' : 'clínicas'} registrados en esta categoría.</div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="pt-3 mt-auto border-t border-slate-100 dark:border-slate-800 space-y-3">
            {activeCategorySlides.length > 1 && (
              <div className="flex items-center justify-center gap-1.5">
                {activeCategorySlides.map((_, dotIdx) => (
                  <button key={dotIdx} type="button" onClick={() => setSedeSlideIndex(dotIdx)} aria-label={`Ir a sede ${dotIdx + 1}`} className={`h-1.5 rounded-full transition-all cursor-pointer ${dotIdx === currentCategorySlideIndex ? 'w-6 bg-blue-600 dark:bg-blue-400' : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'}`} />
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <a href={wazeHref || `https://waze.com/ul?q=${encodeURIComponent(clinicQuery)}`} target="_blank" rel="noreferrer" className="w-1/2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl py-2 flex justify-center items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer">
                <Navigation className="w-3.5 h-3.5 text-blue-500" /><span>Waze</span>
              </a>
              <a href={googleMapsHref || `https://maps.google.com/?q=${encodeURIComponent(clinicQuery)}`} target="_blank" rel="noreferrer" className="w-1/2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl py-2 flex justify-center items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" /><span>Google Maps</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 9. Reseñas (Index 8 -> Col 2, conditional)                        */}
      {/* ================================================================ */}
      {hasReviews && (
        <div key="resenas" className={cardClass + ' cursor-pointer'} onClick={() => setActiveDrawer('resenas')}>
          <div className={cardInner + ' space-y-3.5'}>
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-500"><Star className="w-4 h-4 fill-amber-500" /></div>
                  <h3 className="text-sm text-slate-900 dark:text-white font-bold">Reseñas {doctor.promedio_valoracion > 0 ? `${doctor.promedio_valoracion.toFixed(1)}★` : ''}</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold">{doctor.total_resenas || 0}</span>
              </div>
              {latestReview ? (
                <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1.5">
                  <p className="italic text-sm text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">"{latestReview.res_texto || 'Excelente atención médica.'}"</p>
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="font-semibold text-slate-900 dark:text-white truncate">{latestReview.nombre_paciente || 'Paciente Verificado'}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1 shrink-0"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verificado</span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs leading-relaxed">Aún no hay reseñas registradas para este especialista.</div>
              )}
            </div>
            {(doctor.total_resenas > 1 || (doctor.resenas?.length || 0) > 1) && (
              <div className="pt-2 mt-auto border-t border-slate-100 dark:border-slate-800 flex items-center justify-end text-xs text-slate-500">
                <button type="button" className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1">
                  <span>Leer todas ({doctor.total_resenas || doctor.resenas?.length})</span><ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </Masonry>
  );
}

function DoctorProfileContent() {
  const params = useParams<{ expCodigo: string }>();
  const router = useRouter();
  const expCodigo = params.expCodigo;

  const { data: doctor, isLoading, error } = useDoctorByCode(expCodigo);
  const [sedeCategory, setSedeCategory] = useState<'hospital' | 'clinica' | 'domicilio'>('hospital');
  const [sedeSlideIndex, setSedeSlideIndex] = useState<number>(0);
  const [activeDrawer, setActiveDrawer] = useState<DrawerKey>(null);
  const [selectedServiceIntent, setSelectedServiceIntent] = useState<ServiceIntent | null>(null);
  const [selectedService, setSelectedService] = useState<DoctorResponse['servicios'][number] | null>(null);
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);


  const { titular } = usePacienteTitular();
  const codPac = titular?.pac_codigo;
  const { data: favoritos = [] } = useFavoritos(codPac);
  const addFavMutation = useAddFavorito();
  const removeFavMutation = useRemoveFavorito();
  const isFavorito = favoritos.some(f => f.expCodigo === expCodigo);

  const fullName = useMemo(() => (doctor ? buildDoctorFullName(doctor) : ''), [doctor]);
  const proximoHorario = useMemo(() => getNextAvailableSlot(doctor?.clinicas), [doctor?.clinicas]);

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

  const handleShare = () => {
    setIsShareModalOpen(true);
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

  // Categorized specialties & credentials
  const primarySpecialties = (doctor.especialidades || []).filter(
    (e) => !e.nivel || e.nivel === 'especialidad'
  );
  const subSpecialties = (doctor.especialidades || []).filter(
    (e) => e.nivel === 'sub_especialidad'
  );
  const altaSpecialties = [
    ...(doctor.especialidades || [])
      .filter((e) => e.nivel === 'alta_especialidad')
      .map((e) => ({
        titulo: e.especialidad,
        institucion: null as string | null,
        pais: null as string | null,
        anio: null as number | null,
      })),
    ...(doctor.cursos || [])
      .filter((c) => c.tipo_curso === 'Alta Especialidad')
      .map((c) => ({
        titulo: c.cur_titulo_obtenido,
        institucion: c.cur_institucion,
        pais: c.pais,
        anio: c.cur_anio,
      })),
  ];
  const fellowships = (doctor.cursos || []).filter((c) => c.tipo_curso === 'Fellowship');
  const complementaryCourses = (doctor.cursos || []).filter(
    (c) => c.tipo_curso !== 'Fellowship' && c.tipo_curso !== 'Alta Especialidad'
  );

  // University Degree (e.g. Médico y Cirujano, Doctorado en Medicina)
  const universityDegree =
    (doctor.educacion || []).find((e) =>
      /médic|cirujan|doctorado|licenciatura|grado/i.test(e.edu_titulo_obtenido)
    ) || doctor.educacion?.[0] || null;

  // Real specialties
  const realSpecialties = doctor.especialidades && doctor.especialidades.length > 0
    ? doctor.especialidades.map(e => e.especialidad)
    : [doctor.exp_profesion].filter(Boolean) as string[];
  const mainSpecialty = primarySpecialties[0]?.especialidad || realSpecialties[0] || doctor.exp_profesion || 'Médico Especialista';
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

  // Segmentación de sedes: Hospitales vs Clínicas
  const hospitales = (doctor.clinicas || []).filter(
    (c) => (c.cli_tipo || '').trim().toLowerCase() === 'hospital'
  );

  const clinicas = (doctor.clinicas || []).filter(
    (c) => (c.cli_tipo || '').trim().toLowerCase() !== 'hospital'
  );

  // Selección automática de categoría efectiva si la elegida no tiene sedes
  const effectiveCategory: 'hospital' | 'clinica' | 'domicilio' =
    sedeCategory === 'hospital' && hospitales.length === 0 && clinicas.length > 0
      ? 'clinica'
      : sedeCategory === 'clinica' && clinicas.length === 0 && hospitales.length > 0
      ? 'hospital'
      : sedeCategory;

  // Slides pertenecientes a la categoría activa
  const activeCategorySlides =
    effectiveCategory === 'hospital'
      ? hospitales.map((cli, i) => ({ type: 'clinica' as const, clinica: cli, index: i }))
      : effectiveCategory === 'clinica'
      ? clinicas.map((cli, i) => ({ type: 'clinica' as const, clinica: cli, index: i }))
      : effectiveCategory === 'domicilio'
      ? [{ type: 'domicilio' as const }]
      : [];

  const currentCategorySlideIndex = activeCategorySlides.length > 0
    ? Math.min(sedeSlideIndex, activeCategorySlides.length - 1)
    : 0;

  const currentSlide = activeCategorySlides[currentCategorySlideIndex] || null;
  const isDomicilioActive = effectiveCategory === 'domicilio' || currentSlide?.type === 'domicilio';
  const activeClinic = currentSlide?.type === 'clinica' ? currentSlide.clinica : (primaryClinic || null);

  const handlePrevSede = () => {
    if (activeCategorySlides.length <= 1) return;
    setSedeSlideIndex((prev) => (prev > 0 ? prev - 1 : activeCategorySlides.length - 1));
  };

  const handleNextSede = () => {
    if (activeCategorySlides.length <= 1) return;
    setSedeSlideIndex((prev) => (prev < activeCategorySlides.length - 1 ? prev + 1 : 0));
  };

  const clinicQuery = activeClinic ? buildClinicQuery(activeClinic, fullName) : '';
  const { googleMapsHref, wazeHref } = buildMapsLinks(activeClinic, clinicQuery);
  const activeClinicSchedule = activeClinic ? formatClinicSchedule(activeClinic.horarios_atencion) : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased pb-24 lg:pb-12 relative overflow-hidden">
      
      {/* Header Gradient: Tinte celeste médico ultra sutil en la parte superior que se desvanece suavemente hacia abajo */}
      <div className="absolute top-0 inset-x-0 h-[520px] bg-gradient-to-b from-blue-50/50 via-blue-50/20 to-transparent dark:from-blue-950/25 dark:via-blue-950/5 dark:to-transparent pointer-events-none" />

      {/* Bento Grid Container con límites responsivos definidos y mayor aprovechamiento del ancho */}
      <div className="relative z-10 w-full max-w-full sm:max-w-3xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-7">
        
        {/* Barra superior para visitantes públicos sin sesión iniciada */}
        {!codPac && (
          <div className="mb-4 flex items-center justify-between bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 shadow-xs">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-blue-600 dark:text-blue-400">SaludYa</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">· Perfil Médico</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition cursor-pointer"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs active:scale-95 cursor-pointer"
              >
                Registrarse
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. Cabecera (Hero) y Agendamiento Rápido                                  */}
        {/* ========================================================================= */}
        <section className="mb-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 shadow-sm hover:shadow-md relative overflow-hidden transition-all">
            
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

                  {/* Especialidad principal y sub-especialidades en texto plano elegante */}
                  <p className="text-sm sm:text-base font-semibold text-blue-600 dark:text-blue-400">
                    {primarySpecialties.length > 0
                      ? [
                          ...primarySpecialties.map((s) => s.especialidad),
                          ...subSpecialties.map((s) => s.especialidad),
                        ].join(' • ')
                      : (doctor.exp_profesion || 'Médico Especialista')}
                  </p>

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

                  {doctor.redes_sociales && doctor.redes_sociales.length > 0 && doctor.redes_sociales.map((item) => {
                    const socialHref = item.url.startsWith('http://') || item.url.startsWith('https://')
                      ? item.url
                      : `https://${item.url}`;
                    return (
                      <a
                        key={`${item.red_social}-${item.url}`}
                        href={socialHref}
                        target="_blank"
                        rel="noreferrer"
                        title={item.red_social}
                        className="flex items-center justify-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 shadow-2xs"
                      >
                        {getSocialIcon(item.red_social, "w-4 h-4 shrink-0")}
                        <span className="truncate capitalize">{item.red_social}</span>
                      </a>
                    );
                  })}
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
                          : (realServices.length > 0 && realServices[0].syp_costo_total != null && realServices[0].syp_costo_total > 0
                            ? `Desde Q${formatMoney(realServices[0].syp_costo_total)}`
                            : 'Tarifa a convenir')}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 block truncate">
                      {doctor.modalidades && doctor.modalidades.length > 0
                        ? `Atención ${doctor.modalidades.map(m => m.modalidad.toLowerCase()).join(' o ')}`
                        : 'Por sesión médica integral'}
                    </span>
                  </div>

                  {/* Próxima Disponibilidad y Sedes de Atención */}
                  <div className="py-3 border-y border-slate-200/70 dark:border-slate-700/70 text-xs space-y-2.5">
                    {proximoHorario.disponible ? (
                      <>
                        <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0 mt-1"></span>
                          <div className="space-y-0.5 min-w-0">
                            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Próximo horario disponible:</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm">
                              {proximoHorario.cuandoTexto}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-1" />
                          <div className="space-y-1 min-w-0 flex-1">
                            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                              {proximoHorario.isMultiUbicacion
                                ? `Disponible en ${proximoHorario.ubicaciones.length} ubicaciones:`
                                : 'Sede de atención:'}
                            </span>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {proximoHorario.ubicaciones.map((ubi, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700 shadow-2xs"
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      ubi.type === 'hospital' ? 'bg-indigo-500' : 'bg-emerald-500'
                                    }`}
                                  />
                                  <span className="truncate max-w-[200px]" title={ubi.name}>
                                    {ubi.name}
                                  </span>
                                  {ubi.zone && (
                                    <span className="text-slate-400 dark:text-slate-500 text-[10px] font-normal">
                                      ({ubi.zone})
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-500 dark:text-slate-400">Disponibilidad:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Consultar disponibilidad al agendar
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-1">
                    <Link
                      href={`/dashboard/agendar/${doctor.exp_codigo}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full rounded-xl py-3 flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md cursor-pointer"
                    >
                      <span>Agendar Cita Ahora</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          </section>

        {/* ============================================================ */}
        {/* 2. REACT-GRID-LAYOUT: Auto-Packing Bento Grid (Cards 2-9)    */}
        {/* ============================================================ */}
        <BentoGrid
          setActiveDrawer={setActiveDrawer}
          handleSelectServiceAndOpenDrawer={handleSelectServiceAndOpenDrawer}
          handleScheduleService={handleScheduleService}
          doctor={doctor}
          fullName={fullName}
          proximoHorario={proximoHorario}
          validStartingPrice={validStartingPrice}
          realSymptoms={realSymptoms}
          realServices={realServices}
          realPhotos={realPhotos}
          hasReviews={hasReviews}
          latestReview={latestReview}
          universityDegree={universityDegree}
          fellowships={fellowships}
          altaSpecialties={altaSpecialties}
          subSpecialties={subSpecialties}
          primarySpecialties={primarySpecialties}
          mainSpecialty={mainSpecialty}
          activeClinic={activeClinic}
          activeClinicSchedule={activeClinicSchedule}
          primaryClinic={primaryClinic}
          activeCategorySlides={activeCategorySlides}
          currentCategorySlideIndex={currentCategorySlideIndex}
          effectiveCategory={effectiveCategory}
          hospitales={hospitales}
clinicas={clinicas}
          hasAtencionDomicilio={!!hasAtencionDomicilio}
          sedeCategory={sedeCategory}
          setSedeCategory={setSedeCategory}
          setSedeSlideIndex={setSedeSlideIndex}
          handlePrevSede={handlePrevSede}
          handleNextSede={handleNextSede}
          isDomicilioActive={isDomicilioActive}
          googleMapsHref={googleMapsHref}
          wazeHref={wazeHref}
          clinicQuery={clinicQuery}
          codPac={codPac}
          selectedService={selectedService}
          setSelectedService={setSelectedService}
        />
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
                            onClick={() => setSelectedService(prev => prev?.syp_codigo === srv.syp_codigo ? null : srv)}
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
                  <div className="space-y-6">
                    {/* 1. TÍTULO UNIVERSITARIO Y GRADO MÉDICO */}
                    {doctor.educacion && doctor.educacion.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-blue-600" />
                          <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                            Título Universitario y Grados Académicos
                          </h4>
                        </div>
                        <div className="space-y-2.5">
                          {doctor.educacion.map((edu, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                  Grado Médico
                                </span>
                                {(edu.edu_anio_inicio || edu.edu_anio_fin) && (
                                  <span className="text-[11px] text-slate-500 font-semibold">
                                    {edu.edu_anio_inicio && edu.edu_anio_fin
                                      ? `${edu.edu_anio_inicio} - ${edu.edu_anio_fin}`
                                      : edu.edu_anio_fin || edu.edu_anio_inicio}
                                  </span>
                                )}
                              </div>
                              <h5 className="text-[14px] font-bold text-slate-900 dark:text-white">
                                {edu.edu_titulo_obtenido}
                              </h5>
                              <p className="text-[12px] text-slate-600 dark:text-slate-400 mt-0.5">
                                {edu.edu_institucion} {edu.pais ? `· ${edu.pais}` : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 2. ESPECIALIDADES Y SUB-ESPECIALIDADES */}
                    {doctor.especialidades && doctor.especialidades.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-indigo-600" />
                          <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                            Especialidades y Sub-especialidades
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {doctor.especialidades.map((esp, idx) => {
                            const isSub = esp.nivel === 'sub_especialidad';
                            const isAlta = esp.nivel === 'alta_especialidad';
                            return (
                              <div
                                key={idx}
                                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                                  isSub
                                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/60 dark:border-indigo-800/40'
                                    : isAlta
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40'
                                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700/60'
                                }`}
                              >
                                <div>
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-wider block mb-0.5 ${
                                      isSub
                                        ? 'text-indigo-600 dark:text-indigo-400'
                                        : isAlta
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-blue-600 dark:text-blue-400'
                                    }`}
                                  >
                                    {isSub
                                      ? 'Sub-especialidad Clínica'
                                      : isAlta
                                      ? 'Alta Especialidad'
                                      : 'Especialidad Médica Troncal'}
                                  </span>
                                  <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                                    {esp.especialidad}
                                  </span>
                                </div>
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                    isSub
                                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                                      : isAlta
                                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                                      : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                  }`}
                                >
                                  Certificada
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 3. FELLOWSHIPS Y ALTAS ESPECIALIDADES */}
                    {(fellowships.length > 0 || altaSpecialties.filter((a) => a.institucion).length > 0) && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-600" />
                          <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                            Fellowships y Altas Especialidades Quirúrgicas
                          </h4>
                        </div>
                        <div className="space-y-2.5">
                          {fellowships.map((f, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                                  <Award className="w-3 h-3" />
                                  Fellowship Clínico
                                </span>
                                {f.cur_anio && (
                                  <span className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
                                    Año {f.cur_anio}
                                  </span>
                                )}
                              </div>
                              <h5 className="text-[14px] font-bold text-slate-900 dark:text-white">
                                {f.cur_titulo_obtenido}
                              </h5>
                              <p className="text-[12px] text-slate-600 dark:text-slate-400 mt-0.5">
                                {f.cur_institucion} {f.pais ? `· ${f.pais}` : ''}
                              </p>
                            </div>
                          ))}

                          {altaSpecialties
                            .filter((a) => a.institucion)
                            .map((alta, idx) => (
                              <div
                                key={idx}
                                className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40"
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    Alta Especialidad
                                  </span>
                                  {alta.anio && (
                                    <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
                                      Año {alta.anio}
                                    </span>
                                  )}
                                </div>
                                <h5 className="text-[14px] font-bold text-slate-900 dark:text-white">
                                  {alta.titulo}
                                </h5>
                                <p className="text-[12px] text-slate-600 dark:text-slate-400 mt-0.5">
                                  {alta.institucion} {alta.pais ? `· ${alta.pais}` : ''}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* 4. DIPLOMADOS, CERTIFICACIONES Y CURSOS CONTINUOS */}
                    {complementaryCourses.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-600" />
                          <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                            Diplomados y Educación Médica Continua
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {complementaryCourses.map((cur, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-start justify-between gap-3"
                            >
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                                  {cur.tipo_curso || 'Certificación'}
                                </span>
                                <h5 className="text-[13px] font-bold text-slate-900 dark:text-white">
                                  {cur.cur_titulo_obtenido}
                                </h5>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {cur.cur_institucion} {cur.pais ? `· ${cur.pais}` : ''}
                                </p>
                              </div>
                              {cur.cur_anio && (
                                <span className="text-[11px] text-slate-400 font-semibold shrink-0 mt-1">
                                  {cur.cur_anio}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 5. RECONOCIMIENTOS */}
                    {doctor.reconocimientos && doctor.reconocimientos.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-purple-600" />
                          <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                            Reconocimientos y Distinciones
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {doctor.reconocimientos.map((rec, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40"
                            >
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <h5 className="text-[13px] font-bold text-slate-900 dark:text-white">
                                  {rec.descripcion}
                                </h5>
                                {rec.anio && (
                                  <span className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold">
                                    Año {rec.anio}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">{rec.institucion}</p>
                            </div>
                          ))}
                        </div>
                      </div>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {doctor.aseguradoras.map((asg, i) => (
                            <div key={i} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-3">
                              <InsuranceLogoBadge asg={asg} size="md" />
                              <span className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{asg.aseguradora}</span>
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
                    const isServiceDrawer = activeDrawer === 'servicios';
                    setActiveDrawer(null);
                    const query = new URLSearchParams();
                    if (isServiceDrawer && selectedService) {
                      if (selectedService.servicio) query.set('motivo', selectedService.servicio);
                      if (selectedService.syp_codigo) query.set('sypCodigo', String(selectedService.syp_codigo));
                      if (selectedService.syp_costo_total) query.set('precio', String(selectedService.syp_costo_total));
                    }
                    router.push(`/dashboard/agendar/${doctor.exp_codigo}${query.toString() ? `?${query.toString()}` : ''}`);
                  }}
                  className="flex-1 py-3 px-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
                >
                  <span>
                    Continuar con consulta
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

      {/* Modal Personalizado de Compartir */}
      {doctor && (
        <ShareDoctorModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          doctor={{
            nombre: fullName || 'Médico Especialista',
            especialidad: doctor.especialidades?.[0]?.especialidad || doctor.exp_profesion || undefined,
            fotoPerfil: doctor.exp_foto_perfil,
            expCodigo: doctor.exp_codigo,
          }}
        />
      )}

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
