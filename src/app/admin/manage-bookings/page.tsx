"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  RefreshCw,
  Search,
  CalendarDays,
  FlaskConical,
  User,
  CheckCircle2,
  XCircle,
  Ban,
  ClipboardList,
  Filter,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import AnimatedContent from "@/components/AnimatedContent";

const Aurora = dynamic(() => import("@/components/Aurora"), {
  ssr: false,
});

type AdminProfile = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  is_admin: boolean | null;
};

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  department?: string | null;
  course?: string | null;
};

type LabRow = {
  id: number;
  name: string;
};

type BookingRow = {
  id: string;
  user_id: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  computer_id: string | null;
  lab_id?: number | null;
  created_at?: string | null;
};

type BookingView = BookingRow & {
  user_name: string;
  user_email: string;
  user_department: string;
  user_course: string;
  lab_name: string;
};

export default function ManageBookingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(
    null
  );

  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileRow>>({});
  const [labsMap, setLabsMap] = useState<Record<string, string>>({});

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accessDenied, setAccessDenied] = useState("");

  const [dateFilter, setDateFilter] = useState("");
  const [labFilter, setLabFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchPageData = async () => {
    try {
      setRefreshing(true);
      setError("");
      setSuccess("");
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
        setAccessDenied("You must be logged in to access manage bookings.");
        return;
      }

      const { data: adminData, error: adminError } = await supabase
        .from("profiles")
        .select("id, name, email, role, is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (adminError) {
        setError(adminError.message);
        return;
      }

      const adminRow = adminData as AdminProfile | null;
      setAdminProfile(adminRow);

      if (!adminRow?.is_admin) {
        setAccessDenied("Access denied. This page is only for administrators.");
        return;
      }

      const [bookingsRes, profilesRes, labsRes] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            "id, user_id, date, start_time, end_time, status, computer_id, lab_id, created_at"
          )
          .order("date", { ascending: false }),

        supabase
          .from("profiles")
          .select("id, name, email, department, course"),

        supabase
          .from("labs")
          .select("id, name")
          .order("name", { ascending: true }),
      ]);

      if (bookingsRes.error) {
        setError(bookingsRes.error.message);
        return;
      }

      if (profilesRes.error) {
        setError(profilesRes.error.message);
        return;
      }

      if (labsRes.error) {
        setError(labsRes.error.message);
        return;
      }

      const profileRecord: Record<string, ProfileRow> = {};
      ((profilesRes.data || []) as ProfileRow[]).forEach((profile) => {
        profileRecord[profile.id] = profile;
      });

      const labRecord: Record<string, string> = {};
      ((labsRes.data || []) as LabRow[]).forEach((lab) => {
        labRecord[String(lab.id)] = lab.name;
      });

      setBookings((bookingsRes.data || []) as BookingRow[]);
      setProfilesMap(profileRecord);
      setLabsMap(labRecord);
    } catch {
      setError("Something went wrong while loading bookings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setCheckingAccess(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, []);

  const handleRefresh = async () => {
    if (refreshing) return;
    await fetchPageData();
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

  const allBookingViews: BookingView[] = useMemo(() => {
    return bookings.map((booking) => {
      const profile = booking.user_id ? profilesMap[booking.user_id] : undefined;

      const resolvedLabName =
        booking.lab_id != null
          ? labsMap[String(booking.lab_id)] || "Unknown Lab"
          : booking.computer_id || "Not specified";

      return {
        ...booking,
        user_name: profile?.name || "Unknown User",
        user_email: profile?.email || "No email",
        user_department: profile?.department || "—",
        user_course: profile?.course || "—",
        lab_name: resolvedLabName,
      };
    });
  }, [bookings, profilesMap, labsMap]);

  const filteredBookings = useMemo(() => {
    return allBookingViews.filter((booking) => {
      const matchesDate = dateFilter ? booking.date === dateFilter : true;

      const matchesLab = labFilter
        ? booking.lab_name.toLowerCase().includes(labFilter.toLowerCase()) ||
          (booking.computer_id || "").toLowerCase().includes(labFilter.toLowerCase())
        : true;

      const userText = `${booking.user_name} ${booking.user_email} ${booking.user_department} ${booking.user_course}`;
      const matchesUser = userFilter
        ? userText.toLowerCase().includes(userFilter.toLowerCase())
        : true;

      const matchesStatus =
        statusFilter === "all"
          ? true
          : (booking.status || "").toLowerCase() === statusFilter.toLowerCase();

      return matchesDate && matchesLab && matchesUser && matchesStatus;
    });
  }, [allBookingViews, dateFilter, labFilter, userFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = allBookingViews.length;
    const pending = allBookingViews.filter(
      (item) => item.status?.toLowerCase() === "pending"
    ).length;
    const approved = allBookingViews.filter(
      (item) => item.status?.toLowerCase() === "approved"
    ).length;
    const rejected = allBookingViews.filter(
      (item) => item.status?.toLowerCase() === "rejected"
    ).length;
    const cancelled = allBookingViews.filter(
      (item) => item.status?.toLowerCase() === "cancelled"
    ).length;

    return { total, pending, approved, rejected, cancelled };
  }, [allBookingViews]);

  const updateBookingStatus = async (
    bookingId: string,
    nextStatus: "approved" | "rejected" | "cancelled"
  ) => {
    if (updatingBookingId) return;
  
    setUpdatingBookingId(bookingId);
    setError("");
    setSuccess("");
  
    try {
      const { data, error } = await supabase
        .from("bookings")
        .update({
          status: nextStatus,
        })
        .eq("id", bookingId)
        .select("id, status")
        .single();
  
      if (error) {
        setError(`Failed to update booking: ${error.message}`);
        return;
      }
  
      if (!data) {
        setError("No booking row was updated. Check your Supabase RLS policies.");
        return;
      }
  
      setSuccess(`Reservation ${nextStatus} successfully.`);
  
      // Always re-fetch from database so UI matches actual DB state
      await fetchPageData();
    } catch (err) {
      console.error("Update booking status error:", err);
      setError("Something went wrong while updating the booking.");
    } finally {
      setUpdatingBookingId(null);
    }
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
  
    const normalized = value.length === 5 ? `${value}:00` : value;
    const date = new Date(`1970-01-01T${normalized}`);
  
    if (Number.isNaN(date.getTime())) return value;
  
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusBadge = (status?: string | null) => {
    const value = status?.toLowerCase();

    if (value === "approved") {
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20";
    }

    if (value === "pending") {
      return "bg-amber-500/15 text-amber-300 border border-amber-400/20";
    }

    if (value === "rejected") {
      return "bg-red-500/15 text-red-300 border border-red-400/20";
    }

    if (value === "cancelled") {
      return "bg-slate-500/15 text-slate-300 border border-slate-400/20";
    }

    return "bg-white/10 text-white/80 border border-white/10";
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
            Loading bookings...
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
                Admin / Manage Bookings
              </h1>
              <p className="mt-2 text-sm text-white/60">
                Approve, reject, or cancel reservations and filter records by
                date, lab, user, and status.
              </p>
              {adminProfile?.name && (
                <p className="mt-3 text-xs text-white/45">
                  Logged in as admin: {adminProfile.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => router.push("/admin")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.7),0_0_60px_rgba(76,26,203,0.5)] active:scale-95"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Admin Dashboard
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.7),0_0_60px_rgba(76,26,203,0.5)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Refreshing..." : "Refresh Bookings"}
              </button>
            </div>
          </div>
        </div>
        </AnimatedContent>

        {(error || success) && (
          <AnimatedContent
            delay={0.3}
            duration={0.9}
            distance={50}
            direction="vertical"
            scale={0.98}
          >
          <div className="mb-6 space-y-3">
            {error && (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {success}
              </div>
            )}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total"
            value={stats.total}
            icon={<ClipboardList className="h-6 w-6 text-cyan-300" />}
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={<Filter className="h-6 w-6 text-amber-300" />}
          />
          <StatCard
            title="Approved"
            value={stats.approved}
            icon={<CheckCircle2 className="h-6 w-6 text-emerald-300" />}
          />
          <StatCard
            title="Rejected"
            value={stats.rejected}
            icon={<XCircle className="h-6 w-6 text-red-300" />}
          />
          <StatCard
            title="Cancelled"
            value={stats.cancelled}
            icon={<Ban className="h-6 w-6 text-slate-300" />}
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
            <div className="rounded-xl bg-cyan-500/10 p-3">
              <Filter className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Filter Reservations</h2>
              <p className="text-sm text-white/50">
                Narrow down bookings by date, lab, user, or status
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FilterField
              icon={<CalendarDays className="h-4 w-4 text-white/45" />}
              label="Date"
            >
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
              />
            </FilterField>

            <FilterField
              icon={<FlaskConical className="h-4 w-4 text-white/45" />}
              label="Lab"
            >
              <input
                type="text"
                placeholder="Search by lab or computer"
                value={labFilter}
                onChange={(e) => setLabFilter(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
              />
            </FilterField>

            <FilterField
              icon={<User className="h-4 w-4 text-white/45" />}
              label="User"
            >
              <input
                type="text"
                placeholder="Name, email, department, course"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
              />
            </FilterField>

            <FilterField
              icon={<Search className="h-4 w-4 text-white/45" />}
              label="Status"
            >
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
              >
                <option value="all" className="bg-slate-900">
                  All Statuses
                </option>
                <option value="pending" className="bg-slate-900">
                  Pending
                </option>
                <option value="approved" className="bg-slate-900">
                  Approved
                </option>
                <option value="rejected" className="bg-slate-900">
                  Rejected
                </option>
                <option value="cancelled" className="bg-slate-900">
                  Cancelled
                </option>
              </select>
            </FilterField>
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
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-purple-500/10 p-3">
              <ClipboardList className="h-5 w-5 text-purple-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Reservations</h2>
              <p className="text-sm text-white/50">
                Manage all booking requests from one place
              </p>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-white/60">Loading reservations...</p>
          ) : filteredBookings.length === 0 ? (
            <EmptyState text="No reservations matched your filters." />
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-semibold text-white">
                          {booking.lab_name}
                        </h3>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusBadge(
                            booking.status
                          )}`}
                        >
                          {booking.status || "Unknown"}
                        </span>
                      </div>

                      <p className="text-sm text-white/70">
                        {formatDate(booking.date)} • {formatTime(booking.start_time)} -{" "}
                        {formatTime(booking.end_time)}
                      </p>

                      <div className="text-sm text-white/65">
                        <p>
                          <span className="font-medium text-white/80">User:</span>{" "}
                          {booking.user_name}
                        </p>
                        <p>
                          <span className="font-medium text-white/80">Email:</span>{" "}
                          {booking.user_email}
                        </p>
                        <p>
                          <span className="font-medium text-white/80">
                            Department:
                          </span>{" "}
                          {booking.user_department}
                        </p>
                        <p>
                          <span className="font-medium text-white/80">Course:</span>{" "}
                          {booking.user_course}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[320px] lg:mt-1">
                      <ActionButton
                        label={
                          updatingBookingId === booking.id
                            ? "Updating..."
                            : "Approve"
                        }
                        icon={<CheckCircle2 className="h-4 w-4" />}
                        disabled={updatingBookingId === booking.id}
                        onClick={() =>
                          updateBookingStatus(booking.id, "approved")
                        }
                        variant="approve"
                      />

                      <ActionButton
                        label={
                          updatingBookingId === booking.id
                            ? "Updating..."
                            : "Reject"
                        }
                        icon={<XCircle className="h-4 w-4" />}
                        disabled={updatingBookingId === booking.id}
                        onClick={() =>
                          updateBookingStatus(booking.id, "rejected")
                        }
                        variant="reject"
                      />

                      <ActionButton
                        label={
                          updatingBookingId === booking.id
                            ? "Updating..."
                            : "Cancel"
                        }
                        icon={<Ban className="h-4 w-4" />}
                        disabled={updatingBookingId === booking.id}
                        onClick={() =>
                          updateBookingStatus(booking.id, "cancelled")
                        }
                        variant="cancel"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        </AnimatedContent>

        <AnimatedContent
          delay={0.7}
          duration={0.9}
          distance={50}
          direction="vertical"
          scale={0.98}
        >
        <div className="mt-8">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-100 transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:text-white hover:shadow-[0_0_30px_rgba(203,26,194,0.45)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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
  icon,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-2xl bg-white/5 p-3">{icon}</div>
      </div>
      <h3 className="text-sm text-white/60">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function FilterField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-white/80">{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2">
          {icon}
        </div>
        {children}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  disabled,
  onClick,
  variant,
}: {
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  variant: "approve" | "reject" | "cancel";
}) {
  const variantClass =
    variant === "approve"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
      : variant === "reject"
      ? "border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/20"
      : "border-slate-400/20 bg-slate-500/10 text-slate-200 hover:bg-slate-500/20";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${variantClass}`}
    >
      {icon}
      {label}
    </button>
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