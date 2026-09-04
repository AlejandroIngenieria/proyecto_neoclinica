'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import {
  usePacientesSeleccion,
} from '@/hooks/use-flujo-citas';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { useCitaStore } from '@/store/use-cita-store';
import { ChevronLeft, MapPin, Video, Home, Stethoscope, ArrowRight, CalendarDays, Building2, BriefcaseMedical, CalendarClock, Activity, ClipboardList, Plus, Loader2, UploadCloud, FileText, X, CheckCircle2, Sparkles } from 'lucide-react';
import { usePacienteTitular } from '@/hooks/use-pacientes';
import { PacienteFormModal } from '@/components/paciente-form-modal';
import { NeoLoader } from '@/components/neo-loader';

const MOTIVOS = [
  {
    id: 'Chequeo General',
    title: 'Chequeo General',
    badge: 'Preventivo',
    icon: BriefcaseMedical
  },
  {
    id: 'Consulta de Seguimiento',
    title: 'Consulta de Seguimiento',
    badge: 'Control',
    icon: CalendarClock
  },
  {
    id: 'Enfermedad o Molestia',
    title: 'Enfermedad o Molestia',
    badge: 'Diagnóstico',
    icon: Activity
  },
  {
    id: 'Renovación de Receta',
    title: 'Renovación de Receta',
    badge: 'Medicamentos',
    icon: ClipboardList
  }
];

