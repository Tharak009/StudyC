import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Bookmark,
  Download,
  Trash2,
  ExternalLink,
  Star
} from "lucide-react";
import { Link } from "react-router";
import { useToastStore } from "../../store/toast.store";

export interface BookmarkedResource {
  id: string;
  title: string;
  subjectCode: string;
  uploaderName: string;
  category: string;
  format: string;
  fileSize: string;
  rating: number;
}

function loadSavedBookmarks(): BookmarkedResource[] {
  try {
    const raw = localStorage.getItem("studyconnect_bookmarked_resources");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function BookmarksTab() {
  const { addToast } = useToastStore();
  const [bookmarks, setBookmarks] = useState<BookmarkedResource[]>(loadSavedBookmarks);

  const handleRemove = (id: string, title: string) => {
    setBookmarks((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      try {
        localStorage.setItem("studyconnect_bookmarked_resources", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    addToast(`Removed "${title}" from saved bookmarks.`, "info");
  };

  const handleDownload = (title: string) => {
    addToast(`Downloading ${title}...`, "success");
  };

  return (
    <div className="space-y-6">
      
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
          Saved Study Materials ({bookmarks.length})
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Quick access to lecture slides, question banks, and notes you have bookmarked.
        </p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/20 mb-3">
            <Bookmark size={26} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            No Saved Materials Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">
            Bookmark helpful study guides, syllabus documents, and exam solutions from the Academic Vault for quick revision access.
          </p>
          <Link
            to="/resources"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-xs font-bold text-white shadow-md shadow-[#1E90FF]/25 cursor-pointer"
          >
            <span>Browse Academic Vault</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookmarks.map((b) => (
            <motion.div
              key={b.id}
              whileHover={{ y: -2 }}
              className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/20">
                    {b.subjectCode}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 tabular-nums">
                    <Star size={11} className="fill-current" />
                    <span>{b.rating.toFixed(1)}</span>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 mb-2">
                  {b.title}
                </h4>

                <p className="text-[10px] text-slate-400 tabular-nums mb-4">
                  Uploaded by {b.uploaderName} • {b.fileSize}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/60 flex items-center justify-between">
                <button
                  onClick={() => handleDownload(b.title)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 cursor-pointer transition-all"
                >
                  <Download size={12} />
                  <span>Download</span>
                </button>

                <div className="flex items-center gap-1">
                  <Link
                    to="/resources"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#1E90FF] transition-colors"
                    title="View in Vault"
                  >
                    <ExternalLink size={13} />
                  </Link>
                  <button
                    onClick={() => handleRemove(b.id, b.title)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title="Remove Bookmark"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

    </div>
  );
}

export default BookmarksTab;
