'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { useCreateCita, useUploadDocumentoCita } from '@/hooks/use-flujo-citas';
import { useCitaStore } from '@/store/use-cita-store';
import { ArrowLeft, Check, FileText, UploadCloud, X, Loader2 } from 'lucide-react';
import type { CrearCitaRequest } from '@/types/citas';

export function Step4Confirmacion() {
  const router = useRouter();
  const { 
    codMedico, modalidad, clinicaSeleccionada, areaDomicilio,
    fecha, hora, pacienteSeleccionado, grupoId, motivo,
    archivos, setArchivos, prevStep
  } = useCitaStore();

  const { mutateAsync: createCita } = useCreateCita();
  const { mutateAsync: uploadDocumento } = useUploadDocumentoCita();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setArchivos([...archivos, ...acceptedFiles]);
  }, [archivos, setArchivos]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    },
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  const removeFile = (index: number) => {
    const newFiles = [...archivos];
    newFiles.splice(index, 1);
    setArchivos(newFiles);
  };

  const handleConfirm = async () => {
    if (!codMedico || !pacienteSeleccionado || !fecha || !hora || !modalidad) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Preparar DTO
      let precio = 0;
      let consultorioId = undefined;

      if (modalidad === 'presencial' && clinicaSeleccionada) {
        precio = clinicaSeleccionada.mclPrecioBase;
        consultorioId = clinicaSeleccionada.cliCodigo;
      } else if (modalidad === 'domicilio' && areaDomicilio) {
        precio = 0; 
        consultorioId = null; 
      }

      const request: CrearCitaRequest = {
        codPaciente: pacienteSeleccionado.pacCodigo,
        codMedico,
        grupoId: grupoId || undefined,
        consultorioId,
        fecha: fecha.toISOString().split('T')[0],
        hora: hora + ':00', // Asegurar formato HH:mm:ss si 'hora' es 'HH:mm'
        modalidad,
        precio,
        motivo: motivo || undefined
      };

      // 2. Crear Cita
      const citaId = await createCita(request);

      // 3. Subir Documentos si hay
      if (archivos.length > 0) {
        // Upload concurrently or sequentially. We do sequentially to avoid overwhelming.
        for (const file of archivos) {
          await uploadDocumento({
            codPaciente: pacienteSeleccionado.pacCodigo,
            codCita: citaId,
            file
          });
        }
      }

      // 4. Redirect a éxito
      router.push(`/dashboard/citas/${citaId}/exito`);
      
    } catch (e: any) {
      console.error('Error al agendar cita', e);
      setError('Ocurrió un error al agendar la cita. Por favor intenta de nuevo.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Confirma tu cita</h2>
        <p className="mt-1 text-slate-500">Revisa los datos y adjunta documentos si es necesario.</p>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-600 border border-rose-200">
          {error}
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4">Documentos previos (Opcional)</h3>
        <p className="text-sm text-slate-500 mb-4">
          Puedes adjuntar fotos de recetas anteriores, resultados de laboratorio o imágenes relevantes. (Max 5MB)
        </p>

        <div 
          {...getRootProps()} 
          className={`flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 transition-colors cursor-pointer ${
            isDragActive ? 'border-sky-500 bg-sky-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className={`h-10 w-10 ${isDragActive ? 'text-sky-500' : 'text-slate-400'}`} />
          <p className="mt-4 text-sm font-bold text-slate-700">
            {isDragActive ? 'Suelta los archivos aquí...' : 'Haz clic o arrastra archivos aquí'}
          </p>
          <p className="mt-1 text-xs text-slate-500">PDF, JPG o PNG</p>
        </div>

        {archivos.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {archivos.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 bg-white shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="h-5 w-5 shrink-0 text-sky-500" />
                  <p className="truncate text-sm font-semibold text-slate-700">{file.name}</p>
                </div>
                <button 
                  onClick={() => removeFile(idx)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                  title="Eliminar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between border-t border-slate-100 pt-6">
        <button
          onClick={prevStep}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 shadow-lg shadow-emerald-200 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              Confirmar Cita
              <Check className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
