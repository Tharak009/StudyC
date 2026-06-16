import { RESOURCE_CATEGORIES } from "../types/resource";

interface CategoryFilterProps {
  selected: string;
  onChange: (category: string) => void;
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
          !selected
            ? "bg-slate-950 text-white dark:bg-white dark:text-ink-950"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.1]"
        }`}
        type="button"
        onClick={() => onChange("")}
      >
        All
      </button>
      {RESOURCE_CATEGORIES.map((category) => (
        <button
          key={category}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            selected === category
              ? "bg-slate-950 text-white dark:bg-white dark:text-ink-950"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.1]"
          }`}
          type="button"
          onClick={() => onChange(selected === category ? "" : category)}
        >
          {category.replace(/_/g, " ")}
        </button>
      ))}
    </div>
  );
}
