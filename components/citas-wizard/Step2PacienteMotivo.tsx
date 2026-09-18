'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import {
  usePacientesSeleccion,
} from '@/hooks/use-flujo-citas';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { useCitaStore } from '@/store/use-cita-store';
import { ChevronLeft, MapPin, Video, Home, Stethoscope, ArrowRight, CalendarDays, Building2, BriefcaseMedical, CalendarClock, Activity, ClipboardList, Plus, Loader2, UploadCloud, FileText, X, CheckCircle2, Sparkles, AlertCircle, Users, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePacienteTitular, usePacientesByUsuario } from '@/hooks/use-pacientes';
import type { PacienteSeleccionDto } from '@/types/citas';
import { PacienteFormModal } from '@/components/paciente-form-modal';
import { NeoLoader } from '@/components/neo-loader';

const MOTIVOS = [
  {
    id: 'Chequeo General',
    title: 'Chequeo General',
    badge: 'Preventivo',
    icon: BriefcaseMedical
  },
  {
    id: 'Consulta de Seguimiento',
    title: 'Consulta de Seguimiento',
    badge: 'Control',
    icon: Activity
  },
  {
    id: 'Revisión de Exámenes / Resultados',
    title: 'Revisión de Exámenes',
    badge: 'Diagnóstico',
    icon: ClipboardList
  }
];

