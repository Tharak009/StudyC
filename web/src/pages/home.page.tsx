import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  MessageSquare,
  FileText,
  Users,
  ChevronDown,
  Star,
  CheckCircle,
  GraduationCap,
  Shield,
  Heart
} from "lucide-react";
import { Link } from "react-router";
import { Navbar } from "../components/layout/Navbar";
import { HeroSection } from "../components/landing/HeroSection";
import { AppPreviewCanvas } from "../components/landing/AppPreviewCanvas";
import { CampusMarquee } from "../components/landing/CampusMarquee";
import { BentoGridSection } from "../components/landing/BentoGridSection";
import { CtaSection } from "../components/landing/CtaSection";

// ── Interactive Live Community Demo Data ──────────────────────────────────────
const communitiesDemo = [
  {
    id: "cs-algo",
    name: "CS301 • Algorithm Analysis",
    dept: "Computer Science",
    members: 142,
    online: 38,
    activeTopic: "Dynamic Programming: Matrix Chain Multiplication Review",
    messages: [
      { sender: "Aarav Sharma", role: "Batch CS24", time: "10:14 AM", text: "Can someone share the recursive tree for Rod Cutting? Midsem question 2 is likely from this." },
      { sender: "Meera Rao", role: "Batch CS24", time: "10:16 AM", text: "Uploaded Prof. Verma's lecture 14 handwritten notes to the Resource Vault! Check the attachments tab." },
      { sender: "StudyCopilot AI", role: "Curriculum Bot", time: "10:16 AM", isBot: true, text: "💡 Tip: Matrix Chain Multiplication optimal parenthesization can be solved in O(n³) with O(n²) auxiliary table." }
    ]
  },
  {
    id: "ai-robotics",
    name: "AI402 • Deep Neural Networks",
    dept: "AI & Data Science",
    members: 98,
    online: 24,
    activeTopic: "PyTorch Transformer Attention Head Visualizations",
    messages: [
      { sender: "Kavya Patel", role: "Batch AI23", time: "11:02 AM", text: "Is the gradient checkpointing code running on the campus GPU cluster?" },
      { sender: "Rohan Nair", role: "Batch AI23", time: "11:05 AM", text: "Yes, allocate with `sbatch --gres=gpu:1`. Check the shared OS lab script in Vault." }
    ]
  },
  {
    id: "ece-signals",
    name: "EC204 • Signals & Systems",
    dept: "Electronics",
    members: 115,
    online: 19,
    activeTopic: "Fast Fourier Transform (FFT) Radix-2 Derivation",
    messages: [
      { sender: "Devanshu S.", role: "Batch EC25", time: "09:30 AM", text: "Voice stage is open for anyone preparing for tomorrow's DSP viva!" }
    ]
  }
];

// ── Verified Student Testimonials ─────────────────────────────────────────────
const testimonials = [
  {
    quote: "StudyConnect completely eliminated the chaos of having 15 different WhatsApp groups for each college course. The syllabus-bound AI Copilot is unmatched for exam prep.",
    name: "Aarav Sharma",
    roll: "CS24-104 • 3rd Year CSE",
    college: "IIT Delhi",
    rating: 5
  },
  {
    quote: "Having genuine peer-reviewed notes organized by semester and course code saved our entire batch during end-semester exams. The sub-15ms chat feels lightning fast.",
    name: "Meera Rao",
    roll: "CS24-110 • 3rd Year CSE",
    college: "BITS Pilani",
    rating: 5
  },
  {
    quote: "Knowing everyone in the workspace is verified with a real .edu email makes study discussions focused and 100% spam-free.",
    name: "Kavya Patel",
    roll: "AI23-042 • 4th Year AI/DS",
    college: "Stanford University",
    rating: 5
  }
];

// ── FAQ Items ─────────────────────────────────────────────────────────────────
const faqs = [
  {
    q: "Who can register on StudyConnect?",
    a: "StudyConnect is exclusively designed for students, teaching assistants, and faculty with a valid institutional email address (e.g. .edu, .ac.in, or university domains). This ensures a high-trust, spam-free learning environment."
  },
  {
    q: "How does the AI Study Copilot differ from standard ChatGPT?",
    a: "Unlike generic LLMs that might hallucinate outside of your course scope, StudyConnect Copilot is strictly grounded in your department's uploaded professor handouts, syllabus topics, and course notes."
  },
  {
    q: "Can I create private study rooms for group projects?",
    a: "Yes! You can launch department-wide public channels or spin up invite-only study circles with dedicated voice stages, file lockers, and realtime text chat."
  },
  {
    q: "Is StudyConnect free for college students?",
    a: "Yes, verified college students have full free access to multi-channel study circles, unlimited note sharing in the Resource Vault, and real-time direct messaging."
  }
];

