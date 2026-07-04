'use client';

import { useState } from 'react';
import { 
  usePacientesSeleccion, 
  useGruposCita, 
  useCreateGrupo 
} from '@/hooks/use-flujo-citas';
import { useCitaStore } from '@/store/use-cita-store';
import { ArrowLeft, ArrowRight, User, Users, Plus, Loader2 } from 'lucide-react';
import { NeoLoader } from '@/components/neo-loader';

export function Step3PacienteMotivo() {
  const { 
    codMedico,
    pacienteSeleccionado, setPaciente,
    grupoId, setGrupo,
    motivo, setMotivo,
    prevStep, nextStep 
  } = useCitaStore();

  const { data: pacientes = [], isLoading: loadingPacientes } = usePacientesSeleccion();
  
  const { data: grupos = [], isLoading: loadingGrupos, refetch: refetchGrupos } = useGruposCita(
    pacienteSeleccionado?.pacCodigo || null, 
    codMedico
  );

  const { mutateAsync: createGrupo, isPending: isCreatingGrupo } = useCreateGrupo();

  const [isNewGrupoMode, setIsNewGrupoMode] = useState(false);
  const [newGrupoNombre, setNewGrupoNombre] = useState('');

  if (loadingPacientes || loadingGrupos) {
    return <div className="py-12"><NeoLoader fullScreenPortal={true} /></div>;
  }

  const handleCreateGrupo = async () => {
    if (!newGrupoNombre.trim() || !pacienteSeleccionado || !codMedico) return;
    try {
      const nuevoGrupo = await createGrupo({
        codPaciente: pacienteSeleccionado.pacCodigo,
        codMedico,
        tema: newGrupoNombre.trim(),
        tituloTema: newGrupoNombre.trim()
      });
      await refetchGrupos();
      setGrupo(nuevoGrupo.grcCodigo);
      setIsNewGrupoMode(false);
      setNewGrupoNombre('');
    } catch (e) {
      console.error('Error al crear grupo', e);
      // Toast error here ideally
    }
  };

  const isComplete = pacienteSeleccionado !== null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-900">¿Para quién es la cita?</h2>
        <p className="mt-1 text-slate-500">Selecciona el paciente y especifica el motivo.</p>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4">Paciente</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {pacientes.map((pac) => {
            const isSelected = pacienteSeleccionado?.pacCodigo === pac.pacCodigo;
            return (
              <button
                key={pac.pacCodigo}
                onClick={() => setPaciente(pac)}
                className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                  isSelected 
                    ? 'border-sky-500 bg-sky-50 shadow-sm ring-1 ring-sky-500' 
                    : 'border-slate-200 hover:border-sky-200 hover:bg-slate-50'
                }`}
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${isSelected ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {pac.pacTitular ? <User className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{pac.nombreCompleto}</h4>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                    {pac.pacTitular ? 'Titular' : 'Dependiente'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {pacienteSeleccionado && (
        <div className="animate-in fade-in slide-in-from-top-4 space-y-6 border-t border-slate-100 pt-6">
          
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Tema de seguimiento (Opcional)</h3>
            
            {loadingGrupos ? (
               <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setGrupo(null)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                      grupoId === null && !isNewGrupoMode
                        ? 'bg-slate-800 text-white shadow-md'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Ninguno / Nueva consulta
                  </button>
                  
                  {grupos.map(g => (
                    <button
                      key={g.grcCodigo}
                      onClick={() => { setGrupo(g.grcCodigo); setIsNewGrupoMode(false); }}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                        grupoId === g.grcCodigo && !isNewGrupoMode
                          ? 'bg-sky-600 text-white shadow-md'
                          : 'bg-white border border-slate-200 text-slate-600 hover:border-sky-200 hover:bg-sky-50'
                      }`}
                    >
                      {g.grcTituloTema || g.grcTema}
                    </button>
                  ))}

                  <button
                    onClick={() => { setIsNewGrupoMode(true); setGrupo(null); }}
                    className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                      isNewGrupoMode
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-white border border-dashed border-emerald-300 text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    Crear nuevo
                  </button>
                </div>

                {isNewGrupoMode && (
                  <div className="flex items-center gap-3 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 animate-in zoom-in-95">
                    <input 
                      type="text" 
                      placeholder="Ej. Seguimiento de gastritis..."
                      value={newGrupoNombre}
                      onChange={e => setNewGrupoNombre(e.target.value)}
                      className="flex-1 rounded-xl border border-emerald-200 px-4 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      onClick={handleCreateGrupo}
                      disabled={isCreatingGrupo || !newGrupoNombre.trim()}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isCreatingGrupo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Motivo específico</h3>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Describe brevemente los síntomas o el motivo de esta consulta..."
              rows={3}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 placeholder:text-slate-400"
            />
          </div>

        </div>
      )}

      <div className="mt-8 flex justify-between border-t border-slate-100 pt-6">
        <button
          onClick={prevStep}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <button
          onClick={nextStep}
          disabled={!isComplete}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Siguiente
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
