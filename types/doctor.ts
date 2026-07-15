import type { ResenaDto } from './resenas';

// ─── Base del expediente médico ───────────────────────────────────────────────

export type ExpedienteDoctor = {
  exp_codigo: string;
  exp_estado: string;
  exp_primer_nom: string;
  exp_segundo_nom: string | null;
  exp_tercer_nom: string | null;
  exp_primer_ape: string;
  exp_segundo_ape: string | null;
  exp_apellido_cas: string | null;
  exp_letra_indice: string | null;
  exp_sexo: string;
  exp_fecha_nacimiento: string;
  exp_edad: number;
  exp_profesion: string;
  exp_estado_civil: string;
  exp_email: string;
  exp_email_corporativo: string | null;
  exp_telefono1: string | null;
  exp_telefono2: string | null;
  exp_dpi: string | null;
  exp_colegiado_gt: string | null;
  exp_presentacion: string | null;
  exp_edad_minima_atencion: number | null;
  exp_anios_experiencia: number | null;
  exp_foto_perfil: string | null;
  exp_nombre_factura: string | null;
  exp_nit_factura: string | null;
  exp_direccion_factura: string | null;
  exp_email_factura: string | null;
};

// ─── Sub-colecciones del doctor ──────────────────────────────────────────────

export type DoctorEspecialidad = { especialidad: string };
export type DoctorModalidad = { modalidad: string };
export type DoctorIdioma = { idioma: string };
export type DoctorSintoma = { sintoma: string };
export type DoctorTipoConsulta = { tipo_consulta: string };

export type DoctorMetodoPago = {
  tipo_pago: string;
  observaciones: string | null;
};

export type DoctorAseguradora = {
  aseguradora: string;
  imagen: string | null;
};

// ─── Clínicas y horarios ─────────────────────────────────────────────────────

export type DoctorClinicaHorario = {
  hor_dia_semana: number;
  hor_hora_inicio: string;
  hor_hora_fin: string;
};

export type DoctorClinica = {
  cli_tipo: string | null;
  cli_descripcion: string | null;
  cli_direccion_completa: string | null;
  cli_zona: string | null;
  cli_latitud: number | null;
  cli_longitud: number | null;
  cli_telefono1: string | null;
  mcl_precio_base: number | null;
  horarios_atencion: DoctorClinicaHorario[];
};

// ─── Servicios y precios ─────────────────────────────────────────────────────

export type DoctorServicio = {
  servicio: string | null;
  syp_costo_sin_iva: number | null;
  syp_costo_iva: number | null;
  syp_costo_total: number | null;
  syp_observaciones: string | null;
};

// ─── Atención a domicilio ────────────────────────────────────────────────────

export type DoctorAtencionDomicilio = {
  lad_zonas: string | null;
  lad_observaciones: string | null;
  pai_descripcion: string | null;
  dep_descripcion: string | null;
  mun_descripcion: string | null;
};

// ─── Formación y trayectoria ─────────────────────────────────────────────────

export type DoctorEducacion = {
  edu_institucion: string;
  edu_titulo_obtenido: string;
  edu_anio_inicio: number | null;
  edu_anio_fin: number | null;
  pais: string;
};

export type DoctorCurso = {
  cur_institucion: string;
  cur_titulo_obtenido: string;
  cur_anio: number | null;
  tipo_curso: string;
  pais: string;
};

export type DoctorReconocimiento = {
  descripcion: string;
  anio: number;
  institucion: string;
};

// ─── Redes sociales y fotos ──────────────────────────────────────────────────

export type DoctorRedSocial = {
  red_social: string;
  url: string;
};

export type DoctorFotoTrabajo = { url: string };

// ─── Respuesta completa del API ──────────────────────────────────────────────

export type DoctorResponse = ExpedienteDoctor & {
  pais_registro: string | null;
  pais_nacimiento: string | null;
  nacionalidad: string | null;
  departamento_nacimiento: string | null;
  municipio_nacimiento: string | null;
  especialidades: DoctorEspecialidad[];
  modalidades: DoctorModalidad[];
  idiomas: DoctorIdioma[];
  tipos_consulta: DoctorTipoConsulta[];
  metodos_pago: DoctorMetodoPago[];
  sintomas: DoctorSintoma[];
  aseguradoras: DoctorAseguradora[];
  clinicas: DoctorClinica[];
  servicios: DoctorServicio[];
  atencion_domicilio: DoctorAtencionDomicilio[];
  educacion: DoctorEducacion[];
  cursos: DoctorCurso[];
  reconocimientos: DoctorReconocimiento[];
  redes_sociales: DoctorRedSocial[];
  fotos_trabajo: DoctorFotoTrabajo[];
  promedio_valoracion: number;
  total_resenas: number;
  resenas: ResenaDto[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Devuelve `true` si el doctor tiene estado activo. */
export function isDoctorActive(doctor: Pick<ExpedienteDoctor, 'exp_estado'>): boolean {
  return doctor.exp_estado === 'A';
}

/** Construye el nombre completo a partir de los campos del expediente. */
export function buildDoctorFullName(
  doctor: Pick<ExpedienteDoctor, 'exp_primer_nom' | 'exp_segundo_nom' | 'exp_primer_ape' | 'exp_segundo_ape' | 'exp_apellido_cas'>,
): string {
  return [doctor.exp_primer_nom, doctor.exp_segundo_nom, doctor.exp_primer_ape, doctor.exp_segundo_ape, doctor.exp_apellido_cas]
    .filter(Boolean)
    .join(' ');
}

// ─── Favoritos ────────────────────────────────────────────────────────────────

export type MedicoFavorito = {
  favCodigo: string;
  expCodigo: string;
  nombreCompleto: string;
  fotoPerfilUrl: string | null;
  especialidadPrincipal: string;
  promedioValoracion: number;
  totalResenas: number;
  precioBaseConsulta: number | null;
  fechaAgregado: string;
};
