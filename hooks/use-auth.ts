import { useMutation } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { cambiarPassword, type CambiarPasswordPayload } from '@/services/auth';

export function useCambiarPassword() {
  const { data: session } = useSession();
  const token = (session as any)?.user?.token || (session as any)?.token;

  return useMutation({
    mutationFn: (payload: CambiarPasswordPayload) => cambiarPassword(payload, token),
  });
}
