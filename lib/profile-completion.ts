import type { Paciente } from '@/types';

export interface ProfileFieldCheck {
  key: string;
  label: string;
  category: 'identidad' | 'contacto' | 'ubicacion' | 'seguridad' | 'documentos';
  isFilled: (paciente: Paciente) => boolean;
}

export const PROFILE_FIELDS_TO_CHECK: ProfileFieldCheck[] = [
  {
    key: 'nombres',
    label: 'Nombres',
    category: 'identidad',
    isFilled: (p) => Boolean(p.pac_primer_nombre && p.pac_primer_nombre.trim() !== '' && p.pac_primer_nombre !== 'Pendiente'),
  },
  {
    key: 'apellidos',
    label: 'Apellidos',
    category: 'identidad',
    isFilled: (p) => Boolean(p.pac_primer_apellido && p.pac_primer_apellido.trim() !== ''),
  },
  {
    key: 'fecha_nacimiento',
    label: 'Fecha de nacimiento',
    category: 'identidad',
    isFilled: (p) => Boolean(p.pac_fecha_nacimiento),
  },
  {
    key: 'genero',
    label: 'Género',
    category: 'identidad',
    isFilled: (p) => Boolean(p.pac_genero && p.pac_genero.trim() !== ''),
  },
  {
    key: 'foto_perfil',
    label: 'Foto de perfil',
    category: 'identidad',
    isFilled: (p) => Boolean(p.pac_foto_perfil_url && p.pac_foto_perfil_url.trim() !== ''),
  },
  {
    key: 'telefonos',
    label: 'Teléfonos',
    category: 'contacto',
    isFilled: (p) => Boolean((p.pac_celular && p.pac_celular.trim() !== '') || (p.pac_telefono_casa && p.pac_telefono_casa.trim() !== '') || (p.pac_telefono_trabajo && p.pac_telefono_trabajo.trim() !== '')),
  },
  {
    key: 'tipo_sangre',
    label: 'Tipo de sangre',
    category: 'seguridad',
    isFilled: (p) => Boolean(p.pac_tipo_sangre && p.pac_tipo_sangre.trim() !== ''),
  },
  {
    key: 'direccion',
    label: 'Dirección y ubicación',
    category: 'ubicacion',
    isFilled: (p) => Boolean(p.pac_dep_dir_id && p.pac_mun_dir_id),
  },
  {
    key: 'contacto_emergencia',
    label: 'Contacto de emergencia',
    category: 'contacto',
    isFilled: (p) => Boolean(p.pac_contacto_emergencia_nombre && p.pac_contacto_emergencia_telefono),
  },
  {
    key: 'seguro',
    label: 'Seguro médico',
    category: 'documentos',
    isFilled: (p) => Boolean(p.pac_foto_carne_seguro && p.pac_foto_carne_seguro.trim() !== ''),
  },
  {
    key: 'documento_identidad',
    label: 'Documento DPI / Identificación',
    category: 'documentos',
    isFilled: (p) => Boolean(p.pac_documento_identificacion_url && p.pac_documento_identificacion_url.trim() !== ''),
  },
];

export interface ProfileCompleteness {
  percentage: number;
  isComplete: boolean;
  totalFields: number;
  completedFields: number;
  missingLabels: string[];
  missingItems: { key: string; label: string }[];
  completedItems: { key: string; label: string }[];
}

/**
 * Calcula el porcentaje de completitud del perfil del paciente y retorna los campos faltantes.
 */
export function calculateProfileCompleteness(paciente: Paciente | null | undefined): ProfileCompleteness {
  if (!paciente) {
    return {
      percentage: 0,
      isComplete: false,
      totalFields: PROFILE_FIELDS_TO_CHECK.length,
      completedFields: 0,
      missingLabels: PROFILE_FIELDS_TO_CHECK.map((f) => f.label),
      missingItems: PROFILE_FIELDS_TO_CHECK.map((f) => ({ key: f.key, label: f.label })),
      completedItems: [],
    };
  }

  const missingItems: { key: string; label: string }[] = [];
  const completedItems: { key: string; label: string }[] = [];

  for (const field of PROFILE_FIELDS_TO_CHECK) {
    if (field.isFilled(paciente)) {
      completedItems.push({ key: field.key, label: field.label });
    } else {
      missingItems.push({ key: field.key, label: field.label });
    }
  }

  const totalFields = PROFILE_FIELDS_TO_CHECK.length;
  const completedFields = completedItems.length;
  const percentage = Math.round((completedFields / totalFields) * 100);

  return {
    percentage,
    isComplete: percentage === 100,
    totalFields,
    completedFields,
    missingLabels: missingItems.map((i) => i.label),
    missingItems,
    completedItems,
  };
}
