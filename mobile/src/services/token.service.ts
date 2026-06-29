import * as Keychain from "react-native-keychain";

class TokenService {
  private accessToken: string | null = null;
  private failureListeners: (() => void)[] = [];

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async setRefreshToken(token: string | null): Promise<void> {
    if (token) {
      await Keychain.setGenericPassword("refreshToken", token, {
        service: "com.studyconnect.app.refresh_token",
      });
    } else {
      await Keychain.resetGenericPassword({
        service: "com.studyconnect.app.refresh_token",
      });
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: "com.studyconnect.app.refresh_token",
      });
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch {
      return null;
    }
  }

  onFailure(callback: () => void) {
    this.failureListeners.push(callback);
    return () => {
      this.failureListeners = this.failureListeners.filter((cb) => cb !== callback);
    };
  }

  notifyFailure() {
    this.failureListeners.forEach((callback) => callback());
  }
}

export const tokenService = new TokenService();
