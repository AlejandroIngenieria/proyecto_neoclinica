'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  MessageSquare,
  Phone,
  Sparkles,
  Users,
  Award,
  Globe2,
  CalendarDays,
  ShieldCheck,
  Check,
  Heart,
  Share2,
  Mail,
  Video,
  Home,
  Star,
  GraduationCap,
  ChevronLeft,
  X,
  FileText,
  CheckCircle,
  XCircle,
  Copy,
  Send,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DoctorClinica, DoctorResponse } from '@/types';
import { buildDoctorFullName, isDoctorActive, getDoctorPriceDisplay, cleanZonaText } from '@/types/doctor';
import { NeoLoader } from '@/components/neo-loader';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { addRecentDoctor } from '@/lib/recent-doctors';
import { useFavoritos, useAddFavorito, useRemoveFavorito } from '@/hooks/use-favoritos';
import { usePacienteTitular } from '@/hooks/use-pacientes';
import { useCitaStore } from '@/store/use-cita-store';
import { DoctorReviews } from '@/components/doctor-reviews';

function getSocialIcon(name: string, className = "h-5 w-5") {
  const network = name.trim().toLowerCase();
  switch (network) {
    case 'whatsapp':
      return (
        <svg className={`${className}`} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg className={`${className}`} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg className={`${className}`} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg className={`${className}`} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg className={`${className}`} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      );
    case 'x/twitter':
    case 'x':
      return (
        <svg className={`${className}`} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
        </svg>
      );
    default:
      return <Globe2 className={className} />;
  }
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

function formatMoney(value: number | null) {
  if (value === null || Number.isNaN(value)) return 'Sin dato';
  return new Intl.NumberFormat('es-GT', {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatClinicPrice(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return 'Sin tarifa';
  }
  return `Q${formatMoney(value)}`;
}

function buildClinicQuery(clinic: DoctorClinica | null, doctorName: string) {
  if (!clinic) return '';
  const parts = [clinic.cli_descripcion, clinic.cli_direccion_completa, doctorName].filter(Boolean);
  return parts.join(', ');
}

function buildMapsLinks(clinic: DoctorClinica | null, query: string) {
  if (!query && !clinic) return { googleMapsHref: '', wazeHref: '', mapEmbedSrc: '' };

  const hasCoords = clinic?.cli_latitud != null && clinic?.cli_longitud != null;
  if (hasCoords) {
    const lat = clinic!.cli_latitud;
    const lng = clinic!.cli_longitud;
    return {
      googleMapsHref: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      wazeHref: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
      mapEmbedSrc: `https://www.google.com/maps?q=${lat},${lng}&output=embed`,
    };
  }

  const encodedQuery = encodeURIComponent(query);
  return {
    googleMapsHref: `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`,
    wazeHref: `https://waze.com/ul?q=${encodedQuery}&navigate=yes`,
    mapEmbedSrc: `https://www.google.com/maps?q=${encodedQuery}&output=embed`,
  };
}

function BlockCard({ children, id }: { children: React.ReactNode, id?: string }) {
  return (
    <section id={id} className="bg-white border border-slate-200 rounded-[20px] p-5 md:p-6 shadow-sm">
      {children}
    </section>
  );
}

function BlockHeader({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB]">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
    </div>
  );
}

function DoctorProfileContent() {
  const params = useParams<{ expCodigo: string }>();
  const expCodigo = params.expCodigo;

  const { data: doctor, isLoading, error } = useDoctorByCode(expCodigo);
  const [selectedClinicIndex, setSelectedClinicIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showFullTrajectory, setShowFullTrajectory] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, []);

  const { titular } = usePacienteTitular();
  const codPac = titular?.pac_codigo;
  const { data: favoritos = [] } = useFavoritos(codPac);
  const addFavMutation = useAddFavorito();
  const removeFavMutation = useRemoveFavorito();
  const isFavorito = favoritos.some(f => f.expCodigo === expCodigo);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!codPac) return;
    
    if (isFavorito) {
      removeFavMutation.mutate({ codPac, codDoc: expCodigo });
    } else {
      addFavMutation.mutate({ codPac, codDoc: expCodigo });
    }
  };

  const handleShare = async () => {
    const currentUrl = shareUrl || (typeof window !== 'undefined' ? window.location.href : '');
    const shareTitle = `${fullName || 'Médico Especialista'} - NeoClínica`;
    const shareText = `Conoce el perfil del ${fullName || 'médico especialista'} en NeoClínica.`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: currentUrl,
        });
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setIsShareModalOpen(true);
        }
        return;
      }
    }
    setIsShareModalOpen(true);
  };

  const copyToClipboard = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  useEffect(() => {
    if (doctor) {
      addRecentDoctor(buildRecentDoctorItem(doctor, buildDoctorFullName(doctor)));
    }
  }, [doctor]);

  const fullName = useMemo(() => (doctor ? buildDoctorFullName(doctor) : ''), [doctor]);

  if (isLoading || !doctor) {
    return <NeoLoader />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-black text-slate-900">Error al cargar el perfil</h2>
          <p className="mt-2 text-sm text-slate-500">{error.message}</p>
          <Link href="/dashboard/directorio" className="mt-4 inline-block rounded-full bg-[#2563EB] px-6 py-2 text-sm font-semibold text-white hover:bg-[#1E40AF]">
            Volver al directorio
          </Link>
        </div>
      </div>
    );
  }

  const primaryClinic = doctor.clinicas[selectedClinicIndex] ?? doctor.clinicas[0] ?? null;
  const currentLocation = [doctor.pais_nacimiento, doctor.nacionalidad].filter(Boolean).join(' · ') || 'Sin dato';
  const selectedClinicQuery = buildClinicQuery(primaryClinic, fullName || doctor.exp_profesion || 'Médico');
  const { googleMapsHref, wazeHref, mapEmbedSrc } = buildMapsLinks(primaryClinic, selectedClinicQuery);

  const priceInfo = getDoctorPriceDisplay(doctor);
  const validStartingPrice = priceInfo.hasPrice ? priceInfo.price : null;

  const trajectoryItems = doctor 
    ? [
        ...doctor.educacion.map(edu => ({ type: 'educacion', data: edu, key: edu.edu_titulo_obtenido })),
        ...doctor.cursos.map(cur => ({ type: 'curso', data: cur, key: cur.cur_titulo_obtenido })),
        ...doctor.reconocimientos.map(rec => ({ type: 'reconocimiento', data: rec, key: rec.descripcion }))
      ]
    : [];
  const formalEducationItems = trajectoryItems.filter(item => item.type === 'educacion').slice(0, 3);
  const visibleTrajectoryItems = showFullTrajectory ? trajectoryItems : trajectoryItems.slice(0, 5);

  const combinedSpecialties = [doctor.exp_profesion, ...doctor.especialidades.map(e => e.especialidad)]
    .filter(Boolean)
    .filter((val, index, arr) => arr.findIndex(v => typeof v === 'string' && typeof val === 'string' && v.toLowerCase() === val.toLowerCase()) === index) as string[];

  return (
    <div className="min-h-screen bg-transparent text-slate-900 font-sans relative">
      
      {/* 1. Fondo Fijo (45% verde, 55% blanco) */}
      <div className="fixed top-0 left-0 w-full h-[45vh] bg-blue-800 -z-10"></div>
      <div className="fixed top-[45vh] left-0 w-full h-[55vh] bg-slate-100 -z-10"></div>

      {/* 2. Main Layout Container (70% / 30% split) */}
      <motion.main
        className="mx-auto w-[90%] max-w-[1440px] relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
          
          {/* LEFT COLUMN (70% - Header y Contenido) */}
          <div className="flex flex-col space-y-3.5 md:space-y-4 pb-20">
            
            {/* Encabezado Sticky Optimizado (Sin bordes ni sombras) */}
            <div className="sticky top-0 z-40 bg-blue-800 pt-3.5 pb-3 md:pt-5 md:pb-4 px-6 md:px-10 -mx-4 md:-mx-6">
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-center">
                
                {/* Botón regresar (Desktop) */}
                <Link href="/dashboard/directorio" className="hidden md:flex shrink-0 h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors" title="Volver al directorio">
                  <ChevronLeft className="h-5 w-5" />
                </Link>

                <div className="shrink-0 relative">
                  {/* Botón regresar (Mobile) */}
                  <div className="md:hidden absolute -top-6 left-0">
                    <Link href="/dashboard/directorio" className="inline-flex items-center gap-1 text-xs font-medium text-white/80 hover:text-white">
                      <ChevronLeft className="h-4 w-4" /> Volver
                    </Link>
                  </div>

                  {/* Foto de perfil compacta (sin bordes ni sombras) */}
                  <div className="relative h-20 w-20 md:h-24 md:w-24 rounded-2xl overflow-hidden bg-blue-700 mx-auto md:mx-0">
                    {doctor.exp_foto_perfil ? (
                      <Image
                        src={doctor.exp_foto_perfil}
                        alt={fullName}
                        fill
                        sizes="96px"
                        className="object-cover"
                        priority
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-white/50">
                        {fullName.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center text-center md:text-left">
                  {/* Nombre + Punto Verde de Estado + Botones de Contacto Circulares (sin bordes ni sombras) */}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                    <h1 className="text-xl md:text-2xl font-black tracking-tight text-white leading-tight flex items-center gap-2">
                      {fullName}
                      <span 
                        className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${doctor.exp_estado === 'A' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} 
                        title={doctor.exp_estado === 'A' ? "Médico Activo" : "Médico Inactivo"}
                      />
                    </h1>

                    {/* Acciones de Contacto Circulares (sin bordes ni sombras) */}
                    <div className="flex items-center gap-1.5 ml-auto md:ml-2">
                      {doctor.exp_telefono1 && (
                        <a href={`tel:${doctor.exp_telefono1}`} className="flex items-center justify-center h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors" title={`Llamar: ${doctor.exp_telefono1}`}>
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {doctor.exp_email && (
                        <a href={`mailto:${doctor.exp_email}`} className="flex items-center justify-center h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors" title={`Correo: ${doctor.exp_email}`}>
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={handleShare}
                        className="flex items-center justify-center h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer active:scale-95"
                        title="Compartir perfil"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-0.5 text-xs md:text-sm text-blue-100 font-medium truncate">
                    {combinedSpecialties.join(' · ') || 'Especialidad médica'}
                  </div>

                  {/* Badges compactos en 1 sola fila (sin bordes ni sombras) */}
                  <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-1.5 items-center text-[11px] font-semibold">
                    {doctor.exp_colegiado_gt && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-700/40 rounded-full text-white">
                        <FileText className="w-3 h-3 text-blue-300" />
                        Col. {doctor.exp_colegiado_gt}
                      </span>
                    )}
                    {doctor.nacionalidad && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-700/40 rounded-full text-white">
                        <MapPin className="w-3 h-3 text-blue-300" />
                        {doctor.nacionalidad}
                      </span>
                    )}
                    {doctor.exp_anios_experiencia ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-700/40 rounded-full text-white">
                        <Award className="w-3 h-3 text-blue-300" />
                        {doctor.exp_anios_experiencia} años exp.
                      </span>
                    ) : null}
                    {doctor.promedio_valoracion > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-700/40 rounded-full text-white">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {doctor.promedio_valoracion.toFixed(1)} <span className="text-blue-200/70 font-normal">({doctor.total_resenas})</span>
                      </span>
                    )}
                    {doctor.idiomas.length > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-700/40 rounded-full text-white">
                        <Globe2 className="w-3 h-3 text-blue-300" />
                        {doctor.idiomas.map(i => i.idioma).join(', ')}
                      </span>
                    )}

                    {titular && (
                      <button 
                        onClick={toggleFavorite}
                        className={`flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full transition-colors ${isFavorito ? 'text-blue-900 bg-blue-100' : 'text-white hover:bg-blue-700 bg-blue-700/50'}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFavorito ? 'fill-blue-500 text-blue-500' : 'text-blue-200'}`} />
                        {isFavorito ? 'Guardado' : 'Guardar'}
                      </button>
                    )}

                    {/* Redes Sociales Icon-Only Buttons (sin bordes ni sombras) */}
                    <div className="flex items-center gap-1 ml-1">
                      {doctor.redes_sociales.map((item) => (
                        <a
                          key={`${item.red_social}-${item.url}`}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          title={item.red_social}
                          className="flex items-center justify-center h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-white/90 transition-colors"
                        >
                          {getSocialIcon(item.red_social, "w-3.5 h-3.5")}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 1. Acerca del Médico */}
            <BlockCard>
              <BlockHeader title="Acerca del Doctor" icon={Users} />
              <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                {doctor.exp_presentacion ? (
                  <p>{doctor.exp_presentacion}</p>
                ) : (
                  <p className="text-[#9CA3AF]">Sin presentación registrada.</p>
                )}
                
                {/* Lista horizontal compacta sin redundancia de Colegiado/Nacionalidad */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium">
                  <span className="flex items-center gap-1">
                    <span className="text-slate-400">Atiende desde:</span>
                    <strong className="text-slate-900">{doctor.exp_edad_minima_atencion ? `${doctor.exp_edad_minima_atencion} años` : 'Cualquier edad'}</strong>
                  </span>
                  {doctor.exp_anios_experiencia ? (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1">
                        <span className="text-slate-400">Experiencia:</span>
                        <strong className="text-slate-900">{doctor.exp_anios_experiencia} años</strong>
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </BlockCard>

            {/* 2. Especialidades y Síntomas */}
            <BlockCard>
              <BlockHeader title="Especialidades y Síntomas" icon={Award} />
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Especialidades</h3>
                  {combinedSpecialties.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {combinedSpecialties.map(item => (
                        <span key={item} className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-sm font-medium flex items-center gap-2 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></span>
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#9CA3AF] text-sm">Sin especialidades registradas.</p>
                  )}
                </div>

                {doctor.sintomas && doctor.sintomas.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Síntomas frecuentes que atiende</h3>
                    <div className="flex flex-wrap gap-2">
                      {doctor.sintomas.map((item, i) => (
                        <span key={i} className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-full text-sm font-medium shadow-sm">
                          {item.sintoma}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </BlockCard>

            {/* 3. Servicios y Precios */}
            <BlockCard>
              <BlockHeader title="Servicios y precios" icon={Check} />
              {doctor.servicios && doctor.servicios.length > 0 ? (
                <div className="divide-y divide-slate-200">
                  {doctor.servicios.map((srv, idx) => (
                    <div key={idx} className="py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 text-base">{srv.servicio}</p>
                        {srv.syp_observaciones && <p className="text-sm text-slate-500 mt-0.5">{srv.syp_observaciones}</p>}
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                        <span className="font-medium text-slate-900 whitespace-nowrap">
                          {srv.syp_costo_total ? `Q${formatMoney(srv.syp_costo_total)}` : '-'}
                        </span>
                        <Link href={`/dashboard/agendar/${doctor.exp_codigo}?motivo=${encodeURIComponent(srv.servicio || '')}${srv.syp_codigo ? `&sypCodigo=${srv.syp_codigo}` : ''}`} className="px-4 py-2 bg-blue-50 text-blue-600 text-sm font-semibold rounded-xl hover:bg-blue-200 transition-colors shrink-0">
                          Agendar
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#9CA3AF] text-sm">Sin servicios específicos registrados.</p>
              )}
            </BlockCard>

            {/* 3.5 Aseguradoras */}
            {doctor.aseguradoras && doctor.aseguradoras.length > 0 && (
              <BlockCard>
                <BlockHeader title="Aseguradoras aceptadas" icon={ShieldCheck} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {doctor.aseguradoras.map((asg, idx) => (
                    <div key={idx} className="flex flex-col items-center justify-center p-4 rounded-[16px] border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-center">
                      {asg.imagen ? (
                        <div className="relative w-full h-12 mb-3">
                          <Image src={asg.imagen} alt={asg.aseguradora} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-contain" />
                        </div>
                      ) : (
                        <ShieldCheck className="w-8 h-8 text-[#2563EB] mb-3" />
                      )}
                      <span className="text-sm font-semibold text-slate-700">{asg.aseguradora}</span>
                    </div>
                  ))}
                </div>
              </BlockCard>
            )}

            {/* 4. Dónde atiende */}
            <BlockCard>
              <BlockHeader title="Dónde atiende" icon={MapPin} />
              <div className="space-y-8">
                {/* Clinics */}
                {doctor.clinicas.length > 0 && doctor.clinicas.map((clinic, index) => {
                  const query = buildClinicQuery(clinic, fullName || 'Médico');
                  const { mapEmbedSrc, googleMapsHref, wazeHref } = buildMapsLinks(clinic, query);
                  
                  return (
                    <div key={index} className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-slate-900 mb-1">
                          {clinic.cli_descripcion || `Clínica ${index + 1}`}
                          {index === 0 && <span className="ml-3 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">Sede Principal</span>}
                        </h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-2">
                          {(() => {
                            const cleanZona = cleanZonaText(clinic.cli_zona);
                            const raw = (clinic.cli_direccion_completa || '').trim();
                            if (cleanZona && !raw.toLowerCase().includes(cleanZona.toLowerCase())) {
                              return [raw, cleanZona].filter(Boolean).join(', ');
                            }
                            return raw || cleanZona || 'Dirección no especificada';
                          })()}
                        </p>

                        {clinic.mcl_precio_base != null && clinic.mcl_precio_base > 0 ? (
                          <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                            <span className="text-slate-400 font-normal">Precio consulta:</span>
                            <span>Q{formatMoney(clinic.mcl_precio_base)}</span>
                          </p>
                        ) : (
                          <p className="text-xs font-medium text-slate-400 mb-3">
                            Clínica sin precio establecido (Q0.00)
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-3">
                          {googleMapsHref && (
                            <a href={googleMapsHref} target="_blank" rel="noreferrer" className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors">
                              Google Maps →
                            </a>
                          )}
                          {wazeHref && (
                            <a href={wazeHref} target="_blank" rel="noreferrer" className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors">
                              Waze →
                            </a>
                          )}
                        </div>
                      </div>
                      
                      {mapEmbedSrc && (
                        <div className="w-full md:w-[300px] h-[160px] rounded-[16px] overflow-hidden bg-slate-100 shrink-0">
                          <iframe
                            title={`Mapa ${clinic.cli_descripcion}`}
                            src={mapEmbedSrc}
                            className="w-full h-full border-0"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
                
                {doctor.clinicas.length === 0 && (!doctor.atencion_domicilio || doctor.atencion_domicilio.length === 0) && (
                   <p className="text-[#9CA3AF] text-sm">No hay ubicaciones registradas.</p>
                )}

                {/* Atención a Domicilio */}
                {doctor.atencion_domicilio && doctor.atencion_domicilio.length > 0 && (
                  <div className="pt-6 mt-6 border-t border-slate-200">
                    <h3 className="font-semibold text-lg text-slate-900 mb-4 flex items-center gap-2">
                      <Home className="w-5 h-5 text-[#2563EB]" />
                      Atención a Domicilio
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {doctor.atencion_domicilio.map((dom, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-[16px] p-5">
                          <p className="font-semibold text-slate-900 mb-1">
                            {[dom.mun_descripcion, dom.dep_descripcion].filter(Boolean).join(', ')}
                          </p>
                          {dom.lad_zonas && <p className="text-sm text-slate-500 mb-2 font-medium">Zonas: <span className="font-normal">{dom.lad_zonas}</span></p>}
                          {dom.lad_observaciones && <p className="text-sm text-slate-700 italic">"{dom.lad_observaciones}"</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </BlockCard>

            {/* 5. Formación académica */}
            <BlockCard>
              <BlockHeader title="Formación académica" icon={GraduationCap} />
              <div className="relative border-l border-slate-200 ml-3 space-y-8 pb-4 mt-2">
                
                {formalEducationItems.map((item, idx) => {
                  const edu = item.data as any;
                  return (
                    <div key={`traj-${idx}`} className="relative pl-6">
                      <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#2563EB] ring-4 ring-white" />
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Educación formal • {edu.pais || 'Global'}</p>
                      <h4 className="text-base font-semibold text-slate-900">{edu.edu_titulo_obtenido}</h4>
                      <p className="text-sm text-slate-500 mt-0.5">{edu.edu_institucion}</p>
                    </div>
                  );
                })}

                {trajectoryItems.length > formalEducationItems.length && (
                  <div className="pt-4 pl-6">
                    <button 
                      onClick={() => setShowFullTrajectory(true)}
                      className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                    >
                      Ver currículum completo ({trajectoryItems.length} registros)
                    </button>
                  </div>
                )}

                {trajectoryItems.length === 0 && (
                   <p className="text-[#9CA3AF] text-sm pl-6">Sin trayectoria registrada.</p>
                )}
              </div>
            </BlockCard>

            {/* 6. Galería */}
            {doctor.fotos_trabajo.length > 0 && (
              <BlockCard>
                <BlockHeader title="Galería" icon={Sparkles} />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {doctor.fotos_trabajo.map((photo, index) => (
                    <div key={index} onClick={() => setSelectedImage(photo.url)} className="relative aspect-square overflow-hidden rounded-[20px] bg-slate-100 group cursor-pointer">
                      <Image
                        src={photo.url}
                        alt={`Foto de trabajo ${index + 1}`}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              </BlockCard>
            )}

            {/* 7. Reseñas (Vista Móvil) */}
            {doctor.total_resenas > 0 && (
              <div className="block lg:hidden mt-8 mb-4">
                <div className="mb-6 flex items-center gap-4">
                  <h2 className="text-[28px] font-bold text-slate-900">Reseñas</h2>
                  {doctor.promedio_valoracion > 0 && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full text-slate-700 font-medium border border-slate-200">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      {doctor.promedio_valoracion.toFixed(1)} <span className="text-slate-500 font-normal">({doctor.total_resenas} opiniones)</span>
                    </span>
                  )}
                </div>
                <DoctorReviews doctor={doctor} minimalist={true} />
              </div>
            )}

          </div>
          
          {/* RIGHT COLUMN (30% - Sidebar de Citas, Tarifas y Reseñas) */}
          <div className="flex flex-col sticky top-20 lg:pt-4 self-start z-30 w-full">
            
            {/* Contenedor superior para Sidebar */}
            <div className="w-full space-y-6">
              
              <aside id="sidebar-agendar" className="hidden lg:block w-full">
                <div className="bg-white border-2 border-blue-600 rounded-[20px] p-4.5 shadow-xl shadow-blue-900/10 relative overflow-hidden">
               
                {/* Precio Compacto en una sola línea */}
                <div className="flex items-baseline justify-between border-b border-slate-100 pb-3 mb-3.5">
                   <span className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Precio de consulta</span>
                   {validStartingPrice !== null && validStartingPrice > 0 ? (
                     <span className="text-xl font-black text-slate-900">Desde Q{formatMoney(validStartingPrice)}</span>
                   ) : (
                     <span className="text-xs font-semibold text-slate-400">Clínica sin precio establecido</span>
                   )}
                </div>

                <Link href={`/dashboard/agendar/${doctor.exp_codigo}`} className="w-full flex justify-center bg-[#2563EB] hover:bg-[#1E40AF] text-white px-5 py-3 rounded-xl font-bold text-sm transition-all mb-4 shadow-md hover:shadow-lg">
                  Agendar cita ahora
                </Link>

                {/* Modalidades de atención ajustadas */}
                <div className="border-b border-slate-100 pb-3 mb-3">
                   <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Modalidades de atención</h4>
                   <div className="space-y-1.5">
                      {doctor.modalidades.map((mod, idx) => {
                        const isVirtual = mod.modalidad.toLowerCase().includes('virtual') || mod.modalidad.toLowerCase().includes('telemedicina');
                        const isHome = mod.modalidad.toLowerCase().includes('domicilio');
                        
                        let Icon = MapPin;
                        if (isVirtual) Icon = Video;
                        if (isHome) Icon = Home;
                        
                        return (
                          <div key={idx} className="flex items-center gap-2 text-slate-700 text-xs font-medium">
                             <Icon className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                             {mod.modalidad}
                          </div>
                        );
                      })}
                      {doctor.modalidades.length === 0 && (
                         <p className="text-xs text-[#9CA3AF]">No especificadas</p>
                      )}
                   </div>
                </div>

                {/* Métodos de pago ajustados */}
                <div className="pb-1">
                   <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Métodos de pago</h4>
                   <div className="space-y-1.5">
                     {doctor.metodos_pago.length > 0 ? doctor.metodos_pago.map((pago, idx) => (
                       <div key={idx} className="flex items-center gap-2">
                         <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                         <span className="text-slate-700 text-xs font-medium">{pago.tipo_pago}</span>
                       </div>
                     )) : (
                       <p className="text-xs text-slate-500">No especificados</p>
                     )}
                   </div>
                </div>
              </div>
            </aside>

            {/* 7. Reseñas (Vista Desktop - Colocadas abajo del bloque de agendar cita) */}
            {doctor.total_resenas > 0 && (
              <div className="hidden lg:block bg-white border border-slate-200 rounded-[20px] p-5 shadow-lg shadow-slate-200/50">
                <div className="mb-4 flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-4.5 h-4.5 text-[#2563EB]" />
                    <span>Reseñas de Pacientes</span>
                  </h3>
                  {doctor.promedio_valoracion > 0 && (
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      {doctor.promedio_valoracion.toFixed(1)} <span className="text-slate-500 font-normal">({doctor.total_resenas})</span>
                    </span>
                  )}
                </div>
                <DoctorReviews doctor={doctor} minimalist={true} />
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Floating sticky CTA bar for mobile booking */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 px-4 flex items-center justify-between shadow-2xl lg:hidden">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Consulta</span>
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {validStartingPrice !== null && validStartingPrice > 0 ? `Desde Q${formatMoney(validStartingPrice)}` : 'Clínica sin precio establecido'}
            </span>
          </div>
          <Link
            href={`/dashboard/agendar/${doctor.exp_codigo}`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <span>Agendar cita</span>
            <CalendarDays className="w-4 h-4" />
          </Link>
        </div>
      </motion.main>

      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4" 
            onClick={() => setSelectedImage(null)}
          >
            <button className="absolute top-4 right-4 md:top-8 md:right-8 p-2 text-white hover:text-slate-300 bg-white/10 rounded-full hover:bg-white/20 transition-colors" onClick={() => setSelectedImage(null)}>
              <X className="w-6 h-6" />
            </button>
            <img src={selectedImage} alt="Galería" className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl" />
          </motion.div>
        )}
        {showFullTrajectory && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowFullTrajectory(false);
            }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[24px] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB]">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Currículum Completo</h3>
                    <p className="text-sm text-slate-500 font-medium">{fullName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowFullTrajectory(false)}
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="relative border-l border-slate-200 ml-3 space-y-8 pb-4 mt-2">
                  {trajectoryItems.map((item, idx) => {
                    if (item.type === 'educacion') {
                      const edu = item.data as any;
                      return (
                        <div key={`traj-m-${idx}`} className="relative pl-6">
                          <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#2563EB] ring-4 ring-white" />
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Educación formal • {edu.pais || 'Global'}</p>
                          <h4 className="text-base font-semibold text-slate-900">{edu.edu_titulo_obtenido}</h4>
                          <p className="text-sm text-slate-500 mt-0.5">{edu.edu_institucion}</p>
                        </div>
                      );
                    }
                    if (item.type === 'curso') {
                      const cur = item.data as any;
                      return (
                        <div key={`traj-m-${idx}`} className="relative pl-6">
                          <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#F59E0B] ring-4 ring-white" />
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Curso / Certificación • {cur.tipo_curso}</p>
                          <h4 className="text-base font-semibold text-slate-900">{cur.cur_titulo_obtenido}</h4>
                          <p className="text-sm text-slate-500 mt-0.5">{cur.cur_institucion}</p>
                        </div>
                      );
                    }
                    if (item.type === 'reconocimiento') {
                      const rec = item.data as any;
                      return (
                        <div key={`traj-m-${idx}`} className="relative pl-6">
                          <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#8B5CF6] ring-4 ring-white" />
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Reconocimiento • {rec.anio}</p>
                          <h4 className="text-base font-semibold text-slate-900">{rec.descripcion}</h4>
                          <p className="text-sm text-slate-500 mt-0.5">{rec.institucion}</p>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Profile Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setIsShareModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">Compartir Perfil</h3>
                    <p className="text-xs text-slate-500">Recomienda a este especialista</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Doctor Card Brief */}
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-blue-600 shrink-0">
                  {doctor.exp_foto_perfil ? (
                    <Image
                      src={doctor.exp_foto_perfil}
                      alt={fullName}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
                      {fullName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900 truncate">{fullName}</p>
                  <p className="text-xs text-blue-600 font-semibold truncate">
                    {combinedSpecialties[0] || 'Especialista Médico'}
                  </p>
                </div>
              </div>

              {/* Social Channels Grid */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Compartir en redes sociales
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* WhatsApp */}
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `¡Hola! Te recomiendo al Dr. ${fullName} (${combinedSpecialties[0] || 'Especialista'}) en NeoClínica:\n${
                        shareUrl
                      }`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-all active:scale-95 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                      {getSocialIcon('whatsapp', 'w-4 h-4')}
                    </div>
                    <span className="text-[11px] font-bold">WhatsApp</span>
                  </a>

                  {/* Facebook */}
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                      shareUrl
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-all active:scale-95 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                      {getSocialIcon('facebook', 'w-4 h-4')}
                    </div>
                    <span className="text-[11px] font-bold">Facebook</span>
                  </a>

                  {/* X / Twitter */}
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      `Conoce el perfil del Dr. ${fullName} en NeoClínica:`
                    )}&url=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all active:scale-95 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                      {getSocialIcon('x', 'w-3.5 h-3.5')}
                    </div>
                    <span className="text-[11px] font-bold">X / Twitter</span>
                  </a>

                  {/* LinkedIn */}
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                      shareUrl
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-700 transition-all active:scale-95 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                      {getSocialIcon('linkedin', 'w-4 h-4')}
                    </div>
                    <span className="text-[11px] font-bold">LinkedIn</span>
                  </a>

                  {/* Telegram */}
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(
                      shareUrl
                    )}&text=${encodeURIComponent(`Dr. ${fullName} - NeoClínica`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 transition-all active:scale-95 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-bold">Telegram</span>
                  </a>

                  {/* Email */}
                  <a
                    href={`mailto:?subject=${encodeURIComponent(
                      `Perfil médico del Dr. ${fullName} en NeoClínica`
                    )}&body=${encodeURIComponent(
                      `Hola, te comparto el perfil profesional del Dr. ${fullName} (${combinedSpecialties[0] || 'Especialista'}) en NeoClínica:\n\n${
                        shareUrl
                      }`
                    )}`}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all active:scale-95 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold">Correo</span>
                  </a>
                </div>
              </div>

              {/* Copy Link Box */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">O copia el enlace directo</p>
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3 py-1.5 text-xs text-slate-600 bg-transparent font-mono outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
                      copiedLink
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
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
