import React, { useState, useMemo } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Sparkles,
  Users,
  MessageSquare,
  FolderArchive,
  ShieldCheck,
  Settings as SettingsIcon,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Check,
  Copy,
  Send,
  Mail,
  AlertCircle,
  Clock,
  Laptop,
  CheckCircle2,
  X
} from "lucide-react";
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import { useToastStore } from "../store/toast.store";

type FaqCategory =
  | "all"
  | "getting-started"
  | "circles"
  | "dms"
  | "vault"
  | "safety"
  | "settings";

interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  tags: string[];
}

const FAQ_ITEMS: FaqItem[] = [
  // ── Getting Started & Authentication ───────────────────────────────────────
  {
    id: "gs-1",
    category: "getting-started",
    question: "How do I register an account on StudyConnect?",
    answer:
      "To register, navigate to the Register page and provide your full legal name, official student roll number (e.g., CS24-101), department, and verified institutional email ending in @campus.edu or @college.edu. Once submitted, your password will be encrypted using 12 rounds of bcrypt, and you will receive access to your campus academic dashboard.",
    tags: ["register", "account", "signup", "email", "roll number"]
  },
  {
    id: "gs-2",
    category: "getting-started",
    question: "What should I do if I forget my password or get locked out?",
    answer:
      "Click 'Forgot Password?' on the Login page and enter your registered campus email address. An encrypted reset link valid for 15 minutes will be issued. Alternatively, if your account status is flagged or locked, contact the Dean of Academics administration at admin@campus.edu for manual identity verification and account restoration.",
    tags: ["password", "reset", "lockout", "credentials", "forgot"]
  },
  {
    id: "gs-3",
    category: "getting-started",
    question: "Can non-university students or guests join StudyConnect?",
    answer:
      "No. StudyConnect is an authenticated closed-loop campus ecosystem. Only students, faculty, and academic deans with verified institutional email domains are authorized to register, interact in study circles, and download curriculum assets from the Resource Vault.",
    tags: ["guest", "domain", "campus", "verification", "access"]
  },

  // ── Study Circles & Channels ───────────────────────────────────────────────
  {
    id: "sc-1",
    category: "circles",
    question: "What are Study Circles and how are they structured?",
    answer:
      "Study Circles are collaborative course environments organized by subject, lab group, or department semester. Each circle features categorized channels (e.g., #general, #lab-code, #doubts, #announcements), live typing indicators, markdown code snippet blocks with syntax highlighting, and integrated voice stage collaboration.",
    tags: ["circles", "channels", "voice", "code", "courses"]
  },
  {
    id: "sc-2",
    category: "circles",
    question: "How do I create a new Study Circle?",
    answer:
      "In the Chat / Study Circles workspace, click the '+' button next to the Circle List header. Choose a circle title, select your course category, write a short curriculum description, and choose between Public Campus (open to all students in your department) or Private Invite-Only (requiring admin/moderator approval).",
    tags: ["create circle", "study group", "moderation", "invite"]
  },
  {
    id: "sc-3",
    category: "circles",
    question: "How do I share formatted code blocks in channels?",
    answer:
      "You can send formatted code snippets directly in the message composer by enclosing code in triple backticks (```python, ```typescript, ```cpp, etc.), or by clicking the code icon in the channel toolbar. Syntax highlighting and instant copy buttons are automatically rendered for all participants.",
    tags: ["code", "syntax", "snippets", "formatting", "markdown"]
  },

  // ── Direct Messages & Realtime Peer Chat ───────────────────────────────────
  {
    id: "dm-1",
    category: "dms",
    question: "Are Direct Messages encrypted and secure?",
    answer:
      "Yes. All 1-on-1 direct messages are isolated to the two authorized participants and transmitted via encrypted TLS WebSockets. Messages undergo strict server-side authorization checks ensuring only conversation participants can view, deliver, or acknowledge receipts.",
    tags: ["dm", "encryption", "privacy", "security", "receipts"]
  },
  {
    id: "dm-2",
    category: "dms",
    question: "How do I use the Subpage Enlarge Mode in Direct Messages?",
    answer:
      "When in Direct Messages, click the 'Maximize' icon in the top-right header of the conversation (or press the Escape key to toggle). This expands the conversation to 100% full-screen width, collapsing sidebars to give you a distraction-free study and messaging experience.",
    tags: ["fullscreen", "maximize", "enlarge", "distraction-free"]
  },
  {
    id: "dm-3",
    category: "dms",
    question: "How can I find and message a classmate?",
    answer:
      "Visit the Direct Messages page and use the peer search bar to look up classmates by name, student roll number, or department. Once you locate their profile card, click 'Message' to immediately initiate a private conversation.",
    tags: ["search peer", "classmates", "directory", "roll number"]
  },

  // ── Resource Vault & Note Sharing ──────────────────────────────────────────
  {
    id: "rv-1",
    category: "vault",
    question: "What file types and size limits are supported in the Resource Vault?",
    answer:
      "The Resource Vault supports lecture notes, previous exam question papers, lab manuals, and assignments in PDF, DOCX, PPTX, ZIP, and PNG/JPEG formats. The maximum single-file upload size is 5 MB per document to optimize campus cloud storage.",
    tags: ["upload", "vault", "size limit", "pdf", "resources", "files"]
  },
  {
    id: "rv-2",
    category: "vault",
    question: "How are resources categorized and indexed for search?",
    answer:
      "Every uploaded resource is indexed by title, course department, academic semester (1 to 8), subject code, and academic tag (e.g., 'Past Paper', 'Lab Manual', 'Lecture Slides'). You can use the multifaceted filter bar on the Resources page to pinpoint documents in seconds.",
    tags: ["filter", "semester", "search", "documents", "tags"]
  },
  {
    id: "rv-3",
    category: "vault",
    question: "Can I report an inaccurate, copyrighted, or plagiarized resource?",
    answer:
      "Yes. Click the three dots menu on any resource card and select 'Report Resource'. Choose a flag category (Copyright, Academic Dishonesty, Inappropriate Content) and provide context. Reports are immediately routed to the Campus Admin Console for dean review.",
    tags: ["report", "copyright", "academic integrity", "moderation"]
  },

  // ── Campus Privacy & Safety ────────────────────────────────────────────────
  {
    id: "ps-1",
    category: "safety",
    question: "Who can see my online presence and academic details?",
    answer:
      "By default, your verified department, academic year, and online presence indicator are visible to peers within your shared study circles. You can configure your visibility status, hide your active presence, or restrict peer messaging in Settings > Privacy & Campus Visibility.",
    tags: ["visibility", "privacy", "online status", "profile"]
  },
  {
    id: "ps-2",
    category: "safety",
    question: "What is the StudyConnect Academic Honor Code?",
    answer:
      "StudyConnect enforces strict adherence to campus academic integrity. Sharing live exam answers, unauthorized homework solutions, or engaging in harassment is strictly prohibited. The platform maintains an automated 90-day admin audit log, and violations may lead to account suspension or referral to the academic dean.",
    tags: ["honor code", "rules", "cheating", "suspension", "audit"]
  },

  // ── Account & System Settings ──────────────────────────────────────────────
  {
    id: "st-1",
    category: "settings",
    question: "What is the difference between this Help & FAQ page and Settings?",
    answer:
      "Settings (/settings) is your personal management console where you update credentials, toggle dark/light themes, review active login sessions, and configure notification alerts. This Help & FAQ page (/help) is the campus knowledge base containing guides, troubleshooting steps, and direct contact avenues to Campus IT.",
    tags: ["settings difference", "help vs settings", "preferences", "account"]
  },
  {
    id: "st-2",
    category: "settings",
    question: "How do I switch between Dark and Light mode?",
    answer:
      "You can toggle your display preference either by clicking the Sun/Moon icon in the top navigation bar or by going to Settings > Theme & Visuals where you can select Light, Dark, or System Sync.",
    tags: ["theme", "dark mode", "light mode", "visuals"]
  },
  {
    id: "st-3",
    category: "settings",
    question: "How do I view and revoke active logins on other devices?",
    answer:
      "In Settings > Active Devices & Sessions, you can view all active browser sessions, operating systems, and IP locations that currently hold a valid refresh token. You can terminate any suspicious session individually or click 'Log Out All Other Devices' with one click.",
    tags: ["devices", "sessions", "revoke", "security", "ip"]
  }
];

