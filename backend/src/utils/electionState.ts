interface ElectionStateInput {
  status?: string | null;
  startAt?: string | Date | null;
  endAt?: string | Date | null;
  allowResultsVisibilityBeforeClose?: boolean | null;
}

export function resolveElectionPhase(election?: ElectionStateInput | null) {
  if (!election) return "unknown";

  const status = String(election.status || "").toLowerCase();
  const now = Date.now();
  const startAt = election.startAt ? new Date(election.startAt).getTime() : Number.NaN;
  const endAt = election.endAt ? new Date(election.endAt).getTime() : Number.NaN;

  if (status === "closed" || status === "archived") return "ended";
  if (status === "scheduled") return "upcoming";
  if (!Number.isNaN(startAt) && now < startAt) return "upcoming";
  if (!Number.isNaN(endAt) && now > endAt) return "ended";
  if (status === "active") return "active";

  return status || "unknown";
}

export function isElectionActiveForVoting(election?: ElectionStateInput | null) {
  return resolveElectionPhase(election) === "active";
}

export function canExposeResults(election?: ElectionStateInput | null) {
  const phase = resolveElectionPhase(election);
  return phase === "ended" || (phase === "active" && Boolean(election?.allowResultsVisibilityBeforeClose));
}
