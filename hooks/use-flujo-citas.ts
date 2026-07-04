'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  fetchModalidades,
  fetchClinicas,
  fetchAreasDomicilio,
  fetchHorarios,
  fetchPacientesSeleccion,
  fetchGruposCita,
  createGrupo,
  createCita,
  uploadDocumentoCita,
  fetchCitasPaciente,
  cancelarCita,
  updateCita
} from '@/services/flujo-citas';
import type { CrearCitaRequest, CitaListDto, UpdateCitaRequest, GrupoCitaDto } from '@/types/citas';

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
        map.set(g.grcCodigo.toLowerCase(), g.grcTema);
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

export function useCreateGrupo() {
  const { token } = useAuthInfo();
  return useMutation({
    mutationFn: ({ codPaciente, codMedico, tema, tituloTema }: { codPaciente: string, codMedico: string, tema: string, tituloTema: string }) =>
      createGrupo(token!, codPaciente, codMedico, tema, tituloTema),
  });
}

export function useCreateCita() {
  const { token } = useAuthInfo();
  return useMutation({
    mutationFn: (request: CrearCitaRequest) => createCita(token!, request),
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
    },
  });
}
