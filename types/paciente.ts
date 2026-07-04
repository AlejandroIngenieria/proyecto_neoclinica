// ─── Modelo de Paciente ──────────────────────────────────────────────────────
// Mapea exactamente al JSON del backend (.NET)

export type Paciente = {
  pac_codigo: string;
  pac_codusu: string;
  pac_titular: boolean;
  pac_codpac: string | null;
  pac_codpar: number | null;
  parentesco_descripcion: string | null;
  pac_primer_nombre: string;
  pac_segundo_nombre: string | null;
  pac_primer_apellido: string;
  pac_segundo_apellido: string | null;
  pac_apellido_casado: string | null;
  pac_fecha_nacimiento: string | null;
  pac_genero: string | null;
  pac_tipo_sangre: string | null;
  pac_ocupacion: string | null;
  pac_foto_perfil_url: string | null;
  pac_foto_carne_seguro: string | null;
  // Ubicación de nacimiento
  pac_pais_nac_id: number | null;
  pac_dep_nac_id: number | null;
  pac_mun_nac_id: number | null;
  // Dirección
  pac_pais_dir_id: number | null;
  pac_dep_dir_id: number | null;
  pac_mun_dir_id: number | null;
  pac_aldea: string | null;
  pac_zona: string | null;
  pac_colonia: string | null;
  pac_avenida: string | null;
  pac_calle: string | null;
  pac_numero_casa: string | null;
  // Contacto
  pac_celular: string | null;
  pac_telefono_casa: string | null;
  pac_telefono_trabajo: string | null;
};

/** Payload para crear un paciente (pac_codigo se genera en el backend). */
export type PacienteCreatePayload = Partial<Pick<Paciente, 'pac_codigo'>> & Omit<Paciente, 'pac_codigo'>;

// ─── Parentesco ──────────────────────────────────────────────────────────────

export type ParentescoInfo = {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
};

export const PARENTESCO_MAP: Record<number, ParentescoInfo> = {
  1: {
    label: 'TITULAR',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
  },
  2: {
    label: 'CÓNYUGE',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
  },
  3: {
    label: 'HIJO/A',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
  },
  4: {
    label: 'PADRE/MADRE',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
  },
  5: {
    label: 'HERMANO/A',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-700',
    badgeBorder: 'border-violet-200',
  },
};

export const PARENTESCO_DEFAULT: ParentescoInfo = {
  label: 'FAMILIAR',
  badgeBg: 'bg-slate-50',
  badgeText: 'text-slate-600',
  badgeBorder: 'border-slate-200',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getParentescoInfo(codParentesco: number | null): ParentescoInfo {
  if (codParentesco === null) return PARENTESCO_DEFAULT;
  return PARENTESCO_MAP[codParentesco] ?? PARENTESCO_DEFAULT;
}

export function buildPacienteFullName(p: Paciente): string {
  return [p.pac_primer_nombre, p.pac_segundo_nombre, p.pac_primer_apellido, p.pac_segundo_apellido]
    .filter(Boolean)
    .join(' ');
}

export function calcularEdad(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  if (isNaN(nacimiento.getTime())) return null;
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mesActual = hoy.getMonth();
  const mesNacimiento = nacimiento.getMonth();

  if (mesActual < mesNacimiento || (mesActual === mesNacimiento && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }

  return edad;
}

/** Verifica si el paciente tiene datos pendientes de llenar. */
export function isPacientePendiente(p: Paciente): boolean {
  return (
    p.pac_primer_nombre === 'Pendiente' ||
    !p.pac_fecha_nacimiento ||
    !p.pac_genero
  );
}

export function getPacienteInitials(p: Paciente): string {
  const parts = [p.pac_primer_nombre, p.pac_primer_apellido].filter(Boolean);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'P';
}
