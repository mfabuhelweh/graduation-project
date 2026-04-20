import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppPreferences } from "@/hooks/useAppPreferences";

interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  center?: boolean;
}

export function ScreenContainer({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  center = false
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const { colors, theme } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors.background), [colors.background]);
  const patternStyles = useMemo(() => createPatternStyles(theme), [theme]);

  const containerStyle = {
    paddingTop: insets.top + 8,
    paddingBottom: insets.bottom + 104,
    paddingHorizontal: 16
  };

  if (!scroll) {
    return (
      <View style={[styles.base, containerStyle, center && styles.centered]}>
        <BackgroundPattern styles={patternStyles} />
        {children}
      </View>
    );
  }

  return (
    <View style={styles.base}>
      <BackgroundPattern styles={patternStyles} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, containerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </View>
  );
}

function BackgroundPattern({ styles }: { styles: ReturnType<typeof createPatternStyles> }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <View style={[styles.tatreezRow, styles.tatreezTop]}>
        <View style={styles.tatreezDiamond} />
        <View style={styles.tatreezDiamondAlt} />
        <View style={styles.tatreezDiamond} />
        <View style={styles.tatreezDiamondAlt} />
        <View style={styles.tatreezDiamond} />
      </View>
      <View style={[styles.line, styles.lineTop]} />
      <View style={[styles.line, styles.lineMiddle]} />
      <View style={[styles.line, styles.lineBottom]} />
      <View style={styles.petraArch} />
      <View style={styles.petraArchInner} />
      <View style={styles.parliamentBase} />
      <View style={styles.parliamentDome} />
      <View style={[styles.column, styles.columnOne]} />
      <View style={[styles.column, styles.columnTwo]} />
      <View style={[styles.column, styles.columnThree]} />
      <View style={[styles.column, styles.columnFour]} />
    </View>
  );
}

function createStyles(backgroundColor: string) {
  return StyleSheet.create({
    base: {
      flex: 1,
      backgroundColor
    },
    scroll: {
      flex: 1,
      backgroundColor: "transparent"
    },
    content: {
      gap: 14,
      flexGrow: 1
    },
    centered: {
      justifyContent: "center",
      alignItems: "center"
    }
  });
}

function createPatternStyles(theme: "light" | "dark") {
  const isLight = theme === "light";

  return StyleSheet.create({
  tatreezRow: {
    position: "absolute",
    left: 24,
    right: 24,
    height: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    opacity: isLight ? 0.24 : 0.16
  },
  tatreezTop: {
    top: 82
  },
  tatreezDiamond: {
    width: 12,
    height: 12,
    borderWidth: 2,
    borderColor: isLight ? "rgba(31, 90, 169, 0.42)" : "rgba(95, 162, 255, 0.40)",
    transform: [{ rotate: "45deg" }]
  },
  tatreezDiamondAlt: {
    width: 10,
    height: 10,
    borderWidth: 2,
    borderColor: isLight ? "rgba(184, 138, 44, 0.48)" : "rgba(212, 175, 55, 0.36)",
    transform: [{ rotate: "45deg" }]
  },
  line: {
    position: "absolute",
    height: 1,
    left: -80,
    right: -80,
    backgroundColor: isLight ? "rgba(184, 138, 44, 0.11)" : "rgba(212, 175, 55, 0.08)",
    transform: [{ rotate: "-18deg" }]
  },
  lineTop: {
    top: 120
  },
  lineMiddle: {
    top: 310
  },
  lineBottom: {
    bottom: 180
  },
  petraArch: {
    position: "absolute",
    left: -34,
    top: 168,
    width: 128,
    height: 150,
    borderTopLeftRadius: 64,
    borderTopRightRadius: 64,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: isLight ? "rgba(159, 111, 115, 0.14)" : "rgba(194, 139, 142, 0.12)",
    opacity: 0.9
  },
  petraArchInner: {
    position: "absolute",
    left: -10,
    top: 198,
    width: 80,
    height: 110,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: isLight ? "rgba(184, 138, 44, 0.16)" : "rgba(212, 175, 55, 0.12)",
    opacity: 0.9
  },
  parliamentBase: {
    position: "absolute",
    right: -18,
    bottom: 52,
    width: 180,
    height: 16,
    borderRadius: 8,
    backgroundColor: isLight ? "rgba(23, 23, 23, 0.055)" : "rgba(255, 255, 255, 0.055)"
  },
  parliamentDome: {
    position: "absolute",
    right: 46,
    bottom: 68,
    width: 54,
    height: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: isLight ? "rgba(184, 138, 44, 0.18)" : "rgba(212, 175, 55, 0.16)"
  },
  column: {
    position: "absolute",
    bottom: 68,
    width: 8,
    height: 42,
    borderRadius: 4,
    backgroundColor: isLight ? "rgba(23, 23, 23, 0.045)" : "rgba(255, 255, 255, 0.05)"
  },
  columnOne: {
    right: 16
  },
  columnTwo: {
    right: 42
  },
  columnThree: {
    right: 108
  },
  columnFour: {
    right: 134
  }
  });
}
