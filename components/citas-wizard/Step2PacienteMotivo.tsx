'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { usePacientesSeleccion } from '@/hooks/use-flujo-citas';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { useCitaStore } from '@/store/use-cita-store';
import {
  ChevronLeft,
  ArrowRight,
  ShieldCheck,
  Check,
  UploadCloud,
  FileText,
  X,
  Users,
  User,
  Eye,
  AlertCircle,
  UserPlus,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePacienteTitular, usePacientesByUsuario } from '@/hooks/use-pacientes';
import type { PacienteSeleccionDto } from '@/types/citas';
import { getDoctorLowestPrice } from '@/types';
import { PacienteFormModal } from '@/components/paciente-form-modal';
import { NeoLoader } from '@/components/neo-loader';
import { toast } from 'sonner';
import { compressImageFile, formatBytes } from '@/utils/image-compression';

const MAX_ARCHIVOS = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB individual
const MAX_TOTAL_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB acumulado total por cita

export function Step2PacienteMotivo() {
  const router = useRouter();
  const {
    codMedico,
    modalidad,
    clinicaSeleccionada,
    servicioSeleccionado,
    fecha,
    hora,
    pacienteSeleccionado,
    setPaciente,
    motivo,
    setMotivo,
    grupoNombre,
    grupoId,
    creandoNuevoGrupo,
    citasMultiples,
    pacienteModoCita,
    setPacienteModoCita,
    setPacienteCitaMultiple,
    archivos,
    setArchivos,
    direccionDomicilio,
    setDireccionDomicilio,
    referenciasDomicilio,
    setReferenciasDomicilio,
    municipioDomicilio,
    zonaDomicilio,
    pacientesExcluidos,
    prevStep,
    nextStep,
  } = useCitaStore();

  const [isAddPacienteOpen, setIsAddPacienteOpen] = useState(false);

  const { titular, isLoading: loadingTitular } = usePacienteTitular();
  const { data: pacientesUsuario = [], isLoading: loadingPacientesUsuario } = usePacientesByUsuario();
  const { data: pacientesSeleccion = [], isLoading: loadingPacientesSeleccion } = usePacientesSeleccion();
  const { data: doctor, isLoading: loadingDoctor } = useDoctorByCode(codMedico!);

  // Consolidar pacientes disponibles (titular + familiares activos)
  const pacientesDisponibles = useMemo(() => {
    const list: PacienteSeleccionDto[] = [];
    const seen = new Set<string>();

    if (Array.isArray(pacientesSeleccion)) {
      pacientesSeleccion.forEach((p: any) => {
        const codigo = p.pacCodigo || p.pac_codigo;
        const estado = (p.pacEstado || p.pac_estado || '').toLowerCase();
        if (codigo && estado !== 'independizado' && estado !== 'inactivo' && !seen.has(codigo)) {
          seen.add(codigo);
          list.push({
            pacCodigo: codigo,
            pacTitular: Boolean(p.pacTitular ?? p.pac_titular),
            nombreCompleto:
              p.nombreCompleto ||
              p.pac_nombre_completo ||
              `${p.pacPrimerNombre || p.pac_primer_nombre || ''} ${p.pacPrimerApellido || p.pac_primer_apellido || ''}`.trim(),
            pacFechaNacimiento: p.pacFechaNacimiento || p.pac_fecha_nacimiento || null,
            pacFotoPerfilUrl: p.pacFotoPerfilUrl || p.pac_foto_perfil_url,
          });
        }
      });
    }

    if (Array.isArray(pacientesUsuario)) {
      pacientesUsuario.forEach((p: any) => {
        const codigo = p.pac_codigo || p.pacCodigo;
        const estado = (p.pac_estado || p.pacEstado || '').toLowerCase();
        if (codigo && estado !== 'independizado' && estado !== 'inactivo' && !seen.has(codigo)) {
          seen.add(codigo);
          list.push({
            pacCodigo: codigo,
            pacTitular: Boolean(p.pac_titular ?? p.pacTitular),
            nombreCompleto:
              `${p.pac_primer_nombre || ''} ${p.pac_primer_apellido || ''}`.trim() || 'Paciente',
            pacFechaNacimiento: p.pac_fecha_nacimiento || p.pacFechaNacimiento || null,
            pacFotoPerfilUrl: p.pac_foto_perfil_url || p.pacFotoPerfilUrl,
          });
        }
      });
    }

    if (list.length === 0 && titular) {
      const codigo = titular.pac_codigo || (titular as any).pacCodigo;
      if (codigo) {
        list.push({
          pacCodigo: codigo,
          pacTitular: true,
          nombreCompleto:
            `${titular.pac_primer_nombre || ''} ${titular.pac_primer_apellido || ''}`.trim() || 'Yo',
          pacFechaNacimiento: titular.pac_fecha_nacimiento || null,
          pacFotoPerfilUrl: titular.pac_foto_perfil_url || undefined,
        });
      }
    }

    return list.sort((a, b) => (b.pacTitular ? 1 : 0) - (a.pacTitular ? 1 : 0));
  }, [pacientesSeleccion, pacientesUsuario, titular]);

  const pacientesFiltrados = useMemo(() => {
    if (!pacientesExcluidos || pacientesExcluidos.length === 0) return pacientesDisponibles;
    return pacientesDisponibles.filter((p) => !pacientesExcluidos.includes(p.pacCodigo));
  }, [pacientesDisponibles, pacientesExcluidos]);

  const pacientesExcluidosDetalle = useMemo(() => {
    if (!pacientesExcluidos || pacientesExcluidos.length === 0) return [];
    return pacientesDisponibles.filter((p) => pacientesExcluidos.includes(p.pacCodigo));
  }, [pacientesDisponibles, pacientesExcluidos]);

  // Auto-seleccionar paciente titular por defecto
  useEffect(() => {
    const pacCodigoActual = pacienteSeleccionado?.pacCodigo;
    if (!pacCodigoActual) {
      if (pacientesFiltrados.length > 0) {
        const titularPac = pacientesFiltrados.find((p) => p.pacTitular) || pacientesFiltrados[0];
        setPaciente(titularPac);
      }
    } else {
      const isExcluded = Boolean(pacientesExcluidos?.includes(pacCodigoActual));
      const stillValid = pacientesFiltrados.some((p) => p.pacCodigo === pacCodigoActual);

      if (isExcluded || !stillValid) {
        const nuevoPac = pacientesFiltrados.find((p) => p.pacTitular) || pacientesFiltrados[0] || null;
        if ((nuevoPac?.pacCodigo || null) !== (pacCodigoActual || null)) {
          setPaciente(nuevoPac);
        }
      }
    }
  }, [pacienteSeleccionado?.pacCodigo, pacientesFiltrados, pacientesExcluidos, setPaciente]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const [isCompressing, setIsCompressing] = useState(false);

  const totalBytesUsados = useMemo(() => {
    return archivos.reduce((acc, f) => acc + (f.size || 0), 0);
  }, [archivos]);

  const limiteAlcanzado = archivos.length >= MAX_ARCHIVOS || totalBytesUsados >= MAX_TOTAL_SIZE_BYTES;

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: any[]) => {
      if (fileRejections && fileRejections.length > 0) {
        fileRejections.forEach((rej) => {
          if (rej.errors?.some((e: any) => e.code === 'file-too-large')) {
            toast.warning(`"${rej.file.name}" supera el límite individual de 5 MB.`);
          }
        });
      }

      if (acceptedFiles.length === 0) return;

      const slotsDisponibles = MAX_ARCHIVOS - archivos.length;
      if (slotsDisponibles <= 0) {
        toast.warning(`Has alcanzado el límite máximo de ${MAX_ARCHIVOS} archivos.`);
        return;
      }

      if (totalBytesUsados >= MAX_TOTAL_SIZE_BYTES) {
        toast.warning('Has alcanzado el límite de 25 MB de adjuntos para esta cita.');
        return;
      }

      setIsCompressing(true);
      const toastId = toast.loading('Optimizando archivos adjuntos...');

      try {
        const archivosProcesados: File[] = [];
        for (const file of acceptedFiles) {
          if (file.type.startsWith('image/')) {
            try {
              const compressed = await compressImageFile(file, {
                maxDimension: 1920,
                quality: 0.82,
                maxSizeBytes: 1024 * 1024,
              });
              archivosProcesados.push(compressed);
            } catch {
              archivosProcesados.push(file);
            }
          } else {
            archivosProcesados.push(file);
          }
        }

        const archivosValidosIndividual: File[] = [];
        for (const f of archivosProcesados) {
          if (f.size > MAX_FILE_SIZE_BYTES) {
            toast.error(`"${f.name}" (${formatBytes(f.size)}) excede el límite de 5 MB.`);
          } else {
            archivosValidosIndividual.push(f);
          }
        }

        if (archivosValidosIndividual.length === 0) {
          toast.dismiss(toastId);
          return;
        }

        const archivosParaEvaluar = archivosValidosIndividual.slice(0, slotsDisponibles);
        let acumulado = totalBytesUsados;
        const archivosFinales: File[] = [];
        for (const f of archivosParaEvaluar) {
          if (acumulado + f.size > MAX_TOTAL_SIZE_BYTES) {
            toast.error(`"${f.name}" excede la capacidad de 25 MB.`);
          } else {
            acumulado += f.size;
            archivosFinales.push(f);
          }
        }

        toast.dismiss(toastId);

        if (archivosFinales.length > 0) {
          setArchivos([...archivos, ...archivosFinales]);
          toast.success(
            `Se ${archivosFinales.length === 1 ? 'adjuntó 1 archivo' : `adjuntaron ${archivosFinales.length} archivos`}.`
          );
        }
      } catch (e) {
        toast.dismiss(toastId);
        console.error(e);
        toast.error('Ocurrió un error al procesar los archivos.');
      } finally {
        setIsCompressing(false);
      }
    },
    [archivos, totalBytesUsados, setArchivos]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'application/pdf': ['.pdf'],
    },
    disabled: limiteAlcanzado || isCompressing,
    maxFiles: MAX_ARCHIVOS,
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
      citasMultiples.forEach((c) => {
        if (!c.paciente && defaultPac) {
          setPacienteCitaMultiple(c.id, defaultPac);
        }
      });
    }
  };

  const isInitialLoading =
    loadingDoctor ||
    (pacientesDisponibles.length === 0 &&
      (loadingPacientesSeleccion || loadingPacientesUsuario || loadingTitular));

  if (isInitialLoading) {
    return (
      <div className="py-12">
        <NeoLoader fullScreenPortal={false} />
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const isPacienteValid =
    isMultiMode && pacienteModoCita === 'variado'
      ? citasMultiples.length > 0 && citasMultiples.every((c) => Boolean(c.paciente || pacienteSeleccionado))
      : pacienteSeleccionado !== null;

  const isComplete =
    isPacienteValid && (modalidad !== 'domicilio' || direccionDomicilio.trim() !== '');

  // Datos para el banner superior de servicio confirmado
  const nombreServicioConfirmado =
    modalidad === 'virtual'
      ? 'Videoconsulta Médica'
      : servicioSeleccionado?.servicio ||
        (modalidad === 'presencial' ? 'Consulta Médica Presencial' : 'Consulta a Domicilio');

  const modalidadLabel =
    modalidad === 'presencial' ? 'Presencial' : modalidad === 'virtual' ? 'Videoconsulta' : 'A Domicilio';

  const sedeLabel =
    modalidad === 'presencial'
      ? clinicaSeleccionada?.cliDescripcion || 'Sede Médica'
      : modalidad === 'domicilio'
      ? `A Domicilio (${municipioDomicilio || 'Ciudad'}, ${zonaDomicilio || 'Zona'})`
      : 'En línea';

  const horaFormat = (() => {
    if (!hora) return '';
    const [h, m] = hora.split(':');
    let hn = parseInt(h);
    const ap = hn >= 12 ? 'PM' : 'AM';
    hn = hn % 12 || 12;
    return `${String(hn).padStart(2, '0')}:${m} ${ap}`;
  })();

  const fechaFormat = fecha ? format(fecha, "EEEE d MMM", { locale: es }) : '';

  // Cálculo de precio
  const precioUnitario =
    servicioSeleccionado?.costoTotal ||
    (modalidad === 'presencial' && clinicaSeleccionada?.mclPrecioBase
      ? clinicaSeleccionada.mclPrecioBase
      : doctor
      ? getDoctorLowestPrice(doctor) || 150
      : 150);

  const precioTotal =
    isMultiMode && citasMultiples.length > 0 ? precioUnitario * citasMultiples.length : precioUnitario;

  const precioEntero = Math.floor(precioTotal);
  const precioDecimal = (precioTotal % 1).toFixed(2).substring(2);

  return (
    <div className="relative w-full overflow-hidden font-sans pb-10">
      {/* Luces sutiles y decorativas de fondo */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-[#dce9ff]/40 dark:bg-blue-900/15 blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-10 w-80 h-80 rounded-full bg-[#cce5ff]/25 dark:bg-sky-900/15 blur-3xl pointer-events-none -z-10" />

      {/* Contenedor adaptado al ancho del header */}
      <div className="w-full flex flex-col space-y-8">
        {/* ENCABEZADO DE PÁGINA */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0b1c30] dark:text-white tracking-tight">
            ¿Quién asistirá a la consulta?
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Selecciona el paciente registrado para asignar el historial clínico o añade a un nuevo dependiente.
          </p>
        </div>

        {/* BANNER DE SERVICIO CONFIRMADO EN EL PASO 1 */}
        <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#eff4ff]/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-800 animate-in fade-in">
          <div className="w-9 h-9 rounded-xl bg-[#cce5ff]/60 dark:bg-sky-950/60 text-[#006194] dark:text-sky-400 flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-[#006194] dark:text-sky-400 uppercase tracking-wider block truncate">
              SERVICIO CONFIRMADO • {nombreServicioConfirmado}
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 truncate capitalize">
              {modalidadLabel} · {sedeLabel} · {fechaFormat ? `${fechaFormat}, ` : ''}{horaFormat} - Q{precioTotal.toFixed(2)}
            </p>
          </div>
        </div>

        {/* ========================================== */}
        {/* SECCIÓN 1: FICHA DEL PACIENTE              */}
        {/* ========================================== */}
        <section className="flex flex-col space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              FICHA DEL PACIENTE TITULAR O DEPENDIENTE
            </span>
            <div className="flex items-center gap-1.5 text-xs text-[#006194] dark:text-sky-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Expediente Cifrado</span>
            </div>
          </div>

          {/* Toggle Mismo paciente vs Por cita (en multi-modo) */}
          {isMultiMode && (
            <div className="inline-flex p-1 bg-[#eff4ff] dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 self-start shadow-xs">
              <button
                type="button"
                onClick={() => handleModoChange('mismo')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  pacienteModoCita === 'mismo'
                    ? 'bg-white dark:bg-slate-900 text-[#0b1c30] dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5 text-[#006194]" />
                <span>Mismo paciente ({citasMultiples.length})</span>
              </button>
              <button
                type="button"
                onClick={() => handleModoChange('variado')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  pacienteModoCita === 'variado'
                    ? 'bg-white dark:bg-slate-900 text-[#0b1c30] dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Paciente por cita</span>
              </button>
            </div>
          )}

          {/* GRILLA DE TARJETAS DE PACIENTES */}
          {(!isMultiMode || pacienteModoCita === 'mismo') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              {pacientesFiltrados.map((pac) => {
                const isSelected = pacienteSeleccionado?.pacCodigo === pac.pacCodigo;
                return (
                  <button
                    key={pac.pacCodigo}
                    type="button"
                    onClick={() => setPaciente(pac)}
                    className={`relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl text-left transition-all duration-200 cursor-pointer min-h-[140px] group ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 border-2 border-[#006194] dark:border-sky-500 shadow-[0_2px_14px_rgba(11,28,48,0.06)]'
                        : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                    }`}
                  >
                    {/* Checkmark activo */}
                    {isSelected && (
                      <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-[#006194] text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}

                    {/* Avatar o Iniciales */}
                    <div className="relative mb-3">
                      {pac.pacFotoPerfilUrl ? (
                        <div className="relative w-11 h-11 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                          <img
                            src={pac.pacFotoPerfilUrl}
                            alt={pac.nombreCompleto}
                            className="w-full h-full object-cover"
                          />
                          {pac.pacTitular && (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white">
                              <Check className="w-2 h-2 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-2xl bg-[#eff4ff] dark:bg-slate-800 text-[#006194] dark:text-sky-400 font-bold flex items-center justify-center text-sm">
                          {getInitials(pac.nombreCompleto)}
                        </div>
                      )}
                    </div>

                    {/* Información del Paciente */}
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">
                        {pac.pacTitular ? 'Yo (Titular)' : (pac as any).parentesco || 'Familiar'}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-[#0b1c30] dark:text-white truncate">
                        {pac.nombreCompleto}
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                        Exp. Clínico #{pac.pacCodigo.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                  </button>
                );
              })}

              {/* Botón Añadir Familiar + */}
              <button
                type="button"
                onClick={() => setIsAddPacienteOpen(true)}
                className="relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl text-left bg-[#eff4ff]/60 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 hover:bg-[#eff4ff] dark:hover:bg-slate-800 hover:border-[#006194] transition-all duration-200 cursor-pointer min-h-[140px] group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#cce5ff]/50 dark:bg-sky-950/60 text-[#006194] dark:text-sky-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-[#006194] dark:text-sky-400 group-hover:underline">
                    Añadir Familiar +
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Registrar dependiente o tutor
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* MODO ASIGNACIÓN POR CITA INDIVIDUAL (MULTIMODO VARIADO) */}
          {isMultiMode && pacienteModoCita === 'variado' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {citasMultiples.map((cita, idx) => {
                const [h, m] = cita.hora.split(':');
                let hourNum = parseInt(h);
                const ampm = hourNum >= 12 ? 'PM' : 'AM';
                hourNum = hourNum % 12 || 12;
                const displayTime = `${String(hourNum).padStart(2, '0')}:${m} ${ampm}`;
                const displayDate = format(cita.fecha, "EEEE d 'de' MMMM", { locale: es });
                const assignedPac = cita.paciente || pacienteSeleccionado;

                return (
                  <div
                    key={cita.id}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-[#006194] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-xs sm:text-sm text-[#0b1c30] dark:text-white capitalize truncate">
                          {displayDate}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[#006194] dark:text-sky-400 bg-[#eff4ff] dark:bg-slate-800 px-2 py-0.5 rounded-md shrink-0">
                        {displayTime}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl overflow-hidden shrink-0 bg-[#eff4ff] dark:bg-slate-800 text-[#006194] flex items-center justify-center text-xs font-bold">
                        {assignedPac?.pacFotoPerfilUrl ? (
                          <img
                            src={assignedPac.pacFotoPerfilUrl}
                            alt={assignedPac.nombreCompleto}
                            className="w-full h-full object-cover"
                          />
                        ) : assignedPac?.nombreCompleto ? (
                          <span>{getInitials(assignedPac.nombreCompleto)}</span>
                        ) : (
                          <span>?</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                          Paciente para esta consulta:
                        </label>
                        <select
                          value={assignedPac?.pacCodigo || ''}
                          onChange={(e) => {
                            const chosen = pacientesDisponibles.find((p) => p.pacCodigo === e.target.value) || null;
                            setPacienteCitaMultiple(cita.id, chosen);
                          }}
                          className="w-full bg-[#eff4ff]/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-[#0b1c30] dark:text-white outline-none focus:ring-2 focus:ring-[#006194]/20 cursor-pointer"
                        >
                          <option value="" disabled>
                            Selecciona un paciente
                          </option>
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
          )}

          {/* Aviso si algún paciente está excluido por choque de horario */}
          {pacientesExcluidosDetalle.length > 0 && (
            <div className="mt-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>
                  {pacientesExcluidosDetalle.map((p) => (p.pacTitular ? 'Tú (titular)' : p.nombreCompleto)).join(', ')}
                </strong>{' '}
                no está disponible en este horario porque ya cuenta con una cita médica programada.
              </span>
            </div>
          )}
        </section>

        {/* ========================================== */}
        {/* SECCIÓN 2: OBSERVACIONES O SÍNTOMAS       */}
        {/* ========================================== */}
        <section className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              OBSERVACIONES O SÍNTOMAS (OPCIONAL)
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {(motivo || '').length} / 500
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs focus-within:ring-2 focus-within:ring-[#006194]/20 focus-within:border-[#006194] transition">
            <textarea
              rows={4}
              maxLength={500}
              value={
                motivo && motivo !== servicioSeleccionado?.servicio && motivo !== grupoNombre
                  ? motivo
                  : ''
              }
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Describe brevemente el motivo de la consulta, síntomas actuales o detalles que el especialista deba conocer con anticipación..."
              className="w-full bg-transparent text-sm text-[#0b1c30] dark:text-white placeholder:text-slate-400 outline-none resize-none leading-relaxed"
            />
          </div>
        </section>

        {/* ========================================== */}
        {/* SECCIÓN DOMICILIO: DIRECCIÓN (SI APLICA)   */}
        {/* ========================================== */}
        {modalidad === 'domicilio' && (
          <section className="flex flex-col space-y-3 animate-in fade-in duration-200">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              DIRECCIÓN DE VISITA A DOMICILIO
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Dirección Exacta <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={direccionDomicilio}
                  onChange={(e) => setDireccionDomicilio(e.target.value)}
                  placeholder="Calle, avenida, número de casa..."
                  className="w-full bg-[#eff4ff]/60 dark:bg-slate-800/40 px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#006194]/20 focus:border-[#006194] text-xs text-[#0b1c30] dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Referencias de Llegada
                </label>
                <input
                  type="text"
                  value={referenciasDomicilio}
                  onChange={(e) => setReferenciasDomicilio(e.target.value)}
                  placeholder="Ej. Portón negro, frente al parque..."
                  className="w-full bg-[#eff4ff]/60 dark:bg-slate-800/40 px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#006194]/20 focus:border-[#006194] text-xs text-[#0b1c30] dark:text-white"
                />
              </div>
            </div>
          </section>
        )}

        {/* ========================================== */}
        {/* SECCIÓN 3: DOCUMENTOS PREVIOS              */}
        {/* ========================================== */}
        <section className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              DOCUMENTOS PREVIOS (OPCIONAL)
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {archivos.length} de {MAX_ARCHIVOS} archivos · Máx. 25 MB
            </span>
          </div>

          {/* DROPZONE */}
          <div
            {...getRootProps()}
            className={`rounded-3xl p-8 sm:p-10 border border-dashed text-center flex flex-col items-center justify-center transition-all bg-white dark:bg-slate-900 shadow-xs ${
              isDragActive
                ? 'border-[#006194] bg-[#eff4ff]/60'
                : 'border-slate-200/80 dark:border-slate-800 hover:border-[#006194] cursor-pointer'
            } ${limiteAlcanzado ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <div className="w-12 h-12 rounded-full bg-[#eff4ff] dark:bg-slate-800 text-[#006194] dark:text-sky-400 flex items-center justify-center mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h4 className="text-sm sm:text-base font-semibold text-[#0b1c30] dark:text-white">
              Haz clic o arrastra archivos aquí
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
              Recetas anteriores, exámenes de agudeza visual, carné de seguro médico o diagnósticos previos.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
              PDF, JPG, PNG o WEBP · Cifrado criptográfico en tránsito y en reposo
            </p>
          </div>

          {/* LISTA DE ARCHIVOS ADJUNTOS */}
          {archivos.length > 0 && (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 pt-1">
              {archivos.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 shadow-xs"
                >
                  <div className="flex items-center gap-3 overflow-hidden min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#eff4ff] dark:bg-slate-800 text-[#006194] dark:text-sky-400 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[#0b1c30] dark:text-white">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    title="Eliminar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ========================================== */}
        {/* RESUMEN Y BOTONES DE NAVEGACIÓN             */}
        {/* ========================================== */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-[0_4px_28px_rgba(11,28,48,0.06)] border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
              document.documentElement.scrollTop = 0;
              document.body.scrollTop = 0;
              prevStep();
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver al Paso 1</span>
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto justify-end">
            <div className="text-center sm:text-right">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                TOTAL ESTIMADO
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-[#0b1c30] dark:text-white">
                Q{precioEntero}.{precioDecimal}
              </span>
              <span className="text-[11px] text-[#006c4a] dark:text-emerald-400 block">
                Cancelación sin cargo hasta 24h antes
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
                nextStep();
              }}
              disabled={!isComplete}
              className={`w-full sm:w-auto px-8 h-12 rounded-xl text-sm font-semibold shadow-[0_4px_16px_rgba(0,97,148,0.22)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 ${
                isComplete
                  ? 'bg-[#006194] hover:bg-[#007bb9] text-white cursor-pointer'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              <span>Continuar a Pago</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal para Registrar Nuevo Paciente Dependiente */}
      <PacienteFormModal
        open={isAddPacienteOpen}
        mode="add"
        titular={titular}
        titularCodigo={titular?.pac_codigo || ''}
        onClose={() => setIsAddPacienteOpen(false)}
      />
    </div>
  );
}
