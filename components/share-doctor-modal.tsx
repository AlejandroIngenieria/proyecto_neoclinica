'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  Download,
  Share2,
  Mail,
  Send,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export interface ShareDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: {
    nombre: string;
    especialidad?: string;
    fotoPerfil?: string | null;
    expCodigo: string | number;
    url?: string;
  };
}

export function ShareDoctorModal({ isOpen, onClose, doctor }: ShareDoctorModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const profileUrl =
    doctor.url ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/dashboard/${doctor.expCodigo}`
      : `/dashboard/${doctor.expCodigo}`);

  // Generar código QR en alta resolución
  useEffect(() => {
    if (!isOpen || !profileUrl) return;

    let isMounted = true;
    QRCode.toDataURL(profileUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Error al generar código QR:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, profileUrl]);

  // Listener para cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Copiar al portapapeles
  const handleCopyLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(profileUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = profileUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success('Enlace copiado al portapapeles');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  // Descargar código QR en PNG
  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const sanitizedName = doctor.nombre
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qr-dr-${sanitizedName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Código QR descargado correctamente');
  };

  // Compartir nativo (dispositivos móviles / navegadores compatibles)
  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Perfil Médico: ${doctor.nombre}`,
          text: `Consulta el perfil profesional de ${doctor.nombre} en SaludYa:`,
          url: profileUrl,
        });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const shareText = `Consulta el perfil profesional de ${doctor.nombre}${doctor.especialidad ? ` (${doctor.especialidad})` : ''} en SaludYa: ${profileUrl}`;

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: WhatsAppIcon,
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,
      hoverBg: 'hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400',
    },
    {
      name: 'Telegram',
      icon: Send,
      href: `https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(`Perfil profesional de ${doctor.nombre} en SaludYa`)}`,
      hoverBg: 'hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/40 dark:hover:text-sky-400',
    },
    {
      name: 'Correo',
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(`Perfil Médico: ${doctor.nombre}`)}&body=${encodeURIComponent(`Estimado/a,\n\nTe comparto el enlace al perfil profesional de ${doctor.nombre} en la plataforma SaludYa:\n\n${profileUrl}\n\nSaludos.`)}`,
      hoverBg: 'hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200',
    },
    {
      name: 'LinkedIn',
      icon: LinkedInIcon,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`,
      hoverBg: 'hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-doctor-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={onClose}
        >
          {/* Backdrop con desenfoque suave */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Tarjeta Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-10"
          >
            {/* Cabecera */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 p-5 pb-4">
              <div className="flex items-center gap-3">
                {doctor.fotoPerfil ? (
                  <img
                    src={doctor.fotoPerfil}
                    alt={doctor.nombre}
                    className="h-11 w-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm border border-slate-200 dark:border-slate-700">
                    {doctor.nombre
                      .split(' ')
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')}
                  </div>
                )}
                <div>
                  <h2
                    id="share-doctor-title"
                    className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight"
                  >
                    Compartir Perfil
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {doctor.nombre}
                    {doctor.especialidad ? ` · ${doctor.especialidad}` : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Cerrar ventana"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-6">
              {/* Sección Código QR */}
              <div className="flex flex-col items-center justify-center">
                <div className="p-3 bg-white rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`Código QR para el perfil de ${doctor.nombre}`}
                      className="h-44 w-44 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="h-44 w-44 flex items-center justify-center bg-slate-50 rounded-lg text-xs text-slate-400">
                      Generando código QR...
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    disabled={!qrDataUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Descargar imagen QR</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-1.5">
                  Escanea para abrir el sitio del médico desde tu teléfono
                </p>
              </div>

              {/* Sección Enlace Directo */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  Enlace directo al sitio
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      readOnly
                      value={profileUrl}
                      aria-label="Enlace del perfil"
                      className="w-full h-10 px-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-700 dark:text-slate-300 font-mono focus:outline-none select-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`h-10 px-3.5 inline-flex items-center gap-1.5 rounded-xl font-medium text-xs transition active:scale-95 cursor-pointer ${
                      copied
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-500 shadow-xs'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Opciones Rápidas */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Enviar a través de
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {shareOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <a
                        key={opt.name}
                        href={opt.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 transition active:scale-95 ${opt.hoverBg}`}
                      >
                        <Icon className="h-4 w-4 mb-1" />
                        <span className="text-[11px] font-medium">{opt.name}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Pie de modal */}
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  ¿Deseas usar otras aplicaciones?
                </span>
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Más opciones</span>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
