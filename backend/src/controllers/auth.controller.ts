import type { Request, Response } from "express";
import { authService } from "../services/auth.service.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { clearRefreshCookie, REFRESH_COOKIE, setRefreshCookie } from "../utils/cookies.js";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput
} from "../validators/auth.validator.js";

const metadataFrom = (request: Request) => ({
  userAgent: request.get("user-agent"),
  ipAddress: request.ip
});

const refreshTokenFrom = (request: Request): string | undefined =>
  request.cookies?.[REFRESH_COOKIE] ?? request.body?.refreshToken;

const isMobileClient = (request: Request): boolean =>
  request.get("x-client-platform")?.toLowerCase() === "mobile";

export class AuthController {
  async register(request: Request, response: Response) {
    const result = await authService.register(request.body as RegisterInput, metadataFrom(request));
    setRefreshCookie(response, result.refreshToken);
    response.status(201).json(
      new ApiResponse(
        201,
        {
          user: result.user,
          accessToken: result.accessToken,
          ...(isMobileClient(request) && { refreshToken: result.refreshToken })
        },
        "Account created successfully"
      )
    );
  }

  async login(request: Request, response: Response) {
    const { email, password } = request.body as LoginInput;
    const result = await authService.login(email, password, metadataFrom(request));
    setRefreshCookie(response, result.refreshToken);
    response.json(
      new ApiResponse(
        200,
        {
          user: result.user,
          accessToken: result.accessToken,
          ...(isMobileClient(request) && { refreshToken: result.refreshToken })
        },
        "Signed in successfully"
      )
    );
  }

  async refresh(request: Request, response: Response) {
    const token = refreshTokenFrom(request);
    if (!token) throw new ApiError(401, "Refresh token is required", [], "REFRESH_TOKEN_REQUIRED");
    const result = await authService.refresh(token, metadataFrom(request));
    setRefreshCookie(response, result.refreshToken);
    response.json(
      new ApiResponse(
        200,
        {
          accessToken: result.accessToken,
          ...(isMobileClient(request) && { refreshToken: result.refreshToken })
        },
        "Token refreshed"
      )
    );
  }

  async logout(request: Request, response: Response) {
    await authService.logout(refreshTokenFrom(request));
    clearRefreshCookie(response);
    response.json(new ApiResponse(200, null, "Signed out successfully"));
  }

  async changePassword(request: Request, response: Response) {
    const { currentPassword, newPassword } = request.body as ChangePasswordInput;
    await authService.changePassword(request.user!.id, currentPassword, newPassword);
    clearRefreshCookie(response);
    response.json(new ApiResponse(200, null, "Password changed. Please sign in again."));
  }

  async forgotPassword(request: Request, response: Response) {
    await authService.forgotPassword((request.body as ForgotPasswordInput).email);
    response.json(
      new ApiResponse(200, null, "If an account exists, password reset instructions have been sent.")
    );
  }

  async resetPassword(request: Request, response: Response) {
    const { token, newPassword } = request.body as ResetPasswordInput;
    await authService.resetPassword(token, newPassword);
    clearRefreshCookie(response);
    response.json(new ApiResponse(200, null, "Password reset successfully"));
  }
}

export const authController = new AuthController();
