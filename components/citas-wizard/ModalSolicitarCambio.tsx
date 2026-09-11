'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeftRight, Clock, Calendar, AlertCircle, X, Check, 
  MessageSquare, Info, CheckCircle2, Building2, Video, Home 
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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-xl bg-white dark:bg-[#0F172A] rounded-3xl p-6 sm:p-8 shadow-2xl border border-orange-200 dark:border-orange-900/50 overflow-hidden max-h-[92vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow de fondo decorativo */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-orange-400/10 dark:bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Encabezado */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 rounded-2xl shadow-xs border border-orange-200 dark:border-orange-800">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                Solicitar Cambio de Horario
              </h3>
              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mt-0.5">
                Proponer intercambio de turno con otro paciente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Detalles del horario deseado */}
        <div className="my-4 p-4 rounded-2xl bg-orange-50/90 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/60 relative z-10">
          <span className="text-[11px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider block mb-1.5">
            Turno que deseas solicitar:
          </span>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
              <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
              <span>{fechaTexto}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-500 text-white rounded-xl text-xs font-black shadow-xs self-start sm:self-auto">
              <Clock className="w-3.5 h-3.5" />
              <span>{horaDisplay}</span>
            </div>
          </div>
          {medicoNombre && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
              Especialista: <strong className="text-slate-800 dark:text-slate-200">{medicoNombre}</strong>
            </p>
          )}
        </div>

        {/* 2. Sección: Cita que se ofrece a cambio */}
        <div className="mb-4 relative z-10">
          {tieneCitasCandidatas ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                  {citasCandidatas!.length > 1
                    ? 'Selecciona cuál de tus citas deseas ofrecer a cambio:'
                    : 'Tu cita que entregarás a cambio:'}
                </label>
                <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
                  {citasCandidatas!.length} {citasCandidatas!.length === 1 ? 'cita disponible' : 'citas disponibles'}
                </span>
              </div>

              {/* Lista de citas candidatas */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {citasCandidatas!.map((cita) => {
                  const isSelected = selectedCitaId === cita.ctaCodigo;
                  const mod = cita.ctaModalidad?.toLowerCase();
                  
                  return (
                    <div
                      key={cita.ctaCodigo}
                      onClick={() => setSelectedCitaId(cita.ctaCodigo)}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 dark:text-white capitalize">
                              {formatFechaAmigable(cita.ctaFecha)}
                            </span>
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-950/80 px-2 py-0.5 rounded-md">
                              {formatHora12h(cita.ctaHora)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
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
                        <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full shrink-0">
                          A Ceder
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Mensaje explicativo para el flujo de intercambio */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p>
                    El titular del turno recibirá tu propuesta. Podrá <strong>aceptar el trueque directo</strong> (tomar tu cita seleccionada) o bien <strong>aceptar eligiendo otro horario libre</strong> del especialista.
                  </p>
                  <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                    • Importante: Cuentas con 1 solo intento de solicitud por horario y un máximo de 1 solicitud activa por cola.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Flujo Wizard: Sin cita previa, debe agendar una en el siguiente paso */
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                <span>¿Cómo funciona este intercambio?</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-400 pl-1">
                <li>El paciente titular de este turno recibirá tu petición de intercambio.</li>
                <li>
                  <strong className="text-orange-600 dark:text-orange-400">Paso obligatorio:</strong> En el siguiente paso deberás seleccionar un <span className="underline font-bold">horario disponible</span> para agendar tu consulta. Ese horario será el que ofrecerás a cambio.
                </li>
                <li>Si el otro paciente acepta ceder este horario, ambas consultas se intercambiarán automáticamente.</li>
              </ul>
            </div>
          )}
        </div>

        {/* 3. Mensaje opcional */}
        <div className="mb-4 relative z-10">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            <span>Mensaje para el otro paciente (opcional):</span>
          </label>
          <textarea
            rows={2}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Ej. Hola, tengo una urgencia médica en este horario y me sería de gran ayuda si podemos intercambiar turnos. ¡Muchas gracias!"
            className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            maxLength={400}
          />
          <span className="text-[10px] text-slate-400 float-right mt-0.5">
            {mensaje.length}/400 caracteres
          </span>
        </div>

        {/* Advertencia de 1 solo intento */}
        <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2 leading-relaxed relative z-10">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Atención:</strong> Solo dispones de <strong>1 único intento</strong> para solicitar cambio con este horario. Si decides cancelar la solicitud o el otro paciente la rechaza, no podrás volver a solicitar un cambio para este mismo turno.
          </span>
        </div>

        {/* 4. Botones de acción */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-2.5 relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            disabled={tieneCitasCandidatas && !selectedCitaId}
            onClick={handleConfirm}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black transition shadow-md shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>
              {tieneCitasCandidatas
                ? 'Enviar solicitud de intercambio'
                : 'Solicitar este horario y elegir mi turno'}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

