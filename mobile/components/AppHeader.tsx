import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { colors } from "@/constants/colors";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function AppHeader({ title, subtitle, action }: AppHeaderProps) {
  return (
    <View style={styles.wrapper}>
      {action ? <View style={styles.action}>{action}</View> : null}
      <View style={styles.texts}>
        <Text variant="headlineSmall" style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodyMedium" style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  action: {
    flexShrink: 0
  },
  texts: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4
  },
  title: {
    color: colors.text,
    fontWeight: "800",
    textAlign: "right"
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: "right"
  }
});
