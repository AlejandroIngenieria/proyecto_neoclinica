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
  exp_fecha_inicio_experiencia?: string | null; // NUEVO: Fecha en formato ISO (YYYY-MM-DD)
  exp_anios_experiencia: number | null;
  exp_foto_perfil: string | null;
  exp_nombre_factura: string | null;
  exp_nit_factura: string | null;
  exp_direccion_factura: string | null;
  exp_email_factura: string | null;
};

// ─── Sub-colecciones del doctor ──────────────────────────────────────────────

export type DoctorEspecialidad = {
  esp_codigo?: number;
  especialidad: string;
  nivel?: 'especialidad' | 'sub_especialidad' | 'alta_especialidad' | string;
};
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
  cli_url_google_maps?: string | null;
  cli_url_waze?: string | null;
  mcl_precio_base: number | null;
  horarios_atencion: DoctorClinicaHorario[];
};

// ─── Servicios y precios ─────────────────────────────────────────────────────

export type DoctorServicio = {
  syp_codigo?: number | null;
  servicio: string | null;
  syp_costo_sin_iva?: number | null;
  syp_costo_iva?: number | null;
  syp_costo_total: number | null;
  syp_observaciones?: string | null;
  cli_descripcion?: string | null;
  cli_codigo?: number | null;
  modalidad?: 'presencial' | 'domicilio' | 'virtual' | string | null;
  zona?: string | null;
};

// ─── Atención a domicilio ────────────────────────────────────────────────────

export type DoctorAtencionDomicilio = {
  lad_zonas: string | null;
  lad_observaciones: string | null;
  pai_descripcion: string | null;
  dep_descripcion: string | null;
  mun_descripcion: string | null;
  lad_precio_base?: number | null;
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
  cuentas_bancarias?: DoctorCuentaBancaria[];
};

export type DoctorCuentaBancaria = {
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  nombre_cuenta: string;
};

export type DoctorDetail = DoctorResponse;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Devuelve `true` si el doctor tiene estado activo. */
export function isDoctorActive(doctor: Pick<ExpedienteDoctor, 'exp_estado'>): boolean {
  return doctor.exp_estado === 'A';
}

/** Devuelve el prefijo de título médico según el sexo ('Dr.' o 'Dra.'). */
export function getDoctorTitle(sexo?: string): string {
  const s = (sexo || '').trim().toUpperCase();
  return s === 'F' ? 'Dra.' : 'Dr.';
}

/** Construye el nombre completo a partir de los campos del expediente (incluyendo prefijo Dr./Dra. y apellido de casada). */
export function buildDoctorFullName(
  doctor: Pick<ExpedienteDoctor, 'exp_primer_nom' | 'exp_segundo_nom' | 'exp_primer_ape' | 'exp_segundo_ape' | 'exp_apellido_cas'> & { exp_sexo?: string },
  options?: { includeTitle?: boolean }
): string {
  const parts = [
    doctor.exp_primer_nom,
    doctor.exp_segundo_nom,
    doctor.exp_primer_ape,
    doctor.exp_segundo_ape,
  ];

  if (doctor.exp_apellido_cas) {
    const casTrim = doctor.exp_apellido_cas.trim();
    parts.push(casTrim.toLowerCase().startsWith('de ') ? casTrim : `de ${casTrim}`);
  }

  const baseName = parts.filter(Boolean).join(' ');
  if (!baseName) return '';

  if (options?.includeTitle ?? true) {
    if (!/^dr(a)?\./i.test(baseName)) {
      const title = getDoctorTitle(doctor.exp_sexo);
      return `${title} ${baseName}`;
    }
  }

  return baseName;
}

/** Construye el nombre corto (Primer Nombre + Primer Apellido) para vistas de cuadrícula compacta. */
export function buildDoctorShortName(
  doctor: Pick<ExpedienteDoctor, 'exp_primer_nom' | 'exp_primer_ape'> & { exp_sexo?: string },
  options?: { includeTitle?: boolean }
): string {
  const parts = [doctor.exp_primer_nom, doctor.exp_primer_ape].filter(Boolean);
  const baseName = parts.join(' ');
  if (!baseName) return '';

  if (options?.includeTitle ?? true) {
    if (!/^dr(a)?\./i.test(baseName)) {
      const title = getDoctorTitle(doctor.exp_sexo);
      return `${title} ${baseName}`;
    }
  }

  return baseName;
}

