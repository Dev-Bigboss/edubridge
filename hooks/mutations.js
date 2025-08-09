import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosInstance from "@/lib/utils/axiosInstance";
import { useAuthStore } from "@/store/zustand";


export const usePostLogin = () => {
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);

  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post("/auth/login/", payload);
      return data;
    },
    onSuccess: (data) => {
      setUser(data.user);
      setToken(data.token);
      toast.success("Login successful");
    },
  });
};

// POST: Signup
export const usePostMenteeSignup = () => {
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);

  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post("/mentee/register/", payload);
      return data;
    },
    onSuccess: (data) => {
      setUser(data.user);
      setToken(data.token);
      toast.success("Signup successful as student");
    },
  });
};
export const usePostMentorSignup = () => {
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);

  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post("/mentor/register/", payload);
      return data;
    },
    onSuccess: (data) => {
      setUser(data.user);
      setToken(data.token);
      toast.success("Signup successful as tutor");
    },
  });
};

// POST: Logout
export const usePostLogout = () => {
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: async () => {
      await axiosInstance.post("/auth/logout/");
    },
    onSuccess: () => {
      logout();
      toast.success("Logged out successfully");
    },
  });
};
