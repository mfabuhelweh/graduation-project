import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Menu, ProgressBar, Text } from "react-native-paper";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/colors";
import { useElections } from "@/hooks/useElections";
import { fetchResults } from "@/services/api";
import { calculatePercentage, canViewResults } from "@/utils/helpers";

export default function ResultsScreen() {
  const params = useLocalSearchParams<{ electionId?: string }>();
  const { elections, isLoading: electionsLoading } = useElections();
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(null);

  const visibleElections = useMemo(
    () => elections.filter((election) => canViewResults(election)),
    [elections]
  );

  useEffect(() => {
    const routeElectionId = Array.isArray(params.electionId)
      ? params.electionId[0]
      : params.electionId;

    if (routeElectionId) {
      setSelectedElectionId(routeElectionId);
      return;
    }

    if (!selectedElectionId && visibleElections[0]?.id) {
      setSelectedElectionId(visibleElections[0].id);
    }
  }, [params.electionId, selectedElectionId, visibleElections]);

  const selectedElection = visibleElections.find(
    (election) => election.id === selectedElectionId
  );

  const resultsQuery = useQuery({
    queryKey: ["results", selectedElectionId],
    enabled: Boolean(selectedElectionId),
    queryFn: () => fetchResults(selectedElectionId as string)
  });

  if (electionsLoading) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingSpinner label="جاري تحميل شاشة النتائج..." />
      </ScreenContainer>
    );
  }

  if (!visibleElections.length) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          title="النتائج غير متاحة بعد"
          description="ستظهر النتائج هنا عندما يسمح الخادم بذلك وفق حالة الانتخاب."
          icon="chart-box-outline"
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppHeader
        title="نتائج الانتخابات"
        subtitle="يعرض التطبيق النتائج فقط عندما يسمح بها منطق الخادم الحالي."
        action={
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Button mode="outlined" onPress={() => setMenuVisible(true)}>
                {selectedElection?.title || "اختر انتخابًا"}
              </Button>
            }
          >
            {visibleElections.map((election) => (
              <Menu.Item
                key={election.id}
                onPress={() => {
                  setSelectedElectionId(election.id);
                  setMenuVisible(false);
                }}
                title={election.title}
              />
            ))}
          </Menu>
        }
      />

      {resultsQuery.isLoading ? (
        <LoadingSpinner label="جاري تحميل النتائج..." />
      ) : resultsQuery.error ? (
        <ErrorMessage
          message={resultsQuery.error.message}
          onRetry={() => resultsQuery.refetch()}
        />
      ) : resultsQuery.data ? (
        <>
          <Card style={styles.summaryCard}>
            <Card.Content style={styles.summaryContent}>
              <View style={styles.summaryBox}>
                <Text variant="bodySmall" style={styles.summaryLabel}>
                  إجمالي الأصوات
                </Text>
                <Text variant="headlineSmall" style={styles.summaryValue}>
                  {resultsQuery.data.totalVotes}
                </Text>
              </View>
              <View style={styles.summaryBox}>
                <Text variant="bodySmall" style={styles.summaryLabel}>
                  عدد الأحزاب
                </Text>
                <Text variant="headlineSmall" style={styles.summaryValue}>
                  {resultsQuery.data.parties.length}
                </Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content style={styles.resultsSection}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                نتائج الأحزاب الوطنية
              </Text>
              {resultsQuery.data.parties.map((party) => {
                const percent = calculatePercentage(
                  party.votes,
                  resultsQuery.data.totalVotes
                );

                return (
                  <View key={party.id} style={styles.resultItem}>
                    <View style={styles.resultHeader}>
                      <Text style={styles.resultValue}>{party.votes} صوت</Text>
                      <Text style={styles.resultTitle}>{party.name}</Text>
                    </View>
                    <ProgressBar
                      progress={percent / 100}
                      color={colors.primary}
                      style={styles.progress}
                    />
                    <Text style={styles.percentText}>{percent}%</Text>
                  </View>
                );
              })}
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content style={styles.resultsSection}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                نتائج القوائم المحلية
              </Text>
              {resultsQuery.data.districtLists.map((list) => {
                const percent = calculatePercentage(
                  list.votes,
                  resultsQuery.data.totalVotes
                );

                return (
                  <View key={list.id} style={styles.resultItem}>
                    <View style={styles.resultHeader}>
                      <Text style={styles.resultValue}>{list.votes} صوت</Text>
                      <View style={styles.resultTextBlock}>
                        <Text style={styles.resultTitle}>{list.name}</Text>
                        <Text style={styles.resultMeta}>{list.districtName}</Text>
                      </View>
                    </View>
                    <ProgressBar
                      progress={percent / 100}
                      color={colors.accent}
                      style={styles.progress}
                    />
                    <Text style={styles.percentText}>{percent}%</Text>
                  </View>
                );
              })}
            </Card.Content>
          </Card>
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.surface
  },
  summaryContent: {
    flexDirection: "row-reverse",
    gap: 12
  },
  summaryBox: {
    flex: 1,
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 14
  },
  summaryLabel: {
    color: colors.textMuted,
    textAlign: "right"
  },
  summaryValue: {
    color: colors.text,
    fontWeight: "800",
    textAlign: "right"
  },
  card: {
    backgroundColor: colors.surface
  },
  resultsSection: {
    gap: 14
  },
  sectionTitle: {
    textAlign: "right",
    color: colors.text,
    fontWeight: "700"
  },
  resultItem: {
    gap: 8
  },
  resultHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  resultTextBlock: {
    flex: 1,
    alignItems: "flex-end"
  },
  resultTitle: {
    color: colors.text,
    fontWeight: "700",
    textAlign: "right"
  },
  resultMeta: {
    color: colors.textMuted,
    textAlign: "right"
  },
  resultValue: {
    color: colors.primaryDark,
    fontWeight: "700"
  },
  progress: {
    height: 8,
    borderRadius: 999
  },
  percentText: {
    color: colors.textMuted,
    textAlign: "left"
  }
});
