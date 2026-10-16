import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
  useModalidades,
  useClinicas,
  useAreasDomicilio,
  useHorarios,
  useHorasOcupadas,
  useServiciosMedico,
  useGruposCita,
  usePacientesSeleccion,
  useAllCitasPacientes,
  useCreateGrupo,
} from '@/hooks/use-flujo-citas';
import { useColaDelDia } from '@/hooks/use-cola-dia';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { usePacienteTitular } from '@/hooks/use-pacientes';
import { useCitaStore } from '@/store/use-cita-store';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  User,
  RotateCcw,
  CheckCircle2,
  Flame,
  Users,
  ShieldCheck,
  Building2,
  Video,
  Home,
  MapPin,
  Clock,
  ArrowRight,
  Check,
  Loader2,
  Layers,
  CalendarClock,
  Stethoscope,
  X,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { HorarioCitaDto, ServicioMedicoCitaDto, GrupoCitaDto, CitaListDto } from '@/types/citas';
import { getDoctorLowestPrice, getDoctorGroupedServices } from '@/types/doctor';
import { NeoLoader } from '@/components/neo-loader';
import { ModalSolicitarCambio } from './ModalSolicitarCambio';
import { ModalMiCitaConflicto } from './ModalMiCitaConflicto';
import { DomicilioSelectorMap } from './DomicilioSelectorMap';

