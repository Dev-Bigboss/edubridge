import axiosInstance from "@/lib/utils/axiosInstance";
import { useQuery } from "@tanstack/react-query";

export const useGetUserProfile = () => {
  return useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/mentor/get-all/");
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
