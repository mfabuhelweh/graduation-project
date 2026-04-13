import type { PropsWithChildren, ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";

interface ScreenContainerProps extends PropsWithChildren {
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: ReactNode;
}

export function ScreenContainer({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  footer
}: ScreenContainerProps) {
  const content = (
    <View style={styles.content}>
      {children}
      {footer}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            ) : undefined
          }
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  scrollContent: {
    flexGrow: 1
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16
  }
});