export function Step1Modalidad() {
  const {
    codMedico,
    modalidad,
    setModalidad,
    tipoConsulta,
    setTipoConsulta,
    setClinica,
    setArea,
    clinicaSeleccionada,
    areaDomicilio,
    servicioSeleccionado,
    setServicio,
    motivo,
    setMotivo,
    fecha,
    setFecha,
    hora,
    setHora,
    nextStep,
    step,
    pacienteSeleccionado,
    setPaciente,
    grupoId,
    grupoNombre,
    setTemaSeguimiento,
    tipoPagoId,
    setTipoPagoId,
    creandoNuevoGrupo,
    nuevoGrupoTema,
    setCreandoNuevoGrupo,
    setNuevoGrupoTema,
    solicitudIntercambio,
    setSolicitudIntercambio,
    pacientesExcluidos,
    setPacientesExcluidos,
    citasMultiples,
    addCitaMultiple,
    removeCitaMultiple,
    clearCitasMultiples,
    coberturaDomicilioValida,
    ubicacionDomicilioConfirmada,
  } = useCitaStore();

  const router = useRouter();

  const { data: modalidades = [], isLoading: loadingModalidades } = useModalidades(codMedico);
  const { data: clinicas = [], isLoading: loadingClinicas } = useClinicas(codMedico, modalidad);
  const { data: areas = [], isLoading: loadingAreas } = useAreasDomicilio(codMedico, modalidad);
  const { data: servicios = [], isLoading: loadingServicios } = useServiciosMedico(codMedico);

  const { data: doctor, isLoading: loadingDoctor } = useDoctorByCode(codMedico!);

  const { titular } = usePacienteTitular();
  const { data: pacientes = [] } = usePacientesSeleccion();
  const codigosPacientes = useMemo(() => pacientes.map((p) => p.pacCodigo), [pacientes]);
  const { data: misCitas = [] } = useAllCitasPacientes(codigosPacientes);

  // Modales de Tratamiento / Grupo
  const [modalCrearGrupoOpen, setModalCrearGrupoOpen] = useState(false);
  const [modalAsociarGrupoOpen, setModalAsociarGrupoOpen] = useState(false);

  // Inicializar paciente por defecto si aún no está en el store
  useEffect(() => {
    if (!pacienteSeleccionado) {
      const titularCodigo = (titular as any)?.pacCodigo || titular?.pac_codigo;
      const titularValido = titular && titularCodigo && !pacientesExcluidos?.includes(titularCodigo);

      if (titularValido) {
        setPaciente({
          pacCodigo: titularCodigo,
          nombreCompleto:
            (titular as any).nombreCompleto ||
            `${titular.pac_primer_nombre || ''} ${titular.pac_primer_apellido || ''}`.trim(),
          pacTitular: true,
          pacFechaNacimiento: (titular as any).pacFechaNacimiento || titular.pac_fecha_nacimiento || null,
          pacFotoPerfilUrl: (titular as any).pacFotoPerfilUrl || titular.pac_foto_perfil_url || undefined,
        });
      } else if (pacientes.length > 0) {
        const primerValido = pacientes.find((p) => !pacientesExcluidos?.includes(p.pacCodigo));
        if (primerValido) {
          setPaciente(primerValido);
        }
      }
    }
  }, [titular, pacientes, pacienteSeleccionado, pacientesExcluidos, setPaciente]);

  const codPacActivo =
    pacienteSeleccionado?.pacCodigo ||
    (titular as any)?.pacCodigo ||
    titular?.pac_codigo ||
    pacientes.find((p) => p.pacTitular)?.pacCodigo ||
    pacientes[0]?.pacCodigo ||
    null;

  const { data: grupos = [], isLoading: loadingGrupos } = useGruposCita(codPacActivo, codMedico);

  const queryClient = useQueryClient();
  const { mutateAsync: createGrupoMutation, isPending: isCreatingGrupo } = useCreateGrupo();

  const handleConfirmarNuevoGrupo = async () => {
    const tema = nuevoGrupoTema.trim();
    if (!tema) {
      toast.warning('Por favor ingresa un nombre para el nuevo tratamiento.');
      return;
    }

    if (codPacActivo && codMedico) {
      try {
        const res = await createGrupoMutation({
          codPaciente: codPacActivo,
          codMedico,
          tema,
          tituloTema: tema,
        });

        const createdId = (res as any)?.id || (res as any)?.grupoId || (typeof res === 'string' ? res : '');
        await queryClient.invalidateQueries({ queryKey: ['gruposCita', codPacActivo, codMedico] });

        setTemaSeguimiento(createdId || 'temp-' + Date.now(), tema);
        setCreandoNuevoGrupo(false);
        setModalCrearGrupoOpen(false);
        setNuevoGrupoTema('');
        toast.success(`Tratamiento "${tema}" creado y seleccionado.`);
      } catch (err: any) {
        console.error('Error al persistir nuevo grupo en API:', err);
        setTemaSeguimiento('temp-' + Date.now(), tema);
        setCreandoNuevoGrupo(false);
        setModalCrearGrupoOpen(false);
        toast.success(`Tratamiento "${tema}" asignado.`);
      }
    } else {
      setTemaSeguimiento('temp-' + Date.now(), tema);
      setCreandoNuevoGrupo(false);
      setModalCrearGrupoOpen(false);
      toast.success(`Tratamiento "${tema}" asignado.`);
    }
  };

  const gruposUnicos = useMemo<GrupoCitaDto[]>(() => {
    if (!grupos) return [];
    const map = new Map<string, GrupoCitaDto>();
    grupos.forEach((g: GrupoCitaDto) => {
      const key = (g.grupoId ? String(g.grupoId) : g.titulo || g.descripcion || '').toLowerCase();
      if (!map.has(key)) {
        map.set(key, g);
      }
    });
    return Array.from(map.values());
  }, [grupos]);

  // Deduplicación estricta case-insensitive de tipos de consulta
  const listaTiposConsulta = useMemo(() => {
    const tiposBase = [
      'Primera Vez',
      'Seguimiento',
      'Control',
      'Urgencia',
      'Interconsulta',
      'Chequeo preventivo',
    ];

    const map = new Map<string, string>();
    tiposBase.forEach((t) => map.set(t.toLowerCase().trim(), t));

    if (doctor?.tipos_consulta && doctor.tipos_consulta.length > 0) {
      doctor.tipos_consulta.forEach((tc) => {
        const val = tc.tipo_consulta?.trim();
        if (val) {
          const key = val.toLowerCase();
          if (!map.has(key)) {
            map.set(key, val);
          }
        }
      });
    }

    return Array.from(map.values());
  }, [doctor?.tipos_consulta]);

  const tiposConsultaConIconos = useMemo(() => {
    const mapIcon = (tipo: string) => {
      const t = tipo.toLowerCase();
      if (t.includes('primera')) return User;
      if (t.includes('seguimiento')) return RotateCcw;
      if (t.includes('control')) return CheckCircle2;
      if (t.includes('urgencia')) return Flame;
      if (t.includes('interconsulta')) return Users;
      if (t.includes('preventivo') || t.includes('chequeo')) return ShieldCheck;
      return Stethoscope;
    };

    return listaTiposConsulta.map((tipo) => ({
      tipo,
      Icon: mapIcon(tipo),
    }));
  }, [listaTiposConsulta]);

  useEffect(() => {
    if (!tipoConsulta) {
      setTipoConsulta('Primera Vez');
    }
  }, [tipoConsulta, setTipoConsulta]);

  // Selección automática de modalidad por defecto si no está seleccionada
  useEffect(() => {
    if (!modalidad && modalidades.length > 0) {
      const hasPresencial = modalidades.some((m) => m.modDescripcion.toLowerCase().includes('presencial'));
      setModalidad(hasPresencial ? 'presencial' : (modalidades[0].modDescripcion.toLowerCase() as any));
    }
  }, [modalidad, setModalidad, modalidades]);

  // Selección automática de clínica en modalidad presencial
  useEffect(() => {
    if (modalidad === 'presencial' && clinicas.length > 0 && !clinicaSeleccionada) {
      setClinica(clinicas[0]);
    }
  }, [modalidad, clinicas, clinicaSeleccionada, setClinica]);

  // Obtener grupos de servicios adaptados por ubicación y modalidad tal como en el perfil médico
  const locationServiceGroups = useMemo(() => {
    if (!doctor) return [];
    return getDoctorGroupedServices(doctor);
  }, [doctor]);

  // Filtrado y adaptación de servicios según la modalidad y ubicación seleccionada
  const serviciosFiltrados: ServicioMedicoCitaDto[] = useMemo(() => {
    // 1. Modalidad Presencial
    if (modalidad === 'presencial') {
      if (clinicaSeleccionada && locationServiceGroups.length > 0) {
        const cliName = (clinicaSeleccionada.cliDescripcion || '').toLowerCase().trim();
        const matchedGroup = locationServiceGroups.find(
          (g) =>
            g.type === 'clinica' &&
            (g.name.toLowerCase().trim() === cliName ||
              cliName.includes(g.name.toLowerCase().trim()) ||
              g.name.toLowerCase().trim().includes(cliName))
        );

        if (matchedGroup && matchedGroup.services.length > 0) {
          return matchedGroup.services.map((s, idx) => ({
            sypCodigo: s.syp_codigo || (idx + 1) * 100,
            servicio: s.servicio || 'Consulta Médica',
            costoSinIva: s.syp_costo_sin_iva ?? s.syp_costo_total ?? clinicaSeleccionada.mclPrecioBase ?? 250,
            costoIva: s.syp_costo_iva ?? 0,
            costoTotal: s.syp_costo_total ?? clinicaSeleccionada.mclPrecioBase ?? 250,
            observaciones: s.syp_observaciones || clinicaSeleccionada.cliDescripcion,
          }));
        }
      }

      // Fallback para modalidad presencial si no hay grupos adaptados
      const general = (servicios || []).filter((s) => {
        const nom = (s.servicio || '').toLowerCase();
        return !nom.includes('domicilio') && !nom.includes('virtual') && !nom.includes('videollamada');
      });
      const baseList = general.length > 0 ? general : servicios;
      if (clinicaSeleccionada?.mclPrecioBase) {
        const base = clinicaSeleccionada.mclPrecioBase;
        return baseList.map((s, idx) => {
          const isGeneral = idx === 0 || (s.servicio || '').toLowerCase().includes('consulta') || (s.servicio || '').toLowerCase().includes('rutina');
          const cost = isGeneral ? base : (s.costoTotal || base);
          return {
            ...s,
            costoSinIva: cost,
            costoTotal: cost,
          };
        });
      }
      return baseList;
    }

    // 2. Modalidad A Domicilio
    if (modalidad === 'domicilio') {
      const domGroup = locationServiceGroups.find((g) => g.type === 'domicilio');
      if (domGroup && domGroup.services.length > 0) {
        return domGroup.services.map((s, idx) => ({
          sypCodigo: s.syp_codigo || 9001 + idx,
          servicio: s.servicio || 'Consulta Médica a Domicilio',
          costoSinIva: s.syp_costo_sin_iva ?? s.syp_costo_total ?? domGroup.basePrice ?? 300,
          costoIva: s.syp_costo_iva ?? 0,
          costoTotal: s.syp_costo_total ?? domGroup.basePrice ?? 300,
          observaciones: s.syp_observaciones || 'Atención Médica a Domicilio',
        }));
      }

      const dom = (servicios || []).filter((s) => {
        const nom = (s.servicio || '').toLowerCase();
        const obs = (s.observaciones || '').toLowerCase();
        return nom.includes('domicilio') || obs.includes('domicilio');
      });
      if (dom.length > 0) return dom;

      const domBase = doctor?.atencion_domicilio?.[0]?.lad_precio_base || 300;
      return [
        {
          sypCodigo: 9001,
          servicio: 'Consulta Médica a Domicilio',
          costoSinIva: domBase,
          costoIva: 0,
          costoTotal: domBase,
          observaciones: 'Atención personalizada en tu domicilio',
        },
      ];
    }

    // 3. Modalidad Videoconsulta / Virtual
    if (modalidad === 'virtual') {
      const virt = (servicios || []).filter((s) => {
        const nom = (s.servicio || '').toLowerCase();
        const obs = (s.observaciones || '').toLowerCase();
        return (
          nom.includes('virtual') ||
          nom.includes('videoconsulta') ||
          nom.includes('en línea') ||
          nom.includes('online') ||
          obs.includes('virtual')
        );
      });
      if (virt.length > 0) return virt;

      const virtPrice = doctor ? (getDoctorLowestPrice(doctor) || 200) : 200;
      return [
        {
          sypCodigo: 8001,
          servicio: 'Videoconsulta Virtual',
          costoSinIva: virtPrice,
          costoIva: 0,
          costoTotal: virtPrice,
          observaciones: 'Telemedicina Encriptada',
        },
      ];
    }

    return servicios;
  }, [doctor, locationServiceGroups, servicios, modalidad, clinicaSeleccionada]);

  // Sincronización y revalidación automática del servicio seleccionado al cambiar sede o modalidad
  useEffect(() => {
    if (modalidad === 'virtual') {
      const virtualSrv =
        serviciosFiltrados.find(
          (s) =>
            (s.servicio || '').toLowerCase().includes('virtual') ||
            (s.servicio || '').toLowerCase().includes('videoconsulta')
        ) || serviciosFiltrados[0];

      if (virtualSrv) {
        if (
          !servicioSeleccionado ||
          servicioSeleccionado.sypCodigo !== virtualSrv.sypCodigo ||
          servicioSeleccionado.costoTotal !== virtualSrv.costoTotal
        ) {
          setServicio(virtualSrv);
          setMotivo(virtualSrv.servicio);
        }
      }
    } else if (serviciosFiltrados.length > 0) {
      // Buscar si el servicio previamente elegido existe en la nueva sede/modalidad
      const match = servicioSeleccionado
        ? serviciosFiltrados.find(
            (s) =>
              s.sypCodigo === servicioSeleccionado.sypCodigo ||
              s.servicio?.toLowerCase().trim() === servicioSeleccionado.servicio?.toLowerCase().trim()
          )
        : null;

      if (match) {
        // Si el precio o detalles difieren en esta nueva sede, sincronizar el precio
        if (
          servicioSeleccionado?.costoTotal !== match.costoTotal ||
          servicioSeleccionado?.sypCodigo !== match.sypCodigo
        ) {
          setServicio(match);
        }
      } else {
        // Si no existe para la nueva sede/modalidad, seleccionar el primero disponible
        setServicio(serviciosFiltrados[0]);
        setMotivo(serviciosFiltrados[0].servicio);
      }
    }
  }, [modalidad, clinicaSeleccionada, serviciosFiltrados, servicioSeleccionado, setServicio, setMotivo]);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    if (fecha) {
      return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [modalCambioOpen, setModalCambioOpen] = useState(false);
  const [slotParaCambio, setSlotParaCambio] = useState<{ raw: string; display: string } | null>(null);

  const [modalMiCitaOpen, setModalMiCitaOpen] = useState(false);
  const [citaConflictoSeleccionada, setCitaConflictoSeleccionada] = useState<{
    cita: CitaListDto;
    slotRaw: string;
    horaDisplay: string;
  } | null>(null);

  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Limpiar hora si ha transcurrido
  useEffect(() => {
    if (fecha) {
      const today = new Date(currentTime);
      today.setHours(0, 0, 0, 0);
      const f = new Date(fecha);
      f.setHours(0, 0, 0, 0);
      if (f < today) {
        if (hora) setHora(null);
      } else if (
        f.getFullYear() === currentTime.getFullYear() &&
        f.getMonth() === currentTime.getMonth() &&
        f.getDate() === currentTime.getDate() &&
        hora
      ) {
        const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
        const [hH, hM] = hora.split(':').map(Number);
        const selMinutes = (isNaN(hH) ? 0 : hH) * 60 + (isNaN(hM) ? 0 : hM);
        if (selMinutes <= currentMinutes) {
          setHora(null);
          toast.warning(`El horario de las ${hora} ya no se encuentra disponible.`);
        }
      }
    }
  }, [fecha, hora, currentTime, setHora]);

  const handleSelectTema = (g: GrupoCitaDto) => {
    const topicTitle = g.titulo || g.descripcion || 'Tratamiento';
    setTemaSeguimiento(g.grupoId, topicTitle);
    setCreandoNuevoGrupo(false);
    setModalCrearGrupoOpen(false);
    setModalAsociarGrupoOpen(false);
    setNuevoGrupoTema('');
    setFecha(null);
    setHora(null);

    if (g.modalidad && (g.modalidad === 'presencial' || g.modalidad === 'virtual' || g.modalidad === 'domicilio')) {
      setModalidad(g.modalidad as any);
    }

    if (motivo === g.titulo || motivo === g.descripcion || motivo === topicTitle) {
      setMotivo('');
    }

    if (g.codServicio && servicios.length > 0) {
      const matchServicio = servicios.find((s) => s.sypCodigo === g.codServicio);
      if (matchServicio) {
        setServicio(matchServicio);
      }
    } else if (servicios.length > 0 && !servicioSeleccionado) {
      setServicio(servicios[0]);
    }

    if (g.codMetodoPago) {
      setTipoPagoId(g.codMetodoPago);
    }

    if (g.consultorioId && clinicas.length > 0) {
      const matchClinica = clinicas.find(
        (c) => c.mclCodigo === g.consultorioId || (c as any).cliCodigo === g.consultorioId
      );
      if (matchClinica) {
        setClinica(matchClinica);
      }
    }
    toast.success(`Tratamiento "${topicTitle}" asociado.`);
  };

  const mclCodigo = modalidad === 'presencial' ? clinicaSeleccionada?.mclCodigo || null : 0;
  const { data: horariosClinica = [] } = useHorarios(mclCodigo);

  const fechaStr = fecha ? format(fecha, 'yyyy-MM-dd') : null;
  const { data: horasOcupadas = [] } = useHorasOcupadas(codMedico || null, fechaStr);
  const { data: colaDelDia = [] } = useColaDelDia(codMedico || null, fechaStr);

  const isLoading = loadingModalidades || loadingDoctor;

  const horarios = useMemo(() => {
    if (modalidad === 'presencial') {
      return horariosClinica;
    }
    if (!doctor) return [];

    const combined: HorarioCitaDto[] = [];
    doctor.clinicas?.forEach((c) => {
      c.horarios_atencion?.forEach((h) => {
        combined.push({
          horDiaSemana: h.hor_dia_semana,
          horHoraInicio: h.hor_hora_inicio,
          horHoraFin: h.hor_hora_fin,
        });
      });
    });
    return combined;
  }, [modalidad, horariosClinica, doctor]);

  const temaCitasList = useMemo(() => {
    if (!grupoId) return [];
    const g = gruposUnicos.find((item) => item.grupoId === grupoId);
    if (!g) return [];

    const list: { fechaStr: string; horaStr: string; citaId: string; dateObj: Date; isPast: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const processCita = (fechaRaw: any, horaRaw: any, citaId: string) => {
      if (!fechaRaw) return;
      const fStr = String(fechaRaw).split('T')[0];
      const [year, month, day] = fStr.split('-').map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day)) return;
      const dateObj = new Date(year, month - 1, day);
      dateObj.setHours(0, 0, 0, 0);

      list.push({
        fechaStr: fStr,
        horaStr: String(horaRaw || '').slice(0, 5),
        citaId: citaId || '',
        dateObj,
        isPast: dateObj < today,
      });
    };

    if (g.citas && g.citas.length > 0) {
      g.citas.forEach((c) => processCita(c.fecha, c.hora, c.citaId));
    } else if (g.fecha) {
      processCita(g.fecha, g.hora, g.citaId || '');
    }
    return list;
  }, [grupoId, gruposUnicos]);

  const fechasTemaSeguimiento = useMemo(() => temaCitasList.map((item) => item.dateObj), [temaCitasList]);

  const fechaSelectedStr = fecha ? format(fecha, 'yyyy-MM-dd') : null;
  const citasTemaEnFecha = useMemo(() => {
    if (!fechaSelectedStr) return [];
    return temaCitasList.filter((c) => c.fechaStr === fechaSelectedStr);
  }, [fechaSelectedStr, temaCitasList]);

  const horasTemaEnFecha = useMemo(() => citasTemaEnFecha.map((c) => c.horaStr), [citasTemaEnFecha]);

  const misCitasActivasEnFecha = useMemo(() => {
    if (!fechaSelectedStr || !misCitas.length) return [];
    return misCitas.filter((c) => {
      if (!c.ctaFecha) return false;
      const cFecha = c.ctaFecha.split('T')[0];
      if (cFecha !== fechaSelectedStr) return false;
      const estado = (c.ctaEstado || '').toLowerCase();
      return !['cancelada', 'rechazada'].includes(estado);
    });
  }, [fechaSelectedStr, misCitas]);

  const misHorasEnFecha = useMemo(() => {
    return misCitasActivasEnFecha
      .map((c) => (c.ctaHora ? String(c.ctaHora).slice(0, 5) : ''))
      .filter(Boolean);
  }, [misCitasActivasEnFecha]);

  const isCitaTemaDate = (date: Date) => {
    return fechasTemaSeguimiento.some(
      (d) =>
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate()
    );
  };

  const isPastDateSelected = useMemo(() => {
    if (!fecha) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sel = new Date(fecha);
    sel.setHours(0, 0, 0, 0);
    return sel < today;
  }, [fecha]);

  const isDayDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    if (isCitaTemaDate(d)) return false;
    if (d < today) return true;
    if (!horarios.length) return true;

    const allowedJsDays = new Set<number>();
    horarios.forEach((h) => {
      if (h.horDiaSemana === 7 || h.horDiaSemana === 0) {
        allowedJsDays.add(0);
      } else {
        allowedJsDays.add(h.horDiaSemana);
      }
    });

    return !allowedJsDays.has(d.getDay());
  };

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Lu = 0, ..., Do = 6

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: {
      date: Date;
      dayNum: number;
      isCurrentMonth: boolean;
    }[] = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const date = new Date(year, month - 1, d);
      date.setHours(0, 0, 0, 0);
      days.push({
        date,
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      date.setHours(0, 0, 0, 0);
      days.push({
        date,
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      date.setHours(0, 0, 0, 0);
      days.push({
        date,
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentMonth]);

  const availableTimeSlots = useMemo(() => {
    if (!fecha || isPastDateSelected) return [];

    const today = new Date(currentTime);
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(fecha);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) return [];

    const dayOfWeek = fecha.getDay();
    const horariosDia = horarios.filter((h) => {
      if (dayOfWeek === 0) return h.horDiaSemana === 0 || h.horDiaSemana === 7;
      return h.horDiaSemana === dayOfWeek;
    });

    const slots = new Set<string>();

    horariosDia.forEach((horarioDia) => {
      if (!horarioDia.horHoraInicio || !horarioDia.horHoraFin) return;
      const [startH, startM] = horarioDia.horHoraInicio.slice(0, 5).split(':').map(Number);
      const [endH, endM] = horarioDia.horHoraFin.slice(0, 5).split(':').map(Number);
      if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return;

      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;

      for (let m = startTotal; m < endTotal; m += 30) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(m % 60).padStart(2, '0');
        slots.add(`${hh}:${mm}`);
      }
    });

    horasTemaEnFecha.forEach((h) => slots.add(h));
    misHorasEnFecha.forEach((h) => slots.add(h));

    if (slots.size === 0) return [];

    const uniqueSlots = Array.from(slots).sort();

    const isToday =
      selectedDate.getFullYear() === currentTime.getFullYear() &&
      selectedDate.getMonth() === currentTime.getMonth() &&
      selectedDate.getDate() === currentTime.getDate();

    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    return uniqueSlots.map((slot) => {
      const slotWithSeconds = `${slot}:00`;
      const isTemaSlot = horasTemaEnFecha.includes(slot);
      const isMiCita = misHorasEnFecha.includes(slot);
      const isOwnSlot = isTemaSlot || isMiCita;

      const [slotH, slotM] = slot.split(':').map(Number);
      const slotMinutes = (isNaN(slotH) ? 0 : slotH) * 60 + (isNaN(slotM) ? 0 : slotM);
      const isPastHour = isToday && slotMinutes <= currentMinutes;

      const isOccupiedByOther = (horasOcupadas.includes(slotWithSeconds) || horasOcupadas.includes(slot)) && !isOwnSlot;
      const isBusy = isOccupiedByOther || isOwnSlot;

      const citaCola = colaDelDia.find((c) => {
        const cHora = c.ctaHora ? c.ctaHora.slice(0, 5) : '';
        return cHora === slot;
      });
      const estCitaCola = (citaCola?.ctaEstado || '').toLowerCase();
      const isConsultaIniciada =
        estCitaCola === 'en_proceso' || estCitaCola === 'en_consulta' || Boolean(citaCola?.esTurnoActual);
      const isConsultaFinalizada =
        estCitaCola === 'completada' ||
        estCitaCola === 'no_asistio' ||
        estCitaCola === 'cancelada' ||
        estCitaCola === 'rechazada';
      const isNoSolicitable = isConsultaIniciada || isConsultaFinalizada;

      const disabled = isPastHour || isBusy;

      return {
        time: slot,
        disabled,
        isTemaSlot,
        isMiCita,
        isOwnSlot,
        isPastHour,
        isOccupiedByOther,
        isConsultaIniciada,
        isConsultaFinalizada,
        isNoSolicitable,
      };
    });
  }, [fecha, isPastDateSelected, horarios, horasOcupadas, colaDelDia, horasTemaEnFecha, misHorasEnFecha, currentTime]);

  const isHoraValid = useMemo(() => {
    if (!hora || !fecha) return false;
    const isToday =
      fecha.getFullYear() === currentTime.getFullYear() &&
      fecha.getMonth() === currentTime.getMonth() &&
      fecha.getDate() === currentTime.getDate();
    if (isToday) {
      const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
      const [slotH, slotM] = hora.split(':').map(Number);
      const selMinutes = (isNaN(slotH) ? 0 : slotH) * 60 + (isNaN(slotM) ? 0 : slotM);
      return selMinutes > currentMinutes;
    }
    return true;
  }, [fecha, hora, currentTime]);

  const isScheduleEnabled =
    modalidad === 'virtual' ||
    (modalidad === 'presencial' && clinicaSeleccionada) ||
    (modalidad === 'domicilio' && coberturaDomicilioValida && ubicacionDomicilioConfirmada);

  const isMultiMode = !!(grupoId || creandoNuevoGrupo);
  const fechasCitasMultiples = useMemo(() => citasMultiples.map((c) => c.fecha), [citasMultiples]);

  const isDateValidForBooking = !!(fecha && !isPastDateSelected);
  const isComplete = isMultiMode
    ? isScheduleEnabled && citasMultiples.length > 0 && (!creandoNuevoGrupo || nuevoGrupoTema.trim().length > 0)
    : isScheduleEnabled && isDateValidForBooking && !!hora && isHoraValid;

  // Cálculo de total estimado
  const precioUnitario = useMemo(() => {
    if (servicioSeleccionado?.costoTotal) {
      return servicioSeleccionado.costoTotal;
    }
    if (modalidad === 'presencial' && clinicaSeleccionada?.mclPrecioBase) {
      return clinicaSeleccionada.mclPrecioBase;
    }
    if (doctor) {
      return getDoctorLowestPrice(doctor) || 150;
    }
    return 150;
  }, [servicioSeleccionado, modalidad, clinicaSeleccionada, doctor]);

  const precioTotal = useMemo(() => {
    if (isMultiMode && citasMultiples.length > 0) {
      return precioUnitario * citasMultiples.length;
    }
    return precioUnitario;
  }, [precioUnitario, isMultiMode, citasMultiples]);

  const precioEntero = Math.floor(precioTotal);
  const precioDecimal = (precioTotal % 1).toFixed(2).substring(2);

  const nombreServicioEstimado =
    modalidad === 'virtual'
      ? 'Videoconsulta Médica'
      : servicioSeleccionado?.servicio ||
        (modalidad === 'presencial' ? 'Consulta Presencial' : 'Consulta a Domicilio');

  if (isLoading) {
    return (
      <div className="py-12">
        <NeoLoader fullScreenPortal={false} />
      </div>
    );
  }

  const modalidadesDisplay = [
    { tipo: 'presencial' as const, label: 'Presencial', Icon: Building2 },
    { tipo: 'virtual' as const, label: 'Videoconsulta', Icon: Video },
    { tipo: 'domicilio' as const, label: 'A Domicilio', Icon: Home },
  ];

  return (
    <div className="relative w-full overflow-hidden font-sans pb-10">
      {/* Luces sutiles y decorativas de fondo */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-[#dce9ff]/40 dark:bg-blue-900/15 blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-10 w-80 h-80 rounded-full bg-[#cce5ff]/25 dark:bg-sky-900/15 blur-3xl pointer-events-none -z-10" />

      {/* Contenedor adaptado al ancho del header */}
      <div className="w-full flex flex-col space-y-10">
        {/* ========================================== */}
        {/* 1. SECCIÓN AGRUPACIÓN                       */}
        {/* ========================================== */}
        <section className="flex flex-col space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Agrupación
          </span>

          <div className="grid grid-cols-3 gap-3 bg-[#eff4ff] dark:bg-slate-800/60 p-1.5 rounded-2xl">
            {/* Individual */}
            <button
              type="button"
              onClick={() => {
                setTemaSeguimiento(null, null);
                setCreandoNuevoGrupo(false);
                setNuevoGrupoTema('');
                clearCitasMultiples();
              }}
              className={`group relative flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-200 cursor-pointer ${
                !grupoId && !creandoNuevoGrupo
                  ? 'bg-white dark:bg-slate-900 text-[#0b1c30] dark:text-white shadow-[0_2px_12px_rgba(11,28,48,0.04)] font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {!grupoId && !creandoNuevoGrupo && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#006194]"></span>
              )}
              <span className="text-sm">Individual</span>
            </button>

            {/* Asociar Tratamiento */}
            <button
              type="button"
              onClick={() => {
                setCreandoNuevoGrupo(false);
                if (gruposUnicos.length === 0) {
                  toast.info('No tienes tratamientos previos con este especialista. Puedes crear uno nuevo.');
                  setModalCrearGrupoOpen(true);
                } else if (gruposUnicos.length === 1) {
                  handleSelectTema(gruposUnicos[0]);
                } else {
                  setModalAsociarGrupoOpen(true);
                }
              }}
              className={`group relative flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-200 cursor-pointer ${
                grupoId && !creandoNuevoGrupo
                  ? 'bg-white dark:bg-slate-900 text-[#0b1c30] dark:text-white shadow-[0_2px_12px_rgba(11,28,48,0.04)] font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {grupoId && !creandoNuevoGrupo && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#006194]"></span>
              )}
              <span className="text-sm">
                Asociar Tratamiento {gruposUnicos.length > 0 ? `(${gruposUnicos.length})` : ''}
              </span>
            </button>

            {/* Nuevo Grupo */}
            <button
              type="button"
              onClick={() => {
                setCreandoNuevoGrupo(true);
                setModalCrearGrupoOpen(true);
              }}
              className={`group relative flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl transition-all duration-200 cursor-pointer ${
                creandoNuevoGrupo
                  ? 'bg-white dark:bg-slate-900 text-[#006194] dark:text-sky-400 shadow-[0_2px_12px_rgba(11,28,48,0.04)] font-medium'
                  : 'text-[#006194] dark:text-sky-400 hover:bg-white/50 dark:hover:bg-slate-900/50 font-medium'
              }`}
            >
              <span className="text-base font-semibold leading-none">+</span>
              <span className="text-sm">Nuevo Grupo</span>
            </button>
          </div>

          {/* Tarjeta de Tratamiento Activo */}
          {grupoId && !creandoNuevoGrupo && (
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_2px_12px_rgba(11,28,48,0.04)] animate-in fade-in">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#e5eeff] dark:bg-slate-800 text-[#006194] dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Tratamiento Asociado
                  </span>
                  <p className="text-sm font-semibold text-[#0b1c30] dark:text-white truncate">
                    {grupoNombre || 'Tratamiento seleccionado'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
                {gruposUnicos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setModalAsociarGrupoOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#006194] dark:text-sky-400 text-xs font-semibold cursor-pointer transition"
                  >
                    Cambiar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setTemaSeguimiento(null, null);
                    clearCitasMultiples();
                    toast.info('Se desasoció el tratamiento.');
                  }}
                  className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                  title="Quitar asociación"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ========================================== */}
        {/* 2. SECCIÓN TIPO DE CONSULTA                 */}
        {/* ========================================== */}
        <section className="flex flex-col space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Tipo de Consulta
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {tiposConsultaConIconos.map(({ tipo, Icon }) => {
              const isSelected = (tipoConsulta || 'Primera Vez').toLowerCase() === tipo.toLowerCase();
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setTipoConsulta(tipo)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-left transition-all duration-200 group cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 shadow-[0_2px_12px_rgba(11,28,48,0.04)] ring-1 ring-[#006194]/20'
                      : 'bg-[#eff4ff]/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all group-hover:scale-105 shrink-0 ${
                        isSelected
                          ? 'bg-[#e5eeff] dark:bg-slate-800 text-[#006194] dark:text-sky-400'
                          : 'bg-[#e5eeff]/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 group-hover:text-[#006194]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-sm font-semibold truncate ${
                        isSelected
                          ? 'text-[#0b1c30] dark:text-white'
                          : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                      }`}
                    >
                      {tipo}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006194] shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ========================================== */}
        {/* 3. SECCIÓN MODALIDAD & SERVICIOS / UBICACIÓN */}
        {/* ========================================== */}
        <section className="flex flex-col space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Modalidad
          </span>
          <div className="grid grid-cols-3 gap-3">
            {modalidadesDisplay.map(({ tipo, label, Icon }) => {
              const isSelected = modalidad === tipo;
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setModalidad(tipo)}
                  className={`relative flex flex-col items-center justify-center gap-3 p-5 rounded-2xl transition-all duration-200 cursor-pointer group ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 shadow-[0_2px_12px_rgba(11,28,48,0.04)] ring-1 ring-[#006194]/20'
                      : 'bg-[#eff4ff]/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-900'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#cce5ff]/30 dark:bg-sky-950/60 text-[#006194] dark:text-sky-400'
                        : 'bg-[#dce9ff]/40 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-[#006194] group-hover:bg-[#cce5ff]/30'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      isSelected
                        ? 'text-[#0b1c30] dark:text-white'
                        : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                    }`}
                  >
                    {label}
                  </span>
                  {isSelected && (
                    <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-[#006194]" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 3.1 SI ES PRESENCIAL: 1° Sede Médica, 2° Servicios asociados a la sede */}
        {modalidad === 'presencial' && (
          <>
            <section className="flex flex-col space-y-3 animate-in fade-in duration-200">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Sede Médica
              </span>
              {loadingClinicas ? (
                <div className="h-20 animate-pulse rounded-2xl bg-[#eff4ff] dark:bg-slate-800" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {clinicas.map((clinica) => {
                    const isSelected = clinicaSeleccionada?.mclCodigo === clinica.mclCodigo;
                    return (
                      <button
                        key={clinica.mclCodigo}
                        type="button"
                        onClick={() => setClinica(clinica)}
                        className={`flex items-center justify-between p-4 rounded-2xl text-left transition-all cursor-pointer group ${
                          isSelected
                            ? 'bg-white dark:bg-slate-900 shadow-[0_2px_12px_rgba(11,28,48,0.04)] ring-1 ring-[#006194]/20'
                            : 'bg-[#eff4ff]/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-[#e5eeff] dark:bg-slate-800 text-[#006194] dark:text-sky-400'
                                : 'bg-[#e5eeff]/80 dark:bg-slate-800/80 text-slate-500 group-hover:text-[#006194]'
                            }`}
                          >
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`text-sm font-semibold truncate ${
                                isSelected ? 'text-[#0b1c30] dark:text-white' : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {clinica.cliDescripcion}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {clinica.cliDireccionCompleta}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-[#006194] shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Servicios asociados a la sede médica */}
            {serviciosFiltrados.length > 0 && (
              <section className="flex flex-col space-y-3 animate-in fade-in duration-200">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Servicio
                </span>
                <div className="flex flex-col space-y-2.5">
                  {serviciosFiltrados.map((s) => {
                    const isSelected = servicioSeleccionado?.sypCodigo === s.sypCodigo;
                    return (
                      <div
                        key={s.sypCodigo}
                        onClick={() => {
                          setServicio(s);
                          setMotivo(s.servicio);
                        }}
                        className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-white dark:bg-slate-900 shadow-[0_2px_14px_rgba(11,28,48,0.05)] ring-1 ring-[#006194]/20'
                            : 'bg-[#eff4ff]/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isSelected ? 'bg-[#006194]' : 'bg-transparent'
                            }`}
                          />
                          <span
                            className={`text-base font-semibold truncate ${
                              isSelected ? 'text-[#0b1c30] dark:text-white' : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {s.servicio}
                          </span>
                        </div>
                        <div className="flex items-center gap-6 shrink-0 ml-4">
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            45 min
                          </span>
                          <span
                            className={`text-base font-semibold ${
                              isSelected ? 'text-[#0b1c30] dark:text-white' : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            Q{s.costoTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* 3.2 MODALIDAD VIRTUAL: solo precio y chequeo general sin lista compleja de procedimientos */}
        {modalidad === 'virtual' && (
          <section className="flex flex-col space-y-3 animate-in fade-in duration-200">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Servicio
            </span>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-[0_2px_14px_rgba(11,28,48,0.05)] ring-1 ring-[#006194]/20 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-[#006194] shrink-0" />
                <div className="min-w-0">
                  <span className="text-base font-semibold text-[#0b1c30] dark:text-white block truncate">
                    Videoconsulta Médica
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    Chequeo y consulta online por videollamada segura
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 shrink-0 ml-4">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  30 min
                </span>
                <span className="text-base font-semibold text-[#0b1c30] dark:text-white">
                  Q{precioUnitario.toFixed(2)}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* 3.3 MODALIDAD A DOMICILIO: primero servicios asociados, después selección de ubicación */}
        {modalidad === 'domicilio' && (
          <>
            {serviciosFiltrados.length > 0 && (
              <section className="flex flex-col space-y-3 animate-in fade-in duration-200">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Servicio
                </span>
                <div className="flex flex-col space-y-2.5">
                  {serviciosFiltrados.map((s) => {
                    const isSelected = servicioSeleccionado?.sypCodigo === s.sypCodigo;
                    return (
                      <div
                        key={s.sypCodigo}
                        onClick={() => {
                          setServicio(s);
                          setMotivo(s.servicio);
                        }}
                        className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-white dark:bg-slate-900 shadow-[0_2px_14px_rgba(11,28,48,0.05)] ring-1 ring-[#006194]/20'
                            : 'bg-[#eff4ff]/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isSelected ? 'bg-[#006194]' : 'bg-transparent'
                            }`}
                          />
                          <span
                            className={`text-base font-semibold truncate ${
                              isSelected ? 'text-[#0b1c30] dark:text-white' : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {s.servicio}
                          </span>
                        </div>
                        <div className="flex items-center gap-6 shrink-0 ml-4">
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            60 min
                          </span>
                          <span
                            className={`text-base font-semibold ${
                              isSelected ? 'text-[#0b1c30] dark:text-white' : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            Q{s.costoTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Selección de Ubicación a Domicilio con el mismo estilo */}
            <section className="flex flex-col space-y-3 animate-in fade-in duration-200">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Ubicación de Atención a Domicilio
              </span>
              <DomicilioSelectorMap doctor={doctor} areas={areas} />
            </section>
          </>
        )}

        {/* ========================================== */}
        {/* 4. SECCIÓN FECHA Y HORARIO                  */}
        {/* ========================================== */}
        <section className="flex flex-col space-y-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Fecha y Horario
          </span>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#eff4ff]/50 dark:bg-slate-900/40 p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/60">
            {/* Columna Izquierda: Calendario (7 cols) */}
            <div className="lg:col-span-7 flex flex-col space-y-3">
              {/* Controles de cambio de mes directamente arriba del calendario */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <button
                    aria-label="Mes anterior"
                    type="button"
                    onClick={() =>
                      setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                    }
                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-semibold text-[#006194] dark:text-sky-400 capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: es })}
                  </span>
                  <button
                    aria-label="Mes siguiente"
                    type="button"
                    onClick={() =>
                      setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                    }
                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-1">
                <span>Lu</span>
                <span>Ma</span>
                <span>Mi</span>
                <span>Ju</span>
                <span>Vi</span>
                <span>Sá</span>
                <span>Do</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 text-center text-xs sm:text-sm">
                {calendarDays.map(({ date, dayNum, isCurrentMonth }, idx) => {
                  const isSelected =
                    fecha &&
                    fecha.getFullYear() === date.getFullYear() &&
                    fecha.getMonth() === date.getMonth() &&
                    fecha.getDate() === date.getDate();
                  const disabled = !isCurrentMonth || isDayDisabled(date);
                  const isTema = isCitaTemaDate(date);
                  const isMulti = fechasCitasMultiples.some(
                    (d) =>
                      d.getFullYear() === date.getFullYear() &&
                      d.getMonth() === date.getMonth() &&
                      d.getDate() === date.getDate()
                  );

                  if (!isCurrentMonth) {
                    return (
                      <span
                        key={idx}
                        className="py-2 rounded-xl text-slate-400/70 dark:text-slate-600 opacity-40 select-none"
                      >
                        {dayNum}
                      </span>
                    );
                  }

                  if (isSelected) {
                    return (
                      <button
                        key={idx}
                        type="button"
                        className="py-2 rounded-xl bg-white dark:bg-slate-800 text-[#0b1c30] dark:text-white shadow-[0_2px_8px_rgba(11,28,48,0.06)] font-semibold flex flex-col items-center justify-center relative cursor-pointer"
                      >
                        <span>{dayNum}</span>
                        <span className="w-1 h-1 rounded-full bg-[#006194] mt-0.5" />
                      </button>
                    );
                  }

                  if (isTema) {
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFecha(date);
                          setHora(null);
                        }}
                        className="py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-400 font-bold flex flex-col items-center justify-center relative cursor-pointer"
                        title="Cita agendada para este tratamiento"
                      >
                        <span>{dayNum}</span>
                        <span className="w-1 h-1 rounded-full bg-emerald-600 mt-0.5" />
                      </button>
                    );
                  }

                  if (isMulti) {
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFecha(date);
                          setHora(null);
                        }}
                        className="py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-400 font-bold flex flex-col items-center justify-center relative cursor-pointer"
                      >
                        <span>{dayNum}</span>
                        <span className="w-1 h-1 rounded-full bg-indigo-600 mt-0.5" />
                      </button>
                    );
                  }

                  if (disabled) {
                    return (
                      <span
                        key={idx}
                        className="py-2 rounded-xl text-slate-300 dark:text-slate-700 cursor-not-allowed select-none"
                      >
                        {dayNum}
                      </span>
                    );
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFecha(date);
                        setHora(null);
                      }}
                      className="py-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-[#0b1c30] dark:text-slate-200 cursor-pointer transition-colors"
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Columna Derecha: Slots de Horario (5 cols) */}
            <div className="lg:col-span-5 flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs sm:text-sm font-semibold text-[#0b1c30] dark:text-white capitalize">
                  {fecha ? format(fecha, 'EEEE d MMM', { locale: es }) : 'Selecciona fecha'}
                </span>
                <span className="text-xs font-medium text-[#006194] dark:text-sky-400">
                  {availableTimeSlots.filter((s) => !s.disabled && !s.isOccupiedByOther).length} cupos
                </span>
              </div>

              {fecha ? (
                availableTimeSlots.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {availableTimeSlots.map(
                      ({
                        time: slot,
                        disabled,
                        isTemaSlot,
                        isMiCita,
                        isPastHour,
                        isOccupiedByOther,
                        isNoSolicitable,
                      }) => {
                        const isSelected = isMultiMode
                          ? fecha &&
                            citasMultiples.some(
                              (c) =>
                                c.fecha.toDateString() === fecha.toDateString() &&
                                c.hora.substring(0, 5) === slot.substring(0, 5)
                            )
                          : hora === slot;

                        const [h, m] = slot.split(':');
                        let hourNum = parseInt(h);
                        const ampm = hourNum >= 12 ? 'PM' : 'AM';
                        hourNum = hourNum % 12 || 12;
                        const displayTime = `${String(hourNum).padStart(2, '0')}:${m} ${ampm}`;

                        if (isTemaSlot) {
                          return (
                            <div
                              key={slot}
                              className="py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 text-emerald-800 dark:text-emerald-200 text-xs font-bold text-center"
                            >
                              {displayTime} · Agendada
                            </div>
                          );
                        }

                        if (isMiCita) {
                          const citaConflicto = misCitasActivasEnFecha.find((c) => {
                            const cHora = c.ctaHora ? String(c.ctaHora).slice(0, 5) : '';
                            return cHora === slot;
                          });
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => {
                                if (citaConflicto) {
                                  setCitaConflictoSeleccionada({
                                    cita: citaConflicto,
                                    slotRaw: slot,
                                    horaDisplay: displayTime,
                                  });
                                  setModalMiCitaOpen(true);
                                }
                              }}
                              className="py-2.5 px-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-300 text-sky-900 dark:text-sky-200 text-xs font-bold text-center cursor-pointer hover:bg-sky-100"
                              title="Tienes una cita a esta hora"
                            >
                              {displayTime} · Tu cita
                            </button>
                          );
                        }

                        if (isOccupiedByOther && !isPastHour) {
                          if (isNoSolicitable) {
                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled
                                className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-400 text-xs font-medium text-center cursor-not-allowed"
                              >
                                {displayTime}
                              </button>
                            );
                          }
                          const isSolicitado =
                            solicitudIntercambio?.hora === slot &&
                            fecha &&
                            solicitudIntercambio.fecha === format(fecha, 'yyyy-MM-dd');

                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => {
                                setSlotParaCambio({ raw: slot, display: displayTime });
                                setModalCambioOpen(true);
                              }}
                              className={`py-2.5 px-3 rounded-xl text-xs font-medium text-center transition-all cursor-pointer ${
                                isSolicitado
                                  ? 'bg-orange-500 text-white shadow-xs'
                                  : 'bg-orange-50 dark:bg-orange-950/40 border border-orange-300 text-orange-900 dark:text-orange-200 hover:bg-orange-100'
                              }`}
                              title="Horario ocupado · Solicitar cambio"
                            >
                              {displayTime}
                            </button>
                          );
                        }

                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              if (disabled) return;
                              if (isMultiMode) {
                                if (!fecha) return;
                                const existing = citasMultiples.find(
                                  (c) =>
                                    c.fecha.toDateString() === fecha.toDateString() &&
                                    c.hora.substring(0, 5) === slot.substring(0, 5)
                                );
                                if (existing) {
                                  removeCitaMultiple(existing.id);
                                  toast.info('Cita removida del grupo');
                                } else {
                                  if (citasMultiples.length >= 5) {
                                    toast.warning('Máximo 5 citas por grupo');
                                    return;
                                  }
                                  const ok = addCitaMultiple(fecha, slot);
                                  if (ok) toast.success(`Cita agregada (${citasMultiples.length + 1}/5)`);
                                }
                              } else {
                                setHora(slot);
                                setPacientesExcluidos([]);
                              }
                            }}
                            className={`py-2.5 px-3 rounded-xl font-medium text-xs sm:text-sm text-center transition-all ${
                              disabled
                                ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 cursor-not-allowed select-none'
                                : isSelected
                                ? 'bg-[#006194] text-white shadow-[0_4px_16px_rgba(0,97,148,0.25)] font-semibold cursor-pointer'
                                : 'bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer shadow-xs'
                            }`}
                          >
                            {displayTime}
                          </button>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-center p-4 text-slate-400">
                    <Clock className="w-8 h-8 mb-1.5 opacity-50" />
                    <span className="text-xs">No hay cupos disponibles para esta fecha.</span>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-center p-4 text-slate-400">
                  <CalendarClock className="w-8 h-8 mb-1.5 opacity-50" />
                  <span className="text-xs">Selecciona un día en el calendario.</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Panel de Citas Múltiples si está en modo multi-cita */}
        {isMultiMode && citasMultiples.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#006194]" />
                <span className="text-sm font-semibold text-[#0b1c30] dark:text-white">
                  Citas en este tratamiento ({citasMultiples.length}/5)
                </span>
              </div>
              <button
                type="button"
                onClick={clearCitasMultiples}
                className="text-xs text-rose-500 hover:underline cursor-pointer"
              >
                Limpiar todas
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {citasMultiples.map((c, idx) => {
                const [h, m] = c.hora.split(':');
                let hourNum = parseInt(h);
                const ampm = hourNum >= 12 ? 'PM' : 'AM';
                hourNum = hourNum % 12 || 12;
                const displayTime = `${String(hourNum).padStart(2, '0')}:${m} ${ampm}`;
                const displayDate = format(c.fecha, "EEEE d 'de' MMMM", { locale: es });

                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#eff4ff]/40 dark:bg-slate-800/40 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-5 h-5 rounded-md bg-[#006194] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize truncate">
                          {displayDate}
                        </p>
                        <p className="text-[11px] text-[#006194] dark:text-sky-400 font-medium">
                          {displayTime}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCitaMultiple(c.id)}
                      className="text-slate-400 hover:text-rose-500 px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* 5. CARD RESUMEN: TOTAL ESTIMADO Y BOTÓN     */}
        {/* ========================================== */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-[0_4px_28px_rgba(11,28,48,0.06)] flex flex-col sm:flex-row items-center justify-between gap-6 border border-slate-100 dark:border-slate-800">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Estimado
              </span>
              <span className="text-xs text-[#006c4a] dark:text-emerald-400 font-medium">
                · {nombreServicioEstimado}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#0b1c30] dark:text-white">
                Q{precioEntero}
              </span>
              <span className="text-base font-medium text-slate-500 dark:text-slate-400">
                .{precioDecimal}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
                (Cancelación sin cargo hasta 24h antes)
              </span>
            </div>
          </div>
          <div className="w-full sm:w-auto flex items-center">
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
                nextStep();
              }}
              disabled={!isComplete}
              className={`w-full sm:w-auto px-8 h-12 rounded-xl text-sm font-semibold tracking-wide shadow-[0_4px_16px_rgba(0,97,148,0.22)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 ${
                isComplete
                  ? 'bg-[#006194] hover:bg-[#007bb9] text-white cursor-pointer'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              <span>Continuar a Paciente</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL MINIMALISTA: CREAR NUEVO TRATAMIENTO */}
      {/* ========================================== */}
      {modalCrearGrupoOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => {
            setModalCrearGrupoOpen(false);
            setCreandoNuevoGrupo(false);
            setNuevoGrupoTema('');
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-[0_8px_32px_rgba(11,28,48,0.14)] border border-slate-100 dark:border-slate-800 animate-in zoom-in-[0.98] duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#e5eeff] dark:bg-slate-800 text-[#006194] dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0b1c30] dark:text-white">
                    Nuevo Tratamiento
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Crea un grupo de citas para este seguimiento
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalCrearGrupoOpen(false);
                  setCreandoNuevoGrupo(false);
                  setNuevoGrupoTema('');
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Nombre del Tratamiento o Seguimiento
                </label>
                <input
                  type="text"
                  value={nuevoGrupoTema}
                  onChange={(e) => setNuevoGrupoTema(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirmarNuevoGrupo();
                    }
                  }}
                  placeholder="Ej. Control Rodilla, Ortodoncia, Terapia..."
                  className="w-full bg-[#eff4ff]/60 dark:bg-slate-800/40 px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-sm font-medium text-[#0b1c30] dark:text-white outline-none focus:ring-2 focus:ring-[#006194]/20 focus:border-[#006194] transition"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                  Podrás agendar múltiples citas asociadas a este tratamiento con el especialista.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalCrearGrupoOpen(false);
                    setCreandoNuevoGrupo(false);
                    setNuevoGrupoTema('');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isCreatingGrupo || !nuevoGrupoTema.trim()}
                  onClick={handleConfirmarNuevoGrupo}
                  className="px-5 py-2.5 rounded-xl bg-[#006194] hover:bg-[#007bb9] text-white text-xs font-semibold shadow-[0_4px_16px_rgba(0,97,148,0.22)] disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isCreatingGrupo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Crear Tratamiento</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL MINIMALISTA: ASOCIAR TRATAMIENTO     */}
      {/* ========================================== */}
      {modalAsociarGrupoOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setModalAsociarGrupoOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-[0_8px_32px_rgba(11,28,48,0.14)] border border-slate-100 dark:border-slate-800 animate-in zoom-in-[0.98] duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#e5eeff] dark:bg-slate-800 text-[#006194] dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0b1c30] dark:text-white">
                    Asociar a un Tratamiento
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Selecciona un tratamiento existente con este médico
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAsociarGrupoOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar my-4">
              {gruposUnicos.map((g) => {
                const isSelected = grupoId === g.grupoId;
                const topicTitle = g.titulo || g.descripcion || 'Tratamiento';
                return (
                  <button
                    key={g.grupoId}
                    type="button"
                    onClick={() => handleSelectTema(g)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'border-[#006194] bg-[#eff4ff] dark:bg-slate-800 text-[#006194] dark:text-sky-300 ring-1 ring-[#006194]/20'
                        : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0b1c30] dark:text-white truncate">
                        {topicTitle}
                      </p>
                      {g.modalidad && (
                        <span className="text-[11px] text-slate-400 capitalize">
                          Modalidad: {g.modalidad}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-[#006194] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setModalAsociarGrupoOpen(false);
                  setCreandoNuevoGrupo(true);
                  setModalCrearGrupoOpen(true);
                }}
                className="text-xs text-[#006194] dark:text-sky-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear nuevo tratamiento</span>
              </button>

              <button
                type="button"
                onClick={() => setModalAsociarGrupoOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales de Intercambio y Conflicto */}
      {modalCambioOpen && slotParaCambio && fecha && (
        <ModalSolicitarCambio
          isOpen={modalCambioOpen}
          onClose={() => setModalCambioOpen(false)}
          fechaTexto={format(fecha, "EEEE d 'de' MMMM, yyyy", { locale: es })}
          horaDisplay={slotParaCambio.display}
          slotRaw={slotParaCambio.raw}
          medicoNombre={doctor ? `${doctor.exp_primer_nom || ''} ${doctor.exp_primer_ape || ''}`.trim() : ''}
          onConfirmar={(slot, mensaje) => {
            setSolicitudIntercambio({
              fecha: format(fecha, 'yyyy-MM-dd'),
              hora: slot,
              mensaje: mensaje || undefined,
            });
          }}
        />
      )}

      {modalMiCitaOpen && citaConflictoSeleccionada && (
        <ModalMiCitaConflicto
          isOpen={modalMiCitaOpen}
          onClose={() => {
            setModalMiCitaOpen(false);
            setCitaConflictoSeleccionada(null);
          }}
          citaConflicto={citaConflictoSeleccionada.cita}
          horaDisplay={citaConflictoSeleccionada.horaDisplay}
          slotRaw={citaConflictoSeleccionada.slotRaw}
          codMedicoActual={codMedico || ''}
          onAgendarDeTodosModos={(slotRaw, pacCodExcluido) => {
            if (isMultiMode && fecha) {
              if (citasMultiples.length >= 5) {
                toast.warning('Máximo 5 citas por grupo');
                return;
              }
              const ok = addCitaMultiple(fecha, slotRaw);
              if (ok) toast.success(`Cita agregada (${citasMultiples.length + 1}/5)`);
            } else {
              setHora(slotRaw);
            }
            if (pacCodExcluido) {
              setPacientesExcluidos([pacCodExcluido]);
            }
          }}
        />
      )}
    </div>
  );
}
