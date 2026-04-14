import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  TouchableOpacity
} from "react-native";
import { router } from "expo-router";
import { Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ErrorMessage } from "@/components/ErrorMessage";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import {
  completeSanadLogin,
  startSanadLogin,
  verifySanadOtp
} from "@/services/auth";
import { formatDate, toErrorMessage } from "@/utils/helpers";

const nationalIdPattern = /^[0-9]{10}$/;
const otpPattern = /^[0-9]{6}$/;

type SanadStage = 0 | 1 | 2;

export default function LoginScreen() {
  const { isAuthenticated, isSigningIn, applySession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [stage, setStage] = useState<SanadStage>(0);
  const [nationalId, setNationalId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [otp, setOtp] = useState("");
  const [citizenName, setCitizenName] = useState("");
  const [maskedPhoneNumber, setMaskedPhoneNumber] = useState("");
  const [requestReference, setRequestReference] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [sandboxOtp, setSandboxOtp] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(voter)/home");
    }
  }, [isAuthenticated]);

  const stageLabel = useMemo(() => {
    if (stage === 0) return "الدخول عبر سند";
    if (stage === 1) return "رمز التحقق";
    return "الموافقة وإتمام الدخول";
  }, [stage]);

  const clearFeedback = () => {
    setError(null);
    setMessage(null);
  };

  const handleStartSanad = async () => {
    if (!nationalIdPattern.test(nationalId.trim())) {
      setError("يرجى إدخال رقم وطني صحيح مكوّن من 10 أرقام.");
      return;
    }
    try {
      clearFeedback();
      const response = await startSanadLogin(nationalId);
      setChallengeId(response.challengeId);
      setCitizenName(response.citizenName);
      setMaskedPhoneNumber(response.maskedPhoneNumber);
      setRequestReference(response.requestReference);
      setExpiresAt(response.expiresAt);
      setSandboxOtp(response.sandboxOtp || "");
      setStage(1);
      setMessage("تم إرسال رمز التحقق إلى حساب سند المرتبط بك.");
    } catch (startError) {
      setError(toErrorMessage(startError));
    }
  };

  const handleVerifyOtp = async () => {
    if (!challengeId) {
      setError("ابدأ تسجيل الدخول عبر سند أولًا.");
      return;
    }
    if (!otpPattern.test(otp.trim())) {
      setError("يرجى إدخال رمز تحقق مكوّن من 6 أرقام.");
      return;
    }
    try {
      clearFeedback();
      const response = await verifySanadOtp(challengeId, otp);
      setCitizenName(response.citizenName);
      setMaskedPhoneNumber(response.maskedPhoneNumber);
      setRequestReference(response.requestReference);
      setExpiresAt(response.expiresAt);
      setStage(2);
      setMessage("تم التحقق من الرمز بنجاح. أكمل الموافقة للمتابعة.");
    } catch (otpError) {
      setError(toErrorMessage(otpError));
    }
  };

  const handleComplete = async () => {
    if (!challengeId) {
      setError("جلسة سند غير مكتملة.");
      return;
    }
    if (!consentAccepted) {
      setError("يجب الموافقة على مشاركة بيانات الهوية لإكمال الدخول.");
      return;
    }
    try {
      clearFeedback();
      const session = await completeSanadLogin(challengeId);
      await applySession(session);
      router.replace("/(voter)/home");
    } catch (completeError) {
      setError(toErrorMessage(completeError));
    }
  };

  // مؤشرات المراحل
  const stages = ["الهوية", "التحقق", "الموافقة"];

  return (
    <ScreenContainer scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.wrapper}
      >
        {/* الشعار والعنوان */}
        <View style={styles.heroBlock}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="vote" size={36} color="#fff" />
          </View>
          <Text style={styles.appName}>نظام الانتخابات</Text>
          <Text style={styles.appSub}>الهيئة المستقلة للانتخاب</Text>
        </View>

        {/* مؤشرات المراحل */}
        <View style={styles.stepsRow}>
          {stages.map((stepLabel, idx) => (
            <View key={idx} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  idx === stage && styles.stepDotActive,
                  idx < stage && styles.stepDotDone
                ]}
              >
                {idx < stage ? (
                  <MaterialCommunityIcons name="check" size={12} color="#fff" />
                ) : (
                  <Text style={styles.stepNum}>{idx + 1}</Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  idx === stage && styles.stepLabelActive
                ]}
              >
                {stepLabel}
              </Text>
            </View>
          ))}
        </View>

        {/* البطاقة الرئيسية */}
        <View style={styles.card}>
          {/* عنوان المرحلة */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{stageLabel}</Text>
          </View>

          {error ? <ErrorMessage message={error} /> : null}

          {!error && message ? (
            <View style={styles.successBanner}>
              <MaterialCommunityIcons
                name="check-circle"
                size={18}
                color={colors.success}
              />
              <Text style={styles.successText}>{message}</Text>
            </View>
          ) : null}

          {/* المرحلة 0: الرقم الوطني */}
          {stage === 0 ? (
            <View style={styles.fieldGroup}>
              <TextInput
                mode="outlined"
                label="الرقم الوطني"
                keyboardType="number-pad"
                maxLength={10}
                value={nationalId}
                onChangeText={(value) => {
                  setNationalId(value.replace(/\D/g, ""));
                  clearFeedback();
                }}
                textAlign="center"
                style={styles.input}
                outlineStyle={styles.inputOutline}
                textColor={colors.text}
              />
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  isSigningIn && styles.buttonDisabled
                ]}
                onPress={handleStartSanad}
                disabled={isSigningIn}
                activeOpacity={0.85}
              >
                {isSigningIn ? (
                  <MaterialCommunityIcons
                    name="loading"
                    size={18}
                    color="#fff"
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="shield-check"
                    size={18}
                    color="#fff"
                  />
                )}
                <Text style={styles.primaryButtonText}>
                  {isSigningIn ? "جاري الاتصال..." : "الدخول الموحد عبر سند"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* المرحلة 1: OTP */}
          {stage === 1 ? (
            <View style={styles.fieldGroup}>
              <View style={styles.infoBox}>
                <Text style={styles.infoName}>{citizenName}</Text>
                <Text style={styles.infoRow}>
                  <Text style={styles.infoKey}>الهاتف: </Text>
                  {maskedPhoneNumber}
                </Text>
                {sandboxOtp ? (
                  <View style={styles.otpHintBox}>
                    <Text style={styles.otpHintLabel}>رمز الاختبار</Text>
                    <Text style={styles.otpHintValue}>{sandboxOtp}</Text>
                  </View>
                ) : null}
              </View>

              <TextInput
                mode="outlined"
                label="رمز التحقق المكون من 6 أرقام"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(value) => {
                  setOtp(value.replace(/\D/g, ""));
                  clearFeedback();
                }}
                textAlign="center"
                style={styles.input}
                outlineStyle={styles.inputOutline}
                textColor={colors.text}
              />

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  isSigningIn && styles.buttonDisabled
                ]}
                onPress={handleVerifyOtp}
                disabled={isSigningIn}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="lock-check" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  {isSigningIn ? "جاري التحقق..." : "تحقق من الرمز"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* المرحلة 2: الموافقة */}
          {stage === 2 ? (
            <View style={styles.fieldGroup}>
              <View style={styles.infoBox}>
                <Text style={styles.infoName}>{citizenName}</Text>
                <Text style={styles.infoRow}>
                  مرجع الجلسة: {requestReference}
                </Text>
              </View>

              <View style={styles.consentBox}>
                <Text style={styles.consentTitle}>
                  الموافقة على مشاركة البيانات
                </Text>
                <Text style={styles.consentText}>
                  سيتم استخدام بيانات الهوية الواردة من سند لإكمال تسجيل
                  الدخول فقط، ولن تُشارك مع أي طرف آخر.
                </Text>
                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={() => {
                    setConsentAccepted((v) => !v);
                    clearFeedback();
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.checkbox,
                      consentAccepted && styles.checkboxChecked
                    ]}
                  >
                    {consentAccepted ? (
                      <MaterialCommunityIcons
                        name="check"
                        size={14}
                        color="#fff"
                      />
                    ) : null}
                  </View>
                  <Text style={styles.checkLabel}>
                    أوافق على مشاركة بيانات الهوية الرقمية لإتمام الدخول
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!consentAccepted || isSigningIn) && styles.buttonDisabled
                ]}
                onPress={handleComplete}
                disabled={!consentAccepted || isSigningIn}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="login" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  {isSigningIn ? "جاري إتمام الدخول..." : "إكمال الدخول عبر سند"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: "center",
    gap: 22
  },

  // ─── Hero ─────────────────────────────────────────────────────────────
  heroBlock: {
    alignItems: "center",
    gap: 8
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10
  },
  appName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800"
  },
  appSub: {
    color: colors.textMuted,
    fontSize: 13
  },

  // ─── Steps ────────────────────────────────────────────────────────────
  stepsRow: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    gap: 24
  },
  stepItem: {
    alignItems: "center",
    gap: 6
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center"
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4
  },
  stepDotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success
  },
  stepNum: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700"
  },
  stepLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "500"
  },
  stepLabelActive: {
    color: colors.primaryLight,
    fontWeight: "700"
  },

  // ─── Card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 22,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  cardHeader: {
    alignItems: "flex-end"
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right"
  },

  // ─── Success banner ───────────────────────────────────────────────────
  successBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.successBg,
    borderRadius: 12,
    padding: 12
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    flex: 1,
    textAlign: "right"
  },

  // ─── Fields ───────────────────────────────────────────────────────────
  fieldGroup: {
    gap: 14
  },
  input: {
    backgroundColor: colors.backgroundCard,
    textAlign: "center"
  },
  inputOutline: {
    borderColor: colors.border,
    borderRadius: 12
  },

  // ─── Info box ─────────────────────────────────────────────────────────
  infoBox: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 14,
    padding: 16,
    gap: 6,
    alignItems: "flex-end",
    borderWidth: 1,
    borderColor: colors.border
  },
  infoName: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
    textAlign: "right"
  },
  infoRow: {
    color: colors.textSoft,
    fontSize: 13,
    textAlign: "right"
  },
  infoKey: {
    color: colors.textMuted,
    fontWeight: "600"
  },
  otpHintBox: {
    backgroundColor: colors.primaryGlow,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    width: "100%",
    marginTop: 4
  },
  otpHintLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 2
  },
  otpHintValue: {
    color: colors.primaryLight,
    fontWeight: "800",
    fontSize: 22,
    letterSpacing: 4
  },

  // ─── Consent ──────────────────────────────────────────────────────────
  consentBox: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  consentTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
    textAlign: "right"
  },
  consentText: {
    color: colors.textSoft,
    fontSize: 13,
    textAlign: "right",
    lineHeight: 20
  },
  checkRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  checkLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    textAlign: "right",
    lineHeight: 20
  },

  // ─── Buttons ──────────────────────────────────────────────────────────
  primaryButton: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6
  },
  buttonDisabled: {
    backgroundColor: colors.surfaceAlt,
    shadowOpacity: 0
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15
  }
});
