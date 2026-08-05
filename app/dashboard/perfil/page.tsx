'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import {
  User,
  Calendar,
  Heart,
  Phone,
  MapPin,
  Briefcase,
  Edit3,
  X,
  Save,
  Droplets,
  AlertCircle,
  Star,
  FileText,
  ExternalLink,
  Gift,
  Sparkles,
} from 'lucide-react';

import { NeoLoader } from '@/components/neo-loader';
import { usePacienteTitular, useUpdatePaciente } from '@/hooks/use-pacientes';
import { getPaises, getDepartamentosPorPais, getMunicipiosPorDepartamento, getPaisByCodigo, getDepartamentoByCodigo, getMunicipioByCodigo } from '@/lib/api-client';
import type { Paciente, Pais, Departamento, Municipio } from '@/types';
import { buildPacienteFullName, calcularEdad, getPacienteInitials, isPacientePendiente } from '@/types';
import { ImageDropzone } from '@/components/image-dropzone';
import { DocumentDropzone } from '@/components/document-dropzone';
import { useLealtadEstado } from '@/hooks/use-lealtad';
import { useTotalPuntos } from '@/hooks/use-recompensas';
import Link from 'next/link';

// ─── Constants ───────────────────────────────────────────────────────────────

const GENERO_OPTIONS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
];

const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '—';
  }
}

function toInputDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

// ─── Form Values Type ────────────────────────────────────────────────────────

type ProfileFormValues = {
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
  pac_contacto_emergencia_nombre: string;
  pac_contacto_emergencia_relacion: string;
  pac_contacto_emergencia_telefono: string;
  pac_pais_nac_id: string;
  pac_dep_nac_id: string;
  pac_mun_nac_id: string;
  pac_aldea: string;
};

// ─── Animations ──────────────────────────────────────────────────────────────

const pageVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.2 } },
};

// ─── Reusable Components ─────────────────────────────────────────────────────

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-900">{value || '—'}</p>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100';

const selectClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 appearance-none';

// ─── Edit Modal ──────────────────────────────────────────────────────────────

