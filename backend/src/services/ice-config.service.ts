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
      const turnConfig: IceServerConfig = {
        urls: env.TURN_SERVER.trim()
      };
      if (env.TURN_USERNAME) {
        turnConfig.username = env.TURN_USERNAME.trim();
      }
      if (env.TURN_CREDENTIAL) {
        turnConfig.credential = env.TURN_CREDENTIAL.trim();
      }
      servers.push(turnConfig);
    }

    return servers;
  }
}

export const iceConfigService = new IceConfigService();
