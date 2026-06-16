import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { authApi, type RegisterPayload } from "../api/auth.api";
import { useAuthStore } from "../store/auth.store";
import { getErrorMessage } from "../utils/errors";

export const useLogin = () => {
  const setSession = useAuthStore((state) => state.setSession);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (result) => {
      setSession(result.user, result.accessToken);
      navigate("/dashboard", { replace: true });
    }
  });
};

export const useRegister = () => {
  const setSession = useAuthStore((state) => state.setSession);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: (result) => {
      setSession(result.user, result.accessToken);
      navigate("/dashboard", { replace: true });
    }
  });
};

export const useLogout = () => {
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearSession();
      queryClient.clear();
      navigate("/login", { replace: true });
    }
  });
};

export { getErrorMessage };
