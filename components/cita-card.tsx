'use client';

import Image from 'next/image';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { BadgeCheck, CalendarDays, Calendar, Clock, MapPin, Video, Home, Edit2, XCircle, Loader2, MoreVertical, FileText, Navigation, Paperclip, ExternalLink, X, Star, ChevronDown, ChevronRight, CalendarPlus, FolderPlus, FolderMinus, ClipboardList, Stethoscope, Pill, FlaskConical, Activity, Info, Lock, Play, CheckCircle2, UserCheck, CreditCard, Upload, AlertCircle, ArrowLeftRight, Building2, Printer, Copy, Check, User, QrCode } from 'lucide-react';
import type { CitaListDto, SolicitudCambioDto } from '@/types/citas';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { usePagarCita, isCitaPasada, useMarcarLlegadaClinica } from '@/hooks/use-flujo-citas';
import { useDropzone } from 'react-dropzone';
import { useState, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

type CitaCardProps = {
  cita: CitaListDto;
  onModify: (cita: CitaListDto) => void;
  onCancel: (cita: CitaListDto) => void;
  onLinkGroup?: (cita: CitaListDto) => void;
  onUnlinkGroup?: (cita: CitaListDto) => void;
  isPast?: boolean;
  bottomActions?: React.ReactNode;
  size?: 'normal' | 'small';
  layout?: 'card' | 'row' | 'series-child';
  solicitudCambio?: SolicitudCambioDto;
  onResponderSolicitud?: (solicitud: SolicitudCambioDto) => void;
  onCancelarSolicitud?: (solicitud: SolicitudCambioDto) => void;
};

export function CitaCard({
  cita,
  onModify,
  onCancel,
  onLinkGroup,
  onUnlinkGroup,
  isPast = false,
  bottomActions,
  size = 'normal',
  layout = 'card',
  solicitudCambio,
  onResponderSolicitud,
  onCancelarSolicitud,
}: CitaCardProps) {
  const router = useRouter();
  const { data: doctor, isLoading } = useDoctorByCode(cita.ctaCoddoc);
  const pagarCitaMutation = usePagarCita();
  const marcarLlegadaMutation = useMarcarLlegadaClinica();
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [mostrarModalArchivos, setMostrarModalArchivos] = useState(false);
  const [mostrarModalInfo, setMostrarModalInfo] = useState(false);
  const [mostrarModalResena, setMostrarModalResena] = useState(false);
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [archivoPago, setArchivoPago] = useState<File | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [idCopiado, setIdCopiado] = useState(false);
  const navButtonRef = useRef<HTMLButtonElement | null>(null);
  const navMenuRef = useRef<HTMLDivElement | null>(null);

  const handleCopiarId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cita.ctaCodigo) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(cita.ctaCodigo);
      setIdCopiado(true);
      toast.success('ID de la cita copiado al portapapeles');
      setTimeout(() => setIdCopiado(false), 2000);
    }
  };

  const listaArchivos = useMemo(() => {
    const raw = cita.archivos || cita.documentos || [];
    return raw.map((a: any, idx: number) => ({
      arcCodigo: a.arcCodigo || a.id || `file-${idx}`,
      arcNombre: a.arcNombre || a.nombre || `Archivo ${idx + 1}`,
      arcUrl: a.arcUrl || a.url || '#',
      arcTipoArchivo: a.arcTipoArchivo || a.tipoArchivo || a.tipo || (String(a.arcUrl || a.url || '').match(/\.(png|jpg|jpeg|webp)$/i) ? 'image/png' : 'application/pdf'),
    }));
  }, [cita.archivos, cita.documentos]);

  const tieneArchivos = listaArchivos.length > 0;

  const handleNuevaCita = () => {
    const doctorId = cita.ctaCoddoc || doctor?.exp_codigo;
    if (doctorId) {
      const params = new URLSearchParams();
      if (cita.ctaCodpac) {
        params.set('pacCodigo', cita.ctaCodpac);
        params.set('pacienteId', cita.ctaCodpac);
      }
      if (cita.ctaGrupoId) {
        params.set('grupoId', cita.ctaGrupoId);
      }
      if (cita.grupoTema) {
        params.set('tema', cita.grupoTema);
      }
      if (cita.ctaModalidad) {
        params.set('modalidad', cita.ctaModalidad);
      }
      const qs = params.toString();
      router.push(`/dashboard/agendar/${doctorId}${qs ? `?${qs}` : ''}`);
    } else {
      router.push('/dashboard/directorio');
    }
  };

  const handleToggleNavMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isNavMenuOpen) {
      setIsNavMenuOpen(false);
    } else {
      if (navButtonRef.current) {
        const rect = navButtonRef.current.getBoundingClientRect();
        setMenuPos({
          top: rect.bottom + window.scrollY + 6,
          left: Math.max(10, rect.left + window.scrollX - 20),
        });
      }
      setIsNavMenuOpen(true);
    }
  };

  useEffect(() => {
    if (!isNavMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        navButtonRef.current && !navButtonRef.current.contains(event.target as Node) &&
        navMenuRef.current && !navMenuRef.current.contains(event.target as Node)
      ) {
        setIsNavMenuOpen(false);
      }
    };
    const handleScroll = () => setIsNavMenuOpen(false);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isNavMenuOpen]);

  const getModalityIcon = (tipo: string) => {
    switch (tipo) {
      case 'presencial': return <MapPin className="h-4 w-4" />;
      case 'virtual': return <Video className="h-4 w-4" />;
      case 'domicilio': return <Home className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const normalizeEstadoStr = (estado: string | undefined | null) => {
    if (!estado) return '';
    return estado
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\s\-]+/g, '_');
  };

  const getStatusDotColor = (estado: string) => {
    const clean = normalizeEstadoStr(estado);
    switch (clean) {
      case 'programada': return 'bg-sky-500';
      case 'confirmada': return 'bg-emerald-500';
      case 'pospuesta': return 'bg-amber-500';
      case 'en_proceso': return 'bg-blue-600 animate-pulse';
      case 'completada':
      case 'finalizada':
      case 'realizada': return 'bg-slate-400';
      case 'cancelada':
      case 'rechazada':
      case 'no_asistio':
      case 'noasistio': return 'bg-rose-500';
      default: return 'bg-slate-400';
    }
  };

  const getStatusTextColor = (estado: string) => {
    const clean = normalizeEstadoStr(estado);
    switch (clean) {
      case 'programada': return 'text-sky-600 dark:text-sky-400';
      case 'confirmada': return 'text-emerald-600 dark:text-emerald-400';
      case 'pospuesta': return 'text-amber-600 dark:text-amber-400';
      case 'en_proceso': return 'text-blue-600 dark:text-blue-400 font-black';
      case 'completada':
      case 'finalizada':
      case 'realizada': return 'text-slate-600 dark:text-slate-400';
      case 'cancelada':
      case 'rechazada':
      case 'no_asistio':
      case 'noasistio': return 'text-rose-600 dark:text-rose-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getEstadoColor = (estado: string) => {
    const clean = normalizeEstadoStr(estado);
    switch (clean) {
      case 'programada': return 'bg-sky-100 text-sky-700';
      case 'confirmada': return 'bg-emerald-100 text-emerald-700';
      case 'pospuesta': return 'bg-amber-100 text-amber-700';
      case 'en_proceso': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700';
      case 'completada':
      case 'finalizada':
      case 'realizada': return 'bg-slate-100 text-slate-700';
      case 'cancelada':
      case 'rechazada':
      case 'no_asistio':
      case 'noasistio': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const formatCitaEstado = (estado: string | undefined | null) => {
    if (!estado) return '';
    const clean = normalizeEstadoStr(estado);
    if (clean === 'no_asistio' || clean === 'noasistio') return 'No asistió';
    if (clean === 'en_proceso') return 'En proceso';
    return clean.charAt(0).toUpperCase() + clean.slice(1).replace(/_/g, ' ');
  };

  const dateObj = parseISO(cita.ctaFecha);

  const initials = cita.medicoNombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('') || 'MD';

  const estadoLower = normalizeEstadoStr(cita.ctaEstado);
  const isPospuesta = estadoLower === 'pospuesta';
  const isIndependizado = (cita.pacienteEstado || '').toLowerCase() === 'independizado';
  const isPastCita = isPast || isCitaPasada(cita.ctaFecha, cita.ctaHora);

  // Estados normalizados
  const isCompletedState = ['completada', 'finalizada', 'realizada'].includes(estadoLower);
  const isNoAsistio = ['no_asistio', 'noasistio'].includes(estadoLower);
  const isCancelada = ['cancelada', 'rechazada'].includes(estadoLower);
  const isEnProceso = estadoLower === 'en_proceso' || estadoLower === 'en_consulta';
  // Citas vigentes y pendientes (activas)
  const isActiva = ['programada', 'confirmada', 'pospuesta'].includes(estadoLower) && !isPastCita;

  // Bloqueo estricto: Bloquear botón de "Modificar" y "Cancelar" cuando la cita ya esté en proceso o finalizada
  const isBloqueadaParaCambios = isEnProceso || isCompletedState || isCancelada || isNoAsistio || isPastCita;
  const canModify = !isIndependizado && isActiva && !isBloqueadaParaCambios;
  const canCancel = canModify;

  // Verificación estricta: ÚNICAMENTE el día de la cita (no antes, ni después)
  const isTodayCita = useMemo(() => {
    if (!cita?.ctaFecha) return false;
    try {
      const citaDatePart = cita.ctaFecha.includes('T') ? cita.ctaFecha.split('T')[0] : cita.ctaFecha;
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      return citaDatePart === todayStr;
    } catch {
      return false;
    }
  }, [cita?.ctaFecha]);

  const isPresencial = (cita.ctaModalidad || '').toLowerCase() === 'presencial';
  const ctaEnClinica = Boolean(cita.ctaEnClinica);
  const canMarcarLlegada = isTodayCita && isPresencial && isActiva;
  const fechaQuery = cita.ctaFecha ? cita.ctaFecha.split('T')[0] : '';
  const colaUrl = `/dashboard/citas/sala-espera?citaId=${cita.ctaCodigo}&doc=${cita.ctaCoddoc}&fecha=${fechaQuery}`;
  const puedeVerCola = !isPastCita && (isEnProceso || (isActiva && isTodayCita));

  // "Cómo llegar": EXCLUSIVO para presencial Y cita activa no vencida (NUNCA domicilio, virtual, no_asistio, cancelada, completada)
  const canShowComoLlegar = isPresencial && isActiva;

  const citaCodigoDisplay = useMemo(() => {
    if (!cita.ctaCodigo) return '';
    const str = String(cita.ctaCodigo).trim();
    return str.length > 12 ? `${str.slice(0, 8).toUpperCase()}...` : str.toUpperCase();
  }, [cita.ctaCodigo]);

  const fechaLargaCap = useMemo(() => {
    try {
      const fStr = format(dateObj, "EEEE, d 'de' MMMM", { locale: es });
      return fStr.charAt(0).toUpperCase() + fStr.slice(1);
    } catch {
      return format(dateObj, "EEE d MMM", { locale: es });
    }
  }, [dateObj]);

  const mesAbrev = useMemo(() => {
    try {
      return format(dateObj, 'MMM', { locale: es }).replace('.', '').toUpperCase();
    } catch {
      return 'CITA';
    }
  }, [dateObj]);

  const diaNum = useMemo(() => {
    try {
      return format(dateObj, 'd');
    } catch {
      return '';
    }
  }, [dateObj]);

  const turnoTexto = useMemo(() => {
    if (!cita.ctaHora) return 'Turno Clínico';
    const horaNum = parseInt(cita.ctaHora.slice(0, 2), 10);
    if (isNaN(horaNum)) return 'Turno Clínico';
    if (horaNum < 12) return 'Turno Matutino';
    if (horaNum < 18) return 'Turno Vespertino';
    return 'Turno Nocturno';
  }, [cita.ctaHora]);

  const horarioString = useMemo(() => {
    if (!cita.ctaHora) return '';
    return `${cita.ctaHora.slice(0, 5)} hrs`;
  }, [cita.ctaHora]);

  const clinicaNombreReal = useMemo(() => {
    return cita.clinicaNombre?.trim() || doctor?.clinicas?.[0]?.cli_descripcion?.trim() || null;
  }, [cita.clinicaNombre, doctor?.clinicas]);

  const ubicacionTexto = useMemo(() => {
    if (cita.ctaModalidad === 'domicilio') {
      return cita.direccionDomicilio?.trim()
        ? `Dirección: ${cita.direccionDomicilio}`
        : 'Visita médica a domicilio';
    }
    if (cita.ctaModalidad === 'presencial') {
      return clinicaNombreReal
        ? `Sede: ${clinicaNombreReal}`
        : 'Consulta en clínica';
    }
    return cita.enlaceVideollamada?.trim()
      ? 'Videollamada disponible'
      : 'Consulta virtual en línea';
  }, [cita.ctaModalidad, cita.direccionDomicilio, clinicaNombreReal, cita.enlaceVideollamada]);

  const ubicacionCompletaTexto = useMemo(() => {
    if (cita.ctaModalidad === 'domicilio') {
      const parts = [
        cita.direccionDomicilio?.trim(),
        cita.referenciasDomicilio?.trim() ? `(${cita.referenciasDomicilio.trim()})` : null,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(' ') : 'Visita médica a domicilio';
    }
    if (cita.ctaModalidad === 'virtual') {
      return cita.enlaceVideollamada?.trim()
        ? `Videollamada: ${cita.enlaceVideollamada.trim()}`
        : 'Consulta virtual en línea';
    }
    const clinica = clinicaNombreReal;
    const dir = doctor?.clinicas?.[0]?.cli_direccion_completa?.trim();
    if (clinica && dir && !dir.toLowerCase().includes(clinica.toLowerCase())) {
      return `${clinica} • ${dir}`;
    }
    return dir || clinica || 'Consulta en clínica presencial';
  }, [cita.ctaModalidad, cita.direccionDomicilio, cita.referenciasDomicilio, cita.enlaceVideollamada, clinicaNombreReal, doctor?.clinicas]);

  const direccionDetallada = useMemo(() => {
    if (cita.ctaModalidad === 'domicilio') {
      const parts = [
        cita.direccionDomicilio?.trim(),
        cita.referenciasDomicilio?.trim() ? `(${cita.referenciasDomicilio.trim()})` : null,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(' ') : 'Visita médica a domicilio';
    }
    if (cita.ctaModalidad === 'virtual') {
      return cita.enlaceVideollamada?.trim()
        ? 'Consulta médica digital en línea'
        : 'Enlace en sala de espera';
    }
    const dir = doctor?.clinicas?.[0]?.cli_direccion_completa?.trim();
    if (dir) return dir;
    return 'Consulta presencial en clínica';
  }, [cita.ctaModalidad, cita.direccionDomicilio, cita.referenciasDomicilio, cita.enlaceVideollamada, doctor?.clinicas]);

  const servicioNombreTexto = useMemo(() => {
    if (cita.servicioNombre?.trim()) return cita.servicioNombre;
    if (cita.ctaMotivo?.trim()) return cita.ctaMotivo;
    return 'Consulta Médica General';
  }, [cita.servicioNombre, cita.ctaMotivo]);

  const servicioSubDetalle = useMemo(() => {
    if (cita.grupoTema?.trim()) return `Serie: ${cita.grupoTema}`;
    if (cita.ctaPrecio && cita.ctaPrecio > 0) {
      return `Q${cita.ctaPrecio.toFixed(2)}${cita.tipoPagoDescripcion ? ` • ${cita.tipoPagoDescripcion}` : ''}`;
    }
    if (cita.ctaModalidad === 'domicilio') return 'Atención médica domiciliaria';
    if (cita.ctaModalidad === 'virtual') return 'Telemedicina y consulta virtual';
    return 'Atención médica presencial';
  }, [cita.grupoTema, cita.ctaPrecio, cita.tipoPagoDescripcion, cita.ctaModalidad]);

  const getModalityLabelHeader = (mod: string) => {
    const m = (mod || '').toLowerCase();
    if (m === 'domicilio') return 'Atención a Domicilio';
    if (m === 'virtual') return 'Consulta Virtual';
    return 'Consulta Presencial';
  };

  const getModalityIconSmall = (mod: string) => {
    const m = (mod || '').toLowerCase();
    if (m === 'domicilio') return <Home className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />;
    if (m === 'virtual') return <Video className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />;
    return <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />;
  };

  const getStatusStripeColor = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'confirmada': return 'bg-emerald-600 dark:bg-emerald-500';
      case 'programada': return 'bg-blue-600 dark:bg-blue-500';
      case 'pospuesta': return 'bg-amber-500 dark:bg-amber-400';
      case 'en_proceso': return 'bg-indigo-600 dark:bg-indigo-400 animate-pulse';
      case 'completada': return 'bg-slate-500 dark:bg-slate-400';
      case 'cancelada':
      case 'rechazada':
      case 'no_asistio':
        return 'bg-rose-500 dark:bg-rose-400';
      default:
        return 'bg-blue-600 dark:bg-blue-500';
    }
  };

  const getStatusPillStyle = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'confirmada':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60';
      case 'programada':
        return 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60';
      case 'pospuesta':
        return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60';
      case 'en_proceso':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60 animate-pulse';
      case 'completada':
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      case 'cancelada':
      case 'rechazada':
      case 'no_asistio':
        return 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60';
    }
  };

  const getStatusDotBg = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'confirmada': return 'bg-emerald-500';
      case 'programada': return 'bg-blue-600';
      case 'pospuesta': return 'bg-amber-500';
      case 'en_proceso': return 'bg-indigo-600';
      case 'completada': return 'bg-slate-500';
      case 'cancelada':
      case 'rechazada':
      case 'no_asistio':
        return 'bg-rose-500';
      default:
        return 'bg-blue-600';
    }
  };

  const handleMarcarLlegada = (e: React.MouseEvent) => {
    e.stopPropagation();
    marcarLlegadaMutation.mutate(cita.ctaCodigo);
  };

  const yaTieneResena = typeof cita.ctaCalificacion === 'number' && cita.ctaCalificacion > 0;
  const canReview = isCompletedState && !yaTieneResena;
  // Pago pendiente deshabilitado: el pago se puede realizar en el consultorio/clínica
  const tienePagoPendiente = false;

  const mapQuery = [cita.medicoNombre, cita.clinicaNombre].filter(Boolean).join(', ');
  const gmapsUrl = cita.cliUrlGoogleMaps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
  const wazeUrl = cita.cliUrlWaze || `https://waze.com/ul?q=${encodeURIComponent(cita.clinicaNombre || mapQuery)}`;

  // Dropzone para comprobante de pago
  const { getRootProps: getPagoRootProps, getInputProps: getPagoInputProps, isDragActive: isPagoDragActive } = useDropzone({
    onDrop: (acceptedFiles) => { if (acceptedFiles[0]) setArchivoPago(acceptedFiles[0]); },
    accept: { 'image/*': [], 'application/pdf': [] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleSubmitPago = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const formData = new FormData();
    formData.append('CodTpp', String(cita.tipoPagoId ?? 0));
    if (archivoPago) {
      formData.append('Comprobante', archivoPago);
      formData.append('EstadoPago', 'pagado');
    } else {
      formData.append('EstadoPago', 'pendiente');
    }
    pagarCitaMutation.mutate(
      {
        citaId: cita.ctaCodigo,
        payload: {
          codTpp: cita.tipoPagoId ?? 0,
          estadoPago: 'pagado',
          referenciaPago: archivoPago ? archivoPago.name : null,
        },
      },
      {
        onSuccess: () => {
          setMostrarModalPago(false);
          setArchivoPago(null);
        },
      }
    );
  };

  const handleImprimirRecetaPdf = () => {
    if (typeof window === 'undefined') return;

    const fechaFormateada = cita.ctaFecha
      ? (() => {
          try {
            return format(parseISO(cita.ctaFecha.split('T')[0]), "d 'de' MMMM 'de' yyyy", { locale: es });
          } catch {
            return cita.ctaFecha.split('T')[0];
          }
        })()
      : 'Fecha no registrada';

    const horaFormateada = cita.ctaHora ? cita.ctaHora.slice(0, 5) + ' hrs' : '';
    const paciente = cita.pacienteNombre || 'Paciente Registrado';
    const medico = cita.medicoNombre ? `Dr(a). ${cita.medicoNombre}` : 'Médico Tratante';
    const especialidad = cita.medicoEspecialidad || 'Medicina General';
    const clinica = cita.clinicaNombre || 'Centro Médico SaludYa';
    const esCompletada = isCompletedState;
    const diagnostico = cita.ctaDiagnostico?.trim() || (esCompletada ? 'Consulta médica realizada y finalizada. Diagnóstico registrado en el expediente clínico.' : '');
    const tratamiento = cita.ctaTratamiento?.trim() || (esCompletada ? 'Indicaciones médicas y prescripción registrada en la consulta.' : '');
    const examenes = cita.ctaExamenesSolicitados?.trim() || '';
    const notas = cita.ctaNotasMedicas?.trim() || '';
    const codigoCita = cita.ctaCodigo || '';
    const modalidad = (cita.ctaModalidad || 'Presencial').toUpperCase();
    const motivo = cita.ctaMotivo?.trim() || cita.servicioNombre?.trim() || 'Consulta Médica';
    const precio = cita.ctaPrecio ? `Q${cita.ctaPrecio.toFixed(2)}` : 'Q0.00';
    const tipoPago = cita.tipoPagoDescripcion || 'En clínica';
    const tituloDoc = esCompletada ? `Informe Clínico y Receta Médica` : `Comprobante Oficial de Cita Médica`;
    const subtituloDoc = esCompletada ? `Red Médica & Expediente Clínico Digital` : `Constancia de Agendamiento y Turno`;

    const printHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${tituloDoc} - ${paciente}</title>
  <style>
    @page {
      size: letter;
      margin: 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      padding: 24px;
      line-height: 1.5;
      font-size: 13px;
    }
    .no-print-bar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px dashed #cbd5e1;
    }
    .btn-print {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(37,99,235,0.2);
    }
    .btn-close {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .brand h1 {
      font-size: 24px;
      font-weight: 900;
      color: #2563eb;
      letter-spacing: -0.5px;
    }
    .brand p {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .meta {
      text-align: right;
      font-size: 11px;
      color: #475569;
    }
    .meta strong {
      color: #0f172a;
    }
    .badge-folio {
      display: inline-block;
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 6px;
      font-family: monospace;
      font-weight: 700;
      color: #334155;
      margin-top: 4px;
      border: 1px solid #e2e8f0;
    }
    .grid-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 22px;
    }
    .info-group h4 {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 4px;
      font-weight: 800;
    }
    .info-group p {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .info-group span {
      font-size: 11px;
      color: #64748b;
    }
    .section {
      margin-bottom: 18px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1e293b;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .section-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 14px 16px;
      font-size: 13px;
      color: #1e293b;
      white-space: pre-wrap;
      line-height: 1.6;
    }
    .box-prescripcion {
      border-left: 4px solid #10b981;
      background: #f0fdf4;
    }
    .box-diagnostico {
      border-left: 4px solid #2563eb;
      background: #eff6ff;
    }
    .box-examenes {
      border-left: 4px solid #f59e0b;
      background: #fffbeb;
    }
    .box-notas {
      border-left: 4px solid #64748b;
      background: #f8fafc;
    }
    .signature-container {
      margin-top: 40px;
      display: flex;
      justify-content: flex-end;
    }
    .signature-box {
      text-align: center;
      width: 260px;
    }
    .signature-line {
      border-top: 1px solid #0f172a;
      margin-bottom: 6px;
    }
    .signature-name {
      font-weight: 800;
      font-size: 13px;
      color: #0f172a;
    }
    .signature-role {
      font-size: 11px;
      color: #64748b;
    }
    .footer {
      margin-top: 36px;
      padding-top: 12px;
      border-top: 1px dashed #cbd5e1;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print no-print-bar">
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
    <button class="btn-close" onclick="window.close()">Cerrar</button>
  </div>

  <div class="header">
    <div class="brand">
      <h1>SaludYa</h1>
      <p>${subtituloDoc}</p>
    </div>
    <div class="meta">
      <div><strong>Fecha:</strong> ${fechaFormateada}</div>
      <div><strong>Hora:</strong> ${horaFormateada}</div>
      <div><strong>Modalidad:</strong> ${modalidad}</div>
      ${codigoCita ? `<div class="badge-folio">Folio: #${codigoCita}</div>` : ''}
    </div>
  </div>

  <div class="grid-info">
    <div class="info-group">
      <h4>Paciente</h4>
      <p>${paciente}</p>
      <span>Atención Médica Ambulatoria</span>
    </div>
    <div class="info-group">
      <h4>Médico Tratante</h4>
      <p>${medico}</p>
      <span>${especialidad} · ${clinica}</span>
    </div>
  </div>

  ${esCompletada ? `
    <div class="section">
      <div class="section-title">1. Diagnóstico Clínico</div>
      <div class="section-box box-diagnostico">${diagnostico}</div>
    </div>

    <div class="section">
      <div class="section-title">2. Receta Médica / Prescripción e Indicaciones</div>
      <div class="section-box box-prescripcion">${tratamiento}</div>
    </div>

    ${examenes ? `
    <div class="section">
      <div class="section-title">3. Exámenes y Pruebas Solicitadas</div>
      <div class="section-box box-examenes">${examenes}</div>
    </div>
    ` : ''}

    ${notas ? `
    <div class="section">
      <div class="section-title">4. Observaciones Médicas</div>
      <div class="section-box box-notas">${notas}</div>
    </div>
    ` : ''}
  ` : `
    <div class="section">
      <div class="section-title">1. Motivo de Consulta y Servicio</div>
      <div class="section-box box-diagnostico">${motivo}</div>
    </div>

    <div class="section">
      <div class="section-title">2. Estado y Sede de Atención</div>
      <div class="section-box box-notas">
        <strong>Estado:</strong> ${formatCitaEstado(cita.ctaEstado)}<br/>
        <strong>Lugar / Modalidad:</strong> ${ubicacionTexto}
      </div>
    </div>

    <div class="section">
      <div class="section-title">3. Detalle de Honorarios y Pago</div>
      <div class="section-box box-prescripcion">
        <strong>Arancel de Consulta:</strong> ${precio}<br/>
        <strong>Forma de Pago:</strong> ${tipoPago} (${cita.estadoPago === 'pagado' ? 'Pagado' : 'Pago presencial/pendiente'})
      </div>
    </div>

    <div class="section">
      <div class="section-title">4. Instrucciones para la Consulta</div>
      <div class="section-box box-examenes">
        Por favor preséntate 10 a 15 minutos antes de la hora programada en la sede indicada. Si la consulta es por telemedicina/virtual, ingresa a la sala de espera minutos antes de la cita.
      </div>
    </div>
  `}

  <div class="signature-container">
    <div class="signature-box">
      <div class="signature-line"></div>
      <div class="signature-name">${medico}</div>
      <div class="signature-role">${especialidad}</div>
      <div class="signature-role">${esCompletada ? 'Colegiado / Médico Autorizado' : 'Firma de Conformidad / SaludYa'}</div>
    </div>
  </div>

  <div class="footer">
    Documento oficial generado por el sistema SaludYa. Validez para fines clínicos y administrativos.
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 300);
    });
  </script>
</body>
</html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {
          console.error(e);
        }
      }, 500);
    } else {
      toast.error('Por favor, permite ventanas emergentes en tu navegador para generar el PDF.');
    }
  };

  const renderModalPortal = () => {
    if (typeof window === 'undefined') return null;

    return (
      <>
        {/* Modal 1: Archivos y Documentos Adjuntos */}
        {mostrarModalArchivos && createPortal(
          <div 
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
            onClick={(e) => { e.stopPropagation(); setMostrarModalArchivos(false); }}
          >
            <div 
              className="relative w-full max-w-2xl bg-white dark:bg-[#0F172A] rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-2xl">
                    <Paperclip className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Archivos y Exámenes Adjuntos</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {cita.pacienteNombre ? `Paciente: ${cita.pacienteNombre}` : ''} ({format(dateObj, "d 'de' MMMM", { locale: es })})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarModalArchivos(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {listaArchivos.length > 0 ? (
                <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {listaArchivos.map((archivo) => {
                    const esImagen = String(archivo.arcTipoArchivo).includes('image') || String(archivo.arcUrl).match(/\.(png|jpg|jpeg|webp)$/i);
                    return (
                      <div 
                        key={archivo.arcCodigo}
                        className="flex flex-col bg-slate-50 dark:bg-[#1E293B] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 hover:border-sky-300 dark:hover:border-sky-600 transition group"
                      >
                        {esImagen ? (
                          <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3 bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <img src={archivo.arcUrl} alt={archivo.arcNombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          </div>
                        ) : (
                          <div className="w-full h-36 rounded-xl mb-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400">
                            <FileText className="w-12 h-12 text-sky-500 mb-2" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Documento PDF / Archivo</span>
                          </div>
                        )}

                        <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate mb-3" title={archivo.arcNombre}>
                          {archivo.arcNombre}
                        </p>

                        <a
                          href={archivo.arcUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-auto inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Ver Documento</span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                    <Paperclip className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No se adjuntaron documentos</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">Esta cita no cuenta con órdenes médicas o archivos adjuntos previos.</p>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* Modal de Pago: Subir comprobante de transferencia */}
        {mostrarModalPago && createPortal(
          <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
            onClick={(e) => { e.stopPropagation(); if (!pagarCitaMutation.isPending) { setMostrarModalPago(false); setArchivoPago(null); } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Confirmar Pago</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {cita.tipoPagoDescripcion ?? 'Transferencia'} · Q{cita.ctaPrecio.toFixed(2)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={pagarCitaMutation.isPending}
                  onClick={() => { setMostrarModalPago(false); setArchivoPago(null); }}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Info box */}
              <div className="mb-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    Sube el comprobante de transferencia para confirmar tu pago. Si aún no tienes el comprobante, puedes enviarlo después desde esta misma tarjeta.
                  </p>
                </div>
              </div>

              {/* Dropzone */}
              <div
                {...getPagoRootProps()}
                className={`relative flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed p-6 cursor-pointer transition-all ${
                  isPagoDragActive
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40'
                    : archivoPago
                    ? 'border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30'
                    : 'border-slate-300 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20'
                }`}
              >
                <input {...getPagoInputProps()} />
                {archivoPago ? (
                  <>
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 text-center break-all">{archivoPago.name}</p>
                    <p className="text-xs text-slate-400 mt-1">({(archivoPago.size / 1024).toFixed(0)} KB)</p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setArchivoPago(null); }}
                      className="mt-3 text-xs font-bold text-rose-500 hover:text-rose-700 underline cursor-pointer"
                    >
                      Cambiar archivo
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 text-center">
                      {isPagoDragActive ? 'Suelta el archivo aquí' : 'Arrastra tu comprobante o haz clic'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 text-center">PNG, JPG o PDF · máx. 10 MB</p>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  disabled={pagarCitaMutation.isPending}
                  onClick={() => { setMostrarModalPago(false); setArchivoPago(null); }}
                  className="flex-1 h-11 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={pagarCitaMutation.isPending}
                  onClick={handleSubmitPago}
                  className="flex-1 h-11 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-black shadow-md transition active:scale-[.98] disabled:opacity-60 cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  {pagarCitaMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>Enviando...</span></>
                  ) : archivoPago ? (
                    <><CheckCircle2 className="w-4 h-4" /><span>Confirmar pago</span></>
                  ) : (
                    <><CreditCard className="w-4 h-4" /><span>Marcar como pagado</span></>
                  )}
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

        {/* Modal 2: Información y Resumen Clínico */}
        {mostrarModalInfo && createPortal(
          <div 
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
            onClick={(e) => { e.stopPropagation(); setMostrarModalInfo(false); }}
          >
            <div 
              className="relative w-full max-w-2xl bg-white dark:bg-[#0F172A] rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0 mt-0.5">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                      Información
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {/* Badge dinámico con el estado real */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        estadoLower === 'programada' ? 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60'
                        : estadoLower === 'confirmada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60'
                        : estadoLower === 'pospuesta' ? 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60'
                        : estadoLower === 'en_proceso' ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 animate-pulse'
                        : isCompletedState ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          estadoLower === 'programada' ? 'bg-sky-500'
                          : estadoLower === 'confirmada' ? 'bg-emerald-500'
                          : estadoLower === 'pospuesta' ? 'bg-amber-500'
                          : estadoLower === 'en_proceso' ? 'bg-blue-600'
                          : isCompletedState ? 'bg-slate-500'
                          : 'bg-rose-500'
                        }`} />
                        <span>{formatCitaEstado(cita.ctaEstado)}</span>
                      </span>

                      {/* Calificación si ya fue evaluada */}
                      {isCompletedState && yaTieneResena && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{cita.ctaCalificacion}/5 Estrellas</span>
                        </span>
                      )}

                      {/* Grupo si existe */}
                      {cita.grupoTema && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/60">
                          <FolderPlus className="w-3 h-3" /> {cita.grupoTema}
                        </span>
                      )}

                      {/* ID CITA con botón de copiar */}
                      {cita.ctaCodigo && (
                        <button
                          type="button"
                          onClick={handleCopiarId}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer group"
                          title={`Copiar ID: ${cita.ctaCodigo}`}
                        >
                          <span className="text-[10px] uppercase font-sans text-slate-400">ID:</span>
                          <span>#{citaCodigoDisplay}</span>
                          {idCopiado ? (
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarModalInfo(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {/* 1. Banner contextual explicativo según el estado REAL de la cita */}
                {(estadoLower === 'no_asistio' || estadoLower === 'noasistio') ? (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs shrink-0 mt-0.5">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div className="text-xs">
                      <h4 className="font-bold text-rose-900 dark:text-rose-200 text-sm">Estado de la Cita: No asistió</h4>
                      <p className="text-rose-700 dark:text-rose-300/90 mt-1 leading-relaxed">
                        Esta consulta médica fue registrada como no asistida. El paciente no se presentó en la fecha y horario establecido ({format(dateObj, "d 'de' MMMM", { locale: es })} a las {cita.ctaHora.slice(0, 5)} hrs). Por esta razón no se generó expediente clínico ni prescripción médica.
                      </p>
                    </div>
                  </div>
                ) : estadoLower === 'cancelada' ? (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs shrink-0 mt-0.5">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div className="text-xs">
                      <h4 className="font-bold text-rose-900 dark:text-rose-200 text-sm">Estado de la Cita: Cancelada</h4>
                      <p className="text-rose-700 dark:text-rose-300/90 mt-1 leading-relaxed">
                        La cita médica fue cancelada previamente. El horario asignado quedó liberado en el sistema y no se efectuaron cargos clínicos.
                      </p>
                    </div>
                  </div>
                ) : estadoLower === 'rechazada' ? (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs shrink-0 mt-0.5">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="text-xs">
                      <h4 className="font-bold text-rose-900 dark:text-rose-200 text-sm">Estado de la Cita: Solicitud Rechazada</h4>
                      <p className="text-rose-700 dark:text-rose-300/90 mt-1 leading-relaxed">
                        Esta solicitud de cita no pudo ser confirmada y fue declinada por el médico o centro de salud.
                      </p>
                    </div>
                  </div>
                ) : estadoLower === 'en_proceso' ? (
                  <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3.5 animate-pulse">
                    <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs shrink-0 mt-0.5">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div className="text-xs">
                      <h4 className="font-bold text-blue-900 dark:text-blue-200 text-sm">Estado de la Cita: Consulta en Proceso</h4>
                      <p className="text-blue-700 dark:text-blue-300/90 mt-1 leading-relaxed">
                        El médico se encuentra atendiendo esta consulta. El diagnóstico y prescripción médica se registrarán en el expediente al finalizar.
                      </p>
                    </div>
                  </div>
                ) : estadoLower === 'confirmada' ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0 mt-0.5">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="text-xs">
                      <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">Estado de la Cita: Confirmada</h4>
                      <p className="text-emerald-700 dark:text-emerald-300/90 mt-1 leading-relaxed">
                        Tu cita se encuentra confirmada por el centro médico. Te recomendamos presentarte con 10 a 15 minutos de anticipación en la fecha indicada.
                      </p>
                    </div>
                  </div>
                ) : estadoLower === 'pospuesta' ? (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs shrink-0 mt-0.5">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="text-xs">
                      <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm">Estado de la Cita: Pospuesta</h4>
                      <p className="text-amber-700 dark:text-amber-300/90 mt-1 leading-relaxed">
                        Esta consulta fue pospuesta/reprogramada. Revisa los nuevos horarios asignados para tu atención.
                      </p>
                    </div>
                  </div>
                ) : estadoLower === 'programada' ? (
                  <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-sky-600 text-white shadow-xs shrink-0 mt-0.5">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="text-xs">
                      <h4 className="font-bold text-sky-900 dark:text-sky-200 text-sm">Estado de la Cita: Programada</h4>
                      <p className="text-sky-700 dark:text-sky-300/90 mt-1 leading-relaxed">
                        Cita agendada en el sistema, pendiente de atención médica en la fecha y hora seleccionada ({format(dateObj, "d 'de' MMMM", { locale: es })} a las {cita.ctaHora.slice(0, 5)} hrs).
                      </p>
                    </div>
                  </div>
                ) : isCompletedState ? (
                  <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-slate-700 dark:bg-slate-600 text-white shadow-xs shrink-0 mt-0.5">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="text-xs">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Estado de la Cita: Consulta Completada</h4>
                      <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        Esta consulta médica fue atendida y finalizada con éxito. A continuación encontrarás el expediente clínico registrado por el doctor.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* 2. Ficha de Datos Conectados de la Cita */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs">
                  {/* ID de la Cita Médica */}
                  {cita.ctaCodigo && (
                    <div className="sm:col-span-2 pb-2.5 mb-0.5 border-b border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">ID de la Cita (Código Único)</span>
                        <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate select-all" title={cita.ctaCodigo}>
                          {cita.ctaCodigo}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopiarId}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 transition shadow-2xs shrink-0 cursor-pointer active:scale-95"
                        title="Copiar ID al portapapeles"
                      >
                        {idCopiado ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="text-emerald-600 dark:text-emerald-400">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Copiar ID</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Paciente */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Paciente</span>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {cita.pacienteNombre || 'Paciente Registrado'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isIndependizado ? 'Cuenta Independizada' : 'Paciente de la cuenta'}
                    </p>
                  </div>

                  {/* Médico y Especialidad */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Médico Tratante</span>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      Dr. {cita.medicoNombre}
                    </p>
                    <p className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold">
                      {cita.medicoEspecialidad || doctor?.exp_profesion || 'Especialista Médico'}
                    </p>
                  </div>

                  {/* Fecha y Horario */}
                  <div className="space-y-1 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Fecha y Hora</span>
                    <p className="font-bold text-slate-800 dark:text-slate-100 capitalize">
                      {format(dateObj, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {cita.ctaHora.slice(0, 5)} hrs
                    </p>
                  </div>

                  {/* Modalidad y Lugar */}
                  <div className="space-y-1 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Modalidad & Sede</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 capitalize">
                      {getModalityIcon(cita.ctaModalidad)}
                      <span>{cita.ctaModalidad}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {cita.ctaModalidad === 'presencial'
                        ? (cita.clinicaNombre || 'Clínica Principal')
                        : cita.ctaModalidad === 'virtual'
                        ? (cita.enlaceVideollamada ? 'Videollamada disponible' : 'Enlace en sala de espera')
                        : (cita.direccionDomicilio || 'Dirección registrada a domicilio')}
                    </p>
                  </div>

                  {/* Costo, Método de Pago y Llegada */}
                  <div className="sm:col-span-2 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Costo de Consulta</span>
                      <span className="font-black text-slate-900 dark:text-white text-sm">
                        Q{cita.ctaPrecio ?? 0}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-2">
                        • {cita.tipoPagoDescripcion || 'Pago en clínica'} ({cita.estadoPago === 'pagado' ? 'Pagado' : 'Pago presencial'})
                      </span>
                    </div>

                    {cita.ctaModalidad === 'presencial' && (
                      <div className="flex items-center gap-1.5">
                        {ctaEnClinica && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Llegada confirmada
                          </span>
                        )}
                        {cita.cliUrlGoogleMaps && (
                          <a
                            href={cita.cliUrlGoogleMaps}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-sky-600 font-bold text-[11px] border border-slate-200 dark:border-slate-600 transition shadow-2xs"
                          >
                            <MapPin className="w-3 h-3 text-rose-500" />
                            <span>Ver Mapa</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Motivo y Síntomas Registrados al Agendar */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Activity className="w-4 h-4 text-sky-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Motivo y Síntomas Registrados al Agendar</h4>
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                    {cita.ctaMotivo?.trim() ? cita.ctaMotivo : 'Sin síntomas detallados durante el agendamiento.'}
                  </p>
                </div>

                {/* 4. Expediente Clínico: ÚNICAMENTE para citas completadas */}
                {isCompletedState && (
                  <div className="space-y-3 pt-1">
                    {/* Banner de descarga e impresión de diagnóstico y receta en PDF */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-800/80 shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                            Expediente y Receta Médica Oficial
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Diagnóstico y prescripción emitida por el médico tratante
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImprimirRecetaPdf();
                        }}
                        className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                        title="Descargar o imprimir diagnóstico y receta en PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Descargar PDF</span>
                      </button>
                    </div>

                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1 pt-1">
                      Expediente Clínico de la Consulta
                    </h4>

                    {/* Diagnóstico Médico */}
                    <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">Diagnóstico Clínico</h4>
                      </div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                        {cita.ctaDiagnostico?.trim() 
                          ? cita.ctaDiagnostico 
                          : 'Evaluación médica completada. Diagnóstico y evolución registrados en el expediente clínico.'}
                      </p>
                    </div>

                    {/* Tratamiento Prescrito */}
                    <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Pill className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Tratamiento e Indicaciones</h4>
                      </div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                        {cita.ctaTratamiento?.trim() 
                          ? cita.ctaTratamiento 
                          : 'Tratamiento e indicaciones médicas registradas en la consulta.'}
                      </p>
                    </div>

                    {/* Exámenes Solicitados */}
                    {cita.ctaExamenesSolicitados && (
                      <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50">
                        <div className="flex items-center gap-2 mb-1.5">
                          <FlaskConical className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Exámenes y Pruebas Solicitadas</h4>
                        </div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                          {cita.ctaExamenesSolicitados}
                        </p>
                      </div>
                    )}

                    {/* Notas Médicas */}
                    {cita.ctaNotasMedicas && (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Info className="w-4 h-4 text-slate-500" />
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Observaciones</h4>
                        </div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                          {cita.ctaNotasMedicas}
                        </p>
                      </div>
                    )}

                    {/* Reseña registrada */}
                    {yaTieneResena && (
                      <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            Tu Calificación: {cita.ctaCalificacion}/5
                          </span>
                          {cita.resenaFecha && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400">
                              {format(parseISO(cita.resenaFecha), "d MMM yyyy", { locale: es })}
                            </span>
                          )}
                        </div>
                        {cita.resenaComentario?.trim() && (
                          <blockquote className="text-xs italic text-slate-700 dark:text-slate-300 border-l-2 border-amber-400 pl-2.5">
                            &ldquo;{cita.resenaComentario}&rdquo;
                          </blockquote>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Documentos y Archivos Adjuntos */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                        Archivos y Documentos Adjuntos
                      </h4>
                    </div>
                    {tieneArchivos && (
                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-100/70 dark:bg-sky-950/60 px-2 py-0.5 rounded-md">
                        {listaArchivos.length} {listaArchivos.length === 1 ? 'archivo' : 'archivos'}
                      </span>
                    )}
                  </div>

                  {tieneArchivos ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {listaArchivos.map((archivo) => {
                        const esImagen = String(archivo.arcTipoArchivo).includes('image') || String(archivo.arcUrl).match(/\.(png|jpg|jpeg|webp)$/i);
                        return (
                          <div
                            key={archivo.arcCodigo}
                            className="flex flex-col bg-white dark:bg-[#1E293B] rounded-2xl p-3 border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-sky-300 dark:hover:border-sky-600 transition group"
                          >
                            {esImagen ? (
                              <div className="relative w-full h-28 rounded-xl overflow-hidden mb-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                <img src={archivo.arcUrl} alt={archivo.arcNombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              </div>
                            ) : (
                              <div className="w-full h-28 rounded-xl mb-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400">
                                <FileText className="w-8 h-8 text-sky-500 mb-1" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Documento PDF / Archivo</span>
                              </div>
                            )}

                            <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate mb-2.5" title={archivo.arcNombre}>
                              {archivo.arcNombre}
                            </p>

                            <a
                              href={archivo.arcUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-auto inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-95"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Ver Documento</span>
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-6 text-center flex flex-col items-center justify-center">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No se adjuntaron documentos</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Esta cita no cuenta con órdenes médicas o archivos adjuntos.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMostrarModalInfo(false);
                      router.push(colaUrl);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition active:scale-95 cursor-pointer"
                    title="Ver cola y turnos de atención en la fecha de esta cita"
                  >
                    <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Ver cola de esta fecha</span>
                  </button>
                  {isCompletedState && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImprimirRecetaPdf();
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                      title="Descargar o imprimir informe clínico y receta médica en PDF"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Descargar PDF</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarModalInfo(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Modal 3: Ver Reseña (Solo Lectura) */}
        {mostrarModalResena && createPortal(
          <div 
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
            onClick={(e) => { e.stopPropagation(); setMostrarModalResena(false); }}
          >
            <div 
              className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-500 rounded-2xl">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Reseña de la Consulta</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Solo lectura • No editable</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarModalResena(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-center">
                  <div className="flex items-center gap-1.5 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-7 h-7 ${(star <= (cita.ctaCalificacion || 5)) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                      />
                    ))}
                  </div>
                  <p className="text-base font-black text-slate-900 dark:text-white">
                    {cita.ctaCalificacion || 5} de 5 Estrellas
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Evaluación otorgada a {cita.medicoNombre ? `Dr. ${cita.medicoNombre}` : 'la atención médica'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Comentario de la Experiencia</h4>
                  <blockquote className="text-sm font-medium text-slate-700 dark:text-slate-200 italic leading-relaxed">
                    &ldquo;{cita.resenaComentario?.trim() ? cita.resenaComentario : 'Excelente atención, puntualidad y calidez profesional durante toda la consulta.'}&rdquo;
                  </blockquote>
                  {cita.resenaFecha && (
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-3 text-right">
                      Publicada el {format(parseISO(cita.resenaFecha), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  )}
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs border border-slate-200 dark:border-slate-700">
                  <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>Esta reseña ya fue registrada y se mantiene como registro permanente de tu experiencia médica (solo consulta, no editable).</span>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setMostrarModalResena(false)}
                  className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  };

  const renderPinButton = (isAbsolute = true) => {
    const isPinned = !!cita.ctaGrupoId;
    const posClass = isAbsolute ? 'absolute top-3 right-3 z-20' : 'relative';

    if (isPinned) {
      if (!onUnlinkGroup) return null;
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUnlinkGroup(cita);
          }}
          className={`group/pin ${posClass} inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full border text-xs font-bold transition-all duration-300 ease-out shadow-2xs hover:shadow-md active:scale-95 cursor-pointer overflow-hidden max-w-[34px] hover:max-w-[260px] bg-purple-50/90 dark:bg-purple-950/80 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 dark:hover:bg-rose-950/70 dark:hover:border-rose-700 dark:hover:text-rose-300`}
          title={`Quitar cita del grupo: ${cita.grupoTema || 'Grupo'}`}
        >
          <FolderMinus className="w-3.5 h-3.5 shrink-0 transition-transform duration-300 group-hover/pin:scale-110 text-purple-600 dark:text-purple-400 group-hover/pin:text-rose-600 dark:group-hover/pin:text-rose-400" />
          <span className="whitespace-nowrap opacity-0 group-hover/pin:opacity-100 transition-opacity duration-300 delay-75 text-[11px] font-bold">
            Quitar del grupo
          </span>
        </button>
      );
    }

    if (!onLinkGroup) return null;

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onLinkGroup(cita);
        }}
        className={`group/pin ${posClass} inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full border text-xs font-bold transition-all duration-300 ease-out shadow-2xs hover:shadow-md active:scale-95 cursor-pointer overflow-hidden max-w-[34px] hover:max-w-[260px] bg-white/95 dark:bg-slate-800/95 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/60`}
        title="Incluir cita en un grupo"
      >
        <FolderPlus className="w-3.5 h-3.5 shrink-0 transition-transform duration-300 group-hover/pin:scale-110 text-slate-500 dark:text-slate-400 group-hover/pin:text-purple-600 dark:group-hover/pin:text-purple-300" />
        <span className="whitespace-nowrap opacity-0 group-hover/pin:opacity-100 transition-opacity duration-300 delay-75 text-[11px] font-bold">
          Incluir en un grupo
        </span>
      </button>
    );
  };

  const renderCompletedActionsGrid = (compact = false) => {
    const btnBaseClass = compact 
      ? "h-8 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer w-full text-center"
      : "h-9 px-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer w-full flex items-center justify-center gap-1.5 text-center";

    const hasGroupAction = Boolean(cita.ctaGrupoId ? onUnlinkGroup : onLinkGroup);

    return (
      <div className={`grid grid-cols-2 ${hasGroupAction ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-2 w-full`}>
        {/* 1. Ver cola de atención de esa fecha */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); router.push(colaUrl); }}
          className={`${btnBaseClass} bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/80`}
          title="Ver cola y turnos de atención en la fecha de esta cita"
        >
          <Activity className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="truncate">Ver cola</span>
        </button>

        {/* 2. Información de toda la cita (Diagnóstico, síntomas, tratamiento, exámenes y archivos adjuntos) */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMostrarModalInfo(true); }}
          className={`${btnBaseClass} bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80`}
          title="Ver información de la cita, diagnóstico, exámenes y expediente"
        >
          <ClipboardList className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="truncate">Información</span>
        </button>

        {/* 2. En lugar de Documentos -> Nueva Cita */}
        {isIndependizado ? (
          <button
            type="button"
            disabled
            className={`${btnBaseClass} bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60`}
            title="Este paciente fue independizado y gestiona su propia cuenta"
          >
            <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Independizado</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNuevaCita();
            }}
            className={`${btnBaseClass} bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80`}
            title="Agendar una nueva cita con este médico"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">Nueva Cita</span>
          </button>
        )}

        {/* 3. Ver Reseña (Solo Lectura) o Escribir Reseña */}
        {yaTieneResena ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMostrarModalResena(true); }}
            className={`${btnBaseClass} bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80`}
            title="Ver reseña y calificación registrada (solo lectura)"
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
            <span className="truncate">Ver Reseña ({cita.ctaCalificacion}/5)</span>
          </button>
        ) : canReview ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/paciente/resenas/nueva?cita=${cita.ctaCodigo}&doc=${cita.ctaCoddoc}`);
            }}
            className={`${btnBaseClass} bg-amber-500 hover:bg-amber-600 text-white shadow-md`}
            title="Escribir una reseña para esta consulta"
          >
            <Star className="w-3.5 h-3.5 fill-white text-white shrink-0" />
            <span className="truncate">Escribir reseña</span>
          </button>
        ) : (
          <div
            className={`${btnBaseClass} bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-700/60 cursor-default opacity-60`}
            title="Esta consulta no cuenta con reseña"
          >
            <Star className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
            <span className="truncate">Sin reseña</span>
          </div>
        )}

        {/* 4. Opción de Agrupar / Desagrupar si aplica */}
        {hasGroupAction && (
          cita.ctaGrupoId ? (
            onUnlinkGroup ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnlinkGroup(cita);
                }}
                className={`${btnBaseClass} bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80`}
                title={`Quitar del grupo: ${cita.grupoTema || 'Grupo'}`}
              >
                <FolderMinus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">Desagrupar</span>
              </button>
            ) : null
          ) : (
            onLinkGroup ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLinkGroup(cita);
                }}
                className={`${btnBaseClass} bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/80`}
                title="Incluir cita en un grupo"
              >
                <FolderPlus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                <span className="truncate">Agrupar</span>
              </button>
            ) : null
          )
        )}
      </div>
    );
  };

  const renderBentoCard = () => {
    const hasEightButtons = Boolean(solicitudCambio && solicitudCambio.estado === 'pendiente');
    const cancelColSpan = hasEightButtons
      ? 'col-span-1'
      : 'col-span-2 sm:col-span-3 md:col-span-2 xl:col-span-1';
    return (
      <div
        onClick={() => setMostrarModalInfo(true)}
        className={`group relative flex flex-col rounded-3xl border transition-all duration-200 overflow-hidden cursor-pointer ${
          isIndependizado
            ? 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 opacity-90 shadow-sm'
            : 'bg-white dark:bg-[#0B1120] border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700/60'
        }`}
      >
        {/* Orilla izquierda de color representativo del estado de la cita */}
        <div className={`absolute left-0 top-0 bottom-0 w-2 ${getStatusStripeColor(cita.ctaEstado)} z-20`} />

        {/* ─── FILA SUPERIOR: INFORMACIÓN MÉDICA & BENTO DATOS ─── */}
        <div className="p-5 sm:p-6 pl-6 sm:pl-7 flex flex-col xl:flex-row xl:items-center justify-between gap-5 sm:gap-6">
          
          {/* Bloque Izquierdo: Doctor Avatar & Datos */}
          <div className="flex items-center gap-4 min-w-0 max-w-xl">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden object-cover border border-slate-200/80 dark:border-slate-700 shadow-xs shrink-0 relative bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              ) : doctor?.exp_foto_perfil ? (
                <Image src={doctor.exp_foto_perfil} alt={cita.medicoNombre} fill sizes="80px" className="object-cover" />
              ) : (
                <span className="text-base sm:text-lg font-black text-slate-500 dark:text-slate-400">{initials}</span>
              )}
              {/* Badge azul con ícono en la esquina inferior derecha de la foto */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-xs">
                <Stethoscope className="w-2.5 h-2.5" />
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight truncate" title={`Dr. ${cita.medicoNombre}`}>
                  Dr. {cita.medicoNombre}
                </h4>
                <BadgeCheck className="w-4 h-4 text-blue-600 fill-blue-50 dark:fill-blue-950 shrink-0" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={cita.medicoEspecialidad || doctor?.exp_profesion || 'Médico y Cirujano'}>
                {cita.medicoEspecialidad || doctor?.exp_profesion || 'Médico y Cirujano'}
              </p>

              {/* Fila de Tags / Píldoras: Modalidad (con ícono) + Servicio + Estado */}
              <div className="flex items-center gap-2 flex-wrap mt-2.5">
                {/* Modalidad con ícono */}
                <div className="inline-flex items-center gap-1.5 bg-blue-50/80 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-xl px-2.5 py-1 text-xs font-bold border border-blue-100 dark:border-blue-900/50 shadow-2xs">
                  {getModalityIconSmall(cita.ctaModalidad)}
                  <span>{getModalityLabelHeader(cita.ctaModalidad)}</span>
                </div>

                {/* Tipo de Servicio */}
                <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-2.5 py-1 border border-slate-200/80 dark:border-slate-700/60 text-xs shadow-2xs">
                  <span className="text-slate-400 dark:text-slate-500 font-medium">Servicio:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{servicioNombreTexto}</span>
                </div>

                {/* Estado con punto de color */}
                <div className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold border shadow-2xs ${getStatusPillStyle(cita.ctaEstado)}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotBg(cita.ctaEstado)}`} />
                  <span className="capitalize">{formatCitaEstado(cita.ctaEstado)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bloque Derecho: Bento de Horario/Sede & Arancel */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 sm:gap-6 shrink-0">
            {/* Caja de Fecha, Horario y Sede */}
            <div className="bg-[#F8FAFC] dark:bg-slate-800/40 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 shadow-2xs shrink-0">
              {/* Fecha y Hora con Calendario Azul */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-600 text-white flex flex-col items-center justify-center font-black shrink-0 shadow-xs">
                  <span className="text-[9px] uppercase tracking-wider leading-none opacity-90">{mesAbrev}</span>
                  <span className="text-base sm:text-lg font-black leading-none mt-0.5">{diaNum}</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    FECHA Y HORA
                  </span>
                  <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white capitalize leading-snug">
                    {fechaLargaCap}
                  </span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    {horarioString} · {turnoTexto}
                  </span>
                </div>
              </div>

              {/* Separador vertical */}
              <div className="w-px h-10 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block shrink-0" />

              {/* Sede Hospitalaria / Ubicación Única Completa */}
              <div className="flex flex-col min-w-[140px] max-w-[210px] sm:max-w-[240px] justify-center">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {cita.ctaModalidad === 'domicilio'
                      ? 'UBICACIÓN A DOMICILIO'
                      : cita.ctaModalidad === 'virtual'
                      ? 'CONSULTA VIRTUAL'
                      : 'SEDE HOSPITALARIA'}
                  </span>
                </div>
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug break-normal line-clamp-2" title={clinicaNombreReal || ubicacionTexto}>
                  {clinicaNombreReal || ubicacionTexto}
                </span>
                {direccionDetallada && (
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed break-normal line-clamp-1" title={direccionDetallada}>
                    {direccionDetallada}
                  </span>
                )}
              </div>
            </div>

            {/* Arancel de Consulta */}
            <div className="flex flex-col shrink-0 md:min-w-[130px] pl-1 justify-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                ARANCEL CONSULTA
              </span>
              <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight leading-tight mt-0.5">
                Q{(cita.ctaPrecio ?? 0).toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 truncate" title={cita.tipoPagoDescripcion || 'En clínica'}>
                <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{cita.tipoPagoDescripcion || 'En clínica'}</span>
              </span>
            </div>
          </div>

        </div>

        {/* ─── FILA INFERIOR DE BOTONES (ACTION RAIL INTEGRADO RESPONSIVE CON GRID) ─── */}
        <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0B1120] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 auto-rows-fr">
            {/* 2. Información */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMostrarModalInfo(true);
              }}
              className="h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer group"
            >
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-1 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight whitespace-nowrap">
                Información
              </span>
            </button>

            {/* 3. Reprogramar / Reseña */}
            {canModify ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onModify(cita);
                }}
                className="h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer group"
              >
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-1 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight whitespace-nowrap">
                  Reprogramar
                </span>
              </button>
            ) : canReview ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/paciente/resenas/nueva?cita=${cita.ctaCodigo}&doc=${cita.ctaCoddoc}`);
                }}
                className="h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 transition cursor-pointer group"
              >
                <Star className="w-4 h-4 fill-amber-400 text-amber-400 mb-1 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-[11px] font-bold leading-tight whitespace-nowrap">
                  Calificar
                </span>
              </button>
            ) : yaTieneResena ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMostrarModalResena(true);
                }}
                className="h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 transition cursor-pointer group"
              >
                <Star className="w-4 h-4 fill-amber-400 text-amber-400 mb-1 shrink-0" />
                <span className="text-[11px] font-bold leading-tight whitespace-nowrap">
                  Reseña ({cita.ctaCalificacion}/5)
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMostrarModalInfo(true);
                }}
                className="h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-400 dark:text-slate-500 transition cursor-pointer group"
              >
                <Calendar className="w-4 h-4 text-slate-400 mb-1 shrink-0" />
                <span className="text-[11px] font-bold leading-tight whitespace-nowrap">
                  Reprogramar
                </span>
              </button>
            )}

            {/* 4. Nueva Cita */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNuevaCita();
              }}
              className="h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer group"
            >
              <CalendarPlus className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-1 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight whitespace-nowrap">
                Nueva cita
              </span>
            </button>

            {/* 5. Cómo Llegar */}
            {canShowComoLlegar ? (
              <div className="relative h-full flex flex-col border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80">
                <button
                  ref={navButtonRef}
                  type="button"
                  onClick={handleToggleNavMenu}
                  className="w-full h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-0.5 mb-1">
                    <Navigation className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight whitespace-nowrap">
                    Cómo llegar
                  </span>
                </button>

                {/* Popover Menú Cómo llegar */}
                {isNavMenuOpen && menuPos && typeof window !== 'undefined' && createPortal(
                  <motion.div
                    ref={navMenuRef}
                    initial={{ opacity: 0, scale: 0.94, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: 4 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute',
                      top: `${menuPos.top}px`,
                      left: `${menuPos.left}px`,
                      zIndex: 999999,
                    }}
                    className="min-w-[160px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-2xl text-slate-800 dark:text-slate-100"
                  >
                    <p className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      ¿Cómo llegar?
                    </p>
                    <a
                      href={gmapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsNavMenuOpen(false);
                      }}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                    >
                      <MapPin className="h-3.5 w-3.5 text-blue-600" />
                      Google Maps
                    </a>
                    <a
                      href={wazeUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsNavMenuOpen(false);
                      }}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-600 dark:hover:text-sky-400 transition cursor-pointer"
                    >
                      <Navigation className="h-3.5 w-3.5 text-sky-600" />
                      Waze
                    </a>
                  </motion.div>,
                  document.body
                )}
              </div>
            ) : cita.ctaModalidad === 'virtual' && cita.enlaceVideollamada ? (
              <a
                href={cita.enlaceVideollamada}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer group"
              >
                <Video className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-1 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight whitespace-nowrap">
                  Videollamada
                </span>
              </a>
            ) : tieneArchivos ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMostrarModalArchivos(true);
                }}
                className="h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer group"
              >
                <Paperclip className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-1 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight whitespace-nowrap">
                  Archivos
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMostrarModalInfo(true);
                }}
                className="h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-400 dark:text-slate-500 transition cursor-pointer group"
              >
                <Navigation className="w-4 h-4 text-slate-400 mb-1 shrink-0" />
                <span className="text-[11px] font-bold leading-tight whitespace-nowrap">
                  Cómo llegar
                </span>
              </button>
            )}

            {/* 6. Agrupar / Desagrupar */}
            {cita.ctaGrupoId ? (
              onUnlinkGroup ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnlinkGroup(cita);
                  }}
                  className="h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 hover:bg-rose-50 text-slate-700 hover:text-rose-600 dark:text-slate-200 transition cursor-pointer group"
                >
                  <FolderMinus className="w-4 h-4 text-purple-600 dark:text-purple-400 mb-1 group-hover:scale-110 transition-transform shrink-0" />
                  <span className="text-[11px] font-bold leading-tight whitespace-nowrap">
                    Desagrupar
                  </span>
                </button>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300">
                  <FolderMinus className="w-4 h-4 text-purple-600 mb-1 shrink-0" />
                  <span className="text-[11px] font-bold leading-tight whitespace-nowrap">
                    En Serie
                  </span>
                </div>
              )
            ) : onLinkGroup ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLinkGroup(cita);
                }}
                className="h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer group"
              >
                <FolderPlus className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-1 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight whitespace-nowrap">
                  Agrupar
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMostrarModalInfo(true);
                }}
                className="h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-400 dark:text-slate-500 transition cursor-pointer group"
              >
                <FolderPlus className="w-4 h-4 text-slate-400 mb-1 shrink-0" />
                <span className="text-[11px] font-bold leading-tight whitespace-nowrap">
                  Agrupar
                </span>
              </button>
            )}

            {/* 7. Imprimir PDF */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleImprimirRecetaPdf();
              }}
              className="h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer group"
            >
              <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-1 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight whitespace-nowrap">
                Imprimir PDF
              </span>
            </button>

            {/* 8. Botón Cancelar (donde corresponda según estado, adaptado responsive) */}
            {canCancel ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(cita);
                }}
                className={`h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition cursor-pointer group ${cancelColSpan}`}
                title="Cancelar cita médica"
              >
                <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 mb-1 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-[11px] font-bold leading-tight whitespace-nowrap">
                  Cancelar
                </span>
              </button>
            ) : isCompletedState ? (
              <div className={`h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 ${cancelColSpan}`}>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mb-1 shrink-0" />
                <span className="text-[11px] font-bold leading-tight whitespace-nowrap">
                  Completada
                </span>
              </div>
            ) : isCancelada ? (
              <div className={`h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 bg-rose-50/40 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 ${cancelColSpan}`}>
                <XCircle className="w-4 h-4 text-rose-500 mb-1 shrink-0" />
                <span className="text-[11px] font-bold leading-tight whitespace-nowrap">
                  Cancelada
                </span>
              </div>
            ) : isNoAsistio ? (
              <div className={`h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 ${cancelColSpan}`}>
                <AlertCircle className="w-4 h-4 text-slate-400 mb-1 shrink-0" />
                <span className="text-[11px] font-bold leading-tight whitespace-nowrap">
                  No asistió
                </span>
              </div>
            ) : null}

            {/* 9. Botón Intercambio de turno si existe solicitud */}
            {solicitudCambio && solicitudCambio.estado === 'pendiente' && (
              solicitudCambio.tipoRelacion === 'enviada' ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onCancelarSolicitud?.(solicitudCambio); }}
                  className="h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 hover:bg-rose-50 text-amber-700 dark:text-amber-300 transition cursor-pointer group"
                  title="Cancelar solicitud de intercambio de horario"
                >
                  <Clock className="w-4 h-4 text-amber-500 mb-1 group-hover:scale-110 transition-transform shrink-0" />
                  <span className="text-[11px] font-bold leading-tight whitespace-nowrap">
                    Cancelar Cambio
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onResponderSolicitud?.(solicitudCambio); }}
                  className="h-full flex flex-col items-center justify-center py-2.5 sm:py-3 px-2 text-center border-r border-b xl:border-b-0 border-slate-100 dark:border-slate-800/80 bg-orange-50 hover:bg-orange-100 text-orange-700 dark:text-orange-300 font-black transition cursor-pointer group animate-pulse"
                  title="Responder solicitud de intercambio de horario"
                >
                  <ArrowLeftRight className="w-4 h-4 text-orange-600 mb-1 shrink-0" />
                  <span className="text-[11px] font-bold leading-tight whitespace-nowrap">
                    Responder
                  </span>
                </button>
              )
            )}
        </div>

        {renderModalPortal()}
      </div>
    );
  };

  if (layout === 'row') {
    return renderBentoCard();
  }

  if (layout === 'series-child') {
    return (
      <div className={`group relative flex flex-col rounded-xl border shadow-sm transition-all overflow-visible py-3 px-4 w-full ${
        isIndependizado
          ? 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 opacity-90'
          : 'bg-white dark:bg-[#0B1120] border-slate-100 dark:border-slate-800 hover:shadow hover:border-sky-200'
      }`}>
        {/* Botón de anclar en la esquina superior derecha con hover suave */}
        {renderPinButton()}

        <div className="flex flex-1 flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 pr-10 sm:pr-12">
          
          {/* Col 1: Cuándo */}
          <div className="flex flex-col min-w-[120px] shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Fecha y Hora</p>
            <p className="text-sm font-black text-slate-900 dark:text-white capitalize leading-tight break-words">
              {format(dateObj, "EEE d MMM", { locale: es })}
            </p>
            <p className="text-xs font-bold text-sky-600 dark:text-sky-400">
              {cita.ctaHora.slice(0, 5)}
            </p>
          </div>

          {/* Col 2: Dónde (Modalidad) */}
          <div className="flex items-center gap-2.5 flex-1 min-w-[150px]">
            <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              {getModalityIcon(cita.ctaModalidad)}
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize leading-tight break-words">{cita.ctaModalidad}</p>
              {cita.ctaModalidad === 'presencial' && cita.clinicaNombre && (
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 break-words leading-tight mt-0.5">{cita.clinicaNombre}</p>
              )}
            </div>
          </div>

          {/* Col 3: Estado y Acciones Directas (cuando no completada) */}
          {!isCompletedState && (
            <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
              <span className={`inline-flex px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md ${getEstadoColor(cita.ctaEstado)}`}>
                {formatCitaEstado(cita.ctaEstado)}
              </span>

              {/* Botón Llegada a Clínica (Exclusivo para el día de la cita y presencial) */}
              {canMarcarLlegada && (
                ctaEnClinica ? (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs"
                    title="Ya has registrado que te encuentras en la clínica"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Llegada confirmada</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={marcarLlegadaMutation.isPending}
                    onClick={handleMarcarLlegada}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    title="Confirmar que ya llegaste a la clínica para tu cita de hoy"
                  >
                    {marcarLlegadaMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Building2 className="w-3.5 h-3.5 text-white" />
                    )}
                    <span>Ya estoy en la clínica</span>
                  </button>
                )
              )}


              {isNoAsistio || isCancelada ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); router.push(colaUrl); }}
                    className="px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-blue-200/50 dark:border-blue-800/40 cursor-pointer"
                    title="Ver cola y turnos de atención en la fecha de esta cita"
                  >
                    <Activity className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Ver cola
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMostrarModalInfo(true); }}
                    className="px-2 py-1 bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-slate-200/50 dark:border-slate-700/50 cursor-pointer"
                    title="Ver información de la cita"
                  >
                    <ClipboardList className="w-3 h-3 text-slate-500 dark:text-slate-400" /> Detalle
                  </button>
                  {!isIndependizado && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleNuevaCita(); }}
                      className="px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-emerald-200/50 dark:border-emerald-800/40 cursor-pointer"
                      title="Agendar nueva cita con este médico"
                    >
                      <CalendarPlus className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Nueva cita
                    </button>
                  )}
                </>
              ) : isCompletedState ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); router.push(colaUrl); }}
                    className="px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-blue-200/50 dark:border-blue-800/40 cursor-pointer"
                    title="Ver cola y turnos de atención en la fecha de esta cita"
                  >
                    <Activity className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Ver cola
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMostrarModalInfo(true); }}
                    className="px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-blue-200/50 dark:border-blue-800/40 cursor-pointer"
                    title="Ver detalle de la cita"
                  >
                    <ClipboardList className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Detalle
                  </button>
                  {!isIndependizado && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleNuevaCita(); }}
                      className="px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-emerald-200/50 dark:border-emerald-800/40 cursor-pointer"
                      title="Agendar nueva cita con este médico"
                    >
                      <CalendarPlus className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Nueva cita
                    </button>
                  )}
                  {canReview && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/paciente/resenas/nueva?cita=${cita.ctaCodigo}&doc=${cita.ctaCoddoc}`);
                      }}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Star className="w-3 h-3 fill-white text-white" /> Escribir reseña
                    </button>
                  )}
                  {yaTieneResena && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setMostrarModalResena(true); }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 cursor-pointer"
                    >
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Calificada ({cita.ctaCalificacion}/5)
                    </button>
                  )}
                </>
              ) : isEnProceso ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); router.push(colaUrl); }}
                    className="px-2 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer animate-pulse"
                    title="Ver sala de espera y consulta en progreso"
                  >
                    <Activity className="w-3 h-3 text-white" /> En consulta
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMostrarModalInfo(true); }}
                    className="px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-blue-200/50 dark:border-blue-800/40 cursor-pointer"
                    title="Ver información de la cita"
                  >
                    <ClipboardList className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Detalle
                  </button>
                </>
              ) : (
                <>
                  {solicitudCambio && solicitudCambio.estado === 'pendiente' && (
                    solicitudCambio.tipoRelacion === 'enviada' ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onCancelarSolicitud?.(solicitudCambio); }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg bg-amber-500 hover:bg-rose-600 text-white shadow-sm transition active:scale-95 cursor-pointer"
                        title="Cancelar solicitud de intercambio de horario"
                      >
                        <Clock className="w-3 h-3 text-white" />
                        <span>Cancelar cambio</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onResponderSolicitud?.(solicitudCambio); }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition active:scale-95 cursor-pointer animate-pulse"
                        title="Responder solicitud de intercambio de horario"
                      >
                        <ArrowLeftRight className="w-3 h-3 text-white" />
                        <span>Intercambio</span>
                      </button>
                    )
                  )}

                  {puedeVerCola && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(colaUrl);
                      }}
                      className="px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-blue-200/50 dark:border-blue-800/40 cursor-pointer"
                      title="Ver sala de espera y cola de atención"
                    >
                      <Activity className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Ver cola
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMostrarModalInfo(true); }}
                    className="px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-blue-200/50 dark:border-blue-800/40 cursor-pointer"
                    title="Ver información de la cita"
                  >
                    <ClipboardList className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Detalle
                  </button>

                  {!isIndependizado && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNuevaCita();
                      }}
                      className="px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-emerald-200/50 dark:border-emerald-800/40 cursor-pointer"
                      title="Agendar nueva cita con este médico"
                    >
                      <CalendarPlus className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Nueva cita
                    </button>
                  )}

                  {canModify && (
                    <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onModify(cita); }}
                        className="px-2 py-1 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 hover:bg-sky-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-sky-200/50 dark:border-sky-800/40 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" /> Modificar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onCancel(cita); }}
                        className="px-2 py-1 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-rose-200/50 dark:border-rose-800/40 cursor-pointer"
                      >
                        <XCircle className="w-3 h-3" /> Cancelar
                      </button>
                    </div>
                  )}

                  {bottomActions && (
                    <div className="flex gap-2">
                      {bottomActions}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Grid de 4 botones para citas completadas en series */}
        {isCompletedState && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 w-full">
            {renderCompletedActionsGrid(true)}
          </div>
        )}
      </div>
    );
  }

  // === CARD LAYOUT (Bento Action Rail) ===
  return renderBentoCard();
}