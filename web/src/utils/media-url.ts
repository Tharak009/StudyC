import { tokenService } from "../services/token.service";

/**
 * Resolves a media attachment URL, appending authorization token query param
 * when accessing protected media paths (/uploads/direct-messages/ or /uploads/chat/).
 */
export const getMediaUrl = (url?: string): string => {
  if (!url || url === "#") return "";
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;

  // If already contains a token query param, return as is
  if (url.includes("token=")) return url;

  // Protected attachments under /uploads/direct-messages or /uploads/chat
  if (url.includes("/uploads/direct-messages/") || url.includes("/uploads/chat/")) {
    const token = tokenService.get();
    if (token) {
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}token=${encodeURIComponent(token)}`;
    }
  }

  return url;
};
