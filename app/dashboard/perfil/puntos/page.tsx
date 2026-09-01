'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import {
  Star,
  Gift,
  Clock,
  Sparkles,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  CheckCircle2,
  Zap,
  X,
  Check,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';

import { NeoLoader } from '@/components/neo-loader';
import { usePacienteTitular } from '@/hooks/use-pacientes';
import {
  useCatalogoRecompensas,
  useRecompensasDisponibles,
  useTotalPuntos,
  useCanjearRecompensa,
  useHistorialPuntos,
} from '@/hooks/use-recompensas';
import { useLealtadEstado, useLealtadTareas, useLealtadNiveles } from '@/hooks/use-lealtad';
import type { LealtadTarea } from '@/services/lealtad';
import type { Recompensa } from '@/types/recompensas';

function PuntosContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { titular, isLoading: isLoadingTitular } = usePacienteTitular();

  const pacCodigo = titular?.pac_codigo;

  // ─── Queries ───
  const { data: puntosData, isLoading: isLoadingPuntos } = useTotalPuntos(pacCodigo);
  const { data: lealtadEstado, isLoading: isLoadingEstado } = useLealtadEstado();
  const { data: niveles = [], isLoading: isLoadingNiveles } = useLealtadNiveles();
  const { data: catalogo = [], isLoading: isLoadingCatalogo } = useCatalogoRecompensas();
  const { data: misRecompensas = [], isLoading: isLoadingDisponibles } = useRecompensasDisponibles(pacCodigo);
  const { data: tareas = [], isLoading: isLoadingTareas } = useLealtadTareas();
  const { data: historial = [], isLoading: isLoadingHistorial } = useHistorialPuntos(pacCodigo);

  // ─── Mutations ───
  const canjearMutation = useCanjearRecompensa(pacCodigo);

  // ─── Local State (Exactamente 3 filtros + Modal de Ligas) ───
  const [selectedTab, setSelectedTab] = useState<'tienda' | 'inventario' | 'historial'>('tienda');
  const [isNivelesModalOpen, setIsNivelesModalOpen] = useState(false);

  // Misiones y Tareas deduplicadas por código de acción / título único
  const uniqueTareas = useMemo<LealtadTarea[]>(() => {
    const seen = new Set<string>();
    const result: LealtadTarea[] = [];

    for (const tarea of (tareas || [])) {
      const key = (tarea.codigoAccion || tarea.titulo || String(tarea.tareaId || '')).trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(tarea);
      }
    }

    return result;
  }, [tareas]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'inventario' || tabParam === 'mis-recompensas' || tabParam === 'recompensas' || tabParam === 'canjeadas') {
      setSelectedTab('inventario');
    } else if (tabParam === 'historial' || tabParam === 'misiones-completadas' || tabParam === 'completadas') {
      setSelectedTab('historial');
    } else {
      setSelectedTab('tienda');
    }
  }, [searchParams]);

  // Backend state
  const totalPuntos = lealtadEstado?.puntosActuales ?? puntosData?.totalPuntos ?? 0;
  
  // Sort levels array by nvlPuntosMin
  const nivelesOrdenados = [...niveles].sort((a, b) => a.nvlPuntosMin - b.nvlPuntosMin);

  // Match current level item by point range first
  const nivelEncontrado =
    nivelesOrdenados.find((n) => totalPuntos >= n.nvlPuntosMin && totalPuntos <= n.nvlPuntosMax) ||
    nivelesOrdenados.find((n) => (lealtadEstado?.nivelActual || '').toLowerCase().includes(n.nvlDescripcion.toLowerCase())) ||
    (nivelesOrdenados.length > 0 ? nivelesOrdenados[0] : null);

  // Prioritize range match description over raw backend string if backend says "Sin Nivel"
  const nivelActual = nivelEncontrado?.nvlDescripcion || lealtadEstado?.nivelActual || 'Sin Nivel';

  // Next level target
  const siguienteNivel = nivelEncontrado
    ? nivelesOrdenados[nivelesOrdenados.indexOf(nivelEncontrado) + 1]
    : null;

  const puntosMinimos = nivelEncontrado?.nvlPuntosMin ?? lealtadEstado?.puntosMinimosNivel ?? 0;
  const puntosMaximos = nivelEncontrado?.nvlPuntosMax ?? lealtadEstado?.puntosMaximosNivel ?? 0;

  const puntosMetaSiguiente = siguienteNivel
    ? siguienteNivel.nvlPuntosMin
    : puntosMaximos;

  const puntosFaltantes = siguienteNivel
    ? Math.max(0, siguienteNivel.nvlPuntosMin - totalPuntos)
    : (puntosMaximos > totalPuntos ? puntosMaximos - totalPuntos : 0);

  // Real Progress calculation within current level range
  let progresoNumerico = 0;
  const rangoNivel = puntosMaximos - puntosMinimos;
  if (rangoNivel > 0 && totalPuntos >= puntosMinimos) {
    const progresoPuntos = totalPuntos - puntosMinimos;
    progresoNumerico = (progresoPuntos / rangoNivel) * 100;
  } else if (
    typeof lealtadEstado?.progresoPorcentaje === 'number' &&
    puntosMaximos > 0 &&
    lealtadEstado.progresoPorcentaje < 100
  ) {
    progresoNumerico = lealtadEstado.progresoPorcentaje;
  }

  progresoNumerico = Math.min(100, Math.max(0, progresoNumerico));

  const progresoPorcentajeTexto =
    progresoNumerico > 0 && progresoNumerico < 1
      ? progresoNumerico.toFixed(1)
      : Math.round(progresoNumerico).toString();

  const anchoBarraVisual =
    progresoNumerico > 0
      ? Math.max(2, Math.min(100, progresoNumerico))
      : 0;

  const nombreNivelLimpio = nivelActual.toLowerCase().startsWith('nivel')
    ? nivelActual
    : `Nivel ${nivelActual}`;

  const handleCanjear = async (recompensa: Recompensa) => {
    if (totalPuntos < recompensa.rcpCostoPuntos) {
      Swal.fire({
        icon: 'error',
        title: 'Puntos Insuficientes',
        text: `Necesitas ${recompensa.rcpCostoPuntos} puntos para canjear "${recompensa.rcpTitulo}". Tienes ${totalPuntos} pts.`,
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    const confirm = await Swal.fire({
      title: '¿Confirmar Canje?',
      text: `Se descontarán ${recompensa.rcpCostoPuntos} puntos de tu saldo para obtener "${recompensa.rcpTitulo}".`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, Canjear Ahora',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#16a34a',
    });

    if (confirm.isConfirmed) {
      try {
        await canjearMutation.mutateAsync({ rcpCodigo: recompensa.rcpCodigo });
        Swal.fire({
          icon: 'success',
          title: '¡Recompensa Adquirida!',
          text: `Has canjeado con éxito "${recompensa.rcpTitulo}". Revisa la pestaña "Recompensas Canjeadas" para usarla.`,
          confirmButtonColor: '#2563eb',
        });
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'No se pudo canjear',
          text: err.message || 'Error al procesar el canje de la recompensa.',
          confirmButtonColor: '#dc2626',
        });
      }
    }
  };

  if (isLoadingTitular || isLoadingPuntos || isLoadingCatalogo) {
    return <NeoLoader />;
  }

  // Filtrar solo las recompensas disponibles en inventario con tolerancia a distintos formatos de estado del backend
  const recompensasDisponibles = misRecompensas.filter((r) => {
    if (!r) return false;
    const estado = r.praEstado || (r as any).estado || (r as any).pra_estado;
    if (!estado) return true;
    const lower = String(estado).toLowerCase();
    return lower === 'disponible' || lower === 'activa' || lower === 'activo' || lower === 'a';
  });

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8 lg:px-10 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto space-y-8 bg-slate-50 dark:bg-[#0B1120]">
      
      {/* Header Principal (Sin botón adicional para máxima limpieza) */}
      <div className="bg-slate-50 dark:bg-[#0B1120] py-2 mb-1">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
          Puntos y Recompensas
        </h1>
        <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
          Acumula puntos por tus citas y misiones, sube de nivel y canjea tus beneficios.
        </p>
      </div>

      {/* Recuadro Dashboard Principal: Puntos, Avance y Botón para Ver Ligas */}
      <div className="rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 text-slate-900 dark:text-white shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Nivel Info */}
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
              {lealtadEstado?.imagenNivelUrl ? (
                <img src={lealtadEstado.imagenNivelUrl} alt={nivelActual} className="h-12 w-12 object-contain" />
              ) : (
                <Award className="h-10 w-10" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Nivel Actual</p>
                <button
                  type="button"
                  onClick={() => setIsNivelesModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer"
                >
                  <Award className="h-3.5 w-3.5" />
                  Ver ligas y niveles
                </button>
              </div>
              <div className="flex items-center gap-2.5 mt-0.5">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                  {nombreNivelLimpio}
                </h2>
                <Sparkles className="h-6 w-6 text-amber-500 animate-pulse" />
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                {puntosFaltantes > 0 && puntosMaximos > 0
                  ? `Faltan ${puntosFaltantes} pts para el siguiente nivel`
                  : `Tienes ${totalPuntos} pts acumulados`}
              </p>
            </div>
          </div>

          {/* Total Puntos Highlight & Botón Ligas */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0">
            <div className="flex flex-col items-start lg:items-end bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0 w-full sm:w-auto">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Puntos Disponibles</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-4xl sm:text-5xl font-black tracking-tighter text-blue-600 dark:text-blue-400">
                  {totalPuntos}
                </span>
                <span className="text-base font-bold text-slate-500 dark:text-slate-400">pts</span>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setIsNivelesModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800/60 px-4 py-2 text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Ver Ligas y Niveles
            </button>
          </div>
        </div>

        {/* Detailed Progress Bar */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="mb-2 flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>{totalPuntos} {puntosMaximos > 0 ? `/ ${puntosMaximos}` : ''} pts</span>
            <span>{progresoPorcentajeTexto}% completado</span>
          </div>
          <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
            <motion.div
              className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${anchoBarraVisual}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* ─── SECCIÓN PRINCIPAL CON LOS 3 FILTROS EXCLUSIVOS ─── */}
      <div id="seccion-canje-filtros" className="space-y-6 pt-2">
        
        {/* Barra de 3 Filtros Exclusivos */}
        <div className="flex flex-wrap items-center gap-2.5 bg-slate-100/80 dark:bg-[#1E293B]/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
          
          {/* Filtro 1: Tienda de Canje */}
          <button
            type="button"
            onClick={() => setSelectedTab('tienda')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedTab === 'tienda'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Gift className="h-4 w-4" />
            <span>Tienda de Canje ({catalogo.length})</span>
          </button>

          {/* Filtro 2: Recompensas Canjeadas */}
          <button
            type="button"
            onClick={() => setSelectedTab('inventario')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedTab === 'inventario'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Tag className="h-4 w-4" />
            <span>Recompensas Canjeadas ({recompensasDisponibles.length})</span>
          </button>

          {/* Filtro 3: Misiones Completadas */}
          <button
            type="button"
            onClick={() => setSelectedTab('historial')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedTab === 'historial'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Misiones Completadas ({historial.length})</span>
          </button>
        </div>

        {/* ─── CONTENIDO DEL FILTRO 1: Tienda de Canje ─── */}
        {selectedTab === 'tienda' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tienda de Canje</h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Canjea tus puntos acumulados por descuentos y consultas médicas.
              </p>
            </div>

            {catalogo.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {catalogo.map((item, idx) => {
                  const costo = item.rcpCostoPuntos ?? (item as any).costoPuntos ?? (item as any).rcp_costo_puntos ?? 0;
                  const titulo = item.rcpTitulo || (item as any).titulo || (item as any).rcp_titulo || (item as any).nombre || 'Recompensa';
                  const desc = item.descripcion || (item as any).rcpDescripcion || (item as any).rcp_descripcion;
                  const canAfford = totalPuntos >= costo;
                  const keyId = item.rcpCodigo || (item as any).id || (item as any).rcp_codigo || `cat-${idx}`;

                  return (
                    <div
                      key={keyId}
                      className="flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-6 shadow-sm hover:shadow-md transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                            <Gift className="h-6 w-6" />
                          </span>
                          <span className="inline-flex items-center gap-1 font-extrabold text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-900/40">
                            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            {costo} pts
                          </span>
                        </div>

                        <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                          {titulo}
                        </h3>
                        {desc && (
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {desc}
                          </p>
                        )}
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleCanjear(item)}
                          disabled={!canAfford || canjearMutation.isPending}
                          className={`w-full py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                            canAfford
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-95'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {canAfford ? 'Canjear Recompensa' : 'Puntos Insuficientes'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-white dark:bg-[#1E293B]">
                <Gift className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No hay recompensas configuradas</h3>
                <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                  Próximamente habrá nuevas opciones disponibles en el catálogo.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── CONTENIDO DEL FILTRO 2: Recompensas Canjeadas + Misiones a la Derecha ─── */}
        {selectedTab === 'inventario' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Columna Izquierda (2 Cols): Recompensas Canjeadas (Cupones) */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recompensas Canjeadas</h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Cupones activos y disponibles en tu cuenta para aplicar en tus citas.
                </p>
              </div>

              {recompensasDisponibles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {recompensasDisponibles.map((r, idx) => {
                    const titulo = r.tituloRecompensa || (r as any).titulo || (r as any).rcpTitulo || (r as any).rcp_titulo || (r as any).nombre || 'Recompensa';
                    const codigo = r.codigoCanje || (r as any).codigo || (r as any).codigo_canje || (r as any).praCodigoCanje || (r.praCodigo ? `CUPON-${r.praCodigo.slice(0, 6).toUpperCase()}` : `CUPON-${idx + 1}`);
                    const fechaExp = r.praFechaExpiracion || (r as any).fechaExpiracion || (r as any).pra_fecha_expiracion;
                    const keyId = r.praCodigo || (r as any).id || (r as any).pra_codigo || `rec-${idx}`;

                    return (
                      <div
                        key={keyId}
                        className="flex flex-col justify-between rounded-3xl border border-emerald-500/20 bg-white dark:bg-[#1E293B] p-6 shadow-sm hover:shadow-md transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-4">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                              <Tag className="h-5 w-5" />
                            </span>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg">
                              Disponible
                            </span>
                          </div>

                          <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                            {titulo}
                          </h3>

                          {fechaExp && (
                            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" /> Vence: {new Date(fechaExp).toLocaleDateString()}
                            </p>
                          )}

                          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold text-slate-500">Código de Cupón:</span>
                            <code className="bg-slate-900 text-amber-300 px-3 py-1 rounded-xl text-xs font-mono font-bold tracking-wider">
                              {codigo}
                            </code>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-white dark:bg-[#1E293B]">
                  <Gift className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Aún no tienes recompensas en inventario</h3>
                  <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                    Acumula puntos completando misiones y canjéalos en la tienda de canje.
                  </p>
                </div>
              )}
            </div>

            {/* Columna Derecha (1 Col): Misiones Disponibles para Ganar Puntos */}
            <div className="space-y-4 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Misiones Disponibles
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Completa estas actividades para acumular puntos automáticamente.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {uniqueTareas.length > 0 ? (
                  uniqueTareas.map((tarea: LealtadTarea) => (
                    <div
                      key={tarea.tareaId || tarea.codigoAccion}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50">
                          <Star className="h-4 w-4 fill-amber-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{tarea.titulo}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{tarea.descripcion}</p>
                        </div>
                      </div>

                      <span className="shrink-0 text-amber-700 dark:text-amber-300 font-black text-xs bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/60">
                        +{tarea.puntosRecompensa} pts
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 p-4 text-center">No hay misiones adicionales configuradas.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── CONTENIDO DEL FILTRO 3: Misiones Completadas ─── */}
        {selectedTab === 'historial' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Misiones Completadas e Historial</h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Registro histórico de todas las misiones realizadas, puntos acreditados y canjes procesados.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] overflow-hidden shadow-sm">
              {historial.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {historial.map((item, idx) => {
                    const ptsRaw = item.trpPuntos ?? item.TrpPuntos ?? item.puntos ?? item.hisPuntos ?? item.hspPuntos ?? item.montoPuntos ?? item.cantidadPuntos ?? 0;
                    const pts = Math.abs(ptsRaw);
                    const rawTipo = String(item.trpTipo ?? item.TrpTipo ?? item.tipo ?? item.hisTipo ?? item.hspTipo ?? item.tipoMovimiento ?? '').toLowerCase();
                    const esGanancia = rawTipo === 'ganancia' || rawTipo === 'g' || rawTipo === 'abono' || rawTipo === 'ingreso' || rawTipo === 'entrada' || (pts > 0 && rawTipo !== 'canje' && rawTipo !== 'c' && rawTipo !== 'salida' && rawTipo !== 'egreso');
                    const motivoStr = item.trpMotivo || item.TrpMotivo || item.motivo || item.hisMotivo || item.hisDescripcion || item.descripcion || item.concepto || (esGanancia ? 'Abono de puntos' : 'Canje de recompensa');
                    const rawFecha = item.fechaGrabacion || item.FechaGrabacion || item.fecha || item.hisFecha || item.hspFecha || item.fechaMovimiento;
                    const fechaStr = rawFecha && !isNaN(new Date(rawFecha).getTime()) ? new Date(rawFecha).toLocaleString() : 'Fecha no especificada';

                    return (
                      <div key={item.trpCodigo || item.TrpCodigo || item.id || item.hisCodigo || idx} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${
                              esGanancia
                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                                : 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                            }`}
                          >
                            {esGanancia ? (
                              <ArrowUpRight className="h-5 w-5" />
                            ) : (
                              <ArrowDownRight className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{motivoStr}</p>
                            <p className="text-xs text-slate-400">{fechaStr}</p>
                          </div>
                        </div>

                        <span
                          className={`text-base font-black ${
                            esGanancia
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {esGanancia ? `+${pts}` : `-${pts}`} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 text-sm">
                  No hay movimientos registrados en el historial de misiones completadas aún.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL MINIMALISTA Y BLANCO: LIGAS Y NIVELES (Lista Vertical con Puntos Faltantes) ─── */}
      <AnimatePresence>
        {isNivelesModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop con blur */}
            <motion.div
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
              onClick={() => setIsNivelesModalOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Contenedor Blanco Minimalista */}
            <motion.div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] shadow-2xl z-10"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {/* Header Minimalista y Blanco */}
              <div className="flex items-start justify-between p-6 sm:p-7 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1E293B]">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Programa de Fidelidad
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    Ligas y Niveles
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Acumula puntos para ascender de liga y desbloquear beneficios exclusivos.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNivelesModalOpen(false)}
                  className="rounded-full p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  aria-label="Cerrar modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body con Lista Vertical */}
              <div className="p-6 sm:p-7 max-h-[68vh] overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                {nivelesOrdenados.length > 0 ? (
                  nivelesOrdenados.map((n) => {
                    const esActual =
                      nivelEncontrado?.nvlCodigo === n.nvlCodigo ||
                      (totalPuntos >= n.nvlPuntosMin && totalPuntos <= n.nvlPuntosMax);
                    
                    const esSuperado = totalPuntos > n.nvlPuntosMax;
                    const esProximo = totalPuntos < n.nvlPuntosMin;
                    const puntosFaltantesLiga = Math.max(0, n.nvlPuntosMin - totalPuntos);

                    return (
                      <div
                        key={n.nvlCodigo}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-4.5 rounded-2xl border transition-all gap-3.5 ${
                          esActual
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-white dark:bg-[#1E293B] border-slate-200/80 dark:border-slate-800 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl shrink-0 ${
                              esActual
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {n.nvlImagenUrl ? (
                              <img src={n.nvlImagenUrl} alt={n.nvlDescripcion} className="h-6 w-6 object-contain" />
                            ) : (
                              <Award className="h-5 w-5" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                Nivel {n.nvlDescripcion}
                              </h4>
                              {esActual && (
                                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-md">
                                  Actual
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                              Rango: <span className="font-bold text-slate-700 dark:text-slate-300">{n.nvlPuntosMin} - {n.nvlPuntosMax} pts</span>
                            </p>
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0">
                          {esActual ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-black text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/50 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800">
                              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              Tu Nivel Actual
                            </span>
                          ) : esProximo ? (
                            <span className="inline-flex items-center text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/60">
                              Te faltan <strong className="mx-1 text-amber-900 dark:text-amber-100 font-black">{puntosFaltantesLiga} pts</strong> para esta liga
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-xl">
                              <Check className="h-3.5 w-3.5 text-emerald-600" /> Nivel superado
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">No hay niveles configurados en el sistema.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function PuntosPage() {
  return (
    <Suspense fallback={<NeoLoader />}>
      <PuntosContent />
    </Suspense>
  );
}
