'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { Star, MapPin, Video, Home } from 'lucide-react';
import type { DoctorResponse } from '@/types';

export type DoctorCardData = {
  doctor: DoctorResponse;
  fullName: string;
  specialtyPreview: string[];
  modalityPreview: string[];
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

export function DoctorCard({ data, onVisit, isListView = false }: DoctorCardProps) {
  const router = useRouter();

  const { doctor, fullName, specialtyPreview, modalityPreview } = data;

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('') || 'MD';

  const basePrice = getLowestPrice(doctor);
  const priceLabel = basePrice !== null ? `Q${new Intl.NumberFormat('es-GT').format(basePrice)}` : '—';

  // Función auxiliar para iconos de modalidad
  const getModalityIcon = (modality: string) => {
    const m = modality.toLowerCase();
    if (m.includes('presencial')) return <MapPin className="text-outline text-[18px] h-[18px] w-[18px]" />;
    if (m.includes('virtual') || m.includes('tele')) return <Video className="text-outline text-[18px] h-[18px] w-[18px]" />;
    if (m.includes('domicilio')) return <Home className="text-outline text-[18px] h-[18px] w-[18px]" />;
    return <MapPin className="text-outline text-[18px] h-[18px] w-[18px]" />;
  };

  if (isListView) {
    return (
      <div className="doctor-card group flex flex-col sm:flex-row h-auto sm:h-[220px] bg-surface rounded-2xl overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-1.5 transition-all duration-500 border border-outline-variant/30">
        <div className="w-full sm:w-[160px] md:w-[180px] h-[200px] sm:h-full shrink-0 border-b sm:border-b-0 sm:border-r relative border-outline-variant/30 overflow-hidden bg-surface-container">
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
              <h2 className="font-display text-[18px] md:text-[22px] font-bold text-primary leading-tight truncate" title={fullName}>
                {fullName}
              </h2>
              <div className="flex items-center gap-1.5 mt-1 relative group/spec">
                <p className="text-secondary font-medium text-sm md:text-base truncate max-w-[150px] md:max-w-[250px]">
                  {specialtyPreview[0] || 'General'}
                </p>
                {specialtyPreview.length > 1 && (
                  <div className="relative">
                    <span className="inline-flex items-center justify-center bg-primary/10 text-primary text-[10px] font-bold px-1.5 h-5 rounded-md cursor-help">
                      +{specialtyPreview.length - 1}
                    </span>
                    <div className="absolute bottom-full left-0 mb-2 w-max max-w-[220px] bg-surface-container-highest text-on-surface text-xs p-2.5 rounded-xl opacity-0 pointer-events-none group-hover/spec:opacity-100 transition-opacity z-50 shadow-xl border border-outline-variant/20">
                      {specialtyPreview.slice(1).map(s => <div key={s} className="mb-1 last:mb-0">{s}</div>)}
                      <div className="absolute top-full left-4 border-4 border-transparent border-t-surface-container-highest"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {modalityPreview.map((modality, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  {getModalityIcon(modality)}
                  <span className="text-xs text-on-surface-variant capitalize">{modality.toLowerCase()}</span>
                </div>
              ))}
              {modalityPreview.length === 0 && (
                 <div className="flex items-center gap-1">
                   <MapPin className="text-outline text-[16px] h-[16px] w-[16px]" />
                   <span className="text-xs text-on-surface-variant">Presencial</span>
                 </div>
              )}
            </div>
          </div>

          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto shrink-0 gap-3 sm:pl-4 sm:border-l border-outline-variant/30">
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Consulta desde</span>
              <span className="font-bold text-primary text-[20px] md:text-[24px]">{priceLabel}</span>
            </div>
            <div className="flex flex-col lg:flex-row w-full sm:w-auto gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onVisit?.(data);
                  router.push(`/dashboard/${doctor.exp_codigo}`);
                }}
                className="px-4 py-2.5 w-full sm:w-auto border border-outline-variant rounded-xl font-bold text-sm hover:bg-surface-container transition-colors text-on-surface text-center whitespace-nowrap"
              >
                Ver Perfil
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/dashboard/agendar/${doctor.exp_codigo}`);
                }}
                className="px-4 py-2.5 w-full sm:w-auto bg-secondary text-on-primary rounded-xl font-bold text-sm hover:opacity-90 transition-opacity text-center whitespace-nowrap"
              >
                Agendar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // GRID VIEW (Imagen superior)
  return (
    <div 
      className="doctor-card h-full group flex flex-col bg-surface rounded-3xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-outline-variant/30 hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-pointer"
    >
      <div className="w-full h-[220px] bg-surface-container relative shrink-0 border-b border-outline-variant/20 overflow-hidden">
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

      <div className="flex flex-col flex-1 text-center p-6">
        <h3 className="font-display text-[22px] font-bold text-primary mb-1 leading-tight truncate" title={fullName}>{fullName}</h3>
        
        <div className="flex justify-center items-center gap-1.5 mb-4 h-[20px] relative group/spec">
          <p className="text-secondary font-medium text-sm truncate max-w-[180px]">
            {specialtyPreview[0] || 'General'}
          </p>
          {specialtyPreview.length > 1 && (
            <div className="relative">
              <span className="inline-flex items-center justify-center bg-primary/10 text-primary text-[10px] font-bold px-1.5 h-5 rounded-md cursor-help">
                +{specialtyPreview.length - 1}
              </span>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[220px] bg-surface-container-highest text-on-surface text-xs p-2.5 rounded-xl opacity-0 pointer-events-none group-hover/spec:opacity-100 transition-opacity z-50 shadow-xl text-center border border-outline-variant/20">
                {specialtyPreview.slice(1).map(s => <div key={s} className="mb-1 last:mb-0">{s}</div>)}
                {/* Flechita del tooltip */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-container-highest"></div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
            {modalityPreview.map((modality, idx) => (
                <div key={idx} className="flex items-center gap-1 bg-surface-container-lowest px-2 py-1 rounded-md border border-outline-variant/30">
                {getModalityIcon(modality)}
                <span className="text-xs text-on-surface-variant capitalize">{modality.toLowerCase()}</span>
                </div>
            ))}
            {modalityPreview.length === 0 && (
                <div className="flex items-center gap-1 bg-surface-container-lowest px-2 py-1 rounded-md border border-outline-variant/30">
                <MapPin className="text-outline text-[16px] h-[16px] w-[16px]" />
                <span className="text-xs text-on-surface-variant">Presencial</span>
                </div>
            )}
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-4 border-t border-outline-variant/20">
            <div className="flex flex-col items-center mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Consulta desde</span>
                <span className="font-bold text-primary text-xl">{priceLabel}</span>
            </div>
            
            <div className="flex gap-2">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onVisit) onVisit(data);
                        router.push(`/dashboard/${doctor.exp_codigo}`);
                    }}
                    className="flex-1 bg-primary/10 text-primary py-2.5 rounded-xl text-sm font-bold hover:bg-primary hover:text-white transition-colors border border-transparent"
                >
                    Ver Perfil
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        router.push(`/dashboard/agendar/${doctor.exp_codigo}`);
                    }}
                    className="flex-1 bg-secondary text-on-primary py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                >
                    Agendar
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}