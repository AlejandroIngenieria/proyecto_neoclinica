'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles, Award, CheckCircle2, AlertCircle, ArrowLeft, Loader2, Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Navbar } from '@/components/navbar';
import { NeoLoader } from '@/components/neo-loader';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { usePacienteTitular } from '@/hooks/use-pacientes';
import { crearResena } from '@/services/resenas';
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

  const [valoracion, setValoracion] = useState<number>(0);
  const [hoverValoracion, setHoverValoracion] = useState<number>(0);
  const [texto, setTexto] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modales de respuesta HTTP (200 OK / 409 Conflict)
  const [modalState, setModalState] = useState<'idle' | 'success' | 'conflict'>('idle');

  // 1. Proteger ruta y redirigir con returnUrl si no hay sesión activa
  useEffect(() => {
    if (status === 'unauthenticated') {
      const currentUrl = window.location.pathname + window.location.search;
      router.replace(`/login?returnUrl=${encodeURIComponent(currentUrl)}`);
    }
  }, [status, router]);

  if (status === 'loading' || loadingPaciente) {
    return <NeoLoader />;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const activeRating = hoverValoracion || valoracion;
  const doctorName = doctor ? buildDoctorFullName(doctor) : 'Tu médico';
  const doctorSpecialty = doctor?.exp_profesion || doctor?.especialidades?.[0]?.especialidad || 'Especialidad Médica';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

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
    } catch (err: any) {
      console.error('Error al enviar reseña:', err?.response?.data || err);
      const statusCode = err?.response?.status;
      const responseData = err?.response?.data;

      let backendMessage = responseData?.mensaje || responseData?.message || responseData?.title;

      if (responseData?.errors && typeof responseData.errors === 'object') {
        const errorList = Object.values(responseData.errors).flat().join(' ');
        if (errorList) {
          backendMessage = errorList;
        }
      }

      if (statusCode === 409) {
        setModalState('conflict');
      } else if (statusCode === 400) {
        setErrorMessage(backendMessage || 'Datos de reseña no válidos. Verifica los campos.');
      } else {
        setErrorMessage(backendMessage || 'Ocurrió un error al enviar tu reseña. Por favor intenta de nuevo.');
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
        <div className="mb-6">
          <Link 
            href="/dashboard/citas" 
            className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a mis citas
          </Link>
        </div>

        {/* Tarjeta Principal del Formulario */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-8 relative overflow-hidden">
          
          {/* Banner de Gamificación */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 p-5 md:p-6 text-white shadow-lg shadow-blue-500/20">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-amber-300 shadow-inner">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider mb-1 border border-white/30">
                  <Award className="w-3 h-3 text-amber-300" />
                  Misión de Lealtad
                </div>
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight leading-snug">
                  ¡Califica tu cita y gana puntos de lealtad!
                </h2>
                <p className="text-xs sm:text-sm text-blue-100/90 font-medium">
                  Tu opinión nos ayuda a mejorar y acumulas puntos para recompensas exclusivas.
                </p>
              </div>
            </div>
          </div>

          {/* Tarjeta Resumen del Médico */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
            <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-blue-100 dark:bg-blue-900/40 shrink-0 border border-blue-200 dark:border-blue-800">
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
                    onClick={() => {
                      setValoracion(star);
                      setErrorMessage(null);
                    }}
                    onMouseEnter={() => setHoverValoracion(star)}
                    onMouseLeave={() => setHoverValoracion(0)}
                    className="p-1 sm:p-2 rounded-2xl transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
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
                onChange={(e) => {
                  setTexto(e.target.value);
                  if (errorMessage && e.target.value.length <= 500) {
                    setErrorMessage(null);
                  }
                }}
                maxLength={500}
                rows={4}
                placeholder="Cuéntanos más sobre la atención, puntualidad o instalaciones..."
                className={`w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all resize-none ${
                  texto.length > 500
                    ? 'border-rose-500 focus:ring-rose-500/50'
                    : 'border-slate-200/80 dark:border-slate-700/80 focus:border-blue-500 focus:ring-blue-500/40'
                }`}
              />
            </div>

            {/* Botón de Envío */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-base py-4 px-6 rounded-2xl shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/35 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Enviando reseña...</span>
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

      {/* MODAL 200 OK: ÉXITO + GAMIFICACIÓN */}
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

      {/* MODAL 409 CONFLICT: RESEÑA DUPLICADA */}
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
                  Ya has calificado esta cita anteriormente. ¡Muchas gracias por formar parte activa de la comunidad!
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Ir al inicio
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
