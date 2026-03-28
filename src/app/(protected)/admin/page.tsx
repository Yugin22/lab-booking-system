"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Users,
  ClipboardList,
  Clock3,
  FlaskConical,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Activity,
  FolderCheck,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { supabase } from "@/lib/supabase";
import AnimatedContent from "@/components/AnimatedContent";


const Aurora = dynamic(() => import("@/components/Aurora"), {
  ssr: false,
});

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  is_admin: boolean | null;
};

type BookingRow = {
  id: string;
  status: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  computer_id: string | null;
  lab_id: number | null;
  created_at?: string | null;
  labs?: {
    name: string | null;
  } | null;
};

type LabRow = {
  id: number;
  name: string;
  status: "available" | "occupied" | "maintenance" | "unavailable" | string;
  available_slots: number | null;
  created_at?: string | null;
};

export default function AdminDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [adminProfile, setAdminProfile] = useState<ProfileRow | null>(null);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [usersCount, setUsersCount] = useState(0);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [labs, setLabs] = useState<LabRow[]>([]);

  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState("");

  const fetchAdminDashboard = async () => {
    try {
      setRefreshing(true);
      setError("");
      setAccessDenied("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setError(userError.message);
        return;
      }

      if (!user) {
        setAccessDenied("You must be logged in to access the admin dashboard.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, email, role, is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        return;
      }

      const adminRow = profile as ProfileRow | null;
      setAdminProfile(adminRow);

      if (!adminRow?.is_admin) {
        setAccessDenied("Access denied. This page is only for administrators.");
        return;
      }

      const [profilesRes, bookingsRes, labsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, name, email, role, is_admin")
          .order("email", { ascending: true }),
      
        supabase
          .from("bookings")
          .select(`
            id,
            status,
            date,
            start_time,
            end_time,
            computer_id,
            lab_id,
            created_at,
            labs:lab_id (
              name
            )
          `)
          .order("date", { ascending: false }),
      
        supabase
          .from("labs")
          .select("id, name, status, available_slots, created_at")
          .order("name", { ascending: true }),
      ]);

      if (profilesRes.error) {
        setError(`Profiles error: ${profilesRes.error.message}`);
        return;
      }

      if (bookingsRes.error) {
        setError(bookingsRes.error.message);
        return;
      }

      if (labsRes.error) {
        setError(labsRes.error.message);
        return;
      }

      const loadedProfiles = (profilesRes.data || []) as ProfileRow[];

      setProfiles(loadedProfiles);
      setUsersCount(loadedProfiles.length);
      setBookings((bookingsRes.data ?? []) as unknown as BookingRow[]);
      setLabs((labsRes.data || []) as LabRow[]);
    } catch {
      setError("Something went wrong while loading the admin dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setCheckingAccess(false);
    }
  };

  useEffect(() => {
    fetchAdminDashboard();
  }, []);

  const handleRefresh = async () => {
    if (refreshing) return;
    await fetchAdminDashboard();
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setError(error.message);
        setLoggingOut(false);
        return;
      }

      router.replace("/login");
    } catch {
      setError("Something went wrong while logging out.");
      setLoggingOut(false);
    }
  };

  const bookingStats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter(
      (booking) => booking.status?.toLowerCase() === "pending"
    ).length;
    const approved = bookings.filter(
      (booking) => booking.status?.toLowerCase() === "approved"
    ).length;
    const rejected = bookings.filter((booking) => {
      const status = booking.status?.toLowerCase();
      return status === "rejected" || status === "cancelled";
    }).length;

    return {
      total,
      pending,
      approved,
      rejected,
    };
  }, [bookings]);

  const labStats = useMemo(() => {
    const totalLabs = labs.length;
    const available = labs.filter(
      (lab) => lab.status?.toLowerCase() === "available"
    ).length;
    const occupied = labs.filter(
      (lab) => lab.status?.toLowerCase() === "occupied"
    ).length;
    const unavailable = labs.filter((lab) => {
      const status = lab.status?.toLowerCase();
      return status === "maintenance" || status === "unavailable";
    }).length;

    const totalSlots = labs.reduce(
      (sum, lab) => sum + (Number(lab.available_slots) || 0),
      0
    );

    return {
      totalLabs,
      available,
      occupied,
      unavailable,
      totalSlots,
    };
  }, [labs]);

  const bookingStatusChartData = useMemo(() => {
    return [
      { name: "Pending", value: bookingStats.pending },
      { name: "Approved", value: bookingStats.approved },
      { name: "Rejected/Cancelled", value: bookingStats.rejected },
    ];
  }, [bookingStats]);

  const labStatusChartData = useMemo(() => {
    return [
      { name: "Available", value: labStats.available },
      { name: "Occupied", value: labStats.occupied },
      { name: "Maintenance/Unavailable", value: labStats.unavailable },
    ];
  }, [labStats]);

  const mostUsedLaboratoriesData = useMemo(() => {
    const counts: Record<string, number> = {};

    bookings.forEach((booking) => {
      const labName = booking.labs?.name || "Unknown Lab";
      counts[labName] = (counts[labName] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [bookings]);

  const bookingsPerDayData = useMemo(() => {
    const counts: Record<string, number> = {};

    bookings.forEach((booking) => {
      if (!booking.date) return;
      counts[booking.date] = (counts[booking.date] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-10)
      .map(([date, value]) => ({
        date: formatShortDate(date),
        value,
      }));
  }, [bookings]);

  const formatTime = (value?: string | null) => {
    if (!value) return "";
  
    const date = new Date(`1970-01-01T${value}`);
    if (isNaN(date.getTime())) return value;
  
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const peakBookingHoursData = useMemo(() => {
    const counts: Record<string, number> = {};

    bookings.forEach((booking) => {
      const start = booking.start_time?.slice(0, 5);
      const end = booking.end_time?.slice(0, 5);

      if (!start) return;

      const label = end
        ? `${formatTime(start)} - ${formatTime(end)}`
        : formatTime(start);

      counts[label] = (counts[label] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [bookings]);

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 6);
  }, [bookings]);


  const getBookingBadge = (status?: string | null) => {
    const value = status?.toLowerCase();

    if (value === "approved") {
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20";
    }

    if (value === "pending") {
      return "bg-amber-500/15 text-amber-300 border border-amber-400/20";
    }

    if (value === "rejected" || value === "cancelled") {
      return "bg-red-500/15 text-red-300 border border-red-400/20";
    }

    return "bg-white/10 text-white/80 border border-white/10";
  };

  const getLabBadge = (status?: string | null) => {
    const value = status?.toLowerCase();

    if (value === "available") {
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20";
    }

    if (value === "occupied") {
      return "bg-amber-500/15 text-amber-300 border border-amber-400/20";
    }

    if (value === "maintenance" || value === "unavailable") {
      return "bg-red-500/15 text-red-300 border border-red-400/20";
    }

    return "bg-white/10 text-white/80 border border-white/10";
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "No date";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  function formatShortDate(value?: string | null) {
    if (!value) return "—";
  
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
  
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  if (checkingAccess && loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black text-white">
        <AuroraBackground />
        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
          <AnimatedContent
            delay={0.1}
            duration={0.9}
            distance={50}
            direction="vertical"
            scale={0.98}
          >
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] px-6 py-5 text-sm text-white/70 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            Loading admin dashboard...
          </div>
          </AnimatedContent>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black text-white">
        <AuroraBackground />
        <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
          <AnimatedContent
            delay={0.1}
            duration={0.9}
            distance={50}
            direction="vertical"
            scale={0.98}
          >
          <div className="w-full rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-center shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
              <ShieldCheck className="h-7 w-7 text-red-300" />
            </div>
            <h1 className="text-2xl font-bold">Admin Access Only</h1>
            <p className="mt-3 text-sm text-red-100/90">{accessDenied}</p>
          </div>
          </AnimatedContent>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <AuroraBackground />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <AnimatedContent
          delay={0.2}
          duration={0.9}
          distance={50}
          direction="vertical"
          scale={0.98}
        >
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-cyan-300">
                Computer Laboratory Booking System
              </p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
                Admin Dashboard
              </h1>
              <p className="mt-2 text-sm text-white/60">
                Monitor users, bookings, pending requests, and laboratory usage
                statistics.
              </p>
              {adminProfile?.name && (
                <p className="mt-3 text-xs text-white/45">
                  Logged in as admin: {adminProfile.name}
                </p>
              )}
              {adminProfile?.role && (
                <p className="mt-1 text-xs text-white/35">
                  Role: {adminProfile.role}
                </p>
              )}
            </div>

            <div className="flex">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh Admin Dashboard"
                className="inline-flex items-center justify-center gap-2 mr-5 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.7),0_0_60px_rgba(76,26,203,0.5)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-5 w-5 text-white ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
                {refreshing
                  ? "Refreshing Admin Dashboard..."
                  : "Refresh Admin Dashboard"}
              </button>
            </div>
          </div>
        </div>
        </AnimatedContent>

        <AnimatedContent
          delay={0.3}
          duration={0.9}
          distance={50}
          direction="vertical"
          scale={0.98}
          >
            <section className="mb-5 rounded-[24px] border border-white/10 bg-white/[0.05] p-4 shadow-[0_10px_35px_rgba(0,0,0,0.2)] backdrop-blur-xl">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-[10px] font-medium text-sky-300">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Live Analytics
                  </div>
                  <h2 className="mt-2 text-base font-bold text-white sm:text-lg">
                    Analytics Overview
                  </h2>
                  <p className="mt-1 text-[11px] text-white/48">
                    Compact analytics from your Bookings and Labs Data.
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <AnalyticsMiniPill label="Bookings" value={bookingStats.total} />
                  <AnalyticsMiniPill label="Approved" value={bookingStats.approved} />
                  <AnalyticsMiniPill label="Pending" value={bookingStats.pending} />
                  <AnalyticsMiniPill label="Labs" value={labStats.totalLabs} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <CompactChartCard
              title="Bookings by Status"
              subtitle="Current bookings status"
              height="h-[150px]"
            >
              <div className="grid h-full grid-cols-[120px_1fr] items-center gap-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bookingStatusChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={28}
                      outerRadius={46}
                      paddingAngle={3}
                    >
                      <Cell fill="#F59E0B" />
                      <Cell fill="#10B981" />
                      <Cell fill="#EF4444" />
                    </Pie>
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#fff"
                      fontSize={12}
                      fontWeight={700}
                    >
                      {bookingStats.total}
                    </text>
                    <Tooltip content={<CompactTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-2 text-[11px]">
                  <ChartLegendRow color="bg-amber-400" label="Pending" value={bookingStats.pending} />
                  <ChartLegendRow color="bg-emerald-400" label="Approved" value={bookingStats.approved} />
                  <ChartLegendRow color="bg-red-400" label="Rejected" value={bookingStats.rejected} />
                </div>
              </div>
            </CompactChartCard>

            <CompactChartCard
              title="Lab Status Snapshot"
              subtitle="Quick availability overview"
              height="h-[150px]"
            >
              <div className="grid h-full grid-cols-3 gap-2">
                <StatusMiniCard label="Available" value={labStats.available} tone="emerald" />
                <StatusMiniCard label="Occupied" value={labStats.occupied} tone="amber" />
                <StatusMiniCard label="Unavailable" value={labStats.unavailable} tone="red" />
              </div>
            </CompactChartCard>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <CompactChartCard
              title="Most Used Laboratories"
              subtitle="Top 4 labs"
              height="h-[150px]"
            >
              <div className="space-y-2.5">
                {mostUsedLaboratoriesData.slice(0, 4).map((item) => {
                  const max = Math.max(...mostUsedLaboratoriesData.slice(0, 4).map((x) => x.value), 1);

                  return (
                    <MiniProgressRow
                      key={item.name}
                      label={item.name}
                      value={item.value}
                      widthPercent={(item.value / max) * 100}
                      barClassName="bg-gradient-to-r from-cyan-400 to-sky-500"
                    />
                  );
                })}
              </div>
            </CompactChartCard>

            <CompactChartCard
              title="Peak Booking Hours"
              subtitle="Top 4 active hours"
              height="h-[150px]"
            >
              <div className="space-y-2.5">
                {peakBookingHoursData.slice(0, 4).map((item) => {
                  const max = Math.max(...peakBookingHoursData.slice(0, 4).map((x) => x.value), 1);

                  return (
                    <MiniProgressRow
                      key={item.name}
                      label={item.name}
                      value={item.value}
                      widthPercent={(item.value / max) * 100}
                      barClassName="bg-gradient-to-r from-rose-400 to-orange-400"
                    />
                  );
                })}
              </div>
            </CompactChartCard>
          </div>
        </section>
        </AnimatedContent>

        {error && (
          <AnimatedContent
            delay={0.3}
            duration={0.9}
            distance={50}
            direction="vertical"
            scale={0.98}
          >
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
          </AnimatedContent>
        )}
        
        <AnimatedContent
          delay={0.4}
          duration={0.9}
          distance={50}
          direction="vertical"
          scale={0.98}
        >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Users"
            value={usersCount}
            subtitle="Registered accounts"
            icon={<Users className="h-6 w-6 text-cyan-300" />}
          />

          <StatCard
            title="Total Bookings"
            value={bookingStats.total}
            subtitle="All reservation requests"
            icon={<ClipboardList className="h-6 w-6 text-purple-300" />}
          />

          <StatCard
            title="Pending Requests"
            value={bookingStats.pending}
            subtitle="Waiting for approval"
            icon={<Clock3 className="h-6 w-6 text-amber-300" />}
          />

          <StatCard
            title="Occupied Labs"
            value={labStats.occupied}
            subtitle={`Out of ${labStats.totalLabs} laboratories`}
            icon={<FlaskConical className="h-6 w-6 text-pink-300" />}
          />
        </div>
        </AnimatedContent>

        <AnimatedContent
          delay={0.5}
          duration={0.9}
          distance={50}
          direction="vertical"
          scale={0.98}
        >
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-500/10 p-3">
              <FolderCheck className="h-5 w-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Admin Quick Actions</h2>
              <p className="text-sm text-white/50">
                Open admin tools to manage reservations and system activity
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <button
              onClick={() => router.push("/admin/manage-bookings")}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition-all duration-300 hover:border-cyan-400/30 hover:bg-white/[0.06] hover:shadow-[0_0_25px_rgba(34,211,238,0.12)]"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10">
                <ClipboardList className="h-6 w-6 text-cyan-300" />
              </div>
              <h3 className="text-base font-semibold text-white">
                Admin / Manage Bookings
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Approve, reject, or cancel reservations and filter records by
                date, lab, user, and status.
              </p>
              <p className="mt-4 text-sm font-medium text-cyan-300 transition group-hover:text-cyan-200">
                Manage Bookings →
              </p>
            </button>
            <button
              onClick={() => router.push("/admin/manage-laboratories")}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition-all duration-300 hover:border-fuchsia-400/30 hover:bg-white/[0.06] hover:shadow-[0_0_25px_rgba(217,70,239,0.12)]"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-500/10">
                <FlaskConical className="h-6 w-6 text-fuchsia-300" />
              </div>
              <h3 className="text-base font-semibold text-white">
                Admin / Manage Laboratories
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Add, edit, and delete computer labs. Set capacity, location, and availability hours.
              </p>
              <p className="mt-4 text-sm font-medium text-fuchsia-300 transition group-hover:text-fuchsia-200">
                Manage Laboratories →
              </p>
            </button>
            <button
              onClick={() => router.push("/admin/manage-users")}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition-all duration-300 hover:border-emerald-400/30 hover:bg-white/[0.06] hover:shadow-[0_0_25px_rgba(16,185,129,0.12)]"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Users className="h-6 w-6 text-emerald-300" />
              </div>
              <h3 className="text-base font-semibold text-white">
                Admin / Manage Users
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                View students, faculty, and admins. Assign roles and activate or deactivate accounts.
              </p>
              <p className="mt-4 text-sm font-medium text-emerald-300 transition group-hover:text-emerald-200">
                Manage Users →
              </p>
            </button>
            <button
              onClick={() => router.push("/admin/manage-schedule")}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition-all duration-300 hover:border-amber-400/30 hover:bg-white/[0.06] hover:shadow-[0_0_25px_rgba(251,191,36,0.12)]"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10">
                <Clock3 className="h-6 w-6 text-amber-300" />
              </div>
              <h3 className="text-base font-semibold text-white">
                Admin / Manage Schedules
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Configure available booking times, block maintenance dates, and manage holidays or unavailable periods.
              </p>
              <p className="mt-4 text-sm font-medium text-amber-300 transition group-hover:text-amber-200">
                Manage Schedules →
              </p>
            </button>
          </div>
        </section>
        </AnimatedContent>

        <AnimatedContent
          delay={0.6}
          duration={0.9}
          distance={50}
          direction="vertical"
          scale={0.98}
        >
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
          <button
            onClick={() => router.push("/admin/reports")}
            className="group w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition-all duration-300 hover:border-sky-400/30 hover:bg-white/[0.06] hover:shadow-[0_0_25px_rgba(56,189,248,0.12)]"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10">
              <BarChart3 className="h-6 w-6 text-sky-300" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Reports & Analytics
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/60">
              View booking history, most used lab, peak hours, and download reports.
            </p>
            <p className="mt-4 text-sm font-medium text-sky-300 transition group-hover:text-sky-200">
              Open Reports →
            </p>
          </button>
        </section>
        </AnimatedContent>

        <AnimatedContent
          delay={0.7}
          duration={0.9}
          distance={50}
          direction="vertical"
          scale={0.98}
        >
        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="xl:col-span-2 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-cyan-500/10 p-3">
                <Activity className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Recent Booking Activity</h2>
                <p className="text-sm text-white/50">
                  Latest booking requests and status updates
                </p>
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-white/60">Loading booking activity...</p>
            ) : recentBookings.length === 0 ? (
              <EmptyState text="No bookings found." />
            ) : (
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-white">
                          Laboratory: {booking.labs?.name || "Unknown Laboratory"}
                        </h3>
                        <p className="mt-2 text-sm text-white/70">
                          {formatDate(booking.date)}{" "}
                          {formatTime(booking.start_time) &&
                            `• ${formatTime(booking.start_time)} - ${formatTime(
                              booking.end_time
                            )}`}
                        </p>
                      </div>

                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium capitalize ${getBookingBadge(
                          booking.status
                        )}`}
                      >
                        {booking.status || "Unknown"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-purple-500/10 p-3">
                <FlaskConical className="h-5 w-5 text-purple-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Lab Usage Stats</h2>
                <p className="text-sm text-white/50">
                  Current laboratory availability overview
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {labs.length === 0 ? (
                <EmptyState text="No laboratory records found." />
              ) : (
                labs.slice(0, 6).map((lab) => (
                  <div
                    key={lab.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div>
                      <p className="font-medium text-white">{lab.name}</p>
                      <p className="mt-1 text-sm text-white/50">
                        Available slots: {lab.available_slots ?? 0}
                      </p>
                    </div>

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getLabBadge(
                        lab.status
                      )}`}
                    >
                      {lab.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
        </AnimatedContent>

        <AnimatedContent
          delay={0.8}
          duration={0.9}
          distance={50}
          direction="vertical"
          scale={0.98}
        >
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Booking Summary</h2>
                <p className="text-sm text-white/50">
                  Reservation request status overview
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MiniStat
                label="Approved"
                value={bookingStats.approved}
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-300" />}
              />
              <MiniStat
                label="Pending"
                value={bookingStats.pending}
                icon={<AlertCircle className="h-4 w-4 text-amber-300" />}
              />
              <MiniStat
                label="Rejected"
                value={bookingStats.rejected}
                icon={<XCircle className="h-4 w-4 text-red-300" />}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-pink-500/10 p-3">
                <ShieldCheck className="h-5 w-5 text-pink-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Lab Usage Overview</h2>
                <p className="text-sm text-white/50">
                  Availability and usage counts
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MiniStat
                label="Available"
                value={labStats.available}
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-300" />}
              />
              <MiniStat
                label="Occupied"
                value={labStats.occupied}
                icon={<AlertCircle className="h-4 w-4 text-amber-300" />}
              />
              <MiniStat
                label="Unavailable"
                value={labStats.unavailable}
                icon={<XCircle className="h-4 w-4 text-red-300" />}
              />
              <MiniStat
                label="Total Slots"
                value={labStats.totalSlots}
                icon={<Users className="h-4 w-4 text-cyan-300" />}
              />
            </div>
          </section>
        </div>
        </AnimatedContent>

        {profiles.length > 0 && (
          <AnimatedContent
            delay={0.9}
            duration={0.9}
            distance={50}
            direction="vertical"
            scale={0.98}
          >
          <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-cyan-500/10 p-3">
                <Users className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Visible User Profiles</h2>
                <p className="text-sm text-white/50">
                  These are the profile rows currently readable by this admin account
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <p className="text-sm font-medium text-white">
                    {profile.name || "No name"}
                  </p>
                  <p className="mt-1 text-xs text-white/55">
                    {profile.email || "No email"}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    Role: {profile.role || "—"} | Admin:{" "}
                    {profile.is_admin ? "Yes" : "No"}
                  </p>
                </div>
              ))}
            </div>
          </section>
          </AnimatedContent>
        )}

        <AnimatedContent
          delay={0.9}
          duration={0.9}
          distance={50}
          direction="vertical"
          scale={0.98}
        > 
        <div className="mt-8">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-100 duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:text-white hover:shadow-[0_0_30px_rgba(203,26,194,0.45)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <LogOut className="h-5 w-5" />
              {loggingOut ? "Logging out..." : "Log Out"}
            </span>
          </button>
        </div>
        </AnimatedContent>
      </div>
    </div>
  );
}

function CompactChartCard({
  title,
  subtitle,
  height = "h-[220px]",
  children,
}: {
  title: string;
  subtitle: string;
  height?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-0.5 text-[11px] text-white/42">{subtitle}</p>
      </div>
      <div className={`${height} w-full transition-all duration-500`}>{children}</div>
    </div>
  );
}

function CompactTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#08111f]/95 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      {label ? <p className="mb-0.5 text-[11px] text-white/55">{label}</p> : null}
      <p className="text-xs font-semibold text-white">
        {payload[0]?.name || "Value"}: {payload[0]?.value}
      </p>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-2xl bg-white/5 p-3">{icon}</div>
      </div>
      <h3 className="text-sm text-white/60">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm text-white/45">{subtitle}</p>
    </div>
  );
}

function AnalyticsMiniPill({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/38">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function ChartLegendRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-white/70">{label}</span>
      </div>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function MiniProgressRow({
  label,
  value,
  widthPercent,
  barClassName,
}: {
  label: string;
  value: number | string;
  widthPercent: number;
  barClassName: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="truncate text-[11px] text-white/72">{label}</p>
        <p className="text-[11px] font-semibold text-white">{value}</p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className={`h-full rounded-full ${barClassName}`}
          style={{ width: `${Math.max(8, Math.min(widthPercent, 100))}%` }}
        />
      </div>
    </div>
  );
}

function StatusMiniCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "emerald" | "amber" | "red";
}) {
  const toneMap = {
    emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-400/15",
    amber: "bg-amber-500/10 text-amber-300 border-amber-400/15",
    red: "bg-red-500/10 text-red-300 border-red-400/15",
  };

  return (
    <div className={`rounded-xl border p-3 text-center ${toneMap[tone]}`}>
      <p className="text-[10px] uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-2 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
      <div className="mb-2 flex items-center justify-center">{icon}</div>
      <p className="text-lg font-semibold text-white">{value}</p>
      <p className="text-xs text-white/55">{label}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/55">
      {text}
    </div>
  );
}

function AuroraBackground() {
  return (
    <>
      <div className="absolute inset-0 bg-black" />

      <div className="absolute inset-x-0 -top-[1%] h-[80vh] overflow-hidden sm:h-[52vh] lg:h-[68vh]">
        <Aurora
          colorStops={["#CB1A29", "#CB1AC2", "#4C1ACB"]}
          amplitude={1}
          speed={0.45}
          blend={2.15}
        />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_0%,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.04)_22%,rgba(0,0,0,0)_48%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-black/18 to-black" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_20%,transparent_0%,transparent_55%,rgba(0,0,0,0.28)_78%,rgba(0,0,0,0.55)_100%)]" />
      </div>
    </>
  );
}