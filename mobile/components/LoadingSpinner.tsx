import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { useAppPreferences } from "@/hooks/useAppPreferences";

interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label }: LoadingSpinnerProps) {
  const { colors } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color={colors.primary} />
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppPreferences>["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 32,
      alignItems: "center",
      gap: 16,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 180
    },
    label: {
      color: colors.textSoft,
      textAlign: "center",
      fontSize: 14,
      lineHeight: 20
    }
  });
}
