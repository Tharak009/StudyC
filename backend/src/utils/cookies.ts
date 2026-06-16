import type { CookieOptions, Response } from "express";
import { env } from "../config/env.js";

export const REFRESH_COOKIE = "studyconnect_refresh";

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
  path: "/api/auth",
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
};

export const setRefreshCookie = (response: Response, token: string): void => {
  response.cookie(REFRESH_COOKIE, token, cookieOptions);
};

export const clearRefreshCookie = (response: Response): void => {
  response.clearCookie(REFRESH_COOKIE, {
    ...cookieOptions,
    maxAge: undefined
  });
};
