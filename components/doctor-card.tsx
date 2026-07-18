'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { Star, MapPin, Video, Home, Award, Heart, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DoctorResponse } from '@/types';
import { useFavoritos, useAddFavorito, useRemoveFavorito } from '@/hooks/use-favoritos';
import { usePacienteTitular } from '@/hooks/use-pacientes';

export type DoctorCardData = {
  doctor: DoctorResponse;
  fullName: string;
  specialtyPreview: string[];
  modalityPreview: string[];
  locationPreview: string[];
  matchedLocation?: string;
  matchedSpecialty?: string;
  searchHighlight?: string | string[];
};

type DoctorCardProps = {
  data: DoctorCardData;
  onVisit?: (data: DoctorCardData) => void;
  isListView?: boolean;
};

function getLowestPrice(doctor: DoctorResponse): number | null {
  const prices = [
    ...doctor.servicios.map((s) => s.syp_costo_total),
    ...doctor.clinicas.map((c) => c.mcl_precio_base),
  ].filter((p): p is number => typeof p === 'number' && Number.isFinite(p) && p >= 0);
  return prices.length ? Math.min(...prices) : null;
}

function HighlightText({ text, highlight }: { text: string; highlight?: string | string[] }) {
  if (!highlight || (Array.isArray(highlight) ? highlight.length === 0 : !highlight.trim())) {
    return <>{text}</>;
  }
  
  const terms = Array.isArray(highlight) ? highlight : [highlight];
  const validTerms = terms.map(t => t.trim()).filter(Boolean);
  
  if (validTerms.length === 0) return <>{text}</>;

  const escapedTerms = validTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => {
        const isMatch = validTerms.some(term => part.toLowerCase() === term.toLowerCase());
        return isMatch ? (
          <mark key={i} className="bg-primary/20 text-primary font-bold rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

function MiniModal({
  isOpen,
  onClose,
  title,
  items
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: string[];
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            className="fixed inset-0 z-[100] bg-slate-900/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[90%] max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 max-h-[50vh] overflow-y-auto">
              <ul className="space-y-3">
                {items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-600 font-medium text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <span className="leading-tight">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function DoctorCard({ data, onVisit, isListView = false }: DoctorCardProps) {
  const router = useRouter();
  
  const { titular } = usePacienteTitular();
  const codPac = titular?.pac_codigo;
  const { data: favoritos = [] } = useFavoritos(codPac);
  const addFavMutation = useAddFavorito();
  const removeFavMutation = useRemoveFavorito();

  const [showSpecialties, setShowSpecialties] = useState(false);
  const [showLocations, setShowLocations] = useState(false);

  const isFavorito = favoritos.some(f => f.expCodigo === data.doctor.exp_codigo);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!codPac) return;
    
    if (isFavorito) {
      removeFavMutation.mutate({ codPac, codDoc: data.doctor.exp_codigo });
    } else {
      addFavMutation.mutate({ codPac, codDoc: data.doctor.exp_codigo });
    }
  };

  const { doctor, fullName, modalityPreview, matchedSpecialty, searchHighlight } = data;
  let specialtyPreview = [...data.specialtyPreview];

  if (matchedSpecialty) {
    const matchIndex = specialtyPreview.findIndex(s => s.toLowerCase() === matchedSpecialty.toLowerCase());
    if (matchIndex > 0) {
      const [matched] = specialtyPreview.splice(matchIndex, 1);
      specialtyPreview.unshift(matched);
    }
  }

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('') || 'MD';

  const basePrice = getLowestPrice(doctor);
  const priceLabel = basePrice !== null ? `Q${new Intl.NumberFormat('es-GT').format(basePrice)}` : '—';

  const getModalityIcon = (modality: string) => {
    const m = modality.toLowerCase();
    if (m.includes('presencial')) return <MapPin className="text-outline text-[18px] h-[18px] w-[18px]" />;
    if (m.includes('virtual') || m.includes('tele')) return <Video className="text-outline text-[18px] h-[18px] w-[18px]" />;
    if (m.includes('domicilio')) return <Home className="text-outline text-[18px] h-[18px] w-[18px]" />;
    return <MapPin className="text-outline text-[18px] h-[18px] w-[18px]" />;
  };

  if (isListView) {
    return (
      <div className="doctor-card group flex flex-col sm:flex-row h-auto sm:h-[220px] bg-surface rounded-2xl overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-1.5 transition-all duration-500 border border-outline-variant/30 relative">
        <div className="w-full sm:w-[160px] md:w-[180px] h-[200px] sm:h-full shrink-0 border-b sm:border-b-0 sm:border-r relative border-outline-variant/30 overflow-hidden bg-surface-container">
          {titular && (
            <button 
              onClick={toggleFavorite}
              className="absolute top-2 right-2 z-20 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-full shadow-sm hover:scale-110 transition-transform"
              aria-label={isFavorito ? "Quitar de favoritos" : "Guardar en favoritos"}
            >
              <Heart className={`w-4 h-4 ${isFavorito ? 'fill-rose-500 text-rose-500' : 'text-slate-500 dark:text-slate-300'}`} />
            </button>
          )}
          {doctor.exp_anios_experiencia ? (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-slate-900/70 backdrop-blur-md text-white px-2 py-1 rounded-md text-[10px] font-bold tracking-wider shadow-sm">
              <Award className="w-3 h-3" />
              <span>{doctor.exp_anios_experiencia} AÑOS</span>
            </div>
          ) : null}
          {doctor.exp_foto_perfil ? (
            <Image
              src={doctor.exp_foto_perfil}
              alt={fullName}
              fill
              priority={true}
              sizes="(max-width: 768px) 100vw, 33vw"
              className="w-full h-full object-cover object-top transition-all duration-300 ease-out"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl font-black text-on-surface-variant">
              {initials}
            </div>
          )}
        </div>
        
        <div className="p-4 flex flex-col sm:flex-row gap-4 items-center w-full min-w-0 flex-grow">
          <div className="flex flex-col flex-grow min-w-0">
            <div className="min-w-0">
              <h2 className="font-display text-[18px] md:text-[22px] font-bold text-slate-900 leading-tight truncate" title={fullName}>
                <HighlightText text={fullName} highlight={searchHighlight} />
              </h2>
              <div className="flex items-center gap-1.5 mt-1 relative">
                <p className="text-slate-500 font-medium text-sm md:text-base truncate max-w-[150px] md:max-w-[250px]">
                  <HighlightText text={data.matchedSpecialty || specialtyPreview[0] || 'General'} highlight={searchHighlight} />
                </p>
                {specialtyPreview.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSpecialties(true); }}
                    className="inline-flex items-center justify-center bg-primary/10 hover:bg-primary/20 transition-colors text-primary text-[10px] font-bold px-1.5 h-5 rounded-md cursor-pointer"
                  >
                    +{specialtyPreview.length - 1}
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-slate-500 font-medium text-xs md:text-sm truncate max-w-[150px] md:max-w-[250px]">
                  <HighlightText text={data.matchedLocation || data.locationPreview[0] || 'Sin ubicación'} highlight={searchHighlight} />
                </p>
                {data.locationPreview.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowLocations(true); }}
                    className="inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 text-[10px] font-bold px-1.5 h-5 rounded-md cursor-pointer"
                  >
                    +{data.locationPreview.length - 1}
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-4 shrink-0">
              {modalityPreview.map((modality, idx) => {
                const displayModality = modality.toLowerCase() === 'a domicilio' ? 'domicilio' : modality.toLowerCase();
                return (
                  <div key={idx} className="flex items-center gap-1">
                    {getModalityIcon(modality)}
                    <span className="text-[11px] text-on-surface-variant capitalize">{displayModality}</span>
                  </div>
                );
              })}
              {modalityPreview.length === 0 && (
                 <div className="flex items-center gap-1">
                   <MapPin className="text-outline text-[14px] h-[14px] w-[14px]" />
                   <span className="text-[11px] text-on-surface-variant">Presencial</span>
                 </div>
              )}
            </div>
          </div>

          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto shrink-0 gap-3 sm:pl-4 sm:border-l border-outline-variant/30">
            <div className="flex flex-col items-start sm:items-end w-full">
              <div className="flex items-center gap-2 mb-2">
                {doctor.promedio_valoracion > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-bold text-slate-700">{doctor.promedio_valoracion.toFixed(1)}</span>
                    <span className="text-xs text-slate-500">({doctor.total_resenas})</span>
                  </div>
                )}
                {doctor.exp_anios_experiencia ? (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 rounded text-[10px] font-bold text-slate-600 border border-slate-200">
                    <Award className="h-3 w-3 text-slate-400" />
                    {doctor.exp_anios_experiencia} años
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col items-start sm:items-end w-full mt-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Consulta desde</span>
                <span className="font-bold text-blue-600 text-[20px] md:text-[24px]">{priceLabel}</span>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row w-full sm:w-auto gap-2">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                className="px-4 py-2.5 w-full sm:w-auto border border-outline-variant rounded-xl font-bold text-sm hover:bg-surface-container transition-colors text-on-surface text-center whitespace-nowrap flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4" /> Ver mapa
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onVisit?.(data);
                  router.push(`/dashboard/${doctor.exp_codigo}`);
                }}
                className="px-4 py-2.5 w-full sm:w-auto bg-blue-100 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-200 transition-colors text-center whitespace-nowrap"
              >
                Ver Perfil
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/dashboard/agendar/${doctor.exp_codigo}`); }}
                className="px-4 py-2.5 w-full sm:w-auto bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-800 transition-colors text-center whitespace-nowrap"
              >
                Agendar
              </button>
            </div>
          </div>
        </div>
        <MiniModal isOpen={showSpecialties} onClose={() => setShowSpecialties(false)} title="Especialidades" items={specialtyPreview} />
        <MiniModal isOpen={showLocations} onClose={() => setShowLocations(false)} title="Ubicaciones" items={data.locationPreview} />
      </div>
    );
  }

  return (
    <div className="doctor-card h-full group flex flex-col bg-surface rounded-3xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-outline-variant/30 hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-pointer relative">
      <div className="w-full h-[220px] bg-surface-container relative shrink-0 border-b border-outline-variant/20 overflow-hidden">
        {titular && (
          <button 
            onClick={toggleFavorite}
            className="absolute top-3 right-3 z-20 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-full shadow-sm hover:scale-110 transition-transform"
            aria-label={isFavorito ? "Quitar de favoritos" : "Guardar en favoritos"}
          >
            <Heart className={`w-4.5 h-4.5 ${isFavorito ? 'fill-rose-500 text-rose-500' : 'text-slate-500 dark:text-slate-300'}`} />
          </button>
        )}
        {doctor.exp_anios_experiencia ? (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-slate-900/70 backdrop-blur-md text-white px-2 py-1 rounded-md text-[11px] font-bold tracking-wider shadow-sm">
            <Award className="w-3.5 h-3.5" />
            <span>{doctor.exp_anios_experiencia} AÑOS</span>
          </div>
        ) : null}
        {doctor.exp_foto_perfil ? (
          <Image
            src={doctor.exp_foto_perfil}
            alt={fullName}
            fill
            priority={true}
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl font-black text-on-surface-variant">
            {initials}
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-5">
        <div className="text-center mb-4">
          <h3 className="font-display text-[20px] font-bold text-slate-900 mb-1 leading-tight truncate" title={fullName}>
            <HighlightText text={fullName} highlight={searchHighlight} />
          </h3>
          <div className="flex justify-center items-center gap-1.5 h-[20px] relative">
            <p className="text-slate-500 font-medium text-sm truncate max-w-[180px]">
              <HighlightText text={data.matchedSpecialty || specialtyPreview[0] || 'General'} highlight={searchHighlight} />
            </p>
            {specialtyPreview.length > 1 && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSpecialties(true); }}
                className="inline-flex items-center justify-center bg-primary/10 hover:bg-primary/20 transition-colors text-primary text-[10px] font-bold px-1.5 h-5 rounded-md cursor-pointer"
              >
                +{specialtyPreview.length - 1}
              </button>
            )}
          </div>
          <div className="flex justify-center items-center gap-1.5 h-[20px] relative mt-1">
            <p className="text-slate-500 font-medium text-xs truncate max-w-[180px]">
              <HighlightText text={data.matchedLocation || data.locationPreview[0] || 'Sin ubicación'} highlight={searchHighlight} />
            </p>
            {data.locationPreview.length > 1 && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowLocations(true); }}
                className="inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 text-[10px] font-bold px-1.5 h-5 rounded-md cursor-pointer"
              >
                +{data.locationPreview.length - 1}
              </button>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-4">
          {doctor.promedio_valoracion > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold text-slate-700">{doctor.promedio_valoracion.toFixed(1)}</span>
              <span className="text-xs text-slate-500">({doctor.total_resenas})</span>
            </div>
          )}
          {doctor.exp_anios_experiencia ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 rounded text-[10px] font-bold text-slate-600 border border-slate-200">
              <Award className="h-3 w-3 text-slate-400" />
              {doctor.exp_anios_experiencia} años
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap shrink-0 items-center justify-center gap-1.5 mb-4 px-2">
          {modalityPreview.map((modality, idx) => {
            const displayModality = modality.toLowerCase() === 'a domicilio' ? 'domicilio' : modality.toLowerCase();
            return (
              <div key={idx} className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded-md border border-slate-100 dark:border-slate-800">
                {getModalityIcon(modality)}
                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 capitalize">{displayModality}</span>
              </div>
            );
          })}
          {modalityPreview.length === 0 && (
             <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded-md border border-slate-100 dark:border-slate-800">
               <MapPin className="text-slate-400 text-[12px] h-[12px] w-[12px]" />
               <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">Presencial</span>
             </div>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-4 border-t border-outline-variant/20">
          <div className="flex flex-col items-center mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Consulta desde</span>
            <span className="font-bold text-blue-600 text-xl">{priceLabel}</span>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className="w-full bg-white text-slate-700 py-2 rounded-xl text-sm font-semibold border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4" /> Ver mapa
            </button>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onVisit) onVisit(data);
                  router.push(`/dashboard/${doctor.exp_codigo}`);
                }}
                className="flex-1 bg-blue-100 text-blue-600 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-200 transition-colors border border-transparent"
              >
                Ver Perfil
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/dashboard/agendar/${doctor.exp_codigo}`); }}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-800 transition-colors"
              >
                Agendar
              </button>
            </div>
          </div>
        </div>
      </div>
      <MiniModal isOpen={showSpecialties} onClose={() => setShowSpecialties(false)} title="Especialidades" items={specialtyPreview} />
      <MiniModal isOpen={showLocations} onClose={() => setShowLocations(false)} title="Ubicaciones" items={data.locationPreview} />
    </div>
  );
}