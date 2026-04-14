import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { fetchBallotOptions, issueVotingToken, submitVote } from "@/services/api";

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface VotingFlowProps {
  electionId: string | null;
  electionTitle?: string | null;
  voterName?: string | null;
  nationalId?: string | null;
  onVoteSuccess?: () => Promise<void> | void;
}

const STEPS = [
  "بيانات سند",
  "التحقق من الهوية",
  "الحزب الوطني",
  "القائمة المحلية",
  "مرشحو القائمة",
  "المراجعة",
  "تم"
];

export function VotingFlow({
  electionId,
  electionTitle,
  voterName,
  nationalId,
  onVoteSuccess
}: VotingFlowProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificationScore, setVerificationScore] = useState<number | null>(null);
  const [votingToken, setVotingToken] = useState<string | null>(null);
  const [ballotOptions, setBallotOptions] = useState<any | null>(null);
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [selectedDistrictList, setSelectedDistrictList] = useState<string | null>(null);
  const [selectedDistrictCandidates, setSelectedDistrictCandidates] = useState<string[]>([]);

  const displayName = voterName?.trim() || "المستخدم";
  const normalizedNationalId = (nationalId || "").trim();
  const parties = ballotOptions?.parties || [];
  const districtLists = ballotOptions?.districtLists || [];
  const selectionLimit = Number(ballotOptions?.districtCandidateSelectionCount || 1);

  const selectedList = useMemo(
    () => districtLists.find((item: any) => item.id === selectedDistrictList) || null,
    [districtLists, selectedDistrictList]
  );

  useEffect(() => {
    setStep(0);
    setIsVerifying(false);
    setIsSubmitting(false);
    setMessage(null);
    setError(null);
    setVerificationScore(null);
    setVotingToken(null);
    setBallotOptions(null);
    setSelectedParty(null);
    setSelectedDistrictList(null);
    setSelectedDistrictCandidates([]);
  }, [electionId]);

  const clearFeedback = () => {
    setMessage(null);
    setError(null);
  };

  const handleVerify = async () => {
    if (!electionId) {
      setError("لا يوجد انتخاب مرتبط بصفحة التصويت حاليًا.");
      return;
    }

    if (normalizedNationalId.length !== 10) {
      setError("تعذر قراءة الرقم الوطني من جلسة سند الحالية.");
      return;
    }

    setIsVerifying(true);
    clearFeedback();

    try {
      const tokenResponse = await issueVotingToken(electionId, normalizedNationalId);
      const options = await fetchBallotOptions(electionId);

      setVotingToken(tokenResponse.votingToken);
      setVerificationScore(tokenResponse.score ?? 96);
      setBallotOptions(options);
      setSelectedParty(null);
      setSelectedDistrictList(null);
      setSelectedDistrictCandidates([]);

      const missingParties = !options.parties?.length;
      const missingDistrictLists = !options.districtLists?.length;

      if (missingParties && missingDistrictLists) {
        setMessage("تم التحقق التجريبي، لكن لا توجد أحزاب أو قوائم محلية جاهزة لهذا الانتخاب.");
      } else if (missingParties) {
        setMessage("تم التحقق التجريبي، لكن لا توجد أحزاب وطنية متاحة في هذا الانتخاب.");
      } else if (missingDistrictLists) {
        setMessage("تم التحقق التجريبي، لكن لا توجد قوائم محلية متاحة لدائرتك.");
      } else {
        setMessage("تمت مقارنة صورة الوجه التجريبية مع صورة الوجه في سند وإصدار رمز الاقتراع بنجاح.");
      }

      setStep(2);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "فشل التحقق من الهوية.");
      setVerificationScore(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const toggleCandidate = (candidateId: string) => {
    setSelectedDistrictCandidates((current) => {
      if (current.includes(candidateId)) {
        return current.filter((id) => id !== candidateId);
      }

      if (current.length >= selectionLimit) {
        return current;
      }

      return [...current, candidateId];
    });
  };

  const handleSubmit = async () => {
    if (!electionId) {
      setError("لا يوجد انتخاب صالح لإرسال التصويت.");
      return;
    }

    if (!selectedParty) {
      setError("اختر حزبًا وطنيًا واحدًا قبل المتابعة.");
      return;
    }

    if (!selectedDistrictList) {
      setError("اختر قائمة محلية واحدة من دائرتك.");
      return;
    }

    if (!selectedDistrictCandidates.length) {
      setError("اختر مرشحًا واحدًا على الأقل من القائمة المحلية المحددة.");
      return;
    }

    if (!votingToken) {
      setError("رمز الاقتراع غير متاح. أعد التحقق من الهوية أولًا.");
      return;
    }

    setIsSubmitting(true);
    clearFeedback();

    try {
      await submitVote({
        electionId,
        voterNationalId: normalizedNationalId,
        partyId: selectedParty,
        districtListId: selectedDistrictList,
        districtCandidateIds: selectedDistrictCandidates,
        votingToken
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["elections"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["results", electionId] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["election-details", electionId] })
      ]);

      await onVoteSuccess?.();
      setStep(6);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "تعذر إرسال الصوت. حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.stepperCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepperScroll}>
          {STEPS.map((label, index) => (
            <View key={`${label}-${index}`} style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  index < step && styles.stepCircleDone,
                  index === step && styles.stepCircleActive
                ]}
              >
                {index < step ? (
                  <MaterialCommunityIcons name="check" size={14} color="#fff" />
                ) : (
                  <Text style={[styles.stepNumber, index === step && styles.stepNumberActive]}>{index + 1}</Text>
                )}
              </View>
              <Text
                numberOfLines={2}
                style={[
                  styles.stepLabel,
                  index === step && styles.stepLabelActive,
                  index < step && styles.stepLabelDone
                ]}
              >
                {label}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!error && message ? (
        <View style={styles.messageBanner}>
          <MaterialCommunityIcons name="information" size={18} color={colors.success} />
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      {!electionId ? (
        <View style={styles.card}>
          <Text style={styles.title}>لا يوجد انتخاب متاح الآن</Text>
          <Text style={styles.description}>سيتم تفعيل التصويت هنا عند ربطك بانتخاب نشط أو مجدول.</Text>
        </View>
      ) : null}

      {electionId && step === 0 ? (
        <View style={styles.card}>
          <View style={styles.heroCard}>
            <View style={styles.heroText}>
              <Text style={styles.heroKicker}>مرحبًا بك في التصويت الإلكتروني</Text>
              <Text style={styles.heroName}>{displayName}</Text>
              <Text style={styles.heroDescription}>
                تم التعرف عليك من خلال حساب سند المرتبط بالرقم الوطني المستخدم في تسجيل الدخول.
              </Text>
              {electionTitle ? <Text style={styles.heroMeta}>الانتخاب الحالي: {electionTitle}</Text> : null}
            </View>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="badge-account" size={28} color="#fff" />
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>الاسم المرتبط بسند</Text>
              <Text style={styles.infoValue}>{displayName}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>الرقم الوطني</Text>
              <Text style={styles.infoMono}>{normalizedNationalId || "—"}</Text>
            </View>
            <View style={[styles.infoBox, styles.infoBoxWide]}>
              <Text style={styles.infoLabel}>حالة الجلسة</Text>
              <Text style={styles.infoStatus}>موثقة عبر سند</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              clearFeedback();
              setStep(1);
            }}
          >
            <Text style={styles.primaryButtonText}>متابعة إلى التحقق من الهوية</Text>
            <MaterialCommunityIcons name="arrow-left" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : null}

      {electionId && step === 1 ? (
        <View style={styles.card}>
          <View style={styles.rowTitle}>
            <MaterialCommunityIcons name="fingerprint" size={24} color={colors.primaryLight} />
            <Text style={styles.title}>التحقق من الهوية</Text>
          </View>

          <Text style={styles.description}>
            في هذه الخطوة نستخدم التحقق التجريبي لإصدار رمز الاقتراع وربطك بخيارات التصويت الخاصة بانتخابك.
          </Text>

          <View style={styles.faceCard}>
            <Text style={styles.faceLabel}>صورة الوجه التجريبية المستخدمة للتحقق</Text>
            <View style={styles.faceCircle}>
              <MaterialCommunityIcons name="account" size={56} color="#fff" />
            </View>
            <Text style={styles.faceName}>{displayName}</Text>
            <Text style={styles.faceNote}>مطابقة تجريبية مع بيانات جلسة سند الحالية</Text>
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteText}>
              التحقق هنا تجريبي الآن، ويتم اعتماد إصدار رمز الاقتراع على جلسة سند الحالية.
            </Text>
          </View>

          {verificationScore !== null ? (
            <View style={styles.scoreCard}>
              <Text style={styles.scoreText}>درجة المطابقة الحالية: {verificationScore}%</Text>
            </View>
          ) : null}

          <View style={styles.actionsColumn}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(0)}>
              <Text style={styles.secondaryButtonText}>رجوع</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, isVerifying && styles.disabledButton]}
              onPress={handleVerify}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialCommunityIcons name="auto-fix" size={18} color="#fff" />
              )}
              <Text style={styles.primaryButtonText}>
                {isVerifying ? "جارٍ التحقق..." : "بدء التحقق التجريبي"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {electionId && step === 2 ? (
        <View style={styles.card}>
          <View style={styles.rowTitle}>
            <MaterialCommunityIcons name="vote" size={24} color={colors.primaryLight} />
            <Text style={styles.title}>أولًا: التصويت للحزب الوطني</Text>
          </View>

          <Text style={styles.description}>اختر حزبًا وطنيًا واحدًا فقط على مستوى المملكة.</Text>

          {parties.length ? (
            <View style={styles.optionsColumn}>
              {parties.map((party: any) => (
                <TouchableOpacity
                  key={party.id}
                  style={[
                    styles.optionCard,
                    selectedParty === party.id && styles.optionCardSelected
                  ]}
                  onPress={() => setSelectedParty(party.id)}
                >
                  <View style={styles.optionHeader}>
                    <View style={styles.optionCheck}>
                      {selectedParty === party.id ? (
                        <MaterialCommunityIcons name="check-circle" size={22} color={colors.primaryLight} />
                      ) : (
                        <View style={styles.optionCheckEmpty} />
                      )}
                    </View>
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>{party.name}</Text>
                      <Text style={styles.optionSubtitle}>
                        {party.description || "حزب وطني مشارك في هذا الانتخاب"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>لا توجد أحزاب وطنية متاحة لهذا الانتخاب.</Text>
            </View>
          )}

          <View style={styles.actionsColumn}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
              <Text style={styles.secondaryButtonText}>رجوع</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(3)}>
              <Text style={styles.primaryButtonText}>التالي: القائمة المحلية</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {electionId && step === 3 ? (
        <View style={styles.card}>
          <View style={styles.rowTitle}>
            <MaterialCommunityIcons name="format-list-bulleted" size={24} color={colors.primaryLight} />
            <Text style={styles.title}>ثانيًا: اختيار القائمة المحلية</Text>
          </View>

          <Text style={styles.description}>
            تظهر هنا فقط القوائم التابعة لدائرتك: {ballotOptions?.voterDistrict?.name || "غير محددة"}.
          </Text>

          {districtLists.length ? (
            <View style={styles.optionsColumn}>
              {districtLists.map((list: any) => (
                <TouchableOpacity
                  key={list.id}
                  style={[
                    styles.optionCard,
                    selectedDistrictList === list.id && styles.optionCardSelected
                  ]}
                  onPress={() => {
                    setSelectedDistrictList(list.id);
                    setSelectedDistrictCandidates([]);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{list.name}</Text>
                    <Text style={styles.optionSubtitle}>
                      {list.description || "قائمة محلية ضمن دائرة الناخب"}
                    </Text>
                    <Text style={styles.optionMeta}>
                      {list.districtName || "دائرة محلية"} - {list.candidates?.length || 0} مرشح
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>لا توجد قوائم محلية متاحة لدائرتك في هذا الانتخاب.</Text>
            </View>
          )}

          <View style={styles.actionsColumn}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(2)}>
              <Text style={styles.secondaryButtonText}>رجوع</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(4)}>
              <Text style={styles.primaryButtonText}>التالي: مرشحو القائمة</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {electionId && step === 4 ? (
        <View style={styles.card}>
          <View style={styles.rowTitle}>
            <MaterialCommunityIcons name="account-group" size={24} color={colors.primaryLight} />
            <Text style={styles.title}>ثالثًا: اختيار مرشحي القائمة</Text>
          </View>

          <Text style={styles.description}>
            يمكنك اختيار {selectionLimit} مرشح كحد أقصى من نفس القائمة فقط.
          </Text>

          <View style={styles.noteCard}>
            <Text style={styles.noteText}>
              القائمة المختارة: {selectedList?.name || "لم يتم اختيار قائمة بعد"}
            </Text>
          </View>

          {selectedList?.candidates?.length ? (
            <View style={styles.optionsColumn}>
              {selectedList.candidates.map((candidate: any) => {
                const isSelected = selectedDistrictCandidates.includes(candidate.id);

                return (
                  <TouchableOpacity
                    key={candidate.id}
                    style={[
                      styles.candidateCard,
                      isSelected && styles.optionCardSelected
                    ]}
                    onPress={() => toggleCandidate(candidate.id)}
                  >
                    <View style={styles.candidateBadge}>
                      {isSelected ? (
                        <MaterialCommunityIcons name="check" size={18} color="#fff" />
                      ) : (
                        <Text style={styles.candidateBadgeText}>{candidate.candidateOrder}</Text>
                      )}
                    </View>
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>{candidate.fullName}</Text>
                      <Text style={styles.optionSubtitle}>
                        الترتيب {candidate.candidateOrder}
                        {candidate.candidateNumber ? ` - الرقم ${candidate.candidateNumber}` : ""}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>
                لا يوجد مرشحون داخل القائمة المختارة، أو لم يتم اختيار قائمة بعد.
              </Text>
            </View>
          )}

          <View style={styles.actionsColumn}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(3)}>
              <Text style={styles.secondaryButtonText}>رجوع</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(5)}>
              <Text style={styles.primaryButtonText}>مراجعة الاختيارات</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {electionId && step === 5 ? (
        <View style={styles.card}>
          <View style={styles.rowTitle}>
            <MaterialCommunityIcons name="shield-check" size={24} color={colors.primaryLight} />
            <Text style={styles.title}>مراجعة نهائية قبل الإرسال</Text>
          </View>

          <View style={styles.reviewGrid}>
            <View style={styles.reviewBox}>
              <Text style={styles.infoLabel}>الناخب</Text>
              <Text style={styles.reviewValue}>{displayName}</Text>
            </View>
            <View style={styles.reviewBox}>
              <Text style={styles.infoLabel}>الرقم الوطني</Text>
              <Text style={styles.reviewValue}>{normalizedNationalId}</Text>
            </View>
            <View style={styles.reviewBox}>
              <Text style={styles.infoLabel}>الحزب الوطني</Text>
              <Text style={styles.reviewValue}>
                {parties.find((party: any) => party.id === selectedParty)?.name || "غير محدد"}
              </Text>
            </View>
            <View style={styles.reviewBox}>
              <Text style={styles.infoLabel}>القائمة المحلية</Text>
              <Text style={styles.reviewValue}>{selectedList?.name || "غير محددة"}</Text>
            </View>
          </View>

          <View style={styles.reviewCandidatesBox}>
            <Text style={styles.infoLabel}>مرشحو القائمة المحلية المختارون</Text>
            {(selectedList?.candidates || [])
              .filter((candidate: any) => selectedDistrictCandidates.includes(candidate.id))
              .map((candidate: any) => (
                <View key={candidate.id} style={styles.reviewCandidateItem}>
                  <Text style={styles.reviewCandidateName}>{candidate.fullName}</Text>
                </View>
              ))}
          </View>

          <View style={styles.actionsColumn}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(4)}>
              <Text style={styles.secondaryButtonText}>رجوع</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
              )}
              <Text style={styles.primaryButtonText}>تأكيد وإرسال الصوت</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {electionId && step === 6 ? (
        <View style={[styles.card, styles.successCard]}>
          <View style={styles.successCircle}>
            <MaterialCommunityIcons name="check" size={46} color="#fff" />
          </View>
          <Text style={styles.successTitle}>تم تسجيل صوتك بنجاح</Text>
          <Text style={styles.successDescription}>
            شكرًا {displayName}. تم حفظ الصوت بشكل مجهول وربط الجلسة فقط بمعاملة التصويت.
          </Text>
          <TouchableOpacity
            style={styles.resultsButton}
            onPress={() =>
              router.push({
                pathname: "/(voter)/results",
                params: electionId ? { electionId } : undefined
              })
            }
          >
            <MaterialCommunityIcons name="chart-bar" size={18} color={colors.primaryLight} />
            <Text style={styles.resultsButtonText}>عرض النتائج</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 14
  },
  stepperCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border
  },
  stepperScroll: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
    flexDirection: "row"
  },
  stepItem: {
    width: 72,
    alignItems: "center",
    gap: 6
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  stepCircleDone: {
    backgroundColor: colors.success,
    borderColor: colors.success
  },
  stepNumber: {
    color: colors.textMuted,
    fontWeight: "700",
    fontSize: 12
  },
  stepNumberActive: {
    color: "#fff"
  },
  stepLabel: {
    color: colors.textMuted,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 16
  },
  stepLabelActive: {
    color: colors.primaryLight,
    fontWeight: "700"
  },
  stepLabelDone: {
    color: colors.success
  },
  messageBanner: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.success + "44",
    backgroundColor: colors.successBg
  },
  messageText: {
    color: colors.success,
    flex: 1,
    textAlign: "right",
    lineHeight: 20
  },
  errorBanner: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.error + "44",
    backgroundColor: colors.errorBg
  },
  errorText: {
    color: colors.error,
    flex: 1,
    textAlign: "right",
    lineHeight: 20
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  rowTitle: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10
  },
  title: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 18,
    textAlign: "right",
    flex: 1
  },
  description: {
    color: colors.textSoft,
    textAlign: "right",
    lineHeight: 22
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 18,
    flexDirection: "row-reverse",
    gap: 14
  },
  heroText: {
    flex: 1,
    alignItems: "flex-end",
    gap: 6
  },
  heroKicker: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "700"
  },
  heroName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900"
  },
  heroDescription: {
    color: "rgba(255,255,255,0.88)",
    lineHeight: 20,
    textAlign: "right"
  },
  heroMeta: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "right"
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)"
  },
  infoGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10
  },
  infoBox: {
    width: "47%",
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "flex-end",
    gap: 6
  },
  infoBoxWide: {
    width: "100%"
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700"
  },
  infoValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right"
  },
  infoMono: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 2
  },
  infoStatus: {
    color: colors.primaryLight,
    fontSize: 16,
    fontWeight: "800"
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18
  },
  submitButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800"
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18
  },
  secondaryButtonText: {
    color: colors.textSoft,
    fontSize: 15,
    fontWeight: "700"
  },
  disabledButton: {
    opacity: 0.6
  },
  actionsColumn: {
    gap: 10
  },
  faceCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  faceLabel: {
    color: colors.text,
    fontWeight: "700",
    textAlign: "right",
    alignSelf: "flex-end"
  },
  faceCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary
  },
  faceName: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16
  },
  faceNote: {
    color: colors.textMuted,
    textAlign: "center"
  },
  noteCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.success + "44",
    backgroundColor: colors.successBg
  },
  noteText: {
    color: colors.success,
    fontWeight: "700",
    textAlign: "right",
    lineHeight: 20
  },
  scoreCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundCard
  },
  scoreText: {
    color: colors.text,
    fontWeight: "700",
    textAlign: "right"
  },
  optionsColumn: {
    gap: 10
  },
  optionCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  optionCardSelected: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.primaryGlow
  },
  optionHeader: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 12
  },
  optionCheck: {
    marginTop: 2
  },
  optionCheckEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border
  },
  optionText: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4
  },
  optionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right"
  },
  optionSubtitle: {
    color: colors.textMuted,
    textAlign: "right",
    lineHeight: 18
  },
  optionMeta: {
    color: colors.textSoft,
    textAlign: "right",
    fontSize: 12
  },
  warningCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.warning + "44",
    backgroundColor: colors.warningBg
  },
  warningText: {
    color: colors.warning,
    fontWeight: "700",
    textAlign: "right"
  },
  candidateCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12
  },
  candidateBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary,
    flexShrink: 0
  },
  candidateBadgeText: {
    color: "#fff",
    fontWeight: "800"
  },
  reviewGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10
  },
  reviewBox: {
    width: "47%",
    backgroundColor: colors.backgroundCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "flex-end",
    gap: 6
  },
  reviewValue: {
    color: colors.text,
    fontWeight: "800",
    textAlign: "right"
  },
  reviewCandidatesBox: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8
  },
  reviewCandidateItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  reviewCandidateName: {
    color: colors.text,
    textAlign: "right",
    fontWeight: "700"
  },
  successCard: {
    alignItems: "center"
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.success
  },
  successTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center"
  },
  successDescription: {
    color: colors.textSoft,
    textAlign: "center",
    lineHeight: 22
  },
  resultsButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    backgroundColor: colors.primaryGlow,
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18
  },
  resultsButtonText: {
    color: colors.primaryLight,
    fontWeight: "800",
    fontSize: 15
  }
});
