'use client';

import { useState, useEffect } from 'react';
import { useModalidades, useClinicas, useHorarios, useGruposCita, useUpdateCita } from '@/hooks/use-flujo-citas';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { MapPin, Video, Home, ArrowLeft, ArrowRight, Check, Loader2, Edit2, CalendarDays, Clock, FileText } from 'lucide-react';
import type { CitaListDto, UpdateCitaRequest } from '@/types/citas';

function getModalityIcon(tipo: string) {
  switch (tipo) {
    case 'presencial': return <MapPin className="h-6 w-6 mb-1" />;
    case 'virtual': return <Video className="h-6 w-6 mb-1" />;
    case 'domicilio': return <Home className="h-6 w-6 mb-1" />;
    default: return <CalendarDays className="h-6 w-6 mb-1" />;
  }
}

export function UpdateWizard({ cita, onCancel, onSuccess, onError }: { 
  cita: CitaListDto; 
  onCancel: () => void; 
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [step, setStep] = useState(1);
  const { mutateAsync: updateCita, isPending } = useUpdateCita();

  // Local state for the update wizard
  const [modalidad, setModalidad] = useState<'presencial' | 'virtual' | 'domicilio' | ''>(cita.ctaModalidad as any);
  const [clinica, setClinica] = useState<number | null>(null); // mclCodigo
  const [fecha, setFecha] = useState<Date | null>(parseISO(cita.ctaFecha));
  const [hora, setHora] = useState<string>(cita.ctaHora);
  const [motivo, setMotivo] = useState<string>(cita.ctaMotivo || '');
  const [grupoId, setGrupoId] = useState<string | null>(cita.ctaGrupoId);

  // Queries
  const { data: modalidades = [], isLoading: loadingMod } = useModalidades(cita.ctaCoddoc);
  const { data: clinicas = [], isLoading: loadingCli } = useClinicas(cita.ctaCoddoc, modalidad);
  const { data: horarios = [], isLoading: loadingHor } = useHorarios(clinica);
  const { data: grupos = [], isLoading: loadingGrupos } = useGruposCita(cita.ctaCodpac, cita.ctaCoddoc);

  // Auto-reset clinica if modality changes, and set initial mclCodigo
  useEffect(() => {
    if (modalidad !== cita.ctaModalidad) {
      setClinica(null);
      setHora('');
    } else if (clinicas.length > 0 && clinica === null) {
      const match = clinicas.find(c => c.cliCodigo === cita.ctaConsultorioId);
      if (match) {
        setClinica(match.mclCodigo);
      }
      setHora(cita.ctaHora);
    }
  }, [modalidad, cita.ctaModalidad, cita.ctaConsultorioId, cita.ctaHora, clinicas]);

  const stepTitles = ["Modalidad y Ubicación", "Fecha y Hora", "Motivo y Confirmación"];
  const totalSteps = 3;

  const nextStep = () => { if (step < totalSteps) setStep(step + 1); };
  const prevStep = () => { if (step > 1) setStep(step - 1); };

  const handleSubmit = async () => {
    if (!fecha || !hora || !modalidad) return;
    if (modalidad === 'presencial' && !clinica) return;

    try {
      let finalConsultorioId: number | null = null;
      if (modalidad === 'presencial' && clinica) {
        const found = clinicas.find(c => c.mclCodigo === clinica);
        if (found) finalConsultorioId = found.cliCodigo;
      }

      const payload: UpdateCitaRequest = {
        consultorioId: finalConsultorioId,
        fecha: format(fecha, 'yyyy-MM-dd'),
        hora,
        modalidad,
        precio: cita.ctaPrecio,
        motivo: motivo || null,
        grupoId: grupoId || null,
      };
      await updateCita({ citaId: cita.ctaCodigo, payload });
      onSuccess("Cita modificada exitosamente");
    } catch (err: any) {
      onError(err?.response?.data?.message || "Hubo un problema al procesar tu solicitud. Intenta nuevamente.");
    }
  };

  const isStep1Complete = (modalidad === 'virtual' || modalidad === 'domicilio') || (modalidad === 'presencial' && clinica);
  const isStep2Complete = fecha !== null && hora !== '';
  const isStep3Complete = true; // Motivo and Grupo are optional

  const disabledDays = [{ before: new Date() }];

  return (
    <div className="flex flex-col w-full min-h-[400px]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={step > 1 ? prevStep : onCancel} className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition" aria-label="Volver">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h3 className="text-xl font-black text-slate-900">
            {step}. {stepTitles[step - 1]}
          </h3>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${step >= s ? 'bg-sky-500 shadow-sm shadow-sky-500/20' : 'bg-slate-100'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1">
        {/* STEP 1: Modalidad y Ubicación */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full">
            <div className="grid grid-cols-1 gap-3 mb-6">
              <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">¿Cómo será la consulta?</label>
              {loadingMod ? <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-sky-500 mx-auto" /></div> : (
                <div className="grid grid-cols-3 gap-2">
                  {modalidades.map((mod) => {
                    const normTipo = mod.modDescripcion.toLowerCase().includes('domicilio') ? 'domicilio' : mod.modDescripcion.toLowerCase() as any;
                    return (
                      <button
                        key={mod.modCodigo}
                        onClick={() => setModalidad(normTipo)}
                        className={`py-3 px-2 rounded-xl border-2 font-bold transition flex flex-col items-center gap-2 ${modalidad === normTipo ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                      >
                        {getModalityIcon(normTipo)}
                        <span className="capitalize text-sm">{mod.modDescripcion}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {modalidad === 'presencial' && (
              <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Clínica</label>
                {loadingCli ? <div className="h-12 bg-slate-100 animate-pulse rounded-xl" /> : (
                  <select 
                    className="w-full text-base font-medium rounded-xl border-slate-200 focus:ring-sky-500 focus:border-sky-500 p-3.5 bg-slate-50/50"
                    value={clinica || ''}
                    onChange={(e) => setClinica(Number(e.target.value))}
                  >
                    <option value="">Selecciona una clínica</option>
                    {clinicas.map(c => (
                      <option key={c.mclCodigo} value={c.mclCodigo}>{c.cliDescripcion}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
            
            {(modalidad === 'virtual' || modalidad === 'domicilio') && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl mb-6">
                <p className="text-sm text-amber-800 font-medium">Nota: El doctor confirmará los detalles exactos (link de reunión o dirección) una vez programada la cita.</p>
              </div>
            )}

            <div className="mt-auto pt-4">
              <button onClick={nextStep} disabled={!isStep1Complete} className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 text-base font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
                Siguiente Paso <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Fecha y Hora */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full">
            <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <DayPicker
                mode="single"
                selected={fecha || undefined}
                onSelect={(d) => { setFecha(d || null); setHora(''); }}
                locale={es}
                disabled={disabledDays}
                modifiersClassNames={{ selected: 'bg-sky-600 text-white font-bold hover:bg-sky-700', today: 'text-sky-600 font-black' }}
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

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 flex justify-between items-center">
                <span>Horarios Disponibles</span>
                {fecha && <span className="text-sky-600 normal-case">{format(fecha, "d 'de' MMMM", { locale: es })}</span>}
              </label>
              {!fecha ? (
                <div className="p-4 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-center text-slate-400 text-sm font-medium">
                  Selecciona una fecha primero
                </div>
              ) : loadingHor ? (
                <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
              ) : (
                <select 
                  className="w-full text-base font-medium rounded-xl border-slate-200 focus:ring-sky-500 focus:border-sky-500 p-3.5 bg-slate-50/50"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                >
                  <option value="">Selecciona hora</option>
                  {horarios.map((h, idx) => (
                    <option key={`${h.horHoraInicio}-${idx}`} value={h.horHoraInicio}>{h.horHoraInicio.slice(0,5)}</option>
                  ))}
                  {/* Fallback si el horario actual no está en la lista (e.g. ya pasó o es otra fecha) */}
                  {!horarios.some(h => h.horHoraInicio === cita.ctaHora) && (
                    <option value={cita.ctaHora}>{cita.ctaHora.slice(0,5)} (Hora Actual)</option>
                  )}
                </select>
              )}
            </div>

            <div className="mt-auto pt-4">
              <button onClick={nextStep} disabled={!isStep2Complete} className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 text-base font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
                Siguiente Paso <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirmación y Motivo */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full">
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">
                Tema de Seguimiento <span className="text-slate-400 font-medium normal-case">(Opcional)</span>
              </label>
              {loadingGrupos ? <div className="h-12 bg-slate-100 animate-pulse rounded-xl" /> : (
                <select 
                  className="w-full text-base font-medium rounded-xl border-slate-200 focus:ring-sky-500 focus:border-sky-500 p-3.5 bg-slate-50/50"
                  value={grupoId || ''}
                  onChange={(e) => setGrupoId(e.target.value || null)}
                >
                  <option value="">Cita de primer contacto (Sin seguimiento)</option>
                  {grupos.map(g => (
                    <option key={g.grcCodigo} value={g.grcCodigo}>{g.grcTema}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">
                Motivo de Consulta <span className="text-slate-400 font-medium normal-case">(Opcional)</span>
              </label>
              <textarea
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Dolor de cabeza frecuente..."
                className="w-full text-base font-medium rounded-xl border-slate-200 focus:ring-sky-500 focus:border-sky-500 p-4 bg-slate-50/50 resize-none"
              />
            </div>

            <div className="bg-sky-50 rounded-2xl p-5 border border-sky-100 mb-6 space-y-3">
              <h4 className="font-black text-sky-900 mb-2">Resumen de Cambios</h4>
              <div className="flex items-center gap-3 text-sky-800 text-sm">
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{fecha ? format(fecha, "EEEE d 'de' MMMM, yyyy", { locale: es }) : ''}</span>
              </div>
              <div className="flex items-center gap-3 text-sky-800 text-sm">
                <Clock className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{hora.slice(0,5)}</span>
              </div>
              <div className="flex items-center gap-3 text-sky-800 text-sm capitalize">
                {getModalityIcon(modalidad)}
                <span className="font-semibold">{modalidad}</span>
              </div>
            </div>

            <div className="mt-auto pt-4 flex gap-3">
              <button onClick={onCancel} disabled={isPending} className="flex-1 flex items-center justify-center rounded-xl bg-slate-100 py-4 text-base font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={isPending || !isStep3Complete} className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-4 text-base font-bold text-white transition hover:bg-sky-700 disabled:opacity-50">
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                Confirmar Cambios
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
