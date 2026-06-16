interface TagFilterProps {
  tags: string[];
  selected: string;
  onChange: (tag: string) => void;
}

export function TagFilter({ tags, selected, onChange }: TagFilterProps) {
  if (tags.length === 0) return null;

  const uniqueTags = [...new Set(tags)];

  return (
    <div className="flex flex-wrap gap-1.5">
      {uniqueTags.map((tag) => (
        <button
          key={tag}
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
            selected === tag
              ? "bg-signal-100 text-signal-700 dark:bg-signal-500/20 dark:text-signal-300"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.1]"
          }`}
          type="button"
          onClick={() => onChange(selected === tag ? "" : tag)}
        >
          #{tag}
        </button>
      ))}
    </div>
  );
}
