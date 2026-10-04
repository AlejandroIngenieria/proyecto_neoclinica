'use client';

import { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Search,
  Check,
  UploadCloud,
  Loader2,
  Trash2,
  CreditCard,
  Image as ImageIcon,
} from 'lucide-react';
import { useAseguradoras, useGuardarSeguro } from '@/hooks/use-flujo-citas';
import { toast } from 'sonner';
import type { BilleteraMetodoDto } from '@/types/citas';

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
  const { data: catalogoAseguradoras = [], isLoading: isLoadingAseguradoras } = useAseguradoras();
  const { mutateAsync: guardarSeguro, isPending: isSaving } = useGuardarSeguro();

  const isEditing = Boolean(seguroToEdit);

  const [selectedCodAse, setSelectedCodAse] = useState<number | null>(null);
  const [polizaInput, setPolizaInput] = useState('');
  const [searchAse, setSearchAse] = useState('');

  // 1. Frente del carné
  const [carneFrenteFile, setCarneFrenteFile] = useState<File | null>(null);
  const [carneFrentePreview, setCarneFrentePreview] = useState<string | null>(null);
  const [existingFrenteUrl, setExistingFrenteUrl] = useState<string | null>(null);

  // 2. Reverso del carné
  const [carneReversoFile, setCarneReversoFile] = useState<File | null>(null);
  const [carneReversoPreview, setCarneReversoPreview] = useState<string | null>(null);
  const [existingReversoUrl, setExistingReversoUrl] = useState<string | null>(null);

  // Sincronizar datos al abrir en modo edición o creación
  useEffect(() => {
    if (isOpen) {
      if (seguroToEdit) {
        setSelectedCodAse(seguroToEdit.cod_ase || null);
        const polizaLimpia = seguroToEdit.descripcion.replace(/^P[oó]liza:\s*/i, '').trim();
        setPolizaInput(polizaLimpia);
        setExistingFrenteUrl(seguroToEdit.foto_carne_url || null);
        setExistingReversoUrl(seguroToEdit.foto_carne_reverso_url || null);
      } else {
        setSelectedCodAse(null);
        setPolizaInput('');
        setExistingFrenteUrl(null);
        setExistingReversoUrl(null);
      }
      setCarneFrenteFile(null);
      setCarneFrentePreview(null);
      setCarneReversoFile(null);
      setCarneReversoPreview(null);
      setSearchAse('');
    }
  }, [isOpen, seguroToEdit]);

  if (!isOpen) return null;

  const aseguradorasFiltradas = catalogoAseguradoras.filter((ase) =>
    ase.aseDescripcion.toLowerCase().includes(searchAse.toLowerCase())
  );

  // Manejo de archivo Frente
  const handleFrenteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('La imagen del frente no debe superar los 10MB.');
        return;
      }
      setCarneFrenteFile(file);
      setCarneFrentePreview(URL.createObjectURL(file));
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

  // Manejo de archivo Reverso
  const handleReversoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('La imagen del reverso no debe superar los 10MB.');
        return;
      }
      setCarneReversoFile(file);
      setCarneReversoPreview(URL.createObjectURL(file));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCodAse) {
      toast.warning('Por favor selecciona tu aseguradora médica.');
      return;
    }

    if (!polizaInput.trim()) {
      toast.warning('Por favor ingresa el número de póliza o carné.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('CodAse', selectedCodAse.toString());
      formData.append('NumeroPoliza', polizaInput.trim());

      // Archivo Frente
      if (carneFrenteFile) {
        formData.append('FotoCarneArchivo', carneFrenteFile);
      } else if (existingFrenteUrl) {
        formData.append('FotoCarneUrl', existingFrenteUrl);
      }

      // Archivo Reverso
      if (carneReversoFile) {
        formData.append('FotoCarneReversoArchivo', carneReversoFile);
      } else if (existingReversoUrl) {
        formData.append('FotoCarneReversoUrl', existingReversoUrl);
      }

      if (isEditing && seguroToEdit) {
        formData.append('SegCodigo', seguroToEdit.id_metodo);
        await guardarSeguro({
          codPac: pacCodigo,
          payload: formData,
          segCodigo: seguroToEdit.id_metodo,
        });
        toast.success('Seguro médico actualizado exitosamente.');
      } else {
        await guardarSeguro({
          codPac: pacCodigo,
          payload: formData,
        });
        toast.success('Seguro médico guardado exitosamente en tu billetera.');
      }

      onSuccess?.();
      handleClose();
    } catch (err: any) {
      console.error('Error al guardar seguro:', err);
      toast.error('No se pudo guardar el seguro médico. Intenta de nuevo.');
    }
  };

  const handleClose = () => {
    setSelectedCodAse(null);
    setPolizaInput('');
    setSearchAse('');
    handleRemoveFrente();
    handleRemoveReverso();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        
        {/* Header Modal limpio */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {isEditing ? 'Editar Seguro Médico' : 'Añadir Seguro Médico'}
              </h3>
              {pacienteNombre && (
                <p className="text-xs text-slate-400">
                  Para {pacienteNombre}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body con scroll */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            
            {/* Aseguradora */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Aseguradora <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {catalogoAseguradoras.length} disponibles
                </span>
              </div>

              {/* Buscador */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchAse}
                  onChange={(e) => setSearchAse(e.target.value)}
                  placeholder="Buscar aseguradora (ej. El Roble, G&T, Mapfre, Pan-American, Universales...)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#0F172A] text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Grid de aseguradoras */}
              {isLoadingAseguradoras ? (
                <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Cargando aseguradoras...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {aseguradorasFiltradas.map((ase) => {
                    const isAseSelected = selectedCodAse === ase.aseCodigo;
                    return (
                      <button
                        type="button"
                        key={ase.aseCodigo}
                        onClick={() => setSelectedCodAse(ase.aseCodigo)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                          isAseSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-500'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                          {ase.aseImagen ? (
                            <img
                              src={ase.aseImagen}
                              alt={ase.aseDescripcion}
                              className="w-full h-full object-contain p-0.5"
                            />
                          ) : (
                            <ShieldCheck className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <span className={`text-xs truncate flex-1 ${
                          isAseSelected ? 'font-semibold text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          {ase.aseDescripcion}
                        </span>
                        {isAseSelected && (
                          <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Número de Póliza */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Número de Póliza o Carné <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={polizaInput}
                onChange={(e) => setPolizaInput(e.target.value)}
                placeholder="Ej. POL-9012398 o 132465465"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400">
                Identificador de tu cobertura emitido por la compañía aseguradora.
              </p>
            </div>

            {/* Fotografías del Carné (Ambos Lados: Frente y Reverso) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Fotografías del Carné (Ambos lados)</span>
                  <span className="text-slate-400 font-normal text-[11px]">(opcional)</span>
                </label>
                <span className="text-[11px] text-slate-400">Frente y Reverso</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* 1. Lado Frontal (Frente) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500" /> Lado Frontal (Frente)
                    </span>
                    {(carneFrentePreview || existingFrenteUrl) && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Adjuntado</span>
                    )}
                  </div>

                  {carneFrentePreview || existingFrenteUrl ? (
                    <div className="relative flex items-center gap-3 p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-[#0F172A]">
                      <img
                        src={carneFrentePreview || existingFrenteUrl!}
                        alt="Frente carné"
                        className="w-16 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 bg-white"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {carneFrenteFile ? carneFrenteFile.name : 'Frente vinculado'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {carneFrenteFile ? `${(carneFrenteFile.size / 1024).toFixed(0)} KB` : 'Imagen guardada'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFrente}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Eliminar foto frontal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-[#0F172A] hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFrenteChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex flex-col items-center justify-center gap-1 py-4 text-center px-3">
                        <UploadCloud className="w-5 h-5 text-blue-500" />
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Subir frente
                        </p>
                        <p className="text-[10px] text-slate-400">
                          JPG o PNG · máx. 10 MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Lado Posterior (Reverso) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" /> Lado Posterior (Reverso)
                    </span>
                    {(carneReversoPreview || existingReversoUrl) && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Adjuntado</span>
                    )}
                  </div>

                  {carneReversoPreview || existingReversoUrl ? (
                    <div className="relative flex items-center gap-3 p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-[#0F172A]">
                      <img
                        src={carneReversoPreview || existingReversoUrl!}
                        alt="Reverso carné"
                        className="w-16 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 bg-white"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {carneReversoFile ? carneReversoFile.name : 'Reverso vinculado'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {carneReversoFile ? `${(carneReversoFile.size / 1024).toFixed(0)} KB` : 'Imagen guardada'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveReverso}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Eliminar foto del reverso"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-[#0F172A] hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReversoChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex flex-col items-center justify-center gap-1 py-4 text-center px-3">
                        <UploadCloud className="w-5 h-5 text-indigo-500" />
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Subir reverso
                        </p>
                        <p className="text-[10px] text-slate-400">
                          JPG o PNG · máx. 10 MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>

          {/* Footer Modal */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !selectedCodAse || !polizaInput.trim()}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEditing ? 'Guardar cambios' : 'Guardar seguro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
