import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CitaListDto } from '@/types/citas';

export function imprimirCitaPdf(cita: CitaListDto) {
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

  const cleanState = (cita.ctaEstado || '').toLowerCase().trim().replace(/[\s\-]+/g, '_');
  const esCompletada = ['completada', 'finalizada', 'realizada'].includes(cleanState);

  const diagnostico = cita.ctaDiagnostico?.trim() || (esCompletada ? 'Consulta médica realizada y finalizada. Diagnóstico registrado en el expediente clínico.' : '');
  const tratamiento = cita.ctaTratamiento?.trim() || (esCompletada ? 'Indicaciones médicas y prescripción registrada en la consulta.' : '');
  const examenes = cita.ctaExamenesSolicitados?.trim() || '';
  const notas = cita.ctaNotasMedicas?.trim() || '';
  const codigoCita = cita.ctaCodigo || '';
  const modalidad = (cita.ctaModalidad || 'Presencial').toUpperCase();
  const motivo = cita.ctaMotivo?.trim() || cita.servicioNombre?.trim() || 'Consulta Médica';
  const precio = cita.ctaPrecio ? `Q${Number(cita.ctaPrecio).toFixed(2)}` : 'Q0.00';
  const tipoPago = cita.tipoPagoDescripcion || 'En clínica';
  const tituloDoc = esCompletada ? `Informe Clínico y Receta Médica` : `Comprobante Oficial de Cita Médica`;
  const subtituloDoc = esCompletada ? `Red Médica & Expediente Clínico Digital` : `Constancia de Agendamiento y Turno`;

  let ubicacionTexto = clinica;
  if (cita.ctaModalidad === 'virtual') {
    ubicacionTexto = 'Consulta Online / Telemedicina (Enlace en tu cuenta)';
  } else if (cita.ctaModalidad === 'domicilio') {
    ubicacionTexto = 'Atención a Domicilio (Dirección registrada del paciente)';
  }

  const formatCitaEstado = (estado: string | undefined | null) => {
    if (!estado) return 'Programada';
    const e = estado.toLowerCase().trim();
    if (['completada', 'finalizada', 'realizada'].includes(e)) return 'Completada';
    if (e === 'confirmada') return 'Confirmada';
    if (e === 'programada') return 'Programada';
    if (e === 'pospuesta') return 'Pospuesta';
    if (e === 'cancelada') return 'Cancelada';
    if (e === 'rechazada') return 'Rechazada';
    if (e === 'no_asistio') return 'No asistió';
    return estado;
  };

  const printHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${tituloDoc} - ${paciente}</title>
  <style>
    @page {
      size: letter;
      margin: 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      padding: 24px;
      line-height: 1.5;
      font-size: 13px;
    }
    .no-print-bar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px dashed #cbd5e1;
    }
    .btn-print {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
    }
    .btn-close {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .brand h1 {
      font-size: 24px;
      font-weight: 900;
      color: #2563eb;
      letter-spacing: -0.5px;
    }
    .brand p {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .meta {
      text-align: right;
      font-size: 11px;
      color: #475569;
    }
    .meta strong {
      color: #0f172a;
    }
    .badge-folio {
      display: inline-block;
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 6px;
      font-family: monospace;
      font-weight: 700;
      color: #334155;
      margin-top: 4px;
      border: 1px solid #e2e8f0;
    }
    .grid-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 22px;
    }
    .info-group h4 {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 4px;
      font-weight: 800;
    }
    .info-group p {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .info-group span {
      font-size: 11px;
      color: #64748b;
    }
    .section {
      margin-bottom: 18px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1e293b;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .section-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 13px;
      line-height: 1.6;
      color: #334155;
      white-space: pre-line;
    }
    .box-prescripcion {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #1e3a8a;
      font-weight: 600;
    }
    .box-diagnostico {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #14532d;
    }
    .signature-container {
      margin-top: 40px;
      display: flex;
      justify-content: flex-end;
    }
    .signature-box {
      width: 250px;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #0f172a;
      margin-bottom: 6px;
    }
    .signature-name {
      font-weight: 800;
      font-size: 13px;
      color: #0f172a;
    }
    .signature-role {
      font-size: 11px;
      color: #64748b;
    }
    .footer {
      margin-top: 36px;
      padding-top: 12px;
      border-top: 1px dashed #cbd5e1;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
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
      <p>${subtituloDoc}</p>
    </div>
    <div class="meta">
      <div>Fecha de emisión: <strong>${fechaFormateada}</strong></div>
      <div>Turno: <strong>${horaFormateada}</strong></div>
      <div class="badge-folio">Folio: ${codigoCita}</div>
    </div>
  </div>

  <div class="grid-info">
    <div class="info-group">
      <h4>Paciente</h4>
      <p>${paciente}</p>
      <span>Modalidad: ${modalidad}</span>
    </div>
    <div class="info-group">
      <h4>Médico Tratante</h4>
      <p>${medico}</p>
      <span>${especialidad}</span>
    </div>
    <div class="info-group">
      <h4>Sede de Atención</h4>
      <p>${ubicacionTexto}</p>
    </div>
    <div class="info-group">
      <h4>Servicio / Concepto</h4>
      <p>${motivo}</p>
      <span>Arancel: ${precio} • ${tipoPago}</span>
    </div>
  </div>

  ${esCompletada ? `
    <div class="section">
      <div class="section-title">1. Diagnóstico Clínico</div>
      <div class="section-box box-diagnostico">${diagnostico}</div>
    </div>

    <div class="section">
      <div class="section-title">2. Prescripción y Tratamiento Médico</div>
      <div class="section-box box-prescripcion">${tratamiento}</div>
    </div>

    ${examenes ? `
    <div class="section">
      <div class="section-title">3. Exámenes y Pruebas Solicitadas</div>
      <div class="section-box box-examenes">${examenes}</div>
    </div>
    ` : ''}

    ${notas ? `
    <div class="section">
      <div class="section-title">4. Observaciones Médicas</div>
      <div class="section-box box-notas">${notas}</div>
    </div>
    ` : ''}
  ` : `
    <div class="section">
      <div class="section-title">1. Motivo de Consulta y Servicio</div>
      <div class="section-box box-diagnostico">${motivo}</div>
    </div>

    <div class="section">
      <div class="section-title">2. Estado y Sede de Atención</div>
      <div class="section-box box-notas">
        <strong>Estado:</strong> ${formatCitaEstado(cita.ctaEstado)}<br/>
        <strong>Lugar / Modalidad:</strong> ${ubicacionTexto}
      </div>
    </div>

    <div class="section">
      <div class="section-title">3. Detalle de Honorarios y Pago</div>
      <div class="section-box box-prescripcion">
        <strong>Arancel de Consulta:</strong> ${precio}<br/>
        <strong>Forma de Pago:</strong> ${tipoPago} (${cita.estadoPago === 'pagado' ? 'Pagado' : 'Pago presencial/pendiente'})
      </div>
    </div>

    <div class="section">
      <div class="section-title">4. Instrucciones para la Consulta</div>
      <div class="section-box box-examenes">
        Por favor preséntate 10 a 15 minutos antes de la hora programada en la sede indicada. Si la consulta es por telemedicina/virtual, ingresa a la sala de espera minutos antes de la cita.
      </div>
    </div>
  `}

  <div class="signature-container">
    <div class="signature-box">
      <div class="signature-line"></div>
      <div class="signature-name">${medico}</div>
      <div class="signature-role">${especialidad}</div>
      <div class="signature-role">${esCompletada ? 'Colegiado / Médico Autorizado' : 'Firma de Conformidad / SaludYa'}</div>
    </div>
  </div>

  <div class="footer">
    Documento oficial generado por el sistema SaludYa. Validez para fines clínicos y administrativos.
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
</html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (e) {}
    }, 400);
  }
}
