import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Button, Card, Chip, Divider, Text } from "react-native-paper";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ScreenContainer } from "@/components/ScreenContainer";
import type { AppColors } from "@/constants/colors";
import { useAppPreferences } from "@/hooks/useAppPreferences";
import { useElectionDetails } from "@/hooks/useElectionDetails";
import {
  canViewResults,
  formatDate,
  getElectionStatusLabel
} from "@/utils/helpers";

export default function ElectionDetailsScreen() {
  const { colors, language } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isArabic = language === "ar";
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
          title={isArabic ? "تعذر تحميل الانتخاب" : "Could not load election"}
          description={isArabic ? "معرّف الانتخاب غير موجود في الرابط الحالي." : "The election ID is missing from the current link."}
        />
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingSpinner label={isArabic ? "جاري تحميل تفاصيل الانتخاب..." : "Loading election details..."} />
      </ScreenContainer>
    );
  }

  if (error || !data) {
    return (
      <ScreenContainer scroll={false}>
        <ErrorMessage
          message={error?.message || (isArabic ? "تعذر تحميل بيانات الانتخاب." : "Could not load election data.")}
          onRetry={() => refetch()}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppHeader
        title={data.election.title}
        subtitle={isArabic ? "تفاصيل الانتخاب، الأهلية، والخيارات المتاحة لك كناخب." : "Election details, eligibility, and the options available to you as a voter."}
      />

      <Card style={styles.card}>
        <Card.Content style={styles.sectionContent}>
          <View style={styles.statusRow}>
            <Chip>{getElectionStatusLabel(data.election, language)}</Chip>
            <Text variant="bodyLarge" style={styles.description}>
              {data.election.description || (isArabic ? "لا يوجد وصف إضافي لهذا الانتخاب." : "No additional description is available for this election.")}
            </Text>
          </View>

          <Divider />

          <View style={styles.metaList}>
            <Text style={styles.metaItem}>{isArabic ? "يبدأ" : "Starts"}: {formatDate(data.election.startAt, language)}</Text>
            <Text style={styles.metaItem}>{isArabic ? "ينتهي" : "Ends"}: {formatDate(data.election.endAt, language)}</Text>
            <Text style={styles.metaItem}>
              {isArabic ? "الأحزاب" : "Parties"}: {data.ballot?.parties.length || data.election.partiesCount || 0}
            </Text>
            <Text style={styles.metaItem}>
              {isArabic ? "القوائم المحلية" : "Local lists"}:{" "}
              {data.ballot?.districtLists.length || data.election.districtListsCount || 0}
            </Text>
            <Text style={styles.metaItem}>{isArabic ? "عدد المرشحين المعروضين" : "Displayed candidates"}: {candidateCount}</Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content style={styles.sectionContent}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {isArabic ? "حالة الناخب" : "Voter Status"}
          </Text>
          <Text style={styles.metaItem}>
            {isArabic ? "الاسم" : "Name"}: {data.profile?.fullName || (isArabic ? "غير متوفر" : "Unavailable")}
          </Text>
          <Text style={styles.metaItem}>
            {isArabic ? "الرقم الوطني" : "National ID"}: {data.profile?.nationalId || (isArabic ? "غير متوفر" : "Unavailable")}
          </Text>
          <Text style={styles.metaItem}>
            {isArabic ? "هل تم التصويت؟" : "Already voted?"} {data.hasVoted ? (isArabic ? "نعم" : "Yes") : (isArabic ? "لا" : "No")}
          </Text>
          <Text style={styles.metaItem}>
            {isArabic ? "هذا هو انتخابك المخصص؟" : "Assigned to you?"} {data.isAssignedElection ? (isArabic ? "نعم" : "Yes") : (isArabic ? "لا" : "No")}
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
            {isArabic ? "عرض النتائج" : "View Results"}
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
          {data.canVote ? (isArabic ? "الانتقال إلى التصويت" : "Go to Voting") : (isArabic ? "التصويت غير متاح" : "Voting Unavailable")}
        </Button>
      </View>
    </ScreenContainer>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1
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
}
