'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import {
  User,
  Phone,
  Calendar,
  X,
  ShieldCheck,
  Droplets,
  Heart,
  Mail,
  FileText,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getPaises, getDepartamentosPorPais, getMunicipiosPorDepartamento } from '@/lib/api-client';
import { useCreateDependiente, useUpdatePaciente } from '@/hooks/use-pacientes';
import { completarTareaLealtad } from '@/services/lealtad';
import { ImageDropzone } from '@/components/image-dropzone';
import { DocumentDropzone } from '@/components/document-dropzone';
import type { Paciente, Pais, Departamento, Municipio } from '@/types';

// ─── Form types ──────────────────────────────────────────────────────────────

export type PacienteFormData = {
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

const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: 20, transition: { duration: 0.2 } },
};

export function PacienteForm({
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
  const { data: session } = useSession();
  const sessionUserId = (session as any)?.userId;
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
      const usuarioGrabId = sessionUserId || titular?.pac_codusu || titular?.pac_codigo || titularCodigo;
      const titularId = titular?.pac_codigo || titularCodigo || usuarioGrabId;

      formData.append('TitularCodigo', titularId);
      formData.append('titularCodigo', titularId);

      formData.append('CodParentesco', data.codParentesco);
      formData.append('codParentesco', data.codParentesco);

      formData.append('UsuarioGrabacion', usuarioGrabId);
      formData.append('usuarioGrabacion', usuarioGrabId);
      formData.append('UsuarioGrabacionId', usuarioGrabId);
      formData.append('usuarioGrabacionId', usuarioGrabId);
      formData.append('usuario_grabacion_id', usuarioGrabId);

      formData.append('UsuCodigo', usuarioGrabId);
      formData.append('usuCodigo', usuarioGrabId);

      await createDep.mutateAsync({
        body: formData,
      });
    } else if (paciente) {
      await updatePac.mutateAsync({
        pacCodigo: paciente.pac_codigo,
        body: formData,
      });
    }

    // Otorga puntos por la misión COMPLETAR_PERFIL
    const userToken = (session as any)?.accessToken;
    if (userToken) {
      completarTareaLealtad(userToken, 'COMPLETAR_PERFIL').catch((err) =>
        console.warn('Misión COMPLETAR_PERFIL ya completada o sin acción:', err)
      );
    }

    onClose();
  };

  const inputClasses =
    'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/40';
  const labelClasses = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400';

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full max-w-4xl mx-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1E293B] px-6 py-5 sm:px-8">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            {mode === 'add' ? 'Agregar Paciente Dependiente' : 'Editar Paciente'}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {mode === 'add'
              ? 'Completa los datos del nuevo familiar o dependiente.'
              : 'Modifica la información del paciente.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-8 sm:px-10 max-h-[80vh] overflow-y-auto">
        
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
          <legend className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
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

            {/* Parentesco (solo en creación de dependiente) */}
            {mode === 'add' && (
              <div className="mt-4">
                <label className={labelClasses}>Parentesco con el titular *</label>
                <select
                  {...register('codParentesco', { required: 'Seleccione parentesco' })}
                  className={inputClasses}
                >
                  <option value="">Seleccionar parentesco</option>
                  {PARENTESCO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.codParentesco && (
                  <p className="mt-1 text-xs text-rose-500">{errors.codParentesco.message}</p>
                )}
              </div>
            )}
        </fieldset>

        {/* Section: Información Médica y Adicional */}
        <fieldset className="mb-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <legend className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">
            <Heart className="h-4 w-4" />
            Información Adicional
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Tipo de sangre</label>
              <select {...register('pac_tipo_sangre')} className={inputClasses}>
                <option value="">Seleccionar</option>
                {BLOOD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClasses}>Ocupación / Profesión</label>
              <input
                {...register('pac_ocupacion')}
                className={inputClasses}
                placeholder="Ej: Estudiante, Ingeniero, etc."
              />
            </div>
          </div>
        </fieldset>

        {/* Section: Contacto y Dirección */}
        <fieldset className="mb-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <legend className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">
              <Phone className="h-4 w-4" />
              Contacto y Dirección
            </legend>

            {mode === 'add' && titular && (
              <button
                type="button"
                onClick={handleCopyTitularData}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar datos del titular
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClasses}>Celular</label>
              <input {...register('pac_celular')} className={inputClasses} placeholder="Ej: 55551234" />
            </div>
            <div>
              <label className={labelClasses}>Teléfono casa</label>
              <input {...register('pac_telefono_casa')} className={inputClasses} placeholder="Ej: 22221234" />
            </div>
            <div>
              <label className={labelClasses}>Teléfono trabajo</label>
              <input {...register('pac_telefono_trabajo')} className={inputClasses} placeholder="Ej: 23331234" />
            </div>
          </div>

          {/* Dirección Cascading Selects */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div>
              <label className={labelClasses}>País</label>
              <select {...register('pac_pais_dir_id')} onChange={handlePaisChange} className={inputClasses}>
                <option value="">Seleccionar País</option>
                {paises.map((p) => (
                  <option key={p.pai_codigo} value={p.pai_codigo}>
                    {p.pai_descripcion}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClasses}>Departamento</label>
              <select {...register('pac_dep_dir_id')} onChange={handleDepChange} disabled={!selectedPais} className={inputClasses}>
                <option value="">Seleccionar Dep.</option>
                {departamentos.map((d) => (
                  <option key={d.dep_codigo} value={d.dep_codigo}>
                    {d.dep_descripcion}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClasses}>Municipio</label>
              <select {...register('pac_mun_dir_id')} disabled={!selectedDep} className={inputClasses}>
                <option value="">Seleccionar Mun.</option>
                {municipios.map((m) => (
                  <option key={m.mun_codigo} value={m.mun_codigo}>
                    {m.mun_descripcion}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div>
              <label className={labelClasses}>Zona</label>
              <input {...register('pac_zona')} className={inputClasses} placeholder="Ej: 10" />
            </div>
            <div>
              <label className={labelClasses}>Colonia / Barrio</label>
              <input {...register('pac_colonia')} className={inputClasses} placeholder="Ej: Las Charcas" />
            </div>
            <div>
              <label className={labelClasses}>Avenida</label>
              <input {...register('pac_avenida')} className={inputClasses} placeholder="Ej: 5ta Avenida" />
            </div>
            <div>
              <label className={labelClasses}>Calle / No. Casa</label>
              <input {...register('pac_calle')} className={inputClasses} placeholder="Ej: 12-45" />
            </div>
          </div>
        </fieldset>

        {/* Section: Documentación */}
        <fieldset className="mb-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <legend className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">
            <FileText className="h-4 w-4" />
            Documentación
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ImageDropzone
              label="Foto Carné de Seguro"
              initialImageUrl={paciente?.pac_foto_carne_seguro}
              onImageDrop={(file) => setSelectedCarne(file)}
            />

            <DocumentDropzone
              label="DPI / Certificado de Nacimiento / Pasaporte"
              initialDocumentUrl={paciente?.pac_documento_identificacion_url}
              onDocumentDrop={(file) => setSelectedDocumento(file)}
            />
          </div>
        </fieldset>

        {/* Section: Contacto de Emergencia */}
        <fieldset className="mb-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <legend className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">
            <ShieldCheck className="h-4 w-4" />
            Contacto de Emergencia
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClasses}>Nombre Completo</label>
              <input {...register('pac_contacto_emergencia_nombre')} className={inputClasses} placeholder="Ej: Juan Pérez" />
            </div>
            <div>
              <label className={labelClasses}>Relación / Parentesco</label>
              <input {...register('pac_contacto_emergencia_relacion')} className={inputClasses} placeholder="Ej: Esposo, Hermano" />
            </div>
            <div>
              <label className={labelClasses}>Teléfono</label>
              <input {...register('pac_contacto_emergencia_telefono')} className={inputClasses} placeholder="Ej: 55551234" />
            </div>
          </div>
        </fieldset>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : mode === 'add' ? 'Guardar Paciente' : 'Actualizar Paciente'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

/** Wrapper modal flotante para mostrar PacienteForm en diálogos (por ejemplo, en el Wizard de citas). */
export function PacienteFormModal({
  open,
  mode = 'add',
  paciente,
  titular,
  titularCodigo,
  onClose,
}: {
  open: boolean;
  mode?: 'add' | 'edit';
  paciente?: Paciente | null;
  titular?: Paciente | null;
  titularCodigo: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 md:p-10 flex items-center justify-center">
        <div className="w-full max-w-4xl max-h-full">
          <PacienteForm
            mode={mode}
            paciente={paciente}
            titular={titular}
            titularCodigo={titularCodigo}
            onClose={onClose}
          />
        </div>
      </div>
    </AnimatePresence>
  );
}
