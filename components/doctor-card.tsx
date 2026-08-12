import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Star, MapPin, Video, Home, Award, Heart, X, Share2, Globe, ChevronRight } from 'lucide-react';
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

function getSocialIcon(name: string, className = "w-4 h-4") {
  const network = name.trim().toLowerCase();
  if (network.includes('whatsapp')) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
      </svg>
    );
  }
  if (network.includes('facebook')) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    );
  }
  if (network.includes('instagram')) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    );
  }
  if (network.includes('linkedin')) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    );
  }
  if (network.includes('tiktok')) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
      </svg>
    );
  }
  if (network.includes('x') || network.includes('twitter')) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
      </svg>
    );
  }
  return <Globe className={className} />;
}

function SocialModal({
  isOpen,
  onClose,
  fullName,
  redesSociales
}: {
  isOpen: boolean;
  onClose: () => void;
  fullName: string;
  redesSociales?: { red_social: string; url: string }[];
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
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-on-surface dark:text-white text-base">Redes Sociales</h3>
              </div>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
                className="p-1.5 bg-surface-container dark:bg-slate-800 hover:bg-surface-container-high dark:hover:bg-slate-700 text-on-surface-variant dark:text-slate-300 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-outline dark:text-slate-400 font-medium mb-1">
                Perfiles de {fullName}:
              </p>
              {redesSociales && redesSociales.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {redesSociales.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container/60 dark:bg-slate-800/60 hover:bg-primary/10 hover:text-primary transition-colors border border-outline-variant/20 dark:border-slate-800 text-sm font-semibold group"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        {getSocialIcon(item.red_social)}
                      </div>
                      <span className="capitalize flex-1 truncate">{item.red_social}</span>
                      <ChevronRight className="w-4 h-4 text-outline group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center space-y-2">
                  <Globe className="w-10 h-10 text-outline mx-auto opacity-40" />
                  <p className="text-sm font-medium text-on-surface-variant dark:text-slate-400">
                    Este especialista no tiene redes sociales configuradas.
                  </p>
                </div>
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
  const [showSocial, setShowSocial] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const url = `${window.location.origin}/dashboard/${data.doctor.exp_codigo}`;
    const shareData = {
      title: data.fullName,
      text: `Perfil profesional de ${data.fullName} en NeoClínica`,
      url,
    };

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled share
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback
    }
  };

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
    if (m.includes('presencial')) return <MapPin className="text-slate-500 dark:text-slate-400 group-hover/tooltip:text-sky-600 dark:group-hover/tooltip:text-sky-400 h-3.5 w-3.5 shrink-0 transition-colors" />;
    if (m.includes('virtual') || m.includes('tele')) return <Video className="text-slate-500 dark:text-slate-400 group-hover/tooltip:text-sky-600 dark:group-hover/tooltip:text-sky-400 h-3.5 w-3.5 shrink-0 transition-colors" />;
    if (m.includes('domicilio')) return <Home className="text-slate-500 dark:text-slate-400 group-hover/tooltip:text-sky-600 dark:group-hover/tooltip:text-sky-400 h-3.5 w-3.5 shrink-0 transition-colors" />;
    return <MapPin className="text-slate-500 dark:text-slate-400 group-hover/tooltip:text-sky-600 dark:group-hover/tooltip:text-sky-400 h-3.5 w-3.5 shrink-0 transition-colors" />;
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
          <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowSocial(true);
              }}
              className="p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-full shadow-sm hover:scale-110 transition-transform text-slate-600 dark:text-slate-300 hover:text-primary"
              title="Redes Sociales"
              aria-label="Redes Sociales"
            >
              <Globe className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-full shadow-sm hover:scale-110 transition-transform text-slate-600 dark:text-slate-300 hover:text-primary relative"
              title="Compartir perfil"
              aria-label="Compartir perfil"
            >
              <Share2 className="w-4 h-4" />
              {copied && (
                <span className="absolute -bottom-7 right-0 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap shadow-lg animate-in fade-in z-30">
                  ¡Copiado!
                </span>
              )}
            </button>
            {titular && (
              <button 
                type="button"
                onClick={toggleFavorite}
                className="p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-full shadow-sm hover:scale-110 transition-transform"
                aria-label={isFavorito ? "Quitar de favoritos" : "Guardar en favoritos"}
                title={isFavorito ? "Quitar de favoritos" : "Guardar en favoritos"}
              >
                <Heart className={`w-4 h-4 ${isFavorito ? 'fill-rose-500 text-rose-500' : 'text-slate-500 dark:text-slate-300'}`} />
              </button>
            )}
          </div>
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
        <SocialModal isOpen={showSocial} onClose={() => setShowSocial(false)} fullName={fullName} redesSociales={doctor.redes_sociales} />
      </div>
    );
  }

  return (
    <div 
      onClick={handleCardClick}
      className="doctor-card h-full group flex flex-col bg-surface rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-outline-variant/30 hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:z-30 transition-all duration-300 cursor-pointer relative"
    >
      {/* 1. Rediseño de Imagen (aspect-[4/3] horizontal) */}
      <div className="w-full aspect-[4/3] bg-surface-container relative shrink-0 overflow-hidden rounded-t-2xl">
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowSocial(true);
            }}
            className="p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-full shadow-sm hover:scale-110 transition-transform text-slate-600 dark:text-slate-300 hover:text-primary"
            title="Redes Sociales"
            aria-label="Redes Sociales"
          >
            <Globe className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-full shadow-sm hover:scale-110 transition-transform text-slate-600 dark:text-slate-300 hover:text-primary relative"
            title="Compartir perfil"
            aria-label="Compartir perfil"
          >
            <Share2 className="w-4 h-4" />
            {copied && (
              <span className="absolute -bottom-7 right-0 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap shadow-lg animate-in fade-in z-30">
                ¡Copiado!
              </span>
            )}
          </button>
          {titular && (
            <button 
              type="button"
              onClick={toggleFavorite}
              className="p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-full shadow-sm hover:scale-110 transition-transform"
              aria-label={isFavorito ? "Quitar de favoritos" : "Guardar en favoritos"}
              title={isFavorito ? "Quitar de favoritos" : "Guardar en favoritos"}
            >
              <Heart className={`w-4 h-4 ${isFavorito ? 'fill-rose-500 text-rose-500' : 'text-slate-500 dark:text-slate-300'}`} />
            </button>
          )}
        </div>
        {doctor.exp_anios_experiencia ? (
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-slate-900/80 backdrop-blur-md text-white px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider shadow-sm">
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
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 20vw"
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-black text-on-surface-variant">
            {initials}
          </div>
        )}
      </div>

      {/* 2. Cuerpo de Tarjeta Compacto */}
      <div className="flex flex-col flex-1 p-3 space-y-1.5 min-w-0">
        <div className="space-y-1 min-w-0">
          {/* Nombre + Rating */}
          <div className="flex items-center justify-between gap-1 min-w-0">
            <h3 className="font-display text-sm font-bold text-on-surface dark:text-white leading-tight truncate flex-1 min-w-0 group-hover:text-primary transition-colors" title={fullName}>
              <HighlightText text={fullName} highlight={searchHighlight} />
            </h3>
            {doctor.promedio_valoracion > 0 && (
              <div className="flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/50 shrink-0">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">{doctor.promedio_valoracion.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Especialidad */}
          <div className="flex items-center gap-1 min-w-0">
            <p className="text-xs text-on-surface-variant dark:text-slate-300 font-semibold truncate flex-1 min-w-0">
              <HighlightText text={data.matchedSpecialty || specialtyPreview[0] || 'General'} highlight={searchHighlight} />
            </p>
            {specialtyPreview.length > 1 && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSpecialties(true); }}
                className="inline-flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold px-1.5 h-4 rounded cursor-pointer shrink-0"
              >
                +{specialtyPreview.length - 1}
              </button>
            )}
          </div>

          {/* Ubicación / Hospital Truncado con badge en la misma línea */}
          <div className="flex items-center gap-1 min-w-0">
            <MapPin className="w-3 h-3 text-primary shrink-0" />
            <p className="text-xs text-outline dark:text-slate-400 font-medium truncate flex-1 min-w-0">
              <HighlightText text={data.matchedLocation || data.locationPreview[0] || 'Sin ubicación'} highlight={searchHighlight} />
            </p>
            {data.locationPreview.length > 1 && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowLocations(true); }}
                className="inline-flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-on-surface text-[10px] font-bold px-1.5 h-4 rounded cursor-pointer shrink-0"
              >
                +{data.locationPreview.length - 1}
              </button>
            )}
          </div>
        </div>

        {/* 3. Modalidades sólo Iconos (con tooltip elegante de alta superposición) */}
        <div className="flex items-center gap-1.5 pt-0.5 relative z-20">
          {modalityPreview.map((modality, idx) => {
            const displayModality = modality.toLowerCase() === 'a domicilio' ? 'A Domicilio' : modality;
            return (
              <div key={idx} className="relative group/tooltip inline-flex items-center">
                <div 
                  className="flex items-center justify-center p-1.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg border border-slate-200/80 dark:border-slate-700/80 hover:border-sky-300 dark:hover:border-sky-800 transition-all duration-200 shadow-2xs"
                >
                  {getModalityIcon(modality)}
                </div>
                {/* Custom Glassmorphic Tooltip con Superposición z-[100] */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:flex flex-col items-center pointer-events-none z-[100] animate-in fade-in zoom-in-95 duration-150">
                  <div className="bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 backdrop-blur-md text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-lg shadow-2xl whitespace-nowrap border border-slate-700/60 dark:border-slate-300/60">
                    {displayModality}
                  </div>
                  <div className="w-0 h-0 border-x-[4px] border-x-transparent border-t-[5px] border-t-slate-900/95 dark:border-t-slate-100/95 -mt-[1px]" />
                </div>
              </div>
            );
          })}
          {modalityPreview.length === 0 && (
            <div className="relative group/tooltip inline-flex items-center">
              <div className="flex items-center justify-center p-1.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg border border-slate-200/80 dark:border-slate-700/80 hover:border-sky-300 dark:hover:border-sky-800 transition-all duration-200 shadow-2xs">
                <MapPin className="text-slate-500 dark:text-slate-400 group-hover/tooltip:text-sky-600 dark:group-hover/tooltip:text-sky-400 h-3.5 w-3.5 shrink-0 transition-colors" />
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:flex flex-col items-center pointer-events-none z-[100] animate-in fade-in zoom-in-95 duration-150">
                <div className="bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 backdrop-blur-md text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-lg shadow-2xl whitespace-nowrap border border-slate-700/60 dark:border-slate-300/60">
                  Presencial
                </div>
                <div className="w-0 h-0 border-x-[4px] border-x-transparent border-t-[5px] border-t-slate-900/95 dark:border-t-slate-100/95 -mt-[1px]" />
              </div>
            </div>
          )}
        </div>

        {/* 4. Botones y Precio Anclados al fondo (mt-auto) */}
        <div className="mt-auto space-y-1.5 pt-2">
          {/* Precio Agrupado */}
          <div className="flex items-baseline gap-1.5 pb-1 border-b border-outline-variant/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">Consulta desde</span>
            <span className="font-black text-primary text-lg leading-tight">{priceLabel}</span>
          </div>

          {/* Botón Ver Ubicaciones */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowLocations(true); }}
            className="w-full bg-surface text-on-surface py-1 px-2 rounded-lg text-xs font-semibold border border-outline-variant/40 hover:bg-surface-container transition-colors flex items-center justify-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" /> Ver ubicaciones
          </button>

          {/* Botones Ver Perfil y Agendar */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCardClick();
              }}
              className="w-full bg-primary/10 text-primary py-1 px-2 rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors border border-transparent truncate"
            >
              Ver Perfil
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/dashboard/agendar/${doctor.exp_codigo}`); }}
              className="w-full bg-primary text-on-primary py-1 px-2 rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors truncate shadow-xs"
            >
              Agendar
            </button>
          </div>
        </div>
      </div>

      <MiniModal isOpen={showSpecialties} onClose={() => setShowSpecialties(false)} title="Especialidades del médico" items={specialtyPreview} />
      <LocationsModal isOpen={showLocations} onClose={() => setShowLocations(false)} doctor={doctor} />
      <SocialModal isOpen={showSocial} onClose={() => setShowSocial(false)} fullName={fullName} redesSociales={doctor.redes_sociales} />
    </div>
  );
}