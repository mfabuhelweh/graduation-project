import { useQuery } from "@tanstack/react-query";
import { fetchBallotOptions, fetchElectionById, fetchVoterProfile } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { canVoteInElection, resolveElectionPhase } from "@/utils/helpers";

export function useElectionDetails(id: string) {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["election-details", id, user?.uid],
    enabled: Boolean(id),
    queryFn: async () => {
      const [election, profile] = await Promise.all([
        fetchElectionById(id),
        user?.role === "voter" ? fetchVoterProfile().catch(() => null) : null
      ]);

      const isAssignedElection = Boolean(
        user?.role === "voter" && user?.electionId === id
      );

      const ballot =
        isAssignedElection && resolveElectionPhase(election) === "active"
          ? await fetchBallotOptions(id).catch(() => null)
          : null;

      const hasVoted = Boolean(profile?.hasVoted);

      return {
        election,
        profile,
        ballot,
        isAssignedElection,
        hasVoted,
        canVote: canVoteInElection(election, hasVoted, isAssignedElection)
      };
    }
  });
}
