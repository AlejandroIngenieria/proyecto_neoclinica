'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Gift,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Shield,
  Lock,
  Copy,
  Check,
  Share2,
  Users,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  Zap,
  Calendar,
  AlertCircle,
  FileText,
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
import { useLealtadTareas, useCompletarTareaLealtad } from '@/hooks/use-lealtad';
import type { Recompensa, RecompensaAdquirida, LigaNivel } from '@/types/recompensas';

// ─── Ligas / Niveles de Lealtad ──────────────────────────────────────────────

const LIGAS_SISTEMA: LigaNivel[] = [
  {
    id: 'bronce',
    nombre: 'Bronce',
    puntosMinimos: 0,
    puntosMaximos: 199,
    colorGradient: 'from-amber-700 via-amber-800 to-amber-950',
    badgeIcon: '🥉',
    beneficios: ['Acceso al programa de lealtad', 'Recordatorios estándar por correo'],
  },
  {
    id: 'plata',
    nombre: 'Plata',
    puntosMinimos: 200,
    puntosMaximos: 499,
    colorGradient: 'from-slate-400 via-slate-500 to-slate-700',
    badgeIcon: '🥈',
    beneficios: ['5% extra de puntos en cada cita', 'Notificaciones SMS personalizadas'],
  },
  {
    id: 'oro',
    nombre: 'Oro',
    puntosMinimos: 500,
    puntosMaximos: 999,
    colorGradient: 'from-amber-400 via-yellow-500 to-amber-600',
    badgeIcon: '🥇',
    beneficios: ['10% de puntos extra', 'Atención preferencial en agenda', 'Descuentos en lab de 10%'],
  },
  {
    id: 'platino',
    nombre: 'Platino',
    puntosMinimos: 1000,
    puntosMaximos: 1999,
    colorGradient: 'from-cyan-400 via-blue-500 to-indigo-700',
    badgeIcon: '💎',
    beneficios: ['15% de puntos extra', 'Almacenamiento HD ilimitado de expedientes', 'Recordatorios WhatsApp VIP'],
  },
  {
    id: 'diamante',
    nombre: 'Diamante',
    puntosMinimos: 2000,
    puntosMaximos: 99999,
    colorGradient: 'from-purple-500 via-indigo-600 to-slate-900',
    badgeIcon: '👑',
    beneficios: ['20% de puntos extra', 'Consulta anual de revisión gratuita', 'Soporte prioritario 24/7'],
  },
];

