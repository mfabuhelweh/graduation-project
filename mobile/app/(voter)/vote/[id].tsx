import { useLocalSearchParams } from "expo-router";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { VotingFlow } from "@/components/VotingFlow";
import { useAuth } from "@/hooks/useAuth";
import { useAppPreferences } from "@/hooks/useAppPreferences";
import { useElectionDetails } from "@/hooks/useElectionDetails";

export default function VoteScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const electionId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();
  const { language } = useAppPreferences();
  const isArabic = language === "ar";
  const { data, isLoading, error, refetch } = useElectionDetails(electionId || "");

  if (!electionId) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          title={isArabic ? "تعذر تحميل صفحة التصويت" : "Could not load voting page"}
          description={isArabic ? "معرف الانتخاب غير موجود في الرابط الحالي." : "The election ID is missing from the current link."}
        />
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingSpinner label={isArabic ? "جارٍ تجهيز بطاقة التصويت..." : "Preparing your ballot..."} />
      </ScreenContainer>
    );
  }

  if (error || !data?.election) {
    return (
      <ScreenContainer scroll={false}>
        <ErrorMessage
          message={error?.message || (isArabic ? "تعذر تحميل بيانات الانتخاب." : "Could not load election data.")}
          onRetry={() => refetch()}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppHeader
        title={isArabic ? "التصويت الإلكتروني" : "Digital Voting"}
        subtitle={data.election.title}
      />

      <VotingFlow
        electionId={data.election.id}
        electionTitle={data.election.title}
        voterName={data.profile?.fullName || user?.fullName || null}
        nationalId={data.profile?.nationalId || user?.nationalId || null}
        onVoteSuccess={async () => {
          await refetch();
        }}
      />
    </ScreenContainer>
  );
}
