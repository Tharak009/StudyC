import { tokenService } from "../services/token.service";

/**
 * Resolves a media attachment URL, appending authorization token query param
 * when accessing protected media paths (/uploads/direct-messages/ or /uploads/chat/).
 */
export const getMediaUrl = (url?: string): string => {
  if (!url || url === "#") return "";
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;

  const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "").replace(/\/$/, "");
  let fullUrl = url;
  if (url.startsWith("/uploads") && apiBase && !url.startsWith("http")) {
    fullUrl = `${apiBase}${url}`;
  }

  // If already contains a token query param, return as is
  if (fullUrl.includes("token=")) return fullUrl;

  // Protected attachments under /uploads/direct-messages or /uploads/chat
  if (fullUrl.includes("/uploads/direct-messages/") || fullUrl.includes("/uploads/chat/")) {
    const token = tokenService.get();
    if (token) {
      const separator = fullUrl.includes("?") ? "&" : "?";
      return `${fullUrl}${separator}token=${encodeURIComponent(token)}`;
    }
  }

  return fullUrl;
};
