'use client';

import { useCitaStore } from '@/store/use-cita-store';
import { CalendarDays, Clock, MapPin, User, Stethoscope, FileText, CheckCircle2, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function CitaSummarySidebar() {
  const {
    step,
    medicoName,
    modalidad,
    clinicaSeleccionada,
    servicioSeleccionado,
    areaDomicilio,
    fecha,
    hora,
    pacienteSeleccionado,
    recompensaSeleccionada,
  } = useCitaStore();

  let precioBase = 0;
  let iva = 0;
  let recargo = 0;
  let ubicacionStr = 'Por definir';

  if (servicioSeleccionado) {
    precioBase = servicioSeleccionado.costoSinIva;
    iva = servicioSeleccionado.costoIva;
  } else if (modalidad === 'presencial' && clinicaSeleccionada) {
    precioBase = clinicaSeleccionada.mclPrecioBase;
    iva = precioBase > 0 ? precioBase * 0.12 : 0;
  }

  if (modalidad === 'presencial' && clinicaSeleccionada) {
    ubicacionStr = clinicaSeleccionada.cliDescripcion;
  } else if (modalidad === 'domicilio' && areaDomicilio) {
    ubicacionStr = `Domicilio: ${areaDomicilio.municipio}`;
  } else if (modalidad === 'virtual') {
    ubicacionStr = 'Videollamada';
  }

  const subtotal = servicioSeleccionado ? servicioSeleccionado.costoTotal : (precioBase + iva + recargo);

  // Cálculo de Descuento por Recompensa / Cupón
  let descuento = 0;
  if (recompensaSeleccionada) {
    const tipo = (recompensaSeleccionada.tipoRecompensa || (recompensaSeleccionada as any).rcpTipo || '').toLowerCase();
    const valDesc = (recompensaSeleccionada as any).rcpValorDescuento ?? (recompensaSeleccionada as any).valorDescuento;
    if (tipo.includes('gratis') || tipo.includes('cita')) {
      descuento = subtotal;
    } else if (typeof valDesc === 'number' && valDesc > 0) {
      descuento = valDesc <= 1 ? subtotal * valDesc : valDesc;
    } else {
      descuento = Math.min(50, subtotal);
    }
  }

  const precioTotal = Math.max(0, subtotal - descuento);

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] shadow-xl shadow-slate-900/5 dark:shadow-black/20 overflow-hidden">
      
      {/* Header */}
      <div className="bg-slate-900 dark:bg-[#0B1120] p-6 text-white">
        <h3 className="text-lg font-black tracking-tight">Resumen de Cita</h3>
        <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold mt-1 uppercase tracking-widest">
          {step === 4 ? 'A un paso de confirmar' : `Paso ${step} de 4`}
        </p>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        
        {/* Médico */}
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Médico</p>
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {medicoName || 'Cargando...'}
            </p>
          </div>
        </div>

        {/* Ubicación / Modalidad */}
        <div className={`flex gap-4 transition-opacity duration-300 ${!modalidad ? 'opacity-30' : ''}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {modalidad ? modalidad : 'Modalidad'}
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {ubicacionStr}
            </p>
          </div>
        </div>

        {/* Fecha y Hora */}
        <div className={`flex gap-4 transition-opacity duration-300 ${!fecha ? 'opacity-30' : ''}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Fecha y Hora</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {fecha ? format(fecha, "dd 'de' MMMM, yyyy", { locale: es }) : 'Por seleccionar'}
            </p>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
              {hora ? hora : 'Hora no seleccionada'}
            </p>
          </div>
        </div>

        {/* Paciente */}
        <div className={`flex gap-4 transition-opacity duration-300 ${!pacienteSeleccionado ? 'opacity-30' : ''}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Paciente</p>
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {pacienteSeleccionado 
                ? pacienteSeleccionado.nombreCompleto 
                : 'Por seleccionar'}
            </p>
          </div>
        </div>

        {/* Servicio Seleccionado */}
        {servicioSeleccionado && (
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
              <Activity className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Servicio</p>
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                {servicioSeleccionado.servicio}
              </p>
              <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 mt-0.5">
                Q{servicioSeleccionado.costoTotal.toFixed(2)}
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Footer / Precio */}
      <div className="bg-slate-50 dark:bg-[#0F172A] p-6 border-t border-slate-100 dark:border-slate-800 space-y-2">
        {servicioSeleccionado && (
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Costo base (sin IVA):</span>
            <span>Q{servicioSeleccionado.costoSinIva.toFixed(2)}</span>
          </div>
        )}
        {servicioSeleccionado && servicioSeleccionado.costoIva > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>IVA:</span>
            <span>Q{servicioSeleccionado.costoIva.toFixed(2)}</span>
          </div>
        )}
        {recompensaSeleccionada ? (
          <>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Subtotal:</span>
              <span>Q{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span>Cupón ({recompensaSeleccionada.tituloRecompensa || (recompensaSeleccionada as any).titulo || 'Recompensa'}):</span>
              <span>-Q{descuento.toFixed(2)}</span>
            </div>
          </>
        ) : null}

        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Total a pagar</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white">
            Q{precioTotal.toFixed(2)}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-3 font-semibold uppercase tracking-wider">
          El pago se realiza en la clínica o portal
        </p>
      </div>

    </div>
  );
}

