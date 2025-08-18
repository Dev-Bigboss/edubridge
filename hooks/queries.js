import axiosInstance from "@/lib/utils/axiosInstance";
import { useQuery } from "@tanstack/react-query";

export const useGetStudentProfile = () => {
  return useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/mentee/me/");
      return data;
    },
  });
};


export const useGetStudentSummary = () => {
  return useQuery({
    queryKey: ["studentSummary"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/mentee/summary/");
      return data;
    },
  });
};

export const useGetStudentUpcomingSessions = () => {
  return useQuery({
    queryKey: ["upcomingSessions"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/mentee/upcoming-sessions/");
      return data;
    },
  });
};


export const useGetStudentTutors = () => {
  return useQuery({
    queryKey: ["studentTutors"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/mentee/tutor/");
      return data;
    },
  });
};

export const useGetStudentDetails = (studentId) => {
  return useQuery({
    queryKey: ["studentDetails"],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/mentee/${studentId}/`);
      return data;
    },
  });
};

export const useGetSubjects = () => {
    return useQuery({
        queryKey: ["subjects"],
        queryFn: async () => {
        const { data } = await axiosInstance.get("/subject/");
        return data;
        },
    });
};

export const useGetAllBookings = () => {
  return useQuery({
    queryKey: ["allBookings"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/bookings/");
      return data;
    },
  });
}

//wallet
export const useGetWalletBalanceWithAccountNumber = (accountNumber) => {
  return useQuery({
    queryKey: ["walletBalance", accountNumber],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/wallet/details/${accountNumber}/`);
      return data;
    },
    enabled: !!accountNumber, // Only run if accountNumber is provided
  });
}

export const useGetUserWallet = (userId) => {
  return useQuery({
    queryKey: ["userWallet", userId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/wallet/user/${userId}/`);
      return data;
    },
    enabled: !!userId, // Only run if userId is provided
  });
}

export const useGetWalletTransactions = (accountNumber) => {
  return useQuery({
    queryKey: ["walletTransactions", accountNumber],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/wallet/transactions/${accountNumber}/`);
      return data;
    },
    enabled: !!accountNumber, // Only run if accountNumber is provided
  });
};


//Tutors

export const useGetTutorProfile = () => {
  return useQuery({
    queryKey: ["tutorProfile"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/mentor/me/");
      return data;
    },
  });
};

export const useGetTutorUpcomingSessions = () => {
  return useQuery({
    queryKey: ["tutorUpcomingSessions"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/mentor/upcoming-sessions/");
      return data;
    },
  });
};

export const useGetTutorSummary = () => {
  return useQuery({
    queryKey: ["tutorSummary"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/mentor/summary/");
      return data;
    },
  });
};

export const useGetTutorStudents = () => {
  return useQuery({
    queryKey: ["tutorStudents"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/mentor/student/");
      return data;
    },
  });
};

export const useGetTutorDetails = (tutorId) => {
  return useQuery({
    queryKey: ["tutorDetails", tutorId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/mentor/${tutorId}/`);
      return data;
    },
  });
}; 

export const useGetAllTutorAvailability = () => {
  return useQuery({
    queryKey: ["allTutorAvailability"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/mentor/available/");
      return data;
    },
  });
};

export const useGetAllTutors = () => {
  return useQuery({
    queryKey: ["allTutors"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/mentor/get-all/");
      return data;
    },
  });
};

export const useGetClassRequestsMentor = (mentorId) => {
    return useQuery({
        queryKey: ["classRequests", mentorId],
        queryFn: async () => {
            const { data } = await axiosInstance.get(`/bookings/pending-request?mentorId=${mentorId}`);
            return data;
        },
    });
}