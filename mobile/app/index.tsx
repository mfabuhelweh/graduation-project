import { Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SoutakFullLogo } from "@/components/public/SanadPublicShell";
import { useAuth } from "@/hooks/useAuth";

export default function IndexScreen() {
  const { isHydrated, isHydrating, isAuthenticated } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!isHydrated || isHydrating || !splashDone) {
    return <OpeningSplash />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/sanad" />;
  }

  return <Redirect href="/(voter)/home" />;
}

function OpeningSplash() {
  return (
    <View style={styles.splash}>
      <StatusBar style="light" backgroundColor="#171717" />
      <View style={styles.glow} />
      <View style={styles.splashLogo}>
        <SoutakFullLogo />
      </View>
      <Text style={styles.splashTitle}>صوتك</Text>
      <Text style={styles.splashSubtitle}>نظام الاقتراع الإلكتروني الأردني</Text>
      <View style={styles.dots}>
        <View style={[styles.dot, styles.dotMuted]} />
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotMuted]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: "#171717",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28
  },
  glow: {
    position: "absolute",
    bottom: 150,
    width: 250,
    height: 84,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(184,138,44,0.24)",
    backgroundColor: "rgba(255,255,255,0.04)"
  },
  splashLogo: {
    width: 260,
    height: 310,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(184,138,44,0.42)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 10
  },
  splashTitle: {
    display: "none",
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center"
  },
  splashSubtitle: {
    display: "none",
    color: "rgba(255,255,255,0.76)",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10
  },
  dots: {
    position: "absolute",
    bottom: 74,
    flexDirection: "row",
    gap: 7
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#1F5AA9"
  },
  dotMuted: {
    opacity: 0.35
  }
});
