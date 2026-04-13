import { useQuery } from "@tanstack/react-query";
import { fetchVoterProfile } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

export function useProfile() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["profile", user?.uid],
    enabled: Boolean(user?.role === "voter"),
    queryFn: fetchVoterProfile
  });
}
