'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Edit3,
} from 'lucide-react';
import { calculateProfileCompleteness, ProfileCompleteness } from '@/lib/profile-completion';
import type { Paciente } from '@/types';

interface ProfileCompletenessWidgetProps {
  paciente: Paciente | null | undefined;
  variant?: 'sidebar' | 'banner' | 'compact';
  onEditClick?: () => void;
  className?: string;
}

export function ProfileCompletenessWidget({
  paciente,
  variant = 'sidebar',
  onEditClick,
  className = '',
}: ProfileCompletenessWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const info: ProfileCompleteness = useMemo(
    () => calculateProfileCompleteness(paciente),
    [paciente]
  );

  const { percentage, isComplete, missingLabels } = info;

  // Color theme mapping based on percentage
  const colorScheme = useMemo(() => {
    if (isComplete) {
      return {
        badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        progressBar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
        icon: ShieldCheck,
        iconColor: 'text-emerald-500 dark:text-emerald-400',
        cardBg: 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40',
      };
    }
    if (percentage >= 70) {
      return {
        badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20',
        progressBar: 'bg-gradient-to-r from-blue-600 to-cyan-500',
        icon: Sparkles,
        iconColor: 'text-blue-500 dark:text-blue-400',
        cardBg: 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900/40',
      };
    }
    return {
      badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20',
      progressBar: 'bg-gradient-to-r from-amber-500 to-orange-500',
      icon: AlertCircle,
      iconColor: 'text-amber-500 dark:text-amber-400',
      cardBg: 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40',
    };
  }, [percentage, isComplete]);

  const Icon = colorScheme.icon;

  // ─── Compact Variant (for Navbar Dropdown) ───
  if (variant === 'compact') {
    return (
      <Link
        href="/dashboard/perfil"
        className={`block p-3 rounded-xl border transition-all ${
          isComplete
            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30 hover:bg-emerald-100/50'
            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60 hover:bg-blue-50/40 dark:hover:bg-slate-800'
        } ${className}`}
      >
        <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
            <Icon className={`w-3.5 h-3.5 ${colorScheme.iconColor}`} />
            {isComplete ? 'Tu perfil está completo' : `Tu perfil está ${percentage}% completo`}
          </span>
          <span className="font-bold text-slate-900 dark:text-white">{percentage}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colorScheme.progressBar}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {!isComplete && missingLabels.length > 0 && (
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Falta: {missingLabels.slice(0, 2).join(', ')}
            {missingLabels.length > 2 ? ` y +${missingLabels.length - 2}` : ''}
          </p>
        )}
      </Link>
    );
  }

  // ─── Banner Variant (for Top of /dashboard/perfil) ───
  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 transition-colors ${colorScheme.cardBg} ${className}`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 shadow-xs">
              <Icon className={`h-6 w-6 ${colorScheme.iconColor}`} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isComplete ? '¡Tu perfil está 100% completo!' : `Tu perfil está ${percentage}% completo`}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold border ${colorScheme.badgeBg}`}>
                  {percentage}%
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                {isComplete
                  ? 'Tienes toda tu información médica y personal al día para agendar citas sin contratiempos.'
                  : `Te recomendamos completar tu información (como ${missingLabels.slice(0, 3).join(', ')}) para agilizar tus consultas.`}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5 self-end sm:self-auto">
            {onEditClick && !isComplete && (
              <button
                type="button"
                onClick={onEditClick}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs sm:text-sm font-semibold shadow-xs transition-transform active:scale-95"
              >
                <Edit3 className="w-4 h-4" />
                <span>Completar perfil</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${colorScheme.progressBar}`}
          />
        </div>

        {/* Missing fields tags */}
        {!isComplete && missingLabels.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Por completar:</span>
            {missingLabels.map((lbl) => (
              <span
                key={lbl}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {lbl}
              </span>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // ─── Sidebar Variant (Default for ProfileSidebar) ───
  return (
    <div
      className={`rounded-2xl border p-3.5 transition-colors ${
        isComplete
          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30'
          : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800/80'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg ${colorScheme.badgeBg}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {isComplete ? 'Tu perfil está completo' : `Tu perfil está ${percentage}% completo`}
            </p>
          </div>
        </div>
        <span className={`text-xs font-extrabold px-1.5 py-0.5 rounded-md ${colorScheme.badgeBg}`}>
          {percentage}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mt-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${colorScheme.progressBar}`}
        />
      </div>

      {/* Missing Details Collapsible */}
      {!isComplete && missingLabels.length > 0 && (
        <div className="mt-2.5">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center justify-between w-full text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <span>{missingLabels.length} {missingLabels.length === 1 ? 'campo pendiente' : 'campos pendientes'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-2 space-y-1"
              >
                <div className="flex flex-wrap gap-1 pt-1">
                  {missingLabels.map((lbl) => (
                    <span
                      key={lbl}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      {lbl}
                    </span>
                  ))}
                </div>
                <Link
                  href="/dashboard/perfil"
                  className="mt-2 flex items-center justify-center gap-1 w-full text-[11px] font-bold py-1.5 px-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
                >
                  <span>Completar ahora</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
