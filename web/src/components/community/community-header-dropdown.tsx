import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Home,
  Users,
  Plus,
  Link as LinkIcon,
  Settings,
  Share2,
  LogOut,
  Archive,
  RotateCcw,
  Trash2,
  FolderPlus
} from "lucide-react";
import type { Community } from "../../types/community";
import { useToastStore } from "../../store/toast.store";

interface CommunityHeaderDropdownProps {
  community: Community;
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
  canManage: boolean;
  onOpenCreateGroup?: () => void;
  onOpenAttachGroup?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
  onLeave?: () => void;
}

export function CommunityHeaderDropdown({
  community,
  isOpen,
  onClose,
  isOwner,
  canManage,
  onOpenCreateGroup,
  onOpenAttachGroup,
  onArchive,
  onRestore,
  onDelete,
  onLeave
}: CommunityHeaderDropdownProps) {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToastStore();

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + `/communities/${community._id}`);
      addToast("Community link copied to clipboard!", "success");
    } catch {
      addToast("Failed to copy link", "error");
    }
    onClose();
  };

  const isArchived = community.status === "ARCHIVED";

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 z-50 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-[#0B132B] animate-scale-up"
      style={{ minWidth: "240px" }}
    >
      <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5">
        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
          {community.name}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
          {community.category} · {community.visibility.toLowerCase()}
        </p>
      </div>

      <div className="py-1 space-y-0.5">
        <button
          type="button"
          onClick={() => {
            navigate(`/communities/${community._id}`);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5 transition-colors"
        >
          <Home size={15} className="text-slate-400" />
          <span>Community Overview</span>
        </button>

        <button
          type="button"
          onClick={() => {
            navigate(`/communities/${community._id}/members`);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5 transition-colors"
        >
          <Users size={15} className="text-slate-400" />
          <span>View Members ({community.memberCount || 1})</span>
        </button>

        <button
          type="button"
          onClick={handleCopyLink}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5 transition-colors"
        >
          <Share2 size={15} className="text-slate-400" />
          <span>Share Community Link</span>
        </button>
      </div>

      {canManage && (
        <div className="pt-1 mt-1 border-t border-slate-100 dark:border-white/5 space-y-0.5">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Administration
          </div>

          <button
            type="button"
            onClick={() => {
              onOpenCreateGroup?.();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1E90FF] hover:bg-[#1E90FF]/10 dark:text-[#1E90FF] dark:hover:bg-[#1E90FF]/15 transition-colors"
          >
            <Plus size={15} />
            <span>Create New Group</span>
          </button>

          {onOpenAttachGroup && (
            <button
              type="button"
              onClick={() => {
                onOpenAttachGroup();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5 transition-colors"
            >
              <FolderPlus size={15} className="text-slate-400" />
              <span>Attach Existing Group</span>
            </button>
          )}

          {isOwner && (
            <button
              type="button"
              onClick={() => {
                navigate(`/communities/${community._id}/edit`);
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5 transition-colors"
            >
              <Settings size={15} className="text-slate-400" />
              <span>Community Settings</span>
            </button>
          )}
        </div>
      )}

      {/* Critical Actions */}
      <div className="pt-1 mt-1 border-t border-slate-100 dark:border-white/5 space-y-0.5">
        {isOwner ? (
          <>
            {isArchived ? (
              <button
                type="button"
                onClick={() => {
                  onRestore?.();
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 transition-colors"
              >
                <RotateCcw size={15} />
                <span>Restore Community</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onArchive?.();
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30 transition-colors"
              >
                <Archive size={15} />
                <span>Archive Community</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onDelete?.();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors"
            >
              <Trash2 size={15} />
              <span>Delete Community</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              onLeave?.();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut size={15} />
            <span>Leave Community</span>
          </button>
        )}
      </div>
    </div>
  );
}
