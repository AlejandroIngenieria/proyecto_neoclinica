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
import { useCitasPaciente, useAllCitasPacientes, usePacientesSeleccion, useCancelarCita, useGruposMap } from '@/hooks/use-flujo-citas';
import { useDoctorByCode } from '@/hooks/use-doctors';
import type { CitaListDto, CitaEstado } from '@/types/citas';
import { AnimatedModal } from '@/components/animated-modal';
import { CitaDetailDrawer } from '@/components/citas/cita-detail-drawer';
import { CitaCard } from '@/components/cita-card';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

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
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaListDto | null>(null);
  const [modalViewMode, setModalViewMode] = useState<'detalle'>('detalle');
  const [pacientesExpandidos, setPacientesExpandidos] = useState<Record<string, boolean>>({});
  const [quickFilter, setQuickFilter] = useState<'todas' | '24hrs' | 'semana'>('todas');
  const [viewFilter, setViewFilter] = useState<'todas' | 'unicas' | 'series'>('todas');

  const { data: selectedDoctor } = useDoctorByCode(citaSeleccionada?.ctaCoddoc || "");

  const togglePaciente = (pacienteId: string) => {
    setPacientesExpandidos(prev => ({ ...prev, [pacienteId]: !prev[pacienteId] }));
  };

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const { mutateAsync: cancelarCita, isPending: isCanceling } = useCancelarCita();

  const handleOpenModal = (cita: CitaListDto) => {
    setCitaSeleccionada(cita);
    setModalViewMode('detalle');
  };

  const handleConfirmCancel = (cita: CitaListDto) => {
    MySwal.fire({
      title: '¿Cancelar Cita?',
      html: `Estás a punto de cancelar tu cita con <strong>${cita.medicoNombre}</strong> el ${safeFormatDate(cita.ctaFecha, "d 'de' MMMM")}.<br/><br/>Esta acción removerá la cita de tu agenda permanentemente.`,
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
    if (!gruposMap) return citas;
    return citas.map(c => ({
      ...c,
      grupoTema: c.ctaGrupoId ? gruposMap.get(c.ctaGrupoId.toLowerCase()) || c.grupoTema : c.grupoTema
    }));
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

            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Mis Citas</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Consulta tus próximas citas, historial médico y seguimiento continuo.
                </p>
              </div>

              {/* Filtros */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
                  <Filter className="w-4 h-4 text-slate-400 ml-2" />
                  <select
                    className="bg-transparent text-sm font-semibold text-slate-700 outline-none pr-2 py-1"
                    value={medicoSeleccionado}
                    onChange={(e) => setMedicoSeleccionado(e.target.value)}
                  >
                    <option value="">Todos los Médicos</option>
                    {medicosUnicos.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
                  <RefreshCw className="w-4 h-4 text-slate-400 ml-2" />
                  <select
                    className="bg-transparent text-sm font-semibold text-slate-700 outline-none pr-2 py-1"
                    value={grupoSeleccionado}
                    onChange={(e) => setGrupoSeleccionado(e.target.value)}
                  >
                    <option value="">Temas de Seguimiento</option>
                    {gruposUnicos.map(g => (
                      <option key={g.id} value={g.id}>{g.tema}</option>
                    ))}
                  </select>
                </div>
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

            {/* Filtros de Vista y Tiempo */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6 bg-slate-50 dark:bg-[#1E293B] p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Vista:</span>
                <button
                  onClick={() => setViewFilter('todas')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${viewFilter === 'todas' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setViewFilter('unicas')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${viewFilter === 'unicas' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                >
                  Citas Únicas
                </button>
                <button
                  onClick={() => setViewFilter('series')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${viewFilter === 'series' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                >
                  Tratamientos/Series
                </button>
              </div>

              {tabActual === 'proximas' && (
                <>
                  <div className="hidden sm:block w-px bg-slate-200 self-stretch my-1"></div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Tiempo:</span>
                    <button
                      onClick={() => setQuickFilter('todas')}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${quickFilter === 'todas' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      Cualquier fecha
                    </button>
                    <button
                      onClick={() => setQuickFilter('24hrs')}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${quickFilter === '24hrs' ? 'bg-sky-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      Próximas 24h
                    </button>
                    <button
                      onClick={() => setQuickFilter('semana')}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${quickFilter === 'semana' ? 'bg-sky-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      Próxima semana
                    </button>
                  </div>
                </>
              )}
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
                            className="overflow-hidden"
                          >
                            <div className="flex flex-col gap-8 pt-6 mt-6 border-t border-slate-100">
                              
                              {/* Citas Únicas */}
                              {standalone.length > 0 && (
                                <div className="flex flex-col gap-3 relative before:absolute before:inset-y-0 before:left-3 sm:before:left-4 before:w-px before:bg-slate-200">
                                  {standalone.map((cita) => (
                                    <div key={`standalone-${cita.ctaCodigo}`} onClick={() => handleOpenModal(cita)} className="cursor-pointer relative z-10 pl-8 sm:pl-10">
                                      <div className="absolute left-2.5 sm:left-[15px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-sky-400 border-[3px] border-white shadow-sm" />
                                      <CitaCard
                                        cita={cita}
                                        layout="row"
                                        isPast={!['programada', 'confirmada', 'pospuesta'].includes(cita.ctaEstado)}
                                        onModify={(c) => {
                                          router.push(`/dashboard/citas/${c.ctaCodigo}/editar`);
                                        }}
                                        onCancel={(c) => {
                                          handleConfirmCancel(c);
                                        }}
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
                                  handleOpenModal={handleOpenModal}
                                  setCitaSeleccionada={setCitaSeleccionada}
                                  handleConfirmCancel={handleConfirmCancel}
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

      {/* Modal de Detalle (Drawer) */}
      <CitaDetailDrawer
        isOpen={!!citaSeleccionada}
        onClose={() => setCitaSeleccionada(null)}
        cita={citaSeleccionada}
        onEdit={(cita) => {
          router.push(`/dashboard/citas/${cita.ctaCodigo}/editar`);
        }}
        onCancel={(cita) => {
          router.push(`/dashboard/citas/${cita.ctaCodigo}/editar`);
        }}
        doctorFoto={selectedDoctor?.exp_foto_perfil || ""}
      />

    </div>
  );
}

function SeriesContainer({
  grupoId,
  citasGrupo,
  router,
  handleOpenModal,
  setCitaSeleccionada,
  handleConfirmCancel
}: {
  grupoId: string;
  citasGrupo: CitaListDto[];
  router: any;
  handleOpenModal: (c: CitaListDto) => void;
  setCitaSeleccionada: (c: CitaListDto) => void;
  handleConfirmCancel: (c: CitaListDto) => void;
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
            
            {/* Tooltip del Médico (Simulado) */}
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
          <div key={`grupo-cita-${cita.ctaCodigo}`} onClick={() => handleOpenModal(cita)} className="cursor-pointer relative z-10 pl-8 sm:pl-10">
            <div className={`absolute left-2.5 sm:left-[15px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-[3px] border-white dark:border-[#1E293B] shadow-sm ${['programada', 'confirmada', 'pospuesta'].includes(cita.ctaEstado) ? 'bg-sky-400 dark:bg-blue-400' : 'bg-slate-300 dark:bg-slate-600'}`} />
            <CitaCard
              cita={cita}
              layout="row"
              isPast={!['programada', 'confirmada', 'pospuesta'].includes(cita.ctaEstado)}
              onModify={(c) => { setCitaSeleccionada(c); }}
              onCancel={(c) => { handleConfirmCancel(c); }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CitasPage() {
  return (
    <Suspense fallback={<NeoLoader />}>
      <CitasContent />
    </Suspense>
  );
}
