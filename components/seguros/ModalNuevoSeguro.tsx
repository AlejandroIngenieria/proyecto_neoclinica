'use client';

import { useState, useEffect, useId } from 'react';
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
  Building2,
  Hash,
  Info,
} from 'lucide-react';
import { useGuardarSeguro, useAseguradoras } from '@/hooks/use-flujo-citas';
import { toast } from 'sonner';
import type { BilleteraMetodoDto } from '@/types/citas';
import { compressImageFile, formatBytes } from '@/utils/image-compression';

export interface ModalNuevoSeguroProps {
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
  const { data: aseguradoras = [], isLoading: isLoadingAseguradoras } = useAseguradoras();

  const isEditing = Boolean(seguroToEdit);

  // Aseguradora y póliza
  const [codAse, setCodAse] = useState<number>(1);
  const [numeroPoliza, setNumeroPoliza] = useState<string>('');

  // Modo de subida: 'imagenes' (frente y reverso) o 'pdf' (un archivo PDF con ambas caras)
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

  // Sincronizar datos al abrir o cambiar de modo
  useEffect(() => {
    if (isOpen) {
      if (seguroToEdit) {
        // Encontrar código de aseguradora si viene o buscar por nombre
        let initialCodAse = seguroToEdit.cod_ase || 1;
        if (!seguroToEdit.cod_ase && seguroToEdit.proveedor && aseguradoras.length > 0) {
          const match = aseguradoras.find(
            (a) => a.aseDescripcion.toLowerCase() === seguroToEdit.proveedor.toLowerCase()
          );
          if (match) initialCodAse = match.aseCodigo;
        }
        setCodAse(initialCodAse);

        // Extraer número de póliza limpiando prefijos
        const polizaLimpia = (seguroToEdit.descripcion || '')
          .replace(/^(P[\w\W]{1,4}?liza|Póliza|Poliza):\s*/i, '')
          .replace(/^Adjunto en carné$/i, '')
          .trim();
        setNumeroPoliza(polizaLimpia);

        setExistingFrenteUrl(seguroToEdit.foto_carne_url || null);
        setExistingReversoUrl(seguroToEdit.foto_carne_reverso_url || null);
      } else {
        setCodAse(aseguradoras[0]?.aseCodigo || 1);
        setNumeroPoliza('');
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
  }, [isOpen, seguroToEdit, aseguradoras]);

  // Si cambia el listado de aseguradoras y no había seleccionado una válida
  useEffect(() => {
    if (!seguroToEdit && aseguradoras.length > 0 && !aseguradoras.some((a) => a.aseCodigo === codAse)) {
      setCodAse(aseguradoras[0].aseCodigo);
    }
  }, [aseguradoras, codAse, seguroToEdit]);

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

  const handleClose = () => {
    handleRemoveFrente();
    handleRemoveReverso();
    handleRemovePdf();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!codAse || codAse <= 0) {
      toast.warning('Por favor selecciona tu aseguradora.');
      return;
    }

    if (modoSubida === 'imagenes') {
      const hasFrente = Boolean(carneFrenteFile || existingFrenteUrl);
      if (!hasFrente) {
        toast.warning('Por favor adjunta la foto frontal (frente) del carné.');
        return;
      }
    } else {
      if (!pdfFile && !existingFrenteUrl) {
        toast.warning('Por favor selecciona el archivo PDF con las caras del carné.');
        return;
      }
    }

    try {
      const formData = new FormData();
      formData.append('CodAse', codAse.toString());
      formData.append('codAse', codAse.toString());

      const polizaFinal = numeroPoliza.trim() ? numeroPoliza.trim() : 'Adjunto en carné';
      formData.append('NumeroPoliza', polizaFinal);
      formData.append('numeroPoliza', polizaFinal);

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
        formData.append('segCodigo', seguroToEdit.id_metodo);
        await guardarSeguro({
          codPac: pacCodigo,
          payload: formData,
          segCodigo: seguroToEdit.id_metodo,
        });
        toast.success('Seguro médico actualizado correctamente.');
      } else {
        await guardarSeguro({
          codPac: pacCodigo,
          payload: formData,
        });
        toast.success('Seguro médico vinculado a tu billetera.');
      }

      onSuccess?.();
      handleClose();
    } catch (err: any) {
      console.error('Error al guardar carné de seguro:', err);
      const serverMessage = err?.response?.data?.message || err?.message;
      toast.error(serverMessage || 'No se pudo guardar el seguro médico. Intenta nuevamente.');
    }
  };

