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
  const { colors } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors.background), [colors.background]);

  const containerStyle = {
    paddingTop: insets.top + 8,
    paddingBottom: insets.bottom + 16,
    paddingHorizontal: 16
  };

  if (!scroll) {
    return (
      <View style={[styles.base, containerStyle, center && styles.centered]}>
        {children}
      </View>
    );
  }

  return (
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
      backgroundColor
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
