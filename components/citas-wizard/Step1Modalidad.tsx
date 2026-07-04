'use client';

import { useState } from 'react';
import { useModalidades, useClinicas, useAreasDomicilio } from '@/hooks/use-flujo-citas';
import { useCitaStore } from '@/store/use-cita-store';
import { Stethoscope, MapPin, Video, Home, ArrowRight } from 'lucide-react';
import { NeoLoader } from '@/components/neo-loader';

export function Step1Modalidad() {
  const { codMedico, modalidad, setModalidad, setClinica, setArea, nextStep, clinicaSeleccionada, areaDomicilio } = useCitaStore();
  const { data: modalidades = [], isLoading } = useModalidades(codMedico);
  
  const { data: clinicas = [], isLoading: loadingClinicas } = useClinicas(codMedico, modalidad);
  const { data: areas = [], isLoading: loadingAreas } = useAreasDomicilio(codMedico, modalidad);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse py-4">
        <div>
          <div className="h-8 w-64 rounded-lg bg-slate-200"></div>
          <div className="mt-2 h-4 w-96 max-w-full rounded-lg bg-slate-100"></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-6">
              <div className="h-14 w-14 rounded-full bg-slate-200"></div>
              <div className="h-4 w-24 rounded-lg bg-slate-200"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'presencial': return <MapPin className="h-6 w-6" />;
      case 'virtual': return <Video className="h-6 w-6" />;
      case 'domicilio': return <Home className="h-6 w-6" />;
      default: return <Stethoscope className="h-6 w-6" />;
    }
  };

  const isComplete = 
    (modalidad === 'virtual') || 
    (modalidad === 'presencial' && clinicaSeleccionada) || 
    (modalidad === 'domicilio' && areaDomicilio);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-900">¿Cómo prefieres tu consulta?</h2>
        <p className="mt-1 text-slate-500">Selecciona la modalidad de tu cita médica.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {modalidades.map((mod) => {
          // Normalizamos la descripción para usarla como key y para el estado. Ej: "A Domicilio" -> "domicilio", "Presencial" -> "presencial"
          const normalizedTipo = mod.modDescripcion.toLowerCase().includes('domicilio') 
            ? 'domicilio' 
            : mod.modDescripcion.toLowerCase() as any;
          const isSelected = modalidad === normalizedTipo;

          return (
            <button
              key={mod.modCodigo}
              onClick={() => setModalidad(normalizedTipo)}
              className={`flex flex-col items-center justify-center gap-3 rounded-2xl border p-6 text-center transition-all ${
                isSelected 
                  ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-md ring-1 ring-sky-500' 
                  : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-slate-50'
              }`}
            >
              <div className={`flex h-14 w-14 items-center justify-center rounded-full ${isSelected ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {getIcon(normalizedTipo)}
              </div>
              <div>
                <h3 className="font-bold capitalize">{mod.modDescripcion}</h3>
              </div>
            </button>
          )
        })}
      </div>

      {modalidad === 'presencial' && (
        <div className="animate-in fade-in slide-in-from-top-4 mt-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Selecciona la clínica</h3>
          {loadingClinicas ? (
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {clinicas.map((clinica) => {
                const isSelected = clinicaSeleccionada?.mclCodigo === clinica.mclCodigo;
                return (
                  <button
                    key={clinica.mclCodigo}
                    onClick={() => setClinica(clinica)}
                    className={`flex items-start gap-4 rounded-2xl border p-4 text-left transition-all ${
                      isSelected 
                        ? 'border-sky-500 bg-sky-50 shadow-sm ring-1 ring-sky-500' 
                        : 'border-slate-200 hover:border-sky-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isSelected ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{clinica.cliDescripcion}</h4>
                      <p className="text-xs text-slate-500 mt-1">{clinica.cliDireccionCompleta}</p>
                      <p className="text-sm font-semibold text-sky-700 mt-2">Precio: Q{clinica.mclPrecioBase}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {modalidad === 'domicilio' && (
        <div className="animate-in fade-in slide-in-from-top-4 mt-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Áreas de cobertura</h3>
          {loadingAreas ? (
             <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {areas.map((area) => {
                const isSelected = areaDomicilio?.ladCodigo === area.ladCodigo;
                return (
                  <button
                    key={area.ladCodigo}
                    onClick={() => setArea(area)}
                    className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                      isSelected
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'bg-white border border-slate-200 text-slate-700 hover:border-sky-300 hover:bg-sky-50'
                    }`}
                  >
                    {area.municipio} {area.ladZonas ? `- Zonas: ${area.ladZonas}` : ''}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          onClick={nextStep}
          disabled={!isComplete}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Siguiente
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
