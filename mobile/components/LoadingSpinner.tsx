import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { colors } from "@/constants/colors";

interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({
  label = "جاري التحميل..."
}: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator animating color={colors.primary} size="large" />
      <Text variant="bodyMedium" style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  label: {
    marginTop: 12,
    color: colors.textMuted,
    textAlign: "center"
  }
});
