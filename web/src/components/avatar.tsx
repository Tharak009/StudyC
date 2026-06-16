import { assetUrl, initials } from "../utils/profile";

export function Avatar({
  name,
  src,
  className = "size-10"
}: {
  name: string;
  src?: string;
  className?: string;
}) {
  const resolved = assetUrl(src);

  return resolved ? (
    <img
      src={resolved}
      alt={`${name}'s profile`}
      className={`${className} rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10`}
    />
  ) : (
    <span
      className={`${className} grid place-items-center rounded-full bg-signal-500 text-xs font-bold text-white`}
      aria-label={`${name}'s initials`}
    >
      {initials(name)}
    </span>
  );
}
