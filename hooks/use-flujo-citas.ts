'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  fetchModalidades,
  fetchClinicas,
  fetchAreasDomicilio,
  fetchHorarios,
  fetchHorasOcupadas,
  fetchPacientesSeleccion,
  fetchGruposCita,
  createGrupo,
  createCita,
  uploadDocumentoCita,
  fetchCitasPaciente,
  cancelarCita,
  updateCita,
  fetchMetodosPago,
  pagarCita,
  fetchBilletera,
  guardarSeguro,
  guardarTarjeta
} from '@/services/flujo-citas';
import type {
  CrearCitaRequest, CitaListDto, UpdateCitaRequest,
  GrupoCitaDto, MetodoPagoDto, PagarCitaRequest,
  BilleteraMetodoDto, GuardarSeguroRequest, GuardarTarjetaRequest
} from '@/types/citas';

function useAuthInfo() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  return { token, isAuthenticated: !!token };
}

export function useModalidades(codMedico: string | null) {
  const { token, isAuthenticated } = useAuthInfo();
  return useQuery({
    queryKey: ['modalidades', codMedico],
    queryFn: () => fetchModalidades(token!, codMedico!),
    enabled: isAuthenticated && !!codMedico,
    staleTime: 5 * 60 * 1000,
  });
}

export function useClinicas(codMedico: string | null, modalidad: string | null) {
  const { token, isAuthenticated } = useAuthInfo();
  return useQuery({
    queryKey: ['clinicas', codMedico],
    queryFn: () => fetchClinicas(token!, codMedico!),
    enabled: isAuthenticated && !!codMedico && modalidad === 'presencial',
    staleTime: 5 * 60 * 1000,
  });
}

export function useAreasDomicilio(codMedico: string | null, modalidad: string | null) {
  const { token, isAuthenticated } = useAuthInfo();
  return useQuery({
    queryKey: ['areasDomicilio', codMedico],
    queryFn: () => fetchAreasDomicilio(token!, codMedico!),
    enabled: isAuthenticated && !!codMedico && modalidad === 'domicilio',
    staleTime: 5 * 60 * 1000,
  });
}

export function useHorarios(mclCodigo: number | null) {
  const { token, isAuthenticated } = useAuthInfo();
  return useQuery({
    queryKey: ['horarios', mclCodigo],
    queryFn: () => fetchHorarios(token!, mclCodigo!),
    enabled: isAuthenticated && mclCodigo !== null,
    staleTime: 5 * 60 * 1000,
  });
}

export function useHorasOcupadas(codMedico: string | null, fecha: string | null) {
  const { token, isAuthenticated } = useAuthInfo();
  return useQuery({
    queryKey: ['horasOcupadas', codMedico, fecha],
    queryFn: () => fetchHorasOcupadas(token!, codMedico!, fecha!),
    enabled: isAuthenticated && !!codMedico && !!fecha,
    staleTime: 0,
  });
}

