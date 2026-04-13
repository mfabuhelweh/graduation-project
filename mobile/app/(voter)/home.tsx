import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Button, Text } from "react-native-paper";
import { AppHeader } from "@/components/AppHeader";
import { ElectionCard } from "@/components/ElectionCard";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/colors";
import { useElections } from "@/hooks/useElections";
import { resolveElectionPhase } from "@/utils/helpers";

export default function HomeScreen() {
  const { elections, activeElections, isLoading, error, refetch, isRefetching } =
    useElections();

  const upcomingElections = useMemo(
    () =>
      elections.filter((election) => resolveElectionPhase(election) === "upcoming"),
    [elections]
  );

  if (isLoading) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingSpinner label="جاري تحميل الانتخابات..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer refreshing={isRefetching} onRefresh={refetch}>
      <AppHeader
        title="الانتخابات المتاحة"
        subtitle="اطلع على الانتخابات النشطة ثم افتح التفاصيل أو ابدأ التصويت."
        action={
          <Button mode="text" onPress={() => refetch()}>
            تحديث
          </Button>
        }
      />

      {error ? <ErrorMessage message={error.message} onRetry={() => refetch()} /> : null}

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          نشطة الآن
        </Text>
        {activeElections.length ? (
          activeElections.map((election) => (
            <ElectionCard
              key={election.id}
              election={election}
              actionLabel="فتح الانتخاب"
              onPress={() =>
                router.push({
                  pathname: "/(voter)/election/[id]",
                  params: { id: election.id }
                })
              }
            />
          ))
        ) : (
          <EmptyState
            title="لا توجد انتخابات نشطة"
            description="عند فتح أي انتخاب جديد سيظهر هنا مباشرة."
            icon="vote-outline"
          />
        )}
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          قادمة قريبًا
        </Text>
        {upcomingElections.length ? (
          upcomingElections.map((election) => (
            <ElectionCard
              key={election.id}
              election={election}
              onPress={() =>
                router.push({
                  pathname: "/(voter)/election/[id]",
                  params: { id: election.id }
                })
              }
            />
          ))
        ) : (
          <View style={styles.placeholder}>
            <Text variant="bodyMedium" style={styles.placeholderText}>
              لا توجد انتخابات مجدولة حاليًا.
            </Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10
  },
  sectionTitle: {
    textAlign: "right",
    color: colors.text,
    fontWeight: "700"
  },
  placeholder: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16
  },
  placeholderText: {
    color: colors.textMuted,
    textAlign: "right"
  }
});
