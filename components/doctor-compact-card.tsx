'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Video,
  Home,
  Heart,
  Share2,
  BadgeCheck,
  Building2,
  Phone,
  ShieldCheck,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import {
  buildDoctorShortName,
  getDoctorPriceDisplay,
  getDoctorLocationPrice,
  cleanZonaText,
  cleanZonasDomicilio,
} from '@/types/doctor';
import type { DoctorCardData } from '@/components/doctor-card';
import { InsuranceLogoBadge } from '@/components/insurance-logo-badge';
import { useFavoritos, useAddFavorito, useRemoveFavorito } from '@/hooks/use-favoritos';
import { usePacienteTitular } from '@/hooks/use-pacientes';

export type DoctorCompactCardProps = {
  data: DoctorCardData;
  isSelected?: boolean;
  onSelect?: (data: DoctorCardData) => void;
  onCollapse?: () => void;
  onSelectClinic?: (clinicIndex: number | null) => void;
  selectedClinicIndex?: number | null;
  onVisit?: (data: DoctorCardData) => void;
  onShare?: (data: DoctorCardData) => void;
  isHovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  id?: string;
  className?: string;
};

export function DoctorCompactCard({
  data,
  isSelected = false,
  onSelect,
  onCollapse,
  onSelectClinic,
  selectedClinicIndex = 0,
  onVisit,
  onShare,
  isHovered = false,
  onMouseEnter,
  onMouseLeave,
  id = '',
  className = '',
}: DoctorCompactCardProps) {
  const router = useRouter();
  const { doctor, fullName, specialtyPreview } = data;
  const shortName = buildDoctorShortName(doctor) || fullName;
  const priceInfo = getDoctorPriceDisplay(doctor);
  const primarySpecialty = specialtyPreview[0] || doctor.exp_profesion || 'Especialista';

  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('') || 'DR';

  // Favoritos
  const { titular } = usePacienteTitular();
  const codPac = titular?.pac_codigo;
  const { data: favoritos = [] } = useFavoritos(codPac);
  const addFavMutation = useAddFavorito();
  const removeFavMutation = useRemoveFavorito();
  const isFavorito = favoritos.some((f) => f.expCodigo === doctor.exp_codigo);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!codPac) return;
    if (isFavorito) {
      removeFavMutation.mutate({ codPac, codDoc: doctor.exp_codigo });
    } else {
      addFavMutation.mutate({ codPac, codDoc: doctor.exp_codigo });
    }
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelected) {
      onCollapse?.();
    } else {
      onVisit?.(data);
      onSelect?.(data);
    }
  };

  const handleCardClick = () => {
    if (!isSelected) {
      onVisit?.(data);
      onSelect?.(data);
    }
  };

  const clinicas = doctor.clinicas || [];
  const aseguradoras = doctor.aseguradoras || [];

  // Ubicación principal para vista compacta
  const primaryClinic = clinicas[0];
  const primaryLocation = primaryClinic
    ? cleanZonaText(primaryClinic.cli_zona) || primaryClinic.cli_descripcion || 'Guatemala'
    : (doctor.atencion_domicilio?.length ? 'Atención a Domicilio' : 'Guatemala');

  // Modalidades
  const modalities = data.modalityPreview && data.modalityPreview.length > 0
    ? data.modalityPreview
    : (doctor.modalidades || []).map((m) => m.modalidad).filter(Boolean);

  const hasVirtual = modalities.some((m) =>
    m.toLowerCase().includes('virtual') || m.toLowerCase().includes('telemedicina')
  );
  const hasPresencial = modalities.some((m) => m.toLowerCase().includes('presencial')) || clinicas.length > 0;
  const hasDomicilio = modalities.some((m) => m.toLowerCase().includes('domicilio')) || (doctor.atencion_domicilio && doctor.atencion_domicilio.length > 0);

  const cardId = id || doctor.exp_codigo;

  return (
    <div
      id={id || `doctor-card-${doctor.exp_codigo}`}
      onClick={handleCardClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`group relative flex flex-col shrink-0 w-full scroll-mt-2 rounded-3xl transition-shadow duration-200 border overflow-hidden ${
        isSelected
          ? 'bg-white dark:bg-slate-900 border-sky-500 dark:border-sky-400 shadow-xl ring-2 ring-sky-500/20'
          : isHovered
          ? 'bg-neutral-50 dark:bg-neutral-800/80 border-sky-300 dark:border-sky-700 shadow-md cursor-pointer'
          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:bg-neutral-50/70 dark:hover:bg-neutral-800/50 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs cursor-pointer'
      } ${className}`}
    >
      {/* FILA PRINCIPAL COMPACTA (Estilo Aceternity ExpandableCard) */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3.5 w-full">
        {/* Lado izquierdo: Avatar + Información textual */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="relative shrink-0">
            {doctor.exp_foto_perfil ? (
              <img
                src={doctor.exp_foto_perfil}
                alt={shortName}
                width={64}
                height={64}
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl object-cover object-top border border-slate-200 dark:border-slate-700 shadow-2xs"
              />
            ) : (
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white font-black text-base flex items-center justify-center border border-sky-400 shadow-2xs">
                {initials}
              </div>
            )}

            {/* Indicador de estado activo */}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"
              title="Especialista activo"
            />
          </div>

          {/* Información resumida */}
          <div className="min-w-0 flex-1 pr-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-neutral-800 dark:text-neutral-100 text-sm sm:text-[15px] truncate">
                {shortName}
              </h3>
              <BadgeCheck className="w-4 h-4 text-sky-500 shrink-0" />
            </div>

            <p className="text-xs font-semibold text-sky-600 dark:text-sky-400 truncate mt-0.5">
              {primarySpecialty}
            </p>

            <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500 dark:text-neutral-400 truncate">
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{primaryLocation}</span>
              </span>
              <span className="text-slate-300 dark:text-slate-700 font-bold">·</span>
              <span className="font-bold text-neutral-800 dark:text-neutral-200 shrink-0">
                {priceInfo.label || 'Desde Q200'}
              </span>
            </div>

            {/* Modalidades mini pills */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {hasPresencial && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                  <MapPin className="w-2.5 h-2.5 text-slate-500" /> Presencial
                </span>
              )}
              {hasVirtual && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800">
                  <Video className="w-2.5 h-2.5 text-sky-500" /> Virtual
                </span>
              )}
              {hasDomicilio && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                  <Home className="w-2.5 h-2.5 text-emerald-500" /> Domicilio
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Lado derecho: Acciones (Favorito/Compartir + Detalles + Agendar) */}
        <div className="flex flex-col items-end justify-between self-stretch shrink-0 gap-2">
          {/* Fila superior: Acciones secundarias (Favorito y Compartir) */}
          <div className="flex items-center gap-1.5">
            {onShare && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(data);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 flex items-center justify-center transition-all shadow-2xs border border-slate-200/80 dark:border-slate-700 cursor-pointer active:scale-95"
                title="Compartir médico"
                aria-label="Compartir médico"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={toggleFavorite}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-2xs border cursor-pointer active:scale-95 ${
                isFavorito
                  ? 'border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-500'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500 border-slate-200/80 dark:border-slate-700'
              }`}
              title={isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              aria-label={isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            >
              <Heart className={`w-3.5 h-3.5 transition-colors ${isFavorito ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
          </div>

          {/* Fila inferior: Botones Detalles y Agendar */}
          <div className="flex flex-col items-end gap-1.5 mt-auto">
            <button
              type="button"
              onClick={handleToggleExpand}
              className={`w-[88px] sm:w-[94px] py-1.5 text-xs rounded-full font-bold transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1 shadow-2xs ${
                isSelected
                  ? 'bg-sky-600 text-white shadow-xs hover:bg-sky-700'
                  : 'bg-slate-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-slate-200 dark:hover:bg-neutral-700 border border-slate-200/60 dark:border-neutral-700'
              }`}
              title={isSelected ? 'Contraer detalles' : 'Ver detalles del especialista'}
            >
              <span>{isSelected ? 'Contraer' : 'Detalles'}</span>
              {isSelected ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dashboard/agendar/${doctor.exp_codigo}`);
              }}
              className="w-[88px] sm:w-[94px] py-1.5 text-xs rounded-full font-bold bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-2xs hover:shadow-sky-500/20 transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
              title="Agendar cita con este especialista"
            >
              <Calendar className="w-3 h-3 shrink-0" />
              <span>Agendar</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECCIÓN EXPANDIDA EN EL MISMO PANEL LATERAL */}
      <AnimatePresence initial={false}>
        {isSelected && (
          <motion.div
            key={`expanded-body-${cardId}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-sky-100 dark:border-sky-900/60 bg-sky-50/40 dark:bg-sky-950/20"
          >
            <div className="p-4 sm:p-5 space-y-4">
              {/* 1. Modalidades de Atención Completas */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>Modalidades de Atención</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className={`p-2.5 rounded-2xl border flex flex-col justify-between ${
                    hasPresencial
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs'
                      : 'bg-slate-50/60 dark:bg-slate-900/30 border-slate-200/50 opacity-40'
                  }`}>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                      <MapPin className="w-3.5 h-3.5 text-sky-600" /> Presencial
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      {hasPresencial ? `${clinicas.length} ${clinicas.length === 1 ? 'consultorio' : 'consultorios'}` : 'No disponible'}
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-2xl border flex flex-col justify-between ${
                    hasVirtual
                      ? 'bg-white dark:bg-slate-900 border-sky-200 dark:border-sky-800 shadow-2xs'
                      : 'bg-slate-50/60 dark:bg-slate-900/30 border-slate-200/50 opacity-40'
                  }`}>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                      <Video className="w-3.5 h-3.5 text-sky-500" /> Virtual
                    </div>
                    <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold mt-1">
                      {hasVirtual ? 'Videoconsulta online' : 'No disponible'}
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-2xl border flex flex-col justify-between ${
                    hasDomicilio
                      ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 shadow-2xs'
                      : 'bg-slate-50/60 dark:bg-slate-900/30 border-slate-200/50 opacity-40'
                  }`}>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                      <Home className="w-3.5 h-3.5 text-emerald-600" /> A Domicilio
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                      {hasDomicilio ? 'Visita en tu hogar' : 'No disponible'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Sedes de Atención (Ubicaciones donde trabaja) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-sky-600" />
                    <span>Sedes de Atención ({clinicas.length})</span>
                  </span>
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold">
                    Clic para enfocar en mapa
                  </span>
                </div>

                <div className="space-y-2">
                  {clinicas.map((cli, idx) => {
                    const isClinicActive = (selectedClinicIndex ?? 0) === idx;
                    const cliName = cli.cli_descripcion || `Clínica ${idx + 1}`;
                    const cliPrice = getDoctorLocationPrice(doctor, idx);
                    const zonaClean = cleanZonaText(cli.cli_zona);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClinic?.(idx);
                        }}
                        className={`w-full p-3 rounded-2xl text-left transition-all flex items-start justify-between cursor-pointer border ${
                          isClinicActive
                            ? 'bg-white dark:bg-slate-900 border-sky-500 shadow-sm ring-2 ring-sky-500/20'
                            : 'bg-white/80 dark:bg-slate-900/70 border-slate-200/90 dark:border-slate-800 hover:border-sky-300 hover:bg-white'
                        }`}
                      >
                        <div className="min-w-0 pr-3 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isClinicActive ? 'bg-sky-500 ring-4 ring-sky-500/20' : 'bg-slate-300 dark:bg-slate-600'
                            }`} />
                            <p className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-100 truncate">
                              {cliName}
                            </p>
                          </div>

                          <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 pl-4.5 flex items-start gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span>{cli.cli_direccion_completa || zonaClean || 'Guatemala'}</span>
                          </p>

                          {cli.cli_telefono1 && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1 pl-4.5">
                              <Phone className="w-3 h-3 text-sky-600 shrink-0" />
                              <span>{cli.cli_telefono1}</span>
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end shrink-0 pl-2">
                          <span className="text-xs font-black text-neutral-900 dark:text-white px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                            {cliPrice.label}
                          </span>
                          <div
                            className={`mt-2 w-4 h-4 rounded-full border-2 shrink-0 transition-all flex items-center justify-center ${
                              isClinicActive ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isClinicActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Opción Domicilio si existe */}
                  {hasDomicilio && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClinic?.(-1);
                      }}
                      className={`w-full p-3 rounded-2xl text-left transition-all flex items-start justify-between cursor-pointer border ${
                        selectedClinicIndex === -1
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                          : 'bg-white/80 dark:bg-slate-900/70 border-slate-200/90 dark:border-slate-800 hover:border-emerald-300 hover:bg-white'
                      }`}
                    >
                      <div className="min-w-0 pr-3 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            selectedClinicIndex === -1 ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-slate-300 dark:bg-slate-600'
                          }`} />
                          <p className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-100 truncate">
                            Atención Médica a Domicilio
                          </p>
                        </div>

                        <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium mt-1 pl-4.5">
                          Cobertura: {cleanZonasDomicilio(doctor.atencion_domicilio?.[0]?.lad_zonas) || 'Zonas metropolitanas de Guatemala'}
                        </p>
                      </div>

                      <div className="flex flex-col items-end shrink-0 pl-2">
                        <div
                          className={`mt-1 w-4 h-4 rounded-full border-2 shrink-0 transition-all flex items-center justify-center ${
                            selectedClinicIndex === -1 ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {selectedClinicIndex === -1 && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Aseguradoras */}
              {aseguradoras.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                    <span>Aseguradoras Aceptadas ({aseguradoras.length})</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {aseguradoras.map((ins, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs"
                      >
                        <InsuranceLogoBadge asg={ins} size="xs" />
                        <span className="truncate max-w-[140px]">{ins.aseguradora}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Presentación / Biografía */}
              {doctor.exp_presentacion && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                    <span>Presentación del Especialista</span>
                  </span>
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800">
                    <p className="text-xs sm:text-[13px] text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                      {doctor.exp_presentacion}
                    </p>
                  </div>
                </div>
              )}

              {/* 5. Botones de Acción (Agendar y Ver Perfil) */}
              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/agendar/${doctor.exp_codigo}`);
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Agendar Cita</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/${doctor.exp_codigo}`);
                  }}
                  className="px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.98]"
                  title="Ver perfil completo del médico"
                >
                  <ExternalLink className="w-4 h-4 text-slate-500" />
                  <span>Ver Perfil</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