export function usePacientesSeleccion() {
  const { token, isAuthenticated } = useAuthInfo();
  return useQuery({
    queryKey: ['pacientesSeleccion'],
    queryFn: () => fetchPacientesSeleccion(token!),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGruposCita(codPaciente: string | null, codMedico: string | null) {
  const { token, isAuthenticated } = useAuthInfo();

  return useQuery<GrupoCitaDto[]>({
    queryKey: ['gruposCita', codPaciente, codMedico],
    queryFn: () => fetchGruposCita(token!, codPaciente!, codMedico!),
    enabled: isAuthenticated && !!codPaciente && !!codMedico,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGruposMap(codPaciente: string | null, medicosUnicos: string[]) {
  const { token, isAuthenticated } = useAuthInfo();

  return useQuery<Map<string, string>>({
    queryKey: ['gruposMap', codPaciente, medicosUnicos],
    queryFn: async () => {
      if (!codPaciente || medicosUnicos.length === 0) return new Map();
      const promises = medicosUnicos.map(medicoId => fetchGruposCita(token!, codPaciente, medicoId));
      const results = await Promise.all(promises);
      const map = new Map<string, string>();
      results.flat().forEach(g => {
        map.set(g.grupoId.toLowerCase(), g.titulo);
      });
      return map;
    },
    enabled: isAuthenticated && !!codPaciente && medicosUnicos.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCitasPaciente(codPaciente: string | null) {
  const { token, isAuthenticated } = useAuthInfo();
  return useQuery<CitaListDto[]>({
    queryKey: ['citasPaciente', codPaciente],
    queryFn: () => fetchCitasPaciente(token!, codPaciente!),
    enabled: isAuthenticated && !!codPaciente,
  });
}

export function useAllCitasPacientes(codigosPacientes: string[]) {
  const { token, isAuthenticated } = useAuthInfo();
  return useQuery<CitaListDto[]>({
    queryKey: ['citasTodosPacientes', codigosPacientes],
    queryFn: async () => {
      const promesas = codigosPacientes.map(cod => fetchCitasPaciente(token!, cod));
      const resultados = await Promise.all(promesas);
      
      const flattened = resultados.flat();
      const unique = Array.from(new Map(flattened.map(item => [item.ctaCodigo, item])).values());
      return unique;
    },
    enabled: isAuthenticated && codigosPacientes.length > 0,
  });
}

export function useCreateGrupo() {
  const { token } = useAuthInfo();
  return useMutation({
    mutationFn: ({ codPaciente, codMedico, tema, tituloTema }: { codPaciente: string, codMedico: string, tema: string, tituloTema: string }) =>
      createGrupo(token!, codPaciente, codMedico, tema, tituloTema),
  });
}

export function useCreateCita() {
  const { token } = useAuthInfo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CrearCitaRequest) => createCita(token!, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citasPaciente'] });
      queryClient.invalidateQueries({ queryKey: ['citasTodosPacientes'] });
    }
  });
}

export function useUploadDocumentoCita() {
  const { token } = useAuthInfo();
  return useMutation({
    mutationFn: (data: { codPaciente: string; codCita: string; file: File }) =>
      uploadDocumentoCita(token!, data.codPaciente, data.codCita, data.file),
  });
}

export function useCancelarCita() {
  const { token } = useAuthInfo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (citaId: string) => cancelarCita(token!, citaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citasPaciente'] });
      queryClient.invalidateQueries({ queryKey: ['citasTodosPacientes'] });
    },
  });
}

export function useUpdateCita() {
  const { token } = useAuthInfo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { citaId: string; payload: UpdateCitaRequest }) => updateCita(token!, data.citaId, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citasPaciente'] });
      queryClient.invalidateQueries({ queryKey: ['citasTodosPacientes'] });
    },
  });
}

export function useMetodosPago(codMedico: string | null) {
  const { token, isAuthenticated } = useAuthInfo();
  return useQuery<MetodoPagoDto[]>({
    queryKey: ['metodosPago', codMedico],
    queryFn: () => fetchMetodosPago(token!, codMedico!),
    enabled: isAuthenticated && !!codMedico,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePagarCita() {
  const { token } = useAuthInfo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { citaId: string; payload: PagarCitaRequest }) => pagarCita(token!, data.citaId, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citasPaciente'] });
      queryClient.invalidateQueries({ queryKey: ['citasTodosPacientes'] });
    }
  });
}

export function useBilletera(codPac: string | null) {
  const { token, isAuthenticated } = useAuthInfo();
  return useQuery<BilleteraMetodoDto[]>({
    queryKey: ['billetera', codPac],
    queryFn: () => fetchBilletera(token!, codPac!),
    enabled: isAuthenticated && !!codPac,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGuardarSeguro() {
  const { token } = useAuthInfo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { codPac: string; payload: GuardarSeguroRequest }) => guardarSeguro(token!, data.codPac, data.payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['billetera', variables.codPac] });
    }
  });
}

export function useGuardarTarjeta() {
  const { token } = useAuthInfo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { codPac: string; payload: GuardarTarjetaRequest }) => guardarTarjeta(token!, data.codPac, data.payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['billetera', variables.codPac] });
    }
  });
}
