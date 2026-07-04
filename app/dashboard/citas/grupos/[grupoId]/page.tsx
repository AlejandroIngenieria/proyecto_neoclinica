'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCitasPaciente, usePacientesSeleccion } from '@/hooks/use-flujo-citas';
import { Navbar } from '@/components/navbar';
import { CalendarDays, MapPin, Clock, ArrowLeft, MoreVertical, Monitor, History, ArrowRight, Loader2, Download, Eye, HelpCircle, Bell, User, Calendar as CalendarIcon, Video } from 'lucide-react';
import { format, parseISO, differenceInDays, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CitaListDto, CitaEstado } from '@/types/citas';

function safeFormatDate(dateStr: string | undefined, formatStr: string): string {
  if (!dateStr) return 'Fecha sin definir';
  try {
    return format(parseISO(dateStr), formatStr, { locale: es });
  } catch {
    return 'Fecha inválida';
  }
}

function getCountdown(dateStr: string | undefined, timeStr: string | undefined): string {
  if (!dateStr || !timeStr) return '--';
  try {
    const targetDate = new Date(`${dateStr.split('T')[0]}T${timeStr}`);
    const now = new Date();
    if (targetDate < now) return 'Cita pasada';
    const days = differenceInDays(targetDate, now);
    const hours = differenceInHours(targetDate, now) % 24;
    if (days > 0) return `En ${days} días, ${hours} horas`;
    if (hours > 0) return `En ${hours} horas`;
    return 'Próximamente';
  } catch {
    return '--';
  }
}