/**
 * Obtiene el precio más bajo real del médico:
 * Considera el mínimo entre todos los servicios disponibles y los precios base de sus clínicas.
 */
export function getDoctorLowestPrice(doctor: DoctorResponse): number | null {
  const preciosServicios = (doctor.servicios || [])
    .map((s) => s.syp_costo_total)
    .filter((p): p is number => typeof p === 'number' && Number.isFinite(p) && p > 0);

  const preciosClinicas = (doctor.clinicas || [])
    .map((c) => c.mcl_precio_base)
    .filter((p): p is number => typeof p === 'number' && Number.isFinite(p) && p > 0);

  const allPrices = [...preciosServicios, ...preciosClinicas];
  if (allPrices.length > 0) {
    return Math.min(...allPrices);
  }

  return 0;
}

/**
 * Genera la etiqueta formateada general del médico para mostrar en tarjetas iniciales y mapas.
 */
export function getDoctorPriceDisplay(doctor: DoctorResponse): {
  price: number;
  hasPrice: boolean;
  label: string;
} {
  const price = getDoctorLowestPrice(doctor);
  if (price !== null && price > 0) {
    const rounded = Math.round(price);
    return {
      price: rounded,
      hasPrice: true,
      label: `Desde Q${new Intl.NumberFormat('es-GT').format(rounded)}`,
    };
  }
  return {
    price: 0,
    hasPrice: false,
    label: 'Precio no establecido',
  };
}

/**
 * Obtiene el precio más bajo para una ubicación específica (clínica física o atención a domicilio)
 * o el precio general si no hay una ubicación seleccionada.
 */
export function getDoctorLocationPrice(
  doctor: DoctorResponse,
  selectedClinicIndex?: number | null
): {
  price: number;
  hasPrice: boolean;
  label: string;
  locationName: string;
} {
  // 1. Caso Atención a Domicilio seleccionada (índice -1)
  if (selectedClinicIndex === -1) {
    const dom = doctor.atencion_domicilio?.[0];
    const domServices = (doctor.servicios || []).filter(
      (s) => (s as any).modalidad === 'domicilio' || (s.servicio || '').toLowerCase().includes('domicilio')
    );
    const domPrices = domServices
      .map((s) => s.syp_costo_total)
      .filter((p): p is number => typeof p === 'number' && Number.isFinite(p) && p > 0);

    let price = 0;
    if (dom?.lad_precio_base && dom.lad_precio_base > 0) {
      price = Math.round(dom.lad_precio_base);
    } else if (domPrices.length > 0) {
      price = Math.round(Math.min(...domPrices));
    } else {
      // Tarifa estimada de atención a domicilio: precio base con suplemento estándar de traslado
      const basePrices = (doctor.clinicas || [])
        .map((c) => c.mcl_precio_base)
        .filter((p): p is number => typeof p === 'number' && p > 0);
      const base = basePrices.length > 0 ? Math.max(...basePrices) : (getDoctorLowestPrice(doctor) || 300);
      price = Math.round((base * 1.15) / 10) * 10;
    }

    return {
      price,
      hasPrice: price > 0,
      label: price > 0 ? `Desde Q${new Intl.NumberFormat('es-GT').format(price)}` : 'Tarifa a convenir',
      locationName: 'A Domicilio',
    };
  }

  // 2. Caso Clínica / Sede específica seleccionada (índice >= 0)
  if (
    typeof selectedClinicIndex === 'number' &&
    selectedClinicIndex >= 0 &&
    doctor.clinicas?.[selectedClinicIndex]
  ) {
    const clinic = doctor.clinicas[selectedClinicIndex];
    const clinicName = (clinic.cli_descripcion || '').trim().toLowerCase();

    // Buscar si hay servicios específicamente catalogados para esta sede
    const clinicServices = (doctor.servicios || []).filter((s) => {
      const desc = ((s as any).cli_descripcion || s.syp_observaciones || '').trim().toLowerCase();
      return desc && clinicName && desc.includes(clinicName);
    });

    const clinicServicePrices = clinicServices
      .map((s) => s.syp_costo_total)
      .filter((p): p is number => typeof p === 'number' && p > 0);

    const candidates = [...clinicServicePrices];
    if (typeof clinic.mcl_precio_base === 'number' && clinic.mcl_precio_base > 0) {
      candidates.push(clinic.mcl_precio_base);
    }

    if (candidates.length > 0) {
      const price = Math.round(Math.min(...candidates));
      return {
        price,
        hasPrice: true,
        label: `Desde Q${new Intl.NumberFormat('es-GT').format(price)}`,
        locationName: clinic.cli_descripcion || 'Sede seleccionada',
      };
    }
  }

  // 3. Fallback: Precio general más bajo del médico
  const generalPrice = getDoctorLowestPrice(doctor) || 0;
  const rounded = Math.round(generalPrice);
  return {
    price: rounded,
    hasPrice: rounded > 0,
    label: rounded > 0 ? `Desde Q${new Intl.NumberFormat('es-GT').format(rounded)}` : 'Precio no establecido',
    locationName: 'Todas las sedes',
  };
}

