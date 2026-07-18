'use client';

import { useState } from 'react';
import { useCitaStore } from '@/store/use-cita-store';
import { useMetodosPago, useBilletera, useGuardarSeguro, useGuardarTarjeta, usePacientesSeleccion } from '@/hooks/use-flujo-citas';
import { ChevronLeft, ArrowRight, CreditCard, Banknote, Landmark, Wallet, Plus, ShieldCheck, Loader2, Info } from 'lucide-react';
import { NeoLoader } from '@/components/neo-loader';

export function Step3MetodoPago() {
    const {
        codMedico, pacienteSeleccionado,
        tipoPagoId, setTipoPagoId,
        billeteraItemId, setBilleteraItemId,
        prevStep, nextStep, modalidad
    } = useCitaStore();

    const { data: metodosTotales = [], isLoading } = useMetodosPago(codMedico);
    const { data: pacientes } = usePacientesSeleccion();
    const pacienteTitular = pacientes?.find(p => p.pacTitular) || pacienteSeleccionado;
    const { data: billetera = [], isLoading: isLoadingBilletera } = useBilletera(pacienteTitular?.pacCodigo || null);

    const metodosPago = metodosTotales.filter(m => {
        if (modalidad === 'virtual' && m.descripcion.toLowerCase().includes('efectivo')) {
            return false;
        }
        return true;
    });

    const { mutateAsync: saveSeguro } = useGuardarSeguro();
    const { mutateAsync: saveTarjeta } = useGuardarTarjeta();

    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newPoliza, setNewPoliza] = useState('');
    const [newCardNum, setNewCardNum] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const getIconForMethod = (descripcion: string) => {
        const desc = descripcion.toLowerCase();
        if (desc.includes('efectivo')) return Banknote;
        if (desc.includes('tarjeta')) return CreditCard;
        if (desc.includes('transferencia') || desc.includes('banco')) return Landmark;
        if (desc.includes('seguro')) return ShieldCheck;
        return Wallet;
    };

    const metodoSeleccionado = metodosPago.find(m => m.tipoPagoId === tipoPagoId);
    const isTarjetaActiva = metodoSeleccionado?.descripcion.toLowerCase().includes('tarjeta');
    const isSeguroActivo = metodoSeleccionado?.descripcion.toLowerCase().includes('seguro');

    const handleSelectMetodo = (id: number) => {
        setTipoPagoId(id);
        setBilleteraItemId(null); // Reset sub-selection
        setIsAddingNew(false);
    };

    const handleSaveNewItem = async (isTarjetaContext: boolean, isSeguroContext: boolean) => {
        if (!pacienteTitular) return;
        setIsSaving(true);
        try {
            if (isSeguroContext) {
                await saveSeguro({
                    codPac: pacienteTitular.pacCodigo,
                    payload: { codAse: 1, numeroPoliza: newPoliza }
                });
            } else if (isTarjetaContext) {
                await saveTarjeta({
                    codPac: pacienteTitular.pacCodigo,
                    payload: {
                        tokenProcesador: 'tok_mock_' + Math.floor(Math.random() * 100000),
                        ultimos4: newCardNum.slice(-4) || '4242',
                        tipoTarjeta: 'visa'
                    }
                });
            }
            setIsAddingNew(false);
            setNewPoliza('');
            setNewCardNum('');
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="py-12"><NeoLoader fullScreenPortal={false} /></div>;
    }

    let isComplete = tipoPagoId !== null;
    if (isTarjetaActiva || isSeguroActivo) {
        isComplete = isComplete && billeteraItemId !== null;
    }

    return (
        <div className="flex flex-col w-full font-sans pb-28">

            <div className="flex flex-col w-full space-y-10 px-4 pt-6">

                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">¿Cómo prefieres pagar?</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                        Selecciona el método de pago que utilizarás para esta consulta.
                    </p>

                    <div className="flex flex-col gap-2">
                        {metodosPago.map((metodo) => {
                            const isSelected = tipoPagoId === metodo.tipoPagoId;
                            const Icon = getIconForMethod(metodo.descripcion);
                            const isTarjeta = metodo.descripcion.toLowerCase().includes('tarjeta');
                            const isSeguro = metodo.descripcion.toLowerCase().includes('seguro');
                            const isTransferencia = metodo.descripcion.toLowerCase().includes('transferencia');

                            const filteredBilletera = billetera.filter(b => {
                                if (isTarjeta) return b.tipo === 'TARJETA';
                                if (isSeguro) return b.tipo === 'SEGURO';
                                return false;
                            });

                            return (
                                    <div
                                        key={metodo.tipoPagoId}
                                        className={`rounded-2xl border-2 transition-all ${isSelected
                                            ? 'border-blue-600 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-900/20 shadow-sm ring-1 ring-blue-600/10'
                                            : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1E293B] hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm'
                                            }`}
                                    >
                                        {/* Header (Boton de seleccion principal) */}
                                        <button
                                            onClick={() => handleSelectMetodo(metodo.tipoPagoId)}
                                            className="w-full flex items-center py-3 px-4 text-left"
                                        >
                                            <div className={`shrink-0 p-2.5 rounded-full transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-[#0B1120] text-blue-600 dark:text-blue-400'}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 ml-4">
                                                <h3 className={`text-base font-bold leading-tight ${isSelected ? 'text-blue-900 dark:text-blue-300' : 'text-slate-900 dark:text-slate-100'}`}>
                                                    {metodo.descripcion}
                                                </h3>
                                                <p className={`text-xs font-medium mt-0.5 ${isSelected ? 'text-blue-700/80 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                    {metodo.observaciones}
                                                </p>
                                            </div>
                                            <div className={`shrink-0 ml-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-blue-600 dark:border-blue-400' : 'border-slate-300 dark:border-slate-600'}`}>
                                                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400" />}
                                            </div>
                                        </button>

                                        {/* Contenido Acordeon (Billetera / Info) */}
                                        {isSelected && (isTarjeta || isSeguro) && (
                                            <div className="px-5 pb-5 pt-2 border-t border-blue-600/10 dark:border-blue-900/30 animate-in slide-in-from-top-2 duration-200">
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4 mt-2 text-sm">
                                                Selecciona {isTarjeta ? 'tu tarjeta' : 'tu seguro'} guardado:
                                            </h4>

                                                {isLoadingBilletera ? (
                                                    <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-sm">
                                                        <Loader2 className="animate-spin h-4 w-4" /> Cargando...
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-3">
                                                        {filteredBilletera.map((item) => {
                                                            const isItemActivo = billeteraItemId === item.id_metodo;
                                                            return (
                                                                <button
                                                                    key={item.id_metodo}
                                                                    onClick={() => {
                                                                        setBilleteraItemId(item.id_metodo);
                                                                        setIsAddingNew(false);
                                                                    }}
                                                                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${isItemActivo
                                                                        ? 'border-blue-500 bg-white dark:bg-[#1E293B] ring-1 ring-blue-500 shadow-sm'
                                                                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600/50 bg-white/50 dark:bg-[#1E293B]/50'
                                                                        }`}
                                                                >
                                                                    <div className={`p-2 rounded-full ${isItemActivo ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-slate-100 dark:bg-[#0F172A] text-slate-500 dark:text-slate-400'}`}>
                                                                        {isTarjeta ? <CreditCard className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                                                                    </div>
                                                                    <div className="flex flex-col flex-1">
                                                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{item.proveedor}</span>
                                                                        <span className="text-xs text-slate-500 dark:text-slate-400">{item.descripcion}</span>
                                                                    </div>
                                                                    <div className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${isItemActivo ? 'border-blue-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                                        {isItemActivo && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}

                                                        {!isAddingNew ? (
                                                            <button
                                                                onClick={() => {
                                                                    setIsAddingNew(true);
                                                                    setBilleteraItemId(null);
                                                                }}
                                                                className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 bg-white/50 dark:bg-[#1E293B]/50 hover:bg-slate-50 dark:hover:bg-[#0F172A] text-left transition-all mt-1"
                                                            >
                                                                <div className="p-2 rounded-full bg-slate-100 dark:bg-[#0B1120] text-slate-500 dark:text-slate-400">
                                                                    <Plus className="w-4 h-4" />
                                                                </div>
                                                                <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                                                                    + Agregar nuev{isTarjeta ? 'a tarjeta' : 'o seguro'}
                                                                </span>
                                                            </button>
                                                        ) : (
                                                            <div className="bg-white dark:bg-[#1E293B] border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 mt-2 shadow-sm animate-in fade-in zoom-in-95">
                                                                <h5 className="font-bold text-slate-800 dark:text-white mb-3 text-sm">
                                                                    Registrar nuev{isTarjeta ? 'a tarjeta' : 'o seguro'}
                                                                </h5>

                                                                {isSeguro && (
                                                                    <div className="flex flex-col gap-3">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Número de póliza"
                                                                            value={newPoliza}
                                                                            onChange={(e) => setNewPoliza(e.target.value)}
                                                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {isTarjeta && (
                                                                    <div className="flex flex-col gap-3">
                                                                        <div className="relative">
                                                                            <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Número de tarjeta (ej. 4242)"
                                                                                value={newCardNum}
                                                                                maxLength={16}
                                                                                onChange={(e) => setNewCardNum(e.target.value)}
                                                                                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                                                            />
                                                                        </div>
                                                                        <p className="text-xs text-slate-400 dark:text-slate-500">
                                                                            Nota: Esta información se procesa de forma segura mediante un proveedor de pagos.
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                <div className="flex justify-end gap-2 mt-4">
                                                                    <button
                                                                        onClick={() => setIsAddingNew(false)}
                                                                        className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-[#0F172A]"
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleSaveNewItem(isTarjeta, isSeguro)}
                                                                        disabled={isSaving || (isSeguro ? !newPoliza : !newCardNum)}
                                                                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                                                        Guardar {isTarjeta ? 'Tarjeta' : 'Seguro'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Transferencia Info */}
                                    {isSelected && isTransferencia && (
                                        <div className="px-5 pb-5 pt-2 border-t border-blue-600/10 animate-in slide-in-from-top-2 duration-200">
                                            <div className="bg-sky-50 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 p-4 rounded-xl flex items-start gap-3">
                                                <Info className="w-5 h-5 mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" />
                                                <p className="text-sm font-medium leading-relaxed">
                                                    En el siguiente paso recibirás los datos bancarios para realizar tu transferencia y confirmar la cita.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {metodosPago.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-12 bg-white dark:bg-[#1E293B] text-center mt-6">
                            <Wallet className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[300px]">
                                El médico no tiene métodos de pago configurados. Por favor selecciona otro médico o contacta soporte.
                            </p>
                        </div>
                    )}
                </div>

            {/* Footer Next Button */}
            <div className="sticky bottom-0 z-30 bg-transparent flex flex-col-reverse sm:flex-row justify-between items-center gap-3 py-4 border-t border-slate-200/60 dark:border-slate-800/40 mt-12 px-4 md:px-0">
                <button
                    onClick={prevStep}
                    className="w-full sm:w-auto font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0F172A] shadow-sm text-sm sm:text-base"
                >
                    <ChevronLeft className="h-5 w-5" /> Regresar
                </button>

                <button
                    onClick={nextStep}
                    disabled={!isComplete}
                    className={`w-full sm:w-auto font-bold py-3.5 px-8 sm:px-10 rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${isComplete
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        }`}
                >
                    <span>Continuar al Siguiente Paso</span> <ArrowRight className="h-5 w-5" />
                </button>
            </div>      </div>

        </div>
    );
}
