import { create } from 'zustand';
import type { 
  ModalidadCita, 
  ClinicaCitaDto, 
  ServicioMedicoCitaDto,
  AreaDomicilioDto, 
  PacienteSeleccionDto 
} from '@/types/citas';

import type { RecompensaAdquirida } from '@/types/recompensas';

export type CitaStep = 1 | 2 | 3 | 4;

export interface CitaMultipleItem {
  id: string;
  fecha: Date;
  hora: string; // "HH:mm" or "HH:mm:ss"
  paciente?: PacienteSeleccionDto | null;
}

interface CitaState {
  step: CitaStep;
  codMedico: string | null;
  medicoName: string | null;
  
  modalidad: ModalidadCita | null;
  clinicaSeleccionada: ClinicaCitaDto | null;
  servicioSeleccionado: ServicioMedicoCitaDto | null;
  areaDomicilio: AreaDomicilioDto | null;
  
  fecha: Date | null;
  hora: string | null;
  
  // Multi-cita para Grupo de Citas
  citasMultiples: CitaMultipleItem[];
  pacienteModoCita: 'mismo' | 'variado';
  omitirPago: boolean;
  
  pacienteSeleccionado: PacienteSeleccionDto | null;
  grupoId: string | null;
  grupoNombre: string | null;
  motivo: string;
  direccionDomicilio: string;
  referenciasDomicilio: string;
  
  archivos: File[];
  tipoPagoId: number | null;
  billeteraItemId: string | null;
  comprobanteTransferencia: File | null;
  referenciaTransferencia: string;
  
  recompensaSeleccionada: RecompensaAdquirida | null;
  citaConfirmada: boolean;
  setCitaConfirmada: (val: boolean) => void;

  // Solicitud de intercambio de horario deseado
  solicitudIntercambio: { fecha: string; hora: string; mensaje?: string } | null;
  setSolicitudIntercambio: (data: { fecha: string; hora: string; mensaje?: string } | null) => void;

  // Pacientes con conflicto de horario excluidos de la selección
  pacientesExcluidos: string[];
  setPacientesExcluidos: (codes: string[]) => void;
  addPacienteExcluido: (code: string) => void;

  // Acciones
  setStep: (step: CitaStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  
  setMedico: (cod: string, name: string) => void;
  setModalidad: (modalidad: ModalidadCita) => void;
  setClinica: (clinica: ClinicaCitaDto | null) => void;
  setServicio: (servicio: ServicioMedicoCitaDto | null) => void;
  setArea: (area: AreaDomicilioDto | null) => void;
  
  setFecha: (fecha: Date | null) => void;
  setHora: (hora: string | null) => void;
  
  // Acciones multi-cita
  addCitaMultiple: (fecha: Date, hora: string) => boolean;
  removeCitaMultiple: (id: string) => void;
  clearCitasMultiples: () => void;
  setPacienteModoCita: (modo: 'mismo' | 'variado') => void;
  setPacienteCitaMultiple: (id: string, paciente: PacienteSeleccionDto | null) => void;
  setOmitirPago: (val: boolean) => void;
  
  setPaciente: (paciente: PacienteSeleccionDto | null) => void;
  setGrupo: (grupoId: string | null) => void;
  setTemaSeguimiento: (grupoId: string | null, temaNombre?: string | null) => void;
  setMotivo: (motivo: string) => void;
  setDireccionDomicilio: (direccion: string) => void;
  setReferenciasDomicilio: (referencias: string) => void;
  
  creandoNuevoGrupo: boolean;
  nuevoGrupoTema: string;
  setCreandoNuevoGrupo: (val: boolean) => void;
  setNuevoGrupoTema: (val: string) => void;

  setArchivos: (archivos: File[]) => void;
  setTipoPagoId: (id: number | null) => void;
  setBilleteraItemId: (id: string | null) => void;
  setComprobanteTransferencia: (file: File | null) => void;
  setReferenciaTransferencia: (ref: string) => void;
  setRecompensaSeleccionada: (rec: RecompensaAdquirida | null) => void;
  
  reset: () => void;
}

const initialState = {
  step: 1 as CitaStep,
  codMedico: null,
  medicoName: null,
  
  modalidad: null,
  clinicaSeleccionada: null,
  servicioSeleccionado: null,
  areaDomicilio: null,
  
  fecha: null,
  hora: null,
  
  // Multi-cita para Grupo de Citas
  citasMultiples: [] as CitaMultipleItem[],
  pacienteModoCita: 'mismo' as 'mismo' | 'variado',
  omitirPago: false,
  
  pacienteSeleccionado: null,
  grupoId: null,
  grupoNombre: null,
  motivo: '',
  direccionDomicilio: '',
  referenciasDomicilio: '',
  
  creandoNuevoGrupo: false,
  nuevoGrupoTema: '',

  archivos: [],
  tipoPagoId: null,
  billeteraItemId: null,
  comprobanteTransferencia: null,
  referenciaTransferencia: '',
  recompensaSeleccionada: null,
  citaConfirmada: false,
  solicitudIntercambio: null,
  pacientesExcluidos: [],
};

export const useCitaStore = create<CitaState>((set, get) => ({
  ...initialState,
  
  setCitaConfirmada: (val) => set({ citaConfirmada: val }),
  setSolicitudIntercambio: (data) => set({ solicitudIntercambio: data }),
  setPacientesExcluidos: (codes) => set({ pacientesExcluidos: codes }),
  addPacienteExcluido: (code) => set((state) => ({
    pacientesExcluidos: state.pacientesExcluidos.includes(code)
      ? state.pacientesExcluidos
      : [...state.pacientesExcluidos, code]
  })),

  setStep: (step) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
    set({ step });
  },
  nextStep: () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
    set((state) => ({ step: Math.min(state.step + 1, 4) as CitaStep }));
  },
  prevStep: () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
    set((state) => ({ step: Math.max(state.step - 1, 1) as CitaStep }));
  },
  
