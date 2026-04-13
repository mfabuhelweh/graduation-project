import { StyleSheet, View } from "react-native";
import { Button, Card, Chip, Divider, Text } from "react-native-paper";
import { colors } from "@/constants/colors";
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
  actionLabel = "عرض التفاصيل"
}: ElectionCardProps) {
  const phase = resolveElectionPhase(election);
  const chipMode =
    phase === "active"
      ? "flat"
      : phase === "ended"
        ? "outlined"
        : "flat";

  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content style={styles.content}>
        <View style={styles.headerRow}>
          <Chip
            compact
            mode={chipMode}
            textStyle={styles.chipText}
            style={[
              styles.chip,
              phase === "active"
                ? styles.activeChip
                : phase === "ended"
                  ? styles.endedChip
                  : styles.upcomingChip
            ]}
          >
            {getElectionStatusLabel(election)}
          </Chip>
          <View style={styles.titleGroup}>
            <Text variant="titleMedium" style={styles.title}>
              {election.title}
            </Text>
            {election.description ? (
              <Text numberOfLines={2} variant="bodySmall" style={styles.description}>
                {election.description}
              </Text>
            ) : null}
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.metaSection}>
          <Text variant="bodySmall" style={styles.metaLabel}>
            يبدأ: {formatDate(election.startAt)}
          </Text>
          <Text variant="bodySmall" style={styles.metaLabel}>
            ينتهي: {formatDate(election.endAt)}
          </Text>
        </View>

        <Button mode="contained" onPress={onPress} style={styles.button}>
          {actionLabel}
        </Button>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface
  },
  content: {
    gap: 12
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 12
  },
  titleGroup: {
    flex: 1,
    alignItems: "flex-end",
    gap: 6
  },
  title: {
    textAlign: "right",
    color: colors.text,
    fontWeight: "700"
  },
  description: {
    textAlign: "right",
    color: colors.textMuted,
    lineHeight: 20
  },
  chip: {
    alignSelf: "flex-start"
  },
  chipText: {
    fontSize: 12
  },
  activeChip: {
    backgroundColor: "#dff4f1"
  },
  endedChip: {
    borderColor: "#cbd5e1"
  },
  upcomingChip: {
    backgroundColor: "#fff7ed"
  },
  divider: {
    backgroundColor: colors.border
  },
  metaSection: {
    alignItems: "flex-end",
    gap: 4
  },
  metaLabel: {
    textAlign: "right",
    color: colors.textMuted
  },
  button: {
    marginTop: 4,
    backgroundColor: colors.primary
  }
});
