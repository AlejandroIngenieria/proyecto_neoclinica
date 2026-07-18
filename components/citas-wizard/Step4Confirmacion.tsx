'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateCita, useUploadDocumentoCita, usePagarCita, useMetodosPago, useBilletera } from '@/hooks/use-flujo-citas';
import { useCitaStore } from '@/store/use-cita-store';
import { ChevronLeft, Check, FileText, Loader2, Info, Calendar, MapPin, CreditCard, Building2, Stethoscope, Activity, Wallet, AlertCircle } from 'lucide-react';
import type { CrearCitaRequest } from '@/types/citas';

export function Step4Confirmacion() {
  const router = useRouter();
  const {
    codMedico, medicoName, modalidad, clinicaSeleccionada, areaDomicilio,
    fecha, hora, pacienteSeleccionado, grupoId, motivo,
    archivos, prevStep, tipoPagoId, billeteraItemId,
    direccionDomicilio, referenciasDomicilio
  } = useCitaStore();

  const { mutateAsync: createCita } = useCreateCita();
  const { mutateAsync: uploadDocumento } = useUploadDocumentoCita();
  const { mutateAsync: pagarCita } = usePagarCita();

  const { data: metodosPago = [] } = useMetodosPago(codMedico!);
  const { data: billetera = [] } = useBilletera(pacienteSeleccionado?.pacCodigo!);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Pricing calculations
  const precioBase = modalidad === 'presencial' ? (clinicaSeleccionada?.mclPrecioBase || 0) : 400; // Mock price for virtual
  const iva = precioBase * 0.16;
  const total = precioBase + iva;

  const getInitials = (name: string) => {
    if (!name) return '';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };

  const metodoSeleccionado = metodosPago.find(m => m.tipoPagoId === tipoPagoId);
  const itemBilletera = billetera.find(b => b.id_metodo === billeteraItemId);

  const handleConfirm = async () => {
    if (!codMedico || !pacienteSeleccionado || !fecha || !hora || !modalidad || !tipoPagoId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Preparar DTO
      let precio = 0;
      let consultorioId = undefined;

      let dirDomicilio = null;
      let refDomicilio = null;

      if (modalidad === 'presencial' && clinicaSeleccionada) {
        precio = clinicaSeleccionada.mclPrecioBase;
        consultorioId = clinicaSeleccionada.cliCodigo;
      } else if (modalidad === 'domicilio' && areaDomicilio) {
        precio = 0;
        consultorioId = null;
        dirDomicilio = direccionDomicilio;
        refDomicilio = referenciasDomicilio;
      } else if (modalidad === 'virtual') {
        consultorioId = null;
      }

      const request: CrearCitaRequest = {
        codPaciente: pacienteSeleccionado.pacCodigo,
        codMedico,
        grupoId: grupoId || undefined,
        consultorioId,
        fecha: fecha.toISOString().split('T')[0],
        hora: hora + ':00', // Asegurar formato HH:mm:ss si 'hora' es 'HH:mm'
        modalidad,
        precio,
        motivo: motivo || undefined,
        direccionDomicilio: dirDomicilio,
        referenciasDomicilio: refDomicilio,
        enlaceVideollamada: null
      };

      // 2. Crear Cita
      const citaId = await createCita(request);

      // 3. Registrar Pago
      await pagarCita({
        citaId,
        payload: {
          codTpp: Number(tipoPagoId),
          estadoPago: 'pendiente',
          referenciaPago: billeteraItemId || null
        }
      });

      // 4. Subir Documentos si hay
      if (archivos.length > 0) {
        // Upload concurrently or sequentially. We do sequentially to avoid overwhelming.
        for (const file of archivos) {
          await uploadDocumento({
            codPaciente: pacienteSeleccionado.pacCodigo,
            codCita: citaId,
            file
          });
        }
      }

      // 5. Redirect a éxito
      router.push(`/dashboard/citas/${citaId}/exito`);

    } catch (e: any) {
      console.error('Error al agendar cita', e);
      if (e.response && e.response.data) {
        console.error('Detalles del error (Backend):', e.response.data);
      }
      setError('Ocurrió un error al agendar la cita. Por favor intenta de nuevo.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Confirma tu cita</h2>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Revisa los datos de tu consulta y aprueba el resumen para finalizar.</p>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 p-4 text-sm font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Info className="h-6 w-6 text-sky-500" />
          Resumen de tu cita
        </h3>
        
        {/* Grilla de Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* Paciente y Motivo */}
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full border-[2px] border-transparent p-0.5 shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-blue-700 dark:text-blue-400">
              {pacienteSeleccionado?.pacFotoPerfilUrl || pacienteSeleccionado?.pacTitular ? (
                <img
                  src={pacienteSeleccionado?.pacFotoPerfilUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(pacienteSeleccionado?.nombreCompleto || 'Paciente')}&background=0D8ABC&color=fff`}
                  alt={pacienteSeleccionado?.nombreCompleto}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold">{getInitials(pacienteSeleccionado?.nombreCompleto || '')}</span>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Paciente</p>
              <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {pacienteSeleccionado?.pacTitular ? 'Yo' : pacienteSeleccionado?.nombreCompleto}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                <Activity className="w-3.5 h-3.5" />
                {motivo}
              </p>
            </div>
          </div>

          {/* Fecha y Hora */}
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Fecha y Hora</p>
              <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {fecha ? `${fecha.getDate()} ${fecha.toLocaleString('es', { month: 'short', year: 'numeric' })}` : 'Pendiente'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                A las {hora} hrs
              </p>
            </div>
          </div>

          {/* Modalidad y Ubicación */}
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Ubicación</p>
              <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight capitalize">
                Consulta {modalidad}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                {modalidad === 'presencial' && clinicaSeleccionada && (
                  <><Building2 className="w-3.5 h-3.5" /> {clinicaSeleccionada.cliDescripcion}</>
                )}
                {modalidad === 'domicilio' && areaDomicilio && (
                  <><MapPin className="w-3.5 h-3.5" /> {areaDomicilio.municipio}</>
                )}
                {modalidad === 'virtual' && (
                  <span>Videollamada</span>
                )}
              </p>
            </div>
          </div>

          {/* Médico */}
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Stethoscope className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Especialista</p>
              <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {medicoName}
              </p>
            </div>
          </div>

        </div>

        {/* Info Pago & Desglose */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
          <div className="bg-slate-50 dark:bg-[#0B1120] rounded-xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-4 h-full">
             <div className="p-3 bg-white dark:bg-[#0F172A] rounded-lg shadow-sm">
               {itemBilletera?.tipo === 'TARJETA' ? (
                 <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
               ) : (
                 <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
               )}
             </div>
             <div>
               <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pago Seleccionado</p>
               <p className="font-bold text-slate-700 dark:text-slate-200 text-sm mt-0.5">
                 {metodoSeleccionado?.descripcion || 'Pendiente'}
               </p>
               {itemBilletera && (
                 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                   {itemBilletera.proveedor} • {itemBilletera.descripcion}
                 </p>
               )}
             </div>
          </div>

          <div className="bg-white dark:bg-[#0F172A] rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Subtotal de la consulta</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">${precioBase.toFixed(2)} MXN</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Impuestos (16% IVA)</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">${iva.toFixed(2)} MXN</span>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 my-1 pt-2 flex justify-between items-center">
              <span className="font-bold text-slate-900 dark:text-white">Total a Pagar</span>
              <span className="font-black text-lg text-blue-600 dark:text-blue-400">${total.toFixed(2)} MXN</span>
            </div>
          </div>
        </div>
        
        {archivos.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Documentos adjuntos:</h4>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {archivos.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-[#0B1120] shadow-sm overflow-hidden">
                  <FileText className="h-5 w-5 shrink-0 text-sky-500" />
                  <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-300">{file.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Políticas y Alertas */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-4">
          {modalidad === 'virtual' && (
            <div className="bg-sky-50 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" />
              <div>
                <p className="text-sm font-bold">Instrucciones para tu cita virtual</p>
                <p className="text-sm font-medium mt-1">Recibirás un enlace de conexión segura (Google Meet/Zoom) por correo electrónico y WhatsApp 15 minutos antes de tu cita.</p>
              </div>
            </div>
          )}

          <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-transparent hover:border-slate-100 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#0B1120] transition-colors cursor-pointer group">
            <div className="relative flex items-center pt-1">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                He leído y acepto las políticas de cancelación y reembolso.
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Las cancelaciones o reprogramaciones con menos de 24 horas de anticipación pueden estar sujetas a cargos de hasta el 50% del costo de la consulta.
              </span>
            </div>
          </label>
        </div>
      </div>

      <div className="sticky bottom-0 z-30 bg-transparent flex flex-col-reverse sm:flex-row justify-between items-center gap-3 py-4 border-t border-slate-200/60 dark:border-slate-800/40 mt-8">
        <button
          onClick={prevStep}
          disabled={isSubmitting}
          className="w-full sm:w-auto font-bold py-3.5 px-8 rounded-xl transition-all flex items-center justify-center gap-2 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0F172A] shadow-sm"
        >
          <ChevronLeft className="h-5 w-5" /> Regresar
        </button>
        <button
          onClick={handleConfirm}
          disabled={isSubmitting || !acceptedTerms}
          className={`w-full sm:w-auto font-bold py-3.5 px-10 rounded-xl transition-all flex items-center justify-center gap-2 ${isSubmitting || !acceptedTerms
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer'
            }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              Confirmar Cita
              <Check className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
