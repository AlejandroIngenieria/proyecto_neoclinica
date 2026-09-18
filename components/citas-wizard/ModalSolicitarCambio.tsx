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
  const [mensaje, setMensaje] = useState('');
  
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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] rounded-2xl p-5 sm:p-6 shadow-2xl border border-orange-200/80 dark:border-orange-900/50 overflow-hidden max-h-[92vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado minimalista */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 rounded-xl">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                Solicitar Cambio de Horario
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Proponer intercambio de turno con otro paciente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Detalles del turno solicitado */}
        <div className="my-3.5 p-3 rounded-xl bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/70 dark:border-orange-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize">
            <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
            <span>{fechaTexto}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500 text-white rounded-lg text-xs font-bold shadow-xs self-start sm:self-auto">
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
              <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
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
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600 text-white'
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
                          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-950/80 px-1.5 py-0.5 rounded">
                            {formatHora12h(cita.ctaHora)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {mod === 'virtual' ? (
                            <span className="flex items-center gap-1">
                              <Video className="w-3 h-3 text-sky-500" /> Virtual
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
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-md shrink-0">
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
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              ¿Cómo funciona?
            </p>
            <p className="text-[11px] leading-relaxed">
              Selecciona un horario disponible en el siguiente paso para agendar tu consulta y ofrecérselo al otro paciente a cambio. Si acepta, los turnos se intercambiarán automáticamente.
            </p>
          </div>
        )}

        {/* Mensaje opcional */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            <span>Mensaje opcional:</span>
          </label>
          <textarea
            rows={2}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Ej. Hola, me sería de gran ayuda si podemos intercambiar turnos. ¡Muchas gracias!"
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 resize-none"
            maxLength={300}
          />
        </div>

        {/* Nota minimalista de 1 único intento */}
        <div className="mb-4 flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 p-2.5 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            Dispones de <strong>1 único intento</strong> para solicitar cambio en este horario.
          </span>
        </div>

        {/* Botones de acción */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition active:scale-98 cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            disabled={tieneCitasCandidatas && !selectedCitaId}
            onClick={handleConfirm}
            className="py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm shadow-orange-500/20 active:scale-98 flex items-center gap-1.5 cursor-pointer"
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
