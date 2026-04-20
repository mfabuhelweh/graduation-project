import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { useAppPreferences } from "@/hooks/useAppPreferences";
import type { Election } from "@/types";
import {
  formatDate,
  getElectionStatusLabel,
  resolveElectionPhase
} from "@/utils/helpers";

interface ElectionCardProps {
  election: Election;
  onPress: () => void;
  actionLabel?: string;
}

export function ElectionCard({
  election,
  onPress,
  actionLabel
}: ElectionCardProps) {
  const { colors, theme, language } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const phase = resolveElectionPhase(election);
  const isArabic = language === "ar";
  const resolvedActionLabel = actionLabel || (isArabic ? "عرض التفاصيل" : "View details");

  const phaseConfig = {
    active: {
      color: colors.success,
      bg: colors.successBg,
      icon: "vote" as const,
      label: getElectionStatusLabel(election, language)
    },
    upcoming: {
      color: colors.warning,
      bg: colors.warningBg,
      icon: "clock-outline" as const,
      label: getElectionStatusLabel(election, language)
    },
    ended: {
      color: colors.textMuted,
      bg: colors.surfaceAlt,
      icon: "check-circle-outline" as const,
      label: getElectionStatusLabel(election, language)
    }
  };

  const cfg =
    phaseConfig[phase as keyof typeof phaseConfig] || phaseConfig.ended;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* شريط الحالة العلوي */}
      <View style={[styles.statusBar, { backgroundColor: cfg.color }]} />

      <View style={styles.body}>
        {/* رأس البطاقة */}
        <View style={styles.header}>
          {/* شارة الحالة */}
          <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <MaterialCommunityIcons name={cfg.icon} size={13} color={cfg.color} />
            <Text style={[styles.badgeText, { color: cfg.color }]}>
              {cfg.label}
            </Text>
          </View>

          {/* العنوان */}
          <Text style={styles.title} numberOfLines={2}>
            {election.title}
          </Text>
        </View>

        {/* الوصف */}
        {election.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {election.description}
          </Text>
        ) : null}

        {/* التواريخ */}
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaValue}>{formatDate(election.endAt, language)}</Text>
            <Text style={styles.metaKey}>{isArabic ? "انتهاء" : "Ends"}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaValue}>{formatDate(election.startAt, language)}</Text>
            <Text style={styles.metaKey}>{isArabic ? "بداية" : "Starts"}</Text>
          </View>
        </View>

        {/* زر الإجراء */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            phase === "active"
              ? styles.actionButtonActive
              : styles.actionButtonDefault
          ]}
          onPress={onPress}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name={phase === "active" ? "vote-outline" : "arrow-left"}
            size={16}
            color={phase === "active" ? "#fff" : colors.primary}
          />
          <Text
            style={[
              styles.actionLabel,
              { color: phase === "active" ? "#fff" : colors.primary }
            ]}
          >
            {resolvedActionLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors: ReturnType<typeof useAppPreferences>["colors"], theme: "light" | "dark") {
  const isLight = theme === "light";

  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: isLight ? 0.09 : 0.18,
    shadowRadius: 20,
    elevation: 6
  },
  statusBar: {
    height: 3
  },
  body: {
    padding: 18,
    gap: 14
  },
  header: {
    alignItems: "flex-end",
    gap: 10
  },
  badge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-end"
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700"
  },
  title: {
    color: colors.text,
    fontWeight: "800",
    textAlign: "right",
    fontSize: 17,
    lineHeight: 26
  },
  description: {
    color: colors.textSoft,
    textAlign: "right",
    lineHeight: 20,
    fontSize: 13
  },
  meta: {
    flexDirection: "row-reverse",
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    justifyContent: "center",
    gap: 16
  },
  metaItem: {
    alignItems: "center",
    gap: 3,
    flex: 1
  },
  metaDivider: {
    width: 1,
    backgroundColor: colors.border
  },
  metaKey: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600"
  },
  metaValue: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center"
  },
  actionButton: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16
  },
  actionButtonActive: {
    backgroundColor: colors.primary
  },
  actionButtonDefault: {
    backgroundColor: colors.primaryGlow,
    borderWidth: 1,
    borderColor: colors.primary + "50"
  },
  actionLabel: {
    fontWeight: "700",
    fontSize: 14
  }
  });
}
