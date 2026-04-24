import axios, { AxiosError, type AxiosResponse } from "axios";
import { appConfig } from "@/constants/appConfig";
import { API_ENDPOINTS } from "@/constants/endpoints";
import { getStoredToken } from "@/services/storage";
import type {
  ApiClientErrorShape,
  ApiEnvelope,
  AppNotification,
  AuthUser,
  BallotOptions,
  Election,
  ElectionResults,
  VoteRequestPayload,
  VoteResponse,
  VotingTokenResponse,
  VoterProfile
} from "@/types";

export class ApiClientError extends Error {
  status?: number;
  details?: unknown;

  constructor({ message, status, details }: ApiClientErrorShape) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.details = details;
  }
}

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

function isPrivateHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

export function getDemoModeHeaders(mode: "sanad-otp" | "face-verification" | "sms") {
  try {
    const hostname = new URL(appConfig.apiBaseUrl).hostname.toLowerCase();
    if (isPrivateHostname(hostname)) {
      return {
        "X-Demo-Mode": mode
      };
    }
  } catch {
    // Ignore malformed local config and fall back to standard API calls.
  }

  return {};
}

apiClient.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiEnvelope<unknown>>) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      "حدث خطأ أثناء الاتصال بالخادم.";

    return Promise.reject(
      new ApiClientError({
        message,
        status: error.response?.status,
        details: error.response?.data
      })
    );
  }
);

export function extractData<T>(response: AxiosResponse<ApiEnvelope<T>>) {
  return response.data.data;
}

export async function fetchElections() {
  const response = await apiClient.get<ApiEnvelope<Election[]>>(
    API_ENDPOINTS.elections.list
  );
  return extractData(response);
}

export async function fetchElectionById(id: string) {
  const response = await apiClient.get<ApiEnvelope<Election>>(
    API_ENDPOINTS.elections.details(id)
  );
  return extractData(response);
}

export async function fetchBallotOptions(electionId: string) {
  const response = await apiClient.get<ApiEnvelope<BallotOptions>>(
    API_ENDPOINTS.elections.ballot(electionId)
  );
  return extractData(response);
}

export async function issueVotingToken(
  electionId: string,
  nationalId: string
): Promise<VotingTokenResponse> {
  const response = await apiClient.post<ApiEnvelope<VotingTokenResponse>>(
    API_ENDPOINTS.voters.verifyFace,
    {
      electionId,
      nationalId
    },
    {
      headers: getDemoModeHeaders("face-verification")
    }
  );
  return extractData(response);
}

export async function submitVote(payload: VoteRequestPayload) {
  const response = await apiClient.post<ApiEnvelope<VoteResponse> | VoteResponse>(
    API_ENDPOINTS.votes.create,
    payload
  );

  const body = response.data;
  if ("success" in body) {
    return body.data;
  }

  return body;
}

export async function fetchResults(electionId: string) {
  const response = await apiClient.get<ApiEnvelope<ElectionResults>>(
    API_ENDPOINTS.results.byElection(electionId)
  );
  return extractData(response);
}

export async function fetchNotifications() {
  const response = await apiClient.get<ApiEnvelope<AppNotification[]>>(
    API_ENDPOINTS.notifications.list
  );
  return extractData(response);
}

export async function fetchVoterProfile() {
  try {
    const response = await apiClient.get<ApiEnvelope<VoterProfile>>(
      API_ENDPOINTS.voters.me
    );
    return extractData(response);
  } catch (error) {
    if (!(error instanceof ApiClientError) || error.status !== 404) {
      throw error;
    }

    const meResponse = await apiClient.get<ApiEnvelope<AuthUser>>(
      API_ENDPOINTS.auth.me
    );
    const me = extractData(meResponse);

    return {
      uid: me.uid,
      email: me.email,
      role: "voter",
      fullName: me.fullName,
      nationalId: me.nationalId,
      electionId: me.electionId,
      districtId: me.districtId,
      phoneNumber: me.phoneNumber ?? null,
      status: me.status,
      hasVoted: me.hasVoted,
      verifiedFace: me.verifiedFace
    };
  }
}
