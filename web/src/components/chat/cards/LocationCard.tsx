import type { LocationPayload } from "../../../types/chat";
import { MapPin, Navigation, BookOpen, FlaskConical, Coffee, Building2, Dumbbell } from "lucide-react";

interface LocationCardProps {
  location: LocationPayload;
}

const CATEGORY_ICONS: Record<string, typeof MapPin> = {
  LIBRARY: BookOpen,
  LAB: FlaskConical,
  CAFETERIA: Coffee,
  SEMINAR_HALL: Building2,
  HOSTEL: Building2,
  SPORTS: Dumbbell,
  OTHER: MapPin
};

export function LocationCard({ location }: LocationCardProps) {
  const IconComponent = (location.category && CATEGORY_ICONS[location.category]) || MapPin;

  const handleOpenMap = () => {
    if (location.latitude && location.longitude) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`,
        "_blank",
        "noopener,noreferrer"
      );
    } else {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${location.name} ${location.building || ""}`
        )}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border/80 bg-card/95 p-4 shadow-sm backdrop-blur transition-all hover:border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <MapPin className="h-3.5 w-3.5" />
          <span>Campus Location</span>
        </div>
        {location.category && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            {location.category.replace("_", " ")}
          </span>
        )}
      </div>

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <IconComponent className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate">
            {location.name}
          </h4>
          {(location.building || location.room) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {[location.building, location.room ? `Room ${location.room}` : null]
                .filter(Boolean)
                .join(" • ")}
            </p>
          )}
          {location.details && (
            <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">
              {location.details}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3.5 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground font-mono">
          {location.latitude && location.longitude
            ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
            : "Campus Spot"}
        </span>

        <button
          type="button"
          onClick={handleOpenMap}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/20"
        >
          <Navigation className="h-3.5 w-3.5" />
          <span>View on Map</span>
        </button>
      </div>
    </div>
  );
}
