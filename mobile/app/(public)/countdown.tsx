import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SanadLogo, sanadPublicColors } from "@/components/public/SanadPublicShell";
import { usePreferencesStore } from "@/store/preferencesStore";
import { formatDate } from "@/utils/helpers";

type CountdownCopy = {
  title: string;
  subtitle: string;
  noDate: string;
  electionLabel: string;
  endsAt: string;
  countdownLabel: string;
  endedLabel: string;
  endedHint: string;
  returnAction: string;
  loginAction: string;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
};

const copy: Record<"ar" | "en", CountdownCopy> = {
  ar: {
    title: "تم تسجيل الخروج بنجاح",
    subtitle: "يمكنك متابعة العد التنازلي حتى نهاية الانتخابات من هذه الشاشة.",
    noDate: "لم يتم العثور على موعد نهاية الانتخابات حالياً.",
    electionLabel: "الانتخابات",
    endsAt: "تنتهي في",
    countdownLabel: "الوقت المتبقي",
    endedLabel: "انتهى وقت الانتخابات",
    endedHint: "أصبح بإمكانك العودة ومتابعة النتائج أو تسجيل الدخول من جديد.",
    returnAction: "العودة إلى الصفحة الرئيسية",
    loginAction: "الانتقال لتسجيل الدخول",
    days: "يوم",
    hours: "ساعة",
    minutes: "دقيقة",
    seconds: "ثانية"
  },
  en: {
    title: "You have been logged out",
    subtitle: "You can keep track of the remaining time until the election ends from this screen.",
    noDate: "The election end date is not available right now.",
    electionLabel: "Election",
    endsAt: "Ends at",
    countdownLabel: "Time remaining",
    endedLabel: "The election has ended",
    endedHint: "You can go back to the public home or sign in again.",
    returnAction: "Back to home",
    loginAction: "Go to login",
    days: "Days",
    hours: "Hours",
    minutes: "Minutes",
    seconds: "Seconds"
  }
};

function getRemainingTime(endAt?: string | null) {
  if (!endAt) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const diff = new Date(endAt).getTime() - Date.now();
  const total = Math.max(diff, 0);

  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60)
  };
}

