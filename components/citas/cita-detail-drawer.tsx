'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SideDrawer } from '@/components/side-drawer';
import type { CitaListDto } from '@/types/citas';
import { Phone, Clock, MapPin, Monitor, FileText, Download, MessageCircle, CalendarDays, AlertCircle, Star, Printer, ClipboardList, Stethoscope, Pill, FlaskConical, Info, Copy, Check, CheckCircle2, XCircle, Activity, Paperclip, ExternalLink, FolderPlus } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

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
  const [idCopiado, setIdCopiado] = useState(false);

  if (!cita) return null;

  const isCompleted = ['completada', 'finalizada', 'realizada'].includes(
    (cita.ctaEstado || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s\-]+/g, '_')
  );

  const estadoRaw = (cita.ctaEstado || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s\-]+/g, '_');
  const citaCodigoDisplay = cita.ctaCodigo ? `${cita.ctaCodigo.slice(0, 8).toUpperCase()}...` : '';

  const handleCopiarId = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!cita.ctaCodigo) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(cita.ctaCodigo);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = cita.ctaCodigo;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIdCopiado(true);
      toast.success('ID de cita copiado al portapapeles', {
        description: cita.ctaCodigo,
        duration: 2500,
      });
      setTimeout(() => setIdCopiado(false), 2000);
    } catch {
      toast.error('No se pudo copiar el ID');
    }
  };

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
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {
          console.error(e);
        }
      }, 500);
    }
  };

  const listaArchivos = cita.archivos || [];
  const tieneArchivos = listaArchivos.length > 0;

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[#111827] dark:text-white font-black text-lg">Información</span>
          </div>
        </div>
      }
      subtitle={
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {/* Badge dinámico con el estado real */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
            estadoRaw === 'programada' ? 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60'
            : estadoRaw === 'confirmada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60'
            : estadoRaw === 'pospuesta' ? 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60'
            : estadoRaw === 'en_proceso' ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 animate-pulse'
            : isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60'
            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              estadoRaw === 'programada' ? 'bg-sky-500'
              : estadoRaw === 'confirmada' ? 'bg-emerald-500'
              : estadoRaw === 'pospuesta' ? 'bg-amber-500'
              : estadoRaw === 'en_proceso' ? 'bg-blue-600'
              : isCompleted ? 'bg-emerald-500'
              : 'bg-rose-500'
            }`} />
            <span>
              {estadoRaw === 'no_asistio'
                ? 'No asistió'
                : estadoRaw === 'en_proceso'
                ? 'En proceso'
                : (cita.ctaEstado || 'Programada').charAt(0).toUpperCase() + (cita.ctaEstado || 'Programada').slice(1).replace(/_/g, ' ')}
            </span>
          </span>

          {/* Calificación si ya fue evaluada */}
          {isCompleted && typeof cita.ctaCalificacion === 'number' && cita.ctaCalificacion > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{cita.ctaCalificacion}/5 Estrellas</span>
            </span>
          )}

          {/* Grupo si existe */}
          {cita.grupoTema && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/60">
              <FolderPlus className="w-3 h-3" /> {cita.grupoTema}
            </span>
          )}

          {/* ID CITA con botón de copiar en el header */}
          {cita.ctaCodigo && (
            <button
              type="button"
              onClick={handleCopiarId}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer group"
              title={`Copiar ID: ${cita.ctaCodigo}`}
            >
              <span className="text-[10px] uppercase font-sans text-slate-400">ID:</span>
              <span>#{citaCodigoDisplay}</span>
              {idCopiado ? (
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              )}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4 pb-2 text-[#111827] dark:text-slate-200 font-sans">
        
        {/* 1. Banner contextual explicativo según el estado REAL de la cita */}
        {estadoRaw === 'no_asistio' ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs shrink-0 mt-0.5">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <h4 className="font-bold text-rose-900 dark:text-rose-200 text-sm">Estado de la Cita: No asistió</h4>
              <p className="text-rose-700 dark:text-rose-300/90 mt-1 leading-relaxed">
                Esta consulta médica fue registrada como no asistida. El paciente no se presentó en la fecha y horario establecido ({safeFormatDateLocal(cita.ctaFecha, "d 'de' MMMM")} a las {cita.ctaHora ? cita.ctaHora.slice(0, 5) : ''} hrs). Por esta razón no se generó expediente clínico ni prescripción médica.
              </p>
            </div>
          </div>
        ) : estadoRaw === 'cancelada' ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs shrink-0 mt-0.5">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <h4 className="font-bold text-rose-900 dark:text-rose-200 text-sm">Estado de la Cita: Cancelada</h4>
              <p className="text-rose-700 dark:text-rose-300/90 mt-1 leading-relaxed">
                La cita médica fue cancelada previamente. El horario asignado quedó liberado en el sistema y no se efectuaron cargos clínicos.
              </p>
            </div>
          </div>
        ) : estadoRaw === 'rechazada' ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <h4 className="font-bold text-rose-900 dark:text-rose-200 text-sm">Estado de la Cita: Solicitud Rechazada</h4>
              <p className="text-rose-700 dark:text-rose-300/90 mt-1 leading-relaxed">
                Esta solicitud de cita no pudo ser confirmada y fue declinada por el médico o centro de salud.
              </p>
            </div>
          </div>
        ) : estadoRaw === 'en_proceso' ? (
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3.5 animate-pulse">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs shrink-0 mt-0.5">
              <Activity className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <h4 className="font-bold text-blue-900 dark:text-blue-200 text-sm">Estado de la Cita: Consulta en Proceso</h4>
              <p className="text-blue-700 dark:text-blue-300/90 mt-1 leading-relaxed">
                El médico se encuentra atendiendo esta consulta. El diagnóstico y prescripción médica se registrarán en el expediente al finalizar.
              </p>
            </div>
          </div>
        ) : estadoRaw === 'confirmada' ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">Estado de la Cita: Confirmada</h4>
              <p className="text-emerald-700 dark:text-emerald-300/90 mt-1 leading-relaxed">
                Tu cita se encuentra confirmada por el centro médico. Te recomendamos presentarte con 10 a 15 minutos de anticipación en la fecha indicada.
              </p>
            </div>
          </div>
        ) : estadoRaw === 'pospuesta' ? (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm">Estado de la Cita: Pospuesta</h4>
              <p className="text-amber-700 dark:text-amber-300/90 mt-1 leading-relaxed">
                Esta consulta fue pospuesta/reprogramada. Revisa los nuevos horarios asignados para tu atención.
              </p>
            </div>
          </div>
        ) : estadoRaw === 'programada' ? (
          <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-sky-600 text-white shadow-xs shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <h4 className="font-bold text-sky-900 dark:text-sky-200 text-sm">Estado de la Cita: Programada</h4>
              <p className="text-sky-700 dark:text-sky-300/90 mt-1 leading-relaxed">
                Cita agendada en el sistema, pendiente de atención médica en la fecha y hora seleccionada ({safeFormatDateLocal(cita.ctaFecha, "d 'de' MMMM")} a las {cita.ctaHora ? cita.ctaHora.slice(0, 5) : ''} hrs).
              </p>
            </div>
          </div>
        ) : isCompleted ? (
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-slate-700 dark:bg-slate-600 text-white shadow-xs shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Estado de la Cita: Consulta Completada</h4>
              <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Esta consulta médica fue atendida y finalizada con éxito. A continuación encontrarás el expediente clínico registrado por el doctor.
              </p>
            </div>
          </div>
        ) : null}

        {/* 2. Ficha de Datos Conectados de la Cita */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs">
          {/* ID de la Cita Médica (CÓDIGO ÚNICO) */}
          {cita.ctaCodigo && (
            <div className="sm:col-span-2 pb-2.5 mb-0.5 border-b border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">ID de la Cita (Código Único)</span>
                <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate select-all" title={cita.ctaCodigo}>
                  {cita.ctaCodigo}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopiarId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 transition shadow-2xs shrink-0 cursor-pointer active:scale-95"
                title="Copiar ID al portapapeles"
              >
                {idCopiado ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-emerald-600 dark:text-emerald-400">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Copiar ID</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Paciente */}
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Paciente</span>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {cita.pacienteNombre || 'Paciente Registrado'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {cita.pacienteEstado === 'independizado' ? 'Cuenta Independizada' : 'Paciente de la cuenta'}
            </p>
          </div>

          {/* Médico y Especialidad */}
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Médico Tratante</span>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              Dr(a). {cita.medicoNombre}
            </p>
            <p className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold">
              {cita.medicoEspecialidad || 'Especialista Médico'}
            </p>
          </div>

          {/* Fecha y Horario */}
          <div className="space-y-1 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Fecha y Hora</span>
            <p className="font-bold text-slate-800 dark:text-slate-100 capitalize">
              {safeFormatDateLocal(cita.ctaFecha, "EEEE d 'de' MMMM, yyyy")}
            </p>
            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              {cita.ctaHora ? cita.ctaHora.slice(0, 5) : ''} hrs
            </p>
          </div>

          {/* Modalidad y Lugar */}
          <div className="space-y-1 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Modalidad & Sede</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 capitalize">
              {getModalityIcon(cita.ctaModalidad)}
              <span>{cita.ctaModalidad}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {cita.ctaModalidad === 'presencial'
                ? (cita.clinicaNombre || 'Clínica Principal')
                : cita.ctaModalidad === 'virtual'
                ? (cita.enlaceVideollamada || cita.ctaEnlaceVideollamada ? 'Videollamada disponible' : 'Enlace en sala de espera')
                : (cita.direccionDomicilio || cita.ctaDireccionDomicilio || 'Dirección registrada a domicilio')}
            </p>
          </div>

          {/* Costo, Método de Pago y Mapa */}
          <div className="sm:col-span-2 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Costo de Consulta</span>
              <span className="font-black text-slate-900 dark:text-white text-sm">
                Q{cita.ctaPrecio ?? 0}
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-2">
                • {cita.tipoPagoDescripcion || 'Pago en clínica'} ({cita.estadoPago === 'pagado' ? 'Pagado' : 'Pago presencial'})
              </span>
            </div>

            {cita.ctaModalidad === 'presencial' && (
              <div className="flex items-center gap-1.5">
                {cita.ctaEnClinica && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Llegada confirmada
                  </span>
                )}
                {cita.cliUrlGoogleMaps && (
                  <a
                    href={cita.cliUrlGoogleMaps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-sky-600 font-bold text-[11px] border border-slate-200 dark:border-slate-600 transition shadow-2xs"
                  >
                    <MapPin className="w-3 h-3 text-rose-500" />
                    <span>Ver Mapa</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3. Motivo y Síntomas Registrados al Agendar */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center gap-2 mb-1.5">
            <Activity className="w-4 h-4 text-sky-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Motivo y Síntomas Registrados al Agendar</h4>
          </div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
            {cita.ctaMotivo?.trim() ? cita.ctaMotivo : 'Sin síntomas detallados durante el agendamiento.'}
          </p>
        </div>

        {/* 4. EXPEDIENTE CLÍNICO: ÚNICAMENTE PARA CITAS COMPLETADAS */}
        {isCompleted && (
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-800/80 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    Expediente y Receta Médica Oficial
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Diagnóstico y prescripción emitida por el médico tratante
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleImprimirRecetaPdf}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Descargar PDF</span>
              </button>
            </div>

            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1 pt-1">
              Expediente Clínico de la Consulta
            </h4>

            {/* Diagnóstico */}
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50">
              <div className="flex items-center gap-2 mb-1.5">
                <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h5 className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">Diagnóstico Clínico</h5>
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                {cita.ctaDiagnostico?.trim() || 'Evaluación médica completada. Diagnóstico y evolución registrados en el expediente.'}
              </p>
            </div>

            {/* Tratamiento e indicaciones */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
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
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50">
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
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <div className="flex items-center gap-2 mb-1.5">
                  <Info className="w-4 h-4 text-slate-500" />
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Observaciones</h5>
                </div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  {cita.ctaNotasMedicas}
                </p>
              </div>
            )}

            {/* Reseña registrada */}
            {typeof cita.ctaCalificacion === 'number' && cita.ctaCalificacion > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    Tu Calificación: {cita.ctaCalificacion}/5
                  </span>
                  {cita.resenaFecha && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                      {safeFormatDateLocal(cita.resenaFecha, "d MMM yyyy")}
                    </span>
                  )}
                </div>
                {cita.resenaComentario?.trim() && (
                  <blockquote className="text-xs italic text-slate-700 dark:text-slate-300 border-l-2 border-amber-400 pl-2.5">
                    &ldquo;{cita.resenaComentario}&rdquo;
                  </blockquote>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. Documentos y Archivos Adjuntos */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Archivos y Documentos Adjuntos
              </h4>
            </div>
            {tieneArchivos && (
              <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-100/70 dark:bg-sky-950/60 px-2 py-0.5 rounded-md">
                {listaArchivos.length} {listaArchivos.length === 1 ? 'archivo' : 'archivos'}
              </span>
            )}
          </div>

          {tieneArchivos ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {listaArchivos.map((archivo) => {
                const url = archivo.arcUrl || archivo.url || '';
                const nombre = archivo.arcNombre || archivo.nombre || 'Documento adjunto';
                const tipo = archivo.arcTipoArchivo || archivo.tipo || '';
                const esImagen = String(tipo).includes('image') || String(url).match(/\.(png|jpg|jpeg|webp)$/i);
                return (
                  <div
                    key={archivo.arcCodigo || archivo.id || url}
                    className="flex flex-col bg-white dark:bg-[#1E293B] rounded-2xl p-3 border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-sky-300 dark:hover:border-sky-600 transition group"
                  >
                    {esImagen ? (
                      <div className="relative w-full h-28 rounded-xl overflow-hidden mb-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <img src={url} alt={nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                    ) : (
                      <div className="w-full h-28 rounded-xl mb-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400">
                        <FileText className="w-8 h-8 text-sky-500 mb-1" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Documento PDF / Archivo</span>
                      </div>
                    )}

                    <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate mb-2.5" title={nombre}>
                      {nombre}
                    </p>

                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-95"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ver Documento</span>
                    </a>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center flex flex-col items-center justify-center">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                <Paperclip className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No se adjuntaron documentos</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Esta cita no cuenta con órdenes médicas o archivos adjuntos.</p>
            </div>
          )}
        </div>

        {/* 6. Acciones rápidas según el estado */}
        <div className="pt-2">
          {isCompleted && (!cita.ctaCalificacion || cita.ctaCalificacion <= 0) && (
            <button 
              onClick={() => {
                onClose();
                router.push(`/dashboard/citas?citaId=${cita.ctaCodigo}&resena=true`);
              }}
              className="w-full py-3 px-4 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors shadow-md text-center flex items-center justify-center gap-2 cursor-pointer mb-2"
            >
              <Star className="w-4 h-4 fill-white text-white" />
              <span>Escribir reseña del médico</span>
            </button>
          )}

          {['programada', 'confirmada', 'pospuesta'].includes(cita.ctaEstado) && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button 
                onClick={() => onEdit?.(cita)}
                className="flex-1 py-3 px-4 bg-[#2563EB] text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm text-center cursor-pointer"
              >
                Reprogramar cita
              </button>
              <button 
                onClick={() => onCancel?.(cita)}
                className="flex-1 py-3 px-4 bg-white dark:bg-[#1E293B] border border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-center cursor-pointer"
              >
                Cancelar cita
              </button>
            </div>
          )}
        </div>

      </div>
    </SideDrawer>
  );
}
