'use client';

import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, Clock, MapPin, Video, Home, Edit2, XCircle, Loader2 } from 'lucide-react';
import type { CitaListDto } from '@/types/citas';
import { useDoctorByCode } from '@/hooks/use-doctors';

type CitaCardProps = {
  cita: CitaListDto;
  onModify: (cita: CitaListDto) => void;
  onCancel: (cita: CitaListDto) => void;
  isPast?: boolean;
  bottomActions?: React.ReactNode;
  size?: 'normal' | 'small';
};

export function CitaCard({ cita, onModify, onCancel, isPast = false, bottomActions, size = 'normal' }: CitaCardProps) {
  const { data: doctor, isLoading } = useDoctorByCode(cita.ctaCoddoc);

  const getModalityIcon = (tipo: string) => {
    switch (tipo) {
      case 'presencial': return <MapPin className="h-4 w-4" />;
      case 'virtual': return <Video className="h-4 w-4" />;
      case 'domicilio': return <Home className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'programada': return 'bg-sky-100 text-sky-700';
      case 'confirmada': return 'bg-emerald-100 text-emerald-700';
      case 'pospuesta': return 'bg-amber-100 text-amber-700';
      case 'completada': return 'bg-slate-100 text-slate-700';
      case 'cancelada': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const dateObj = parseISO(cita.ctaFecha);

  const initials = cita.medicoNombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('') || 'MD';

  const canModify = !isPast && ['programada', 'confirmada', 'pospuesta'].includes(cita.ctaEstado);

  return (
    <div className={`group relative block overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/5 transition-all duration-300 hover:shadow-2xl border border-slate-100 ${
      size === 'small' ? 'opacity-95 hover:opacity-100' : ''
    }`}>
      <div className="flex flex-row h-full">
        
        {/* === IMAGEN === */}
        <div className={`relative overflow-hidden shrink-0 bg-slate-900 min-h-[140px] ${
          size === 'small' ? 'w-[30%] sm:w-[25%] lg:w-[30%]' : 'w-[40%] sm:w-[35%] lg:w-[35%]'
        }`}>
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center bg-slate-100">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : doctor?.exp_foto_perfil ? (
            <Image
              src={doctor.exp_foto_perfil}
              alt={cita.medicoNombre}
              fill
              sizes="(max-width: 640px) 30vw, 25vw"
              className={`object-cover object-center transition-transform duration-700 group-hover:scale-105 ${cita.ctaEstado === 'cancelada' ? 'grayscale opacity-80' : ''}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-3xl sm:text-5xl font-black text-slate-600">
              {initials}
            </div>
          )}
          
          <div className="absolute top-3 left-3 hidden sm:block">
            <span className={`inline-flex px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-full shadow-sm ${getEstadoColor(cita.ctaEstado)}`}>
              {cita.ctaEstado}
            </span>
          </div>
        </div>

        {/* === DETALLES === */}
        <div className={`flex flex-1 flex-col justify-between ${
          size === 'small' ? 'p-4 sm:p-5' : 'p-5 sm:p-7'
        }`}>
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className={`font-black text-slate-900 ${size === 'small' ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'}`}>{cita.medicoNombre}</h3>
            </div>
            
            {canModify && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onModify(cita); }}
                  className={`${size === 'small' ? 'p-1.5' : 'p-2'} bg-sky-50 text-sky-600 rounded-full hover:bg-sky-100 transition`}
                  title="Modificar Cita"
                >
                  <Edit2 className={`${size === 'small' ? 'w-3 h-3' : 'w-4 h-4'}`} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onCancel(cita); }}
                  className={`${size === 'small' ? 'p-1.5' : 'p-2'} bg-rose-50 text-rose-600 rounded-full hover:bg-rose-100 transition`}
                  title="Cancelar Cita"
                >
                  <XCircle className={`${size === 'small' ? 'w-3 h-3' : 'w-4 h-4'}`} />
                </button>
              </div>
            )}
          </div>
          <p className={`font-semibold text-sky-600 mb-4 sm:mb-6 uppercase tracking-wider ${size === 'small' ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'}`}>
            {cita.medicoEspecialidad}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 sm:gap-y-4 gap-x-4 sm:gap-x-6">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className={`mt-0.5 rounded-xl bg-sky-50 text-sky-600 shrink-0 ${size === 'small' ? 'p-1.5' : 'p-2'}`}>
                <CalendarDays className={`${size === 'small' ? 'h-4 w-4' : 'h-5 w-5'}`} />
              </div>
              <div>
                <p className={`font-bold uppercase tracking-widest text-slate-400 ${size === 'small' ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>Fecha</p>
                <p className={`font-semibold text-slate-700 capitalize ${size === 'small' ? 'text-xs' : 'text-sm'}`}>
                  {format(dateObj, "EEEE d 'de' MMMM", { locale: es })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className={`mt-0.5 rounded-xl bg-sky-50 text-sky-600 shrink-0 ${size === 'small' ? 'p-1.5' : 'p-2'}`}>
                <Clock className={`${size === 'small' ? 'h-4 w-4' : 'h-5 w-5'}`} />
              </div>
              <div>
                <p className={`font-bold uppercase tracking-widest text-slate-400 ${size === 'small' ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>Hora</p>
                <p className={`font-semibold text-slate-700 ${size === 'small' ? 'text-xs' : 'text-sm'}`}>
                  {cita.ctaHora.slice(0, 5)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 sm:gap-3 sm:col-span-2">
              <div className={`mt-0.5 rounded-xl bg-sky-50 text-sky-600 shrink-0 ${size === 'small' ? 'p-1.5' : 'p-2'}`}>
                {getModalityIcon(cita.ctaModalidad)}
              </div>
              <div>
                <p className={`font-bold uppercase tracking-widest text-slate-400 ${size === 'small' ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>Modalidad</p>
                <p className={`font-semibold text-slate-700 capitalize ${size === 'small' ? 'text-xs' : 'text-sm'}`}>
                  Consulta {cita.ctaModalidad} {cita.ctaModalidad === 'presencial' && cita.clinicaNombre ? `- ${cita.clinicaNombre}` : ''}
                </p>
              </div>
            </div>

            {cita.ctaMotivo && (
              <div className={`sm:col-span-2 border-t border-slate-100 ${size === 'small' ? 'pt-3 mt-1' : 'pt-4 mt-2'}`}>
                <p className={`font-bold uppercase tracking-widest text-slate-400 mb-0.5 sm:mb-1 ${size === 'small' ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>Motivo / Tema</p>
                <p className={`font-medium text-slate-600 line-clamp-2 ${size === 'small' ? 'text-xs' : 'text-sm'}`}>
                  {cita.grupoTema ? `[${cita.grupoTema}] ` : ''}{cita.ctaMotivo}
                </p>
              </div>
            )}
          </div>

          {bottomActions && (
            <div className="mt-4 pt-6 border-t border-slate-100 flex flex-wrap gap-3">
              {bottomActions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
