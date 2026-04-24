import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppPreferences } from "@/hooks/useAppPreferences";
import { fetchBallotOptions, issueVotingToken, submitVote } from "@/services/api";
import type { AppColors } from "@/constants/colors";

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface VotingFlowProps {
  electionId: string | null;
  electionTitle?: string | null;
  voterName?: string | null;
  nationalId?: string | null;
  onVoteSuccess?: () => Promise<void> | void;
}

const votingCopy = {
  ar: {
    steps: ["بيانات الناخب", "التحقق من الهوية", "الحزب الوطني", "القائمة المحلية", "مرشحو القائمة", "المراجعة", "تم"],
    user: "المستخدم",
    errors: {
      noElection: "لا يوجد انتخاب مرتبط بصفحة التصويت حاليًا.",
      badNationalId: "تعذر قراءة الرقم الوطني من جلسة صوتك الحالية.",
      noValidElection: "لا يوجد انتخاب صالح لإرسال التصويت.",
      chooseParty: "اختر حزبًا وطنيًا واحدًا قبل المتابعة.",
      chooseList: "اختر قائمة محلية واحدة من دائرتك.",
      chooseCandidate: "اختر مرشحًا واحدًا على الأقل من القائمة المحلية المحددة.",
      noToken: "رمز الاقتراع غير متاح. أعد التحقق من الهوية أولًا.",
      verifyFailed: "فشل التحقق من الهوية.",
      submitFailed: "تعذر إرسال الصوت. حاول مرة أخرى."
    },
    messages: {
      noOptions: "تم التحقق التجريبي، لكن لا توجد أحزاب أو قوائم محلية جاهزة لهذا الانتخاب.",
      noParties: "تم التحقق التجريبي، لكن لا توجد أحزاب وطنية متاحة في هذا الانتخاب.",
      noLists: "تم التحقق التجريبي، لكن لا توجد قوائم محلية متاحة لدائرتك.",
      verified: "تمت مقارنة صورة الوجه التجريبية مع بيانات الهوية في صوتك وإصدار رمز الاقتراع بنجاح."
    },
    noElectionTitle: "لا يوجد انتخاب متاح الآن",
    noElectionDescription: "سيتم تفعيل التصويت هنا عند ربطك بانتخاب نشط أو مجدول.",
    heroKicker: "مرحبًا بك في التصويت الإلكتروني",
    heroDescription: "تم التعرف عليك من خلال حساب صوتك المرتبط بالرقم الوطني المستخدم في تسجيل الدخول.",
    currentElection: "الانتخاب الحالي",
    accountName: "الاسم المرتبط بالحساب",
    nationalId: "الرقم الوطني",
    sessionStatus: "حالة الجلسة",
    verifiedViaSoutak: "موثقة عبر صوتك",
    continueVerify: "متابعة إلى التحقق من الهوية",
    identityTitle: "التحقق من الهوية",
    identityDescription: "في هذه الخطوة نستخدم التحقق التجريبي لإصدار رمز الاقتراع وربطك بخيارات التصويت الخاصة بانتخابك.",
    faceLabel: "صورة الوجه التجريبية المستخدمة للتحقق",
    faceNote: "مطابقة تجريبية مع بيانات جلسة صوتك الحالية",
    verifyNote: "التحقق هنا تجريبي الآن، ويتم اعتماد إصدار رمز الاقتراع على جلسة صوتك الحالية.",
    scorePrefix: "درجة المطابقة الحالية",
    back: "رجوع",
    verifying: "جارٍ التحقق...",
    startVerify: "بدء التحقق التجريبي",
    partyTitle: "أولًا: التصويت للحزب الوطني",
    partyDescription: "اختر حزبًا وطنيًا واحدًا فقط على مستوى المملكة.",
    defaultPartyDescription: "حزب وطني مشارك في هذا الانتخاب",
    noPartiesWarning: "لا توجد أحزاب وطنية متاحة لهذا الانتخاب.",
    nextLocalList: "التالي: القائمة المحلية",
    listTitle: "ثانيًا: اختيار القائمة المحلية",
    listDescription: "تظهر هنا فقط القوائم التابعة لدائرتك",
    unknownDistrict: "غير محددة",
    defaultListDescription: "قائمة محلية ضمن دائرة الناخب",
    localDistrict: "دائرة محلية",
    candidateUnit: "مرشح",
    noListsWarning: "لا توجد قوائم محلية متاحة لدائرتك في هذا الانتخاب.",
    nextCandidates: "التالي: مرشحو القائمة",
    candidatesTitle: "ثالثًا: اختيار مرشحي القائمة",
    candidatesDescription: "يمكنك اختيار",
    candidatesDescriptionSuffix: "مرشح كحد أقصى من نفس القائمة فقط.",
    selectedList: "القائمة المختارة",
    noListSelected: "لم يتم اختيار قائمة بعد",
    order: "الترتيب",
    number: "الرقم",
    noCandidatesWarning: "لا يوجد مرشحون داخل القائمة المختارة، أو لم يتم اختيار قائمة بعد.",
    reviewChoices: "مراجعة الاختيارات",
    reviewTitle: "مراجعة نهائية قبل الإرسال",
    voter: "الناخب",
    party: "الحزب الوطني",
    list: "القائمة المحلية",
    notSelected: "غير محدد",
    notSelectedFeminine: "غير محددة",
    selectedCandidates: "مرشحو القائمة المحلية المختارون",
    submitVote: "تأكيد وإرسال الصوت",
    successTitle: "تم تسجيل صوتك بنجاح",
    successDescription: "تم حفظ الصوت بشكل مجهول وربط الجلسة فقط بمعاملة التصويت.",
    thankYou: "شكرًا",
    confirmationCode: "رمز تأكيد التصويت",
    confirmationHint: "احتفظ بهذا الرمز لمراجعة حالة العملية لاحقًا",
    viewResults: "عرض النتائج"
  },
  en: {
    steps: ["Voter Info", "Identity Check", "National Party", "Local List", "List Candidates", "Review", "Done"],
    user: "User",
    errors: {
      noElection: "No election is currently linked to this voting page.",
      badNationalId: "Could not read the national ID from your current Soutak session.",
      noValidElection: "There is no valid election for submitting a vote.",
      chooseParty: "Choose one national party before continuing.",
      chooseList: "Choose one local list from your district.",
      chooseCandidate: "Choose at least one candidate from the selected local list.",
      noToken: "The voting token is not available. Verify your identity first.",
      verifyFailed: "Identity verification failed.",
      submitFailed: "Could not submit your vote. Try again."
    },
    messages: {
      noOptions: "Verification succeeded, but no parties or local lists are ready for this election.",
      noParties: "Verification succeeded, but no national parties are available in this election.",
      noLists: "Verification succeeded, but no local lists are available for your district.",
      verified: "The demo face check matched your Soutak identity data and issued a voting token successfully."
    },
    noElectionTitle: "No election available now",
    noElectionDescription: "Voting will be enabled here when an active or scheduled election is linked to you.",
    heroKicker: "Welcome to digital voting",
    heroDescription: "You were identified through your Soutak account linked to the national ID used at sign-in.",
    currentElection: "Current election",
    accountName: "Account name",
    nationalId: "National ID",
    sessionStatus: "Session status",
    verifiedViaSoutak: "Verified through Soutak",
    continueVerify: "Continue to identity check",
    identityTitle: "Identity Check",
    identityDescription: "This step uses demo verification to issue a voting token and connect you to your election options.",
    faceLabel: "Demo face image used for verification",
    faceNote: "Demo match with your current Soutak session data",
    verifyNote: "Verification is currently a demo, and the voting token is issued from your active Soutak session.",
    scorePrefix: "Current match score",
    back: "Back",
    verifying: "Verifying...",
    startVerify: "Start demo verification",
    partyTitle: "First: Vote for the national party",
    partyDescription: "Choose exactly one national party at the kingdom level.",
    defaultPartyDescription: "National party participating in this election",
    noPartiesWarning: "No national parties are available for this election.",
    nextLocalList: "Next: Local list",
    listTitle: "Second: Choose the local list",
    listDescription: "Only lists assigned to your district appear here",
    unknownDistrict: "Not specified",
    defaultListDescription: "Local list in the voter's district",
    localDistrict: "Local district",
    candidateUnit: "candidate",
    noListsWarning: "No local lists are available for your district in this election.",
    nextCandidates: "Next: List candidates",
    candidatesTitle: "Third: Choose list candidates",
    candidatesDescription: "You can choose up to",
    candidatesDescriptionSuffix: "candidate(s) from the same list.",
    selectedList: "Selected list",
    noListSelected: "No list selected yet",
    order: "Order",
    number: "Number",
    noCandidatesWarning: "There are no candidates inside the selected list, or no list has been selected yet.",
    reviewChoices: "Review choices",
    reviewTitle: "Final review before submission",
    voter: "Voter",
    party: "National party",
    list: "Local list",
    notSelected: "Not selected",
    notSelectedFeminine: "Not selected",
    selectedCandidates: "Selected local list candidates",
    submitVote: "Confirm and submit vote",
    successTitle: "Your vote was recorded successfully",
    successDescription: "The vote was saved anonymously and the session was linked only to the voting transaction.",
    thankYou: "Thank you",
    confirmationCode: "Vote confirmation code",
    confirmationHint: "Keep this code to review the operation status later",
    viewResults: "View results"
  }
} as const;

