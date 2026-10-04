'use client';

import { useState, useMemo } from 'react';
import { useCitaStore } from '@/store/use-cita-store';
import {
    useMetodosPago,
    useCuentasBancariasMedico,
    useBilletera,
    useGuardarTarjeta,
    usePacientesSeleccion,
} from '@/hooks/use-flujo-citas';
import { useDoctorByCode } from '@/hooks/use-doctors';
import { useRecompensasDisponibles } from '@/hooks/use-recompensas';
import { useQueryClient } from '@tanstack/react-query';
import { ModalNuevoSeguro } from '@/components/seguros/ModalNuevoSeguro';
import {
    ChevronLeft,
    ArrowRight,
    CreditCard,
    Banknote,
    Landmark,
    Wallet,
    Plus,
    ShieldCheck,
    Loader2,
    Info,
    Tag,
    Gift,
    CheckCircle2,
    UploadCloud,
    X,
    FileCheck2,
    Copy,
    Check,
    Eye,
    AlertCircle,
    Building2,
    Sparkles,
} from 'lucide-react';
import { NeoLoader } from '@/components/neo-loader';
import { toast } from 'sonner';
import type { BilleteraMetodoDto } from '@/types/citas';

export function Step3MetodoPago() {
    const queryClient = useQueryClient();
    const {
        codMedico,
        pacienteSeleccionado,
        tipoPagoId,
        setTipoPagoId,
        billeteraItemId,
        setBilleteraItemId,
        comprobanteTransferencia,
        setComprobanteTransferencia,
        referenciaTransferencia,
        setReferenciaTransferencia,
        prevStep,
        nextStep,
        modalidad,
        grupoId,
        creandoNuevoGrupo,
        citasMultiples,
        omitirPago,
        setOmitirPago,
        servicioSeleccionado,
    } = useCitaStore();

    const { data: metodosTotales = [], isLoading } = useMetodosPago(codMedico);
    const { data: cuentasBancariasApi = [] } = useCuentasBancariasMedico(codMedico);
    const { data: doctor } = useDoctorByCode(codMedico || '');
    const { data: pacientes = [] } = usePacientesSeleccion();

    // Resolver paciente seleccionado y titular con datos frescos de la BD
    const pacienteSeleccionadoFresh = pacientes.find(p => p.pacCodigo === pacienteSeleccionado?.pacCodigo) || pacienteSeleccionado;
    const pacienteTitularFresh = pacientes.find(p => p.pacTitular) || pacienteSeleccionadoFresh;
    const pacienteActual = pacienteSeleccionadoFresh || pacienteTitularFresh;

    // Obtener billetera de ambos para que los dependientes puedan usar las pólizas/tarjetas familiares
    const { data: billeteraActual = [], isLoading: isLoadingBilleteraActual } = useBilletera(pacienteActual?.pacCodigo || null);
    const { data: billeteraTitular = [], isLoading: isLoadingBilleteraTitular } = useBilletera(
        pacienteTitularFresh?.pacCodigo && pacienteTitularFresh.pacCodigo !== pacienteActual?.pacCodigo
            ? pacienteTitularFresh.pacCodigo
            : null
    );

    const billetera = useMemo(() => {
        const map = new Map<string, BilleteraMetodoDto>();
        billeteraActual.forEach(m => map.set(m.id_metodo, m));
        billeteraTitular.forEach(m => {
            if (!map.has(m.id_metodo)) map.set(m.id_metodo, m);
        });
        return Array.from(map.values());
    }, [billeteraActual, billeteraTitular]);

    const isLoadingBilletera = isLoadingBilleteraActual || isLoadingBilleteraTitular;

    const metodosPago = metodosTotales.filter(m => {
        const desc = m.descripcion.toLowerCase();
        if (modalidad === 'virtual' && desc.includes('efectivo')) {
            return false;
        }
        // "Efectivo" se gestiona de forma destacada en la tarjeta principal superior "Pagar en consultorio / clínica"
        if (desc.includes('efectivo')) {
            return false;
        }
        return true;
    });

    const { mutateAsync: saveTarjeta } = useGuardarTarjeta();

    // Estados para modals y formularios
    const [isConfiguringSeguro, setIsConfiguringSeguro] = useState(false);
    const [isAddingTarjeta, setIsAddingTarjeta] = useState(false);
    const [newCardNum, setNewCardNum] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [zoomCarnet, setZoomCarnet] = useState<string | null>(null);

    const getIconForMethod = (descripcion: string) => {
        const desc = descripcion.toLowerCase();
        if (desc.includes('efectivo')) return Banknote;
        if (desc.includes('tarjeta')) return CreditCard;
        if (desc.includes('transferencia') || desc.includes('banco')) return Landmark;
        if (desc.includes('seguro')) return ShieldCheck;
        return Wallet;
    };

    const metodoSeleccionado = metodosPago.find(m => m.tipoPagoId === tipoPagoId);
    const isTarjetaActiva = !omitirPago && !!metodoSeleccionado?.descripcion.toLowerCase().includes('tarjeta');
    const isSeguroActivo = !omitirPago && !!metodoSeleccionado?.descripcion.toLowerCase().includes('seguro');
    const isTransferenciaActiva = !omitirPago && !!(metodoSeleccionado?.descripcion.toLowerCase().includes('transferencia') || metodoSeleccionado?.descripcion.toLowerCase().includes('banco'));

    const handleSelectMetodo = (id: number) => {
        setOmitirPago(false);
        setTipoPagoId(id);
        const metodo = metodosPago.find(m => m.tipoPagoId === id);
        const isSeg = !!metodo?.descripcion.toLowerCase().includes('seguro');
        const isTar = !!metodo?.descripcion.toLowerCase().includes('tarjeta');
        if (isSeg) {
            const seguros = billetera.filter(b => b.tipo === 'SEGURO');
            const principal = seguros.find(b => b.es_principal) || seguros[0];
            setBilleteraItemId(principal ? principal.id_metodo : null);
        } else if (isTar) {
            const tarjetas = billetera.filter(b => b.tipo === 'TARJETA');
            const principal = tarjetas.find(b => b.es_principal) || tarjetas[0];
            setBilleteraItemId(principal ? principal.id_metodo : null);
        } else {
            setBilleteraItemId(null);
        }
        setIsAddingTarjeta(false);
        setComprobanteTransferencia(null);
        setReferenciaTransferencia('');
    };

    const handleSelectOmitirPago = () => {
        // Vincular con el método de Efectivo / Presencial si está configurado en el médico
        const metodoEfectivo = metodosTotales.find(m => m.descripcion.toLowerCase().includes('efectivo'));
        setOmitirPago(true, metodoEfectivo?.tipoPagoId || 1);
        setIsAddingTarjeta(false);
    };

    const handleCopyToClipboard = (text: string, fieldKey: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedField(fieldKey);
            setTimeout(() => setCopiedField(null), 2000);
        });
    };

    const handleComprobanteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setComprobanteTransferencia(file);
    };

    // Guardar nueva Tarjeta
    const handleSaveTarjeta = async () => {
        const codPac = pacienteTitularFresh?.pacCodigo || pacienteActual?.pacCodigo;
        if (!codPac) return;

        setIsSaving(true);
        try {
            await saveTarjeta({
                codPac,
                payload: {
                    tokenProcesador: 'tok_mock_' + Math.floor(Math.random() * 100000),
                    ultimos4: newCardNum.slice(-4) || '4242',
                    tipoTarjeta: 'visa',
                },
            });
            await queryClient.invalidateQueries({ queryKey: ['billetera', codPac] });
            setIsAddingTarjeta(false);
            setNewCardNum('');
            toast.success('Tarjeta registrada en tu billetera.');
        } catch (e) {
            console.error(e);
            toast.error('Error al guardar la tarjeta.');
        } finally {
            setIsSaving(false);
        }
    };

    const isMultiMode = !!(grupoId || creandoNuevoGrupo) && citasMultiples.length > 0;

    // Validación para continuar
    let isComplete = false;
    if (omitirPago) {
        isComplete = true;
    } else {
        isComplete = tipoPagoId !== null;
        if (isTarjetaActiva || isSeguroActivo) {
            isComplete = isComplete && billeteraItemId !== null;
        }
    }


    if (isLoading) {
        return <div className="py-12"><NeoLoader fullScreenPortal={false} /></div>;
    }

    return (
        <div className="flex flex-col w-full font-sans pb-28">
            <div className="flex flex-col w-full space-y-8 px-4 pt-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                        ¿Cómo prefieres pagar?
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        {isMultiMode
                            ? 'Puedes asignar un método de pago en línea para todo el grupo o elegir pagar directamente en consultorio.'
                            : 'Elige si deseas pagar en línea mediante transferencia, tarjeta o seguro, o abonar directamente en recepción.'}
                    </p>

                    {/* Banner de Grupo de Citas */}
                    {isMultiMode && (
                        <div className="mb-6 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                            <div>
                                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                    Grupo de Citas ({citasMultiples.length} citas programadas)
                                </span>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                    {servicioSeleccionado ? servicioSeleccionado.servicio : 'Consulta médica'} · {citasMultiples.length} consultas × Q{(servicioSeleccionado?.costoTotal || 0).toFixed(2)}
                                </p>
                            </div>
                            <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-indigo-200/60 dark:border-indigo-800/40">
                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                                    Total del grupo con IVA
                                </span>
                                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                                    Q{((servicioSeleccionado?.costoTotal || 0) * citasMultiples.length).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* TARJETA DESTACADA: PAGAR EN CONSULTORIO / CLÍNICA (OMITIR PAGO EN LÍNEA) */}
                    <div
                        onClick={handleSelectOmitirPago}
                        className={`mb-6 p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                            omitirPago
                                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30 shadow-sm'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] hover:border-emerald-300 dark:hover:border-emerald-600/50'
                        }`}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                                    omitirPago
                                        ? 'bg-emerald-600 text-white shadow-md'
                                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                    <Banknote className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                            Pagar en consultorio / clínica
                                        </h3>
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            Efectivo en recepción
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
                                        Omite el proceso de pago digital y abona tu consulta en efectivo o en recepción al asistir a la clínica o cuando el médico te visite.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOmitirPago();
                                }}
                                className={`shrink-0 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                    omitirPago
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                {omitirPago ? (
                                    <>
                                        <Check className="w-4 h-4 stroke-[3]" />
                                        <span>Seleccionado</span>
                                    </>
                                ) : (
                                    <span>Elegir pagar en clínica</span>
                                )}
                            </button>
                        </div>

                        {omitirPago && (
                            <div className="mt-4 pt-3 border-t border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    No se te solicitará pago previo. Puedes continuar al paso de confirmación directamente.
                                </span>
                                <span className="text-[11px] text-slate-400">
                                    O selecciona un método en línea abajo si prefieres
                                </span>
                            </div>
                        )}
                    </div>

                    {/* DIVIDER SI DESEA PAGAR CON OTRO MÉTODO */}
                    <div className="relative my-6 text-center">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                        </div>
                        <span className="relative bg-slate-50 dark:bg-[#0B1120] px-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            O selecciona un método de pago en línea
                        </span>
                    </div>

                    {/* LISTA DE MÉTODOS DE PAGO EN LÍNEA / CONFIGURADOS */}
                    <div className="flex flex-col gap-3">
                        {metodosPago.map((metodo) => {
                            const isSelected = !omitirPago && tipoPagoId === metodo.tipoPagoId;
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
                                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-900/10 shadow-sm ring-1 ring-blue-600/10'
                                        : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1E293B] hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm'
                                    }`}
                                >
                                    {/* Header (Botón de selección principal) */}
                                    <button
                                        type="button"
                                        onClick={() => handleSelectMetodo(metodo.tipoPagoId)}
                                        className="w-full flex items-center py-3.5 px-4 sm:px-5 text-left cursor-pointer"
                                    >
                                        <div className={`shrink-0 p-2.5 rounded-2xl transition-colors ${isSelected ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 dark:bg-[#0B1120] text-blue-600 dark:text-blue-400'}`}>
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

                                    {/* Contenido Acordeón: SEGURO MÉDICO O TARJETA */}
                                    {isSelected && (isTarjeta || isSeguro) && (
                                        <div className="px-5 pb-6 pt-3 border-t border-blue-600/10 dark:border-blue-900/30 animate-in slide-in-from-top-2 duration-200">

                                            {/* FLUJO DE SEGURO MÉDICO (Billetera integrada) */}
                                            {isSeguro && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                                            Pólizas de seguro registradas para {pacienteActual?.nombreCompleto || 'el paciente'}:
                                                        </h4>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsConfiguringSeguro(true)}
                                                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" /> Añadir seguro
                                                        </button>
                                                    </div>

                                                    {isLoadingBilletera ? (
                                                        <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-sm py-4">
                                                            <Loader2 className="animate-spin h-4 w-4" /> Consultando seguros registrados...
                                                        </div>
                                                    ) : filteredBilletera.length === 0 ? (
                                                        <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0F172A] text-center space-y-3">
                                                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
                                                                <ShieldCheck className="w-6 h-6" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                                    No tienes ningún seguro médico registrado
                                                                </p>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                                                                    Para aplicar tu cobertura médica en esta cita, registra tu aseguradora, número de póliza y carné.
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsConfiguringSeguro(true)}
                                                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                                <span>Añadir Seguro Médico (Póliza y Carné)</span>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {filteredBilletera.map((item) => {
                                                                const isItemActivo = billeteraItemId === item.id_metodo;
                                                                return (
                                                                    <div
                                                                        key={item.id_metodo}
                                                                        onClick={() => setBilleteraItemId(item.id_metodo)}
                                                                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                                                            isItemActivo
                                                                                ? 'border-blue-500 bg-white dark:bg-[#1E293B] ring-1 ring-blue-500 shadow-sm'
                                                                                : 'border-slate-200 dark:border-slate-700/80 hover:border-blue-300 dark:hover:border-blue-600/50 bg-white/70 dark:bg-[#1E293B]/70'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-start justify-between gap-3 mb-3">
                                                                            <div className="flex items-center gap-3 min-w-0">
                                                                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800 overflow-hidden">
                                                                                    {item.imagen_url ? (
                                                                                        <img src={item.imagen_url} alt={item.proveedor} className="w-full h-full object-contain p-1" />
                                                                                    ) : (
                                                                                        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                                                    )}
                                                                                </div>
                                                                                <div className="min-w-0">
                                                                                    <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">
                                                                                        {item.proveedor}
                                                                                    </h5>
                                                                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                                                                        {item.descripcion}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            <div className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center mt-1 ${isItemActivo ? 'border-blue-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                                                {isItemActivo && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                                                            </div>
                                                                        </div>

                                                                        {item.foto_carne_url ? (
                                                                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setZoomCarnet(item.foto_carne_url!);
                                                                                        }}
                                                                                        className="relative group w-14 h-9 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800 cursor-pointer shadow-2xs"
                                                                                        title="Clic para ampliar carné"
                                                                                    >
                                                                                        <img src={item.foto_carne_url} alt="Carné" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                                                            <Eye className="w-3 h-3" />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                                                            <FileCheck2 className="w-3 h-3" /> Carné adjunto
                                                                                        </span>
                                                                                        <p className="text-[10px] text-slate-400">Verificado para esta póliza</p>
                                                                                    </div>
                                                                                </div>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setZoomCarnet(item.foto_carne_url!);
                                                                                    }}
                                                                                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                                                                                >
                                                                                    <Eye className="w-3 h-3" /> Ver carné
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400">
                                                                                <span className="flex items-center gap-1">
                                                                                    <AlertCircle className="w-3 h-3" /> Sin foto de carné adjunta
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* FLUJO DE TARJETA DE CRÉDITO/DÉBITO */}
                                            {isTarjeta && (
                                                <div>
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3 text-sm">
                                                        Selecciona tu tarjeta registrada:
                                                    </h4>

                                                    {isLoadingBilletera ? (
                                                        <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-sm py-2">
                                                            <Loader2 className="animate-spin h-4 w-4" /> Consultando tarjetas guardadas...
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-2.5">
                                                            {filteredBilletera.map((item) => {
                                                                const isItemActivo = billeteraItemId === item.id_metodo;
                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        key={item.id_metodo}
                                                                        onClick={() => {
                                                                            setBilleteraItemId(item.id_metodo);
                                                                            setIsAddingTarjeta(false);
                                                                        }}
                                                                        className={`flex items-center gap-3.5 p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${isItemActivo
                                                                            ? 'border-blue-500 bg-white dark:bg-[#1E293B] ring-1 ring-blue-500 shadow-sm'
                                                                            : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600/50 bg-white/50 dark:bg-[#1E293B]/50'
                                                                        }`}
                                                                    >
                                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isItemActivo ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-slate-100 dark:bg-[#0F172A] text-slate-500 dark:text-slate-400'}`}>
                                                                            {item.imagen_url ? (
                                                                                <img src={item.imagen_url} alt={item.proveedor} className="w-7 h-7 object-contain rounded" />
                                                                            ) : (
                                                                                <CreditCard className="w-5 h-5" />
                                                                            )}
                                                                        </div>
                                                                        <div className="flex flex-col flex-1 min-w-0">
                                                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                                                                                {item.proveedor}
                                                                            </span>
                                                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                                                {item.descripcion}
                                                                            </span>
                                                                        </div>
                                                                        <div className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${isItemActivo ? 'border-blue-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                                            {isItemActivo && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}

                                                            {!isAddingTarjeta ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setIsAddingTarjeta(true);
                                                                        setBilleteraItemId(null);
                                                                    }}
                                                                    className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 bg-white/50 dark:bg-[#1E293B]/50 hover:bg-slate-50 dark:hover:bg-[#0F172A] text-left transition-all mt-1 cursor-pointer"
                                                                >
                                                                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-[#0B1120] text-slate-500 dark:text-slate-400">
                                                                        <Plus className="w-4 h-4" />
                                                                    </div>
                                                                    <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                                                                        + Agregar nueva tarjeta
                                                                    </span>
                                                                </button>
                                                            ) : (
                                                                <div className="bg-white dark:bg-[#1E293B] border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 mt-2 shadow-sm animate-in fade-in zoom-in-95">
                                                                    <h5 className="font-bold text-slate-800 dark:text-white mb-3 text-sm">
                                                                        Registrar nueva tarjeta
                                                                    </h5>
                                                                    <div className="flex flex-col gap-3">
                                                                        <div className="relative">
                                                                            <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Número de tarjeta (ej. 4242)"
                                                                                value={newCardNum}
                                                                                maxLength={16}
                                                                                onChange={(e) => setNewCardNum(e.target.value)}
                                                                                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                            />
                                                                        </div>
                                                                        <p className="text-xs text-slate-400 dark:text-slate-500">
                                                                            Procesado de forma cifrada y segura.
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex justify-end gap-2 mt-4">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setIsAddingTarjeta(false)}
                                                                            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-[#0F172A]"
                                                                        >
                                                                            Cancelar
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={handleSaveTarjeta}
                                                                            disabled={isSaving || !newCardNum}
                                                                            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
                                                                        >
                                                                            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                                                            Guardar Tarjeta
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Contenido Acordeón: TRANSFERENCIA BANCARIA */}
                                    {isSelected && isTransferencia && (() => {
                                        let cuentasDisponibles: any[] = [];
                                        if (metodo.cuentasBancarias && metodo.cuentasBancarias.length > 0) {
                                            cuentasDisponibles = metodo.cuentasBancarias;
                                        } else if (typeof (metodo as any).cuentasBancariasJSON === 'string' && (metodo as any).cuentasBancariasJSON) {
                                            try {
                                                const parsed = JSON.parse((metodo as any).cuentasBancariasJSON);
                                                if (Array.isArray(parsed) && parsed.length > 0) cuentasDisponibles = parsed;
                                            } catch {}
                                        }
                                        if (cuentasDisponibles.length === 0 && cuentasBancariasApi && cuentasBancariasApi.length > 0) {
                                            cuentasDisponibles = cuentasBancariasApi;
                                        }
                                        if (cuentasDisponibles.length === 0 && doctor?.cuentas_bancarias && doctor.cuentas_bancarias.length > 0) {
                                            cuentasDisponibles = doctor.cuentas_bancarias.map((c, idx) => ({
                                                cuentaId: idx + 1,
                                                banco: c.banco,
                                                tipoCuenta: c.tipo_cuenta,
                                                numeroCuenta: c.numero_cuenta,
                                                nombreCuenta: c.nombre_cuenta,
                                            }));
                                        }

                                        return (
                                            <div className="px-5 pb-6 pt-4 border-t border-blue-600/10 dark:border-blue-900/30 animate-in slide-in-from-top-2 duration-200 space-y-5">
                                                {cuentasDisponibles.length > 0 ? (
                                                    <div className="space-y-3">
                                                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                            Datos bancarios del médico
                                                        </p>
                                                        {cuentasDisponibles.map((cuenta: any, idx: number) => {
                                                            const banco = cuenta.banco || cuenta.Banco;
                                                            const tipoCuenta = cuenta.tipoCuenta || cuenta.tipo_cuenta || cuenta.TipoCuenta;
                                                            const nombreCuenta = cuenta.nombreCuenta || cuenta.nombre_cuenta || cuenta.NombreCuenta;
                                                            const numeroCuenta = cuenta.numeroCuenta || cuenta.numero_cuenta || cuenta.NumeroCuenta;

                                                            return (
                                                                <div key={idx} className="rounded-2xl border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-[#0B1120] overflow-hidden shadow-sm">
                                                                    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0F172A]">
                                                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
                                                                            <Landmark className="w-4 h-4" />
                                                                        </div>
                                                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">{banco}</span>
                                                                    </div>
                                                                    <div className="p-4 space-y-4">
                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            {tipoCuenta && (
                                                                                <div className="space-y-0.5">
                                                                                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tipo de cuenta</p>
                                                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{tipoCuenta}</p>
                                                                                </div>
                                                                            )}
                                                                            {nombreCuenta && (
                                                                                <div className="space-y-0.5">
                                                                                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">A nombre de</p>
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">{nombreCuenta}</p>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => handleCopyToClipboard(nombreCuenta, `nombre-${idx}`)}
                                                                                            className="shrink-0 p-1 rounded-md text-slate-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                                                                                            title="Copiar nombre"
                                                                                        >
                                                                                            {copiedField === `nombre-${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {numeroCuenta && (
                                                                            <div className="mt-4 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center gap-2 shadow-sm text-center">
                                                                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                                                                    Número de cuenta
                                                                                </p>
                                                                                <div className="flex items-center justify-center gap-3">
                                                                                    <span className="font-mono text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 tracking-wider">
                                                                                        {numeroCuenta}
                                                                                    </span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleCopyToClipboard(numeroCuenta, `num-${idx}`)}
                                                                                        className="shrink-0 p-2 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                                                                                        title="Copiar número de cuenta"
                                                                                    >
                                                                                        {copiedField === `num-${idx}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200 text-xs">
                                                        No hay cuentas bancarias configuradas para este especialista. Podrás coordinar los datos directamente en la cita.
                                                    </div>
                                                )}

                                                {/* Comprobante de transferencia (Opcional) */}
                                                <div className="space-y-3 pt-2">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                                            Número de Referencia o Boleta (Opcional)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={referenciaTransferencia}
                                                            onChange={(e) => setReferenciaTransferencia(e.target.value)}
                                                            placeholder="Ej. REF-98234 o # Boleta"
                                                            className="mt-1 w-full bg-white dark:bg-[#0B1120] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                                            Adjuntar comprobante de transferencia (Opcional)
                                                        </label>
                                                        <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center bg-slate-50/50 dark:bg-[#0F172A] hover:border-blue-400 transition-colors cursor-pointer">
                                                            <input
                                                                type="file"
                                                                accept="image/*,application/pdf"
                                                                onChange={handleComprobanteChange}
                                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                            />
                                                            <div className="flex flex-col items-center justify-center gap-1.5">
                                                                <UploadCloud className="w-6 h-6 text-slate-400" />
                                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                                    {comprobanteTransferencia ? comprobanteTransferencia.name : 'Subir imagen o PDF del comprobante'}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400">
                                                                    {comprobanteTransferencia ? `${(comprobanteTransferencia.size / 1024).toFixed(1)} KB` : 'Puedes continuar sin adjuntarlo ahora'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sección de Recompensas y Cupones Activos */}
                <CuponesSeccion pacCodigo={pacienteActual?.pacCodigo || pacienteTitularFresh?.pacCodigo} />
            </div>

            {/* MODAL PARA CONFIGURAR SEGURO MÉDICO (Billetera Digital Cohesiva) */}
            <ModalNuevoSeguro
                isOpen={isConfiguringSeguro}
                onClose={() => setIsConfiguringSeguro(false)}
                pacCodigo={pacienteActual?.pacCodigo || ''}
                pacienteNombre={pacienteActual?.nombreCompleto}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['billetera'] });
                    queryClient.invalidateQueries({ queryKey: ['pacientesSeleccion'] });
                }}
            />

            {/* MODAL ZOOM DE CARNÉ */}
            {zoomCarnet && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in"
                    onClick={() => setZoomCarnet(null)}
                >
                    <div className="relative max-w-3xl max-h-[85vh] bg-white dark:bg-[#1E293B] rounded-3xl overflow-hidden shadow-2xl p-2" onClick={e => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setZoomCarnet(null)}
                            className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <img
                            src={zoomCarnet}
                            alt="Carné ampliado"
                            className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
                        />
                    </div>
                </div>
            )}

            {/* FOOTER WIZARD NAVIGATION */}
            <div className="sticky bottom-0 z-30 bg-transparent flex flex-col-reverse sm:flex-row justify-between items-center gap-3 py-4 border-t border-slate-200/60 dark:border-slate-800/40 mt-12 px-4 md:px-0">
                <button
                    type="button"
                    onClick={() => {
                        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                        document.documentElement.scrollTop = 0;
                        document.body.scrollTop = 0;
                        prevStep();
                    }}
                    className="w-full sm:w-auto font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0F172A] shadow-sm text-sm sm:text-base cursor-pointer"
                >
                    <ChevronLeft className="h-5 w-5" /> Regresar
                </button>

                <button
                    type="button"
                    onClick={() => {
                        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                        document.documentElement.scrollTop = 0;
                        document.body.scrollTop = 0;
                        nextStep();
                    }}
                    disabled={!isComplete}
                    className={`w-full sm:w-auto font-bold py-3.5 px-8 sm:px-10 rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${isComplete
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    }`}
                >
                    <span>Continuar al Siguiente Paso</span> <ArrowRight className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}

function CuponesSeccion({ pacCodigo }: { pacCodigo?: string }) {
    const { recompensaSeleccionada, setRecompensaSeleccionada } = useCitaStore();
    const { data: recompensas = [], isLoading } = useRecompensasDisponibles(pacCodigo);

    const cuponesDisponibles = recompensas.filter(
        (r) => r.praEstado === 'disponible' || !r.praEstado
    );

    if (isLoading || cuponesDisponibles.length === 0) return null;

    return (
        <div className="mt-8 rounded-3xl border border-emerald-500/20 bg-emerald-950/10 p-6 backdrop-blur-xs">
            <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                    <Gift className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Aplicar Recompensa o Cupón</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tienes {cuponesDisponibles.length} cupón(es) disponible(s) en tu cuenta.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={() => setRecompensaSeleccionada(null)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left cursor-pointer ${!recompensaSeleccionada
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-300'
                    }`}
                >
                    <Tag className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="text-xs font-semibold">Sin cupón</span>
                </button>

                {cuponesDisponibles.map((cupon) => {
                    const isSelected = recompensaSeleccionada?.praCodigo === cupon.praCodigo;
                    return (
                        <button
                            key={cupon.praCodigo}
                            type="button"
                            onClick={() => setRecompensaSeleccionada(cupon)}
                            className={`flex items-center justify-between gap-3 p-4 rounded-2xl border transition-all text-left cursor-pointer ${isSelected
                                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 shadow-md'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] hover:border-emerald-400 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <Gift className="h-5 w-5 shrink-0 text-emerald-500" />
                                <div className="truncate">
                                    <p className="text-xs font-bold truncate text-slate-900 dark:text-white">
                                        {cupon.tituloRecompensa || (cupon as any).titulo || 'Recompensa'}
                                    </p>
                                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                        {cupon.codigoCanje ? `Código: ${cupon.codigoCanje}` : 'Cupón Activo'}
                                    </p>
                                </div>
                            </div>
                            {isSelected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> : null}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
