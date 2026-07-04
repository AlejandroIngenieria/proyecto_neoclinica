'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  ExternalLink,
  Globe2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { DoctorClinica, DoctorResponse } from '@/types';
import { buildDoctorFullName, isDoctorActive } from '@/types/doctor';
import { Navbar } from '@/components/navbar';
import { SectionCard } from '@/components/section-card';
import { NeoLoader } from '@/components/neo-loader';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { addRecentDoctor } from '@/lib/recent-doctors';
import { MiniWizard } from '@/components/citas-wizard-mini/MiniWizard';
import { useCitaStore } from '@/store/use-cita-store';
import type { ReactNode } from 'react';


function getSocialIcon(name: string, className = "h-5 w-5") {
  const network = name.trim().toLowerCase();
  switch (network) {
    case 'whatsapp':
      return (
        <svg className={`${className} text-[#25D366]`} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg className={`${className} text-[#1877F2]`} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg className={`${className} text-[#E4405F]`} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg className={`${className} text-[#0A66C2]`} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg className={`${className} text-black`} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      );
    case 'x/twitter':
    case 'x':
      return (
        <svg className={`${className} text-black`} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
        </svg>
      );
    default:
      return <ExternalLink className={`${className} text-slate-500`} />;
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

function formatDate(value: string | null) {
  if (!value) return 'Sin dato';
  return new Date(value).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

  return `Q ${formatMoney(value)}`;
}



function buildClinicQuery(clinic: DoctorClinica | null, doctorName: string) {
  if (!clinic) {
    return '';
  }

  const parts = [clinic.cli_descripcion, clinic.cli_direccion_completa, doctorName].filter(Boolean);
  return parts.join(', ');
}

function buildMapsLinks(clinic: DoctorClinica | null, query: string) {
  if (!query && !clinic) {
    return { googleMapsHref: '', wazeHref: '', mapEmbedSrc: '' };
  }

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

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-2xl bg-sky-50 border border-sky-100 px-4 py-2 text-sm font-semibold text-sky-700">
      {children}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-5">
      <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className="mt-2 wrap-break-word text-base font-bold leading-6 text-slate-900">{value}</div>
    </div>
  );
}

function DetailList({
  title,
  items,
  emptyLabel,
  renderItem,
}: {
  title: string;
  items: unknown[];
  emptyLabel: string;
  renderItem: (item: unknown, index: number) => ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-5">
      <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</div>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item, index) => (
            <div key={index} className="rounded-2xl border border-white bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
              {renderItem(item, index)}
            </div>
          ))
        ) : (
          <p className="text-sm font-medium text-slate-400">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}

