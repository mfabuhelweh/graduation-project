export const LOCAL_SYSTEM_ELECTION_TITLE = 'انتخابات مجلس النواب الأردني 2024 - الدوائر المحلية';

export const VISIBLE_SYSTEM_ELECTION_TITLES = [LOCAL_SYSTEM_ELECTION_TITLE] as const;

export function isVisibleSystemElectionTitle(title?: string | null) {
  return title === LOCAL_SYSTEM_ELECTION_TITLE;
}
