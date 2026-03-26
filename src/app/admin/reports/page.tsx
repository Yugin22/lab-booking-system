"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  LogOut,
  BarChart3,
  Download,
  ClipboardList,
  Clock3,
  FlaskConical,
  CalendarDays,
  Search,
  TrendingUp,
  FileSpreadsheet,
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

type BookingRow = {
  id: string;
  status: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  computer_id: string | null;
  lab_id?: number | null;
  created_at?: string | null;
};

type LabRow = {
  id: number;
  name: string;
};

type BookingView = BookingRow & {
  lab_name: string;
  peak_hour_label: string;
};

export default function ReportsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [labsMap, setLabsMap] = useState<Record<string, string>>({});

  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchPageData = async () => {
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
        setAccessDenied("You must be logged in to access reports.");
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

      const adminRow = profile as AdminProfile | null;
      setAdminProfile(adminRow);

      if (!adminRow?.is_admin) {
        setAccessDenied("Access denied. This page is only for administrators.");
        return;
      }

      const [bookingsRes, labsRes] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            "id, status, date, start_time, end_time, computer_id, lab_id, created_at"
          )
          .order("date", { ascending: false }),
        supabase.from("labs").select("id, name").order("name", { ascending: true }),
      ]);

      if (bookingsRes.error) {
        setError(bookingsRes.error.message);
        return;
      }

      if (labsRes.error) {
        setError(labsRes.error.message);
        return;
      }

      const labRecord: Record<string, string> = {};
      ((labsRes.data || []) as LabRow[]).forEach((lab) => {
        labRecord[String(lab.id)] = lab.name;
      });

      setLabsMap(labRecord);
      setBookings((bookingsRes.data || []) as BookingRow[]);
    } catch {
      setError("Something went wrong while loading reports.");
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
      const hour = booking.start_time ? booking.start_time.slice(0, 2) : "";
      const hourNumber = Number(hour);
      const peakHourLabel =
        !Number.isNaN(hourNumber) && hour !== ""
          ? `${hour.padStart(2, "0")}:00 - ${(hourNumber + 1)
              .toString()
              .padStart(2, "0")}:00`
          : "Unknown";

      const labName =
        booking.lab_id != null
          ? labsMap[String(booking.lab_id)] || "Unknown Lab"
          : booking.computer_id || "Unassigned";

      return {
        ...booking,
        lab_name: labName,
        peak_hour_label: peakHourLabel,
      };
    });
  }, [bookings, labsMap]);

  const filteredBookings = useMemo(() => {
    return allBookingViews.filter((booking) => {
      const haystack =
        `${booking.lab_name} ${booking.computer_id || ""} ${booking.status || ""}`.toLowerCase();

      const matchesSearch = search
        ? haystack.includes(search.toLowerCase())
        : true;

      const matchesStatus =
        statusFilter === "all"
          ? true
          : (booking.status || "").toLowerCase() === statusFilter.toLowerCase();

      const matchesDateFrom = dateFrom ? (booking.date || "") >= dateFrom : true;
      const matchesDateTo = dateTo ? (booking.date || "") <= dateTo : true;

      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    });
  }, [allBookingViews, search, statusFilter, dateFrom, dateTo]);

  const bookingHistoryCount = filteredBookings.length;

  const mostUsedLabData = useMemo(() => {
    const counts: Record<string, number> = {};

    filteredBookings.forEach((booking) => {
      const key = booking.lab_name || "Unknown Lab";
      counts[key] = (counts[key] || 0) + 1;
    });

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      return { name: "No data", count: 0 };
    }

    return { name: entries[0][0], count: entries[0][1] };
  }, [filteredBookings]);

  const peakHoursData = useMemo(() => {
    const counts: Record<string, number> = {};

    filteredBookings.forEach((booking) => {
      const key = booking.peak_hour_label;
      counts[key] = (counts[key] || 0) + 1;
    });

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      return { label: "No data", count: 0 };
    }

    return { label: entries[0][0], count: entries[0][1] };
  }, [filteredBookings]);

  const labUsageRows = useMemo(() => {
    const counts: Record<string, number> = {};

    filteredBookings.forEach((booking) => {
      const key = booking.lab_name || "Unknown Lab";
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([lab, count]) => ({ lab, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredBookings]);

  const peakHourRows = useMemo(() => {
    const counts: Record<string, number> = {};

    filteredBookings.forEach((booking) => {
      const key = booking.peak_hour_label;
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredBookings]);

  const downloadCSVReport = () => {
    const headers = [
      "Booking ID",
      "Date",
      "Start Time",
      "End Time",
      "Status",
      "Lab",
      "Computer ID",
      "Created At",
    ];

    const rows = filteredBookings.map((booking) => [
      booking.id,
      booking.date || "",
      booking.start_time || "",
      booking.end_time || "",
      booking.status || "",
      booking.lab_name,
      booking.computer_id || "",
      booking.created_at || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateLabel = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.setAttribute("download", `booking-report-${dateLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status?: string | null) => {
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
    if (!value) return "—";
    return value.slice(0, 5);
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
            Loading reports...
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
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm text-cyan-300">
                Computer Laboratory Booking System
              </p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
                Admin / Reports
              </h1>
              <p className="mt-2 text-sm text-white/60">
                Booking history, most used lab, peak hours, and downloadable reports.
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
                {refreshing ? "Refreshing..." : "Refresh Reports"}
              </button>

              <button
                onClick={downloadCSVReport}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.7),0_0_60px_rgba(76,26,203,0.5)] active:scale-95"
              >
                <Download className="h-5 w-5" />
                Download Report
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
            title="Booking History"
            value={bookingHistoryCount}
            subtitle="Filtered booking records"
            icon={<ClipboardList className="h-6 w-6 text-cyan-300" />}
          />
          <StatCard
            title="Most Used Lab"
            value={mostUsedLabData.count}
            subtitle={mostUsedLabData.name}
            icon={<FlaskConical className="h-6 w-6 text-fuchsia-300" />}
          />
          <StatCard
            title="Peak Hours"
            value={peakHoursData.count}
            subtitle={peakHoursData.label}
            icon={<Clock3 className="h-6 w-6 text-amber-300" />}
          />
          <StatCard
            title="Downloadable Report"
            value={filteredBookings.length}
            subtitle="CSV export ready"
            icon={<FileSpreadsheet className="h-6 w-6 text-emerald-300" />}
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
              <Search className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Report Filters</h2>
              <p className="text-sm text-white/50">
                Filter booking history by search, status, and date range
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Search" icon={<Search className="h-4 w-4 text-white/45" />}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Lab, computer, status"
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
              />
            </Field>

            <Field label="Status" icon={<ClipboardList className="h-4 w-4 text-white/45" />}>
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
            </Field>

            <Field label="Date From" icon={<CalendarDays className="h-4 w-4 text-white/45" />}>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
              />
            </Field>

            <Field label="Date To" icon={<CalendarDays className="h-4 w-4 text-white/45" />}>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
              />
            </Field>
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
        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-fuchsia-500/10 p-3">
                <TrendingUp className="h-5 w-5 text-fuchsia-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Most Used Lab</h2>
                <p className="text-sm text-white/50">
                  Laboratory usage ranking based on booking history
                </p>
              </div>
            </div>

            {labUsageRows.length === 0 ? (
              <EmptyState text="No lab usage data found." />
            ) : (
              <div className="space-y-3">
                {labUsageRows.map((row, index) => (
                  <div
                    key={`${row.lab}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div>
                      <p className="font-medium text-white">{row.lab}</p>
                      <p className="mt-1 text-sm text-white/50">
                        Rank #{index + 1}
                      </p>
                    </div>
                    <span className="text-lg font-semibold text-white">
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-amber-500/10 p-3">
                <Clock3 className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Peak Hours</h2>
                <p className="text-sm text-white/50">
                  Time ranges with the most booking activity
                </p>
              </div>
            </div>

            {peakHourRows.length === 0 ? (
              <EmptyState text="No peak hour data found." />
            ) : (
              <div className="space-y-3">
                {peakHourRows.map((row, index) => (
                  <div
                    key={`${row.hour}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div>
                      <p className="font-medium text-white">{row.hour}</p>
                      <p className="mt-1 text-sm text-white/50">
                        Rank #{index + 1}
                      </p>
                    </div>
                    <span className="text-lg font-semibold text-white">
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
        </AnimatedContent>

        <AnimatedContent
          delay={0.7}
          duration={0.9}
          distance={50}
          direction="vertical"
          scale={0.98}
        >
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/10 p-3">
              <BarChart3 className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Booking History</h2>
              <p className="text-sm text-white/50">
                Detailed history of reservation records
              </p>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-white/60">Loading booking history...</p>
          ) : filteredBookings.length === 0 ? (
            <EmptyState text="No booking history matched your filters." />
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
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

                      <div className="grid grid-cols-1 gap-2 text-sm text-white/65 sm:grid-cols-2">
                        <p>
                          <span className="font-medium text-white/80">Date:</span>{" "}
                          {formatDate(booking.date)}
                        </p>
                        <p>
                          <span className="font-medium text-white/80">Time:</span>{" "}
                          {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </p>
                        <p>
                          <span className="font-medium text-white/80">Peak Hour Bucket:</span>{" "}
                          {booking.peak_hour_label}
                        </p>
                        <p>
                          <span className="font-medium text-white/80">Computer ID:</span>{" "}
                          {booking.computer_id || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="text-sm text-white/45 xl:text-right">
                      <p>Booking ID</p>
                      <p className="mt-1 font-mono text-white/70">{booking.id}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        </AnimatedContent>

        <AnimatedContent
          delay={0.8}
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

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
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