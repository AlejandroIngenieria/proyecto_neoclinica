'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Star,
  Award,
  MapPin,
  Video,
  Home,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import type { DoctorCardData } from './doctor-card';
import { HighlightText } from './doctor-card';
import {
  buildDoctorFullName,
  buildDoctorShortName,
  getDoctorPriceDisplay,
  cleanZonaShort,
  cleanZonasDomicilio,
} from '@/types/doctor';
import { useUserLocation } from '@/hooks/use-user-location';

type DoctorCardMobileProps = {
  data: DoctorCardData;
  onVisit?: (data: DoctorCardData) => void;
  isSelected?: boolean;
};

export function DoctorCardMobile({
  data,
  onVisit,
  isSelected = false,
}: DoctorCardMobileProps) {
  const router = useRouter();
  const { doctor, fullName, matchedSpecialty, searchHighlight } = data;
  const fullDetailedName = buildDoctorFullName(doctor) || fullName;
  const shortName = buildDoctorShortName(doctor) || fullName;

  const { getDistanceToDoctor } = useUserLocation();
  const distanceInfo = getDistanceToDoctor(doctor.clinicas);

  // Ubicación principal o distancia
  const primaryClinic = doctor.clinicas?.[0];
  const primaryLocationStr = data.matchedLocation || (primaryClinic ? `${primaryClinic.cli_descripcion || 'Sede'}${cleanZonaShort(primaryClinic.cli_zona) ? `, ${cleanZonaShort(primaryClinic.cli_zona)}` : ''}` : data.locationPreview[0] || 'Guatemala');
  const locationOrDistance = distanceInfo.formatted
    ? `${distanceInfo.formatted} · ${primaryLocationStr}`
    : primaryLocationStr;

  // Especialidad
  const specialtyPreview = [...data.specialtyPreview];
  if (matchedSpecialty) {
    const matchIndex = specialtyPreview.findIndex(
      (s) => s.toLowerCase() === matchedSpecialty.toLowerCase()
    );
    if (matchIndex > 0) {
      const [matched] = specialtyPreview.splice(matchIndex, 1);
      specialtyPreview.unshift(matched);
    }
  }
  const displaySpecialty = matchedSpecialty || specialtyPreview[0] || 'Médico y Cirujano';

  // Iniciales para fallback de foto
  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('') || 'MD';

  // Precios
  const priceInfo = getDoctorPriceDisplay(doctor);

  // Modalidades
  const modalities = data.modalityPreview && data.modalityPreview.length > 0
    ? data.modalityPreview
    : (doctor.modalidades || []).map((m) => m.modalidad).filter(Boolean);

  const hasVirtual = modalities.some((m) =>
    m.toLowerCase().includes('virtual') || m.toLowerCase().includes('telemedicina')
  );
  const hasPresencial = modalities.some((m) => m.toLowerCase().includes('presencial')) || (doctor.clinicas && doctor.clinicas.length > 0);
  const hasDomicilio = modalities.some((m) => m.toLowerCase().includes('domicilio')) || (doctor.atencion_domicilio && doctor.atencion_domicilio.length > 0);

  // Acciones
  const handleVisitProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onVisit?.(data);
    router.push(`/dashboard/${doctor.exp_codigo}`);
  };

  const handleBookAppointment = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onVisit?.(data);
    router.push(`/dashboard/agendar/${doctor.exp_codigo}`);
  };

  // Al presionar la tarjeta general en móvil, navegar a ver perfil directamente
  const handleCardClick = () => {
    onVisit?.(data);
    router.push(`/dashboard/${doctor.exp_codigo}`);
  };

  return (
    <div
      id={`doctor-card-mobile-${doctor.exp_codigo}`}
      onClick={handleCardClick}
      className={`w-full bg-white rounded-2xl border transition-all duration-200 p-3 flex items-center gap-3 relative overflow-hidden cursor-pointer active:scale-[0.99] ${
        isSelected
          ? 'border-sky-500 shadow-md ring-2 ring-sky-200/50 bg-sky-50/10'
          : 'border-slate-200/90 shadow-xs hover:shadow-md hover:border-sky-200'
      }`}
    >
      {/* ═══════════════════════════════════════════════════════════════════
          COLUMNA 1: FOTO
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100 shadow-2xs">
        {doctor.exp_foto_perfil ? (
          <Image
            src={doctor.exp_foto_perfil}
            alt={fullName}
            fill
            sizes="96px"
            priority={false}
            className="object-cover object-top"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-black text-slate-400 text-base bg-gradient-to-br from-slate-50 to-slate-200">
            {initials}
          </div>
        )}

        {/* Badge sutil de años de experiencia */}
        {doctor.exp_anios_experiencia ? (
          <div className="absolute bottom-1 left-1 z-10 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs">
            <Award className="w-2.5 h-2.5 text-amber-400 shrink-0" />
            <span>{doctor.exp_anios_experiencia}a</span>
          </div>
        ) : null}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          COLUMNA 2: INFORMACIÓN
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 gap-1">
        {/* Nombre del especialista */}
        <div>
          <h3
            className="font-bold text-slate-900 text-sm leading-snug truncate"
            title={fullDetailedName}
          >
            <HighlightText text={shortName} highlight={searchHighlight} />
          </h3>

          {/* Especialidad */}
          <p className="text-xs font-semibold text-sky-700 leading-tight truncate">
            <HighlightText text={displaySpecialty} highlight={searchHighlight} />
            {doctor.exp_colegiado_gt && (
              <span className="text-slate-400 font-normal text-[10px] ml-1">
                · Col. {doctor.exp_colegiado_gt}
              </span>
            )}
          </p>
        </div>

        {/* Ubicación / Sede */}
        <div className="flex items-center gap-1 text-[11px] text-slate-600 truncate leading-none">
          <MapPin className="w-3 h-3 text-sky-600 shrink-0" />
          <span className="truncate">{locationOrDistance}</span>
        </div>

        {/* Fila de Calificación, Precio y Modalidades */}
        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          {/* Calificación */}
          {doctor.promedio_valoracion && doctor.promedio_valoracion > 0 ? (
            <div className="flex items-center gap-0.5 text-[11px] font-bold text-slate-800 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/60 leading-none">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
              <span>{doctor.promedio_valoracion.toFixed(1)}</span>
            </div>
          ) : (
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md leading-none">
              Nuevo
            </span>
          )}

          {/* Precio */}
          {priceInfo.hasPrice ? (
            <span className="text-[11px] font-extrabold text-slate-900 leading-none">
              {priceInfo.label}
            </span>
          ) : null}

          {/* Modalidades mini icons */}
          <div className="flex items-center gap-1 ml-auto shrink-0">
            {hasPresencial && (
              <span title="Presencial" className="p-0.5 rounded bg-sky-50 text-sky-600">
                <MapPin className="w-3 h-3" />
              </span>
            )}
            {hasVirtual && (
              <span title="Telemedicina" className="p-0.5 rounded bg-indigo-50 text-indigo-600">
                <Video className="w-3 h-3" />
              </span>
            )}
            {hasDomicilio && (
              <span title="A domicilio" className="p-0.5 rounded bg-emerald-50 text-emerald-600">
                <Home className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          COLUMNA 3: BOTÓN DE VER PERFIL Y AGENDAR
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="shrink-0 flex flex-col justify-center gap-1.5 w-[88px] sm:w-[96px]">
        {/* Botón Agendar */}
        <button
          type="button"
          onClick={handleBookAppointment}
          className="w-full py-1.5 px-1 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold text-[11px] sm:text-xs shadow-xs shadow-sky-600/20 flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap"
          title="Agendar Cita con este médico"
        >
          <Calendar className="w-3 h-3 shrink-0" />
          <span>Agendar</span>
        </button>

        {/* Botón Ver Perfil */}
        <button
          type="button"
          onClick={handleVisitProfile}
          className="w-full py-1.5 px-1 rounded-xl bg-sky-50 hover:bg-sky-100 active:scale-95 text-sky-700 font-bold text-[11px] border border-sky-200/70 flex items-center justify-center gap-0.5 transition-all cursor-pointer whitespace-nowrap"
          title="Ver perfil completo del especialista"
        >
          <span>Perfil</span>
          <ChevronRight className="w-3 h-3 shrink-0" />
        </button>
      </div>
    </div>
  );
}
