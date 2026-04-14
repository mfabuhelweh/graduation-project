import { useMemo } from "react";
import { getAppColors } from "@/constants/colors";
import { usePreferencesStore } from "@/store/preferencesStore";

export function useAppPreferences() {
  const language = usePreferencesStore((state) => state.language);
  const theme = usePreferencesStore((state) => state.theme);

  const palette = useMemo(() => getAppColors(theme), [theme]);

  return {
    language,
    theme,
    colors: palette
  };
}
