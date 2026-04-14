import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useAppPreferences } from "@/hooks/useAppPreferences";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function AppHeader({ title, subtitle, action }: AppHeaderProps) {
  const { colors } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.glowBar} />

      <View style={styles.row}>
        {action ? <View style={styles.actionSlot}>{action}</View> : null}
        <View style={styles.textBlock}>
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
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppPreferences>["colors"]) {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border
    },
    glowBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: colors.primary
    },
    row: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12
    },
    textBlock: {
      flex: 1,
      alignItems: "flex-end",
      gap: 4
    },
    title: {
      color: colors.text,
      fontWeight: "800",
      textAlign: "right",
      fontSize: 22
    },
    subtitle: {
      color: colors.textSoft,
      textAlign: "right",
      lineHeight: 22,
      fontSize: 13
    },
    actionSlot: {
      alignSelf: "center"
    }
  });
}
