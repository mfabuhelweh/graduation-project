import { Redirect, Stack } from "expo-router";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useAppPreferences } from "@/hooks/useAppPreferences";
import { useAuth } from "@/hooks/useAuth";

export default function PublicLayout() {
  const { isHydrated, isHydrating, isAuthenticated } = useAuth();
  const { language } = useAppPreferences();

  if (!isHydrated || isHydrating) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingSpinner label={language === "ar" ? "جاري تجهيز التطبيق..." : "Preparing the app..."} />
      </ScreenContainer>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(voter)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
