'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star, X, Loader2, Award, CheckCircle2, AlertCircle, CalendarDays, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import type { CitaListDto } from '@/types/citas';
import { crearResena } from '@/services/resenas';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ModalResenaMinimalistaProps {
  isOpen: boolean;
  onClose: () => void;
  cita: CitaListDto | null;
  onSuccess?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Muy insatisfecho',
  2: 'Insatisfecho',
  3: 'Regular',
  4: 'Satisfecho',
  5: '¡Excelente atención!',
};

export function ModalResenaMinimalista({
  isOpen,
  onClose,
  cita,
  onSuccess,
}: ModalResenaMinimalistaProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [valoracion, setValoracion] = useState<number>(5);
  const [hoverValoracion, setHoverValoracion] = useState<number>(0);
  const [texto, setTexto] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !cita) return null;

  const token = (session as any)?.accessToken || (session as any)?.token || (session?.user as any)?.token || '';
  const codPac = cita.ctaCodpac || (session?.user as any)?.pac_codigo || (session?.user as any)?.pacCodigo || '';
  const activeRating = hoverValoracion || valoracion;

  const doctorNombre = cita.medicoNombre?.startsWith('Dr.')
    ? cita.medicoNombre
    : `Dr. ${cita.medicoNombre || 'Médico'}`;

  const doctorInitials = cita.medicoNombre
    ? cita.medicoNombre
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
    : 'MD';

  let fechaTexto = '';
  try {
    if (cita.ctaFecha) {
      const d = parseISO(cita.ctaFecha);
      fechaTexto = format(d, "d 'de' MMMM, yyyy", { locale: es });
    }
  } catch {
    fechaTexto = cita.ctaFecha || '';
  }

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

    if (!token) {
      setErrorMessage('Sesión no válida o expirada. Por favor recarga la página.');
      return;
    }

    setIsSubmitting(true);

    try {
      await crearResena(token, {
        codDoc: cita.ctaCoddoc,
        codPac,
        codCta: cita.ctaCodigo,
        valoracion,
        texto: texto.trim() || null,
      });

      toast.success('¡Reseña publicada con éxito!', {
        description: `Gracias por evaluar a ${doctorNombre}. ¡Puntos de lealtad acreditados!`,
      });

      // Invalidar cachés para actualizar la UI inmediatamente
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['citas'] }),
        queryClient.invalidateQueries({ queryKey: ['allCitasPacientes'] }),
        queryClient.invalidateQueries({ queryKey: ['citaByCodigo', cita.ctaCodigo] }),
        queryClient.invalidateQueries({ queryKey: ['doctors'] }),
        queryClient.invalidateQueries({ queryKey: ['doctor', cita.ctaCoddoc] }),
        queryClient.invalidateQueries({ queryKey: ['doctorByCode', cita.ctaCoddoc] }),
        queryClient.invalidateQueries({ queryKey: ['resenasMedico', cita.ctaCoddoc] }),
        queryClient.invalidateQueries({ queryKey: ['lealtadEstado'] }),
      ]);

      onSuccess?.();
      onClose();
    } catch (err: any) {
      const resp = err?.response?.data;
      const msg = resp?.mensaje || resp?.message || resp?.title || err?.message || 'Error al publicar la reseña.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(11,28,48,0.12)] border border-slate-200/50 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-900/60 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold overflow-hidden shrink-0 shadow-2xs">
              <span className="text-base font-black">{doctorInitials}</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                  Calificar Consulta
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5 truncate max-w-[220px]">
                {doctorNombre}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                {cita.medicoEspecialidad || cita.servicioNombre || 'Consulta médica'}
                {fechaTexto ? ` • ${fechaTexto}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="pt-4 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Selector de Estrellas */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-center">
            <div className="flex items-center gap-1.5 mb-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setValoracion(star)}
                  onMouseEnter={() => setHoverValoracion(star)}
                  onMouseLeave={() => setHoverValoracion(0)}
                  className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                  title={`${star} estrellas`}
                >
                  <Star
                    className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                      star <= activeRating
                        ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 h-4">
              {RATING_LABELS[activeRating] || 'Selecciona tu puntuación'}
            </p>
          </div>

          {/* Campo de Comentario */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="resena-comentario" className="font-bold text-slate-700 dark:text-slate-300">
                Tu comentario <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <span className={`text-[11px] font-semibold ${texto.length > 450 ? 'text-amber-600' : 'text-slate-400'}`}>
                {texto.length}/500
              </span>
            </div>
            <textarea
              id="resena-comentario"
              rows={3}
              maxLength={500}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="¿Qué tal fue tu experiencia? (Puntualidad, trato humano, claridad de explicación...)"
              className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#11698E]/30 focus:border-[#11698E] transition resize-none"
            />
          </div>

          {/* Badge de incentivo de lealtad */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>¡Ganarás puntos de lealtad al publicar tu reseña!</span>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || valoracion === 0}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#006194] hover:bg-[#00517c] shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Publicando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Publicar reseña</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ModalVerResenaProps {
  isOpen: boolean;
  onClose: () => void;
  cita: CitaListDto | null;
}

export function ModalVerResena({ isOpen, onClose, cita }: ModalVerResenaProps) {
  if (!isOpen || !cita) return null;

  const doctorNombre = cita.medicoNombre?.startsWith('Dr.')
    ? cita.medicoNombre
    : `Dr. ${cita.medicoNombre || 'Médico'}`;

  let fechaTexto = '';
  try {
    if (cita.resenaFecha) {
      const d = parseISO(cita.resenaFecha);
      fechaTexto = format(d, "d 'de' MMMM, yyyy", { locale: es });
    }
  } catch {
    fechaTexto = cita.resenaFecha || '';
  }

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(11,28,48,0.12)] border border-slate-200/50 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-500 rounded-xl">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                Reseña Registrada
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {doctorNombre}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-center">
            <div className="flex items-center gap-1.5 mb-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-6 h-6 ${
                    star <= (cita.ctaCalificacion || 5)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {cita.ctaCalificacion || 5} de 5 Estrellas
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {RATING_LABELS[cita.ctaCalificacion || 5] || 'Excelente atención'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
              Comentario del paciente
            </p>
            <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 italic leading-relaxed">
              &ldquo;{cita.resenaComentario?.trim() || 'Excelente atención, puntualidad y calidez profesional durante toda la consulta.'}&rdquo;
            </p>
            {fechaTexto && (
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2 text-right">
                Publicada el {fechaTexto}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
