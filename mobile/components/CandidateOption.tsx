import { Pressable, StyleSheet, View } from "react-native";
import { Checkbox, RadioButton, Text } from "react-native-paper";
import { colors } from "@/constants/colors";
import type { BallotCandidate } from "@/types";

interface CandidateOptionProps {
  candidate: BallotCandidate;
  selected: boolean;
  selectionType?: "single" | "multiple";
  onPress: () => void;
  disabled?: boolean;
}

export function CandidateOption({
  candidate,
  selected,
  selectionType = "multiple",
  onPress,
  disabled = false
}: CandidateOptionProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        selected ? styles.selected : null,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null
      ]}
    >
      <View style={styles.selector}>
        {selectionType === "single" ? (
          <RadioButton value={candidate.id} status={selected ? "checked" : "unchecked"} />
        ) : (
          <Checkbox status={selected ? "checked" : "unchecked"} />
        )}
      </View>
      <View style={styles.textContent}>
        <Text variant="titleSmall" style={styles.name}>
          {candidate.fullName}
        </Text>
        <Text variant="bodySmall" style={styles.meta}>
          الترتيب {candidate.candidateOrder}
          {candidate.candidateNumber ? ` • الرقم ${candidate.candidateNumber}` : ""}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: "#eefaf8"
  },
  pressed: {
    opacity: 0.85
  },
  disabled: {
    opacity: 0.5
  },
  selector: {
    width: 44,
    alignItems: "center"
  },
  textContent: {
    flex: 1,
    alignItems: "flex-end"
  },
  name: {
    textAlign: "right",
    color: colors.text,
    fontWeight: "700"
  },
  meta: {
    textAlign: "right",
    color: colors.textMuted
  }
});
