import dns from "node:dns/promises";
import { URL } from "node:url";

export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  domain: string;
  siteName?: string;
}

// SSRF IP checks
function isPrivateOrReservedIp(ip: string): boolean {
  // IPv4 loopback & local
  if (ip === "127.0.0.1" || ip === "0.0.0.0" || ip === "localhost") return true;

  // IPv6 loopback
  if (ip === "::1" || ip === "::") return true;

  // Parse IPv4
  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1, 5).map(Number);
    const o1 = octets[0] ?? 0;
    const o2 = octets[1] ?? 0;

    // 10.0.0.0/8
    if (o1 === 10) return true;
    // 172.16.0.0/12
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
    // 192.168.0.0/16
    if (o1 === 192 && o2 === 168) return true;
    // 169.254.0.0/16 (Link-local & AWS/GCP/Azure metadata)
    if (o1 === 169 && o2 === 254) return true;
    // 127.0.0.0/8
    if (o1 === 127) return true;
    // 0.0.0.0/8
    if (o1 === 0) return true;

  }

  // IPv6 Unique Local Address (fc00::/7) or Link-Local (fe80::/10)
  if (/^[fF][cCdDeEfF]/i.test(ip) || /^[fF][eE][89aAbB]/i.test(ip)) {
    return true;
  }

  return false;
}

function sanitizeText(raw?: string): string | undefined {
  if (!raw) return undefined;
  return raw
    .replace(/<[^>]*>?/gm, "") // strip html
    .replace(/[\x00-\x1F\x7F]/g, "") // strip control characters
    .trim()
    .slice(0, 300);
}

export class LinkPreviewService {
  async getPreview(rawUrl: string): Promise<LinkPreviewData | null> {
    try {
      const parsed = new URL(rawUrl);

      // Protocol enforcement
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
      }

      const hostname = parsed.hostname.toLowerCase();

      // Quick hostname checks
      if (
        hostname === "localhost" ||
        hostname.endsWith(".localhost") ||
        hostname.endsWith(".local") ||
        hostname.endsWith(".internal")
      ) {
        return null;
      }

      // Check if hostname is an IP
      if (isPrivateOrReservedIp(hostname)) {
        return null;
      }

      // Resolve DNS to verify it doesn't resolve to private IP (DNS rebinding protection)
      try {
        const lookup = await dns.lookup(hostname);
        if (isPrivateOrReservedIp(lookup.address)) {
          return null;
        }
      } catch {
        return null;
      }

      // Fetch with timeout and max buffer size
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(parsed.href, {
        signal: controller.signal,
        headers: {
          "User-Agent": "StudyConnectBot/1.0 (+https://studyconnect.edu)",
          Accept: "text/html,application/xhtml+xml"
        },
        redirect: "follow"
      });
      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        return {
          url: parsed.href,
          domain: hostname
        };
      }

      // Read max 100KB to prevent memory exhaustion
      const reader = response.body?.getReader();
      if (!reader) {
        return { url: parsed.href, domain: hostname };
      }

      let html = "";
      const maxBytes = 100 * 1024;
      let totalBytes = 0;

      while (totalBytes < maxBytes) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        totalBytes += value.length;
        html += new TextDecoder("utf-8", { fatal: false }).decode(value, { stream: true });
        // Stop early once we've closed the <head> tag
        if (html.includes("</head>")) break;
      }
      reader.cancel().catch(() => {});

      // Extract OpenGraph and standard tags
      const getMeta = (propertyOrName: string): string | undefined => {
        const regex = new RegExp(
          `<meta[^>]*(?:property|name)=["'](?:og:)?${propertyOrName}["'][^>]*content=["']([^"']+)["']`,
          "i"
        );
        const match = regex.exec(html);
        if (match && match[1]) return match[1];

        // Alternative attribute order: content first
        const altRegex = new RegExp(
          `<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:)?${propertyOrName}["']`,
          "i"
        );
        const altMatch = altRegex.exec(html);
        return altMatch ? altMatch[1] : undefined;
      };

      const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
      const rawTitle = getMeta("title") || (titleMatch ? titleMatch[1] : undefined);
      const rawDescription = getMeta("description");
      const rawImage = getMeta("image");
      const rawSiteName = getMeta("site_name");

      let resolvedImageUrl: string | undefined = undefined;
      if (rawImage) {
        try {
          const imgUrl = new URL(rawImage, parsed.href);
          if (imgUrl.protocol === "http:" || imgUrl.protocol === "https:") {
            resolvedImageUrl = imgUrl.href;
          }
        } catch {}
      }

      return {
        url: parsed.href,
        title: sanitizeText(rawTitle),
        description: sanitizeText(rawDescription),
        imageUrl: resolvedImageUrl,
        domain: hostname,
        siteName: sanitizeText(rawSiteName)
      };
    } catch {
      return null;
    }
  }
}

export const linkPreviewService = new LinkPreviewService();
