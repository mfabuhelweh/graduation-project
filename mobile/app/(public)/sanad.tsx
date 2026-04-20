import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import {
  SanadLogo,
  SanadPublicShell,
  sanadPublicColors,
  type PublicTab
} from "@/components/public/SanadPublicShell";
import { useAuth } from "@/hooks/useAuth";
import { completeSanadLogin, startSanadLogin, verifySanadOtp } from "@/services/auth";
import { usePreferencesStore } from "@/store/preferencesStore";
import { toErrorMessage } from "@/utils/helpers";

const nationalIdPattern = /^[0-9]{10}$/;
const otpPattern = /^[0-9]{6}$/;
type LoginStage = 0 | 1 | 2;

const text = {
  ar: {
    sanad: "صوتك",
    subtitle: "صوتك أمل وتقدم وشفافية",
    signIn: "تسجيل الدخول",
    biometric: "الدخول عبر البصمة الرقمية",
    create: "إنشاء حساب جديد",
    nationalId: "الرقم الوطني",
    nationalIdHint: "أدخل الرقم الوطني المكون من 10 أرقام",
    password: "كلمة السر",
    passwordHint: "أدخل كلمة السر",
    continue: "الدخول إلى صوتك",
    otp: "رمز التحقق",
    otpHint: "أدخل رمز التحقق المكون من 6 أرقام",
    verify: "تحقق من الرمز",
    consentTitle: "الموافقة",
    consent: "أوافق على استخدام بيانات الهوية الرقمية لإتمام تسجيل الدخول.",
    complete: "إكمال الدخول",
    invalidNationalId: "يرجى إدخال رقم وطني صحيح مكون من 10 أرقام.",
    invalidPassword: "يرجى إدخال كلمة السر.",
    invalidOtp: "يرجى إدخال رمز تحقق مكون من 6 أرقام.",
    consentRequired: "يجب الموافقة لإكمال الدخول.",
    sent: "تم إرسال رمز التحقق إلى حسابك المرتبط.",
    verified: "تم التحقق من الرمز بنجاح.",
    testCode: "رمز الاختبار",
    working: "جاري المعالجة...",
    soon: "قريباً",
    soonBody: "سيتم تفعيل هذه الخدمة لاحقاً.",
    docs: "التحقق من المستندات",
    sign: "التحقق من التوقيع الرقمي",
    forgot: "نسيت كلمة المرور؟",
    about: "عن المنصة",
    help: "المساعدة",
    emergency: "مكالمات الطوارئ",
    feedback: "الاقتراحات والشكاوى",
    aboutSanad: "عن صوتك",
    aboutBody: "صوتك منصة اقتراع رقمية آمنة تضع قيمة صوت المواطن في قلب التجربة.",
    contact: "اتصل بنا",
    faq: "الأسئلة الشائعة",
    stations: "مراكز الاقتراع",
    stationsBody: "اختر أقرب مركز للحصول على المساعدة في استخدام منصة صوتك.",
    locationSoon: "سيتم إضافة تفاصيل الموقع لاحقاً."
  },
  en: {
    sanad: "Soutak",
    subtitle: "Your voice, progress, and transparency",
    signIn: "Sign in",
    biometric: "Biometric login",
    create: "Create account",
    nationalId: "National ID",
    nationalIdHint: "Enter the 10-digit national ID",
    password: "Password",
    passwordHint: "Enter your password",
    continue: "Continue to Soutak",
    otp: "Verification code",
    otpHint: "Enter the 6-digit verification code",
    verify: "Verify code",
    consentTitle: "Consent",
    consent: "I agree to use my digital identity data to complete sign in.",
    complete: "Complete sign in",
    invalidNationalId: "Enter a valid 10-digit national ID.",
    invalidPassword: "Enter your password.",
    invalidOtp: "Enter a 6-digit verification code.",
    consentRequired: "Consent is required to complete sign in.",
    sent: "A verification code was sent to your linked account.",
    verified: "The code was verified.",
    testCode: "Test code",
    working: "Processing...",
    soon: "Coming soon",
    soonBody: "This service will be enabled later.",
    docs: "Verify documents",
    sign: "Verify signature",
    forgot: "Forgot password?",
    about: "About",
    help: "Help",
    emergency: "Emergency calls",
    feedback: "Suggestions and complaints",
    aboutSanad: "About Soutak",
    aboutBody: "Soutak is a secure electronic voting platform built around the value of every citizen voice.",
    contact: "Contact us",
    faq: "FAQ",
    stations: "Voting centers",
    stationsBody: "Choose the nearest center for help using Soutak.",
    locationSoon: "Location details will be added later."
  }
};

