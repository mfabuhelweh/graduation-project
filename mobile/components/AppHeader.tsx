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
      <View pointerEvents="none" style={styles.tatreezBand}>
        <View style={styles.tatreezDiamond} />
        <View style={styles.tatreezDiamondAlt} />
        <View style={styles.tatreezDiamond} />
        <View style={styles.tatreezDiamondAlt} />
        <View style={styles.tatreezDiamond} />
      </View>
      <View pointerEvents="none" style={styles.parliamentMark}>
        <View style={styles.dome} />
        <View style={styles.columns}>
          <View style={styles.column} />
          <View style={styles.column} />
          <View style={styles.column} />
        </View>
      </View>

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
      borderRadius: 8,
      padding: 20,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.24,
      shadowRadius: 24,
      elevation: 8
    },
    glowBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: colors.accentLight
    },
    tatreezBand: {
      position: "absolute",
      top: 13,
      left: 18,
      width: 96,
      height: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      opacity: 0.22
    },
    tatreezDiamond: {
      width: 8,
      height: 8,
      borderWidth: 1.5,
      borderColor: colors.primary,
      transform: [{ rotate: "45deg" }]
    },
    tatreezDiamondAlt: {
      width: 7,
      height: 7,
      borderWidth: 1.5,
      borderColor: colors.accentLight,
      transform: [{ rotate: "45deg" }]
    },
    parliamentMark: {
      position: "absolute",
      left: 18,
      bottom: 14,
      width: 72,
      height: 42,
      opacity: 0.12,
      alignItems: "center",
      justifyContent: "flex-end"
    },
    dome: {
      width: 42,
      height: 20,
      borderTopLeftRadius: 21,
      borderTopRightRadius: 21,
      borderWidth: 2,
      borderBottomWidth: 0,
      borderColor: colors.accentLight
    },
    columns: {
      width: 64,
      height: 20,
      flexDirection: "row",
      justifyContent: "space-around",
      borderTopWidth: 2,
      borderTopColor: colors.accentLight
    },
    column: {
      width: 6,
      height: 18,
      borderRadius: 3,
      backgroundColor: colors.primaryDark
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
      fontWeight: "900",
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
