import { create } from "zustand";
import type { User } from "../types/auth";
import { tokenService } from "../services/token.service";
import { authApi, type RegisterPayload } from "../api/auth.api";

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialized: boolean;

  // Actions
  login: (credentials: { email: string; password: string }) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setSession: (user: User, accessToken: string) => void;
  setUser: (user: User) => void;
  setInitialized: (initialized: boolean) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  initialized: false,

  setSession: (user: User, accessToken: string) => {
    tokenService.set(accessToken);
    set({
      user,
      token: accessToken,
      isAuthenticated: true,
      initialized: true,
      isLoading: false
    });
  },

  setUser: (user: User) => {
    set({ user, isAuthenticated: Boolean(user) });
  },

  setInitialized: (initialized: boolean) => {
    set({ initialized });
  },

  clearSession: () => {
    tokenService.set(null);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      initialized: true,
      isLoading: false
    });
  },

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const data = await authApi.login(credentials);
      get().setSession(data.user, data.accessToken);
      return data.user;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (payload) => {
    set({ isLoading: true });
    try {
      const data = await authApi.register(payload);
      get().setSession(data.user, data.accessToken);
      return data.user;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout();
    } catch {
      // Clean up locally even if network fails
    } finally {
      get().clearSession();
    }
  },

  checkAuth: async () => {
    try {
      const data = await authApi.refresh();
      if (data?.accessToken) {
        tokenService.set(data.accessToken);
        set({ token: data.accessToken, isAuthenticated: true, initialized: true });
      } else {
        get().clearSession();
      }
    } catch {
      get().clearSession();
    }
  }
}));

export default useAuthStore;
