'use client';

import { SideDrawer } from '@/components/side-drawer';
import type { CitaListDto } from '@/types/citas';
import { Phone, Clock, MapPin, Monitor, FileText, Download, MessageCircle, CalendarDays, AlertCircle } from 'lucide-react';
import Image from 'next/image';

// Assuming safeFormatDate is extracted or we can define it here for simplicity
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function safeFormatDateLocal(dateStr: string | undefined, formatStr: string): string {
  if (!dateStr) return 'Fecha sin definir';
  try {
    return format(parseISO(dateStr), formatStr, { locale: es });
  } catch {
    return 'Fecha inválida';
  }
}

function getModalityIcon(mod: string) {
  if (mod === 'virtual') return <Monitor className="w-4 h-4" />;
  if (mod === 'domicilio') return <MapPin className="w-4 h-4" />;
  return <MapPin className="w-4 h-4" />;
}

export type CitaDetailDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  cita: CitaListDto | null;
  onEdit?: (cita: CitaListDto) => void;
  onCancel?: (cita: CitaListDto) => void;
  doctorFoto?: string;
};

export function CitaDetailDrawer({ isOpen, onClose, cita, onEdit, onCancel, doctorFoto }: CitaDetailDrawerProps) {
  if (!cita) return null;

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex flex-col gap-1">
          <span className="font-normal text-[#6B7280] dark:text-slate-400">Cita con</span>
          <span className="text-[#111827] dark:text-white">Dr(a). {cita.medicoNombre}</span>
        </div>
      }
      subtitle={
        <span className="inline-flex items-center gap-1.5 mt-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-slate-700 px-2.5 py-1 rounded-md text-xs font-bold text-[#111827] dark:text-white uppercase tracking-wider">
          {cita.ctaEstado}
        </span>
      }
    >
      <div className="space-y-10 pb-12 text-[#111827] dark:text-slate-200 font-sans">
        
        {/* 1. ACCIONES PRIMARIAS */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-widest mb-4">Acciones Rápidas</p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button 
              onClick={() => onEdit?.(cita)}
              className="flex-1 py-3 px-4 bg-[#2563EB] text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm text-center"
            >
              Modificar cita
            </button>
            <button 
              onClick={() => onEdit?.(cita)}
              className="flex-1 py-3 px-4 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-slate-700 text-[#111827] dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-gray-100 dark:hover:bg-[#0F172A] transition-colors text-center"
            >
              Reprogramar
            </button>
          </div>
          <button 
            onClick={() => onCancel?.(cita)}
            className="w-full py-3 px-4 bg-white dark:bg-[#1E293B] border border-[#FCA5A5] dark:border-red-900 text-[#EF4444] dark:text-red-400 rounded-xl font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-center mt-2"
          >
            Cancelar cita
          </button>
        </div>

        {/* 2. INFORMACIÓN MÉDICA */}
        <div>
          <p className="text-xs font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-widest mb-4">Detalles de la Consulta</p>
          <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#F9FAFB] dark:bg-[#0F172A] rounded-full border border-[#E5E7EB] dark:border-slate-700 overflow-hidden relative shrink-0 flex items-center justify-center">
                {doctorFoto ? (
                  <Image src={doctorFoto} alt="Doctor" fill sizes="56px" className="object-cover" />
                ) : (
                  <span className="text-[#6B7280] dark:text-slate-400 font-bold text-lg">{cita.medicoNombre.charAt(0)}</span>
                )}
              </div>
              <div>
                <h4 className="font-black text-[#111827] dark:text-white text-lg">{cita.medicoNombre}</h4>
                <p className="text-sm font-medium text-[#6B7280] dark:text-slate-400">{cita.medicoEspecialidad}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-[#E5E7EB] dark:border-slate-700 pt-5">
              <div>
                <p className="text-xs font-medium text-[#6B7280] dark:text-slate-400 mb-1">Fecha</p>
                <p className="font-bold text-[#111827] dark:text-white flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#6B7280] dark:text-slate-400" />
                  {safeFormatDateLocal(cita.ctaFecha, "d 'de' MMMM")}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#6B7280] dark:text-slate-400 mb-1">Hora</p>
                <p className="font-bold text-[#111827] dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#6B7280] dark:text-slate-400" />
                  {cita.ctaHora.slice(0, 5)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-medium text-[#6B7280] dark:text-slate-400 mb-1">Modalidad</p>
                <p className="font-bold text-[#111827] dark:text-white flex items-center gap-2 capitalize">
                  {getModalityIcon(cita.ctaModalidad)} {cita.ctaModalidad}
                </p>
              </div>
            </div>

            <div className="border-t border-[#E5E7EB] dark:border-slate-700 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#6B7280] dark:text-slate-400">Estado Médico</span>
                <span className="text-sm font-bold text-[#111827] dark:text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span> Programada
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#6B7280] dark:text-slate-400">Estado de Pago</span>
                <span className="text-sm font-bold text-[#111827] dark:text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#D97706]"></span> Pendiente
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. PREPARACIÓN / CONTACTO SECUNDARIO */}
        {['programada', 'confirmada'].includes(cita.ctaEstado) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#F8FAFC] dark:bg-[#0B1120] rounded-2xl p-5 border border-[#E5E7EB] dark:border-slate-700">
              <p className="font-bold text-[#111827] dark:text-white text-sm mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#2563EB]" /> Información para tu cita
              </p>
              <ul className="text-sm font-medium text-[#6B7280] dark:text-slate-400 space-y-2 ml-6">
                <li className="list-disc">Llega 15 minutos antes.</li>
                <li className="list-disc">Lleva resultados previos.</li>
              </ul>
            </div>
            
            <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-5 border border-[#E5E7EB] dark:border-slate-700 flex flex-col justify-center space-y-3">
              <p className="font-bold text-[#111827] dark:text-white text-sm">¿Dudas sobre la cita?</p>
              <div className="flex gap-2">
                <a 
                  href={`https://wa.me/50200000000?text=Hola`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-slate-700 text-[#111827] dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-[#F9FAFB] dark:hover:bg-[#0B1120] transition-colors text-center flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
                <button className="flex-1 py-2 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-slate-700 text-[#111827] dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-[#F9FAFB] dark:hover:bg-[#0B1120] transition-colors text-center flex items-center justify-center gap-1.5 shadow-sm">
                  <Phone className="w-3.5 h-3.5" /> Llamar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. NOTAS PRIVADAS */}
        <div>
          <p className="text-xs font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-widest mb-4">Notas Privadas</p>
          <div className="bg-[#F9FAFB] dark:bg-[#0B1120] rounded-2xl p-4 border border-[#E5E7EB] dark:border-slate-700">
            <textarea 
              className="w-full bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-slate-700 rounded-xl p-3 text-sm text-[#111827] dark:text-slate-200 placeholder-[#9CA3AF] dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 resize-none shadow-sm"
              rows={3}
              placeholder="Escribe aquí preguntas para el doctor o síntomas..."
              defaultValue=""
            />
            <div className="flex justify-end mt-3">
              <button className="px-5 py-2 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-slate-700 text-[#111827] dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#0F172A] transition-colors shadow-sm">
                Guardar
              </button>
            </div>
          </div>
        </div>

        {/* 5. DOCUMENTOS */}
        <div>
          <p className="text-xs font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-widest mb-4">Documentos Clínicos</p>
          {cita.documentos && cita.documentos.length > 0 ? (
            <div className="space-y-2">
              {cita.documentos.map((doc, idx) => (
                <a
                  key={idx}
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl border border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB] hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A] transition-colors bg-white dark:bg-[#1E293B] shadow-sm group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#9CA3AF] group-hover:text-[#2563EB] transition-colors" />
                    <span className="text-sm font-bold text-[#374151] dark:text-slate-200 truncate">{doc.nombre}</span>
                  </div>
                  <Download className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#2563EB]" />
                </a>
              ))}
            </div>
          ) : (
            <div className="bg-[#F9FAFB] dark:bg-[#0B1120] rounded-xl p-5 text-center border border-[#E5E7EB] dark:border-slate-700 border-dashed">
              <p className="text-sm font-bold text-[#6B7280] dark:text-slate-400">No hay documentos adjuntos</p>
            </div>
          )}
        </div>

        {/* 6. TIMELINE MINIMALISTA */}
        <div>
          <p className="text-xs font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-widest mb-6">Historial de la Cita</p>
          <div className="pl-2 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-[#111827] dark:bg-slate-400 shrink-0"></div>
              <p className="text-sm font-bold text-[#111827] dark:text-slate-200">Cita creada</p>
              <p className="text-xs font-medium text-[#6B7280] dark:text-slate-400 ml-auto">{safeFormatDateLocal(cita.ctaFecha, "dd MMM")}</p>
            </div>
            <div className="flex items-center gap-4 relative">
              <div className="absolute -top-5 left-[3px] w-[2px] h-4 bg-[#E5E7EB] dark:bg-slate-700"></div>
              <div className="w-2 h-2 rounded-full bg-[#111827] dark:bg-slate-400 shrink-0"></div>
              <p className="text-sm font-bold text-[#111827] dark:text-slate-200">Confirmada</p>
            </div>
            <div className="flex items-center gap-4 relative">
              <div className="absolute -top-5 left-[3px] w-[2px] h-4 bg-[#E5E7EB] dark:bg-slate-700"></div>
              <div className="w-2 h-2 rounded-full bg-[#E5E7EB] dark:bg-slate-800 shrink-0 border border-[#D1D5DB] dark:border-slate-600"></div>
              <p className="text-sm font-medium text-[#9CA3AF] dark:text-slate-500">Consulta médica</p>
            </div>
            <div className="flex items-center gap-4 relative">
              <div className="absolute -top-5 left-[3px] w-[2px] h-4 bg-[#E5E7EB] dark:bg-slate-700"></div>
              <div className="w-2 h-2 rounded-full bg-[#E5E7EB] dark:bg-slate-800 shrink-0 border border-[#D1D5DB] dark:border-slate-600"></div>
              <p className="text-sm font-medium text-[#9CA3AF] dark:text-slate-500">Resultados</p>
            </div>
          </div>
        </div>

      </div>
    </SideDrawer>
  );
}
