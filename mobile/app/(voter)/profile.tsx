import { useEffect, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useAppPreferences } from "@/hooks/useAppPreferences";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { saveAuthSession } from "@/services/storage";
import { useAuthStore } from "@/store/authStore";
import { usePreferencesStore } from "@/store/preferencesStore";

type Section = "menu" | "profile" | "preferences" | "security" | "notifications";

export default function ProfileScreen() {
  const { logout, user } = useAuth();
  const token = useAuthStore((state) => state.token);
  const updateUser = useAuthStore((state) => state.updateUser);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const setTheme = usePreferencesStore((state) => state.setTheme);
  const { data, isLoading, error, refetch } = useProfile();
  const { colors, language, theme } = useAppPreferences();
  const isArabic = language === "ar";
  const styles = useMemo(() => createStyles(colors, isArabic), [colors, isArabic]);
  const copy = useMemo(() => (isArabic ? ar : en), [isArabic]);

  const [section, setSection] = useState<Section>("menu");
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    electionAlerts: true,
    votingReminders: true,
    resultsAnnouncements: true,
    securityAlerts: true
  });

  const profile = useMemo(
    () =>
      data || {
        email: user?.email || "",
        fullName: user?.fullName || "",
        nationalId: user?.nationalId || ""
      },
    [data, user]
  );

  const [draft, setDraft] = useState({
    fullName: profile.fullName || "",
    email: profile.email || "",
    nationalId: profile.nationalId || ""
  });

  useEffect(() => {
    setDraft({
      fullName: profile.fullName || "",
      email: profile.email || "",
      nationalId: profile.nationalId || ""
    });
  }, [profile.email, profile.fullName, profile.nationalId]);

  const showNotice = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 2200);
  };

  const saveProfile = async () => {
    const updates = {
      fullName: draft.fullName.trim(),
      email: draft.email.trim(),
      nationalId: draft.nationalId.trim()
    };
    updateUser(updates);
    if (token && user) {
      await saveAuthSession({ token, user: { ...user, ...updates } });
    }
    setEditing(false);
    showNotice(copy.profileSaved);
  };

  if (isLoading) {
    return <ScreenContainer scroll={false}><LoadingSpinner label={copy.loading} /></ScreenContainer>;
  }

  if (error) {
    return <ScreenContainer scroll={false}><ErrorMessage message={error.message} onRetry={() => refetch()} /></ScreenContainer>;
  }

  const MenuButton = ({ icon, title, subtitle, action }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; subtitle: string; action: () => void; }) => (
    <TouchableOpacity style={styles.menuRow} onPress={action}>
      <View style={styles.menuText}><Text style={styles.menuTitle}>{title}</Text><Text style={styles.menuSubtitle}>{subtitle}</Text></View>
      <View style={styles.menuIcon}><MaterialCommunityIcons name={icon} size={22} color={colors.primaryLight} /></View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        {section !== "menu" ? (
          <TouchableOpacity style={styles.backButton} onPress={() => setSection("menu")}>
            <MaterialCommunityIcons name={isArabic ? "chevron-right" : "chevron-left"} size={20} color={colors.primaryLight} />
            <Text style={styles.backText}>{copy.back}</Text>
          </TouchableOpacity>
        ) : <View />}
        <View style={styles.headerText}>
          <Text style={styles.title}>{copy[section]}</Text>
          <Text style={styles.subtitle}>{copy.subtitle[section]}</Text>
        </View>
      </View>

      {notice ? <View style={styles.notice}><MaterialCommunityIcons name="check-circle" size={18} color={colors.success} /><Text style={styles.noticeText}>{notice}</Text></View> : null}

      {section === "menu" ? (
        <View style={styles.card}>
          <MenuButton icon="account-circle-outline" title={copy.profile} subtitle={copy.profileHint} action={() => { setEditing(false); setSection("profile"); }} />
          <MenuButton icon="palette-outline" title={copy.preferences} subtitle={copy.preferencesHint} action={() => setSection("preferences")} />
          <MenuButton icon="lock-outline" title={copy.security} subtitle={copy.securityHint} action={() => setSection("security")} />
          <MenuButton icon="bell-outline" title={copy.notifications} subtitle={copy.notificationsHint} action={() => setSection("notifications")} />
          <TouchableOpacity style={styles.logout} onPress={async () => { await logout(); router.replace("/(auth)/login"); }}>
            <View style={styles.menuText}><Text style={[styles.menuTitle, { color: colors.error }]}>{copy.logout}</Text></View>
            <View style={[styles.menuIcon, { backgroundColor: colors.errorBg }]}><MaterialCommunityIcons name="logout" size={22} color={colors.error} /></View>
          </TouchableOpacity>
        </View>
      ) : null}

      {section === "preferences" ? (
        <>
          <View style={styles.hero}>
            <MaterialCommunityIcons name={theme === "dark" ? "weather-night" : "white-balance-sunny"} size={22} color="#fff" />
            <Text style={styles.heroTitle}>{copy.heroTitle}</Text>
            <Text style={styles.heroText}>{copy.heroText}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{copy.languageTitle}</Text>
            <View style={styles.optionRow}>
              {([
                ["ar", copy.arabic, "translate"],
                ["en", copy.english, "alphabetical-variant"]
              ] as const).map(([value, label, icon]) => (
                <TouchableOpacity key={value} style={[styles.tile, language === value && styles.tileActive]} onPress={() => void setLanguage(value).then(() => showNotice(value === "ar" ? ar.prefSaved : en.prefSaved))}>
                  <MaterialCommunityIcons name={icon} size={20} color={language === value ? "#fff" : colors.textSoft} style={[styles.tileIcon, language === value && { backgroundColor: colors.primary }]} />
                  <Text style={[styles.tileTitle, language === value && styles.tileTitleActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{copy.themeTitle}</Text>
            <View style={styles.optionRow}>
              {([
                ["light", copy.lightMode, "white-balance-sunny"],
                ["dark", copy.darkMode, "weather-night"]
              ] as const).map(([value, label, icon]) => (
                <TouchableOpacity key={value} style={[styles.tile, theme === value && styles.tileActive]} onPress={() => void setTheme(value).then(() => showNotice(copy.prefSaved))}>
                  <MaterialCommunityIcons name={icon} size={20} color={theme === value ? "#fff" : colors.textSoft} style={[styles.tileIcon, theme === value && { backgroundColor: value === "light" ? colors.accent : colors.primary }]} />
                  <Text style={[styles.tileTitle, theme === value && styles.tileTitleActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      ) : null}

      {section === "profile" ? (
        <View style={styles.card}>
          <Field label={copy.nationalId} value={editing ? draft.nationalId : profile.nationalId || ""} onChangeText={(v) => setDraft((s) => ({ ...s, nationalId: v }))} editable={editing} styles={styles} colors={colors} />
          <Field label={copy.fullName} value={editing ? draft.fullName : profile.fullName || ""} onChangeText={(v) => setDraft((s) => ({ ...s, fullName: v }))} editable={editing} styles={styles} colors={colors} />
          <Field label={copy.email} value={editing ? draft.email : profile.email || ""} onChangeText={(v) => setDraft((s) => ({ ...s, email: v }))} editable={editing} keyboardType="email-address" styles={styles} colors={colors} />
          {editing ? (
            <>
              <TouchableOpacity style={styles.primaryButton} onPress={() => void saveProfile()}><Text style={styles.primaryButtonText}>{copy.save}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setEditing(false)}><Text style={styles.secondaryText}>{copy.cancel}</Text></TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={() => setEditing(true)}><Text style={styles.primaryButtonText}>{copy.editProfile}</Text></TouchableOpacity>
          )}
        </View>
      ) : null}

      {section === "security" ? (
        <View style={styles.card}>
          {[copy.securityCard1, copy.securityCard2, copy.securityCard3].map((item) => (
            <View key={item.title} style={styles.infoBox}>
              <Text style={styles.infoTitle}>{item.title}</Text>
              <Text style={styles.infoText}>{item.description}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {section === "notifications" ? (
        <View style={styles.card}>
          {([
            ["electionAlerts", copy.electionAlerts],
            ["votingReminders", copy.votingReminders],
            ["resultsAnnouncements", copy.resultsAnnouncements],
            ["securityAlerts", copy.securityAlerts]
          ] as const).map(([key, label]) => (
            <TouchableOpacity key={key} style={styles.prefRow} onPress={() => setNotificationPrefs((s) => ({ ...s, [key]: !s[key] }))}>
              <View style={styles.menuText}><Text style={styles.menuTitle}>{label}</Text></View>
              <View style={[styles.check, notificationPrefs[key] && styles.checkActive]}>{notificationPrefs[key] ? <MaterialCommunityIcons name="check" size={15} color="#fff" /> : null}</View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.primaryButton} onPress={() => showNotice(copy.notificationsSaved)}><Text style={styles.primaryButtonText}>{copy.saveNotifications}</Text></TouchableOpacity>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function Field({ label, value, onChangeText, editable, keyboardType, styles, colors }: { label: string; value: string; onChangeText: (value: string) => void; editable: boolean; keyboardType?: "default" | "email-address"; styles: ReturnType<typeof createStyles>; colors: ReturnType<typeof useAppPreferences>["colors"]; }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        mode="outlined"
        value={value}
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        style={styles.input}
        textColor={colors.text}
        outlineStyle={styles.inputOutline}
        theme={{ colors: { primary: colors.primary, outline: colors.border } }}
      />
    </View>
  );
}

const ar = {
  menu: "الإعدادات", profile: "الملف الشخصي", preferences: "اللغة والمظهر", security: "الأمان", notifications: "الإشعارات",
  subtitle: { menu: "خصص حسابك وتفضيلات التطبيق من مكان واحد.", profile: "راجع وعدّل بياناتك.", preferences: "بدّل اللغة والثيم من هنا.", security: "راجع معلومات الأمان والخصوصية.", notifications: "اختر التنبيهات التي تريدها." },
  back: "العودة", logout: "تسجيل الخروج", profileHint: "تعديل الاسم والبريد والرقم الوطني", preferencesHint: "اللغة والدارك مود", securityHint: "الحماية والخصوصية", notificationsHint: "التنبيهات والتذكيرات",
  heroTitle: "خلّي التطبيق على ذوقك", heroText: "اختيار اللغة والثيم صار من داخل الإعدادات مباشرة.", languageTitle: "لغة الواجهة", themeTitle: "وضع العرض", arabic: "العربية", english: "English", lightMode: "وضع فاتح", darkMode: "دارك مود",
  nationalId: "الرقم الوطني", fullName: "الاسم الكامل", email: "البريد الإلكتروني", editProfile: "تعديل الملف الشخصي", save: "حفظ التغييرات", cancel: "إلغاء",
  loading: "جار تحميل الإعدادات...", profileSaved: "تم حفظ التغييرات.", prefSaved: "تم حفظ تفضيلاتك", notificationsSaved: "تم حفظ إعدادات الإشعارات.", saveNotifications: "حفظ إعدادات الإشعارات",
  electionAlerts: "تنبيهات الانتخابات", votingReminders: "تذكيرات التصويت", resultsAnnouncements: "إعلانات النتائج", securityAlerts: "تنبيهات الأمان",
  securityCard1: { title: "توثيق الحساب", description: "حسابك مرتبط بالبريد الإلكتروني والرقم الوطني." }, securityCard2: { title: "جلسات الدخول", description: "تتم مراجعة الجلسات عبر الخادم والرموز الموقعة." }, securityCard3: { title: "الخصوصية", description: "بيانات الناخب منفصلة عن سجلات التصويت." }
};

const en = {
  menu: "Settings", profile: "Profile", preferences: "Language & Appearance", security: "Security", notifications: "Notifications",
  subtitle: { menu: "Manage your account and app preferences in one place.", profile: "Review and edit your saved details.", preferences: "Switch language and theme from here.", security: "Review privacy and protection details.", notifications: "Choose the alerts you want." },
  back: "Back", logout: "Logout", profileHint: "Update name, email, and national ID", preferencesHint: "Language and dark mode", securityHint: "Protection and privacy", notificationsHint: "Alerts and reminders",
  heroTitle: "Make the app feel like yours", heroText: "Language and theme now live inside Settings.", languageTitle: "Interface Language", themeTitle: "Display Mode", arabic: "Arabic", english: "English", lightMode: "Light Mode", darkMode: "Dark Mode",
  nationalId: "National ID", fullName: "Full Name", email: "Email Address", editProfile: "Edit Profile", save: "Save Changes", cancel: "Cancel",
  loading: "Loading settings...", profileSaved: "Changes saved.", prefSaved: "Your preferences were saved", notificationsSaved: "Notification settings saved.", saveNotifications: "Save notification settings",
  electionAlerts: "Election alerts", votingReminders: "Voting reminders", resultsAnnouncements: "Results announcements", securityAlerts: "Security alerts",
  securityCard1: { title: "Account Verification", description: "Your account is linked to your email and national ID." }, securityCard2: { title: "Login Sessions", description: "Sessions are validated through the server and signed tokens." }, securityCard3: { title: "Privacy", description: "Voter identity is kept separate from vote records." }
};

function createStyles(colors: ReturnType<typeof useAppPreferences>["colors"], rtl: boolean) {
  return StyleSheet.create({
    header: { flexDirection: rtl ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
    headerText: { flex: 1, alignItems: rtl ? "flex-end" : "flex-start" },
    title: { color: colors.text, fontSize: 24, fontWeight: "900", textAlign: rtl ? "right" : "left" },
    subtitle: { color: colors.textSoft, marginTop: 4, textAlign: rtl ? "right" : "left" },
    backButton: { minHeight: 44, paddingHorizontal: 12, borderRadius: 14, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 6 },
    backText: { color: colors.primaryLight, fontWeight: "700" },
    notice: { flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 16, backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.success + "44" },
    noticeText: { color: colors.success, flex: 1, textAlign: rtl ? "right" : "left" },
    hero: { backgroundColor: colors.primaryDark, borderRadius: 22, padding: 18, gap: 8, borderWidth: 1, borderColor: colors.border, alignItems: rtl ? "flex-end" : "flex-start" },
    heroTitle: { color: "#fff", fontSize: 22, fontWeight: "900", textAlign: rtl ? "right" : "left" },
    heroText: { color: "rgba(255,255,255,0.82)", textAlign: rtl ? "right" : "left" },
    card: { backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, overflow: "hidden", padding: 16, gap: 12 },
    menuRow: { minHeight: 76, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12, paddingVertical: 10 },
    logout: { minHeight: 76, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.error + "33" },
    menuText: { flex: 1, alignItems: rtl ? "flex-end" : "flex-start" },
    menuTitle: { color: colors.text, fontWeight: "800", textAlign: rtl ? "right" : "left" },
    menuSubtitle: { color: colors.textMuted, fontSize: 12, textAlign: rtl ? "right" : "left", marginTop: 2 },
    menuIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center", backgroundColor: colors.primaryGlow },
    sectionTitle: { color: colors.text, fontWeight: "900", fontSize: 16, textAlign: rtl ? "right" : "left" },
    optionRow: { flexDirection: "row", gap: 10 },
    tile: { flex: 1, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundCard, padding: 14, gap: 8, alignItems: rtl ? "flex-end" : "flex-start" },
    tileActive: { borderColor: colors.primary, backgroundColor: colors.primaryGlow },
    tileIcon: { width: 40, height: 40, borderRadius: 14, textAlign: "center", textAlignVertical: "center", backgroundColor: colors.surfaceAlt, overflow: "hidden", padding: 10 },
    tileTitle: { color: colors.text, fontWeight: "800", textAlign: rtl ? "right" : "left" },
    tileTitleActive: { color: colors.primary },
    field: { gap: 6 },
    fieldLabel: { color: colors.text, fontWeight: "700", textAlign: rtl ? "right" : "left" },
    input: { backgroundColor: colors.backgroundCard },
    inputOutline: { borderRadius: 14, borderColor: colors.border },
    primaryButton: { minHeight: 50, borderRadius: 16, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },
    primaryButtonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
    secondaryButton: { minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: colors.border, justifyContent: "center", alignItems: "center" },
    secondaryText: { color: colors.textSoft, fontWeight: "700" },
    infoBox: { backgroundColor: colors.backgroundCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 4 },
    infoTitle: { color: colors.text, fontWeight: "800", textAlign: rtl ? "right" : "left" },
    infoText: { color: colors.textSoft, textAlign: rtl ? "right" : "left", lineHeight: 20 },
    prefRow: { flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12, paddingVertical: 8 },
    check: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: colors.border, justifyContent: "center", alignItems: "center" },
    checkActive: { backgroundColor: colors.primary, borderColor: colors.primary }
  });
}
