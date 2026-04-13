import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Checkbox, Text, TextInput } from "react-native-paper";
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

  const stageTitle = useMemo(() => {
    if (stage === 0) return "الدخول عبر سند";
    if (stage === 1) return "إدخال رمز التحقق";
    return "الموافقة وإكمال الدخول";
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

  return (
    <ScreenContainer scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.wrapper}
      >
        <View style={styles.hero}>
          <Text variant="headlineMedium" style={styles.title}>
            تطبيق الناخبين
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            نفس تجربة الويب للناخبين: تسجيل الدخول عبر سند ثم إكمال الدخول الآمن.
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content style={styles.content}>
            <Text variant="titleLarge" style={styles.formTitle}>
              {stageTitle}
            </Text>

            {error ? <ErrorMessage message={error} /> : null}
            {!error && message ? (
              <Card style={styles.messageCard}>
                <Card.Content>
                  <Text style={styles.messageText}>{message}</Text>
                </Card.Content>
              </Card>
            ) : null}

            {stage === 0 ? (
              <>
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
                />

                <Button
                  mode="contained"
                  loading={isSigningIn}
                  disabled={isSigningIn}
                  onPress={handleStartSanad}
                  style={styles.button}
                >
                  الدخول الموحد عبر سند
                </Button>
              </>
            ) : null}

            {stage === 1 ? (
              <>
                <Card style={styles.infoCard}>
                  <Card.Content style={styles.infoContent}>
                    <Text style={styles.infoTitle}>{citizenName}</Text>
                    <Text style={styles.infoText}>
                      الهاتف المرتبط: {maskedPhoneNumber}
                    </Text>
                    <Text style={styles.infoText}>
                      مرجع الطلب: {requestReference}
                    </Text>
                    <Text style={styles.infoText}>
                      انتهاء الرمز: {formatDate(expiresAt)}
                    </Text>
                    {sandboxOtp ? (
                      <Text style={styles.sandboxOtp}>
                        رمز الاختبار: {sandboxOtp}
                      </Text>
                    ) : null}
                  </Card.Content>
                </Card>

                <TextInput
                  mode="outlined"
                  label="رمز التحقق"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={(value) => {
                    setOtp(value.replace(/\D/g, ""));
                    clearFeedback();
                  }}
                  textAlign="center"
                  style={styles.input}
                />

                <Button
                  mode="contained"
                  loading={isSigningIn}
                  disabled={isSigningIn}
                  onPress={handleVerifyOtp}
                  style={styles.button}
                >
                  متابعة التحقق
                </Button>
              </>
            ) : null}

            {stage === 2 ? (
              <>
                <Card style={styles.infoCard}>
                  <Card.Content style={styles.infoContent}>
                    <Text style={styles.infoTitle}>الموافقة على مشاركة بيانات الهوية</Text>
                    <Text style={styles.infoText}>
                      سيتم استخدام بيانات الهوية الأساسية الواردة من سند لإكمال تسجيل الدخول فقط.
                    </Text>
                    <Text style={styles.infoText}>
                      المستخدم: {citizenName}
                    </Text>
                    <Text style={styles.infoText}>
                      مرجع الجلسة: {requestReference}
                    </Text>
                  </Card.Content>
                </Card>

                <View style={styles.checkboxRow}>
                  <Checkbox
                    status={consentAccepted ? "checked" : "unchecked"}
                    onPress={() => {
                      setConsentAccepted((current) => !current);
                      clearFeedback();
                    }}
                  />
                  <Text style={styles.checkboxText}>
                    أوافق على مشاركة بيانات الهوية الرقمية اللازمة مع النظام لإتمام تسجيل الدخول.
                  </Text>
                </View>

                <Button
                  mode="contained"
                  loading={isSigningIn}
                  disabled={isSigningIn}
                  onPress={handleComplete}
                  style={styles.button}
                >
                  إكمال الدخول عبر سند
                </Button>
              </>
            ) : null}
          </Card.Content>
        </Card>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: "center",
    gap: 18
  },
  hero: {
    alignItems: "flex-end",
    gap: 6
  },
  title: {
    color: colors.text,
    fontWeight: "800",
    textAlign: "right"
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: "right",
    lineHeight: 24
  },
  card: {
    backgroundColor: colors.surface
  },
  content: {
    gap: 14
  },
  formTitle: {
    textAlign: "right",
    color: colors.text,
    fontWeight: "700"
  },
  messageCard: {
    backgroundColor: "#ecfdf5"
  },
  messageText: {
    color: colors.success,
    textAlign: "right"
  },
  infoCard: {
    backgroundColor: "#f8fafc"
  },
  infoContent: {
    gap: 6,
    alignItems: "flex-end"
  },
  infoTitle: {
    color: colors.text,
    fontWeight: "700",
    textAlign: "right"
  },
  infoText: {
    color: colors.textMuted,
    textAlign: "right"
  },
  sandboxOtp: {
    color: colors.primary,
    fontWeight: "700",
    textAlign: "right"
  },
  input: {
    backgroundColor: colors.surface
  },
  checkboxRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 8
  },
  checkboxText: {
    flex: 1,
    color: colors.text,
    textAlign: "right",
    lineHeight: 22,
    marginTop: 8
  },
  button: {
    marginTop: 4,
    backgroundColor: colors.primary
  }
});