  if (!isOpen) return null;

  const aseguradoraActual = aseguradoras.find((a) => a.aseCodigo === codAse);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-xl bg-white dark:bg-[#1E293B] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/50 shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Editar Seguro Médico' : 'Añadir Seguro Médico'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {pacienteNombre ? `Para: ${pacienteNombre}` : 'Billetera digital de cobertura médica'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            
            {/* Banner Informativo */}
            <div className="rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/40 p-3.5 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-950 dark:text-blue-200 leading-relaxed font-medium">
                Al registrar tu seguro, el consultorio y la clínica podrán validar tu cobertura médica de forma ágil para tus citas y copagos.
              </p>
            </div>

            {/* Selector de Aseguradora y Póliza */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Aseguradora */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Aseguradora <span className="text-rose-500">*</span></span>
                </label>
                <div className="relative">
                  <select
                    value={codAse}
                    onChange={(e) => setCodAse(Number(e.target.value))}
                    disabled={isLoadingAseguradoras || isSaving}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {aseguradoras.map((ase) => (
                      <option key={ase.aseCodigo} value={ase.aseCodigo}>
                        {ase.aseDescripcion}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Número de Póliza */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-blue-500" />
                  <span>No. de Póliza o Certificado</span>
                </label>
                <input
                  type="text"
                  value={numeroPoliza}
                  onChange={(e) => setNumeroPoliza(e.target.value)}
                  placeholder="Ej. 1294820 ó en carné"
                  disabled={isSaving}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white text-xs font-semibold placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Selector de modo de carga del carné */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                Documento o Carné del Seguro
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setModoSubida('imagenes')}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                    modoSubida === 'imagenes'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <CreditCard className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-xs font-bold">Fotos de Carné</p>
                    <p className="text-[10px] text-slate-400">Frente y Reverso</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setModoSubida('pdf')}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                    modoSubida === 'pdf'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <FileText className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-xs font-bold">1 Archivo PDF</p>
                    <p className="text-[10px] text-slate-400">Póliza digital / carné</p>
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
                    <div className="relative flex items-center justify-between p-3 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={carneFrentePreview || existingFrenteUrl!}
                          alt="Frente del carné"
                          className="w-16 h-11 object-cover rounded-xl border border-slate-200 dark:border-slate-700 bg-white shrink-0 shadow-2xs"
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
                        title="Eliminar foto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="relative flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-2xl bg-slate-50/50 dark:bg-[#0F172A] cursor-pointer transition-colors text-center group">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFrenteChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-blue-500 mb-1 transition-colors" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Subir foto de la parte frontal
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG o WEBP (máx. 10MB)</p>
                    </label>
                  )}
                </div>

                {/* 2. Cara Trasera (Reverso) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                      2. Cara Posterior (Reverso)
                      <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
                    </span>
                    {(carneReversoFile || existingReversoUrl) && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                        <Check className="w-3.5 h-3.5" /> Cargado
                      </span>
                    )}
                  </div>

                  {carneReversoPreview || existingReversoUrl ? (
                    <div className="relative flex items-center justify-between p-3 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={carneReversoPreview || existingReversoUrl!}
                          alt="Reverso del carné"
                          className="w-16 h-11 object-cover rounded-xl border border-slate-200 dark:border-slate-700 bg-white shrink-0 shadow-2xs"
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
                        title="Eliminar foto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="relative flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-2xl bg-slate-50/50 dark:bg-[#0F172A] cursor-pointer transition-colors text-center group">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleReversoChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-blue-500 mb-1 transition-colors" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Subir foto de la parte trasera
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
                  <span>Documento PDF del carné o póliza <span className="text-rose-500">*</span></span>
                  {pdfFile && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3.5 h-3.5" /> Archivo PDF listo
                    </span>
                  )}
                </div>

                {pdfFile ? (
                  <div className="relative flex items-center justify-between p-3.5 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
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
                      title="Eliminar PDF"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-2xl bg-slate-50/50 dark:bg-[#0F172A] cursor-pointer transition-colors text-center group">
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handlePdfChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-blue-500 mb-2 transition-colors" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Subir archivo PDF con tu carné o certificado
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Formato PDF (máx. 10MB)</p>
                  </label>
                )}
              </div>
            )}

          </div>

          {/* Footer Modal Actions */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving || isProcessing}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || isProcessing}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
            >
              {(isSaving || isProcessing) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? 'Guardar Cambios' : 'Registrar Seguro'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
