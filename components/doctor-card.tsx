'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
};

function getLowestPrice(doctor: DoctorResponse): number | null {
  const prices = [
    ...doctor.servicios.map((s) => s.syp_costo_total),
    ...doctor.clinicas.map((c) => c.mcl_precio_base),
  ].filter((p): p is number => typeof p === 'number' && Number.isFinite(p) && p >= 0);
  return prices.length ? Math.min(...prices) : null;
}

export function DoctorCard({ data, onVisit }: DoctorCardProps) {
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

  return (
    <div
      className="@container group relative block overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/10 transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl"
    >
      <div className="relative flex flex-row">
        {/* === IMAGEN (Portrait Optimized) === */}
        <div className="relative h-auto w-[45%] @sm:w-5/12 min-h-[300px] @sm:min-h-[400px] @lg:min-h-[520px] overflow-hidden">
          {doctor.exp_foto_perfil ? (
            <Image
              src={doctor.exp_foto_perfil}
              alt={fullName}
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-8xl font-black text-slate-600">
              {initials}
            </div>
          )}

          {/* Gradiente sutil sobre la imagen */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70" />

          {/* Barra decorativa superior */}
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-500" />
        </div>

        {/* === BLOQUE SUPERPUESTO DE INFORMACIÓN === */}
        <div className="absolute inset-y-0 right-0 w-[65%] @sm:w-7/12 bg-white rounded-l-2xl @sm:rounded-l-3xl shadow-2xl shadow-black/20 p-4 @sm:p-6 @lg:p-10 flex flex-col justify-between min-h-full">
          <div className="space-y-3 @sm:space-y-5 @lg:space-y-6">
            {/* Nombre */}
            <div>
              <h3 
                className="text-[clamp(1.25rem,5cqw,2.25rem)] font-black tracking-tighter text-slate-900 leading-tight line-clamp-2"
                title={fullName}
              >
                {fullName}
              </h3>
              <div className="mt-2 @sm:mt-3 h-1 w-12 @sm:w-14 bg-gradient-to-r from-sky-500 to-indigo-500 rounded" />
            </div>

            {/* Especialidades */}
            <BadgeCarousel
              title="Especialidades"
              items={specialtyPreview}
              badgeClass="bg-sky-50 border border-sky-100 font-semibold text-sky-700"
            />

            {/* Modalidades */}
            <BadgeCarousel
              title="Modalidad"
              items={modalityPreview}
              badgeClass="bg-slate-100 font-medium text-slate-700"
            />
          </div>

          {/* Precio + Botones */}
          <div className="pt-3 @sm:pt-6 border-t border-slate-100 mt-auto">
            <div className="flex items-start justify-between mb-3 @sm:mb-6 @lg:mb-8">
              <span className="text-[10px] @sm:text-sm @lg:text-lg font-semibold tracking-widest text-slate-400 uppercase">Desde</span>
              <span className="text-xl @sm:text-3xl @lg:text-5xl font-black text-sky-600 tracking-tighter">{priceLabel}</span>
            </div>

            <div className="flex flex-col @md:grid @md:grid-cols-2 gap-2 @sm:gap-3 @lg:gap-4">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/dashboard/agendar/${doctor.exp_codigo}`);
                }}
                className="rounded-xl @sm:rounded-2xl bg-sky-600 py-2 @sm:py-3 @lg:py-4 text-xs @sm:text-sm @lg:text-base font-semibold text-white transition hover:bg-sky-700 active:scale-95 shadow-lg shadow-sky-500/30"
              >
                Agendar
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onVisit?.(data);
                  router.push(`/dashboard/${doctor.exp_codigo}`);
                }}
                className="rounded-xl @sm:rounded-2xl border border-slate-200 bg-white py-2 @sm:py-3 @lg:py-4 text-xs @sm:text-sm @lg:text-base font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
              >
                Perfil
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-componente ──────────────────────────────────────────────────────────

function BadgeCarousel({ title, items, badgeClass }: { title: string, items: string[], badgeClass: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      // Usamos -1 para evitar problemas con redondeo de sub-pixeles
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [items]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = scrollRef.current.clientWidth * 0.75;
      scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</p>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
            {items.length}
          </span>
        </div>
        {items.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                scroll('left');
              }}
              disabled={!canScrollLeft}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                scroll('right');
              }}
              disabled={!canScrollRight}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className={`flex gap-2 overflow-x-auto pb-2 -mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${canScrollRight ? '[mask-image:linear-gradient(to_right,black_85%,transparent)] pr-4' : ''}`}
        >
          {items.map((item, i) => (
            <span key={i} className={`shrink-0 inline-block rounded-2xl px-4 py-2 text-sm ${badgeClass}`}>
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}