  setMedico: (cod, name) => set({ codMedico: cod, medicoName: name }),
  
  setModalidad: (modalidad) => set({ 
    modalidad, 
    clinicaSeleccionada: null, 
    areaDomicilio: null,
    // Resetear fecha y hora si cambia la modalidad porque los horarios pueden cambiar
    fecha: null,
    hora: null,
    citasMultiples: [],
    pacientesExcluidos: []
  }),
  
  setClinica: (clinica) => set({ 
    clinicaSeleccionada: clinica,
    fecha: null,
    hora: null,
    citasMultiples: [],
    pacientesExcluidos: []
  }),
  setServicio: (servicio) => set({ servicioSeleccionado: servicio }),
  setArea: (area) => set({ areaDomicilio: area }),
  
  setFecha: (fecha) => set({ fecha, hora: null, pacientesExcluidos: [] }),
  setHora: (hora) => set({ hora }),
  
  // Acciones multi-cita
  addCitaMultiple: (fecha: Date, hora: string) => {
    const current = get().citasMultiples;
    if (current.length >= 5) return false;
    
    // Validar duplicado exacto en fecha y hora
    const exists = current.some(
      c => c.fecha.toDateString() === fecha.toDateString() && c.hora.substring(0, 5) === hora.substring(0, 5)
    );
    if (exists) return false;

    const newItem: CitaMultipleItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fecha,
      hora,
      paciente: null,
    };

    set({
      citasMultiples: [...current, newItem],
      hora: null // Permitir al usuario seleccionar otro horario de inmediato
    });
    return true;
  },

  removeCitaMultiple: (id: string) => set((state) => ({
    citasMultiples: state.citasMultiples.filter(c => c.id !== id)
  })),

  clearCitasMultiples: () => set({ citasMultiples: [] }),

  setPacienteModoCita: (modo: 'mismo' | 'variado') => set((state) => ({
    pacienteModoCita: modo,
    citasMultiples: modo === 'mismo'
      ? state.citasMultiples.map(c => ({ ...c, paciente: null }))
      : state.citasMultiples
  })),

  setPacienteCitaMultiple: (id: string, paciente: PacienteSeleccionDto | null) => set((state) => ({
    citasMultiples: state.citasMultiples.map(c => c.id === id ? { ...c, paciente } : c)
  })),

  setOmitirPago: (val: boolean) => set({
    omitirPago: val,
    ...(val ? { tipoPagoId: null, billeteraItemId: null, comprobanteTransferencia: null, referenciaTransferencia: '' } : {})
  }),

  setPaciente: (paciente) => set({ pacienteSeleccionado: paciente }),
  setGrupo: (grupoId) => set({ grupoId, creandoNuevoGrupo: false, nuevoGrupoTema: '', citasMultiples: [] }),
  setTemaSeguimiento: (grupoId, temaNombre = null) => set({
    grupoId,
    grupoNombre: temaNombre,
    creandoNuevoGrupo: false,
    nuevoGrupoTema: '',
    citasMultiples: []
  }),
  setMotivo: (motivo) => set({ motivo }),
  setDireccionDomicilio: (direccion) => set({ direccionDomicilio: direccion }),
  setReferenciasDomicilio: (referencias) => set({ referenciasDomicilio: referencias }),
  
  setCreandoNuevoGrupo: (val) => set({ 
    creandoNuevoGrupo: val, 
    grupoId: val ? null : get().grupoId,
    grupoNombre: val ? null : get().grupoNombre,
    nuevoGrupoTema: val ? get().nuevoGrupoTema : '',
    citasMultiples: []
  }),
  setNuevoGrupoTema: (val) => set({ nuevoGrupoTema: val }),

  setArchivos: (archivos) => set({ archivos }),
  setTipoPagoId: (id) => set({ tipoPagoId: id, billeteraItemId: null, omitirPago: false }),
  setBilleteraItemId: (id) => set({ billeteraItemId: id }),
  setComprobanteTransferencia: (file) => set({ comprobanteTransferencia: file }),
  setReferenciaTransferencia: (ref) => set({ referenciaTransferencia: ref }),
  setRecompensaSeleccionada: (rec) => set({ recompensaSeleccionada: rec }),
  
  reset: () => set(initialState),
}));
