import React, { useState, useEffect } from "react";
import {
  Sun, Moon, Bell, Search, ChevronDown, Users, Share2, Shield,
  ArrowRight, Zap, FileText, Send, Paperclip, Smile, MoreHorizontal,
  Hash, Settings, BarChart2, Flag, User, LogOut, Plus, ChevronRight,
  Calendar, Download, TrendingUp, AlertTriangle, CheckCircle, Lock,
  Mail, Eye, EyeOff, Bot, GraduationCap, Home, MessageCircle,
  FolderOpen, Reply, Ban, Check, Star, Clock, Pencil,
} from "lucide-react";
import { HomePage } from "./pages/home.page";
import { LoginPage } from "./pages/login.page";
import { RegisterPage } from "./pages/register.page";
import { ResetPasswordPage } from "./pages/reset-password.page";
import { DashboardPage } from "./pages/dashboard.page";
import { ChatPage } from "./pages/chat.page";
import { ConnectionsResourcesPage } from "./pages/connections-resources.page";
import { EventsPage } from "./pages/events.page";
import { StudentSettingsPage } from "./pages/student-settings.page";
import { HelpFaqPage } from "./pages/help-faq.page";
import { AdminPage } from "./pages/admin.page";
import { AdminProfilePage } from "./pages/admin-profile.page";
import { ProfilePage } from "./pages/profile.page";
import { DirectMessagesPage } from "./pages/direct-messages.page";
import { NotificationsPage } from "./pages/notifications.page";
import { DashboardSidebar } from "./components/dashboard-sidebar";
import { Routes, Route, Navigate, useNavigate } from "react-router";
import { ProtectedRoute } from "./routes/guards/ProtectedRoute";
import { AdminRoute } from "./routes/guards/AdminRoute";
import { PublicRoute } from "./routes/public-route";
import { Forbidden403Page } from "./pages/forbidden-403.page";
import { authApi } from "./api/auth.api";
import { useAuthStore } from "./store/auth.store";
import { useToastStore } from "./store/toast.store";
import { ToastContainer } from "./components/toast-container";
import { GlobalBroadcastBanner } from "./components/layout/GlobalBroadcastBanner";

type Page = "home" | "login" | "register" | "dashboard" | "chat" | "admin" | "profile" | "direct-messages";

// ── Data ─────────────────────────────────────────────────────────────────────

const communities = [
  { id: 1, name: "Computer Science 2026", members: 342, icon: "💻", grad: "from-sky-400 to-blue-600", activity: "2 min ago" },
  { id: 2, name: "Mathematics Forum", members: 218, icon: "📐", grad: "from-violet-400 to-purple-600", activity: "15 min ago" },
  { id: 3, name: "Physics & Astronomy", members: 156, icon: "🔭", grad: "from-emerald-400 to-teal-600", activity: "1 hr ago" },
  { id: 4, name: "Business & Economics", members: 289, icon: "📊", grad: "from-amber-400 to-orange-500", activity: "30 min ago" },
  { id: 5, name: "Design & Creative Arts", members: 174, icon: "🎨", grad: "from-rose-400 to-pink-600", activity: "5 min ago" },
];

const dms = [
  { id: 1, name: "Meera Patel", init: "MP", msg: "Hey! Can you share the ML notes?", time: "2:34 PM", unread: 2, color: "bg-violet-500" },
  { id: 2, name: "Rohan Kumar", init: "RK", msg: "Great presentation today 👏", time: "1:15 PM", unread: 0, color: "bg-sky-500" },
  { id: 3, name: "Priya Sharma", init: "PS", msg: "Study session tomorrow at 4?", time: "11:22 AM", unread: 1, color: "bg-emerald-500" },
  { id: 4, name: "Arjun Mehta", init: "AM", msg: "The assignment deadline moved!", time: "10:05 AM", unread: 0, color: "bg-amber-500" },
];

const events = [
  { id: 1, title: "Machine Learning Workshop", date: "Tomorrow, 2:00 PM", location: "Lab 302", tag: "Workshop", tc: "text-sky-500" },
  { id: 2, title: "Hackathon 2026 Registration", date: "July 25, 9:00 AM", location: "Online", tag: "Hackathon", tc: "text-violet-500" },
  { id: 3, title: "Campus Career Fair", date: "July 28, 10:00 AM", location: "Main Hall", tag: "Career", tc: "text-emerald-500" },
];

const chatMessages = [
  { id: 1, user: "Aarav Singh", init: "AS", time: "2:30 PM", text: "Hey everyone! Has anyone started working on the OS assignment?", color: "bg-sky-500", reactions: [] as string[], file: null as null | { name: string; size: string; pages: number } },
  { id: 2, user: "Meera Patel", init: "MP", time: "2:31 PM", text: "Yes! I was going through the memory management chapter. Virtual memory is quite tricky.", color: "bg-violet-500", reactions: ["👍", "💯"], file: null },
  { id: 3, user: "Rohan Kumar", init: "RK", time: "2:33 PM", text: "I compiled some notes from yesterday's lecture, sharing below.", color: "bg-emerald-500", reactions: [], file: { name: "OS_Notes_Unit3.pdf", size: "2.4 MB", pages: 18 } },
  { id: 4, user: "Priya Sharma", init: "PS", time: "2:35 PM", text: "This is super helpful Rohan, thanks a lot! 🙌", color: "bg-amber-500", reactions: ["❤️"], file: null },
  { id: 5, user: "Aarav Singh", init: "AS", time: "2:37 PM", text: "Are we all meeting in the library tomorrow to work through the problem sets together?", color: "bg-sky-500", reactions: ["✅", "✅", "✅"], file: null },
];

