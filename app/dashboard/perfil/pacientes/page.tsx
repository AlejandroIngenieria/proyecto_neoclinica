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
} from 'lucide-react';

import { NeoLoader } from '@/components/neo-loader';
import {
  usePacienteTitular,
  useCreateDependiente,
  useUpdatePaciente,
  useDeletePaciente,
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
  codParentesco: string;
};

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const PARENTESCO_OPTIONS = [
  { value: '2', label: 'Cónyuge' },
  { value: '3', label: 'Hijo/a' },
  { value: '4', label: 'Padre/Madre' },
  { value: '5', label: 'Hermano/a' },
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
}: {
  paciente: Paciente;
  isTitular: boolean;
  titularName: string;
  index: number;
  onEdit: (p: Paciente) => void;
  onDelete: (p: Paciente) => void;
}) {
  const fullName = buildPacienteFullName(paciente);
  const initials = getPacienteInitials(paciente);
  const edad = calcularEdad(paciente.pac_fecha_nacimiento);
  const parentesco = isTitular
    ? getParentescoInfo(1)
    : getParentescoInfo(paciente.pac_codpar);
  const isMinor = edad !== null && edad < 18;

  return (
    <div
      className="group relative block overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/10 transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl animate-in fade-in zoom-in-95 duration-500"
    >
      <div className="relative flex flex-col md:flex-row h-full">
        {/* === IMAGEN === */}
        <div className="relative h-48 sm:h-56 md:h-auto md:w-5/12 overflow-hidden shrink-0">
          {paciente.pac_foto_perfil_url ? (
            <img
              src={paciente.pac_foto_perfil_url}
              alt={fullName}
              className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-600 min-h-[180px]">
              <User className="h-16 w-16 sm:h-20 sm:w-20 opacity-50" />
            </div>
          )}

          {/* Gradiente sutil sobre la imagen */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/80" />
          
          {/* Barra decorativa superior */}
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-500" />
          
          {/* Badge parentesco */}
          <span className={`absolute right-4 top-4 z-10 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${parentesco.badgeBg} ${parentesco.badgeText} ${parentesco.badgeBorder} shadow-sm backdrop-blur-md`}>
            {parentesco.label}
          </span>
        </div>

        {/* === INFO === */}
        <div className="flex-1 bg-white p-6 md:p-8 flex flex-col justify-between">
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 mb-6">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Parentesco</p>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Users className="h-4 w-4 text-sky-500" />
                <span>{parentesco.label}</span>
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Edad</p>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Calendar className="h-4 w-4 text-sky-500" />
                <span>{edad !== null ? `${edad} años` : '—'}</span>
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Género</p>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <User className="h-4 w-4 text-sky-500" />
                <span className="capitalize">{paciente.pac_genero?.toLowerCase() || '—'}</span>
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Sangre</p>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Droplets className="h-4 w-4 text-sky-500" />
                <span>{paciente.pac_tipo_sangre || '—'}</span>
              </div>
            </div>
            {isMinor && !isTitular ? (
              <div className="col-span-2 mt-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Responsable</p>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span className="truncate">{titularName}</span>
                </div>
              </div>
            ) : (
              <div className="col-span-2 mt-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Teléfono</p>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Phone className="h-4 w-4 text-sky-500" />
                  <span>{paciente.pac_celular || 'Sin teléfono'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions footer */}
          <div className="mt-auto flex items-center gap-2 pt-2">
            {!isTitular && (
              <button
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                <Unlink className="h-3.5 w-3.5" />
                Independizar
              </button>
            )}

            <button
              onClick={() => onEdit(paciente)}
              className={`flex h-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 ${isTitular ? 'flex-1' : 'w-10'}`}
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
              {isTitular && <span className="ml-2 text-sm font-semibold">Editar</span>}
            </button>

            {!isTitular && (
              <button
                onClick={() => onDelete(paciente)}
                className="flex h-9 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-rose-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

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
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Agrega los miembros de tu grupo familiar para gestionar sus citas y expedientes desde tu cuenta.
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
  titularCodigo,
  onClose,
}: {
  mode: 'add' | 'edit';
  paciente?: Paciente | null;
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
    appendSeguro('ApellidoCasado', paciente?.pac_apellido_casado);
    
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

    if (selectedPhoto) {
      formData.append('FotoPerfilArchivo', selectedPhoto);
    }
    if (selectedCarne) {
      formData.append('FotoCarneArchivo', selectedCarne);
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
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5 sm:px-8">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900">
            {mode === 'add' ? 'Agregar Paciente' : 'Editar Paciente'}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {mode === 'add'
              ? 'Completa los datos del nuevo miembro familiar.'
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>
        </fieldset>

        {/* Section: Documentación */}
        <fieldset className="mb-8 border-t border-slate-100 pt-8">
          <legend className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-blue-600">
            Documentación
          </legend>
          <div className="w-full max-w-md">
            <ImageDropzone 
              label="Carné de Seguro (Opcional)" 
              onImageDrop={(file) => setSelectedCarne(file)} 
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

// ─── Main Content ────────────────────────────────────────────────────────────

function PacientesContent() {
  const { data: session } = useSession();
  const { titular, dependientes, isLoading } = usePacienteTitular();

  const [modalState, setModalState] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    paciente?: Paciente | null;
  }>({ open: false, mode: 'add', paciente: null });

  const openAdd = useCallback(() => setModalState({ open: true, mode: 'add', paciente: null }), []);
  const openEdit = useCallback(
    (p: Paciente) => setModalState({ open: true, mode: 'edit', paciente: p }),
    [],
  );
  const closeModal = useCallback(() => setModalState({ open: false, mode: 'add', paciente: null }), []);

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
      {/* Sticky Header Container */}
      <div className="sticky top-0 z-30 -mt-4 md:-mt-8 -mx-4 md:-mx-8 px-4 md:px-8 pt-4 md:pt-8 pb-4 mb-8 rounded-3xl bg-white/10 backdrop-blur-lg">
        {/* Header Title */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">Pacientes Afiliados</h1>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:self-auto"
          >
            <UserPlus className="h-4 w-4" />
            Agregar Paciente
          </button>
        </div>
      </div>

      {/* Conditional rendering for form vs grid */}
      {modalState.open && titular ? (
        <PacienteForm
          key="paciente-form"
          mode={modalState.mode}
          paciente={modalState.paciente}
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
