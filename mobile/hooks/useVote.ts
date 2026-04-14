import { useMutation, useQueryClient } from "@tanstack/react-query";
import { issueVotingToken, submitVote } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import type { VoteRequestPayload } from "@/types";

export function useVote() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const mutation = useMutation({
    mutationFn: async (payload: Omit<VoteRequestPayload, "voterNationalId">) => {
      if (!user?.nationalId) {
        throw new Error("لا يمكن إتمام التصويت بدون هوية ناخب صالحة.");
      }

      const tokenResponse = await issueVotingToken(payload.electionId, user.nationalId);

      return submitVote({
        ...payload,
        voterNationalId: user.nationalId,
        votingToken: tokenResponse.votingToken
      });
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["election-details", variables.electionId] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["results", variables.electionId] }),
        queryClient.invalidateQueries({ queryKey: ["elections"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] })
      ]);
    }
  });

  return {
    submitVote: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset
  };
}
