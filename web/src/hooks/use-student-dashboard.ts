import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../api/users.api";

export function useStudentDashboard() {
  return useQuery({
    queryKey: ["student-dashboard"],
    queryFn: () => usersApi.dashboard(),
    refetchInterval: 60_000 // Refetch every minute to keep stats fresh
  });
}
