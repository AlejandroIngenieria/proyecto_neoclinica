'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  useCreateCita,
  usePagarCita,
  useMetodosPago,
  useBilletera,
  useCreateGrupo,
  useCrearSolicitudCambio,
} from '@/hooks/use-flujo-citas';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { useCitaStore } from '@/store/use-cita-store';
import { completarTareaLealtad } from '@/services/lealtad';
import { crearNotificacion } from '@/services/notificaciones';
import { useVincularReferido } from '@/hooks/use-recompensas';
import { usePacienteTitular } from '@/hooks/use-pacientes';
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
  ArrowLeftRight,
  User,
  CheckCircle2,
  ClipboardList,
  Banknote,
  Landmark,
  Clock,
  Copy,
  Gift,
} from 'lucide-react';
import type { CrearCitaRequest } from '@/types/citas';
import { buildDoctorFullName } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatBytes } from '@/utils/image-compression';

export function Step4Confirmacion() {
  const router = useRouter();
  const { data: session } = useSession();
  const {
    codMedico,
    medicoName,
    modalidad,
    clinicaSeleccionada,
    areaDomicilio,
    servicioSeleccionado,
    tipoConsulta,
    fecha,
    hora,
    pacienteSeleccionado,
    grupoId,
    grupoNombre,
    creandoNuevoGrupo,
    nuevoGrupoTema,
    motivo,
    archivos,
    prevStep,
    tipoPagoId,
    billeteraItemId,
    comprobanteTransferencia,
    referenciaTransferencia,
    direccionDomicilio,
    referenciasDomicilio,
    recompensaSeleccionada,
    reset,
    setCitaConfirmada,
    solicitudIntercambio,
    citasMultiples,
    pacienteModoCita,
    omitirPago,
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
  const [copiedCode, setCopiedCode] = useState(false);

  // Código de Referido
  const { titular: pacienteTitular } = usePacienteTitular();
  const pacCodigoReferido = pacienteSeleccionado?.pacCodigo || pacienteTitular?.pac_codigo;
  const { mutateAsync: vincularReferido, isPending: isApplyingReferido } = useVincularReferido(pacCodigoReferido);

  const [codigoReferidoInput, setCodigoReferidoInput] = useState('');
  const [codigoReferidoAplicado, setCodigoReferidoAplicado] = useState<string | null>(null);
  const [referidoError, setReferidoError] = useState<string | null>(null);

  const handleAplicarCodigoReferido = async () => {
    const cleanCode = codigoReferidoInput.trim().toUpperCase();
    if (!cleanCode) return;

    if (!pacCodigoReferido) {
      toast.error('No se pudo identificar el paciente para vincular el código.');
      return;
    }

    setReferidoError(null);
    try {
      await vincularReferido({ codigoReferencia: cleanCode });
      setCodigoReferidoAplicado(cleanCode);
    } catch (err: any) {
      const msg = err?.message || 'El código de referido es inválido o no se pudo aplicar.';
      setReferidoError(msg);
      toast.error(msg);
    }
  };

  // Desplazar la vista inmediatamente hasta arriba al iniciar o procesar la confirmación
  useEffect(() => {
    if (isSubmitting) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [isSubmitting]);

  const isMultiMode = !!(grupoId || creandoNuevoGrupo) && citasMultiples.length > 0;
  const countCitas = isMultiMode ? citasMultiples.length : 1;

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

  const subtotalGeneral = precioBase * countCitas;
  const ivaGeneral = iva * countCitas;
  const totalGeneral = total * countCitas;

  const getInitials = (name: string) => {
    if (!name) return '';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };

  const metodoSeleccionado = metodosPago.find(m => m.tipoPagoId === tipoPagoId);
  const itemBilletera = billetera.find(b => b.id_metodo === billeteraItemId);
  const isTransferenciaSeleccionada =
    metodoSeleccionado?.descripcion.toLowerCase().includes('transferencia') ||
    metodoSeleccionado?.descripcion.toLowerCase().includes('banco');

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

  const nombreDoctor = doctor ? buildDoctorFullName(doctor) : (medicoName || 'Especialista Médico');
  const docPhoto = doctor?.exp_foto_perfil || null;
  const docSpecialties = doctor?.especialidades?.map(e => e.especialidad).join(', ') || doctor?.exp_profesion || 'Especialista Médico';

  const handleConfirm = async () => {
    if (isMultiMode) {
      if (!codMedico || citasMultiples.length === 0 || !modalidad) return;
      if (!omitirPago && !tipoPagoId) return;
      if (pacienteModoCita === 'mismo' && !pacienteSeleccionado) return;
      if (pacienteModoCita === 'variado' && !citasMultiples.every(c => Boolean(c.paciente || pacienteSeleccionado))) return;

      setIsSubmitting(true);
      setError(null);
      setSubmitStatusText('Preparando grupo de citas...');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      try {
        let finalGrupoId = grupoId || undefined;
        if (creandoNuevoGrupo && nuevoGrupoTema.trim() && codMedico) {
          try {
            setSubmitStatusText('Creando nuevo grupo de citas...');
            const pacParaGrupo = pacienteSeleccionado || citasMultiples[0]?.paciente;
            const resGrupo = await createGrupo({
              codPaciente: pacParaGrupo!.pacCodigo,
              codMedico,
              tema: nuevoGrupoTema.trim(),
              tituloTema: nuevoGrupoTema.trim(),
            });
            const createdId = (resGrupo as any)?.id || (resGrupo as any)?.grupoId;
            if (createdId) finalGrupoId = createdId;
          } catch (err) {
            console.error('No se pudo pre-crear el grupo:', err);
          }
        }

        let consultorioId = undefined;
        let dirDomicilio = null;
        let refDomicilio = null;

        if (modalidad === 'presencial' && clinicaSeleccionada) {
          consultorioId = clinicaSeleccionada.cliCodigo;
        } else if (modalidad === 'domicilio' && areaDomicilio) {
          dirDomicilio = direccionDomicilio;
          refDomicilio = referenciasDomicilio;
        }

        const rcpCod = recompensaSeleccionada
          ? recompensaSeleccionada.praCodrcp ||
            (recompensaSeleccionada as any).rcpCodigo ||
            (recompensaSeleccionada as any).rcp_codigo
          : undefined;

        const createdIds: string[] = [];

        for (let i = 0; i < citasMultiples.length; i++) {
          const item = citasMultiples[i];
          setSubmitStatusText(`Agendando cita ${i + 1} de ${citasMultiples.length}...`);

          const pacDeCita = (pacienteModoCita === 'variado' && item.paciente)
            ? item.paciente
            : pacienteSeleccionado;

          const fechaStr = format(item.fecha, 'yyyy-MM-dd');
          const horaStr = item.hora.length === 5 ? `${item.hora}:00` : item.hora;

          const request: CrearCitaRequest = {
            codPaciente: pacDeCita!.pacCodigo,
            codMedico,
            grupoId: finalGrupoId,
            consultorioId,
            codServicio: servicioSeleccionado?.sypCodigo || undefined,
            fecha: fechaStr,
            hora: horaStr,
            modalidad,
            precio: total,
            motivo: (motivo && motivo !== grupoNombre && motivo !== servicioSeleccionado?.servicio)
              ? motivo.trim()
              : (servicioSeleccionado?.servicio || undefined),
            direccionDomicilio: dirDomicilio,
            referenciasDomicilio: refDomicilio,
            enlaceVideollamada: null,
            recompensaCodigo: i === 0 ? rcpCod : undefined,
            rcpCodigo: i === 0 ? rcpCod : undefined,
            tipoConsulta: tipoConsulta || 'Primera vez',
            tipoPagoId: tipoPagoId ? Number(tipoPagoId) : undefined,
            referenciaPago: referenciaTransferencia?.trim() || billeteraItemId || undefined,
            archivos: archivos,
            comprobanteTransferencia: comprobanteTransferencia || undefined,
          };

          const idCitaCreada = await createCita(request);
          createdIds.push(idCitaCreada);

          const sessionToken = (session as any)?.accessToken;
          if (sessionToken && pacDeCita) {
            completarTareaLealtad(sessionToken, 'CREAR_CITA').catch(() => {});
            completarTareaLealtad(sessionToken, 'CITA_PROGRAMADA').catch(() => {});
            crearNotificacion(sessionToken, {
              usuarioId: pacDeCita.pacCodigo,
              usuarioTipo: 'paciente',
              tipo: 'cita',
              titulo: 'Cita Agendada en Grupo',
              mensaje: `Cita con ${medicoName} para el ${format(item.fecha, 'dd/MM/yyyy')} a las ${item.hora} confirmada.`,
              accionUrl: `/dashboard/citas/${idCitaCreada}/exito`,
            }).catch(() => {});
          }
        }

        if (!omitirPago && tipoPagoId && createdIds.length > 0) {
          setSubmitStatusText('Registrando método de pago...');
          for (const cId of createdIds) {
            try {
              await pagarCita({
                citaId: cId,
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
        }

        setCreatedCitaId(createdIds[0]);
        setCitaConfirmada(true);
        setIsSuccess(true);
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      } catch (e: any) {
        console.error('Error al agendar citas del grupo', e);
        setError('Ocurrió un error al agendar las citas del grupo. Por favor intenta de nuevo.');
        setIsSubmitting(false);
      }
      return;
    }

    // Modo Cita Individual
    if (!codMedico || !pacienteSeleccionado || !fecha || !hora || !modalidad || (!tipoPagoId && !omitirPago)) return;

    setIsSubmitting(true);
    setError(null);
    setSubmitStatusText('Verificando turno y registrando consulta...');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    try {
      let finalGrupoId = grupoId || undefined;

      if (creandoNuevoGrupo && nuevoGrupoTema.trim() && pacienteSeleccionado && codMedico) {
        try {
          setSubmitStatusText('Creando nuevo grupo de citas...');
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

      // Si el paciente ingresó un código de referido y aún no lo aplicó manualmente, intentamos aplicarlo
      if (codigoReferidoInput.trim() && !codigoReferidoAplicado && pacCodigoReferido) {
        try {
          await vincularReferido({ codigoReferencia: codigoReferidoInput.trim().toUpperCase() });
          setCodigoReferidoAplicado(codigoReferidoInput.trim().toUpperCase());
        } catch (errRef: any) {
          console.warn('No se pudo vincular código de referido antes de agendar:', errRef?.message);
        }
      }

      const request: CrearCitaRequest = {
        codPaciente: pacienteSeleccionado.pacCodigo,
        codMedico,
        grupoId: finalGrupoId,
        consultorioId,
        codServicio: servicioSeleccionado?.sypCodigo || undefined,
        fecha: format(fecha, 'yyyy-MM-dd'),
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
        tipoConsulta: tipoConsulta || 'Primera vez',
        tipoPagoId: tipoPagoId ? Number(tipoPagoId) : undefined,
        referenciaPago: referenciaTransferencia?.trim() || billeteraItemId || undefined,
        archivos: archivos,
        comprobanteTransferencia: comprobanteTransferencia || undefined,
      };

      const citaId = await createCita(request);
      setCreatedCitaId(citaId);

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

      if (!omitirPago && tipoPagoId) {
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

      setCitaConfirmada(true);
      setIsSuccess(true);
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    } catch (e: any) {
      console.error('Error al agendar cita', e);
      setError('Ocurrió un error al agendar la cita. Por favor intenta de nuevo.');
      setIsSubmitting(false);
    }
  };

  // Helper para datos de pago visual
  const paymentBadgeText = omitirPago
    ? 'EFECTIVO'
    : itemBilletera?.tipo === 'TARJETA'
    ? (itemBilletera.proveedor?.slice(0, 4)?.toUpperCase() || 'VISA')
    : isTransferenciaSeleccionada
    ? 'BANCO'
    : itemBilletera?.tipo === 'SEGURO'
    ? 'SEGURO'
    : 'PAGO';

  const paymentTitle = omitirPago
    ? 'Pago en Consultorio / Clínica'
    : itemBilletera?.tipo === 'TARJETA'
    ? 'Tarjeta de Débito / Crédito'
    : isTransferenciaSeleccionada
    ? 'Transferencia Bancaria'
    : itemBilletera?.tipo === 'SEGURO'
    ? 'Pago con Seguro Médico'
    : (metodoSeleccionado?.descripcion || 'Método Seleccionado');

  const paymentSubtitle = omitirPago
    ? 'Abonar en efectivo o con tarjeta al asistir a la recepción'
    : itemBilletera?.tipo === 'TARJETA'
    ? `Terminada en ${itemBilletera.descripcion || '•••• 4242'}`
    : isTransferenciaSeleccionada
    ? (referenciaTransferencia ? `Boleta / Ref: ${referenciaTransferencia}` : 'Comprobante verificado')
    : itemBilletera?.tipo === 'SEGURO'
    ? `${itemBilletera.proveedor || 'Aseguradora'} · Póliza: ${itemBilletera.descripcion || 'Activa'}`
    : (metodoSeleccionado?.observaciones || 'Pago registrado');

  const paymentSecurityNote = omitirPago
    ? 'Abono directo en recepción sin cobro previo en línea'
    : itemBilletera?.tipo === 'TARJETA'
    ? 'Tarjeta tokenizada y verificada con 3D Secure'
    : isTransferenciaSeleccionada
    ? (comprobanteTransferencia ? `Comprobante adjuntado (${formatBytes(comprobanteTransferencia.size)})` : 'Procesamiento seguro verificado')
    : itemBilletera?.tipo === 'SEGURO'
    ? 'Póliza y carné validados para cobertura médica directa'
    : 'Procesamiento seguro encriptado';

  const codigoCitaFormateado = createdCitaId
    ? `CIT-${createdCitaId.replace(/-/g, '').slice(0, 8).toUpperCase()}`
    : `NC-APP-${new Date().getFullYear()}-${pacienteSeleccionado?.pacCodigo?.slice(0, 4)?.toUpperCase() || '9812'}`;

  // =========================================================================
  // 1. ESTADO DE ÉXITO (DASHBOARD DISTRIBUIDO A TODO EL ANCHO SIN SCROLL)
  // =========================================================================
  if (isSuccess) {
    return (
      <div className="w-full max-w-7xl mx-auto font-sans pb-6 animate-in fade-in zoom-in-[0.98] duration-300">
        {/* Luces sutiles y decorativas de fondo */}
        <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-[#dce9ff]/40 dark:bg-blue-900/15 blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/2 right-10 w-80 h-80 rounded-full bg-[#cce5ff]/25 dark:bg-sky-900/15 blur-3xl pointer-events-none -z-10" />

        <div className="w-full flex flex-col space-y-6">
          {/* Header Superior con Código, Estado y Botones Rápidos de Acción */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-[0_2px_14px_rgba(11,28,48,0.04)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#dcfce7] dark:bg-emerald-950/60 text-[#006c4a] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-[#0b1c30] dark:text-white tracking-tight">
                    {isMultiMode ? `¡${citasMultiples.length} Citas Programadas con Éxito!` : '¡Cita Programada con Éxito!'}
                  </h1>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(codigoCitaFormateado);
                      setCopiedCode(true);
                      toast.success('Código copiado al portapapeles');
                      setTimeout(() => setCopiedCode(false), 2500);
                    }}
                    title="Copiar código de cita"
                    className="font-mono text-xs font-bold text-[#006194] dark:text-sky-400 bg-[#eff4ff] dark:bg-blue-950/60 hover:bg-[#dce9ff] dark:hover:bg-blue-900/60 px-3 py-1 rounded-full border border-blue-200/60 dark:border-blue-800/80 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>{codigoCitaFormateado}</span>
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {isMultiMode
                    ? `Tus ${citasMultiples.length} consultas médicas han sido reservadas y confirmadas en la agenda de NeoClínica.`
                    : 'Tu consulta médica ha sido reservada y confirmada en la agenda de NeoClínica.'}
                </p>
              </div>
            </div>

            {/* Botones de acción principales directamente arriba para evitar scrollear */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  reset();
                  router.push('/dashboard/citas');
                }}
                className="flex-1 md:flex-none px-5 py-2.5 rounded-xl bg-[#006194] hover:bg-[#007bb9] text-white font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
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
                className="flex-1 md:flex-none px-5 py-2.5 rounded-xl bg-[#eff4ff]/60 hover:bg-[#dce9ff] dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm border border-slate-200/60 dark:border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
              >
                <span>Ir al Inicio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grilla de 3 Columnas a todo el ancho aprovechando las dimensiones de pantalla */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Columna 1: Especialista y Horario */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-slate-800 shadow-[0_2px_14px_rgba(11,28,48,0.04)] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-4">
                  ESPECIALISTA Y HORARIO
                </span>
                <div className="flex items-center gap-3.5 mb-5">
                  {docPhoto ? (
                    <img
                      src={docPhoto}
                      alt={nombreDoctor}
                      className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-slate-100 dark:ring-slate-700 shadow-2xs"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#eff4ff] dark:bg-slate-800 text-[#006194] dark:text-sky-400 font-bold text-sm flex items-center justify-center shrink-0 ring-2 ring-slate-100 dark:ring-slate-700">
                      {getInitials(nombreDoctor)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-[#0b1c30] dark:text-white truncate">
                      {nombreDoctor}
                    </h3>
                    <p className="text-xs font-semibold text-[#006194] dark:text-sky-400 truncate">
                      {docSpecialties}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {doctor?.exp_colegiado_gt ? `Colegiado No. ${doctor.exp_colegiado_gt}` : 'Colegiado No. 19135'}
                    </p>
                  </div>
                </div>

                {/* Fecha y Hora Card */}
                <div className="bg-[#eff4ff]/60 dark:bg-slate-800/60 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 border border-blue-50/50 dark:border-slate-800 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 text-[#006194] dark:text-sky-400 shadow-2xs flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-[#0b1c30] dark:text-white capitalize">
                      {fecha ? (
                        format(fecha, "EEEE d 'De' MMMM, yyyy", { locale: es })
                          .split(' ')
                          .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '')
                          .join(' ')
                      ) : 'Jueves 22 De Octubre, 2026'}
                    </p>
                    <p className="text-xs font-bold text-[#006194] dark:text-sky-400 font-mono mt-0.5">
                      {formatHoraDisplay(hora)} (Horario Centroamérica)
                    </p>
                  </div>
                </div>

                {/* Modalidad Card */}
                <div className="bg-[#eff4ff]/60 dark:bg-slate-800/60 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 border border-blue-50/50 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 text-[#006194] dark:text-sky-400 shadow-2xs flex items-center justify-center shrink-0">
                    {modalidad === 'virtual' ? (
                      <Video className="w-5 h-5" />
                    ) : modalidad === 'domicilio' ? (
                      <Home className="w-5 h-5" />
                    ) : (
                      <MapPin className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-[#0b1c30] dark:text-white capitalize">
                      {modalidad === 'presencial' ? 'Consulta Presencial' : modalidad === 'virtual' ? 'Videoconsulta Virtual' : 'Consulta a Domicilio'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {modalidad === 'virtual' ? 'Telemedicina Encriptada' : clinicaSeleccionada ? clinicaSeleccionada.cliDescripcion : modalidad === 'domicilio' ? (direccionDomicilio || 'Domicilio acordado') : 'Sede Central NeoClínica'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-[#006c4a] dark:text-emerald-400 mt-6 pt-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Horario reservado sin tiempos de espera</span>
              </div>
            </div>

            {/* Columna 2: Paciente y Detalles Médicos */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-slate-800 shadow-[0_2px_14px_rgba(11,28,48,0.04)] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-4">
                  PACIENTE Y CONSULTA
                </span>

                {/* Paciente Card */}
                <div className="bg-[#eff4ff]/60 dark:bg-slate-800/60 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 mb-5 border border-blue-50/50 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-blue-100/70 dark:bg-blue-900/40 text-[#006194] dark:text-sky-400 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PACIENTE</span>
                    <p className="text-sm font-bold text-[#0b1c30] dark:text-white truncate">
                      {pacienteSeleccionado?.nombreCompleto || 'Josué Alejandro Pérez Benito'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      Exp. #{pacienteSeleccionado?.pacCodigo?.slice(0, 8)?.toUpperCase() || 'F9A0E16C'}
                    </p>
                  </div>
                </div>

                {/* Fila de Datos Limpios */}
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Servicio</span>
                    <span className="font-semibold text-[#0b1c30] dark:text-white truncate max-w-[200px]">
                      {servicioSeleccionado?.servicio || 'Examen de la vista'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Tipo</span>
                    <span className="font-bold text-xs text-[#006194] dark:text-sky-400 bg-[#eff4ff] dark:bg-blue-950/60 px-3 py-0.5 rounded-full">
                      {tipoConsulta || 'Control'}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500 font-medium shrink-0 mr-2">Síntomas</span>
                    <span className="font-semibold text-[#0b1c30] dark:text-white text-right truncate max-w-[200px]">
                      {motivo || servicioSeleccionado?.servicio || 'Examen de la vista'}
                    </span>
                  </div>
                  {archivos.length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Adjuntos</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {archivos.length} archivo(s) vinculados
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {solicitudIntercambio && (
                <div className="mt-4 p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-[11px] text-orange-900 dark:text-orange-200">
                  <span className="font-bold">Intercambio solicitado:</span> Turno de las {formatHoraDisplay(solicitudIntercambio.hora)}. Se actualizará automáticamente si es cedido.
                </div>
              )}
            </div>

            {/* Columna 3: Facturación y Confirmación */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-slate-800 shadow-[0_2px_14px_rgba(11,28,48,0.04)] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-4">
                  PAGO Y CONFIRMACIÓN
                </span>

                {/* Tarjeta de Pago */}
                <div className="bg-[#eff4ff]/60 dark:bg-slate-800/60 rounded-2xl p-4 sm:p-5 mb-5 border border-blue-50/50 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {paymentTitle}
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-900 text-[#0b1c30] dark:text-white shadow-2xs">
                      {paymentBadgeText}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      TOTAL PAGADO
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-[#006194] dark:text-sky-400 font-mono tracking-tight">
                      Q {totalGeneral.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Recordatorio de Asistencia */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b1c30] dark:text-white mb-1.5">
                    <Info className="w-4 h-4 text-[#006194] shrink-0" />
                    <span>Recordatorio de asistencia:</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-5.5">
                    Preséntate 10 minutos antes en la recepción del centro médico. Recibirás una notificación y el comprobante oficial en tu correo electrónico.
                  </p>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-6 block">
                NeoClínica · Cuidado médico especializado con expediente unificado
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. ESTADO DE CARGA (PROCESANDO LA CITA)
  // =========================================================================
  if (isSubmitting) {
    return (
      <div className="relative w-full overflow-hidden font-sans py-12 sm:py-16 animate-in fade-in duration-300">
        <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-[#dce9ff]/40 dark:bg-blue-900/15 blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/2 right-10 w-80 h-80 rounded-full bg-[#cce5ff]/25 dark:bg-sky-900/15 blur-3xl pointer-events-none -z-10" />

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-100 dark:border-slate-800 shadow-[0_4px_28px_rgba(11,28,48,0.06)] max-w-xl mx-auto text-center flex flex-col items-center justify-center">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-full border-4 border-blue-100 dark:border-blue-950 animate-spin border-t-[#006194] dark:border-t-sky-400" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-[#006194] dark:text-sky-400 animate-pulse" />
            </div>
          </div>

          <h3 className="text-2xl font-black text-[#0b1c30] dark:text-white tracking-tight">
            Procesando tu Consulta Médica
          </h3>

          <p className="text-sm font-semibold text-[#006194] dark:text-sky-400 mt-2">
            {submitStatusText}
          </p>

          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 max-w-sm">
            Estamos comunicándonos con el servidor para agendar tu horario y garantizar tu cita con {nombreDoctor}.
          </p>

          <div className="mt-8 w-full max-w-xs bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-[#006194] h-full rounded-full w-2/3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. ESTADO NORMAL DE REVISIÓN Y CONFIRMACIÓN PREVIA (MOCKUP EXACTO)
  // =========================================================================
  return (
    <div className="relative w-full overflow-hidden font-sans pb-10">
      {/* Luces sutiles y decorativas de fondo */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-[#dce9ff]/40 dark:bg-blue-900/15 blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-10 w-80 h-80 rounded-full bg-[#cce5ff]/25 dark:bg-sky-900/15 blur-3xl pointer-events-none -z-10" />

      <div className="w-full flex flex-col space-y-6">
        {/* ENCABEZADO DE PÁGINA */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0b1c30] dark:text-white tracking-tight">
            Confirma tu cita
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Revisa los detalles de tu consulta médica y confirma para asegurar tu espacio en la agenda de NeoClínica.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 p-4 text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* CONTENEDOR PRINCIPAL TIPO TARJETA (MOCKUP) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-100 dark:border-slate-800 shadow-[0_2px_14px_rgba(11,28,48,0.04)] space-y-6">
          
          {/* CÁPSULA SUPERIOR CON DOCTOR Y ESTADO VERDE */}
          <div className="bg-[#eff4ff]/60 dark:bg-slate-800/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              {docPhoto ? (
                <img
                  src={docPhoto}
                  alt={nombreDoctor}
                  className="w-14 h-14 rounded-full object-cover shrink-0 ring-2 ring-white dark:ring-slate-700 shadow-xs"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#eff4ff] dark:bg-slate-700 text-[#006194] dark:text-sky-400 font-bold text-base flex items-center justify-center shrink-0 ring-2 ring-white dark:ring-slate-700 shadow-xs">
                  {getInitials(nombreDoctor)}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-[#0b1c30] dark:text-white truncate">
                  {nombreDoctor}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                  {docSpecialties}
                </p>
                {doctor?.exp_colegiado_gt && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                    Colegiado Médico No. {doctor.exp_colegiado_gt}
                  </p>
                )}
              </div>
            </div>

            <div className="inline-flex items-center gap-2 self-start sm:self-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#dcfce7] text-[#006c4a] dark:bg-emerald-950/60 dark:text-emerald-300 border border-[#006c4a]/15">
              <span className="w-2 h-2 rounded-full bg-[#006c4a] animate-pulse" />
              <span>Consulta Confirmada - Sin Esperas</span>
            </div>
          </div>

          {/* Banner de Solicitud de Intercambio (si aplica) */}
          {solicitudIntercambio && (
            <div className="p-4 rounded-2xl bg-orange-50/90 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/80 flex items-start gap-3 shadow-2xs">
              <div className="p-2 bg-orange-500 text-white rounded-xl shrink-0 mt-0.5">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-orange-950 dark:text-orange-200">
                  Petición de intercambio incluida para las {formatHoraDisplay(solicitudIntercambio.hora)}
                </p>
                <p className="text-orange-800 dark:text-orange-300 mt-0.5 leading-relaxed">
                  Tu cita quedará reservada para las <strong>{formatHoraDisplay(hora)}</strong>. Simultáneamente, enviaremos tu solicitud al paciente del turno de las {formatHoraDisplay(solicitudIntercambio.hora)}. Si acepta, tu consulta se moverá automáticamente.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECCIÓN 1: RESUMEN DE LA CONSULTA (6 TILES EN GRID 2 COLUMNAS)           */}
          {/* ========================================================================= */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-base font-bold text-[#0b1c30] dark:text-white">
                Resumen de la Consulta
              </h3>
              <span className="text-xs font-mono font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
                ID: NC-APP-{new Date().getFullYear()}-{pacienteSeleccionado?.pacCodigo?.slice(0, 4)?.toUpperCase() || '9812'}
              </span>
            </div>

            {isMultiMode ? (
              /* En grupo de citas: Resumen de las citas múltiples */
              <div className="bg-[#eff4ff]/30 dark:bg-slate-800/40 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700">
                  <span className="text-xs font-bold text-[#006194] dark:text-sky-400 uppercase tracking-wider">
                    {citasMultiples.length} Citas del Grupo de Seguimiento
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    {pacienteModoCita === 'mismo' ? 'Mismo paciente' : 'Pacientes por cita'}
                  </span>
                </div>
                <div className="divide-y divide-slate-200/50 dark:divide-slate-800">
                  {citasMultiples.map((c, idx) => {
                    const pacItem = (pacienteModoCita === 'variado' && c.paciente) ? c.paciente : pacienteSeleccionado;
                    return (
                      <div key={c.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-[#006194] text-white font-black flex items-center justify-center text-[10px] shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-[#0b1c30] dark:text-slate-200 capitalize truncate">
                            {format(c.fecha, "EEEE d 'de' MMMM", { locale: es })}
                          </span>
                          <span className="font-bold text-[#006194] dark:text-sky-400 shrink-0 font-mono">
                            · {formatHoraDisplay(c.hora)}
                          </span>
                        </div>
                        <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700">
                          <User className="w-3 h-3 text-slate-400" />
                          {pacItem?.pacTitular ? 'Yo' : (pacItem?.nombreCompleto || 'Paciente')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* En cita individual: 6 tiles idénticos al mockup de referencia */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Tile 1: Paciente Titular */}
                <div className="bg-[#eff4ff]/30 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#eff4ff] dark:bg-blue-950/60 text-[#006194] dark:text-sky-400 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      PACIENTE TITULAR
                    </span>
                    <p className="text-sm font-bold text-[#0b1c30] dark:text-white truncate">
                      {pacienteSeleccionado?.nombreCompleto || 'Josué Pérez'} {pacienteSeleccionado?.pacTitular ? '(Yo - Titular)' : '(Dependiente)'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate font-mono">
                      Expediente Clínico #{pacienteSeleccionado?.pacCodigo?.slice(0, 8)?.toUpperCase() || 'NC-8921'}
                    </p>
                  </div>
                </div>

                {/* Tile 2: Fecha y Hora Programada */}
                <div className="bg-[#eff4ff]/30 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#eff4ff] dark:bg-blue-950/60 text-[#006194] dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      FECHA Y HORA PROGRAMADA
                    </span>
                    <p className="text-sm font-bold text-[#0b1c30] dark:text-white truncate capitalize">
                      {fecha ? format(fecha, "EEEE, d 'de' MMMM yyyy", { locale: es }) : 'Miércoles, 12 de Noviembre 2026'}
                    </p>
                    <p className="text-xs text-[#006194] dark:text-sky-400 font-bold mt-0.5 truncate font-mono">
                      {formatHoraDisplay(hora) || '10:30 AM'} (Horario de Centroamérica)
                    </p>
                  </div>
                </div>

                {/* Tile 3: Modalidad y Sede */}
                <div className="bg-[#eff4ff]/30 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#eff4ff] dark:bg-blue-950/60 text-[#006194] dark:text-sky-400 flex items-center justify-center shrink-0">
                    {modalidad === 'virtual' ? (
                      <Video className="w-5 h-5" />
                    ) : modalidad === 'domicilio' ? (
                      <Home className="w-5 h-5" />
                    ) : (
                      <MapPin className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      MODALIDAD Y SEDE
                    </span>
                    <p className="text-sm font-bold text-[#0b1c30] dark:text-white truncate">
                      {modalidad === 'presencial' ? 'Consulta Presencial' : modalidad === 'virtual' ? 'Videoconsulta Virtual' : 'Consulta a Domicilio'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {clinicaSeleccionada
                        ? `${clinicaSeleccionada.cliDescripcion}${clinicaSeleccionada.cliDireccionCompleta ? ` · ${clinicaSeleccionada.cliDireccionCompleta}` : ''}`
                        : modalidad === 'domicilio'
                        ? (direccionDomicilio || 'Domicilio acordado')
                        : 'Sala de Telemedicina Encriptada'}
                    </p>
                  </div>
                </div>

                {/* Tile 4: Médico Responsable */}
                <div className="bg-[#eff4ff]/30 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#eff4ff] dark:bg-blue-950/60 text-[#006194] dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      MÉDICO RESPONSABLE
                    </span>
                    <p className="text-sm font-bold text-[#0b1c30] dark:text-white truncate">
                      {nombreDoctor}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {docSpecialties}
                    </p>
                  </div>
                </div>

                {/* Tile 5: Servicio Médico Agendado */}
                <div className="bg-[#eff4ff]/30 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#eff4ff] dark:bg-blue-950/60 text-[#006194] dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      SERVICIO MÉDICO AGENDADO
                    </span>
                    <p className="text-sm font-bold text-[#0b1c30] dark:text-white truncate">
                      {servicioSeleccionado?.servicio || (modalidad === 'virtual' ? 'Videoconsulta Médica' : 'Consulta Médica General')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      Duración estimada: 45 minutos
                    </p>
                  </div>
                </div>

                {/* Tile 6: Naturaleza de la Consulta */}
                <div className="bg-[#eff4ff]/30 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#eff4ff] dark:bg-blue-950/60 text-[#006194] dark:text-sky-400 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      NATURALEZA DE LA CONSULTA
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-[#006194] dark:text-sky-400 bg-[#eff4ff] dark:bg-blue-950/60 px-2.5 py-0.5 rounded-md">
                        {tipoConsulta || 'Primera vez'}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        Apertura de ficha clínica
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECCIÓN 2: INFORMACIÓN DE FACTURACIÓN Y PAGO (MOCKUP EXACTO)              */}
          {/* ========================================================================= */}
          <div>
            <h3 className="text-base font-bold text-[#0b1c30] dark:text-white mb-3.5">
              Información de Facturación y Pago
            </h3>

            <div className="bg-[#eff4ff]/30 dark:bg-slate-800/40 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Columna Izquierda: Método de Pago */}
              <div className="flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    MÉTODO DE PAGO SELECCIONADO
                  </span>
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="w-12 h-9 rounded-md bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center text-[10px] font-black shrink-0 tracking-wider">
                      {paymentBadgeText}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-[#0b1c30] dark:text-white truncate">
                        {paymentTitle}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                        {paymentSubtitle}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-[#006c4a] dark:text-emerald-400 font-medium flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{paymentSecurityNote}</span>
                </p>
              </div>

              {/* Columna Derecha: Desglose de Aranceles */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  DESGLOSE DE ARANCELES
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>
                      {isMultiMode ? `Subtotal Consulta (${countCitas} citas)` : 'Subtotal Consulta Médica'}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100 font-mono">
                      Q {subtotalGeneral.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Impuestos y Emisión de FEL</span>
                    <span className="font-semibold text-[#006c4a] dark:text-emerald-400 font-mono">
                      Q {ivaGeneral.toFixed(2)} (Exento / Incluido)
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800 flex items-center justify-between mt-2 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    TOTAL A PAGAR
                  </span>
                  <span className="text-2xl font-black text-[#006194] dark:text-sky-400 font-mono">
                    Q {totalGeneral.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CÓDIGO DE REFERIDO (OPCIONAL)                                             */}
          {/* ========================================================================= */}
          <div className="bg-[#eff4ff]/40 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40 shrink-0">
                <Gift className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  ¿Tienes un código de referido?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Si alguien te invitó a NeoClínica, ingresa su código aquí.
                </p>
              </div>
            </div>

            {codigoReferidoAplicado || (pacienteTitular?.pac_referido_por && !codigoReferidoInput) ? (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">
                    {codigoReferidoAplicado ? (
                      <>Código <span className="font-mono">{codigoReferidoAplicado}</span> aplicado exitosamente</>
                    ) : (
                      'Ya cuentas con un código de referido vinculado a tu cuenta'
                    )}
                  </span>
                </div>
                {codigoReferidoAplicado && (
                  <button
                    type="button"
                    onClick={() => {
                      setCodigoReferidoAplicado(null);
                      setCodigoReferidoInput('');
                      setReferidoError(null);
                    }}
                    className="text-xs font-semibold text-slate-400 hover:text-rose-500 transition-colors ml-2 cursor-pointer"
                  >
                    Cambiar
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={codigoReferidoInput}
                    onChange={(e) => {
                      setCodigoReferidoInput(e.target.value.toUpperCase());
                      setReferidoError(null);
                    }}
                    placeholder="Ej. ALEJ-2F5A"
                    disabled={isApplyingReferido}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono uppercase text-xs font-bold tracking-wider placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAplicarCodigoReferido}
                  disabled={!codigoReferidoInput.trim() || isApplyingReferido}
                  className="px-5 py-2.5 rounded-xl bg-[#006194] hover:bg-[#00517c] active:scale-95 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  {isApplyingReferido ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                  <span>Aplicar Código</span>
                </button>
              </div>
            )}

            {/* LEYENDA OBLIGATORIA */}
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Quien te invitó recibe puntos cuando ingresas su código. ¡Gracias por unirte a NeoClínica!
            </p>

            {referidoError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{referidoError}</span>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* INDICACIONES IMPORTANTES (BANNER AZUL SUAVE)                               */}
          {/* ========================================================================= */}
          <div className="bg-[#eff4ff]/60 dark:bg-blue-950/30 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/40 flex items-start gap-3">
            <Info className="w-5 h-5 text-[#006194] dark:text-sky-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <strong className="text-[#0b1c30] dark:text-white font-bold block mb-0.5">
                Indicaciones importantes para tu consulta:
              </strong>
              <p className="leading-relaxed">
                {modalidad === 'presencial'
                  ? 'Por favor, preséntate 10 minutos antes en la recepción del centro médico para la toma de signos vitales preliminar. Recibirás una copia de tu cita vía WhatsApp y al correo registrado.'
                  : modalidad === 'virtual'
                  ? 'Recibirás un enlace seguro de telemedicina por correo y WhatsApp 15 minutos antes de la hora acordada. Asegúrate de contar con buena conexión a internet.'
                  : 'El especialista se desplazará a la dirección indicada. Por favor mantente atento al teléfono registrado para coordinar el ingreso al inmueble.'}
              </p>
            </div>
          </div>

          {/* Documentos Adjuntos si existen */}
          {archivos.length > 0 && (
            <div className="pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Documentos Clínicos Adjuntos ({archivos.length})
              </span>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {archivos.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50 dark:bg-slate-800/40 text-xs">
                    <FileText className="h-4 w-4 shrink-0 text-[#006194]" />
                    <span className="truncate font-semibold text-slate-700 dark:text-slate-300">{file.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Texto de Términos Informativo */}
          <p className="text-[11px] text-slate-400 text-center max-w-3xl mx-auto pt-2 leading-relaxed">
            Al hacer clic en <strong className="text-slate-600 dark:text-slate-300">Confirmar y Agendar Cita</strong>, aceptas los <span className="underline cursor-pointer">Términos del Servicio</span>, el consentimiento informado de atención médica y las <span className="underline cursor-pointer">políticas de cancelación flexible</span> (cancelación o reprogramación sin penalidad hasta 24 horas antes de la consulta).
          </p>
        </div>

        {/* ========================================================================= */}
        {/* BARRA INFERIOR DE ACCIÓN (ESTILO STEP 1, 2 Y 3)                           */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-[0_4px_28px_rgba(11,28,48,0.06)] border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
              document.documentElement.scrollTop = 0;
              document.body.scrollTop = 0;
              prevStep();
            }}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver a Método de Pago</span>
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto justify-end">
            <div className="text-center sm:text-right">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                TOTAL CONSULTA
              </span>
              <span className="text-2xl sm:text-3xl font-black text-[#0b1c30] dark:text-white font-mono">
                Q {totalGeneral.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 h-12 rounded-xl text-sm font-semibold bg-[#006194] hover:bg-[#007bb9] text-white shadow-[0_4px_16px_rgba(0,97,148,0.22)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Confirmando Cita...</span>
                </>
              ) : (
                <>
                  <span>Confirmar y Agendar Cita</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
