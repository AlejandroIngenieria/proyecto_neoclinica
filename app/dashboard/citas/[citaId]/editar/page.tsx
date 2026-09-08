'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { 
  ArrowLeft, Loader2, CalendarDays, Clock, MapPin, Monitor, CheckCircle2, AlertCircle, 
  Home, Building2, CalendarClock, CreditCard, Upload, FileText, Paperclip, FileCheck, 
  Check, X, ChevronLeft, ChevronRight, Stethoscope, Video, Sparkles, User, ShieldCheck, 
  ArrowRight, Info, FolderPlus, Banknote, Landmark, Wallet, Plus, Activity, BriefcaseMedical,
  ClipboardList, UploadCloud
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { useDropzone } from 'react-dropzone';

import { 
  usePacientesSeleccion, useAllCitasPacientes, useCitaByCodigo, useUpdateCita, useCancelarCita, 
  useModalidades, useClinicas, useAreasDomicilio, useHorarios, useGruposCita, useHorasOcupadas,
  useServiciosMedico, useMetodosPago, useBilletera, useGuardarTarjeta, useGuardarSeguro, usePagarCita
} from '@/hooks/use-flujo-citas';
import { useDoctorByCode } from '@/hooks/use-doctors';
import type { 
  ModalidadCita, UpdateCitaRequest, ClinicaCitaDto, AreaDomicilioDto, HorarioCitaDto, 
  CitaArchivoDto, ServicioMedicoCitaDto, GrupoCitaDto 
} from '@/types/citas';

const MOTIVOS_DEFAULT = [
  { id: 'Chequeo General', title: 'Chequeo General', badge: 'Preventivo', icon: BriefcaseMedical },
  { id: 'Consulta de Seguimiento', title: 'Consulta de Seguimiento', badge: 'Control', icon: CalendarClock },
  { id: 'Enfermedad o Molestia', title: 'Enfermedad o Molestia', badge: 'Diagnóstico', icon: Activity },
  { id: 'Renovación de Receta', title: 'Renovación de Receta', badge: 'Medicamentos', icon: ClipboardList },
];

function safeFormatDate(dateStr: string | undefined, formatStr: string): string {
  if (!dateStr) return 'Fecha sin definir';
  try {
    return format(parseISO(dateStr), formatStr, { locale: es });
  } catch {
    return 'Fecha inválida';
  }
}

function format12Hour(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  let hourNum = parseInt(h);
  if (isNaN(hourNum)) return timeStr;
  const ampm = hourNum >= 12 ? 'PM' : 'AM';
  hourNum = hourNum % 12;
  hourNum = hourNum ? hourNum : 12;
  return `${hourNum}:${m} ${ampm}`;
}

