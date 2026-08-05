'use client';

import { Suspense, useState, useCallback } from 'react';
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
} from 'lucide-react';
import Swal from 'sweetalert2';

import { NeoLoader } from '@/components/neo-loader';
import { DocumentDropzone } from '@/components/document-dropzone';
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
  const parentesco = isTitular
    ? getParentescoInfo(1)
    : getParentescoInfo(paciente.pac_codpar);
  const isMinor = edad !== null && edad < 18;

  return (
    <div className="group relative flex flex-row overflow-hidden rounded-3xl bg-white dark:bg-[#1E293B] shadow-xl shadow-slate-900/5 border border-slate-200/80 dark:border-slate-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl animate-in fade-in zoom-in-95 duration-500 w-[420px] max-w-full h-[250px] mx-auto">
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
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-500" />

        {/* Badge parentesco */}
        <span
          className={`absolute left-2.5 top-3 z-10 inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${parentesco.badgeBg} ${parentesco.badgeText} ${parentesco.badgeBorder} shadow-xs backdrop-blur-md`}
        >
          {parentesco.label}
        </span>
      </div>

      {/* === CONTENEDOR DE INFORMACIÓN (Lado Derecho, flex:1, calc(100%-140px), min-w:0, Padding: 16px 20px) === */}
      <div className="flex-1 min-w-0 w-[calc(100%-140px)] h-full flex flex-col justify-between p-4 sm:px-5 sm:py-4 bg-white dark:bg-[#1E293B]">
        {/* Header con Nombre de Paciente (line-clamp-2) + Kebab Menu (dimensiones fijas 24px) */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="min-w-0 flex-1">
              <h3
                className="text-base font-black tracking-tight text-slate-900 dark:text-white line-clamp-2 leading-snug break-words"
                title={fullName}
              >
                {fullName}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                {isTitular ? 'Titular de la cuenta' : `Paciente dependiente`}
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
                      {!isMinor && (
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="col-span-full flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white px-8 py-16 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
        <Users className="h-8 w-8 text-blue-400" />
      </div>
      <h3 className="mt-5 text-lg font-bold text-slate-800">
        Aún no tienes pacientes afiliados
      </h3>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        Agrega los miembros de tu grupo familiar o dependientes para gestionar sus citas y expedientes desde tu cuenta.
      </p>
      <button
        onClick={onAdd}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        <UserPlus className="h-4 w-4" />
        Agregar Paciente
      </button>
    </motion.div>
  );
}

// ─── Add / Edit Modal ────────────────────────────────────────────────────────

function PacienteForm({
  mode,
  paciente,
  titular,
  titularCodigo,
  onClose,
}: {
  mode: 'add' | 'edit';
  paciente?: Paciente | null;
  titular?: Paciente | null;
  titularCodigo: string;
  onClose: () => void;
}) {
  const createDep = useCreateDependiente();
  const updatePac = useUpdatePaciente();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PacienteFormData>({
    defaultValues: {
      pac_primer_nombre: paciente?.pac_primer_nombre ?? '',
      pac_segundo_nombre: paciente?.pac_segundo_nombre ?? '',
      pac_primer_apellido: paciente?.pac_primer_apellido ?? '',
      pac_segundo_apellido: paciente?.pac_segundo_apellido ?? '',
      pac_apellido_casado: paciente?.pac_apellido_casado ?? '',
      pac_fecha_nacimiento: paciente?.pac_fecha_nacimiento?.split('T')[0] ?? '',
      pac_genero: paciente?.pac_genero ?? '',
      pac_tipo_sangre: paciente?.pac_tipo_sangre ?? '',
      pac_ocupacion: paciente?.pac_ocupacion ?? '',
      pac_celular: paciente?.pac_celular ?? '',
      pac_telefono_casa: paciente?.pac_telefono_casa ?? '',
      pac_telefono_trabajo: paciente?.pac_telefono_trabajo ?? '',
      pac_pais_dir_id: paciente?.pac_pais_dir_id?.toString() ?? '',
      pac_dep_dir_id: paciente?.pac_dep_dir_id?.toString() ?? '',
      pac_mun_dir_id: paciente?.pac_mun_dir_id?.toString() ?? '',
      pac_zona: paciente?.pac_zona ?? '',
      pac_colonia: paciente?.pac_colonia ?? '',
      pac_avenida: paciente?.pac_avenida ?? '',
      pac_calle: paciente?.pac_calle ?? '',
      pac_numero_casa: paciente?.pac_numero_casa ?? '',
      codParentesco: mode === 'edit' ? (paciente?.pac_codpar?.toString() ?? '') : '',
      pac_contacto_emergencia_nombre: paciente?.pac_contacto_emergencia_nombre ?? '',
      pac_contacto_emergencia_relacion: paciente?.pac_contacto_emergencia_relacion ?? '',
      pac_contacto_emergencia_telefono: paciente?.pac_contacto_emergencia_telefono ?? '',
    },
  });

  const selectedPais = watch('pac_pais_dir_id');
  const selectedDep = watch('pac_dep_dir_id');

  // ─── Geographic data queries ───
  const { data: paisesRes } = useQuery({
    queryKey: ['paises'],
    queryFn: () => getPaises(),
    staleTime: 10 * 60 * 1000,
  });
  const paises: Pais[] = paisesRes?.data ?? [];

  const { data: depsRes } = useQuery({
    queryKey: ['departamentos', selectedPais],
    queryFn: () => getDepartamentosPorPais(Number(selectedPais)),
    enabled: !!selectedPais,
    staleTime: 10 * 60 * 1000,
  });
  const departamentos: Departamento[] = depsRes?.data ?? [];

  const { data: munsRes } = useQuery({
    queryKey: ['municipios', selectedDep],
    queryFn: () => getMunicipiosPorDepartamento(Number(selectedDep)),
    enabled: !!selectedDep,
    staleTime: 10 * 60 * 1000,
  });
  const municipios: Municipio[] = munsRes?.data ?? [];

  const handlePaisChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setValue('pac_pais_dir_id', e.target.value);
    setValue('pac_dep_dir_id', '');
    setValue('pac_mun_dir_id', '');
  }, [setValue]);

  const handleDepChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setValue('pac_dep_dir_id', e.target.value);
    setValue('pac_mun_dir_id', '');
  }, [setValue]);

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [selectedCarne, setSelectedCarne] = useState<File | null>(null);
  const [selectedDocumento, setSelectedDocumento] = useState<File | null>(null);

  const handleCopyTitularData = useCallback(() => {
    if (!titular) return;
    setValue('pac_celular', titular.pac_celular || '');
    setValue('pac_telefono_casa', titular.pac_telefono_casa || '');
    setValue('pac_telefono_trabajo', titular.pac_telefono_trabajo || '');
    setValue('pac_pais_dir_id', titular.pac_pais_dir_id?.toString() || '');
    setValue('pac_dep_dir_id', titular.pac_dep_dir_id?.toString() || '');
    setValue('pac_mun_dir_id', titular.pac_mun_dir_id?.toString() || '');
    setValue('pac_zona', titular.pac_zona || '');
    setValue('pac_colonia', titular.pac_colonia || '');
    setValue('pac_avenida', titular.pac_avenida || '');
    setValue('pac_calle', titular.pac_calle || '');
    setValue('pac_numero_casa', titular.pac_numero_casa || '');
    setValue('pac_contacto_emergencia_nombre', titular.pac_contacto_emergencia_nombre || '');
    setValue('pac_contacto_emergencia_relacion', titular.pac_contacto_emergencia_relacion || '');
    setValue('pac_contacto_emergencia_telefono', titular.pac_contacto_emergencia_telefono || '');
  }, [titular, setValue]);

  const onSubmit = async (data: PacienteFormData) => {
    const formData = new FormData();

    const appendSeguro = (key: string, value: any) => {
      if (value !== null && value !== undefined && value !== '' && value !== 'null' && value !== 'undefined') {
        if (key.endsWith('Id') && (value === 0 || value === '0')) return;
        formData.append(key, value.toString().trim());
      }
    };

    appendSeguro('PrimerNombre', data.pac_primer_nombre || paciente?.pac_primer_nombre);
    appendSeguro('SegundoNombre', data.pac_segundo_nombre || paciente?.pac_segundo_nombre);
    appendSeguro('PrimerApellido', data.pac_primer_apellido || paciente?.pac_primer_apellido);
    appendSeguro('SegundoApellido', data.pac_segundo_apellido || paciente?.pac_segundo_apellido);
    appendSeguro('ApellidoCasado', data.pac_apellido_casado || paciente?.pac_apellido_casado);
    
    const fechaNac = data.pac_fecha_nacimiento || paciente?.pac_fecha_nacimiento;
    if (fechaNac) {
      appendSeguro('FechaNacimiento', fechaNac.split('T')[0]);
    }

    appendSeguro('Genero', data.pac_genero || paciente?.pac_genero);
    appendSeguro('TipoSangre', data.pac_tipo_sangre || paciente?.pac_tipo_sangre);
    appendSeguro('Ocupacion', data.pac_ocupacion || paciente?.pac_ocupacion);

    appendSeguro('PaisNacId', paciente?.pac_pais_nac_id);
    appendSeguro('DepNacId', paciente?.pac_dep_nac_id);
    appendSeguro('MunNacId', paciente?.pac_mun_nac_id);
    appendSeguro('PaisDirId', data.pac_pais_dir_id || paciente?.pac_pais_dir_id);
    appendSeguro('DepDirId', data.pac_dep_dir_id || paciente?.pac_dep_dir_id);
    appendSeguro('MunDirId', data.pac_mun_dir_id || paciente?.pac_mun_dir_id);

    appendSeguro('Aldea', paciente?.pac_aldea);
    appendSeguro('Zona', data.pac_zona || paciente?.pac_zona);
    appendSeguro('Colonia', data.pac_colonia || paciente?.pac_colonia);
    appendSeguro('Avenida', data.pac_avenida || paciente?.pac_avenida);
    appendSeguro('Calle', data.pac_calle || paciente?.pac_calle);
    appendSeguro('NumeroCasa', data.pac_numero_casa || paciente?.pac_numero_casa);
    appendSeguro('Celular', data.pac_celular || paciente?.pac_celular);
    appendSeguro('TelefonoCasa', data.pac_telefono_casa || paciente?.pac_telefono_casa);
    appendSeguro('TelefonoTrabajo', data.pac_telefono_trabajo || paciente?.pac_telefono_trabajo);
    appendSeguro('ContactoEmergenciaNombre', data.pac_contacto_emergencia_nombre || paciente?.pac_contacto_emergencia_nombre);
    appendSeguro('ContactoEmergenciaRelacion', data.pac_contacto_emergencia_relacion || paciente?.pac_contacto_emergencia_relacion);
    appendSeguro('ContactoEmergenciaTelefono', data.pac_contacto_emergencia_telefono || paciente?.pac_contacto_emergencia_telefono);

    if (selectedPhoto) {
      formData.append('FotoPerfilArchivo', selectedPhoto);
    }
    if (selectedCarne) {
      formData.append('FotoCarneArchivo', selectedCarne);
    }
    if (selectedDocumento) {
      formData.append('documentoIdentificacionArchivo', selectedDocumento);
    }

    if (mode === 'add') {
      // El backend espera estos campos dentro del FormData ([FromForm]), no como query params
      formData.append('TitularCodigo', titularCodigo);
      formData.append('CodParentesco', data.codParentesco);

      await createDep.mutateAsync({
        body: formData,
      });
    } else if (paciente) {
      await updatePac.mutateAsync({
        pacCodigo: paciente.pac_codigo,
        body: formData,
      });
    }

    onClose();
  };

  const inputClasses =
    'w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100';
  const labelClasses = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500';

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full max-w-4xl mx-auto rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5 sm:px-8">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900">
            {mode === 'add' ? 'Agregar Paciente' : 'Editar Paciente'}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {mode === 'add'
              ? 'Completa los datos del nuevo paciente.'
              : 'Modifica la información del paciente.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body */}
      <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-8 sm:px-10">
        
        {/* Profile Photo */}
        <div className="mb-10 flex flex-col items-center justify-center">
          <div className="w-full max-w-md">
            <ImageDropzone 
              label="Foto de Perfil" 
              initialImageUrl={paciente?.pac_foto_perfil_url}
              onImageDrop={(file) => setSelectedPhoto(file)} 
            />
          </div>
        </div>

        {/* Section: Datos Personales */}
        <fieldset className="mb-8">
          <legend className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-blue-600">
            <User className="h-4 w-4" />
            Datos Personales
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>
                <label className={labelClasses}>Primer nombre *</label>
                <input
                  {...register('pac_primer_nombre', { required: 'Campo requerido' })}
                  className={inputClasses}
                  placeholder="Ej: María"
                />
                {errors.pac_primer_nombre && (
                  <p className="mt-1 text-xs text-rose-500">{errors.pac_primer_nombre.message}</p>
                )}
              </div>
              <div>
                <label className={labelClasses}>Segundo nombre</label>
                <input
                  {...register('pac_segundo_nombre')}
                  className={inputClasses}
                  placeholder="Ej: Elena"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <label className={labelClasses}>Primer apellido *</label>
                <input
                  {...register('pac_primer_apellido', { required: 'Campo requerido' })}
                  className={inputClasses}
                  placeholder="Ej: López"
                />
                {errors.pac_primer_apellido && (
                  <p className="mt-1 text-xs text-rose-500">{errors.pac_primer_apellido.message}</p>
                )}
              </div>
              <div>
                <label className={labelClasses}>Segundo apellido</label>
                <input
                  {...register('pac_segundo_apellido')}
                  className={inputClasses}
                  placeholder="Ej: Pérez"
                />
              </div>
              <div>
                <label className={labelClasses}>Apellido de casada/o</label>
                <input
                  {...register('pac_apellido_casado')}
                  className={inputClasses}
                  placeholder="Ej: García"
                />
              </div>
            </div>

            {/* Date + Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Fecha de nacimiento *</label>
                <input
                  type="date"
                  {...register('pac_fecha_nacimiento', { required: 'Campo requerido' })}
                  className={inputClasses}
                />
                {errors.pac_fecha_nacimiento && (
                  <p className="mt-1 text-xs text-rose-500">{errors.pac_fecha_nacimiento.message}</p>
                )}
              </div>
              <div>
                <label className={labelClasses}>Género *</label>
                <select
                  {...register('pac_genero', { required: 'Campo requerido' })}
                  className={inputClasses}
                >
                  <option value="">Seleccionar</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                </select>
                {errors.pac_genero && (
                  <p className="mt-1 text-xs text-rose-500">{errors.pac_genero.message}</p>
                )}
              </div>
            </div>

            {/* Blood type + Parentesco */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Tipo de sangre</label>
                <select {...register('pac_tipo_sangre')} className={inputClasses}>
                  <option value="">Seleccionar</option>
                  {BLOOD_TYPES.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </div>

              {mode === 'add' && (
                <div>
                  <label className={labelClasses}>Parentesco *</label>
                  <select
                    {...register('codParentesco', { required: mode === 'add' ? 'Campo requerido' : false })}
                    className={inputClasses}
                  >
                    <option value="">Seleccionar</option>
                    {PARENTESCO_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  {errors.codParentesco && (
                    <p className="mt-1 text-xs text-rose-500">{errors.codParentesco.message}</p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClasses}>Ocupación</label>
                <input
                  {...register('pac_ocupacion')}
                  className={inputClasses}
                  placeholder="Ej: Ingeniero, Estudiante"
                />
              </div>
            </div>
        </fieldset>

        {/* Autofill con datos del titular */}
        {titular && (
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 to-sky-50/80 p-4 shadow-sm">
            <div className="flex items-center gap-3 text-blue-900">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shrink-0">
                <Copy className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold">¿Llenar con la misma información del titular?</p>
                <p className="text-xs text-blue-700/80">Copia automáticamente dirección, teléfonos y contacto de emergencia del titular.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyTitularData}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 shrink-0"
            >
              <Copy className="h-3.5 w-3.5" />
              Sí, copiar datos
            </button>
          </div>
        )}

        {/* Section: Contacto */}
        <fieldset className="mb-8 border-t border-slate-100 pt-8">
          <legend className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-blue-600">
            <Phone className="h-4 w-4" />
            Contacto
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClasses}>Celular</label>
              <input {...register('pac_celular')} className={inputClasses} placeholder="5555-1234" />
            </div>
            <div>
              <label className={labelClasses}>Teléfono Casa</label>
              <input {...register('pac_telefono_casa')} className={inputClasses} placeholder="2222-1234" />
            </div>
            <div>
              <label className={labelClasses}>Teléfono Trabajo</label>
              <input {...register('pac_telefono_trabajo')} className={inputClasses} placeholder="2233-4567" />
            </div>
          </div>
        </fieldset>

        {/* Section: Contacto de Emergencia */}
        <fieldset className="mb-8 border-t border-slate-100 pt-8">
          <legend className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-rose-600">
            <Heart className="h-4 w-4" />
            Contacto de Emergencia
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClasses}>Nombre Completo</label>
              <input {...register('pac_contacto_emergencia_nombre')} className={inputClasses} placeholder="Ej: María López" />
            </div>
            <div>
              <label className={labelClasses}>Relación / Parentesco</label>
              <input {...register('pac_contacto_emergencia_relacion')} className={inputClasses} placeholder="Ej: Madre, Cónyuge" />
            </div>
            <div>
              <label className={labelClasses}>Teléfono</label>
              <input {...register('pac_contacto_emergencia_telefono')} className={inputClasses} placeholder="5555-9999" />
            </div>
          </div>
        </fieldset>

        {/* Section: Dirección */}
        <fieldset className="mb-6 border-t border-slate-100 pt-8">
          <legend className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-blue-600">
            Dirección
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClasses}>País</label>
              <select value={selectedPais} onChange={handlePaisChange} className={inputClasses}>
                <option value="">Seleccionar país...</option>
                {paises.map((p) => (
                  <option key={p.pai_codigo} value={p.pai_codigo}>
                    {p.pai_descripcion}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClasses}>Departamento</label>
              <select value={selectedDep} onChange={handleDepChange} className={inputClasses} disabled={!selectedPais}>
                <option value="">Seleccionar...</option>
                {departamentos.map((d) => (
                  <option key={d.dep_codigo} value={d.dep_codigo}>
                    {d.dep_descripcion}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClasses}>Municipio</label>
              <select {...register('pac_mun_dir_id')} className={inputClasses} disabled={!selectedDep}>
                <option value="">Seleccionar...</option>
                {municipios.map((m) => (
                  <option key={m.mun_codigo} value={m.mun_codigo}>
                    {m.mun_descripcion}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClasses}>Zona</label>
              <input {...register('pac_zona')} className={inputClasses} placeholder="Zona 10" />
            </div>
            <div>
              <label className={labelClasses}>Colonia</label>
              <input {...register('pac_colonia')} className={inputClasses} placeholder="Las Américas" />
            </div>
            <div>
              <label className={labelClasses}>Avenida</label>
              <input {...register('pac_avenida')} className={inputClasses} placeholder="5ta Avenida" />
            </div>
            <div>
              <label className={labelClasses}>Calle</label>
              <input {...register('pac_calle')} className={inputClasses} placeholder="12 Calle" />
            </div>
            <div>
              <label className={labelClasses}>Número de Casa</label>
              <input {...register('pac_numero_casa')} className={inputClasses} placeholder="15-30" />
            </div>
            <div>
              <label className={labelClasses}>Aldea</label>
              <input {...register('pac_aldea')} className={inputClasses} placeholder="Ej: San José" />
            </div>
          </div>
        </fieldset>

        {/* Section: Documentación */}
        <fieldset className="mb-8 border-t border-slate-100 pt-8">
          <legend className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-blue-600">
            Documentación
          </legend>
          <div className="grid gap-6 md:grid-cols-2">
            <ImageDropzone 
              label="Carné de Seguro (Opcional)" 
              initialImageUrl={paciente?.pac_foto_carne_seguro}
              onImageDrop={(file) => setSelectedCarne(file)} 
            />
            <DocumentDropzone 
              label="Documento de Identificación (DPI/Pasaporte)" 
              initialDocumentUrl={paciente?.pac_documento_identificacion_url}
              onDocumentDrop={(file) => setSelectedDocumento(file)} 
            />
          </div>
        </fieldset>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : null}
                Guardar
              </button>
            </div>
        </form>
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
      await independizarMutation.mutateAsync({
        pacCodigo: paciente.pac_codigo,
        nuevoCorreo: data.nuevoCorreo,
      });

      reset();
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
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Unlink className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Independizar Cuenta</h2>
              <p className="text-xs text-slate-500">{pacienteName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <p className="leading-relaxed text-xs sm:text-sm">
              Al independizar a este paciente, se desvinculará de tu cuenta y se convertirá en un usuario titular. Se le enviará un correo con credenciales temporales de acceso.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
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
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            {errors.nuevoCorreo && (
              <p className="mt-1.5 text-xs text-rose-500">{errors.nuevoCorreo.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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

          {/* Dependientes */}
          {dependientes.length > 0
            ? dependientes.map((dep, i) => (
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
            : !titular && <EmptyState onAdd={openAdd} />}

          {/* Show empty state when there's a titular but no dependientes */}
          {titular && dependientes.length === 0 && (
            <EmptyState onAdd={openAdd} />
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