export function VotingFlow({
  electionId,
  electionTitle,
  voterName,
  nationalId,
  onVoteSuccess
}: VotingFlowProps) {
  const queryClient = useQueryClient();
  const { colors, theme, language } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const t = votingCopy[language];
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
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);

  const displayName = voterName?.trim() || t.user;
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
    setConfirmationCode(null);
  }, [electionId]);

  const clearFeedback = () => {
    setMessage(null);
    setError(null);
  };

  const handleVerify = async () => {
    if (!electionId) {
      setError(t.errors.noElection);
      return;
    }

    if (normalizedNationalId.length !== 10) {
      setError(t.errors.badNationalId);
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
        setMessage(t.messages.noOptions);
      } else if (missingParties) {
        setMessage(t.messages.noParties);
      } else if (missingDistrictLists) {
        setMessage(t.messages.noLists);
      } else {
        setMessage(t.messages.verified);
      }

      setStep(2);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : t.errors.verifyFailed);
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
      setError(t.errors.noValidElection);
      return;
    }

    if (!selectedParty) {
      setError(t.errors.chooseParty);
      return;
    }

    if (!selectedDistrictList) {
      setError(t.errors.chooseList);
      return;
    }

    if (!selectedDistrictCandidates.length) {
      setError(t.errors.chooseCandidate);
      return;
    }

    if (!votingToken) {
      setError(t.errors.noToken);
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
      setConfirmationCode(buildConfirmationCode(electionId, votingToken));
      setStep(6);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.errors.submitFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.stepperCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepperScroll}>
          {t.steps.map((label, index) => (
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
          <Text style={styles.title}>{t.noElectionTitle}</Text>
          <Text style={styles.description}>{t.noElectionDescription}</Text>
        </View>
      ) : null}

      {electionId && step === 0 ? (
        <View style={styles.card}>
          <View style={styles.heroCard}>
            <View style={styles.heroText}>
              <Text style={styles.heroKicker}>{t.heroKicker}</Text>
              <Text style={styles.heroName}>{displayName}</Text>
              <Text style={styles.heroDescription}>
                {t.heroDescription}
              </Text>
              {electionTitle ? <Text style={styles.heroMeta}>{t.currentElection}: {electionTitle}</Text> : null}
            </View>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="badge-account" size={28} color="#fff" />
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>{t.accountName}</Text>
              <Text style={styles.infoValue}>{displayName}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>{t.nationalId}</Text>
              <Text style={styles.infoMono}>{normalizedNationalId || "—"}</Text>
            </View>
            <View style={[styles.infoBox, styles.infoBoxWide]}>
              <Text style={styles.infoLabel}>{t.sessionStatus}</Text>
              <Text style={styles.infoStatus}>{t.verifiedViaSoutak}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              clearFeedback();
              setStep(1);
            }}
          >
            <Text style={styles.primaryButtonText}>{t.continueVerify}</Text>
            <MaterialCommunityIcons name="arrow-left" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : null}

      {electionId && step === 1 ? (
        <View style={styles.card}>
          <View style={styles.rowTitle}>
            <MaterialCommunityIcons name="fingerprint" size={24} color={colors.primaryLight} />
            <Text style={styles.title}>{t.identityTitle}</Text>
          </View>

          <Text style={styles.description}>
            {t.identityDescription}
          </Text>

          <View style={styles.faceCard}>
            <Text style={styles.faceLabel}>{t.faceLabel}</Text>
            <View style={styles.faceCircle}>
              <View style={styles.scanLine} />
              <MaterialCommunityIcons name="account" size={56} color="#fff" />
            </View>
            <Text style={styles.faceName}>{displayName}</Text>
            <Text style={styles.faceNote}>{t.faceNote}</Text>
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteText}>
              {t.verifyNote}
            </Text>
          </View>

          {verificationScore !== null ? (
            <View style={styles.scoreCard}>
              <Text style={styles.scoreText}>{t.scorePrefix}: {verificationScore}%</Text>
            </View>
          ) : null}

          <View style={styles.actionsColumn}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(0)}>
              <Text style={styles.secondaryButtonText}>{t.back}</Text>
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
                {isVerifying ? t.verifying : t.startVerify}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {electionId && step === 2 ? (
        <View style={[styles.card, styles.reviewCard]}>
          <View style={styles.rowTitle}>
            <MaterialCommunityIcons name="vote" size={24} color={colors.primaryLight} />
            <Text style={styles.title}>{t.partyTitle}</Text>
          </View>

          <Text style={styles.description}>{t.partyDescription}</Text>

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
                    <EntityAvatar
                      styles={styles}
                      colors={colors}
                      type="party"
                      title={party.name}
                      imageUrl={getEntityImage(party, "party")}
                    />
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>{party.name}</Text>
                      <Text style={styles.optionSubtitle}>
                        {party.description || t.defaultPartyDescription}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>{t.noPartiesWarning}</Text>
            </View>
          )}

          <View style={styles.actionsColumn}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
              <Text style={styles.secondaryButtonText}>{t.back}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(3)}>
              <Text style={styles.primaryButtonText}>{t.nextLocalList}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {electionId && step === 3 ? (
        <View style={styles.card}>
          <View style={styles.rowTitle}>
            <MaterialCommunityIcons name="format-list-bulleted" size={24} color={colors.primaryLight} />
            <Text style={styles.title}>{t.listTitle}</Text>
          </View>

          <Text style={styles.description}>
            {t.listDescription}: {ballotOptions?.voterDistrict?.name || t.unknownDistrict}.
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
                  <View style={styles.optionHeader}>
                    <EntityAvatar
                      styles={styles}
                      colors={colors}
                      type="list"
                      title={list.name}
                      imageUrl={getEntityImage(list, "list")}
                    />
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>{list.name}</Text>
                      <Text style={styles.optionSubtitle}>
                        {list.description || t.defaultListDescription}
                      </Text>
                      <Text style={styles.optionMeta}>
                        {list.districtName || t.localDistrict} - {list.candidates?.length || 0} {t.candidateUnit}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>{t.noListsWarning}</Text>
            </View>
          )}

          <View style={styles.actionsColumn}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(2)}>
              <Text style={styles.secondaryButtonText}>{t.back}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(4)}>
              <Text style={styles.primaryButtonText}>{t.nextCandidates}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {electionId && step === 4 ? (
        <View style={styles.card}>
          <View style={styles.rowTitle}>
            <MaterialCommunityIcons name="account-group" size={24} color={colors.primaryLight} />
            <Text style={styles.title}>{t.candidatesTitle}</Text>
          </View>

          <Text style={styles.description}>
            {t.candidatesDescription} {selectionLimit} {t.candidatesDescriptionSuffix}
          </Text>

          <View style={styles.noteCard}>
            <Text style={styles.noteText}>
              {t.selectedList}: {selectedList?.name || t.noListSelected}
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
                    <EntityAvatar
                      styles={styles}
                      colors={colors}
                      type="candidate"
                      title={candidate.fullName}
                      imageUrl={getEntityImage(candidate, "candidate")}
                    />
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
                        {t.order} {candidate.candidateOrder}
                        {candidate.candidateNumber ? ` - ${t.number} ${candidate.candidateNumber}` : ""}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>
                {t.noCandidatesWarning}
              </Text>
            </View>
          )}

          <View style={styles.actionsColumn}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(3)}>
              <Text style={styles.secondaryButtonText}>{t.back}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(5)}>
              <Text style={styles.primaryButtonText}>{t.reviewChoices}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {electionId && step === 5 ? (
        <View style={styles.card}>
          <View style={styles.rowTitle}>
            <MaterialCommunityIcons name="shield-check" size={24} color={colors.primaryLight} />
            <Text style={styles.title}>{t.reviewTitle}</Text>
          </View>

          <View style={styles.reviewGrid}>
            <View style={styles.reviewBox}>
              <Text style={styles.infoLabel}>{t.voter}</Text>
              <Text style={styles.reviewValue}>{displayName}</Text>
            </View>
            <View style={styles.reviewBox}>
              <Text style={styles.infoLabel}>{t.nationalId}</Text>
              <Text style={styles.reviewValue}>{normalizedNationalId}</Text>
            </View>
            <View style={styles.reviewBox}>
              <Text style={styles.infoLabel}>{t.party}</Text>
              <Text style={styles.reviewValue}>
                {parties.find((party: any) => party.id === selectedParty)?.name || t.notSelected}
              </Text>
            </View>
            <View style={styles.reviewBox}>
              <Text style={styles.infoLabel}>{t.list}</Text>
              <Text style={styles.reviewValue}>{selectedList?.name || t.notSelectedFeminine}</Text>
            </View>
          </View>

          <View style={styles.reviewCandidatesBox}>
            <Text style={styles.infoLabel}>{t.selectedCandidates}</Text>
            {(selectedList?.candidates || [])
              .filter((candidate: any) => selectedDistrictCandidates.includes(candidate.id))
              .map((candidate: any) => (
                <View key={candidate.id} style={styles.reviewCandidateItem}>
                  <EntityAvatar
                    styles={styles}
                    colors={colors}
                    type="candidate"
                    title={candidate.fullName}
                    imageUrl={getEntityImage(candidate, "candidate")}
                    compact
                  />
                  <Text style={styles.reviewCandidateName}>{candidate.fullName}</Text>
                </View>
              ))}
          </View>

          <View style={styles.actionsColumn}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(4)}>
              <Text style={styles.secondaryButtonText}>{t.back}</Text>
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
              <Text style={styles.primaryButtonText}>{t.submitVote}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {electionId && step === 6 ? (
        <View style={[styles.card, styles.successCard]}>
          <View style={styles.successCircle}>
            <MaterialCommunityIcons name="check" size={46} color="#fff" />
          </View>
          <Text style={styles.successTitle}>{t.successTitle}</Text>
          <Text style={styles.successDescription}>
            {t.thankYou} {displayName}. {t.successDescription}
          </Text>
          <View style={styles.confirmCodeBox}>
            <Text style={styles.confirmCodeLabel}>{t.confirmationCode}</Text>
            <Text style={styles.confirmCodeValue}>{confirmationCode || "A7-X9-K2-P4"}</Text>
            <Text style={styles.confirmCodeHint}>{t.confirmationHint}</Text>
          </View>
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
            <Text style={styles.resultsButtonText}>{t.viewResults}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function EntityAvatar({
  styles,
  colors,
  type,
  title,
  imageUrl,
  compact = false
}: {
  styles: ReturnType<typeof createStyles>;
  colors: AppColors;
  type: "party" | "list" | "candidate";
  title: string;
  imageUrl?: string | null;
  compact?: boolean;
}) {
  return (
    <View style={[styles.entityAvatar, compact && styles.entityAvatarCompact]}>
      <Image source={{ uri: imageUrl || getGeneratedEntityImage({ name: title }, type) }} style={styles.entityImage} resizeMode="cover" />
    </View>
  );
}

function getEntitySeed(entity: any, type: "party" | "list" | "candidate") {
  return encodeURIComponent(
    `${type}-${entity?.id || entity?.nationalId || entity?.candidateNumber || entity?.code || entity?.name || entity?.fullName || "entity"}`
  );
}

function getGeneratedEntityImage(entity: any, type: "party" | "list" | "candidate") {
  const seed = getEntitySeed(entity, type);

  if (type === "candidate") {
    return `https://i.pravatar.cc/160?u=${seed}`;
  }

  return `https://api.dicebear.com/9.x/shapes/png?seed=${seed}&backgroundColor=ffffff,dbeafe,e0f2fe&radius=8`;
}

function getEntityImage(entity: any, type: "party" | "list" | "candidate") {
  return entity?.photoUrl || entity?.logoUrl || entity?.imageUrl || entity?.avatarUrl || getGeneratedEntityImage(entity, type);
}

function buildConfirmationCode(electionId: string, votingToken: string) {
  const source = `${electionId}-${votingToken}-${Date.now()}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const chars = Array.from({ length: 8 }, (_, index) => alphabet[(hash >> (index * 4)) & 31]);
  return `${chars.slice(0, 2).join("")}-${chars.slice(2, 4).join("")}-${chars.slice(4, 6).join("")}-${chars.slice(6, 8).join("")}`;
}

function createStyles(colors: AppColors, theme: "light" | "dark") {
  const isLight = theme === "light";

  return StyleSheet.create({
  wrapper: {
    gap: 14
  },
  stepperCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isLight ? 0.08 : 0.18,
    shadowRadius: 18,
    elevation: 4
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
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 6
  },
  reviewCard: {
    borderColor: colors.accent,
    shadowColor: colors.primary,
    shadowOpacity: 0.28
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
    backgroundColor: isLight ? colors.primary : colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.success,
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
    borderColor: colors.primary + "66"
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
    backgroundColor: colors.backgroundCard,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8
  },
  scanLine: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.success,
    opacity: 0.82
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
    backgroundColor: colors.primaryGlow,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isLight ? 0.10 : 0.28,
    shadowRadius: 18,
    elevation: 5
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
  entityAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 1,
    flexShrink: 0
  },
  entityAvatarCompact: {
    width: 34,
    height: 34,
    borderRadius: 12
  },
  entityImage: {
    width: "100%",
    height: "100%"
  },
  entityInitials: {
    color: colors.textSoft,
    fontSize: 9,
    fontWeight: "900"
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
    borderColor: colors.border,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10
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
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.42,
    shadowRadius: 24,
    elevation: 10
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
  confirmCodeBox: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.success + "55",
    backgroundColor: isLight ? colors.backgroundCard : "rgba(0, 200, 150, 0.06)",
    padding: 16,
    alignItems: "center",
    gap: 6
  },
  confirmCodeLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  confirmCodeValue: {
    color: colors.success,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 3
  },
  confirmCodeHint: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "center"
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
}
