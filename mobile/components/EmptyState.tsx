import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppPreferences } from "@/hooks/useAppPreferences";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

export function EmptyState({
  title,
  description,
  icon = "inbox-outline"
}: EmptyStateProps) {
  const { colors } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name={icon} size={40} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppPreferences>["colors"]) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 32,
      alignItems: "center",
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primaryGlow,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 4
    },
    title: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 16,
      textAlign: "center"
    },
    description: {
      color: colors.textSoft,
      textAlign: "center",
      lineHeight: 22,
      fontSize: 13,
      maxWidth: 240
    }
  });
}
