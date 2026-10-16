'use client';

import { Suspense, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Star,
  Gift,
  Clock,
  Award,
  ArrowDownRight,
  ArrowUpRight,
  Tag,
  CheckCircle2,
  Zap,
  Check,
  UserCheck,
  Calendar,
  MessageSquare,
  Users,
  AlertTriangle,
  Info,
  Copy,
  Share2,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { extractErrorMessage } from '@/lib/request-handler';

import { NeoLoader } from '@/components/neo-loader';
import { usePacienteTitular } from '@/hooks/use-pacientes';
import {
  useCatalogoRecompensas,
  useRecompensasDisponibles,
  useTotalPuntos,
  useCanjearRecompensa,
  useHistorialPuntos,
} from '@/hooks/use-recompensas';
import { useLealtadEstado, useLealtadTareas } from '@/hooks/use-lealtad';
import type { LealtadTarea } from '@/services/lealtad';
import type { Recompensa } from '@/types/recompensas';

const MAX_PUNTOS_MENSUALES = 5;

function PuntosContent() {
  const { data: session } = useSession();
  const { titular, isLoading: isLoadingTitular } = usePacienteTitular();

  const pacCodigo = titular?.pac_codigo;

  // ─── Queries ───
  const { data: puntosData, isLoading: isLoadingPuntos } = useTotalPuntos(pacCodigo);
  const { data: lealtadEstado, isLoading: isLoadingEstado } = useLealtadEstado();
  const { data: catalogo = [], isLoading: isLoadingCatalogo } = useCatalogoRecompensas();
  const { data: misRecompensas = [], isLoading: isLoadingDisponibles } = useRecompensasDisponibles(pacCodigo);
  const { data: tareas = [], isLoading: isLoadingTareas } = useLealtadTareas();
  const { data: historial = [], isLoading: isLoadingHistorial } = useHistorialPuntos(pacCodigo);

  // ─── Mutations ───
  const canjearMutation = useCanjearRecompensa(pacCodigo);

  // ─── Local State ───
  const [historialFiltro, setHistorialFiltro] = useState<'todos' | 'ganados' | 'canjeados'>('todos');
  const [recompensaACanjear, setRecompensaACanjear] = useState<Recompensa | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedReferral, setCopiedReferral] = useState(false);

  const referralCode =
    titular?.pac_codigo_referencia ||
    (titular?.pac_codigo ? `NC-${titular.pac_codigo.replace(/-/g, '').slice(0, 8).toUpperCase()}` : null);

  const handleCopyReferral = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedReferral(true);
    toast.success('Código de referido copiado al portapapeles');
    setTimeout(() => setCopiedReferral(false), 2500);
  };

  const handleShareReferral = async (code: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://proyecto-neoclinica.vercel.app';
    const text = `¡Agenda tu consulta médica en NeoClínica! Utiliza mi código de referido ${code} al confirmar tu cita médica: ${origin}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Código de Referido NeoClínica',
          text,
          url: origin,
        });
        return;
      } catch {
        // Fallback a copiar mensaje completo
      }
    }
    navigator.clipboard.writeText(text);
    setCopiedReferral(true);
    toast.success('Mensaje con código y enlace copiado al portapapeles');
    setTimeout(() => setCopiedReferral(false), 2500);
  };

  // Puntos calculados
  const totalPuntos = lealtadEstado?.puntosActuales ?? puntosData?.totalPuntos ?? 0;
  const puntosMes = Math.min(totalPuntos, MAX_PUNTOS_MENSUALES);
  const progresoPorcentaje = Math.min(100, Math.round((puntosMes / MAX_PUNTOS_MENSUALES) * 100));

  // Tareas / Misiones unificadas
  const uniqueTareas = useMemo<LealtadTarea[]>(() => {
    const seen = new Set<string>();
    const result: LealtadTarea[] = [];

    for (const tarea of tareas || []) {
      const key = (tarea.codigoAccion || tarea.titulo || String(tarea.tareaId || '')).trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(tarea);
      }
    }

    return result;
  }, [tareas]);

  // Formas de ganar puntos (presentación puramente informativa sin botón de participar)
  const formasDeGanar = useMemo(() => {
    const defaultMisiones = [
      {
        id: 'cita_medica',
        titulo: 'Asistir a una Consulta Médica',
        descripcion: 'Agenda y asiste a tu cita médica programada con cualquier especialista en SaludYa.',
        puntos: 1,
        icono: 'cita',
        frecuencia: 'Por cada cita completada',
      },
      {
        id: 'resena_medico',
        titulo: 'Calificar y Dejar Reseña',
        descripcion: 'Comparte tu experiencia médica y evalúa al profesional de la salud tras finalizar tu atención.',
        puntos: 1,
        icono: 'resena',
        frecuencia: 'Por cada opinión publicada',
      },
      {
        id: 'completar_perfil',
        titulo: 'Completar tu Expediente y Perfil',
        descripcion: 'Llena tus datos personales, antecedentes de salud e información de contacto de emergencia.',
        puntos: 1,
        icono: 'perfil',
        frecuencia: 'Una sola vez',
      },
      {
        id: 'invitar_amigo',
        titulo: 'Recomendar a un Amigo o Familiar',
        descripcion: 'Comparte tu código de invitación y gana puntos cuando tu recomendado complete su primera cita.',
        puntos: 1,
        icono: 'referido',
        frecuencia: 'Por cada recomendado',
      },
    ];

    if (uniqueTareas.length > 0) {
      return uniqueTareas.map((t) => ({
        id: String(t.tareaId || t.codigoAccion),
        titulo: t.titulo,
        descripcion: t.descripcion || t.indicaciones || 'Realiza esta actividad para obtener puntos.',
        puntos: t.puntosRecompensa || 1,
        icono: t.codigoAccion?.toLowerCase().includes('perfil')
          ? 'perfil'
          : t.codigoAccion?.toLowerCase().includes('resena')
          ? 'resena'
          : t.codigoAccion?.toLowerCase().includes('cita')
          ? 'cita'
          : 'estrella',
        frecuencia: t.repetible ? 'Recurrente' : 'Una sola vez',
      }));
    }

    return defaultMisiones;
  }, [uniqueTareas]);

  // Contexto detallado de transacciones del historial de puntos
  const getDetalleMovimiento = (item: any) => {
    const rawMotivo = item.trpMotivo || item.TrpMotivo || item.motivo || item.hisMotivo || item.hisDescripcion || item.descripcion || item.concepto || '';
    const motivoLower = rawMotivo.toLowerCase();

    // 1. Referidos / Invitaciones (DEBE EVALUARSE PRIMERO porque 'Referencia a paciente y cita concluida' incluye la palabra 'cita')
    if (
      motivoLower.includes('refer') ||
      motivoLower.includes('invit') ||
      motivoLower.includes('recomen')
    ) {
      return {
        titulo: 'Bono por Paciente Referido',
        tipoEtiqueta: 'Recomendación Exitosa',
        categoria: 'Programa de Referidos',
        detalle: 'Un familiar o amigo utilizó tu código de referido, se registró en NeoClínica y concluyó exitosamente su primera atención médica.',
        comoSeObtuvo: 'Validación automática al registrarse la conclusión de la primera cita del paciente que utilizó tu código de invitación personal.',
        icono: 'referido',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        dotColor: 'bg-emerald-500',
      };
    }

    // 2. Primera cita concluida (Bono especial de bienvenida)
    if (
      motivoLower.includes('primera cita') ||
      motivoLower.includes('primer consulta') ||
      motivoLower.includes('primera_cita')
    ) {
      return {
        titulo: 'Bono de Bienvenida: Primera Consulta',
        tipoEtiqueta: 'Bienvenida al Programa',
        categoria: 'Primera Consulta Médica',
        detalle: '¡Completaste tu primera consulta médica en NeoClínica! Recibiste puntos de bienvenida para inaugurar tu saldo de beneficios.',
        comoSeObtuvo: 'Acreditación automática tras concluir satisfactoriamente tu primera cita programada con un médico especialista.',
        icono: 'bienvenida',
        badgeBg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        dotColor: 'bg-amber-500',
      };
    }

    // 3. Reseña y calificación de atención médica
    if (
      motivoLower.includes('reseña') ||
      motivoLower.includes('resena') ||
      motivoLower.includes('opin') ||
      motivoLower.includes('calific')
    ) {
      return {
        titulo: 'Valoración y Reseña Publicada',
        tipoEtiqueta: 'Opinión de Atención',
        categoria: 'Calificación de Médico',
        detalle: 'Publicaste una valoración y reseña constructiva sobre la calidad de atención brindada por tu especialista.',
        comoSeObtuvo: 'Envío verificado de calificación con estrellas y opinión en el perfil del médico especialista tras tu cita.',
        icono: 'resena',
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        dotColor: 'bg-indigo-500',
      };
    }

    // 4. Expediente o perfil médico completado
    if (
      motivoLower.includes('perfil') ||
      motivoLower.includes('expediente')
    ) {
      return {
        titulo: 'Expediente Médico Completo',
        tipoEtiqueta: 'Ficha Clínica Digital',
        categoria: 'Perfil de Paciente',
        detalle: 'Completaste con éxito tus datos personales, antecedentes de salud básicos e información de contacto para emergencias.',
        comoSeObtuvo: 'Guardado y validación satisfactoria de tus datos clínicos y de contacto en tu perfil de paciente.',
        icono: 'perfil',
        badgeBg: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        dotColor: 'bg-teal-500',
      };
    }

    // 5. Canje de recompensa o cupones
    if (
      motivoLower.includes('canje') ||
      motivoLower.includes('cupon') ||
      motivoLower.includes('cupón')
    ) {
      const nombreRecompensa = rawMotivo.includes(':')
        ? rawMotivo.split(':')[1]?.trim() || rawMotivo
        : 'Cupón de Beneficio Canjeado';
      return {
        titulo: nombreRecompensa,
        tipoEtiqueta: 'Beneficio Canjeado',
        categoria: 'Tienda de Recompensas',
        detalle: 'Canjeaste puntos acumulados por un cupón activo con código alfanumérico para aplicar en consulta o farmacia.',
        comoSeObtuvo: 'Intercambio voluntario de puntos en el catálogo de beneficios NeoClínica.',
        icono: 'canje',
        badgeBg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        dotColor: 'bg-rose-500',
      };
    }

    // 6. Citas médicas concluidas regulares
    if (
      motivoLower.includes('cita') ||
      motivoLower.includes('consulta')
    ) {
      return {
        titulo: 'Consulta Médica Realizada',
        tipoEtiqueta: 'Atención Especializada',
        categoria: 'Consulta Asistida',
        detalle: 'Asististe y concluiste tu cita médica programada con tu especialista tratante.',
        comoSeObtuvo: 'El especialista médico confirmó la realización y conclusión de tu atención clínica.',
        icono: 'cita',
        badgeBg: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        dotColor: 'bg-blue-500',
      };
    }

    // 7. General / Fallback
    return {
      titulo: rawMotivo || 'Actividad de Fidelidad',
      tipoEtiqueta: 'Punto Registrado',
      categoria: 'Programa NeoClínica',
      detalle: rawMotivo ? `Movimiento registrado: ${rawMotivo}.` : 'Puntos procesados en tu cuenta.',
      comoSeObtuvo: 'Actividad validada y registrada por el sistema de lealtad de NeoClínica.',
      icono: 'estrella',
      badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      dotColor: 'bg-slate-400',
    };
  };

  // Recompensas disponibles en inventario
  const recompensasDisponibles = useMemo(() => {
    return misRecompensas.filter((r) => {
      if (!r) return false;
      const estado = r.praEstado || (r as any).estado || (r as any).pra_estado;
      if (!estado) return true;
      const lower = String(estado).toLowerCase();
      return lower === 'disponible' || lower === 'activa' || lower === 'activo' || lower === 'a';
    });
  }, [misRecompensas]);

  // Historial filtrado
  const historialFiltrado = useMemo(() => {
    return (historial || []).filter((item) => {
      const ptsRaw = item.trpPuntos ?? item.TrpPuntos ?? item.puntos ?? item.hisPuntos ?? item.hspPuntos ?? item.montoPuntos ?? item.cantidadPuntos ?? 0;
      const pts = Math.abs(ptsRaw);
      const rawTipo = String(item.trpTipo ?? item.TrpTipo ?? item.tipo ?? item.hisTipo ?? item.hspTipo ?? item.tipoMovimiento ?? '').toLowerCase();
      const esGanancia = rawTipo === 'ganancia' || rawTipo === 'g' || rawTipo === 'abono' || rawTipo === 'ingreso' || rawTipo === 'entrada' || (pts > 0 && rawTipo !== 'canje' && rawTipo !== 'c' && rawTipo !== 'salida' && rawTipo !== 'egreso');

      if (historialFiltro === 'ganados') return esGanancia;
      if (historialFiltro === 'canjeados') return !esGanancia;
      return true;
    });
  }, [historial, historialFiltro]);

  // Copiar código de cupón
  const handleCopyCode = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    setCopiedCode(codigo);
    toast.success('¡Código copiado al portapapeles!');
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const handleCanjear = (recompensa: Recompensa) => {
    if (totalPuntos < recompensa.rcpCostoPuntos) {
      toast.error('Puntos Insuficientes', {
        description: `Necesitas ${recompensa.rcpCostoPuntos} puntos para canjear "${recompensa.rcpTitulo}". Tienes ${totalPuntos} pts.`,
      });
      return;
    }
    setRecompensaACanjear(recompensa);
  };

  const confirmCanjeAction = async () => {
    if (!recompensaACanjear) return;
    try {
      await canjearMutation.mutateAsync({
        rcpCodigo: recompensaACanjear.rcpCodigo,
        nombreRecompensa: recompensaACanjear.rcpTitulo,
        costoPuntos: recompensaACanjear.rcpCostoPuntos,
      });
      toast.success('¡Recompensa Adquirida con Éxito!', {
        description: `Has canjeado "${recompensaACanjear.rcpTitulo}". Revisa la sección "Mis Cupones y Recompensas Canjeadas".`,
      });
      setRecompensaACanjear(null);
    } catch (e: any) {
      toast.error('Error al canjear recompensa', {
        description: extractErrorMessage(e),
      });
    }
  };

  if (isLoadingTitular || isLoadingPuntos || isLoadingCatalogo) {
    return <NeoLoader />;
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8 lg:px-10 max-w-7xl mx-auto space-y-10 bg-[#F8F9FF] dark:bg-[#0B1120] text-slate-900 dark:text-white">
      
      {/* ─── Encabezado Principal ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#006194] dark:text-sky-300 bg-[#eff4ff] dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200/50 dark:border-slate-700/60 inline-flex items-center gap-1.5 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />
            Club de Beneficios
          </span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Puntos y Recompensas
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl font-medium">
            Acumula puntos por tus citas y misiones de salud cada mes y canjéalos por consultas gratuitas y descuentos exclusivos.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-[#006194] dark:hover:text-sky-300 transition"
        >
          ← Volver al Dashboard
        </Link>
      </div>

      {/* ─── Hero Loyalty Card (Apple Minimalist Clinical - Blanco Capa 2) ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 sm:p-8 md:p-10 shadow-[0_2px_12px_rgba(11,28,48,0.03)] border border-slate-200/50 dark:border-slate-800">
        
        {/* Glow de fondo decorativo etéreo */}
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#eff4ff]/60 dark:bg-sky-950/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-[#eff4ff]/40 dark:bg-slate-800/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Columna Izquierda: Saldo Grande de Puntos */}
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-2 bg-[#eff4ff] dark:bg-slate-800 px-3.5 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/60 text-xs font-bold text-[#006194] dark:text-sky-300">
              <Star className="h-3.5 w-3.5 fill-[#0284c7] text-[#0284c7]" />
              <span>SaludYa Rewards</span>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Tus Puntos Disponibles
              </p>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-2xs">
                  {totalPuntos}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-[#006194] dark:text-sky-400">
                  pts
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm font-medium">
              {totalPuntos >= 5
                ? '¡Has alcanzado 5 puntos este mes! Aprovéchalos canjeando recompensas antes de fin de mes.'
                : `Tienes ${totalPuntos} de 5 puntos posibles este mes. ¡Canjéalos por tus beneficios favoritos!`}
            </p>
          </div>

          {/* Columna Derecha: Barra de Puntos del Mes (Bandeja Capa 1) */}
          <div className="lg:col-span-7 bg-[#eff4ff]/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/60 rounded-3xl p-5 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" /> Meta Mensual de Puntos
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Puedes ganar hasta <strong className="text-slate-900 dark:text-white font-bold">{MAX_PUNTOS_MENSUALES} puntos</strong> cada mes
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-2xl font-black text-[#006194] dark:text-sky-400">
                  {puntosMes} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">/ {MAX_PUNTOS_MENSUALES} pts</span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {progresoPorcentaje}% alcanzado este mes
                </p>
              </div>
            </div>

            {/* Barra Visual de Puntos con Marcadores (1 a 5) */}
            <div className="space-y-3 pt-1">
              <div className="relative h-3.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-700/80 overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-600/50">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#0284c7] via-sky-400 to-emerald-400 shadow-2xs"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(progresoPorcentaje, 2)}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              </div>

              {/* Marcadores de 1 a 5 puntos */}
              <div className="grid grid-cols-5 gap-1 text-center">
                {[1, 2, 3, 4, 5].map((punto) => {
                  const alcanzado = totalPuntos >= punto;
                  return (
                    <div key={punto} className="flex flex-col items-center gap-1">
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                          alcanzado
                            ? 'bg-[#006194] text-white ring-2 ring-[#006194]/20 shadow-xs'
                            : 'bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-400 border border-slate-200/80 dark:border-slate-600'
                        }`}
                      >
                        {alcanzado ? <Check className="w-2.5 h-2.5" /> : punto}
                      </div>
                      <span className={`text-[10px] font-semibold ${alcanzado ? 'text-[#006194] dark:text-sky-300 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                        {punto === 5 ? '5 pts (Máx)' : `${punto} pt`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ─── Tarjeta de Código de Referido ─── */}
      {referralCode && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 sm:p-8 shadow-[0_2px_12px_rgba(11,28,48,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-full border border-blue-200/60 dark:border-blue-900/40">
              <Gift className="w-3.5 h-3.5" />
              <span>Programa de Referidos NeoClínica</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Invita a tus amigos y gana puntos
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Comparte tu código personal con familiares y amigos.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              * Los puntos se acreditan automáticamente cuando el médico especialista inicie y concluya la primera cita agendada con tu código.
            </p>
          </div>

          <div className="bg-[#eff4ff]/60 dark:bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row items-center gap-4 shrink-0 shadow-2xs">
            <div className="text-center sm:text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Tu Código de Referido
              </span>
              <span className="text-2xl font-black tracking-widest font-mono text-slate-900 dark:text-white">
                {referralCode}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyReferral(referralCode)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95"
              >
                {copiedReferral ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedReferral ? 'Copiado' : 'Copiar'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareReferral(referralCode)}
                className="px-4 py-2.5 rounded-xl bg-[#006194] hover:bg-[#00517c] text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN 1: CATÁLOGO DE RECOMPENSAS PARA CANJEAR
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Gift className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              Recompensas Disponibles
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Canjea tus puntos por descuentos y consultas médicas gratuitas.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full w-fit">
            {catalogo.length} {catalogo.length === 1 ? 'recompensa' : 'recompensas'} en catálogo
          </span>
        </div>

        {catalogo.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalogo.map((item, idx) => {
              const costo = item.rcpCostoPuntos ?? (item as any).costoPuntos ?? (item as any).rcp_costo_puntos ?? 0;
              const titulo = item.rcpTitulo || (item as any).titulo || (item as any).rcp_titulo || (item as any).nombre || 'Recompensa';
              const desc = item.descripcion || (item as any).rcpDescripcion || (item as any).rcp_descripcion;
              const canAfford = totalPuntos >= costo;
              const puntosFaltantes = Math.max(0, costo - totalPuntos);
              const keyId = item.rcpCodigo || (item as any).id || (item as any).rcp_codigo || `cat-${idx}`;
              const progresoCanje = Math.min(100, Math.round((totalPuntos / (costo || 1)) * 100));

              return (
                <div
                  key={keyId}
                  className={`flex flex-col justify-between rounded-3xl p-6 transition-all border ${
                    canAfford
                      ? 'bg-white dark:bg-[#1E293B] border-blue-200 dark:border-blue-900/60 shadow-md hover:border-blue-400'
                      : 'bg-white/80 dark:bg-[#1E293B]/80 border-slate-200 dark:border-slate-800 shadow-sm opacity-95'
                  }`}
                >
                  <div>
                    {/* Cabecera de la tarjeta: Icono + Costo */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                        canAfford
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        <Gift className="h-6 w-6" />
                      </span>

                      <span className={`inline-flex items-center gap-1 font-black text-xs px-3 py-1.5 rounded-full border ${
                        canAfford
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}>
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        {costo} {costo === 1 ? 'punto' : 'puntos'}
                      </span>
                    </div>

                    {/* Título y descripción */}
                    <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                      {titulo}
                    </h3>
                    {desc && (
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                        {desc}
                      </p>
                    )}
                  </div>

                  {/* Estado de puntos y botón de canjear */}
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      {canAfford ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Puntos suficientes ({totalPuntos}/{costo})
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Info className="h-3.5 w-3.5" /> Te faltan {puntosFaltantes} pts ({totalPuntos}/{costo})
                        </span>
                      )}
                      <span className="text-slate-400 text-[11px]">{progresoCanje}%</span>
                    </div>

                    {/* Barra individual hacia esta recompensa */}
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                      <div
                        className={`h-full rounded-full ${
                          canAfford ? 'bg-emerald-500' : 'bg-amber-400'
                        }`}
                        style={{ width: `${progresoCanje}%` }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCanjear(item)}
                      disabled={!canAfford || canjearMutation.isPending}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        canAfford
                          ? 'bg-[#006194] hover:bg-[#00517c] text-white shadow-xs active:scale-95'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? (
                        <>
                          <Gift className="h-4 w-4" /> Canjear por {costo} pts
                        </>
                      ) : (
                        `Necesitas ${costo} pts para canjear`
                      )}
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
              Próximamente habrá nuevas opciones disponibles en el catálogo de beneficios.
            </p>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN 2: MIS CUPONES Y RECOMPENSAS CANJEADAS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Tag className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              Mis Cupones y Recompensas Canjeadas
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Cupones activos y disponibles en tu cuenta para aplicar en el pago de tus citas médicas o servicios.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full w-fit">
            {recompensasDisponibles.length} {recompensasDisponibles.length === 1 ? 'cupón activo' : 'cupones activos'}
          </span>
        </div>

        {recompensasDisponibles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recompensasDisponibles.map((r, idx) => {
              const titulo = r.tituloRecompensa || (r as any).titulo || (r as any).rcpTitulo || (r as any).rcp_titulo || (r as any).nombre || 'Recompensa';
              const codigo = r.codigoCanje || (r as any).codigo || (r as any).codigo_canje || (r as any).praCodigoCanje || (r.praCodigo ? `CUPON-${r.praCodigo.slice(0, 6).toUpperCase()}` : `CUPON-${idx + 1}`);
              const fechaExp = r.praFechaExpiracion || (r as any).fechaExpiracion || (r as any).pra_fecha_expiracion;
              const keyId = r.praCodigo || (r as any).id || (r as any).pra_codigo || `rec-${idx}`;
              const isCopied = copiedCode === codigo;

              return (
                <div
                  key={keyId}
                  className="flex flex-col justify-between rounded-3xl border-2 border-emerald-500/30 bg-white dark:bg-[#1E293B] p-6 shadow-sm hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                        <Tag className="h-5 w-5" />
                      </span>
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                        Cupón Activo
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                      {titulo}
                    </h3>

                    {fechaExp && (
                      <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Vence: {new Date(fechaExp).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Código de Cupón con botón copiar */}
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                      Código para aplicar en tu cita:
                    </span>
                    
                    <div className="flex items-center justify-between gap-2 bg-slate-900 text-amber-300 p-2.5 rounded-2xl border border-slate-800">
                      <code className="text-sm font-mono font-bold tracking-wider px-2">
                        {codigo}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(codigo)}
                        title="Copiar código"
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 transition active:scale-90 cursor-pointer"
                      >
                        {isCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8 sm:p-10 text-center bg-white dark:bg-[#1E293B]">
            <Tag className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Aún no tienes cupones canjeados</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
              Cuando canjees recompensas en el catálogo superior, tus códigos de cupón aparecerán aquí listos para ser usados.
            </p>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN 3: CÓMO CONSEGUIR PUNTOS (INFORMATIVO, SIN BOTÓN PARTICIPAR)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Zap className="h-7 w-7 text-amber-500" />
              Formas de Conseguir Puntos
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Completa cualquiera de estas acciones de salud para acumular hasta 5 puntos este mes.
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 w-fit">
            <Clock className="h-4 w-4 text-amber-600" />
            <span>Máximo 5 puntos por mes</span>
          </div>
        </div>

        {/* Grid de Formas de Ganar Puntos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {formasDeGanar.map((mision) => {
            const renderIcon = () => {
              if (mision.icono === 'perfil') return <UserCheck className="h-6 w-6" />;
              if (mision.icono === 'cita') return <Calendar className="h-6 w-6" />;
              if (mision.icono === 'resena') return <MessageSquare className="h-6 w-6" />;
              if (mision.icono === 'referido') return <Users className="h-6 w-6" />;
              return <Star className="h-6 w-6" />;
            };

            return (
              <div
                key={mision.id}
                className="flex flex-col justify-between rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-800/40">
                      {renderIcon()}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                        {mision.frecuencia}
                      </span>
                      <span className="text-xs font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1 rounded-xl">
                        +{mision.puntos} {mision.puntos === 1 ? 'punto' : 'puntos'}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {mision.titulo}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {mision.descripcion}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Acreditación automática
                  </span>
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Award className="h-3 w-3" /> SaludYa Rewards
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Card Explicativa de Reglas del Programa */}
        <div className="rounded-3xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-6 space-y-3">
          <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Reglas del Programa de Puntos SaludYa
          </h4>
          <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
            <li>
              <strong>Límite Mensual:</strong> Puedes ganar hasta un máximo de 5 puntos durante cada mes calendario.
            </li>
            <li>
              <strong>Puntos no acumulables:</strong> Los puntos obtenidos deben canjearse en el mes en curso. Si no se usan, <strong>no se acumulan para el mes posterior y se reinician</strong>.
            </li>
            <li>
              <strong>Cupones generados:</strong> Una vez canjeada una recompensa, el cupón generado conserva su propia fecha de expiración para su uso en consulta.
            </li>
          </ul>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN 4: HISTORIAL DE PUNTOS OBTENIDOS Y CANJEADOS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-6 pt-2 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <CheckCircle2 className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              Historial de Puntos
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Movimientos registrados de puntos obtenidos por actividades y puntos canjeados por beneficios.
            </p>
          </div>

          {/* Filtro Rápido: Todos, Ganados, Canjeados */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
            <button
              type="button"
              onClick={() => setHistorialFiltro('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                historialFiltro === 'todos'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos ({historial.length})
            </button>
            <button
              type="button"
              onClick={() => setHistorialFiltro('ganados')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                historialFiltro === 'ganados'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Obtenidos (+)
            </button>
            <button
              type="button"
              onClick={() => setHistorialFiltro('canjeados')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                historialFiltro === 'canjeados'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Canjeados (-)
            </button>
          </div>
        </div>

        {/* Lista del Historial */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Transacciones ({historialFiltrado.length})
            </span>
            <span className="text-xs text-slate-400">
              Orden cronológico
            </span>
          </div>

          {historialFiltrado.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[550px] overflow-y-auto">
              {historialFiltrado.map((item, idx) => {
                const ptsRaw = item.trpPuntos ?? item.TrpPuntos ?? item.puntos ?? item.hisPuntos ?? item.hspPuntos ?? item.montoPuntos ?? item.cantidadPuntos ?? 0;
                const pts = Math.abs(ptsRaw);
                const rawTipo = String(item.trpTipo ?? item.TrpTipo ?? item.tipo ?? item.hisTipo ?? item.hspTipo ?? item.tipoMovimiento ?? '').toLowerCase();
                const esGanancia = rawTipo === 'ganancia' || rawTipo === 'g' || rawTipo === 'abono' || rawTipo === 'ingreso' || rawTipo === 'entrada' || (pts > 0 && rawTipo !== 'canje' && rawTipo !== 'c' && rawTipo !== 'salida' && rawTipo !== 'egreso');
                const motivoStr = item.trpMotivo || item.TrpMotivo || item.motivo || item.hisMotivo || item.hisDescripcion || item.descripcion || item.concepto || (esGanancia ? 'Abono de puntos' : 'Canje de recompensa');
                const rawFecha = item.fechaGrabacion || item.FechaGrabacion || item.fecha || item.hisFecha || item.hspFecha || item.fechaMovimiento;
                const fechaObj = rawFecha ? new Date(rawFecha) : null;
                const fechaValida = fechaObj && !isNaN(fechaObj.getTime());
                const fechaFormateada = fechaValida
                  ? fechaObj.toLocaleDateString('es-ES', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Fecha no especificada';
                const horaFormateada = fechaValida
                  ? fechaObj.toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : '';

                const detalleInfo = getDetalleMovimiento(item);

                const renderTransactionIcon = () => {
                  if (detalleInfo.icono === 'referido') return <Users className="h-5 w-5" />;
                  if (detalleInfo.icono === 'bienvenida') return <Gift className="h-5 w-5" />;
                  if (detalleInfo.icono === 'resena') return <MessageSquare className="h-5 w-5" />;
                  if (detalleInfo.icono === 'perfil') return <UserCheck className="h-5 w-5" />;
                  if (detalleInfo.icono === 'canje') return <Gift className="h-5 w-5" />;
                  if (detalleInfo.icono === 'cita') return <Calendar className="h-5 w-5" />;
                  return esGanancia ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />;
                };

                return (
                  <div
                    key={item.trpCodigo || item.TrpCodigo || item.id || item.hisCodigo || idx}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition"
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div
                        className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 border ${
                          esGanancia
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/50'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/50'
                        }`}
                      >
                        {renderTransactionIcon()}
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border inline-flex items-center gap-1.5 ${detalleInfo.badgeBg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${detalleInfo.dotColor}`} />
                            {detalleInfo.tipoEtiqueta}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {detalleInfo.categoria}
                          </span>
                        </div>

                        <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                          {detalleInfo.titulo}
                        </h4>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {detalleInfo.detalle}
                        </p>

                        {/* Bloque explicativo detallado de cómo se obtuvieron los puntos */}
                        <div className="mt-2 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 p-2.5 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
                          <Info className="h-3.5 w-3.5 text-blue-600 dark:text-sky-400 shrink-0 mt-0.5" />
                          <div className="min-w-0 leading-relaxed">
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {esGanancia ? '¿Cómo se obtuvieron? ' : 'Detalle de canje: '}
                            </span>
                            <span>{detalleInfo.comoSeObtuvo}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium pt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{fechaFormateada} {horaFormateada ? `• ${horaFormateada}` : ''}</span>
                        </div>
                      </div>
                    </div>

                    {/* Derecha: Puntos */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-1 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                      <span
                        className={`text-lg sm:text-xl font-black px-3.5 py-1 rounded-xl flex items-center gap-1 ${
                          esGanancia
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {esGanancia ? `+${pts}` : `-${pts}`} <span className="text-xs font-bold uppercase">pts</span>
                      </span>

                      <span className="text-[10px] font-bold text-slate-400">
                        {esGanancia ? 'Acreditado a tu cuenta' : 'Descontado para canje'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                No hay movimientos en este filtro
              </h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                Los puntos que obtengas o canjees aparecerán aquí detallados cronológicamente.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ─── Modal de Confirmación de Canje ─── */}
      <ConfirmModal
        isOpen={!!recompensaACanjear}
        onClose={() => setRecompensaACanjear(null)}
        onConfirm={confirmCanjeAction}
        variant="success"
        title="¿Confirmar Canje de Recompensa?"
        description={
          recompensaACanjear ? (
            <div className="space-y-2">
              <p>
                Se descontarán <strong>{recompensaACanjear.rcpCostoPuntos} puntos</strong> de tu saldo para obtener:
              </p>
              <p className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white">
                "{recompensaACanjear.rcpTitulo}"
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Al canjear, se creará un cupón en tu inventario listo para usarse.
              </p>
            </div>
          ) : undefined
        }
        confirmText="Sí, Canjear Ahora"
        cancelText="Cancelar"
        isLoading={canjearMutation.isPending}
      />

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