const members = [
  { id: 1, name: "Meera Patel", role: "Moderator", init: "MP", status: "online" as const, color: "bg-violet-500", last: "" },
  { id: 2, name: "Rohan Kumar", role: "Member", init: "RK", status: "online" as const, color: "bg-emerald-500", last: "" },
  { id: 3, name: "Priya Sharma", role: "Member", init: "PS", status: "online" as const, color: "bg-amber-500", last: "" },
  { id: 4, name: "Vikram Nair", role: "Member", init: "VN", status: "offline" as const, color: "bg-rose-500", last: "1h ago" },
  { id: 5, name: "Ananya Das", role: "Member", init: "AD", status: "offline" as const, color: "bg-indigo-500", last: "3h ago" },
];

const adminUsers = [
  { id: 1, name: "Aarav Singh", email: "aarav.singh@university.edu", roll: "CS21001", dept: "Computer Science", role: "Student", status: "active" as const },
  { id: 2, name: "Meera Patel", email: "meera.patel@university.edu", roll: "CS21042", dept: "Computer Science", role: "Moderator", status: "active" as const },
  { id: 3, name: "Vikram Rao", email: "vikram.rao@university.edu", roll: "ME21015", dept: "Mechanical Eng.", role: "Student", status: "suspended" as const },
  { id: 4, name: "Sunita Joshi", email: "sunita.j@university.edu", roll: "EC21033", dept: "Electronics", role: "Student", status: "banned" as const },
  { id: 5, name: "Arjun Mehta", email: "arjun.m@university.edu", roll: "CS21078", dept: "Computer Science", role: "Student", status: "active" as const },
  { id: 6, name: "Pooja Verma", email: "pooja.v@university.edu", roll: "MA21022", dept: "Mathematics", role: "Student", status: "active" as const },
];

