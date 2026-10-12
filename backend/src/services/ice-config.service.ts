import { createHmac } from "node:crypto";
import { env } from "../config/env.js";
import type { IceServerConfig } from "../types/call.types.js";

/**
 * Service to dynamically generate and deliver ICE server configurations (STUN/TURN)
 * to authenticated clients.
 */
export class IceConfigService {
  private defaultStunServers: string[] = [
    "stun:stun.l.google.com:19302",
    "stun:stun1.l.google.com:19302",
    "stun:stun2.l.google.com:19302"
  ];

  /**
   * Returns array of ICE servers formatted for RTCPeerConnection configuration
   */
  public getIceServers(): IceServerConfig[] {
    const servers: IceServerConfig[] = [];

    // Parse configured STUN servers (comma separated)
    const configuredStun = (env.STUN_SERVER || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const stunUrls = configuredStun.length > 0 ? configuredStun : this.defaultStunServers;
    servers.push({ urls: stunUrls });

    // Parse TURN server if configured
    if (env.TURN_SERVER && env.TURN_SERVER.trim().length > 0) {
      // Use coturn's REST authentication format so a long-lived TURN credential
      // is never sent to the browser. Static TURN_USERNAME/TURN_CREDENTIAL
      // values are deliberately not exposed.
      if (!env.TURN_SHARED_SECRET) {
        console.warn("[IceConfigService] TURN_SERVER is configured without TURN_SHARED_SECRET; using STUN only.");
        return servers;
      }
      const expiresAt = Math.floor(Date.now() / 1000) + env.TURN_CREDENTIAL_TTL_SECONDS;
      const username = `${expiresAt}:studyconnect`;
      const credential = createHmac("sha1", env.TURN_SHARED_SECRET).update(username).digest("base64");
      const turnConfig: IceServerConfig = {
        urls: env.TURN_SERVER.split(",").map((url) => url.trim()).filter(Boolean),
        username,
        credential
      };
      servers.push(turnConfig);
    }

    return servers;
  }
}

export const iceConfigService = new IceConfigService();
