'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeftRight, Clock, Calendar, AlertCircle, X, Check, 
  MessageSquare, Info, Building2, Video, Home 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CitaListDto } from '@/types/citas';

interface ModalSolicitarCambioProps {
  isOpen: boolean;
  onClose: () => void;
  fechaTexto: string;
  horaDisplay: string;
  slotRaw: string;
  medicoNombre: string;
  onConfirmar: (slot: string, mensaje: string, citaSolicitanteId?: string) => void;
  citasCandidatas?: CitaListDto[];
  citaPreseleccionadaId?: string;
}

export function ModalSolicitarCambio({
  isOpen,
  onClose,
  fechaTexto,
  horaDisplay,
  slotRaw,
  medicoNombre,
  onConfirmar,
  citasCandidatas,
  citaPreseleccionadaId,
}: ModalSolicitarCambioProps) {
  const MENSAJES_PREDETERMINADOS = [
    'Buen día, tengo una emergencia y quisiera preguntarte si puedes ceder este horario para mí.',
    'Podrías cederme tu horario?',
    'Por favor podrías ceder tu horario? lo necesito de forma urgente.',
  ] as const;

  const [mensaje, setMensaje] = useState<string>(MENSAJES_PREDETERMINADOS[0]);
  
  // Si hay citas candidatas, inicializar con la preseleccionada o la primera
  const [selectedCitaId, setSelectedCitaId] = useState<string>(() => {
    if (citaPreseleccionadaId) return citaPreseleccionadaId;
    if (citasCandidatas && citasCandidatas.length > 0) return citasCandidatas[0].ctaCodigo;
    return '';
  });

  if (!isOpen) return null;

  const formatHora12h = (timeStr?: string | null) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    let hn = parseInt(h);
    if (isNaN(hn)) return timeStr;
    const ap = hn >= 12 ? 'PM' : 'AM';
    hn = hn % 12 || 12;
    return `${hn}:${m} ${ap}`;
  };

  const formatFechaAmigable = (fechaStr?: string | null) => {
    if (!fechaStr) return '';
    try {
      const cleanDate = fechaStr.split('T')[0];
      return format(parseISO(cleanDate), "EEEE d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return fechaStr;
    }
  };

  const tieneCitasCandidatas = Boolean(citasCandidatas && citasCandidatas.length > 0);

  const handleConfirm = () => {
    onConfirmar(slotRaw, mensaje.trim(), tieneCitasCandidatas ? selectedCitaId : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md animate-in fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(11,28,48,0.12)] border border-slate-200/50 dark:border-slate-800 text-slate-900 dark:text-slate-100 overflow-hidden max-h-[92vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado minimalista */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#eff4ff] dark:bg-slate-800 border border-[#006194]/20 dark:border-slate-700/60 text-[#006194] dark:text-sky-400 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                Solicitar Cambio de Horario
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Proponer intercambio de turno con otro paciente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Detalles del turno solicitado */}
        <div className="my-3.5 p-3.5 rounded-2xl bg-[#eff4ff]/40 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize">
            <Calendar className="w-4 h-4 text-[#006194] dark:text-sky-400 shrink-0" />
            <span>{fechaTexto}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#006194] text-white rounded-lg text-xs font-bold shadow-xs self-start sm:self-auto">
            <Clock className="w-3.5 h-3.5" />
            <span>{horaDisplay}</span>
          </div>
        </div>

        {/* Sección: Citas a cambio o Explicación */}
        {tieneCitasCandidatas ? (
          <div className="mb-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Tu cita a entregar a cambio:
              </label>
              <span className="text-[11px] font-semibold text-[#006194] dark:text-sky-400">
                {citasCandidatas!.length} {citasCandidatas!.length === 1 ? 'disponible' : 'disponibles'}
              </span>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
              {citasCandidatas!.map((cita) => {
                const isSelected = selectedCitaId === cita.ctaCodigo;
                const mod = cita.ctaModalidad?.toLowerCase();
                
                return (
                  <div
                    key={cita.ctaCodigo}
                    onClick={() => setSelectedCitaId(cita.ctaCodigo)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'border-[#006194] bg-[#eff4ff]/60 dark:bg-slate-800/80 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? 'border-[#006194] bg-[#006194] text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                            {formatFechaAmigable(cita.ctaFecha)}
                          </span>
                          <span className="text-[11px] font-semibold text-[#006194] dark:text-sky-400 bg-[#eff4ff] dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {formatHora12h(cita.ctaHora)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {mod === 'virtual' ? (
                            <span className="flex items-center gap-1">
                              <Video className="w-3 h-3 text-[#006194] dark:text-sky-400" /> Virtual
                            </span>
                          ) : mod === 'domicilio' ? (
                            <span className="flex items-center gap-1">
                              <Home className="w-3 h-3 text-emerald-500" /> A Domicilio
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-amber-500" />
                              {cita.clinicaNombre || 'Presencial'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#eff4ff] dark:bg-slate-800 text-[#006194] dark:text-sky-400 px-2 py-0.5 rounded-md shrink-0">
                        Elegida
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#006194] shrink-0" />
              ¿Cómo funciona?
            </p>
            <p className="text-[11px] leading-relaxed">
              Selecciona un horario disponible en el siguiente paso para agendar tu consulta y ofrecérselo al otro paciente a cambio. Si acepta, los turnos se intercambiarán automáticamente.
            </p>
          </div>
        )}

        {/* Mensajes predeterminados */}
        <div className="mb-3.5 space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            <span>Mensaje para el paciente:</span>
          </label>
          <div className="space-y-1.5">
            {MENSAJES_PREDETERMINADOS.map((msg, index) => {
              const isSelected = mensaje === msg;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setMensaje(msg)}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-start gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'border-[#006194] bg-[#eff4ff]/60 dark:bg-slate-800/80 text-slate-900 dark:text-white font-medium shadow-2xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-[#006194] bg-[#006194]'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="leading-relaxed flex-1">{msg}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Nota minimalista de 1 único intento */}
        <div className="mb-4 flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 p-2.5 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            Dispones de <strong>1 único intento</strong> para solicitar cambio en este horario.
          </span>
        </div>

        {/* Botones de acción */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition active:scale-95 cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            disabled={tieneCitasCandidatas && !selectedCitaId}
            onClick={handleConfirm}
            className="py-2.5 px-5 rounded-xl bg-[#006194] hover:bg-[#00517c] disabled:opacity-50 text-white text-xs font-semibold transition shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>
              {tieneCitasCandidatas
                ? 'Enviar solicitud'
                : 'Solicitar y elegir mi turno'}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
