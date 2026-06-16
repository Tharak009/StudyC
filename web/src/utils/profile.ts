export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export const assetUrl = (path?: string): string | undefined => {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  return `${import.meta.env.VITE_API_URL ?? ""}${path}`;
};
