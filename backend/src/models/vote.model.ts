export interface VotePayload {
  electionId?: string;
  voterNationalId: string;
  partyId: string;
  districtListId: string;
  districtCandidateIds: string[];
  token?: string;
  votingToken?: string;
  biometricToken?: string;
}
