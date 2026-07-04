import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { fetchEstadoLealtad, fetchTareasLealtad, completarTareaLealtad } from '@/services/lealtad';

function useAuthToken() {
  const { data: session, status } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  return { token, status };
}

export function useLealtadEstado() {
  const { token, status } = useAuthToken();

  return useQuery({
    queryKey: ['lealtad', 'estado'],
    queryFn: () => fetchEstadoLealtad(token!),
    enabled: status === 'authenticated' && !!token,
  });
}

export function useLealtadTareas() {
  const { token, status } = useAuthToken();

  return useQuery({
    queryKey: ['lealtad', 'tareas'],
    queryFn: () => fetchTareasLealtad(token!),
    enabled: status === 'authenticated' && !!token,
  });
}

export function useCompletarTareaLealtad() {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (codigoAccion: string) => completarTareaLealtad(token!, codigoAccion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lealtad', 'estado'] });
      queryClient.invalidateQueries({ queryKey: ['lealtad', 'tareas'] });
    },
  });
}