export default function GrupoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const grupoId = params.grupoId as string;

  const { data: pacientes, isLoading: loadingPacientes } = usePacientesSeleccion();
  const pacientePrincipal = pacientes?.find(p => p.pacTitular) || pacientes?.[0];
  const { data: citasData, isLoading: loadingCitas } = useCitasPaciente(pacientePrincipal?.pacCodigo || null);

  if (loadingPacientes || loadingCitas) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-sky-600 animate-spin mb-4" />
          <p className="font-bold text-slate-600 animate-pulse">Cargando tratamiento...</p>
        </main>
      </div>
    );
  }

  const citas = citasData || [];
  const citasGrupo = citas.filter(c => c.ctaGrupoId === grupoId);

  if (citasGrupo.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          <button onClick={() => router.push('/dashboard/citas')} className="flex items-center text-sky-700 hover:underline font-bold mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Grupos
          </button>
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-200">
            <p className="text-xl font-bold text-slate-700">No se encontraron citas para este grupo de tratamiento.</p>
          </div>
        </main>
      </div>
    );
  }

  const nombreGrupo = citasGrupo[0].grupoTema || 'Tema de Seguimiento';

  const citasFuturas = citasGrupo.filter(c => ['programada', 'confirmada', 'pospuesta'].includes(c.ctaEstado)).sort((a,b) => {
    const dateA = new Date(`${a.ctaFecha.split('T')[0]}T${a.ctaHora}`);
    const dateB = new Date(`${b.ctaFecha.split('T')[0]}T${b.ctaHora}`);
    return dateA.getTime() - dateB.getTime();
  });

  const citasPasadas = citasGrupo.filter(c => !['programada', 'confirmada', 'pospuesta'].includes(c.ctaEstado)).sort((a,b) => {
    const dateA = new Date(`${a.ctaFecha.split('T')[0]}T${a.ctaHora}`);
    const dateB = new Date(`${b.ctaFecha.split('T')[0]}T${b.ctaHora}`);
    return dateB.getTime() - dateA.getTime();
  });

  const citaPrincipal = citasFuturas.length > 0 ? citasFuturas[0] : null;
  const restoFuturas = citasFuturas.length > 0 ? citasFuturas.slice(1) : [];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navbar />
      
      <main className="pt-8 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation / Back Button */}
        <button 
          onClick={() => router.push('/dashboard/citas')}
          className="flex items-center text-slate-500 hover:text-sky-700 font-bold mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Mis Grupos
        </button>

        {/* Header Title Section */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-sky-900 mb-2">{nombreGrupo}</h1>
          <p className="text-base text-slate-500">Gestione sus citas y mantenga su tratamiento bajo control.</p>
        </div>

        {/* Hero Section: Next Appointment */}
        {citaPrincipal && (
          <section className="mb-10">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row items-stretch">
              <div className="md:w-5/12 relative">
                <div className="w-full h-full min-h-[280px] bg-slate-800 flex items-center justify-center">
                  <User className="w-24 h-24 text-slate-600" />
                </div>
                <div className="absolute top-4 left-4">
                  <span className="bg-amber-500 text-white font-bold text-sm px-4 py-1.5 rounded-full shadow-md flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Próxima Cita
                  </span>
                </div>
              </div>

              <div className="md:w-7/12 p-8 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-sky-900 mb-1">Dr(a). {citaPrincipal.medicoNombre}</h2>
                      <p className="text-base text-slate-500">{citaPrincipal.medicoEspecialidad}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-amber-600">{safeFormatDate(citaPrincipal.ctaFecha, "MMM dd").toUpperCase()}</p>
                      <p className="text-sm font-bold text-slate-500">{citaPrincipal.ctaHora.slice(0,5)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      {citaPrincipal.ctaModalidad === 'virtual' ? <Monitor className="text-sky-600 w-5 h-5" /> : <MapPin className="text-sky-600 w-5 h-5" />}
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                          {citaPrincipal.ctaModalidad === 'virtual' ? 'Enlace' : 'Ubicación'}
                        </p>
                        <p className="text-sm font-bold text-slate-800 line-clamp-1">
                          {citaPrincipal.ctaModalidad === 'virtual' ? 'Teleconsulta' : (citaPrincipal.clinicaNombre || 'Sede Principal')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <Clock className="text-sky-600 w-5 h-5" />
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Cuenta Regresiva</p>
                        <p className="text-sm font-bold text-slate-800">{getCountdown(citaPrincipal.ctaFecha, citaPrincipal.ctaHora)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <button className="bg-amber-500 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-amber-600 hover:shadow-lg transition-all active:scale-95">
                    Prepararse para la cita
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button className="text-sky-700 bg-sky-50 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-sky-100 transition-all active:scale-95">
                    Ver detalles
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Two Column Layout for Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Side: Citas Futuras (7 columns) */}
          <section className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <CalendarIcon className="text-sky-600 w-6 h-6" />
                Otras Citas Futuras
              </h3>
              {restoFuturas.length > 0 && (
                <button className="text-sky-600 font-bold text-sm hover:underline">Ver todas</button>
              )}
            </div>

            {restoFuturas.length > 0 ? (
              <>
                {restoFuturas.map((cita) => (
                  <div key={cita.ctaCodigo} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-sky-200 transition-all group">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-5">
                        <div className="flex flex-col items-center justify-center w-16 h-16 bg-sky-50 rounded-xl border border-sky-100 shrink-0">
                          <span className="text-sky-700 font-black text-xl">{safeFormatDate(cita.ctaFecha, 'dd')}</span>
                          <span className="text-sky-600 font-bold text-xs uppercase">{safeFormatDate(cita.ctaFecha, 'MMM')}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 group-hover:text-sky-700 transition-colors line-clamp-1">{cita.ctaMotivo || cita.grupoTema || 'Cita de Seguimiento'}</h4>
                          <p className="text-sm text-slate-500 font-semibold mt-1">{cita.ctaHora.slice(0,5)} • Dr(a). {cita.medicoNombre}</p>
                          <div className="mt-3 flex items-center gap-2 text-slate-500">
                            {cita.ctaModalidad === 'virtual' ? <Video className="w-4 h-4 text-slate-400" /> : <MapPin className="w-4 h-4 text-slate-400" />}
                            <span className="text-xs font-bold uppercase tracking-wider">{cita.ctaModalidad}</span>
                          </div>
                        </div>
                      </div>
                      <button className="text-slate-400 hover:text-sky-600 p-2 rounded-lg hover:bg-sky-50 transition-colors">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center flex flex-col items-center">
                <CalendarDays className="w-10 h-10 text-slate-300 mb-3" />
                <p className="font-bold text-slate-500">No hay más citas futuras programadas.</p>
              </div>
            )}

            {restoFuturas.length > 0 && (
              <div className="mt-8 p-5 bg-sky-50 rounded-2xl border border-sky-100 flex items-start gap-4">
                <HelpCircle className="w-6 h-6 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-slate-800 mb-1">Recordatorio general</p>
                  <p className="text-sm font-semibold text-slate-600">Por favor, intente conectarse o llegar 10 minutos antes de la hora programada para cada cita.</p>
                </div>
              </div>
            )}
          </section>

          {/* Right Side: Historial de Citas (5 columns) */}
          <section className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <History className="text-sky-600 w-6 h-6" />
                Historial de Citas
              </h3>
            </div>

            {citasPasadas.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="divide-y divide-slate-100">
                  {citasPasadas.map(cita => (
                    <div key={cita.ctaCodigo} className="p-5 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between mb-2 items-center">
                        <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">{safeFormatDate(cita.ctaFecha, "d 'de' MMM, yyyy")}</span>
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-emerald-100">
                          {cita.ctaEstado}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 mb-1 line-clamp-1">{cita.ctaMotivo || cita.grupoTema || 'Cita de Seguimiento'}</h4>
                      <p className="text-sm font-semibold text-slate-500 mb-4">Dr(a). {cita.medicoNombre}</p>
                      
                      <div className="flex gap-4">
                        <button className="text-sky-600 text-xs font-bold flex items-center gap-1.5 hover:underline bg-sky-50 px-3 py-1.5 rounded-lg">
                          <Eye className="w-3.5 h-3.5" />
                          Resumen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center flex flex-col items-center">
                <History className="w-10 h-10 text-slate-300 mb-3" />
                <p className="font-bold text-slate-500">No hay citas previas registradas.</p>
              </div>
            )}

            {/* Sticky Support Card */}
            <div className="mt-8 p-6 bg-slate-800 text-slate-100 rounded-2xl shadow-md border border-slate-700 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <Bell className="w-5 h-5 text-amber-400" />
                  <p className="text-base font-black">¿Necesita ayuda?</p>
                </div>
                <p className="text-sm font-medium text-slate-300 mb-5 leading-relaxed">
                  Nuestro equipo de soporte está disponible para cualquier duda sobre sus tratamientos y citas.
                </p>
                <button className="w-full py-2.5 bg-sky-500 text-white rounded-xl font-bold text-sm hover:bg-sky-400 hover:shadow-lg transition-all active:scale-95 shadow-sm">
                  Contactar Soporte
                </button>
              </div>
              {/* Background Decoration */}
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-slate-700 rounded-full opacity-50 blur-2xl"></div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
