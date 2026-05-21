import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { supabase } from "./supabase";

export function useSchoolName(): string {
  const schoolId = useAuthStore((s) => s.schoolId);
  const { data = "" } = useQuery({
    queryKey: ["school-name", schoolId],
    queryFn: async () => {
      const { data } = await supabase
        .from("schools")
        .select("name")
        .eq("school_id", schoolId!)
        .maybeSingle();
      return data?.name ?? "";
    },
    enabled: !!schoolId,
    staleTime: 30 * 60 * 1000,
  });
  return data;
}
