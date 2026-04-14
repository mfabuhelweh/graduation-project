import { Redirect } from "expo-router";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useAuth } from "@/hooks/useAuth";

export default function IndexScreen() {
  const { isHydrated, isHydrating, isAuthenticated } = useAuth();

  if (!isHydrated || isHydrating) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingSpinner label="جاري تجهيز التطبيق..." />
      </ScreenContainer>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(voter)/home" />;
}