const stations = [
  ["مركز اقتراع - عمان", "Voting Center - Amman"],
  ["مركز اقتراع - إربد", "Voting Center - Irbid"],
  ["مركز اقتراع - الزرقاء", "Voting Center - Zarqa"]
];

export default function SanadStartScreen() {
  const language = usePreferencesStore((state) => state.language);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const [activeTab, setActiveTab] = useState<PublicTab>("login");

  return (
    <SanadPublicShell
      activeTab={activeTab}
      language={language}
      onTabChange={setActiveTab}
      onToggleLanguage={() => void setLanguage(language === "ar" ? "en" : "ar")}
    >
      {activeTab === "login" ? <LoginTab language={language} /> : null}
      {activeTab === "help" ? <HelpTab language={language} /> : null}
      {activeTab === "stations" ? <StationsTab language={language} /> : null}
    </SanadPublicShell>
  );
}

function LoginTab({ language }: { language: "ar" | "en" }) {
  const t = text[language];
  const isArabic = language === "ar";
  const { isAuthenticated, isSigningIn, applySession } = useAuth();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<LoginStage>(0);
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [sandboxOtp, setSandboxOtp] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) router.replace("/(voter)/home");
  }, [isAuthenticated]);

  const resetFeedback = () => {
    setError("");
    setMessage("");
  };

  const start = async () => {
    if (!nationalIdPattern.test(nationalId.trim())) {
      setError(t.invalidNationalId);
      return;
    }
    if (!password.trim()) {
      setError(t.invalidPassword);
      return;
    }
    try {
      resetFeedback();
      const response = await startSanadLogin(nationalId, password);
      setChallengeId(response.challengeId);
      setName(response.citizenName);
      setPhone(response.maskedPhoneNumber);
      setReference(response.requestReference);
      setSandboxOtp(response.sandboxOtp || "");
      setStage(1);
      setMessage(t.sent);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  const verify = async () => {
    if (!otpPattern.test(otp.trim())) {
      setError(t.invalidOtp);
      return;
    }
    try {
      resetFeedback();
      const response = await verifySanadOtp(challengeId, otp);
      setName(response.citizenName);
      setPhone(response.maskedPhoneNumber);
      setReference(response.requestReference);
      setStage(2);
      setMessage(t.verified);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  const complete = async () => {
    if (!accepted) {
      setError(t.consentRequired);
      return;
    }
    try {
      resetFeedback();
      const session = await completeSanadLogin(challengeId);
      await applySession(session);
      router.replace("/(voter)/home");
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <SanadLogo />
          </View>
          <Text style={styles.heroTitle}>{t.sanad}</Text>
          <Text style={styles.heroSubtitle}>{t.subtitle}</Text>
        </View>

        <View style={styles.actions}>
          <ActionButton icon="fingerprint" label={t.biometric} variant="dark" onPress={() => Alert.alert(t.soon, t.soonBody)} />
          <ActionButton icon="login" label={t.signIn} variant="primary" onPress={() => { setOpen(true); resetFeedback(); }} />
          {open ? (
            <View style={styles.loginPanel}>
              <Steps stage={stage} isArabic={isArabic} />
              {error ? <Banner tone="error" message={error} /> : null}
              {message ? <Banner tone="success" message={message} /> : null}
              {stage > 0 ? <Identity name={name} phone={phone} reference={reference} isArabic={isArabic} /> : null}
              {stage === 0 ? (
                <>
                  <Field
                    label={t.nationalId}
                    value={nationalId}
                    placeholder={t.nationalIdHint}
                    maxLength={10}
                    isArabic={isArabic}
                    keyboardType="number-pad"
                    onChange={(value) => {
                      setNationalId(value.replace(/\D/g, ""));
                      resetFeedback();
                    }}
                  />
                  <Field
                    label={t.password}
                    value={password}
                    placeholder={t.passwordHint}
                    isArabic={isArabic}
                    secureTextEntry
                    onChange={(value) => {
                      setPassword(value);
                      resetFeedback();
                    }}
                  />
                </>
              ) : null}
              {stage === 1 ? (
                <>
                  {sandboxOtp ? (
                    <View style={styles.otpHint}>
                      <Text style={styles.otpHintLabel}>{t.testCode}</Text>
                      <Text style={styles.otpHintValue}>{sandboxOtp}</Text>
                    </View>
                  ) : null}
                  <Field
                    label={t.otp}
                    value={otp}
                    placeholder={t.otpHint}
                    maxLength={6}
                    isArabic={isArabic}
                    onChange={(value) => {
                      setOtp(value.replace(/\D/g, ""));
                      resetFeedback();
                    }}
                  />
                </>
              ) : null}
              {stage === 2 ? (
                <View style={styles.consentBox}>
                  <Text style={styles.consentTitle}>{t.consentTitle}</Text>
                  <Pressable style={styles.checkRow} onPress={() => setAccepted((value) => !value)}>
                    <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
                      {accepted ? <MaterialCommunityIcons name="check" size={16} color="#ffffff" /> : null}
                    </View>
                    <Text style={styles.consentText}>{t.consent}</Text>
                  </Pressable>
                </View>
              ) : null}
              <ActionButton
                icon={stage === 0 ? "shield-check-outline" : stage === 1 ? "lock-check-outline" : "login"}
                label={isSigningIn ? t.working : stage === 0 ? t.continue : stage === 1 ? t.verify : t.complete}
                variant="primary"
                onPress={stage === 0 ? start : stage === 1 ? verify : complete}
                disabled={isSigningIn}
              />
            </View>
          ) : null}
          <ActionButton icon="account-plus-outline" label={t.create} variant="outline" onPress={() => Alert.alert(t.soon, t.soonBody)} />
        </View>

        <View style={styles.utilityGrid}>
          <UtilityTile icon="file-document-check-outline" title={t.docs} onPress={() => Alert.alert(t.soon, t.soonBody)} />
          <UtilityTile icon="draw-pen" title={t.sign} onPress={() => Alert.alert(t.soon, t.soonBody)} />
        </View>
        <View style={styles.secondaryLinks}>
          <SmallLink icon="lock-reset" label={t.forgot} onPress={() => Alert.alert(t.soon, t.soonBody)} />
          <View style={styles.dot} />
          <SmallLink icon="information-outline" label={t.about} onPress={() => Alert.alert(t.soon, t.soonBody)} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function HelpTab({ language }: { language: "ar" | "en" }) {
  const t = text[language];
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>{t.help}</Text>
      <InfoRow icon="phone-alert-outline" title={t.emergency} subtitle="911" onPress={() => Linking.openURL("tel:911")} />
      <InfoRow icon="message-alert-outline" title={t.feedback} subtitle={t.soonBody} onPress={() => Alert.alert(t.feedback, t.soonBody)} />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.aboutSanad}</Text>
        <Text style={styles.bodyText}>{t.aboutBody}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.contact}</Text>
        <View style={styles.quickButtons}>
          <SquareButton icon="phone" onPress={() => Linking.openURL("tel:065008080")} />
          <SquareButton icon="web" onPress={() => Linking.openURL("https://sanad.gov.jo")} />
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.faq}</Text>
        <View style={styles.faqItem}>
          <Text style={styles.faqTitle}>{t.aboutSanad}</Text>
          <Text style={styles.faqBody}>{t.aboutBody}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function StationsTab({ language }: { language: "ar" | "en" }) {
  const t = text[language];
  const isArabic = language === "ar";
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>{t.stations}</Text>
      <Text style={styles.bodyText}>{t.stationsBody}</Text>
      <View style={styles.stationList}>
        {stations.map(([arName, enName]) => (
          <Pressable key={enName} style={styles.stationRow} onPress={() => Alert.alert(isArabic ? arName : enName, t.locationSoon)}>
            <View style={styles.stationIcon}>
              <MaterialCommunityIcons name="map-marker-radius-outline" size={25} color={sanadPublicColors.blue} />
            </View>
            <View style={styles.stationCopy}>
              <Text style={styles.stationName}>{isArabic ? arName : enName}</Text>
              <Text style={styles.stationDetail}>{t.stationsBody}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#7a828d" />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  placeholder,
  isArabic,
  maxLength,
  keyboardType = "default",
  secureTextEntry = false,
  onChange
}: {
  label: string;
  value: string;
  placeholder: string;
  isArabic: boolean;
  maxLength?: number;
  keyboardType?: "default" | "number-pad";
  secureTextEntry?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.fieldStack}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        maxLength={maxLength}
        secureTextEntry={secureTextEntry}
        placeholder={placeholder}
        placeholderTextColor="#8792a0"
        style={[styles.textInput, isArabic && styles.textInputRtl]}
      />
    </View>
  );
}

function Steps({ stage, isArabic }: { stage: LoginStage; isArabic: boolean }) {
  const labels = isArabic ? ["الهوية", "التحقق", "الموافقة"] : ["Identity", "Verify", "Consent"];
  return (
    <View style={styles.stepsRow}>
      {labels.map((label, index) => (
        <View key={label} style={styles.stepItem}>
          <View style={[styles.stepDot, index === stage && styles.stepDotActive, index < stage && styles.stepDotDone]}>
            {index < stage ? <MaterialCommunityIcons name="check" size={13} color="#ffffff" /> : <Text style={styles.stepNumber}>{index + 1}</Text>}
          </View>
          <Text style={[styles.stepLabel, index === stage && styles.stepLabelActive]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function Identity({ name, phone, reference, isArabic }: { name: string; phone: string; reference: string; isArabic: boolean }) {
  return (
    <View style={styles.identityBox}>
      <Text style={styles.identityName}>{name}</Text>
      <Text style={styles.identityText}>{isArabic ? "الهاتف: " : "Phone: "}{phone}</Text>
      {reference ? <Text style={styles.identityText}>{isArabic ? "مرجع الطلب: " : "Reference: "}{reference}</Text> : null}
    </View>
  );
}

function Banner({ tone, message }: { tone: "error" | "success"; message: string }) {
  const isError = tone === "error";
  return (
    <View style={[styles.banner, isError ? styles.bannerError : styles.bannerSuccess]}>
      <MaterialCommunityIcons
        name={isError ? "alert-circle-outline" : "check-circle-outline"}
        size={18}
        color={isError ? "#93000a" : "#005137"}
      />
      <Text style={[styles.bannerText, isError ? styles.bannerErrorText : styles.bannerSuccessText]}>{message}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  variant,
  onPress,
  disabled = false
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  variant: "dark" | "primary" | "outline";
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.actionButton,
        variant === "dark" && styles.actionDark,
        variant === "primary" && styles.actionPrimary,
        variant === "outline" && styles.actionOutline,
        disabled && styles.actionDisabled
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <MaterialCommunityIcons name={icon} size={22} color={variant === "outline" ? sanadPublicColors.blue : "#ffffff"} />
      <Text style={[styles.actionText, variant === "dark" && styles.actionDarkText, variant === "outline" && styles.actionOutlineText]}>{label}</Text>
    </Pressable>
  );
}

function UtilityTile({ icon, title, onPress }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; title: string; onPress: () => void }) {
  return (
    <Pressable style={styles.utilityTile} onPress={onPress}>
      <View style={styles.utilityIcon}>
        <MaterialCommunityIcons name={icon} size={25} color={sanadPublicColors.blue} />
      </View>
      <Text style={styles.utilityTitle}>{title}</Text>
    </Pressable>
  );
}

function SmallLink({ icon, label, onPress }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.secondaryLink} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={18} color={sanadPublicColors.muted} />
      <Text style={styles.secondaryLinkText}>{label}</Text>
    </Pressable>
  );
}

function InfoRow({ icon, title, subtitle, onPress }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable style={styles.infoRow} onPress={onPress}>
      <View style={styles.infoIcon}>
        <MaterialCommunityIcons name={icon} size={24} color={sanadPublicColors.blue} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoSubtitle}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-left" size={24} color="#7a828d" />
    </Pressable>
  );
}

function SquareButton({ icon, onPress }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; onPress: () => void }) {
  return (
    <Pressable style={styles.squareButton} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={23} color={sanadPublicColors.blue} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { paddingBottom: 22 },
  hero: { alignItems: "center", paddingTop: 30, paddingBottom: 34, gap: 8 },
  heroIconWrap: {
    width: 116,
    height: 116,
    borderRadius: 8,
    backgroundColor: sanadPublicColors.blue,
    borderWidth: 1,
    borderColor: "rgba(184,138,44,0.44)",
    shadowColor: sanadPublicColors.blue,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  heroTitle: { color: sanadPublicColors.text, fontSize: 38, fontWeight: "900", textAlign: "center" },
  heroSubtitle: { color: sanadPublicColors.muted, fontSize: 16, fontWeight: "700", textAlign: "center" },
  actions: { gap: 12 },
  actionButton: {
    minHeight: 56,
    borderRadius: 8,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 14
  },
  actionDark: { backgroundColor: "#0B1026", borderWidth: 1, borderColor: "#0B1026" },
  actionPrimary: { backgroundColor: sanadPublicColors.blue },
  actionOutline: { backgroundColor: "#ffffff", borderWidth: 1.5, borderColor: sanadPublicColors.border },
  actionDisabled: { opacity: 0.62 },
  actionText: { color: "#ffffff", fontSize: 15, fontWeight: "900", textAlign: "center" },
  actionDarkText: { color: "#ffffff" },
  actionOutlineText: { color: sanadPublicColors.blue },
  loginPanel: {
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: sanadPublicColors.border,
    padding: 14,
    gap: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 8
  },
  stepsRow: { flexDirection: "row-reverse", justifyContent: "center", gap: 20 },
  stepItem: { alignItems: "center", gap: 5 },
  stepDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#EEF2F5", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: sanadPublicColors.border },
  stepDotActive: { backgroundColor: sanadPublicColors.blue, borderColor: sanadPublicColors.gold },
  stepDotDone: { backgroundColor: sanadPublicColors.blue, borderColor: sanadPublicColors.blue },
  stepNumber: { color: sanadPublicColors.text, fontSize: 13, fontWeight: "900" },
  stepLabel: { color: sanadPublicColors.muted, fontSize: 11, fontWeight: "800" },
  stepLabelActive: { color: sanadPublicColors.blue },
  fieldStack: { gap: 9 },
  fieldLabel: { color: sanadPublicColors.text, fontSize: 13, fontWeight: "900", textAlign: "right" },
  textInput: {
    minHeight: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: sanadPublicColors.border,
    backgroundColor: "#F8FAFC",
    color: sanadPublicColors.text,
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: 14,
    textAlign: "left"
  },
  textInputRtl: { textAlign: "right" },
  banner: { borderRadius: 8, flexDirection: "row-reverse", alignItems: "center", gap: 8, padding: 10 },
  bannerError: { backgroundColor: "rgba(239,68,68,0.12)", borderWidth: 1, borderColor: "rgba(239,68,68,0.32)" },
  bannerSuccess: { backgroundColor: "rgba(31,90,169,0.12)", borderWidth: 1, borderColor: "rgba(31,90,169,0.24)" },
  bannerText: { flex: 1, fontSize: 12, fontWeight: "800", textAlign: "right" },
  bannerErrorText: { color: "#EF4444" },
  bannerSuccessText: { color: sanadPublicColors.blue },
  identityBox: { borderRadius: 14, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: sanadPublicColors.border, padding: 12, gap: 5, alignItems: "flex-end" },
  identityName: { color: sanadPublicColors.text, fontSize: 14, fontWeight: "900", textAlign: "right" },
  identityText: { color: sanadPublicColors.muted, fontSize: 12, fontWeight: "700", textAlign: "right" },
  otpHint: { borderRadius: 14, backgroundColor: "rgba(35,139,115,0.10)", alignItems: "center", paddingVertical: 9, gap: 2, borderWidth: 1, borderColor: "rgba(35,139,115,0.22)" },
  otpHintLabel: { color: sanadPublicColors.blue, fontSize: 11, fontWeight: "800" },
  otpHintValue: { color: sanadPublicColors.blue, fontSize: 22, fontWeight: "900", letterSpacing: 2 },
  consentBox: { borderRadius: 14, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: sanadPublicColors.border, padding: 12, gap: 10 },
  consentTitle: { color: sanadPublicColors.text, fontSize: 14, fontWeight: "900", textAlign: "right" },
  checkRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: sanadPublicColors.border, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: sanadPublicColors.blue, borderColor: sanadPublicColors.blue },
  consentText: { flex: 1, color: sanadPublicColors.muted, fontSize: 13, fontWeight: "700", lineHeight: 19, textAlign: "right" },
  utilityGrid: { flexDirection: "row", gap: 12, marginTop: 28 },
  utilityTile: { flex: 1, minHeight: 118, borderRadius: 20, backgroundColor: "#ffffff", borderWidth: 1, borderColor: sanadPublicColors.border, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, gap: 10 },
  utilityIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: "rgba(59,91,254,0.12)", alignItems: "center", justifyContent: "center" },
  utilityTitle: { color: sanadPublicColors.text, fontSize: 13, fontWeight: "800", textAlign: "center", lineHeight: 19 },
  secondaryLinks: { marginTop: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  secondaryLink: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  secondaryLinkText: { color: sanadPublicColors.muted, fontSize: 12, fontWeight: "700" },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: sanadPublicColors.blue },
  pageTitle: { color: sanadPublicColors.text, fontSize: 24, fontWeight: "900", textAlign: "right", marginBottom: 16 },
  infoRow: { minHeight: 76, borderRadius: 18, backgroundColor: "#ffffff", borderWidth: 1, borderColor: sanadPublicColors.border, flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 12, marginBottom: 10 },
  infoIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(59,91,254,0.12)", alignItems: "center", justifyContent: "center" },
  infoCopy: { flex: 1, alignItems: "flex-end", gap: 4 },
  infoTitle: { color: sanadPublicColors.text, fontSize: 14, fontWeight: "900", textAlign: "right" },
  infoSubtitle: { color: sanadPublicColors.muted, fontSize: 12, fontWeight: "700", textAlign: "right" },
  section: { marginTop: 22, gap: 10 },
  sectionTitle: { color: sanadPublicColors.text, fontSize: 17, fontWeight: "900", textAlign: "right" },
  bodyText: { color: sanadPublicColors.muted, fontSize: 14, fontWeight: "600", lineHeight: 22, textAlign: "right" },
  quickButtons: { flexDirection: "row-reverse", gap: 10 },
  squareButton: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#ffffff", borderWidth: 1, borderColor: sanadPublicColors.border, alignItems: "center", justifyContent: "center" },
  faqItem: { borderRadius: 18, backgroundColor: "#ffffff", borderWidth: 1, borderColor: sanadPublicColors.border, padding: 14, gap: 6, marginBottom: 10 },
  faqTitle: { color: sanadPublicColors.text, fontSize: 14, fontWeight: "900", textAlign: "right" },
  faqBody: { color: sanadPublicColors.muted, fontSize: 13, fontWeight: "600", lineHeight: 20, textAlign: "right" },
  stationList: { gap: 10, marginTop: 18 },
  stationRow: { minHeight: 82, borderRadius: 18, backgroundColor: "#ffffff", borderWidth: 1, borderColor: sanadPublicColors.border, flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  stationIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(59,91,254,0.12)", alignItems: "center", justifyContent: "center" },
  stationCopy: { flex: 1, alignItems: "flex-end", gap: 5 },
  stationName: { color: sanadPublicColors.text, fontSize: 14, fontWeight: "900", textAlign: "right" },
  stationDetail: { color: sanadPublicColors.muted, fontSize: 12, fontWeight: "700", lineHeight: 18, textAlign: "right" }
});
