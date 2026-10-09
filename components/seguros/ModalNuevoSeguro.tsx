'use client';

import { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Check,
  UploadCloud,
  Loader2,
  Trash2,
  CreditCard,
  FileText,
  FileCheck2,
  Sparkles,
} from 'lucide-react';
import { useGuardarSeguro } from '@/hooks/use-flujo-citas';
import { toast } from 'sonner';
import type { BilleteraMetodoDto } from '@/types/citas';
import { compressImageFile, formatBytes } from '@/utils/image-compression';

interface ModalNuevoSeguroProps {
  isOpen: boolean;
  onClose: () => void;
  pacCodigo: string;
  pacienteNombre?: string;
  seguroToEdit?: BilleteraMetodoDto | null;
  onSuccess?: () => void;
}

export function ModalNuevoSeguro({
  isOpen,
  onClose,
  pacCodigo,
  pacienteNombre,
  seguroToEdit,
  onSuccess,
}: ModalNuevoSeguroProps) {
  const { mutateAsync: guardarSeguro, isPending: isSaving } = useGuardarSeguro();

  const isEditing = Boolean(seguroToEdit);

  // Modo de subida: 'imagenes' (frente y reverso) o 'pdf' (un PDF con ambas caras)
  const [modoSubida, setModoSubida] = useState<'imagenes' | 'pdf'>('imagenes');

  // 1. Frente del carné
  const [carneFrenteFile, setCarneFrenteFile] = useState<File | null>(null);
  const [carneFrentePreview, setCarneFrentePreview] = useState<string | null>(null);
  const [existingFrenteUrl, setExistingFrenteUrl] = useState<string | null>(null);

  // 2. Reverso del carné
  const [carneReversoFile, setCarneReversoFile] = useState<File | null>(null);
  const [carneReversoPreview, setCarneReversoPreview] = useState<string | null>(null);
  const [existingReversoUrl, setExistingReversoUrl] = useState<string | null>(null);

  // 3. Archivo PDF único
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  // Sincronizar datos al abrir
  useEffect(() => {
    if (isOpen) {
      if (seguroToEdit) {
        setExistingFrenteUrl(seguroToEdit.foto_carne_url || null);
        setExistingReversoUrl(seguroToEdit.foto_carne_reverso_url || null);
      } else {
        setExistingFrenteUrl(null);
        setExistingReversoUrl(null);
      }
      setCarneFrenteFile(null);
      setCarneFrentePreview(null);
      setCarneReversoFile(null);
      setCarneReversoPreview(null);
      setPdfFile(null);
      setModoSubida('imagenes');
    }
  }, [isOpen, seguroToEdit]);

  if (!isOpen) return null;

  // Manejo de archivo Frente (con compresión automática)
  const handleFrenteChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen del frente no debe superar los 10MB.');
      return;
    }

    setIsProcessing(true);
    try {
      const optimized = await compressImageFile(file, { maxDimension: 1920, quality: 0.82 });
      setCarneFrenteFile(optimized);
      setCarneFrentePreview(URL.createObjectURL(optimized));
    } catch {
      setCarneFrenteFile(file);
      setCarneFrentePreview(URL.createObjectURL(file));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveFrente = () => {
    setCarneFrenteFile(null);
    if (carneFrentePreview) {
      URL.revokeObjectURL(carneFrentePreview);
      setCarneFrentePreview(null);
    }
    setExistingFrenteUrl(null);
  };

  // Manejo de archivo Reverso (con compresión automática)
  const handleReversoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen del reverso no debe superar los 10MB.');
      return;
    }

    setIsProcessing(true);
    try {
      const optimized = await compressImageFile(file, { maxDimension: 1920, quality: 0.82 });
      setCarneReversoFile(optimized);
      setCarneReversoPreview(URL.createObjectURL(optimized));
    } catch {
      setCarneReversoFile(file);
      setCarneReversoPreview(URL.createObjectURL(file));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveReverso = () => {
    setCarneReversoFile(null);
    if (carneReversoPreview) {
      URL.revokeObjectURL(carneReversoPreview);
      setCarneReversoPreview(null);
    }
    setExistingReversoUrl(null);
  };

  // Manejo de archivo PDF
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo PDF no debe superar los 10MB.');
      return;
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Por favor selecciona un archivo PDF válido.');
      return;
    }

    setPdfFile(file);
  };

  const handleRemovePdf = () => {
    setPdfFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modoSubida === 'imagenes') {
      const hasFrente = Boolean(carneFrenteFile || existingFrenteUrl);
      const hasReverso = Boolean(carneReversoFile || existingReversoUrl);

      if (!hasFrente) {
        toast.warning('Por favor adjunta la foto frontal (cara de adelante) del carné.');
        return;
      }
      if (!hasReverso) {
        toast.warning('Por favor adjunta la foto trasera (reverso) del carné.');
        return;
      }
    } else {
      if (!pdfFile && !existingFrenteUrl) {
        toast.warning('Por favor selecciona el archivo PDF con las dos caras del carné.');
        return;
      }
    }

    try {
      const formData = new FormData();
      formData.append('CodAse', '1');
      formData.append('NumeroPoliza', 'Adjunto en carné');

      if (modoSubida === 'imagenes') {
        if (carneFrenteFile) {
          formData.append('FotoCarneArchivo', carneFrenteFile);
        } else if (existingFrenteUrl) {
          formData.append('FotoCarneUrl', existingFrenteUrl);
        }

        if (carneReversoFile) {
          formData.append('FotoCarneReversoArchivo', carneReversoFile);
        } else if (existingReversoUrl) {
          formData.append('FotoCarneReversoUrl', existingReversoUrl);
        }
      } else {
        // En modo PDF, se envía el PDF como documento principal del carné
        if (pdfFile) {
          formData.append('FotoCarneArchivo', pdfFile);
        } else if (existingFrenteUrl) {
          formData.append('FotoCarneUrl', existingFrenteUrl);
        }
      }

      if (isEditing && seguroToEdit) {
        formData.append('SegCodigo', seguroToEdit.id_metodo);
        await guardarSeguro({
          codPac: pacCodigo,
          payload: formData,
          segCodigo: seguroToEdit.id_metodo,
        });
        toast.success('Carné de seguro médico actualizado.');
      } else {
        await guardarSeguro({
          codPac: pacCodigo,
          payload: formData,
        });
        toast.success('Carné de seguro médico guardado exitosamente.');
      }

      onSuccess?.();
      handleClose();
    } catch (err: any) {
      console.error('Error al guardar carné de seguro:', err);
      toast.error('No se pudo guardar el carné de seguro médico. Intenta nuevamente.');
    }
  };

  const handleClose = () => {
    handleRemoveFrente();
    handleRemoveReverso();
    handleRemovePdf();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Actualizar Carné de Seguro' : 'Subir Carné de Seguro Médico'}
              </h3>
              {pacienteNombre && (
                <p className="text-xs text-slate-400">
                  Para el paciente: {pacienteNombre}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            
            {/* Mensaje de simplicidad: no se pide institución ni número */}
            <div className="rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 p-4">
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 leading-relaxed">
                ℹ️ <strong>Validación directa:</strong> No requieres escribir el nombre de la institución ni tu número de póliza. Estos datos van impresos en el carné y serán validados directamente por el consultorio médico.
              </p>
            </div>

            {/* Selector de tipo de carga */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                ¿Cómo prefieres subir tu carné?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setModoSubida('imagenes')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                    modoSubida === 'imagenes'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <CreditCard className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-xs font-bold">2 Imágenes</p>
                    <p className="text-[10px] text-slate-400">Frente y Reverso</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setModoSubida('pdf')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                    modoSubida === 'pdf'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <FileText className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-xs font-bold">1 Archivo PDF</p>
                    <p className="text-[10px] text-slate-400">Con ambas caras</p>
                  </div>
                </button>
              </div>
            </div>

            {/* SECCIÓN MODO IMÁGENES: FRENTE Y REVERSO */}
            {modoSubida === 'imagenes' && (
              <div className="space-y-4 animate-in fade-in">
                
                {/* 1. Cara Frontal */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>1. Cara Frontal del Carné (Frente) <span className="text-rose-500">*</span></span>
                    {(carneFrenteFile || existingFrenteUrl) && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                        <Check className="w-3.5 h-3.5" /> Cargado
                      </span>
                    )}
                  </div>

                  {carneFrentePreview || existingFrenteUrl ? (
                    <div className="relative flex items-center justify-between p-3.5 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={carneFrentePreview || existingFrenteUrl!}
                          alt="Frente del carné"
                          className="w-16 h-11 object-cover rounded-xl border border-slate-200 dark:border-slate-700 bg-white shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {carneFrenteFile ? carneFrenteFile.name : 'Cara frontal guardada'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold">
                            {carneFrenteFile ? formatBytes(carneFrenteFile.size) : 'Listo'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFrente}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="relative flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 rounded-2xl bg-slate-50/50 dark:bg-[#0F172A] cursor-pointer transition-colors text-center">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFrenteChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Subir foto de la parte de adelante
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG o WEBP (máx. 10MB)</p>
                    </label>
                  )}
                </div>

                {/* 2. Cara Trasera (Reverso) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>2. Cara Posterior del Carné (Reverso) <span className="text-rose-500">*</span></span>
                    {(carneReversoFile || existingReversoUrl) && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                        <Check className="w-3.5 h-3.5" /> Cargado
                      </span>
                    )}
                  </div>

                  {carneReversoPreview || existingReversoUrl ? (
                    <div className="relative flex items-center justify-between p-3.5 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={carneReversoPreview || existingReversoUrl!}
                          alt="Reverso del carné"
                          className="w-16 h-11 object-cover rounded-xl border border-slate-200 dark:border-slate-700 bg-white shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {carneReversoFile ? carneReversoFile.name : 'Cara posterior guardada'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold">
                            {carneReversoFile ? formatBytes(carneReversoFile.size) : 'Listo'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveReverso}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="relative flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 rounded-2xl bg-slate-50/50 dark:bg-[#0F172A] cursor-pointer transition-colors text-center">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleReversoChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Subir foto de la parte de atrás
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG o WEBP (máx. 10MB)</p>
                    </label>
                  )}
                </div>

              </div>
            )}

            {/* SECCIÓN MODO PDF: DOCUMENTO ÚNICO */}
            {modoSubida === 'pdf' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Documento PDF con las dos caras <span className="text-rose-500">*</span></span>
                  {pdfFile && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3.5 h-3.5" /> Archivo PDF listo
                    </span>
                  )}
                </div>

                {pdfFile ? (
                  <div className="relative flex items-center justify-between p-4 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {pdfFile.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          {formatBytes(pdfFile.size)} · Documento PDF
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePdf}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 rounded-2xl bg-slate-50/50 dark:bg-[#0F172A] cursor-pointer transition-colors text-center">
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handlePdfChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Subir archivo PDF con ambas caras del carné
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Formato PDF (máx. 10MB)</p>
                  </label>
                )}
              </div>
            )}

          </div>

          {/* Footer Modal Actions */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B1120] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving || isProcessing}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || isProcessing}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
            >
              {(isSaving || isProcessing) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? 'Guardar Cambios' : 'Confirmar Carné'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
