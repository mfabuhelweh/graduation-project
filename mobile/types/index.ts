export type UserRole = "admin" | "voter";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface AuthUser {
  uid: string;
  email: string;
  role: UserRole;
  fullName?: string;
  adminRole?: string;
  nationalId?: string;
  electionId?: string;
  districtId?: string;
  phoneNumber?: string | null;
  status?: string;
  hasVoted?: boolean;
  verifiedFace?: boolean;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface Election {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  startAt: string;
  endAt: string;
  startDate?: string;
  endDate?: string;
  enableParties?: boolean;
  enableDistrictLists?: boolean;
  districtCandidateSelectionCount?: number | null;
  totalNationalPartySeats?: number;
  showTurnoutPublicly?: boolean;
  allowResultsVisibilityBeforeClose?: boolean;
  createdAt?: string;
  updatedAt?: string;
  districtsCount?: number;
  partiesCount?: number;
  districtListsCount?: number;
  votersCount?: number;
  ballotsCount?: number;
}

export interface BallotCandidate {
  id: string;
  fullName: string;
  candidateOrder: number;
  candidateNumber?: number | null;
  gender?: string;
  photoUrl?: string | null;
}

export interface PartyOption {
  id: string;
  name: string;
  code?: string;
  logoUrl?: string | null;
  description?: string | null;
  candidates: BallotCandidate[];
}

export interface DistrictListOption {
  id: string;
  name: string;
  code?: string;
  description?: string | null;
  districtId: string;
  districtName?: string;
  districtCode?: string;
  districtSeatsCount?: number;
  candidates: BallotCandidate[];
}

export interface BallotOptions {
  election: {
    id: string;
    title: string;
    status: string;
    enableParties?: boolean;
    enableDistrictLists?: boolean;
    districtCandidateSelectionCount?: number | null;
    totalNationalPartySeats?: number;
  };
  voterDistrict: {
    id: string;
    name: string;
    code?: string;
    seatsCount?: number;
    voterName?: string;
  } | null;
  districtCandidateSelectionCount: number;
  parties: PartyOption[];
  districtLists: DistrictListOption[];
}

export interface VoterProfile {
  id?: string;
  uid?: string;
  electionId?: string;
  districtId?: string;
  fullName?: string;
  nationalId?: string;
  gender?: string;
  birthDate?: string;
  phoneNumber?: string | null;
  email: string;
  status?: string;
  hasVoted?: boolean;
  verifiedFace?: boolean;
  role: "voter";
  districtName?: string;
  districtCode?: string;
  electionTitle?: string;
}

export interface ElectionDetailsData {
  election: Election;
  ballot: BallotOptions | null;
  profile: VoterProfile | null;
  isAssignedElection: boolean;
  hasVoted: boolean;
  canVote: boolean;
}

export interface VoteRequestPayload {
  electionId: string;
  voterNationalId: string;
  partyId: string;
  districtListId: string;
  districtCandidateIds: string[];
  votingToken?: string;
  biometricToken?: string;
  token?: string;
}

export interface VoteResponse {
  electionId: string;
  ballotId?: string;
}

export interface VotingTokenResponse {
  success: boolean;
  score: number;
  votingToken: string;
  expiresAt: string;
  voterContext?: {
    districtId: string;
    districtName?: string;
    districtCode?: string;
    seatsCount?: number;
  };
}

export interface ResultRow {
  id: string;
  name: string;
  code?: string;
  districtName?: string;
  votes: number;
}

export interface WinnerRow {
  id: string;
  name: string;
  candidateOrder?: number;
  partyName?: string;
  partyVotes?: number;
}

export interface ElectionResults {
  totalVotes: number;
  parties: ResultRow[];
  districtLists: ResultRow[];
  districtCandidates: ResultRow[];
  partyWinners: WinnerRow[];
  analytics: {
    districtTurnout: Array<{
      id: string;
      name: string;
      registeredVoters: number;
      votes: number;
      turnout: number;
    }>;
    demographics: {
      genderAvailable: boolean;
      ageAvailable: boolean;
      genderBreakdown: Array<{ key: string; label: string; count: number }>;
      ageGroups: Array<{ key: string; label: string; count: number }>;
    };
  };
}

export type NotificationType = "info" | "success" | "warning" | "election";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  electionId?: string;
  read?: boolean;
  source?: "api" | "local";
}

export interface ApiClientErrorShape {
  message: string;
  status?: number;
  details?: unknown;
}
