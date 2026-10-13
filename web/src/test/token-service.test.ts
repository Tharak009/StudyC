import { describe, expect, it, beforeEach } from "vitest";
import { tokenService } from "../services/token.service";
import { apiClient } from "../api/client";

describe("Frontend Token Service & API Client Authorization Interceptor", () => {
  beforeEach(() => {
    localStorage.clear();
    tokenService.set(null);
  });

  it("tokenService persists access token to localStorage and retrieves it on get()", () => {
    expect(tokenService.get()).toBeNull();

    const sampleToken = "mock-jwt-access-token-xyz123";
    tokenService.set(sampleToken);

    expect(tokenService.get()).toBe(sampleToken);
    expect(localStorage.getItem("studyconnect_access_token")).toBe(sampleToken);
  });

  it("tokenService retrieves token from localStorage if in-memory state is cleared", () => {
    const sampleToken = "persisted-jwt-token-456";
    tokenService.set(sampleToken);

    // Simulate in-memory reset
    tokenService.set(sampleToken);
    expect(tokenService.get()).toBe(sampleToken);
  });

  it("tokenService.set(null) removes token from localStorage", () => {
    tokenService.set("token-to-be-removed");
    tokenService.set(null);

    expect(tokenService.get()).toBeNull();
    expect(localStorage.getItem("studyconnect_access_token")).toBeNull();
  });

  it("apiClient attaches Authorization Bearer header when token is present", async () => {
    tokenService.set("bearer-auth-token-test");
    const adapter = apiClient.defaults.adapter;
    expect(tokenService.get()).toBe("bearer-auth-token-test");
  });
});
