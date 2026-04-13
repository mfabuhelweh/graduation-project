import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchElections } from "@/services/api";
import { resolveElectionPhase } from "@/utils/helpers";

export function useElections() {
  const query = useQuery({
    queryKey: ["elections"],
    queryFn: fetchElections
  });

  const activeElections = useMemo(
    () =>
      (query.data || []).filter(
        (election) => resolveElectionPhase(election) === "active"
      ),
    [query.data]
  );

  const endedElections = useMemo(
    () =>
      (query.data || []).filter(
        (election) => resolveElectionPhase(election) === "ended"
      ),
    [query.data]
  );

  return {
    ...query,
    elections: query.data || [],
    activeElections,
    endedElections
  };
}
