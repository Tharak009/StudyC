import { useState, useEffect } from "react";
import { X, Palette, Check } from "lucide-react";

export type WallpaperTheme = "default" | "slate" | "doodle" | "midnight" | "emerald" | "sunset";
export type MessageDensity = "comfortable" | "compact";

export interface ChatCustomizationSettings {
  wallpaper: WallpaperTheme;
  density: MessageDensity;
}

interface ChatCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  scopeId: string; // e.g. communityId or conversationId or "global"
  onApply?: (settings: ChatCustomizationSettings) => void;
}

const WALLPAPERS: Array<{ id: WallpaperTheme; name: string; bgClass: string; borderClass: string }> = [
  { id: "default", name: "Default Neutral", bgClass: "bg-background", borderClass: "border-border" },
  { id: "slate", name: "Slate Minimal", bgClass: "bg-slate-900/90 dark:bg-slate-950", borderClass: "border-slate-800" },
  { id: "doodle", name: "Campus Doodle", bgClass: "bg-radial-[at_25%_25%] from-amber-500/10 via-muted/40 to-background", borderClass: "border-amber-500/30" },
  { id: "midnight", name: "Midnight Nebula", bgClass: "bg-gradient-to-br from-indigo-950/70 via-slate-950 to-purple-950/60", borderClass: "border-indigo-500/30" },
  { id: "emerald", name: "Emerald Focus", bgClass: "bg-gradient-to-br from-emerald-950/60 via-background to-teal-950/50", borderClass: "border-emerald-500/30" },
  { id: "sunset", name: "Sunset Horizon", bgClass: "bg-gradient-to-br from-orange-950/50 via-rose-950/40 to-background", borderClass: "border-rose-500/30" }
];

export function getChatCustomization(scopeId: string): ChatCustomizationSettings {
  try {
    const raw = localStorage.getItem(`studyconnect_chat_custom_${scopeId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { wallpaper: "default", density: "comfortable" };
}

export function saveChatCustomization(scopeId: string, settings: ChatCustomizationSettings) {
  try {
    localStorage.setItem(`studyconnect_chat_custom_${scopeId}`, JSON.stringify(settings));
  } catch {}
}

export function ChatCustomizationModal({
  isOpen,
  onClose,
  scopeId,
  onApply
}: ChatCustomizationModalProps) {
  const [wallpaper, setWallpaper] = useState<WallpaperTheme>("default");
  const [density, setDensity] = useState<MessageDensity>("comfortable");

  useEffect(() => {
    if (isOpen) {
      const current = getChatCustomization(scopeId);
      setWallpaper(current.wallpaper);
      setDensity(current.density);
    }
  }, [isOpen, scopeId]);

  if (!isOpen) return null;

  const handleSave = () => {
    const settings: ChatCustomizationSettings = { wallpaper, density };
    saveChatCustomization(scopeId, settings);
    onApply?.(settings);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-center items-start sm:items-center bg-black/50 p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-y-auto scrollbar-thin rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base">
            <Palette className="h-5 w-5 text-primary" />
            <span>Chat Customization</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-5">
          {/* Wallpaper Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Chat Wallpaper & Theme
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {WALLPAPERS.map((theme) => {
                const isSelected = wallpaper === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setWallpaper(theme.id)}
                    className={`relative flex flex-col overflow-hidden rounded-xl border p-3 text-left transition-all ${
                      isSelected ? "border-primary ring-2 ring-primary/30" : "border-border/70 hover:border-border"
                    } ${theme.bgClass}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-foreground">
                        {theme.name}
                      </span>
                      {isSelected && (
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                      )}
                    </div>
                    <div className="h-6 w-full rounded-md border border-border/40 bg-card/60 backdrop-blur-xs flex items-center px-2">
                      <span className="text-[9px] text-muted-foreground">Chat bubble preview</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Density Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Message Density
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDensity("comfortable")}
                className={`rounded-xl border p-2.5 text-center text-xs font-medium transition-all ${
                  density === "comfortable"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                Comfortable (Default)
              </button>
              <button
                type="button"
                onClick={() => setDensity("compact")}
                className={`rounded-xl border p-2.5 text-center text-xs font-medium transition-all ${
                  density === "compact"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                Compact (Focus Mode)
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-border/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-primary px-5 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
