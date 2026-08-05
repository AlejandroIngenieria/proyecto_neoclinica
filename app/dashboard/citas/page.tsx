'use client';

import { Suspense, useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Filter, Loader2, MapPin, Monitor, Clock, FileText, CheckCircle2, XCircle, AlertCircle, RefreshCw, X, Calendar as CalendarIcon, Phone, FileSignature, Edit, Check, ArrowLeft, Link as LinkIcon, Edit2, ChevronRight, ChevronDown, User, Info, Upload } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Navbar } from '@/components/navbar';
import { NeoLoader } from '@/components/neo-loader';
import { useSession } from 'next-auth/react';
import { useCitasPaciente, useAllCitasPacientes, usePacientesSeleccion, useCancelarCita, useGruposMap, useUpdateCita } from '@/hooks/use-flujo-citas';
import { useDoctorByCode, useDoctors } from '@/hooks/use-doctors';
import { fetchGruposCita, createGrupo } from '@/services/flujo-citas';
import type { CitaListDto, CitaEstado, GrupoCitaDto } from '@/types/citas';
import { buildDoctorFullName } from '@/types/doctor';
import { AnimatedModal } from '@/components/animated-modal';
import { CitaCard } from '@/components/cita-card';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Plus, FolderPlus } from 'lucide-react';

const MySwal = withReactContent(Swal);

const NAV_LINKS = [
  { href: '/dashboard', label: 'Directorio' },
  { href: '/dashboard/citas', label: 'Citas' },
  { href: '/dashboard/medicamentos', label: 'Medicamentos' },
];

function safeFormatDate(dateStr: string | undefined, formatStr: string): string {
  if (!dateStr) return 'Fecha sin definir';
  try {
    return format(parseISO(dateStr), formatStr, { locale: es });
  } catch {
    return 'Fecha inválida';
  }
}

function safeSliceTime(timeStr: string | undefined): string {
  if (!timeStr) return '--:--';
  return timeStr.slice(0, 5);
}

function getStatusBadge(estado: CitaEstado) {
  switch (estado) {
    case 'confirmada': return <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-emerald-200">Confirmada</span>;
    case 'programada': return <span className="bg-sky-50 text-sky-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-sky-200">Programada</span>;
    case 'pospuesta': return <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-amber-200">Pospuesta</span>;
    case 'completada': return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-slate-300">Completada</span>;
    case 'cancelada':
    case 'rechazada':
    case 'no_asistio':
      return <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-rose-200">{estado.replace('_', ' ')}</span>;
    default:
      return <span className="bg-slate-50 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Desconocido</span>;
  }
}

