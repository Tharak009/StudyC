export function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const label = names.length === 1 ? `${names[0]} is typing` : `${names.slice(0, 2).join(", ")} are typing`;
  return (
    <p className="px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">
      {label}
      <span className="ml-1 inline-flex gap-0.5 align-middle">
        <span className="size-1 animate-pulse rounded-full bg-current" />
        <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
        <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
      </span>
    </p>
  );
}
