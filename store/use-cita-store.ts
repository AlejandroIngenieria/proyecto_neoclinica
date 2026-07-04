import { create } from 'zustand';
import type { 
  ModalidadCita, 
  ClinicaCitaDto, 
  AreaDomicilioDto, 
  PacienteSeleccionDto 
} from '@/types/citas';

export type CitaStep = 1 | 2 | 3 | 4;

interface CitaState {
  step: CitaStep;
  codMedico: string | null;
  medicoName: string | null;
  
  modalidad: ModalidadCita | null;
  clinicaSeleccionada: ClinicaCitaDto | null;
  areaDomicilio: AreaDomicilioDto | null;
  
  fecha: Date | null;
  hora: string | null;
  
  pacienteSeleccionado: PacienteSeleccionDto | null;
  grupoId: string | null;
  motivo: string;
  
  archivos: File[];
  
  // Acciones
  setStep: (step: CitaStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  
  setMedico: (cod: string, name: string) => void;
  setModalidad: (modalidad: ModalidadCita) => void;
  setClinica: (clinica: ClinicaCitaDto | null) => void;
  setArea: (area: AreaDomicilioDto | null) => void;
  
  setFecha: (fecha: Date | null) => void;
  setHora: (hora: string | null) => void;
  
  setPaciente: (paciente: PacienteSeleccionDto | null) => void;
  setGrupo: (grupoId: string | null) => void;
  setMotivo: (motivo: string) => void;
  
  creandoNuevoGrupo: boolean;
  nuevoGrupoTema: string;
  setCreandoNuevoGrupo: (val: boolean) => void;
  setNuevoGrupoTema: (val: string) => void;

  setArchivos: (archivos: File[]) => void;
  
  reset: () => void;
}

const initialState = {
  step: 1 as CitaStep,
  codMedico: null,
  medicoName: null,
  
  modalidad: null,
  clinicaSeleccionada: null,
  areaDomicilio: null,
  
  fecha: null,
  hora: null,
  
  pacienteSeleccionado: null,
  grupoId: null,
  motivo: '',
  
  creandoNuevoGrupo: false,
  nuevoGrupoTema: '',

  archivos: [],
};

export const useCitaStore = create<CitaState>((set, get) => ({
  ...initialState,
  
  setStep: (step) => set({ step }),
  nextStep: () => set((state) => ({ step: Math.min(state.step + 1, 4) as CitaStep })),
  prevStep: () => set((state) => ({ step: Math.max(state.step - 1, 1) as CitaStep })),
  
  setMedico: (cod, name) => set({ codMedico: cod, medicoName: name }),
  
  setModalidad: (modalidad) => set({ 
    modalidad, 
    clinicaSeleccionada: null, 
    areaDomicilio: null,
    // Resetear fecha y hora si cambia la modalidad porque los horarios pueden cambiar
    fecha: null,
    hora: null
  }),
  
  setClinica: (clinica) => set({ 
    clinicaSeleccionada: clinica,
    fecha: null,
    hora: null
  }),
  setArea: (area) => set({ areaDomicilio: area }),
  
  setFecha: (fecha) => set({ fecha, hora: null }),
  setHora: (hora) => set({ hora }),
  
  setPaciente: (paciente) => set({ pacienteSeleccionado: paciente }),
  setGrupo: (grupoId) => set({ grupoId, creandoNuevoGrupo: false, nuevoGrupoTema: '' }),
  setMotivo: (motivo) => set({ motivo }),
  
  setCreandoNuevoGrupo: (val) => set({ creandoNuevoGrupo: val, grupoId: val ? null : get().grupoId }),
  setNuevoGrupoTema: (val) => set({ nuevoGrupoTema: val }),

  setArchivos: (archivos) => set({ archivos }),
  
  reset: () => set(initialState),
}));
