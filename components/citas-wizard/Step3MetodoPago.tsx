'use client';

import { useState, useMemo, useEffect } from 'react';
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
    Ban,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getDoctorLowestPrice, buildDoctorFullName } from '@/types';
import { NeoLoader } from '@/components/neo-loader';
import { toast } from 'sonner';
import type { BilleteraMetodoDto } from '@/types/citas';
import { compressImageFile, formatBytes } from '@/utils/image-compression';

export function Step3MetodoPago() {
    const queryClient = useQueryClient();
    const {
        codMedico,
        medicoName,
        modalidad,
        clinicaSeleccionada,
        servicioSeleccionado,
        fecha,
        hora,
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
        grupoId,
        creandoNuevoGrupo,
        citasMultiples,
        omitirPago,
        setOmitirPago,
    } = useCitaStore();

    const isPresencial = modalidad === 'presencial';

    // Si la modalidad no es presencial (virtual o a domicilio), nunca permitir omitir pago (pagar en clínica)
    useEffect(() => {
        if (!isPresencial && omitirPago) {
            setOmitirPago(false);
        }
    }, [isPresencial, omitirPago, setOmitirPago]);

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

    const metodosPago = useMemo(() => {
        return metodosTotales.filter(m => {
            const desc = m.descripcion.toLowerCase();
            // En presencial, "Efectivo" se gestiona de forma destacada en la tarjeta superior "Pagar en consultorio / clínica"
            if (desc.includes('efectivo')) {
                return false;
            }
            return true;
        });
    }, [metodosTotales]);

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

    const [isOptimizingComprobante, setIsOptimizingComprobante] = useState(false);

    const handleComprobanteChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (!file) {
            setComprobanteTransferencia(null);
            return;
        }

        const MAX_COMPROBANTE_BYTES = 3 * 1024 * 1024; // 3 MB máximo

        if (file.type.startsWith('image/')) {
            setIsOptimizingComprobante(true);
            const toastId = toast.loading('Optimizando comprobante de transferencia...');
            try {
                const optimized = await compressImageFile(file, {
                    maxDimension: 1920,
                    quality: 0.82,
                    maxSizeBytes: 1024 * 1024,
                });
                toast.dismiss(toastId);

                if (optimized.size > MAX_COMPROBANTE_BYTES) {
                    toast.error(`El comprobante (${formatBytes(optimized.size)}) excede el límite máximo de 3 MB.`);
                    e.target.value = '';
                    setComprobanteTransferencia(null);
                    return;
                }

                setComprobanteTransferencia(optimized);
                toast.success(`Comprobante adjuntado (${formatBytes(optimized.size)}).`);
            } catch {
                toast.dismiss(toastId);
                if (file.size > MAX_COMPROBANTE_BYTES) {
                    toast.error(`El comprobante (${formatBytes(file.size)}) excede el límite máximo de 3 MB.`);
                    e.target.value = '';
                    setComprobanteTransferencia(null);
                    return;
                }
                setComprobanteTransferencia(file);
            } finally {
                setIsOptimizingComprobante(false);
            }
        } else {
            // PDF
            if (file.size > MAX_COMPROBANTE_BYTES) {
                toast.error(`El comprobante (${formatBytes(file.size)}) excede el límite máximo de 3 MB.`);
                e.target.value = '';
                setComprobanteTransferencia(null);
                return;
            }
            setComprobanteTransferencia(file);
            toast.success(`Comprobante PDF adjuntado (${formatBytes(file.size)}).`);
        }
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
    if (isPresencial && omitirPago) {
        isComplete = true;
    } else {
        isComplete = tipoPagoId !== null;
        if (isTarjetaActiva || isSeguroActivo) {
            isComplete = isComplete && billeteraItemId !== null;
        }
    }

    // Datos para el banner superior y el cálculo de total
    const nombreServicioConfirmado =
        modalidad === 'virtual'
            ? 'Videoconsulta Médica'
            : servicioSeleccionado?.servicio ||
              (modalidad === 'presencial' ? 'Consulta Médica Presencial' : 'Consulta a Domicilio');

    const nombreDoctor = doctor ? buildDoctorFullName(doctor) : (medicoName || 'Especialista');
    const fotoDoctor = doctor?.exp_foto_perfil || null;

    const horaFormat = (() => {
        if (!hora) return '';
        const [h, m] = hora.split(':');
        let hn = parseInt(h);
        const ap = hn >= 12 ? 'PM' : 'AM';
        hn = hn % 12 || 12;
        return `${String(hn).padStart(2, '0')}:${m} ${ap}`;
    })();

    const fechaFormat = fecha ? format(fecha, "EEEE d MMM", { locale: es }) : '';

    const precioUnitario =
        servicioSeleccionado?.costoTotal ||
        (modalidad === 'presencial' && clinicaSeleccionada?.mclPrecioBase
            ? clinicaSeleccionada.mclPrecioBase
            : doctor
            ? getDoctorLowestPrice(doctor) || 150
            : 150);

    const precioTotal =
        isMultiMode && citasMultiples.length > 0 ? precioUnitario * citasMultiples.length : precioUnitario;

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .slice(0, 2)
            .map((n) => n[0])
            .join('')
            .toUpperCase();
    };

    // Separar métodos por categorías para el orden visual del diseño
    const metodoTarjeta = metodosPago.find(m => m.descripcion.toLowerCase().includes('tarjeta'));
    const metodoTransferencia = metodosPago.find(m => m.descripcion.toLowerCase().includes('transferencia') || m.descripcion.toLowerCase().includes('banco'));
    const metodoSeguro = metodosPago.find(m => m.descripcion.toLowerCase().includes('seguro'));
    const tieneSeguroEnMedico = metodosTotales.some(m => m.descripcion.toLowerCase().includes('seguro'));

    // Otros métodos no estándar si existieran
    const otrosMetodos = metodosPago.filter(
        m => m !== metodoTarjeta && m !== metodoTransferencia && m !== metodoSeguro
    );

    if (isLoading) {
        return (
            <div className="py-16">
                <NeoLoader fullScreenPortal={false} />
            </div>
        );
    }

    return (
        <div className="relative w-full overflow-hidden font-sans pb-10">
            {/* Luces sutiles y decorativas de fondo coherentes con Step 1 y Step 2 */}
            <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-[#dce9ff]/40 dark:bg-blue-900/15 blur-3xl pointer-events-none -z-10" />
            <div className="absolute top-1/2 right-10 w-80 h-80 rounded-full bg-[#cce5ff]/25 dark:bg-sky-900/15 blur-3xl pointer-events-none -z-10" />

            <div className="w-full flex flex-col space-y-6">
                {/* ENCABEZADO DE PÁGINA */}
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#0b1c30] dark:text-white tracking-tight">
                        ¿Cómo prefieres pagar?
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {!isPresencial
                            ? 'Selecciona un método de pago en línea para continuar con tu consulta.'
                            : isMultiMode
                                ? 'Puedes asignar un método de pago en línea para todo el grupo o elegir abonar en recepción.'
                                : 'Elige si deseas pagar en línea mediante transferencia, tarjeta o seguro, o abonar directamente en recepción.'}
                    </p>
                </div>

                {/* CÁPSULA RESUMEN DE SERVICIO Y CITA CONFIRMADA */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4 border border-slate-100 dark:border-slate-800 shadow-[0_2px_12px_rgba(11,28,48,0.04)] flex items-center gap-3.5 animate-in fade-in">
                    {fotoDoctor ? (
                        <img
                            src={fotoDoctor}
                            alt={nombreDoctor}
                            className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-slate-100 dark:ring-slate-800"
                        />
                    ) : (
                        <div className="w-11 h-11 rounded-full bg-[#eff4ff] dark:bg-slate-800 text-[#006194] dark:text-sky-400 font-bold text-sm flex items-center justify-center shrink-0 ring-2 ring-slate-100 dark:ring-slate-800">
                            {getInitials(nombreDoctor)}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                            <span className="font-bold text-[#0b1c30] dark:text-white">{nombreServicioConfirmado}</span>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <span className="text-[#006194] dark:text-sky-400">{nombreDoctor}</span>
                            {fechaFormat && (
                                <>
                                    <span className="text-slate-300 dark:text-slate-600">·</span>
                                    <span className="text-slate-500 dark:text-slate-400 font-normal capitalize">
                                        {fechaFormat}{horaFormat ? `, ${horaFormat}` : ''}
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            <span>
                                Paciente: <strong className="font-semibold text-slate-700 dark:text-slate-200">{pacienteActual?.nombreCompleto || 'No especificado'}</strong>
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <span>
                                Total: <strong className="font-bold text-[#006c4a] dark:text-emerald-400 font-mono">Q{precioTotal.toFixed(2)}</strong>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Banner informativo de Grupo de Citas (si aplica) */}
                {isMultiMode && (
                    <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                Grupo de Citas ({citasMultiples.length} citas programadas)
                            </span>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                {nombreServicioConfirmado} · {citasMultiples.length} consultas × Q{precioUnitario.toFixed(2)}
                            </p>
                        </div>
                        <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-indigo-200/60 dark:border-indigo-800/40">
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                                Total del grupo con IVA
                            </span>
                            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                                Q{precioTotal.toFixed(2)}
                            </span>
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* TARJETA DESTACADA: PAGAR EN CONSULTORIO / CLÍNICA (SOLO PRESENCIAL)        */}
                {/* ========================================================================= */}
                {isPresencial && (
                    <div
                        onClick={handleSelectOmitirPago}
                        className={`rounded-2xl p-5 border transition-all cursor-pointer ${
                            omitirPago
                                ? 'bg-white dark:bg-slate-900 border-[#006194]/40 dark:border-[#006194]/60 ring-2 ring-[#006194]/15 shadow-[0_4px_20px_rgba(11,28,48,0.06)]'
                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-[0_2px_14px_rgba(11,28,48,0.04)] hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                                <div className="w-12 h-12 rounded-xl bg-[#e8f7ee] dark:bg-emerald-950/40 text-[#006c4a] dark:text-emerald-400 flex items-center justify-center shrink-0">
                                    <Banknote className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-base font-bold text-[#0b1c30] dark:text-white">
                                            Pagar en consultorio / clínica
                                        </h3>
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#e8f7ee] text-[#006c4a] dark:bg-emerald-950/50 dark:text-emerald-300 border border-[#006c4a]/15">
                                            • EFECTIVO EN RECEPCIÓN
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                                        Omite el proceso de pago digital y abona tu consulta en efectivo o con tarjeta al asistir a la clínica cuando el médico te visite.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectOmitirPago();
                                    }}
                                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                                        omitirPago
                                            ? 'bg-[#eff4ff] dark:bg-blue-950/60 text-[#006194] dark:text-sky-300'
                                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    Elegir pagar en clínica
                                </button>
                                <div
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                        omitirPago
                                            ? 'border-[#006194] bg-white dark:bg-slate-900'
                                            : 'border-slate-300 dark:border-slate-600'
                                    }`}
                                >
                                    {omitirPago && <div className="w-2.5 h-2.5 rounded-full bg-[#006194]" />}
                                </div>
                            </div>
                        </div>

                        {omitirPago && (
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#006c4a] dark:text-emerald-400 font-medium">
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    No se te solicitará pago digital previo. Puedes continuar al paso de confirmación directamente.
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* DIVIDER: O SELECCIONA UN MÉTODO DE PAGO EN LÍNEA */}
                {isPresencial && (
                    <div className="relative my-2 text-center">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200/80 dark:border-slate-800" />
                        </div>
                        <span className="relative bg-slate-50 dark:bg-[#0B1120] px-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            O SELECCIONA UN MÉTODO DE PAGO EN LÍNEA
                        </span>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* MÉTODOS DE PAGO EN LÍNEA                                                  */}
                {/* ========================================================================= */}
                <div className="flex flex-col space-y-3.5">
                    {/* 1. TARJETA DE CRÉDITO / DÉBITO */}
                    {metodoTarjeta && (() => {
                        const isSelected = !omitirPago && tipoPagoId === metodoTarjeta.tipoPagoId;
                        const filteredBilletera = billetera.filter(b => b.tipo === 'TARJETA');

                        return (
                            <div
                                key={metodoTarjeta.tipoPagoId}
                                className={`rounded-2xl border transition-all ${
                                    isSelected
                                        ? 'bg-white dark:bg-slate-900 border-[#006194]/40 dark:border-[#006194]/60 ring-2 ring-[#006194]/15 shadow-[0_4px_20px_rgba(11,28,48,0.06)]'
                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-[0_2px_14px_rgba(11,28,48,0.04)] hover:border-slate-200 dark:hover:border-slate-700'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => handleSelectMetodo(metodoTarjeta.tipoPagoId)}
                                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-12 h-12 rounded-xl bg-[#eff4ff] dark:bg-blue-950/40 text-[#006194] dark:text-blue-400 flex items-center justify-center shrink-0">
                                            <CreditCard className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-base font-bold text-[#0b1c30] dark:text-white">
                                                    Tarjeta de Crédito / Débito
                                                </h3>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                        VISA
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                        Mastercard
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                        BAC
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                        BI
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                Sin recargo adicional. Procesamiento seguro encriptado
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-4 transition-all ${
                                            isSelected
                                                ? 'border-[#006194] bg-white dark:bg-slate-900'
                                                : 'border-slate-300 dark:border-slate-600'
                                        }`}
                                    >
                                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#006194]" />}
                                    </div>
                                </button>

                                {/* Acordeón de tarjetas guardadas */}
                                {isSelected && (
                                    <div className="px-5 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-200">
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3 text-xs uppercase tracking-wider">
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
                                                            className={`flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                                                                isItemActivo
                                                                    ? 'border-[#006194] bg-white dark:bg-slate-900 ring-1 ring-[#006194] shadow-xs'
                                                                    : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 bg-white/70 dark:bg-slate-800/50'
                                                            }`}
                                                        >
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isItemActivo ? 'bg-[#eff4ff] dark:bg-blue-900/30 text-[#006194] dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
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
                                                                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                                                    {item.descripcion}
                                                                </span>
                                                            </div>
                                                            <div className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${isItemActivo ? 'border-[#006194]' : 'border-slate-300 dark:border-slate-600'}`}>
                                                                {isItemActivo && <div className="w-2 h-2 rounded-full bg-[#006194]" />}
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
                                                        className="flex items-center gap-3 p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-[#006194] bg-white/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left transition-all mt-1 cursor-pointer"
                                                    >
                                                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                            <Plus className="w-4 h-4" />
                                                        </div>
                                                        <span className="font-bold text-[#006194] dark:text-sky-400 text-xs">
                                                            + Agregar nueva tarjeta
                                                        </span>
                                                    </button>
                                                ) : (
                                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mt-2 shadow-xs animate-in fade-in zoom-in-95">
                                                        <h5 className="font-bold text-slate-800 dark:text-white mb-3 text-xs uppercase tracking-wider">
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
                                                                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#006194] focus:border-[#006194]"
                                                                />
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                                                Procesado de forma cifrada y segura con tokenización directa.
                                                            </p>
                                                        </div>
                                                        <div className="flex justify-end gap-2 mt-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsAddingTarjeta(false)}
                                                                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleSaveTarjeta}
                                                                disabled={isSaving || !newCardNum}
                                                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#006194] hover:bg-[#007bb9] rounded-xl shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
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
                        );
                    })()}

                    {/* 2. TRANSFERENCIA BANCARIA */}
                    {metodoTransferencia && (() => {
                        const isSelected = !omitirPago && tipoPagoId === metodoTransferencia.tipoPagoId;

                        let cuentasDisponibles: any[] = [];
                        if (metodoTransferencia.cuentasBancarias && metodoTransferencia.cuentasBancarias.length > 0) {
                            cuentasDisponibles = metodoTransferencia.cuentasBancarias;
                        } else if (typeof (metodoTransferencia as any).cuentasBancariasJSON === 'string' && (metodoTransferencia as any).cuentasBancariasJSON) {
                            try {
                                const parsed = JSON.parse((metodoTransferencia as any).cuentasBancariasJSON);
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
                            <div
                                key={metodoTransferencia.tipoPagoId}
                                className={`rounded-2xl border transition-all ${
                                    isSelected
                                        ? 'bg-white dark:bg-slate-900 border-[#006194]/40 dark:border-[#006194]/60 ring-2 ring-[#006194]/15 shadow-[0_4px_20px_rgba(11,28,48,0.06)]'
                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-[0_2px_14px_rgba(11,28,48,0.04)] hover:border-slate-200 dark:hover:border-slate-700'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => handleSelectMetodo(metodoTransferencia.tipoPagoId)}
                                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-12 h-12 rounded-xl bg-[#ede9fe] dark:bg-purple-950/40 text-[#6366f1] dark:text-purple-400 flex items-center justify-center shrink-0">
                                            <Landmark className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-base font-bold text-[#0b1c30] dark:text-white">
                                                    Transferencia Bancaria
                                                    <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1.5">
                                                        (Banco Industrial, G&T, Banrural)
                                                    </span>
                                                </h3>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                Te enviaremos los datos de cuenta y podrás adjuntar tu boleta de inmediato
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-4 transition-all ${
                                            isSelected
                                                ? 'border-[#006194] bg-white dark:bg-slate-900'
                                                : 'border-slate-300 dark:border-slate-600'
                                        }`}
                                    >
                                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#006194]" />}
                                    </div>
                                </button>

                                {/* Acordeón de datos bancarios y comprobante */}
                                {isSelected && (
                                    <div className="px-5 pb-6 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-200 space-y-5">
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
                                                        <div key={idx} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                                                            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                                                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#eff4ff] dark:bg-blue-950/60 text-[#006194] dark:text-blue-400">
                                                                    <Landmark className="w-3.5 h-3.5" />
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight">{banco}</span>
                                                            </div>
                                                            <div className="p-4 space-y-4">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    {tipoCuenta && (
                                                                        <div className="space-y-0.5">
                                                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tipo de cuenta</p>
                                                                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{tipoCuenta}</p>
                                                                        </div>
                                                                    )}
                                                                    {nombreCuenta && (
                                                                        <div className="space-y-0.5">
                                                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">A nombre de</p>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">{nombreCuenta}</p>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleCopyToClipboard(nombreCuenta, `nombre-${idx}`)}
                                                                                    className="shrink-0 p-1 rounded-md text-slate-300 dark:text-slate-600 hover:text-[#006194] dark:hover:text-sky-400 hover:bg-[#eff4ff] dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                                                                                    title="Copiar nombre"
                                                                                >
                                                                                    {copiedField === `nombre-${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {numeroCuenta && (
                                                                    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col items-center justify-center gap-1.5 shadow-2xs text-center">
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                            Número de cuenta
                                                                        </p>
                                                                        <div className="flex items-center justify-center gap-2.5">
                                                                            <span className="font-mono text-lg sm:text-xl font-black text-[#006194] dark:text-sky-400 tracking-wider">
                                                                                {numeroCuenta}
                                                                            </span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleCopyToClipboard(numeroCuenta, `num-${idx}`)}
                                                                                className="shrink-0 p-1.5 rounded-lg bg-[#eff4ff] dark:bg-blue-950/60 text-[#006194] dark:text-sky-400 hover:bg-[#dce9ff] transition-colors cursor-pointer"
                                                                                title="Copiar número de cuenta"
                                                                            >
                                                                                {copiedField === `num-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
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
                                                    className="mt-1 w-full bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-xs text-slate-800 dark:text-slate-200 focus:border-[#006194] focus:ring-1 focus:ring-[#006194]"
                                                />
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                                        Comprobante de transferencia (Opcional)
                                                    </label>
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                                        Máx. 3 MB · JPG, PNG, WebP o PDF
                                                    </span>
                                                </div>

                                                {isOptimizingComprobante ? (
                                                    <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 flex items-center justify-center gap-2.5 text-xs font-bold text-[#006194] dark:text-sky-400">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span>Optimizando y comprimiendo imagen...</span>
                                                    </div>
                                                ) : comprobanteTransferencia ? (
                                                    <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                                                <FileCheck2 className="w-5 h-5" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                                                    {comprobanteTransferencia.name}
                                                                </p>
                                                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                                    {formatBytes(comprobanteTransferencia.size)} / 3 MB · Listo para adjuntar
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setComprobanteTransferencia(null)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0 cursor-pointer"
                                                            title="Eliminar comprobante"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center bg-slate-50/50 dark:bg-slate-800/40 hover:border-[#006194] transition-colors cursor-pointer group">
                                                        <input
                                                            type="file"
                                                            accept="image/*,application/pdf"
                                                            onChange={handleComprobanteChange}
                                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                        />
                                                        <div className="flex flex-col items-center justify-center gap-1.5">
                                                            <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-[#006194] transition-colors" />
                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                                Subir imagen o PDF del comprobante
                                                            </p>
                                                            <p className="text-[10px] text-slate-400">
                                                                Máximo 3 MB · Se comprime automáticamente si es foto
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* 3. PAGO CON SEGURO MÉDICO (Activo o No disponible con este médico) */}
                    {tieneSeguroEnMedico && metodoSeguro ? (() => {
                        const isSelected = !omitirPago && tipoPagoId === metodoSeguro.tipoPagoId;
                        const filteredBilletera = billetera.filter(b => b.tipo === 'SEGURO');

                        return (
                            <div
                                key={metodoSeguro.tipoPagoId}
                                className={`rounded-2xl border transition-all ${
                                    isSelected
                                        ? 'bg-white dark:bg-slate-900 border-[#006194]/40 dark:border-[#006194]/60 ring-2 ring-[#006194]/15 shadow-[0_4px_20px_rgba(11,28,48,0.06)]'
                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-[0_2px_14px_rgba(11,28,48,0.04)] hover:border-slate-200 dark:hover:border-slate-700'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => handleSelectMetodo(metodoSeguro.tipoPagoId)}
                                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-12 h-12 rounded-xl bg-[#eff4ff] dark:bg-blue-950/40 text-[#006194] dark:text-blue-400 flex items-center justify-center shrink-0">
                                            <ShieldCheck className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-base font-bold text-[#0b1c30] dark:text-white">
                                                    Pago con Seguro Médico
                                                </h3>
                                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#006194] dark:bg-blue-950/60 dark:text-sky-300">
                                                    Convenios Disponibles
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                Aplica tu cobertura de seguro médico directo (Roble, Universales, Pan-American, etc.)
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-4 transition-all ${
                                            isSelected
                                                ? 'border-[#006194] bg-white dark:bg-slate-900'
                                                : 'border-slate-300 dark:border-slate-600'
                                        }`}
                                    >
                                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#006194]" />}
                                    </div>
                                </button>

                                {/* Acordeón de seguros registrados */}
                                {isSelected && (
                                    <div className="px-5 pb-6 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-200 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                                                Pólizas registradas para {pacienteActual?.nombreCompleto || 'el paciente'}:
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={() => setIsConfiguringSeguro(true)}
                                                className="text-xs font-bold text-[#006194] dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Añadir seguro
                                            </button>
                                        </div>

                                        {isLoadingBilletera ? (
                                            <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-sm py-4">
                                                <Loader2 className="animate-spin h-4 w-4" /> Consultando seguros registrados...
                                            </div>
                                        ) : filteredBilletera.length === 0 ? (
                                            <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-center space-y-3">
                                                <div className="w-12 h-12 rounded-2xl bg-[#eff4ff] dark:bg-blue-950/40 text-[#006194] dark:text-blue-400 mx-auto flex items-center justify-center">
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
                                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#006194] hover:bg-[#007bb9] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
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
                                                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                                                                isItemActivo
                                                                    ? 'border-[#006194] bg-white dark:bg-slate-900 ring-1 ring-[#006194] shadow-xs'
                                                                    : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 bg-white/70 dark:bg-slate-800/50'
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700 overflow-hidden">
                                                                        {item.imagen_url ? (
                                                                            <img src={item.imagen_url} alt={item.proveedor} className="w-full h-full object-contain p-1" />
                                                                        ) : (
                                                                            <ShieldCheck className="w-5 h-5 text-[#006194] dark:text-blue-400" />
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
                                                                <div className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center mt-1 ${isItemActivo ? 'border-[#006194]' : 'border-slate-300 dark:border-slate-600'}`}>
                                                                    {isItemActivo && <div className="w-2 h-2 rounded-full bg-[#006194]" />}
                                                                </div>
                                                            </div>

                                                            {(item.foto_carne_url || item.foto_carne_reverso_url) ? (
                                                                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                        Valida las caras de tu carné:
                                                                    </p>
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        {item.foto_carne_url && (
                                                                            <div
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setZoomCarnet(item.foto_carne_url!);
                                                                                }}
                                                                                className="relative group w-16 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer shadow-2xs"
                                                                                title="Clic para ampliar frente"
                                                                            >
                                                                                <img src={item.foto_carne_url} alt="Frente" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                                                <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white text-center font-bold">Frente</span>
                                                                            </div>
                                                                        )}
                                                                        {item.foto_carne_reverso_url && (
                                                                            <div
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setZoomCarnet(item.foto_carne_reverso_url!);
                                                                                }}
                                                                                className="relative group w-16 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer shadow-2xs"
                                                                                title="Clic para ampliar reverso"
                                                                            >
                                                                                <img src={item.foto_carne_reverso_url} alt="Reverso" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                                                <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white text-center font-bold">Reverso</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex-1 min-w-0">
                                                                            <span className="text-[11px] font-bold text-[#006c4a] dark:text-emerald-400 flex items-center gap-1">
                                                                                <FileCheck2 className="w-3.5 h-3.5" /> Carné válido
                                                                            </span>
                                                                            <p className="text-[10px] text-slate-400">
                                                                                {item.foto_carne_url && item.foto_carne_reverso_url ? 'Frente y reverso vinculados' : '1 cara vinculada'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400">
                                                                    <span className="flex items-center gap-1">
                                                                        <AlertCircle className="w-3 h-3" /> Sin fotos de carné vinculadas
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setIsConfiguringSeguro(true);
                                                                        }}
                                                                        className="font-bold underline text-[#006194] dark:text-sky-400 cursor-pointer"
                                                                    >
                                                                        Subir carné
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })() : (
                        /* Si el médico no acepta seguro: Tarjeta deshabilitada idéntica a la referencia de diseño */
                        <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 p-4 sm:p-5 flex items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                                            Pago con Seguro Médico
                                        </h3>
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300/60 dark:border-slate-700">
                                            NO DISPONIBLE CON ESTE MÉDICO
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                                        Este especialista no está asociado a ningún seguro médico ni convenios de aseguradoras directas (Roble, Universales, Pan-American). Por favor, selecciona otro método de pago (transferencia, tarjeta o directamente en recepción).
                                    </p>
                                </div>
                            </div>

                            <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-600 shrink-0">
                                <Ban className="w-3 h-3" />
                            </div>
                        </div>
                    )}

                    {/* Otros métodos de pago configurados si existieran */}
                    {otrosMetodos.map((metodo) => {
                        const isSelected = !omitirPago && tipoPagoId === metodo.tipoPagoId;
                        const Icon = getIconForMethod(metodo.descripcion);

                        return (
                            <div
                                key={metodo.tipoPagoId}
                                className={`rounded-2xl border transition-all ${
                                    isSelected
                                        ? 'bg-white dark:bg-slate-900 border-[#006194]/40 dark:border-[#006194]/60 ring-2 ring-[#006194]/15 shadow-[0_4px_20px_rgba(11,28,48,0.06)]'
                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-[0_2px_14px_rgba(11,28,48,0.04)] hover:border-slate-200 dark:hover:border-slate-700'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => handleSelectMetodo(metodo.tipoPagoId)}
                                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-12 h-12 rounded-xl bg-[#eff4ff] dark:bg-blue-950/40 text-[#006194] dark:text-blue-400 flex items-center justify-center shrink-0">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-[#0b1c30] dark:text-white">
                                                {metodo.descripcion}
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {metodo.observaciones}
                                            </p>
                                        </div>
                                    </div>
                                    <div
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-4 transition-all ${
                                            isSelected
                                                ? 'border-[#006194] bg-white dark:bg-slate-900'
                                                : 'border-slate-300 dark:border-slate-600'
                                        }`}
                                    >
                                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#006194]" />}
                                    </div>
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Sección de Recompensas y Cupones Activos */}
                <CuponesSeccion pacCodigo={pacienteActual?.pacCodigo || pacienteTitularFresh?.pacCodigo} />

                {/* ========================================================================= */}
                {/* RESUMEN Y BOTONES DE NAVEGACIÓN INFERIOR                                   */}
                {/* ========================================================================= */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-[0_4px_28px_rgba(11,28,48,0.06)] border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                    <button
                        type="button"
                        onClick={() => {
                            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                            document.documentElement.scrollTop = 0;
                            document.body.scrollTop = 0;
                            prevStep();
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Volver a Paciente</span>
                    </button>

                    <div className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto justify-end">
                        <div className="text-center sm:text-right">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                                TOTAL A PAGAR:
                            </span>
                            <span className="text-2xl sm:text-3xl font-black text-[#0b1c30] dark:text-white">
                                Q{precioTotal.toFixed(2)}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                                document.documentElement.scrollTop = 0;
                                document.body.scrollTop = 0;
                                nextStep();
                            }}
                            disabled={!isComplete}
                            className={`w-full sm:w-auto px-8 h-12 rounded-xl text-sm font-semibold shadow-[0_4px_16px_rgba(0,97,148,0.22)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 ${
                                isComplete
                                    ? 'bg-[#006194] hover:bg-[#007bb9] text-white cursor-pointer'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                            }`}
                        >
                            <span>Confirmar y Finalizar Cita</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL PARA CONFIGURAR SEGURO MÉDICO (Billetera Digital) */}
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
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in"
                    onClick={() => setZoomCarnet(null)}
                >
                    <div className="relative max-w-3xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(11,28,48,0.12)] border border-slate-200/50 dark:border-slate-800 p-2" onClick={e => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setZoomCarnet(null)}
                            className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-slate-900/60 dark:bg-slate-800/80 text-white hover:bg-slate-900 dark:hover:bg-slate-700 transition cursor-pointer"
                            aria-label="Cerrar vista previa"
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
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/10 p-5">
            <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-[#006c4a] dark:text-emerald-400">
                    <Gift className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Aplicar Recompensa o Cupón</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tienes {cuponesDisponibles.length} cupón(es) disponible(s) en tu cuenta.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={() => setRecompensaSeleccionada(null)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
                        !recompensaSeleccionada
                            ? 'border-emerald-500 bg-white dark:bg-slate-900 text-[#006c4a] dark:text-emerald-300 font-bold ring-1 ring-emerald-500'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-emerald-300'
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
                            className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
                                isSelected
                                    ? 'border-emerald-500 bg-white dark:bg-slate-900 text-[#006c4a] dark:text-emerald-300 font-bold ring-1 ring-emerald-500 shadow-xs'
                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <Gift className="h-5 w-5 shrink-0 text-emerald-500" />
                                <div className="truncate">
                                    <p className="text-xs font-bold truncate text-slate-900 dark:text-white">
                                        {cupon.tituloRecompensa || (cupon as any).titulo || 'Recompensa'}
                                    </p>
                                    <p className="text-[11px] text-[#006c4a] dark:text-emerald-400 font-semibold">
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
