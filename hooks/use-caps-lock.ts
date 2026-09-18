'use client';

import { useState, useCallback } from 'react';

/**
 * Hook para detectar si el usuario tiene activada la tecla Bloq Mayús (Caps Lock)
 */
export function useCapsLock() {
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  const checkCapsLock = useCallback((e: React.KeyboardEvent | KeyboardEvent) => {
    if (e && typeof (e as any).getModifierState === 'function') {
      setIsCapsLockOn((e as any).getModifierState('CapsLock'));
    }
  }, []);

  const resetCapsLock = useCallback(() => {
    setIsCapsLockOn(false);
  }, []);

  return { isCapsLockOn, checkCapsLock, resetCapsLock };
}