const reports = [
  { id: 1, sev: "high" as const, offender: "Vikram Rao", community: "General Discussion", snippet: "Spammed promotional links 15+ times in the chat channel", reporter: "Meera Patel", time: "10 min ago" },
  { id: 2, sev: "medium" as const, offender: "Unknown User", community: "CS 2026", snippet: "Shared inappropriate meme in the study room channel", reporter: "Priya Sharma", time: "1h ago" },
  { id: 3, sev: "low" as const, offender: "Sunita Joshi", community: "Events", snippet: "Off-topic conversation disrupting study discussion threads", reporter: "Rohan Kumar", time: "3h ago" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function cx(...args: (string | false | undefined | null)[]) {
  return args.filter(Boolean).join(" ");
}

function pwStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

function Logo({ sm }: { sm?: boolean }) {
  return (
    <div className={cx("flex items-center font-bold", sm ? "gap-1.5 text-sm" : "gap-2 text-base")}>
      <div className={cx("rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white font-black", sm ? "w-7 h-7 text-[11px]" : "w-8 h-8 text-sm")}>
        SC
      </div>
      <span className="text-foreground tracking-tight">StudyConnect</span>
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type BtnSize = "sm" | "md" | "lg";

function Btn({
  children, variant = "primary", size = "md", className = "",
  onClick, disabled, loading, type = "button", fullWidth,
}: {
  children: React.ReactNode; variant?: BtnVariant; size?: BtnSize;
  className?: string; onClick?: () => void; disabled?: boolean;
  loading?: boolean; type?: "button" | "submit"; fullWidth?: boolean;
}) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none";
  const v: Record<BtnVariant, string> = {
    primary: "bg-sky-400 hover:bg-sky-300 text-slate-900 shadow-lg shadow-sky-400/25 hover:shadow-sky-400/40 active:scale-[0.98]",
    secondary: "bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-foreground active:scale-[0.98]",
    ghost: "hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground active:scale-[0.98]",
    danger: "bg-red-500 hover:bg-red-400 text-white shadow-md shadow-red-500/20 active:scale-[0.98]",
    outline: "border border-border hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground active:scale-[0.98]",
  };
  const s: Record<BtnSize, string> = { sm: "text-xs px-3 py-1.5", md: "text-sm px-4 py-2", lg: "text-sm px-6 py-3" };
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading}
      className={cx(base, v[variant], s[size], fullWidth ? "w-full" : "", className)}>
      {loading && (
        <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

function Field({
  label, type = "text", placeholder, value, onChange, Icon, error, right, className = "",
}: {
  label?: string; type?: string; placeholder?: string; value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
  error?: string; right?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      {label && <label className="text-xs font-semibold text-foreground uppercase tracking-wide">{label}</label>}
      <div className="relative">
        {Icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"><Icon size={15} /></div>}
        <input
          type={type} placeholder={placeholder} value={value} onChange={onChange}
          className={cx(
            "w-full rounded-lg border bg-white dark:bg-slate-800/60 text-foreground placeholder:text-muted-foreground/60 text-sm transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 py-2.5",
            Icon ? "pl-9" : "pl-3.5", right ? "pr-10" : "pr-3.5",
            error ? "border-red-400 focus:ring-red-400/40 focus:border-red-400" : "border-border",
          )}
        />
        {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

type BadgeVariant = "active" | "suspended" | "banned" | "moderator" | "default" | "high" | "medium" | "low";

function Chip({ children, variant = "default" }: { children: React.ReactNode; variant?: BadgeVariant }) {
  const v: Record<BadgeVariant, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
    suspended: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
    banned: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    moderator: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400",
    default: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
    high: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
    low: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  };
  return <span className={cx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold", v[variant])}>{children}</span>;
}

function Ava({
  init, color = "bg-sky-500", size = "md", status,
}: { init: string; color?: string; size?: "xs" | "sm" | "md" | "lg"; status?: "online" | "offline" }) {
  const s = { xs: "w-6 h-6 text-[9px]", sm: "w-8 h-8 text-[11px]", md: "w-9 h-9 text-xs", lg: "w-11 h-11 text-sm" };
  const d = { xs: "w-1.5 h-1.5", sm: "w-2 h-2", md: "w-2.5 h-2.5", lg: "w-3 h-3" };
  return (
    <div className="relative flex-shrink-0">
      <div className={cx("rounded-full flex items-center justify-center text-white font-bold", color, s[size])}>{init}</div>
      {status && (
        <div className={cx("absolute -bottom-px -right-px rounded-full border-2 border-background", d[size], status === "online" ? "bg-emerald-400" : "bg-slate-400")} />
      )}
    </div>
  );
}

// ── Landing Page ──────────────────────────────────────────────────────────────

function Landing({ go, dark, tog }: { go: (p: Page) => void; dark: boolean; tog: () => void }) {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <div className="absolute -top-32 left-1/4 w-[600px] h-[600px] bg-sky-400/8 dark:bg-sky-400/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-violet-400/8 dark:bg-violet-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-emerald-400/6 dark:bg-emerald-400/4 rounded-full blur-3xl" />
      </div>

      {/* Sticky Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 backdrop-blur-2xl bg-background/75">
        <div className="max-w-7xl mx-auto px-6 h-[66px] flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8">
            {["Features", "About", "Security"].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{l}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={tog} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button onClick={() => go("login")} className="hidden md:block text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors">Sign In</button>
            <Btn variant="primary" size="sm" onClick={() => go("register")}>Get Started <ArrowRight size={13} /></Btn>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-28 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-sky-400/30 bg-sky-400/8 text-sky-500 text-[11px] font-bold uppercase tracking-wider mb-8">
            <Star size={11} className="fill-sky-400 text-sky-400" />
            Now with AI-powered study assistance
          </div>
          <h1 className="text-[3.5rem] md:text-[4.5rem] font-black text-foreground leading-[1.05] tracking-tight mb-7">
            A smarter space for{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-sky-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
                college collaboration
              </span>
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            StudyConnect brings your campus together — verified study groups, shared resources,
            real-time chats, and an AI tutor, all in one secure, college-only platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => go("register")}
              className="relative group px-9 py-3.5 rounded-xl font-bold text-sm text-white overflow-hidden shadow-xl shadow-sky-400/30 hover:shadow-sky-400/50 transition-all duration-300 hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg,#38BDF8,#A78BFA)" }}
            >
              <span className="relative z-10 flex items-center gap-2">
                Create Account <ArrowRight size={15} />
              </span>
            </button>
            <Btn variant="outline" size="lg" onClick={() => go("login")}>Sign In to Your Account</Btn>
          </div>
        </div>

        {/* Hero Stats */}
        <div className="max-w-3xl mx-auto mt-16 grid grid-cols-3 gap-4">
          {[
            { n: "50,000+", l: "Students enrolled" },
            { n: "200+", l: "Colleges verified" },
            { n: "1.2M+", l: "Resources shared" },
          ].map(({ n, l }) => (
            <div key={l} className="text-center p-6 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm">
              <p className="text-3xl font-black text-foreground mb-1">{n}</p>
              <p className="text-sm text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-500 mb-3 block">Platform Features</span>
            <h2 className="text-4xl font-black text-foreground mb-4 tracking-tight">Everything your study group needs</h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">Powerful tools purpose-built for academic collaboration at the college level.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { Icon: Users, title: "Study Rooms", desc: "Create or join topic-specific communities with up to 500 members, organized by subject and year.", color: "text-sky-400", bg: "bg-sky-400/10" },
              { Icon: Bot, title: "AI Assistant", desc: "Get instant explanations on complex topics with our integrated academic AI tutor trained on your curriculum.", color: "text-violet-400", bg: "bg-violet-400/10" },
              { Icon: Share2, title: "Resource Share", desc: "Upload and discover lecture notes, PDFs, and study materials. Organize by subject with version history.", color: "text-emerald-400", bg: "bg-emerald-400/10" },
              { Icon: MessageCircle, title: "Instant Chats", desc: "Real-time direct messaging and group chats with file sharing, reactions, and thread replies built in.", color: "text-amber-400", bg: "bg-amber-400/10" },
            ].map(({ Icon, title, desc, color, bg }) => (
              <div key={title} className="group p-6 rounded-2xl border border-border bg-card hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 cursor-default">
                <div className={cx("w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 duration-300", bg)}>
                  <Icon size={22} className={color} />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-24 px-6 bg-slate-50/60 dark:bg-slate-900/40">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-3 block">Our Mission</span>
            <h2 className="text-4xl font-black text-foreground mb-6 tracking-tight leading-tight">Built by students,<br />for students</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">StudyConnect was born from frustration with fragmented tools not designed for campus life. Generic chat apps lack academic context. Email is slow. Social media is distracting.</p>
            <p className="text-muted-foreground leading-relaxed mb-4">We built a platform that understands the rhythm of college — deadlines, study sessions, exam prep, and the informal collaboration that makes college so formative.</p>
            <p className="text-muted-foreground leading-relaxed">Privacy and security are foundational, not afterthoughts. Your campus, your community, your focus.</p>
            <Btn variant="primary" size="md" className="mt-8" onClick={() => go("register")}>Join StudyConnect <ArrowRight size={14} /></Btn>
          </div>
          <div className="p-8 rounded-2xl border border-border bg-card shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-6">Why StudyConnect?</h3>
            <div className="space-y-4">
              {[
                { Icon: CheckCircle, text: "College-verified accounts — every user is a genuine enrolled student", c: "text-emerald-500" },
                { Icon: Shield, text: "End-to-end encrypted messages and secure file vault storage", c: "text-sky-500" },
                { Icon: Zap, text: "AI-powered study tools to accelerate understanding and exam prep", c: "text-violet-500" },
                { Icon: Users, text: "Department and year-based community discovery for instant relevance", c: "text-amber-500" },
                { Icon: Calendar, text: "Campus event integration and assignment deadline tracking", c: "text-rose-500" },
                { Icon: BarChart2, text: "Study streak tracking, progress analytics, and leaderboards", c: "text-teal-500" },
              ].map(({ Icon, text, c }) => (
                <div key={text} className="flex items-start gap-3">
                  <Icon size={17} className={cx("flex-shrink-0 mt-0.5", c)} />
                  <p className="text-sm text-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex flex-col items-center gap-6 px-12 py-12 rounded-3xl border border-sky-400/20 bg-gradient-to-b from-sky-400/5 to-violet-400/5 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center shadow-2xl shadow-sky-400/40">
              <Shield size={30} className="text-white" />
            </div>
            <Chip variant="active"><CheckCircle size={10} /> Verified College Email Required</Chip>
            <div>
              <h2 className="text-3xl font-black text-foreground mb-3 tracking-tight">Your campus, kept safe</h2>
              <p className="text-muted-foreground leading-relaxed max-w-sm">Every account is verified against your institution's email domain. No outsiders, no spam — just your genuine college community.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {["IIT Delhi", "BITS Pilani", "NIT Trichy", "VIT Vellore", "NMIMS Mumbai"].map(c => (
                <span key={c} className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-muted-foreground">{c}</span>
              ))}
              <span className="px-3 py-1 rounded-full bg-sky-400/10 border border-sky-400/20 text-sky-500 text-xs font-bold">+200 colleges</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo sm />
          <p className="text-sm text-muted-foreground">© 2026 StudyConnect Technologies. All rights reserved.</p>
          <div className="flex items-center gap-6">
            {["Terms of Service", "Privacy Policy"].map(l => (
              <a key={l} href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Login Page ────────────────────────────────────────────────────────────────

function Login({ go, dark, tog }: { go: (p: Page) => void; dark: boolean; tog: () => void }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [rem, setRem] = useState(false);
  const [loading, setLoading] = useState(false);

  const { addToast } = useToastStore();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.login({ email, password: pw });
      useAuthStore.getState().setSession(data.user, data.accessToken);
      addToast("Signed in successfully!", "success");
      go("dashboard");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to sign in. Check your credentials.";
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-sky-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-violet-400/10 rounded-full blur-3xl" />
      </div>
      <div className="absolute top-5 right-5">
        <button onClick={tog} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
      <div className="relative w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/5">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white font-black text-xl mb-5 shadow-xl shadow-sky-400/35">SC</div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Sign in to your StudyConnect account</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <Field label="College Email" type="email" placeholder="yourname@college.edu" value={email} onChange={e => setEmail(e.target.value)} Icon={Mail} />
            <Field label="Password" type={show ? "text" : "password"} placeholder="Enter your password" value={pw} onChange={e => setPw(e.target.value)} Icon={Lock}
              right={<button type="button" onClick={() => setShow(!show)} className="text-muted-foreground hover:text-foreground transition-colors">{show ? <EyeOff size={15} /> : <Eye size={15} />}</button>} />
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={rem} onChange={e => setRem(e.target.checked)} className="w-4 h-4 rounded border-border accent-sky-400" />
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>
              <a href="#" className="text-sm font-semibold text-sky-500 hover:text-sky-400 transition-colors">Forgot Password?</a>
            </div>
            <Btn variant="primary" size="lg" type="submit" loading={loading} fullWidth>{!loading && "Sign In"}</Btn>
          </form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="px-3 bg-card text-xs text-muted-foreground font-medium">OR CONTINUE WITH</span></div>
          </div>
          <button className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-border hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-sm font-semibold text-foreground">
            <svg width="17" height="17" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
            </svg>
            Continue with Google
          </button>
          <p className="text-center text-sm text-muted-foreground mt-6">
            {"Don't have an account? "}
            <button onClick={() => go("register")} className="font-bold text-sky-500 hover:text-sky-400 transition-colors">Create Account</button>
          </p>
        </div>
        <button onClick={() => go("home")} className="flex items-center gap-1.5 mx-auto mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight size={14} className="rotate-180" /> Back to Home
        </button>
      </div>
    </div>
  );
}

// ── Register Page ─────────────────────────────────────────────────────────────

function Register({ go, dark, tog }: { go: (p: Page) => void; dark: boolean; tog: () => void }) {
  const [f, setF] = useState({ name: "", roll: "", dept: "", year: "1st Year", email: "", pw: "", terms: false });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const str = pwStrength(f.pw);
  const strLabel = ["", "Weak", "Fair", "Good", "Strong"];
  const strColor = ["", "bg-red-400", "bg-amber-400", "bg-sky-400", "bg-emerald-400"];
  const strText = ["", "text-red-500", "text-amber-500", "text-sky-500", "text-emerald-500"];

  const { addToast } = useToastStore();

  function getYearNumber(yrStr: string): number {
    const matched = yrStr.match(/\d+/);
    return matched ? parseInt(matched[0], 10) : 1;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.dept) {
      addToast("Please select a department", "warning");
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.register({
        fullName: f.name,
        rollNumber: f.roll,
        department: f.dept,
        academicYear: getYearNumber(f.year),
        email: f.email,
        password: f.pw
      });
      useAuthStore.getState().setSession(data.user, data.accessToken);
      addToast("Account created successfully!", "success");
      go("dashboard");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to register. Please check input details.";
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-violet-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl" />
      </div>
      <div className="absolute top-5 right-5">
        <button onClick={tog} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
      <div className="relative w-full max-w-lg">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/5">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white font-black text-xl mb-5 shadow-xl shadow-sky-400/35">SC</div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Join your college community on StudyConnect</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name" placeholder="Aarav Singh" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} Icon={User} />
              <Field label="Roll Number" placeholder="CS21001" value={f.roll} onChange={e => setF({ ...f, roll: e.target.value })} Icon={GraduationCap} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Department</label>
                <select value={f.dept} onChange={e => setF({ ...f, dept: e.target.value })}
                  className="w-full rounded-lg border border-border bg-white dark:bg-slate-800/60 text-foreground text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition-all">
                  <option value="">Select department...</option>
                  {["Computer Science", "Electronics", "Mechanical Eng.", "Civil Eng.", "Mathematics", "Physics", "Business Admin"].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Year of Study</label>
                <select value={f.year} onChange={e => setF({ ...f, year: e.target.value })}
                  className="w-full rounded-lg border border-border bg-white dark:bg-slate-800/60 text-foreground text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition-all">
                  {["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"].map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <Field label="College Email" type="email" placeholder="yourname@college.edu" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} Icon={Mail} />
            <div>
              <Field label="Password" type={show ? "text" : "password"} placeholder="Create a strong password" value={f.pw} onChange={e => setF({ ...f, pw: e.target.value })} Icon={Lock}
                right={<button type="button" onClick={() => setShow(!show)} className="text-muted-foreground hover:text-foreground transition-colors">{show ? <EyeOff size={15} /> : <Eye size={15} />}</button>} />
              {f.pw.length > 0 && (
                <div className="mt-2.5">
                  <div className="flex gap-1 mb-1.5">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={cx("h-1.5 flex-1 rounded-full transition-all duration-300", i <= str ? strColor[str] : "bg-slate-200 dark:bg-slate-700")} />
                    ))}
                  </div>
                  <p className={cx("text-xs font-semibold", strText[str])}>{strLabel[str]} password</p>
                </div>
              )}
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input type="checkbox" checked={f.terms} onChange={e => setF({ ...f, terms: e.target.checked })} className="w-4 h-4 mt-0.5 rounded border-border accent-sky-400 flex-shrink-0" />
              <span className="text-sm text-muted-foreground leading-relaxed">
                I agree to the <a href="#" className="text-sky-500 hover:underline font-semibold">Terms of Service</a> and <a href="#" className="text-sky-500 hover:underline font-semibold">Privacy Policy</a>
              </span>
            </label>
            <Btn variant="primary" size="lg" type="submit" loading={loading} disabled={!f.terms} fullWidth>{!loading && "Create Account"}</Btn>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <button onClick={() => go("login")} className="font-bold text-sky-500 hover:text-sky-400 transition-colors">Sign In</button>
          </p>
        </div>
        <button onClick={() => go("home")} className="flex items-center gap-1.5 mx-auto mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight size={14} className="rotate-180" /> Back to Home
        </button>
      </div>
    </div>
  );
}

// ── Dashboard Page ─────────────────────────────────────────────────────────────

function Dashboard({ go, dark, tog }: { go: (p: Page) => void; dark: boolean; tog: () => void }) {
  const [nav, setNav] = useState("dashboard");
  const [profileOpen, setProfileOpen] = useState(false);
  const user = useAuthStore((state) => state.user);

  const navItems = [
    { id: "dashboard", label: "Dashboard", Icon: Home },
    { id: "communities", label: "Communities", Icon: Users },
    { id: "messages", label: "Direct Messages", Icon: MessageCircle, badge: 3 },
    { id: "resources", label: "Resources", Icon: FolderOpen },
    { id: "events", label: "Events", Icon: Calendar },
    { id: "settings", label: "Settings", Icon: Settings },
  ];

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 h-16 border-b border-border bg-card/80 backdrop-blur-xl flex items-center justify-between px-6 z-40">
        <Logo sm />
        <div className="flex-1 max-w-sm mx-8">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search communities, files..." className="w-full pl-8 pr-4 py-2 text-sm rounded-lg border border-border bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition-all" />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={tog} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="relative w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <Bell size={17} />
            <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-sky-400 text-white text-[8px] font-black rounded-full flex items-center justify-center">3</span>
          </button>
          <div className="relative">
            <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt={user.fullName} className="w-9 h-9 rounded-full object-cover ring-2 ring-sky-400/20" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-xs font-black">
                  {user?.fullName ? user.fullName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : "U"}
                </div>
              )}
              <ChevronDown size={13} className="text-muted-foreground" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-12 w-56 bg-card border border-border rounded-xl shadow-2xl shadow-black/10 py-2 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-bold text-foreground">{user?.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user?.rollNumber} · {user?.department}, Year {user?.academicYear}</p>
                </div>
                <div className="py-1">
                  <button onClick={() => { setProfileOpen(false); go("profile"); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><User size={14} className="text-muted-foreground" />Profile</button>
                  <button onClick={() => setProfileOpen(false)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><Settings size={14} className="text-muted-foreground" />Settings</button>
                  {user?.role === "ADMIN" && (
                    <button onClick={() => { setProfileOpen(false); go("admin"); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><Shield size={14} className="text-muted-foreground" />Admin Panel</button>
                  )}
                </div>
                <div className="border-t border-border pt-1">
                  <button onClick={() => { useAuthStore.getState().clearSession(); go("home"); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><LogOut size={14} />Sign Out</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <DashboardSidebar
          currentNav={nav}
          onNavigate={(route: string) => {
            setNav(route);
            go(route as Page);
          }}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-7 max-w-5xl">
            {/* Welcome banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-400/15 via-violet-400/10 to-emerald-400/10 border border-sky-400/20 p-7 mb-7">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-sky-400/15 to-transparent rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
              <div className="absolute bottom-0 right-24 w-40 h-40 bg-gradient-to-tl from-violet-400/10 to-transparent rounded-full translate-y-1/2 pointer-events-none" />
              <h2 className="text-2xl font-black text-foreground mb-1.5 tracking-tight">Welcome back, Aarav 👋</h2>
              <p className="text-sm text-muted-foreground mb-5">You have <strong className="text-foreground">3 unread messages</strong> and <strong className="text-foreground">2 upcoming events</strong> today.</p>
              <div className="flex gap-3">
                <Btn variant="primary" size="sm" onClick={() => go("chat")}><MessageCircle size={13} /> Go to Chats</Btn>
                <Btn variant="secondary" size="sm"><Calendar size={13} /> View Events</Btn>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                {/* Communities */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-foreground">Active Communities</h3>
                    <button className="text-xs font-semibold text-sky-500 hover:text-sky-400 transition-colors">View all →</button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                    {communities.map(c => (
                      <div key={c.id} onClick={() => go("chat")}
                        className="flex-shrink-0 w-44 p-4 rounded-xl border border-border bg-card hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group">
                        <div className={cx("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-lg mb-3 group-hover:scale-110 transition-transform duration-200", c.grad)}>
                          {c.icon}
                        </div>
                        <p className="text-xs font-bold text-foreground leading-snug mb-1.5">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.members} members</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <p className="text-xs text-muted-foreground">{c.activity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DMs */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-foreground">Recent Messages</h3>
                    <button className="text-xs font-semibold text-sky-500 hover:text-sky-400 transition-colors">See all →</button>
                  </div>
                  <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                    {dms.map(dm => (
                      <div key={dm.id} className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer">
                        <Ava init={dm.init} color={dm.color} size="md" status="online" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-sm font-bold text-foreground">{dm.name}</p>
                            <span className="text-xs text-muted-foreground flex-shrink-0">{dm.time}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{dm.msg}</p>
                        </div>
                        {dm.unread > 0 && <span className="w-5 h-5 bg-sky-400 text-white text-[10px] font-black rounded-full flex items-center justify-center flex-shrink-0">{dm.unread}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Events */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-foreground">Upcoming Events</h3>
                    <button className="text-xs font-semibold text-sky-500 hover:text-sky-400 transition-colors">All →</button>
                  </div>
                  <div className="space-y-3">
                    {events.map(ev => (
                      <div key={ev.id} className="p-4 rounded-xl border border-border bg-card hover:shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-xs font-bold text-foreground leading-snug">{ev.title}</p>
                          <span className={cx("text-[10px] font-black flex-shrink-0", ev.tc)}>{ev.tag}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock size={10} />
                          {ev.date}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Online */}
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-4">Online Classmates</h3>
                  <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                    {members.filter(m => m.status === "online").map(m => (
                      <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer">
                        <Ava init={m.init} color={m.color} size="sm" status="online" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{m.name}</p>
                          {m.role === "Moderator" && <p className="text-[10px] text-violet-500 font-bold">Moderator</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Chat Page ─────────────────────────────────────────────────────────────────

function Chat({ go, dark, tog }: { go: (p: Page) => void; dark: boolean; tog: () => void }) {
  const [msg, setMsg] = useState("");
  const [rightOpen, setRightOpen] = useState(true);
  const [activeCh, setActiveCh] = useState("general");

  const channels = [
    { id: "general", label: "general", unread: 5 },
    { id: "assignments", label: "assignments", unread: 2 },
    { id: "resources", label: "resources", unread: 0 },
    { id: "off-topic", label: "off-topic", unread: 0 },
  ];

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex-shrink-0 h-14 border-b border-border bg-card/80 backdrop-blur-xl flex items-center gap-3 px-4 z-40">
        <button onClick={() => go("dashboard")} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          <ChevronRight size={17} className="rotate-180" />
        </button>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-sm flex-shrink-0">💻</div>
          <div className="min-w-0">
            <span className="text-sm font-bold text-foreground">Computer Science 2026</span>
            <span className="ml-2 px-2 py-0.5 rounded-full bg-sky-400/10 border border-sky-400/20 text-sky-500 text-[10px] font-bold">Engineering</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground ml-2">
            <Users size={11} /> 342 members
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative hidden md:block">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search messages..." className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-sky-400/40 w-40" />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-emerald-500">12 online</span>
          </div>
          <button onClick={tog} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button onClick={() => setRightOpen(!rightOpen)} className={cx("w-8 h-8 rounded-lg flex items-center justify-center transition-all", rightOpen ? "bg-sky-400/10 text-sky-500" : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800")}>
            <Users size={15} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Channel sidebar */}
        <aside className="w-52 flex-shrink-0 border-r border-border bg-card flex flex-col overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div className="p-3">
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Channels</span>
              <button className="text-muted-foreground hover:text-foreground transition-colors"><Plus size={13} /></button>
            </div>
            {channels.map(ch => (
              <button key={ch.id} onClick={() => setActiveCh(ch.id)}
                className={cx("w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all mb-0.5",
                  activeCh === ch.id ? "bg-sky-400/10 text-sky-500 font-bold" : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground")}>
                <Hash size={13} />
                <span className="flex-1 text-left text-xs">{ch.label}</span>
                {ch.unread > 0 && <span className="w-4 h-4 bg-sky-400 text-white text-[9px] font-black rounded-full flex items-center justify-center">{ch.unread}</span>}
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-border">
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Direct Messages</span>
              <button className="text-muted-foreground hover:text-foreground transition-colors"><Plus size={13} /></button>
            </div>
            {dms.slice(0, 3).map(d => (
              <button key={d.id} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground transition-all mb-0.5">
                <Ava init={d.init} color={d.color} size="xs" status="online" />
                <span className="text-xs truncate">{d.name}</span>
                {d.unread > 0 && <span className="ml-auto w-3.5 h-3.5 bg-sky-400 text-white text-[8px] font-black rounded-full flex items-center justify-center">{d.unread}</span>}
              </button>
            ))}
          </div>
        </aside>

        {/* Messages */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-1" style={{ scrollbarWidth: "none" }}>
            {chatMessages.map(m => (
              <div key={m.id} className="group flex gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 px-3 py-2.5 rounded-xl -mx-3 transition-colors">
                <Ava init={m.init} color={m.color} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-bold text-foreground">{m.user}</span>
                    <span className="text-xs text-muted-foreground">{m.time}</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{m.text}</p>
                  {m.file && (
                    <div className="mt-2.5 inline-flex items-center gap-3 p-3 rounded-xl border border-border bg-card max-w-xs group/file hover:shadow-sm transition-all">
                      <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <FileText size={16} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{m.file.name}</p>
                        <p className="text-xs text-muted-foreground">{m.file.size} · {m.file.pages} pages</p>
                      </div>
                      <button className="text-sky-500 hover:text-sky-400 transition-colors flex-shrink-0 hover:scale-110">
                        <Download size={15} />
                      </button>
                    </div>
                  )}
                  {m.reactions.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {m.reactions.map((r, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full border border-border bg-slate-50 dark:bg-slate-800 text-xs cursor-pointer hover:bg-sky-400/10 hover:border-sky-400/30 transition-colors">{r}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-0.5 flex-shrink-0 pt-0.5">
                  {[Smile, Reply, MoreHorizontal].map((Icon, i) => (
                    <button key={i} className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      <Icon size={12} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-border">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card focus-within:ring-2 focus-within:ring-sky-400/40 focus-within:border-sky-400 transition-all">
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex-shrink-0">
                <Paperclip size={15} />
              </button>
              <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Message #general..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                onKeyDown={e => e.key === "Enter" && setMsg("")} />
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex-shrink-0">
                <Smile size={15} />
              </button>
              <button onClick={() => setMsg("")}
                className={cx("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                  msg.length > 0 ? "bg-sky-400 text-white hover:bg-sky-300 shadow-md shadow-sky-400/30 hover:scale-105" : "text-muted-foreground bg-slate-100 dark:bg-slate-800 opacity-50 cursor-not-allowed")}>
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        {rightOpen && (
          <aside className="w-56 flex-shrink-0 border-l border-border bg-card flex flex-col overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            <div className="p-4">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Members — 12 Online</p>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider px-1 mb-2">Online</p>
                {members.filter(m => m.status === "online").map(m => (
                  <div key={m.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                    <Ava init={m.init} color={m.color} size="xs" status="online" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{m.name}</p>
                      {m.role === "Moderator" && <p className="text-[9px] text-violet-500 font-bold">Moderator</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

// ── Admin Page ────────────────────────────────────────────────────────────────

function Admin({ go, dark, tog }: { go: (p: Page) => void; dark: boolean; tog: () => void }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"users" | "moderation">("users");

  const filtered = adminUsers.filter(u =>
    u.name.toLowerCase().includes(q.toLowerCase()) ||
    u.email.toLowerCase().includes(q.toLowerCase()) ||
    u.dept.toLowerCase().includes(q.toLowerCase())
  );

  const metrics = [
    { label: "Total Students", val: "1,420", Icon: Users, delta: "+12% this month", color: "text-sky-500", bg: "bg-sky-400/10" },
    { label: "Active Communities", val: "48", Icon: Hash, delta: "+3 new this week", color: "text-violet-500", bg: "bg-violet-400/10" },
    { label: "Vault Files Shared", val: "312", Icon: FolderOpen, delta: "+28 this week", color: "text-emerald-500", bg: "bg-emerald-400/10" },
    { label: "Flagged Reports", val: "3", Icon: Flag, delta: "Needs review", color: "text-red-500", bg: "bg-red-400/10" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-3">
            <Logo sm />
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-400/10 border border-violet-400/20">
              <Shield size={11} className="text-violet-500" />
              <span className="text-xs font-black text-violet-500">Admin Panel</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={tog} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button onClick={() => go("dashboard")} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <LogOut size={15} /> Exit Admin
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {metrics.map(({ label, val, Icon, delta, color, bg }) => (
            <div key={label} className="p-5 rounded-2xl border border-border bg-card hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className={cx("w-11 h-11 rounded-xl flex items-center justify-center", bg)}>
                  <Icon size={20} className={color} />
                </div>
                <TrendingUp size={14} className="text-muted-foreground/50" />
              </div>
              <p className="text-4xl font-black text-foreground tracking-tight mb-0.5">{val}</p>
              <p className="text-sm text-muted-foreground mb-2">{label}</p>
              <p className={cx("text-xs font-bold", label === "Flagged Reports" ? "text-red-500" : "text-emerald-500")}>{delta}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 w-fit mb-6">
          {(["users", "moderation"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cx("px-5 py-2 rounded-lg text-sm font-bold capitalize transition-all cursor-pointer",
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {t === "users" ? "User Management" : "Moderation Queue"}
            </button>
          ))}
        </div>

        {tab === "users" ? (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">All Students</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} users</p>
              </div>
              <Btn variant="primary" size="sm"><Plus size={13} /> Add User</Btn>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-slate-50/70 dark:bg-slate-800/50">
                    {["Name", "Email", "Roll No.", "Department", "Role", "Status", "Actions"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Ava init={u.name.split(" ").map(n => n[0]).join("")} color={u.role === "Moderator" ? "bg-violet-500" : "bg-sky-500"} size="sm" />
                          <span className="text-sm font-bold text-foreground whitespace-nowrap">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{u.email}</td>
                      <td className="px-5 py-3.5"><span className="text-xs tabular-nums font-bold text-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{u.roll}</span></td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{u.dept}</td>
                      <td className="px-5 py-3.5"><Chip variant={u.role === "Moderator" ? "moderator" : "default"}>{u.role}</Chip></td>
                      <td className="px-5 py-3.5"><Chip variant={u.status}>{u.status}</Chip></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button className="p-1 rounded text-muted-foreground hover:text-foreground"><Eye size={14} /></button>
                          <button className="p-1 rounded text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                          <button className="p-1 rounded text-muted-foreground hover:text-red-500"><Ban size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map(r => (
              <div key={r.id} className="p-5 rounded-2xl border border-border bg-card">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Chip variant={r.sev}>{r.sev} severity</Chip>
                      <span className="text-xs text-muted-foreground">#{r.community}</span>
                    </div>
                    <p className="text-sm font-bold text-foreground mb-1">Offender: {r.offender}</p>
                    <p className="text-sm text-muted-foreground italic mb-2">"{r.snippet}"</p>
                  </div>
                  <div className="flex gap-2">
                    <Btn variant="secondary" size="sm">Dismiss</Btn>
                    <Btn variant="danger" size="sm">Action</Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root Pure Figma App ───────────────────────────────────────────────────────

export function App() {
  const [dark, setDark] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const tog = () => setDark(d => !d);
  
  const go = (p: string) => {
    if (p === "home") navigate("/");
    else navigate(`/${p}`);
  };

  const p = { go, dark, tog };

  return (
    <div style={{ fontFamily: "var(--font-sans)" }} className="min-h-screen bg-background text-foreground">
      <GlobalBroadcastBanner />
      <Routes>
        {/* Public Guest Routes */}
        <Route element={<PublicRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
        </Route>
        <Route path="/home" element={<Navigate to="/" replace />} />

        {/* Fallback 403 Forbidden Route */}
        <Route path="/403" element={<Forbidden403Page />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage {...p} />} />
          <Route path="/direct-messages" element={<DirectMessagesPage />} />
          <Route path="/direct-messages/:conversationId" element={<DirectMessagesPage />} />
          <Route path="/resources" element={<ConnectionsResourcesPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<StudentSettingsPage />} />
          <Route path="/help" element={<HelpFaqPage />} />
          <Route path="/faq" element={<Navigate to="/help" replace />} />

          {/* Governance Protected Routes (Admin & Moderator Only) */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/profile" element={<AdminProfilePage />} />
            <Route path="/admin/*" element={<AdminPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </div>
  );
}

export default App;
