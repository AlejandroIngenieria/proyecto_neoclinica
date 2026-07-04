// Informacion del paciente

export type ExpedientePaciente = {  
    id_paciente: number;    
    nombre: string;
    apellido: string;
    fecha_nacimiento: string;
    sexo: string;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    dpi: string | null;
    foto_perfil: string | null;
    estado_civil: string | null;
    profesion: string | null;
    edad: number;
    nombre_factura: string | null;
    nit_factura: string | null;
    direccion_factura: string | null;
    email_factura: string | null;
};