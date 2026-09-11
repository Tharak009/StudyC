import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Mail,
  Lock,
  User,
  GraduationCap,
  Hash,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  Sun,
  Moon,
  Loader2
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useAuthStore } from "../store/auth.store";
import { useThemeStore } from "../store/theme.store";
import { useToastStore } from "../store/toast.store";

const departments = [
  "Computer Science & Engineering",
  "Artificial Intelligence & Data Science",
  "Electrical & Electronics Engineering",
  "Mechanical Engineering",
  "Information Technology",
  "Electronics & Communication Engineering"
];

const academicYears = [
  { label: "1st Year (Freshman)", value: 1 },
  { label: "2nd Year (Sophomore)", value: 2 },
  { label: "3rd Year (Junior)", value: 3 },
  { label: "4th Year (Senior)", value: 4 }
];

export function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = theme === "dark";
  const { addToast } = useToastStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    rollNumber: "",
    department: departments[0],
    academicYear: academicYears[0].value,
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // Password entropy & strength calculator
  const calculateStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score; // 0 to 4
  };

  const strength = calculateStrength(formData.password);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate institutional email format
    const isEduOrCampus = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(edu|ac\.[a-z]{2,3}|[a-z]{2,}\.edu\.[a-z]{2,3}|org|in)$/i.test(
      formData.email
    );

    if (!isEduOrCampus && !formData.email.includes("edu") && !formData.email.includes("ac.") && !formData.email.includes(".in")) {
      setError("Please use your valid institutional (.edu, .ac.in, or university) email address.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.rollNumber.trim()) {
      setError("Please enter your official student roll / registration number.");
      return;
    }

    try {
      await registerUser({
        fullName: formData.fullName.trim(),
        rollNumber: formData.rollNumber.trim(),
        department: formData.department,
        academicYear: formData.academicYear,
        email: formData.email.trim(),
        password: formData.password
      });

      addToast("Student account created successfully!", "success");
      navigate("/dashboard");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Registration failed. Please check your details and try again.";
      setError(msg);
      addToast(msg, "error");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#080D1A] px-4 py-12 selection:bg-[#1E90FF]/25 selection:text-[#1E90FF] transition-colors duration-300">
      {/* ── Background Ambient Glows ───────────────────────────────────── */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-[#1E90FF]/20 dark:bg-[#1E90FF]/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-10 left-10 h-72 w-72 rounded-full bg-[#1E90FF]/15 dark:bg-[#1E90FF]/10 blur-[100px]" />

      {/* ── Theme Switcher ────────────────────────────────────────────── */}
      <div className="absolute top-5 right-5 z-20">
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white/80 dark:bg-[#0F1A30]/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-all cursor-pointer"
        >
          {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-slate-700" />}
        </button>
      </div>

      {/* ── Centered Glass Card Container ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0F1A30]/80 p-8 sm:p-10 backdrop-blur-2xl shadow-xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      >
        {/* Brand Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E90FF] text-white shadow-md shadow-[#1E90FF]/25 group-hover:scale-105 transition-transform">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">StudyConnect</span>
          </Link>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            {step === 1 ? "Create your Student Account" : "Academic Verification"}
          </h2>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
            {step === 1
              ? "Join your verified campus network and collaborate in real time."
              : "Help us verify your batch and academic department."}
          </p>
        </div>

        {/* ── 2-Step Visual Indicator ──────────────────────────────────── */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs font-bold ${step >= 1 ? "text-[#1E90FF]" : "text-slate-400 dark:text-slate-600"}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${step >= 1 ? "border-[#1E90FF] bg-[#1E90FF]/10" : "border-current"}`}>1</span>
            Account
          </div>
          <div className={`h-[1px] w-8 transition-colors ${step === 2 ? "bg-[#1E90FF]" : "bg-slate-200 dark:bg-slate-800"}`} />
          <div className={`flex items-center gap-1.5 text-xs font-bold ${step === 2 ? "text-[#1E90FF]" : "text-slate-400 dark:text-slate-600"}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${step === 2 ? "border-[#1E90FF] bg-[#1E90FF]/10" : "border-current"}`}>2</span>
            Campus Data
          </div>
        </div>

        {/* ── Error Banner with Shake Animation ────────────────────────── */}
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
            transition={{ duration: 0.4 }}
            className="mt-5 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-300"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 ? (
            /* ── STEP 1: Account Credentials ─────────────────────────── */
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              onSubmit={handleNextStep}
              className="mt-6 space-y-4 text-left"
            >
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Aarav Sharma"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#080D1A]/70 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#1E90FF] focus:outline-none focus:ring-1 focus:ring-[#1E90FF] transition-all"
                  />
                </div>
              </div>

              {/* Institutional Email */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Institutional Email</label>
                  <span className="text-[10px] text-[#1E90FF] font-medium">.edu / .ac.in domain required</span>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="aarav@college.edu or @iitd.ac.in"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#080D1A]/70 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#1E90FF] focus:outline-none focus:ring-1 focus:ring-[#1E90FF] transition-all"
                  />
                </div>
              </div>

              {/* Password & Live Entropy Meter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#080D1A]/70 pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#1E90FF] focus:outline-none focus:ring-1 focus:ring-[#1E90FF] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* 4-Tier Dynamic Entropy Meter */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex gap-1.5 h-1.5">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-full flex-1 rounded-full transition-all duration-300 ${
                            strength >= level
                              ? level <= 1
                                ? "bg-rose-500"
                                : level <= 2
                                ? "bg-amber-500"
                                : level <= 3
                                ? "bg-[#1E90FF]"
                                : "bg-emerald-500"
                              : "bg-slate-200 dark:bg-slate-800"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                      {strength <= 1 && "Weak password"}
                      {strength === 2 && "Fair (Include uppercase, numbers & symbols)"}
                      {strength === 3 && "Good (Almost ready)"}
                      {strength === 4 && "Strong password"}
                    </p>
                  </div>
                )}
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] py-3 text-xs font-bold text-white shadow-[0_0_20px_rgba(30,144,255,0.35)] hover:shadow-[0_0_25px_rgba(30,144,255,0.45)] transition-all cursor-pointer"
              >
                <span>Continue to Campus Verification</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </motion.button>
            </motion.form>
          ) : (
            /* ── STEP 2: Academic Profile Data ───────────────────────── */
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              onSubmit={handleFinalSubmit}
              className="mt-6 space-y-4 text-left"
            >
              {/* Roll Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Roll / Student ID Number
                </label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS24-104"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#080D1A]/70 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#1E90FF] focus:outline-none focus:ring-1 focus:ring-[#1E90FF] transition-all"
                  />
                </div>
              </div>

              {/* Department Selector (6 Disciplines) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Department</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#080D1A]/70 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#1E90FF] focus:outline-none focus:ring-1 focus:ring-[#1E90FF] transition-all appearance-none cursor-pointer"
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept} className="bg-white dark:bg-[#0F1A30] text-slate-900 dark:text-slate-200">
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Academic Year Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Current Academic Year</label>
                <select
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: parseInt(e.target.value, 10) })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#080D1A]/70 px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#1E90FF] focus:outline-none focus:ring-1 focus:ring-[#1E90FF] transition-all appearance-none cursor-pointer"
                >
                  {academicYears.map((year) => (
                    <option key={year.value} value={year.value} className="bg-white dark:bg-[#0F1A30] text-slate-900 dark:text-slate-200">
                      {year.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campus Data Info Callout */}
              <div className="rounded-xl border border-[#1E90FF]/25 bg-[#1E90FF]/5 p-3.5 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-[#1E90FF] shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Your roll number and institutional domain are used to automatically map you into your department's study circles and peer cohorts.
                </p>
              </div>

              {/* Navigation Actions */}
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#080D1A]/70 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-[#1E90FF]/40 hover:text-[#1E90FF] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] py-3 text-xs font-bold text-white shadow-[0_0_20px_rgba(30,144,255,0.35)] hover:shadow-[0_0_25px_rgba(30,144,255,0.45)] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Verifying with Campus...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </>
                  )}
                </motion.button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-[#1E90FF] hover:text-[#187bcd] hover:underline transition-colors">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default RegisterPage;
