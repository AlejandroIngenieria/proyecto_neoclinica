'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { announceTurn, type AnnounceTurnOptions } from '@/lib/turn-voice';

export function useTurnVoice(options?: {
  turnoActual?: number | null;
  doctorNombre?: string;
  pacienteNombre?: string | null;
  consultorioNombre?: string | null;
  autoAnnounce?: boolean;
}) {
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const ultimoTurnoAnunciadoRef = useRef<number | null>(null);

  // Cargar preferencia del usuario de audio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('saludya_turn_voice_enabled');
      if (stored !== null) {
        setAudioEnabled(stored === 'true');
      }
    }
  }, []);

  const toggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('saludya_turn_voice_enabled', String(next));
      }
      return next;
    });
  }, []);

  const llamarTurno = useCallback(
    async (overrideOptions?: Partial<AnnounceTurnOptions>) => {
      const turno = overrideOptions?.turnoNumero ?? options?.turnoActual;
      if (!turno || turno <= 0) return;

      setIsPlaying(true);
      try {
        await announceTurn({
          turnoNumero: turno,
          doctorNombre: overrideOptions?.doctorNombre ?? options?.doctorNombre,
          pacienteNombre: overrideOptions?.pacienteNombre ?? options?.pacienteNombre,
          consultorioNombre: overrideOptions?.consultorioNombre ?? options?.consultorioNombre,
        });
      } finally {
        setIsPlaying(false);
      }
    },
    [options]
  );

  // Anuncio automático al detectar un nuevo turno en consulta
  useEffect(() => {
    const turno = options?.turnoActual;
    const shouldAnnounce = options?.autoAnnounce ?? true;

    if (shouldAnnounce && audioEnabled && turno && turno > 0 && ultimoTurnoAnunciadoRef.current !== turno) {
      ultimoTurnoAnunciadoRef.current = turno;
      llamarTurno();
    }
  }, [options?.turnoActual, options?.autoAnnounce, audioEnabled, llamarTurno]);

  return {
    audioEnabled,
    isPlaying,
    toggleAudio,
    llamarTurno,
  };
}
