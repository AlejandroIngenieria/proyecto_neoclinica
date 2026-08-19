'use client';

import { Suspense, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import {
  UserPlus,
  Users,
  Calendar,
  User,
  Phone,
  Pencil,
  Trash2,
  X,
  Bell,
  ShieldCheck,
  Unlink,
  Droplets,
  Heart,
  Mail,
  AlertTriangle,
  Copy,
  FileText,
  ExternalLink,
  Eye,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Clock,
  History,
} from 'lucide-react';
import Swal from 'sweetalert2';

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
    <div className={`group relative flex flex-row overflow-hidden rounded-3xl bg-white dark:bg-[#1E293B] shadow-xl shadow-slate-900/5 border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl animate-in fade-in zoom-in-95 duration-500 w-[420px] max-w-full h-[250px] mx-auto ${
      isIndependiente
        ? 'border-indigo-200/80 dark:border-indigo-900/50 bg-slate-50/40 dark:bg-slate-900/40'
        : 'border-slate-200/80 dark:border-slate-800'
    }`}>
      {/* === CONTENEDOR DE FOTOGRAFÍA (Ancho Estricto 140px, Alto 100%, Selfies top center) === */}
      <div className="relative w-[140px] h-full shrink-0 bg-slate-900 overflow-hidden flex items-center justify-center">
        {paciente.pac_foto_perfil_url ? (
          <img
            src={paciente.pac_foto_perfil_url}
            alt={fullName}
            loading="lazy"
            className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-600">
            <User className="h-14 w-14 opacity-50" />
          </div>
        )}

        {/* Gradiente sutil sobre la imagen */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

        {/* Barra decorativa superior */}
        <div className={`absolute left-0 right-0 top-0 h-1 ${
          isIndependiente
            ? 'bg-gradient-to-r from-indigo-400 to-slate-400'
            : 'bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-500'
        }`} />

        {/* Badge parentesco / Independiente */}
        {isIndependiente ? (
          <span className="absolute left-2.5 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-indigo-400/40 bg-indigo-950/80 text-indigo-200 px-2 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wider shadow-xs backdrop-blur-md">
            <UserCheck className="w-2.5 h-2.5 text-indigo-400" />
            <span>Independiente</span>
          </span>
        ) : (
          <span
            className={`absolute left-2.5 top-3 z-10 inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${parentesco.badgeBg} ${parentesco.badgeText} ${parentesco.badgeBorder} shadow-xs backdrop-blur-md`}
          >
            {parentesco.label}
          </span>
        )}
      </div>

      {/* === CONTENEDOR DE INFORMACIÓN (Lado Derecho, flex:1, calc(100%-140px), min-w:0, Padding: 16px 20px) === */}
      <div className="flex-1 min-w-0 w-[calc(100%-140px)] h-full flex flex-col justify-between p-4 sm:px-5 sm:py-4 bg-white dark:bg-[#1E293B]">
        {/* Header con Nombre de Paciente (line-clamp-2) + Kebab Menu (dimensiones fijas 24px) */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3
                  className="text-base font-black tracking-tight text-slate-900 dark:text-white line-clamp-2 leading-snug break-words"
                  title={fullName}
                >
                  {fullName}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                {isTitular
                  ? 'Titular de la cuenta'
                  : isIndependiente
                  ? 'Cuenta Independiente (Histórico)'
                  : 'Paciente dependiente'}
              </p>
            </div>

            {/* Menú Kebab (⋮) con dimensiones fijas (24px x 24px) */}
            {!isTitular && (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors"
                  title="Más opciones"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-7 z-30 w-48 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                      {!isMinor && !isIndependiente && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onIndependizar(paciente);
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors text-left"
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
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
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

          {/* Grilla de datos (display: grid, repeat(2, 1fr), row-gap: 8px, col-gap: 12px) */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-2">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">EDAD</p>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Calendar className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                <span>{edad !== null ? `${edad} años` : <span className="text-[#94a3b8] font-normal italic text-xs">—</span>}</span>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">GÉNERO</p>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <User className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                <span className="capitalize">{paciente.pac_genero?.toLowerCase() || <span className="text-[#94a3b8] font-normal italic text-xs">—</span>}</span>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">SANGRE</p>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Droplets className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                <span>{paciente.pac_tipo_sangre || <span className="text-[#94a3b8] font-normal italic text-xs">—</span>}</span>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">TELÉFONO</p>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Phone className={`h-3.5 w-3.5 shrink-0 ${paciente.pac_celular ? 'text-sky-500' : 'text-slate-300'}`} />
                {paciente.pac_celular ? (
                  <span className="truncate">{paciente.pac_celular}</span>
                ) : (
                  <span className="text-[#94a3b8] font-normal italic text-xs">Sin teléfono</span>
                )}
              </div>
            </div>

            {isMinor && !isTitular && (
              <div className="col-span-2 mt-0.5">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">RESPONSABLE</p>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis block text-xs" title={titularName}>
                    {titularName || 'Sin asignar'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons (margin-top: auto, flex: 1 gap: 12px 50% cada uno) */}
        <div className="mt-auto flex items-center gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onViewDetails(paciente)}
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 transition-colors shadow-2xs"
            title="Ver detalles completos del paciente"
          >
            <Eye className="h-3.5 w-3.5 text-blue-500" />
            <span>Detalles</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(paciente)}
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 transition-colors shadow-2xs"
            title="Editar paciente"
          >
            <Pencil className="h-3.5 w-3.5 text-slate-500" />
            <span>Editar</span>
          </button>
        </div>
      </div>
    </div>
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-blue-500 overflow-hidden shrink-0 flex items-center justify-center text-blue-600 dark:text-blue-400 text-2xl font-black shadow-md">
              {paciente.pac_foto_perfil_url ? (
                <img src={paciente.pac_foto_perfil_url} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                getPacienteInitials(paciente)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${parentesco.badgeBg} ${parentesco.badgeText} ${parentesco.badgeBorder}`}>
                  {parentesco.label}
                </span>
                {isMinor && (
                  <span className="inline-block rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    Menor de Edad
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{fullName}</h2>
              <p className="text-xs text-slate-500 font-medium">Expediente de Paciente Afiliado</p>
            </div>
          </div>

          {/* Details Body */}
          <div className="space-y-6">
            
            {/* Section 1: Datos Personales */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Información Personal
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Fecha de Nacimiento</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{paciente.pac_fecha_nacimiento ? `${paciente.pac_fecha_nacimiento.split('T')[0]} (${edad} años)` : '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Género</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 capitalize">{paciente.pac_genero || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Tipo de Sangre</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{paciente.pac_tipo_sangre || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Ocupación</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{paciente.pac_ocupacion || '—'}</p>
                </div>
                <div className="col-span-2 sm:col-span-2">
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Responsable Principal</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{titularName || '—'}</p>
                </div>
              </div>
            </div>

            {/* Section 2: Contacto y Dirección */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contacto y Dirección
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Celular</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{paciente.pac_celular || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Teléfono Casa</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{paciente.pac_telefono_casa || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Teléfono Trabajo</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{paciente.pac_telefono_trabajo || '—'}</p>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Dirección Registrada</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {[paciente.pac_calle, paciente.pac_avenida, paciente.pac_numero_casa, paciente.pac_colonia, paciente.pac_zona ? `Zona ${paciente.pac_zona}` : null, paciente.pac_aldea].filter(Boolean).join(', ') || 'No especificada'}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: Contacto de Emergencia */}
            {(paciente.pac_contacto_emergencia_nombre || paciente.pac_contacto_emergencia_telefono) && (
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-3 flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Contacto de Emergencia
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/40 text-xs">
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[10px]">Nombre</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{paciente.pac_contacto_emergencia_nombre || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[10px]">Relación</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{paciente.pac_contacto_emergencia_relacion || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[10px]">Teléfono</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{paciente.pac_contacto_emergencia_telefono || '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: Documentación */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentación y Archivos
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Carné de seguro */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0F172A] border border-slate-100 dark:border-slate-800 text-xs">
                  <p className="text-slate-400 font-bold uppercase text-[10px] mb-2">Carné de Seguro Médico</p>
                  {paciente.pac_foto_carne_seguro ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-1">
                      <img src={paciente.pac_foto_carne_seguro} alt="Carné" className="w-full h-36 object-contain rounded-lg" />
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">No registrado</p>
                  )}
                </div>

                {/* Documento de Identificación */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0F172A] border border-slate-100 dark:border-slate-800 text-xs">
                  <p className="text-slate-400 font-bold uppercase text-[10px] mb-2">Documento de Identificación (DPI/Pasaporte)</p>
                  {paciente.pac_documento_identificacion_url ? (
                    <div className="space-y-2">
                      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-1">
                        {paciente.pac_documento_identificacion_url.toLowerCase().includes('.pdf') ? (
                          <iframe
                            src={paciente.pac_documento_identificacion_url}
                            title="Documento PDF"
                            className="w-full h-32 rounded-lg border border-slate-200"
                          />
                        ) : (
                          <img
                            src={paciente.pac_documento_identificacion_url}
                            alt="Documento de Identificación"
                            className="w-full h-32 object-contain rounded-lg"
                          />
                        )}
                      </div>
                      <a
                        href={paciente.pac_documento_identificacion_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
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
          <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors"
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="col-span-full flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-8 py-16 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50">
        <Users className="h-8 w-8 text-blue-500 dark:text-blue-400" />
      </div>
      <h3 className="mt-5 text-lg font-bold text-slate-800 dark:text-slate-200">
        Aún no tienes pacientes afiliados
      </h3>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
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
    try {
      // Confirmación con SweetAlert2 y advertencia clara de implicaciones
      const confirmResult = await Swal.fire({
        title: '¿Confirmar Independización?',
        html: `
          <div style="text-align: left; font-size: 13px; line-height: 1.5; color: #475569;">
            <p style="margin-bottom: 10px;">Estás a punto de convertir a <strong>${pacienteName}</strong> en un usuario titular independiente.</p>
            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 12px; color: #92400e; font-size: 12px;">
              <p style="font-weight: bold; margin-bottom: 6px;">⚠️ Implicaciones de esta acción:</p>
              <ul style="list-style-type: disc; padding-left: 16px; margin: 0; display: flex; flex-direction: column; gap: 4px;">
                <li>Se creará una cuenta titular asociada a <strong>${data.nuevoCorreo}</strong>.</li>
                <li>Se enviará un correo con credenciales temporales de acceso.</li>
                <li>${conservarHistorial ? '<strong>Se trasladará</strong> todo su historial médico, citas y recetas a su nueva cuenta.' : '<strong>NO se trasladará</strong> el historial de citas previas.'}</li>
                <li>El paciente quedará registrado en tu perfil como cuenta independiente (histórico).</li>
                <li>Ya no podrás agendar citas en su nombre desde tu perfil titular.</li>
              </ul>
            </div>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, independizar paciente',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#64748b',
        customClass: {
          popup: 'rounded-3xl',
          confirmButton: 'rounded-xl px-5 py-2.5 font-bold',
          cancelButton: 'rounded-xl px-5 py-2.5 font-semibold',
        },
      });

      if (!confirmResult.isConfirmed) return;

      await independizarMutation.mutateAsync({
        pacCodigo: paciente.pac_codigo,
        nuevoCorreo: data.nuevoCorreo,
        conservarHistorial,
      });

      reset();
      setConservarHistorial(true);
      onClose();

      Swal.fire({
        icon: 'success',
        title: 'Cuenta Independizada',
        text: `El paciente ${pacienteName} se ha independizado correctamente. Se ha enviado un correo con las credenciales temporales a ${data.nuevoCorreo}.`,
        confirmButtonColor: '#2563eb',
      });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.mensaje ||
        error?.response?.data ||
        error?.message ||
        'Ocurrió un error al intentar independizar la cuenta.';

      Swal.fire({
        icon: 'error',
        title: 'Error al independizar',
        text: typeof errorMessage === 'string' ? errorMessage : 'Error al procesar la solicitud.',
        confirmButtonColor: '#2563eb',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
              <Unlink className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Independizar Cuenta</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{pacienteName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-900 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p className="leading-relaxed text-xs sm:text-sm">
              Al independizar a este paciente, se creará un usuario titular propio y quedará en tu cuenta como registro histórico.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Correo Electrónico del Nuevo Usuario *
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
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/40"
              />
            </div>
            {errors.nuevoCorreo && (
              <p className="mt-1.5 text-xs text-rose-500">{errors.nuevoCorreo.message}</p>
            )}
          </div>

          {/* Opción de Conservar / Trasladar Historial */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 transition-colors">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={conservarHistorial}
                onChange={(e) => setConservarHistorial(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 dark:bg-slate-900 cursor-pointer"
              />
              <div className="text-xs sm:text-sm">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Trasladar historial médico (citas, recetas, archivos) a la nueva cuenta
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-xs block mt-0.5">
                  Permite que la nueva cuenta independiente conserve todas las consultas previas y archivos de atención.
                </span>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || independizarMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting || independizarMutation.isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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

function PacientesContent() {
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
      className="min-h-screen px-6 py-8 sm:px-8 lg:px-10 animate-in fade-in slide-in-from-bottom-4 duration-500"
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

      {/* Sticky Header Container (solo visible cuando el formulario NO está abierto) */}
      {!modalState.open && (
        <div className="sticky top-0 z-30 py-4 mb-6 backdrop-blur-md">
          {/* Header Title */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">Pacientes Afiliados</h1>
              <p className="mt-2 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl font-medium">
                Agrega los miembros de tu grupo familiar o dependientes para gestionar sus citas y expedientes desde tu cuenta.
              </p>
            </div>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 self-start rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:scale-95 sm:self-auto shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              Agregar Paciente
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
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Titular card */}
            {titular && (
              <PatientCard
                paciente={titular}
                isTitular
                titularName={titularName}
                index={0}
                onEdit={openEdit}
                onDelete={handleDelete}
                onIndependizar={() => {}}
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
            <div className="mt-10 pt-8 border-t border-slate-200/80 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Historial de Cuentas Independientes
                      </h2>
                      <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
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
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
                >
                  <span>{showIndependientes ? 'Ocultar cuentas independientes' : `Ver cuentas independientes (${dependientesIndependientes.length})`}</span>
                  {showIndependientes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
                    className="overflow-hidden pt-6"
                  >
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                      {dependientesIndependientes.map((dep, i) => (
                        <PatientCard
                          key={dep.pac_codigo}
                          paciente={dep}
                          isTitular={false}
                          titularName={titularName}
                          index={i}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                          onIndependizar={() => {}}
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

// ─── Default Export ──────────────────────────────────────────────────────────

export default function PacientesPage() {
  return (
    <Suspense fallback={<NeoLoader />}>
      <PacientesContent />
    </Suspense>
  );
}
