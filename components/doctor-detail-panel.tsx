'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  MapPin,
  Video,
  Home,
  Globe,
  Heart,
  Share2,
  BadgeCheck,
  Star,
  ExternalLink,
  Phone,
  Building2,
  Clock,
  ShieldCheck,
  Award,
  GraduationCap,
  Sparkles,
  Info,
  X,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import {
  buildDoctorFullName,
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
import { ShareDoctorModal } from '@/components/share-doctor-modal';

const DAYS_MAP: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
  0: 'Domingo',
};

function formatTime(timeStr: string) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    const hour = parseInt(parts[0], 10);
    const min = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${min} ${ampm}`;
  }
  return timeStr;
}

export type DoctorDetailPanelProps = {
  data: DoctorCardData | null;
  onClose?: () => void;
  onViewOnMap?: (clinicIndex?: number | null) => void;
  onSelectClinic?: (clinicIndex: number | null) => void;
  selectedClinicIndex?: number | null;
  className?: string;
  id?: string;
};

export function DoctorDetailPanel({
  data,
  onClose,
  onViewOnMap,
  onSelectClinic,
  selectedClinicIndex: controlledClinicIndex,
  className = '',
  id = '',
}: DoctorDetailPanelProps) {
  const router = useRouter();
  const [internalClinicIndex, setInternalClinicIndex] = useState<number | null>(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [expandedClinics, setExpandedClinics] = useState<Record<number, boolean>>({});

  // Resetear horarios desplegados al cambiar de especialista
  useEffect(() => {
    setExpandedClinics({});
  }, [data?.doctor.exp_codigo]);

  const selectedClinicIndex = controlledClinicIndex !== undefined ? controlledClinicIndex : internalClinicIndex;

  const handleClinicSelect = (idx: number | null) => {
    setInternalClinicIndex(idx);
    onSelectClinic?.(idx);
  };

  // Favoritos
  const { titular } = usePacienteTitular();
  const codPac = titular?.pac_codigo;
  const { data: favoritos = [] } = useFavoritos(codPac);
  const addFavMutation = useAddFavorito();
  const removeFavMutation = useRemoveFavorito();
  const isFavorito = data ? favoritos.some((f) => f.expCodigo === data.doctor.exp_codigo) : false;

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!codPac || !data) return;
    if (isFavorito) {
      removeFavMutation.mutate({ codPac, codDoc: data.doctor.exp_codigo });
    } else {
      addFavMutation.mutate({ codPac, codDoc: data.doctor.exp_codigo });
    }
  };

  if (!data) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 ${className}`}>
        <div className="w-16 h-16 rounded-3xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-4 shadow-xs">
          <BadgeCheck className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
          Detalles del Especialista
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mt-2 leading-relaxed">
          Selecciona un médico de la lista lateral para explorar sus consultorios, tarifas, aseguradoras y agendar tu cita.
        </p>
      </div>
    );
  }

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

  const clinicas = doctor.clinicas || [];
  const aseguradoras = doctor.aseguradoras || [];
  const servicios = doctor.servicios || [];
  const educacion = doctor.educacion || [];

  // Modalidades
  const modalities = data.modalityPreview && data.modalityPreview.length > 0
    ? data.modalityPreview
    : (doctor.modalidades || []).map((m) => m.modalidad).filter(Boolean);

  const hasVirtual = modalities.some((m) =>
    m.toLowerCase().includes('virtual') || m.toLowerCase().includes('telemedicina')
  );
  const hasPresencial = modalities.some((m) => m.toLowerCase().includes('presencial')) || (doctor.clinicas && doctor.clinicas.length > 0);
  const hasDomicilio = modalities.some((m) => m.toLowerCase().includes('domicilio')) || (doctor.atencion_domicilio && doctor.atencion_domicilio.length > 0);

  const languages = (data.languagePreview && data.languagePreview.length > 0)
    ? data.languagePreview
    : (doctor.idiomas || []).map((i) => i.idioma).filter(Boolean);

  const cardId = id || doctor.exp_codigo;

  const handleAgendarCita = () => {
    const query = new URLSearchParams();
    if (selectedClinicIndex !== null && selectedClinicIndex !== undefined && selectedClinicIndex >= 0 && clinicas[selectedClinicIndex]) {
      const cli = clinicas[selectedClinicIndex];
      if (cli.cli_descripcion) query.set('clinica', cli.cli_descripcion);
      query.set('modalidad', 'presencial');
    } else if (selectedClinicIndex === -1 && hasDomicilio) {
      query.set('modalidad', 'domicilio');
    }
    const queryString = query.toString() ? `?${query.toString()}` : '';
    router.push(`/dashboard/agendar/${doctor.exp_codigo}${queryString}`);
  };

  return (
    <>
      <div className={`w-full h-full flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden relative ${className}`}>
        {/* ─── BARRA SUPERIOR INTEGRADA: Especialidad, Colegiado y Acciones ─── */}
        <div className="px-4 sm:px-5 pt-3.5 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2 flex-wrap min-w-0 pr-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shadow-2xs truncate">
              {primarySpecialty}
            </span>
            {doctor.exp_colegiado_gt && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 shadow-2xs shrink-0">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Col.</span>
                <strong className="text-slate-700 dark:text-slate-200">{doctor.exp_colegiado_gt}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="w-8 h-8 rounded-full bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400 flex items-center justify-center transition-colors shadow-2xs border border-slate-200/60 dark:border-slate-700 cursor-pointer"
              title="Compartir especialista"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={toggleFavorite}
              className={`w-8 h-8 rounded-full bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center transition-colors shadow-2xs border border-slate-200/60 dark:border-slate-700 cursor-pointer ${
                isFavorito ? 'text-rose-500' : 'text-slate-500 dark:text-slate-300 hover:text-rose-500'
              }`}
              title={isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            >
              <Heart className={`w-4 h-4 ${isFavorito ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-colors shadow-2xs border border-slate-200/60 dark:border-slate-700 cursor-pointer ml-0.5"
                title="Cerrar detalle"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Contenido scrolleable completo con máscara estética */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scroll-smooth p-4 sm:p-5 space-y-4 sm:space-y-5">
          {/* Banner Hero del Especialista */}
          <div className="space-y-3">
            <div className="flex items-start gap-3.5 sm:gap-4">
              {/* Foto compacta */}
              <motion.div
                layoutId={`image-${doctor.exp_codigo}-${cardId}`}
                className="relative shrink-0"
              >
                {doctor.exp_foto_perfil ? (
                  <img
                    src={doctor.exp_foto_perfil}
                    alt={fullName}
                    className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl object-cover object-top border-2 border-white dark:border-slate-800 shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white font-black text-2xl flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm">
                    {initials}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold border border-white dark:border-slate-900 shadow-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>Disponible</span>
                </div>
              </motion.div>

              {/* Información principal */}
              <div className="flex-1 min-w-0">
                <motion.h2
                  layoutId={`title-${doctor.exp_codigo}-${cardId}`}
                  className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white leading-tight flex items-center gap-1.5"
                >
                  <span className="truncate">{fullName}</span>
                  <BadgeCheck className="w-4.5 h-4.5 text-sky-500 shrink-0 inline-block" />
                </motion.h2>

                <motion.p
                  layoutId={`description-${doctor.exp_codigo}-${cardId}`}
                  className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium truncate"
                >
                  {doctor.exp_profesion || primarySpecialty}
                </motion.p>

                {/* Presentación mejorada del precio */}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {priceInfo.hasPrice ? (
                    <div className="inline-flex items-baseline gap-1.5 px-2.5 py-1 rounded-xl bg-sky-50/80 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-900/60 shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Consulta desde
                      </span>
                      <span className="text-sm font-black text-[#006194] dark:text-sky-300">
                        Q{new Intl.NumberFormat('es-GT').format(priceInfo.price)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 font-medium">Tarifa a consultar</span>
                  )}
                </div>

                {/* Modalidades */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                  {hasPresencial && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <MapPin className="w-3 h-3 text-sky-600" /> Presencial
                    </span>
                  )}
                  {hasVirtual && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
                      <Video className="w-3 h-3 text-blue-600" /> Virtual
                    </span>
                  )}
                  {hasDomicilio && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                      <Home className="w-3 h-3 text-emerald-600" /> Domicilio
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Botones de acción principales: 2 columnas compactas */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleAgendarCita}
                className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-sky-600 hover:bg-sky-700 text-white shadow-xs hover:shadow-sky-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Agendar Cita</span>
              </button>

              <button
                type="button"
                onClick={() => router.push(`/dashboard/${doctor.exp_codigo}`)}
                className="w-full py-2.5 px-3 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Perfil Completo</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800 w-full" />

          {/* Sedes y Consultorios Interactivos */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                <span>Sedes y Consultorios ({clinicas.length})</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {clinicas.map((cli, idx) => {
                const isSelected = (selectedClinicIndex ?? 0) === idx;
                const cliName = cli.cli_descripcion || `Clínica ${idx + 1}`;
                const cliPrice = getDoctorLocationPrice(doctor, idx);
                const zonaClean = cleanZonaText(cli.cli_zona);
                const isScheduleOpen = !!expandedClinics[idx];
                const hasHorarios = cli.horarios_atencion && cli.horarios_atencion.length > 0;
                const sortedHorarios = [...(cli.horarios_atencion || [])].sort((a, b) => {
                  const dayA = a.hor_dia_semana === 0 ? 7 : a.hor_dia_semana;
                  const dayB = b.hor_dia_semana === 0 ? 7 : b.hor_dia_semana;
                  if (dayA !== dayB) return dayA - dayB;
                  return (a.hor_hora_inicio || '').localeCompare(b.hor_hora_inicio || '');
                });

                return (
                  <div
                    key={idx}
                    onClick={() => handleClinicSelect(idx)}
                    className={`p-3 sm:p-3.5 rounded-2xl flex flex-col text-left transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-sky-50/70 dark:bg-sky-950/40 border-sky-400 dark:border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Fila Principal: Sede + Tarifa + Indicador de Selección */}
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-start gap-3 min-w-0 pr-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-100 truncate">
                            {cliName}
                          </p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                            {zonaClean || cli.cli_direccion_completa || 'Guatemala'}
                          </p>
                          {cli.cli_telefono1 && (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                              <Phone className="w-3 h-3 text-slate-400" /> {cli.cli_telefono1}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 pl-2">
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block leading-tight">
                            Consulta
                          </span>
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {cliPrice.hasPrice ? `Q${new Intl.NumberFormat('es-GT').format(cliPrice.price)}` : cliPrice.label}
                          </span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? 'border-sky-600 bg-sky-600' : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    </div>

                    {/* Botón Minimalista de Horarios de Atención */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedClinics((prev) => ({
                            ...prev,
                            [idx]: !prev[idx],
                          }));
                        }}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors cursor-pointer group"
                      >
                        <Clock className="w-3.5 h-3.5 text-sky-500 group-hover:scale-110 transition-transform" />
                        <span>{isScheduleOpen ? 'Ocultar horarios' : 'Ver horarios de atención'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isScheduleOpen ? 'rotate-180 text-sky-700 dark:text-sky-300' : 'text-sky-500'}`} />
                      </button>

                      {hasHorarios && !isScheduleOpen && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          {cli.horarios_atencion.length} {cli.horarios_atencion.length === 1 ? 'horario' : 'horarios'}
                        </span>
                      )}
                    </div>

                    {/* Desglose de Horarios Limpio y Minimalista */}
                    {isScheduleOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 animate-in fade-in-50 duration-200"
                      >
                        {hasHorarios ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {sortedHorarios.map((hor, hIdx) => {
                              const dayName = DAYS_MAP[hor.hor_dia_semana] || `Día ${hor.hor_dia_semana}`;
                              const start = formatTime(hor.hor_hora_inicio);
                              const end = formatTime(hor.hor_hora_fin);
                              return (
                                <div
                                  key={hIdx}
                                  className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 text-[11px]"
                                >
                                  <span className="font-semibold text-slate-700 dark:text-slate-200">{dayName}</span>
                                  <span className="font-bold text-sky-700 dark:text-sky-300 bg-sky-50/80 dark:bg-sky-950/60 px-1.5 py-0.5 rounded-md border border-sky-200/60 dark:border-sky-800/60 text-[10px]">
                                    {start} - {end}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic py-1 text-center">
                            Horarios previa cita o consulta directa.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Atención a Domicilio */}
              {hasDomicilio && (
                <div
                  onClick={() => handleClinicSelect(-1)}
                  className={`p-3 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer border ${
                    selectedClinicIndex === -1
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <Home className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-100">
                        Atención Médica a Domicilio
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate mt-0.5">
                        Cobertura en {cleanZonasDomicilio(doctor.atencion_domicilio?.[0]?.lad_zonas) || 'zonas metropolitanas'}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      selectedClinicIndex === -1 ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {selectedClinicIndex === -1 && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Aseguradoras Aceptadas */}
          {aseguradoras.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                <span>Seguros y Aseguradoras Aceptadas ({aseguradoras.length})</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {aseguradoras.map((ins, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shadow-2xs"
                  >
                    <InsuranceLogoBadge asg={ins} size="sm" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {ins.aseguradora}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Biografía / Resumen Profesional (con scroll mask estilo Aceternity) */}
          {doctor.exp_presentacion && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>Acerca del Especialista</span>
              </h4>
              <div className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                <p className="whitespace-pre-line">{doctor.exp_presentacion}</p>
              </div>
            </div>
          )}

          {/* Servicios y Procedimientos */}
          {servicios.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-sky-600" />
                <span>Servicios y Procedimientos ({servicios.length})</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {servicios.slice(0, 6).map((serv, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate pr-2">
                      {serv.servicio}
                    </span>
                    {serv.syp_costo_total ? (
                      <span className="font-bold text-sky-700 dark:text-sky-300 shrink-0">
                        Q {serv.syp_costo_total}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Idiomas */}
          {languages.length > 0 && (
            <div className="flex items-center gap-2 pt-1 text-xs text-neutral-500 dark:text-neutral-400">
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Idiomas de atención:</span>
              <span className="font-bold text-neutral-700 dark:text-neutral-200">
                {languages.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Barra Inferior Fija para Agendar Cita */}
        <div className="p-3.5 sm:p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block leading-tight">
              Tarifa de consulta
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Desde</span>
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Q{new Intl.NumberFormat('es-GT').format(priceInfo.price || 200)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAgendarCita}
            className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-sky-600 hover:bg-sky-700 text-white shadow-md hover:shadow-sky-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Agendar Cita</span>
          </button>
        </div>
      </div>

      {/* Modal para Compartir Médico */}
      {isShareModalOpen && (
        <ShareDoctorModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          doctor={{
            nombre: shortName,
            especialidad: primarySpecialty,
            fotoPerfil: doctor.exp_foto_perfil || null,
            expCodigo: doctor.exp_codigo,
            url: `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/${doctor.exp_codigo}`,
          }}
        />
      )}
    </>
  );
}
