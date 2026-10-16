'use client';

import {
  ChevronDown,
  ChevronUp,
  UserCheck,
  Clock,
  History,
  User,
  Menu,
  Unlink,
  Trash2,
  Calendar,
  Droplets,
  Phone,
  ShieldCheck,
  Eye,
  Pencil,
  X,
  Heart,
  FileText,
  ExternalLink,
  Users,
  AlertTriangle,
  Mail,
  UserPlus,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { AnimatePresence, motion } from 'framer-motion';
import { useSession } from 'next-auth/react'; // Assuming this based on standard usage

import { NeoLoader } from '@/components/neo-loader';
import { DocumentDropzone } from '@/components/document-dropzone';
import { PacienteForm } from '@/components/paciente-form-modal';
import {
  usePacienteTitular,
  useCreateDependiente,
  useUpdatePaciente,
  useDeletePaciente,
  useIndependizarPaciente,
} from '@/hooks/use-pacientes';
import { useQuery } from '@tanstack/react-query';
import { getPaises, getDepartamentosPorPais, getMunicipiosPorDepartamento } from '@/lib/api-client';
import type { Paciente, Pais, Departamento, Municipio } from '@/types';
import {
  buildPacienteFullName,
  calcularEdad,
  getPacienteInitials,
  getParentescoInfo,
  PARENTESCO_MAP,
} from '@/types';
import { ImageDropzone } from '@/components/image-dropzone';

// ─── Form types ──────────────────────────────────────────────────────────────

type PacienteFormData = {
  pac_primer_nombre: string;
  pac_segundo_nombre: string;
  pac_primer_apellido: string;
  pac_segundo_apellido: string;
  pac_apellido_casado: string;
  pac_fecha_nacimiento: string;
  pac_genero: string;
  pac_tipo_sangre: string;
  pac_ocupacion: string;
  pac_celular: string;
  pac_telefono_casa: string;
  pac_telefono_trabajo: string;
  pac_pais_dir_id: string;
  pac_dep_dir_id: string;
  pac_mun_dir_id: string;
  pac_zona: string;
  pac_colonia: string;
  pac_avenida: string;
  pac_calle: string;
  pac_numero_casa: string;
  pac_aldea: string;
  codParentesco: string;
  pac_contacto_emergencia_nombre: string;
  pac_contacto_emergencia_relacion: string;
  pac_contacto_emergencia_telefono: string;
};

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const PARENTESCO_OPTIONS = [
  { value: '2', label: 'Cónyuge' },
  { value: '3', label: 'Hijo/a' },
  { value: '4', label: 'Padre/Madre' },
  { value: '5', label: 'Hermano/a' },
  { value: '6', label: 'Otro' },
];

// ─── Animations ──────────────────────────────────────────────────────────────

const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const modalVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: 20, scale: 0.97, transition: { duration: 0.2 } },
};

// ─── Patient Card ────────────────────────────────────────────────────────────

