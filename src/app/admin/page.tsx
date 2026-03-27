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
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.7),0_0_60px_rgba(76,26,203,0.5)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
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
          delay={0.10}
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