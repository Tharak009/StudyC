import { useState, useEffect } from "react";
import { X, Search, User, Check, Send } from "lucide-react";
import { usersApi } from "../../../api/users.api";
import type { User as UserType } from "../../../types/auth";
import type { ContactPayload } from "../../../types/chat";

interface ShareContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShareContact: (contact: ContactPayload) => void;
}

export function ShareContactModal({
  isOpen,
  onClose,
  onShareContact
}: ShareContactModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserType[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setSelectedUser(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const users = await usersApi.search(query.trim());
        setResults(users || []);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!selectedUser) return;
    onShareContact({
      userId: selectedUser._id,
      fullName: selectedUser.fullName,
      rollNumber: selectedUser.rollNumber,
      avatarUrl: selectedUser.profilePicture,
      major: selectedUser.department,
      year: selectedUser.academicYear ? String(selectedUser.academicYear) : undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base">
            <User className="h-5 w-5 text-primary" />
            <span>Share Campus Contact</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search input */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search classmates by name or roll number..."
            className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Results List */}
        <div className="mt-3 max-h-60 overflow-y-auto space-y-1.5 pr-1">
          {isLoading ? (
            <div className="py-6 text-center text-xs text-muted-foreground">Searching campus directory...</div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              {query.trim() ? "No students found matching your query." : "Type to search campus classmates."}
            </div>
          ) : (
            results.map((student) => {
              const isSelected = selectedUser?._id === student._id;
              return (
                <button
                  key={student._id}
                  type="button"
                  onClick={() => setSelectedUser(student)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40"
                  }`}
                >
                  {student.profilePicture ? (
                    <img
                      src={student.profilePicture}
                      alt={student.fullName}
                      className="h-9 w-9 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm border border-primary/20">
                      {student.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {student.fullName}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {student.department || "Student"} {student.rollNumber ? `• ${student.rollNumber}` : ""}
                    </p>
                  </div>

                  {isSelected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

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
            disabled={!selectedUser}
            onClick={handleSend}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Share Card</span>
          </button>
        </div>
      </div>
    </div>
  );
}
