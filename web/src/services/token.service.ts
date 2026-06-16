let accessToken: string | null = null;
let failureListener: (() => void) | null = null;

export const tokenService = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  },
  onFailure: (listener: () => void) => {
    failureListener = listener;
    return () => {
      if (failureListener === listener) failureListener = null;
    };
  },
  notifyFailure: () => failureListener?.()
};
