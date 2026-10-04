'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Eye,
  Loader2,
  X,
  FileCheck2,
  MoreVertical,
  Pencil,
  AlertTriangle,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import { useBilletera, useEliminarSeguro } from '@/hooks/use-flujo-citas';
import { ModalNuevoSeguro } from './ModalNuevoSeguro';
import type { BilleteraMetodoDto } from '@/types/citas';

interface BilleteraSegurosSeccionProps {
  pacCodigo: string;
  pacienteNombre?: string;
  onZoomCarne?: (url: string) => void;
}

export function BilleteraSegurosSeccion({
  pacCodigo,
  pacienteNombre,
  onZoomCarne,
}: BilleteraSegurosSeccionProps) {
  const { data: billetera = [], isLoading } = useBilletera(pacCodigo);
  const { mutateAsync: eliminarSeguro, isPending: isDeleting } = useEliminarSeguro();

  // Modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [seguroToEdit, setSeguroToEdit] = useState<BilleteraMetodoDto | null>(null);
  const [seguroToDelete, setSeguroToDelete] = useState<BilleteraMetodoDto | null>(null);

  // Zoom de carné interactivo (con soporte para Frente y Reverso)
  const [activeZoom, setActiveZoom] = useState<{
    item: BilleteraMetodoDto;
    side: 'frente' | 'reverso';
  } | null>(null);

  const seguros = billetera.filter((b) => b.tipo === 'SEGURO');

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!seguroToDelete) return;
    try {
      await eliminarSeguro({ codPac: pacCodigo, segCodigo: seguroToDelete.id_metodo });
      setSeguroToDelete(null);
    } catch (err) {
      console.error('Error al eliminar seguro:', err);
    }
  };

  const handleZoom = (item: BilleteraMetodoDto, side: 'frente' | 'reverso') => {
    const url = side === 'frente' ? item.foto_carne_url : item.foto_carne_reverso_url;
    if (!url) return;

    if (onZoomCarne) {
      onZoomCarne(url);
    } else {
      setActiveZoom({ item, side });
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Header Minimalista */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                Seguros y Pagos
              </h2>
              <div className="mt-0.5">
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full inline-block">
                  Billetera
                </span>
              </div>
            </div>
          </div>

          {/* Botón circular minimalista para agregar */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="w-10 h-10 shrink-0 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Añadir Seguro"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido de la Billetera */}
        <div className="p-6 md:p-8">
          {isLoading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <p className="text-xs">Cargando tu billetera médica...</p>
            </div>
          ) : seguros.length === 0 ? (
            <EmptyWalletState onAdd={() => setIsAddModalOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {seguros.map((item) => (
                <InsuranceCard
                  key={item.id_metodo}
                  item={item}
                  onEdit={() => setSeguroToEdit(item)}
                  onDelete={() => setSeguroToDelete(item)}
                  onZoom={(side) => handleZoom(item, side)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 1. Modal para añadir seguro nuevo */}
      <ModalNuevoSeguro
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        pacCodigo={pacCodigo}
        pacienteNombre={pacienteNombre}
      />

      {/* 2. Modal para editar seguro existente */}
      <ModalNuevoSeguro
        isOpen={Boolean(seguroToEdit)}
        onClose={() => setSeguroToEdit(null)}
        pacCodigo={pacCodigo}
        pacienteNombre={pacienteNombre}
        seguroToEdit={seguroToEdit}
      />

      {/* 3. Popup Minimalista de Confirmación de Eliminación */}
      {seguroToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center border border-rose-100 dark:border-rose-900/40 mb-3.5">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              ¿Eliminar seguro médico?
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Se eliminará la cobertura de <span className="font-semibold text-slate-700 dark:text-slate-300">{seguroToDelete.proveedor}</span> ({seguroToDelete.descripcion}) de tu billetera. Esta acción no se puede deshacer.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSeguroToDelete(null)}
                disabled={isDeleting}
                className="w-1/2 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="w-1/2 py-2 px-3 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Sí, eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal de Zoom de Carné (con pestañas Frente / Reverso) */}
      {activeZoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveZoom(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white dark:bg-[#1E293B] rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Zoom */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeZoom.item.proveedor}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {activeZoom.item.descripcion}
                  </p>
                </div>
              </div>

              {/* Selector de Frente / Reverso si ambos existen */}
              <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
                {activeZoom.item.foto_carne_url && (
                  <button
                    type="button"
                    onClick={() => setActiveZoom({ item: activeZoom.item, side: 'frente' })}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      activeZoom.side === 'frente'
                        ? 'bg-white dark:bg-[#1E293B] text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Frente
                  </button>
                )}
                {activeZoom.item.foto_carne_reverso_url && (
                  <button
                    type="button"
                    onClick={() => setActiveZoom({ item: activeZoom.item, side: 'reverso' })}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      activeZoom.side === 'reverso'
                        ? 'bg-white dark:bg-[#1E293B] text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Reverso
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setActiveZoom(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Imagen ampliada */}
            <div className="p-6 flex items-center justify-center bg-slate-900/5 dark:bg-[#0B1120] min-h-[300px]">
              <img
                src={activeZoom.side === 'frente' ? activeZoom.item.foto_carne_url! : activeZoom.item.foto_carne_reverso_url!}
                alt={`Carné ${activeZoom.side}`}
                className="max-h-[65vh] w-auto object-contain rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Subcomponentes ─── */

function EmptyWalletState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
        <ShieldCheck className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          No tienes seguros médicos registrados
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto leading-relaxed">
          Registra tu aseguradora, número de póliza y carné médico (ambos lados). Se aplicará automáticamente al agendar citas.
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Añadir mi primer seguro</span>
      </button>
    </div>
  );
}

interface InsuranceCardProps {
  item: BilleteraMetodoDto;
  onEdit: () => void;
  onDelete: () => void;
  onZoom: (side: 'frente' | 'reverso') => void;
}

function InsuranceCard({ item, onEdit, onDelete, onZoom }: InsuranceCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const hasCarne = Boolean(item.foto_carne_url || item.foto_carne_reverso_url);

  return (
    <div className={`group w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all duration-200 flex flex-col ${isMenuOpen ? 'relative z-30' : 'relative z-10'}`}>
      <div className="p-4 flex flex-col gap-3">

        {/* 1. Fila Principal: Logo, Textos y Menú 3 Puntos */}
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Logo aseguradora */}
            <div className="w-11 h-11 shrink-0 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-200 dark:border-slate-700 overflow-hidden">
              {item.imagen_url ? (
                <img src={item.imagen_url} alt={item.proveedor} className="w-full h-full object-contain p-1" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-blue-500" />
              )}
            </div>

            {/* Textos con min-w-0 para permitir truncamiento */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {item.proveedor}
                </h4>
                {item.es_principal && (
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-800/50">
                    Principal
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {item.descripcion?.replace(/^(P[\w\W]{1,4}?liza|Póliza|Poliza):\s*/i, 'Póliza: ') || item.descripcion}
              </p>
            </div>
          </div>

          {/* Menú de 3 puntos interactivo */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Opciones de seguro"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Menú Flotante Minimalista */}
            {isMenuOpen && (
              <div className="absolute right-0 top-9 z-30 w-36 bg-white dark:bg-[#1E293B] rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onEdit();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-blue-500" />
                  <span>Editar</span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDelete();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Eliminar</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Fila de Carné Médico (Lado Frontal y/o Reverso) */}
        {hasCarne && (
          <div className="mt-1 flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#151E2F]">
            <div className="flex items-center gap-2 min-w-0">
              <FileCheck2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                Carné vinculado {item.foto_carne_url && item.foto_carne_reverso_url ? '(2 lados)' : ''}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Thumbnail Frente */}
              {item.foto_carne_url && (
                <button
                  type="button"
                  onClick={() => onZoom('frente')}
                  className="group/thumb flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 hover:text-blue-600 transition-all cursor-pointer"
                  title="Ampliar Frente del carné"
                >
                  <img
                    src={item.foto_carne_url}
                    alt="Frente"
                    className="w-7 h-5 object-cover rounded border border-slate-200 dark:border-slate-700"
                  />
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 group-hover/thumb:text-blue-600">
                    Frente
                  </span>
                  <Eye className="w-3 h-3 text-slate-400 group-hover/thumb:text-blue-500" />
                </button>
              )}

              {/* Thumbnail Reverso */}
              {item.foto_carne_reverso_url && (
                <button
                  type="button"
                  onClick={() => onZoom('reverso')}
                  className="group/thumb flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 hover:text-indigo-600 transition-all cursor-pointer"
                  title="Ampliar Reverso del carné"
                >
                  <img
                    src={item.foto_carne_reverso_url}
                    alt="Reverso"
                    className="w-7 h-5 object-cover rounded border border-slate-200 dark:border-slate-700"
                  />
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 group-hover/thumb:text-indigo-600">
                    Reverso
                  </span>
                  <Eye className="w-3 h-3 text-slate-400 group-hover/thumb:text-indigo-500" />
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
