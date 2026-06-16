interface OnlineStatusBadgeProps {
  online: boolean;
  lastSeen?: string | null;
  className?: string;
}

export function OnlineStatusBadge({ online, lastSeen, className = "" }: OnlineStatusBadgeProps) {
  const timeAgo = lastSeen ? formatTimeAgo(new Date(lastSeen)) : null;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={`size-2 rounded-full ${
          online ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-600"
        }`}
      />
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {online ? "Online" : timeAgo ? `Last seen ${timeAgo}` : "Offline"}
      </span>
    </span>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
