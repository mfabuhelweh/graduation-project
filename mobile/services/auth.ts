import { API_ENDPOINTS } from "@/constants/endpoints";
import { apiClient, extractData, getDemoModeHeaders } from "@/services/api";
import type { AuthSession, AuthUser, ApiEnvelope } from "@/types";

interface LoginResponse {
  token: string;
  user: {
    id?: string;
    email: string;
    role: "admin" | "voter";
    displayName?: string;
    fullName?: string;
    nationalId?: string;
    electionId?: string;
  };
}

interface SanadStartResponse {
  challengeId: string;
  requestReference: string;
  maskedPhoneNumber: string;
  expiresAt: string;
  citizenName: string;
  nationalId: string;
  sandboxOtp?: string;
}

interface SanadVerifyOtpResponse {
  challengeId: string;
  requestReference: string;
  citizenName: string;
  nationalId: string;
  maskedPhoneNumber: string;
  expiresAt: string;
}

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<AuthSession> {
  const response = await apiClient.post<ApiEnvelope<LoginResponse>>(
    API_ENDPOINTS.auth.login,
    {
      email: email.trim().toLowerCase(),
      password
    }
  );

  const result = extractData(response);

  return {
    token: result.token,
    user: {
      uid: result.user.id || result.user.email,
      email: result.user.email,
      role: result.user.role,
      fullName: result.user.fullName || result.user.displayName,
      nationalId: result.user.nationalId,
      electionId: result.user.electionId
    }
  };
}

export async function fetchCurrentUser() {
  const response = await apiClient.get<ApiEnvelope<AuthUser>>(
    API_ENDPOINTS.auth.me
  );

  const data = extractData(response);

  return {
    ...data,
    uid: data.uid || data.email
  };
}

export async function startSanadLogin(nationalId: string, password: string) {
  const response = await apiClient.post<ApiEnvelope<SanadStartResponse>>(
    API_ENDPOINTS.auth.sanadStart,
    {
      nationalId: nationalId.trim(),
      password: password.trim()
    },
    {
      headers: getDemoModeHeaders("sanad-otp")
    }
  );

  return extractData(response);
}

export async function verifySanadOtp(challengeId: string, otp: string) {
  const response = await apiClient.post<ApiEnvelope<SanadVerifyOtpResponse>>(
    API_ENDPOINTS.auth.sanadVerifyOtp,
    {
      challengeId,
      otp: otp.trim()
    }
  );

  return extractData(response);
}

export async function completeSanadLogin(challengeId: string): Promise<AuthSession> {
  const response = await apiClient.post<ApiEnvelope<LoginResponse>>(
    API_ENDPOINTS.auth.sanadComplete,
    {
      challengeId,
      accepted: true
    }
  );

  const result = extractData(response);

  return {
    token: result.token,
    user: {
      uid: result.user.id || result.user.email,
      email: result.user.email,
      role: result.user.role,
      fullName: result.user.fullName || result.user.displayName,
      nationalId: result.user.nationalId,
      electionId: result.user.electionId
    }
  };
}