export function HelpFaqPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<FaqCategory>("all");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>("gs-1");
  const [copiedFaqId, setCopiedFaqId] = useState<string | null>(null);
  const [helpfulFeedback, setHelpfulFeedback] = useState<Record<string, "yes" | "no">>({});
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportCategory, setSupportCategory] = useState("account");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const { addToast } = useToastStore();

  const categories = [
    { id: "all" as FaqCategory, label: "All Topics", icon: BookOpen },
    { id: "getting-started" as FaqCategory, label: "Getting Started", icon: Sparkles },
    { id: "circles" as FaqCategory, label: "Study Circles", icon: Users },
    { id: "dms" as FaqCategory, label: "Direct Messages", icon: MessageSquare },
    { id: "vault" as FaqCategory, label: "Resource Vault", icon: FolderArchive },
    { id: "safety" as FaqCategory, label: "Privacy & Safety", icon: ShieldCheck },
    { id: "settings" as FaqCategory, label: "Settings & System", icon: SettingsIcon }
  ];

  // Filter FAQs based on category and live search term
  const filteredFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      if (!matchesCategory) return false;

      if (!query) return true;

      const matchesQuestion = item.question.toLowerCase().includes(query);
      const matchesAnswer = item.answer.toLowerCase().includes(query);
      const matchesTags = item.tags.some((t) => t.toLowerCase().includes(query));

      return matchesQuestion || matchesAnswer || matchesTags;
    });
  }, [searchQuery, activeCategory]);

  const toggleFaq = (id: string) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  const handleCopyLink = (faq: FaqItem) => {
    navigator.clipboard.writeText(`${window.location.origin}/help#${faq.id}`);
    setCopiedFaqId(faq.id);
    addToast("Direct link copied to clipboard!", "success");
    setTimeout(() => setCopiedFaqId(null), 2000);
  };

  const handleFeedback = (faqId: string, rating: "yes" | "no") => {
    setHelpfulFeedback((prev) => ({ ...prev, [faqId]: rating }));
    addToast(
      rating === "yes" ? "Thank you for your feedback!" : "Feedback recorded. We'll improve this guide!",
      "info"
    );
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject.trim() || !supportMessage.trim()) {
      addToast("Please provide both a subject and message.", "warning");
      return;
    }

    setIsSubmittingTicket(true);
    setTimeout(() => {
      setIsSubmittingTicket(false);
      setIsSupportModalOpen(false);
      setSupportSubject("");
      setSupportMessage("");
      addToast("Support ticket submitted! Campus IT will reply to your .edu inbox shortly.", "success");
    }, 1000);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-50 font-sans antialiased transition-colors duration-300">
      {/* ── 1. Workspace Sidebar ────────────────────────────────────────── */}
      <DashboardSidebar />

      {/* ── 2. Main Scrollable Container ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <main className="p-4 sm:p-8 space-y-8 max-w-6xl w-full mx-auto">
          
          {/* ── Header & Search Hero ────────────────────────────────────── */}
          <div className="relative rounded-3xl p-6 sm:p-10 border border-[#1E90FF]/25 bg-gradient-to-br from-[#1E90FF]/15 via-white dark:via-[#0F1A30] to-slate-50 dark:to-[#080D1A] shadow-xl overflow-hidden">
            {/* Ambient Radial Dodger Blue Glow */}
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#1E90FF]/20 blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#1E90FF]/30 bg-[#1E90FF]/10 px-3.5 py-1 text-xs font-bold text-[#1E90FF]">
                <Sparkles size={14} className="text-[#1E90FF]" />
                <span>Campus Knowledge Base & Support</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                How can we help you today?
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                Explore guides for Study Circles, Direct Messaging, Resource Vault uploads, and account security.
              </p>

              {/* Realtime Live Search Bar */}
              <div className="relative pt-2">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search questions, errors, keywords (e.g. 'vault', 'password', 'circle')..."
                  className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white/90 dark:bg-[#162544]/90 border border-slate-200 dark:border-slate-700/80 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1E90FF] focus:ring-2 focus:ring-[#1E90FF]/30 shadow-md transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Quick Knowledge Cards (3 Grid) ──────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-sm hover:border-[#1E90FF]/40 transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-2xl bg-[#1E90FF]/15 text-[#1E90FF]">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Platform Quickstart</h3>
                  <span className="text-[11px] text-slate-500">Master features in 3 mins</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Learn how to join department channels, share course notes, and collaborate in real-time.
              </p>
              <button
                onClick={() => {
                  setActiveCategory("getting-started");
                  setExpandedFaqId("gs-1");
                }}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#1E90FF] hover:underline cursor-pointer"
              >
                <span>Read guide</span>
                <ChevronDown size={14} className="-rotate-90" />
              </button>
            </div>

            <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-sm hover:border-[#1E90FF]/40 transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-500">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Campus Honor Code</h3>
                  <span className="text-[11px] text-slate-500">Integrity & Guidelines</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Review academic compliance, intellectual property standards, and community safety policies.
              </p>
              <button
                onClick={() => {
                  setActiveCategory("safety");
                  setExpandedFaqId("ps-2");
                }}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                <span>View policy</span>
                <ChevronDown size={14} className="-rotate-90" />
              </button>
            </div>

            <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-sm hover:border-[#1E90FF]/40 transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-2xl bg-sky-500/15 text-sky-500">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Campus IT Status</h3>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    All Systems Operational
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                WebSockets, Auth Gateway, Atlas Database, and Resource Vault are running with 99.9% uptime.
              </p>
              <div className="mt-4 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Next scheduled maintenance: Sunday 03:00 AM IST
              </div>
            </div>
          </div>

          {/* ── Topic Categories Horizontal Pills ────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Browse by Category
              </h2>
              <span className="text-xs text-slate-500">
                {filteredFaqs.length} {filteredFaqs.length === 1 ? "article" : "articles"} found
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#1E90FF] text-white shadow-md shadow-[#1E90FF]/30"
                        : "bg-white/80 dark:bg-[#0F1A30]/80 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162544]"
                    }`}
                  >
                    <Icon size={14} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── FAQ Accordions List ──────────────────────────────────────── */}
          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/40 dark:bg-[#0F1A30]/40">
                <AlertCircle size={36} className="mx-auto text-slate-400 mb-3" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No questions found
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  We couldn't find any questions matching "{searchQuery}". Try searching with different keywords or submit a question to Campus IT below.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("all");
                  }}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-[#1E90FF] text-white hover:bg-[#187bcd] shadow-sm transition-all"
                >
                  Clear search filters
                </button>
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                const isCopied = copiedFaqId === faq.id;
                const feedback = helpfulFeedback[faq.id];

                return (
                  <div
                    key={faq.id}
                    id={faq.id}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      isExpanded
                        ? "border-[#1E90FF]/50 bg-white dark:bg-[#0F1A30] shadow-md ring-1 ring-[#1E90FF]/20"
                        : "border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#0F1A30]/70 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    {/* Accordion Question Header */}
                    <button
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer transition-colors"
                    >
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 pr-4">
                        {faq.question}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`p-1.5 rounded-full transition-transform duration-200 ${
                            isExpanded
                              ? "bg-[#1E90FF]/15 text-[#1E90FF] rotate-180"
                              : "text-slate-400 bg-slate-100 dark:bg-slate-800"
                          }`}
                        >
                          <ChevronDown size={16} />
                        </span>
                      </div>
                    </button>

                    {/* Accordion Body */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-4">
                            <p className="leading-relaxed whitespace-pre-line">{faq.answer}</p>

                            {/* Tags & Action Row */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/40 text-xs">
                              {/* Keywords tags */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {faq.tags.map((t) => (
                                  <span
                                    key={t}
                                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-medium"
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>

                              {/* Helpful and Copy tools */}
                              <div className="flex items-center gap-4 text-xs font-semibold">
                                <div className="flex items-center gap-1.5 text-slate-500">
                                  <span>Helpful?</span>
                                  <button
                                    onClick={() => handleFeedback(faq.id, "yes")}
                                    className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                                      feedback === "yes" ? "text-emerald-500 font-bold" : ""
                                    }`}
                                    title="Yes"
                                  >
                                    <ThumbsUp size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleFeedback(faq.id, "no")}
                                    className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                                      feedback === "no" ? "text-rose-500 font-bold" : ""
                                    }`}
                                    title="No"
                                  >
                                    <ThumbsDown size={14} />
                                  </button>
                                </div>

                                <button
                                  onClick={() => handleCopyLink(faq)}
                                  className="inline-flex items-center gap-1 text-slate-500 hover:text-[#1E90FF] transition-colors"
                                  title="Copy direct question link"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check size={14} className="text-emerald-500" />
                                      <span className="text-emerald-500 text-[11px]">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={14} />
                                      <span className="text-[11px]">Share</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Still Need Help? Support Contact Box ─────────────────────── */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E90FF]">
                  <Mail size={14} />
                  <span>Campus Academic Helpdesk</span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Still have questions or facing an issue?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  Our academic administration and campus IT team are here to help. Reach out directly or submit a support ticket.
                </p>
                <div className="pt-2 flex flex-wrap gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-[#1E90FF]" /> Mon–Fri, 9:00 AM – 5:00 PM IST
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail size={13} className="text-[#1E90FF]" /> admin@campus.edu
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <Link
                  to="/settings"
                  className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#162544] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1c3058] transition-all text-center"
                >
                  Manage Account Settings
                </Link>
                <button
                  onClick={() => setIsSupportModalOpen(true)}
                  className="px-5 py-2.5 rounded-2xl bg-[#1E90FF] text-xs font-bold text-white hover:bg-[#187bcd] shadow-md shadow-[#1E90FF]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  <span>Submit Support Ticket</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Support Ticket Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {isSupportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#0F1A30] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#1E90FF]/15 text-[#1E90FF]">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Contact Campus IT Support
                    </h3>
                    <span className="text-xs text-slate-500">Typical response time &lt; 2 hours</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsSupportModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSupportSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Issue Category
                  </label>
                  <select
                    value={supportCategory}
                    onChange={(e) => setSupportCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#162544] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#1E90FF]"
                  >
                    <option value="account">Account & Credential Assistance</option>
                    <option value="study-circles">Study Circle or Channel Problem</option>
                    <option value="direct-messages">Direct Messaging or WebSocket Bug</option>
                    <option value="vault">Resource Vault Upload / File Problem</option>
                    <option value="harassment">Report Harassment or Academic Integrity</option>
                    <option value="other">General Platform Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    placeholder="Brief summary of what you are experiencing..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#162544] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#1E90FF]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Detailed Message
                  </label>
                  <textarea
                    rows={4}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Describe the steps to reproduce the issue or details for campus IT..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#162544] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#1E90FF] resize-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSupportModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTicket}
                    className="px-5 py-2 rounded-xl bg-[#1E90FF] text-xs font-bold text-white hover:bg-[#187bcd] shadow-md shadow-[#1E90FF]/25 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmittingTicket ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Submit Ticket</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default HelpFaqPage;
