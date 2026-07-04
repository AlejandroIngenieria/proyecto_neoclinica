'use client';

import { motion } from 'framer-motion';
import { Star, Gift, TrendingUp, Clock, CheckCircle2, ChevronRight, Sparkles, Shield } from 'lucide-react';
import { useLealtadEstado, useLealtadTareas, useCompletarTareaLealtad } from '@/hooks/use-lealtad';
import { NeoLoader } from '@/components/neo-loader';

export default function PuntosPage() {
  const { data: estado, isLoading: isLoadingEstado } = useLealtadEstado();
  const { data: tareas, isLoading: isLoadingTareas } = useLealtadTareas();
  const completarTarea = useCompletarTareaLealtad();

  const handleCompletar = async (codigoAccion: string) => {
    try {
      await completarTarea.mutateAsync(codigoAccion);
    } catch (e) {
      console.error(e);
      alert('Error al completar la tarea.');
    }
  };

  if (isLoadingEstado || isLoadingTareas) {
    return (
        <NeoLoader />
      
    );
  }

  // Si no hay estado aún, podríamos mostrar un placeholder o diseño por defecto.
  const nivelActual = estado?.nivelActual || 'Principiante';
  const puntosActuales = estado?.puntosActuales || 0;
  const puntosMinimos = estado?.puntosMinimosNivel || 0;
  const puntosMaximos = estado?.puntosMaximosNivel || 100;
  const progresoPorcentaje = estado?.progresoPorcentaje || 0;
  
  // Nivel badge color genérico
  const isOro = nivelActual.toLowerCase().includes('oro');
  const isPlata = nivelActual.toLowerCase().includes('plata');
  
  const bgGradient = isOro 
    ? 'from-amber-400 via-yellow-500 to-orange-500' 
    : isPlata 
    ? 'from-slate-300 via-slate-400 to-slate-500'
    : 'from-blue-600 via-blue-500 to-cyan-400';

  return (
    <div
      className="px-6 py-8 lg:px-10 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 -mt-4 md:-mt-8 -mx-4 md:-mx-8 px-4 md:px-8 pt-4 md:pt-8 pb-4 mb-8 rounded-3xl bg-white/10 backdrop-blur-lg">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">Programa de Lealtad</h1>
      </div>

      {/* Main Status Card */}
      <div className={`relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br ${bgGradient} p-8 text-white shadow-xl shadow-blue-500/10`}>
        {/* Glassmorphism overlays */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        
        <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 shadow-inner backdrop-blur-md border border-white/30">
              {estado?.imagenNivelUrl ? (
                <img src={estado.imagenNivelUrl} alt={nivelActual} className="h-12 w-12 object-contain drop-shadow-md" />
              ) : (
                <Shield className="h-10 w-10 text-white" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-white/80">Nivel Actual</p>
              <div className="flex items-center gap-2">
                <h2 className="text-4xl font-black tracking-tight text-white drop-shadow-sm">{nivelActual}</h2>
                <Sparkles className="h-5 w-5 text-white/90" />
              </div>
            </div>
          </div>
          
          <div className="flex min-w-[200px] flex-col items-end md:items-center">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black tracking-tighter drop-shadow-md">{puntosActuales}</span>
              <span className="text-lg font-bold text-white/80">pts</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative z-10 mt-8">
          <div className="mb-2 flex justify-between text-xs font-bold text-white/90">
            <span>{puntosMinimos} pts</span>
            <span>{puntosMaximos} pts para el siguiente nivel</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-black/20 shadow-inner backdrop-blur-sm">
            <motion.div 
              className="h-full rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
              initial={{ width: 0 }}
              animate={{ width: `${progresoPorcentaje}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Misiones y Tareas */}
      <div className="rounded-3xl border border-slate-200/60 bg-white/60 backdrop-blur-xl p-8 shadow-xl shadow-slate-900/5">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Misiones Disponibles</h2>
          <p className="text-sm text-slate-500">Completa estas tareas para ganar puntos rápidamente.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tareas?.map((tarea, index) => (
            <motion.div
              key={tarea.tareaId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index, ease: [0.22, 1, 0.36, 1] }}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border ${tarea.completada ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white'} p-5 shadow-sm transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${tarea.completada ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                  {tarea.completada ? <CheckCircle2 className="h-6 w-6" /> : <Star className="h-6 w-6" />}
                </div>
                <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                  <span>+{tarea.puntosRecompensa}</span>
                  <Star className="h-3 w-3 fill-amber-700" />
                </div>
              </div>
              
              <div className="mt-4 flex-1">
                <h3 className="text-base font-bold text-slate-900">{tarea.titulo}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{tarea.descripcion}</p>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                {tarea.completada ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-100 py-2.5 text-sm font-bold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Completada
                  </div>
                ) : (
                  <button
                    onClick={() => handleCompletar(tarea.codigoAccion)}
                    disabled={completarTarea.isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                  >
                    Completar ahora
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

    </div>
  );
}
