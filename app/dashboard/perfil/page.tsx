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
} from 'lucide-react';

import { NeoLoader } from '@/components/neo-loader';
import { usePacienteTitular, useUpdatePaciente } from '@/hooks/use-pacientes';
import { getPaises, getDepartamentosPorPais, getMunicipiosPorDepartamento, getPaisByCodigo, getDepartamentoByCodigo, getMunicipioByCodigo } from '@/lib/api-client';
import type { Paciente, Pais, Departamento, Municipio } from '@/types';
import { buildPacienteFullName, calcularEdad, getPacienteInitials, isPacientePendiente } from '@/types';
import { ImageDropzone } from '@/components/image-dropzone';
import { useLealtadEstado } from '@/hooks/use-lealtad';
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

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [selectedCarne, setSelectedCarne] = useState<File | null>(null);

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
    appendSeguro('ApellidoCasado', titular.pac_apellido_casado);
    
    const fechaNac = values.pac_fecha_nacimiento || titular.pac_fecha_nacimiento;
    if (fechaNac) {
      appendSeguro('FechaNacimiento', fechaNac.split('T')[0]);
    }

    appendSeguro('Genero', values.pac_genero || titular.pac_genero);
    appendSeguro('TipoSangre', values.pac_tipo_sangre || titular.pac_tipo_sangre);
    appendSeguro('Ocupacion', values.pac_ocupacion || titular.pac_ocupacion);

    appendSeguro('PaisNacId', titular.pac_pais_nac_id);
    appendSeguro('DepNacId', titular.pac_dep_nac_id);
    appendSeguro('MunNacId', titular.pac_mun_nac_id);
    appendSeguro('PaisDirId', values.pac_pais_dir_id || titular.pac_pais_dir_id);
    appendSeguro('DepDirId', values.pac_dep_dir_id || titular.pac_dep_dir_id);
    appendSeguro('MunDirId', values.pac_mun_dir_id || titular.pac_mun_dir_id);

    appendSeguro('Aldea', titular.pac_aldea);
    appendSeguro('Zona', values.pac_zona || titular.pac_zona);
    appendSeguro('Colonia', values.pac_colonia || titular.pac_colonia);
    appendSeguro('Avenida', values.pac_avenida || titular.pac_avenida);
    appendSeguro('Calle', values.pac_calle || titular.pac_calle);
    appendSeguro('NumeroCasa', values.pac_numero_casa || titular.pac_numero_casa);
    appendSeguro('Celular', values.pac_celular || titular.pac_celular);
    appendSeguro('TelefonoCasa', values.pac_telefono_casa || titular.pac_telefono_casa);
    appendSeguro('TelefonoTrabajo', values.pac_telefono_trabajo || titular.pac_telefono_trabajo);

    if (selectedPhoto) {
      formData.append('FotoPerfilArchivo', selectedPhoto);
    }
    if (selectedCarne) {
      formData.append('FotoCarneArchivo', selectedCarne);
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
              <div className="col-span-full hidden">
                {/* Removed photo/carne dropzones from here */}
              </div>
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
            </div>
          </fieldset>

          {/* Insurance Card Dropzone at the End */}
          <fieldset className="mb-8 border-t border-slate-100 pt-8">
            <legend className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-blue-600">
              <Briefcase className="h-4 w-4" />
              Documentación
            </legend>
            <div className="w-full max-w-md">
              <ImageDropzone 
                label="Carné de Seguro (Opcional)" 
                onImageDrop={(file) => setSelectedCarne(file)} 
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

  const addressParts = [
    titular.pac_calle,
    titular.pac_avenida,
    titular.pac_numero_casa,
    titular.pac_colonia,
    titular.pac_zona ? `Zona ${titular.pac_zona}` : null,
    munDesc,
    depDesc,
    paisDesc,
  ].filter(Boolean);
  
  const addressQuery = addressParts.join(', ');

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
          <div className="sticky top-0 z-30 -mt-4 md:-mt-8 -mx-4 md:-mx-8 px-4 md:px-8 pt-4 md:pt-8 pb-4 mb-8 rounded-3xl bg-white/10 backdrop-blur-lg">
            <div className="flex flex-col md:flex-row items-end gap-6 max-w-5xl mx-auto">
            <div className="relative">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-slate-200 bg-slate-100 flex items-center justify-center text-blue-600 font-bold text-3xl md:text-5xl shadow-lg overflow-hidden">
                {titular.pac_foto_perfil_url ? (
                  <img
                    src={titular.pac_foto_perfil_url}
                    alt={fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
            </div>
            <div className="flex-1 pb-2">
              <div className="flex flex-col gap-2 mb-1">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">{fullName}</h1>
                <div>
                  <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[16px] font-bold uppercase tracking-wider">
                    TITULAR DE LA CUENTA
                  </span>
                </div>
              </div>
            </div>
            <div className="pb-2">
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-slate-900 text-white py-2.5 px-6 rounded-xl hover:bg-slate-800 transition-colors font-semibold shadow-md active:scale-95"
              >
                <Edit3 className="h-4 w-4" />
                Editar Perfil
              </button>
            </div>
          </div>
        </div>

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
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.01] duration-300">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <User className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Información Personal</h2>
                </div>
                <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Nombre Completo</p>
                    <p className="text-sm font-semibold text-slate-900">{fullName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Correo Electrónico</p>
                    <p className="text-sm font-semibold text-slate-900">{userEmail}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Fecha de Nacimiento</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {titular.pac_fecha_nacimiento ? `${formatDate(titular.pac_fecha_nacimiento)}${edad !== null ? ` (${edad} años)` : ''}` : '—'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Género</p>
                    <p className="text-sm font-semibold text-slate-900">{genderLabel}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Tipo de Sangre</p>
                    {titular.pac_tipo_sangre ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-xs">
                        {titular.pac_tipo_sangre}
                      </span>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900">—</p>
                    )}
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Ocupación</p>
                    <p className="text-sm font-semibold text-slate-900">{titular.pac_ocupacion || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Address Card */}
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.01] duration-300">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Dirección</h2>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-2 gap-y-6 gap-x-4 mb-6">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Zona</p>
                    <p className="text-sm font-semibold text-slate-900">{titular.pac_zona || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Casa</p>
                    <p className="text-sm font-semibold text-slate-900">{titular.pac_numero_casa || '—'}</p>
                  </div>
                  
                  {/* Geographic Lookups */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">País</p>
                    <p className="text-sm font-semibold text-slate-900">{paisDesc || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Departamento</p>
                    <p className="text-sm font-semibold text-slate-900">{depDesc || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Municipio</p>
                    <p className="text-sm font-semibold text-slate-900">{munDesc || '—'}</p>
                  </div>
                </div>

                {/* Map Embed */}
                {addressQuery && (
                  <div className="mt-6 rounded-2xl overflow-hidden h-48 relative group bg-slate-100 border border-slate-200">
                    <iframe
                      title="Ubicación del paciente"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(addressQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="grayscale opacity-90 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Contact & Stats Column */}
            <div className="md:col-span-5 space-y-6">
              
              {/* Contact Card */}
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.01] duration-300">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Phone className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Contacto</h2>
                </div>
                
                <div className="space-y-4">
                  <div className={`flex items-center gap-4 p-4 rounded-2xl ${titular.pac_celular ? 'bg-slate-50 border border-slate-200' : 'opacity-50'}`}>
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm border border-slate-100">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Celular</p>
                      <p className={`text-sm font-semibold ${titular.pac_celular ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                        {titular.pac_celular || 'No registrado'}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-4 p-4 rounded-2xl ${titular.pac_telefono_casa ? 'bg-slate-50 border border-slate-200' : 'opacity-50'}`}>
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Teléfono Casa</p>
                      <p className={`text-sm font-semibold ${titular.pac_telefono_casa ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                        {titular.pac_telefono_casa || 'No registrado'}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-4 p-4 rounded-2xl ${titular.pac_telefono_trabajo ? 'bg-slate-50 border border-slate-200' : 'opacity-50'}`}>
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Teléfono Trabajo</p>
                      <p className={`text-sm font-semibold ${titular.pac_telefono_trabajo ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                        {titular.pac_telefono_trabajo || 'No registrado'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Carné de Seguro Card */}
              {titular.pac_foto_carne_seguro && (
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.01] duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                      <Heart className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Carné de Seguro</h2>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-2">
                    <img 
                      src={titular.pac_foto_carne_seguro} 
                      alt="Carné de seguro médico" 
                      className="w-full max-h-48 object-contain rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Loyalty Points Card (Placeholder according to design) */}
              <div className="bg-slate-100 p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Puntos NeoClínica</p>
                      <h4 className="text-3xl md:text-4xl font-black text-blue-600 mt-1">
                        {lealtadEstado ? lealtadEstado.puntosActuales.toLocaleString() : '—'}
                      </h4>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                      <Star className="h-5 w-5" fill="currentColor" />
                    </div>
                  </div>
                  {lealtadEstado && (
                    <>
                      <div className="w-full bg-white/50 h-2 rounded-full mb-4 overflow-hidden border border-slate-200">
                        <div 
                          className="bg-blue-600 h-full rounded-full transition-all duration-1000" 
                          style={{ width: `${Math.min(100, Math.max(0, lealtadEstado.progresoPorcentaje))}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        {lealtadEstado.puntosMaximosNivel - lealtadEstado.puntosActuales > 0 
                          ? `Faltan ${lealtadEstado.puntosMaximosNivel - lealtadEstado.puntosActuales} puntos para tu próximo beneficio.`
                          : '¡Has alcanzado el nivel máximo de beneficios!'}
                      </p>
                    </>
                  )}
                  <Link href="/dashboard/perfil/puntos">
                    <button className="mt-5 w-full py-2.5 bg-white text-blue-600 font-bold rounded-xl shadow-sm border border-slate-200 hover:bg-blue-50 transition-colors">
                      Ver recompensas
                    </button>
                  </Link>
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-200/20 rounded-full blur-3xl transition-transform group-hover:scale-150 duration-700"></div>
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

