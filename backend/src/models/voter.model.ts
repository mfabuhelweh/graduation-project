export interface Voter {
  id?: string;
  electionId?: string;
  nationalId: string;
  fullName: string;
  gender?: 'male' | 'female';
  birthDate?: string;
  phoneNumber?: string;
  districtId?: string;
  email?: string;
  idCardImageUrl?: string;
  faceTemplateHash?: string;
  hasVoted?: boolean;
  verifiedFace?: boolean;
  status?: 'eligible' | 'pending_verification' | 'verified' | 'voted' | 'blocked';
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}
