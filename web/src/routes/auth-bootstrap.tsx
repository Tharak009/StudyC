import { useEffect } from "react";
import { authApi } from "../api/auth.api";
import { usersApi } from "../api/users.api";
import { LoadingScreen } from "../components/loading-screen";
import { tokenService } from "../services/token.service";
import { useAuthStore } from "../store/auth.store";

let bootstrapPromise: Promise<void> | null = null;

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const initialized = useAuthStore((state) => state.initialized);

  useEffect(() => {
    const clearSession = useAuthStore.getState().clearSession;
    const setSession = useAuthStore.getState().setSession;

    const unregister = tokenService.onFailure(clearSession);
    if (!bootstrapPromise) {
      bootstrapPromise = (async () => {
        try {
          const { accessToken } = await authApi.refresh();
          tokenService.set(accessToken);
          const user = await usersApi.profile();
          setSession(user, accessToken);
        } catch {
          clearSession();
        }
      })();
    }

    return unregister;
  }, []);

  if (!initialized) return <LoadingScreen />;
  return children;
}
