import axios from "axios";
import { useAuthStore } from "@/stores/auth-store";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → clear auth and navigate to login
// We use window.location instead of React Router navigate here because
// this interceptor runs outside the React component tree.
// Only triggers for 401 from actual API calls (not network errors).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const authStore = useAuthStore.getState();
      // Only logout if we actually have a user session (avoid loop on login failures)
      if (authStore.isAuthenticated) {
        console.warn("[api] 401 received — session expired, logging out");
        authStore.logout();
        // Use replace to avoid a back-button loop to the protected page
        window.location.replace("/");
      }
    }
    return Promise.reject(error);
  },
);

export { api };
