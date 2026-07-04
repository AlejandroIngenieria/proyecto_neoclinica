'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCitaStore } from '@/store/use-cita-store';
import { useModalidades, useClinicas, useAreasDomicilio, useHorarios, usePacientesSeleccion, useGruposCita, useCreateCita, useCreateGrupo } from '@/hooks/use-flujo-citas';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { Stethoscope, MapPin, Video, Home, ArrowLeft, ArrowRight, Check, Loader2, CalendarDays, UploadCloud, FileText, X, Edit2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import type { CrearCitaRequest } from '@/types/citas';
import { buildDoctorFullName } from '@/types/doctor';

export function MiniWizard({ codMedico }: { codMedico: string }) {
  const { 
    step, setStep, setMedico, reset,
    modalidad, clinicaSeleccionada, areaDomicilio,
    fecha, hora,
    pacienteSeleccionado, grupoId, motivo,
    prevStep, nextStep, setModalidad, setClinica, setArea, setFecha, setHora, setPaciente, setGrupo, setMotivo
  } = useCitaStore();

  const { data: doctor } = useDoctorByCode(codMedico);

  // Inicialización
  useEffect(() => {
    reset();
    if (doctor) {
      setMedico(doctor.exp_codigo, buildDoctorFullName(doctor)); // En el estado del mini wizard
    }
  }, [codMedico, doctor, reset, setMedico]);

  const stepTitles = ["Modalidad de Consulta", "Fecha y Hora", "Paciente y Motivo", "Confirmación"];

  return (
    <div className="flex flex-col w-full">
      {/* Header con Progreso */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          {step > 1 && (
            <button onClick={prevStep} className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition" aria-label="Volver">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h3 className="text-lg font-black text-slate-900">
            {step}. {stepTitles[step - 1]}
          </h3>
        </div>
        
        {/* Barra de progreso */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${step >= s ? 'bg-sky-500 shadow-sm shadow-sky-500/20' : 'bg-slate-100'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
        {step === 1 && <MiniStep1Modalidad codMedico={codMedico} />}
        {step === 2 && <MiniStep2FechaHora codMedico={codMedico} />}
        {step === 3 && <MiniStep3PacienteMotivo codMedico={codMedico} />}
        {step === 4 && <MiniStep4Confirmacion codMedico={codMedico} />}
      </div>
    </div>
  );
}

function MiniStep1Modalidad({ codMedico }: { codMedico: string }) {
  const { modalidad, setModalidad, clinicaSeleccionada, setClinica, areaDomicilio, setArea, nextStep } = useCitaStore();
  const { data: modalidades = [], isLoading } = useModalidades(codMedico);
  const { data: clinicas = [], isLoading: loadingClinicas } = useClinicas(codMedico, modalidad);
  const { data: areas = [], isLoading: loadingAreas } = useAreasDomicilio(codMedico, modalidad);

  if (isLoading) return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>;

  const isComplete = (modalidad === 'virtual') || 
                     (modalidad === 'presencial' && clinicaSeleccionada) || 
                     (modalidad === 'domicilio' && areaDomicilio);

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'presencial': return <MapPin className="h-7 w-7 mb-1" />;
      case 'virtual': return <Video className="h-7 w-7 mb-1" />;
      case 'domicilio': return <Home className="h-7 w-7 mb-1" />;
      default: return <Stethoscope className="h-7 w-7 mb-1" />;
    }
  };

  return (
    <div className="flex flex-col flex-1">
      {modalidad ? (
        // Estado Minimizado (Ya se eligió modalidad, ahora se pide la clínica si aplica)
        <div className="mb-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-sky-50 border border-sky-100 mb-6">
            <div className="flex items-center gap-3">
              <div className="text-sky-600 bg-white p-2 rounded-xl shadow-sm">
                {getIcon(modalidad)}
              </div>
              <span className="font-bold text-sky-900 capitalize">{modalidad === 'presencial' ? 'Consulta Presencial' : modalidad === 'virtual' ? 'Consulta Virtual' : 'A Domicilio'}</span>
            </div>
            <button onClick={() => { setModalidad('' as any); setClinica(null); setArea(null); }} className="p-2 rounded-xl text-sky-600 hover:bg-sky-100 transition" aria-label="Editar">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          {modalidad === 'presencial' && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">¿En qué clínica?</label>
              {loadingClinicas ? (
                <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
              ) : (
                <select 
                  className="w-full text-base font-medium rounded-xl border-slate-200 focus:ring-sky-500 focus:border-sky-500 p-3.5 bg-slate-50/50"
                  value={clinicaSeleccionada?.mclCodigo || ''}
                  onChange={(e) => {
                    const cli = clinicas.find(c => c.mclCodigo === Number(e.target.value));
                    setClinica(cli || null);
                  }}
                >
                  <option value="">Selecciona una clínica</option>
                  {clinicas.map(c => (
                    <option key={c.mclCodigo} value={c.mclCodigo}>{c.cliDescripcion} - Q{c.mclPrecioBase}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {modalidad === 'domicilio' && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Área de cobertura</label>
              {loadingAreas ? (
                 <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
              ) : (
                <select 
                  className="w-full text-base font-medium rounded-xl border-slate-200 focus:ring-sky-500 focus:border-sky-500 p-3.5 bg-slate-50/50"
                  value={areaDomicilio?.ladCodigo || ''}
                  onChange={(e) => {
                    const a = areas.find(x => x.ladCodigo === Number(e.target.value));
                    setArea(a || null);
                  }}
                >
                  <option value="">Selecciona área</option>
                  {areas.map(a => (
                    <option key={a.ladCodigo} value={a.ladCodigo}>{a.municipio} {a.ladZonas ? `(Z: ${a.ladZonas})` : ''}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      ) : (
        // Estado Expandido (Seleccionando Modalidad)
        <div className="grid grid-cols-1 gap-3 mb-6">
          {modalidades.map((mod) => {
            const normalizedTipo = mod.modDescripcion.toLowerCase().includes('domicilio') 
              ? 'domicilio' 
              : mod.modDescripcion.toLowerCase() as any;

            return (
              <button
                key={mod.modCodigo}
                onClick={() => setModalidad(normalizedTipo)}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 text-slate-500 hover:border-sky-500 hover:bg-sky-50/50 hover:text-sky-700 hover:shadow-sm transition-all"
              >
                <div className="flex-shrink-0 text-slate-400">
                  {getIcon(normalizedTipo)}
                </div>
                <div className="flex-1 text-left">
                  <span className="block font-bold text-slate-800">{mod.modDescripcion}</span>
                  <span className="text-xs text-slate-400">
                    {normalizedTipo === 'presencial' ? 'Asiste a la clínica del doctor' : normalizedTipo === 'virtual' ? 'Atención por videollamada' : 'El médico te visita'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-auto pt-6">
        <button onClick={nextStep} disabled={!isComplete} className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 text-base font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
          Siguiente Paso <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
}

function MiniStep2FechaHora({ codMedico }: { codMedico: string }) {
  const { fecha, setFecha, hora, setHora, nextStep, modalidad, clinicaSeleccionada } = useCitaStore();
  const { data: doctor, isLoading: loadingDoctor } = useDoctorByCode(codMedico);
  
  const mclCodigo = modalidad === 'presencial' ? clinicaSeleccionada?.mclCodigo : undefined;
  const { data: horarios = [], isLoading: loadingHorarios } = useHorarios(mclCodigo ?? null);

  const disabledDays = [{ before: new Date() }];

  const availableTimeSlots = useMemo(() => {
    if (!fecha) return [];
    const dayOfWeek = fecha.getDay(); // 0 = Domingo, 1 = Lunes
    const horariosDelDia = horarios.filter(h => h.horDiaSemana === dayOfWeek);

    const slots = horariosDelDia.flatMap(h => {
      const start = new Date(`1970-01-01T${h.horHoraInicio}`);
      const end = new Date(`1970-01-01T${h.horHoraFin}`);
      const interval = 30; // 30 min default
      const result = [];
      let current = start;
      while (current < end) {
        result.push(current.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }));
        current = new Date(current.getTime() + interval * 60000);
      }
      return result;
    });

    const uniqueSlots = Array.from(new Set(slots)).sort();
    const now = new Date();
    if (fecha.toDateString() === now.toDateString()) {
      const currentTimeString = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      return uniqueSlots.filter(s => s > currentTimeString);
    }
    return uniqueSlots;
  }, [fecha, horarios]);

  if (loadingDoctor || loadingHorarios) {
    return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>;
  }

  const isComplete = fecha && hora;

  return (
    <div className="flex flex-col flex-1">
      {fecha ? (
        // Estado Minimizado (Día elegido, mostrar horas)
        <div className="mb-6 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-sky-50 border border-sky-100 mb-6">
            <div className="flex items-center gap-3">
              <div className="text-sky-600 bg-white p-2 rounded-xl shadow-sm">
                <CalendarDays className="w-5 h-5" />
              </div>
              <span className="font-bold text-sky-900 capitalize">{format(fecha, "EEEE dd 'de' MMMM", { locale: es })}</span>
            </div>
            <button onClick={() => { setFecha(null); setHora(null); }} className="p-2 rounded-xl text-sky-600 hover:bg-sky-100 transition" aria-label="Cambiar fecha">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Horario disponible</label>
          <div className="max-h-60 overflow-y-auto pr-1">
            {availableTimeSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {availableTimeSlots.map((slot: string) => (
                  <button
                    key={slot}
                    onClick={() => setHora(slot)}
                    className={`rounded-xl py-2.5 text-sm font-bold transition-all ${
                      hora === slot ? 'bg-sky-600 text-white shadow-md shadow-sky-500/30 ring-2 ring-sky-600 ring-offset-1' : 'bg-white text-slate-600 border-2 border-slate-100 hover:border-sky-300 hover:text-sky-700 hover:bg-sky-50/50'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-center text-slate-400 py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 mt-2">No hay horarios disponibles.</p>
            )}
          </div>
        </div>
      ) : (
        // Estado Expandido (Elegir día)
        <div className="flex justify-center mb-6">
          <style>{`
            .rdp-vhidden { display: none; }
            .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #f0f9ff; }
          `}</style>
          <DayPicker
            mode="single"
            selected={fecha || undefined}
            onSelect={(d) => { setFecha(d || null); setHora(null); }}
            locale={es}
            disabled={disabledDays}
            modifiersClassNames={{
              selected: 'bg-sky-600 text-white font-bold hover:bg-sky-700',
              today: 'text-sky-600 font-black'
            }}
            classNames={{
              root: 'text-base mx-auto w-full max-w-[340px]',
              day: 'p-0',
              day_button: 'h-11 w-11 mx-auto text-sm font-medium rounded-xl transition-colors',
              month_caption: 'flex justify-between items-center mb-4 px-2',
              caption_label: 'text-base font-black capitalize text-slate-800',
              button_previous: 'h-8 w-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors',
              button_next: 'h-8 w-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors',
              month_grid: 'w-full border-collapse',
              weekday: 'text-slate-400 font-bold text-xs uppercase w-11 h-11',
            }}
          />
        </div>
      )}

      <div className="mt-auto pt-4">
        <button onClick={nextStep} disabled={!isComplete} className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 text-base font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
          Siguiente Paso <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
}

function MiniStep3PacienteMotivo({ codMedico }: { codMedico: string }) {
  const { pacienteSeleccionado, setPaciente, motivo, setMotivo, grupoId, setGrupo, creandoNuevoGrupo, setCreandoNuevoGrupo, nuevoGrupoTema, setNuevoGrupoTema, nextStep } = useCitaStore();
  const { data: pacientes = [], isLoading } = usePacientesSeleccion();
  const { data: grupos = [], isLoading: loadingGrupos } = useGruposCita(pacienteSeleccionado?.pacCodigo || null, codMedico);

  if (isLoading) return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>;

  const isComplete = pacienteSeleccionado !== null && (!creandoNuevoGrupo || (creandoNuevoGrupo && nuevoGrupoTema.trim().length > 0));

  return (
    <div className="flex flex-col flex-1">
      <div className="mb-6">
        <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Paciente</label>
        <select 
          className="w-full text-base font-medium rounded-xl border-slate-200 focus:ring-sky-500 focus:border-sky-500 p-3.5 bg-slate-50/50"
          value={pacienteSeleccionado?.pacCodigo || ''}
          onChange={(e) => {
            const p = pacientes.find(x => x.pacCodigo === e.target.value);
            setPaciente(p || null);
          }}
        >
          <option value="">Selecciona paciente</option>
          {pacientes.map(p => (
            <option key={p.pacCodigo} value={p.pacCodigo}>{p.nombreCompleto} {!p.pacTitular ? '(Dependiente)' : '(Titular)'}</option>
          ))}
        </select>
      </div>

      {pacienteSeleccionado && (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest">
              Tema de Seguimiento <span className="text-slate-400 font-medium normal-case">(Opcional)</span>
            </label>
            <button 
              type="button"
              onClick={() => setCreandoNuevoGrupo(!creandoNuevoGrupo)}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline"
            >
              {creandoNuevoGrupo ? 'Seleccionar existente' : '+ Crear nuevo tema'}
            </button>
          </div>
          
          {creandoNuevoGrupo ? (
            <div className="animate-in fade-in slide-in-from-top-1">
              <input 
                type="text"
                placeholder="Ej. Tratamiento de Dermatitis"
                className="w-full text-base font-medium rounded-xl border-slate-200 focus:ring-sky-500 focus:border-sky-500 p-3.5 bg-sky-50/50"
                value={nuevoGrupoTema}
                onChange={(e) => setNuevoGrupoTema(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-2 ml-1">Se creará un nuevo tema y se enlazará a esta cita.</p>
            </div>
          ) : (
            loadingGrupos ? (
              <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
            ) : (
              <select 
                className="w-full text-base font-medium rounded-xl border-slate-200 focus:ring-sky-500 focus:border-sky-500 p-3.5 bg-slate-50/50"
                value={grupoId || ''}
                onChange={(e) => setGrupo(e.target.value || null)}
              >
                <option value="">Cita de primer contacto (Sin seguimiento)</option>
                {grupos.map(g => (
                  <option key={g.grcCodigo} value={g.grcCodigo}>{g.grcTema}</option>
                ))}
              </select>
            )
          )}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Motivo de Consulta <span className="text-slate-400 font-medium normal-case">(Opcional)</span></label>
        <textarea
          rows={4}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: Dolor de cabeza frecuente..."
          className="w-full text-base font-medium rounded-xl border-slate-200 focus:ring-sky-500 focus:border-sky-500 p-4 bg-slate-50/50 resize-none"
        />
      </div>

      <div className="mt-auto pt-6">
        <button onClick={nextStep} disabled={!isComplete} className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 text-base font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
          Siguiente Paso <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
}

function MiniStep4Confirmacion({ codMedico }: { codMedico: string }) {
  const router = useRouter();
  const { modalidad, clinicaSeleccionada, areaDomicilio, fecha, hora, pacienteSeleccionado, motivo, grupoId, archivos, setArchivos, creandoNuevoGrupo, nuevoGrupoTema } = useCitaStore();
  const { mutateAsync: createCita } = useCreateCita();
  const { mutateAsync: createGrupo } = useCreateGrupo();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropzone setup
  const onDrop = (acceptedFiles: File[]) => {
    setArchivos([...archivos, ...acceptedFiles]);
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpeg', '.jpg'], 'image/png': ['.png'] },
    maxSize: 5 * 1024 * 1024,
  });

  const removeFile = (index: number) => {
    const newFiles = [...archivos];
    newFiles.splice(index, 1);
    setArchivos(newFiles);
  };

  let precioBase = 0;
  if (modalidad === 'presencial' && clinicaSeleccionada) precioBase = clinicaSeleccionada.mclPrecioBase;

  const handleConfirm = async () => {
    if (!codMedico || !pacienteSeleccionado || !fecha || !hora || !modalidad) return;
    setIsSubmitting(true);
    setError(null);

    try {
      let finalGrupoId = grupoId;

      if (creandoNuevoGrupo && nuevoGrupoTema.trim().length > 0) {
        const responseGrupo = await createGrupo({
          codPaciente: pacienteSeleccionado.pacCodigo,
          codMedico,
          tema: nuevoGrupoTema.trim(),
          tituloTema: nuevoGrupoTema.trim()
        });
        finalGrupoId = responseGrupo.grcCodigo;
      }

      let consultorioId: number | null = null;
      if (modalidad === 'presencial' && clinicaSeleccionada) consultorioId = clinicaSeleccionada.cliCodigo;
      // Note: Backend FK is FK_cta_clinica so for domicilio we shouldn't send areaDomicilio.ladCodigo, it should be null.

      const request: CrearCitaRequest = {
        codPaciente: pacienteSeleccionado.pacCodigo,
        codMedico,
        grupoId: finalGrupoId || null,
        consultorioId,
        fecha: fecha.toISOString().split('T')[0],
        hora: hora + ':00',
        modalidad,
        precio: precioBase,
        motivo: motivo || undefined
      };

      const citaId = await createCita(request);

      // Si hay archivos, en un caso real se subirían aquí
      // if (archivos.length > 0) { ...upload }

      router.push(`/dashboard/citas/${citaId}/exito`);
    } catch (e: any) {
      console.error(e);
      setError('Ocurrió un error al agendar.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      {error && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-600 font-semibold">{error}</div>}
      
      <div className="bg-slate-50 rounded-2xl p-6 mb-6 space-y-4 border border-slate-100">
        <div className="flex justify-between items-center pb-4 border-b border-slate-200">
          <span className="text-sm text-slate-500 uppercase font-black tracking-widest">Total Estimado</span>
          <span className="text-2xl font-black text-emerald-600">Q{precioBase.toFixed(2)}</span>
        </div>
        
        <div>
          <p className="text-xs text-slate-400 uppercase font-black tracking-widest mb-1">Fecha de cita</p>
          <p className="text-base font-bold text-slate-900 capitalize">{fecha ? format(fecha, "EEEE dd 'de' MMMM", { locale: es }) : ''} a las {hora}</p>
        </div>

        <div>
          <p className="text-xs text-slate-400 uppercase font-black tracking-widest mb-1">Paciente principal</p>
          <p className="text-base font-bold text-slate-900 truncate">{pacienteSeleccionado?.nombreCompleto}</p>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Documentos Previos <span className="text-slate-400 font-medium normal-case">(Opcional)</span></label>
        
        <div 
          {...getRootProps()} 
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-colors cursor-pointer ${
            isDragActive ? 'border-sky-500 bg-sky-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className={`h-8 w-8 mb-2 ${isDragActive ? 'text-sky-500' : 'text-slate-400'}`} />
          <p className="text-sm font-bold text-slate-700 text-center">
            {isDragActive ? 'Suelta los archivos aquí' : 'Haz clic o arrastra archivos'}
          </p>
          <p className="mt-1 text-xs text-slate-500 text-center">PDF o Imágenes (Max 5MB)</p>
        </div>

        {archivos.length > 0 && (
          <div className="mt-3 space-y-2 max-h-32 overflow-y-auto pr-1">
            {archivos.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 p-2.5 bg-white shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="h-5 w-5 shrink-0 text-sky-500" />
                  <p className="truncate text-xs font-semibold text-slate-700">{file.name}</p>
                </div>
                <button onClick={() => removeFile(idx)} className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition" title="Eliminar">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto pt-4">
        <button onClick={handleConfirm} disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-base font-bold text-white shadow-xl shadow-emerald-500/30 transition hover:bg-emerald-700 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0">
          {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Procesando Cita...</> : <><Check className="w-5 h-5" /> Confirmar Agendamiento</>}
        </button>
      </div>
    </div>
  );
}
