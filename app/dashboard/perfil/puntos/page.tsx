'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import {
  Star,
  Gift,
  Clock,
  Sparkles,
  Copy,
  Check,
  Users,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  CheckCircle2,
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
  useVincularReferido,
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
  const { data: lealtadEstado, isLoading: isLoadingLealtadState } = useLealtadEstado();
  const { data: niveles = [], isLoading: isLoadingNiveles } = useLealtadNiveles();
  const { data: puntosData, isLoading: isLoadingPuntos } = useTotalPuntos(pacCodigo);
  const { data: catalogo = [], isLoading: isLoadingCatalogo } = useCatalogoRecompensas();
  const { data: misRecompensas = [], isLoading: isLoadingInventario } = useRecompensasDisponibles(pacCodigo);
  const { data: tareas = [], isLoading: isLoadingTareas } = useLealtadTareas();
  const { data: historial = [], isLoading: isLoadingHistorial } = useHistorialPuntos(pacCodigo);

  // ─── Mutations ───
  const canjearMutation = useCanjearRecompensa(pacCodigo);
  const referidoMutation = useVincularReferido(pacCodigo);

  // ─── Local State ───
  const [codigoReferidoInput, setCodigoReferidoInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'tienda' | 'inventario' | 'misiones' | 'ligas' | 'historial'>('tienda');

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
    if (tabParam === 'inventario' || tabParam === 'mis-recompensas' || tabParam === 'recompensas') {
      setSelectedTab('inventario');
    } else if (tabParam === 'tienda' || tabParam === 'catalogo') {
      setSelectedTab('tienda');
    } else if (tabParam === 'misiones') {
      setSelectedTab('misiones');
    } else if (tabParam === 'ligas' || tabParam === 'niveles') {
      setSelectedTab('ligas');
    } else if (tabParam === 'historial') {
      setSelectedTab('historial');
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

  // Código de referencia propio
  const miCodigoReferido = pacCodigo ? `NEO-${pacCodigo.slice(0, 8).toUpperCase()}` : 'N/A';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(miCodigoReferido);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

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
          text: `Has canjeado con éxito "${recompensa.rcpTitulo}". Revisa la pestaña "Mis Recompensas" para usarla.`,
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

  const handleVincularReferido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoReferidoInput.trim()) return;

    try {
      const res = await referidoMutation.mutateAsync({ codigoReferencia: codigoReferidoInput.trim() });
      Swal.fire({
        icon: 'success',
        title: '¡Código Vinculado!',
        text: res.mensaje || 'Has ganado puntos adicionales por ingresar tu código de referido.',
        confirmButtonColor: '#16a34a',
      });
      setCodigoReferidoInput('');
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Código Inválido',
        text: err.message || 'El código ingresado no es válido o ya ha sido utilizado.',
        confirmButtonColor: '#dc2626',
      });
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
      
      {/* Header Container - Matching Page Background */}
      <div className="bg-slate-50 dark:bg-[#0B1120] py-2 mb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Puntos y Recompensas
            </h1>
            <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
              Acumula puntos por tus citas y misiones, sube de nivel y canjea tus beneficios.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedTab('tienda')}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all active:scale-95 shrink-0"
            >
              <Gift className="h-4 w-4" />
              Canjear Puntos
            </button>
          </div>
        </div>
      </div>

      {/* Header Dashboard Principal (Matching Page Background Card) */}
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
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Nivel Actual</p>
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

          {/* Total Puntos Highlight */}
          <div className="flex flex-col items-start lg:items-end bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Puntos Disponibles</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-4xl sm:text-5xl font-black tracking-tighter text-blue-600 dark:text-blue-400">
                {totalPuntos}
              </span>
              <span className="text-base font-bold text-slate-500 dark:text-slate-400">pts</span>
            </div>
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

      {/* Tabs Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setSelectedTab('tienda')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            selectedTab === 'tienda'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Gift className="h-4 w-4" />
          Tienda de Canje ({catalogo.length})
        </button>

        <button
          onClick={() => setSelectedTab('inventario')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            selectedTab === 'inventario'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Tag className="h-4 w-4" />
          Recompensas Canjeadas ({recompensasDisponibles.length})
        </button>

        <button
          onClick={() => setSelectedTab('misiones')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            selectedTab === 'misiones'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Star className="h-4 w-4" />
          Misiones y Referidos
        </button>

        <button
          onClick={() => setSelectedTab('ligas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            selectedTab === 'ligas'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Award className="h-4 w-4" />
          Niveles
        </button>

        <button
          onClick={() => setSelectedTab('historial')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            selectedTab === 'historial'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="h-4 w-4" />
          Misiones Cumplidas
        </button>
      </div>

      {/* Tab 1: Tienda de Canje */}
      {selectedTab === 'tienda' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Catálogo de Recompensas</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Canjea tus puntos acumulados por descuentos y consultas.
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
                        onClick={() => handleCanjear(item)}
                        disabled={!canAfford || canjearMutation.isPending}
                        className={`w-full py-3 rounded-2xl text-xs font-bold transition-all ${
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

      {/* Tab 2: Recompensas Canjeadas (Inventario) */}
      {selectedTab === 'inventario' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recompensas Canjeadas</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Cupones activos y disponibles en tu cuenta para aplicar en tus citas.
            </p>
          </div>

          {recompensasDisponibles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                Acumula puntos completando misiones o asistiendo a tus citas y canjéalos en la pestaña de tienda.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Misiones & Referidos */}
      {selectedTab === 'misiones' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Misiones List */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Misiones y Tareas</h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Puntaje otorgado por cada actividad en la plataforma.
              </p>
            </div>

            {uniqueTareas.length > 0 ? (
              <div className="space-y-4">
                {uniqueTareas.map((tarea: LealtadTarea) => (
                  <div
                    key={tarea.tareaId || tarea.codigoAccion}
                    className="flex items-center justify-between p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] shadow-sm gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                        <Star className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{tarea.titulo}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tarea.descripcion}</p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-extrabold text-xs bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-900/40">
                        +{tarea.puntosRecompensa} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-white dark:bg-[#1E293B]">
                <Star className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No hay misiones disponibles</h3>
                <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                  Actualmente no existen misiones o tareas configuradas.
                </p>
              </div>
            )}
          </div>

          {/* Referidos Column */}
          <div className="lg:col-span-5 space-y-6">
            {/* Mi Código de Referido */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Invita a tus Amigos</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Comparte tu código con tus familiares o amigos.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tu Código Único</p>
                  <p className="text-lg font-mono font-black text-amber-300 tracking-wider">{miCodigoReferido}</p>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white px-3 py-2 text-xs font-bold transition-all active:scale-95 border border-white/10"
                >
                  {copiedCode ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedCode ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Vincular Código de Referido */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">¿Tienes un Código de Referido?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ingresa el código que te compartió un amigo.</p>
              </div>

              <form onSubmit={handleVincularReferido} className="space-y-3">
                <input
                  type="text"
                  value={codigoReferidoInput}
                  onChange={(e) => setCodigoReferidoInput(e.target.value)}
                  placeholder="Ej: NEO-A1B2C3"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!codigoReferidoInput.trim() || referidoMutation.isPending}
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                >
                  {referidoMutation.isPending ? 'Vinculando...' : 'Aplicar Código'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Niveles */}
      {selectedTab === 'ligas' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Niveles de Lealtad</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Niveles y rangos de puntos oficiales configurados en el sistema.
            </p>
          </div>

          {nivelesOrdenados.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {nivelesOrdenados.map((n) => {
                const esActual = nivelEncontrado?.nvlCodigo === n.nvlCodigo || (totalPuntos >= n.nvlPuntosMin && totalPuntos <= n.nvlPuntosMax);
                return (
                  <div
                    key={n.nvlCodigo}
                    className={`rounded-3xl border p-6 bg-white dark:bg-[#1E293B] shadow-sm transition-all ${
                      esActual
                        ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
                        {n.nvlImagenUrl ? (
                          <img src={n.nvlImagenUrl} alt={n.nvlDescripcion} className="h-8 w-8 object-contain" />
                        ) : (
                          <Award className="h-6 w-6" />
                        )}
                      </span>
                      {esActual && (
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-full border border-blue-200/60 dark:border-blue-900/50">
                          Nivel Actual
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      Nivel {n.nvlDescripcion}
                    </h3>

                    <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Puntos requeridos: <strong className="text-blue-600 dark:text-blue-400">{n.nvlPuntosMin} - {n.nvlPuntosMax} pts</strong>
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-4xl shrink-0 border border-blue-100 dark:border-blue-900/50">
                  {lealtadEstado?.imagenNivelUrl ? (
                    <img src={lealtadEstado.imagenNivelUrl} alt={nivelActual} className="h-12 w-12 object-contain" />
                  ) : (
                    <Award className="h-10 w-10" />
                  )}
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Nivel Registrado</span>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                    {nombreNivelLimpio}
                  </h3>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
                    Puntos actuales: {totalPuntos} pts
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                  <span>Progreso hacia el siguiente nivel</span>
                  <span>{progresoPorcentajeTexto}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                  <motion.div
                    className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${anchoBarraVisual}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Historial / Misiones Cumplidas */}
      {selectedTab === 'historial' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Misiones Cumplidas e Historial</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Registro histórico de abonos y canjes de puntos.
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
                No hay movimientos registrados en el historial de puntos aún.
              </div>
            )}
          </div>
        </div>
      )}
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
