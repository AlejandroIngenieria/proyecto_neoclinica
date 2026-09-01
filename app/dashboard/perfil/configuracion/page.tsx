'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Bell,
  Shield,
  Palette,
  Globe,
  Moon,
  Sun,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Lock,
  Loader2,
  X,
  Check,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useCambiarPassword } from '@/hooks/use-auth';
import Swal from 'sweetalert2';

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
        checked ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function CambiarPasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [passwordActual, setPasswordActual] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');

  const [showActual, setShowActual] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');

  const cambiarPasswordMutation = useCambiarPassword();

  // Policy checks
  const hasLength = nuevaPassword.length >= 8 && nuevaPassword.length <= 15;
  const hasUpperCase = /[A-Z]/.test(nuevaPassword);
  const hasLowerCase = /[a-z]/.test(nuevaPassword);
  const hasNumber = /\d/.test(nuevaPassword);
  const hasSpecialChar = /[%&@\-_]/.test(nuevaPassword);
  const passwordsMatch = nuevaPassword.length > 0 && nuevaPassword === confirmarPassword;

  const isFormValid =
    passwordActual.length > 0 &&
    hasLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber &&
    hasSpecialChar &&
    passwordsMatch;

  const handleClose = () => {
    setPasswordActual('');
    setNuevaPassword('');
    setConfirmarPassword('');
    setErrorMsg('');
    setShowActual(false);
    setShowNueva(false);
    setShowConfirmar(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || cambiarPasswordMutation.isPending) return;

    setErrorMsg('');

    try {
      await cambiarPasswordMutation.mutateAsync({
        passwordActual,
        nuevaPassword,
      });

      handleClose();

      Swal.fire({
        icon: 'success',
        title: '¡Contraseña Actualizada!',
        text: 'Tu contraseña se ha cambiado correctamente.',
        confirmButtonColor: '#2563eb',
        customClass: {
          popup: 'rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white',
          title: 'text-xl font-black text-slate-900 dark:text-white',
          confirmButton: 'rounded-xl font-bold px-6 py-2.5',
        },
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al cambiar la contraseña. Verifica tu contraseña actual.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop con blur */}
          <motion.div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] shadow-2xl z-10"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0 border border-blue-100 dark:border-blue-900/40">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Cambiar Contraseña</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Ingresa tu clave actual y define tu nueva contraseña.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="rounded-full p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-xs font-bold text-rose-700 dark:text-rose-300">
                  <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Contraseña actual */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Contraseña Actual
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showActual ? 'text' : 'password'}
                    value={passwordActual}
                    onChange={(e) => setPasswordActual(e.target.value)}
                    placeholder="Ingresa tu contraseña actual"
                    required
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowActual(!showActual)}
                    className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  >
                    {showActual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* 2. Nueva Contraseña */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nueva Contraseña
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showNueva ? 'text' : 'password'}
                    value={nuevaPassword}
                    onChange={(e) => setNuevaPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNueva(!showNueva)}
                    className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  >
                    {showNueva ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* 3. Confirmar Nueva Contraseña */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showConfirmar ? 'text' : 'password'}
                    value={confirmarPassword}
                    onChange={(e) => setConfirmarPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    required
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmar(!showConfirmar)}
                    className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  >
                    {showConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Checklist de Políticas */}
              <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  Políticas de Seguridad:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className={`flex items-center gap-2 font-medium ${hasLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {hasLength ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600 ml-1 mr-1" />}
                    <span>8 a 15 caracteres</span>
                  </div>

                  <div className={`flex items-center gap-2 font-medium ${hasUpperCase ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {hasUpperCase ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600 ml-1 mr-1" />}
                    <span>Una mayúscula (A-Z)</span>
                  </div>

                  <div className={`flex items-center gap-2 font-medium ${hasLowerCase ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {hasLowerCase ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600 ml-1 mr-1" />}
                    <span>Una minúscula (a-z)</span>
                  </div>

                  <div className={`flex items-center gap-2 font-medium ${hasNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {hasNumber ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600 ml-1 mr-1" />}
                    <span>Al menos un número (0-9)</span>
                  </div>

                  <div className={`flex items-center gap-2 font-medium ${hasSpecialChar ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {hasSpecialChar ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600 ml-1 mr-1" />}
                    <span>Carácter especial (%&@-_)</span>
                  </div>

                  <div className={`flex items-center gap-2 font-medium ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {passwordsMatch ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600 ml-1 mr-1" />}
                    <span>Contraseñas coinciden</span>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid || cambiarPasswordMutation.isPending}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-md cursor-pointer ${
                    isFormValid && !cambiarPasswordMutation.isPending
                      ? 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                      : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'
                  }`}
                >
                  {cambiarPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <span>Guardar Contraseña</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ConfiguracionPage() {
  const { isDarkMode, toggleDarkMode } = useUIStore();
  const [mounted, setMounted] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeDarkMode = mounted ? isDarkMode : false;

  const settingsSections = [
    {
      title: 'Apariencia',
      icon: Palette,
      items: [
        {
          label: 'Modo oscuro',
          description: 'Cambia la interfaz a tonos oscuros para reducir la fatiga visual.',
          icon: activeDarkMode ? Moon : Sun,
          action: (
            <ToggleSwitch checked={activeDarkMode} onChange={toggleDarkMode} />
          ),
        },
      ],
    },
    {
      title: 'Notificaciones',
      icon: Bell,
      items: [
        {
          label: 'Recordatorios de citas',
          description: 'Recibe notificaciones antes de tus citas programadas.',
          icon: Bell,
          action: <ToggleSwitch checked={true} onChange={() => {}} />,
        },
      ],
    },
    {
      title: 'Privacidad y Seguridad',
      icon: Shield,
      items: [
        {
          label: 'Cambiar Contraseña',
          description: 'Actualiza tu contraseña periódicamente para proteger el acceso a tu cuenta médica.',
          icon: KeyRound,
          action: (
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800/60 px-4 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <KeyRound className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Cambiar contraseña
            </button>
          ),
        },
        {
          label: 'Autenticación de dos factores',
          description: 'Añade una capa extra de seguridad a tu cuenta.',
          icon: Shield,
          action: (
            <span className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Próximamente
            </span>
          ),
        },
      ],
    },
    {
      title: 'Idioma y Región',
      icon: Globe,
      items: [
        {
          label: 'Idioma de la interfaz',
          description: 'Selecciona el idioma en el que se muestra la aplicación.',
          icon: Globe,
          action: (
            <span className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              Español (GT)
            </span>
          ),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8 lg:px-10 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto space-y-8">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 py-4 mb-6 backdrop-blur-md">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
          Configuración
        </h1>
        <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
          Personaliza tu experiencia de usuario, apariencia y preferencias de la cuenta.
        </p>
      </div>

      {/* Settings sections */}
      <div className="space-y-6">
        {settingsSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + sectionIndex * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-[#1E293B]/60 backdrop-blur-xl shadow-xl shadow-slate-900/5 dark:shadow-slate-950/20"
          >
            {/* Section header */}
            <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-slate-100/60 dark:border-slate-800/60 bg-transparent">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0 border border-blue-100 dark:border-blue-900/30">
                <section.icon className="h-[18px] w-[18px]" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{section.title}</h2>
            </div>

            {/* Items */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {section.items.map((item) => (
                <div key={item.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      <item.icon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</p>
                    </div>
                  </div>
                  <div className="self-end sm:self-auto shrink-0">
                    {item.action}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer note */}
      <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-[#1E293B]/40 backdrop-blur-md p-6 text-center space-y-1">
        <Settings className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Más opciones próximamente</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Estamos trabajando en más opciones de personalización para tu cuenta.
        </p>
      </div>

      {/* Modal para Cambiar Contraseña */}
      <CambiarPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}
