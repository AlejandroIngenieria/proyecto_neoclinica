import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  fetchModalidades,
  fetchClinicas,
  fetchServiciosMedico,
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
  desvincularGrupoCita,
  completarCita,
  updateCita,
  fetchMetodosPago,
  pagarCita,
  fetchBilletera,
  guardarSeguro,
  guardarTarjeta,
  cambiarEstadoCita,
  fetchAllCitas,
} from '@/services/flujo-citas';
import type {
  CrearCitaRequest, CitaListDto, UpdateCitaRequest,
  GrupoCitaDto, MetodoPagoDto, PagarCitaRequest,
  BilleteraMetodoDto, GuardarSeguroRequest, GuardarTarjetaRequest,
  CambiarEstadoCitaPayload, CitaEstado, ServicioMedicoCitaDto,
} from '@/types/citas';

import { toast } from 'sonner';
import { crearNotificacion } from '@/services/notificaciones';

function useAuthInfo() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const userId = (session as any)?.user?.id || (session as any)?.user?.email;
  return { token, userId, isAuthenticated: !!token };
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

// Hook para obtener los servicios médicos específicos y tarifas del médico
export function useServiciosMedico(codMedico: string | null) {
  const { token } = useAuthInfo();
  return useQuery({
    queryKey: ['servicios-medico', codMedico],
    queryFn: () => fetchServiciosMedico(token, codMedico!),
    enabled: !!codMedico,
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
    queryFn: async () => {
      if (!codPaciente || !codMedico) return [];
      const data = await fetchGruposCita(token!, codPaciente, codMedico);
      const map = new Map<string, GrupoCitaDto>();
      data.forEach(g => {
        const id = g.grupoId || (g as any).id || (g as any).grc_codigo || (g as any).grcCodigo || '';
        const title = g.titulo || (g as any).grc_titulo_tema || (g as any).grcTituloTema || g.descripcion || (g as any).grc_tema || (g as any).grcTema || 'Tema de Seguimiento';
        const key = (id || title).toLowerCase();

        const itemCita = (g.fecha && g.hora) ? {
          citaId: g.citaId || '',
          fecha: String(g.fecha).split('T')[0],
          hora: String(g.hora).slice(0, 5),
          modalidad: g.modalidad || null,
          estado: g.estado || null,
          codServicio: g.codServicio ?? (g as any).cod_servicio ?? (g as any).cta_codsyp ?? null,
          codMetodoPago: g.codMetodoPago ?? (g as any).cod_metodo_pago ?? (g as any).cta_codtpp ?? null,
        } : null;

        if (!map.has(key)) {
          map.set(key, {
            ...g,
            grupoId: id,
            titulo: title,
            descripcion: g.descripcion || (g as any).grc_tema || (g as any).grcTema || title,
            codServicio: g.codServicio ?? (g as any).cod_servicio ?? (g as any).cta_codsyp ?? null,
            codMetodoPago: g.codMetodoPago ?? (g as any).cod_metodo_pago ?? (g as any).cta_codtpp ?? null,
            consultorioId: g.consultorioId ?? (g as any).consultorio_id ?? (g as any).cta_consultorio_id ?? null,
            citas: itemCita ? [itemCita] : [],
          });
        } else {
          const existing = map.get(key)!;
          if (itemCita && !existing.citas?.some(c => c.fecha === itemCita.fecha && c.hora === itemCita.hora)) {
            existing.citas = [...(existing.citas || []), itemCita];
          }
        }
      });
      return Array.from(map.values());
    },
    enabled: isAuthenticated && !!codPaciente && !!codMedico,
    staleTime: 0,
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

export function useCitaByCodigo(citaId: string | null) {
  const { token, isAuthenticated } = useAuthInfo();
  return useQuery<CitaListDto | null>({
    queryKey: ['citaByCodigo', citaId],
    queryFn: async () => {
      if (!token || !citaId) return null;
      try {
        const list = await fetchCitasPaciente(token, '');
        return list.find((c: CitaListDto) => String(c.ctaCodigo).toLowerCase() === String(citaId).toLowerCase()) || null;
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated && !!citaId,
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
  const { token, userId } = useAuthInfo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (citaInput: string | CitaListDto) => {
      const citaId = typeof citaInput === 'string' ? citaInput : citaInput.ctaCodigo;
      return cancelarCita(token!, citaId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['citasPaciente'] });
      queryClient.invalidateQueries({ queryKey: ['citasTodosPacientes'] });

      const medico = typeof variables === 'object' && variables.medicoNombre ? ` con Dr(a). ${variables.medicoNombre}` : '';

      toast.error('Cita cancelada', {
        description: `Tu cita médica${medico} ha sido cancelada.`,
      });

      if (token && userId) {
        crearNotificacion(token, {
          usuarioId: userId,
          usuarioTipo: 'paciente',
          tipo: 'cita',
          titulo: 'Cita Cancelada',
          mensaje: `Tu cita médica${medico} fue cancelada correctamente.`,
          accionUrl: '/dashboard/citas',
        }).catch(() => {});
      }
    },
  });
}

export function useDesvincularGrupo() {
  const { token } = useAuthInfo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (citaInput: string | CitaListDto) => {
      const citaId = typeof citaInput === 'string' ? citaInput : citaInput.ctaCodigo;
      return desvincularGrupoCita(token!, citaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citasPaciente'] });
      queryClient.invalidateQueries({ queryKey: ['citasTodosPacientes'] });
      queryClient.invalidateQueries({ queryKey: ['gruposCita'] });
      toast.success('Cita desvinculada', {
        description: 'La cita ha sido desanclada del tema de seguimiento y ahora es una consulta individual.',
      });
    },
    onError: (error: any) => {
      console.error('Error al desvincular cita del tema:', error);
      toast.error('Error al desvincular', {
        description: error?.response?.data?.mensaje || error?.message || 'No se pudo desanclar la cita del tema.',
      });
    }
  });
}

export function useCompletarCita() {
  const { token, userId } = useAuthInfo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (citaInput: string | CitaListDto) => completarCita(token!, citaInput),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['citasPaciente'] });
      queryClient.invalidateQueries({ queryKey: ['citasTodosPacientes'] });

      const medico = typeof variables === 'object' && variables.medicoNombre ? ` con Dr(a). ${variables.medicoNombre}` : '';

      toast.success('Cita completada', {
        description: `Tu consulta médica${medico} ha finalizado. Puedes escribir una reseña.`,
      });

      if (token && userId) {
        crearNotificacion(token, {
          usuarioId: userId,
          usuarioTipo: 'paciente',
          tipo: 'cita',
          titulo: 'Cita Completada',
          mensaje: `Tu cita médica${medico} fue marcada como completada. ¡Gracias por atenderte!`,
          accionUrl: '/dashboard/citas',
        }).catch(() => {});
      }
    },
  });
}

