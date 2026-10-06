import { useState } from "react";
import { X, MapPin, Send, Plus, BookOpen, FlaskConical, Coffee, Building2, Dumbbell } from "lucide-react";
import type { LocationPayload } from "../../../types/chat";

interface ShareLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShareLocation: (location: LocationPayload) => void;
}

const PRESET_LOCATIONS: LocationPayload[] = [
  {
    name: "Central Campus Library",
    building: "Academic Block A",
    room: "2nd Floor Silent Zone",
    category: "LIBRARY",
    latitude: 12.9716,
    longitude: 77.5946,
    details: "High-speed WiFi, silent study cubicles, reference books."
  },
  {
    name: "Alan Turing Computing Lab",
    building: "Computer Science Center",
    room: "Lab 304",
    category: "LAB",
    latitude: 12.9721,
    longitude: 77.5952,
    details: "Linux workstations, GPU clusters, dual monitors."
  },
  {
    name: "Central Food Court & Café",
    building: "Student Activity Center",
    room: "Ground Floor",
    category: "CAFETERIA",
    latitude: 12.9708,
    longitude: 77.5938,
    details: "Coffee, snacks, group discussions, outdoor seating."
  },
  {
    name: "Aryabhata Seminar Hall",
    building: "Technology Complex",
    room: "Auditorium 1",
    category: "SEMINAR_HALL",
    latitude: 12.973,
    longitude: 77.5961,
    details: "Projector, stage, 250 seating capacity for guest lectures."
  },
  {
    name: "Campus Indoor Sports Complex",
    building: "Recreation Center",
    room: "Court 2",
    category: "SPORTS",
    latitude: 12.9695,
    longitude: 77.593,
    details: "Badminton courts, table tennis, fitness center."
  }
];

export function ShareLocationModal({
  isOpen,
  onClose,
  onShareLocation
}: ShareLocationModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<LocationPayload | null>(PRESET_LOCATIONS[0] || null);
  const [isCustom, setIsCustom] = useState(false);

  const [customName, setCustomName] = useState("");
  const [customBuilding, setCustomBuilding] = useState("");
  const [customRoom, setCustomRoom] = useState("");
  const [customCategory, setCustomCategory] = useState<LocationPayload["category"]>("OTHER");
  const [customDetails, setCustomDetails] = useState("");

  if (!isOpen) return null;

  const handleSend = () => {
    if (isCustom) {
      if (!customName.trim()) return;
      onShareLocation({
        name: customName.trim(),
        building: customBuilding.trim() || undefined,
        room: customRoom.trim() || undefined,
        category: customCategory,
        details: customDetails.trim() || undefined
      });
    } else if (selectedPreset) {
      onShareLocation(selectedPreset);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base">
            <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span>Share Campus Location</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="mt-4 flex rounded-xl bg-muted/40 p-1 border border-border/60">
          <button
            type="button"
            onClick={() => setIsCustom(false)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
              !isCustom
                ? "bg-card text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Popular Campus Spots
          </button>
          <button
            type="button"
            onClick={() => setIsCustom(true)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
              isCustom
                ? "bg-card text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Custom Location
          </button>
        </div>

        {/* Preset List */}
        {!isCustom ? (
          <div className="mt-3 max-h-64 overflow-y-auto space-y-2 pr-1">
            {PRESET_LOCATIONS.map((spot, i) => {
              const isSelected = selectedPreset?.name === spot.name;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedPreset(spot)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {spot.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {spot.building} • {spot.room}
                    </p>
                    {spot.details && (
                      <p className="text-[10px] text-muted-foreground/80 line-clamp-1 mt-0.5">
                        {spot.details}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Custom Location Form */
          <div className="mt-3 space-y-3 max-h-64 overflow-y-auto pr-1">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Spot / Room Name *
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Department Study Room B"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Building
                </label>
                <input
                  type="text"
                  value={customBuilding}
                  onChange={(e) => setCustomBuilding(e.target.value)}
                  placeholder="Block 2"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Room
                </label>
                <input
                  type="text"
                  value={customRoom}
                  onChange={(e) => setCustomRoom(e.target.value)}
                  placeholder="Room 214"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Category
              </label>
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
              >
                <option value="LIBRARY">Library</option>
                <option value="LAB">Lab</option>
                <option value="CAFETERIA">Cafeteria / Food</option>
                <option value="SEMINAR_HALL">Seminar Hall</option>
                <option value="HOSTEL">Hostel</option>
                <option value="SPORTS">Sports & Gym</option>
                <option value="OTHER">Other Campus Spot</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Directions / Notes
              </label>
              <input
                type="text"
                value={customDetails}
                onChange={(e) => setCustomDetails(e.target.value)}
                placeholder="Take stairs next to elevator, second door on left"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-border/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isCustom ? !customName.trim() : !selectedPreset}
            onClick={handleSend}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Share Spot</span>
          </button>
        </div>
      </div>
    </div>
  );
}
