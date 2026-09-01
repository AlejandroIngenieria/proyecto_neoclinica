import { useQuery } from '@tanstack/react-query';
import { fetchColaDelDia } from '@/services/flujo-citas';
import type { ColaTurnoDto } from '@/types/citas';

export function useColaDelDia(
  codMedico: string | undefined | null,
  fecha: string | undefined | null,
  codPaciente?: string | null
) {
  return useQuery<ColaTurnoDto[]>({
    queryKey: ['cola-dia', codMedico, fecha, codPaciente],
    queryFn: () => fetchColaDelDia(codMedico!, fecha!, codPaciente || undefined),
    enabled: Boolean(codMedico && fecha),
    refetchInterval: 15000, // Actualización automática en vivo cada 15s
    staleTime: 10000,
  });
}
