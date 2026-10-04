'use client';

import React, { useState } from 'react';
import { Shield } from 'lucide-react';

export type InsuranceLogoBadgeProps = {
  asg: {
    aseguradora: string;
    imagen?: string | null;
  };
  isHighlighted?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
};

export function InsuranceLogoBadge({
  asg,
  isHighlighted = false,
  size = 'sm',
  showName = false,
  className = '',
}: InsuranceLogoBadgeProps) {
  const [hasError, setHasError] = useState(false);

  const initials = asg.aseguradora
    ? asg.aseguradora
        .split(' ')
        .filter((w) => !['de', 'el', 'la', 'los', 'las', 'y', '&'].includes(w.toLowerCase()))
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : 'AS';

  const sizeClasses = {
    xs: 'w-4.5 h-4.5 rounded-[4px] p-0.5 text-[8px]',
    sm: 'w-5.5 h-5.5 rounded-md p-0.5 text-[8.5px]',
    md: 'w-7 h-7 rounded-lg p-1 text-[11px]',
    lg: 'w-9 h-9 rounded-xl p-1.5 text-xs',
  }[size];

  const logoBox = (
    <div
      title={asg.aseguradora}
      className={`shrink-0 flex items-center justify-center bg-white overflow-hidden transition-all duration-150 ${sizeClasses} ${
        isHighlighted
          ? 'border border-sky-500 ring-2 ring-sky-400/80 shadow-xs'
          : 'border border-slate-200/90 shadow-2xs hover:border-slate-300'
      } ${className}`}
    >
      {asg.imagen && !hasError ? (
        <img
          src={asg.imagen}
          alt={asg.aseguradora}
          onError={() => setHasError(true)}
          loading="lazy"
          className="w-full h-full object-contain pointer-events-none select-none"
        />
      ) : initials ? (
        <span className="font-black text-slate-700 tracking-tighter leading-none select-none">
          {initials}
        </span>
      ) : (
        <Shield className="w-3 h-3 text-slate-400" />
      )}
    </div>
  );

  if (!showName) {
    return logoBox;
  }

  return (
    <div
      title={asg.aseguradora}
      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-colors ${
        isHighlighted
          ? 'bg-sky-50/80 border-sky-400 text-sky-900 ring-1 ring-sky-300/50'
          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-slate-300 shadow-2xs'
      }`}
    >
      {logoBox}
      <span className="text-xs font-semibold truncate max-w-[160px]">
        {asg.aseguradora}
      </span>
    </div>
  );
}
