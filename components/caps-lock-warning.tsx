'use client';

import React from 'react';
import { ArrowBigUp } from 'lucide-react';

interface CapsLockWarningProps {
  isVisible: boolean;
  className?: string;
}

export function CapsLockWarning({ isVisible, className = '' }: CapsLockWarningProps) {
  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1 animate-in fade-in duration-150 ${className}`}
    >
      <ArrowBigUp className="w-3.5 h-3.5 fill-amber-500/20 text-amber-500 shrink-0" />
      <span>Bloq Mayús activado</span>
    </div>
  );
}
