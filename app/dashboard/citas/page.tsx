'use client';

import { Suspense, useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Filter, Loader2, MapPin, Monitor, Clock, FileText, CheckCircle2, XCircle, AlertCircle, RefreshCw, X, Calendar as CalendarIcon, Phone, FileSignature, Edit, Check, ArrowLeft, Link as LinkIcon, Edit2, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Navbar } from '@/components/navbar';
import { NeoLoader } from '@/components/neo-loader';
import { useCitasPaciente, usePacientesSeleccion, useCancelarCita, useGruposMap } from '@/hooks/use-flujo-citas';
import type { CitaListDto, CitaEstado } from '@/types/citas';
import { AnimatedModal } from '@/components/animated-modal';
import { UpdateWizard } from '@/components/citas-wizard-mini/UpdateWizard';
import { CitaCard } from '@/components/cita-card';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const NAV_LINKS = [
  { href: '/dashboard', label: 'Directorio' },
  { href: '/dashboard/especialidades', label: 'Especialidades' },
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
function Toast({ message, type, onClose }: { message: string, type: 'success'|'error', onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border ${
        type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
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
  const { data: citasData, isLoading: loadingCitas } = useCitasPaciente(pacientePrincipal?.pacCodigo || null);
  const citas = citasData || [];

  const [tabActual, setTabActual] = useState<'proximas' | 'historial' | 'grupos'>('proximas');
  const [medicoSeleccionado, setMedicoSeleccionado] = useState<string>('');
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>('');
  
  const [viewMode, setViewMode] = useState<'list' | 'update'>('list');
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaListDto | null>(null);
  const [modalViewMode, setModalViewMode] = useState<'detalle'>('detalle');
  const [gruposExpandidos, setGruposExpandidos] = useState<Record<string, boolean>>({});

  const toggleGrupo = (grupoId: string) => {
    setGruposExpandidos(prev => ({ ...prev, [grupoId]: !prev[grupoId] }));
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

  // 3. Aplicar Filtros
  const citasFiltradas = useMemo(() => {
    return citasConTemas.filter(c => {
      if (medicoSeleccionado && c.ctaCoddoc !== medicoSeleccionado) return false;
      if (grupoSeleccionado && c.ctaGrupoId !== grupoSeleccionado) return false;
      return true;
    });
  }, [citas, medicoSeleccionado, grupoSeleccionado]);

  // 4. Dividir en Próximas, Historial y Grupos
  const proximosEstados = ['programada', 'confirmada', 'pospuesta'];
  const citasProximas = useMemo(() => {
    const proximasStandalone = citasFiltradas.filter(c => proximosEstados.includes(c.ctaEstado) && !c.ctaGrupoId);
    const proximasGrupo = citasFiltradas.filter(c => proximosEstados.includes(c.ctaEstado) && c.ctaGrupoId);
    
    const gruposMap = new Map<string, typeof citasFiltradas>();
    proximasGrupo.forEach(cita => {
      if (!gruposMap.has(cita.ctaGrupoId!)) gruposMap.set(cita.ctaGrupoId!, []);
      gruposMap.get(cita.ctaGrupoId!)!.push(cita);
    });

    const proximasPrincipalesGrupos: typeof citasFiltradas = [];
    gruposMap.forEach((grupoCitas) => {
      const sorted = [...grupoCitas].sort((a,b) => {
        const dateA = new Date(`${a.ctaFecha.split('T')[0]}T${a.ctaHora}`);
        const dateB = new Date(`${b.ctaFecha.split('T')[0]}T${b.ctaHora}`);
        return dateA.getTime() - dateB.getTime();
      });
      proximasPrincipalesGrupos.push(sorted[0]);
    });

    return [...proximasStandalone, ...proximasPrincipalesGrupos].sort((a,b) => {
        const dateA = new Date(`${a.ctaFecha.split('T')[0]}T${a.ctaHora}`);
        const dateB = new Date(`${b.ctaFecha.split('T')[0]}T${b.ctaHora}`);
        return dateA.getTime() - dateB.getTime();
    });
  }, [citasFiltradas]);

  const citasHistorial = citasFiltradas.filter(c => !proximosEstados.includes(c.ctaEstado) && !c.ctaGrupoId);
  const citasGrupos = citasFiltradas.filter(c => c.ctaGrupoId);
  const cantidadGrupos = new Set(citasGrupos.map(c => c.ctaGrupoId)).size;

  let citasMostrar: typeof citasFiltradas = [];
  if (tabActual === 'proximas') citasMostrar = citasProximas;
  else if (tabActual === 'historial') citasMostrar = citasHistorial;
  else if (tabActual === 'grupos') citasMostrar = citasGrupos;

  // 5. Agrupar para la vista
  const citasAgrupadas = useMemo(() => {
    const grupos: Record<string, typeof citasMostrar> = {};
    const sinGrupo: typeof citasMostrar = [];

    citasMostrar.forEach(cita => {
      if (cita.ctaGrupoId && tabActual === 'grupos') {
        if (!grupos[cita.ctaGrupoId]) {
          grupos[cita.ctaGrupoId] = [];
        }
        grupos[cita.ctaGrupoId].push(cita);
      } else {
        sinGrupo.push(cita);
      }
    });

    return { grupos, sinGrupo };
  }, [citasMostrar, tabActual]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <Navbar subtitle="Gestión de Citas" navLinks={NAV_LINKS} />

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <motion.main
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* VISTA INLINE: ACTUALIZACIÓN */}
        {viewMode === 'update' && citaSeleccionada && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <div className="mb-6 pb-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Modificando Cita</h2>
                <p className="text-sm font-semibold text-sky-600 mt-1">
                  Dr(a). {citaSeleccionada.medicoNombre} - {safeFormatDate(citaSeleccionada.ctaFecha, "d 'de' MMMM")} a las {citaSeleccionada.ctaHora.slice(0,5)}
                </p>
              </div>
              <button 
                onClick={() => {
                  setViewMode('list');
                  setCitaSeleccionada(null);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver a todas las citas
              </button>
            </div>
            
            <UpdateWizard 
              cita={citaSeleccionada}
              onCancel={() => {
                setViewMode('list');
                setCitaSeleccionada(null);
              }}
              onSuccess={(msg) => {
                setToast({ message: msg, type: 'success' });
                setViewMode('list');
                setCitaSeleccionada(null);
              }}
              onError={(msg) => {
                setToast({ message: msg, type: 'error' });
              }}
            />
          </div>
        )}

        {/* VISTA INLINE: LISTADO */}
        {viewMode === 'list' && (
          <>
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
            <div className="flex flex-wrap border-b border-slate-200 mb-6">
              <button
                onClick={() => setTabActual('proximas')}
                className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${tabActual === 'proximas' ? 'border-sky-600 text-sky-700 bg-sky-50/50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Próximas Citas ({citasProximas.length})
              </button>
              <button
                onClick={() => setTabActual('grupos')}
                className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${tabActual === 'grupos' ? 'border-sky-600 text-sky-700 bg-sky-50/50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Grupos de Citas ({cantidadGrupos})
              </button>
              <button
                onClick={() => setTabActual('historial')}
                className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${tabActual === 'historial' ? 'border-sky-600 text-sky-700 bg-sky-50/50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Historial ({citasHistorial.length})
              </button>
            </div>

            {/* Grid de Citas */}
            {(loadingCitas || loadingPacientes) ? (
              <div className="py-20 flex flex-col items-center justify-center text-sky-600">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="font-bold animate-pulse">Cargando tus citas...</p>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {tabActual === 'grupos' && (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(citasAgrupadas.grupos).map(([grupoId, citasGrupo]) => {
                      const nombreGrupo = citasGrupo[0]?.grupoTema || 'Tema de Seguimiento';
                      
                      const citasFuturas = citasGrupo.filter(c => ['programada', 'confirmada', 'pospuesta'].includes(c.ctaEstado)).sort((a,b) => {
                        const dateA = new Date(`${a.ctaFecha.split('T')[0]}T${a.ctaHora}`);
                        const dateB = new Date(`${b.ctaFecha.split('T')[0]}T${b.ctaHora}`);
                        return dateA.getTime() - dateB.getTime(); // Ascendente
                      });

                      const proxCita = citasFuturas.length > 0 ? citasFuturas[0] : null;
                      
                      return (
                        <div key={grupoId} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-200 transition-all flex flex-col justify-between group">
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <LinkIcon className="w-6 h-6" />
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); /* Placeholder for Edit Tema */ }}
                                className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition"
                                title="Editar Tema"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2 line-clamp-2">{nombreGrupo}</h3>
                            <p className="text-sm font-semibold text-slate-500 mb-6 flex items-center gap-2">
                              <CalendarDays className="w-4 h-4" />
                              {citasGrupo.length} {citasGrupo.length === 1 ? 'Cita Enlazada' : 'Citas Enlazadas'}
                            </p>
                            
                            {proxCita && (
                              <div className="bg-amber-50/80 rounded-2xl p-4 mb-6 border border-amber-100/50">
                                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                  Próxima Cita
                                </p>
                                <p className="text-sm font-semibold text-slate-800">
                                  {safeFormatDate(proxCita.ctaFecha, "d 'de' MMMM")} - {proxCita.ctaHora.slice(0,5)}
                                </p>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-1">Dr(a). {proxCita.medicoNombre}</p>
                              </div>
                            )}
                          </div>
                          
                          <button 
                            onClick={() => router.push(`/dashboard/citas/grupos/${grupoId}`)}
                            className="w-full flex items-center justify-center px-4 py-3 bg-slate-50 text-slate-700 font-bold text-sm rounded-xl hover:bg-sky-600 hover:text-white transition-colors border border-slate-100 shadow-sm"
                          >
                            Ver Tratamiento Completo
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {citasAgrupadas.sinGrupo.length > 0 && (
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2 mt-2">
                    {citasAgrupadas.sinGrupo.map((cita) => (
                      <div key={cita.ctaCodigo} onClick={() => handleOpenModal(cita)} className="cursor-pointer">
                        <CitaCard 
                          cita={cita} 
                          isPast={tabActual === 'historial'}
                          onModify={(c) => {
                            setCitaSeleccionada(c);
                            setViewMode('update');
                          }}
                          onCancel={(c) => {
                            handleConfirmCancel(c);
                          }}
                          bottomActions={
                            cita.ctaGrupoId ? (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/dashboard/citas/grupos/${cita.ctaGrupoId}`);
                                }}
                                className="px-5 py-2.5 bg-sky-600 text-white text-sm font-bold rounded-xl hover:bg-sky-700 transition flex items-center justify-center gap-2 w-full shadow-sm"
                              >
                                <LinkIcon className="w-4 h-4" />
                                Revisar Seguimiento
                              </button>
                            ) : (tabActual === 'historial' ? (
                              <>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/directorio/medicos/${cita.ctaCoddoc}/cita`); }}
                                  className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition flex items-center gap-2 shadow-sm"
                                >
                                  Nueva Cita
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); /* Placeholder action */ }}
                                  className="px-5 py-2.5 bg-sky-600 text-white text-sm font-bold rounded-xl hover:bg-sky-700 transition flex items-center gap-2 shadow-sm"
                                >
                                  <FileText className="w-4 h-4" />
                                  Ver Consulta
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCitaSeleccionada(cita);
                                    setViewMode('update');
                                  }}
                                  className="px-4 py-1.5 border border-sky-600 text-sky-600 text-xs font-bold rounded-xl hover:bg-sky-50 transition flex items-center justify-center gap-2 w-full"
                                >
                                  <Edit className="w-3 h-3" />
                                  Modificar
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConfirmCancel(cita);
                                  }}
                                  className="px-4 py-1.5 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl hover:bg-rose-100 transition flex items-center justify-center gap-2 border border-rose-100 w-full"
                                >
                                  <X className="w-3 h-3" />
                                  Cancelar
                                </button>
                              </>
                            ))
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}

                {citasMostrar.length === 0 && (
                  <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                    <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-900">No se encontraron citas</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">No tienes citas en esta categoría con los filtros actuales.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}



      </motion.main>

      {/* Modal de Detalle */}
      <AnimatedModal
        isOpen={!!citaSeleccionada && viewMode === 'list'}
        onClose={() => setCitaSeleccionada(null)}
        title="Detalle de Cita"
        subtitle={citaSeleccionada ? `${safeFormatDate(citaSeleccionada.ctaFecha, "EEEE d 'de' MMMM")} a las ${safeSliceTime(citaSeleccionada.ctaHora)}` : ''}
        label={citaSeleccionada?.ctaGrupoId ? `Seguimiento: ${citaSeleccionada.grupoTema || 'Continuidad'}` : undefined}
      >
        {citaSeleccionada && (
          <AnimatePresence mode="wait">



            {modalViewMode === 'detalle' && (
              <motion.div 
                key="detalle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid gap-8 md:grid-cols-2"
              >
                {/* Columna Izquierda: Info y Stepper */}
                <div className="space-y-8">
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <h4 className="font-black text-slate-900 text-lg">{citaSeleccionada.medicoNombre}</h4>
                    <p className="text-slate-500 font-medium mb-4">{citaSeleccionada.medicoEspecialidad}</p>
                    
                    <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Estado Actual</span>
                      {getStatusBadge(citaSeleccionada.ctaEstado)}
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-4">
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Modalidad</span>
                      <span className="text-sm font-bold text-slate-800 capitalize flex items-center gap-1.5">
                        {getModalityIcon(citaSeleccionada.ctaModalidad)} {citaSeleccionada.ctaModalidad}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 text-lg mb-4">Línea de Tiempo</h4>
                    <div className="relative pl-4 space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-slate-200">
                      {citaSeleccionada.etapas?.map((etapa, idx) => (
                        <div key={idx} className="relative flex items-start gap-4">
                          <div className="absolute -left-[21px] mt-0.5 w-6 h-6 rounded-full bg-sky-100 border-4 border-white flex items-center justify-center text-sky-600 shadow-sm">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm w-full">
                            <p className="text-xs font-bold text-slate-400 mb-1">{safeFormatDate(etapa.fecha, "dd MMM, HH:mm")}</p>
                            <h5 className="text-sm font-bold text-slate-900">{etapa.estado}</h5>
                            <p className="text-xs text-slate-600 mt-1">{etapa.descripcion}</p>
                          </div>
                        </div>
                      ))}
                      {(!citaSeleccionada.etapas || citaSeleccionada.etapas.length === 0) && (
                        <p className="text-sm text-slate-500 italic pl-2">No hay etapas registradas.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Documentos y Acciones */}
                <div className="space-y-8">
                  <div>
                    <h4 className="font-black text-slate-900 text-lg mb-4 flex items-center gap-2">
                      <FileSignature className="w-5 h-5 text-sky-600" />
                      Documentos Clínicos
                    </h4>
                    {citaSeleccionada.documentos && citaSeleccionada.documentos.length > 0 ? (
                      <div className="space-y-3">
                        {citaSeleccionada.documentos.map((doc, idx) => (
                          <a 
                            key={idx}
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition-colors group"
                          >
                            <FileText className="w-5 h-5 text-slate-400 group-hover:text-sky-600 mr-3" />
                            <span className="flex-1 text-sm font-semibold text-slate-700 truncate">{doc.nombre}</span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-100">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No hay documentos adjuntos a esta cita.</p>
                      </div>
                    )}
                  </div>

                  {/* Acciones para citas próximas */}
                  {proximosEstados.includes(citaSeleccionada.ctaEstado) && (
                    <div className="bg-sky-50 rounded-2xl p-5 border border-sky-100">
                      <h4 className="font-black text-slate-900 mb-3 text-sm uppercase tracking-widest">Acciones</h4>
                      <div className="space-y-3">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setCitaSeleccionada(null); // Close modal
                            setTimeout(() => {
                              setCitaSeleccionada(citaSeleccionada);
                              setViewMode('update');
                            }, 300);
                          }}
                          className="w-full flex justify-center items-center gap-2 bg-white border border-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition shadow-sm"
                        >
                          <Edit className="w-4 h-4" /> Modificar o Reprogramar
                        </button>
                        <button 
                          onClick={() => handleConfirmCancel(citaSeleccionada)}
                          className="w-full flex justify-center items-center gap-2 bg-white border border-rose-200 text-rose-600 font-bold py-3 px-4 rounded-xl hover:bg-rose-50 hover:border-rose-300 transition shadow-sm"
                        >
                          <XCircle className="w-4 h-4" /> Cancelar Cita
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-4 flex gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Las cancelaciones deben realizarse con al menos 24 horas de anticipación.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </AnimatedModal>

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
