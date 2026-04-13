export const API_ENDPOINTS = {
  auth: {
    login: "/auth/login",
    me: "/auth/me",
    sanadStart: "/auth/sanad/start",
    sanadVerifyOtp: "/auth/sanad/verify-otp",
    sanadComplete: "/auth/sanad/complete"
  },
  elections: {
    list: "/elections",
    details: (id: string) => `/elections/${id}`,
    ballot: (id: string) => `/elections/${id}/ballot`
  },
  votes: {
    create: "/votes"
  },
  voters: {
    me: "/voters/me",
    verifyFace: "/voters/verify-face",
    legacyByNationalId: (nationalId: string) => `/voters/${nationalId}`
  },
  results: {
    byElection: (electionId: string) => `/results/${electionId}`
  },
  notifications: {
    list: "/notifications"
  }
} as const;
