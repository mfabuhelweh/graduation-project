import "react-native-gesture-handler";
import { useEffect, useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getAppColors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { usePreferencesStore } from "@/store/preferencesStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000
    }
  }
});

export default function RootLayout() {
  const { hydrateSession } = useAuth();
  const themeMode = usePreferencesStore((state) => state.theme);
  const hydratePreferences = usePreferencesStore((state) => state.hydratePreferences);

  const colors = useMemo(() => getAppColors(themeMode), [themeMode]);
  const paperTheme = useMemo(
    () => ({
      ...(themeMode === "light" ? MD3LightTheme : MD3DarkTheme),
      colors: {
        ...(themeMode === "light" ? MD3LightTheme.colors : MD3DarkTheme.colors),
        primary: colors.primary,
        primaryContainer: colors.primaryDark,
        secondary: colors.accent,
        surface: colors.surface,
        surfaceVariant: colors.surfaceAlt,
        background: colors.background,
        error: colors.error,
        onSurface: colors.text,
        onBackground: colors.text,
        outline: colors.border,
        onPrimary: "#ffffff",
        onSecondary: "#ffffff"
      }
    }),
    [colors, themeMode]
  );

  useEffect(() => {
    hydrateSession();
    void hydratePreferences();
  }, [hydratePreferences, hydrateSession]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={paperTheme}>
            <StatusBar style={themeMode === "light" ? "dark" : "light"} backgroundColor={colors.background} />
            <Stack screenOptions={{ headerShown: false }} />
          </PaperProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
