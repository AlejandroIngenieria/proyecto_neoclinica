'use client';

import { useState } from 'react';

import { useParams, useRouter } from 'next/navigation';
import { useCitasPaciente, usePacientesSeleccion } from '@/hooks/use-flujo-citas';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { Navbar } from '@/components/navbar';
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, HelpCircle, User, CalendarDays, Monitor, MapPin, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CitaListDto } from '@/types/citas';
import { CitaDetailDrawer } from '@/components/citas/cita-detail-drawer';
import Image from 'next/image';

function safeFormatDate(dateStr: string | undefined, formatStr: string): string {
  if (!dateStr) return 'Fecha sin definir';
  try {
    return format(parseISO(dateStr), formatStr, { locale: es });
  } catch {
    return 'Fecha inválida';
  }
}

export default function GrupoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const grupoId = params.grupoId as string;
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaListDto | null>(null);

  const { data: pacientes, isLoading: loadingPacientes } = usePacientesSeleccion();
  const pacientePrincipal = pacientes?.find(p => p.pacTitular) || pacientes?.[0];
  const { data: citasData, isLoading: loadingCitas } = useCitasPaciente(pacientePrincipal?.pacCodigo || null);

  const citas = citasData || [];
  const citasGrupo = citas.filter(c => c.ctaGrupoId === grupoId);
  const doctorCode = citasGrupo[0]?.ctaCoddoc;
  const { data: doctor } = useDoctorByCode(doctorCode);

  if (loadingPacientes || loadingCitas) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0B1120] flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-[#2563EB] dark:text-blue-500 animate-spin mb-4" />
          <p className="font-bold text-[#6B7280] dark:text-slate-400 animate-pulse">Cargando expediente...</p>
        </main>
      </div>
    );
  }

  if (citasGrupo.length === 0) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0B1120] flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          <button onClick={() => router.push('/dashboard/citas')} className="flex items-center text-[#2563EB] dark:text-blue-400 hover:underline font-bold mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Mis Tratamientos
          </button>
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-12 text-center shadow-sm border border-[#E5E7EB] dark:border-slate-700">
            <p className="text-xl font-bold text-[#6B7280] dark:text-slate-400">No se encontraron citas para este plan de tratamiento.</p>
          </div>
        </main>
      </div>
    );
  }

  const nombreGrupo = citasGrupo[0].grupoTema || 'Seguimiento Médico';

  // Ordenar cronológicamente todas las citas del grupo
  const citasCronologicas = [...citasGrupo].sort((a, b) => {
    const dateA = new Date(`${a.ctaFecha.split('T')[0]}T${a.ctaHora}`);
    const dateB = new Date(`${b.ctaFecha.split('T')[0]}T${b.ctaHora}`);
    return dateA.getTime() - dateB.getTime();
  });

  const total = citasGrupo.length;
  const completed = citasGrupo.filter(c => ['completada'].includes(c.ctaEstado)).length;
  
  // Próxima cita (la primera que no esté completada o cancelada y sea programada, confirmada, etc.)
  const nextAppointmentIndex = citasCronologicas.findIndex(c => ['programada', 'confirmada', 'pospuesta'].includes(c.ctaEstado));
  const citaPrincipal = nextAppointmentIndex !== -1 ? citasCronologicas[nextAppointmentIndex] : null;

  const medicoNombre = citasGrupo[0]?.medicoNombre || '';
  const medicoEspecialidad = citasGrupo[0]?.medicoEspecialidad || '';

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0B1120] font-sans text-[#111827] dark:text-slate-200">
      <Navbar />

      <main className="pt-8 pb-24 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Botón de retroceso */}
        <button
          onClick={() => router.push('/dashboard/citas')}
          className="flex items-center text-[#6B7280] dark:text-slate-400 hover:text-[#2563EB] dark:hover:text-blue-400 font-bold mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Mis Tratamientos
        </button>

        {/* Layout Principal 8/4 (2.2fr / 1fr) */}
        <div className="grid grid-cols-1 lg:grid-cols-[2.2fr_1fr] gap-8 items-start">
          
          {/* Columna Izquierda: Timeline y Detalles */}
          <div className="space-y-8">
            
            {/* Header / Hero */}
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-8 shadow-sm border border-[#E5E7EB] dark:border-slate-700">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                  <p className="text-sm font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-widest mb-2">Plan de Tratamiento</p>
                  <h1 className="text-3xl sm:text-4xl font-black text-[#111827] dark:text-white">{nombreGrupo}</h1>
                </div>
                {citaPrincipal && (
                  <div className="bg-[#F8FAFC] dark:bg-[#0F172A] px-4 py-3 rounded-xl border border-[#E5E7EB] dark:border-slate-700 shrink-0 text-left md:text-right">
                     <p className="text-xs font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider mb-0.5">Próxima sesión</p>
                     <p className="text-[#111827] dark:text-white font-bold text-sm">
                       {safeFormatDate(citaPrincipal.ctaFecha, "d MMM")} · {citaPrincipal.ctaHora.slice(0, 5)}
                     </p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-8 shadow-sm border border-[#E5E7EB] dark:border-slate-700">
              <h3 className="text-sm font-bold text-[#111827] dark:text-slate-300 uppercase tracking-widest mb-8">Evolución del Tratamiento</h3>
              
              <div className="relative pl-6 before:absolute before:inset-y-2 before:left-[11px] before:w-0.5 before:bg-[#E5E7EB] dark:before:bg-slate-700">
                {citasCronologicas.map((cita, idx) => {
                  const isCompleted = ['completada'].includes(cita.ctaEstado);
                  const isNext = idx === nextAppointmentIndex;
                  const isPending = !isCompleted && !isNext;
                  
                  return (
                    <div key={cita.ctaCodigo} className="relative flex items-start gap-6 mb-8 last:mb-0">
                      {/* Timeline Node */}
                      <div className="absolute -left-6 top-1">
                        {isCompleted && (
                          <div className="w-6 h-6 rounded-full bg-teal-50 dark:bg-teal-900/30 border-2 border-[#0D9488] flex items-center justify-center z-10 relative shadow-sm">
                            <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />
                          </div>
                        )}
                        {isNext && (
                          <div className="w-6 h-6 rounded-full bg-[#2563EB] border-4 border-white dark:border-[#1E293B] shadow-md z-10 relative flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          </div>
                        )}
                        {isPending && (
                          <div className="w-6 h-6 rounded-full bg-white dark:bg-[#1E293B] border-2 border-[#D1D5DB] dark:border-slate-600 z-10 relative" />
                        )}
                      </div>

                      {/* Content Card */}
                      <div className={`w-full ${isNext ? '' : 'pt-0.5'}`}>
                        {isNext ? (
                          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-[#E5E7EB] dark:border-slate-700 shadow-md overflow-hidden flex flex-col sm:flex-row items-center sm:items-stretch">
                            <div className="p-5 flex-1 w-full relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1 h-full bg-[#2563EB]" />
                              <p className="text-[#2563EB] text-xs font-black uppercase tracking-wider mb-2 pl-2">Próxima Sesión</p>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2 pl-2">
                                <p className="text-xl font-black text-[#111827] dark:text-white">{safeFormatDate(cita.ctaFecha, "d 'de' MMMM")}</p>
                                <div className="flex items-center gap-4 text-sm font-bold text-[#6B7280] dark:text-slate-400">
                                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4"/> {cita.ctaHora.slice(0, 5)}</span>
                                  <span className="flex items-center gap-1.5">
                                    {cita.ctaModalidad === 'virtual' ? <Monitor className="w-4 h-4" /> : <MapPin className="w-4 h-4" />} 
                                    {cita.ctaModalidad === 'virtual' ? 'Teleconsulta' : 'Presencial'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-center w-full sm:w-48 border-t sm:border-t-0 sm:border-l border-[#E5E7EB] dark:border-slate-700">
                              <button onClick={() => setCitaSeleccionada(cita)} className="w-full h-full bg-[#F9FAFB] dark:bg-[#1E293B] text-[#111827] dark:text-white font-bold text-sm hover:bg-[#E5E7EB] dark:hover:bg-[#0B1120] transition-colors flex items-center justify-center py-4 sm:py-0 border-none">
                                Detalles
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                              <h4 className={`font-bold text-base ${isCompleted ? 'text-[#111827] dark:text-white' : 'text-[#6B7280] dark:text-slate-400'}`}>
                                {cita.ctaMotivo || cita.grupoTema || 'Sesión de Seguimiento'}
                              </h4>
                              {isPending && <span className="text-xs font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Pendiente</span>}
                            </div>
                            <p className={`text-sm mt-1 ${isCompleted ? 'text-[#6B7280] dark:text-slate-400' : 'text-[#D1D5DB] dark:text-slate-500'}`}>
                              {isCompleted ? safeFormatDate(cita.ctaFecha, "d 'de' MMMM") : 'Por programar'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ayuda y Alertas ultra-compactos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-slate-700 rounded-2xl p-5 flex gap-4">
                <AlertCircle className="w-5 h-5 text-[#2563EB] shrink-0" />
                <div>
                  <h4 className="font-bold text-[#111827] dark:text-white mb-1">Información</h4>
                  <p className="text-sm text-[#6B7280] dark:text-slate-400">Llega 10 mins antes y no suspendas medicamentos sin consultar.</p>
                </div>
              </div>
              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-slate-700 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-[#6B7280] dark:text-slate-400 shrink-0" />
                  <p className="font-bold text-[#111827] dark:text-white text-sm">¿Necesitas ayuda?</p>
                </div>
                <button className="text-[#2563EB] font-bold text-sm hover:underline shrink-0">
                  Contactar soporte →
                </button>
              </div>
            </div>

          </div>

          {/* Columna Derecha: Panel Permanente de Contexto */}
          <div>
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-[#E5E7EB] dark:border-slate-700 shadow-sm sticky top-8 overflow-hidden">
              <div className="p-6 border-b border-[#E5E7EB] dark:border-slate-700">
                <p className="text-xs font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-widest mb-4">Resumen del Plan</p>
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-[#F9FAFB] dark:bg-[#0F172A] rounded-full flex items-center justify-center border border-[#E5E7EB] dark:border-slate-700 shrink-0 overflow-hidden relative">
                    {doctor?.exp_foto_perfil ? (
                      <Image src={doctor.exp_foto_perfil} alt={medicoNombre} fill sizes="48px" className="object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-[#D1D5DB] dark:text-slate-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-[#111827] dark:text-white leading-tight">Dr(a). {medicoNombre}</h4>
                    <p className="text-sm font-medium text-[#6B7280] dark:text-slate-400">{medicoEspecialidad}</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-sm font-bold text-[#111827] dark:text-white">Progreso</p>
                    <p className="text-sm font-bold text-[#2563EB] dark:text-blue-400">{Math.min(completed + 1, total)} de {total} sesiones</p>
                  </div>
                  <div className="w-full bg-[#F3F4F6] dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-[#2563EB] h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(((completed + 1) / total) * 100, 100)}%` }} 
                    />
                  </div>
                </div>
              </div>

              {citaPrincipal ? (
                <div className="p-6 bg-[#F9FAFB] dark:bg-[#0F172A]">
                  <p className="text-xs font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" /> Próxima Cita
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-[#E5E7EB] dark:border-slate-700">
                      <span className="text-sm text-[#6B7280] dark:text-slate-400 font-medium">Fecha</span>
                      <span className="text-sm font-black text-[#111827] dark:text-white">{safeFormatDate(citaPrincipal.ctaFecha, "d 'de' MMMM")}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-[#E5E7EB] dark:border-slate-700">
                      <span className="text-sm text-[#6B7280] dark:text-slate-400 font-medium">Hora</span>
                      <span className="text-sm font-black text-[#111827] dark:text-white">{citaPrincipal.ctaHora.slice(0, 5)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-[#E5E7EB] dark:border-slate-700">
                      <span className="text-sm text-[#6B7280] dark:text-slate-400 font-medium">Modalidad</span>
                      <span className="text-sm font-black text-[#111827] dark:text-white flex items-center gap-1.5">
                        {citaPrincipal.ctaModalidad === 'virtual' ? <Monitor className="w-4 h-4" /> : <MapPin className="w-4 h-4" />} 
                        {citaPrincipal.ctaModalidad === 'virtual' ? 'Teleconsulta' : 'Presencial'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#6B7280] dark:text-slate-400 font-medium">Estado</span>
                      <span className="text-xs font-black text-[#2563EB] dark:text-blue-400 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md border border-[#2563EB]/20">
                        En curso
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 space-y-3">
                    <button className="w-full py-3 bg-[#2563EB] text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm">
                      Prepararme
                    </button>
                    <button className="w-full py-3 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-slate-700 text-[#111827] dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-[#F9FAFB] dark:hover:bg-[#0B1120] transition-colors">
                      Reprogramar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-[#F9FAFB] dark:bg-[#0F172A] text-center">
                  <CheckCircle2 className="w-10 h-10 text-[#0D9488] mx-auto mb-3" />
                  <p className="font-bold text-[#111827] dark:text-white">Tratamiento Finalizado</p>
                  <p className="text-sm text-[#6B7280] dark:text-slate-400 mt-1">Has completado todas las sesiones de este grupo.</p>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </main>

      <CitaDetailDrawer
        isOpen={!!citaSeleccionada}
        onClose={() => setCitaSeleccionada(null)}
        cita={citaSeleccionada}
        doctorFoto={doctor?.exp_foto_perfil || ''}
        onEdit={(cita) => {
          router.push(`/dashboard/citas/${cita.ctaCodigo}/editar`);
        }}
        onCancel={(cita) => {
          router.push(`/dashboard/citas/${cita.ctaCodigo}/editar`);
        }}
      />
    </div>
  );
}
