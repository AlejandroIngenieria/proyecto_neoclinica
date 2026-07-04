'use client';

import { useCitaStore } from '@/store/use-cita-store';
import { CalendarDays, Clock, MapPin, User, Stethoscope, FileText, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function CitaSummarySidebar() {
  const {
    step,
    medicoName,
    modalidad,
    clinicaSeleccionada,
    areaDomicilio,
    fecha,
    hora,
    pacienteSeleccionado,
  } = useCitaStore();

  let precioBase = 0;
  let recargo = 0;
  let ubicacionStr = 'Por definir';

  if (modalidad === 'presencial' && clinicaSeleccionada) {
    precioBase = clinicaSeleccionada.mclPrecioBase;
    ubicacionStr = clinicaSeleccionada.cliDescripcion;
  } else if (modalidad === 'domicilio' && areaDomicilio) {
    precioBase = 0; // El costo de domicilio se definirá después
    ubicacionStr = `Domicilio: ${areaDomicilio.municipio}`;
  } else if (modalidad === 'virtual') {
    // Si tuvieramos precio base de virtual en el store, lo usaríamos
    ubicacionStr = 'Videollamada';
  }

  const precioTotal = precioBase + recargo;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 overflow-hidden">
      
      {/* Header */}
      <div className="bg-slate-900 p-6 text-white">
        <h3 className="text-lg font-black tracking-tight">Resumen de Cita</h3>
        <p className="text-slate-400 text-xs font-semibold mt-1 uppercase tracking-widest">
          {step === 4 ? 'A un paso de confirmar' : `Paso ${step} de 4`}
        </p>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        
        {/* Médico */}
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Médico</p>
            <p className="truncate text-sm font-bold text-slate-900">
              {medicoName || 'Cargando...'}
            </p>
          </div>
        </div>

        {/* Ubicación / Modalidad */}
        <div className={`flex gap-4 transition-opacity duration-300 ${!modalidad ? 'opacity-30' : ''}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {modalidad ? modalidad : 'Modalidad'}
            </p>
            <p className="text-sm font-bold text-slate-900">
              {ubicacionStr}
            </p>
          </div>
        </div>

        {/* Fecha y Hora */}
        <div className={`flex gap-4 transition-opacity duration-300 ${!fecha ? 'opacity-30' : ''}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Fecha y Hora</p>
            <p className="text-sm font-bold text-slate-900">
              {fecha ? format(fecha, "dd 'de' MMMM, yyyy", { locale: es }) : 'Por seleccionar'}
            </p>
            <p className="text-xs font-semibold text-emerald-600 mt-0.5">
              {hora ? hora : 'Hora no seleccionada'}
            </p>
          </div>
        </div>

        {/* Paciente */}
        <div className={`flex gap-4 transition-opacity duration-300 ${!pacienteSeleccionado ? 'opacity-30' : ''}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Paciente</p>
            <p className="truncate text-sm font-bold text-slate-900">
              {pacienteSeleccionado 
                ? pacienteSeleccionado.nombreCompleto 
                : 'Por seleccionar'}
            </p>
          </div>
        </div>

      </div>

      {/* Footer / Precio */}
      <div className="bg-slate-50 p-6 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-500">Total a pagar</span>
          <span className="text-2xl font-black text-slate-900">
            Q{precioTotal.toFixed(2)}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-3 font-semibold uppercase tracking-wider">
          El pago se realiza en la clínica o portal
        </p>
      </div>

    </div>
  );
}