export type LocationServicesGroup = {
  id: string;
  name: string;
  type: 'clinica' | 'domicilio';
  zona?: string | null;
  basePrice?: number | null;
  address?: string | null;
  services: DoctorServicio[];
};

/**
 * Organiza y adapta los servicios del médico separándolos por ubicación (clínicas y domicilio).
 * Si la base de datos no tiene una asignación directa por sede, calcula y segmenta los servicios
 * respetando el mcl_precio_base de cada clínica y la tarifa de atención a domicilio.
 */
export function getDoctorGroupedServices(doctor: DoctorResponse): LocationServicesGroup[] {
  const groups: LocationServicesGroup[] = [];
  const clinicas = doctor.clinicas || [];
  const hasDomicilio = !!(doctor.atencion_domicilio && doctor.atencion_domicilio.length > 0);
  const rawServices = doctor.servicios || [];

  // 1. Grupos de sedes físicas (Hospitales y Clínicas)
  clinicas.forEach((cli, idx) => {
    const clinicName = cli.cli_descripcion || `Sede ${idx + 1}`;
    const clinicLower = clinicName.toLowerCase();
    const basePrice = cli.mcl_precio_base || getDoctorLowestPrice(doctor) || 250;

    // Servicios explícitamente asignados a esta sede
    let clinicServices = rawServices.filter((s) => {
      const desc = ((s as any).cli_descripcion || s.syp_observaciones || '').toLowerCase();
      return desc && desc.includes(clinicLower);
    });

    // Si los servicios en DB no tienen sede asignada, derivamos los servicios adaptados para esta sede
    if (clinicServices.length === 0 && rawServices.length > 0) {
      const globalBase = getDoctorLowestPrice(doctor) || basePrice;
      const ratio = globalBase > 0 ? basePrice / globalBase : 1;

      clinicServices = rawServices.map((s, sIdx) => {
        const rawCost = s.syp_costo_total || basePrice;
        const isGeneral = sIdx === 0 || (s.servicio || '').toLowerCase().includes('consulta') || (s.servicio || '').toLowerCase().includes('rutina');
        const finalCost = isGeneral ? basePrice : Math.round((rawCost * ratio) / 10) * 10;

        return {
          ...s,
          syp_codigo: s.syp_codigo ? s.syp_codigo * 100 + idx : (idx + 1) * 1000 + sIdx,
          syp_costo_total: finalCost,
          cli_descripcion: clinicName,
          modalidad: 'presencial',
        };
      });
    }

    // Asegurar que exista al menos el servicio de consulta médica en esta sede
    if (clinicServices.length === 0) {
      clinicServices.push({
        syp_codigo: (idx + 1) * 1000,
        servicio: `Consulta Médica General`,
        syp_costo_total: basePrice,
        syp_costo_sin_iva: basePrice,
        syp_costo_iva: 0,
        syp_observaciones: cli.cli_direccion_completa ? `${cli.cli_direccion_completa} (${cleanZonaText(cli.cli_zona)})` : 'Atención presencial en consultorio',
        cli_descripcion: clinicName,
        modalidad: 'presencial',
      });
    }

    groups.push({
      id: `clinica-${idx}`,
      name: clinicName,
      type: 'clinica',
      zona: cleanZonaText(cli.cli_zona),
      basePrice: Math.round(basePrice),
      address: cli.cli_direccion_completa || undefined,
      services: clinicServices,
    });
  });

  // 2. Grupo de atención a domicilio
  if (hasDomicilio) {
    const dom = doctor.atencion_domicilio[0];
    const zonasStr = cleanZonasDomicilio(dom?.lad_zonas).replace(/[()]/g, '');
    const highestClinicBase = Math.max(...clinicas.map((c) => c.mcl_precio_base || 0), getDoctorLowestPrice(doctor) || 250);
    const domBasePrice = dom?.lad_precio_base || Math.round((highestClinicBase * 1.15) / 10) * 10;

    let domServices = rawServices.filter(
      (s) => (s as any).modalidad === 'domicilio' || (s.servicio || '').toLowerCase().includes('domicilio')
    );

    if (domServices.length === 0) {
      domServices = [
        {
          syp_codigo: 9001,
          servicio: `Consulta Médica a Domicilio`,
          syp_costo_total: domBasePrice,
          syp_costo_sin_iva: domBasePrice,
          syp_costo_iva: 0,
          syp_observaciones: zonasStr ? `Cobertura en: ${zonasStr}` : 'Visita y evaluación médica a domicilio',
          cli_descripcion: 'A Domicilio',
          modalidad: 'domicilio',
          zona: dom?.lad_zonas || undefined,
        },
        ...rawServices.slice(1, 4).map((s, sIdx) => ({
          ...s,
          syp_codigo: 9002 + sIdx,
          servicio: `${s.servicio} a Domicilio`,
          syp_costo_total: Math.round(((s.syp_costo_total || domBasePrice) * 1.15) / 10) * 10,
          syp_observaciones: zonasStr ? `Atención a domicilio en ${zonasStr}` : s.syp_observaciones,
          cli_descripcion: 'A Domicilio',
          modalidad: 'domicilio',
          zona: dom?.lad_zonas || undefined,
        })),
      ];
    }

    groups.push({
      id: 'domicilio',
      name: 'A Domicilio',
      type: 'domicilio',
      zona: zonasStr,
      basePrice: domBasePrice,
      address: zonasStr ? `Zonas de cobertura: ${zonasStr}` : 'Atención médica en tu domicilio',
      services: domServices,
    });
  }

  return groups;
}

// ─── Helpers de formato de ubicación y zonas ─────────────────────────────────

/** Limpia y formatea el texto de una zona (ej: "15", "Zona 15", "Z. 15", "Z.ona 15" -> "Zona 15"). */
export function cleanZonaText(zona?: string | number | null): string {
  if (!zona) return '';
  let str = String(zona).trim();
  if (!str) return '';
  str = str.replace(/^(z\.?ona\s*|zonas?\s*|z\.\s*|z\s+)+/gi, '').trim();
  return str ? `Zona ${str}` : '';
}

/** Formato estándar de zona para tarjetas y listados (ej: "15", "Zona 15" -> "Zona 15"). */
export function cleanZonaShort(zona?: string | number | null): string {
  return cleanZonaText(zona);
}

/** Limpia y formatea las zonas para atención a domicilio (ej: "10, 14", "Zonas 10, 14" -> "(Zonas 10, 14)"). */
export function cleanZonasDomicilio(zonas?: string | null): string {
  if (!zonas) return '';
  let str = String(zonas).trim();
  if (!str) return '';
  str = str.replace(/^(z\.?onas?\s*|zonas?\s*|z\.\s*|z\s+)+/gi, '').trim();
  return str ? `(Zonas ${str})` : '';
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