export default function CountdownScreen() {
  const language = usePreferencesStore((state) => state.language);
  const isArabic = language === "ar";
  const t = copy[language];
  const params = useLocalSearchParams<{
    endAt?: string | string[];
    title?: string | string[];
  }>();

  const endAt = typeof params.endAt === "string" ? params.endAt : params.endAt?.[0];
  const electionTitle =
    typeof params.title === "string" ? params.title : params.title?.[0];

  const [remaining, setRemaining] = useState(() => getRemainingTime(endAt));

  useEffect(() => {
    setRemaining(getRemainingTime(endAt));

    if (!endAt) {
      return;
    }

    const timer = setInterval(() => {
      setRemaining(getRemainingTime(endAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [endAt]);

  const blocks = useMemo(
    () => [
      { label: t.days, value: remaining.days },
      { label: t.hours, value: remaining.hours },
      { label: t.minutes, value: remaining.minutes },
      { label: t.seconds, value: remaining.seconds }
    ],
    [remaining.days, remaining.hours, remaining.minutes, remaining.seconds, t.days, t.hours, t.minutes, t.seconds]
  );

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <View style={styles.topGlow} />
        <View style={styles.sideGlow} />
        <View style={styles.patternLineOne} />
        <View style={styles.patternLineTwo} />
      </View>

      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <SanadLogo />
          </View>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="clock-check-outline" size={18} color={sanadPublicColors.blue} />
            <Text style={styles.badgeText}>{t.countdownLabel}</Text>
          </View>
          <Text style={[styles.title, isArabic && styles.textRight]}>{t.title}</Text>
          <Text style={[styles.subtitle, isArabic && styles.textRight]}>{t.subtitle}</Text>
        </View>

        <View style={styles.card}>
          {electionTitle ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaValue}>{electionTitle}</Text>
              <Text style={styles.metaLabel}>{t.electionLabel}</Text>
            </View>
          ) : null}

          {endAt ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaValue}>{formatDate(endAt, language)}</Text>
              <Text style={styles.metaLabel}>{t.endsAt}</Text>
            </View>
          ) : (
            <Text style={[styles.emptyText, isArabic && styles.textRight]}>{t.noDate}</Text>
          )}

          {endAt ? (
            remaining.total > 0 ? (
              <View style={styles.timerGrid}>
                {blocks.map((block) => (
                  <View key={block.label} style={styles.timeCard}>
                    <Text style={styles.timeValue}>{String(block.value).padStart(2, "0")}</Text>
                    <Text style={styles.timeLabel}>{block.label}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.endedBox}>
                <MaterialCommunityIcons name="check-decagram-outline" size={24} color={sanadPublicColors.blue} />
                <Text style={[styles.endedTitle, isArabic && styles.textRight]}>{t.endedLabel}</Text>
                <Text style={[styles.endedHint, isArabic && styles.textRight]}>{t.endedHint}</Text>
              </View>
            )
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={() => router.replace("/sanad")}>
            <Text style={styles.primaryButtonText}>{t.returnAction}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.replace("/(auth)/login")}>
            <Text style={styles.secondaryButtonText}>{t.loginAction}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F8F7"
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 72,
    paddingBottom: 34,
    justifyContent: "center",
    gap: 20
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: "rgba(23,23,23,0.08)"
  },
  sideGlow: {
    position: "absolute",
    right: -20,
    bottom: 90,
    width: 220,
    height: 90,
    borderRadius: 18,
    backgroundColor: "rgba(31,90,169,0.08)",
    borderWidth: 1,
    borderColor: "rgba(184,138,44,0.18)"
  },
  patternLineOne: {
    position: "absolute",
    top: 180,
    left: -80,
    right: -80,
    height: 1,
    backgroundColor: "rgba(184,138,44,0.12)",
    transform: [{ rotate: "-14deg" }]
  },
  patternLineTwo: {
    position: "absolute",
    bottom: 210,
    left: -80,
    right: -80,
    height: 1,
    backgroundColor: "rgba(31,90,169,0.12)",
    transform: [{ rotate: "-14deg" }]
  },
  hero: {
    alignItems: "center",
    gap: 10
  },
  logoWrap: {
    width: 150,
    alignItems: "center"
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(31,90,169,0.10)",
    borderWidth: 1,
    borderColor: "rgba(31,90,169,0.18)"
  },
  badgeText: {
    color: sanadPublicColors.blue,
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    color: sanadPublicColors.text,
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center"
  },
  subtitle: {
    color: sanadPublicColors.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 24,
    textAlign: "center"
  },
  card: {
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: sanadPublicColors.border,
    padding: 18,
    gap: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8
  },
  metaRow: {
    gap: 4
  },
  metaLabel: {
    color: sanadPublicColors.muted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right"
  },
  metaValue: {
    color: sanadPublicColors.text,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right"
  },
  emptyText: {
    color: sanadPublicColors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22,
    textAlign: "center"
  },
  timerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center"
  },
  timeCard: {
    width: "47%",
    minHeight: 112,
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(31,90,169,0.14)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 6
  },
  timeValue: {
    color: sanadPublicColors.blue,
    fontSize: 32,
    fontWeight: "900"
  },
  timeLabel: {
    color: sanadPublicColors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  endedBox: {
    borderRadius: 22,
    backgroundColor: "rgba(31,90,169,0.08)",
    borderWidth: 1,
    borderColor: "rgba(31,90,169,0.16)",
    alignItems: "center",
    padding: 18,
    gap: 8
  },
  endedTitle: {
    color: sanadPublicColors.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center"
  },
  endedHint: {
    color: sanadPublicColors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 21,
    textAlign: "center"
  },
  actions: {
    gap: 10
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: sanadPublicColors.blue,
    justifyContent: "center",
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: sanadPublicColors.border,
    justifyContent: "center",
    alignItems: "center"
  },
  secondaryButtonText: {
    color: sanadPublicColors.blue,
    fontSize: 15,
    fontWeight: "900"
  },
  textRight: {
    textAlign: "right"
  }
});
