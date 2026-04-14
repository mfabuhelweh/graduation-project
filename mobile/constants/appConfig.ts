function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

const fallbackApiBaseUrl = "http://localhost:3000/api";

export const appConfig = {
  appName: "VoteSecure Voter",
  defaultLocale: "ar-JO",
  defaultDirection: "rtl" as const,
  apiBaseUrl: normalizeBaseUrl(
    process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || fallbackApiBaseUrl
  )
};
