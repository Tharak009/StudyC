const TOKEN_KEY = "studyconnect_access_token";
let accessToken: string | null = null;
let failureListener: (() => void) | null = null;

export const tokenService = {
  get: (): string | null => {
    if (accessToken) return accessToken;
    if (typeof window !== "undefined" && window.localStorage) {
      accessToken = localStorage.getItem(TOKEN_KEY);
    }
    return accessToken;
  },
  set: (token: string | null) => {
    accessToken = token;
    if (typeof window !== "undefined" && window.localStorage) {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  },
  onFailure: (listener: () => void) => {
    failureListener = listener;
    return () => {
      if (failureListener === listener) failureListener = null;
    };
  },
  notifyFailure: () => failureListener?.()
};

