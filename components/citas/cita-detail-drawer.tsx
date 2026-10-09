'use client';

import { useRouter } from 'next/navigation';
import { SideDrawer } from '@/components/side-drawer';
import type { CitaListDto } from '@/types/citas';
import { Phone, Clock, MapPin, Monitor, FileText, Download, MessageCircle, CalendarDays, AlertCircle, Star, Printer, ClipboardList, Stethoscope, Pill, FlaskConical, Info } from 'lucide-react';
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
  const router = useRouter();
  if (!cita) return null;

  const isCompleted = ['completada', 'finalizada', 'realizada'].includes(
    (cita.ctaEstado || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s\-]+/g, '_')
  );

  const handleImprimirRecetaPdf = () => {
    if (typeof window === 'undefined') return;

    const fechaFormateada = cita.ctaFecha
      ? (() => {
          try {
            return format(parseISO(cita.ctaFecha.split('T')[0]), "d 'de' MMMM 'de' yyyy", { locale: es });
          } catch {
            return cita.ctaFecha.split('T')[0];
          }
        })()
      : 'Fecha no registrada';

    const horaFormateada = cita.ctaHora ? cita.ctaHora.slice(0, 5) + ' hrs' : '';
    const paciente = cita.pacienteNombre || 'Paciente Registrado';
    const medico = cita.medicoNombre ? `Dr(a). ${cita.medicoNombre}` : 'Médico Tratante';
    const especialidad = cita.medicoEspecialidad || 'Medicina General';
    const clinica = cita.clinicaNombre || 'Centro Médico SaludYa';
    const diagnostico = cita.ctaDiagnostico?.trim() || 'Consulta médica realizada y finalizada. Diagnóstico registrado en el expediente clínico.';
    const tratamiento = cita.ctaTratamiento?.trim() || 'Indicaciones médicas y tratamiento registrado en la consulta.';
    const examenes = cita.ctaExamenesSolicitados?.trim() || '';
    const notas = cita.ctaNotasMedicas?.trim() || '';
    const codigoCita = cita.ctaCodigo || '';
    const modalidad = (cita.ctaModalidad || 'Presencial').toUpperCase();

    const printHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe y Receta Médica - ${paciente}</title>
  <style>
    @page { size: letter; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #ffffff; padding: 24px; line-height: 1.5; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px; }
    .brand h1 { font-size: 24px; font-weight: 900; color: #2563eb; letter-spacing: -0.5px; }
    .brand p { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    .meta { text-align: right; font-size: 11px; color: #475569; }
    .meta strong { color: #0f172a; }
    .badge-folio { display: inline-block; background: #f1f5f9; padding: 3px 8px; border-radius: 6px; font-family: monospace; font-weight: 700; color: #334155; margin-top: 4px; border: 1px solid #e2e8f0; }
    .grid-info { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 22px; }
    .info-group h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px; font-weight: 800; }
    .info-group p { font-size: 13px; font-weight: 700; color: #0f172a; }
    .info-group span { font-size: 11px; color: #64748b; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; }
    .box { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; white-space: pre-wrap; font-size: 13px; color: #0f172a; }
    .box-rx { background: #f0fdf4; border-color: #86efac; border-left: 5px solid #16a34a; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; }
    .signature { text-align: center; width: 220px; }
    .signature-line { border-top: 1px solid #334155; margin-bottom: 6px; }
    .signature p { font-size: 11px; font-weight: 700; color: #0f172a; }
    .signature span { font-size: 10px; color: #64748b; }
    @media print { body { padding: 0; } .no-print { display: none !important; } }
    .no-print-bar { display: flex; justify-content: flex-end; align-items: center; gap: 10px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px dashed #cbd5e1; }
    .btn-print { background: #2563eb; color: #ffffff; border: none; padding: 8px 18px; border-radius: 8px; font-weight: 800; font-size: 13px; cursor: pointer; }
    .btn-close { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="no-print no-print-bar">
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
    <button class="btn-close" onclick="window.close()">Cerrar</button>
  </div>
  <div class="header">
    <div class="brand">
      <h1>SaludYa</h1>
      <p>Red de Salud Integral • Expediente Clínico</p>
    </div>
    <div class="meta">
      <div><strong>Fecha de Consulta:</strong> ${fechaFormateada} ${horaFormateada}</div>
      <div><strong>Sede / Modalidad:</strong> ${clinica} (${modalidad})</div>
      ${codigoCita ? `<div class="badge-folio">Folio: #${codigoCita}</div>` : ''}
    </div>
  </div>

  <div class="grid-info">
    <div class="info-group">
      <h4>Paciente</h4>
      <p>${paciente}</p>
      <span>Atención médica registrada</span>
    </div>
    <div class="info-group">
      <h4>Médico Tratante</h4>
      <p>${medico}</p>
      <span>${especialidad}</span>
    </div>
  </div>

  <div class="section">
    <h3 class="section-title">Diagnóstico Médico Clínico</h3>
    <div class="box">${diagnostico}</div>
  </div>

  <div class="section">
    <h3 class="section-title">Prescripción y Receta Médica</h3>
    <div class="box box-rx">${tratamiento}</div>
  </div>

  ${examenes ? `
  <div class="section">
    <h3 class="section-title">Exámenes y Estudios Solicitados</h3>
    <div class="box">${examenes}</div>
  </div>` : ''}

  ${notas ? `
  <div class="section">
    <h3 class="section-title">Observaciones Clínicas</h3>
    <div class="box">${notas}</div>
  </div>` : ''}

  <div class="footer">
    <div style="font-size: 10px; color: #94a3b8; max-width: 320px;">
      Documento clínico generado digitalmente por SaludYa. Para validar o dar seguimiento comuníquese con su especialista.
    </div>
    <div class="signature">
      <div class="signature-line"></div>
      <p>${medico}</p>
      <span>${especialidad}</span>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 300);
    });
  </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {
          console.error(e);
        }
      }, 500);
    }
  };

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <ClipboardList className="w-5 h-5 text-[#2563EB]" />
          <span className="text-[#111827] dark:text-white font-black text-lg">Información</span>
        </div>
      }
      subtitle={
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-[#6B7280] dark:text-slate-400 font-medium">Dr(a). {cita.medicoNombre}</span>
          <span className="inline-flex items-center gap-1.5 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-slate-700 px-2 py-0.5 rounded-md text-[11px] font-bold text-[#111827] dark:text-white uppercase tracking-wider">
            {((cita.ctaEstado || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s\-]+/g, '_') === 'no_asistio') ? 'No asistió' : (cita.ctaEstado || '').replace(/_/g, ' ')}
          </span>
        </div>
      }
    >
      <div className="space-y-10 pb-12 text-[#111827] dark:text-slate-200 font-sans">
        
        {/* 1. ACCIONES PRIMARIAS */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-widest mb-4">Acciones Rápidas</p>

          {['completada', 'finalizada', 'realizada'].includes((cita.ctaEstado || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s\-]+/g, '_')) && (!cita.ctaCalificacion || cita.ctaCalificacion <= 0) && (
            <button 
              onClick={() => {
                onClose();
                router.push(`/paciente/resenas/nueva?cita=${cita.ctaCodigo}&doc=${cita.ctaCoddoc}`);
              }}
              className="w-full py-3 px-4 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors shadow-md text-center flex items-center justify-center gap-2 cursor-pointer mb-2"
            >
              <Star className="w-4 h-4 fill-white text-white" />
              <span>Escribir reseña del médico</span>
            </button>
          )}

          {typeof cita.ctaCalificacion === 'number' && cita.ctaCalificacion > 0 && (
            <div className="w-full py-2.5 px-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 mb-2">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>Cita calificada ({cita.ctaCalificacion}/5 estrellas)</span>
            </div>
          )}

          {['programada', 'confirmada', 'pospuesta'].includes(cita.ctaEstado) && (
            <>
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
            </>
          )}
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
                <span className="text-sm font-medium text-[#6B7280] dark:text-slate-400">Estado de la Cita</span>
                <span className="text-sm font-bold text-[#111827] dark:text-white flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    ['completada', 'finalizada', 'realizada'].includes((cita.ctaEstado || '').toLowerCase().trim().replace(/[\s\-]/g, '_')) ? 'bg-slate-400'
                    : ['cancelada', 'rechazada', 'no_asistio'].includes((cita.ctaEstado || '').toLowerCase().trim().replace(/[\s\-]/g, '_')) ? 'bg-rose-500'
                    : (cita.ctaEstado || '').toLowerCase().trim().replace(/[\s\-]/g, '_') === 'confirmada' ? 'bg-emerald-500'
                    : (cita.ctaEstado || '').toLowerCase().trim().replace(/[\s\-]/g, '_') === 'pospuesta' ? 'bg-amber-500'
                    : (cita.ctaEstado || '').toLowerCase().trim().replace(/[\s\-]/g, '_') === 'en_proceso' ? 'bg-blue-600 animate-pulse'
                    : 'bg-sky-500'
                  }`}></span>
                  {((cita.ctaEstado || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s\-]+/g, '_') === 'no_asistio')
                    ? 'No asistió'
                    : (cita.ctaEstado || '').toLowerCase().trim().replace(/[\s\-]+/g, '_') === 'en_proceso'
                    ? 'En proceso'
                    : (cita.ctaEstado || 'Programada').charAt(0).toUpperCase() + (cita.ctaEstado || 'Programada').slice(1).replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#6B7280] dark:text-slate-400">Estado de Pago</span>
                <span className="text-sm font-bold text-[#111827] dark:text-white flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${cita.estadoPago === 'pagado' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  {cita.estadoPago === 'pagado' ? 'Pagado' : (cita.tipoPagoDescripcion ? `${cita.tipoPagoDescripcion} (En consultorio)` : 'Pago en consultorio')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2.5 EXPEDIENTE CLÍNICO: ÚNICAMENTE PARA CITAS COMPLETADAS */}
        {isCompleted && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-800/80 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    Expediente y Receta Médica Oficial
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Diagnóstico y prescripción emitida por el médico
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleImprimirRecetaPdf}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Descargar PDF</span>
              </button>
            </div>

            <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4">
              <p className="text-xs font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-widest">
                Expediente Clínico
              </p>

              {/* Diagnóstico */}
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h5 className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">Diagnóstico Clínico</h5>
                </div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  {cita.ctaDiagnostico?.trim() || 'Evaluación médica completada. Diagnóstico y evolución registrados en el expediente.'}
                </p>
              </div>

              {/* Tratamiento e indicaciones */}
              <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <Pill className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h5 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Tratamiento e Indicaciones</h5>
                </div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  {cita.ctaTratamiento?.trim() || 'Tratamiento e indicaciones médicas registradas en la consulta.'}
                </p>
              </div>

              {/* Exámenes */}
              {cita.ctaExamenesSolicitados && (
                <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <FlaskConical className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h5 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Exámenes Solicitados</h5>
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                    {cita.ctaExamenesSolicitados}
                  </p>
                </div>
              )}

              {/* Notas */}
              {cita.ctaNotasMedicas && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Info className="w-4 h-4 text-slate-500" />
                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Observaciones</h5>
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                    {cita.ctaNotasMedicas}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. PREPARACIÓN / CONTACTO SECUNDARIO SEGÚN ESTADO */}
        {(cita.ctaEstado || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s\-]+/g, '_') === 'no_asistio' ? (
          <div className="bg-rose-50 dark:bg-rose-950/40 rounded-2xl p-5 border border-rose-200 dark:border-rose-900/60">
            <p className="font-bold text-rose-900 dark:text-rose-200 text-sm mb-1.5 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" /> Cita No Asistida
            </p>
            <p className="text-xs text-rose-700 dark:text-rose-300/90 leading-relaxed">
              Esta consulta fue registrada como no asistida debido a que el paciente no se presentó en la fecha y horario establecido.
            </p>
          </div>
        ) : (cita.ctaEstado || '').toLowerCase().trim().replace(/[\s\-]+/g, '_') === 'cancelada' ? (
          <div className="bg-rose-50 dark:bg-rose-950/40 rounded-2xl p-5 border border-rose-200 dark:border-rose-900/60">
            <p className="font-bold text-rose-900 dark:text-rose-200 text-sm mb-1.5 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" /> Cita Cancelada
            </p>
            <p className="text-xs text-rose-700 dark:text-rose-300/90 leading-relaxed">
              Esta consulta médica fue cancelada. No se realizaron cargos en la cuenta.
            </p>
          </div>
        ) : ['programada', 'confirmada'].includes((cita.ctaEstado || '').toLowerCase().trim().replace(/[\s\-]+/g, '_')) ? (
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
        ) : null}

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
