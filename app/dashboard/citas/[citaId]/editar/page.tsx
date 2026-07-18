'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Loader2, CalendarDays, Clock, MapPin, Monitor, CheckCircle2, AlertCircle, Home, Building2, CalendarClock, CreditCard
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

import { 
  usePacientesSeleccion, useAllCitasPacientes, useUpdateCita, useCancelarCita, 
  useModalidades, useClinicas, useAreasDomicilio, useHorarios, useGruposCita, useHorasOcupadas
} from '@/hooks/use-flujo-citas';
import { useDoctorByCode } from '@/hooks/use-doctors';
import type { ModalidadCita, UpdateCitaRequest, ClinicaCitaDto, AreaDomicilioDto, HorarioCitaDto } from '@/types/citas';

const MySwal = withReactContent(Swal);

function safeFormatDate(dateStr: string | undefined, formatStr: string): string {
  if (!dateStr) return 'Fecha sin definir';
  try {
    return format(parseISO(dateStr), formatStr, { locale: es });
  } catch {
    return 'Fecha inválida';
  }
}

export default function EditWizardPage() {
  const params = useParams();
  const router = useRouter();
  const citaId = params.citaId as string;

  // -- 1. Data Fetching --
  const { data: pacientes, isLoading: loadingPacientes } = usePacientesSeleccion();
  const codigosPacientes = pacientes?.map(p => p.pacCodigo) || [];
  const { data: citas, isLoading: loadingCitas } = useAllCitasPacientes(codigosPacientes);

  const citaOriginal = citas?.find(c => c.ctaCodigo === citaId);
  const codMedico = citaOriginal?.ctaCoddoc || '';
  const codPaciente = citaOriginal?.ctaCodpac || '';
  const { data: doctor, isLoading: loadingDoctor } = useDoctorByCode(codMedico);

  const { data: modalidadesList } = useModalidades(codMedico || null);
  
  // -- 2. Wizard State --
  const [step, setStep] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);

  const [modalidad, setModalidad] = useState<ModalidadCita>('presencial');
  const [clinicaSeleccionada, setClinicaSeleccionada] = useState<ClinicaCitaDto | null>(null);
  const [areaSeleccionada, setAreaSeleccionada] = useState<AreaDomicilioDto | null>(null);
  
  const [fecha, setFecha] = useState<Date | undefined>(undefined);
  const [hora, setHora] = useState<string>('');
  
  const [direccion, setDireccion] = useState<string>('');
  const [referencias, setReferencias] = useState<string>('');
  const [enlace, setEnlace] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [grupoId, setGrupoId] = useState<string>('');
  const [precio, setPrecio] = useState<number>(0);

  // -- 3. Fetching Dependencies --
  const { data: clinicasList } = useClinicas(codMedico || null, modalidad);
  const { data: areasList } = useAreasDomicilio(codMedico || null, modalidad);
  const mclCodigo = modalidad === 'presencial' ? clinicaSeleccionada?.mclCodigo || null : 0;
  const { data: horariosClinica = [] } = useHorarios(mclCodigo);
  const { data: gruposList } = useGruposCita(codPaciente || null, codMedico || null);

  const { mutateAsync: updateCita, isPending: isUpdating } = useUpdateCita();
  const { mutateAsync: cancelarCita, isPending: isCanceling } = useCancelarCita();

  // -- 4. Initialization --
  useEffect(() => {
    if (citaOriginal && !isInitialized) {
      setModalidad(citaOriginal.ctaModalidad);
      try {
        setFecha(parseISO(citaOriginal.ctaFecha));
      } catch (e) {
        setFecha(new Date());
      }
      setHora(citaOriginal.ctaHora);
      
      setMotivo(citaOriginal.ctaMotivo || '');
      setGrupoId(citaOriginal.ctaGrupoId || '');
      setEnlace(citaOriginal.enlaceVideollamada || '');
      setDireccion(citaOriginal.direccionDomicilio || '');
      setReferencias(citaOriginal.referenciasDomicilio || '');
      setPrecio(citaOriginal.ctaPrecio || 0);
      setIsInitialized(true);
    }
  }, [citaOriginal, isInitialized]);

  // Set the selected clinic once the list is available
  useEffect(() => {
    if (isInitialized && citaOriginal?.ctaModalidad === 'presencial' && citaOriginal.ctaConsultorioId && clinicasList && !clinicaSeleccionada) {
      const clinica = clinicasList.find(c => c.mclCodigo === citaOriginal.ctaConsultorioId);
      if (clinica) setClinicaSeleccionada(clinica);
    }
  }, [isInitialized, citaOriginal, clinicasList, clinicaSeleccionada]);

  // Adjust price
  useEffect(() => {
    if (modalidad === 'presencial' && clinicaSeleccionada) {
      setPrecio(clinicaSeleccionada.mclPrecioBase);
    } else if (modalidad !== 'presencial') {
      setPrecio(0);
    }
  }, [modalidad, clinicaSeleccionada]);

  // -- 5. Computed Availability --
  const horarios = useMemo(() => {
    if (modalidad === 'presencial') {
      return horariosClinica;
    }
    if (!doctor) return [];
    const combined: HorarioCitaDto[] = [];
    doctor.clinicas?.forEach(c => {
      c.horarios_atencion?.forEach(h => {
        combined.push({
          horDiaSemana: h.hor_dia_semana,
          horHoraInicio: h.hor_hora_inicio,
          horHoraFin: h.hor_hora_fin,
        });
      });
    });
    return combined;
  }, [modalidad, horariosClinica, doctor]);

  const disabledDays = useMemo(() => {
    if (!horarios.length) return [{ from: new Date(1900, 1, 1), to: new Date(2100, 1, 1) }];
    const allowedDays = horarios.map(h => h.horDiaSemana);
    return [
      { before: new Date() },
      (date: Date) => !allowedDays.includes(date.getDay())
    ];
  }, [horarios]);

  const { data: horasOcupadas = [] } = useHorasOcupadas(codMedico || null, fecha ? format(fecha, 'yyyy-MM-dd') : null);

  const timeSlots = useMemo(() => {
    if (!fecha || !horarios.length) return [];
    const dayOfWeek = fecha.getDay();
    const daySchedules = horarios.filter(h => h.horDiaSemana === dayOfWeek);
    
    const slots: string[] = [];
    daySchedules.forEach(schedule => {
      let current = new Date(`2000-01-01T${schedule.horHoraInicio}`);
      const end = new Date(`2000-01-01T${schedule.horHoraFin}`);
      
      while (current < end) {
        slots.push(format(current, 'HH:mm:00'));
        current = new Date(current.getTime() + 30 * 60000); // 30 min slots
      }
    });
    
    const uniqueSlots = Array.from(new Set(slots)).sort();
    
    const isOriginalDate = citaOriginal && format(fecha, 'yyyy-MM-dd') === citaOriginal.ctaFecha;
    
    return uniqueSlots.map(slot => ({
      time: slot,
      disabled: !isOriginalDate || slot !== citaOriginal.ctaHora ? horasOcupadas.includes(slot) : false
    }));
  }, [fecha, horarios, horasOcupadas, citaOriginal]);

  // -- 6. Handlers --
  const handleSave = async () => {
    try {
      const payload: UpdateCitaRequest = {
        fecha: fecha ? format(fecha, 'yyyy-MM-dd') : '',
        hora,
        modalidad,
        precio,
        motivo: motivo || null,
        grupoId: grupoId || null,
        consultorioId: modalidad === 'presencial' ? clinicaSeleccionada?.mclCodigo : null,
        direccionDomicilio: modalidad === 'domicilio' ? direccion : null,
        referenciasDomicilio: modalidad === 'domicilio' ? referencias : null,
        enlaceVideollamada: modalidad === 'virtual' ? enlace : null,
      };

      await updateCita({ citaId, payload });
      
      MySwal.fire({
        title: '¡Cita modificada!',
        text: 'La cita ha sido actualizada correctamente en tu agenda.',
        icon: 'success',
        confirmButtonColor: '#2563EB',
      }).then(() => {
        router.push('/dashboard/citas');
      });

    } catch (e) {
      MySwal.fire({
        title: 'Error',
        text: 'Hubo un problema al actualizar la cita.',
        icon: 'error',
        confirmButtonColor: '#e11d48',
      });
    }
  };

  const handleCancel = () => {
    MySwal.fire({
      title: '¿Cancelar Cita Definitivamente?',
      html: `Estás a punto de cancelar tu cita original con <strong>Dr(a). ${citaOriginal?.medicoNombre}</strong>.<br/><br/>Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Sí, Cancelar Cita',
      cancelButtonText: 'Mantener cita',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          await cancelarCita(citaId);
          return true;
        } catch (err: any) {
          Swal.showValidationMessage('Hubo un problema al cancelar la cita.');
          return false;
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed) {
        router.push('/dashboard/citas');
      }
    });
  };

  if (loadingPacientes || loadingCitas || loadingDoctor || !isInitialized) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-[#2563EB] animate-spin mb-4" />
          <p className="font-bold text-[#6B7280]">Cargando expediente...</p>
        </main>
      </div>
    );
  }

  if (!citaOriginal) return null;

  // Validador de siguiente paso
  const canGoNext = () => {
    if (step === 1) {
      if (modalidad === 'presencial' && !clinicaSeleccionada) return false;
      if (modalidad === 'domicilio' && (!direccion || !referencias)) return false;
      return true;
    }
    if (step === 2) {
      if (!fecha || !hora) return false;
      return true;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0B1120] font-sans text-[#111827] dark:text-slate-200 flex flex-col">
      {/* HEADER WIZARD ESTILO */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#0B1120]/90 backdrop-blur-md border-b border-[#E5E7EB] dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 text-[#6B7280] dark:text-slate-400 hover:text-[#2563EB] dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden relative bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                {doctor?.exp_foto_perfil ? (
                  <Image src={doctor.exp_foto_perfil} alt={citaOriginal.medicoNombre} fill sizes="48px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-lg">
                    {citaOriginal.medicoNombre.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-xl font-black text-[#111827] dark:text-white leading-tight">Modificar cita</h1>
                <p className="text-sm font-medium text-[#6B7280] dark:text-slate-400">Dr(a). {citaOriginal.medicoNombre}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`w-8 h-2 rounded-full transition-colors ${step >= i ? 'bg-[#2563EB]' : 'bg-[#E5E7EB] dark:bg-slate-700'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 items-start">
        
        {/* WIZARD CONTENT */}
        <div className="w-full relative overflow-hidden bg-white dark:bg-[#1E293B] rounded-3xl p-6 sm:p-10 shadow-sm border border-[#E5E7EB] dark:border-slate-700 min-h-[600px]">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: MODALIDAD */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <h2 className="text-2xl font-black text-[#111827] dark:text-white mb-2">Modalidad de Atención</h2>
                <p className="text-[#6B7280] dark:text-slate-400 mb-8">Elige cómo deseas que se lleve a cabo la consulta.</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                  {(['presencial', 'virtual', 'domicilio'] as ModalidadCita[]).map((mod) => (
                    <button
                      key={mod}
                      onClick={() => setModalidad(mod)}
                      className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 text-center ${
                        modalidad === mod ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-blue-900/30' : 'border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-[#0F172A] hover:border-[#BFDBFE] dark:hover:border-blue-900'
                      }`}
                    >
                      <div className={`p-4 rounded-full ${modalidad === mod ? 'bg-[#2563EB] text-white' : 'bg-[#F3F4F6] dark:bg-slate-800 text-[#6B7280] dark:text-slate-400'}`}>
                        {mod === 'virtual' ? <Monitor className="w-6 h-6"/> : mod === 'domicilio' ? <Home className="w-6 h-6"/> : <Building2 className="w-6 h-6"/>}
                      </div>
                      <span className="font-bold text-[#111827] dark:text-white capitalize">{mod}</span>
                    </button>
                  ))}
                </div>

                {modalidad === 'presencial' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <h3 className="text-sm font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Selecciona la Clínica</h3>
                    {clinicasList?.map(c => (
                      <button
                        key={c.mclCodigo}
                        onClick={() => setClinicaSeleccionada(c)}
                        className={`w-full p-4 flex items-center justify-between rounded-xl border-2 transition-all text-left ${
                          clinicaSeleccionada?.mclCodigo === c.mclCodigo ? 'border-[#2563EB] bg-[#F8FAFC] dark:bg-blue-900/20' : 'border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-[#0F172A] hover:border-[#BFDBFE] dark:hover:border-blue-900'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-[#EFF6FF] dark:bg-blue-900/40 p-3 rounded-xl"><Building2 className="w-5 h-5 text-[#2563EB] dark:text-blue-400" /></div>
                          <div>
                            <p className="font-bold text-[#111827] dark:text-white">{c.cliDescripcion}</p>
                            <p className="text-sm text-[#6B7280] dark:text-slate-400">{c.cliDireccionCompleta}</p>
                          </div>
                        </div>
                        {clinicaSeleccionada?.mclCodigo === c.mclCodigo && <CheckCircle2 className="w-6 h-6 text-[#2563EB] dark:text-blue-400" />}
                      </button>
                    ))}
                  </div>
                )}

                {modalidad === 'virtual' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                     <h3 className="text-sm font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Enlace (Opcional)</h3>
                     <div className="bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-slate-700 rounded-xl p-6">
                       <p className="text-sm text-[#6B7280] dark:text-slate-400 mb-4">La clínica te enviará el enlace de la teleconsulta. Si ya tienes un enlace pre-acordado, puedes ingresarlo aquí.</p>
                       <input 
                         type="url" 
                         value={enlace} 
                         onChange={e => setEnlace(e.target.value)} 
                         placeholder="https://zoom.us/j/..." 
                         className="w-full bg-white dark:bg-[#1E293B] border border-[#D1D5DB] dark:border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#111827] dark:text-white placeholder:text-[#9CA3AF] dark:placeholder:text-slate-500"
                       />
                     </div>
                  </div>
                )}

                {modalidad === 'domicilio' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider mb-2">Dirección Completa</h3>
                      <input 
                         type="text" 
                         value={direccion} 
                         onChange={e => setDireccion(e.target.value)} 
                         placeholder="Calle principal #123, Colonia..." 
                         className="w-full bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#111827] dark:text-white placeholder:text-[#9CA3AF] dark:placeholder:text-slate-500"
                       />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider mb-2">Referencias</h3>
                      <input 
                         type="text" 
                         value={referencias} 
                         onChange={e => setReferencias(e.target.value)} 
                         placeholder="Casa portón blanco, frente al parque..." 
                         className="w-full bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#111827] dark:text-white placeholder:text-[#9CA3AF] dark:placeholder:text-slate-500"
                       />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 2: FECHA Y HORA */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-2xl font-black text-[#111827] dark:text-white mb-2">Fecha y Hora</h2>
                <p className="text-[#6B7280] dark:text-slate-400 mb-8">Selecciona un nuevo horario disponible para tu consulta.</p>

                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8">
                  <div className="flex justify-center bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:p-6 rounded-2xl border border-[#E5E7EB] dark:border-slate-700 self-start w-fit">
                    <DayPicker
                      mode="single"
                      selected={fecha}
                      onSelect={(day) => { setFecha(day); setHora(''); }}
                      locale={es}
                      disabled={disabledDays}
                      className="neo-calendar font-sans"
                      modifiersClassNames={{
                        selected: "bg-[#2563EB] text-white hover:bg-blue-700 font-bold shadow-md",
                        today: "font-black text-[#2563EB] underline decoration-2 underline-offset-4"
                      }}
                    />
                  </div>

                  <div>
                    {fecha ? (
                      timeSlots.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 animate-in fade-in">
                          {timeSlots.map(({ time, disabled }) => (
                            <button
                              key={time}
                              onClick={() => !disabled && setHora(time)}
                              disabled={disabled}
                              title={disabled ? "Horario no disponible" : ""}
                              className={`py-3 px-1 rounded-xl text-sm font-bold transition-all border ${
                                disabled
                                ? 'bg-[#F3F4F6] dark:bg-slate-800 text-[#9CA3AF] dark:text-slate-600 border-[#E5E7EB] dark:border-slate-700 cursor-not-allowed opacity-60'
                                : hora === time 
                                ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-md ring-2 ring-[#BFDBFE] dark:ring-blue-900' 
                                : 'bg-white dark:bg-[#1E293B] text-[#111827] dark:text-white border-[#E5E7EB] dark:border-slate-700 hover:border-[#93C5FD] dark:hover:border-blue-900 hover:bg-[#EFF6FF] dark:hover:bg-blue-900/20'
                              }`}
                            >
                              {time.slice(0, 5)}
                            </button>
                          ))}
                        </div>
                      ) : (
                         <div className="bg-[#FEF2F2] dark:bg-red-900/10 border border-[#FCA5A5] dark:border-red-900/30 p-6 rounded-xl flex flex-col items-center text-center">
                           <AlertCircle className="w-10 h-10 text-[#EF4444] dark:text-red-500 mb-2" />
                           <p className="font-bold text-[#991B1B] dark:text-red-400">Sin disponibilidad</p>
                           <p className="text-sm text-[#B91C1C] dark:text-red-500">El médico no atiende en la fecha seleccionada.</p>
                         </div>
                      )
                    ) : (
                      <div className="bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-slate-700 p-8 rounded-2xl flex flex-col items-center justify-center text-center h-full min-h-[250px]">
                        <CalendarClock className="w-12 h-12 text-[#9CA3AF] dark:text-slate-600 mb-4" />
                        <p className="font-bold text-[#4B5563] dark:text-slate-300">Selecciona un día en el calendario</p>
                        <p className="text-sm text-[#6B7280] dark:text-slate-500">Podrás ver y elegir las horas disponibles</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: CONFIRMACION */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}>
                <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-[#EFF6FF] dark:bg-blue-900/30 text-[#2563EB] dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-3xl font-black text-[#111827] dark:text-white">Resumen de Modificación</h2>
                  <p className="text-[#6B7280] dark:text-slate-400 mt-2 max-w-lg mx-auto">Revisa los cambios de tu cita antes de confirmar.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-dashed border-l-2 border-dashed border-[#E5E7EB] dark:border-slate-700 hidden md:block" />
                  
                  {/* CITA ANTERIOR */}
                  <div className="bg-[#F9FAFB] dark:bg-[#0F172A] rounded-2xl p-6 border border-[#E5E7EB] dark:border-slate-700 relative">
                    <span className="absolute -top-3 left-6 bg-[#6B7280] dark:bg-slate-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                      Antes
                    </span>
                    <div className="space-y-4 mt-2 opacity-70 grayscale">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="w-5 h-5 text-[#6B7280] dark:text-slate-400" />
                        <div>
                          <p className="text-xs font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Fecha agendada</p>
                          <p className="font-black text-[#111827] dark:text-white text-lg">{safeFormatDate(citaOriginal.ctaFecha, "d 'de' MMMM")}</p>
                          <p className="text-sm font-medium text-[#6B7280] dark:text-slate-400">{citaOriginal.ctaHora.slice(0, 5)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Monitor className="w-5 h-5 text-[#6B7280] dark:text-slate-400" />
                        <div>
                          <p className="text-xs font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Modalidad</p>
                          <p className="font-black text-[#111827] dark:text-white capitalize">{citaOriginal.ctaModalidad}</p>
                          <p className="text-sm font-medium text-[#6B7280] dark:text-slate-400">${citaOriginal.ctaPrecio}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NUEVA CITA */}
                  <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border-2 border-[#2563EB] shadow-lg relative">
                    <span className="absolute -top-3 left-6 bg-[#2563EB] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                      Nueva Cita
                    </span>
                    <div className="space-y-4 mt-2">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />
                        <div>
                          <p className="text-xs font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Nueva Fecha</p>
                          <p className="font-black text-[#111827] dark:text-white text-lg">{fecha ? format(fecha, "d 'de' MMMM", {locale:es}) : ''}</p>
                          <p className="text-sm font-bold text-[#2563EB] dark:text-blue-400">{hora.slice(0, 5)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {modalidad === 'presencial' ? <Building2 className="w-5 h-5 text-[#2563EB] dark:text-blue-400" /> : <MapPin className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />}
                        <div>
                          <p className="text-xs font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Nueva Modalidad</p>
                          <p className="font-black text-[#111827] dark:text-white capitalize">{modalidad}</p>
                          <p className="text-sm font-black text-[#111827] dark:text-white">${precio}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-4 rounded-xl flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-400 font-medium">
                    <strong className="block mb-1">Aviso sobre Pagos</strong>
                    Al cambiar la modalidad, el costo de la consulta puede variar. Pueden haber cobros o ajustes extras dependiendo de las políticas de la clínica y el costo final de los servicios prestados.
                  </p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* SUMMARY SIDEBAR */}
        <div className="hidden lg:block bg-white dark:bg-[#1E293B] rounded-3xl p-6 shadow-sm border border-[#E5E7EB] dark:border-slate-700 sticky top-32">
           <h3 className="font-black text-lg text-[#111827] dark:text-white mb-6">Detalles Actuales</h3>
           <div className="space-y-6">
              <div>
                <p className="text-xs font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-widest mb-1">Paciente (Fijo)</p>
                <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl border border-[#E5E7EB] dark:border-slate-700">
                  <div className="w-10 h-10 bg-[#E0E7FF] dark:bg-blue-900/30 text-[#4F46E5] dark:text-blue-400 rounded-full flex items-center justify-center font-bold">
                    {citaOriginal.pacienteNombre.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-[#111827] dark:text-white leading-tight">{citaOriginal.pacienteNombre}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-widest mb-1">Plan de Tratamiento</p>
                <select
                  value={grupoId}
                  onChange={e => setGrupoId(e.target.value)}
                  className="w-full bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-slate-700 p-3 rounded-xl text-sm font-bold text-[#111827] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2563EB] dark:focus:ring-blue-500"
                >
                  <option value="">(Ninguno)</option>
                  {gruposList?.map(g => (
                    <option key={g.grupoId} value={g.grupoId}>{g.titulo}</option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-xs font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-widest mb-1">Motivo Corto</p>
                <input 
                  type="text" 
                  value={motivo} 
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Ej. Chequeo mensual..."
                  className="w-full bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-slate-700 p-3 rounded-xl text-sm font-medium text-[#111827] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2563EB] dark:focus:ring-blue-500 placeholder:text-[#9CA3AF] dark:placeholder:text-slate-500"
                />
              </div>

              <div className="pt-6 border-t border-[#E5E7EB] dark:border-slate-700">
                <p className="text-sm font-bold text-[#6B7280] dark:text-slate-400 mb-2 flex justify-between">
                  Costo Final Estimado: <span className="font-black text-[#2563EB] dark:text-blue-400">${precio}</span>
                </p>
              </div>
           </div>
        </div>

      </div>

      {/* FOOTER WIZARD */}
      <div className="sticky bottom-0 z-40 bg-white dark:bg-[#0B1120] border-t border-[#E5E7EB] dark:border-slate-800 p-4 sm:p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              if (step === 1) handleCancel();
              else setStep(s => s - 1);
            }}
            className={`font-bold transition-colors flex items-center px-4 py-2 ${step === 1 ? 'text-[#e11d48] dark:text-red-400 hover:bg-rose-50 dark:hover:bg-red-900/20 rounded-xl' : 'text-[#6B7280] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white'}`}
          >
            {step === 1 ? 'Cancelar Cita' : 'Volver atrás'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canGoNext()}
              className="bg-[#111827] dark:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-[#374151] dark:hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              Continuar
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="bg-[#2563EB] dark:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Modificar Cita Definitivamente'}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