export function HomePage() {
  const [selectedCommunity, setSelectedCommunity] = useState(communitiesDemo[0]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-50 selection:bg-[#1E90FF]/25 selection:text-[#1E90FF] font-sans antialiased overflow-x-hidden transition-colors duration-300">
      {/* ── 21st.dev Floating Frosted Glass Navbar ───────────────────────── */}
      <Navbar />

      {/* ── Hero Section with Verification Pill & Glows ─────────────────── */}
      <HeroSection />

      {/* ── 21st.dev Window Chrome Mockup Canvas ────────────────────────── */}
      <AppPreviewCanvas />

      {/* ── Campus Social Proof Marquee ─────────────────────────────────── */}
      <CampusMarquee />

      {/* ── Bento Grid Feature Architecture ─────────────────────────────── */}
      <BentoGridSection />

      {/* ── Live Interactive Community Demo Section ─────────────────────── */}
      <section id="demo" className="py-20 px-4 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#1E90FF] mb-2 block">
            Interactive Campus Sandbox
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Experience real-time study rooms
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Switch between live department channels and observe syllabus-grounded collaboration in action.
          </p>
        </div>

        {/* Demo Container */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0F1A30]/80 p-6 backdrop-blur-2xl shadow-xl dark:shadow-2xl">
          {/* Channel Switcher Sidebar (4 cols) */}
          <div className="md:col-span-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-2">
              Joined Study Circles
            </h3>
            {communitiesDemo.map((comm) => (
              <button
                key={comm.id}
                onClick={() => setSelectedCommunity(comm)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  selectedCommunity.id === comm.id
                    ? "border-[#1E90FF]/50 bg-[#1E90FF]/10 dark:bg-[#162544] shadow-md shadow-[#1E90FF]/10"
                    : "border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#080D1A]/50 hover:bg-slate-100 dark:hover:bg-[#162544]/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{comm.name}</span>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  <span>{comm.dept}</span>
                  <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{comm.online} online</span>
                </div>
              </button>
            ))}
          </div>

          {/* Active Chat & Topic Feed (8 cols) */}
          <div className="md:col-span-8 flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#080D1A]/80 p-5">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80 mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                    {selectedCommunity.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Topic: {selectedCommunity.activeTopic}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#1E90FF] bg-[#1E90FF]/10 px-2.5 py-1 rounded-full">
                  {selectedCommunity.members} Members
                </span>
              </div>

              {/* Message Feed */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedCommunity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3"
                >
                  {selectedCommunity.messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border ${
                        msg.isBot
                          ? "border-[#1E90FF]/40 bg-[#1E90FF]/10 dark:bg-[#162544]/80 text-[#1E90FF] dark:text-[#1E90FF]"
                          : "border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0F1A30]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className={msg.isBot ? "text-[#1E90FF] flex items-center gap-1" : "text-slate-900 dark:text-slate-200"}>
                            {msg.isBot && <Sparkles size={12} />}
                            {msg.sender}
                          </span>
                          <span className="text-[9px] font-normal text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#080D1A]">
                            {msg.role}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 tabular-nums">{msg.time}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                        {msg.text}
                      </p>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <span>Type your message to collaborate in real-time...</span>
              <Link
                to="/register"
                className="text-xs font-bold text-[#1E90FF] hover:underline"
              >
                Join with .EDU &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Verified Student Reviews & Testimonials ──────────────────────── */}
      <section className="py-20 px-4 max-w-6xl mx-auto border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-[#1E90FF] mb-2 block">
            Verified Reviews
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Built for college students, loved by campus toppers
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
              className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/75 p-6 backdrop-blur-xl flex flex-col justify-between shadow-md"
            >
              <div>
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} size={15} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic mb-6">
                  "{t.quote}"
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/60 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-slate-50">{t.name}</div>
                  <div className="text-[10px] text-slate-400 tabular-nums">{t.roll}</div>
                </div>
                <span className="text-[10px] font-bold text-[#1E90FF] bg-[#1E90FF]/10 px-2 py-0.5 rounded-full">
                  {t.college}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FAQ Section ─────────────────────────────────────────────────── */}
      <section className="py-20 px-4 max-w-4xl mx-auto border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#1E90FF] mb-2 block">
            Got Questions?
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F1A30]/75 overflow-hidden transition-colors"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between font-bold text-sm text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                    openFaq === idx ? "rotate-180 text-[#1E90FF]" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {openFaq === idx && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/40 pt-3"
                  >
                    {faq.a}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4 KPI Metrics & High-Converting CTA Banner ───────────────────── */}
      <CtaSection />

      {/* ── Clean Institutional Footer ──────────────────────────────────── */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-12 px-4 bg-white/50 dark:bg-[#080D1A]/80 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#1E90FF] shadow-sm shadow-[#1E90FF]/25 text-white">
              <Sparkles className="h-3 w-3" />
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200">StudyConnect Campus OS</span>
            <span>• Built for .EDU Academic Excellence</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#campuses" className="hover:text-slate-900 dark:hover:text-white transition-colors">Campuses</a>
            <Link to="/login" className="hover:text-slate-900 dark:hover:text-white transition-colors">Sign In</Link>
            <Link to="/register" className="text-[#1E90FF] hover:text-[#187bcd] font-bold hover:underline">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
