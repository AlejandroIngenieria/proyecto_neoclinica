import { create } from 'zustand';

// ─── UI Store ────────────────────────────────────────────────────────────────
// Estado global de UI: modales, sidebars, preferencias visuales.
// NO incluye datos del servidor (eso es React Query) ni filtros (eso es URL params).

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

function loadDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('neoclinica:dark-mode') === '1';
  } catch {
    return false;
  }
}

function saveDarkMode(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('neoclinica:dark-mode', enabled ? '1' : '0');
  } catch {
    // ignore
  }
}

function applyDarkClass(enabled: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', enabled);
}

export const useUIStore = create<UIState>((set) => {
  // Initialize dark mode from localStorage on creation
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
