import { useState, useEffect } from "react";
import { X, Search, FileText, Send, Check } from "lucide-react";
import { resourcesApi } from "../../../api/resources.api";
import type { Resource } from "../../../types/resource";
import type { ResourcePayload } from "../../../types/chat";

interface ShareResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId?: string;
  onShareResource: (resource: ResourcePayload) => void;
}

export function ShareResourceModal({
  isOpen,
  onClose,
  communityId,
  onShareResource
}: ShareResourceModalProps) {
  const [query, setQuery] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResources([]);
      setSelectedResource(null);
      return;
    }

    const fetchResources = async () => {
      setIsLoading(true);
      try {
        const response = communityId
          ? await resourcesApi.listByCommunity(communityId, { page: 1, limit: 30, search: query.trim() || undefined })
          : await resourcesApi.list({ page: 1, limit: 30, search: query.trim() || undefined });
        setResources(response?.items || []);
      } catch {
        setResources([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchResources, 250);
    return () => clearTimeout(timer);
  }, [query, isOpen, communityId]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!selectedResource) return;
    onShareResource({
      resourceId: selectedResource._id,
      title: selectedResource.title,
      subject: (selectedResource as any).subject || selectedResource.category || "Resource",
      fileType: selectedResource.fileType || "pdf",
      fileSize: selectedResource.fileSize,
      downloadUrl: selectedResource.fileUrl,
      uploadedByName: (selectedResource.uploadedBy as any)?.fullName || "Classmate"
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Share Vault Resource</span>
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
            placeholder="Search documents, notes, cheatsheets..."
            className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Resources list */}
        <div className="mt-3 max-h-64 overflow-y-auto space-y-1.5 pr-1">
          {isLoading ? (
            <div className="py-6 text-center text-xs text-muted-foreground">Loading Vault items...</div>
          ) : resources.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              {query.trim() ? "No resources found matching search." : "No documents available in this study circle."}
            </div>
          ) : (
            resources.map((res) => {
              const isSelected = selectedResource?._id === res._id;
              return (
                <button
                  key={res._id}
                  type="button"
                  onClick={() => setSelectedResource(res)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-2.5 text-left transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {res.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {res.category || "Resource"} • {res.fileType?.toUpperCase()}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
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
            disabled={!selectedResource}
            onClick={handleSend}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Share Resource</span>
          </button>
        </div>
      </div>
    </div>
  );
}
