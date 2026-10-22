'use client';

import React, { useEffect, useState, useId, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useOutsideClick } from '@/hooks/use-outside-click';
import {
  Calendar,
  MapPin,
  Video,
  Home,
  Heart,
  BadgeCheck,
  Building2,
  Phone,
  ShieldCheck,
  ExternalLink,
  Clock,
  ChevronDown,
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

export const CloseIcon = () => {
  return (
    <motion.svg
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.05 } }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-black dark:text-white"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
    </motion.svg>
  );
};

export type DoctorExpandableModalProps = {
  active: DoctorCardData | null;
  onClose: () => void;
  onViewOnMap?: (clinicIndex?: number | null) => void;
};

export function DoctorExpandableModal({
  active,
  onClose,
  onViewOnMap,
}: DoctorExpandableModalProps) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (active) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [active, onClose]);

  useOutsideClick(ref, () => onClose());

  // Favoritos
  const { titular } = usePacienteTitular();
  const codPac = titular?.pac_codigo;
  const { data: favoritos = [] } = useFavoritos(codPac);
  const addFavMutation = useAddFavorito();
  const removeFavMutation = useRemoveFavorito();
  const isFavorito = active ? favoritos.some((f) => f.expCodigo === active.doctor.exp_codigo) : false;

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!codPac || !active) return;
    if (isFavorito) {
      removeFavMutation.mutate({ codPac, codDoc: active.doctor.exp_codigo });
    } else {
      addFavMutation.mutate({ codPac, codDoc: active.doctor.exp_codigo });
    }
  };

  const shortName = active ? buildDoctorShortName(active.doctor) || active.fullName : '';
  const priceInfo = active ? getDoctorPriceDisplay(active.doctor) : { label: '' };
  const primarySpecialty = active?.specialtyPreview[0] || active?.doctor.exp_profesion || 'Especialista';
  const clinicas = active?.doctor.clinicas || [];
  const aseguradoras = active?.doctor.aseguradoras || [];
  const [expandedClinics, setExpandedClinics] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setExpandedClinics({});
  }, [active?.doctor.exp_codigo]);

  return (
    <>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs h-full w-full z-[110]"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {active ? (
          <div className="fixed inset-0 grid place-items-center z-[120] p-4 sm:p-6 overflow-y-auto">
            <motion.button
              key={`button-close-${active.doctor.exp_codigo}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className="flex absolute top-4 right-4 items-center justify-center bg-white dark:bg-neutral-800 rounded-full h-8 w-8 shadow-md cursor-pointer z-30"
              onClick={onClose}
              aria-label="Cerrar modal"
            >
              <CloseIcon />
            </motion.button>

            <motion.div
              layoutId={`card-${active.doctor.exp_codigo}-${id}`}
              ref={ref}
              className="w-full max-w-[540px] max-h-[92vh] flex flex-col bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              {/* Imagen Banner Estilo Aceternity ExpandableCard */}
              <motion.div
                layoutId={`image-${active.doctor.exp_codigo}-${id}`}
                className="relative w-full h-64 sm:h-72 bg-gradient-to-br from-sky-900 to-slate-900 overflow-hidden"
              >
                {active.doctor.exp_foto_perfil ? (
                  <img
                    src={active.doctor.exp_foto_perfil}
                    alt={shortName}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-600 to-blue-700 text-white font-black text-6xl">
                    {shortName.charAt(0)}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 shadow-sm backdrop-blur-md">
                    {primarySpecialty}
                  </span>
                </div>

                <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20">
                  <button
                    type="button"
                    onClick={toggleFavorite}
                    aria-label={isFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                    className="w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 hover:scale-105 active:scale-95 flex items-center justify-center transition shadow-sm cursor-pointer backdrop-blur-md"
                  >
                    <Heart className={`w-4 h-4 ${isFavorito ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar modal"
                    className="w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 hover:scale-105 active:scale-95 flex items-center justify-center transition shadow-sm cursor-pointer backdrop-blur-md"
                  >
                    <CloseIcon />
                  </button>
                </div>

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="flex items-center gap-2">
                    <motion.h3
                      layoutId={`title-${active.doctor.exp_codigo}-${id}`}
                      className="text-xl sm:text-2xl font-black text-white truncate"
                    >
                      {active.fullName}
                    </motion.h3>
                    <BadgeCheck className="w-5 h-5 text-sky-400 shrink-0" />
                  </div>
                  <motion.p
                    layoutId={`description-${active.doctor.exp_codigo}-${id}`}
                    className="text-xs sm:text-sm text-slate-200 truncate mt-0.5"
                  >
                    {active.doctor.exp_profesion || primarySpecialty} · {priceInfo.label}
                  </motion.p>
                </div>
              </motion.div>

              {/* Botón CTA + Contenido Scrollable */}
              <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <div className="min-w-0 pr-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Tarifa de Consulta
                  </span>
                  <span className="text-base font-black text-neutral-900 dark:text-white">
                    {priceInfo.label || 'Desde Q200'}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/${active.doctor.exp_codigo}`)}
                    className="px-3.5 py-2 rounded-full font-bold text-xs border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Perfil</span>
                  </button>
                  <motion.button
                    layoutId={`button-${active.doctor.exp_codigo}-${id}`}
                    onClick={() => router.push(`/dashboard/agendar/${active.doctor.exp_codigo}`)}
                    className="px-5 py-2 text-xs rounded-full font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Agendar Cita</span>
                  </motion.button>
                </div>
              </div>

              {/* Contenido desplazable con máscara estética */}
              <div className="p-4 sm:p-5 overflow-y-auto max-h-[45vh] space-y-4 scrollbar-thin [mask:linear-gradient(to_bottom,white,white,transparent)]">
                {/* Sedes */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-sky-600" />
                    <span>Consultorios Disponibles</span>
                  </h4>
                  <div className="space-y-2">
                    {clinicas.map((cli, idx) => {
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
                          className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col text-xs shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-neutral-800 dark:text-neutral-100 truncate">
                                {cli.cli_descripcion}
                              </p>
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                                {cleanZonaText(cli.cli_zona) || cli.cli_direccion_completa}
                              </p>
                            </div>
                            <span className="font-black text-sky-600 dark:text-sky-400 shrink-0">
                              {getDoctorLocationPrice(active.doctor, idx).label}
                            </span>
                          </div>

                          {/* Botón Minimalista de Horarios */}
                          <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
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

                          {/* Desglose de Horarios */}
                          {isScheduleOpen && (
                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 animate-in fade-in-50 duration-200">
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
                  </div>
                </div>

                {/* Aseguradoras */}
                {aseguradoras.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                      <span>Aseguradoras</span>
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {aseguradoras.map((ins, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-[11px] font-semibold"
                        >
                          <InsuranceLogoBadge asg={ins} size="xs" />
                          <span>{ins.aseguradora}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Biografía */}
                {active.doctor.exp_presentacion && (
                  <div className="space-y-1 pt-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Acerca del médico
                    </h4>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                      {active.doctor.exp_presentacion}
                    </p>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/${active.doctor.exp_codigo}`)}
                    className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver perfil médico completo</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
