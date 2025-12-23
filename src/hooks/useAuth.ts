import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService, type SignupData, type LoginData } from "../services/auth";
import { useAuthStore } from "../store/authStore";

export const useAuth = () => {
  const { isAuthenticated, user, token } = useAuthStore();
  return { isAuthenticated, user, token };
};

export const useCheckAuth = () => {
  const { checkAuth } = useAuthStore();

  return useQuery({
    queryKey: ["auth", "check"],
    queryFn: checkAuth,
    retry: false,
  });
};

export const useSignup = () => {
  return useMutation({
    mutationFn: (data: SignupData) => authService.signup(data),
  });
};

export const useVerifyOTP = () => {
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, otp }: { email: string; otp: string }) =>
      authService.verifyOTP(email, otp),
    onSuccess: (response) => {
      if (response.success && response.token && response.user) {
        setAuth(response.user, response.token);
        queryClient.invalidateQueries({ queryKey: ["auth"] });
      }
    },
  });
};

export const useLogin = () => {
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginData) => authService.login(data),
    onSuccess: (response) => {
      if (response.success && response.token && response.user) {
        setAuth(response.user, response.token);
        queryClient.invalidateQueries({ queryKey: ["auth"] });
      }
    },
  });
};

export const useLogout = () => {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
};
