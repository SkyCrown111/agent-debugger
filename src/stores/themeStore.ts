import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeState {
  mode: ThemeMode;
  language: 'en' | 'zh';
  setMode: (mode: ThemeMode) => void;
  setLanguage: (lang: 'en' | 'zh') => void;
  getEffectiveTheme: () => 'dark' | 'light';
}

// Detect system theme preference
const getSystemTheme = (): 'dark' | 'light' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      language: 'zh',
      setMode: (mode) => {
        set({ mode });
        // Apply theme to document
        const effective = mode === 'system' ? getSystemTheme() : mode;
        document.documentElement.setAttribute('data-theme', effective);
      },
      setLanguage: (language) => {
        set({ language });
        localStorage.setItem('hermes-language', language);
      },
      getEffectiveTheme: () => {
        const { mode } = get();
        return mode === 'system' ? getSystemTheme() : mode;
      },
    }),
    {
      name: 'hermes-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const effective = state.mode === 'system' ? getSystemTheme() : state.mode;
          document.documentElement.setAttribute('data-theme', effective);
        }
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const state = useThemeStore.getState();
    if (state.mode === 'system') {
      const effective = getSystemTheme();
      document.documentElement.setAttribute('data-theme', effective);
    }
  });
}
