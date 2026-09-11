'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, KeyRound, Eye, EyeOff, ShieldCheck, Check, AlertCircle, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { useCambiarPassword, useReenviarPasswordTemporal } from '@/hooks/use-auth';
import { toast } from 'sonner';

export function ForceChangePasswordModal() {
  const { data: session, update } = useSession();
  const cambiarPasswordMutation = useCambiarPassword();
  const reenviarPasswordMutation = useReenviarPasswordTemporal();

  const [passwordActual, setPasswordActual] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [showActual, setShowActual] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [resendSuccessMsg, setResendSuccessMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isDone, setIsDone] = useState(false);

  // Temporizador para el cooldown de reenvío de correo (60s)
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const shouldShow = Boolean(
    session?.user?.debeCambiarPassword === true && !isDone
  );

  // Verificación proactiva con el backend: si el usuario no requiere cambio, desbloquear y actualizar sesión
  useEffect(() => {
    if (!shouldShow) return;

    let isMounted = true;
    async function checkBackendPasswordState() {
      try {
        const token = (session as any)?.accessToken || (session as any)?.user?.token || (session as any)?.token;
        if (!token) return;

        const res = await fetch('/api/autenticacion/estado-password', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.debeCambiarPassword === false && isMounted) {
            setIsDone(true);
            await update({ debeCambiarPassword: false });
          }
        }
      } catch {
        // Silencioso ante fallos de red en la verificación
      }
    }

    checkBackendPasswordState();

    return () => {
      isMounted = false;
    };
  }, [shouldShow, session, update]);

  // Validaciones en tiempo real
  const rules = useMemo(() => {
    return {
      length: nuevaPassword.length >= 8,
      uppercase: /[A-Z]/.test(nuevaPassword),
      lowercase: /[a-z]/.test(nuevaPassword),
      number: /[0-9]/.test(nuevaPassword),
      special: /[!@#$%^&*(),.?":{}|<>\-_=+]/.test(nuevaPassword),
      matches: nuevaPassword.length > 0 && nuevaPassword === confirmarPassword,
    };
  }, [nuevaPassword, confirmarPassword]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (rules.length) score++;
    if (rules.uppercase) score++;
    if (rules.lowercase) score++;
    if (rules.number) score++;
    if (rules.special) score++;
    return score;
  }, [rules]);

  const strengthText = useMemo(() => {
    if (nuevaPassword.length === 0) return { label: 'Requerida', color: 'bg-slate-200 text-slate-500' };
    if (strengthScore <= 2) return { label: 'Débil', color: 'bg-rose-500 text-rose-500' };
    if (strengthScore <= 4) return { label: 'Media', color: 'bg-amber-500 text-amber-500' };
    return { label: 'Fuerte', color: 'bg-emerald-500 text-emerald-500' };
  }, [strengthScore, nuevaPassword]);

  const isFormValid = useMemo(() => {
    return (
      passwordActual.trim().length > 0 &&
      rules.length &&
      rules.uppercase &&
      rules.lowercase &&
      rules.number &&
      rules.special &&
      rules.matches &&
      passwordActual !== nuevaPassword
    );
  }, [passwordActual, nuevaPassword, rules]);

  if (!shouldShow) return null;

  const handleResend = async () => {
    if (resendCooldown > 0 || reenviarPasswordMutation.isPending) return;
    setErrorLocal(null);
    setResendSuccessMsg(null);

    try {
      const userEmail = session?.user?.email ?? undefined;
      await reenviarPasswordMutation.mutateAsync(userEmail);

      setResendCooldown(60);
      setPasswordActual('');
      setResendSuccessMsg(
        userEmail
          ? `Nueva contraseña temporal enviada a ${userEmail}. Revisa tu bandeja principal o carpeta de correo no deseado (spam).`
          : 'Nueva contraseña temporal enviada a tu correo registrado. Revisa tu bandeja de entrada o spam.'
      );
      toast.success('¡Correo reenviado con éxito!', {
        description: 'Hemos enviado una nueva contraseña temporal. Por favor revisa tu bandeja de entrada o spam.',
      });
    } catch (err: any) {
      const msg = err?.message || 'Error al solicitar el reenvío de la contraseña temporal.';
      if (msg.toLowerCase().includes('no requiere')) {
        setIsDone(true);
        await update({ debeCambiarPassword: false });
        toast.info('Tu cuenta no requiere cambio de contraseña', {
          description: 'Se ha verificado tu cuenta correctamente y puedes continuar navegando.',
        });
        return;
      }
      setErrorLocal(msg);
      toast.error('Error al reenviar correo', { description: msg });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (passwordActual === nuevaPassword) {
      setErrorLocal('La nueva contraseña debe ser diferente de la contraseña temporal actual.');
      return;
    }

    if (!isFormValid) {
      setErrorLocal('Por favor cumple con todos los requisitos de seguridad antes de continuar.');
      return;
    }

    try {
      await cambiarPasswordMutation.mutateAsync({
        passwordActual: passwordActual.trim(),
        nuevaPassword: nuevaPassword.trim(),
      });

      setIsDone(true);
      toast.success('¡Contraseña actualizada con éxito!', {
        description: 'Tu cuenta ha sido protegida. Ahora puedes utilizar la plataforma con tu nueva contraseña.',
      });

      // Actualizar sesión de NextAuth para remover el flag
      await update({ debeCambiarPassword: false });
    } catch (err: any) {
      const msg = err?.message || 'Error al cambiar la contraseña. Verifica tu contraseña temporal.';
      setErrorLocal(msg);
      toast.error('Error al actualizar contraseña', { description: msg });
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-y-auto"
      >
        {/* Cabecera */}
        <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0 border border-blue-200/80 dark:border-blue-800/60 shadow-2xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
              Cambio de Contraseña Obligatorio
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Por tu seguridad y privacidad médica, ingresa la contraseña temporal que recibiste y define una nueva contraseña personal.
            </p>
          </div>
        </div>

        {errorLocal && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <span className="font-semibold">{errorLocal}</span>
          </div>
        )}

        {resendSuccessMsg && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-semibold leading-relaxed">{resendSuccessMsg}</p>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-1">
                Copia la clave de tu correo y pégala en <strong>Contraseña Temporal Actual</strong>.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Contraseña Actual */}
          <div>
            <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Contraseña Temporal Actual *
              </label>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || reenviarPasswordMutation.isPending}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:text-slate-400 dark:disabled:text-slate-500 transition inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                title={resendCooldown > 0 ? `Espera ${resendCooldown} segundos para volver a enviar` : 'Reenviar nueva contraseña a tu correo'}
              >
                {reenviarPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando correo...</span>
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    <span>Reenviar en {resendCooldown}s</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    <span className="hover:underline">Reenviar correo</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <input
                type={showActual ? 'text' : 'password'}
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                placeholder="Ingresa la contraseña del correo"
                required
                className="w-full h-11 px-4 pr-11 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowActual(!showActual)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                title={showActual ? 'Ocultar' : 'Mostrar'}
              >
                {showActual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nueva Contraseña */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Nueva Contraseña Confidencial *
            </label>
            <div className="relative">
              <input
                type={showNueva ? 'text' : 'password'}
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                className="w-full h-11 px-4 pr-11 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowNueva(!showNueva)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                title={showNueva ? 'Ocultar' : 'Mostrar'}
              >
                {showNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Barra de Fuerza */}
            <div className="mt-2 space-y-1">
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
                <div className={`h-full flex-1 transition-all duration-300 ${strengthScore >= 1 ? strengthText.color : 'bg-transparent'}`} />
                <div className={`h-full flex-1 transition-all duration-300 ${strengthScore >= 3 ? strengthText.color : 'bg-transparent'}`} />
                <div className={`h-full flex-1 transition-all duration-300 ${strengthScore >= 5 ? strengthText.color : 'bg-transparent'}`} />
              </div>
              <p className="text-[11px] font-bold text-slate-400 text-right">
                Seguridad: <span className="font-extrabold text-slate-600 dark:text-slate-300">{strengthText.label}</span>
              </p>
            </div>
          </div>

          {/* Confirmar Nueva Contraseña */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Confirmar Nueva Contraseña *
            </label>
            <div className="relative">
              <input
                type={showConfirmar ? 'text' : 'password'}
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                required
                className="w-full h-11 px-4 pr-11 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmar(!showConfirmar)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                title={showConfirmar ? 'Ocultar' : 'Mostrar'}
              >
                {showConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Checklist de Políticas de Seguridad */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-[11px] space-y-1.5">
            <p className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
              Requisitos de la contraseña:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div className={`flex items-center gap-1.5 ${rules.length ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                <Check className={`w-3.5 h-3.5 ${rules.length ? 'opacity-100' : 'opacity-30'}`} />
                <span>Mínimo 8 caracteres</span>
              </div>
              <div className={`flex items-center gap-1.5 ${rules.uppercase ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                <Check className={`w-3.5 h-3.5 ${rules.uppercase ? 'opacity-100' : 'opacity-30'}`} />
                <span>Una mayúscula (A-Z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${rules.lowercase ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                <Check className={`w-3.5 h-3.5 ${rules.lowercase ? 'opacity-100' : 'opacity-30'}`} />
                <span>Una minúscula (a-z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${rules.number ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                <Check className={`w-3.5 h-3.5 ${rules.number ? 'opacity-100' : 'opacity-30'}`} />
                <span>Un número (0-9)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${rules.special ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                <Check className={`w-3.5 h-3.5 ${rules.special ? 'opacity-100' : 'opacity-30'}`} />
                <span>Un carácter especial (!@#$)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${rules.matches ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                <Check className={`w-3.5 h-3.5 ${rules.matches ? 'opacity-100' : 'opacity-30'}`} />
                <span>Coinciden exactamente</span>
              </div>
            </div>
          </div>

          {/* Botón de Guardar */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!isFormValid || cambiarPasswordMutation.isPending}
              className="w-full h-11 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition shadow-sm active:scale-98 cursor-pointer"
            >
              {cambiarPasswordMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Actualizando Contraseña...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Guardar y Entrar a Mi Cuenta</span>
                </>
              )}
            </button>
          </div>

          {/* Ayuda adicional sobre el correo */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ¿No recibiste el correo?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || reenviarPasswordMutation.isPending}
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:text-slate-400 dark:disabled:text-slate-500 disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `Reenviar disponible en ${resendCooldown}s` : 'Haz clic aquí para reenviarlo'}
              </button>
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Recuerda revisar también tu carpeta de correo no deseado (spam).
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
