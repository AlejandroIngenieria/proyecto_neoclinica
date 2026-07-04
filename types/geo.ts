export type Pais = {
  pai_codigo: number;
  pai_descripcion: string;
};

export type Departamento = {
  dep_codigo: number;
  dep_codpai: number;
  dep_descripcion: string;
};

export type Municipio = {
  mun_codigo: number;
  mun_coddep: number;
  mun_descripcion: string;
};
