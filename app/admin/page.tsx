'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Calendar,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Stethoscope,
  Building2,
  Video,
  Home,
  RefreshCw,
  LogOut,
  Eye,
  ShieldCheck,
  FileText,
  DollarSign,
  ChevronDown,
  Sparkles,
  Award,
  Mail,
  ExternalLink,
  Layers,
  Check,
  X,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useAdminCitas, useCambiarEstadoCita } from '@/hooks/use-flujo-citas';
import type { CitaListDto, CitaEstado, CambiarEstadoCitaPayload } from '@/types/citas';
import { NeoLoader } from '@/components/neo-loader';

// ─── Status Config & Aesthetics ─────────────────────────────────────────────

const ESTADOS_CONFIG: Record<
  CitaEstado,
  {
    label: string;
    bgLight: string;
    bgDark: string;
    textLight: string;
    textDark: string;
    borderLight: string;
    borderDark: string;
    icon: any;
    dotColor: string;
    description: string;
  }
> = {
  programada: {
    label: 'Programada',
    bgLight: 'bg-sky-50',
    bgDark: 'dark:bg-sky-950/50',
    textLight: 'text-sky-700',
    textDark: 'dark:text-sky-300',
    borderLight: 'border-sky-200',
    borderDark: 'dark:border-sky-800/60',
    icon: Calendar,
    dotColor: 'bg-sky-500',
    description: 'Cita agendada pendiente de confirmación médica o clínica.',
  },
  confirmada: {
    label: 'Confirmada',
    bgLight: 'bg-emerald-50',
    bgDark: 'dark:bg-emerald-950/50',
    textLight: 'text-emerald-700',
    textDark: 'dark:text-emerald-300',
    borderLight: 'border-emerald-200',
    borderDark: 'dark:border-emerald-800/60',
    icon: CheckCircle2,
    dotColor: 'bg-emerald-500',
    description: 'Cita confirmada por el especialista o la clínica.',
  },
  pospuesta: {
    label: 'Pospuesta',
    bgLight: 'bg-amber-50',
    bgDark: 'dark:bg-amber-950/50',
    textLight: 'text-amber-700',
    textDark: 'dark:text-amber-300',
    borderLight: 'border-amber-200',
    borderDark: 'dark:border-amber-800/60',
    icon: Clock,
    dotColor: 'bg-amber-500',
    description: 'Cita reprogramada para una fecha u hora posterior.',
  },
  completada: {
    label: 'Completada',
    bgLight: 'bg-indigo-50',
    bgDark: 'dark:bg-indigo-950/50',
    textLight: 'text-indigo-700',
    textDark: 'dark:text-indigo-300',
    borderLight: 'border-indigo-200',
    borderDark: 'dark:border-indigo-800/60',
    icon: Award,
    dotColor: 'bg-indigo-500',
    description: 'Atención finalizada. Otorga puntos de lealtad y envía invitación a reseña.',
  },
  cancelada: {
    label: 'Cancelada',
    bgLight: 'bg-slate-100',
    bgDark: 'dark:bg-slate-800/60',
    textLight: 'text-slate-600',
    textDark: 'dark:text-slate-400',
    borderLight: 'border-slate-200',
    borderDark: 'dark:border-slate-700',
    icon: XCircle,
    dotColor: 'bg-slate-400',
    description: 'Cita cancelada por el paciente o administración.',
  },
  rechazada: {
    label: 'Rechazada',
    bgLight: 'bg-rose-50',
    bgDark: 'dark:bg-rose-950/50',
    textLight: 'text-rose-700',
    textDark: 'dark:text-rose-300',
    borderLight: 'border-rose-200',
    borderDark: 'dark:border-rose-800/60',
    icon: X,
    dotColor: 'bg-rose-500',
    description: 'Cita declinada por falta de disponibilidad o conflicto de agenda.',
  },
  no_asistio: {
    label: 'No Asistió',
    bgLight: 'bg-purple-50',
    bgDark: 'dark:bg-purple-950/50',
    textLight: 'text-purple-700',
    textDark: 'dark:text-purple-300',
    borderLight: 'border-purple-200',
    borderDark: 'dark:border-purple-800/60',
    icon: AlertTriangle,
    dotColor: 'bg-purple-500',
    description: 'El paciente no se presentó en el horario acordado.',
  },
};

