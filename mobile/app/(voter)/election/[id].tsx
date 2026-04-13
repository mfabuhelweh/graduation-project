import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Button, Card, Chip, Divider, Text } from "react-native-paper";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/colors";
import { useElectionDetails } from "@/hooks/useElectionDetails";
import {
  canViewResults,
  formatDate,
  getElectionStatusLabel
} from "@/utils/helpers";

export default function ElectionDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const electionId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data, isLoading, error, refetch } = useElectionDetails(electionId || "");

  const candidateCount = useMemo(() => {
    if (!data?.ballot) return 0;
    return (
      data.ballot.parties.reduce(
        (total, party) => total + party.candidates.length,
        0
      ) +
      data.ballot.districtLists.reduce(
        (total, list) => total + list.candidates.length,
        0
      )
    );
  }, [data?.ballot]);

  if (!electionId) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          title="تعذر تحميل الانتخاب"
          description="معرّف الانتخاب غير موجود في الرابط الحالي."
        />
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingSpinner label="جاري تحميل تفاصيل الانتخاب..." />
      </ScreenContainer>
    );
  }

  if (error || !data) {
    return (
      <ScreenContainer scroll={false}>
        <ErrorMessage
          message={error?.message || "تعذر تحميل بيانات الانتخاب."}
          onRetry={() => refetch()}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppHeader
        title={data.election.title}
        subtitle="تفاصيل الانتخاب، الأهلية، والخيارات المتاحة لك كناخب."
      />

      <Card style={styles.card}>
        <Card.Content style={styles.sectionContent}>
          <View style={styles.statusRow}>
            <Chip>{getElectionStatusLabel(data.election)}</Chip>
            <Text variant="bodyLarge" style={styles.description}>
              {data.election.description || "لا يوجد وصف إضافي لهذا الانتخاب."}
            </Text>
          </View>

          <Divider />

          <View style={styles.metaList}>
            <Text style={styles.metaItem}>يبدأ: {formatDate(data.election.startAt)}</Text>
            <Text style={styles.metaItem}>ينتهي: {formatDate(data.election.endAt)}</Text>
            <Text style={styles.metaItem}>
              الأحزاب: {data.ballot?.parties.length || data.election.partiesCount || 0}
            </Text>
            <Text style={styles.metaItem}>
              القوائم المحلية:{" "}
              {data.ballot?.districtLists.length || data.election.districtListsCount || 0}
            </Text>
            <Text style={styles.metaItem}>عدد المرشحين المعروضين: {candidateCount}</Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content style={styles.sectionContent}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            حالة الناخب
          </Text>
          <Text style={styles.metaItem}>
            الاسم: {data.profile?.fullName || "غير متوفر"}
          </Text>
          <Text style={styles.metaItem}>
            الرقم الوطني: {data.profile?.nationalId || "غير متوفر"}
          </Text>
          <Text style={styles.metaItem}>
            هل تم التصويت؟ {data.hasVoted ? "نعم" : "لا"}
          </Text>
          <Text style={styles.metaItem}>
            هذا هو انتخابك المخصص؟ {data.isAssignedElection ? "نعم" : "لا"}
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        {canViewResults(data.election) ? (
          <Button
            mode="outlined"
            onPress={() =>
              router.push({
                pathname: "/(voter)/results",
                params: { electionId }
              })
            }
          >
            عرض النتائج
          </Button>
        ) : null}

        <Button
          mode="contained"
          disabled={!data.canVote}
          onPress={() =>
            router.push({
              pathname: "/(voter)/vote/[id]",
              params: { id: electionId }
            })
          }
          style={styles.voteButton}
        >
          {data.canVote ? "الانتقال إلى التصويت" : "التصويت غير متاح"}
        </Button>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface
  },
  sectionContent: {
    gap: 12
  },
  statusRow: {
    alignItems: "flex-end",
    gap: 12
  },
  description: {
    textAlign: "right",
    color: colors.text
  },
  metaList: {
    gap: 8,
    alignItems: "flex-end"
  },
  metaItem: {
    color: colors.textMuted,
    textAlign: "right"
  },
  sectionTitle: {
    textAlign: "right",
    color: colors.text,
    fontWeight: "700"
  },
  actions: {
    gap: 10
  },
  voteButton: {
    backgroundColor: colors.primary
  }
});