export default function PuntosPage() {
  const { data: session } = useSession();
  const { titular, isLoading: isLoadingTitular } = usePacienteTitular();

  const pacCodigo = titular?.pac_codigo;

  // ─── Queries ───
  const { data: puntosData, isLoading: isLoadingPuntos } = useTotalPuntos(pacCodigo);
  const { data: catalogo = [], isLoading: isLoadingCatalogo } = useCatalogoRecompensas();
  const { data: misRecompensas = [], isLoading: isLoadingInventario } = useRecompensasDisponibles(pacCodigo);
  const { data: tareas = [], isLoading: isLoadingTareas } = useLealtadTareas();
  const { data: historial = [], isLoading: isLoadingHistorial } = useHistorialPuntos(pacCodigo);

  // ─── Mutations ───
  const canjearMutation = useCanjearRecompensa(pacCodigo);
  const referidoMutation = useVincularReferido(pacCodigo);
  const completarTareaMutation = useCompletarTareaLealtad();

  // ─── Local State ───
  const [codigoReferidoInput, setCodigoReferidoInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'tienda' | 'inventario' | 'misiones' | 'ligas' | 'historial'>('tienda');

  const totalPuntos = puntosData?.totalPuntos ?? 0;

  // Determinar nivel actual
  const ligaActual =
    LIGAS_SISTEMA.find((l) => totalPuntos >= l.puntosMinimos && totalPuntos <= l.puntosMaximos) ||
    LIGAS_SISTEMA[0];

  const siguienteLiga = LIGAS_SISTEMA[LIGAS_SISTEMA.indexOf(ligaActual) + 1] || ligaActual;
  const puntosParaSiguiente = Math.max(0, siguienteLiga.puntosMinimos - totalPuntos);
  const progresoPorcentaje = Math.min(
    100,
    Math.max(0, Math.round(((totalPuntos - ligaActual.puntosMinimos) / (siguienteLiga.puntosMinimos - ligaActual.puntosMinimos || 1)) * 100))
  );

  // Código de referencia propio
  const miCodigoReferido = pacCodigo ? `NEO-${pacCodigo.slice(0, 8).toUpperCase()}` : 'NEO-123456';

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

  const handleCompletarTarea = async (codigoAccion: string) => {
    try {
      await completarTareaMutation.mutateAsync(codigoAccion);
      Swal.fire({
        icon: 'success',
        title: '¡Misión Completada!',
        text: 'Has ganado los puntos correspondientes a esta tarea.',
        confirmButtonColor: '#16a34a',
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo completar la tarea en este momento.',
        confirmButtonColor: '#dc2626',
      });
    }
  };

  if (isLoadingTitular || isLoadingPuntos || isLoadingCatalogo) {
    return <NeoLoader />;
  }

  // Filtrar solo las recompensas disponibles en inventario
  const recompensasDisponibles = misRecompensas.filter((r) => r.praEstado === 'disponible');

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8 lg:px-10 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto space-y-8">
      {/* Sticky Header Container */}
      <div className="sticky top-0 z-30 py-4 mb-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Puntos y Recompensas
            </h1>
            <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
              Acumula puntos por tus citas y misiones, sube de nivel y desbloquea beneficios exclusivos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedTab('tienda')}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              <Gift className="h-4 w-4" />
              Canjear Puntos
            </button>
          </div>
        </div>
      </div>

      {/* Header Dashboard Principal (Puntos, Nivel y Barra de Progreso) */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${ligaActual.colorGradient} p-6 sm:p-8 text-white shadow-2xl shadow-indigo-950/20`}>
        {/* Ambient Blur Overlays */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Nivel Icon & Info */}
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl bg-white/15 backdrop-blur-md border border-white/20 shadow-inner text-4xl sm:text-5xl shrink-0">
              {ligaActual.badgeIcon}
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-white/80">Nivel Actual</p>
              <div className="flex items-center gap-2.5 mt-0.5">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md">
                  Liga {ligaActual.nombre}
                </h2>
                <Sparkles className="h-6 w-6 text-amber-300 animate-pulse" />
              </div>
              <p className="mt-1 text-xs sm:text-sm text-white/90 font-medium">
                {siguienteLiga.id !== ligaActual.id
                  ? `Faltan ${puntosParaSiguiente} pts para ascender a Liga ${siguienteLiga.nombre}`
                  : '¡Has alcanzado el nivel máximo de beneficios!'}
              </p>
            </div>
          </div>

          {/* Total Puntos Highlight */}
          <div className="flex flex-col items-start lg:items-end bg-black/20 p-5 rounded-2xl border border-white/10 backdrop-blur-md shrink-0">
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">Puntos Disponibles</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-4xl sm:text-5xl font-black tracking-tighter text-amber-300 drop-shadow-md">
                {totalPuntos}
              </span>
              <span className="text-base font-bold text-white/90">pts</span>
            </div>
          </div>
        </div>

        {/* Detailed Progress Bar */}
        <div className="relative z-10 mt-8 pt-6 border-t border-white/15">
          <div className="mb-2 flex justify-between text-xs font-bold text-white/90">
            <span>{totalPuntos} / {siguienteLiga.puntosMinimos} pts</span>
            <span>{progresoPorcentaje}% completado</span>
          </div>
          <div className="h-3.5 w-full overflow-hidden rounded-full bg-black/30 shadow-inner backdrop-blur-sm p-0.5 border border-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-300 shadow-[0_0_12px_rgba(251,191,36,0.8)]"
              initial={{ width: 0 }}
              animate={{ width: `${progresoPorcentaje}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
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
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
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
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Tag className="h-4 w-4" />
          Mis Recompensas ({recompensasDisponibles.length})
        </button>

        <button
          onClick={() => setSelectedTab('misiones')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            selectedTab === 'misiones'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
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
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="h-4 w-4" />
          Niveles y Ligas
        </button>

        <button
          onClick={() => setSelectedTab('historial')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            selectedTab === 'historial'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="h-4 w-4" />
          Historial
        </button>
      </div>

      {/* Tab 1: Catálogo de Canje (Tienda) */}
      {selectedTab === 'tienda' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Catálogo de Recompensas</h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Intercambia tus puntos por beneficios en consultas y funciones premium.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
              Saldo: <strong className="text-amber-600 dark:text-amber-400">{totalPuntos} pts</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {catalogo.map((item) => {
              const puedeCanjear = totalPuntos >= item.rcpCostoPuntos;
              return (
                <motion.div
                  key={item.rcpCodigo}
                  whileHover={{ y: -4 }}
                  className={`flex flex-col justify-between rounded-3xl border p-6 bg-white dark:bg-[#1E293B] shadow-xl shadow-slate-900/5 transition-all ${
                    puedeCanjear
                      ? 'border-slate-200 dark:border-slate-800'
                      : 'border-slate-200/60 dark:border-slate-800/60 opacity-80'
                  }`}
                >
                  <div>
                    {/* Badge tipo */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/60 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/40">
                        <Zap className="h-3 w-3" />
                        {item.rcpTipo.replace('_', ' ')}
                      </span>

                      <div className="flex items-center gap-1 text-amber-500 font-extrabold text-sm bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200/50">
                        <Star className="h-3.5 w-3.5 fill-amber-500" />
                        <span>{item.rcpCostoPuntos} pts</span>
                      </div>
                    </div>

                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                      {item.rcpTitulo}
                    </h3>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {item.descripcion || 'Beneficio canjeable inmediatamente para utilizar en la plataforma.'}
                    </p>

                    {item.rcpDiasDuracion && (
                      <p className="mt-3 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Duración: {item.rcpDiasDuracion} días
                      </p>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    {puedeCanjear ? (
                      <button
                        onClick={() => handleCanjear(item)}
                        disabled={canjearMutation.isPending}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white py-2.5 text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                      >
                        <Gift className="h-4 w-4" />
                        Canjear Recompensa
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 py-2.5 text-xs font-bold cursor-not-allowed border border-slate-200 dark:border-slate-700"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Puntos Insuficientes
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Mis Recompensas (Inventario) */}
      {selectedTab === 'inventario' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mis Recompensas Adquiridas</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Recompensas y cupones disponibles para usar en tus próximas consultas.
            </p>
          </div>

          {recompensasDisponibles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recompensasDisponibles.map((r) => (
                <div
                  key={r.praCodigo}
                  className="rounded-3xl border border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/20 dark:from-emerald-950/20 dark:via-[#1E293B] dark:to-emerald-950/10 p-6 shadow-lg relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider border border-emerald-300/50">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Disponible
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {new Date(r.praFechaAdquisicion).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                    {r.tituloRecompensa}
                  </h3>

                  {r.praFechaExpiracion && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Vence: {new Date(r.praFechaExpiracion).toLocaleDateString()}
                    </p>
                  )}

                  <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-500">Código de Cupon:</span>
                    <code className="bg-slate-900 text-amber-300 px-3 py-1 rounded-xl text-xs font-mono font-bold tracking-wider">
                      {r.codigoCanje || `CUPON-${r.praCodigo.slice(0, 6).toUpperCase()}`}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-white/40 dark:bg-[#1E293B]/40">
              <Gift className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Aún no tienes recompensas en inventario</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                Acumula puntos completando misiones o asistiendo a tus citas y canjéalos en la pestaña de tienda.
              </p>
              <button
                onClick={() => setSelectedTab('tienda')}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Ver Tienda de Canje
              </button>
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
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Misiones y Logros</h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Completa estas acciones para ganar puntos de inmediato.
              </p>
            </div>

            <div className="space-y-4">
              {tareas.map((tarea) => (
                <div
                  key={tarea.tareaId}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border ${
                    tarea.completada
                      ? 'border-emerald-200 dark:border-emerald-950 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B]'
                  } shadow-sm gap-4`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      tarea.completada ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {tarea.completada ? <CheckCircle2 className="h-6 w-6" /> : <Star className="h-6 w-6" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{tarea.titulo}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tarea.descripcion}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-extrabold text-xs bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-full border border-amber-200/50">
                      +{tarea.puntosRecompensa} pts
                    </span>

                    {tarea.completada ? (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Completada
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCompletarTarea(tarea.codigoAccion)}
                        disabled={completarTareaMutation.isPending}
                        className="rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-xs font-bold transition hover:bg-slate-800 disabled:opacity-50"
                      >
                        Completar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Referidos Column */}
          <div className="lg:col-span-5 space-y-6">
            {/* Mi Código de Referido */}
            <div className="rounded-3xl border border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/50 via-white to-blue-50/20 dark:from-blue-950/30 dark:via-[#1E293B] p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Invita a tus Amigos</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Gana 200 pts por cada amigo referido.</p>
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
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">¿Tienes un Código de Referido?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ingresa el código que te compartió tu familiar o amigo para recibir puntos de bienvenida.</p>
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
                  disabled={referidoMutation.isPending || !codigoReferidoInput.trim()}
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-xs font-bold transition-all shadow-md disabled:opacity-50"
                >
                  Vincular Código
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Sistema de Ligas y Niveles */}
      {selectedTab === 'ligas' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sistema de Ligas y Niveles</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Conoce los beneficios pasivos desbloqueados en cada nivel según tu total de puntos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {LIGAS_SISTEMA.map((liga) => {
              const esActual = liga.id === ligaActual.id;
              return (
                <div
                  key={liga.id}
                  className={`rounded-3xl p-6 border transition-all flex flex-col justify-between ${
                    esActual
                      ? 'border-amber-400 dark:border-amber-500 bg-gradient-to-b from-amber-500/10 via-white to-amber-500/5 dark:via-[#1E293B] shadow-xl ring-2 ring-amber-400/50'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-4xl">{liga.badgeIcon}</span>
                      {esActual && (
                        <span className="rounded-full bg-amber-400 text-slate-950 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                          Nivel Actual
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      Liga {liga.nombre}
                    </h3>
                    <p className="text-xs font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                      {liga.puntosMinimos} - {liga.puntosMaximos === 99999 ? '∞' : liga.puntosMaximos} pts
                    </p>

                    <ul className="mt-4 space-y-2">
                      {liga.beneficios.map((b, i) => (
                        <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 5: Historial de Movimientos */}
      {selectedTab === 'historial' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Estado de Cuenta de Puntos</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Registro histórico de abonos y canjes de puntos.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] overflow-hidden shadow-xl">
            {historial.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {historial.map((item, idx) => (
                  <div key={item.id || idx} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          item.tipo === 'ganancia'
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                        }`}
                      >
                        {item.tipo === 'ganancia' ? (
                          <ArrowUpRight className="h-5 w-5" />
                        ) : (
                          <ArrowDownRight className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{item.motivo}</p>
                        <p className="text-xs text-slate-400">{new Date(item.fecha).toLocaleString()}</p>
                      </div>
                    </div>

                    <span
                      className={`text-base font-black ${
                        item.tipo === 'ganancia'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {item.tipo === 'ganancia' ? `+${item.puntos}` : `-${item.puntos}`} pts
                    </span>
                  </div>
                ))}
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
