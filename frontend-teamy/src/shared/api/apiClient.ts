import axios from "axios";
import { ApiError } from "@/shared/api/apiError";

const DEFAULT_PRODUCTION_API_BASE_URL = "https://teamy.onrender.com";
const DEFAULT_DEVELOPMENT_API_BASE_URL = "http://localhost:8000";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? DEFAULT_PRODUCTION_API_BASE_URL : DEFAULT_DEVELOPMENT_API_BASE_URL);

export const TOKEN_STORAGE_KEY = "teamy_token";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the Bearer token from localStorage on every request.
// This replaces cookie-based auth so it works in all browsers regardless of
// third-party cookie blocking (Firefox ETP, Brave Shields, etc.).
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response;
      const message = (data as { detail?: string })?.detail ?? "Something went wrong";

      if (status === 401) {
        // Lazy-import to avoid circular dependency with authStore
        const { useAuthStore } = await import("@/shared/stores/authStore");
        useAuthStore.getState().clearUser();
      }

      throw new ApiError(message, status);
    }

    throw error;
  },
);

export default apiClient;

