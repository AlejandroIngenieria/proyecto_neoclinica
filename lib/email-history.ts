// Helper utility for managing remembered email and email history in SaludYa / NeoClínica

export const REMEMBER_EMAIL_KEY = 'saludya_remember_email';
export const EMAIL_HISTORY_KEY = 'saludya_email_history';

/**
 * Obtiene una cookie por nombre en el navegador
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Guarda una cookie con expiración en días
 */
export function setCookie(name: string, value: string, days = 30) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Elimina una cookie
 */
export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

/**
 * Obtiene el correo recordado, con fallback dual: Cookie -> LocalStorage
 */
export function getRememberedEmail(): string | null {
  if (typeof window === 'undefined') return null;
  
  // 1. Intentar leer desde Cookie
  const fromCookie = getCookie(REMEMBER_EMAIL_KEY);
  if (fromCookie && fromCookie.trim()) {
    return fromCookie.trim();
  }

  // 2. Fallback a localStorage
  try {
    const fromStorage = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (fromStorage && fromStorage.trim()) {
      return fromStorage.trim();
    }
  } catch {}

  return null;
}

/**
 * Guarda el correo en Cookie y LocalStorage simultáneamente
 */
export function setRememberedEmail(email: string, days = 30) {
  const cleanEmail = email.trim();
  if (!cleanEmail) return;

  setCookie(REMEMBER_EMAIL_KEY, cleanEmail, days);

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(REMEMBER_EMAIL_KEY, cleanEmail);
    }
  } catch {}
}

/**
 * Elimina el correo de la Cookie y de LocalStorage
 */
export function deleteRememberedEmail() {
  deleteCookie(REMEMBER_EMAIL_KEY);

  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
  } catch {}
}

/**
 * Obtiene el historial de correos exitosos usados recientemente (máximo 5)
 */
export function getEmailHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EMAIL_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.includes('@')).slice(0, 5);
    }
  } catch {}
  return [];
}

/**
 * Guarda un correo exitoso en el historial reciente
 */
export function saveEmailToHistory(email: string) {
  const clean = email.trim().toLowerCase();
  if (!clean || !clean.includes('@')) return;

  try {
    const current = getEmailHistory();
    const filtered = current.filter((item) => item.toLowerCase() !== clean);
    const updated = [clean, ...filtered].slice(0, 5);
    localStorage.setItem(EMAIL_HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

/**
 * Elimina un correo específico del historial
 */
export function removeEmailFromHistory(email: string): string[] {
  const clean = email.trim().toLowerCase();
  try {
    const current = getEmailHistory();
    const updated = current.filter((item) => item.toLowerCase() !== clean);
    localStorage.setItem(EMAIL_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}
