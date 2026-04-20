import { create } from "zustand";
import type { AppThemeMode } from "@/constants/colors";
import { loadAppPreferences, saveAppPreferences } from "@/services/storage";

type AppLanguage = "ar" | "en";

interface PreferencesState {
  language: AppLanguage;
  theme: AppThemeMode;
  isHydrated: boolean;
  hydratePreferences: () => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setTheme: (theme: AppThemeMode) => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  language: "ar",
  theme: "light",
  isHydrated: false,
  hydratePreferences: async () => {
    const preferences = await loadAppPreferences();
    set({
      language: preferences.language,
      theme: preferences.theme,
      isHydrated: true
    });
  },
  setLanguage: async (language) => {
    const next = { language, theme: get().theme };
    set({ language });
    await saveAppPreferences(next);
  },
  setTheme: async (theme) => {
    const next = { language: get().language, theme };
    set({ theme });
    await saveAppPreferences(next);
  }
}));
