import { useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ElectionCountdownCard } from "@/components/ElectionCountdownCard";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { VotingFlow } from "@/components/VotingFlow";
import { useAppPreferences } from "@/hooks/useAppPreferences";
import { useAuth } from "@/hooks/useAuth";
import { useElections } from "@/hooks/useElections";

export default function HomeScreen() {
  const { user } = useAuth();
  const { language } = useAppPreferences();
  const { elections, isLoading, error, refetch, isRefetching } = useElections();

  const selectedElection = useMemo(() => {
    if (!elections.length) return null;

    if (user?.electionId) {
      const assigned = elections.find((election) => election.id === user.electionId);
      if (assigned) return assigned;
    }

    return elections.find((election) => ["active", "scheduled"].includes(String(election.status))) || elections[0] || null;
  }, [elections, user?.electionId]);

  if (isLoading) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingSpinner label={language === "ar" ? "جار تجهيز صفحة التصويت..." : "Preparing the voting screen..."} />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer scroll={false}>
        <ErrorMessage message={error.message} onRetry={() => refetch()} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer refreshing={isRefetching} onRefresh={() => void refetch()}>
      <AppHeader
        title={language === "ar" ? "التصويت الإلكتروني" : "Digital Voting"}
        subtitle={
          selectedElection?.title ||
          (language === "ar"
            ? "ستظهر هنا بطاقة التصويت عند توفر انتخاب مرتبط بحسابك."
            : "Your voting card will appear here when an election is linked to your account.")
        }
      />

      <ElectionCountdownCard election={selectedElection} />

      <VotingFlow
        electionId={selectedElection?.id || null}
        electionTitle={selectedElection?.title || null}
        voterName={user?.fullName || null}
        nationalId={user?.nationalId || null}
        onVoteSuccess={async () => {
          await refetch();
        }}
      />
    </ScreenContainer>
  );
}
