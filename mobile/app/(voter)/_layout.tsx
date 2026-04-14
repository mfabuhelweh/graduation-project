import { useMemo } from "react";
import { Redirect, Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useAppPreferences } from "@/hooks/useAppPreferences";
import { useAuth } from "@/hooks/useAuth";

export default function VoterLayout() {
  const { isHydrated, isHydrating, isAuthenticated } = useAuth();
  const { colors, language } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors.primaryGlow), [colors.primaryGlow]);

  if (!isHydrated || isHydrating) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingSpinner label={language === "ar" ? "جار تجهيز جلسة الناخب..." : "Preparing your voter session..."} />
      </ScreenContainer>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.inactive,
        tabBarStyle: {
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 0
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600"
        }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: language === "ar" ? "التصويت" : "Voting",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.focusedTab : undefined}>
              <MaterialCommunityIcons color={color} name={focused ? "vote" : "vote-outline"} size={size} />
            </View>
          )
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: language === "ar" ? "النتائج" : "Results",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.focusedTab : undefined}>
              <MaterialCommunityIcons color={color} name={focused ? "chart-bar" : "chart-bar-stacked"} size={size} />
            </View>
          )
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: language === "ar" ? "الإشعارات" : "Alerts",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.focusedTab : undefined}>
              <MaterialCommunityIcons color={color} name={focused ? "bell" : "bell-outline"} size={size} />
            </View>
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: language === "ar" ? "الإعدادات" : "Settings",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.focusedTab : undefined}>
              <MaterialCommunityIcons color={color} name={focused ? "cog" : "cog-outline"} size={size} />
            </View>
          )
        }}
      />
      <Tabs.Screen name="election/[id]" options={{ href: null }} />
      <Tabs.Screen name="vote/[id]" options={{ href: null }} />
    </Tabs>
  );
}

function createStyles(primaryGlow: string) {
  return StyleSheet.create({
    focusedTab: {
      backgroundColor: primaryGlow,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2
    }
  });
}
