import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useAppPreferences } from "@/hooks/useAppPreferences";
import type { Election } from "@/types";

interface ElectionCountdownCardProps {
  election: Pick<Election, "title" | "endAt" | "endDate"> | null;
}

function getRemainingTime(target?: string | null) {
  if (!target) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const total = Math.max(new Date(target).getTime() - Date.now(), 0);

  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60)
  };
}

export function ElectionCountdownCard({ election }: ElectionCountdownCardProps) {
  const { language } = useAppPreferences();
  const styles = useMemo(() => createStyles(), []);
  const endAt = election?.endAt || election?.endDate || "";
  const [remaining, setRemaining] = useState(() => getRemainingTime(endAt));

  useEffect(() => {
    setRemaining(getRemainingTime(endAt));

    if (!endAt) {
      return;
    }

    const timer = setInterval(() => {
      setRemaining(getRemainingTime(endAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [endAt]);

  if (!election || !endAt) {
    return null;
  }

  const copy =
    language === "ar"
      ? { ended: "انتهى وقت الانتخابات", units: ["Days", "Hours", "Minutes", "Seconds"] }
      : { ended: "The election has ended", units: ["Days", "Hours", "Minutes", "Seconds"] };

  const blocks = [
    { label: copy.units[0], value: remaining.days },
    { label: copy.units[1], value: remaining.hours },
    { label: copy.units[2], value: remaining.minutes },
    { label: copy.units[3], value: remaining.seconds }
  ];

  return (
    <View style={styles.banner}>
      {remaining.total > 0 ? (
        <View style={styles.timerRow}>
          {blocks.map((block) => (
            <View key={block.label} style={styles.unit}>
              <Text style={styles.unitLabel} numberOfLines={1}>
                {block.label}
              </Text>
              <View style={styles.valueBox}>
                <Text style={styles.valueText}>{String(block.value).padStart(2, "0")}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.endedBox}>
          <Text style={styles.endedText}>{copy.ended}</Text>
        </View>
      )}
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    banner: {
      backgroundColor: "#FFF6DB",
      borderRadius: 6,
      borderWidth: 1,
      borderColor: "#E5C977",
      paddingHorizontal: 8,
      paddingVertical: 7
    },
    timerRow: {
      flexDirection: "row",
      gap: 6,
      alignItems: "flex-start",
      justifyContent: "space-between"
    },
    unit: {
      flex: 1,
      alignItems: "center",
      gap: 4
    },
    unitLabel: {
      color: "#8A6500",
      fontSize: 8,
      fontWeight: "900",
      textAlign: "center"
    },
    valueBox: {
      width: "100%",
      minHeight: 40,
      borderRadius: 6,
      backgroundColor: "#1E1E1E",
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.18)",
      alignItems: "center",
      justifyContent: "center"
    },
    valueText: {
      color: "#F8FAFC",
      fontSize: 21,
      fontWeight: "900",
      letterSpacing: 0.5
    },
    endedBox: {
      minHeight: 40,
      borderRadius: 6,
      backgroundColor: "#1E1E1E",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10
    },
    endedText: {
      color: "#F8FAFC",
      fontSize: 12,
      fontWeight: "900",
      textAlign: "center"
    }
  });
}
