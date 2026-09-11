/**
 * Utilidad de audio y voz para la cola de espera de citas y turnos (Estilo Banco / Clínica)
 * Genera una campanilla "ding-dong" de aviso mediante Web Audio API
 * y anuncia el turno mediante Web Speech API (speechSynthesis) en español.
 */

// Reproduce la campanilla clásica de dos tonos (Ding-Dong)
export function playBankChime(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        resolve();
        return;
      }

      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // ── Primer Tono: 659.25 Hz (E5 / Mi) ──
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.25, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // ── Segundo Tono: 523.25 Hz (C5 / Do) ──
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, now + 0.22);

      gain2.gain.setValueAtTime(0, now + 0.22);
      gain2.gain.linearRampToValueAtTime(0.3, now + 0.26);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.22);
      osc2.stop(now + 0.85);

      setTimeout(() => {
        try {
          ctx.close();
        } catch {
          // Ignorar si ya cerró
        }
        resolve();
      }, 750);
    } catch {
      resolve();
    }
  });
}

export interface AnnounceTurnOptions {
  turnoNumero: number;
  doctorNombre?: string;
  pacienteNombre?: string | null;
  consultorioNombre?: string | null;
}

// Anuncia el turno por voz sintetizada en español tras hacer sonar la campanilla
export async function announceTurn({
  turnoNumero,
  doctorNombre,
  pacienteNombre,
  consultorioNombre,
}: AnnounceTurnOptions): Promise<void> {
  if (typeof window === 'undefined') return;

  // 1. Sonar campanilla estilo banco
  await playBankChime();

  // 2. Verificar soporte de síntesis de voz
  if (!('speechSynthesis' in window)) return;

  // Cancelar cualquier locución anterior en cola
  window.speechSynthesis.cancel();

  // 3. Construir mensaje con dicción clara
  let mensaje = `Turno del paciente número ${turnoNumero}.`;

  if (pacienteNombre && pacienteNombre.trim().length > 0) {
    mensaje += ` ${pacienteNombre.trim()}.`;
  }

  if (doctorNombre && doctorNombre.trim().length > 0) {
    const docLimpio = doctorNombre.replace(/^(Dr\.|Dra\.|Doctor|Doctora)\s*/i, '');
    mensaje += ` Pasar a consulta con doctor ${docLimpio}.`;
  } else {
    mensaje += ` Pasar a consulta médica.`;
  }

  if (consultorioNombre && consultorioNombre.trim().length > 0) {
    mensaje += ` ${consultorioNombre}.`;
  }

  const utterance = new SpeechSynthesisUtterance(mensaje);
  utterance.lang = 'es-MX'; // Idioma preferido español latinoamericano
  utterance.rate = 0.92; // Velocidad ligeramente pausada para inteligibilidad de intercomunicador
  utterance.pitch = 1.05; // Tono natural y nítido
  utterance.volume = 1.0;

  // 4. Seleccionar la mejor voz en español disponible en el sistema
  const voices = window.speechSynthesis.getVoices();
  const esVoice =
    voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith('es') &&
        (v.name.includes('Natural') ||
          v.name.includes('Google') ||
          v.name.includes('Sabina') ||
          v.name.includes('Helena') ||
          v.name.includes('Paulina') ||
          v.name.includes('Raul') ||
          v.name.includes('Jorge'))
    ) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('es-mx')) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('es'));

  if (esVoice) {
    utterance.voice = esVoice;
  }

  window.speechSynthesis.speak(utterance);
}
