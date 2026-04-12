export const FIXED_ELECTION_TITLES = [
  'انتخابات مجلس النواب الأردني 2024 - الدوائر المحلية',
] as const;

export function isFixedElectionTitle(title?: string | null) {
  if (!title) return false;
  return FIXED_ELECTION_TITLES.includes(title as (typeof FIXED_ELECTION_TITLES)[number]);
}

export function filterFixedElections<T extends { title?: string | null }>(elections: T[]) {
  return elections.filter((election) => isFixedElectionTitle(election.title));
}