/**
 * Analiza si una cita ya superó la fecha y hora actual.
 */
export function isCitaPasada(ctaFecha?: string, ctaHora?: string): boolean {
  if (!ctaFecha) return false;
  try {
    const now = new Date();
    const fechaOnly = ctaFecha.includes('T') ? ctaFecha.split('T')[0] : ctaFecha;
    const horaOnly = ctaHora ? (ctaHora.length === 5 ? ctaHora + ':00' : ctaHora) : '00:00:00';
    
    if (!fechaOnly) return false;

    const [year, month, day] = fechaOnly.split('-').map(Number);
    const [hours, minutes, seconds = 0] = horaOnly.split(':').map(Number);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return false;

    const citaDateTime = new Date(year, month - 1, day, hours, minutes, seconds);
    return citaDateTime.getTime() < now.getTime();
  } catch {
    return false;
  }
}

const globalProcessedCitas = new Set<string>();

export function useAutoCompletarCitasPasadas(citas: CitaListDto[] | undefined) {
  const { token, isAuthenticated } = useAuthInfo();

  useEffect(() => {
    if (!isAuthenticated || !token || !citas || citas.length === 0) return;

    // Filtrar citas pasadas que no hayan sido intentadas en esta sesión
    const citasPasadas = citas.filter((c) => {
      if (!c.ctaCodigo || globalProcessedCitas.has(c.ctaCodigo)) return false;
      const estadoActual = (c.ctaEstado || '').toLowerCase();
      if (!['programada', 'confirmada', 'pospuesta'].includes(estadoActual)) return false;

      return isCitaPasada(c.ctaFecha, c.ctaHora);
    });

    if (citasPasadas.length === 0) return;

    // Marcar en la caché global inmediatamente para evitar cualquier reintento en segundo plano
    citasPasadas.forEach((c) => globalProcessedCitas.add(c.ctaCodigo));

    // Ejecución suave en segundo plano (1 a la vez de forma asíncrona y pausada)
    const processBatch = async () => {
      for (const cita of citasPasadas) {
        try {
          await completarCita(token, cita);
        } catch {
          // Silencioso para mantener la experiencia de usuario 100% fluida
        }
      }
    };

    processBatch();
  }, [citas, token, isAuthenticated]);
}

export function useUpdateCita() {
  const { token, userId } = useAuthInfo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { citaId: string; payload: UpdateCitaRequest; medicoNombre?: string }) => updateCita(token!, data.citaId, data.payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['citasPaciente'] });
      queryClient.invalidateQueries({ queryKey: ['citasTodosPacientes'] });

      const medico = variables.medicoNombre ? ` con Dr(a). ${variables.medicoNombre}` : '';

      toast.info('Cita modificada', {
        description: `Tu cita médica${medico} ha sido actualizada en tu agenda.`,
      });

      if (token && userId) {
        crearNotificacion(token, {
          usuarioId: userId,
          usuarioTipo: 'paciente',
          tipo: 'cita',
          titulo: 'Cita Modificada',
          mensaje: `Tu cita médica${medico} fue modificada exitosamente.`,
          accionUrl: '/dashboard/citas',
        }).catch(() => {});
      }
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

/**
 * Hook para consultar todas las citas registradas en el panel administrativo
 */
export function useAdminCitas() {
  const { token, isAuthenticated } = useAuthInfo();
  return useQuery<CitaListDto[]>({
    queryKey: ['adminCitas'],
    queryFn: () => fetchAllCitas(token || undefined),
    enabled: isAuthenticated,
    refetchInterval: 20000,
  });
}

/**
 * Hook para cambiar el estado de cualquier cita (programada, confirmada, completada, cancelada, rechazada, pospuesta, no_asistio)
 */
export function useCambiarEstadoCita() {
  const { token } = useAuthInfo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      citaId,
      nuevoEstado,
    }: {
      citaId: string;
      nuevoEstado: CambiarEstadoCitaPayload['nuevoEstado'] | string;
    }) => cambiarEstadoCita(token!, citaId, nuevoEstado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCitas'] });
      queryClient.invalidateQueries({ queryKey: ['citasPaciente'] });
      queryClient.invalidateQueries({ queryKey: ['citasTodosPacientes'] });
      toast.success('Estado de cita actualizado exitosamente');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.mensaje || error?.response?.data || error?.message || 'Error al cambiar estado de cita';
      toast.error(typeof msg === 'string' ? msg : 'Error al cambiar estado');
    },
  });
}
