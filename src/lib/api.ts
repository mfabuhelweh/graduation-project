const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

function normalizeApiBaseUrl(baseUrl: string) {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

const API_BASE_URL = normalizeApiBaseUrl(
  import.meta.env.DEV ? '/api' : configuredApiBaseUrl || '/api',
);
const DEV_AUTH_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_AUTH === 'true';

const AUTH_TOKEN_KEY = 'vote_secure_auth_token';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ElectionFormPayload {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  status: 'draft' | 'scheduled' | 'active' | 'closed' | 'archived';
  enableParties: boolean;
  enableDistrictLists: boolean;
  districtCandidateSelectionCount?: number | null;
  totalNationalPartySeats: number;
  showTurnoutPublicly: boolean;
  allowResultsVisibilityBeforeClose: boolean;
}

export type ElectionPayload = any;

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

export interface FaceVerificationPayload {
  electionId: string;
  nationalId: string;
  idCardImageUrl?: string;
  liveCaptureImageUrl?: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  nationalId: string;
  electionId: string;
  districtId: string;
  phoneNumber?: string;
}

export interface SanadStartPayload {
  nationalId: string;
}

export interface SanadOtpPayload {
  challengeId: string;
  otp: string;
}

function readStoredToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function storeAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getAuthToken() {
  return readStoredToken();
}

const DEV_ROLE_KEY = 'vote_dev_role';

export function storeDevRole(role: 'admin' | 'voter') {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEV_ROLE_KEY, role);
}

function readDevRole(): string {
  if (typeof window === 'undefined') return 'voter';
  return window.localStorage.getItem(DEV_ROLE_KEY) || 'voter';
}

async function getAuthHeaders(includeJson = true) {
  const headers: Record<string, string> = {};
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  const token = readStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (DEV_AUTH_ENABLED) {
    headers['X-Dev-Auth'] = 'true';
    headers['X-Dev-Role'] = readDevRole();
  }

  return headers;
}

function getNetworkErrorMessage() {
  if (import.meta.env.DEV) {
    return 'Unable to reach the backend API. Make sure the backend server is running.';
  }

  return 'Unable to reach the server. Please try again.';
}

async function apiFetch(path: string, options: RequestInit = {}) {
  try {
    return await fetch(`${API_BASE_URL}${path}`, options);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(getNetworkErrorMessage());
    }

    throw error;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers = await getAuthHeaders(!isFormData);
  const response = await apiFetch(path, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || `API request failed with status ${response.status}`);
  }

  return body as T;
}

export async function fetchElections() {
  const response = await request<ApiResponse<any[]>>('/elections');
  return response.data;
}

export async function fetchAdminElections() {
  const response = await request<ApiResponse<any[]>>('/admin/elections');
  return response.data;
}

