import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosInstance from "@/lib/utils/axiosInstance";
import { useAuthStore } from "@/store/zustand";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie"; // ✅ Add cookies
import queryClient from "@/lib/queryClient";

// POST: Login
export const usePostLogin = () => {
  const setUser = useAuthStore((state) => state.setUser);
  const router = useRouter();

  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post("/auth/login/", payload);
      return data; // { status, message, data: { access_token, user } }
    },
    onSuccess: (response) => {
      const { access_token, user } = response.data;

      // ✅ Store token in cookies for 7 days
      Cookies.set("access_token", access_token, { expires: 7 });

      // Store user in Zustand
      setUser(user);

      toast.success(response.message || "Login successful");

      // Role-based redirect
      if (user.role === "teacher") {
        router.push("/dashboard");
      } else if (user.role === "student") {
        router.push("/student/dashboard");
      } else if (user.role === "admin") {
        router.push("/admin/dashboard");
      }
    },
  });
};


// Reusable Signup Hook
export const usePostSignup = (endpoint) => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(endpoint, payload);
      return data;
    },
    onSuccess: () => {
      toast.success(
        "Signup successful, check your mail to activate your account"
      );
      router.push("/login");
    },
  });
};

// Shortcut hooks for Mentee & Mentor
export const usePostMenteeSignup = () => usePostSignup("/mentee/register/");
export const usePostMentorSignup = () => usePostSignup("/mentor/register/");

// POST: Logout
export const usePostLogout = () => {
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: async () => {
      await axiosInstance.post("/auth/logout/");
    },
    onSuccess: () => {
      // ✅ Remove token from cookies
      Cookies.remove("access_token");

      logout();
      toast.success("Logged out successfully");
    },
  });
};

//student

export const useUpdateMenteeProfile = () => {
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.put("/mentee/update-profile", payload);
      return data;    
    },
    onSuccess: (response) => {
      toast.success(response.message || "Profile updated successfully");
      queryClient.invalidateQueries(["studentProfile"]);
    },

    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to update profile"
      );
    },
  });
};

export const useCreateBooking = () => {
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post("/bookings", payload);
      return data;
    },
    onSuccess: (response) => {
      toast.success(response.message || "Booking created successfully");
      queryClient.invalidateQueries(["upcomingSessions"]);
      queryClient.invalidateQueries(["studentSummary"]);
      queryClient.invalidateQueries(["studentTutors"]);
      queryClient.invalidateQueries(["tutorUpcomingSessions"]);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to create booking");
    },
  });
};

//Tutors
// UPDATE: Mentor Profile
export const useUpdateMentorProfile = () => {
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.put("/mentor/update-profile", payload);
      return data;
    },
    onSuccess: (response) => {
      toast.success(response.message || "Profile updated successfully");
            queryClient.invalidateQueries(["tutorProfile"]);

    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to update profile"
      );
    },
   
  });
};

export const useAcceptClassRequest = () => {
  return useMutation({
    mutationFn: async (bookingId) => {
      try {
        const { data } = await axiosInstance.patch(
          `/bookings/${bookingId}/`,
          { status: "confirmed" }
        );
        return data;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (response) => {
      toast.success("Class request accepted");
      queryClient.invalidateQueries(["tutorUpcomingSessions"]);
      queryClient.invalidateQueries(["allBookings"]);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to accept class");
    },
  }); 
}

export const useRejectClassRequest = () => {
  return useMutation({
    mutationFn: async (bookingId) => {
      try {
        const { data } = await axiosInstance.patch(
          `/bookings/${bookingId}/`,
          { status: "cancelled" }
        );
        return data;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (response) => {
      toast.success( "Class request rejected");
      queryClient.invalidateQueries(["tutorUpcomingSessions"]);
      queryClient.invalidateQueries(["allBookings"]);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to reject class");
    },
  });
}

export const useWithdrawEarningsRequest = () => {
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post("/wallet/withdraw/request/", payload);
      return data;
    },
    onSuccess: (response) => {
      toast.success(response.message || "Withdrawal request sent successfully");
      queryClient.invalidateQueries(["tutorEarnings"]);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to send withdrawal request");
    },
  });
}

// File Upload


export const useFileUpload = (onProgress) => {
  return useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await axiosInstance.post("/file-upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress?.(percentCompleted);
          }
        },
      });

      return {
        message: data?.msg,
        fileUrl: data?.fileUrl,
      };
    },
  });
};


//wallet

export const useFundWallet = () => {
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post("/wallet/fund", payload);
      return data;
    },
    onSuccess: (response) => {
      toast.success(response.message || "Wallet funded successfully");
      queryClient.invalidateQueries(["walletTransactions"]);
      queryClient.invalidateQueries(["userWallet"]);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to fund wallet");
    },
  });
}

