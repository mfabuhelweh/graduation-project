import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  Button,
  Card,
  Dialog,
  Divider,
  Portal,
  RadioButton,
  Snackbar,
  Text
} from "react-native-paper";
import { AppHeader } from "@/components/AppHeader";
import { CandidateOption } from "@/components/CandidateOption";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/colors";
import { useElectionDetails } from "@/hooks/useElectionDetails";
import { useVote } from "@/hooks/useVote";

export default function VoteScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const electionId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data, isLoading, error, refetch } = useElectionDetails(electionId || "");
  const { submitVote, isSubmitting } = useVote();

  const [selectedParty, setSelectedParty] = useState<string>("");
  const [selectedList, setSelectedList] = useState<string>("");
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const selectedListData = useMemo(
    () => data?.ballot?.districtLists.find((item) => item.id === selectedList),
    [data?.ballot?.districtLists, selectedList]
  );

  if (!electionId) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          title="معرّف الانتخاب غير صالح"
          description="لا يمكن متابعة التصويت بدون انتخاب محدد."
        />
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingSpinner label="جاري تجهيز بطاقة التصويت..." />
      </ScreenContainer>
    );
  }

  if (error || !data) {
    return (
      <ScreenContainer scroll={false}>
        <ErrorMessage
          message={error?.message || "تعذر تحميل بطاقة التصويت."}
          onRetry={() => refetch()}
        />
      </ScreenContainer>
    );
  }

  if (!data.canVote || !data.ballot) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          title="التصويت غير متاح"
          description="إما أن الانتخاب غير نشط، أو أنك صوتت سابقًا، أو أنك تحاول الوصول إلى انتخاب غير مخصص لك."
          icon="shield-lock-outline"
          actionLabel="العودة للتفاصيل"
          onAction={() =>
            router.replace({
              pathname: "/(voter)/election/[id]",
              params: { id: electionId }
            })
          }
        />
      </ScreenContainer>
    );
  }

  const selectionLimit = data.ballot.districtCandidateSelectionCount || 1;

  const toggleCandidate = (candidateId: string) => {
    setSelectedCandidates((current) => {
      if (current.includes(candidateId)) {
        return current.filter((id) => id !== candidateId);
      }

      if (current.length >= selectionLimit) {
        Alert.alert("تنبيه", `يمكنك اختيار ${selectionLimit} مرشح/مرشحين كحد أقصى.`);
        return current;
      }

      return [...current, candidateId];
    });
  };

  const validateBeforeConfirm = () => {
    if (hasSubmitted) {
      Alert.alert("تم إرسال الصوت", "تم تسجيل صوتك بالفعل في هذه الجلسة.");
      return;
    }

    if (!selectedParty) {
      Alert.alert("اختيار غير مكتمل", "يرجى اختيار حزب وطني واحد.");
      return;
    }

    if (!selectedList) {
      Alert.alert("اختيار غير مكتمل", "يرجى اختيار قائمة محلية واحدة.");
      return;
    }

    if (!selectedCandidates.length) {
      Alert.alert("اختيار غير مكتمل", "يرجى اختيار مرشح واحد على الأقل.");
      return;
    }

    setConfirmOpen(true);
  };

  const handleSubmit = async () => {
    try {
      setConfirmOpen(false);
      await submitVote({
        electionId,
        partyId: selectedParty,
        districtListId: selectedList,
        districtCandidateIds: selectedCandidates
      });
      setHasSubmitted(true);
      setSuccessOpen(true);
    } catch (submitError) {
      Alert.alert(
        "تعذر إرسال الصوت",
        submitError instanceof Error ? submitError.message : "حدث خطأ غير متوقع."
      );
    }
  };

  return (
    <ScreenContainer>
      <AppHeader
        title="التصويت الإلكتروني"
        subtitle="اختر الحزب والقائمة والمرشحين، ثم راجع اختيارك قبل الإرسال النهائي."
      />

      <Card style={styles.card}>
        <Card.Content style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            1. الحزب الوطني
          </Text>
          <RadioButton.Group onValueChange={setSelectedParty} value={selectedParty}>
            <View style={styles.optionList}>
              {data.ballot.parties.map((party) => (
                <Card key={party.id} style={styles.optionCard}>
                  <Card.Content style={styles.optionContent}>
                    <RadioButton value={party.id} />
                    <View style={styles.optionTextBlock}>
                      <Text variant="titleSmall" style={styles.optionTitle}>
                        {party.name}
                      </Text>
                      <Text variant="bodySmall" style={styles.optionSubtitle}>
                        {party.description || "حزب وطني مشارك في هذا الانتخاب."}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </View>
          </RadioButton.Group>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            2. القائمة المحلية
          </Text>
          <RadioButton.Group
            onValueChange={(value) => {
              setSelectedList(value);
              setSelectedCandidates([]);
            }}
            value={selectedList}
          >
            <View style={styles.optionList}>
              {data.ballot.districtLists.map((list) => (
                <Card key={list.id} style={styles.optionCard}>
                  <Card.Content style={styles.optionContent}>
                    <RadioButton value={list.id} />
                    <View style={styles.optionTextBlock}>
                      <Text variant="titleSmall" style={styles.optionTitle}>
                        {list.name}
                      </Text>
                      <Text variant="bodySmall" style={styles.optionSubtitle}>
                        {list.districtName || "قائمة محلية"}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </View>
          </RadioButton.Group>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            3. مرشحو القائمة
          </Text>
          <Text variant="bodySmall" style={styles.helperText}>
            الحد الأقصى للاختيار: {selectionLimit}
          </Text>

          <Divider />

          {selectedListData ? (
            <View style={styles.optionList}>
              {selectedListData.candidates.map((candidate) => (
                <CandidateOption
                  key={candidate.id}
                  candidate={candidate}
                  selected={selectedCandidates.includes(candidate.id)}
                  onPress={() => toggleCandidate(candidate.id)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              title="اختر قائمة أولًا"
              description="سيتم إظهار مرشحي القائمة بعد تحديد القائمة المحلية."
              icon="account-group-outline"
            />
          )}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        loading={isSubmitting}
        disabled={isSubmitting || hasSubmitted}
        onPress={validateBeforeConfirm}
        style={styles.submitButton}
      >
        {hasSubmitted ? "تم إرسال الصوت بنجاح" : "مراجعة ثم إرسال الصوت"}
      </Button>

      <Portal>
        <Dialog visible={confirmOpen} onDismiss={() => setConfirmOpen(false)}>
          <Dialog.Title style={styles.dialogTitle}>تأكيد التصويت</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              بعد الإرسال لا يمكن تعديل الاختيارات. هل أنت متأكد من متابعة التصويت؟
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleSubmit}>تأكيد الإرسال</Button>
            <Button onPress={() => setConfirmOpen(false)}>رجوع</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={successOpen}
        onDismiss={() => setSuccessOpen(false)}
        duration={2500}
        action={{
          label: "عرض",
          onPress: () =>
            router.replace({
              pathname: "/(voter)/election/[id]",
              params: { id: electionId }
            })
        }}
      >
        تم تسجيل صوتك بنجاح.
      </Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface
  },
  section: {
    gap: 12
  },
  sectionTitle: {
    textAlign: "right",
    color: colors.text,
    fontWeight: "700"
  },
  helperText: {
    textAlign: "right",
    color: colors.textMuted
  },
  optionList: {
    gap: 10
  },
  optionCard: {
    backgroundColor: colors.surface
  },
  optionContent: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10
  },
  optionTextBlock: {
    flex: 1,
    alignItems: "flex-end"
  },
  optionTitle: {
    textAlign: "right",
    color: colors.text,
    fontWeight: "700"
  },
  optionSubtitle: {
    textAlign: "right",
    color: colors.textMuted
  },
  submitButton: {
    backgroundColor: colors.primary
  },
  dialogTitle: {
    textAlign: "right"
  },
  dialogText: {
    textAlign: "right",
    color: colors.text
  }
});
