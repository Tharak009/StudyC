import { useState, useMemo } from "react";
import {
  Users,
  Activity,
  Compass,
  Calendar,
  FileText,
  MessageSquare,
  ShieldAlert,
  Megaphone,
  Download,
  Filter,
  RefreshCw,
  Search,
  BookOpen,
  CalendarDays,
  TrendingUp,
  UserCheck,
  Building,
  CheckCircle,
  Inbox,
  AlertTriangle,
  Clock
} from "lucide-react";
import { DashboardCard } from "../components/dashboard-card";
import {
  InteractiveLineChart,
  InteractiveBarChart,
  InteractiveDoughnutChart,
  InteractiveComboChart
} from "../components/analytics-charts";
import { useToastStore } from "../store/toast.store";

type TabSection = "USERS" | "COMMUNITIES" | "CONTENT" | "REPORTS" | "DEPARTMENTS" | "LEADERBOARDS";

export function AnalyticsDashboardPage() {
  const { addToast } = useToastStore();

  // Filters State
  const [dateFilter, setDateFilter] = useState("30"); // Last 30 Days (default)
  const [showFilters, setShowFilters] = useState(false);
  const [filterDept, setFilterDept] = useState("ALL");
  const [filterYear, setFilterYear] = useState("ALL");
  const [activeTab, setActiveTab] = useState<TabSection>("USERS");

  // Export States
  const [exportOpen, setExportOpen] = useState(false);

  // Simulated Loading/Refreshing State
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      addToast("Analytics refreshed successfully", "success");
    }, 1000);
  };

  const handleExport = (format: "CSV" | "Excel" | "PDF") => {
    setExportOpen(false);
    addToast(`Preparing export for ${activeTab.toLowerCase()} analytics as ${format}...`, "info");
    setTimeout(() => {
      addToast(`${format} export file downloaded successfully`, "success");
    }, 2000);
  };

  // Dynamic Multipliers based on date filter to simulate query state refresh
  const scaleFactor = useMemo(() => {
    switch (dateFilter) {
      case "1": return 0.05; // Today
      case "7": return 0.25; // 7 Days
      case "30": return 1.0; // 30 Days (baseline)
      case "90": return 2.8; // 90 Days
      case "365": return 11.2; // This Year
      default: return 1.0;
    }
  }, [dateFilter]);

  // Statistics KPI computation based on filters
  const stats = useMemo(() => {
    const baseStudents = 450;
    const baseActiveToday = 145;
    const baseMAU = 320;
    const baseRegistrations = 28;
    const baseCommunities = 18;
    const baseEvents = 24;
    const basePosts = 840;
    const baseComments = 1620;
    const baseReports = 38;
    const baseAnnViews = 918;

    // Apply scaling factors and department overrides
    const deptScale = filterDept !== "ALL" ? 0.35 : 1.0;
    const yearScale = filterYear !== "ALL" ? 0.28 : 1.0;
    const combinedScale = deptScale * yearScale;

    return {
      students: Math.round(baseStudents * (filterDept !== "ALL" ? 0.25 : 1.0) * (filterYear !== "ALL" ? 0.25 : 1.0)),
      activeToday: Math.round(baseActiveToday * combinedScale * (dateFilter === "1" ? 1.0 : 0.8)),
      mau: Math.round(baseMAU * combinedScale),
      registrations: Math.round(baseRegistrations * scaleFactor * combinedScale),
      communities: filterDept !== "ALL" ? 4 : baseCommunities,
      events: Math.round(baseEvents * scaleFactor * combinedScale),
      posts: Math.round(basePosts * scaleFactor * combinedScale),
      comments: Math.round(baseComments * scaleFactor * combinedScale),
      reports: Math.round(baseReports * scaleFactor),
      annViews: Math.round(baseAnnViews * scaleFactor)
    };
  }, [scaleFactor, filterDept, filterYear, dateFilter]);

  // ----------------------------------------------------
  // DYNAMIC CHART DATA GENERATION
  // ----------------------------------------------------

  const dauData = useMemo(() => {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return labels.map((l, idx) => ({
      label: l,
      value: Math.round((80 + idx * 12 + Math.sin(idx) * 15) * scaleFactor),
      secondaryValue: Math.round((5 + idx * 2) * scaleFactor)
    }));
  }, [scaleFactor]);

  const mauData = useMemo(() => {
    const labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
    return labels.map((l, idx) => ({
      label: l,
      value: Math.round((240 + idx * 25) * scaleFactor)
    }));
  }, [scaleFactor]);

  const registrationsData = useMemo(() => {
    const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    return labels.map((l, idx) => ({
      label: l,
      value: Math.round((12 + idx * 8 + Math.cos(idx) * 4) * scaleFactor)
    }));
  }, [scaleFactor]);

  const retentionData = useMemo(() => {
    return [
      { label: "Day 1", value: 85 },
      { label: "Day 7", value: 62 },
      { label: "Day 14", value: 48 },
      { label: "Day 30", value: 35 }
    ];
  }, []);

  const loginFrequencyData = useMemo(() => {
    return [
      { label: "1x / week", value: 90 },
      { label: "2-3x / week", value: 180 },
      { label: "Daily", value: 150 }
    ];
  }, []);

  const communityGrowthData = useMemo(() => {
    return [
      { label: "Jan", value: 4 },
      { label: "Feb", value: 7 },
      { label: "Mar", value: 11 },
      { label: "Apr", value: 14 },
      { label: "May", value: 18 }
    ];
  }, []);

  const communityMembershipData = useMemo(() => {
    return [
      { label: "Java Coding", value: 145 },
      { label: "React Builders", value: 120 },
      { label: "Freshers 2026", value: 310 },
      { label: "Algorithms Forum", value: 85 },
      { label: "Mech Club", value: 62 }
    ];
  }, []);

  const communityEngagementData = useMemo(() => {
    return [
      { label: "Freshers 2026", value: 850 },
      { label: "React Builders", value: 420 },
      { label: "Java Coding", value: 310 },
      { label: "Algorithms Forum", value: 240 }
    ];
  }, []);

  const eventAttendanceData = useMemo(() => {
    return [
      { label: "Placement Drive", value: 92 },
      { label: "React 19 Workshop", value: 85 },
      { label: "Mech Fest Night", value: 78 },
      { label: "CSE Midterms", value: 96 }
    ];
  }, []);

  const contentCreationData = useMemo(() => {
    return [
      { label: "Mon", value: Math.round(45 * scaleFactor) },
      { label: "Tue", value: Math.round(55 * scaleFactor) },
      { label: "Wed", value: Math.round(75 * scaleFactor) },
      { label: "Thu", value: Math.round(62 * scaleFactor) },
      { label: "Fri", value: Math.round(80 * scaleFactor) }
    ];
  }, [scaleFactor]);

  const reportCategoryData = useMemo(() => {
    return [
      { label: "Spam", value: 15 },
      { label: "Harassment", value: 8 },
      { label: "Academic Dishonesty", value: 12 },
      { label: "Copyright", value: 3 }
    ];
  }, []);

  const departmentStudentsData = useMemo(() => {
    return [
      { label: "Computer Science", value: 180 },
      { label: "Information Tech", value: 120 },
      { label: "Mechanical Eng", value: 90 },
      { label: "Civil Eng", value: 60 }
    ];
  }, []);

  const departmentActivityData = useMemo(() => {
    return [
      { label: "CS", value: 450 },
      { label: "IT", value: 320 },
      { label: "ME", value: 180 },
      { label: "CE", value: 90 }
    ];
  }, []);

  const announcementReadRateData = useMemo(() => {
    return [
      { label: "Emergency Water", value: 94 },
      { label: "CSE Midterm", value: 82 },
      { label: "Placement Drive", value: 68 }
    ];
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Title & Date filter Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-fade-up">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span>Admin</span>
            <span>/</span>
            <span className="text-slate-500 dark:text-slate-400">Analytics Dashboard</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            System Analytics
          </h2>
        </div>

        {/* Global Date Selector & Export Actions */}
        <div className="flex items-center gap-2">
          {/* Date Selector Dropdown */}
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                handleRefresh();
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-50 dark:border-white/5 dark:bg-ink-900 dark:text-slate-350 cursor-pointer"
            >
              <option value="1">Today</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">This Year</option>
            </select>
          </div>

          {/* Export Menu Trigger */}
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-750 shadow-sm dark:border-white/5 dark:bg-ink-900 dark:text-slate-350 cursor-pointer"
            >
              <Download size={14} />
              Export
            </button>

            {exportOpen && (
              <div className="absolute right-0 mt-1.5 z-20 w-36 origin-top-right rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg dark:border-white/5 dark:bg-ink-950 text-left animate-fade-up animate-duration-200">
                <button
                  onClick={() => handleExport("CSV")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.03] cursor-pointer"
                >
                  <FileText size={12} />
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport("Excel")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.03] cursor-pointer"
                >
                  <Building size={12} />
                  Export as Excel
                </button>
                <button
                  onClick={() => handleExport("PDF")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer font-medium"
                >
                  <AlertTriangle size={12} />
                  Export as PDF
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold shadow-sm transition cursor-pointer ${
              showFilters
                ? "border-indigo-500 bg-indigo-50 text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/5 dark:bg-ink-900 dark:text-slate-350"
            }`}
          >
            <Filter size={14} />
            Filters
          </button>
        </div>
      </div>

      {/* Advanced Filters Toolbar */}
      {showFilters && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-ink-900 grid gap-3 grid-cols-2 md:grid-cols-4 animate-fade-down animate-duration-200">
          <div>
            <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Department scope
            </label>
            <select
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                handleRefresh();
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-750 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              <option value="CS">Computer Science</option>
              <option value="IT">Information Technology</option>
              <option value="ME">Mechanical Engineering</option>
              <option value="CE">Civil Engineering</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Academic Year
            </label>
            <select
              value={filterYear}
              onChange={(e) => {
                setFilterYear(e.target.value);
                handleRefresh();
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-750 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300 dark:focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>
          </div>
        </div>
      )}

      {isLoading ? (
        /* Refreshing Loading skeletons */
        <div className="animate-pulse space-y-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-5 h-20 bg-slate-100/50 dark:bg-white/[0.01] rounded-2xl border dark:border-white/5" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-64 rounded-2xl bg-slate-150/40 dark:bg-white/[0.01] border dark:border-white/5" />
            <div className="h-64 rounded-2xl bg-slate-150/40 dark:bg-white/[0.01] border dark:border-white/5" />
          </div>
        </div>
      ) : (
        <>
          {/* 10 Statistics overview cards grid */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-5 animate-fade-up">
            <DashboardCard
              title="Students"
              value={stats.students}
              icon={<Users size={16} />}
              trend={{ value: "+12.5%", isPositive: true }}
            />
            <DashboardCard
              title="Active Today"
              value={stats.activeToday}
              icon={<Activity size={16} />}
              trend={{ value: "+4.2%", isPositive: true }}
            />
            <DashboardCard
              title="MAU"
              value={stats.mau}
              icon={<UserCheck size={16} />}
              trend={{ value: "+8.1%", isPositive: true }}
            />
            <DashboardCard
              title="New Registrations"
              value={stats.registrations}
              icon={<TrendingUp size={16} />}
              trend={{ value: "+15.3%", isPositive: true }}
            />
            <DashboardCard
              title="Communities"
              value={stats.communities}
              icon={<Compass size={16} />}
              trend={{ value: "Seeded", isPositive: true }}
            />
            <DashboardCard
              title="Events"
              value={stats.events}
              icon={<Calendar size={16} />}
              trend={{ value: "+11.4%", isPositive: true }}
            />
            <DashboardCard
              title="Posts"
              value={stats.posts}
              icon={<FileText size={16} />}
              trend={{ value: "+22.5%", isPositive: true }}
            />
            <DashboardCard
              title="Comments"
              value={stats.comments}
              icon={<MessageSquare size={16} />}
              trend={{ value: "+18.1%", isPositive: true }}
            />
            <DashboardCard
              title="Reports"
              value={stats.reports}
              icon={<ShieldAlert size={16} />}
              trend={{ value: "-4.2%", isPositive: false }}
            />
            <DashboardCard
              title="Announcement Views"
              value={stats.annViews}
              icon={<Megaphone size={16} />}
              trend={{ value: "+30.5%", isPositive: true }}
            />
          </div>

          {/* Section Selector Tab bar */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-white/5 pb-2 animate-fade-up">
            {[
              { id: "USERS" as TabSection, label: "User Engagement" },
              { id: "COMMUNITIES" as TabSection, label: "Communities & Events" },
              { id: "CONTENT" as TabSection, label: "Content & Announcements" },
              { id: "REPORTS" as TabSection, label: "Reports & Moderation" },
              { id: "DEPARTMENTS" as TabSection, label: "Department Activity" },
              { id: "LEADERBOARDS" as TabSection, label: "Top Performers" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer border ${
                  activeTab === tab.id
                    ? "bg-indigo-600 border-indigo-600 text-white dark:bg-indigo-500 dark:border-indigo-500"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/5 dark:bg-ink-900 dark:text-slate-350"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* DYNAMIC TAB CHARTS GRID */}
          <div className="grid gap-6 lg:grid-cols-2 animate-fade-up">
            {activeTab === "USERS" && (
              <>
                <InteractiveComboChart
                  title="Daily Active Users vs. New Registrations"
                  data={dauData}
                  color="#3b82f6"
                  secondaryColor="#f43f5e"
                />
                <InteractiveLineChart
                  title="Monthly Active Users Trend"
                  data={mauData}
                  color="#6366f1"
                />
                <InteractiveBarChart
                  title="User Registrations By Month"
                  data={registrationsData}
                  color="#10b981"
                />
                <InteractiveDoughnutChart
                  title="Login Frequency Breakdown"
                  data={loginFrequencyData}
                />
              </>
            )}

            {activeTab === "COMMUNITIES" && (
              <>
                <InteractiveBarChart
                  title="Most Active Communities (Member count)"
                  data={communityMembershipData}
                  color="#8b5cf6"
                />
                <InteractiveLineChart
                  title="Community Growth (Total Spaces)"
                  data={communityGrowthData}
                  color="#06b6d4"
                />
                <InteractiveBarChart
                  title="Community Engagement Rating (Messages/Week)"
                  data={communityEngagementData}
                  color="#3b82f6"
                />
                <InteractiveDoughnutChart
                  title="Event Attendance Ratio (%)"
                  data={eventAttendanceData}
                />
              </>
            )}

            {activeTab === "CONTENT" && (
              <>
                <InteractiveLineChart
                  title="Content Activity (Posts + Comments)"
                  data={contentCreationData}
                  color="#ec4899"
                />
                <InteractiveBarChart
                  title="Announcement Read Rates (%)"
                  data={announcementReadRateData}
                  color="#eab308"
                />
              </>
            )}

            {activeTab === "REPORTS" && (
              <>
                <InteractiveDoughnutChart
                  title="Submitted Reports Categories"
                  data={reportCategoryData}
                />
                <div className="rounded-2xl border border-slate-150 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900 flex flex-col justify-center text-center">
                  <Clock size={36} className="mx-auto text-indigo-600 dark:text-indigo-400 mb-3" />
                  <h4 className="font-extrabold text-2xl text-slate-900 dark:text-white leading-none">
                    4.8 Hours
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-450 mt-2 font-semibold">
                    Average Report Resolution Time
                  </p>
                  <span className="block mt-1 text-[10px] text-emerald-600 font-bold uppercase">
                    ▼ 18.5% Improvement this week
                  </span>
                </div>
              </>
            )}

            {activeTab === "DEPARTMENTS" && (
              <>
                <InteractiveBarChart
                  title="Students count by department"
                  data={departmentStudentsData}
                  color="#6366f1"
                />
                <InteractiveLineChart
                  title="Departmental Activity (Posts/Week)"
                  data={departmentActivityData}
                  color="#8b5cf6"
                />
              </>
            )}

            {activeTab === "LEADERBOARDS" && (
              <div className="lg:col-span-2 space-y-6">
                {/* Ranking Tables grid */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Top Active Students */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-ink-900">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wider">
                      Most Active Students
                    </h4>
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                      {[
                        { name: "Vikram Malhotra", dept: "IT", activity: "142 actions" },
                        { name: "Ananya Roy", dept: "IT", activity: "128 actions" },
                        { name: "Kabir Mehta", dept: "CSE", activity: "115 actions" },
                        { name: "Swetha Lakshmi", dept: "CSE", activity: "96 actions" }
                      ].map((item, idx) => (
                        <div key={idx} className="flex justify-between py-2 text-xs font-semibold">
                          <span className="text-slate-700 dark:text-slate-350">
                            {idx + 1}. {item.name} ({item.dept})
                          </span>
                          <span className="text-indigo-650 dark:text-indigo-400">{item.activity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Communities */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-ink-900">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wider">
                      Popular Communities
                    </h4>
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                      {[
                        { name: "Freshers 2026", type: "General", activity: "310 members" },
                        { name: "Java Coding Club", type: "Clubs", activity: "145 members" },
                        { name: "React Builders", type: "Academic", activity: "120 members" },
                        { name: "Algorithms Forum", type: "Academic", activity: "85 members" }
                      ].map((item, idx) => (
                        <div key={idx} className="flex justify-between py-2 text-xs font-semibold">
                          <span className="text-slate-700 dark:text-slate-350">
                            {idx + 1}. {item.name} ({item.type})
                          </span>
                          <span className="text-indigo-650 dark:text-indigo-400">{item.activity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
