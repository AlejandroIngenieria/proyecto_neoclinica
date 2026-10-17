import { create } from 'zustand';

// ─── UI Store ────────────────────────────────────────────────────────────────
// Estado global de UI: modales, sidebars, preferencias visuales.
// Única fuente de la verdad para el tema visual (Modo Claro / Modo Oscuro).

type UIState = {
  /** Modal de filtros avanzados del dashboard */
  isFiltersOpen: boolean;
  openFilters: () => void;
  closeFilters: () => void;
  toggleFilters: () => void;

  /** Modo oscuro */
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
};

const THEME_KEY = 'theme';
const LEGACY_KEY = 'neoclinica:dark-mode';

function loadDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const themeVal = window.localStorage.getItem(THEME_KEY);
    if (themeVal === 'dark') return true;
    if (themeVal === 'light') return false;

    // Migración de clave legacy únicamente si fue explícitamente activada
    const legacyVal = window.localStorage.getItem(LEGACY_KEY);
    if (legacyVal === '1') {
      window.localStorage.setItem(THEME_KEY, 'dark');
      return true;
    }

    // Por defecto estricto: SIEMPRE FALSO (Modo Claro) si el usuario no lo activó
    return false;
  } catch {
    return false;
  }
}

function saveDarkMode(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_KEY, enabled ? 'dark' : 'light');
    window.localStorage.setItem(LEGACY_KEY, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}

function applyDarkClass(enabled: boolean) {
  if (typeof document === 'undefined') return;
  if (enabled) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const useUIStore = create<UIState>((set) => {
  // Initialize dark mode from localStorage on creation (defaults to light mode)
  const initial = loadDarkMode();
  // Apply immediately if running in browser
  applyDarkClass(initial);

  return {
    isFiltersOpen: false,
    openFilters: () => set({ isFiltersOpen: true }),
    closeFilters: () => set({ isFiltersOpen: false }),
    toggleFilters: () => set((state) => ({ isFiltersOpen: !state.isFiltersOpen })),

    isDarkMode: initial,
    toggleDarkMode: () =>
      set((state) => {
        const next = !state.isDarkMode;
        saveDarkMode(next);
        applyDarkClass(next);
        return { isDarkMode: next };
      }),
    setDarkMode: (enabled: boolean) =>
      set(() => {
        saveDarkMode(enabled);
        applyDarkClass(enabled);
        return { isDarkMode: enabled };
      }),
  };
});