export function Step2PacienteMotivo() {
  const router = useRouter();
  const {
    codMedico, modalidad,
    clinicaSeleccionada, areaDomicilio,
    servicioSeleccionado, setServicio,
    fecha, hora, step,
    pacienteSeleccionado, setPaciente,
    motivo, setMotivo,
    archivos, setArchivos,
    direccionDomicilio, setDireccionDomicilio,
    referenciasDomicilio, setReferenciasDomicilio,
    prevStep, nextStep
  } = useCitaStore();

  const [isAddPacienteOpen, setIsAddPacienteOpen] = useState(false);

  const { titular } = usePacienteTitular();
  const { data: pacientes = [], isLoading: loadingPacientes } = usePacientesSeleccion();
  const { data: doctor, isLoading: loadingDoctor } = useDoctorByCode(codMedico!);

  // Asegurar que la pantalla siempre se posicione hasta arriba al entrar al Paso 2
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setArchivos([...archivos, ...acceptedFiles]);
  }, [archivos, setArchivos]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    },
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  const removeFile = (index: number) => {
    const newFiles = [...archivos];
    newFiles.splice(index, 1);
    setArchivos(newFiles);
  };

  if (loadingPacientes || loadingDoctor) {
    return <div className="py-12"><NeoLoader fullScreenPortal={false} /></div>;
  }

  const getInitials = (name: string) => {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };

  const isComplete = pacienteSeleccionado !== null && motivo !== '' && 
    (modalidad !== 'domicilio' || (direccionDomicilio.trim() !== '' && referenciasDomicilio.trim() !== ''));
  const isSeguimientoVisible = pacienteSeleccionado !== null;

  return (
    <div className="flex flex-col w-full font-sans pb-4">

      {/* The header has been extracted to WizardHeader.tsx */}

      {/* BODY CONTINUOUS FLOW */}
      <div className="flex flex-col w-full space-y-12 px-4">

        {/* SECTION 1: PACIENTE */}
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">¿Quién asistirá a la consulta?</h2>
          <div className="flex items-end gap-6 sm:gap-10 overflow-x-auto max-w-full pb-2 scrollbar-none">
            {pacientes.map(pac => {
              const isSelected = pacienteSeleccionado?.pacCodigo === pac.pacCodigo;
              return (
                <button key={pac.pacCodigo} onClick={() => setPaciente(pac)} className="flex flex-col items-center gap-3 group">
                  <div className={`h-[88px] w-[88px] rounded-full border-[3px] p-1 transition-all ${isSelected ? 'border-blue-600 dark:border-blue-500 shadow-md shadow-blue-600/20' : 'border-transparent'}`}>
                    <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center transition-all ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}`}>
                      {pac.pacFotoPerfilUrl || pac.pacTitular ? (
                        <img
                          src={pac.pacFotoPerfilUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(pac.nombreCompleto)}&background=0D8ABC&color=fff`}
                          alt={pac.nombreCompleto}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold">{getInitials(pac.nombreCompleto)}</span>
                      )}
                    </div>
                  </div>
                  <span className={`font-bold transition-colors text-[15px] ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'}`}>
                    {pac.pacTitular ? 'Yo' : pac.nombreCompleto}
                  </span>
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setIsAddPacienteOpen(true)}
              className="flex flex-col items-center gap-3 group pb-0.5"
            >
              <div className="h-[80px] w-[80px] rounded-full border-[2px] border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:border-slate-400 dark:group-hover:border-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors mb-2">
                <Plus className="h-6 w-6" strokeWidth={2} />
              </div>
              <span className="font-bold text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors text-[13px]">Añadir Familiar</span>
            </button>
          </div>

          <PacienteFormModal
            open={isAddPacienteOpen}
            mode="add"
            titular={titular}
            titularCodigo={titular?.pac_codigo || ''}
            onClose={() => setIsAddPacienteOpen(false)}
          />
        </div>

        {/* SECTION 2: SERVICIO / MOTIVO DE CONSULTA */}
        <div className={`transition-all duration-300 ${pacienteSeleccionado ? 'opacity-100 translate-y-0' : 'opacity-40 pointer-events-none translate-y-4'}`}>
          {servicioSeleccionado ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight flex items-center gap-2">
                <Stethoscope className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                Servicio Seleccionado
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Has seleccionado el siguiente servicio en el paso anterior:
              </p>

              {/* Tarjeta del servicio seleccionado */}
              <div className="rounded-2xl border-2 border-blue-600/60 dark:border-blue-500/60 bg-blue-50/60 dark:bg-blue-950/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Servicio médico
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                      {servicioSeleccionado.servicio}
                    </h3>
                    {servicioSeleccionado.observaciones && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {servicioSeleccionado.observaciones}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-blue-200/60 dark:border-blue-800/40">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                    Costo total con IVA
                  </span>
                  <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                    Q{servicioSeleccionado.costoTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Observaciones o detalles adicionales */}
              <div className="mt-4">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Observaciones o síntomas adicionales (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={motivo && motivo !== servicioSeleccionado.servicio ? motivo : ''}
                  onChange={(e) => setMotivo(e.target.value || servicioSeleccionado.servicio)}
                  placeholder="Describe brevemente tus síntomas, dudas o detalles adicionales que el médico deba conocer..."
                  className="w-full bg-white dark:bg-[#1E293B] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 resize-none transition-all"
                />
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">Motivo de la consulta</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Selecciona la opción que mejor describa tu visita.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {MOTIVOS.map((m) => {
                  const isSelected = motivo === m.id;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setServicio(null);
                        setMotivo(m.id);
                      }}
                      className={`relative flex flex-col items-start text-left p-5 rounded-3xl border-[2px] transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-600/10'
                          : 'border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-600/50 bg-white dark:bg-[#1E293B] shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div className={`shrink-0 p-3 rounded-full mb-4 transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-[#0B1120] text-blue-600 dark:text-blue-400'}`}>
                        <Icon className="w-6 h-6" />
                      </div>

                      <div className="flex flex-col">
                        <h3 className={`text-[15px] font-bold mb-2 leading-tight ${isSelected ? 'text-blue-900 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                          {m.title}
                        </h3>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md w-fit ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                          {m.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SECTION Domicilio: DIRECCION EXACTA (Solo Domicilio) */}
        {modalidad === 'domicilio' && (
          <div className={`transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${pacienteSeleccionado ? 'opacity-100 translate-y-0' : 'opacity-40 pointer-events-none translate-y-4'}`}>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">Dirección de visita</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Proporciona la dirección exacta para que el médico pueda llegar sin problemas.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-[#0F172A] rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">Dirección Exacta <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={direccionDomicilio}
                  onChange={(e) => setDireccionDomicilio(e.target.value)}
                  placeholder="Calle, avenida, zona, número de casa..."
                  className="w-full bg-white dark:bg-[#1E293B] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">Referencias <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={referenciasDomicilio}
                  onChange={(e) => setReferenciasDomicilio(e.target.value)}
                  placeholder="Ej. Portón negro, frente al parque..."
                  className="w-full bg-white dark:bg-[#1E293B] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: ARCHIVOS (OPCIONAL) */}
        <div className={`transition-all duration-300 ${pacienteSeleccionado ? 'opacity-100 translate-y-0' : 'opacity-40 pointer-events-none translate-y-4'}`}>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">Documentos previos (Opcional)</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Puedes adjuntar fotos de recetas anteriores, resultados de laboratorio o imágenes relevantes. (Max 5MB)</p>

          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 transition-colors cursor-pointer ${isDragActive ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20' : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0F172A] hover:bg-slate-100 dark:hover:bg-[#1E293B]'
              }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className={`h-10 w-10 ${isDragActive ? 'text-sky-500' : 'text-slate-400 dark:text-slate-500'}`} />
            <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300">
              {isDragActive ? 'Suelta los archivos aquí...' : 'Haz clic o arrastra archivos aquí'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">PDF, JPG o PNG</p>
          </div>

          {archivos.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {archivos.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-[#1E293B] shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="h-5 w-5 shrink-0 text-sky-500" />
                    <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{file.name}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className="rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 transition"
                    title="Eliminar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Footer Next Button ALWAYS VISIBLE BUT BLOCKED IF NOT COMPLETE */}
      <div className="sticky bottom-0 z-30 bg-transparent flex flex-col-reverse sm:flex-row justify-between items-center gap-3 py-4 border-t border-slate-200/60 dark:border-slate-800/40 mt-8">
        <button
          onClick={prevStep}
          className="w-full sm:w-auto font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm text-sm sm:text-base"
        >
          <ChevronLeft className="h-5 w-5" /> Regresar al paso anterior
        </button>

        <button
          onClick={nextStep}
          disabled={!isComplete}
          className={`w-full sm:w-auto font-bold py-3.5 px-8 sm:px-10 rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${isComplete
            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
        >
          <span>Continuar al Siguiente Paso</span> <ArrowRight className="h-5 w-5" />
        </button>
      </div>

    </div>
  );
}
