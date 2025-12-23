import { create } from "zustand";
import type { User } from "../services/auth";
import { authService } from "../services/auth";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
  // Load from localStorage on initialization
  const storedToken = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");

  return {
    user: storedUser ? JSON.parse(storedUser) : null,
    token: storedToken,
    isAuthenticated: !!storedToken,

    setAuth: (user, token) => {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      set({ user, token, isAuthenticated: true });
    },

    logout: async () => {
      try {
        await authService.logout();
      } catch (error) {
        console.error("Logout error:", error);
      } finally {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        set({ user: null, token: null, isAuthenticated: false });
      }
    },

    checkAuth: async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        set({ user: null, token: null, isAuthenticated: false });
        return;
      }

      try {
        const user = await authService.getMe();
        localStorage.setItem("user", JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
      } catch (error) {
        console.error("Check auth error:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        set({ user: null, token: null, isAuthenticated: false });
      }
    },
  };
});
