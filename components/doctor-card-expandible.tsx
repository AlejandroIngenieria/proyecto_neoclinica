'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  MapPin,
  Video,
  Globe,
  Info,
  X,
  Home,
  Heart,
  Share2,
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
import { ShareDoctorModal } from '@/components/share-doctor-modal';

export type DoctorCardExpandibleProps = {
  data: DoctorCardData;
  isExpanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  onVisit?: (data: DoctorCardData) => void;
  onSelectClinic?: (clinicIndex: number | null) => void;
  selectedClinicIndex?: number | null;
  userLocation?: { lat: number; lng: number } | null;
  isHovered?: boolean;
  isHighlightedByLocation?: boolean;
  highlightedLocationName?: string | null;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
};

export function DoctorCardExpandible({
  data,
  isExpanded: controlledExpanded,
  onExpand,
  onCollapse,
  onVisit,
  onSelectClinic,
  selectedClinicIndex: controlledClinicIndex,
  userLocation,
  isHovered = false,
  isHighlightedByLocation = false,
  highlightedLocationName,
  onMouseEnter,
  onMouseLeave,
  className = '',
}: DoctorCardExpandibleProps) {
  const router = useRouter();
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [internalClinicIndex, setInternalClinicIndex] = useState<number | null>(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const expandida = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const selectedClinicIndex = controlledClinicIndex !== undefined ? controlledClinicIndex : internalClinicIndex;

  const handleExpand = (nextExpanded: boolean) => {
    if (nextExpanded) {
      if (onExpand) onExpand();
      else setInternalExpanded(true);
    } else {
      if (onCollapse) onCollapse();
      else setInternalExpanded(false);
    }
  };

  const handleClinicSelect = (idx: number | null) => {
    setInternalClinicIndex(idx);
    onSelectClinic?.(idx);
  };

  const { doctor, fullName, specialtyPreview } = data;
  const shortName = buildDoctorShortName(doctor) || fullName;
  const priceInfo = getDoctorPriceDisplay(doctor);

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

  // Idiomas
  const languages = (data.languagePreview && data.languagePreview.length > 0)
    ? data.languagePreview
    : (doctor.idiomas || []).map((i) => i.idioma).filter(Boolean);

  // Aseguradoras
  const aseguradoras = doctor.aseguradoras || [];

  // Modalidades
  const modalities = data.modalityPreview && data.modalityPreview.length > 0
    ? data.modalityPreview
    : (doctor.modalidades || []).map((m) => m.modalidad).filter(Boolean);

  const hasVirtual = modalities.some((m) =>
    m.toLowerCase().includes('virtual') || m.toLowerCase().includes('telemedicina')
  );
  const hasPresencial = modalities.some((m) => m.toLowerCase().includes('presencial')) || (doctor.clinicas && doctor.clinicas.length > 0);
  const hasDomicilio = modalities.some((m) => m.toLowerCase().includes('domicilio')) || (doctor.atencion_domicilio && doctor.atencion_domicilio.length > 0);

  // Clínicas
  const clinicas = doctor.clinicas || [];

  return (
    <>
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 220, damping: 26, mass: 0.8 }}
        className={`bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border transition-all overflow-hidden flex flex-col md:flex-row gap-6 items-start relative
          ${isHovered ? 'ring-2 ring-sky-500/50 shadow-md' : ''}
          ${isHighlightedByLocation ? 'ring-2 ring-amber-400/80 shadow-md' : ''}
          ${expandida
            ? 'w-full max-w-[850px] border-sky-200 dark:border-sky-800 shadow-xl ring-1 ring-sky-500/20 col-span-full'
            : 'w-full max-w-[340px] cursor-pointer hover:shadow-md border-slate-100 dark:border-slate-800 hover:border-slate-200'
          } ${className}`}
        onClick={() => !expandida && handleExpand(true)}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Acciones Rápidas Superiores: Favoritos + Compartir */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsShareModalOpen(true);
            }}
            className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 flex items-center justify-center transition-colors cursor-pointer"
            title="Compartir médico"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleFavorite}
            className={`w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer ${
              isFavorito ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
            }`}
            title={isFavorito ? "Quitar de favoritos" : "Guardar en favoritos"}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorito ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
          {expandida && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleExpand(false);
              }}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
              title="Cerrar detalles"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Columna Izquierda: Información Base (Siempre visible) */}
        <motion.div layout className={`flex flex-col w-full ${expandida ? 'md:w-[280px] md:min-w-[280px] shrink-0' : ''}`}>
          <motion.div layout className="flex flex-col items-center gap-1 mt-1">
            <div className="relative w-28 h-28">
              {doctor.exp_foto_perfil ? (
                <motion.img
                  layout="position"
                  src={doctor.exp_foto_perfil}
                  alt={shortName}
                  className="w-28 h-28 rounded-full object-cover border border-slate-100 dark:border-slate-800 shadow-xs"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-2xl flex items-center justify-center border border-slate-200">
                  {initials}
                </div>
              )}
            </div>
            <div className="bg-[#0F172A] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm -mt-4 z-10 relative">
              {priceInfo.label || 'Desde Q 200'}
            </div>
            <motion.h3 layout="position" className="text-lg font-bold text-[#0F172A] dark:text-white mt-2 text-center">
              {shortName} <span className="text-emerald-500 text-sm">●</span>
            </motion.h3>
            <motion.p layout="position" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
              {specialtyPreview[0] || 'Especialista'}
            </motion.p>
          </motion.div>

          <motion.div layout className="flex flex-col gap-3 mt-5 px-1 w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px] font-medium text-slate-600 dark:text-slate-300">
                <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{languages.slice(0, 2).join(', ') || 'ES'}</span>
              </div>
              <div className="flex items-center gap-1">
                {aseguradoras.slice(0, 2).map((ins, idx) => (
                  <InsuranceLogoBadge key={idx} asg={ins} size="xs" />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 text-[13px] font-medium text-slate-600 dark:text-slate-300">
              {hasPresencial && (
                <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400 shrink-0" /><span>Presencial</span></div>
              )}
              {hasPresencial && hasVirtual && <span className="text-slate-300 font-bold">·</span>}
              {hasVirtual && (
                <div className="flex items-center gap-1.5"><Video className="w-4 h-4 text-slate-400 shrink-0" /><span>Virtual</span></div>
              )}
              {hasDomicilio && (hasPresencial || hasVirtual) && <span className="text-slate-300 font-bold">·</span>}
              {hasDomicilio && (
                <div className="flex items-center gap-1.5"><Home className="w-4 h-4 text-slate-400 shrink-0" /><span>Domicilio</span></div>
              )}
            </div>
          </motion.div>

          {!expandida && (
            <motion.div layout className="w-full mt-6">
              <div className="text-center text-[#0284C7] font-semibold text-[13px] py-2.5 bg-[#EFF4FF] hover:bg-blue-50 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 rounded-xl w-full transition-colors select-none">
                Ver opciones y agendar
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Columna Derecha: Sección Expandida (Opciones y Detalles) */}
        <AnimatePresence>
          {expandida && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex-1 flex flex-col md:border-l md:border-slate-100 dark:md:border-slate-800 md:pl-6 w-full overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4 pr-24 hidden md:flex">
                <h4 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider">
                  {clinicas.length > 1 ? `${clinicas.length} Ubicaciones Disponibles` : 'Detalles de Consulta'}
                </h4>
              </div>

              {/* Listado de Sedes Verticales */}
              <div className="flex flex-col gap-2.5 mb-5 max-h-[260px] overflow-y-auto pr-1">
                {clinicas.map((cli, idx) => {
                  const isSelected = (selectedClinicIndex ?? 0) === idx;
                  const cliName = cli.cli_descripcion || `Clínica ${idx + 1}`;
                  const cliPrice = getDoctorLocationPrice(doctor, idx);
                  const zonaClean = cleanZonaText(cli.cli_zona);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClinicSelect(idx);
                      }}
                      className={`rounded-xl p-3 flex justify-between items-center text-left transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-[#F8F9FF] dark:bg-sky-950/40 border-[#0284C7]/40 ring-1 ring-[#0284C7]/20'
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-[14px] font-semibold text-[#0F172A] dark:text-white truncate">
                          {cliName}
                        </span>
                        <span className="text-[12px] text-slate-500 dark:text-slate-400">
                          {zonaClean || cli.cli_direccion_completa || 'Guatemala'} • Consulta: {cliPrice.label}
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-4 shrink-0 transition-all ${
                          isSelected ? 'border-[#0284C7]' : 'border-slate-300 dark:border-slate-600'
                        }`}
                      />
                    </button>
                  );
                })}

                {/* Opción de Atención a Domicilio si el médico la ofrece */}
                {hasDomicilio && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClinicSelect(-1);
                    }}
                    className={`rounded-xl p-3 flex justify-between items-center text-left transition-colors cursor-pointer border ${
                      selectedClinicIndex === -1
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/40 ring-1 ring-emerald-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-[14px] font-semibold text-[#0F172A] dark:text-white truncate">
                        Atención Médica a Domicilio
                      </span>
                      <span className="text-[12px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Cobertura en {cleanZonasDomicilio(doctor.atencion_domicilio?.[0]?.lad_zonas) || 'zonas metropolitanas'}
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-4 shrink-0 transition-all ${
                        selectedClinicIndex === -1 ? 'border-emerald-600' : 'border-slate-300 dark:border-slate-600'
                      }`}
                    />
                  </button>
                )}
              </div>

              {/* Acciones Finales: Ver perfil completo + Agendar */}
              <div className="flex gap-2 mt-auto w-full pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVisit?.(data);
                    router.push(`/dashboard/${doctor.exp_codigo}`);
                  }}
                  className="flex-1 bg-[#EFF4FF] hover:bg-blue-50 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 text-[#0284C7] dark:text-sky-300 font-semibold py-3 rounded-xl text-[13px] transition-colors flex justify-center items-center gap-1.5 cursor-pointer"
                >
                  <Info className="w-4 h-4" />
                  Ver perfil completo
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVisit?.(data);
                    router.push(`/dashboard/${doctor.exp_codigo}/agendar`);
                  }}
                  className="flex-1 bg-[#0284C7] hover:bg-[#0073B1] text-white font-semibold py-3 rounded-xl text-[13px] transition-colors flex justify-center items-center gap-1.5 shadow-[0_2px_8px_rgba(2,132,199,0.2)] cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  Agendar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modal para Compartir Médico */}
      {isShareModalOpen && (
        <ShareDoctorModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          doctor={{
            nombre: shortName,
            especialidad: specialtyPreview[0] || 'Especialista',
            fotoPerfil: doctor.exp_foto_perfil || null,
            expCodigo: doctor.exp_codigo,
            url: `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/${doctor.exp_codigo}`,
          }}
        />
      )}
    </>
  );
}