export default function EditWizardPage() {
  const params = useParams();
  const router = useRouter();
  const rawCitaId = params.citaId as string;
  const citaId = useMemo(() => {
    try {
      return decodeURIComponent(rawCitaId || '').trim();
    } catch {
      return (rawCitaId || '').trim();
    }
  }, [rawCitaId]);

  const updateCitaMutation = useUpdateCita();
  const cancelarCitaMutation = useCancelarCita();
  const pagarCitaMutation = usePagarCita();
  const isUpdating = updateCitaMutation.isPending || pagarCitaMutation.isPending;
  const isCanceling = cancelarCitaMutation.isPending;
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // -- 1. Data Fetching --
  const { data: citaDirecta, isLoading: loadingCitaDirecta, isFetching: fetchingCitaDirecta } = useCitaByCodigo(citaId);
  const { data: pacientes, isLoading: loadingPacientes, isFetching: fetchingPacientes } = usePacientesSeleccion();
  const codigosPacientes = useMemo(() => pacientes?.map(p => p.pacCodigo) || [], [pacientes]);
  const { data: citas, isLoading: loadingCitas, isFetching: fetchingCitas } = useAllCitasPacientes(codigosPacientes);

  const citaOriginal = useMemo(() => {
    if (citaDirecta) return citaDirecta;
    if (!citas || !citaId) return undefined;
    const target = citaId.toLowerCase();
    return citas.find(c => String(c.ctaCodigo).trim().toLowerCase() === target);
  }, [citaDirecta, citas, citaId]);

  const codMedico = citaOriginal?.ctaCoddoc || '';
  const codPaciente = citaOriginal?.ctaCodpac || '';
  const pacienteTitular = pacientes?.find(p => p.pacTitular) || pacientes?.find(p => p.pacCodigo === codPaciente);
  const { data: doctor, isLoading: loadingDoctor } = useDoctorByCode(codMedico);

  const { data: modalidadesList = [] } = useModalidades(codMedico || null);
  const { data: serviciosMedico = [] } = useServiciosMedico(codMedico || null);
  const { data: metodosTotales = [], isLoading: loadingMetodos } = useMetodosPago(codMedico || null);
  const { data: billetera = [], isLoading: loadingBilletera } = useBilletera(pacienteTitular?.pacCodigo || null);
  const { mutateAsync: saveSeguro } = useGuardarSeguro();
  const { mutateAsync: saveTarjeta } = useGuardarTarjeta();

  // Wizard Step State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isInitialized, setIsInitialized] = useState(false);

  // Scheduling & Location State
  const [modalidad, setModalidad] = useState<ModalidadCita>('presencial');
  const [clinicaSeleccionada, setClinicaSeleccionada] = useState<ClinicaCitaDto | null>(null);
  const [areaSeleccionada, setAreaSeleccionada] = useState<AreaDomicilioDto | null>(null);
  
  const [fecha, setFecha] = useState<Date | undefined>(undefined);
  const [hora, setHora] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Details State
  const [servicioSeleccionado, setServicioSeleccionado] = useState<ServicioMedicoCitaDto | null>(null);
  const [observacionesAdicionales, setObservacionesAdicionales] = useState<string>('');
  const [motivoGenerico, setMotivoGenerico] = useState<string>('Chequeo General');
  const [direccion, setDireccion] = useState<string>('');
  const [referencias, setReferencias] = useState<string>('');
  const [enlace, setEnlace] = useState<string>('');
  const [grupoId, setGrupoId] = useState<string>('');

  // Payment difference state
  const [tipoPagoId, setTipoPagoId] = useState<number | null>(null);
  const [billeteraItemId, setBilleteraItemId] = useState<string | null>(null);
  const [newCardNum, setNewCardNum] = useState<string>('');
  const [isSavingCard, setIsSavingCard] = useState<boolean>(false);

  // Files
  const [archivosExistentes, setArchivosExistentes] = useState<CitaArchivoDto[]>([]);
  const [nuevosArchivos, setNuevosArchivos] = useState<File[]>([]);

  // Dependencies Fetching
  const { data: clinicasList = [] } = useClinicas(codMedico || null, modalidad);
  const { data: areasList = [] } = useAreasDomicilio(codMedico || null, modalidad);
  const mclCodigo = modalidad === 'presencial' ? clinicaSeleccionada?.mclCodigo || null : 0;
  const { data: horariosClinica = [] } = useHorarios(mclCodigo);
  const { data: gruposList = [] } = useGruposCita(codPaciente || null, codMedico || null);

  // Previously scheduled date & time for highlighting in purple
  const fechaOriginalStr = citaOriginal?.ctaFecha ? citaOriginal.ctaFecha.split('T')[0] : '';
  const fechaOriginalDate = useMemo(() => {
    if (!fechaOriginalStr) return null;
    try {
      return parseISO(fechaOriginalStr);
    } catch {
      return null;
    }
  }, [fechaOriginalStr]);

  const horaOriginalStr = useMemo(() => {
    if (!citaOriginal?.ctaHora) return '';
    return citaOriginal.ctaHora;
  }, [citaOriginal?.ctaHora]);

  // -- Price & Difference Calculation --
  const precioOriginal = useMemo(() => {
    return Number(citaOriginal?.ctaPrecio || 0);
  }, [citaOriginal?.ctaPrecio]);

  const precioNuevo = useMemo(() => {
    if (servicioSeleccionado) {
      return servicioSeleccionado.costoTotal;
    }
    if (modalidad === 'presencial' && clinicaSeleccionada?.mclPrecioBase) {
      return clinicaSeleccionada.mclPrecioBase;
    }
    return precioOriginal;
  }, [servicioSeleccionado, modalidad, clinicaSeleccionada, precioOriginal]);

  const diferenciaAPagar = useMemo(() => {
    const diff = Number((precioNuevo - precioOriginal).toFixed(2));
    return diff > 0.01 ? diff : 0;
  }, [precioNuevo, precioOriginal]);

  const requierePagoDiferencia = diferenciaAPagar > 0.01;

  // Dynamic Steps definition
  const stepsList = useMemo(() => {
    const list = [
      { id: 'horario', num: 1, label: 'Horario y Modalidad', icon: CalendarClock },
      { id: 'detalles', num: 2, label: 'Detalles y Paciente', icon: FileText },
    ];
    if (requierePagoDiferencia) {
      list.push({ id: 'pago', num: 3, label: 'Pago de Diferencia', icon: CreditCard });
      list.push({ id: 'confirmar', num: 4, label: 'Comparar y Confirmar', icon: ShieldCheck });
    } else {
      list.push({ id: 'confirmar', num: 3, label: 'Comparar y Confirmar', icon: ShieldCheck });
    }
    return list;
  }, [requierePagoDiferencia]);

  // Total steps count
  const totalSteps = stepsList.length;

  // -- 2. Initialization from original appointment --
  useEffect(() => {
    if (citaOriginal && !isInitialized) {
      setModalidad(citaOriginal.ctaModalidad);
      if (fechaOriginalDate) {
        setFecha(fechaOriginalDate);
        setCurrentMonth(new Date(fechaOriginalDate.getFullYear(), fechaOriginalDate.getMonth(), 1));
      } else {
        setFecha(new Date());
      }
      setHora(citaOriginal.ctaHora);
      setGrupoId(citaOriginal.ctaGrupoId || '');
      setEnlace(citaOriginal.enlaceVideollamada || '');
      setDireccion(citaOriginal.direccionDomicilio || '');
      setReferencias(citaOriginal.referenciasDomicilio || '');

      // Check if citaOriginal.ctaMotivo matches a known service or if it's general comments
      const rawMotivo = citaOriginal.ctaMotivo?.trim() || '';
      if (rawMotivo) {
        // We will match in another effect once serviciosMedico are loaded
        setMotivoGenerico(rawMotivo);
      }

      const rawDocs = citaOriginal.archivos || citaOriginal.documentos || [];
      const mappedDocs: CitaArchivoDto[] = rawDocs.map((a: any, idx: number) => ({
        arcCodigo: a.arcCodigo || a.id || `doc-${idx}`,
        arcNombre: a.arcNombre || a.nombre || `Archivo_${idx + 1}`,
        arcUrl: a.arcUrl || a.url || '#',
        arcTipoArchivo: a.arcTipoArchivo || a.tipo || 'application/pdf',
      }));
      setArchivosExistentes(mappedDocs);

      setIsInitialized(true);
    }
  }, [citaOriginal, isInitialized, fechaOriginalDate]);

  // Match initial clinic once clinicasList is loaded
  useEffect(() => {
    if (isInitialized && citaOriginal?.ctaModalidad === 'presencial' && clinicasList.length > 0 && !clinicaSeleccionada) {
      const match = clinicasList.find(c => 
        String(c.cliCodigo) === String(citaOriginal.ctaConsultorioId) || 
        String(c.mclCodigo) === String(citaOriginal.ctaConsultorioId)
      ) || clinicasList[0];
      if (match) setClinicaSeleccionada(match);
    }
  }, [isInitialized, citaOriginal, clinicasList, clinicaSeleccionada]);

  // Match initial service once serviciosMedico is loaded
  useEffect(() => {
    if (isInitialized && serviciosMedico.length > 0 && !servicioSeleccionado) {
      const rawMotivo = citaOriginal?.ctaMotivo?.toLowerCase()?.trim();
      if (rawMotivo) {
        // Verificar si rawMotivo coincide con el título o descripción de un tema de seguimiento
        const isFollowUpTopic = gruposList.some(g => 
          g.titulo?.toLowerCase().trim() === rawMotivo ||
          g.descripcion?.toLowerCase().trim() === rawMotivo
        );

        const match = serviciosMedico.find(s => 
          s.servicio?.toLowerCase()?.trim() === rawMotivo ||
          rawMotivo.includes(s.servicio?.toLowerCase()?.trim())
        );

        if (match) {
          setServicioSeleccionado(match);
          if (rawMotivo !== match.servicio?.toLowerCase()?.trim() && !isFollowUpTopic) {
            setObservacionesAdicionales(citaOriginal?.ctaMotivo || '');
          } else {
            setObservacionesAdicionales('');
          }
        } else {
          if (!isFollowUpTopic) {
            setObservacionesAdicionales(citaOriginal?.ctaMotivo || '');
          } else {
            setObservacionesAdicionales('');
          }
        }
      }
    }
  }, [isInitialized, serviciosMedico, servicioSeleccionado, citaOriginal, gruposList]);

  const handleSelectModalidad = (mod: ModalidadCita) => {
    setModalidad(mod);
    if (mod !== 'presencial') {
      setClinicaSeleccionada(null);
    } else {
      if (!clinicaSeleccionada && clinicasList.length > 0) {
        const matchingClinica = clinicasList.find(c => 
          String(c.cliCodigo) === String(citaOriginal?.ctaConsultorioId) || 
          String(c.mclCodigo) === String(citaOriginal?.ctaConsultorioId)
        ) || clinicasList[0];
        setClinicaSeleccionada(matchingClinica);
      }
    }
  };

  // -- 3. Computed Availability --
  const horarios = useMemo(() => {
    if (modalidad === 'presencial') {
      return horariosClinica;
    }
    if (!doctor) return [];
    const combined: HorarioCitaDto[] = [];
    doctor.clinicas?.forEach(c => {
      c.horarios_atencion?.forEach(h => {
        combined.push({
          horDiaSemana: h.hor_dia_semana,
          horHoraInicio: h.hor_hora_inicio,
          horHoraFin: h.hor_hora_fin,
        });
      });
    });
    return combined;
  }, [modalidad, horariosClinica, doctor]);

  const disabledDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!horarios.length) {
      return [
        (date: Date) => {
          if (fechaOriginalDate && format(date, 'yyyy-MM-dd') === format(fechaOriginalDate, 'yyyy-MM-dd')) return false;
          return date < today;
        }
      ];
    }
    const allowedDays = horarios.map(h => h.horDiaSemana);
    return [
      (date: Date) => {
        if (fechaOriginalDate && format(date, 'yyyy-MM-dd') === format(fechaOriginalDate, 'yyyy-MM-dd')) return false;
        if (date < today) return true;
        return !allowedDays.includes(date.getDay());
      }
    ];
  }, [horarios, fechaOriginalDate]);

  const selectedFechaStr = fecha ? format(fecha, 'yyyy-MM-dd') : null;
  const { data: horasOcupadas = [] } = useHorasOcupadas(codMedico || null, selectedFechaStr);

  const isCurrentSelectionOriginalDate = Boolean(
    fecha && fechaOriginalStr && format(fecha, 'yyyy-MM-dd') === fechaOriginalStr
  );

  const availableTimeSlots = useMemo(() => {
    if (!fecha || !horarios.length) return [];
    const dayOfWeek = fecha.getDay();
    const daySchedules = horarios.filter(h => h.horDiaSemana === dayOfWeek);
    
    const slots: string[] = [];
    daySchedules.forEach(schedule => {
      let current = new Date(`2000-01-01T${schedule.horHoraInicio}`);
      const end = new Date(`2000-01-01T${schedule.horHoraFin}`);
      
      while (current < end) {
        slots.push(format(current, 'HH:mm:00'));
        current = new Date(current.getTime() + 30 * 60000); // 30 min slots
      }
    });

    if (isCurrentSelectionOriginalDate && horaOriginalStr) {
      const normalizedOriginal = horaOriginalStr.length === 5 ? `${horaOriginalStr}:00` : horaOriginalStr;
      if (!slots.includes(normalizedOriginal)) {
        slots.push(normalizedOriginal);
      }
    }
    
    const uniqueSlots = Array.from(new Set(slots)).sort();
    const normOriginal = horaOriginalStr.slice(0, 5);

    return uniqueSlots.map(slot => {
      const isOriginalSlot = isCurrentSelectionOriginalDate && slot.slice(0, 5) === normOriginal;
      const slotShort = slot.slice(0, 5);
      const disabled = isOriginalSlot 
        ? false 
        : horasOcupadas.includes(slot) || horasOcupadas.includes(slotShort);

      return {
        time: slot,
        disabled,
        isOriginalSlot,
      };
    });
  }, [fecha, horarios, horasOcupadas, isCurrentSelectionOriginalDate, horaOriginalStr]);

  // -- 4. File Dropzone with Strict Deduplication --
  const onDropFiles = useCallback((acceptedFiles: File[]) => {
    setNuevosArchivos(prev => {
      const existingKeys = new Set([
        ...prev.map(f => `${f.name.toLowerCase()}_${f.size}`),
        ...archivosExistentes.map(a => (a.arcNombre || '').toLowerCase()).filter(Boolean),
      ]);

      const nonDuplicates: File[] = [];
      let duplicatesFound = 0;

      for (const file of acceptedFiles) {
        const fileKey = `${file.name.toLowerCase()}_${file.size}`;
        if (existingKeys.has(fileKey) || existingKeys.has(file.name.toLowerCase())) {
          duplicatesFound++;
        } else {
          existingKeys.add(fileKey);
          nonDuplicates.push(file);
        }
      }

      if (duplicatesFound > 0) {
        toast.info('Se omitieron archivos duplicados o que ya se encontraban adjuntos.');
      }

      return [...prev, ...nonDuplicates];
    });
  }, [archivosExistentes]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropFiles,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 5 * 1024 * 1024,
  });

  const handleRemoveNuevoArchivo = (index: number) => {
    setNuevosArchivos(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveArchivoExistente = (arcCodigo: string) => {
    setArchivosExistentes(prev => prev.filter(a => a.arcCodigo !== arcCodigo));
  };

  // Payment methods filtered for modality
  const metodosPagoDisponibles = useMemo(() => {
    return metodosTotales.filter(m => {
      if (modalidad === 'virtual' && m.descripcion.toLowerCase().includes('efectivo')) {
        return false;
      }
      return true;
    });
  }, [metodosTotales, modalidad]);

  const isObservacionValida = useMemo(() => {
    if (!observacionesAdicionales || !observacionesAdicionales.trim()) return false;
    const clean = observacionesAdicionales.trim().toLowerCase();
    if (servicioSeleccionado && clean === servicioSeleccionado.servicio.toLowerCase().trim()) return false;
    if (gruposList.some(g => (g.titulo || '').toLowerCase().trim() === clean || (g.descripcion || '').toLowerCase().trim() === clean)) return false;
    return true;
  }, [observacionesAdicionales, servicioSeleccionado, gruposList]);

  // -- 5. Validation Handlers --
  const canGoToStep2 = Boolean(
    fecha && hora && (modalidad !== 'presencial' || clinicaSeleccionada) && (modalidad !== 'domicilio' || direccion.trim())
  );

  const canGoToPaymentOrConfirm = Boolean(
    canGoToStep2 && (servicioSeleccionado !== null || motivoGenerico.trim().length > 0)
  );

  const canConfirmCita = useMemo(() => {
    if (!canGoToPaymentOrConfirm) return false;
    if (requierePagoDiferencia) {
      if (!tipoPagoId) return false;
      const metodoSel = metodosPagoDisponibles.find(m => m.tipoPagoId === tipoPagoId);
      const isTarjeta = metodoSel?.descripcion.toLowerCase().includes('tarjeta');
      if (isTarjeta && !billeteraItemId) return false;
    }
    return true;
  }, [canGoToPaymentOrConfirm, requierePagoDiferencia, tipoPagoId, billeteraItemId, metodosPagoDisponibles]);

  // -- 6. Save & Payment Execution --
  const handleSave = async () => {
    if (!canConfirmCita) {
      toast.error('Por favor completa todos los campos requeridos antes de confirmar.');
      return;
    }

    try {
      const idsConservados = archivosExistentes
        .map(a => a.arcCodigo)
        .filter((id): id is string => Boolean(id));

      // Construct final reason: if service is selected, use additional observations if entered, otherwise the service name
      const cleanObs = isObservacionValida ? observacionesAdicionales.trim() : '';
      let finalMotivo = '';
      if (servicioSeleccionado) {
        finalMotivo = cleanObs || servicioSeleccionado.servicio;
      } else {
        finalMotivo = cleanObs || motivoGenerico.trim() || 'Consulta General';
      }

      const payload: UpdateCitaRequest = {
        fecha: fecha ? format(fecha, 'yyyy-MM-dd') : '',
        hora: hora ? (hora.length === 5 ? `${hora}:00` : hora) : '',
        modalidad,
        precio: Number(precioNuevo) || 0,
        motivo: finalMotivo,
        grupoId: grupoId || null,
        codServicio: servicioSeleccionado?.sypCodigo || null,
        consultorioId: modalidad === 'presencial' ? (clinicaSeleccionada?.cliCodigo ?? clinicaSeleccionada?.mclCodigo ?? null) : null,
        direccionDomicilio: modalidad === 'domicilio' ? (direccion.trim() || null) : null,
        referenciasDomicilio: modalidad === 'domicilio' ? (referencias.trim() || null) : null,
        enlaceVideollamada: modalidad === 'virtual' ? (enlace.trim() || null) : null,
        archivos: nuevosArchivos.length > 0 ? nuevosArchivos : undefined,
        archivosConservados: idsConservados,
      };

      // 1. Modificar los datos de la cita
      await updateCitaMutation.mutateAsync({ citaId, payload, medicoNombre: citaOriginal?.medicoNombre });

      // 2. Si hubo diferencia de precio a pagar, registrar el pago de la diferencia
      if (requierePagoDiferencia && tipoPagoId) {
        await pagarCitaMutation.mutateAsync({
          citaId,
          payload: {
            codTpp: Number(tipoPagoId),
            estadoPago: 'pendiente',
            referenciaPago: billeteraItemId || `Diferencia de servicio: Q${diferenciaAPagar.toFixed(2)}`,
          },
        });
      }
      
      toast.success('¡Cita modificada con éxito!', {
        description: requierePagoDiferencia 
          ? `La cita fue actualizada y se procesó el pago de diferencia de Q${diferenciaAPagar.toFixed(2)}.`
          : 'La cita ha sido actualizada y reprogramada correctamente.',
      });

      router.push('/dashboard/citas');

    } catch (e: any) {
      console.error('Error al modificar cita:', e);
      let errorMessage = 'Hubo un problema al actualizar la cita.';
      if (e?.response?.data?.mensaje) {
        errorMessage = e.response.data.mensaje;
      } else if (e?.response?.data?.Detail) {
        errorMessage = e.response.data.Detail;
      } else if (e?.response?.data?.detail) {
        errorMessage = e.response.data.detail;
      } else if (e?.message) {
        errorMessage = e.message;
      }

      toast.error('Error al modificar cita', {
        description: errorMessage,
      });
    }
  };

  const confirmCancelCita = async () => {
    try {
      await cancelarCitaMutation.mutateAsync(citaOriginal || citaId);
      setIsCancelModalOpen(false);
      toast.success('Cita Cancelada', {
        description: 'Tu cita ha sido cancelada correctamente.',
      });
      router.push('/dashboard/citas');
    } catch (err: any) {
      toast.error('Error al cancelar', {
        description: 'Hubo un problema al cancelar la cita.',
      });
    }
  };

  const handleSaveQuickCard = async () => {
    if (!pacienteTitular || !newCardNum.trim()) return;
    setIsSavingCard(true);
    try {
      await saveTarjeta({
        codPac: pacienteTitular.pacCodigo,
        payload: {
          tokenProcesador: 'tok_mod_' + Math.floor(Math.random() * 100000),
          ultimos4: newCardNum.slice(-4) || '4242',
          tipoTarjeta: 'visa',
        },
      });
      setNewCardNum('');
      toast.success('Tarjeta guardada en billetera exitosamente.');
    } catch {
      toast.error('Error al guardar tarjeta.');
    } finally {
      setIsSavingCard(false);
    }
  };

  // Comparison helpers
  const isDateChanged = Boolean(fecha && fechaOriginalStr && format(fecha, 'yyyy-MM-dd') !== fechaOriginalStr);
  const isTimeChanged = Boolean(hora && horaOriginalStr && hora.slice(0, 5) !== horaOriginalStr.slice(0, 5));
  const isModalidadChanged = Boolean(citaOriginal && modalidad !== citaOriginal.ctaModalidad);
  const isPrecioChanged = Boolean(citaOriginal && Math.abs(precioNuevo - (citaOriginal.ctaPrecio || 0)) > 0.01);

  // Loading Screen
  const isStillLoading = loadingCitaDirecta || fetchingCitaDirecta || loadingPacientes || fetchingPacientes || (codigosPacientes.length > 0 && (loadingCitas || fetchingCitas)) || (!!codMedico && loadingDoctor);

  if (isStillLoading && !citaOriginal) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
        <p className="font-bold text-slate-600 dark:text-slate-300 animate-pulse text-base">Cargando expediente de la cita...</p>
      </div>
    );
  }

  if (!citaOriginal) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mb-4 mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Cita no encontrada</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6 max-w-md">No se encontró la cita solicitada o no tienes permisos para editarla.</p>
        <button
          type="button"
          onClick={() => router.push('/dashboard/citas')}
          className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-md hover:bg-blue-700 transition cursor-pointer"
        >
          Volver a Mis Citas
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-200 pb-20 pt-4 sm:pt-6 transition-colors">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">

        {/* ── HEADER WIZARD (Idéntico a agendar cita) ── */}
        <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-[#0B1120]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 py-3.5 px-2 mb-6 transition-colors">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Left: Back button & Doctor info */}
            <div className="flex items-center gap-3 min-w-0">
              <button 
                type="button"
                onClick={() => router.push('/dashboard/citas')}
                className="flex items-center justify-center p-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-full transition cursor-pointer shrink-0"
                title="Volver a citas"
              >
                <ChevronLeft className="h-6 w-6 stroke-[2]" />
              </button>
              
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm bg-slate-100 dark:bg-slate-800 shrink-0">
                  {doctor?.exp_foto_perfil ? (
                    <img 
                      src={doctor.exp_foto_perfil} 
                      alt={citaOriginal.medicoNombre}
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30">
                      {citaOriginal.medicoNombre?.charAt(0) || 'M'}
                    </div>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                      Modificar Cita · Dr(a). {citaOriginal.medicoNombre}
                    </h1>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold truncate">
                      {citaOriginal.medicoEspecialidad || 'Especialista'}
                    </span>
                    <span className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800/60">
                      Reprogramación
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Stepper Navigation */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 bg-white dark:bg-[#1E293B] px-3.5 py-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs shrink-0 self-end sm:self-auto">
              {stepsList.map((s, idx) => {
                const IconComponent = s.icon;
                const isCurrent = currentStep === s.num;
                const isCompleted = currentStep > s.num;
                const canClick = s.num === 1 || (s.num === 2 && canGoToStep2) || (s.num >= 3 && canGoToPaymentOrConfirm);

                return (
                  <div key={s.id} className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => canClick && setCurrentStep(s.num)}
                      disabled={!canClick}
                      className={`flex items-center gap-1.5 py-1 px-1.5 sm:px-2 rounded-xl transition-all duration-200 ${
                        canClick ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-60'
                      } ${
                        isCompleted
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : isCurrent
                          ? 'text-blue-700 dark:text-blue-300 font-extrabold'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                      title={`Paso ${s.num}: ${s.label}`}
                    >
                      <div
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-500 text-white shadow-xs ring-2 ring-emerald-200 dark:ring-emerald-900/60'
                            : isCurrent
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 ring-2 ring-blue-300 dark:ring-blue-700'
                            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                        ) : (
                          <IconComponent className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className={`text-[11px] font-bold tracking-tight hidden sm:inline ${
                        isCurrent ? 'text-slate-900 dark:text-white font-extrabold' : ''
                      }`}>
                        {s.label}
                      </span>
                    </button>

                    {idx < stepsList.length - 1 && (
                      <div
                        className={`w-2 sm:w-3.5 h-0.5 rounded-full transition-colors duration-300 ${
                          isCompleted ? 'bg-emerald-400 dark:bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* ── CONTENIDO POR PASOS ── */}
        <AnimatePresence mode="wait">

          {/* ══════════════════════════════════════════════════════
              PASO 1: HORARIO Y MODALIDAD (Mismo flujo que agendar)
              ══════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Banner Informativo de Reprogramación: Resaltado en Morado */}
              <div className="bg-purple-50/90 dark:bg-purple-950/40 border-2 border-purple-300 dark:border-purple-800/80 rounded-2xl p-4 sm:p-5 text-purple-900 dark:text-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <CalendarClock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-purple-950 dark:text-purple-100">
                      Cita Agendada Actualmente (Resaltada en Morado)
                    </h3>
                    <p className="text-xs sm:text-sm text-purple-800 dark:text-purple-300 mt-0.5">
                      Tu cita previa está programada para el{' '}
                      <strong>{safeFormatDate(citaOriginal.ctaFecha, "EEEE, d 'de' MMMM 'de' yyyy")}</strong> a las{' '}
                      <strong>{format12Hour(citaOriginal.ctaHora)}</strong> ({citaOriginal.ctaModalidad}).
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-200/80 dark:bg-purple-900/60 border border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 font-bold text-xs shrink-0 self-start sm:self-auto">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
                  <span>Horario Actual en Morado</span>
                </div>
              </div>

              {/* 1. SELECCIÓN DE TEMA DE SEGUIMIENTO (Si existe) */}
              {gruposList.length > 0 && (
                <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FolderPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      Tema de Seguimiento Asociado
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setGrupoId('')}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                        !grupoId
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-200'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>Consulta Individual (Sin tema)</span>
                    </button>
                    {gruposList.map((g: GrupoCitaDto) => {
                      const isSelected = grupoId === g.grupoId;
                      return (
                        <button
                          key={g.grupoId}
                          type="button"
                          onClick={() => {
                            setGrupoId(g.grupoId);
                            if (observacionesAdicionales && (
                              observacionesAdicionales.toLowerCase().trim() === (g.titulo || '').toLowerCase().trim() ||
                              observacionesAdicionales.toLowerCase().trim() === (g.descripcion || '').toLowerCase().trim()
                            )) {
                              setObservacionesAdicionales('');
                            }
                          }}
                          className={`p-3 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'border-purple-600 bg-purple-50/80 text-purple-950 dark:bg-purple-950/60 dark:border-purple-500 dark:text-purple-200'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="truncate">{g.titulo || g.descripcion || 'Tema de Seguimiento'}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. SERVICIOS Y TARIFAS DEL ESPECIALISTA */}
              {serviciosMedico.length > 0 && (
                <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Stethoscope className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                        Servicios y Tarifas del Especialista
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Selecciona el servicio médico solicitado. Si cambias a un servicio de mayor valor, podrás pagar la diferencia en el siguiente paso.
                      </p>
                    </div>
                    {servicioSeleccionado && (
                      <button
                        type="button"
                        onClick={() => {
                          setServicioSeleccionado(null);
                        }}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline self-start sm:self-auto cursor-pointer"
                      >
                        Restablecer servicio base
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[240px] overflow-y-auto pr-1">
                    {serviciosMedico.map((s: ServicioMedicoCitaDto) => {
                      const isSelected = servicioSeleccionado?.sypCodigo === s.sypCodigo;
                      const isMoreExpensive = s.costoTotal > precioOriginal;
                      const diffAmount = s.costoTotal - precioOriginal;

                      return (
                        <button
                          key={s.sypCodigo}
                          type="button"
                          onClick={() => {
                            setServicioSeleccionado(s);
                          }}
                          className={`text-left p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-900/30 shadow-xs'
                              : 'border-slate-200 dark:border-slate-700/80 hover:border-blue-300 dark:hover:border-blue-600/50 bg-slate-50/50 dark:bg-[#0F172A]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`font-bold text-xs sm:text-sm leading-tight ${isSelected ? 'text-blue-900 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                              {s.servicio}
                            </h4>
                            <div className={`shrink-0 w-4.5 h-4.5 rounded-full flex items-center justify-center ${isSelected ? 'bg-blue-600 text-white' : 'border border-slate-300 dark:border-slate-600'}`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </div>
                          
                          {s.observaciones && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                              {s.observaciones}
                            </p>
                          )}

                          <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-baseline justify-between">
                            {isMoreExpensive ? (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                +Q{diffAmount.toFixed(2)} diferencia
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Sin costo extra</span>
                            )}
                            <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                              Q{s.costoTotal.toFixed(2)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. MODALITY TABS (Procedimiento idéntico al flujo de agendar) */}
              <div className="border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {(modalidadesList.length > 0 ? modalidadesList : [
                  { modCodigo: 1, modDescripcion: 'Presencial' },
                  { modCodigo: 2, modDescripcion: 'Virtual' },
                  { modCodigo: 3, modDescripcion: 'Domicilio' },
                ]).map((mod: any) => {
                  const desc = (mod.modDescripcion || '').toLowerCase();
                  const normalized: ModalidadCita = desc.includes('domicilio') 
                    ? 'domicilio' 
                    : desc.includes('virtual') ? 'virtual' : 'presencial';
                  const isSelected = modalidad === normalized;

                  return (
                    <button
                      key={mod.modCodigo}
                      type="button"
                      onClick={() => handleSelectModalidad(normalized)}
                      className={`flex items-center gap-2 px-6 py-3 transition-colors mb-[-1px] font-bold text-sm cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-500 rounded-t-xl'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 border-b-2 border-transparent'
                      }`}
                    >
                      {normalized === 'presencial' ? (
                        <Building2 className="w-4 h-4" />
                      ) : normalized === 'virtual' ? (
                        <Video className="w-4 h-4" />
                      ) : (
                        <Home className="w-4 h-4" />
                      )}
                      <span className="capitalize">{mod.modDescripcion || normalized}</span>
                    </button>
                  );
                })}
              </div>

              {/* 4. COLUMNA DE UBICACIÓN + CALENDARIO Y HORARIOS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 flex-grow">
                
                {/* Columna Ubicación (si presencial o domicilio) */}
                {modalidad !== 'virtual' && (
                  <div className="lg:col-span-4 flex flex-col space-y-3">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      {modalidad === 'presencial' ? 'Seleccionar Clínica' : 'Zona de Cobertura'}
                    </h3>

                    {modalidad === 'presencial' && (
                      <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
                        {clinicasList.map((clinica) => {
                          const isSelected = clinicaSeleccionada?.mclCodigo === clinica.mclCodigo;
                          const isOriginalClinic = citaOriginal.ctaConsultorioId && (
                            String(clinica.cliCodigo) === String(citaOriginal.ctaConsultorioId) || 
                            String(clinica.mclCodigo) === String(citaOriginal.ctaConsultorioId)
                          );

                          return (
                            <button
                              key={clinica.mclCodigo}
                              type="button"
                              onClick={() => setClinicaSeleccionada(clinica)}
                              className={`text-left p-4 rounded-xl border-2 transition-all shrink-0 cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50/70 dark:bg-blue-900/30 border-blue-600 dark:border-blue-500 shadow-xs'
                                  : 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className={`font-bold text-sm leading-tight ${isSelected ? 'text-blue-900 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                                  {clinica.cliDescripcion}
                                </h4>
                                {isOriginalClinic && (
                                  <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 px-2 py-0.5 rounded-md shrink-0">
                                    Actual
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                {clinica.cliDireccionCompleta}
                              </p>
                              <div className="mt-2 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                Tarifa base: Q{(clinica.mclPrecioBase || 0).toFixed(2)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {modalidad === 'domicilio' && (
                      <div className="flex flex-col gap-3">
                        <div className="max-h-[200px] overflow-y-auto pr-1 space-y-2">
                          {areasList.map((area) => {
                            const isSelected = areaSeleccionada?.ladCodigo === area.ladCodigo;
                            return (
                              <button
                                key={area.ladCodigo}
                                type="button"
                                onClick={() => setAreaSeleccionada(area)}
                                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-50/70 dark:bg-blue-900/30 border-blue-600 dark:border-blue-500'
                                    : 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{area.municipio}</span>
                                {area.ladZonas && (
                                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 px-2 py-0.5 rounded-full">
                                    Zonas: {area.ladZonas}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <input
                          type="text"
                          value={direccion}
                          onChange={(e) => setDireccion(e.target.value)}
                          placeholder="Dirección exacta para visita a domicilio..."
                          className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Columna Calendario y Horarios Disponibles */}
                <div className={`${modalidad === 'virtual' ? 'lg:col-span-12' : 'lg:col-span-8'} bg-slate-50/60 dark:bg-[#0F172A] rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row gap-6 md:gap-8 border border-slate-200/80 dark:border-slate-800/80`}>
                  
                  {/* Calendario con navegación de mes */}
                  <div className="flex-1 flex flex-col space-y-3 min-w-0">
                    <div className="flex items-center justify-between mb-1 px-1">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                        {format(currentMonth, 'MMMM yyyy', { locale: es })}
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                          className="h-8 w-8 flex items-center justify-center bg-white dark:bg-[#1E293B] shadow-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400 cursor-pointer"
                          title="Mes anterior"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                          className="h-8 w-8 flex items-center justify-center bg-white dark:bg-[#1E293B] shadow-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400 cursor-pointer"
                          title="Siguiente mes"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-center sm:justify-start">
                      <DayPicker
                        mode="single"
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        selected={fecha}
                        onSelect={(d) => {
                          if (!d) return;
                          setFecha(d);
                          if (fechaOriginalDate && format(d, 'yyyy-MM-dd') === format(fechaOriginalDate, 'yyyy-MM-dd')) {
                            setHora(horaOriginalStr);
                          } else {
                            setHora('');
                          }
                        }}
                        locale={es}
                        disabled={disabledDays}
                        modifiers={{
                          fechaOriginal: fechaOriginalDate ? [fechaOriginalDate] : [],
                        }}
                        modifiersClassNames={{
                          fechaOriginal: '!border-2 !border-purple-600 !bg-purple-100 dark:!bg-purple-950/80 !text-purple-900 dark:!text-purple-100 font-black rounded-xl hover:!bg-purple-200 dark:hover:!bg-purple-900 shadow-xs',
                          selected: isCurrentSelectionOriginalDate
                            ? '!bg-purple-600 dark:!bg-purple-600 !text-white !border-2 !border-purple-500 font-black rounded-xl shadow-md ring-2 ring-purple-300 dark:ring-purple-700'
                            : '!bg-blue-600 dark:!bg-blue-500 !text-white hover:!bg-blue-700 font-bold shadow-md rounded-xl',
                          today: 'font-bold text-blue-600 dark:text-blue-400',
                        }}
                        classNames={{
                          day: 'p-0 text-[14px] sm:text-[15px] dark:text-slate-200',
                          day_button: 'h-9 w-9 sm:h-11 sm:w-11 font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all mx-auto flex items-center justify-center cursor-pointer',
                          month_caption: 'hidden',
                          nav: 'hidden',
                          button_previous: 'hidden',
                          button_next: 'hidden',
                          month_grid: 'w-full border-collapse',
                          weekday: 'text-slate-400 dark:text-slate-500 font-medium text-xs sm:text-sm capitalize w-9 h-9 sm:w-11 sm:h-11',
                        }}
                      />
                    </div>

                    {/* Leyenda en Morado para la fecha original */}
                    {fechaOriginalDate && (
                      <div className="mt-3 flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-200 bg-purple-100/80 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 px-3 py-2 rounded-xl shadow-2xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0" />
                        <span>Día en morado: Fecha previamente programada ({format(fechaOriginalDate, "d 'de' MMMM", { locale: es })})</span>
                      </div>
                    )}
                  </div>

                  {/* Horarios Disponibles con el horario actual resaltado en Morado */}
                  <div className="flex-1 flex flex-col space-y-3 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">Horarios Disponibles</h3>
                      {fecha && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium capitalize">
                          {format(fecha, 'EEEE d', { locale: es })}
                        </span>
                      )}
                    </div>

                    {fecha ? (
                      availableTimeSlots.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1 content-start">
                          {availableTimeSlots.map(({ time: slot, disabled, isOriginalSlot }) => {
                            const isSelected = hora === slot || hora.slice(0, 5) === slot.slice(0, 5);
                            const displayTime = format12Hour(slot);

                            if (isOriginalSlot) {
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => setHora(slot)}
                                  className={`py-2.5 px-3 rounded-xl text-left text-xs sm:text-sm font-bold transition-all border-2 flex flex-col justify-between cursor-pointer ${
                                    isSelected
                                      ? 'border-purple-600 bg-purple-600 text-white shadow-md ring-2 ring-purple-300 dark:ring-purple-700'
                                      : 'border-purple-500 bg-purple-50 dark:bg-purple-950/70 text-purple-950 dark:text-purple-200 hover:bg-purple-100'
                                  }`}
                                  title="Horario previamente agendado para esta cita"
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-extrabold">{displayTime}</span>
                                    <span className={`inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                                      isSelected ? 'bg-white/25 text-white' : 'bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200'
                                    }`}>
                                      <Check className="w-2.5 h-2.5 stroke-[3]" /> Actual
                                    </span>
                                  </div>
                                  <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-purple-100' : 'text-purple-700 dark:text-purple-300'}`}>
                                    Horario previo
                                  </span>
                                </button>
                              );
                            }

                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={disabled}
                                onClick={() => !disabled && setHora(slot)}
                                className={`py-3 px-3 rounded-xl text-left text-xs sm:text-sm font-semibold transition-all border cursor-pointer ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-50/90 dark:bg-blue-900/40 text-blue-950 dark:text-white font-bold shadow-xs'
                                    : disabled
                                    ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#0B1120] text-slate-400 cursor-not-allowed opacity-50'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 hover:border-blue-300 hover:bg-blue-50/50'
                                }`}
                              >
                                {displayTime}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-white dark:bg-[#1E293B] rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-xs">
                          <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          No hay turnos disponibles para este día. Elige otra fecha.
                        </div>
                      )
                    ) : (
                      <div className="p-8 text-center bg-white dark:bg-[#1E293B] rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-xs">
                        <CalendarDays className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        Selecciona un día en el calendario para ver los horarios.
                      </div>
                    )}
                  </div>

                </div>

              </div>

              {/* Botón Siguiente Paso */}
              <div className="sticky bottom-0 z-30 bg-slate-50/95 dark:bg-[#0B1120]/95 backdrop-blur-md py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                >
                  Cancelar cita definitivamente
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={!canGoToStep2}
                  className={`font-bold py-3.5 px-8 rounded-2xl transition-all flex items-center gap-2 text-sm shadow-md ${
                    canGoToStep2
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-70'
                  }`}
                >
                  <span>Continuar a Detalles</span> <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════
              PASO 2: DETALLES, SERVICIO / MOTIVO Y DOCUMENTOS
              (Idéntico a Step2PacienteMotivo y Captura 1)
              ══════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-8">
                
                {/* 1. Paciente de la Cita */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Paciente de la Cita
                  </h3>
                  <div className="flex items-center gap-3.5 p-4 bg-slate-50 dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center font-bold text-lg shrink-0">
                      {citaOriginal.pacienteNombre?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                        {citaOriginal.pacienteNombre}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {pacientes?.find(p => p.pacCodigo === codPaciente)?.pacTitular ? 'Titular' : 'Paciente Registrado'} · Cita #{citaId}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. SERVICIO SELECCIONADO (O MOTIVOS SI NO HAY SERVICIO) */}
                {servicioSeleccionado ? (
                  <div className="space-y-4">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight flex items-center gap-2">
                      <Stethoscope className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      Servicio Seleccionado
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4">
                      Has seleccionado el siguiente servicio en el paso anterior:
                    </p>

                    {/* Tarjeta del Servicio Médico (Idéntica a Captura 1) */}
                    <div className="rounded-2xl border-2 border-blue-600/60 dark:border-blue-500/60 bg-blue-50/60 dark:bg-blue-950/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            Servicio médico
                          </span>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                            {servicioSeleccionado.servicio}
                          </h3>
                          {servicioSeleccionado.observaciones && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                              {servicioSeleccionado.observaciones}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-blue-200/60 dark:border-blue-800/40">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                          Costo total con IVA
                        </span>
                        <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                          Q{servicioSeleccionado.costoTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Observaciones o síntomas adicionales (Opcional) */}
                    <div className="mt-4">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Observaciones o síntomas adicionales (Opcional)
                      </label>
                      <textarea
                        rows={3}
                        value={isObservacionValida ? observacionesAdicionales : ''}
                        onChange={(e) => setObservacionesAdicionales(e.target.value)}
                        placeholder="Describe brevemente tus síntomas, dudas o detalles adicionales que el médico deba conocer..."
                        className="w-full bg-white dark:bg-[#1E293B] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 resize-none transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">
                      Motivo de la consulta
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
                      Selecciona la opción que mejor describa tu visita.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      {MOTIVOS_DEFAULT.map((m) => {
                        const isSelected = motivoGenerico === m.id;
                        const Icon = m.icon;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMotivoGenerico(m.id)}
                            className={`relative flex flex-col items-start text-left p-5 rounded-3xl border-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                : 'border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-600/50 bg-slate-50/50 dark:bg-[#1E293B]'
                            }`}
                          >
                            <div className={`shrink-0 p-3 rounded-full mb-4 transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-[#0B1120] text-blue-600 dark:text-blue-400'}`}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <h3 className={`text-sm font-bold mb-1 leading-tight ${isSelected ? 'text-blue-900 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                              {m.title}
                            </h3>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                              {m.badge}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Observaciones o detalles adicionales (Opcional)
                      </label>
                      <textarea
                        rows={3}
                        value={isObservacionValida ? observacionesAdicionales : ''}
                        onChange={(e) => setObservacionesAdicionales(e.target.value)}
                        placeholder="Describe brevemente tus síntomas, dudas o detalles adicionales que el médico deba conocer..."
                        className="w-full bg-white dark:bg-[#1E293B] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 resize-none transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* 3. DIRECCIÓN EXACTA (Solo Domicilio) */}
                {modalidad === 'domicilio' && (
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">
                      Dirección de visita
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4">
                      Proporciona la dirección exacta para que el médico pueda llegar sin problemas.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Dirección Exacta *</label>
                        <input
                          type="text"
                          value={direccion}
                          onChange={(e) => setDireccion(e.target.value)}
                          placeholder="Calle, avenida, número de casa, etc..."
                          className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Referencias *</label>
                        <input
                          type="text"
                          value={referencias}
                          onChange={(e) => setReferencias(e.target.value)}
                          placeholder="Frente al parque, portón blanco..."
                          className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. ARCHIVOS Y EXÁMENES MÉDICOS (Con Dropzone deduplicado) */}
                <div className="pt-6 border-t border-slate-200/80 dark:border-slate-700/80 space-y-4">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Paperclip className="w-4.5 h-4.5 text-blue-600" />
                      Documentos y Exámenes Clínicos (Opcional)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Adjunta fotos de recetas, órdenes o resultados clínicos. (Máx 5MB por archivo).
                    </p>
                  </div>

                  {/* Dropzone */}
                  <div
                    {...getRootProps()}
                    className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-colors cursor-pointer text-center ${
                      isDragActive 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40' 
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0F172A] hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <UploadCloud className={`h-8 w-8 mb-2 ${isDragActive ? 'text-blue-600' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {isDragActive ? 'Suelta los archivos aquí...' : 'Haz clic o arrastra archivos aquí'}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">PDF, PNG o JPG (hasta 5MB)</span>
                  </div>

                  {/* Lista de nuevos archivos */}
                  {nuevosArchivos.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        Nuevos archivos para adjuntar ({nuevosArchivos.length}):
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {nuevosArchivos.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 text-xs rounded-xl font-medium border border-blue-200 dark:border-blue-900">
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                              <span className="truncate">{file.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveNuevoArchivo(idx)}
                              className="p-1 hover:bg-blue-200 dark:hover:bg-blue-900/60 rounded-full text-rose-500 transition shrink-0 cursor-pointer"
                              title="Quitar archivo"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lista de archivos ya existentes en la cita */}
                  {archivosExistentes.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Archivos ya guardados en esta cita ({archivosExistentes.length}):
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {archivosExistentes.map((archivo) => (
                          <div key={archivo.arcCodigo} className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs rounded-xl font-medium border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 truncate">
                              <FileCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                              <a href={archivo.arcUrl} target="_blank" rel="noopener noreferrer" className="truncate hover:underline text-blue-600 dark:text-blue-400">
                                {archivo.arcNombre}
                              </a>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveArchivoExistente(archivo.arcCodigo!)}
                              className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-full text-rose-500 transition shrink-0 cursor-pointer"
                              title="Eliminar de la cita"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Botones de Navegación */}
              <div className="sticky bottom-0 z-30 bg-slate-50/95 dark:bg-[#0B1120]/95 backdrop-blur-md py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-5 py-3 rounded-2xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Volver al Horario
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  disabled={!canGoToPaymentOrConfirm}
                  className={`font-bold py-3.5 px-8 rounded-2xl transition-all flex items-center gap-2 text-sm shadow-md ${
                    canGoToPaymentOrConfirm
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-70'
                  }`}
                >
                  <span>
                    {requierePagoDiferencia ? 'Continuar a Pago de Diferencia' : 'Revisar Comparación'}
                  </span> 
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════
              PASO 3 CONDICIONAL: PAGO DE DIFERENCIA (Solo si precioNuevo > precioOriginal)
              ══════════════════════════════════════════════════════ */}
          {currentStep === 3 && requierePagoDiferencia && (
            <motion.div
              key="stepPago"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
                
                {/* Banner de Diferencia Financiera */}
                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-amber-950 dark:text-amber-100">
                        Ajuste de Tarifa por Cambio de Servicio
                      </h3>
                      <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 mt-0.5">
                        El nuevo servicio ({servicioSeleccionado?.servicio}) tiene un costo superior al servicio previamente contratado.
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <span>Costo anterior: Q{precioOriginal.toFixed(2)}</span>
                        <span>•</span>
                        <span>Nuevo costo: Q{precioNuevo.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0 bg-white dark:bg-[#0F172A] p-3.5 rounded-xl border border-amber-200 dark:border-amber-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Diferencia a Cobrar
                    </span>
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                      Q{diferenciaAPagar.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Selección de Método de Pago */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                    ¿Cómo deseas pagar la diferencia?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                    Selecciona el método con el que deseas abonar la diferencia de Q{diferenciaAPagar.toFixed(2)}.
                  </p>

                  <div className="space-y-3">
                    {metodosPagoDisponibles.map((metodo) => {
                      const isSelected = tipoPagoId === metodo.tipoPagoId;
                      const isTarjeta = metodo.descripcion.toLowerCase().includes('tarjeta');
                      const isSeguro = metodo.descripcion.toLowerCase().includes('seguro');
                      const isEfectivo = metodo.descripcion.toLowerCase().includes('efectivo');
                      const isTransferencia = metodo.descripcion.toLowerCase().includes('transferencia');

                      const tarjetasBilletera = billetera.filter(b => b.tipo === 'TARJETA');

                      return (
                        <div
                          key={metodo.tipoPagoId}
                          className={`rounded-2xl border-2 transition-all overflow-hidden ${
                            isSelected
                              ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-900/20 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] hover:border-blue-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setTipoPagoId(metodo.tipoPagoId);
                              if (isTarjeta && tarjetasBilletera.length > 0 && !billeteraItemId) {
                                setBilleteraItemId(tarjetasBilletera[0].id_metodo);
                              }
                            }}
                            className="w-full flex items-center p-4 text-left cursor-pointer"
                          >
                            <div className={`p-2.5 rounded-xl transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                              {isTarjeta ? (
                                <CreditCard className="w-5 h-5" />
                              ) : isEfectivo ? (
                                <Banknote className="w-5 h-5" />
                              ) : isTransferencia ? (
                                <Landmark className="w-5 h-5" />
                              ) : (
                                <Wallet className="w-5 h-5" />
                              )}
                            </div>
                            <div className="flex-1 ml-3.5">
                              <h4 className={`text-sm font-bold ${isSelected ? 'text-blue-950 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                                {metodo.descripcion}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {metodo.observaciones || (isTarjeta ? 'Paga seguro y al instante' : 'Pago al momento de la cita')}
                              </p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}>
                              {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                            </div>
                          </button>

                          {/* Opciones de Tarjeta / Billetera */}
                          {isSelected && isTarjeta && (
                            <div className="px-5 pb-5 pt-2 border-t border-blue-100 dark:border-blue-900/40 space-y-3">
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Selecciona una tarjeta guardada:
                              </p>
                              {tarjetasBilletera.length > 0 ? (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {tarjetasBilletera.map((card) => {
                                    const isCardSelected = billeteraItemId === card.id_metodo;
                                    return (
                                      <button
                                        key={card.id_metodo}
                                        type="button"
                                        onClick={() => setBilleteraItemId(card.id_metodo)}
                                        className={`p-3 rounded-xl border-2 text-left text-xs font-bold flex items-center justify-between cursor-pointer transition ${
                                          isCardSelected
                                            ? 'border-blue-600 bg-white dark:bg-[#1E293B] shadow-xs'
                                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120]'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <CreditCard className="w-4 h-4 text-blue-600" />
                                          <span>{card.descripcion || card.proveedor || 'Tarjeta'}</span>
                                        </div>
                                        {isCardSelected && <Check className="w-4 h-4 text-blue-600" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 italic">No tienes tarjetas registradas en tu billetera.</p>
                              )}

                              {/* Agregar tarjeta rápida */}
                              <div className="pt-2 flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Número de tarjeta (ej. 4242...)"
                                  value={newCardNum}
                                  onChange={(e) => setNewCardNum(e.target.value)}
                                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={handleSaveQuickCard}
                                  disabled={isSavingCard || !newCardNum.trim()}
                                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                                >
                                  {isSavingCard ? 'Guardando...' : 'Guardar'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Botones de Navegación */}
              <div className="sticky bottom-0 z-30 bg-slate-50/95 dark:bg-[#0B1120]/95 backdrop-blur-md py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-3 rounded-2xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Volver a Detalles
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  disabled={!canConfirmCita}
                  className={`font-bold py-3.5 px-8 rounded-2xl transition-all flex items-center gap-2 text-sm shadow-md ${
                    canConfirmCita
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-70'
                  }`}
                >
                  <span>Revisar Comparación</span> <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════
              PASO FINAL: COMPARAR Y CONFIRMAR CITA
              (Paso 4 si hubo diferencia de pago, o Paso 3 si no)
              ══════════════════════════════════════════════════════ */}
          {((currentStep === 4 && requierePagoDiferencia) || (currentStep === 3 && !requierePagoDiferencia)) && (
            <motion.div
              key="stepFinal"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Encabezado */}
              <div className="text-center max-w-2xl mx-auto space-y-2 pt-2">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Comparación de Cita Médica
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Compara los datos de tu cita agendada original frente a los nuevos cambios antes de confirmar.
                </p>
              </div>

              {/* Grid Frente a Frente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* ── TARJETA 1: CITA ORIGINAL PROGRAMADA (EN MORADO) ── */}
                <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 sm:p-7 border-2 border-purple-300 dark:border-purple-800/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-purple-100 dark:border-purple-900/50 mb-5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        <span className="w-2 h-2 rounded-full bg-purple-600" />
                        Cita Agendada Anteriormente
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">Original</span>
                    </div>

                    <div className="space-y-4">
                      {/* Fecha y Hora Original */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                          <CalendarDays className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fecha y Hora Programada</p>
                          <p className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white capitalize">
                            {safeFormatDate(citaOriginal.ctaFecha, "EEEE, d 'de' MMMM 'de' yyyy")}
                          </p>
                          <p className="text-xs font-black text-purple-700 dark:text-purple-400">
                            {format12Hour(citaOriginal.ctaHora)}
                          </p>
                        </div>
                      </div>

                      {/* Modalidad y Lugar Original */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                          {citaOriginal.ctaModalidad === 'virtual' ? (
                            <Video className="w-5 h-5" />
                          ) : citaOriginal.ctaModalidad === 'domicilio' ? (
                            <Home className="w-5 h-5" />
                          ) : (
                            <Building2 className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Modalidad y Lugar</p>
                          <p className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                            {citaOriginal.ctaModalidad}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {citaOriginal.clinicaNombre || citaOriginal.direccionDomicilio || 'Consultorio del especialista'}
                          </p>
                        </div>
                      </div>

                      {/* Especialista */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Especialista</p>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">
                            Dr(a). {citaOriginal.medicoNombre}
                          </p>
                          <p className="text-xs text-slate-500">{citaOriginal.medicoEspecialidad}</p>
                        </div>
                      </div>

                      {/* Motivo Original */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Motivo / Servicio Original</p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 italic mt-0.5">
                          "{citaOriginal.ctaMotivo || 'Sin motivo especificado'}"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Costo Original */}
                  <div className="mt-6 pt-4 border-t border-purple-100 dark:border-purple-900/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500">Costo original:</span>
                    <span className="font-black text-slate-900 dark:text-white text-base">
                      Q{precioOriginal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* ── TARJETA 2: NUEVA CITA SELECCIONADA (EN AZUL) ── */}
                <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 sm:p-7 border-2 border-blue-600 dark:border-blue-500 shadow-md relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-blue-100 dark:border-blue-900/50 mb-5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        Nueva Cita Seleccionada
                      </span>
                      <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400">Por Confirmar</span>
                    </div>

                    <div className="space-y-4">
                      {/* Nueva Fecha y Hora */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                          <CalendarDays className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nueva Fecha y Hora</p>
                            {isDateChanged || isTimeChanged ? (
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                                Reprogramada
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                Mismo horario
                              </span>
                            )}
                          </div>
                          <p className="font-extrabold text-sm sm:text-base text-blue-900 dark:text-blue-100 capitalize">
                            {fecha ? format(fecha, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) : ''}
                          </p>
                          <p className="text-xs font-black text-blue-600 dark:text-blue-400">
                            {format12Hour(hora)}
                          </p>
                        </div>
                      </div>

                      {/* Nueva Modalidad y Lugar */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                          {modalidad === 'virtual' ? (
                            <Video className="w-5 h-5" />
                          ) : modalidad === 'domicilio' ? (
                            <Home className="w-5 h-5" />
                          ) : (
                            <Building2 className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nueva Modalidad y Lugar</p>
                            {isModalidadChanged && (
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                                Modalidad cambiada
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                            {modalidad}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            {modalidad === 'presencial' 
                              ? (clinicaSeleccionada?.cliDescripcion || clinicaSeleccionada?.cliDireccionCompleta || 'Consultorio médico')
                              : modalidad === 'domicilio'
                              ? (direccion || 'Dirección a domicilio')
                              : 'Teleconsulta en línea (Enlace proporcionado por clínica)'
                            }
                          </p>
                        </div>
                      </div>

                      {/* Servicio Solicitado */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Stethoscope className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Servicio Solicitado</p>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">
                            {servicioSeleccionado?.servicio || motivoGenerico}
                          </p>
                          <p className="text-xs text-slate-500">Dr(a). {citaOriginal.medicoNombre}</p>
                        </div>
                      </div>

                      {/* Observaciones */}
                      {observacionesAdicionales && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Observaciones Registradas</p>
                          <p className="text-xs text-slate-800 dark:text-slate-200 mt-0.5">
                            "{observacionesAdicionales}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Desglose de Precios y Diferencia */}
                  <div className="mt-6 pt-4 border-t border-blue-100 dark:border-blue-900/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-500">Nuevo costo total:</span>
                      <span className="font-black text-slate-900 dark:text-white text-base">
                        Q{precioNuevo.toFixed(2)}
                      </span>
                    </div>

                    {requierePagoDiferencia ? (
                      <div className="flex items-center justify-between text-xs bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
                        <span className="font-bold text-amber-900 dark:text-amber-200">
                          Diferencia a abonar:
                        </span>
                        <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                          +Q{diferenciaAPagar.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <span className="font-bold text-emerald-800 dark:text-emerald-300">
                          Ajuste de precio:
                        </span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          Sin cobro adicional
                        </span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Aviso Final */}
              <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 p-4 rounded-2xl flex items-start gap-3 text-blue-950 dark:text-blue-200 text-xs sm:text-sm">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Confirmación de Reprogramación:</strong> Al hacer clic en el botón inferior, tu cita anterior se actualizará automáticamente y se enviará la confirmación al especialista.
                </p>
              </div>

              {/* Botones de Acción */}
              <div className="sticky bottom-0 z-30 bg-slate-50/95 dark:bg-[#0B1120]/95 backdrop-blur-md py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(requierePagoDiferencia ? 3 : 2)}
                  className="px-5 py-3 rounded-2xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Volver al paso anterior
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 px-8 rounded-2xl transition-all flex items-center gap-2 text-sm shadow-md shadow-blue-600/30 cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Actualizando Cita...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>
                        {requierePagoDiferencia 
                          ? `Pagar Diferencia (Q${diferenciaAPagar.toFixed(2)}) y Modificar Cita`
                          : 'Confirmar y Modificar Cita'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* Modal de Cancelación */}
      <ConfirmModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={confirmCancelCita}
        variant="danger"
        title="¿Cancelar Cita Definitivamente?"
        description={
          <>
            Estás a punto de cancelar tu cita programada con <strong>Dr(a). {citaOriginal?.medicoNombre}</strong>.
            <br />
            <br />
            Esta acción liberará el turno y no se puede revertir.
          </>
        }
        confirmText="Sí, Cancelar Cita"
        cancelText="Mantener Cita"
        isLoading={isCanceling}
      />
    </div>
  );
}
