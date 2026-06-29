export const env = {
  API_URL: __DEV__ ? "http://localhost:5000" : "https://api.studyconnect.edu",
  SOCKET_URL: __DEV__ ? "http://localhost:5000" : "https://api.studyconnect.edu",
  IS_DEV: __DEV__,
};
export type EnvType = typeof env;
