import { useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/colors";
import { useElections } from "@/hooks/useElections";
import { fetchResults } from "@/services/api";

function toMetric(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toTimestamp(election: any) {
  const candidate = election?.updatedAt || election?.endAt || election?.startAt || election?.createdAt;
  const parsed = candidate ? new Date(candidate).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickResultsElection(elections: any[], preferredElectionId?: string | null) {
  const preferredElection = preferredElectionId
    ? elections.find((election) => election?.id === preferredElectionId)
    : null;

  if (preferredElection) {
    return preferredElection;
  }

  const allowed = new Set(["active", "closed", "archived"]);
  const pool = elections.filter((election) => allowed.has(String(election?.status)));
  const candidates = (pool.length ? pool : elections).filter(Boolean);

  if (!candidates.length) {
    return null;
  }

  return [...candidates].sort((left, right) => {
    const ballotsDiff = toMetric(right?.ballotsCount) - toMetric(left?.ballotsCount);
    if (ballotsDiff !== 0) return ballotsDiff;

    const votersDiff = toMetric(right?.votersCount) - toMetric(left?.votersCount);
    if (votersDiff !== 0) return votersDiff;

    const listsDiff = toMetric(right?.districtListsCount) - toMetric(left?.districtListsCount);
    if (listsDiff !== 0) return listsDiff;

    return toTimestamp(right) - toTimestamp(left);
  })[0];
}

function StatCard({
  icon,
  label,
  value,
  color = colors.info
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}22` }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <View style={styles.statText}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ResultsScreen() {
  const params = useLocalSearchParams<{ electionId?: string }>();
  const preferredElectionId = Array.isArray(params.electionId) ? params.electionId[0] : params.electionId;
  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [view, setView] = useState<"general" | "local">("general");
  const { elections, isLoading, error, refetch, isRefetching } = useElections();

  const activeElection = useMemo(
    () => pickResultsElection(elections, preferredElectionId || selectedElectionId),
    [elections, preferredElectionId, selectedElectionId]
  );

  const isGeneralLocked =
    activeElection?.status === "active" &&
    !activeElection?.allowResultsVisibilityBeforeClose;

  const resultsQuery = useQuery({
    queryKey: ["results", activeElection?.id],
    enabled: Boolean(activeElection?.id) && !isGeneralLocked,
    queryFn: () => fetchResults(activeElection!.id)
  });

  const results = resultsQuery.data as any;
  const rows = view === "general" ? results?.parties || [] : results?.districtLists || [];

  const maxVotes = useMemo(
    () => rows.reduce((highest: number, row: any) => Math.max(highest, Number(row?.votes || 0)), 1),
    [rows]
  );

  const districtTurnout = useMemo(() => {
    const analyticsDistrictTurnout = results?.analytics?.districtTurnout || [];
    if (analyticsDistrictTurnout.length) {
      return analyticsDistrictTurnout;
    }

    const grouped = new Map<string, any>();
    for (const row of results?.districtLists || []) {
      const districtName = String(row?.districtName || "").trim();
      if (!districtName) continue;

      const current = grouped.get(districtName) || {
        id: districtName,
        name: districtName,
        registeredVoters: 0,
        votes: 0,
        turnout: 0
      };

      current.votes += Number(row?.votes || 0);
      grouped.set(districtName, current);
    }

    return [...grouped.values()].sort((left, right) => right.votes - left.votes || left.name.localeCompare(right.name, "ar"));
  }, [results]);

  const votedDistrictsCount = districtTurnout.filter((district: any) => Number(district?.votes || 0) > 0).length;
  const topDistrict = districtTurnout[0] || null;
  const turnoutSummary = activeElection?.votersCount
    ? `${((Number(activeElection.ballotsCount || 0) / Number(activeElection.votersCount || 1)) * 100).toFixed(1)}%`
    : "0%";

  if (isLoading) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingSpinner label="جارٍ تحميل شاشة النتائج..." />
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

  if (!elections.length) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          title="النتائج غير متاحة"
          description="ستظهر النتائج هنا عندما يتيح النظام عرضها لهذا الحساب."
          icon="chart-box-outline"
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      refreshing={isRefetching || resultsQuery.isFetching}
      onRefresh={() => {
        void refetch();
        void resultsQuery.refetch();
      }}
    >
      <AppHeader
        title="النتائج النهائية"
        subtitle="عرض نتائج الأحزاب الوطنية ونتائج القوائم المحلية بصورة منفصلة."
      />

      {elections.length > 1 ? (
        <View style={styles.selectorWrapper}>
          <TouchableOpacity style={styles.selectorButton} onPress={() => setSelectorOpen((current) => !current)}>
            <MaterialCommunityIcons name="ballot-outline" size={18} color={colors.primaryLight} />
            <Text style={styles.selectorButtonText}>
              {activeElection?.title || "اختر انتخابًا"}
            </Text>
            <MaterialCommunityIcons
              name={selectorOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {selectorOpen ? (
            <View style={styles.selectorMenu}>
              {elections.map((election) => (
                <TouchableOpacity
                  key={election.id}
                  style={[
                    styles.selectorItem,
                    election.id === activeElection?.id && styles.selectorItemActive
                  ]}
                  onPress={() => {
                    setSelectedElectionId(election.id);
                    setSelectorOpen(false);
                  }}
                >
                  <Text style={styles.selectorItemText}>{election.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.refreshButton} onPress={() => resultsQuery.refetch()}>
          <MaterialCommunityIcons name="refresh" size={16} color={colors.textSoft} />
          <Text style={styles.refreshButtonText}>تحديث</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setView((current) => (current === "general" ? "local" : "general"))}
        >
          <Text style={styles.switchButtonText}>
            {view === "general" ? "نتائج القوائم المحلية" : "نتائج الأحزاب الوطنية"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          icon="vote"
          label={isGeneralLocked ? "الأصوات المفرزة" : "إجمالي المصوتين"}
          value={isGeneralLocked ? Number(activeElection?.ballotsCount || 0) : Number(results?.totalVotes || 0)}
          color={colors.info}
        />
        <StatCard
          icon="account-group"
          label={isGeneralLocked ? "الناخبون المسجلون" : "دوائر فيها تصويت"}
          value={isGeneralLocked ? Number(activeElection?.votersCount || 0) : votedDistrictsCount}
          color={colors.success}
        />
        <StatCard
          icon="percent"
          label={isGeneralLocked ? "نسبة الاقتراع" : "أعلى دائرة"}
          value={isGeneralLocked ? turnoutSummary : topDistrict?.name || "لا يوجد"}
          color={colors.warning}
        />
      </View>

      {isGeneralLocked ? (
        <View style={styles.lockedCard}>
          <View style={styles.lockedHeader}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={colors.warning} />
            <Text style={styles.lockedTitle}>نتائج الأحزاب الوطنية غير متاحة بعد</Text>
          </View>
          <Text style={styles.lockedText}>
            ستظهر للناخبين بعد انتهاء التصويت وإغلاق الانتخاب. أثناء هذه المرحلة نعرض فقط الملخص العام للانتخاب.
          </Text>
        </View>
      ) : resultsQuery.isLoading ? (
        <LoadingSpinner label="جارٍ تحميل النتائج..." />
      ) : resultsQuery.error ? (
        <ErrorMessage
          message={(resultsQuery.error as Error).message}
          onRetry={() => resultsQuery.refetch()}
        />
      ) : results ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {view === "general" ? "نتائج الأحزاب الوطنية" : "نتائج القوائم المحلية"}
            </Text>

            {rows.length ? (
              rows.map((row: any, index: number) => (
                <View key={row.id} style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultVotes}>{row.votes}</Text>
                    <View style={styles.resultText}>
                      <Text style={styles.resultName}>{row.name}</Text>
                      <Text style={styles.resultMeta}>{row.code || row.districtName || ""}</Text>
                    </View>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${rows.length ? (Number(row.votes || 0) / maxVotes) * 100 : 0}%` }
                      ]}
                    />
                  </View>
                  <Text style={styles.resultRank}>الترتيب الحالي: #{index + 1}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>لا توجد نتائج متاحة بعد.</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>عدد المصوتين من كل دائرة</Text>
            {districtTurnout.length ? (
              districtTurnout.map((district: any) => (
                <View key={district.id} style={styles.districtCard}>
                  <View style={styles.districtLeft}>
                    <Text style={styles.resultVotes}>{district.votes}</Text>
                    <Text style={styles.districtMeta}>{district.turnout}% نسبة مشاركة</Text>
                  </View>
                  <View style={styles.resultText}>
                    <Text style={styles.resultName}>{district.name}</Text>
                    <Text style={styles.resultMeta}>{district.registeredVoters} ناخب مسجل</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>لا توجد بيانات دوائر متاحة بعد.</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الفائزون التلقائيون للأحزاب</Text>
            {results.partyWinners?.length ? (
              results.partyWinners.slice(0, 8).map((winner: any) => (
                <View key={winner.id} style={styles.winnerCard}>
                  <Text style={styles.resultName}>{winner.name}</Text>
                  <Text style={styles.resultMeta}>
                    {winner.partyName} - الترتيب {winner.candidateOrder}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>لم تُحتسب نتائج المقاعد الحزبية بعد.</Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyCardText}>لا توجد نتائج متاحة لهذا الانتخاب بعد.</Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  selectorWrapper: {
    gap: 6
  },
  selectorButton: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8
  },
  selectorButtonText: {
    flex: 1,
    textAlign: "right",
    color: colors.text,
    fontWeight: "700"
  },
  selectorMenu: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden"
  },
  selectorItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  selectorItemActive: {
    backgroundColor: colors.primaryGlow
  },
  selectorItemText: {
    color: colors.text,
    textAlign: "right"
  },
  actionsRow: {
    flexDirection: "row-reverse",
    gap: 10
  },
  refreshButton: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8
  },
  refreshButtonText: {
    color: colors.textSoft,
    fontWeight: "700"
  },
  switchButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16
  },
  switchButtonText: {
    color: "#fff",
    fontWeight: "800"
  },
  statsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10
  },
  statCard: {
    width: "47%",
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center"
  },
  statText: {
    flex: 1,
    alignItems: "flex-end"
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "right"
  },
  statValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "right"
  },
  lockedCard: {
    backgroundColor: colors.warningBg,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.warning + "44",
    gap: 10
  },
  lockedHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8
  },
  lockedTitle: {
    color: colors.warning,
    fontWeight: "800",
    fontSize: 16,
    textAlign: "right",
    flex: 1
  },
  lockedText: {
    color: colors.warning,
    lineHeight: 20,
    textAlign: "right"
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16,
    textAlign: "right"
  },
  resultCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8
  },
  resultHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10
  },
  resultVotes: {
    color: colors.info,
    fontWeight: "900",
    fontSize: 18
  },
  resultText: {
    flex: 1,
    alignItems: "flex-end"
  },
  resultName: {
    color: colors.text,
    fontWeight: "800",
    textAlign: "right"
  },
  resultMeta: {
    color: colors.textMuted,
    textAlign: "right",
    fontSize: 12
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden"
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.info
  },
  resultRank: {
    color: colors.textMuted,
    textAlign: "left",
    fontSize: 11
  },
  districtCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10
  },
  districtLeft: {
    alignItems: "flex-start"
  },
  districtMeta: {
    color: colors.textMuted,
    fontSize: 11
  },
  winnerCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4
  },
  emptyCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border
  },
  emptyCardText: {
    color: colors.textMuted,
    textAlign: "right"
  }
});
