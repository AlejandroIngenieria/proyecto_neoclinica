import { useRouter } from 'next/navigation';
import { useMemo, useEffect } from 'react';
import { useModalidades, useClinicas, useAreasDomicilio, useHorarios, useHorasOcupadas, useServiciosMedico, useGruposCita, usePacientesSeleccion } from '@/hooks/use-flujo-citas';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { usePacienteTitular } from '@/hooks/use-pacientes';
import { useCitaStore } from '@/store/use-cita-store';
import { ChevronLeft, Stethoscope, MapPin, Video, Home, ArrowRight, CalendarDays, Clock, Building2, CalendarClock, Check, Sparkles, FolderPlus, Plus, Layers, Info } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import type { HorarioCitaDto, ServicioMedicoCitaDto, GrupoCitaDto } from '@/types/citas';
import 'react-day-picker/style.css';
import { NeoLoader } from '@/components/neo-loader';

export function Step1Modalidad() {
  const {
    codMedico, modalidad, setModalidad,
    setClinica, setArea, clinicaSeleccionada, areaDomicilio,
    servicioSeleccionado, setServicio, setMotivo,
    fecha, setFecha, hora, setHora, nextStep, step,
    pacienteSeleccionado, setPaciente,
    grupoId, grupoNombre, setTemaSeguimiento,
    tipoPagoId, setTipoPagoId,
    creandoNuevoGrupo, nuevoGrupoTema, setCreandoNuevoGrupo, setNuevoGrupoTema
  } = useCitaStore();
  const router = useRouter();

  const { data: modalidades = [], isLoading: loadingModalidades } = useModalidades(codMedico);
  const { data: clinicas = [], isLoading: loadingClinicas } = useClinicas(codMedico, modalidad);
  const { data: areas = [], isLoading: loadingAreas } = useAreasDomicilio(codMedico, modalidad);
  const { data: servicios = [], isLoading: loadingServicios } = useServiciosMedico(codMedico);

  const { data: doctor, isLoading: loadingDoctor } = useDoctorByCode(codMedico!);

  const { titular } = usePacienteTitular();
  const { data: pacientes = [] } = usePacientesSeleccion();

  // Inicializar paciente por defecto si aún no está en el store
  useEffect(() => {
    if (!pacienteSeleccionado) {
      if (titular) {
        setPaciente({
          pacCodigo: (titular as any).pacCodigo || titular.pac_codigo,
          nombreCompleto: (titular as any).nombreCompleto || `${titular.pac_primer_nombre || ''} ${titular.pac_primer_apellido || ''}`.trim(),
          pacTitular: true,
          pacFechaNacimiento: (titular as any).pacFechaNacimiento || titular.pac_fecha_nacimiento || null,
          pacFotoPerfilUrl: (titular as any).pacFotoPerfilUrl || titular.pac_foto_perfil_url || undefined,
        });
      } else if (pacientes.length > 0) {
        setPaciente(pacientes[0]);
      }
    }
  }, [titular, pacientes, pacienteSeleccionado, setPaciente]);

  const codPacActivo = pacienteSeleccionado?.pacCodigo || (titular as any)?.pacCodigo || titular?.pac_codigo || pacientes.find(p => p.pacTitular)?.pacCodigo || pacientes[0]?.pacCodigo || null;
  const { data: grupos = [], isLoading: loadingGrupos } = useGruposCita(codPacActivo, codMedico);

  const gruposUnicos = useMemo<GrupoCitaDto[]>(() => {
    if (!grupos) return [];
    const map = new Map<string, GrupoCitaDto>();
    grupos.forEach((g: GrupoCitaDto) => {
      const key = (g.grupoId ? String(g.grupoId) : (g.titulo || g.descripcion || '')).toLowerCase();
      if (!map.has(key)) {
        map.set(key, g);
      }
    });
    return Array.from(map.values());
  }, [grupos]);

  const handleSelectTema = (g: GrupoCitaDto) => {
    const topicTitle = g.titulo || g.descripcion || 'Tema de Seguimiento';
    setTemaSeguimiento(g.grupoId, topicTitle);
    setCreandoNuevoGrupo(false);
    setNuevoGrupoTema('');

    // 1. Automatizar modalidad
    if (g.modalidad && (g.modalidad === 'presencial' || g.modalidad === 'virtual' || g.modalidad === 'domicilio')) {
      setModalidad(g.modalidad as any);
    }

    // 2. Automatizar motivo
    if (g.titulo || g.descripcion) {
      setMotivo(g.titulo || g.descripcion || '');
    }

    // 3. Automatizar servicio médico
    if (g.codServicio && servicios.length > 0) {
      const matchServicio = servicios.find(s => s.sypCodigo === g.codServicio);
      if (matchServicio) {
        setServicio(matchServicio);
      }
    } else if (servicios.length > 0 && !servicioSeleccionado) {
      setServicio(servicios[0]);
    }

    // 4. Automatizar método de pago
    if (g.codMetodoPago) {
      setTipoPagoId(g.codMetodoPago);
    }

    // 5. Automatizar consultorio / clínica
    if (g.consultorioId && clinicas.length > 0) {
      const matchClinica = clinicas.find(c => c.mclCodigo === g.consultorioId || (c as any).cliCodigo === g.consultorioId);
      if (matchClinica) {
        setClinica(matchClinica);
      }
    }
  };

  // Sincronizar servicio médico cuando servicios terminen de cargar si ya hay un tema seleccionado
  useEffect(() => {
    if (grupoId && !servicioSeleccionado && servicios.length > 0) {
      const g = gruposUnicos.find(item => item.grupoId === grupoId);
      if (g?.codServicio) {
        const match = servicios.find(s => s.sypCodigo === g.codServicio);
        if (match) setServicio(match);
      }
    }
  }, [grupoId, servicioSeleccionado, servicios, gruposUnicos, setServicio]);

  const mclCodigo = modalidad === 'presencial' ? clinicaSeleccionada?.mclCodigo || null : 0;
  const { data: horariosClinica = [], isLoading: loadingHorarios } = useHorarios(mclCodigo);
  
  const { data: horasOcupadas = [] } = useHorasOcupadas(codMedico || null, fecha ? format(fecha, 'yyyy-MM-dd') : null);

  const isLoading = loadingModalidades || loadingDoctor;

  const horarios = useMemo(() => {
    if (modalidad === 'presencial') {
      return horariosClinica;
    }

    if (!doctor) return [];

    const combined: HorarioCitaDto[] = [];
    doctor.clinicas?.forEach(c => {
      c.horarios_atencion?.forEach(h => {
        combined.push({
          horDiaSemana: h.hor_dia_semana,
          horHoraInicio: h.hor_hora_inicio,
          horHoraFin: h.hor_hora_fin,
        });
      });
    });

    return combined;
  }, [modalidad, horariosClinica, doctor]);

  // Citas previas / existentes del tema de seguimiento seleccionado
  const temaCitasList = useMemo(() => {
    if (!grupoId) return [];
    const g = gruposUnicos.find(item => item.grupoId === grupoId);
    if (!g) return [];

    const list: { fechaStr: string; horaStr: string; citaId: string }[] = [];
    if (g.citas && g.citas.length > 0) {
      g.citas.forEach(c => {
        if (c.fecha) {
          list.push({
            fechaStr: String(c.fecha).split('T')[0],
            horaStr: String(c.hora).slice(0, 5),
            citaId: c.citaId,
          });
        }
      });
    } else if (g.fecha) {
      list.push({
        fechaStr: String(g.fecha).split('T')[0],
        horaStr: String(g.hora || '').slice(0, 5),
        citaId: g.citaId || '',
      });
    }
    return list;
  }, [grupoId, gruposUnicos]);

  const fechasTemaSeguimiento = useMemo(() => {
    return temaCitasList.map(item => {
      const [year, month, day] = item.fechaStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    });
  }, [temaCitasList]);

  const fechaSelectedStr = fecha ? format(fecha, 'yyyy-MM-dd') : null;
  const citasTemaEnFecha = useMemo(() => {
    if (!fechaSelectedStr) return [];
    return temaCitasList.filter(c => c.fechaStr === fechaSelectedStr);
  }, [fechaSelectedStr, temaCitasList]);

  const horasTemaEnFecha = useMemo(() => {
    return citasTemaEnFecha.map(c => c.horaStr);
  }, [citasTemaEnFecha]);

  const isCitaTemaDate = (date: Date) => {
    return fechasTemaSeguimiento.some(d =>
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );
  };

  const disabledDays = useMemo(() => {
    if (!horarios.length && !fechasTemaSeguimiento.length) return [{ from: new Date(1900, 1, 1), to: new Date(2100, 1, 1) }];
    const allowedDays = horarios.map(h => h.horDiaSemana);
    return [
      { before: new Date(new Date().setHours(0, 0, 0, 0)) },
      (date: Date) => !isCitaTemaDate(date) && !allowedDays.includes(date.getDay())
    ];
  }, [horarios, fechasTemaSeguimiento]);

  const availableTimeSlots = useMemo(() => {
    if (!fecha) return [];
    const dayOfWeek = fecha.getDay();
    const horariosDia = horarios.filter(h => h.horDiaSemana === dayOfWeek);

    const slots = new Set<string>();

    horariosDia.forEach(horarioDia => {
      let current = new Date(`1970-01-01T${horarioDia.horHoraInicio}`);
      const end = new Date(`1970-01-01T${horarioDia.horHoraFin}`);

      while (current < end) {
        slots.add(current.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }));
        current.setMinutes(current.getMinutes() + 30);
      }
    });

    // Añadir siempre las horas de citas de este tema para esta fecha
    horasTemaEnFecha.forEach(h => {
      slots.add(h);
    });

    if (slots.size === 0) return [];

    const uniqueSlots = Array.from(slots).sort();

    const now = new Date();
    let validSlots = uniqueSlots;
    if (fecha.toDateString() === now.toDateString()) {
      const currentTimeString = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      validSlots = uniqueSlots.filter(s => s > currentTimeString || horasTemaEnFecha.includes(s));
    }

    return validSlots.map(slot => {
      const slotWithSeconds = `${slot}:00`;
      const isTemaSlot = horasTemaEnFecha.includes(slot);
      const isBusy = horasOcupadas.includes(slotWithSeconds) || isTemaSlot;

      return {
        time: slot,
        disabled: isBusy,
        isTemaSlot,
      };
    });
  }, [fecha, horarios, horasOcupadas, horasTemaEnFecha]);

  useEffect(() => {
    if (!modalidad && modalidades.length > 0) {
      const hasPresencial = modalidades.some(m => m.modDescripcion.toLowerCase().includes('presencial'));
      setModalidad(hasPresencial ? 'presencial' : modalidades[0].modDescripcion.toLowerCase() as any);
    }
  }, [modalidad, setModalidad, modalidades]);

  if (isLoading) {
    return (
      <div className="py-12"><NeoLoader fullScreenPortal={false} /></div>
    );
  }

  const getIcon = (tipo: string, selected: boolean) => {
    const colorClass = selected ? "text-blue-700" : "text-slate-500";
    switch (tipo) {
      case 'presencial': return <MapPin className={`h-4 w-4 ${colorClass}`} />;
      case 'virtual': return <Video className={`h-4 w-4 ${colorClass}`} />;
      case 'domicilio': return <Home className={`h-4 w-4 ${colorClass}`} />;
      default: return <Stethoscope className={`h-4 w-4 ${colorClass}`} />;
    }
  };

  const isScheduleEnabled =
    (modalidad === 'virtual') ||
    (modalidad === 'presencial' && clinicaSeleccionada) ||
    (modalidad === 'domicilio' && areaDomicilio);

  const isComplete = isScheduleEnabled && fecha && hora;

  return (
    <div className="flex flex-col w-full font-sans pb-4">

      {/* 1. TEMA O GRUPO DE SEGUIMIENTO MÉDICO */}
      <div className="mb-6 bg-white dark:bg-[#1E293B] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Tema o Grupo de Seguimiento Médico
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Asocia esta cita a un tratamiento continuo o crea un nuevo tema de seguimiento con este especialista.
            </p>
          </div>
          {(grupoId || creandoNuevoGrupo) && (
            <button
              type="button"
              onClick={() => {
                setTemaSeguimiento(null, null);
                setCreandoNuevoGrupo(false);
                setNuevoGrupoTema('');
              }}
              className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline self-start sm:self-auto cursor-pointer"
            >
              Desvincular tema (Cita individual)
            </button>
          )}
        </div>

        {gruposUnicos.length > 0 ? (
          <div className="space-y-4">
            {/* Opciones con temas existentes */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreandoNuevoGrupo(false);
                  if (!grupoId && gruposUnicos.length > 0) {
                    handleSelectTema(gruposUnicos[0]);
                  }
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border cursor-pointer ${
                  !creandoNuevoGrupo && grupoId
                    ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <FolderPlus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Continuar tema existente ({gruposUnicos.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreandoNuevoGrupo(true);
                  setTemaSeguimiento(null, null);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border cursor-pointer ${
                  creandoNuevoGrupo
                    ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Iniciar nuevo tema de seguimiento</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTemaSeguimiento(null, null);
                  setCreandoNuevoGrupo(false);
                  setNuevoGrupoTema('');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border cursor-pointer ${
                  !grupoId && !creandoNuevoGrupo
                    ? 'bg-slate-800 text-white dark:bg-slate-700 border-slate-800 dark:border-slate-700 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>Cita individual (Sin tema)</span>
              </button>
            </div>

            {/* Lista de temas existentes para seleccionar */}
            {!creandoNuevoGrupo && (
              <div className="space-y-3 pt-1">
                {grupoId && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/50 text-xs font-bold text-purple-800 dark:text-purple-300">
                    <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>Tema vinculado: <strong>{grupoNombre || 'Seleccionado'}</strong>. Modalidad, servicio y método de pago preconfigurados automáticamente.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {gruposUnicos.map((g) => {
                    const isSelected = grupoId === g.grupoId;
                    const topicTitle = g.titulo || g.descripcion || 'Tema de Seguimiento';
                    return (
                      <button
                        key={g.grupoId}
                        type="button"
                        onClick={() => handleSelectTema(g)}
                        className={`text-left p-3.5 rounded-2xl border-2 transition-all flex items-start justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/50 shadow-md text-purple-950 dark:text-purple-200 ring-2 ring-purple-400/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600/50 bg-slate-50/50 dark:bg-[#0F172A]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 mb-1">
                            <FolderPlus className="w-4 h-4 shrink-0" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Tema de Seguimiento</span>
                          </div>
                          <h4 className="font-bold text-sm truncate text-slate-900 dark:text-white">
                            {topicTitle}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {g.modalidad && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100/80 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                                {g.modalidad}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {g.citaId ? 'Continuidad de citas' : 'Tema activo'}
                            </span>
                          </div>
                        </div>
                        <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 transition ${
                          isSelected ? 'bg-purple-600 text-white shadow-xs' : 'border border-slate-300 dark:border-slate-600'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Formulario para ingresar nuevo tema */}
            {creandoNuevoGrupo && (
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Nombre del nuevo tema o tratamiento:
                </label>
                <div className="flex gap-2 max-w-lg">
                  <input
                    type="text"
                    value={nuevoGrupoTema}
                    onChange={(e) => setNuevoGrupoTema(e.target.value)}
                    placeholder="Ej: Control Post-operatorio Rodilla, Tratamiento Acné..."
                    className="flex-1 bg-white dark:bg-[#0F172A] px-4 py-2.5 rounded-xl border border-purple-300 dark:border-purple-700 outline-none focus:ring-2 focus:ring-purple-500/20 text-sm text-slate-800 dark:text-slate-200"
                    autoFocus
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Si el paciente no tiene temas previos con este médico */
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setCreandoNuevoGrupo(false);
                  setNuevoGrupoTema('');
                  setTemaSeguimiento(null, null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border cursor-pointer ${
                  !creandoNuevoGrupo
                    ? 'bg-slate-800 text-white dark:bg-slate-700 border-slate-800 dark:border-slate-700 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>Cita individual estándar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreandoNuevoGrupo(true);
                  setTemaSeguimiento(null, null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border cursor-pointer ${
                  creandoNuevoGrupo
                    ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <FolderPlus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Asociar a un nuevo tema de seguimiento</span>
              </button>
            </div>

            {creandoNuevoGrupo && (
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Nombre del nuevo tema o tratamiento:
                </label>
                <div className="flex gap-2 max-w-lg">
                  <input
                    type="text"
                    value={nuevoGrupoTema}
                    onChange={(e) => setNuevoGrupoTema(e.target.value)}
                    placeholder="Ej: Control Post-operatorio, Tratamiento Ortodoncia..."
                    className="flex-1 bg-white dark:bg-[#0F172A] px-4 py-2.5 rounded-xl border border-purple-300 dark:border-purple-700 outline-none focus:ring-2 focus:ring-purple-500/20 text-sm text-slate-800 dark:text-slate-200"
                    autoFocus
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. SELECCIÓN DE SERVICIO MÉDICO */}
      {servicios.length > 0 && (
        <div className="mb-6 bg-white dark:bg-[#1E293B] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Servicios y Tarifas del Especialista
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Selecciona el servicio médico que requieres para consultar su costo y agendar tu cita.
              </p>
            </div>
            {servicioSeleccionado && (
              <button
                type="button"
                onClick={() => {
                  setServicio(null);
                  setMotivo('');
                }}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline self-start sm:self-auto cursor-pointer"
              >
                Limpiar selección
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
            {servicios.map((s: ServicioMedicoCitaDto) => {
              const isSelected = servicioSeleccionado?.sypCodigo === s.sypCodigo;
              return (
                <button
                  key={s.sypCodigo}
                  type="button"
                  onClick={() => {
                    setServicio(s);
                    setMotivo(s.servicio);
                  }}
                  className={`text-left p-4 rounded-xl border-2 transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-900/30 shadow-md shadow-blue-600/10'
                      : 'border-slate-200 dark:border-slate-700/80 hover:border-blue-300 dark:hover:border-blue-600/50 bg-slate-50/50 dark:bg-[#0F172A] hover:shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`font-bold text-[14px] leading-tight ${isSelected ? 'text-blue-900 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                        {s.servicio}
                      </h4>
                      <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${isSelected ? 'bg-blue-600 text-white' : 'border border-slate-300 dark:border-slate-600'}`}>
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                      </div>
                    </div>
                    {s.observaciones && (
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1.5">
                        {s.observaciones}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-baseline justify-between">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      Sin IVA: Q{s.costoSinIva.toFixed(2)}
                    </span>
                    <span className="text-base font-black text-blue-600 dark:text-blue-400">
                      Q{s.costoTotal.toFixed(2)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. MODALITY TABS (No Heading) */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {modalidades.map((mod) => {
          const normalizedTipo = mod.modDescripcion.toLowerCase().includes('domicilio')
            ? 'domicilio'
            : mod.modDescripcion.toLowerCase() as any;
          const isSelected = modalidad === normalizedTipo;

          return (
            <label key={mod.modCodigo} className="cursor-pointer">
              <input
                type="radio"
                name="modality"
                value={normalizedTipo}
                checked={isSelected}
                onChange={() => setModalidad(normalizedTipo)}
                className="peer sr-only"
              />
              <div className={`flex items-center gap-2 px-6 py-3 transition-colors mb-[-1px] ${isSelected
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-500 rounded-t-lg'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1E293B] border-b-2 border-transparent'
                }`}>
                {getIcon(normalizedTipo, isSelected)}
                <span className={`text-sm font-semibold capitalize ${isSelected ? 'text-blue-900 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  {mod.modDescripcion}
                </span>
              </div>
            </label>
          )
        })}
      </div>

      {/* 3. COLUMNS CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 flex-grow min-h-[360px]">

        {/* Column 1: Ubicación */}
        {modalidad !== 'virtual' && (
          <div className="lg:col-span-4 flex flex-col space-y-4 pt-6 md:pt-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ubicación</h3>

            {modalidad === 'presencial' && (
              <div className="flex flex-col gap-3 h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                {loadingClinicas ? (
                  <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                ) : (
                  clinicas.map((clinica) => {
                    const isSelected = clinicaSeleccionada?.mclCodigo === clinica.mclCodigo;
                    return (
                      <button
                        key={clinica.mclCodigo}
                        onClick={() => setClinica(clinica)}
                        className={`text-left p-4 rounded-lg border transition-all shrink-0 ${isSelected
                          ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-600/50 dark:border-blue-500/50 shadow-sm'
                          : 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                      >
                        <h4 className={`font-semibold text-[15px] leading-tight ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                          {clinica.cliDescripcion}
                        </h4>
                        <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {clinica.cliDireccionCompleta}
                        </p>
                      </button>
                    )
                  })
                )}
              </div>
            )}

            {modalidad === 'domicilio' && (
              <div className="flex flex-col gap-3 h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                {loadingAreas ? (
                  <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                ) : (
                  areas.map((area) => {
                    const isSelected = areaDomicilio?.ladCodigo === area.ladCodigo;
                    return (
                      <button
                        key={area.ladCodigo}
                        onClick={() => setArea(area)}
                        className={`text-left p-4 rounded-lg border transition-all flex items-center justify-between shrink-0 ${isSelected
                          ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-600/50 dark:border-blue-500/50 shadow-sm'
                          : 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                      >
                        <span className="font-semibold text-[15px] text-slate-800 dark:text-slate-200">{area.municipio}</span>
                        {area.ladZonas && (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${isSelected ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                            Zonas: {area.ladZonas}
                          </span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Calendar and Time columns grouped inside a soft card */}
        <div className={`lg:col-span-8 bg-slate-50/50 dark:bg-[#0F172A] rounded-2xl p-4 sm:p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-16 border border-slate-100 dark:border-slate-800/50 ${modalidad === 'virtual' ? 'lg:col-span-12' : ''}`}>

          {!isScheduleEnabled ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl h-[320px] bg-white dark:bg-[#1E293B]">
              <CalendarDays className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[200px] text-center">
                Selecciona la {modalidad === 'presencial' ? 'clínica' : 'zona'} a la izquierda para cargar los horarios.
              </p>
            </div>
          ) : (
            <>
              {/* Column 2: Calendar */}
              <div className="flex-1 flex flex-col space-y-4 min-w-0 max-w-full overflow-x-auto">
                <h3 className={`text-lg font-bold text-slate-900 dark:text-white ${modalidad === 'virtual' ? 'text-center md:text-left md:pl-10 lg:pl-20' : ''}`}>Fecha</h3>
                <div className={`flex flex-col ${modalidad === 'virtual' ? 'items-center md:items-start md:pl-10 lg:pl-20' : 'items-center sm:items-start'}`}>
                  <DayPicker
                    mode="single"
                    selected={fecha || undefined}
                    onSelect={(d) => setFecha(d || null)}
                    locale={es}
                    disabled={disabledDays}
                    modifiers={{
                      citaTema: fechasTemaSeguimiento,
                    }}
                    modifiersClassNames={{
                      selected: 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 font-bold shadow-md rounded-xl',
                      today: 'font-bold text-blue-600 dark:text-blue-400',
                      citaTema: '!bg-emerald-100 dark:!bg-emerald-950/80 !text-emerald-800 dark:!text-emerald-200 !border-2 !border-emerald-500 font-black rounded-xl hover:!bg-emerald-200 dark:hover:!bg-emerald-900',
                    }}
                    classNames={{
                      day: 'p-0 text-[14px] sm:text-[15px] dark:text-slate-200',
                      day_button: 'h-9 w-9 sm:h-11 sm:w-11 font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all mx-auto flex items-center justify-center',
                      month_caption: 'flex justify-between pt-1 relative items-center mb-5 px-3',
                      caption_label: 'text-base font-bold capitalize text-slate-900 dark:text-white',
                      button_previous: 'h-8 w-8 flex items-center justify-center bg-white dark:bg-[#1E293B] shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded-full transition-colors text-slate-600 dark:text-slate-400',
                      button_next: 'h-8 w-8 flex items-center justify-center bg-white dark:bg-[#1E293B] shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded-full transition-colors text-slate-600 dark:text-slate-400',
                      month_grid: 'w-full border-collapse',
                      weekday: 'text-slate-400 dark:text-slate-500 font-medium text-xs sm:text-sm capitalize w-9 h-9 sm:w-11 sm:h-11',
                    }}
                  />

                  {fechasTemaSeguimiento.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 px-3 py-2 rounded-xl max-w-xs shadow-2xs">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>Días en verde: Citas programadas de este tema de seguimiento</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3: Time Slots */}
              <div className={`flex-1 flex flex-col space-y-4 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-8 md:pt-0 md:pl-8 lg:pl-12 ${modalidad === 'virtual' ? 'md:pr-10 lg:pr-20' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Horarios Disponibles</h3>
                </div>

                {/* Banner si la fecha tiene una cita agendada de este tema */}
                {horasTemaEnFecha.length > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5 shadow-2xs">
                    <FolderPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Cita de este tema ya agendada en esta fecha:</p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                        Horario reservado: <strong>{horasTemaEnFecha.join(', ')}</strong>. Este horario se encuentra bloqueado para evitar duplicados.
                      </p>
                    </div>
                  </div>
                )}

                {fecha ? (
                  availableTimeSlots.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 h-[320px] overflow-y-auto pr-2 custom-scrollbar content-start">
                      {availableTimeSlots.map(({ time: slot, disabled, isTemaSlot }) => {
                        const isSelected = hora === slot;

                        // Format to 12h AM/PM
                        const [h, m] = slot.split(':');
                        let hourNum = parseInt(h);
                        const ampm = hourNum >= 12 ? 'PM' : 'AM';
                        hourNum = hourNum % 12;
                        hourNum = hourNum ? hourNum : 12;
                        const displayTime = `${hourNum}:${m} ${ampm}`;

                        if (isTemaSlot) {
                          return (
                            <div
                              key={slot}
                              className="py-2.5 px-3 sm:px-4 border-2 border-emerald-500/80 bg-emerald-50/90 dark:bg-emerald-950/60 dark:border-emerald-600 rounded-xl text-left text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200 opacity-90 cursor-not-allowed shadow-xs flex flex-col justify-between"
                              title="Este horario ya está agendado para este tema de seguimiento"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span>{displayTime}</span>
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white px-1.5 py-0.5 rounded-md">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Agendada
                                </span>
                              </div>
                              <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 mt-0.5">
                                Cita de este seguimiento
                              </span>
                            </div>
                          );
                        }

                        return (
                          <label key={slot} className={`block shrink-0 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`} title={disabled ? "Horario no disponible" : ""}>
                            <input
                              type="radio"
                              name="time"
                              value={slot}
                              checked={isSelected}
                              onChange={() => !disabled && setHora(slot)}
                              disabled={disabled}
                              className="peer sr-only"
                            />
                            <div className={`py-3 px-3 sm:px-4 border rounded-xl text-left text-xs sm:text-sm font-semibold transition-all ${isSelected
                              ? 'border-blue-600/50 bg-blue-50/70 dark:bg-blue-900/30 dark:border-blue-500/50 text-slate-900 dark:text-white shadow-sm'
                              : disabled
                                ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#0B1120] text-slate-400 dark:text-slate-600'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              }`}>
                              {displayTime}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex flex-col items-center justify-center h-[200px] bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                      <Clock className="h-6 w-6 text-slate-300 dark:text-slate-600 mb-2" />
                      No hay horarios para esta fecha.
                    </div>
                  )
                ) : (
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex flex-col items-center justify-center h-[200px] bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <CalendarDays className="h-6 w-6 text-slate-300 dark:text-slate-600 mb-2" />
                    Selecciona una fecha en el calendario.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer Next Button ALWAYS VISIBLE BUT BLOCKED IF NOT COMPLETE */}
      <div className="sticky bottom-0 z-30 bg-transparent flex justify-end items-center py-4 border-t border-slate-200/60 dark:border-slate-800/40 mt-8">
        <button
          onClick={nextStep}
          disabled={!isComplete}
          className={`w-full sm:w-auto font-bold py-3.5 px-8 sm:px-10 rounded-xl transition-all flex items-center justify-center gap-2 ${isComplete
            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer'
            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-70'
            }`}
        >
          <span>Continuar al Siguiente Paso</span> <ArrowRight className="h-5 w-5" />
        </button>
      </div>

    </div>
  );
}
