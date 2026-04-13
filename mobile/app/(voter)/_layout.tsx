import { Redirect, Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useAuth } from "@/hooks/useAuth";
import { colors } from "@/constants/colors";

export default function VoterLayout() {
  const { isHydrated, isHydrating, isAuthenticated } = useAuth();

  if (!isHydrated || isHydrating) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingSpinner label="جاري تجهيز جلسة الناخب..." />
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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inactive,
        tabBarStyle: {
          height: 68,
          paddingBottom: 8,
          paddingTop: 8
        }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="home-outline" size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: "النتائج",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="chart-bar" size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "الإشعارات",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="bell-outline" size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "حسابي",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="account-outline" size={size} />
          )
        }}
      />
      <Tabs.Screen name="election/[id]" options={{ href: null }} />
      <Tabs.Screen name="vote/[id]" options={{ href: null }} />
    </Tabs>
  );
}
