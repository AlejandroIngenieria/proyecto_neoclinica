import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            className="fixed inset-0 z-[999] bg-slate-950/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] w-[90%] max-w-sm bg-surface-container-lowest dark:bg-slate-900 rounded-3xl shadow-2xl border border-outline-variant/30 dark:border-slate-800 overflow-hidden text-on-surface dark:text-slate-100"
          >
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/20 dark:border-slate-800 bg-surface-container/30 dark:bg-slate-800/40">
              <h3 className="font-bold text-on-surface dark:text-white text-lg">{title}</h3>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
                className="p-1.5 bg-surface-container dark:bg-slate-800 hover:bg-surface-container-high dark:hover:bg-slate-700 text-on-surface-variant dark:text-slate-300 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 max-h-[50vh] overflow-y-auto">
              <ul className="space-y-3">
                {items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-on-surface-variant dark:text-slate-300 font-medium text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <span className="leading-tight">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function LocationsModal({
  isOpen,
  onClose,
  doctor
}: {
  isOpen: boolean;
  onClose: () => void;
  doctor: DoctorResponse;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            className="fixed inset-0 z-[999] bg-slate-950/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] w-[90%] max-w-md bg-surface-container-lowest dark:bg-slate-900 rounded-3xl shadow-2xl border border-outline-variant/30 dark:border-slate-800 overflow-hidden text-on-surface dark:text-slate-100"
          >
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/20 dark:border-slate-800 bg-surface-container/30 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-on-surface dark:text-white text-base">Ubicaciones y Navegación</h3>
              </div>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
                className="p-1.5 bg-surface-container dark:bg-slate-800 hover:bg-surface-container-high dark:hover:bg-slate-700 text-on-surface-variant dark:text-slate-300 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
              {doctor.clinicas.length > 0 ? (
                doctor.clinicas.map((clinic, idx) => {
                  const query = [clinic.cli_descripcion, clinic.cli_direccion_completa, clinic.cli_zona ? `Zona ${clinic.cli_zona}` : ''].filter(Boolean).join(', ');
                  const gmapsUrl = clinic.cli_url_google_maps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
                  const wazeUrl = clinic.cli_url_waze || `https://waze.com/ul?q=${encodeURIComponent(query)}`;

                  return (
                    <div key={idx} className="p-4 rounded-2xl border border-outline-variant/20 dark:border-slate-800 bg-surface-container/40 dark:bg-slate-800/50 space-y-3">
                      <div>
                        <p className="font-bold text-on-surface dark:text-white text-sm">{clinic.cli_descripcion || `Clínica ${idx + 1}`}</p>
                        <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">{clinic.cli_direccion_completa}</p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={gmapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          <MapPin className="w-3.5 h-3.5" /> Google Maps
                        </a>
                        <a
                          href={wazeUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white py-2 px-3 rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          <MapPin className="w-3.5 h-3.5" /> Waze
                        </a>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-on-surface-variant dark:text-slate-400 text-center py-4">No hay ubicaciones clínicas especificadas.</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
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

  const handleCardClick = () => {
    onVisit?.(data);
    router.push(`/dashboard/${doctor.exp_codigo}`);
  };

  if (isListView) {
    return (
      <div 
        onClick={handleCardClick}
        className="doctor-card group flex flex-col sm:flex-row h-auto sm:min-h-[210px] bg-surface rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 border border-outline-variant/30 relative cursor-pointer"
      >
        {/* Left Column: Photo & Badges */}
        <div className="w-full sm:w-[160px] md:w-[180px] h-[190px] sm:h-auto shrink-0 border-b sm:border-b-0 sm:border-r relative border-outline-variant/30 overflow-hidden bg-surface-container">
          {titular && (
            <button 
              type="button"
              onClick={toggleFavorite}
              className="absolute top-2.5 right-2.5 z-20 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-full shadow-sm hover:scale-110 transition-transform"
              aria-label={isFavorito ? "Quitar de favoritos" : "Guardar en favoritos"}
            >
              <Heart className={`w-4 h-4 ${isFavorito ? 'fill-rose-500 text-rose-500' : 'text-slate-500 dark:text-slate-300'}`} />
            </button>
          )}
          {doctor.exp_anios_experiencia ? (
            <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-slate-900/80 backdrop-blur-md text-white px-2 py-1 rounded-md text-[10px] font-bold tracking-wider shadow-sm">
              <Award className="w-3 h-3 text-amber-400" />
              <span>{doctor.exp_anios_experiencia} AÑOS</span>
            </div>
          ) : null}
          {doctor.exp_foto_perfil ? (
            <Image
              src={doctor.exp_foto_perfil}
              alt={fullName}
              fill
              priority={true}
              sizes="(max-width: 768px) 100vw, 25vw"
              className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl font-black text-on-surface-variant">
              {initials}
            </div>
          )}
        </div>
        
        {/* Middle Column: Doctor Information */}
        <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 min-w-0">
          <div className="space-y-2 min-w-0">
            {/* Name + Rating */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg sm:text-xl font-bold text-on-surface dark:text-white leading-snug group-hover:text-primary transition-colors truncate" title={fullName}>
                <HighlightText text={fullName} highlight={searchHighlight} />
              </h2>
              {doctor.promedio_valoracion > 0 && (
                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200/50 dark:border-amber-800/40 shrink-0">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{doctor.promedio_valoracion.toFixed(1)}</span>
                  <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80">({doctor.total_resenas})</span>
                </div>
              )}
            </div>

            {/* Specialty Row */}
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-outline dark:text-slate-400 shrink-0">Especialidad:</span>
              <p className="text-on-surface dark:text-slate-200 font-semibold text-sm truncate">
                <HighlightText text={data.matchedSpecialty || specialtyPreview[0] || 'General'} highlight={searchHighlight} />
              </p>
              {specialtyPreview.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSpecialties(true); }}
                  className="inline-flex items-center justify-center bg-primary/10 hover:bg-primary/20 transition-colors text-primary text-xs font-bold px-2 py-0.5 rounded-lg cursor-pointer shrink-0"
                >
                  +{specialtyPreview.length - 1} más
                </button>
              )}
            </div>
            
            {/* Location Row */}
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <p className="text-on-surface-variant dark:text-slate-300 font-medium text-xs sm:text-sm truncate max-w-[280px] sm:max-w-md">
                <HighlightText text={data.matchedLocation || data.locationPreview[0] || 'Sin ubicación'} highlight={searchHighlight} />
              </p>
              {data.locationPreview.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowLocations(true); }}
                  className="inline-flex items-center gap-1 bg-surface-container hover:bg-surface-container-high dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors text-on-surface dark:text-slate-200 text-xs font-bold px-2 py-0.5 rounded-lg cursor-pointer shrink-0 border border-outline-variant/20"
                >
                  +{data.locationPreview.length - 1} ubicaciones
                </button>
              )}
            </div>
          </div>

          {/* Modalities Row */}
          <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-outline-variant/20">
            {modalityPreview.map((modality, idx) => {
              const displayModality = modality.toLowerCase() === 'a domicilio' ? 'domicilio' : modality.toLowerCase();
              return (
                <div key={idx} className="flex items-center gap-1.5 bg-surface-container-high dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-outline-variant/20 dark:border-slate-800">
                  {getModalityIcon(modality)}
                  <span className="text-xs font-medium text-on-surface dark:text-slate-300 capitalize">{displayModality}</span>
                </div>
              );
            })}
            {modalityPreview.length === 0 && (
              <div className="flex items-center gap-1.5 bg-surface-container-high dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-outline-variant/20 dark:border-slate-800">
                <MapPin className="text-outline text-[14px] h-[14px] w-[14px]" />
                <span className="text-xs font-medium text-on-surface dark:text-slate-300">Presencial</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pricing & Actions */}
        <div className="p-4 sm:p-5 w-full sm:w-[200px] md:w-[220px] shrink-0 border-t sm:border-t-0 sm:border-l border-outline-variant/30 flex flex-col justify-between items-center sm:items-end gap-3 bg-surface-container-lowest/40 dark:bg-slate-900/40">
          <div className="flex flex-col items-center sm:items-end w-full">
            <span className="text-[10px] font-bold uppercase tracking-widest text-outline dark:text-slate-400">Consulta desde</span>
            <span className="font-bold text-primary text-xl sm:text-2xl">{priceLabel}</span>
          </div>

          <div className="flex flex-col w-full gap-2">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowLocations(true); }}
              className="w-full py-1.5 px-3 border border-outline-variant/40 bg-surface dark:bg-slate-800 rounded-xl font-bold text-xs hover:bg-surface-container transition-colors text-on-surface dark:text-slate-200 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <MapPin className="w-3.5 h-3.5 text-primary" /> Ver ubicaciones
            </button>
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCardClick();
                }}
                className="flex-1 py-2 px-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-bold text-xs transition-colors text-center truncate"
              >
                Ver Perfil
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/dashboard/agendar/${doctor.exp_codigo}`); }}
                className="flex-1 py-2 px-2 bg-primary hover:bg-primary/90 text-on-primary rounded-xl font-bold text-xs transition-colors text-center truncate shadow-sm"
              >
                Agendar
              </button>
            </div>
          </div>
        </div>

        <MiniModal isOpen={showSpecialties} onClose={() => setShowSpecialties(false)} title="Especialidades del médico" items={specialtyPreview} />
        <LocationsModal isOpen={showLocations} onClose={() => setShowLocations(false)} doctor={doctor} />
      </div>
    );
  }

  return (
    <div 
      onClick={handleCardClick}
      className="doctor-card h-full group flex flex-col bg-surface rounded-3xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-outline-variant/30 hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-pointer relative"
    >
      <div className="w-full h-[220px] bg-surface-container relative shrink-0 border-b border-outline-variant/20 overflow-hidden">
        {titular && (
          <button 
            type="button"
            onClick={toggleFavorite}
            className="absolute top-3 right-3 z-20 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-full shadow-sm hover:scale-110 transition-transform"
            aria-label={isFavorito ? "Quitar de favoritos" : "Guardar en favoritos"}
          >
            <Heart className={`w-4.5 h-4.5 ${isFavorito ? 'fill-rose-500 text-rose-500' : 'text-slate-500 dark:text-slate-300'}`} />
          </button>
        )}
        {doctor.exp_anios_experiencia ? (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-slate-900/70 backdrop-blur-md text-white px-2 py-1 rounded-md text-[11px] font-bold tracking-wider shadow-sm">
            <Award className="w-3.5 h-3.5 text-amber-400" />
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
          <h3 className="font-display text-[20px] font-bold text-on-surface dark:text-white mb-1 leading-tight truncate group-hover:text-primary transition-colors" title={fullName}>
            <HighlightText text={fullName} highlight={searchHighlight} />
          </h3>
          <div className="flex justify-center items-center gap-1.5 h-[20px] relative">
            <p className="text-on-surface-variant dark:text-slate-300 font-medium text-sm truncate max-w-[180px]">
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
            <p className="text-outline dark:text-slate-400 font-medium text-xs truncate max-w-[180px]">
              <HighlightText text={data.matchedLocation || data.locationPreview[0] || 'Sin ubicación'} highlight={searchHighlight} />
            </p>
            {data.locationPreview.length > 1 && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowLocations(true); }}
                className="inline-flex items-center justify-center bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface text-[10px] font-bold px-1.5 h-5 rounded-md cursor-pointer"
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
              <span className="text-sm font-bold text-on-surface dark:text-white">{doctor.promedio_valoracion.toFixed(1)}</span>
              <span className="text-xs text-outline">({doctor.total_resenas})</span>
            </div>
          )}
          {doctor.exp_anios_experiencia ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-surface-container rounded text-[10px] font-bold text-on-surface-variant border border-outline-variant/20">
              <Award className="h-3 w-3 text-amber-400" />
              {doctor.exp_anios_experiencia} años
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap shrink-0 items-center justify-center gap-1.5 mb-4 px-2">
          {modalityPreview.map((modality, idx) => {
            const displayModality = modality.toLowerCase() === 'a domicilio' ? 'domicilio' : modality.toLowerCase();
            return (
              <div key={idx} className="flex items-center gap-1 bg-surface-container px-1.5 py-0.5 rounded-md border border-outline-variant/20">
                {getModalityIcon(modality)}
                <span className="text-[10px] font-medium text-on-surface-variant capitalize">{displayModality}</span>
              </div>
            );
          })}
          {modalityPreview.length === 0 && (
             <div className="flex items-center gap-1 bg-surface-container px-1.5 py-0.5 rounded-md border border-outline-variant/20">
               <MapPin className="text-outline text-[12px] h-[12px] w-[12px]" />
               <span className="text-[10px] font-medium text-on-surface-variant">Presencial</span>
             </div>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-4 border-t border-outline-variant/20">
          <div className="flex flex-col items-center mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Consulta desde</span>
            <span className="font-bold text-primary text-xl">{priceLabel}</span>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowLocations(true); }}
              className="w-full bg-surface text-on-surface py-2 rounded-xl text-sm font-semibold border border-outline-variant/40 hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4 text-primary" /> Ver ubicaciones
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCardClick();
                }}
                className="flex-1 bg-primary/10 text-primary py-2.5 rounded-xl text-sm font-bold hover:bg-primary/20 transition-colors border border-transparent"
              >
                Ver Perfil
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/dashboard/agendar/${doctor.exp_codigo}`); }}
                className="flex-1 bg-primary text-on-primary py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                Agendar
              </button>
            </div>
          </div>
        </div>
      </div>
      <MiniModal isOpen={showSpecialties} onClose={() => setShowSpecialties(false)} title="Especialidades del médico" items={specialtyPreview} />
      <LocationsModal isOpen={showLocations} onClose={() => setShowLocations(false)} doctor={doctor} />
    </div>
  );
}