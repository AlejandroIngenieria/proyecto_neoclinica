'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Send,
  MessageSquare,
  Edit3,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Navbar } from '@/components/navbar';
import { NeoLoader } from '@/components/neo-loader';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { usePacienteTitular } from '@/hooks/use-pacientes';
import {
  crearResena,
  actualizarResena,
  obtenerResenaPorCita,
  type ResenaDetalleDto,
} from '@/services/resenas';
import { crearNotificacion } from '@/services/notificaciones';
import { buildDoctorFullName } from '@/types/doctor';

const RATING_LABELS: Record<number, string> = {
  1: 'Muy Insatisfecho',
  2: 'Insatisfecho',
  3: 'Regular',
  4: 'Satisfecho',
  5: 'Excelente Atención',
};

function ResenaFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  const codCta = searchParams.get('cita') || searchParams.get('codCta') || '';
  const codDoc = searchParams.get('doc') || searchParams.get('codDoc') || '';

  const { data: doctor, isLoading: loadingDoctor } = useDoctorByCode(codDoc || '');
  const { titular, isLoading: loadingPaciente } = usePacienteTitular();

  // Estados del formulario
  const [valoracion, setValoracion] = useState<number>(0);
  const [hoverValoracion, setHoverValoracion] = useState<number>(0);
  const [texto, setTexto] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados de reseña existente y modo edición
  const [existingResena, setExistingResena] = useState<ResenaDetalleDto | null>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState<boolean>(true);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Modales de respuesta HTTP (success nuevo, success edit, conflict)
  const [modalState, setModalState] = useState<'idle' | 'success' | 'success_edit' | 'conflict'>('idle');

  // 1. Proteger ruta y redirigir con returnUrl si no hay sesión activa
  useEffect(() => {
    if (status === 'unauthenticated') {
      const currentUrl = window.location.pathname + window.location.search;
      router.replace(`/login?returnUrl=${encodeURIComponent(currentUrl)}`);
    }
  }, [status, router]);

  // 2. Verificar si la cita ya cuenta con una reseña previa
  useEffect(() => {
    if (!token || !codCta) {
      setIsLoadingExisting(false);
      return;
    }

    let isMounted = true;
    obtenerResenaPorCita(token, codCta)
      .then((res) => {
        if (!isMounted) return;
        if (res) {
          setExistingResena(res);
          setValoracion(res.valoracion);
          setTexto(res.texto || '');
          if (res.esAutor) {
            setIsEditMode(true);
          }
        }
      })
      .catch((err) => {
        console.error('Error al verificar reseña previa:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingExisting(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token, codCta]);

  if (status === 'loading' || loadingPaciente) {
    return <NeoLoader />;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const activeRating = hoverValoracion || valoracion;
  const doctorName = doctor ? buildDoctorFullName(doctor) : 'Tu médico';
  const doctorSpecialty = doctor?.exp_profesion || doctor?.especialidades?.[0]?.especialidad || 'Especialidad Médica';

  const isUserForbidden = Boolean(existingResena && !existingResena.esAutor);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isUserForbidden) {
      setErrorMessage('Solo el usuario que redactó originalmente la reseña tiene permisos para editarla.');
      return;
    }

    if (valoracion < 1 || valoracion > 5) {
      setErrorMessage('Por favor selecciona una calificación de 1 a 5 estrellas.');
      return;
    }

    if (texto.length > 500) {
      setErrorMessage('El comentario no puede exceder los 500 caracteres.');
      return;
    }

    if (!codCta) {
      setErrorMessage('No se encontró el código de la cita en el enlace.');
      return;
    }

    if (!codDoc) {
      setErrorMessage('No se encontró el código del médico en el enlace.');
      return;
    }

    const codPac = titular?.pac_codigo || (titular as any)?.pacCodigo || (session?.user as any)?.pac_codigo || (session?.user as any)?.pacCodigo || '';
    if (!codPac) {
      setErrorMessage('No se pudo verificar la información de tu perfil de paciente.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && existingResena) {
        // Modo Edición: Actualizar reseña existente
        await actualizarResena(token!, existingResena.resCodigo, {
          valoracion,
          texto: texto.trim() || null,
        });

        toast.success('¡Reseña actualizada con éxito!', {
          description: `Tus comentarios sobre ${doctorName} han sido actualizados correctamente.`,
        });

        setModalState('success_edit');
      } else {
        // Modo Creación: Registrar nueva reseña
        await crearResena(token!, {
          codDoc,
          codPac,
          codCta,
          valoracion,
          texto: texto.trim() || null,
        });

        toast.success('¡Reseña publicada con éxito!', {
          description: `Gracias por evaluar a ${doctorName}. ¡Ganaste puntos de lealtad!`,
        });

        if (token) {
          crearNotificacion(token, {
            usuarioId: codPac,
            usuarioTipo: 'paciente',
            tipo: 'mensaje',
            titulo: '¡Reseña Publicada!',
            mensaje: `Gracias por valorar la atención de ${doctorName}. ¡Tus puntos de lealtad se han actualizado!`,
            accionUrl: `/dashboard/${codDoc}`,
          }).catch(() => {});
        }

        setModalState('success');
      }
    } catch (err: any) {
      const statusCode = err?.response?.status;
      const responseData = err?.response?.data;

      let backendMessage =
        responseData?.mensaje ||
        responseData?.message ||
        responseData?.title ||
        err?.message;

      if (responseData?.errors && typeof responseData.errors === 'object') {
        const errorList = Object.values(responseData.errors).flat().join(' ');
        if (errorList) {
          backendMessage = errorList;
        }
      }

      if (statusCode === 409) {
        // La cita ya cuenta con una reseña registrada
        if (token && codCta) {
          try {
            const res = await obtenerResenaPorCita(token, codCta);
            if (res) {
              setExistingResena(res);
              setValoracion(res.valoracion);
              setTexto(res.texto || '');
              if (res.esAutor) {
                setIsEditMode(true);
              }
            }
          } catch (_) {}
        }
        setModalState('conflict');
      } else if (statusCode === 403) {
        setErrorMessage(backendMessage || 'No tienes permisos para modificar esta reseña.');
      } else if (statusCode === 400) {
        setErrorMessage(backendMessage || 'Datos de reseña no válidos. Verifica los campos.');
      } else {
        console.warn('[ResenaNuevaPage] Error en petición:', backendMessage);
        setErrorMessage(backendMessage || 'Ocurrió un error al procesar tu reseña. Por favor intenta de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header de navegación */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link 
            href="/dashboard/citas" 
            className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a mis citas</span>
          </Link>

          {isEditMode && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800 animate-in fade-in">
              <Edit3 className="w-3.5 h-3.5" />
              Modo Edición
            </span>
          )}
        </div>

        {/* Card Principal */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl shadow-slate-900/5 space-y-6">
          
          {/* Título y subtítulo */}
          <div className="border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-bold tracking-wide uppercase mb-1">
              <Sparkles className="w-4 h-4" />
              <span>{isEditMode ? 'Actualizar Valoración' : 'Tu opinión es muy valiosa'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {isEditMode ? 'Editar Reseña de la Consulta' : 'Calificar Consulta Médica'}
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
              {isEditMode
                ? 'Puedes ajustar tu calificación por estrellas y modificar tu comentario sobre la atención recibida.'
                : 'Ayúdanos a mejorar el servicio y ayuda a otros pacientes compartiendo tu experiencia.'}
            </p>
          </div>

          {/* Banner Informativo si ya existe reseña */}
          {isEditMode && existingResena && (
            <div className="p-4 rounded-2xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-start gap-3.5 animate-in fade-in">
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs shrink-0 mt-0.5">
                <Edit3 className="w-4 h-4" />
              </div>
              <div className="text-xs sm:text-sm">
                <p className="font-bold text-blue-950 dark:text-blue-200">
                  Ya habías calificado esta consulta
                </p>
                <p className="text-blue-700 dark:text-blue-300/90 mt-0.5 leading-relaxed">
                  {existingResena.fechaGrabacion ? (
                    <>
                      Registrada el{' '}
                      <span className="font-semibold">
                        {format(parseISO(existingResena.fechaGrabacion), "d 'de' MMMM, yyyy", { locale: es })}
                      </span>
                      . Puedes modificar la puntuación y el texto cuantas veces lo consideres necesario.
                    </>
                  ) : (
                    'Puedes modificar la puntuación y el texto cuantas veces lo consideres necesario.'
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Banner de Bloqueo si el usuario NO es el autor */}
          {isUserForbidden && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3.5 animate-in fade-in">
              <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-xs sm:text-sm">
                <p className="font-bold text-amber-950 dark:text-amber-200">
                  Reseña en modo solo lectura
                </p>
                <p className="text-amber-700 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                  Esta consulta ya cuenta con una reseña registrada por otro paciente o usuario. Por seguridad y transparencia, solo el autor original puede modificarla.
                </p>
              </div>
            </div>
          )}

          {/* Mini Card del Médico */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="relative h-14 w-14 rounded-2xl overflow-hidden bg-blue-100 dark:bg-blue-900/40 border border-slate-200 dark:border-slate-700 shrink-0">
              {doctor?.exp_foto_perfil ? (
                <Image
                  src={doctor.exp_foto_perfil}
                  alt={doctorName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-black text-blue-600 dark:text-blue-400">
                  {doctorName.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Evaluando a</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{doctorName}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{doctorSpecialty}</p>
            </div>
          </div>

          {/* Mensajes de Error de Validación */}
          {errorMessage && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-semibold animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Formulario de Calificación */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Selector de Estrellas */}
            <div className="flex flex-col items-center justify-center text-center space-y-3 py-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                ¿Qué tal fue tu experiencia médica? <span className="text-rose-500">*</span>
              </label>

              <div className="flex items-center justify-center gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    disabled={isUserForbidden || isLoadingExisting}
                    onClick={() => {
                      setValoracion(star);
                      setErrorMessage(null);
                    }}
                    onMouseEnter={() => !isUserForbidden && setHoverValoracion(star)}
                    onMouseLeave={() => !isUserForbidden && setHoverValoracion(0)}
                    className="p-1 sm:p-2 rounded-2xl transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer disabled:cursor-not-allowed disabled:hover:scale-100"
                    aria-label={`Calificar con ${star} estrellas`}
                  >
                    <Star
                      className={`w-9 h-9 sm:w-11 sm:h-11 transition-colors duration-200 ${
                        star <= activeRating
                          ? 'fill-amber-400 text-amber-400 drop-shadow-[0_4px_10px_rgba(251,191,36,0.4)]'
                          : 'fill-slate-100 text-slate-300 dark:fill-slate-800 dark:text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Etiqueta de valoración actual */}
              <div className="h-6 flex items-center justify-center">
                {activeRating > 0 ? (
                  <span className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-3 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/50 animate-in fade-in duration-150">
                    {RATING_LABELS[activeRating]}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 font-medium">Haz clic en las estrellas para calificar</span>
                )}
              </div>
            </div>

            {/* Comentario (textarea opcional max 500 caracteres) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="texto" className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Escribe tu comentario <span className="text-xs font-normal text-slate-400">(Opcional)</span>
                </label>
                <span className={`text-[11px] font-semibold ${texto.length > 500 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                  {texto.length} / 500
                </span>
              </div>

              <textarea
                id="texto"
                value={texto}
                disabled={isUserForbidden || isLoadingExisting}
                onChange={(e) => {
                  setTexto(e.target.value);
                  if (errorMessage && e.target.value.length <= 500) {
                    setErrorMessage(null);
                  }
                }}
                maxLength={500}
                rows={4}
                placeholder="Cuéntanos más sobre la atención, puntualidad o instalaciones..."
                className={`w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all resize-none disabled:opacity-60 disabled:cursor-not-allowed ${
                  texto.length > 500
                    ? 'border-rose-500 focus:ring-rose-500/50'
                    : 'border-slate-200/80 dark:border-slate-700/80 focus:border-blue-500 focus:ring-blue-500/40'
                }`}
              />
            </div>

            {/* Botón de Envío / Actualización */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isUserForbidden || isLoadingExisting}
                className={`w-full flex items-center justify-center gap-2 text-white font-bold text-base py-4 px-6 rounded-2xl shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                  isEditMode
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/35'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/35'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{isEditMode ? 'Guardando cambios...' : 'Enviando reseña...'}</span>
                  </>
                ) : isEditMode ? (
                  <>
                    <Edit3 className="w-5 h-5" />
                    <span>Actualizar reseña</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Enviar reseña</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* MODAL 200 OK: ÉXITO NUEVA RESEÑA + GAMIFICACIÓN */}
      <AnimatePresence>
        {modalState === 'success' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-6 relative overflow-hidden"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  +1 Punto de Lealtad Otorgado
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  ¡Gracias por tu reseña!
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Has completado una misión de lealtad. Tu opinión ha sido publicada y contribuye a mantener el estándar de salud en NeoClínica.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button
                  onClick={() => router.push('/dashboard/citas')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Ver mis citas
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl transition-all cursor-pointer"
                >
                  Ir al inicio
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 200 OK: ÉXITO EDICIÓN DE RESEÑA */}
      <AnimatePresence>
        {modalState === 'success_edit' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-6 relative overflow-hidden"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  ¡Reseña Actualizada!
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Tus modificaciones han sido guardadas con éxito y se encuentran visibles en el perfil de {doctorName}.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button
                  onClick={() => router.push('/dashboard/citas')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Ver mis citas
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl transition-all cursor-pointer"
                >
                  Ir al inicio
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 409 CONFLICT: RESEÑA DUPLICADA CON OPCIÓN DE EDITAR */}
      <AnimatePresence>
        {modalState === 'conflict' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-6 relative overflow-hidden"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xl shadow-amber-500/20">
                <AlertCircle className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  Reseña ya registrada
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Esta consulta médica ya cuenta con una reseña. Si fuiste tú quien la publicó, puedes modificar tu calificación o tus comentarios en cualquier momento.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button
                  onClick={() => {
                    setModalState('idle');
                    setIsEditMode(true);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Editar mi reseña</span>
                </button>

                <button
                  onClick={() => router.push('/dashboard/citas')}
                  className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl transition-all cursor-pointer"
                >
                  Ir a mis citas
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ResenaNuevaPage() {
  return (
    <Suspense fallback={<NeoLoader />}>
      <ResenaFormContent />
    </Suspense>
  );
}
