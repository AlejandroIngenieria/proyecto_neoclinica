'use client';

import { MessageSquare, Star } from 'lucide-react';
import { SectionCard } from './section-card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import type { DoctorResponse } from '@/types';

type DoctorReviewsProps = {
  doctor: DoctorResponse;
  minimalist?: boolean;
};

export function DoctorReviews({ doctor, minimalist = false }: DoctorReviewsProps) {
  const { resenas } = doctor;

  if (minimalist) {
    if (!resenas || resenas.length === 0) {
      return (
        <div className="flex flex-col p-8 bg-slate-50 rounded-[20px] border border-slate-200">
          <p className="text-slate-500 text-sm">Este médico no tiene reseñas registradas por el momento.</p>
        </div>
      );
    }
    
    return (
      <div className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-[24px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        {resenas.map((resena) => (
          <div key={resena.res_codigo} className="py-6 first:pt-0 last:pb-0">
            <div className="flex justify-between items-start mb-3">
              <div className="flex flex-col">
                <span className="font-semibold text-slate-900">{resena.nombre_paciente || 'Paciente'}</span>
                <span className="text-xs text-slate-500">
                  {format(new Date(resena.fecha_grabacion), 'dd MMM, yyyy', { locale: es })}
                </span>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < resena.res_valoracion
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-slate-100 text-[#E5E7EB]'
                    }`}
                  />
                ))}
              </div>
            </div>
            {resena.res_texto && (
              <p className="text-slate-700 text-sm leading-relaxed">
                "{resena.res_texto}"
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <SectionCard title="Reseñas de Pacientes" icon={MessageSquare}>
      {!resenas || resenas.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
          <MessageSquare className="h-10 w-10 text-slate-300 mb-3" />
          <h3 className="text-slate-900 font-semibold mb-1">Aún no hay reseñas</h3>
          <p className="text-slate-500 text-sm">Este médico no tiene reseñas registradas por el momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resenas.map((resena) => (
            <div key={resena.res_codigo} className="flex flex-col p-5 border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900">{resena.nombre_paciente || 'Paciente'}</span>
                  <span className="text-xs text-slate-500">
                    {format(new Date(resena.fecha_grabacion), 'dd MMM, yyyy', { locale: es })}
                  </span>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < resena.res_valoracion
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-slate-100 text-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
              {resena.res_texto && (
                <p className="text-slate-600 text-sm mt-2 italic leading-relaxed">
                  "{resena.res_texto}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