function PatientCard({
  paciente,
  isTitular,
  titularName,
  index,
  onEdit,
  onDelete,
  onIndependizar,
  onViewDetails,
}: {
  paciente: Paciente;
  isTitular: boolean;
  titularName: string;
  index: number;
  onEdit: (p: Paciente) => void;
  onDelete: (p: Paciente) => void;
  onIndependizar: (p: Paciente) => void;
  onViewDetails: (p: Paciente) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const fullName = buildPacienteFullName(paciente);
  const initials = getPacienteInitials(paciente);
  const edad = calcularEdad(paciente.pac_fecha_nacimiento);
  const isIndependiente = paciente.pac_estado === 'independizado' || paciente.pac_estado === 'independiente';
  const parentesco = isTitular
    ? getParentescoInfo(1)
    : getParentescoInfo(paciente.pac_codpar);
  const isMinor = edad !== null && edad < 18;

  return (
    <motion.div
      variants={cardVariants}
      custom={index}
      initial="hidden"
      animate="visible"
      className={`group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-[#1E293B] border transition-all duration-200 hover:-translate-y-0.5 p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] w-full h-full ${
        isIndependiente
          ? 'border-indigo-200/50 dark:border-indigo-900/40'
          : 'border-slate-200/40 dark:border-slate-800/60'
      }`}
    >
      <div className="space-y-3.5">
        {/* Cabecera: Avatar clínico + Nombre + Micro-indicador dot + Menú de opciones */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatar Clínico Minimalista */}
            <div className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-2xl overflow-hidden shrink-0 border border-slate-200/40 dark:border-slate-700/50 bg-[#EFF4FF] dark:bg-slate-800 flex items-center justify-center">
              {paciente.pac_foto_perfil_url ? (
                <img
                  src={paciente.pac_foto_perfil_url}
                  alt={fullName}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm sm:text-base font-bold text-[#006194] dark:text-sky-400">
                  {initials}
                </span>
              )}
            </div>

            {/* Nombre y Micro-indicadores semánticos */}
            <div className="min-w-0">
              <h3
                className="text-base font-semibold text-slate-900 dark:text-white leading-snug truncate"
                title={fullName}
              >
                {fullName}
              </h3>

              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {/* Micro-indicador de estado/parentesco con dot de 6px */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F1F4FA] dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isTitular
                        ? 'bg-[#0284C7]'
                        : isIndependiente
                        ? 'bg-[#6366F1]'
                        : 'bg-[#10B981]'
                    }`}
                  />
                  <span>
                    {isTitular
                      ? 'Titular'
                      : isIndependiente
                      ? 'Cuenta Independiente'
                      : parentesco.label}
                  </span>
                </span>

                {/* Micro-indicador si es menor de edad */}
                {isMinor && !isTitular && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shrink-0" />
                    <span>Menor de edad</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Menú Kebab (⋮) */}
          {!isTitular && (
            <div className="relative shrink-0">
              <button
                type="button"
                data-cy="btn-kebab-paciente"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-[#F1F4FA] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Más opciones"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-8 z-30 w-48 rounded-2xl border border-slate-200/50 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] animate-in fade-in zoom-in-95 duration-150">
                    {!isMinor && !isIndependiente && (
                      <button
                        type="button"
                        data-cy="btn-independizar-paciente"
                        onClick={() => {
                          setMenuOpen(false);
                          onIndependizar(paciente);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#006194] dark:text-sky-400 hover:bg-[#EFF4FF] dark:hover:bg-slate-700/50 transition-colors text-left cursor-pointer"
                      >
                        <Unlink className="h-3.5 w-3.5" />
                        <span>Independizar Cuenta</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(paciente);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Eliminar Paciente</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Superficie Secundaria (Capa 1): Datos Clínicos */}
        <div className="rounded-xl bg-[#F8F9FE] dark:bg-slate-800/40 p-3 sm:p-3.5 border border-slate-200/30 dark:border-slate-800/50 grid grid-cols-2 gap-x-3 gap-y-2.5">
          {/* Edad */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-0.5">
              EDAD
            </p>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-slate-100">
              <Calendar className="h-3.5 w-3.5 text-[#0284C7] dark:text-sky-400 shrink-0" />
              <span>{edad !== null ? `${edad} años` : <span className="text-slate-400 font-normal italic">—</span>}</span>
            </div>
          </div>

          {/* Género */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-0.5">
              GÉNERO
            </p>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-slate-100">
              <User className="h-3.5 w-3.5 text-[#0284C7] dark:text-sky-400 shrink-0" />
              <span className="capitalize">{paciente.pac_genero?.toLowerCase() || <span className="text-slate-400 font-normal italic">—</span>}</span>
            </div>
          </div>

          {/* Sangre */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-0.5">
              SANGRE
            </p>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-slate-100">
              <Droplets className="h-3.5 w-3.5 text-[#0284C7] dark:text-sky-400 shrink-0" />
              <span>{paciente.pac_tipo_sangre || <span className="text-slate-400 font-normal italic">—</span>}</span>
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-0.5">
              TELÉFONO
            </p>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-slate-100">
              <Phone className={`h-3.5 w-3.5 shrink-0 ${paciente.pac_celular ? 'text-[#0284C7] dark:text-sky-400' : 'text-slate-300 dark:text-slate-600'}`} />
              {paciente.pac_celular ? (
                <span className="truncate">{paciente.pac_celular}</span>
              ) : (
                <span className="text-slate-400 font-normal italic text-xs">Sin teléfono</span>
              )}
            </div>
          </div>

          {/* Responsable (en caso de menor) */}
          {isMinor && !isTitular && (
            <div className="col-span-2 pt-1 border-t border-slate-200/30 dark:border-slate-700/40">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-0.5">
                RESPONSABLE
              </p>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-slate-100">
                <ShieldCheck className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                <span className="truncate" title={titularName}>
                  {titularName || 'Sin asignar'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Acciones Rápidas (Capa 1, rounded-xl) */}
      <div className="flex items-center gap-2.5 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80">
        <button
          type="button"
          onClick={() => onViewDetails(paciente)}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#F1F4FA] dark:bg-slate-800 hover:bg-[#EFF4FF] dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:text-[#006194] dark:hover:text-sky-400 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          title="Ver detalles completos del paciente"
        >
          <Eye className="h-3.5 w-3.5 text-[#0284C7] dark:text-sky-400" />
          <span>Detalles</span>
        </button>

        <button
          type="button"
          onClick={() => onEdit(paciente)}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#F1F4FA] dark:bg-slate-800 hover:bg-[#EFF4FF] dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:text-[#006194] dark:hover:text-sky-400 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          title="Editar paciente"
        >
          <Pencil className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
          <span>Editar</span>
        </button>
      </div>
    </motion.div>
  );
}

// ─── Patient Details Modal ──────────────────────────────────────────────────

function PatientDetailsModal({
  open,
  paciente,
  titularName,
  onClose,
}: {
  open: boolean;
  paciente: Paciente | null;
  titularName: string;
  onClose: () => void;
}) {
  if (!open || !paciente) return null;

  const fullName = buildPacienteFullName(paciente);
  const edad = calcularEdad(paciente.pac_fecha_nacimiento);
  const isMinor = edad !== null && edad < 18;
  const isTitular = paciente.pac_titular;
  const parentesco = isTitular ? getParentescoInfo(1) : getParentescoInfo(paciente.pac_codpar);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-5 sm:p-7 text-slate-900 dark:text-slate-100"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-[#F1F4FA] dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#EFF4FF] dark:bg-slate-800 border border-slate-200/40 dark:border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center text-[#006194] dark:text-sky-400 text-xl font-bold">
              {paciente.pac_foto_perfil_url ? (
                <img src={paciente.pac_foto_perfil_url} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                getPacienteInitials(paciente)
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F4FA] dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 text-xs font-medium">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isTitular ? 'bg-[#0284C7]' : 'bg-[#10B981]'}`} />
                  <span>{parentesco.label}</span>
                </span>
                {isMinor && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shrink-0" />
                    <span>Menor de Edad</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">{fullName}</h2>
              <p className="text-xs text-slate-500 font-medium">Expediente de Paciente Afiliado</p>
            </div>
          </div>

          {/* Details Body */}
          <div className="space-y-5">
            {/* Section 1: Datos Personales */}
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-[#0284C7] dark:text-sky-400" />
                Información Personal
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#F8F9FE] dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/40 dark:border-slate-800 text-xs">
                <div>
                  <p className="text-[#64748B] dark:text-slate-400 font-bold uppercase text-[10px] mb-0.5">Fecha de Nacimiento</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{paciente.pac_fecha_nacimiento ? `${paciente.pac_fecha_nacimiento.split('T')[0]} (${edad} años)` : '—'}</p>
                </div>
                <div>
                  <p className="text-[#64748B] dark:text-slate-400 font-bold uppercase text-[10px] mb-0.5">Género</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 capitalize">{paciente.pac_genero || '—'}</p>
                </div>
                <div>
                  <p className="text-[#64748B] dark:text-slate-400 font-bold uppercase text-[10px] mb-0.5">Tipo de Sangre</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{paciente.pac_tipo_sangre || '—'}</p>
                </div>
                <div>
                  <p className="text-[#64748B] dark:text-slate-400 font-bold uppercase text-[10px] mb-0.5">Ocupación</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{paciente.pac_ocupacion || '—'}</p>
                </div>
                <div className="col-span-2 sm:col-span-2">
                  <p className="text-[#64748B] dark:text-slate-400 font-bold uppercase text-[10px] mb-0.5">Responsable Principal</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{titularName || '—'}</p>
                </div>
              </div>
            </div>

            {/* Section 2: Contacto y Dirección */}
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-[#0284C7] dark:text-sky-400" />
                Contacto y Dirección
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8F9FE] dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/40 dark:border-slate-800 text-xs">
                <div>
                  <p className="text-[#64748B] dark:text-slate-400 font-bold uppercase text-[10px] mb-0.5">Celular</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{paciente.pac_celular || '—'}</p>
                </div>
                <div>
                  <p className="text-[#64748B] dark:text-slate-400 font-bold uppercase text-[10px] mb-0.5">Teléfono Casa</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{paciente.pac_telefono_casa || '—'}</p>
                </div>
                <div>
                  <p className="text-[#64748B] dark:text-slate-400 font-bold uppercase text-[10px] mb-0.5">Teléfono Trabajo</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{paciente.pac_telefono_trabajo || '—'}</p>
                </div>
                <div>
                  <p className="text-[#64748B] dark:text-slate-400 font-bold uppercase text-[10px] mb-0.5">Aldea</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{paciente.pac_aldea || '—'}</p>
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <p className="text-[#64748B] dark:text-slate-400 font-bold uppercase text-[10px] mb-0.5">Dirección Registrada</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {[paciente.pac_calle, paciente.pac_avenida, paciente.pac_numero_casa, paciente.pac_colonia, paciente.pac_zona ? `Zona ${paciente.pac_zona}` : null, paciente.pac_aldea ? `Aldea ${paciente.pac_aldea}` : null].filter(Boolean).join(', ') || 'No especificada'}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: Contacto de Emergencia */}
            {(paciente.pac_contacto_emergencia_nombre || paciente.pac_contacto_emergencia_telefono) && (
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5" />
                  Contacto de Emergencia
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-rose-50/50 dark:bg-rose-950/20 p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/40 text-xs">
                  <div>
                    <p className="text-[#64748B] dark:text-slate-400 font-bold uppercase text-[10px] mb-0.5">Nombre</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{paciente.pac_contacto_emergencia_nombre || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[#64748B] dark:text-slate-400 font-bold uppercase text-[10px] mb-0.5">Relación</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{paciente.pac_contacto_emergencia_relacion || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[#64748B] dark:text-slate-400 font-bold uppercase text-[10px] mb-0.5">Teléfono</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{paciente.pac_contacto_emergencia_telefono || '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: Documentación */}
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#0284C7] dark:text-sky-400" />
                Documentación y Archivos
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Carné de seguro */}
                <div className="p-3.5 rounded-xl bg-[#F8F9FE] dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-800 text-xs">
                  <p className="text-[#64748B] dark:text-slate-400 font-bold uppercase text-[10px] mb-2">Carné de Seguro Médico</p>
                  {paciente.pac_foto_carne_seguro ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-700 bg-white p-1">
                      <img src={paciente.pac_foto_carne_seguro} alt="Carné" className="w-full h-32 object-contain rounded-lg" />
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">No registrado</p>
                  )}
                </div>

                {/* Documento de Identificación */}
                <div className="p-3.5 rounded-xl bg-[#F8F9FE] dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-800 text-xs">
                  <p className="text-[#64748B] dark:text-slate-400 font-bold uppercase text-[10px] mb-2">Documento de Identificación (DPI/Pasaporte)</p>
                  {paciente.pac_documento_identificacion_url ? (
                    <div className="space-y-2">
                      <div className="overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-700 bg-white p-1">
                        {paciente.pac_documento_identificacion_url.toLowerCase().includes('.pdf') ? (
                          <iframe
                            src={paciente.pac_documento_identificacion_url}
                            title="Documento PDF"
                            className="w-full h-28 rounded-lg border border-slate-200"
                          />
                        ) : (
                          <img
                            src={paciente.pac_documento_identificacion_url}
                            alt="Documento de Identificación"
                            className="w-full h-28 object-contain rounded-lg"
                          />
                        )}
                      </div>
                      <a
                        href={paciente.pac_documento_identificacion_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006194] dark:text-sky-400 hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Abrir Documento Completo</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">No se ha subido documento de identificación</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[#F1F4FA] dark:bg-slate-800 hover:bg-[#EFF4FF] dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-5 py-2 text-xs sm:text-sm font-semibold transition active:scale-95 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 px-6 py-14 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF4FF] dark:bg-slate-800 text-[#006194] dark:text-sky-400 mb-3">
        <Users className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
        Aún no tienes pacientes afiliados
      </h3>
      <p className="mt-1 max-w-sm text-xs sm:text-sm text-slate-500 dark:text-slate-400">
        Agrega los miembros de tu grupo familiar o dependientes para gestionar sus citas y expedientes desde tu cuenta.
      </p>
    </motion.div>
  );
}

// ─── Independizar Modal ──────────────────────────────────────────────────────

function IndependizarModal({
  open,
  paciente,
  onClose,
}: {
  open: boolean;
  paciente?: Paciente | null;
  onClose: () => void;
}) {
  const independizarMutation = useIndependizarPaciente();
  const [conservarHistorial, setConservarHistorial] = useState<boolean>(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ nuevoCorreo: string }>({
    defaultValues: { nuevoCorreo: '' },
  });

  if (!open || !paciente) return null;

  const pacienteName = buildPacienteFullName(paciente);

  const onSubmit = async (data: { nuevoCorreo: string }) => {
    const edad = calcularEdad(paciente.pac_fecha_nacimiento);
    if (edad !== null && edad < 18) {
      toast.error('Paciente menor de edad', {
        description: 'Un paciente menor de edad no puede independizarse como titular de una cuenta.',
      });
      return;
    }

    try {
      const res = await independizarMutation.mutateAsync({
        pacCodigo: paciente.pac_codigo,
        nuevoCorreo: data.nuevoCorreo,
        conservarHistorial,
      });

      if (res?.esCuentaExistente) {
        toast.success('¡Expediente Vinculado con Éxito!', {
          description: `El expediente de ${pacienteName} se ha vinculado a su cuenta existente (${data.nuevoCorreo}). No se requieren nuevas contraseñas.`,
        });
      } else {
        toast.success('¡Cuenta Independizada con Éxito!', {
          description: `El paciente ${pacienteName} se ha independizado correctamente. Se ha enviado un correo con las credenciales temporales a ${data.nuevoCorreo}.`,
        });
      }

      reset();
      setConservarHistorial(true);
      onClose();
    } catch (err: any) {
      toast.error('Error al independizar cuenta', {
        description: err?.message || 'Hubo un problema al procesar la solicitud.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 dark:bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-slate-200/50 dark:border-slate-800 text-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 bg-[#F8F9FE] dark:bg-slate-800/30 px-5 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFF4FF] dark:bg-slate-800 text-[#006194] dark:text-sky-400 border border-slate-200/40 dark:border-slate-700/60">
              <Unlink className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Independizar Cuenta</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{pacienteName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-[#F1F4FA] dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-sky-200/60 dark:border-sky-800/60 bg-[#EFF4FF]/60 dark:bg-sky-950/30 p-3.5 text-xs text-sky-950 dark:text-sky-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#006194] dark:text-sky-400 mt-0.5" />
            <p className="leading-relaxed">
              Al independizar a este paciente, se creará una cuenta titular propia o se unificará su expediente con su cuenta existente si ya está registrado en NeoClínica. En tu cuenta se conservará en modo consulta histórica.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
              Correo Electrónico de la Cuenta (Nueva o Existente) *
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                {...register('nuevoCorreo', {
                  required: 'El correo electrónico es obligatorio',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Ingresa un correo electrónico válido',
                  },
                })}
                placeholder="ejemplo@correo.com"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition focus:border-[#006194] focus:ring-1 focus:ring-[#006194]/20"
              />
            </div>
            {errors.nuevoCorreo && (
              <p className="mt-1 text-xs text-rose-500">{errors.nuevoCorreo.message}</p>
            )}
          </div>

          {/* Opción de Conservar / Trasladar Historial */}
          <div className="rounded-xl border border-slate-200/40 dark:border-slate-800 bg-[#F8F9FE] dark:bg-slate-800/40 p-3.5 transition-colors">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={conservarHistorial}
                onChange={(e) => setConservarHistorial(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-[#006194] focus:ring-[#006194] dark:bg-slate-900 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Trasladar historial médico (citas, recetas, archivos) a la nueva cuenta
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                  Permite que la nueva cuenta independiente conserve todas las consultas previas y archivos de atención.
                </span>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[#F1F4FA] dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-[#EFF4FF] transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || independizarMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#006194] hover:bg-[#00517c] px-4 py-2 text-xs font-semibold text-white shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting || independizarMutation.isPending ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : null}
              Confirmar y Enviar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Main Content ────────────────────────────────────────────────────────────

export default function PacientesContent() {
  const { data: session } = useSession();
  const { titular, dependientes, isLoading } = usePacienteTitular();

  const [showIndependientes, setShowIndependientes] = useState<boolean>(false);

  const dependientesActivos = useMemo(
    () => dependientes.filter((d) => d.pac_estado !== 'independizado' && d.pac_estado !== 'independiente'),
    [dependientes]
  );

  const dependientesIndependientes = useMemo(
    () => dependientes.filter((d) => d.pac_estado === 'independizado' || d.pac_estado === 'independiente'),
    [dependientes]
  );

  const [modalState, setModalState] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    paciente?: Paciente | null;
  }>({ open: false, mode: 'add', paciente: null });

  const [independizarState, setIndependizarState] = useState<{
    open: boolean;
    paciente: Paciente | null;
  }>({ open: false, paciente: null });

  const [detailsState, setDetailsState] = useState<{
    open: boolean;
    paciente: Paciente | null;
  }>({ open: false, paciente: null });

  const openDetails = useCallback((p: Paciente) => setDetailsState({ open: true, paciente: p }), []);
  const closeDetails = useCallback(() => setDetailsState({ open: false, paciente: null }), []);

  const openAdd = useCallback(() => setModalState({ open: true, mode: 'add', paciente: null }), []);
  const openEdit = useCallback(
    (p: Paciente) => setModalState({ open: true, mode: 'edit', paciente: p }),
    [],
  );
  const closeModal = useCallback(() => setModalState({ open: false, mode: 'add', paciente: null }), []);

  const openIndependizar = useCallback((p: Paciente) => {
    setIndependizarState({ open: true, paciente: p });
  }, []);

  const closeIndependizar = useCallback(() => {
    setIndependizarState({ open: false, paciente: null });
  }, []);

  const deleteMutation = useDeletePaciente();

  const handleDelete = useCallback((p: Paciente) => {
    if (confirm(`¿Estás seguro de que deseas eliminar a ${p.pac_primer_nombre}?`)) {
      deleteMutation.mutate({ titular: false, pacCodigo: p.pac_codusu });
    }
  }, [deleteMutation]);

  const titularName = titular ? buildPacienteFullName(titular) : '';

  const userName = session?.user?.name || 'Usuario';
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('');

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-3 border-blue-200 border-t-blue-600" />
          <p className="text-sm font-medium text-slate-400">Cargando pacientes…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <IndependizarModal
        open={independizarState.open}
        paciente={independizarState.paciente}
        onClose={closeIndependizar}
      />

      <PatientDetailsModal
        open={detailsState.open}
        paciente={detailsState.paciente}
        titularName={titularName}
        onClose={closeDetails}
      />

      {/* Header Container (solo visible cuando el formulario NO está abierto) */}
      {!modalState.open && (
        <div className="py-2 mb-6">
          {/* Header Title */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-1">
                Gestión Familiar
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Pacientes Afiliados
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl font-medium">
                Agrega los miembros de tu grupo familiar o dependientes para gestionar sus citas y expedientes desde tu cuenta.
              </p>
            </div>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 self-start rounded-xl bg-[#006194] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all hover:bg-[#00517c] active:scale-95 sm:self-auto shrink-0 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Agregar Paciente</span>
            </button>
          </div>
        </div>
      )}

      {/* Conditional rendering for form vs grid */}
      {modalState.open && titular ? (
        <PacienteForm
          key="paciente-form"
          mode={modalState.mode}
          paciente={modalState.paciente}
          titular={titular}
          titularCodigo={titular.pac_codigo}
          onClose={closeModal}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Titular card */}
            {titular && (
              <PatientCard
                paciente={titular}
                isTitular
                titularName={titularName}
                index={0}
                onEdit={openEdit}
                onDelete={handleDelete}
                onIndependizar={() => { }}
                onViewDetails={openDetails}
              />
            )}

            {/* Dependientes Activos */}
            {dependientesActivos.length > 0
              ? dependientesActivos.map((dep, i) => (
                <PatientCard
                  key={dep.pac_codigo}
                  paciente={dep}
                  isTitular={false}
                  titularName={titularName}
                  index={i + 1}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onIndependizar={openIndependizar}
                  onViewDetails={openDetails}
                />
              ))
              : !titular && <EmptyState />}

            {/* Show empty state when there's a titular but no active dependientes nor independent */}
            {titular && dependientesActivos.length === 0 && dependientesIndependientes.length === 0 && (
              <EmptyState />
            )}
          </div>

          {/* Sección de Cuentas Independientes (Registro Histórico) */}
          {dependientesIndependientes.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/40 dark:border-slate-800/60 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        Historial de Cuentas Independientes
                      </h2>
                      <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                        {dependientesIndependientes.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Registro de pacientes que fueron independizados y ahora gestionan su cuenta por separado.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowIndependientes((prev) => !prev)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F1F4FA] dark:bg-slate-800 hover:bg-[#EFF4FF] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <span>{showIndependientes ? 'Ocultar cuentas' : `Ver cuentas (${dependientesIndependientes.length})`}</span>
                  {showIndependientes ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Desplegable animado de independientes */}
              <AnimatePresence>
                {showIndependientes && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden pt-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                      {dependientesIndependientes.map((dep, i) => (
                        <PatientCard
                          key={dep.pac_codigo}
                          paciente={dep}
                          isTitular={false}
                          titularName={titularName}
                          index={i + dependientesActivos.length + 1}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                          onIndependizar={openIndependizar}
                          onViewDetails={openDetails}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );
}