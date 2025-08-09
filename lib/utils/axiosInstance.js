import axios from "axios";
import { toast } from "sonner";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api",
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.message || "Something went wrong";
    toast.error(message);
    return Promise.reject(error);
  }
);

export default axiosInstance;
