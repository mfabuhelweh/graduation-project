import type { Election } from "@/types";

export type AppLanguage = "ar" | "en";

export function formatDate(date?: string | null, language: AppLanguage = "ar") {
  if (!date) return "-";

  return new Intl.DateTimeFormat(language === "ar" ? "ar-JO" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

export function resolveElectionPhase(election?: Pick<Election, "status" | "startAt" | "endAt"> | null) {
  if (!election) return "unknown";

  const status = String(election.status || "").toLowerCase();
  const now = Date.now();
  const startAt = election.startAt ? new Date(election.startAt).getTime() : 0;
  const endAt = election.endAt ? new Date(election.endAt).getTime() : 0;

  if (status === "closed" || status === "archived") return "ended";
  if (status === "scheduled" || (startAt && now < startAt)) return "upcoming";
  if (status === "active" && (!endAt || now <= endAt)) return "active";
  if (endAt && now > endAt) return "ended";

  return status || "unknown";
}

export function getElectionStatusLabel(
  election?: Pick<Election, "status" | "startAt" | "endAt"> | null,
  language: AppLanguage = "ar"
) {
  const phase = resolveElectionPhase(election);

  if (phase === "active") return language === "ar" ? "نشطة الآن" : "Active now";
  if (phase === "upcoming") return language === "ar" ? "قادمة" : "Upcoming";
  if (phase === "ended") return language === "ar" ? "منتهية" : "Ended";

  return language === "ar" ? "غير محددة" : "Unknown";
}

export function canViewResults(
  election?: Pick<Election, "status" | "startAt" | "endAt" | "allowResultsVisibilityBeforeClose"> | null
) {
  if (!election) return false;

  const phase = resolveElectionPhase(election);
  return phase === "ended" || (phase === "active" && Boolean(election.allowResultsVisibilityBeforeClose));
}

export function canVoteInElection(
  election?: Pick<Election, "status" | "startAt" | "endAt"> | null,
  hasVoted?: boolean,
  isAssignedElection?: boolean
) {
  return Boolean(
    election &&
      resolveElectionPhase(election) === "active" &&
      !hasVoted &&
      isAssignedElection
  );
}

export function calculatePercentage(votes: number, total: number) {
  if (!total) return 0;
  return Math.round((votes / total) * 100);
}

export function sortByNewest<T extends { createdAt?: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return rightTime - leftTime;
  });
}

export function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "حدث خطأ غير متوقع.";
}
