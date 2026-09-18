'use client';

import { motion } from 'framer-motion';
import { 
  X, Calendar, Clock, User, Stethoscope, 
  Building2, Video, Home, AlertCircle, Info, ArrowRight 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CitaListDto } from '@/types/citas';

interface ModalMiCitaConflictoProps {
  isOpen: boolean;
  onClose: () => void;
  citaConflicto: CitaListDto;
  horaDisplay: string;
  slotRaw: string;
  codMedicoActual: string;
  medicoNombreActual?: string;
  onAgendarDeTodosModos: (slotRaw: string, pacienteExcluidoCod: string) => void;
}

export function ModalMiCitaConflicto({
  isOpen,
  onClose,
  citaConflicto,
  horaDisplay,
  slotRaw,
  codMedicoActual,
  medicoNombreActual,
  onAgendarDeTodosModos,
}: ModalMiCitaConflictoProps) {
  if (!isOpen || !citaConflicto) return null;

  const esMismoMedico = Boolean(
    codMedicoActual &&
    citaConflicto.ctaCoddoc &&
    String(codMedicoActual).trim() === String(citaConflicto.ctaCoddoc).trim()
  );

  const formatFechaAmigable = (fechaStr?: string | null) => {
    if (!fechaStr) return '';
    try {
      const cleanDate = fechaStr.split('T')[0];
      return format(parseISO(cleanDate), "EEEE d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return fechaStr;
    }
  };

  const handleAgendar = () => {
    const pacCod = citaConflicto.ctaCodpac || (citaConflicto as any).cta_codpac || (citaConflicto as any).pacCodigo || '';
    onAgendarDeTodosModos(slotRaw, pacCod);
    onClose();
  };

  const modalidad = citaConflicto.ctaModalidad?.toLowerCase();

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-md bg-white dark:bg-[#0F172A] rounded-2xl p-5 sm:p-6 shadow-2xl border border-sky-200/80 dark:border-sky-900/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado minimalista */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl text-sky-600 dark:text-sky-400 ${
              esMismoMedico 
                ? 'bg-sky-100 dark:bg-sky-950/80' 
                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400'
            }`}>
              {esMismoMedico ? <Calendar className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                {esMismoMedico ? 'Cita ya programada' : 'Coincidencia de horario'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Detalles de tu cita existente
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

        {/* Tarjeta de detalles de la cita existente */}
        <div className="my-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
          {/* Paciente */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <User className="w-3.5 h-3.5 text-sky-500" /> Paciente:
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {citaConflicto.pacienteNombre || 'Paciente registrado'}
            </span>
          </div>

          {/* Médico */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <Stethoscope className="w-3.5 h-3.5 text-sky-500" /> Especialista:
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-right">
              {citaConflicto.medicoNombre}
              {citaConflicto.medicoEspecialidad && (
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                  {citaConflicto.medicoEspecialidad}
                </span>
              )}
            </span>
          </div>

          {/* Fecha y Hora */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-sky-500" /> Horario:
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {horaDisplay} · <span className="capitalize">{formatFechaAmigable(citaConflicto.ctaFecha)}</span>
            </span>
          </div>

          {/* Modalidad / Lugar */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/50">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              {modalidad === 'virtual' ? (
                <Video className="w-3.5 h-3.5 text-sky-500" />
              ) : modalidad === 'domicilio' ? (
                <Home className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-amber-500" />
              )}
              Modalidad:
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {modalidad === 'virtual'
                ? 'Consulta Virtual'
                : modalidad === 'domicilio'
                  ? 'A Domicilio'
                  : citaConflicto.clinicaNombre || 'Presencial'}
            </span>
          </div>
        </div>

        {/* Mensaje contextual según Caso A o Caso B */}
        {esMismoMedico ? (
          /* CASO A: Mismo médico */
          <div className="mb-4 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-2.5 leading-relaxed">
            <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <span>
              Ya tienes una cita agendada con este mismo especialista a esta hora. Si deseas modificarla o reprogramarla, puedes hacerlo desde tu panel de <strong>Mis Citas</strong>.
            </span>
          </div>
        ) : (
          /* CASO B: Diferente médico */
          <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p>
                Tienes una consulta con otro especialista a esta hora. Puedes agendar con {medicoNombreActual || 'este médico'} para otro paciente de tu cuenta, pero{' '}
                <strong>{citaConflicto.pacienteNombre}</strong> quedará excluido(a) de la selección.
              </p>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-end gap-2 pt-2">
          {esMismoMedico ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition active:scale-98 cursor-pointer"
            >
              Entendido
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition active:scale-98 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAgendar}
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm shadow-blue-500/20 active:scale-98 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Agendar de todos modos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