function DoctorProfileContent() {
  const params = useParams<{ expCodigo: string }>();
  const expCodigo = params.expCodigo;

  // React Query — datos del servidor
  const { data: doctor, isLoading, error } = useDoctorByCode(expCodigo);
  const step = useCitaStore((state) => state.step);

  const [selectedClinicIndex, setSelectedClinicIndex] = useState(0);

  // Guardar en recientes cuando se carga el doctor
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
          <Link href="/dashboard" className="mt-4 inline-block rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white hover:bg-sky-700">
            Volver al directorio
          </Link>
        </div>
      </div>
    );
  }

  const primaryClinic = doctor.clinicas[selectedClinicIndex] ?? doctor.clinicas[0] ?? null;
  const currentLocation = [doctor.pais_nacimiento, doctor.nacionalidad].filter(Boolean).join(' · ') || 'Sin dato';
  const socialLinks = doctor.redes_sociales.slice(0, 6);
  const selectedClinicQuery = buildClinicQuery(primaryClinic, fullName || doctor.exp_profesion || 'Médico');
  const { googleMapsHref, wazeHref, mapEmbedSrc } = buildMapsLinks(primaryClinic, selectedClinicQuery);

  return (
    <div className="min-h-screen text-slate-900">
      <Navbar
        subtitle="Perfil médico"
        backHref="/dashboard"
        navLinks={[
          { href: '/dashboard', label: 'Directorio' },
          { href: '/dashboard/especialidades', label: 'Especialidades' },
          { href: '/dashboard/citas', label: 'Citas' },
          { href: '/dashboard/medicamentos', label: 'Medicamentos' },
        ]}
      />

      <motion.main
        className="mx-auto w-[90%] max-w-[1800px] py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-7">
            <section className="relative overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/5">
              <div className="relative flex flex-col md:flex-row">
                {/* Imagen */}
                <div className="relative min-h-80 md:h-auto md:w-5/12 md:min-h-[460px] overflow-hidden">
                  {doctor.exp_foto_perfil ? (
                    <Image
                      src={doctor.exp_foto_perfil}
                      alt={fullName}
                      fill
                      sizes="(min-width: 768px) 45vw, 100vw"
                      className="object-cover object-center"
                      priority
                    />
                  ) : (
                    <div className="flex h-full min-h-80 w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-8xl font-black text-slate-600">
                      {(fullName || 'MD')
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join('')}
                    </div>
                  )}
                  {/* Gradiente sutil */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/60 md:via-transparent md:to-black/70" />
                  
                  {/* Barra decorativa superior */}
                  <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-500" />
                </div>

                {/* Contenido Superpuesto */}
                <div className="relative md:absolute md:inset-y-0 md:right-0 md:w-8/12 bg-white md:rounded-l-3xl md:shadow-2xl md:shadow-black/10 p-6 sm:p-10 flex flex-col justify-center min-h-[380px] md:min-h-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700">Verificada</span>
                    <span className="text-sm font-semibold text-amber-500">4.9★</span>
                    <span className="text-xs font-semibold text-slate-400">(120+ reseñas)</span>
                  </div>

                  <h1 className="mt-4 text-4xl font-black tracking-tighter text-slate-900 sm:text-5xl leading-none">
                    {fullName || 'Doctor sin nombre'}
                  </h1>
                  <div className="mt-4 h-1 w-14 bg-gradient-to-r from-sky-500 to-indigo-500 rounded" />
                  
                  <p className="mt-4 text-xl font-bold text-sky-600">{doctor.exp_profesion || 'Especialidad médica'}</p>
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">{doctor.exp_presentacion || 'Perfil sin presentación registrada.'}</p>

                  <div className="mt-8 flex flex-wrap gap-2">
                    <Pill>Colegiado: {doctor.exp_colegiado_gt || 'Sin dato'}</Pill>
                    <Pill>Atiende desde {doctor.exp_edad_minima_atencion ? `${doctor.exp_edad_minima_atencion}+` : 'Sin dato'}</Pill>
                    <Pill>{isDoctorActive(doctor) ? 'Activo' : 'Inactivo'}</Pill>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-6 md:grid-cols-2">
              <SectionCard title="Especialidades" icon={BadgeCheck}>
                <ul className="space-y-2 text-sm text-slate-700">
                  {doctor.especialidades.length ? (
                    doctor.especialidades.map((item) => (
                      <li key={item.especialidad} className="flex items-center gap-2">
                        <span className="text-emerald-500">•</span>
                        <span>{item.especialidad}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-500">Sin especialidades registradas.</li>
                  )}
                </ul>
              </SectionCard>

              <SectionCard title="Idiomas" icon={Globe2}>
                <div className="flex flex-wrap gap-4 text-sm">
                  {doctor.idiomas.length ? (
                    doctor.idiomas.map((item) => (
                      <span key={item.idioma} className="flex items-center gap-2 font-medium text-slate-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {item.idioma}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500">Sin idiomas registrados.</span>
                  )}
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Ubicaciones y Clínicas" icon={MapPin}>
              <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
                <div className="space-y-3">
                  {doctor.clinicas.length ? (
                    doctor.clinicas.map((clinic, index) => {
                      const isSelected = index === selectedClinicIndex;

                      return (
                        <button
                          key={`${clinic.cli_descripcion ?? 'clinic'}-${index}`}
                          type="button"
                          onClick={() => setSelectedClinicIndex(index)}
                          className={`w-full border px-4 py-3 text-left transition ${isSelected ? 'border-sky-600 bg-sky-50' : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-slate-50'}`}
                        >
                          <h4 className="font-bold text-slate-900">{clinic.cli_descripcion || `Clínica ${index + 1}`}</h4>
                          <p className="text-sm text-slate-500">{[clinic.cli_direccion_completa, clinic.cli_zona].filter(Boolean).join(', ') || 'Dirección no registrada'}</p>
                          {clinic.cli_telefono1 && <p className="mt-0.5 text-xs text-slate-400">Tel: {clinic.cli_telefono1}</p>}
                          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-sky-600">{formatClinicPrice(clinic.mcl_precio_base)} Consulta</p>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500">Sin clínicas registradas.</p>
                  )}
                </div>

                <div className="border border-slate-200 bg-slate-100">
                  {selectedClinicQuery ? (
                    <iframe
                      key={selectedClinicQuery}
                      title={`Mapa de ${primaryClinic?.cli_descripcion || 'clínica'}`}
                      src={mapEmbedSrc}
                      className="h-72 w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div className="flex h-72 items-center justify-center text-sm text-slate-500">Selecciona una clínica para ver el mapa.</div>
                  )}

                  <div className="border-t border-slate-200 bg-white p-4">
                    <div className="mb-3 text-sm font-bold text-slate-900">{primaryClinic?.cli_descripcion || 'Clínica seleccionada'}</div>
                    <p className="text-sm text-slate-500">{[primaryClinic?.cli_direccion_completa, primaryClinic?.cli_zona].filter(Boolean).join(', ') || currentLocation}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a
                        href={googleMapsHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 border border-sky-600 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
                      >
                        Google Maps
                      </a>
                      <a
                        href={wazeHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Waze
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Educación y Trayectoria" icon={Sparkles}>
              <div className="space-y-6">
                {doctor.educacion.length ? (
                  doctor.educacion.map((item, index) => (
                    <div key={`${item.edu_institucion}-${index}`} className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sm font-bold text-sky-600">
                        {item.edu_titulo_obtenido?.[0] || 'M'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{item.edu_titulo_obtenido}</h4>
                        <p className="text-sm text-slate-500">{item.edu_institucion}</p>
                        <p className="text-xs uppercase text-slate-400">{item.pais}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Sin educación registrada.</p>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Seguros Aceptados" icon={ShieldCheck}>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {doctor.aseguradoras.length ? (
                  doctor.aseguradoras.map((item) => (
                    <div key={item.aseguradora} className="flex items-center gap-3 border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-700 shadow-sm">
                      {item.imagen && (
                        <img src={item.imagen} alt={item.aseguradora} className="h-6 w-auto max-w-16 object-contain" />
                      )}
                      <span>{item.aseguradora}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Sin seguros registrados.</p>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Fotos de trabajo" icon={Sparkles}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {doctor.fotos_trabajo.length ? (
                  doctor.fotos_trabajo.map((photo, index) => (
                    <div key={`${photo.url}-${index}`} className="relative aspect-4/3 overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                      <Image
                        src={photo.url}
                        alt={`Foto de trabajo ${index + 1}`}
                        fill
                        sizes="(min-width: 1280px) 18vw, (min-width: 640px) 40vw, 100vw"
                        className="object-cover object-center"
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Sin fotos de trabajo registradas.</p>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Tipos de consulta y pagos" icon={Phone}>
              <div className="grid gap-4 md:grid-cols-2">
                <DetailList
                  title="Tipos de consulta"
                  items={doctor.tipos_consulta}
                  emptyLabel="Sin tipos de consulta registrados."
                  renderItem={(item: unknown) => {
                    const tc = item as { tipo_consulta: string };
                    return <span className="font-semibold text-slate-800">{tc.tipo_consulta}</span>;
                  }}
                />
                <DetailList
                  title="Métodos de pago"
                  items={doctor.metodos_pago}
                  emptyLabel="Sin métodos de pago registrados."
                  renderItem={(item: unknown) => {
                    const mp = item as { tipo_pago: string; observaciones: string | null };
                    return (
                      <div>
                        <span className="font-semibold text-slate-800">{mp.tipo_pago}</span>
                        {mp.observaciones && <p className="mt-1 text-xs text-slate-500">{mp.observaciones}</p>}
                      </div>
                    );
                  }}
                />
              </div>
            </SectionCard>

            <SectionCard title="Cursos y reconocimientos" icon={CalendarDays}>
              <div className="space-y-4">
                <DetailList
                  title="Cursos"
                  items={doctor.cursos}
                  emptyLabel="Sin cursos registrados."
                  renderItem={(item: unknown) => {
                    const c = item as { cur_institucion: string; cur_titulo_obtenido: string; tipo_curso: string };
                    return (
                      <>
                        <div className="font-semibold text-slate-900">{c.cur_titulo_obtenido}</div>
                        <div className="text-sm text-slate-600">{c.cur_institucion}</div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{c.tipo_curso}</div>
                      </>
                    );
                  }}
                />
                <DetailList
                  title="Reconocimientos"
                  items={doctor.reconocimientos}
                  emptyLabel="Sin reconocimientos registrados."
                  renderItem={(item: unknown) => {
                    const r = item as { descripcion: string; anio: number; institucion: string };
                    return (
                      <>
                        <div className="font-semibold text-slate-900">{r.descripcion}</div>
                        <div className="text-sm text-slate-600">{r.institucion}</div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{r.anio}</div>
                      </>
                    );
                  }}
                />
              </div>
            </SectionCard>

            <SectionCard title="Redes sociales" icon={ExternalLink}>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {socialLinks.length ? (
                  socialLinks.map((item) => (
                    <a
                      key={`${item.red_social}-${item.url}`}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-4 rounded-md border border-slate-200 bg-white p-4 transition hover:border-sky-200 hover:bg-sky-50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                        {getSocialIcon(item.red_social)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                          {item.red_social}
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold text-slate-900">
                          {item.url.replace(/^https?:\/\/(www\.)?/, '')}
                        </div>
                      </div>
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Sin redes sociales registradas.</p>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Información de contacto" icon={Phone}>
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-5 text-sm text-slate-700">
                  <a href={`mailto:${doctor.exp_email}`} className="flex items-center gap-4 rounded-2xl border border-transparent p-2 transition hover:border-sky-100 hover:bg-sky-50 hover:text-sky-700 -ml-2">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <Mail className="h-5 w-5" />
                    </span>
                    <span className="wrap-break-word text-sm font-bold text-slate-900">{doctor.exp_email}</span>
                  </a>
                  <div className="flex items-center gap-4 p-2 -ml-2">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <Phone className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-bold text-slate-900">{doctor.exp_telefono1 || 'Sin teléfono'}</span>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Ubicación general</div>
                    <div className="mt-2 text-base font-semibold text-slate-900">{currentLocation}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Clínica activa</div>
                    <div className="mt-2 text-base font-semibold text-slate-900">{primaryClinic?.cli_descripcion || 'Sin clínica seleccionada'}</div>
                    <div className="mt-1 text-sm text-slate-500">{primaryClinic?.cli_direccion_completa || 'Dirección no registrada'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Atención</div>
                    <div className="mt-2 text-base font-semibold text-emerald-600">{isDoctorActive(doctor) ? 'Disponible' : 'No disponible'}</div>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          <aside className="lg:col-span-5">
            <div className="sticky top-32 space-y-6">
              <section className="flex flex-col rounded-3xl border-2 border-sky-500 bg-white p-6 shadow-2xl shadow-sky-100/60 sm:p-8 max-h-[calc(100vh-8.5rem)] overflow-y-auto no-scrollbar">
                {step === 1 && (
                  <div className="flex flex-col items-center text-center mb-8 pb-6 border-b border-slate-100">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-sky-50 text-sky-600 shadow-inner ring-1 ring-white/50">
                      <CalendarDays className="h-7 w-7" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">Agenda una cita</h2>
                    <p className="mt-2 text-sm font-medium text-slate-500">Inicia el proceso rápido para reservar tu espacio.</p>
                  </div>
                )}
                <MiniWizard codMedico={doctor.exp_codigo} />
              </section>

              
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
