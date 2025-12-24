import api from "./api";

export interface User {
  _id: string;
  email: string;
  name?: string;
  phone?: string;
  role: string;
}

export interface SignupData {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
  userId?: string;
  otp?: string; // OTP returned in test/development mode
  error?: string; // Error message when success is false
}

export const authService = {
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const response = await api.post("/auth/signup", data);
    return response.data;
  },

  verifyOTP: async (email: string, otp: string): Promise<AuthResponse> => {
    const response = await api.post("/auth/verify-otp", { email, otp });
    return response.data;
  },

  resendOTP: async (email: string): Promise<AuthResponse> => {
    const response = await api.post("/auth/resend-otp", { email });
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post("/auth/login", data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
    localStorage.removeItem("token");
  },

  getMe: async (): Promise<User> => {
    const response = await api.get("/auth/me");
    return response.data.user;
  },
};