const ALL_ESTADOS: CitaEstado[] = [
  'programada',
  'confirmada',
  'pospuesta',
  'completada',
  'cancelada',
  'rechazada',
  'no_asistio',
];

// ─── Modalidad Icons & Labels ────────────────────────────────────────────────

function getModalidadBadge(modalidad: string) {
  const mod = modalidad?.toLowerCase();
  if (mod === 'virtual') {
    return {
      label: 'Virtual',
      icon: Video,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800/60',
    };
  }
  if (mod === 'domicilio') {
    return {
      label: 'A Domicilio',
      icon: Home,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60',
    };
  }
  return {
    label: 'Presencial',
    icon: Building2,
    color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800/60',
  };
}

// ─── Details Modal ──────────────────────────────────────────────────────────

function CitaDetailsModal({
  cita,
  open,
  onClose,
  onCambiarEstado,
}: {
  cita: CitaListDto | null;
  open: boolean;
  onClose: () => void;
  onCambiarEstado: (citaId: string, estado: CitaEstado) => void;
}) {
  if (!open || !cita) return null;

  const cfg = ESTADOS_CONFIG[cita.ctaEstado] || ESTADOS_CONFIG.programada;
  const modBadge = getModalidadBadge(cita.ctaModalidad);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#1E293B] shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-5 border-b border-slate-100 dark:border-slate-800 gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.bgLight} ${cfg.bgDark} ${cfg.textLight} ${cfg.textDark} ${cfg.borderLight} ${cfg.borderDark}`}
                >
                  <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                  {cfg.label}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${modBadge.color}`}
                >
                  <modBadge.icon className="w-3.5 h-3.5" />
                  {modBadge.label}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Cita Médica #{cita.ctaCodigo.substring(0, 8)}
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                ID completo: <span className="font-mono text-slate-500 dark:text-slate-400">{cita.ctaCodigo}</span>
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="py-6 space-y-6">
            {/* Grid Paciente y Médico */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Paciente */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  Paciente
                </div>
                <p className="text-base font-black text-slate-900 dark:text-white leading-tight">
                  {cita.pacienteNombre}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Código: <span className="font-mono text-[11px]">{cita.ctaCodpac}</span>
                </p>
              </div>

              {/* Médico */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  <Stethoscope className="w-3.5 h-3.5 text-indigo-500" />
                  Médico Especialista
                </div>
                <p className="text-base font-black text-slate-900 dark:text-white leading-tight">
                  {cita.medicoNombre}
                </p>
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {cita.medicoEspecialidad}
                </p>
              </div>
            </div>

            {/* Fecha, Hora y Precio */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <p className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500">Fecha</p>
                <div className="flex items-center gap-1.5 mt-1 font-bold text-sm text-slate-800 dark:text-slate-200">
                  <Calendar className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>{cita.ctaFecha ? cita.ctaFecha.split('T')[0] : '—'}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <p className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500">Hora</p>
                <div className="flex items-center gap-1.5 mt-1 font-bold text-sm text-slate-800 dark:text-slate-200">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{cita.ctaHora || '—'}</span>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <p className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500">Precio Base</p>
                <div className="flex items-center gap-1 mt-1 font-black text-sm text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-4 h-4 shrink-0" />
                  <span>Q{cita.ctaPrecio ? Number(cita.ctaPrecio).toFixed(2) : '0.00'}</span>
                </div>
              </div>
            </div>

            {/* Ubicación / Videollamada / Domicilio */}
            {cita.clinicaNombre && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs">
                <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  Clínica: {cita.clinicaNombre}
                </p>
                {cita.cliUrlGoogleMaps && (
                  <a
                    href={cita.cliUrlGoogleMaps}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline mt-1 font-medium"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Abrir en Google Maps
                  </a>
                )}
              </div>
            )}

            {cita.direccionDomicilio && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs">
                <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                  <Home className="w-4 h-4 text-emerald-500" />
                  Dirección de Visita:
                </p>
                <p className="text-slate-600 dark:text-slate-400">{cita.direccionDomicilio}</p>
                {cita.referenciasDomicilio && (
                  <p className="text-slate-400 text-[11px] mt-1">Ref: {cita.referenciasDomicilio}</p>
                )}
              </div>
            )}

            {cita.enlaceVideollamada && (
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 text-xs">
                <p className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5 mb-1">
                  <Video className="w-4 h-4 text-purple-600" />
                  Enlace Videollamada:
                </p>
                <a
                  href={cita.enlaceVideollamada}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-700 dark:text-purple-400 underline font-mono break-all"
                >
                  {cita.enlaceVideollamada}
                </a>
              </div>
            )}

            {/* Motivo de Consulta */}
            {cita.ctaMotivo && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs">
                <p className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Motivo de la Consulta:
                </p>
                <p className="text-slate-600 dark:text-slate-400 italic">"{cita.ctaMotivo}"</p>
              </div>
            )}

            {/* Estado de Reseña & Lealtad */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Invitación a Reseña:</span>
              </div>
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full ${
                  cita.ctaNotificacionResenaEnviada
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {cita.ctaNotificacionResenaEnviada ? 'Enviada' : 'No Enviada'}
              </span>
            </div>

            {/* Cambio rápido de estado */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-500" />
                Cambiar Estado de la Cita:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ALL_ESTADOS.map((st) => {
                  const itemCfg = ESTADOS_CONFIG[st];
                  const isCurrent = cita.ctaEstado === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={isCurrent}
                      onClick={() => onCambiarEstado(cita.ctaCodigo, st)}
                      className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold border transition-all ${
                        isCurrent
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm opacity-90 cursor-default'
                          : `${itemCfg.bgLight} ${itemCfg.bgDark} ${itemCfg.textLight} ${itemCfg.textDark} ${itemCfg.borderLight} ${itemCfg.borderDark} hover:scale-102 hover:shadow-xs active:scale-98 cursor-pointer`
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${itemCfg.dotColor}`} />
                      <span className="truncate">{itemCfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── Main Admin Page Component ──────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const { data: citas = [], isLoading, isFetching, refetch } = useAdminCitas();
  const cambiarEstadoMutation = useCambiarEstadoCita();

  // Estados de filtros locales
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<string>('todos');
  const [selectedModalidad, setSelectedModalidad] = useState<string>('todas');
  const [selectedCitaModal, setSelectedCitaModal] = useState<CitaListDto | null>(null);

  // Ejecución de cambio de estado con confirmación SweetAlert2
  const handleCambiarEstado = useCallback(
    async (citaId: string, nuevoEstado: CitaEstado) => {
      const targetCfg = ESTADOS_CONFIG[nuevoEstado];
      const cita = citas.find((c) => c.ctaCodigo === citaId);
      const pacienteName = cita?.pacienteNombre || 'el paciente';

      let confirmText = `¿Estás seguro de cambiar el estado de la cita a "${targetCfg.label}"?`;
      let extraHtml = '';

      if (nuevoEstado === 'completada') {
        extraHtml = `
          <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 12px; text-align: left; color: #3730a3; font-size: 12px; margin-top: 10px;">
            <p style="font-weight: bold; margin-bottom: 4px;">✨ Acciones automáticas del backend:</p>
            <ul style="list-style-type: disc; padding-left: 16px; margin: 0; line-height: 1.5;">
              <li>Se otorgarán los puntos de lealtad al paciente.</li>
              <li>Se enviará una notificación en tiempo real (SignalR).</li>
              <li>Se despachará el correo electrónico con la invitación a dejar reseña.</li>
            </ul>
          </div>
        `;
      } else if (nuevoEstado === 'cancelada' || nuevoEstado === 'rechazada') {
        extraHtml = `
          <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 12px; text-align: left; color: #9f1239; font-size: 12px; margin-top: 10px;">
            <p style="margin: 0;">La cita quedará marcada como no realizada.</p>
          </div>
        `;
      }

      const result = await Swal.fire({
        title: `Cambiar a ${targetCfg.label}`,
        html: `
          <div style="font-size: 13px; color: #475569; text-align: left;">
            <p>Cita para <strong>${pacienteName}</strong>.</p>
            <p style="margin-top: 6px;">${confirmText}</p>
            ${extraHtml}
          </div>
        `,
        icon: nuevoEstado === 'completada' ? 'question' : 'warning',
        showCancelButton: true,
        confirmButtonText: `Sí, marcar como ${targetCfg.label}`,
        cancelButtonText: 'Cancelar',
        confirmButtonColor: nuevoEstado === 'completada' ? '#4f46e5' : '#2563eb',
        cancelButtonColor: '#64748b',
        customClass: {
          popup: 'rounded-3xl',
          confirmButton: 'rounded-xl px-4 py-2 font-bold',
          cancelButton: 'rounded-xl px-4 py-2 font-semibold',
        },
      });

      if (!result.isConfirmed) return;

      await cambiarEstadoMutation.mutateAsync({
        citaId,
        nuevoEstado,
      });

      if (selectedCitaModal && selectedCitaModal.ctaCodigo === citaId) {
        setSelectedCitaModal((prev) => (prev ? { ...prev, ctaEstado: nuevoEstado } : null));
      }
    },
    [citas, cambiarEstadoMutation, selectedCitaModal]
  );

  // Estadísticas calculadas
  const stats = useMemo(() => {
    const total = citas.length;
    const programadas = citas.filter((c) => c.ctaEstado === 'programada').length;
    const confirmadas = citas.filter((c) => c.ctaEstado === 'confirmada').length;
    const completadas = citas.filter((c) => c.ctaEstado === 'completada').length;
    const canceladas = citas.filter((c) => c.ctaEstado === 'cancelada' || c.ctaEstado === 'rechazada').length;
    const noAsistio = citas.filter((c) => c.ctaEstado === 'no_asistio').length;
    const pospuestas = citas.filter((c) => c.ctaEstado === 'pospuesta').length;

    return {
      total,
      programadas,
      confirmadas,
      completadas,
      canceladas,
      noAsistio,
      pospuestas,
    };
  }, [citas]);

  // Citas filtradas
  const filteredCitas = useMemo(() => {
    return citas.filter((c) => {
      // Búsqueda de texto
      const query = searchTerm.toLowerCase().trim();
      if (query) {
        const matchesName = c.pacienteNombre?.toLowerCase().includes(query);
        const matchesDoc = c.medicoNombre?.toLowerCase().includes(query);
        const matchesEsp = c.medicoEspecialidad?.toLowerCase().includes(query);
        const matchesClinica = c.clinicaNombre?.toLowerCase().includes(query);
        const matchesId = c.ctaCodigo?.toLowerCase().includes(query);
        const matchesMotivo = c.ctaMotivo?.toLowerCase().includes(query);

        if (!matchesName && !matchesDoc && !matchesEsp && !matchesClinica && !matchesId && !matchesMotivo) {
          return false;
        }
      }

      // Filtro por Estado
      if (selectedEstado !== 'todos' && c.ctaEstado !== selectedEstado) {
        return false;
      }

      // Filtro por Modalidad
      if (selectedModalidad !== 'todas' && c.ctaModalidad?.toLowerCase() !== selectedModalidad) {
        return false;
      }

      return true;
    });
  }, [citas, searchTerm, selectedEstado, selectedModalidad]);

  if (status === 'loading' || (isLoading && citas.length === 0)) {
    return <NeoLoader />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Modal de detalles */}
      <CitaDetailsModal
        cita={selectedCitaModal}
        open={Boolean(selectedCitaModal)}
        onClose={() => setSelectedCitaModal(null)}
        onCambiarEstado={handleCambiarEstado}
      />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  NeoClínica
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs">
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Portal de Administración de Citas y Estados Clínicos
              </p>
            </div>
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Actualizar citas en tiempo real"
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden md:inline">{isFetching ? 'Actualizando...' : 'Actualizar'}</span>
            </button>

            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {session?.user?.name || 'Administrador'}
              </span>
              <span className="text-[11px] text-slate-400">admin@admin.com</span>
            </div>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors shadow-2xs active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
        {/* Banner Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl shadow-indigo-950/20">
          <div className="relative z-10 max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Gestión Integral de Flujo de Citas
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Control Maestro de Citas y Estados
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl font-medium">
              Supervisa y modifica el estado de cualquier cita médica en tiempo real. Al marcar como <strong>Completada</strong>, el sistema activa automáticamente los puntos de lealtad y el envío de encuestas de satisfacción.
            </p>
          </div>

          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-10 translate-y-10">
            <Activity className="w-80 h-80 text-white" />
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Total */}
          <div
            onClick={() => setSelectedEstado('todos')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedEstado === 'todos'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 scale-102'
                : 'bg-white dark:bg-[#1E293B] border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-blue-400'
            }`}
          >
            <p className={`text-[10px] font-extrabold uppercase tracking-wider ${selectedEstado === 'todos' ? 'text-blue-100' : 'text-slate-400'}`}>
              Total Citas
            </p>
            <p className="text-2xl font-black mt-1">{stats.total}</p>
          </div>

          {/* Programadas */}
          <div
            onClick={() => setSelectedEstado('programada')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedEstado === 'programada'
                ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-500/20 scale-102'
                : 'bg-white dark:bg-[#1E293B] border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-sky-400'
            }`}
          >
            <p className={`text-[10px] font-extrabold uppercase tracking-wider ${selectedEstado === 'programada' ? 'text-sky-100' : 'text-sky-600 dark:text-sky-400'}`}>
              Programadas
            </p>
            <p className="text-2xl font-black mt-1">{stats.programadas}</p>
          </div>

          {/* Confirmadas */}
          <div
            onClick={() => setSelectedEstado('confirmada')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedEstado === 'confirmada'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20 scale-102'
                : 'bg-white dark:bg-[#1E293B] border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-emerald-400'
            }`}
          >
            <p className={`text-[10px] font-extrabold uppercase tracking-wider ${selectedEstado === 'confirmada' ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
              Confirmadas
            </p>
            <p className="text-2xl font-black mt-1">{stats.confirmadas}</p>
          </div>

          {/* Completadas */}
          <div
            onClick={() => setSelectedEstado('completada')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedEstado === 'completada'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 scale-102'
                : 'bg-white dark:bg-[#1E293B] border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-400'
            }`}
          >
            <p className={`text-[10px] font-extrabold uppercase tracking-wider ${selectedEstado === 'completada' ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-400'}`}>
              Completadas
            </p>
            <p className="text-2xl font-black mt-1">{stats.completadas}</p>
          </div>

          {/* Canceladas */}
          <div
            onClick={() => setSelectedEstado('cancelada')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedEstado === 'cancelada'
                ? 'bg-slate-700 text-white border-slate-700 shadow-md scale-102'
                : 'bg-white dark:bg-[#1E293B] border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-400'
            }`}
          >
            <p className={`text-[10px] font-extrabold uppercase tracking-wider ${selectedEstado === 'cancelada' ? 'text-slate-200' : 'text-slate-500'}`}>
              Canceladas
            </p>
            <p className="text-2xl font-black mt-1">{stats.canceladas}</p>
          </div>

          {/* No Asistió */}
          <div
            onClick={() => setSelectedEstado('no_asistio')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedEstado === 'no_asistio'
                ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20 scale-102'
                : 'bg-white dark:bg-[#1E293B] border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-purple-400'
            }`}
          >
            <p className={`text-[10px] font-extrabold uppercase tracking-wider ${selectedEstado === 'no_asistio' ? 'text-purple-100' : 'text-purple-600 dark:text-purple-400'}`}>
              No Asistió
            </p>
            <p className="text-2xl font-black mt-1">{stats.noAsistio}</p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por paciente, médico, especialidad, clínica o código..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30"
              />
            </div>

            {/* Modalidad Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">Modalidad:</label>
              <select
                value={selectedModalidad}
                onChange={(e) => setSelectedModalidad(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="todas">Todas las modalidades</option>
                <option value="presencial">Presencial</option>
                <option value="virtual">Virtual</option>
                <option value="domicilio">A Domicilio</option>
              </select>
            </div>
          </div>

          {/* Quick Estado Filters Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedEstado('todos')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors shrink-0 ${
                selectedEstado === 'todos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todos ({citas.length})
            </button>
            {ALL_ESTADOS.map((st) => {
              const cfg = ESTADOS_CONFIG[st];
              const count = citas.filter((c) => c.ctaEstado === st).length;
              const isSelected = selectedEstado === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedEstado(st)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                  <span>{cfg.label}</span>
                  <span className="opacity-70 text-[11px]">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Citas List */}
        {filteredCitas.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No se encontraron citas</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Intenta ajustar los términos de búsqueda o cambiar los filtros de estado y modalidad.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Mostrando <span className="text-slate-900 dark:text-white font-black">{filteredCitas.length}</span> cita(s)
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredCitas.map((cita) => {
                const cfg = ESTADOS_CONFIG[cita.ctaEstado] || ESTADOS_CONFIG.programada;
                const modBadge = getModalidadBadge(cita.ctaModalidad);

                return (
                  <div
                    key={cita.ctaCodigo}
                    className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-4"
                  >
                    {/* Top Row: IDs, Badges & Price */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                          #{cita.ctaCodigo.substring(0, 8)}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.bgLight} ${cfg.bgDark} ${cfg.textLight} ${cfg.textDark} ${cfg.borderLight} ${cfg.borderDark}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                          {cfg.label}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${modBadge.color}`}
                        >
                          <modBadge.icon className="w-3 h-3" />
                          {modBadge.label}
                        </span>

                        {cita.ctaNotificacionResenaEnviada && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                            <Award className="w-3 h-3" />
                            Reseña Notificada
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="text-xs font-bold text-slate-400">Total:</span>
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                          Q{cita.ctaPrecio ? Number(cita.ctaPrecio).toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Paciente, Doctor, Date/Time */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Paciente */}
                      <div>
                        <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                          <User className="w-3 h-3 text-blue-500" />
                          Paciente
                        </p>
                        <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                          {cita.pacienteNombre}
                        </p>
                        {cita.ctaMotivo && (
                          <p className="text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            Motivo: "{cita.ctaMotivo}"
                          </p>
                        )}
                      </div>

                      {/* Médico */}
                      <div>
                        <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                          <Stethoscope className="w-3 h-3 text-indigo-500" />
                          Médico
                        </p>
                        <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                          {cita.medicoNombre}
                        </p>
                        <p className="text-indigo-600 dark:text-indigo-400 font-semibold truncate mt-0.5">
                          {cita.medicoEspecialidad}
                        </p>
                      </div>

                      {/* Horario & Ubicación */}
                      <div>
                        <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          Horario & Ubicación
                        </p>
                        <p className="text-slate-800 dark:text-slate-200 font-bold">
                          {cita.ctaFecha ? cita.ctaFecha.split('T')[0] : '—'} a las {cita.ctaHora || '—'}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {cita.clinicaNombre || cita.direccionDomicilio || (cita.enlaceVideollamada ? 'Videollamada Online' : 'Consulta médica')}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Row: Actions Bar & Status Switcher */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                      {/* Interactive Status Selector */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          Acción de Estado:
                        </span>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Quick buttons */}
                          {cita.ctaEstado !== 'confirmada' && (
                            <button
                              type="button"
                              onClick={() => handleCambiarEstado(cita.ctaCodigo, 'confirmada')}
                              disabled={cambiarEstadoMutation.isPending}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors"
                            >
                              Confirmar
                            </button>
                          )}

                          {cita.ctaEstado !== 'completada' && (
                            <button
                              type="button"
                              onClick={() => handleCambiarEstado(cita.ctaCodigo, 'completada')}
                              disabled={cambiarEstadoMutation.isPending}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors"
                            >
                              Completar
                            </button>
                          )}

                          {cita.ctaEstado !== 'no_asistio' && (
                            <button
                              type="button"
                              onClick={() => handleCambiarEstado(cita.ctaCodigo, 'no_asistio')}
                              disabled={cambiarEstadoMutation.isPending}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-colors"
                            >
                              No Asistió
                            </button>
                          )}

                          {cita.ctaEstado !== 'cancelada' && (
                            <button
                              type="button"
                              onClick={() => handleCambiarEstado(cita.ctaCodigo, 'cancelada')}
                              disabled={cambiarEstadoMutation.isPending}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                            >
                              Cancelar
                            </button>
                          )}

                          {/* Dropdown for other states */}
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleCambiarEstado(cita.ctaCodigo, e.target.value as CitaEstado);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                          >
                            <option value="">Más estados...</option>
                            {ALL_ESTADOS.filter(
                              (st) => !['confirmada', 'completada', 'no_asistio', 'cancelada'].includes(st)
                            ).map((st) => (
                              <option key={st} value={st}>
                                Marcar como {ESTADOS_CONFIG[st].label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Detail modal trigger */}
                      <button
                        type="button"
                        onClick={() => setSelectedCitaModal(cita)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs self-end lg:self-auto"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-500" />
                        <span>Ver Expediente / Detalles</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
