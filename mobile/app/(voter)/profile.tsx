import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Divider, Text } from "react-native-paper";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

export default function ProfileScreen() {
  const { logout, user } = useAuth();
  const { data, isLoading, error, refetch } = useProfile();

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  if (isLoading) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingSpinner label="جاري تحميل الملف الشخصي..." />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer scroll={false}>
        <ErrorMessage message={error.message} onRetry={() => refetch()} />
      </ScreenContainer>
    );
  }

  if (!data && !user) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          title="لا توجد بيانات ملف شخصي"
          description="تعذر جلب بيانات الناخب من الخادم الحالي."
        />
      </ScreenContainer>
    );
  }

  const profile = data || {
    role: "voter" as const,
    email: user?.email || "",
    fullName: user?.fullName,
    nationalId: user?.nationalId,
    electionId: user?.electionId
  };

  return (
    <ScreenContainer>
      <AppHeader
        title="حسابي"
        subtitle="بيانات الناخب الحالية مع خيار تسجيل الخروج الآمن."
      />

      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <Text variant="headlineSmall" style={styles.name}>
            {profile.fullName || "ناخب"}
          </Text>
          <Text variant="bodyMedium" style={styles.email}>
            {profile.email}
          </Text>

          <Divider />

          <View style={styles.details}>
            <Text style={styles.item}>الدور: {profile.role}</Text>
            <Text style={styles.item}>الرقم الوطني: {profile.nationalId || "-"}</Text>
            <Text style={styles.item}>معرّف الانتخاب: {profile.electionId || "-"}</Text>
            <Text style={styles.item}>الحالة: {profile.status || "غير محددة"}</Text>
            <Text style={styles.item}>
              هل تم التصويت؟ {profile.hasVoted ? "نعم" : "لا"}
            </Text>
            <Text style={styles.item}>الاتجاه الحالي: واجهة عربية RTL</Text>
          </View>
        </Card.Content>
      </Card>

      <Button mode="contained" onPress={handleLogout} style={styles.logoutButton}>
        تسجيل الخروج
      </Button>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface
  },
  content: {
    gap: 14
  },
  name: {
    textAlign: "right",
    color: colors.text,
    fontWeight: "800"
  },
  email: {
    textAlign: "right",
    color: colors.textMuted
  },
  details: {
    gap: 8,
    alignItems: "flex-end"
  },
  item: {
    color: colors.text,
    textAlign: "right"
  },
  logoutButton: {
    backgroundColor: colors.error
  }
});
