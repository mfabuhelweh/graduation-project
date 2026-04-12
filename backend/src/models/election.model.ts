export type ElectionStatus = 'draft' | 'scheduled' | 'active' | 'closed' | 'archived';

export interface Election {
  id?: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  status: ElectionStatus;
  enableParties: boolean;
  enableDistrictLists: boolean;
  districtCandidateSelectionCount?: number | null;
  totalNationalPartySeats: number;
  showTurnoutPublicly: boolean;
  allowResultsVisibilityBeforeClose: boolean;
  createdAt?: string;
  updatedAt?: string;
}
