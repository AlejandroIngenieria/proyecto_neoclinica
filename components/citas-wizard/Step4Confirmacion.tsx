'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useCreateCita, usePagarCita, useMetodosPago, useBilletera, useCreateGrupo, useCrearSolicitudCambio } from '@/hooks/use-flujo-citas';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { useCitaStore } from '@/store/use-cita-store';
import { completarTareaLealtad } from '@/services/lealtad';
import { crearNotificacion } from '@/services/notificaciones';
import {
  ChevronLeft,
  Check,
  FileText,
  Loader2,
  Info,
  Calendar,
  MapPin,
  CreditCard,
  Building2,
  Stethoscope,
  Activity,
  Wallet,
  AlertCircle,
  FolderPlus,
  CalendarDays,
  ArrowRight,
  ShieldCheck,
  Home,
  Video,
  Sparkles,
  ArrowLeftRight,
} from 'lucide-react';
import type { CrearCitaRequest } from '@/types/citas';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function Step4Confirmacion() {
  const router = useRouter();
  const { data: session } = useSession();
  const {
    codMedico, medicoName, modalidad, clinicaSeleccionada, areaDomicilio,
    servicioSeleccionado,
    fecha, hora, pacienteSeleccionado, grupoId, grupoNombre, creandoNuevoGrupo, nuevoGrupoTema, motivo,
    archivos, prevStep, tipoPagoId, billeteraItemId,
    comprobanteTransferencia, referenciaTransferencia,
    direccionDomicilio, referenciasDomicilio, recompensaSeleccionada, reset,
    setCitaConfirmada, solicitudIntercambio
  } = useCitaStore();

  const { mutateAsync: createCita } = useCreateCita();
  const { mutateAsync: createGrupo } = useCreateGrupo();
  const { mutateAsync: pagarCita } = usePagarCita();
  const { mutateAsync: crearSolicitudCambio } = useCrearSolicitudCambio();

  const { data: doctor } = useDoctorByCode(codMedico || '');
  const { data: metodosPago = [] } = useMetodosPago(codMedico || '');
  const { data: billetera = [] } = useBilletera(pacienteSeleccionado?.pacCodigo || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatusText, setSubmitStatusText] = useState('Registrando tu cita médica...');
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdCitaId, setCreatedCitaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pricing calculations reales basados en el servicio o la clínica
  const precioBase = servicioSeleccionado
    ? servicioSeleccionado.costoSinIva
    : (modalidad === 'presencial' ? (clinicaSeleccionada?.mclPrecioBase || 0) : 0);
  const iva = servicioSeleccionado
    ? servicioSeleccionado.costoIva
    : (precioBase > 0 ? precioBase * 0.12 : 0);
  const total = servicioSeleccionado
    ? servicioSeleccionado.costoTotal
    : (precioBase + iva);

  const getInitials = (name: string) => {
    if (!name) return '';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };

  const metodoSeleccionado = metodosPago.find(m => m.tipoPagoId === tipoPagoId);
  const itemBilletera = billetera.find(b => b.id_metodo === billeteraItemId);
  const isTransferenciaSeleccionada = metodoSeleccionado?.descripcion.toLowerCase().includes('transferencia') || metodoSeleccionado?.descripcion.toLowerCase().includes('banco');

  const formatHoraDisplay = (rawHora: string | null) => {
    if (!rawHora) return '';
    const [h, m] = rawHora.split(':');
    let hourNum = parseInt(h);
    if (isNaN(hourNum)) return rawHora;
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    hourNum = hourNum % 12;
    hourNum = hourNum ? hourNum : 12;
    return `${hourNum}:${m} ${ampm}`;
  };

  const handleConfirm = async () => {
    if (!codMedico || !pacienteSeleccionado || !fecha || !hora || !modalidad || !tipoPagoId) return;

    setIsSubmitting(true);
    setError(null);
    setSubmitStatusText('Verificando turno y registrando consulta...');

    try {
      // 0. Si se solicitó crear un nuevo tema de seguimiento, crearlo primero
      let finalGrupoId = grupoId || undefined;

      if (creandoNuevoGrupo && nuevoGrupoTema.trim() && pacienteSeleccionado && codMedico) {
        try {
          setSubmitStatusText('Iniciando nuevo tema de seguimiento...');
          const resGrupo = await createGrupo({
            codPaciente: pacienteSeleccionado.pacCodigo,
            codMedico,
            tema: nuevoGrupoTema.trim(),
            tituloTema: nuevoGrupoTema.trim(),
          });
          const createdId = (resGrupo as any)?.id || (resGrupo as any)?.grupoId;
          if (createdId) {
            finalGrupoId = createdId;
          }
        } catch (err) {
          console.error('No se pudo pre-crear el grupo de seguimiento:', err);
        }
      }

      // 1. Preparar DTO
      setSubmitStatusText('Guardando los datos de tu consulta...');
      let consultorioId = undefined;
      let dirDomicilio = null;
      let refDomicilio = null;

      if (modalidad === 'presencial' && clinicaSeleccionada) {
        consultorioId = clinicaSeleccionada.cliCodigo;
      } else if (modalidad === 'domicilio' && areaDomicilio) {
        consultorioId = null;
        dirDomicilio = direccionDomicilio;
        refDomicilio = referenciasDomicilio;
      } else if (modalidad === 'virtual') {
        consultorioId = null;
      }

      const rcpCod = recompensaSeleccionada
        ? recompensaSeleccionada.praCodrcp ||
          (recompensaSeleccionada as any).rcpCodigo ||
          (recompensaSeleccionada as any).rcp_codigo
        : undefined;

      const request: CrearCitaRequest = {
        codPaciente: pacienteSeleccionado.pacCodigo,
        codMedico,
        grupoId: finalGrupoId,
        consultorioId,
        codServicio: servicioSeleccionado?.sypCodigo || undefined,
        fecha: fecha.toISOString().split('T')[0],
        hora: hora.length === 5 ? hora + ':00' : hora,
        modalidad,
        precio: total,
        motivo: (motivo && motivo !== grupoNombre && motivo !== servicioSeleccionado?.servicio)
          ? motivo.trim()
          : (servicioSeleccionado?.servicio || undefined),
        direccionDomicilio: dirDomicilio,
        referenciasDomicilio: refDomicilio,
        enlaceVideollamada: null,
        recompensaCodigo: rcpCod,
        rcpCodigo: rcpCod,
        archivos: archivos.length > 0 ? archivos : undefined,
      };

      // 2. Crear Cita
      const citaId = await createCita(request);
      setCreatedCitaId(citaId);

      // 2.1 Si el usuario solicitó un intercambio de horario ocupado, registrar la solicitud
      if (solicitudIntercambio && codMedico) {
        try {
          setSubmitStatusText('Enviando solicitud de intercambio de horario...');
          await crearSolicitudCambio({
            citaSolicitanteId: citaId,
            codMedico,
            fechaDeseada: solicitudIntercambio.fecha,
            horaDeseada: solicitudIntercambio.hora.length === 5 ? `${solicitudIntercambio.hora}:00` : solicitudIntercambio.hora,
            mensaje: solicitudIntercambio.mensaje,
          });
        } catch (errSwap: any) {
          console.error('Error al registrar solicitud de intercambio:', errSwap?.response?.data || errSwap);
        }
      }

      // Trigger automatic loyalty task and notification for creating appointment
      const sessionToken = (session as any)?.accessToken;
      if (sessionToken) {
        completarTareaLealtad(sessionToken, 'CREAR_CITA').catch(() => {});
        completarTareaLealtad(sessionToken, 'CITA_PROGRAMADA').catch(() => {});
        crearNotificacion(sessionToken, {
          usuarioId: pacienteSeleccionado.pacCodigo,
          usuarioTipo: 'paciente',
          tipo: 'cita',
          titulo: 'Cita Agendada con Éxito',
          mensaje: `Tu consulta con ${medicoName} para el ${fecha.toLocaleDateString('es-GT')} a las ${hora} hs fue confirmada.`,
          accionUrl: `/dashboard/citas/${citaId}/exito`,
        }).catch(() => {});
      }

      // 3. Registrar método de pago (no bloquea la asignación, el pago puede efectuarse en clínica o consultorio)
      if (tipoPagoId) {
        try {
          setSubmitStatusText('Confirmando cita programada...');
          await pagarCita({
            citaId,
            payload: {
              codTpp: Number(tipoPagoId),
              estadoPago: 'pagado',
              referenciaPago: referenciaTransferencia?.trim() || billeteraItemId || null,
            },
          });
        } catch (errPago) {
          console.warn('Registro de pago no bloqueante:', errPago);
        }
      }

      // 4. Marcar éxito
      setCitaConfirmada(true);
      setIsSuccess(true);
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    } catch (e: any) {
      console.error('Error al agendar cita', e);
      setError('Ocurrió un error al agendar la cita. Por favor intenta de nuevo.');
      setIsSubmitting(false);
    }
  };

  // 1. ESTADO DE ÉXITO (CITA PROGRAMADA CON ÉXITO)
  if (isSuccess) {
    const docPhoto = doctor?.exp_foto_perfil || `https://ui-avatars.com/api/?name=${encodeURIComponent(medicoName || 'Doctor')}&background=0284c7&color=fff`;
    const docSpecialties = doctor?.especialidades?.map(e => e.especialidad).join(', ') || 'Especialista Médico';

    return (
      <div className="max-w-2xl mx-auto py-6 sm:py-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700/80 shadow-xl text-center">
          
          {/* Success Check Icon Badge */}
          <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
            <Check className="w-9 h-9 stroke-[3]" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            ¡Cita Programada con Éxito!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Tu consulta médica ha sido reservada y registrada en el sistema de SaludYa.
          </p>

          {/* Doctor Info with Circular Photo */}
          <div className="my-6 p-4 sm:p-5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-white dark:border-slate-700 shadow-md shrink-0 bg-slate-100 dark:bg-slate-800">
              <img
                src={docPhoto}
                alt={medicoName || 'Doctor'}
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 block mb-0.5">
                Especialista Asignado
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">
                Dr{doctor?.exp_sexo === 'F' ? 'a' : ''}. {medicoName}
              </h3>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {docSpecialties}
              </p>
            </div>
          </div>

          {/* Appointment Details Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-[#0F172A]/80 p-5 text-left space-y-3.5 mb-8">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200/70 dark:border-slate-800">
              <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Detalles de la Cita</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950 px-2 py-0.5 rounded-md text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" /> Confirmada
              </span>
            </div>

            {/* Fecha y Hora */}
            <div className="flex items-start gap-3">
              <CalendarDays className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Fecha y Horario</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {fecha ? format(fecha, "EEEE dd 'de' MMMM, yyyy", { locale: es }) : ''} · {formatHoraDisplay(hora)}
                </p>
              </div>
            </div>

            {/* Servicio Médico */}
            {servicioSeleccionado && (
              <div className="flex items-start gap-3">
                <Stethoscope className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Servicio</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {servicioSeleccionado.servicio} <span className="text-sky-600 dark:text-sky-400 font-extrabold">(Q{total.toFixed(2)})</span>
                  </p>
                </div>
              </div>
            )}

            {/* Modalidad y Ubicación */}
            <div className="flex items-start gap-3">
              {modalidad === 'virtual' ? (
                <Video className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              ) : modalidad === 'domicilio' ? (
                <Home className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              ) : (
                <MapPin className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Modalidad / Ubicación</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 capitalize">
                  {modalidad === 'presencial' && clinicaSeleccionada
                    ? `Presencial · ${clinicaSeleccionada.cliDescripcion}`
                    : modalidad === 'domicilio' && areaDomicilio
                    ? `A Domicilio · ${areaDomicilio.municipio}`
                    : 'Telemedicina Virtual (Videollamada)'}
                </p>
              </div>
            </div>

            {/* Paciente */}
            <div className="flex items-start gap-3">
              <Activity className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Paciente</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {pacienteSeleccionado?.nombreCompleto || 'Paciente titular'}
                </p>
              </div>
            </div>

            {/* Tema de Seguimiento (si aplica) */}
            {(grupoId || creandoNuevoGrupo) && (
              <div className="flex items-start gap-3">
                <FolderPlus className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Tema de Seguimiento</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {creandoNuevoGrupo ? nuevoGrupoTema : (grupoNombre || 'Tema vinculado')}
                  </p>
                </div>
              </div>
            )}

            {/* Solicitud de Intercambio Activa */}
            {solicitudIntercambio && (
              <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-950 dark:text-orange-200 flex items-start gap-3">
                <ArrowLeftRight className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block">Solicitud de intercambio enviada:</span>
                  <span className="text-orange-800 dark:text-orange-300 mt-0.5 block">
                    Has solicitado el turno de las <strong>{formatHoraDisplay(solicitudIntercambio.hora)}</strong> al otro paciente. Si acepta ceder su horario, tu cita se moverá automáticamente.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              type="button"
              onClick={() => {
                reset();
                router.push('/dashboard/citas');
              }}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md shadow-sky-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <CalendarDays className="w-4 h-4" />
              <span>Ver mis Citas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                reset();
                router.push('/dashboard');
              }}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm border border-slate-200 dark:border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Volver al Inicio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    );
  }

  // 2. ESTADO DE CARGA (IN-PAGE SPINNER SIN MODALES)
  if (isSubmitting) {
    return (
      <div className="max-w-2xl mx-auto py-12 sm:py-20 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-700 shadow-xl text-center flex flex-col items-center justify-center">
          
          {/* Animated Spinner with Glow */}
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-full border-4 border-sky-200 dark:border-sky-900 animate-spin border-t-sky-600 dark:border-t-sky-400" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-sky-600 dark:text-sky-400 animate-pulse" />
            </div>
          </div>

          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Procesando tu Consulta Médica
          </h3>
          
          <p className="text-sm font-semibold text-sky-600 dark:text-sky-400 mt-2">
            {submitStatusText}
          </p>

          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 max-w-sm">
            Estamos comunicándonos con el servidor para agendar tu horario y garantizar tu cita con {medicoName}.
          </p>

          <div className="mt-8 w-full max-w-xs bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-sky-600 h-full rounded-full w-2/3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // 3. ESTADO NORMAL DE REVISIÓN Y CONFIRMACIÓN
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Confirma tu cita</h2>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Revisa los datos de tu consulta y confirma para finalizar.</p>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 p-4 text-sm font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        {solicitudIntercambio && (
          <div className="p-4 rounded-2xl bg-orange-50/90 dark:bg-orange-950/40 border-2 border-orange-300 dark:border-orange-800/80 mb-6 flex items-start gap-3 shadow-xs">
            <div className="p-2 bg-orange-500 text-white rounded-xl shrink-0 mt-0.5">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-orange-950 dark:text-orange-200">
                Petición de intercambio incluida para las {formatHoraDisplay(solicitudIntercambio.hora)}
              </p>
              <p className="text-orange-800 dark:text-orange-300 mt-0.5 leading-relaxed">
                Tu cita quedará reservada para las <strong>{formatHoraDisplay(hora)}</strong>. Simultáneamente, enviaremos tu solicitud al paciente que tiene las {formatHoraDisplay(solicitudIntercambio.hora)}. Si acepta ceder su horario, tu consulta se actualizará automáticamente.
              </p>
            </div>
          </div>
        )}

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
                A las {formatHoraDisplay(hora)}
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

          {/* Servicio Médico */}
          {servicioSeleccionado && (
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                <Activity className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Servicio Médico</p>
                <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {servicioSeleccionado.servicio}
                </p>
                <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold mt-1">
                  Q{servicioSeleccionado.costoTotal.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Tema de Seguimiento */}
          {(grupoId || creandoNuevoGrupo) && (
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                <FolderPlus className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Tema de Seguimiento</p>
                <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {creandoNuevoGrupo ? (nuevoGrupoTema || 'Nuevo tema') : (grupoNombre || 'Tema activo')}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mt-1">
                  {creandoNuevoGrupo ? 'Se creará e iniciará una nueva serie' : 'Continuidad con tema asignado'}
                </p>
              </div>
            </div>
          )}

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
               {isTransferenciaSeleccionada && comprobanteTransferencia && (
                 <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 font-semibold flex items-center gap-1">
                   ✓ Comprobante adjunto · {(comprobanteTransferencia.size / 1024).toFixed(1)} KB
                 </p>
               )}
             </div>
          </div>

          <div className="bg-white dark:bg-[#0F172A] rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Subtotal de la consulta</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">Q{precioBase.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Impuestos (12% IVA)</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">Q{iva.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 my-1 pt-2 flex justify-between items-center">
              <span className="font-bold text-slate-900 dark:text-white">Total a Pagar</span>
              <span className="font-black text-lg text-blue-600 dark:text-blue-400">Q{total.toFixed(2)}</span>
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

        {/* Términos y Condiciones Informativos (Sin checkbox obligatorio) */}
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

          {/* Términos informativos */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
            <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Al hacer clic en <strong>Confirmar Cita</strong>, aceptas los <strong>Términos y Condiciones</strong>, el consentimiento informado y las políticas de cancelación y reembolso de <strong>SaludYa</strong>. Las cancelaciones con menos de 24 horas de anticipación pueden estar sujetas a cargos según las políticas del especialista.
            </p>
          </div>
        </div>
      </div>

      {/* Botones de Navegación */}
      <div className="sticky bottom-0 z-30 bg-transparent flex flex-col-reverse sm:flex-row justify-between items-center gap-3 py-4 border-t border-slate-200/60 dark:border-slate-800/40 mt-8">
        <button
          onClick={prevStep}
          disabled={isSubmitting}
          className="w-full sm:w-auto font-bold py-3.5 px-8 rounded-xl transition-all flex items-center justify-center gap-2 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0F172A] shadow-sm cursor-pointer"
        >
          <ChevronLeft className="h-5 w-5" /> Regresar
        </button>

        <button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="w-full sm:w-auto font-bold py-3.5 px-10 rounded-xl transition-all flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 cursor-pointer"
        >
          Confirmar Cita
          <Check className="h-5 w-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