function getModalityIcon(modalidad: string) {
  switch (modalidad) {
    case 'virtual': return <Monitor className="w-4 h-4" />;
    case 'domicilio': return <MapPin className="w-4 h-4" />;
    case 'presencial':
    default:
      return <CalendarIcon className="w-4 h-4" />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border ${type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}
    >
      {type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
      <span className="font-bold text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 p-1 hover:bg-black/5 rounded-full transition">
        <X className="w-4 h-4 opacity-50" />
      </button>
    </motion.div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
function CitasContent() {
  const router = useRouter();
  const { data: pacientes, isLoading: loadingPacientes } = usePacientesSeleccion();
  const pacientePrincipal = pacientes?.find(p => p.pacTitular) || pacientes?.[0];
  const codigosPacientes = useMemo(() => pacientes?.map(p => p.pacCodigo) || [], [pacientes]);
  const { data: citasData, isLoading: loadingCitas } = useAllCitasPacientes(codigosPacientes);
  
  // Sort all citas by date descending
  const citas = useMemo(() => {
    if (!citasData) return [];
    return [...citasData].sort((a, b) => new Date(b.ctaFecha).getTime() - new Date(a.ctaFecha).getTime());
  }, [citasData]);

  const [tabActual, setTabActual] = useState<'proximas' | 'historial'>('proximas');
  const [medicoSeleccionado, setMedicoSeleccionado] = useState<string>('');
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>('');
  const [linkGroupCita, setLinkGroupCita] = useState<CitaListDto | null>(null);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [pacientesExpandidos, setPacientesExpandidos] = useState<Record<string, boolean>>({});
  const [quickFilter, setQuickFilter] = useState<'todas' | '24hrs' | 'semana'>('todas');
  const [viewFilter, setViewFilter] = useState<'todas' | 'unicas' | 'series'>('todas');

  const togglePaciente = (pacienteId: string) => {
    setPacientesExpandidos(prev => ({ ...prev, [pacienteId]: !prev[pacienteId] }));
  };

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const { mutateAsync: cancelarCita, isPending: isCanceling } = useCancelarCita();

  const handleConfirmCancel = (cita: CitaListDto) => {
    MySwal.fire({
      title: '¿Cancelar Cita?',
      html: `Estás a punto de cancelar tu cita con <strong>${cita.medicoNombre}</strong> el ${safeFormatDate(cita.ctaFecha, "d 'de' MMMM")}.<br/><br/>Esta acción cambiará el estado de la cita a cancelada.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48', // rose-600
      cancelButtonColor: '#64748b', // slate-500
      confirmButtonText: 'Confirmar Cancelación',
      cancelButtonText: 'Mantener cita',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          await cancelarCita(cita.ctaCodigo);
          return true;
        } catch (err: any) {
          Swal.showValidationMessage('Hubo un problema al cancelar la cita.');
          return false;
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed) {
        setToast({ message: "Cita cancelada correctamente", type: 'success' });
      }
    });
  };

  // 1. Extraer médicos únicos
  const medicosUnicosIds = useMemo(() => {
    const ids = new Set<string>();
    citas.forEach(c => ids.add(c.ctaCoddoc));
    return Array.from(ids);
  }, [citas]);

  const { data: gruposMap } = useGruposMap(pacientePrincipal?.pacCodigo || null, medicosUnicosIds);

  const citasConTemas = useMemo(() => {
    const now = new Date();
    return citas.map(c => {
      let estado = c.ctaEstado;
      let isPast = false;
      try {
        const citaDateTime = new Date(`${c.ctaFecha.split('T')[0]}T${c.ctaHora || '00:00:00'}`);
        if (citaDateTime < now) {
          isPast = true;
          if (['programada', 'confirmada', 'pospuesta'].includes(estado)) {
            estado = 'completada' as CitaEstado;
          }
        }
      } catch (e) {}

      return {
        ...c,
        ctaEstado: estado,
        isPast,
        grupoTema: c.ctaGrupoId && gruposMap ? gruposMap.get(c.ctaGrupoId.toLowerCase()) || c.grupoTema : c.grupoTema
      };
    });
  }, [citas, gruposMap]);

  const medicosUnicos = useMemo(() => {
    const map = new Map<string, string>();
    citasConTemas.forEach(c => map.set(c.ctaCoddoc, c.medicoNombre));
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [citasConTemas]);

  // 2. Extraer grupos únicos
  const gruposUnicos = useMemo(() => {
    const map = new Map<string, string>();
    citasConTemas.forEach(c => {
      if (c.ctaGrupoId && c.grupoTema) {
        map.set(c.ctaGrupoId, c.grupoTema);
      }
    });
    return Array.from(map.entries()).map(([id, tema]) => ({ id, tema }));
  }, [citasConTemas]);

  // 3. Dividir en Próximas vs Historial, y agrupar por Paciente -> Series
  const citasMostradasPorPaciente = useMemo(() => {
    const now = new Date();
    const msIn24Hrs = 24 * 60 * 60 * 1000;
    const msInWeek = 7 * 24 * 60 * 60 * 1000;
    const proximosEstados = ['programada', 'confirmada', 'pospuesta'];

    // Resultado: map de codpac -> { nombre, standalone: [], series: { [grupoId]: citas } }
    type PacienteCitas = {
      nombre: string;
      standalone: CitaListDto[];
      series: Record<string, CitaListDto[]>;
    };
    const pacientesMap = new Map<string, PacienteCitas>();

    // Primero agrupar TODO por paciente y por serie (sin filtrar por fecha aún, salvo el medico/grupo seleccionado)
    citasConTemas.forEach(c => {
      if (medicoSeleccionado && c.ctaCoddoc !== medicoSeleccionado) return;
      if (grupoSeleccionado && c.ctaGrupoId !== grupoSeleccionado) return;

      if (!pacientesMap.has(c.ctaCodpac)) {
        pacientesMap.set(c.ctaCodpac, { nombre: c.pacienteNombre, standalone: [], series: {} });
      }
      
      const p = pacientesMap.get(c.ctaCodpac)!;
      if (c.ctaGrupoId) {
        if (!p.series[c.ctaGrupoId]) p.series[c.ctaGrupoId] = [];
        p.series[c.ctaGrupoId].push(c);
      } else {
        p.standalone.push(c);
      }
    });

    // Ahora filtramos según tabActual y viewFilter y quickFilter
    const resultadoMap = new Map<string, PacienteCitas>();

    pacientesMap.forEach((p, codpac) => {
      const filteredStandalone: CitaListDto[] = [];
      const filteredSeries: Record<string, CitaListDto[]> = {};

      // Filtrar Standalone
      if (viewFilter === 'todas' || viewFilter === 'unicas') {
        p.standalone.forEach(c => {
          const isUpcoming = proximosEstados.includes(c.ctaEstado);
          if (tabActual === 'proximas' && !isUpcoming) return;
          if (tabActual === 'historial' && isUpcoming) return;

          // Quick Filter (solo aplica en proximas)
          if (tabActual === 'proximas' && quickFilter !== 'todas') {
            const citaDate = new Date(`${c.ctaFecha.split('T')[0]}T${c.ctaHora}`);
            const diff = citaDate.getTime() - now.getTime();
            if (quickFilter === '24hrs' && (diff < 0 || diff > msIn24Hrs)) return;
            if (quickFilter === 'semana' && (diff < 0 || diff > msInWeek)) return;
          }

          filteredStandalone.push(c);
        });
      }

      // Filtrar Series
      if (viewFilter === 'todas' || viewFilter === 'series') {
        Object.entries(p.series).forEach(([grupoId, citasGrupo]) => {
          const hasUpcoming = citasGrupo.some(c => proximosEstados.includes(c.ctaEstado));
          
          if (tabActual === 'proximas' && !hasUpcoming) return;
          if (tabActual === 'historial' && hasUpcoming) return;

          // En proximas, el quick filter aplica si la PRÓXIMA cita de la serie cumple
          if (tabActual === 'proximas' && quickFilter !== 'todas') {
            const upcomingDates = citasGrupo
              .filter(c => proximosEstados.includes(c.ctaEstado))
              .map(c => new Date(`${c.ctaFecha.split('T')[0]}T${c.ctaHora}`).getTime() - now.getTime());
            
            const nextDiff = Math.min(...upcomingDates);
            if (quickFilter === '24hrs' && (nextDiff < 0 || nextDiff > msIn24Hrs)) return;
            if (quickFilter === 'semana' && (nextDiff < 0 || nextDiff > msInWeek)) return;
          }

          // Ordenar las citas del grupo cronológicamente
          filteredSeries[grupoId] = citasGrupo.sort((a, b) => {
            const dateA = new Date(`${a.ctaFecha.split('T')[0]}T${a.ctaHora}`).getTime();
            const dateB = new Date(`${b.ctaFecha.split('T')[0]}T${b.ctaHora}`).getTime();
            return dateA - dateB;
          });
        });
      }

      if (filteredStandalone.length > 0 || Object.keys(filteredSeries).length > 0) {
        // Sort standalone
        filteredStandalone.sort((a, b) => {
          const dateA = new Date(`${a.ctaFecha.split('T')[0]}T${a.ctaHora}`).getTime();
          const dateB = new Date(`${b.ctaFecha.split('T')[0]}T${b.ctaHora}`).getTime();
          return dateA - dateB;
        });

        resultadoMap.set(codpac, {
          nombre: p.nombre,
          standalone: filteredStandalone,
          series: filteredSeries
        });
      }
    });

    return Array.from(resultadoMap.entries());
  }, [citasConTemas, medicoSeleccionado, grupoSeleccionado, tabActual, quickFilter, viewFilter]);

  const proximosEstados = ['programada', 'confirmada', 'pospuesta'];
  const citasHistorial = citasConTemas.filter(c => !proximosEstados.includes(c.ctaEstado));

  const totalProximas = citasConTemas.filter(c => proximosEstados.includes(c.ctaEstado)).length;
  const totalHistorial = citasConTemas.filter(c => !proximosEstados.includes(c.ctaEstado)).length;

  return (
    <div className="min-h-screen text-slate-900 pb-20">

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <motion.main
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Mis Citas</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Consulta tus próximas citas, historial médico y seguimiento continuo.
                </p>
              </div>

              {/* Área superior derecha: Únicamente botones de acción alineados */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-2xl shadow-sm transition active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Nueva Cita
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold text-sm px-4 py-2.5 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/60 transition active:scale-95"
                >
                  <FolderPlus className="w-4 h-4" /> Crear Tema de Seguimiento
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto scrollbar-none whitespace-nowrap border-b border-slate-200 dark:border-slate-800 mb-6">
              <button
                onClick={() => setTabActual('proximas')}
                className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${tabActual === 'proximas' ? 'border-sky-600 dark:border-blue-500 text-sky-700 dark:text-blue-400 bg-sky-50/50 dark:bg-blue-900/20' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Próximas Citas ({totalProximas})
              </button>
              <button
                onClick={() => setTabActual('historial')}
                className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${tabActual === 'historial' ? 'border-sky-600 dark:border-blue-500 text-sky-700 dark:text-blue-400 bg-sky-50/50 dark:bg-blue-900/20' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Historial ({totalHistorial})
              </button>
            </div>

            {/* Barra Central de Filtros: Vista, Tiempo, Médicos y Temas de Seguimiento */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 bg-slate-50 dark:bg-[#1E293B] p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              
              <div className="flex flex-wrap items-center gap-4">
                {/* Filtro Vista */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vista:</span>
                  <button
                    onClick={() => setViewFilter('todas')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${viewFilter === 'todas' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setViewFilter('unicas')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${viewFilter === 'unicas' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    Citas Únicas
                  </button>
                  <button
                    onClick={() => setViewFilter('series')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${viewFilter === 'series' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    Tratamientos/Series
                  </button>
                </div>

                {/* Filtro Tiempo */}
                {tabActual === 'proximas' && (
                  <>
                    <div className="hidden sm:block w-px h-5 bg-slate-200 dark:bg-slate-700 self-center"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tiempo:</span>
                      <button
                        onClick={() => setQuickFilter('todas')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${quickFilter === 'todas' ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-xs' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                      >
                        Cualquier fecha
                      </button>
                      <button
                        onClick={() => setQuickFilter('24hrs')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${quickFilter === '24hrs' ? 'bg-sky-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                      >
                        Próximas 24h
                      </button>
                      <button
                        onClick={() => setQuickFilter('semana')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${quickFilter === 'semana' ? 'bg-sky-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                      >
                        Próxima semana
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Selectores de Filtro: Todos los Médicos & Temas de Seguimiento */}
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-0 border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 shadow-2xs">
                  <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <select
                    className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none pr-1 cursor-pointer"
                    value={medicoSeleccionado}
                    onChange={(e) => setMedicoSeleccionado(e.target.value)}
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">Todos los Médicos</option>
                    {medicosUnicos.map(m => (
                      <option key={m.id} value={m.id} className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">{m.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 shadow-2xs">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <select
                    className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none pr-1 cursor-pointer"
                    value={grupoSeleccionado}
                    onChange={(e) => setGrupoSeleccionado(e.target.value)}
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">Temas de Seguimiento</option>
                    {gruposUnicos.map(g => (
                      <option key={g.id} value={g.id} className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">{g.tema}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            {/* Grid de Citas */}
            {(loadingCitas || loadingPacientes) ? (
              <div className="py-20 flex flex-col items-center justify-center text-sky-600">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="font-bold animate-pulse">Cargando tus citas...</p>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {citasMostradasPorPaciente.length === 0 && (
                  <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                    <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-900">No se encontraron citas</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">No tienes citas en esta categoría con los filtros actuales.</p>
                  </div>
                )}

                {citasMostradasPorPaciente.map(([codpac, { nombre, standalone, series }]) => {
                  const totalCitas = standalone.length + Object.values(series).reduce((acc, curr) => acc + curr.length, 0);
                  const isCollapsed = pacientesExpandidos[codpac];

                  return (
                    <div key={codpac} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm transition-all">
                      <div
                        className="flex items-center justify-between cursor-pointer group"
                        onClick={() => togglePaciente(codpac)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 font-black text-xl border border-sky-100 group-hover:scale-110 transition-transform">
                            {nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">{nombre}</h3>
                            <p className="text-sm font-semibold text-slate-500">
                              {totalCitas} {totalCitas === 1 ? 'cita' : 'citas'}
                            </p>
                          </div>
                        </div>
                        <button className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-slate-100 group-hover:text-slate-600 transition-colors border border-slate-200">
                          <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
                        </button>
                      </div>

                      <AnimatePresence initial={false}>
                        {!isCollapsed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-visible"
                          >
                            <div className="flex flex-col gap-8 pt-6 mt-6 border-t border-slate-100">
                              
                              {/* Citas Únicas */}
                              {standalone.length > 0 && (
                                <div className="flex flex-col gap-3 relative before:absolute before:inset-y-0 before:left-3 sm:before:left-4 before:w-px before:bg-slate-200">
                                  {standalone.map((cita) => (
                                    <div key={`standalone-${cita.ctaCodigo}`} className="relative z-10 pl-8 sm:pl-10">
                                      <div className="absolute left-2.5 sm:left-[15px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-sky-400 border-[3px] border-white shadow-sm" />
                                      <CitaCard
                                        cita={cita}
                                        layout="row"
                                        isPast={(cita as any).isPast || !['programada', 'confirmada', 'pospuesta'].includes(cita.ctaEstado)}
                                        onModify={(c) => {
                                          router.push(`/dashboard/citas/${c.ctaCodigo}/editar`);
                                        }}
                                        onCancel={(c) => {
                                          handleConfirmCancel(c);
                                        }}
                                        onLinkGroup={(c) => setLinkGroupCita(c)}
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Contenedores de Serie */}
                              {Object.entries(series).map(([grupoId, citasGrupo]) => (
                                <SeriesContainer
                                  key={`grupo-${grupoId}`}
                                  grupoId={grupoId}
                                  citasGrupo={citasGrupo}
                                  router={router}
                                  handleConfirmCancel={handleConfirmCancel}
                                  onLinkGroup={(c) => setLinkGroupCita(c)}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
      </motion.main>

      <LinkGroupModal
        isOpen={!!linkGroupCita}
        onClose={() => setLinkGroupCita(null)}
        cita={linkGroupCita}
        onLinked={(msg) => setToast({ message: msg, type: 'success' })}
      />

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        pacientes={pacientes || []}
        citas={citasConTemas}
        onCreated={(msg) => setToast({ message: msg, type: 'success' })}
      />

    </div>
  );
}

function SeriesContainer({
  grupoId,
  citasGrupo,
  router,
  handleConfirmCancel,
  onLinkGroup
}: {
  grupoId: string;
  citasGrupo: CitaListDto[];
  router: any;
  handleConfirmCancel: (c: CitaListDto) => void;
  onLinkGroup: (c: CitaListDto) => void;
}) {
  const doctorCode = citasGrupo[0]?.ctaCoddoc;
  const { data: doctor } = useDoctorByCode(doctorCode || '');
  
  const nombreGrupo = citasGrupo[0]?.grupoTema || 'Tema de Seguimiento';
  const medicoNombre = citasGrupo[0]?.medicoNombre || '';
  const medicoEspecialidad = citasGrupo[0]?.medicoEspecialidad || '';
  
  const initials = medicoNombre.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('') || 'MD';

  const total = citasGrupo.length;
  const completed = citasGrupo.filter(c => ['completada'].includes(c.ctaEstado)).length;
  const percent = Math.round((completed / total) * 100) || 0;

  return (
    <div className="bg-sky-50/40 dark:bg-[#1E293B] rounded-3xl border border-sky-100 dark:border-slate-700 p-4 sm:p-6 shadow-sm overflow-hidden relative">
      <div 
        className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5 pb-5 border-b border-sky-200/60 dark:border-slate-700 cursor-pointer hover:opacity-90 transition group"
        onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/citas/grupos/${grupoId}`); }}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="relative group/avatar cursor-help">
            <div className="w-12 h-12 rounded-full bg-white dark:bg-[#0F172A] border border-sky-200 dark:border-slate-600 overflow-hidden relative flex items-center justify-center shrink-0 shadow-sm">
              {doctor?.exp_foto_perfil ? (
                <Image src={doctor.exp_foto_perfil} alt={medicoNombre} fill sizes="48px" className="object-cover" />
              ) : (
                <span className="text-sm font-black text-sky-600 dark:text-blue-400">{initials}</span>
              )}
            </div>
            
            {/* Tooltip del Médico */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-slate-800 text-white rounded-xl p-3 shadow-xl opacity-0 invisible group-hover/avatar:opacity-100 group-hover/avatar:visible transition-all z-20 pointer-events-none">
              <p className="text-xs font-bold mb-1">{medicoEspecialidad}</p>
              <p className="text-[10px] text-slate-300">+10 años de experiencia</p>
              <p className="text-[10px] text-slate-300">Certificación Internacional</p>
              <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-slate-800"></div>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">{nombreGrupo}</h4>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[250px]">
              <span className="text-sky-700 dark:text-blue-400 font-bold">Dr. {medicoNombre.split(' ').slice(0,2).join(' ')}</span>
            </p>
          </div>
        </div>
        
        <div className="w-full sm:w-1/3 shrink-0">
          <div className="flex justify-between items-end mb-1.5">
            <p className="text-xs font-bold text-sky-900 dark:text-blue-100">{completed} de {total} sesiones</p>
            <p className="text-[10px] uppercase font-black text-sky-600 dark:text-blue-400 tracking-widest">{percent}%</p>
          </div>
          <div className="w-full bg-sky-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div className="bg-sky-500 dark:bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>
        </div>
        
        <div className="hidden sm:block text-right shrink-0">
          <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest flex items-center justify-end gap-1 group-hover:text-sky-600 dark:group-hover:text-blue-400 transition-colors">
            Ver Serie <ChevronRight className="w-4 h-4" />
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 relative before:absolute before:inset-y-0 before:left-3 sm:before:left-4 before:w-px before:bg-sky-200 dark:before:bg-slate-600">
        {citasGrupo.map((cita) => (
          <div key={`grupo-cita-${cita.ctaCodigo}`} className="relative z-10 pl-8 sm:pl-10">
            <div className={`absolute left-2.5 sm:left-[15px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-[3px] border-white dark:border-[#1E293B] shadow-sm ${['programada', 'confirmada', 'pospuesta'].includes(cita.ctaEstado) ? 'bg-sky-400 dark:bg-blue-400' : 'bg-slate-300 dark:bg-slate-600'}`} />
            <CitaCard
              cita={cita}
              layout="row"
              isPast={(cita as any).isPast || !['programada', 'confirmada', 'pospuesta'].includes(cita.ctaEstado)}
              onModify={(c) => { router.push(`/dashboard/citas/${c.ctaCodigo}/editar`); }}
              onCancel={(c) => { handleConfirmCancel(c); }}
              onLinkGroup={onLinkGroup}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function LinkGroupModal({
  isOpen,
  onClose,
  cita,
  onLinked
}: {
  isOpen: boolean;
  onClose: () => void;
  cita: CitaListDto | null;
  onLinked: (msg: string) => void;
}) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken || '';
  const [loading, setLoading] = useState(false);
  const [grupos, setGrupos] = useState<GrupoCitaDto[]>([]);
  const [selectedGrupoId, setSelectedGrupoId] = useState<string>('');
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');

  const { mutateAsync: updateCita } = useUpdateCita();

  useEffect(() => {
    if (isOpen && cita && token) {
      setLoading(true);
      setSelectedGrupoId(cita.ctaGrupoId || '');
      setMode('select');
      setNewTitle('');
      setNewTopic('');
      fetchGruposCita(token, cita.ctaCodpac, cita.ctaCoddoc)
        .then(res => setGrupos(res || []))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, cita, token]);

  if (!isOpen || !cita) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      let finalGrupoId = selectedGrupoId;
      if (mode === 'create') {
        if (!newTitle.trim()) return;
        const created = await createGrupo(token, cita.ctaCodpac, cita.ctaCoddoc, newTopic.trim() || newTitle.trim(), newTitle.trim());
        finalGrupoId = created.grupoId;
      }

      await updateCita({
        citaId: cita.ctaCodigo,
        payload: {
          fecha: cita.ctaFecha.split('T')[0],
          hora: cita.ctaHora,
          modalidad: cita.ctaModalidad,
          precio: cita.ctaPrecio,
          motivo: cita.ctaMotivo,
          grupoId: finalGrupoId || null,
          consultorioId: cita.ctaConsultorioId,
          direccionDomicilio: cita.direccionDomicilio,
          referenciasDomicilio: cita.referenciasDomicilio,
          enlaceVideollamada: cita.enlaceVideollamada,
        }
      });
      onLinked('Cita vinculada al tema de seguimiento correctamente');
      onClose();
    } catch (e) {
      console.error(e);
      alert('Error al vincular el tema de seguimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">Tema de Seguimiento</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            Anclar la cita con <strong>{cita.medicoNombre}</strong> a un tema de seguimiento. (Solo se muestran temas de este médico).
          </p>

          <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode('select')}
              className={`flex-1 py-2 rounded-lg transition ${mode === 'select' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              Existente
            </button>
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`flex-1 py-2 rounded-lg transition ${mode === 'create' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              + Crear Nuevo
            </button>
          </div>

          {mode === 'select' ? (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase">Seleccionar Tema:</label>
              {loading ? (
                <div className="py-4 text-center text-xs text-slate-400">Cargando temas del médico...</div>
              ) : (
                <select
                  value={selectedGrupoId}
                  onChange={e => setSelectedGrupoId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">(Sin tema de seguimiento)</option>
                  {grupos.map(g => (
                    <option key={g.grupoId} value={g.grupoId}>{g.titulo}</option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Título del Tema:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ej. Rehabilitación Rodilla"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción / Objetivos:</label>
                <input
                  type="text"
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  placeholder="Ej. Plan de 6 sesiones de fisioterapia"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || (mode === 'create' && !newTitle.trim())}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar y Vincular'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function CreateGroupModal({
  isOpen,
  onClose,
  pacientes,
  citas,
  onCreated
}: {
  isOpen: boolean;
  onClose: () => void;
  pacientes: any[];
  citas: CitaListDto[];
  onCreated: (msg: string) => void;
}) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken || '';
  const { data: doctorsList = [] } = useDoctors();
  const [loading, setLoading] = useState(false);
  const [selectedPac, setSelectedPac] = useState('');
  const [selectedDoc, setSelectedDoc] = useState('');
  const [titulo, setTitulo] = useState('');
  const [tema, setTema] = useState('');

  useEffect(() => {
    if (pacientes.length && !selectedPac) setSelectedPac(pacientes[0].pacCodigo);
    if (citas.length && !selectedDoc) setSelectedDoc(citas[0].ctaCoddoc);
    else if (doctorsList.length && !selectedDoc) setSelectedDoc(doctorsList[0].exp_codigo);
  }, [pacientes, citas, doctorsList, selectedPac, selectedDoc]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!titulo.trim() || !selectedPac || !selectedDoc) return;
    setLoading(true);
    try {
      await createGrupo(token, selectedPac, selectedDoc, tema.trim() || titulo.trim(), titulo.trim());
      onCreated('Tema de seguimiento creado exitosamente');
      onClose();
    } catch (e) {
      console.error(e);
      alert('Error al crear tema de seguimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">Crear Tema de Seguimiento</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Paciente:</label>
              <select
                value={selectedPac}
                onChange={e => setSelectedPac(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {pacientes.map(p => (
                  <option key={p.pacCodigo} value={p.pacCodigo}>{p.nombreCompleto}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Médico Especialista:</label>
              <select
                value={selectedDoc}
                onChange={e => setSelectedDoc(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {doctorsList.map(d => (
                  <option key={d.exp_codigo} value={d.exp_codigo}>{buildDoctorFullName(d)} - {d.exp_profesion || 'General'}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Título del Tema / Tratamiento:</label>
              <input
                type="text"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ej. Control de Diabetes Tipo 2"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción / Objetivos:</label>
              <input
                type="text"
                value={tema}
                onChange={e => setTema(e.target.value)}
                placeholder="Ej. Chequeos trimestrales de glucosa"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading || !titulo.trim() || !selectedDoc}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Tema'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default function CitasPage() {
  return (
    <Suspense fallback={<NeoLoader />}>
      <CitasContent />
    </Suspense>
  );
}
