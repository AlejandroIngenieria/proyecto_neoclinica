'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  fetchPacientesByUsuario,
  fetchPacienteByCode,
  createPaciente,
  updatePaciente,
  createDependiente,
  deletePaciente,
  independizarPaciente,
} from '@/services/pacientes';
import type { Paciente } from '@/types';
import { toast } from 'sonner';
import { crearNotificacion } from '@/services/notificaciones';

type SessionWithAccess = {
  accessToken?: string;
  userId?: string;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

/** Extrae el token y el ID de usuario de la sesión de NextAuth. */
function useAuthInfo() {
  const { data: session, status } = useSession();
  const typed = session as SessionWithAccess | null;
  const token = typed?.accessToken;
  const userId = typed?.userId;

  return { token, userId, status, session };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Hook para obtener todos los pacientes del usuario autenticado.
 * Retorna tanto el titular como los dependientes.
 */
export function usePacientesByUsuario() {
  const { token, status } = useAuthInfo();

  return useQuery<Paciente[]>({
    queryKey: ['pacientes', 'perfil'],
    queryFn: () => fetchPacientesByUsuario(token!),
    enabled: status === 'authenticated' && !!token,
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * Hook para obtener un paciente específico por código.
 */
export function usePacienteByCode(pacCodigo?: string) {
  const { token, status } = useAuthInfo();

  return useQuery<Paciente>({
    queryKey: ['paciente', pacCodigo],
    queryFn: () => fetchPacienteByCode(token!, pacCodigo!),
    enabled: status === 'authenticated' && !!token && !!pacCodigo,
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * Derivado: obtiene solo el titular del listado de pacientes del usuario.
 */
export function usePacienteTitular() {
  const query = usePacientesByUsuario();

  const titular = query.data?.find((p) => p.pac_titular === true) ?? null;
  const dependientes = query.data?.filter((p) => p.pac_titular === false) ?? [];

  return {
    ...query,
    titular,
    dependientes,
  };
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Mutation para crear un nuevo paciente titular.
 */
export function useCreatePaciente() {
  const { token, userId } = useAuthInfo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Partial<Paciente>) => createPaciente(token!, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      toast.success('Perfil de paciente registrado');

      const nombre = variables.pac_primer_nombre ? ` (${variables.pac_primer_nombre} ${variables.pac_primer_apellido || ''})` : '';
      if (token && userId) {
        crearNotificacion(token, {
          usuarioId: userId,
          usuarioTipo: 'paciente',
          tipo: 'sistema',
          titulo: 'Paciente Registrado',
          mensaje: `Se ha registrado exitosamente la cuenta de paciente${nombre}.`,
          accionUrl: '/dashboard/perfil',
        }).catch(() => {});
      }
    },
  });
}

/**
 * Mutation para actualizar un paciente existente.
 */
export function useUpdatePaciente() {
  const { token, userId } = useAuthInfo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pacCodigo, body }: { pacCodigo: string; body: FormData }) =>
      updatePaciente(token!, pacCodigo, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      queryClient.invalidateQueries({ queryKey: ['paciente', variables.pacCodigo] });
      toast.success('Perfil actualizado correctamente');

      if (token && userId) {
        crearNotificacion(token, {
          usuarioId: userId,
          usuarioTipo: 'paciente',
          tipo: 'sistema',
          titulo: 'Perfil Actualizado',
          mensaje: 'Tu información de perfil y expediente personal han sido actualizados.',
          accionUrl: '/dashboard/perfil',
        }).catch(() => {});
      }
    },
  });
}

/**
 * Mutation para crear un paciente dependiente.
 */
export function useCreateDependiente() {
  const { token, userId } = useAuthInfo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      body,
    }: {
      body: FormData;
    }) => createDependiente(token!, body, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      toast.success('Familiar registrado con éxito');

      if (token && userId) {
        crearNotificacion(token, {
          usuarioId: userId,
          usuarioTipo: 'paciente',
          tipo: 'sistema',
          titulo: 'Familiar Registrado',
          mensaje: 'Has agregado exitosamente a un nuevo familiar dependiente a tu cuenta de NeoClínica.',
          accionUrl: '/dashboard/perfil',
        }).catch(() => {});
      }
    },
  });
}

/**
 * Mutation para eliminar un paciente titular o dependiente.
 */
export function useDeletePaciente() {
  const { token } = useAuthInfo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ titular, pacCodigo }: { titular: boolean; pacCodigo?: string }) =>
      deletePaciente(token!, titular, pacCodigo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      toast.info('Perfil eliminado');
    },
  });
}

/**
 * Mutation para independizar un paciente dependiente.
 */
export function useIndependizarPaciente() {
  const { token, userId } = useAuthInfo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pacCodigo,
      nuevoCorreo,
      conservarHistorial = true,
    }: {
      pacCodigo: string;
      nuevoCorreo: string;
      conservarHistorial?: boolean;
    }) =>
      independizarPaciente(token!, pacCodigo, {
        nuevoCorreo,
        conservarHistorial,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      toast.success('Cuenta independizada correctamente');

      if (token && userId) {
        crearNotificacion(token, {
          usuarioId: userId,
          usuarioTipo: 'paciente',
          tipo: 'sistema',
          titulo: 'Familiar Independizado',
          mensaje: `El paciente ha sido independizado con la cuenta ${variables.nuevoCorreo}.${
            variables.conservarHistorial
              ? ' Su historial médico fue trasladado.'
              : ''
          }`,
          accionUrl: '/dashboard/perfil/pacientes',
        }).catch(() => {});
      }
    },
  });
}
