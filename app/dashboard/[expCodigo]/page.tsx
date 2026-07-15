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
  GraduationCap
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { DoctorClinica, DoctorResponse } from '@/types';
import { buildDoctorFullName, isDoctorActive } from '@/types/doctor';
import { Navbar } from '@/components/navbar';
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
  return {
    exp_codigo: doctor.exp_codigo,
    fullName,
    specialty: doctor.exp_profesion || 'Especialidad médica',
    locationLabel: [doctor.pais_nacimiento, doctor.nacionalidad].filter(Boolean).join(' · ') || 'Ubicación no registrada',
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
    <section id={id} className="bg-white border border-slate-200 rounded-[24px] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
      {children}
    </section>
  );
}

function BlockHeader({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ECFEFF] text-[#0D9488]">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-[22px] font-semibold text-slate-900">{title}</h2>
    </div>
  );
}

function DoctorProfileContent() {
  const params = useParams<{ expCodigo: string }>();
  const expCodigo = params.expCodigo;

  const { data: doctor, isLoading, error } = useDoctorByCode(expCodigo);
  const [selectedClinicIndex, setSelectedClinicIndex] = useState(0);

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
          <Link href="/dashboard" className="mt-4 inline-block rounded-full bg-[#0D9488] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0F766E]">
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

  const startingPrice = doctor.clinicas.length > 0 
    ? Math.min(...doctor.clinicas.map(c => c.mcl_precio_base || Infinity)) 
    : null;
    
  const validStartingPrice = startingPrice !== Infinity && startingPrice !== null ? startingPrice : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      <Navbar
        subtitle="Perfil médico"
        backHref="/dashboard"
        navLinks={[
          { href: '/dashboard', label: 'Directorio' },
          { href: '/dashboard/citas', label: 'Citas' },
          { href: '/dashboard/medicamentos', label: 'Medicamentos' },
        ]}
      />

      <motion.main
        className="mx-auto w-[90%] max-w-[1440px] pt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-white border border-slate-200 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-4">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#0D9488] to-[#0B7D74]"></div>
          
          <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start mt-2">
            <div className="shrink-0">
              <div className="relative h-40 w-40 md:h-48 md:w-48 rounded-[20px] overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                {doctor.exp_foto_perfil ? (
                  <Image
                    src={doctor.exp_foto_perfil}
                    alt={fullName}
                    fill
                    sizes="(max-width: 768px) 160px, 192px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-slate-400">
                    {fullName.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h1 className="text-[28px] md:text-[36px] font-bold tracking-tight text-slate-900 leading-tight">
                {fullName}
              </h1>
              <p className="mt-2 text-lg text-slate-500">
                {doctor.exp_profesion || 'Especialidad médica'}
              </p>

              <div className="mt-6 flex flex-wrap gap-3 items-center text-sm font-medium">
                {doctor.promedio_valoracion > 0 && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-full text-slate-700">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    {doctor.promedio_valoracion.toFixed(1)} <span className="text-slate-500 font-normal">({doctor.total_resenas} reseñas)</span>
                  </span>
                )}
                {doctor.exp_anios_experiencia ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-full text-slate-700">
                    <Award className="w-4 h-4 text-slate-500" />
                    {doctor.exp_anios_experiencia} años de exp.
                  </span>
                ) : null}
                {doctor.idiomas.length > 0 && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-full text-slate-700">
                    <Globe2 className="w-4 h-4 text-slate-500" />
                    {doctor.idiomas.map(i => i.idioma).join(', ')}
                  </span>
                )}
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-full text-slate-700">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  A 1.8 km de ti
                </span>
              </div>
              
              <div className="mt-6 flex flex-wrap gap-3 items-center text-sm font-medium border-t border-slate-100 dark:border-slate-800 pt-6">
                {titular && (
                  <button 
                    onClick={toggleFavorite}
                    className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-colors border shadow-sm mr-2 ${isFavorito ? 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-900/50' : 'text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300 bg-white dark:bg-slate-900 dark:text-slate-300'}`}
                  >
                    <Heart className={`w-4 h-4 ${isFavorito ? 'fill-rose-500 text-rose-500' : 'text-slate-500 dark:text-slate-400'}`} />
                    {isFavorito ? 'Guardado en favoritos' : 'Guardar en favoritos'}
                  </button>
                )}
                  {doctor.redes_sociales.map((item) => (
                    <a
                      key={`${item.red_social}-${item.url}`}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm font-medium text-slate-500 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {getSocialIcon(item.red_social, "w-4 h-4")}
                      {item.red_social}
                    </a>
                  ))}
              </div>
            </div>
            
          </div>
        </section>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
          
          {/* MAIN COLUMN */}
          <div className="flex flex-col">
            
            {/* 1. Acerca del Médico */}
            <BlockCard>
              <BlockHeader title="Acerca del Doctor" icon={Users} />
              <div className="space-y-6 text-[16px] text-slate-700 leading-relaxed">
                {doctor.exp_presentacion ? (
                  <p>{doctor.exp_presentacion}</p>
                ) : (
                  <p className="text-[#9CA3AF]">Sin presentación registrada.</p>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-slate-200">
                   <div>
                      <p className="text-sm text-slate-500 mb-1">Colegiado</p>
                      <p className="font-medium text-slate-900">{doctor.exp_colegiado_gt || 'No disponible'}</p>
                   </div>
                   <div>
                      <p className="text-sm text-slate-500 mb-1">Nacionalidad</p>
                      <p className="font-medium text-slate-900">{doctor.nacionalidad || 'No disponible'}</p>
                   </div>
                   <div>
                      <p className="text-sm text-slate-500 mb-1">Atiende desde</p>
                      <p className="font-medium text-slate-900">{doctor.exp_edad_minima_atencion ? `${doctor.exp_edad_minima_atencion} años` : 'Cualquier edad'}</p>
                   </div>
                   <div>
                      <p className="text-sm text-slate-500 mb-1">Estado</p>
                      <p className="font-medium text-[#0D9488]">{isDoctorActive(doctor) ? 'Activo' : 'Inactivo'}</p>
                   </div>
                </div>
              </div>
            </BlockCard>

            {/* 2. Especialidades y Síntomas */}
            <BlockCard>
              <BlockHeader title="Especialidades y Síntomas" icon={Award} />
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Especialidades</h3>
                  {doctor.especialidades.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {doctor.especialidades.map(item => (
                        <span key={item.especialidad} className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-full text-sm font-medium flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]"></span>
                          {item.especialidad}
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
                        <span key={i} className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-full text-sm font-medium">
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
                    <div key={idx} className="py-4 flex justify-between items-center gap-4">
                      <div>
                        <p className="font-medium text-slate-900 text-base">{srv.servicio}</p>
                        {srv.syp_observaciones && <p className="text-sm text-slate-500 mt-0.5">{srv.syp_observaciones}</p>}
                      </div>
                      <div className="font-medium text-slate-900 whitespace-nowrap">
                        {srv.syp_costo_total ? `Q${formatMoney(srv.syp_costo_total)}` : '-'}
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
                        <ShieldCheck className="w-8 h-8 text-[#0D9488] mb-3" />
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
                        <h3 className="font-semibold text-lg text-slate-900 mb-1">{clinic.cli_descripcion || `Clínica ${index + 1}`}</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-4">
                          {[clinic.cli_direccion_completa, clinic.cli_zona].filter(Boolean).join(', ')}
                        </p>
                        
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
                      <Home className="w-5 h-5 text-[#0D9488]" />
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

            {/* 5. Trayectoria Profesional */}
            <BlockCard>
              <BlockHeader title="Trayectoria Profesional" icon={GraduationCap} />
              <div className="relative border-l border-slate-200 ml-3 space-y-8 pb-4 mt-2">
                
                {/* Educación */}
                {doctor.educacion.length > 0 && doctor.educacion.map((edu, idx) => (
                  <div key={`edu-${idx}`} className="relative pl-6">
                    <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#0D9488] ring-4 ring-white" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Educación • {edu.pais || 'Global'}</p>
                    <h4 className="text-base font-semibold text-slate-900">{edu.edu_titulo_obtenido}</h4>
                    <p className="text-sm text-slate-500 mt-0.5">{edu.edu_institucion}</p>
                  </div>
                ))}
                
                {/* Cursos */}
                {doctor.cursos.length > 0 && doctor.cursos.map((cur, idx) => (
                  <div key={`cur-${idx}`} className="relative pl-6">
                    <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#F59E0B] ring-4 ring-white" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Curso • {cur.tipo_curso}</p>
                    <h4 className="text-base font-semibold text-slate-900">{cur.cur_titulo_obtenido}</h4>
                    <p className="text-sm text-slate-500 mt-0.5">{cur.cur_institucion}</p>
                  </div>
                ))}
                
                {/* Reconocimientos */}
                {doctor.reconocimientos.length > 0 && doctor.reconocimientos.map((rec, idx) => (
                  <div key={`rec-${idx}`} className="relative pl-6">
                    <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#8B5CF6] ring-4 ring-white" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Reconocimiento • {rec.anio}</p>
                    <h4 className="text-base font-semibold text-slate-900">{rec.descripcion}</h4>
                    <p className="text-sm text-slate-500 mt-0.5">{rec.institucion}</p>
                  </div>
                ))}

                {!doctor.educacion.length && !doctor.cursos.length && !doctor.reconocimientos.length && (
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
                    <div key={index} className="relative aspect-square overflow-hidden rounded-[20px] bg-slate-100 group cursor-pointer">
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

            {/* 7. Reseñas */}
            <div className="mt-8 mb-4">
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

          </div>
          
          {/* SIDEBAR STICKY */}
           <aside id="sidebar-agendar" className="hidden lg:block sticky top-24">
            <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
               
               <Link href={`/dashboard/agendar/${doctor.exp_codigo}`} className="w-full flex justify-center bg-[#0D9488] hover:bg-[#0F766E] text-white px-6 py-4 rounded-[16px] font-semibold text-[16px] transition-colors mb-6">
                 Agendar cita
               </Link>

               {validStartingPrice !== null && (
                 <div className="flex justify-between items-end border-b border-slate-200 pb-4 mb-4">
                    <span className="text-slate-500 font-medium">Precio consulta</span>
                    <span className="text-xl font-bold text-slate-900">Desde Q{formatMoney(validStartingPrice)}</span>
                 </div>
               )}

               <div className="border-b border-slate-200 pb-4 mb-4">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Modalidades de atención</h4>
                  <div className="space-y-2.5">
                     {doctor.modalidades.map((mod, idx) => {
                       const isVirtual = mod.modalidad.toLowerCase().includes('virtual') || mod.modalidad.toLowerCase().includes('telemedicina');
                       const isHome = mod.modalidad.toLowerCase().includes('domicilio');
                       const isPresencial = mod.modalidad.toLowerCase().includes('presencial') || (!isVirtual && !isHome);
                       
                       let Icon = MapPin;
                       if (isVirtual) Icon = Video;
                       if (isHome) Icon = Home;
                       
                       return (
                         <div key={idx} className="flex items-center gap-3 text-slate-700 text-sm font-medium">
                            <Icon className="w-4 h-4 text-[#0D9488]" />
                            {mod.modalidad}
                         </div>
                       )
                     })}
                     {doctor.modalidades.length === 0 && (
                        <p className="text-sm text-[#9CA3AF]">No especificadas</p>
                     )}
                  </div>
               </div>


               <div className="border-b border-slate-200 pb-4 mb-6">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Métodos de pago</h4>
                  <div className="space-y-2">
                    {doctor.metodos_pago.length > 0 ? doctor.metodos_pago.map((pago, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#0D9488] mt-0.5 shrink-0" />
                        <span className="text-slate-700 text-sm">{pago.tipo_pago}</span>
                      </div>
                    )) : (
                      <p className="text-sm text-slate-500">No especificados</p>
                    )}
                  </div>
               </div>

               <div className="space-y-3">
                 {doctor.exp_telefono1 && (
                   <a href={`tel:${doctor.exp_telefono1}`} className="w-full flex justify-center items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-3 rounded-[16px] font-medium transition-colors hover:bg-slate-50">
                     <Phone className="w-4 h-4" />
                     Llamar al médico
                   </a>
                 )}
                 {doctor.exp_email && (
                   <a href={`mailto:${doctor.exp_email}`} className="w-full flex justify-center items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-3 rounded-[16px] font-medium transition-colors hover:bg-slate-50">
                     <Mail className="w-4 h-4" />
                     Enviar correo
                   </a>
                 )}
                 <button className="w-full flex justify-center items-center gap-2 bg-transparent border border-transparent text-blue-600 dark:text-blue-400 px-4 py-3 rounded-[16px] font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
                   <Share2 className="w-4 h-4" />
                   Compartir perfil
                 </button>
               </div>

            </div>
          </aside>
          
        </div>
      </motion.main>
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
