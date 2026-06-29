import { create } from "zustand";
import type { User } from "../types/auth";
import { tokenService } from "../services/token.service";

interface AuthState {
  user: User | null;
  initialized: boolean;
  setSession: (user: User, accessToken: string, refreshToken?: string) => Promise<void>;
  setUser: (user: User) => void;
  setInitialized: (initialized: boolean) => void;
  clearSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,
  setSession: async (user, accessToken, refreshToken) => {
    tokenService.setAccessToken(accessToken);
    if (refreshToken) {
      await tokenService.setRefreshToken(refreshToken);
    }
    set({ user, initialized: true });
  },
  setUser: (user) => set({ user }),
  setInitialized: (initialized) => set({ initialized }),
  clearSession: async () => {
    tokenService.setAccessToken(null);
    await tokenService.setRefreshToken(null);
    set({ user: null, initialized: true });
  },
}));
