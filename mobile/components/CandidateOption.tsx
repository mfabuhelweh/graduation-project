import { Image, Pressable, StyleSheet, View } from "react-native";
import { Checkbox, RadioButton, Text } from "react-native-paper";
import { useMemo } from "react";
import { useAppPreferences } from "@/hooks/useAppPreferences";
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
  const { colors } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const imageUrl = candidate.photoUrl || candidate.imageUrl || getCandidateImage(candidate);

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
      <View style={styles.avatar}>
        <Image source={{ uri: imageUrl }} style={styles.avatarImage} resizeMode="cover" />
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

function getCandidateImage(candidate: BallotCandidate) {
  const seed = encodeURIComponent(
    `candidate-${candidate.id || candidate.candidateNumber || candidate.fullName || "candidate"}`
  );
  return `https://i.pravatar.cc/160?u=${seed}`;
}

function createStyles(colors: ReturnType<typeof useAppPreferences>["colors"]) {
  return StyleSheet.create({
  container: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3
  },
  selected: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.primaryGlow
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
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  avatarImage: {
    width: "100%",
    height: "100%"
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
}
