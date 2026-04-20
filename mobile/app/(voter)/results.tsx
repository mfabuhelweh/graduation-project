import { useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ScreenContainer } from "@/components/ScreenContainer";
import type { AppColors } from "@/constants/colors";
import { useAppPreferences } from "@/hooks/useAppPreferences";
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
  styles,
  icon,
  label,
  value,
  color
}: {
  styles: ReturnType<typeof createStyles>;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string | number;
  color: string;
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

type ResultEntityType = "party" | "list" | "candidate";

function getEntitySeed(entity: any, type: ResultEntityType) {
  return encodeURIComponent(
    `${type}-${entity?.id || entity?.candidateNumber || entity?.code || entity?.name || entity?.fullName || "result"}`
  );
}

function getGeneratedEntityImage(entity: any, type: ResultEntityType) {
  const seed = getEntitySeed(entity, type);

  if (type === "candidate") {
    return `https://i.pravatar.cc/160?u=${seed}`;
  }

  return `https://api.dicebear.com/9.x/shapes/png?seed=${seed}&backgroundColor=ffffff,dbeafe,e0f2fe&radius=8`;
}

function getEntityImage(entity: any, type: ResultEntityType) {
  const inferredType = entity?.partyName || entity?.candidateOrder ? "candidate" : type;
  return entity?.photoUrl || entity?.logoUrl || entity?.imageUrl || entity?.avatarUrl || getGeneratedEntityImage(entity, inferredType);
}

function ResultAvatar({
  styles,
  entity,
  type
}: {
  styles: ReturnType<typeof createStyles>;
  entity: any;
  type: ResultEntityType;
}) {
  return (
    <View style={styles.resultAvatar}>
      <Image source={{ uri: getEntityImage(entity, type) }} style={styles.resultAvatarImage} resizeMode="cover" />
    </View>
  );
}

function ResultsBarChart({
  styles,
  rows,
  maxVotes,
  type,
  emptyLabel
}: {
  styles: ReturnType<typeof createStyles>;
  rows: any[];
  maxVotes: number;
  type: "general" | "local";
  emptyLabel: string;
}) {
  const topRows = rows.slice(0, 6);

  if (!topRows.length) {
    return (
      <View style={styles.chartBox}>
        <Text style={styles.emptyCardText}>{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartBox}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
        {topRows.map((row: any) => {
          const percent = Math.max(8, (Number(row.votes || 0) / Math.max(maxVotes, 1)) * 100);
          return (
            <View key={row.id} style={styles.chartColumn}>
              <Text style={styles.chartVotes}>{row.votes || 0}</Text>
              <View style={styles.chartTrack}>
                <View style={[styles.chartFill, { height: `${percent}%` }]} />
              </View>
              <ResultAvatar styles={styles} entity={row} type={type === "general" ? "party" : "list"} />
              <Text numberOfLines={2} style={styles.chartLabel}>{row.name}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const resultsCopy = {
  ar: {
    loadingScreen: "جارٍ تحميل شاشة النتائج...",
    noResultsTitle: "النتائج غير متاحة",
    noResultsDescription: "ستظهر النتائج هنا عندما يتيح النظام عرضها لهذا الحساب.",
    headerTitle: "النتائج النهائية",
    headerSubtitle: "عرض نتائج الأحزاب الوطنية ونتائج القوائم المحلية بصورة منفصلة.",
    chooseElection: "اختر انتخابًا",
    refresh: "تحديث",
    showLocal: "نتائج القوائم المحلية",
    showGeneral: "نتائج الأحزاب الوطنية",
    countedVotes: "الأصوات المفرزة",
    totalVoters: "إجمالي المصوتين",
    registeredVoters: "الناخبون المسجلون",
    votedDistricts: "دوائر فيها تصويت",
    turnout: "نسبة الاقتراع",
    topDistrict: "أعلى دائرة",
    none: "لا يوجد",
    lockedTitle: "نتائج الأحزاب الوطنية غير متاحة بعد",
    lockedText: "ستظهر للناخبين بعد انتهاء التصويت وإغلاق الانتخاب. أثناء هذه المرحلة نعرض فقط الملخص العام للانتخاب.",
    loadingResults: "جارٍ تحميل النتائج...",
    noRows: "لا توجد نتائج متاحة بعد.",
    currentRank: "الترتيب الحالي",
    districtTurnoutTitle: "عدد المصوتين من كل دائرة",
    turnoutLabel: "نسبة مشاركة",
    registeredLabel: "ناخب مسجل",
    noDistrictData: "لا توجد بيانات دوائر متاحة بعد.",
    partyWinnersTitle: "الفائزون التلقائيون للأحزاب",
    rankLabel: "الترتيب",
    noPartyWinners: "لم تُحتسب نتائج المقاعد الحزبية بعد.",
    noElectionResults: "لا توجد نتائج متاحة لهذا الانتخاب بعد."
  },
  en: {
    loadingScreen: "Loading results screen...",
    noResultsTitle: "Results unavailable",
    noResultsDescription: "Results will appear here when the system makes them available for this account.",
    headerTitle: "Final Results",
    headerSubtitle: "National party results and local list results are shown separately.",
    chooseElection: "Choose an election",
    refresh: "Refresh",
    showLocal: "Local List Results",
    showGeneral: "National Party Results",
    countedVotes: "Counted Votes",
    totalVoters: "Total Voters",
    registeredVoters: "Registered Voters",
    votedDistricts: "Districts With Votes",
    turnout: "Turnout",
    topDistrict: "Top District",
    none: "None",
    lockedTitle: "National party results are not available yet",
    lockedText: "They will appear after voting ends and the election closes. During this stage, only the general election summary is shown.",
    loadingResults: "Loading results...",
    noRows: "No results are available yet.",
    currentRank: "Current rank",
    districtTurnoutTitle: "Voters by district",
    turnoutLabel: "turnout",
    registeredLabel: "registered voters",
    noDistrictData: "No district data is available yet.",
    partyWinnersTitle: "Automatic Party Winners",
    rankLabel: "Rank",
    noPartyWinners: "Party seat results have not been calculated yet.",
    noElectionResults: "No results are available for this election yet."
  }
} as const;

export default function ResultsScreen() {
  const { colors, theme, language } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const t = resultsCopy[language];
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

    return [...grouped.values()].sort((left, right) => right.votes - left.votes || left.name.localeCompare(right.name, language === "ar" ? "ar" : "en"));
  }, [language, results]);

  const votedDistrictsCount = districtTurnout.filter((district: any) => Number(district?.votes || 0) > 0).length;
  const topDistrict = districtTurnout[0] || null;
  const turnoutSummary = activeElection?.votersCount
    ? `${((Number(activeElection.ballotsCount || 0) / Number(activeElection.votersCount || 1)) * 100).toFixed(1)}%`
    : "0%";

  if (isLoading) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingSpinner label={t.loadingScreen} />
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
          title={t.noResultsTitle}
          description={t.noResultsDescription}
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
        title={t.headerTitle}
        subtitle={t.headerSubtitle}
      />

      {elections.length > 1 ? (
        <View style={styles.selectorWrapper}>
          <TouchableOpacity style={styles.selectorButton} onPress={() => setSelectorOpen((current) => !current)}>
            <MaterialCommunityIcons name="ballot-outline" size={18} color={colors.primaryLight} />
            <Text style={styles.selectorButtonText}>
              {activeElection?.title || t.chooseElection}
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
          <Text style={styles.refreshButtonText}>{t.refresh}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setView((current) => (current === "general" ? "local" : "general"))}
        >
          <Text style={styles.switchButtonText}>
            {view === "general" ? t.showLocal : t.showGeneral}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          styles={styles}
          icon="vote"
          label={isGeneralLocked ? t.countedVotes : t.totalVoters}
          value={isGeneralLocked ? Number(activeElection?.ballotsCount || 0) : Number(results?.totalVotes || 0)}
          color={colors.info}
        />
        <StatCard
          styles={styles}
          icon="account-group"
          label={isGeneralLocked ? t.registeredVoters : t.votedDistricts}
          value={isGeneralLocked ? Number(activeElection?.votersCount || 0) : votedDistrictsCount}
          color={colors.success}
        />
        <StatCard
          styles={styles}
          icon="percent"
          label={isGeneralLocked ? t.turnout : t.topDistrict}
          value={isGeneralLocked ? turnoutSummary : topDistrict?.name || t.none}
          color={colors.warning}
        />
      </View>

      {isGeneralLocked ? (
        <View style={styles.lockedCard}>
          <View style={styles.lockedHeader}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={colors.warning} />
            <Text style={styles.lockedTitle}>{t.lockedTitle}</Text>
          </View>
          <Text style={styles.lockedText}>
            {t.lockedText}
          </Text>
        </View>
      ) : resultsQuery.isLoading ? (
        <LoadingSpinner label={t.loadingResults} />
      ) : resultsQuery.error ? (
        <ErrorMessage
          message={(resultsQuery.error as Error).message}
          onRetry={() => resultsQuery.refetch()}
        />
      ) : results ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {view === "general" ? t.showGeneral : t.showLocal}
            </Text>

            <ResultsBarChart
              styles={styles}
              rows={rows}
              maxVotes={maxVotes}
              type={view}
              emptyLabel={t.noRows}
            />

            {rows.length ? (
              rows.map((row: any, index: number) => (
                <View key={row.id} style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultVotes}>{row.votes}</Text>
                    <ResultAvatar styles={styles} entity={row} type={view === "general" ? "party" : "list"} />
                    <View style={styles.resultText}>
                      <Text style={styles.resultName}>{row.name}</Text>
                      <Text style={styles.resultMeta}>{row.code || row.districtName || ""}</Text>
                    </View>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${rows.length ? (Number(row.votes || 0) / maxVotes) * 100 : 0}%`,
                          backgroundColor: index % 2 === 0 ? colors.primaryLight : colors.success
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.resultRank}>{t.currentRank}: #{index + 1}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>{t.noRows}</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.districtTurnoutTitle}</Text>
            {districtTurnout.length ? (
              districtTurnout.map((district: any) => (
                <View key={district.id} style={styles.districtCard}>
                  <View style={styles.districtLeft}>
                    <Text style={styles.resultVotes}>{district.votes}</Text>
                    <Text style={styles.districtMeta}>{district.turnout}% {t.turnoutLabel}</Text>
                  </View>
                  <View style={styles.resultText}>
                    <Text style={styles.resultName}>{district.name}</Text>
                    <Text style={styles.resultMeta}>{district.registeredVoters} {t.registeredLabel}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>{t.noDistrictData}</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.partyWinnersTitle}</Text>
            {results.partyWinners?.length ? (
              results.partyWinners.slice(0, 8).map((winner: any) => (
                <View key={winner.id} style={styles.winnerCard}>
                  <WinnerAvatar styles={styles} colors={colors} winner={winner} />
                  <View style={styles.resultText}>
                    <Text style={styles.resultName}>{winner.name}</Text>
                    <Text style={styles.resultMeta}>
                      {winner.partyName} - {t.rankLabel} {winner.candidateOrder}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>{t.noPartyWinners}</Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyCardText}>{t.noElectionResults}</Text>
        </View>
      )}
    </ScreenContainer>
  );
}

function WinnerAvatar({
  styles,
  colors,
  winner
}: {
  styles: ReturnType<typeof createStyles>;
  colors: AppColors;
  winner: any;
}) {
  const imageUrl = getEntityImage(winner, "candidate");

  return (
    <View style={styles.winnerAvatar}>
      <Image source={{ uri: imageUrl }} style={styles.winnerAvatarImage} resizeMode="cover" />
    </View>
  );
}

function createStyles(colors: AppColors, theme: "light" | "dark") {
  const isLight = theme === "light";

  return StyleSheet.create({
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isLight ? 0.06 : 0.14,
    shadowRadius: 16,
    elevation: 4,
    gap: 12
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16,
    textAlign: "right"
  },
  chartBox: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 176,
    justifyContent: "center"
  },
  chartScroll: {
    alignItems: "flex-end",
    gap: 12,
    paddingHorizontal: 2,
    paddingTop: 4
  },
  chartColumn: {
    width: 58,
    alignItems: "center",
    gap: 7
  },
  chartVotes: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 12
  },
  chartTrack: {
    width: 30,
    height: 104,
    borderRadius: 15,
    backgroundColor: colors.surface,
    justifyContent: "flex-end",
    overflow: "hidden"
  },
  chartFill: {
    width: "100%",
    borderRadius: 15,
    backgroundColor: colors.primary
  },
  chartLabel: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
    fontWeight: "700"
  },
  resultAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  resultAvatarImage: {
    width: "100%",
    height: "100%"
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
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10
  },
  winnerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  winnerAvatarImage: {
    width: "100%",
    height: "100%"
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
}