export async function createAdminElection(payload: ElectionFormPayload) {
  const response = await request<ApiResponse<any>>('/admin/elections', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function createElection(payload: any) {
  const mappedPayload: ElectionFormPayload = {
    title: payload.title,
    description: payload.description || '',
    startAt: payload.startAt || payload.startDate,
    endAt: payload.endAt || payload.endDate,
    status:
      payload.status === 'Draft'
        ? 'draft'
        : payload.status === 'Voting Open' || payload.status === 'Active'
          ? 'active'
          : payload.status === 'Closed'
            ? 'closed'
            : payload.status === 'Results Published'
              ? 'archived'
              : payload.status || 'draft',
    enableParties: payload.type === 'general' ? true : true,
    enableDistrictLists: payload.type === 'local' ? true : true,
    districtCandidateSelectionCount: 3,
    totalNationalPartySeats: 41,
    showTurnoutPublicly: true,
    allowResultsVisibilityBeforeClose: false,
  };
  return createAdminElection(mappedPayload);
}

export async function updateAdminElection(id: string, payload: ElectionFormPayload) {
  const response = await request<ApiResponse<any>>(`/admin/elections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function deleteAdminElection(id: string) {
  const response = await request<ApiResponse<any>>(`/admin/elections/${id}`, {
    method: 'DELETE',
  });
  return response.data;
}

export async function updateAdminElectionStatus(id: string, status: string) {
  const response = await request<ApiResponse<any>>(`/admin/elections/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return response.data;
}

export async function fetchAdminElectionDetails(id: string) {
  const response = await request<ApiResponse<any>>(`/admin/elections/${id}`);
  return response.data;
}

export async function fetchElectionSetupSummary(id: string) {
  const response = await request<ApiResponse<any>>(`/admin/elections/${id}/setup-summary`);
  return response.data;
}

export async function fetchImportConfig() {
  const response = await request<ApiResponse<any>>('/admin/import/config');
  return response.data;
}

export async function fetchImportBatches(electionId?: string) {
  const query = electionId ? `?electionId=${encodeURIComponent(electionId)}` : '';
  const response = await request<ApiResponse<any>>(`/admin/import/batches${query}`);
  return response.data;
}

export async function uploadImportFile(kind: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await request<ApiResponse<any>>(`/admin/import/${kind}`, {
    method: 'POST',
    body: formData,
  });
  return response.data;
}

export async function deleteImportBatch(batchId: string) {
  const response = await request<ApiResponse<any>>(`/admin/import/batches/${batchId}`, {
    method: 'DELETE',
  });
  return response.data;
}

export async function resetSystemData() {
  const response = await request<ApiResponse<any>>('/admin/system/reset-data', {
    method: 'POST',
  });
  return response.data;
}

export async function castVote(payload: VotePayload) {
  const response = await request<ApiResponse<any>>('/votes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function fetchResults(electionId: string) {
  const response = await request<ApiResponse<any>>(`/results/${electionId}`);
  return response.data;
}

export async function fetchDashboardSummary() {
  const response = await request<ApiResponse<any>>('/dashboard/summary');
  return response.data;
}

export async function fetchAuditLogs() {
  const response = await request<ApiResponse<any[]>>('/audit');
  return response.data;
}

export async function loginWithBackend(email: string, password: string) {
  const response = await apiFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || `API request failed with status ${response.status}`);
  }

  if (body?.data?.token) {
    storeAuthToken(body.data.token);
  }

  return body.data;
}

export async function loginWithGoogleCredential(credential: string) {
  const response = await apiFetch('/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || `API request failed with status ${response.status}`);
  }

  if (body?.data?.token) {
    storeAuthToken(body.data.token);
  }

  return body.data;
}

export async function registerWithBackend(payload: RegisterPayload) {
  const response = await apiFetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || `API request failed with status ${response.status}`);
  }

  if (body?.data?.token) {
    storeAuthToken(body.data.token);
  }

  return body.data;
}

export async function startSanadLogin(payload: SanadStartPayload) {
  const response = await apiFetch('/auth/sanad/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || `API request failed with status ${response.status}`);
  }

  return body.data;
}

export async function verifySanadOtp(payload: SanadOtpPayload) {
  const response = await apiFetch('/auth/sanad/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || `API request failed with status ${response.status}`);
  }

  return body.data;
}

export async function completeSanadLogin(challengeId: string) {
  const response = await apiFetch('/auth/sanad/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, accepted: true }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || `API request failed with status ${response.status}`);
  }

  if (body?.data?.token) {
    storeAuthToken(body.data.token);
  }

  return body.data;
}

export async function fetchMe() {
  const response = await request<ApiResponse<any>>('/auth/me');
  return response.data;
}

export async function verifyFaceAndIssueToken(payload: FaceVerificationPayload) {
  const response = await request<ApiResponse<any>>('/voters/verify-face', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function fetchBallotOptions(electionId: string, voterNationalId?: string) {
  const search = voterNationalId
    ? `?voterNationalId=${encodeURIComponent(voterNationalId)}`
    : '';
  const response = await request<ApiResponse<any>>(`/elections/${electionId}/ballot${search}`);
  return response.data;
}