function EditProfileForm({
  titular,
  onCancel,
}: {
  titular: Paciente;
  onCancel: () => void;
}) {
  const updateMutation = useUpdatePaciente();

  const { register, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm<ProfileFormValues>({
    defaultValues: {
      pac_primer_nombre: titular.pac_primer_nombre || '',
      pac_segundo_nombre: titular.pac_segundo_nombre || '',
      pac_primer_apellido: titular.pac_primer_apellido || '',
      pac_segundo_apellido: titular.pac_segundo_apellido || '',
      pac_apellido_casado: titular.pac_apellido_casado || '',
      pac_fecha_nacimiento: toInputDate(titular.pac_fecha_nacimiento),
      pac_genero: titular.pac_genero || '',
      pac_tipo_sangre: titular.pac_tipo_sangre || '',
      pac_ocupacion: titular.pac_ocupacion || '',
      pac_celular: titular.pac_celular || '',
      pac_telefono_casa: titular.pac_telefono_casa || '',
      pac_telefono_trabajo: titular.pac_telefono_trabajo || '',
      pac_pais_dir_id: titular.pac_pais_dir_id?.toString() || '',
      pac_dep_dir_id: titular.pac_dep_dir_id?.toString() || '',
      pac_mun_dir_id: titular.pac_mun_dir_id?.toString() || '',
      pac_zona: titular.pac_zona || '',
      pac_colonia: titular.pac_colonia || '',
      pac_avenida: titular.pac_avenida || '',
      pac_calle: titular.pac_calle || '',
      pac_numero_casa: titular.pac_numero_casa || '',
      pac_contacto_emergencia_nombre: titular.pac_contacto_emergencia_nombre || '',
      pac_contacto_emergencia_relacion: titular.pac_contacto_emergencia_relacion || '',
      pac_contacto_emergencia_telefono: titular.pac_contacto_emergencia_telefono || '',
      pac_pais_nac_id: titular.pac_pais_nac_id?.toString() || '',
      pac_dep_nac_id: titular.pac_dep_nac_id?.toString() || '',
      pac_mun_nac_id: titular.pac_mun_nac_id?.toString() || '',
      pac_aldea: titular.pac_aldea || '',
    },
  });

  const selectedPais = watch('pac_pais_dir_id');
  const selectedDep = watch('pac_dep_dir_id');
  const selectedPaisNac = watch('pac_pais_nac_id');
  const selectedDepNac = watch('pac_dep_nac_id');

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

  // ─── Birthplace Geographic queries ───
  const { data: depsNacRes } = useQuery({
    queryKey: ['departamentos', selectedPaisNac],
    queryFn: () => getDepartamentosPorPais(Number(selectedPaisNac)),
    enabled: !!selectedPaisNac,
    staleTime: 10 * 60 * 1000,
  });
  const departamentosNac: Departamento[] = depsNacRes?.data ?? [];

  const { data: munsNacRes } = useQuery({
    queryKey: ['municipios', selectedDepNac],
    queryFn: () => getMunicipiosPorDepartamento(Number(selectedDepNac)),
    enabled: !!selectedDepNac,
    staleTime: 10 * 60 * 1000,
  });
  const municipiosNac: Municipio[] = munsNacRes?.data ?? [];

  // Reset dep/mun when parent changes
  const handlePaisChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setValue('pac_pais_dir_id', e.target.value);
      setValue('pac_dep_dir_id', '');
      setValue('pac_mun_dir_id', '');
    },
    [setValue],
  );

  const handleDepChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setValue('pac_dep_dir_id', e.target.value);
      setValue('pac_mun_dir_id', '');
    },
    [setValue],
  );

  const handlePaisNacChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setValue('pac_pais_nac_id', e.target.value);
      setValue('pac_dep_nac_id', '');
      setValue('pac_mun_nac_id', '');
    },
    [setValue],
  );

  const handleDepNacChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setValue('pac_dep_nac_id', e.target.value);
      setValue('pac_mun_nac_id', '');
    },
    [setValue],
  );

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [selectedCarne, setSelectedCarne] = useState<File | null>(null);
  const [selectedDocumento, setSelectedDocumento] = useState<File | null>(null);

  const onSubmit = async (values: ProfileFormValues) => {
    const formData = new FormData();

    const appendSeguro = (key: string, value: any) => {
      if (value !== null && value !== undefined && value !== '' && value !== 'null' && value !== 'undefined') {
        if (key.endsWith('Id') && (value === 0 || value === '0')) return;
        formData.append(key, value.toString().trim());
      }
    };

    appendSeguro('PrimerNombre', values.pac_primer_nombre || titular.pac_primer_nombre);
    appendSeguro('SegundoNombre', values.pac_segundo_nombre || titular.pac_segundo_nombre);
    appendSeguro('PrimerApellido', values.pac_primer_apellido || titular.pac_primer_apellido);
    appendSeguro('SegundoApellido', values.pac_segundo_apellido || titular.pac_segundo_apellido);
    appendSeguro('ApellidoCasado', values.pac_apellido_casado || titular.pac_apellido_casado);
    
    const fechaNac = values.pac_fecha_nacimiento || titular.pac_fecha_nacimiento;
    if (fechaNac) {
      appendSeguro('FechaNacimiento', fechaNac.split('T')[0]);
    }

    appendSeguro('Genero', values.pac_genero || titular.pac_genero);
    appendSeguro('TipoSangre', values.pac_tipo_sangre || titular.pac_tipo_sangre);
    appendSeguro('Ocupacion', values.pac_ocupacion || titular.pac_ocupacion);

    appendSeguro('PaisNacId', values.pac_pais_nac_id || titular.pac_pais_nac_id);
    appendSeguro('DepNacId', values.pac_dep_nac_id || titular.pac_dep_nac_id);
    appendSeguro('MunNacId', values.pac_mun_nac_id || titular.pac_mun_nac_id);
    appendSeguro('PaisDirId', values.pac_pais_dir_id || titular.pac_pais_dir_id);
    appendSeguro('DepDirId', values.pac_dep_dir_id || titular.pac_dep_dir_id);
    appendSeguro('MunDirId', values.pac_mun_dir_id || titular.pac_mun_dir_id);

    appendSeguro('Aldea', values.pac_aldea || titular.pac_aldea);
    appendSeguro('Zona', values.pac_zona || titular.pac_zona);
    appendSeguro('Colonia', values.pac_colonia || titular.pac_colonia);
    appendSeguro('Avenida', values.pac_avenida || titular.pac_avenida);
    appendSeguro('Calle', values.pac_calle || titular.pac_calle);
    appendSeguro('NumeroCasa', values.pac_numero_casa || titular.pac_numero_casa);
    appendSeguro('Celular', values.pac_celular || titular.pac_celular);
    appendSeguro('TelefonoCasa', values.pac_telefono_casa || titular.pac_telefono_casa);
    appendSeguro('TelefonoTrabajo', values.pac_telefono_trabajo || titular.pac_telefono_trabajo);
    appendSeguro('ContactoEmergenciaNombre', values.pac_contacto_emergencia_nombre || titular.pac_contacto_emergencia_nombre);
    appendSeguro('ContactoEmergenciaRelacion', values.pac_contacto_emergencia_relacion || titular.pac_contacto_emergencia_relacion);
    appendSeguro('ContactoEmergenciaTelefono', values.pac_contacto_emergencia_telefono || titular.pac_contacto_emergencia_telefono);

    if (selectedPhoto) {
      formData.append('FotoPerfilArchivo', selectedPhoto);
    }
    if (selectedCarne) {
      formData.append('FotoCarneArchivo', selectedCarne);
    }
    if (selectedDocumento) {
      formData.append('documentoIdentificacionArchivo', selectedDocumento);
    }

    // --- DEPURACIÓN: Ver el contenido exacto del FormData ---
    console.log("=== DATOS ENVIADOS EN EL FORMDATA ===");
    for (let [key, value] of formData.entries()) {
      console.log(key, ':', value);
    }
    console.log("=====================================");

    await updateMutation.mutateAsync({ pacCodigo: titular.pac_codigo, body: formData });
    onCancel();
  };

  return (
    <motion.div
      className="w-full max-w-4xl mx-auto bg-white/60 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-900/5 overflow-hidden"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5 sm:px-8">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900">Editar Perfil</h2>
            <p className="mt-0.5 text-sm text-slate-500">Actualiza tus datos personales</p>
          </div>
          <button
            onClick={onCancel}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-8 sm:px-10">
          
          {/* Profile Photo at the Top */}
          <div className="mb-10 flex flex-col items-center justify-center">
            <div className="w-full max-w-md">
              <ImageDropzone 
                label="Foto de Perfil" 
                initialImageUrl={titular.pac_foto_perfil_url}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Primer Nombre" required>
                <input {...register('pac_primer_nombre', { required: true })} className={inputClass} placeholder="Juan" />
              </FormField>
              <FormField label="Segundo Nombre">
                <input {...register('pac_segundo_nombre')} className={inputClass} placeholder="Carlos" />
              </FormField>
              <FormField label="Primer Apellido" required>
                <input {...register('pac_primer_apellido', { required: true })} className={inputClass} placeholder="García" />
              </FormField>
              <FormField label="Segundo Apellido">
                <input {...register('pac_segundo_apellido')} className={inputClass} placeholder="López" />
              </FormField>
              <FormField label="Apellido de Casada/o">
                <input {...register('pac_apellido_casado')} className={inputClass} placeholder="Pérez" />
              </FormField>
              <FormField label="Fecha de Nacimiento" required>
                <input type="date" {...register('pac_fecha_nacimiento', { required: true })} className={inputClass} />
              </FormField>
              <FormField label="Género" required>
                <select {...register('pac_genero', { required: true })} className={selectClass}>
                  <option value="">Seleccionar...</option>
                  {GENERO_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Tipo de Sangre">
                <select {...register('pac_tipo_sangre')} className={selectClass}>
                  <option value="">Seleccionar...</option>
                  {BLOOD_TYPE_OPTIONS.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Ocupación">
                <input {...register('pac_ocupacion')} className={inputClass} placeholder="Ingeniero, Maestro..." />
              </FormField>
            </div>
          </fieldset>

          {/* Section: Lugar de Nacimiento */}
          <fieldset className="mb-8 border-t border-slate-100 pt-8">
            <legend className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-blue-600">
              <MapPin className="h-4 w-4" />
              Lugar de Nacimiento
            </legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="País de Nacimiento">
                <select
                  value={selectedPaisNac}
                  onChange={handlePaisNacChange}
                  className={selectClass}
                >
                  <option value="">Seleccionar país...</option>
                  {paises.map((p) => (
                    <option key={p.pai_codigo} value={p.pai_codigo}>
                      {p.pai_descripcion}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Departamento de Nacimiento">
                <select
                  value={selectedDepNac}
                  onChange={handleDepNacChange}
                  className={selectClass}
                  disabled={!selectedPaisNac}
                >
                  <option value="">Seleccionar...</option>
                  {departamentosNac.map((d) => (
                    <option key={d.dep_codigo} value={d.dep_codigo}>
                      {d.dep_descripcion}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Municipio de Nacimiento">
                <select {...register('pac_mun_nac_id')} className={selectClass} disabled={!selectedDepNac}>
                  <option value="">Seleccionar...</option>
                  {municipiosNac.map((m) => (
                    <option key={m.mun_codigo} value={m.mun_codigo}>
                      {m.mun_descripcion}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </fieldset>

          {/* Section: Contacto */}
          <fieldset className="mb-8">
            <legend className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-blue-600">
              <Phone className="h-4 w-4" />
              Contacto
            </legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Celular">
                <input {...register('pac_celular')} className={inputClass} placeholder="5555-1234" />
              </FormField>
              <FormField label="Teléfono Casa">
                <input {...register('pac_telefono_casa')} className={inputClass} placeholder="2222-1234" />
              </FormField>
              <FormField label="Teléfono Trabajo">
                <input {...register('pac_telefono_trabajo')} className={inputClass} placeholder="2233-4567" />
              </FormField>
            </div>
          </fieldset>

          {/* Section: Contacto de Emergencia */}
          <fieldset className="mb-8">
            <legend className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-red-600">
              <Heart className="h-4 w-4" />
              Contacto de Emergencia
            </legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Nombre Completo">
                <input {...register('pac_contacto_emergencia_nombre')} className={inputClass} placeholder="Ej: María López" />
              </FormField>
              <FormField label="Relación / Parentesco">
                <input {...register('pac_contacto_emergencia_relacion')} className={inputClass} placeholder="Ej: Madre, Cónyuge" />
              </FormField>
              <FormField label="Teléfono de Emergencia">
                <input {...register('pac_contacto_emergencia_telefono')} className={inputClass} placeholder="5555-9999" />
              </FormField>
            </div>
          </fieldset>

          {/* Section: Dirección */}
          <fieldset className="mb-6">
            <legend className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-blue-600">
              <MapPin className="h-4 w-4" />
              Dirección
            </legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="País">
                <select
                  value={selectedPais}
                  onChange={handlePaisChange}
                  className={selectClass}
                >
                  <option value="">Seleccionar país...</option>
                  {paises.map((p) => (
                    <option key={p.pai_codigo} value={p.pai_codigo}>
                      {p.pai_descripcion}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Departamento">
                <select
                  value={selectedDep}
                  onChange={handleDepChange}
                  className={selectClass}
                  disabled={!selectedPais}
                >
                  <option value="">Seleccionar...</option>
                  {departamentos.map((d) => (
                    <option key={d.dep_codigo} value={d.dep_codigo}>
                      {d.dep_descripcion}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Municipio">
                <select {...register('pac_mun_dir_id')} className={selectClass} disabled={!selectedDep}>
                  <option value="">Seleccionar...</option>
                  {municipios.map((m) => (
                    <option key={m.mun_codigo} value={m.mun_codigo}>
                      {m.mun_descripcion}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Zona">
                <input {...register('pac_zona')} className={inputClass} placeholder="Zona 10" />
              </FormField>
              <FormField label="Colonia">
                <input {...register('pac_colonia')} className={inputClass} placeholder="Las Américas" />
              </FormField>
              <FormField label="Avenida">
                <input {...register('pac_avenida')} className={inputClass} placeholder="5ta Avenida" />
              </FormField>
              <FormField label="Calle">
                <input {...register('pac_calle')} className={inputClass} placeholder="12 Calle" />
              </FormField>
              <FormField label="Número de Casa">
                <input {...register('pac_numero_casa')} className={inputClass} placeholder="15-30" />
              </FormField>
              <FormField label="Aldea">
                <input {...register('pac_aldea')} className={inputClass} placeholder="Ej: San José" />
              </FormField>
            </div>
          </fieldset>

          {/* Insurance Card & Documento Identificación Dropzone */}
          <fieldset className="mb-8 border-t border-slate-100 pt-8">
            <legend className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-blue-600">
              <Briefcase className="h-4 w-4" />
              Documentación
            </legend>
            <div className="grid gap-6 md:grid-cols-2">
              <ImageDropzone 
                label="Carné de Seguro (Opcional)" 
                initialImageUrl={titular.pac_foto_carne_seguro}
                onImageDrop={(file) => setSelectedCarne(file)} 
              />
              <DocumentDropzone 
                label="Documento de Identificación (DPI/Pasaporte)" 
                initialDocumentUrl={titular.pac_documento_identificacion_url}
                onDocumentDrop={(file) => setSelectedDocumento(file)} 
              />
            </div>
          </fieldset>

          {/* Error display */}
          {updateMutation.isError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Ocurrió un error al guardar los cambios. Intenta de nuevo.
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || updateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSubmitting || updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
    </motion.div>
  );
}

// ─── Main Content ────────────────────────────────────────────────────────────

function PerfilContent() {
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);

  const { titular, isLoading, error } = usePacienteTitular();

  // Detectar si el perfil está pendiente de completar
  const isPending = titular ? isPacientePendiente(titular) : false;

  // ─── Estado de Lealtad ───
  const { data: lealtadEstado } = useLealtadEstado();

  // ─── Consultas Geográficas ───
  const { data: paisesListaRes } = useQuery({
    queryKey: ['paises'],
    queryFn: () => getPaises(),
  });
  const paisDesc = (paisesListaRes?.data || []).find((p: Pais) => p.pai_codigo === titular?.pac_pais_dir_id)?.pai_descripcion;

  const { data: depsListaRes } = useQuery({
    queryKey: ['departamentos', titular?.pac_pais_dir_id],
    queryFn: () => getDepartamentosPorPais(titular!.pac_pais_dir_id!),
    enabled: !!titular?.pac_pais_dir_id,
  });
  const depDesc = (depsListaRes?.data || []).find((d: Departamento) => d.dep_codigo === titular?.pac_dep_dir_id)?.dep_descripcion;

  const { data: munsListaRes } = useQuery({
    queryKey: ['municipios', titular?.pac_dep_dir_id],
    queryFn: () => getMunicipiosPorDepartamento(titular!.pac_dep_dir_id!),
    enabled: !!titular?.pac_dep_dir_id,
  });
  const munDesc = (munsListaRes?.data || []).find((m: Municipio) => m.mun_codigo === titular?.pac_mun_dir_id)?.mun_descripcion;

  // ─── Consultas Geográficas de Nacimiento ───
  const paisNacDesc = (paisesListaRes?.data || []).find((p: Pais) => p.pai_codigo === titular?.pac_pais_nac_id)?.pai_descripcion;

  const { data: depsNacListaRes } = useQuery({
    queryKey: ['departamentos', titular?.pac_pais_nac_id],
    queryFn: () => getDepartamentosPorPais(titular!.pac_pais_nac_id!),
    enabled: !!titular?.pac_pais_nac_id,
  });
  const depNacDesc = (depsNacListaRes?.data || []).find((d: Departamento) => d.dep_codigo === titular?.pac_dep_nac_id)?.dep_descripcion;

  const { data: munsNacListaRes } = useQuery({
    queryKey: ['municipios', titular?.pac_dep_nac_id],
    queryFn: () => getMunicipiosPorDepartamento(titular!.pac_dep_nac_id!),
    enabled: !!titular?.pac_dep_nac_id,
  });
  const munNacDesc = (munsNacListaRes?.data || []).find((m: Municipio) => m.mun_codigo === titular?.pac_mun_nac_id)?.mun_descripcion;

  // ─── Loading State ───
  if (isLoading) {
    return <NeoLoader />;
  }

  // ─── Error State ───
  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Error al cargar datos</h2>
          <p className="mt-2 text-sm text-slate-500">
            No pudimos cargar tu información personal. Por favor, verifica tu conexión e intenta de nuevo.
          </p>
        </motion.div>
      </div>
    );
  }

  // ─── Cargando sin datos todavía (no debería ocurrir normalmente) ───
  if (!titular) {
    return <NeoLoader />;
  }

  const fullName = isPending ? 'Completa tu perfil' : buildPacienteFullName(titular);
  const initials = isPending ? '?' : getPacienteInitials(titular);
  const edad = calcularEdad(titular.pac_fecha_nacimiento);
  const userEmail = session?.user?.email || 'Sin correo';

  const genderLabel =
    titular.pac_genero === 'masculino'
      ? 'Masculino'
      : titular.pac_genero === 'femenino'
        ? 'Femenino'
        : titular.pac_genero || '—';

  if (isEditing) {
    return (
      <motion.main
        className="flex-1 p-4 md:p-8 min-h-screen"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
      >
        <EditProfileForm titular={titular} onCancel={() => setIsEditing(false)} />
      </motion.main>
    );
  }

  return (
    <main
      className="flex-1 p-4 md:p-8 min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Profile Header Card (Sticky) */}
          <div className="sticky top-0 z-30 py-4 mb-6 backdrop-blur-md">
            <div className="flex flex-col items-center text-center sm:items-start sm:text-left md:flex-row md:items-end gap-4 sm:gap-6 max-w-5xl mx-auto">
            <div className="relative shrink-0">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-3xl md:text-5xl shadow-lg overflow-hidden">
                {titular.pac_foto_perfil_url ? (
                  <img
                    src={titular.pac_foto_perfil_url}
                    alt={fullName}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
            </div>
            <div className="flex-1 pb-2">
              <div className="flex flex-col items-center sm:items-start gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">{fullName}</h1>
                <div>
                  <span className="inline-block bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 px-3 py-1 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider">
                    TITULAR DE LA CUENTA
                  </span>
                </div>
              </div>
            </div>
            <div className="pb-2 w-full sm:w-auto flex justify-center sm:justify-start">
              <button
                onClick={() => setIsEditing(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-6 rounded-xl transition-colors font-semibold shadow-md active:scale-95 text-sm"
              >
                <Edit3 className="h-4 w-4" />
                Editar Perfil
              </button>
            </div>
          </div>
        </div>

        {/* Resumen de Lealtad y Puntos Widget */}
        <PerfilPuntosWidget pacCodigo={titular.pac_codigo} />

          {/* Onboarding Banner (shown when profile is pending) */}
          {isPending && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-900">Tu perfil está incompleto</h3>
                    <p className="mt-0.5 text-sm text-amber-700">
                      Completa tu información personal para poder agendar citas y acceder a todos los servicios de NeoClínica.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 sm:self-auto"
                >
                  <Edit3 className="h-4 w-4" />
                  Completar Perfil
                </button>
              </div>
            </motion.div>
          )}

          {/* Bento Grid Content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Information Column */}
            <div className="md:col-span-7 space-y-6">
              
              {/* Personal Info Card */}
              <div className="bg-white dark:bg-[#1E293B] p-5 sm:p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-transform hover:scale-[1.01] duration-300">
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Información Personal</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 sm:gap-y-8 gap-x-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Nombre Completo</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{fullName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Correo Electrónico</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{userEmail}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Fecha de Nacimiento</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {titular.pac_fecha_nacimiento ? `${formatDate(titular.pac_fecha_nacimiento)}${edad !== null ? ` (${edad} años)` : ''}` : '—'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Género</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{genderLabel}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Tipo de Sangre</p>
                    {titular.pac_tipo_sangre ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold text-xs border border-red-200/50 dark:border-red-900/40">
                        {titular.pac_tipo_sangre}
                      </span>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">—</p>
                    )}
                  </div>
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Ocupación</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{titular.pac_ocupacion || '—'}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Lugar de Nacimiento</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {[munNacDesc, depNacDesc, paisNacDesc].filter(Boolean).join(', ') || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Emergency Contact Card */}
              <div className="bg-white dark:bg-[#1E293B] p-5 sm:p-6 md:p-8 rounded-3xl border border-rose-100 dark:border-rose-950/30 shadow-sm transition-transform hover:scale-[1.01] duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                    <Heart className="h-5 w-5" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Contacto de Emergencia</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Nombre</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{titular.pac_contacto_emergencia_nombre || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Relación</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{titular.pac_contacto_emergencia_relacion || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Teléfono</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{titular.pac_contacto_emergencia_telefono || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Address Card */}
              <div className="bg-white dark:bg-[#1E293B] p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-transform hover:scale-[1.01] duration-300">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Dirección</h2>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-2 gap-y-6 gap-x-4 mb-6">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Zona</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{titular.pac_zona || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Casa</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{titular.pac_numero_casa || '—'}</p>
                  </div>
                  
                  {/* Geographic Lookups */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">País</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{paisDesc || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Departamento</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{depDesc || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Municipio</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{munDesc || '—'}</p>
                  </div>
                  {titular.pac_aldea ? (
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Aldea</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{titular.pac_aldea}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Contact & Stats Column */}
            <div className="md:col-span-5 space-y-6">
              
              {/* Contact Card */}
              <div className="bg-white dark:bg-[#1E293B] p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-transform hover:scale-[1.01] duration-300">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Phone className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Contacto</h2>
                </div>
                
                <div className="space-y-4">
                  <div className={`flex items-center gap-4 p-4 rounded-2xl ${titular.pac_celular ? 'bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800' : 'opacity-50'}`}>
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-700">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Celular</p>
                      <p className={`text-sm font-semibold ${titular.pac_celular ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 italic'}`}>
                        {titular.pac_celular || 'No registrado'}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-4 p-4 rounded-2xl ${titular.pac_telefono_casa ? 'bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800' : 'opacity-50'}`}>
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-sm border border-slate-100 dark:border-slate-700">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Teléfono Casa</p>
                      <p className={`text-sm font-semibold ${titular.pac_telefono_casa ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 italic'}`}>
                        {titular.pac_telefono_casa || 'No registrado'}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-4 p-4 rounded-2xl ${titular.pac_telefono_trabajo ? 'bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800' : 'opacity-50'}`}>
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-sm border border-slate-100 dark:border-slate-700">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Teléfono Trabajo</p>
                      <p className={`text-sm font-semibold ${titular.pac_telefono_trabajo ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 italic'}`}>
                        {titular.pac_telefono_trabajo || 'No registrado'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Carné de Seguro Card */}
              {titular.pac_foto_carne_seguro && (
                <div className="bg-white dark:bg-[#1E293B] p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-transform hover:scale-[1.01] duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
                      <Heart className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Carné de Seguro</h2>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] p-2">
                    <img 
                      src={titular.pac_foto_carne_seguro} 
                      alt="Carné de seguro médico" 
                      className="w-full max-h-48 object-contain rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Documento de Identificación Card */}
              {titular.pac_documento_identificacion_url ? (
                <div className="bg-white dark:bg-[#1E293B] p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-transform hover:scale-[1.01] duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Documento de Identificación</h2>
                      <p className="text-xs text-slate-500">DPI / Pasaporte registrado</p>
                    </div>
                  </div>

                  {/* Previsualización visual: Imagen o visor PDF */}
                  <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] p-2 mb-4">
                    {titular.pac_documento_identificacion_url.toLowerCase().includes('.pdf') ? (
                      <iframe
                        src={titular.pac_documento_identificacion_url}
                        title="Documento de Identificación PDF"
                        className="w-full h-56 rounded-xl border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <img
                        src={titular.pac_documento_identificacion_url}
                        alt="Documento de Identificación"
                        className="w-full max-h-56 object-contain rounded-xl"
                      />
                    )}
                  </div>

                  <a
                    href={titular.pac_documento_identificacion_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors text-sm"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Abrir en nueva pestaña</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#1E293B] p-6 md:p-8 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Documento de Identificación</h2>
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">No se ha subido documento de identificación</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Adjunta tu DPI o Pasaporte editando tu perfil para completar la información oficial de tu cuenta.
                  </p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Subir Documento</span>
                  </button>
                </div>
              )}

              {/* Loyalty Points Card */}
              <div className="bg-slate-100 dark:bg-[#1E293B] p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Puntos NeoClínica</p>
                      <h4 className="text-3xl md:text-4xl font-black text-blue-600 dark:text-blue-400 mt-1">
                        {lealtadEstado ? lealtadEstado.puntosActuales.toLocaleString() : '—'}
                      </h4>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
                      <Star className="h-5 w-5" fill="currentColor" />
                    </div>
                  </div>
                  {lealtadEstado && (
                    <>
                      <div className="w-full bg-white/50 dark:bg-slate-800 h-2 rounded-full mb-4 overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div 
                          className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-1000" 
                          style={{ width: `${Math.min(100, Math.max(0, lealtadEstado.progresoPorcentaje))}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {lealtadEstado.puntosMaximosNivel - lealtadEstado.puntosActuales > 0 
                          ? `Faltan ${lealtadEstado.puntosMaximosNivel - lealtadEstado.puntosActuales} puntos para tu próximo beneficio.`
                          : '¡Has alcanzado el nivel máximo de beneficios!'}
                      </p>
                    </>
                  )}
                  <Link href="/dashboard/perfil/puntos">
                    <button className="mt-5 w-full py-2.5 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors">
                      Ver recompensas
                    </button>
                  </Link>
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-200/20 dark:bg-blue-900/20 rounded-full blur-3xl transition-transform group-hover:scale-150 duration-700"></div>
              </div>

            </div>
          </div>
        </div>
      </main>
  );
}

// ─── Default Export ──────────────────────────────────────────────────────────

export default function PerfilPage() {
  return (
    <Suspense fallback={<NeoLoader />}>
      <PerfilContent />
    </Suspense>
  );
}

function PerfilPuntosWidget({ pacCodigo }: { pacCodigo: string }) {
  const { data: puntosData } = useTotalPuntos(pacCodigo);
  const { data: estadoData } = useLealtadEstado();

  const totalPuntos = puntosData?.totalPuntos ?? estadoData?.puntosActuales ?? 0;
  const nivelActual = estadoData?.nivelActual || (totalPuntos >= 1000 ? 'Platino' : totalPuntos >= 500 ? 'Oro' : totalPuntos >= 200 ? 'Plata' : 'Bronce');
  const puntosMaximos = estadoData?.puntosMaximosNivel || 1000;
  const porcentaje = Math.min(100, Math.max(0, Math.round((totalPuntos / puntosMaximos) * 100)));

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl shadow-indigo-950/20 border border-indigo-900/50 mb-6">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Indicador de Puntos & Nivel */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <Star className="h-7 w-7 fill-slate-950 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black tracking-tight text-white">{totalPuntos}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Puntos acumulados</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-amber-300 backdrop-blur-md border border-white/10">
                <Sparkles className="h-3 w-3" /> Liga {nivelActual}
              </span>
            </div>
          </div>
        </div>

        {/* Barra de progreso miniatura + CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 min-w-[240px]">
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold text-slate-300">
              <span>Progreso de Nivel</span>
              <span>{totalPuntos} / {puntosMaximos} pts</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700 shadow-sm"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>

          <Link
            href="/dashboard/perfil/puntos"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 transition-all active:scale-95 shadow-md shadow-amber-500/20 shrink-0"
          >
            <Gift className="h-4 w-4" />
            Canjear Puntos
          </Link>
        </div>
      </div>
    </div>
  );
}