export function Step2PacienteMotivo() {
  const router = useRouter();
  const {
    codMedico, modalidad,
    clinicaSeleccionada, areaDomicilio,
    servicioSeleccionado, setServicio,
    fecha, hora, step,
    pacienteSeleccionado, setPaciente,
    motivo, setMotivo,
    grupoNombre, grupoId, creandoNuevoGrupo,
    citasMultiples, pacienteModoCita, setPacienteModoCita, setPacienteCitaMultiple,
    archivos, setArchivos,
    direccionDomicilio, setDireccionDomicilio,
    referenciasDomicilio, setReferenciasDomicilio,
    pacientesExcluidos,
    prevStep, nextStep
  } = useCitaStore();

  const [isAddPacienteOpen, setIsAddPacienteOpen] = useState(false);

  const { titular, isLoading: loadingTitular } = usePacienteTitular();
  const { data: pacientesUsuario = [], isLoading: loadingPacientesUsuario } = usePacientesByUsuario();
  const { data: pacientesSeleccion = [], isLoading: loadingPacientesSeleccion } = usePacientesSeleccion();
  const { data: doctor, isLoading: loadingDoctor } = useDoctorByCode(codMedico!);

  // Consolidar pacientes disponibles (titular + familiares activos no independizados)
  const pacientesDisponibles = useMemo(() => {
    const list: PacienteSeleccionDto[] = [];
    const seen = new Set<string>();

    // 1. Prioridad: pacientesSeleccion (del flujo de citas)
    if (Array.isArray(pacientesSeleccion)) {
      pacientesSeleccion.forEach((p: any) => {
        const codigo = p.pacCodigo || p.pac_codigo;
        const estado = (p.pacEstado || p.pac_estado || '').toLowerCase();
        if (codigo && estado !== 'independizado' && estado !== 'inactivo' && !seen.has(codigo)) {
          seen.add(codigo);
          list.push({
            pacCodigo: codigo,
            pacTitular: Boolean(p.pacTitular ?? p.pac_titular),
            nombreCompleto: p.nombreCompleto || p.pac_nombre_completo || `${p.pacPrimerNombre || p.pac_primer_nombre || ''} ${p.pacPrimerApellido || p.pac_primer_apellido || ''}`.trim(),
            pacFechaNacimiento: p.pacFechaNacimiento || p.pac_fecha_nacimiento || null,
            pacFotoPerfilUrl: p.pacFotoPerfilUrl || p.pac_foto_perfil_url,
          });
        }
      });
    }

    // 2. Complementar con pacientesUsuario (perfil del usuario)
    if (Array.isArray(pacientesUsuario)) {
      pacientesUsuario.forEach((p: any) => {
        const codigo = p.pac_codigo || p.pacCodigo;
        const estado = (p.pac_estado || p.pacEstado || '').toLowerCase();
        if (codigo && estado !== 'independizado' && estado !== 'inactivo' && !seen.has(codigo)) {
          seen.add(codigo);
          list.push({
            pacCodigo: codigo,
            pacTitular: Boolean(p.pac_titular ?? p.pacTitular),
            nombreCompleto: `${p.pac_primer_nombre || ''} ${p.pac_primer_apellido || ''}`.trim() || 'Paciente',
            pacFechaNacimiento: p.pac_fecha_nacimiento || p.pacFechaNacimiento || null,
            pacFotoPerfilUrl: p.pac_foto_perfil_url || p.pacFotoPerfilUrl,
          });
        }
      });
    }

    // 3. Fallback directo al titular si la lista sigue vacía
    if (list.length === 0 && titular) {
      const codigo = titular.pac_codigo || (titular as any).pacCodigo;
      if (codigo) {
        list.push({
          pacCodigo: codigo,
          pacTitular: true,
          nombreCompleto: `${titular.pac_primer_nombre || ''} ${titular.pac_primer_apellido || ''}`.trim() || 'Yo',
          pacFechaNacimiento: titular.pac_fecha_nacimiento || null,
          pacFotoPerfilUrl: titular.pac_foto_perfil_url || undefined,
        });
      }
    }

    // Ordenar: titular siempre de primero
    return list.sort((a, b) => (b.pacTitular ? 1 : 0) - (a.pacTitular ? 1 : 0));
  }, [pacientesSeleccion, pacientesUsuario, titular]);

  // Filtrar pacientes excluidos por conflicto de horario
  const pacientesFiltrados = useMemo(() => {
    if (!pacientesExcluidos || pacientesExcluidos.length === 0) return pacientesDisponibles;
    return pacientesDisponibles.filter(p => !pacientesExcluidos.includes(p.pacCodigo));
  }, [pacientesDisponibles, pacientesExcluidos]);

  const pacientesExcluidosDetalle = useMemo(() => {
    if (!pacientesExcluidos || pacientesExcluidos.length === 0) return [];
    return pacientesDisponibles.filter(p => pacientesExcluidos.includes(p.pacCodigo));
  }, [pacientesDisponibles, pacientesExcluidos]);

  // Auto-seleccionar al titular o al primer paciente si ninguno está seleccionado (respetando exclusiones)
  useEffect(() => {
    const pacCodigoActual = pacienteSeleccionado?.pacCodigo;
    if (!pacCodigoActual) {
      if (pacientesFiltrados.length > 0) {
        const titularPac = pacientesFiltrados.find(p => p.pacTitular) || pacientesFiltrados[0];
        setPaciente(titularPac);
      }
    } else {
      const isExcluded = Boolean(pacientesExcluidos?.includes(pacCodigoActual));
      const estado = ((pacienteSeleccionado as any)?.pacEstado || (pacienteSeleccionado as any)?.pac_estado || '').toLowerCase();
      const stillValid = pacientesFiltrados.some(p => p.pacCodigo === pacCodigoActual);
      
      if (isExcluded || estado === 'independizado' || !stillValid) {
        const nuevoPac = pacientesFiltrados.find(p => p.pacTitular) || pacientesFiltrados[0] || null;
        if ((nuevoPac?.pacCodigo || null) !== (pacCodigoActual || null)) {
          setPaciente(nuevoPac);
        }
      }
    }
  }, [pacienteSeleccionado?.pacCodigo, pacientesFiltrados, pacientesExcluidos, setPaciente]);

  // Asegurar que la pantalla siempre se posicione hasta arriba al entrar al Paso 2
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setArchivos([...archivos, ...acceptedFiles]);
  }, [archivos, setArchivos]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    },
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  const removeFile = (index: number) => {
    const newFiles = [...archivos];
    newFiles.splice(index, 1);
    setArchivos(newFiles);
  };

  const isMultiMode = !!(grupoId || creandoNuevoGrupo) && citasMultiples.length > 0;

  const handleModoChange = (modo: 'mismo' | 'variado') => {
    setPacienteModoCita(modo);
    if (modo === 'variado') {
      const defaultPac = pacienteSeleccionado || pacientesFiltrados[0] || null;
      citasMultiples.forEach(c => {
        if (!c.paciente && defaultPac) {
          setPacienteCitaMultiple(c.id, defaultPac);
        }
      });
    }
  };

  useEffect(() => {
    if (isMultiMode && pacienteModoCita === 'variado') {
      const defaultPac = pacienteSeleccionado || pacientesFiltrados[0] || null;
      citasMultiples.forEach(c => {
        if (!c.paciente && defaultPac) {
          setPacienteCitaMultiple(c.id, defaultPac);
        }
      });
    }
  }, [isMultiMode, pacienteModoCita, citasMultiples, pacienteSeleccionado, pacientesFiltrados, setPacienteCitaMultiple]);

  const isInitialLoading = loadingDoctor || (pacientesDisponibles.length === 0 && (loadingPacientesSeleccion || loadingPacientesUsuario || loadingTitular));

  if (isInitialLoading) {
    return <div className="py-12"><NeoLoader fullScreenPortal={false} /></div>;
  }

  const getInitials = (name: string) => {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };

  const isPacienteValid = isMultiMode && pacienteModoCita === 'variado'
    ? citasMultiples.length > 0 && citasMultiples.every(c => Boolean(c.paciente || pacienteSeleccionado))
    : pacienteSeleccionado !== null;

  const isComplete = isPacienteValid && (servicioSeleccionado !== null || motivo !== '') && 
    (modalidad !== 'domicilio' || (direccionDomicilio.trim() !== '' && referenciasDomicilio.trim() !== ''));
  const isSeguimientoVisible = isPacienteValid;

  return (
    <div className="flex flex-col w-full font-sans pb-4">

      {/* The header has been extracted to WizardHeader.tsx */}

      {/* BODY CONTINUOUS FLOW */}
      <div className="flex flex-col w-full space-y-12 px-4">

        {/* SECTION 1: PACIENTE */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">¿Quién asistirá a la consulta?</h2>
              {isMultiMode && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Estás agendando un grupo de <strong>{citasMultiples.length} {citasMultiples.length === 1 ? 'cita' : 'citas'}</strong>. Puedes mantener el mismo paciente o asignar uno por cada cita.
                </p>
              )}
            </div>

            {/* Toggle Minimalista Mismo vs Variado (Solo en Grupo de Citas) */}
            {isMultiMode && (
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto shrink-0 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleModoChange('mismo')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    pacienteModoCita === 'mismo'
                      ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Mismo paciente ({citasMultiples.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModoChange('variado')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    pacienteModoCita === 'variado'
                      ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Paciente por cita</span>
                </button>
              </div>
            )}
          </div>

          {/* MODO MISMO PACIENTE (O CITA INDIVIDUAL) */}
          {(!isMultiMode || pacienteModoCita === 'mismo') && (
            <div>
              <div className="flex items-end gap-6 sm:gap-10 overflow-x-auto max-w-full pb-2 scrollbar-none">
                {pacientesFiltrados.map(pac => {
                  const isSelected = pacienteSeleccionado?.pacCodigo === pac.pacCodigo;
                  return (
                    <button key={pac.pacCodigo} onClick={() => setPaciente(pac)} className="flex flex-col items-center gap-3 group">
                      <div className={`h-[88px] w-[88px] rounded-full border-[3px] p-1 transition-all ${isSelected ? 'border-blue-600 dark:border-blue-500 shadow-md shadow-blue-600/20' : 'border-transparent'}`}>
                        <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center transition-all ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}`}>
                          {pac.pacFotoPerfilUrl || pac.pacTitular ? (
                            <img
                              src={pac.pacFotoPerfilUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(pac.nombreCompleto)}&background=0D8ABC&color=fff`}
                              alt={pac.nombreCompleto}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xl font-bold">{getInitials(pac.nombreCompleto)}</span>
                          )}
                        </div>
                      </div>
                      <span className={`font-bold transition-colors text-[15px] ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'}`}>
                        {pac.pacTitular ? 'Yo' : pac.nombreCompleto}
                      </span>
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setIsAddPacienteOpen(true)}
                  className="flex flex-col items-center gap-3 group pb-0.5"
                >
                  <div className="h-[80px] w-[80px] rounded-full border-[2px] border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:border-slate-400 dark:group-hover:border-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors mb-2">
                    <Plus className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <span className="font-bold text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors text-[13px]">Añadir Familiar</span>
                </button>
              </div>

              {pacientesExcluidosDetalle.length > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    <strong>{pacientesExcluidosDetalle.map(p => p.pacTitular ? 'Tú (titular)' : p.nombreCompleto).join(', ')}</strong>{' '}
                    no {pacientesExcluidosDetalle.length > 1 ? 'están disponibles' : 'está disponible'} para este turno porque ya tiene una cita agendada a esta hora.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* MODO PACIENTE POR CITA (VARIADOS) */}
          {isMultiMode && pacienteModoCita === 'variado' && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {citasMultiples.map((cita, idx) => {
                  const [h, m] = cita.hora.split(':');
                  let hourNum = parseInt(h);
                  const ampm = hourNum >= 12 ? 'PM' : 'AM';
                  hourNum = hourNum % 12 || 12;
                  const displayTime = `${hourNum}:${m} ${ampm}`;
                  const displayDate = format(cita.fecha, "EEEE d 'de' MMMM", { locale: es });
                  const assignedPac = cita.paciente || pacienteSeleccionado;

                  return (
                    <div
                      key={cita.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white capitalize truncate">
                            {displayDate}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md shrink-0">
                          {displayTime}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                          {assignedPac?.pacFotoPerfilUrl ? (
                            <img src={assignedPac.pacFotoPerfilUrl} alt={assignedPac.nombreCompleto} className="w-full h-full object-cover" />
                          ) : assignedPac?.nombreCompleto ? (
                            <span>{getInitials(assignedPac.nombreCompleto)}</span>
                          ) : (
                            <span>?</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                            Paciente para esta consulta:
                          </label>
                          <select
                            value={assignedPac?.pacCodigo || ''}
                            onChange={(e) => {
                              const chosen = pacientesDisponibles.find(p => p.pacCodigo === e.target.value) || null;
                              setPacienteCitaMultiple(cita.id, chosen);
                            }}
                            className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                          >
                            <option value="" disabled>Selecciona un paciente</option>
                            {pacientesDisponibles.map((p) => (
                              <option key={p.pacCodigo} value={p.pacCodigo}>
                                {p.pacTitular ? `Yo (${p.nombreCompleto})` : p.nombreCompleto}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPacienteOpen(true)}
                  className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Añadir otro familiar a la cuenta
                </button>
              </div>
            </div>
          )}

          <PacienteFormModal
            open={isAddPacienteOpen}
            mode="add"
            titular={titular}
            titularCodigo={titular?.pac_codigo || ''}
            onClose={() => setIsAddPacienteOpen(false)}
          />
        </div>

        {/* SECTION 2: SERVICIO / MOTIVO DE CONSULTA */}
        <div className={`transition-all duration-300 ${pacienteSeleccionado ? 'opacity-100 translate-y-0' : 'opacity-40 pointer-events-none translate-y-4'}`}>
          {servicioSeleccionado ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight flex items-center gap-2">
                <Stethoscope className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                Servicio Seleccionado
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Has seleccionado el siguiente servicio en el paso anterior:
              </p>

              {/* Tarjeta del servicio seleccionado */}
              <div className="rounded-2xl border-2 border-blue-600/60 dark:border-blue-500/60 bg-blue-50/60 dark:bg-blue-950/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Servicio médico
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                      {servicioSeleccionado.servicio}
                    </h3>
                    {servicioSeleccionado.observaciones && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {servicioSeleccionado.observaciones}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-blue-200/60 dark:border-blue-800/40">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                    Costo total con IVA
                  </span>
                  <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                    Q{servicioSeleccionado.costoTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Observaciones o detalles adicionales */}
              <div className="mt-4">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Observaciones o síntomas adicionales (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={
                    motivo && 
                    motivo !== servicioSeleccionado.servicio && 
                    motivo !== grupoNombre
                      ? motivo 
                      : ''
                  }
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Describe brevemente tus síntomas, dudas o detalles adicionales que el médico deba conocer..."
                  className="w-full bg-white dark:bg-[#1E293B] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 resize-none transition-all"
                />
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">Motivo de la consulta</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Selecciona la opción que mejor describa tu visita.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {MOTIVOS.map((m) => {
                  const isSelected = motivo === m.id;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setServicio(null);
                        setMotivo(m.id);
                      }}
                      className={`relative flex flex-col items-start text-left p-5 rounded-3xl border-[2px] transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-600/10'
                          : 'border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-600/50 bg-white dark:bg-[#1E293B] shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div className={`shrink-0 p-3 rounded-full mb-4 transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-[#0B1120] text-blue-600 dark:text-blue-400'}`}>
                        <Icon className="w-6 h-6" />
                      </div>

                      <div className="flex flex-col">
                        <h3 className={`text-[15px] font-bold mb-2 leading-tight ${isSelected ? 'text-blue-900 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                          {m.title}
                        </h3>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md w-fit ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                          {m.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SECTION Domicilio: DIRECCION EXACTA (Solo Domicilio) */}
        {modalidad === 'domicilio' && (
          <div className={`transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${pacienteSeleccionado ? 'opacity-100 translate-y-0' : 'opacity-40 pointer-events-none translate-y-4'}`}>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">Dirección de visita</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Proporciona la dirección exacta para que el médico pueda llegar sin problemas.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-[#0F172A] rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">Dirección Exacta <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={direccionDomicilio}
                  onChange={(e) => setDireccionDomicilio(e.target.value)}
                  placeholder="Calle, avenida, zona, número de casa..."
                  className="w-full bg-white dark:bg-[#1E293B] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">Referencias <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={referenciasDomicilio}
                  onChange={(e) => setReferenciasDomicilio(e.target.value)}
                  placeholder="Ej. Portón negro, frente al parque..."
                  className="w-full bg-white dark:bg-[#1E293B] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: ARCHIVOS (OPCIONAL) */}
        <div className={`transition-all duration-300 ${pacienteSeleccionado ? 'opacity-100 translate-y-0' : 'opacity-40 pointer-events-none translate-y-4'}`}>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">Documentos previos (Opcional)</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Puedes adjuntar fotos de recetas anteriores, resultados de laboratorio o imágenes relevantes. (Max 5MB)</p>

          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 transition-colors cursor-pointer ${isDragActive ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20' : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0F172A] hover:bg-slate-100 dark:hover:bg-[#1E293B]'
              }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className={`h-10 w-10 ${isDragActive ? 'text-sky-500' : 'text-slate-400 dark:text-slate-500'}`} />
            <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300">
              {isDragActive ? 'Suelta los archivos aquí...' : 'Haz clic o arrastra archivos aquí'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">PDF, JPG o PNG</p>
          </div>

          {archivos.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {archivos.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-[#1E293B] shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="h-5 w-5 shrink-0 text-sky-500" />
                    <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{file.name}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className="rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 transition"
                    title="Eliminar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Footer Next Button ALWAYS VISIBLE BUT BLOCKED IF NOT COMPLETE */}
      <div className="sticky bottom-0 z-30 bg-transparent flex flex-col-reverse sm:flex-row justify-between items-center gap-3 py-4 border-t border-slate-200/60 dark:border-slate-800/40 mt-8">
        <button
          onClick={() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            prevStep();
          }}
          className="w-full sm:w-auto font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm text-sm sm:text-base cursor-pointer"
        >
          <ChevronLeft className="h-5 w-5" /> Regresar al paso anterior
        </button>

        <button
          onClick={() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            nextStep();
          }}
          disabled={!isComplete}
          className={`w-full sm:w-auto font-bold py-3.5 px-8 sm:px-10 rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${isComplete
            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
        >
          <span>Continuar al Siguiente Paso</span> <ArrowRight className="h-5 w-5" />
        </button>
      </div>

    </div>
  );
}
