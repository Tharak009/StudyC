import { useState, useEffect } from "react";
import {
  X,
  Bold,
  Italic,
  Heading,
  List,
  ListOrdered,
  Link,
  Paperclip,
  Eye,
  Edit2,
  Calendar,
  AlertTriangle,
  Megaphone,
  BookOpen
} from "lucide-react";
import type { Announcement, AnnouncementCategory, AnnouncementAudience, AnnouncementPriority, AnnouncementStatus } from "../types/announcement";

interface AnnouncementEditorProps {
  isOpen: boolean;
  announcement: Announcement | null; // null for Create Mode, non-null for Edit Mode
  onClose: () => void;
  onSave: (ann: Omit<Announcement, "_id" | "createdAt" | "updatedAt" | "viewsCount">) => void;
}

export function AnnouncementEditor({ isOpen, announcement, onClose, onSave }: AnnouncementEditorProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Form Fields State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("GENERAL");
  const [targetAudience, setTargetAudience] = useState<AnnouncementAudience>("ENTIRE_COLLEGE");
  const [targetDepartment, setTargetDepartment] = useState("Computer Science");
  const [targetAcademicYear, setTargetAcademicYear] = useState(1);
  const [targetCommunityName, setTargetCommunityName] = useState("");
  const [priority, setPriority] = useState<AnnouncementPriority>("NORMAL");
  const [publishDate, setPublishDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [attachments, setAttachments] = useState<Array<{ name: string; url: string; size?: string }>>([]);
  const [newAttachmentName, setNewAttachmentName] = useState("");

  // Sync state with selected announcement when editing
  useEffect(() => {
    if (announcement) {
      setTitle(announcement.title);
      setContent(announcement.content);
      setCategory(announcement.category);
      setTargetAudience(announcement.targetAudience);
      setTargetDepartment(announcement.targetDepartment || "Computer Science");
      setTargetAcademicYear(announcement.targetAcademicYear || 1);
      setTargetCommunityName(announcement.targetCommunityName || "");
      setPriority(announcement.priority);
      setPublishDate(announcement.publishDate ? announcement.publishDate.slice(0, 16) : "");
      setExpiryDate(announcement.expiryDate ? announcement.expiryDate.slice(0, 16) : "");
      setAttachments(announcement.attachments || []);
    } else {
      // Reset to defaults for Create Mode
      setTitle("");
      setContent("");
      setCategory("GENERAL");
      setTargetAudience("ENTIRE_COLLEGE");
      setTargetDepartment("Computer Science");
      setTargetAcademicYear(1);
      setTargetCommunityName("");
      setPriority("NORMAL");
      // Set publish date to current local time (rounded to minutes)
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setPublishDate(now.toISOString().slice(0, 16));
      setExpiryDate("");
      setAttachments([]);
    }
    setActiveTab("edit");
  }, [announcement, isOpen]);

  if (!isOpen) return null;

  // Rich Text Editor Toolbar Helpers
  const insertTag = (openTag: string, closeTag: string) => {
    const textarea = document.getElementById("editor-textarea") as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = openTag + selected + closeTag;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setContent(newContent);
    // Refocus and place cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + openTag.length, start + openTag.length + selected.length);
    }, 50);
  };

  const handleAddAttachment = () => {
    if (!newAttachmentName.trim()) return;
    setAttachments([
      ...attachments,
      { name: newAttachmentName.trim(), url: "#", size: "1.2 MB" }
    ]);
    setNewAttachmentName("");
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  const handleFormSubmit = (status: AnnouncementStatus) => {
    if (!title.trim() || !content.trim()) return;

    onSave({
      title: title.trim(),
      content: content.trim(),
      category,
      targetAudience,
      targetDepartment: targetAudience === "DEPARTMENT" ? targetDepartment : undefined,
      targetAcademicYear: targetAudience === "ACADEMIC_YEAR" ? targetAcademicYear : undefined,
      targetCommunityName: targetAudience === "COMMUNITY" ? targetCommunityName : undefined,
      targetCommunityId: targetAudience === "COMMUNITY" ? "c-1" : undefined,
      priority,
      publishDate: new Date(publishDate).toISOString(),
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
      status,
      attachments,
      createdBy: announcement ? announcement.createdBy : "Campus Admin Swetha"
    });
  };

  const getCategoryGradient = (cat: string) => {
    switch (cat) {
      case "EMERGENCY": return "from-rose-500 to-red-600";
      case "PLACEMENT": return "from-amber-500 to-orange-600";
      case "ACADEMIC": return "from-blue-500 to-indigo-600";
      case "EVENTS": return "from-emerald-500 to-teal-600";
      case "CLUBS": return "from-violet-500 to-purple-600";
      default: return "from-slate-500 to-slate-700";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto p-4 bg-slate-950/20 backdrop-blur-[2px]">
      <div className="relative my-8 w-full max-w-2xl transform rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/5 dark:bg-ink-900 overflow-hidden animate-scale-up">
        {/* Editor Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-indigo-650 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
              {announcement ? "Edit Announcement" : "Create Announcement"}
            </h3>
          </div>
          {/* Tabs switch */}
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("edit")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "edit"
                  ? "bg-white dark:bg-ink-950 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Edit2 size={12} />
              Editor
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "preview"
                  ? "bg-white dark:bg-ink-950 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Eye size={12} />
              Preview Mode
            </button>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-950 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {activeTab === "edit" ? (
          /* EDIT PANEL */
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
            {/* Title field */}
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Announcement Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Water Disruption in Hostels / Midterm Schedule Release..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-900 dark:border-white/5 dark:bg-white/[0.02] dark:text-white outline-none focus:border-indigo-500"
              />
            </div>

            {/* Category, Priority, Target selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-350"
                >
                  <option value="GENERAL">General</option>
                  <option value="ACADEMIC">Academic</option>
                  <option value="PLACEMENT">Placement</option>
                  <option value="EVENTS">Events</option>
                  <option value="CLUBS">Clubs</option>
                  <option value="EMERGENCY">Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-350"
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical (Alert banner at top)</option>
                </select>
              </div>
            </div>

            {/* Audience selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Target Audience
                </label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as AnnouncementAudience)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-350"
                >
                  <option value="ENTIRE_COLLEGE">Entire College</option>
                  <option value="DEPARTMENT">Specific Department</option>
                  <option value="ACADEMIC_YEAR">Specific Academic Year</option>
                  <option value="COMMUNITY">Specific Community</option>
                </select>
              </div>

              {/* Dynamic Sub-aud Selector */}
              {targetAudience === "DEPARTMENT" && (
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <select
                    value={targetDepartment}
                    onChange={(e) => setTargetDepartment(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-350"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                  </select>
                </div>
              )}

              {targetAudience === "ACADEMIC_YEAR" && (
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Academic Year
                  </label>
                  <select
                    value={targetAcademicYear}
                    onChange={(e) => setTargetAcademicYear(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-350"
                  >
                    <option value={1}>Year 1</option>
                    <option value={2}>Year 2</option>
                    <option value={3}>Year 3</option>
                    <option value={4}>Year 4</option>
                  </select>
                </div>
              )}

              {targetAudience === "COMMUNITY" && (
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Community Name
                  </label>
                  <input
                    type="text"
                    value={targetCommunityName}
                    onChange={(e) => setTargetCommunityName(e.target.value)}
                    placeholder="e.g. Java Coding Club"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 dark:border-white/5 dark:bg-white/[0.02] dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Date scheduling */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Publish Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-350"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Expiry Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-350"
                />
              </div>
            </div>

            {/* Simulated HTML Text Editor */}
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Announcement Content Description
              </label>

              {/* Editor Toolbar */}
              <div className="flex flex-wrap gap-1 rounded-t-xl border border-slate-200 border-b-0 bg-slate-50 p-2 dark:border-white/5 dark:bg-white/[0.01]">
                <button
                  type="button"
                  onClick={() => insertTag("<strong>", "</strong>")}
                  className="flex size-7 items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-350 cursor-pointer"
                  title="Bold"
                >
                  <Bold size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => insertTag("<em>", "</em>")}
                  className="flex size-7 items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-350 cursor-pointer"
                  title="Italic"
                >
                  <Italic size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => insertTag("<h3>", "</h3>")}
                  className="flex size-7 items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-350 cursor-pointer"
                  title="Heading"
                >
                  <Heading size={13} />
                </button>
                <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1 align-middle" />
                <button
                  type="button"
                  onClick={() => insertTag("<ul><li>", "</li></ul>")}
                  className="flex size-7 items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-350 cursor-pointer"
                  title="Bullet List"
                >
                  <List size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => insertTag("<ol><li>", "</li></ol>")}
                  className="flex size-7 items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-350 cursor-pointer"
                  title="Numbered List"
                >
                  <ListOrdered size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => insertTag('<a href="#" className="text-indigo-600">', "</a>")}
                  className="flex size-7 items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-350 cursor-pointer"
                  title="Hyperlink"
                >
                  <Link size={13} />
                </button>
              </div>

              <textarea
                id="editor-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write description with HTML support or use toolbar helpers above..."
                className="w-full h-32 rounded-b-xl border border-slate-200 p-3 text-xs text-slate-900 dark:border-white/5 dark:bg-white/[0.02] dark:text-white resize-none outline-none focus:border-indigo-500"
              />
            </div>

            {/* Attachments Section */}
            <div className="space-y-2">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Upload Attachments
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAttachmentName}
                  onChange={(e) => setNewAttachmentName(e.target.value)}
                  placeholder="e.g. midterm_exam_schedule.pdf"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 dark:border-white/5 dark:bg-white/[0.02] dark:text-white outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white text-slate-600 px-4 py-2 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  <Paperclip size={13} />
                  Add File
                </button>
              </div>

              {/* Attachments preview list */}
              {attachments.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {attachments.map((attach, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 p-2 dark:bg-black/10 dark:border-white/5 text-xs text-slate-700"
                    >
                      <span className="truncate flex-1 max-w-[180px]">{attach.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="text-rose-500 hover:text-rose-700 font-bold ml-2 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* PREVIEW PANEL */
          <div className="p-6 max-h-[70vh] overflow-y-auto scrollbar-thin space-y-6">
            {/* Banner preview */}
            <div className={`h-24 bg-gradient-to-tr ${getCategoryGradient(category)} rounded-xl flex items-end p-4 text-white font-bold uppercase text-[9px] tracking-wider`}>
              {category} Announcement
            </div>

            {/* Content info */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {title || "Untitled Announcement"}
              </h2>

              <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase pb-3 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>Publishes: {publishDate ? new Date(publishDate).toLocaleDateString() : "Immediate"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle size={12} />
                  <span>Priority: {priority}</span>
                </div>
              </div>

              {/* Formatted body HTML preview */}
              <div
                className="prose prose-sm text-slate-700 dark:text-slate-350 leading-relaxed whitespace-pre-line space-y-2 dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: content || "<p><i>No description content added yet.</i></p>" }}
              />

              {/* Attachments preview */}
              {attachments.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-white/5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Attachments</span>
                  {attachments.map((attach, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-lg bg-slate-50 border p-2 dark:bg-black/15 text-xs text-slate-750">
                      <BookOpen size={13} className="text-indigo-650" />
                      <span className="flex-1 truncate">{attach.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Editor Footer Actions */}
        <div className="border-t border-slate-200 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-ink-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-650 hover:bg-slate-50 dark:border-white/5 dark:text-slate-450 dark:hover:bg-white/[0.03] transition cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => handleFormSubmit("DRAFT")}
              disabled={!title.trim() || !content.trim()}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm cursor-pointer disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={() => {
                // If publishDate is in future, set to SCHEDULED, otherwise PUBLISHED
                const now = new Date().getTime();
                const pubTime = new Date(publishDate).getTime();
                const status = pubTime > now ? "SCHEDULED" : "PUBLISHED";
                handleFormSubmit(status);
              }}
              disabled={!title.trim() || !content.trim()}
              className="rounded-xl bg-indigo-650 hover:opacity-95 text-white px-5 py-2.5 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              {publishDate && new Date(publishDate).getTime() > new Date().getTime()
                ? "Schedule Announcement"
                : "Publish Announcement"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
