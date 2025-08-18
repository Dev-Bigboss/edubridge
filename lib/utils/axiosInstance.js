import axios from "axios";
import { toast } from "sonner";
import Cookies from "js-cookie";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api",
});

// Attach token from cookies
axiosInstance.interceptors.request.use(
  (config) => {
    const token = Cookies.get("access_token"); // Get token from cookies
    console.log("Token in request:", token);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response error handler
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.message || "Something went wrong";
    toast.error(message);
    return Promise.reject(error);
  }
);

export default axiosInstance;
