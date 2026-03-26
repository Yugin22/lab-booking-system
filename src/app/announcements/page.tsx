"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Bell,
  Megaphone,
  BookCheck,
  Clock3,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import AnimatedContent from "@/components/AnimatedContent";

const Aurora = dynamic(() => import("@/components/Aurora"), {
  ssr: false,
});

type BookingNotification = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  computer_id: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type AnnouncementRow = {
  id: number;
  title: string;
  content: string;
  created_at: string;
};

type SupabaseLikeError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

export default function AnnouncementsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [bookingUpdates, setBookingUpdates] = useState<BookingNotification[]>(
    []
  );
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);

  const [bookingError, setBookingError] = useState("");
  const [announcementError, setAnnouncementError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const getReadableError = (error: unknown) => {
    const err = error as SupabaseLikeError | null;

    if (!err) return "Unknown error occurred.";

    const parts = [err.message, err.details, err.hint, err.code].filter(
      Boolean
    );

    return parts.length > 0
      ? parts.join(" | ")
      : "Failed to load booking notifications.";
  };

  const fetchBookingUpdates = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, date, start_time, end_time, status, computer_id, updated_at, created_at"
        )
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (error) {
        const readableError = getReadableError(error);

        // Use console.log instead of console.error to avoid the Turbopack overlay {}
        console.log("Booking notifications fetch error:", readableError);

        setBookingError(readableError);
        setBookingUpdates([]);
        return;
      }

      setBookingUpdates((data || []) as BookingNotification[]);
    } catch (error) {
      const readableError = getReadableError(error);

      console.log("Booking notifications unexpected error:", readableError);

      setBookingError(readableError);
      setBookingUpdates([]);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, content, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        const readableError = getReadableError(error);

        console.log("Announcements fetch error:", readableError);

        setAnnouncementError(readableError);
        setAnnouncements([]);
        return;
      }

      setAnnouncements((data || []) as AnnouncementRow[]);
    } catch (error) {
      const readableError = getReadableError(error);

      console.log("Announcements unexpected error:", readableError);

      setAnnouncementError(readableError);
      setAnnouncements([]);
    }
  };

  const fetchPageData = async () => {
    try {
      setRefreshing(true);
      setGeneralError("");
      setBookingError("");
      setAnnouncementError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setGeneralError(userError.message);
        return;
      }

      if (!user) {
        setGeneralError("You must be logged in to view notifications.");
        return;
      }

      await Promise.all([fetchBookingUpdates(user.id), fetchAnnouncements()]);
    } catch {
      setGeneralError("Something went wrong while loading notifications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, []);

  const handleRefresh = async () => {
    await fetchPageData();
  };

  const bookingCounts = useMemo(() => {
    const approved = bookingUpdates.filter(
      (item) => item.status?.toLowerCase() === "approved"
    ).length;

    const pending = bookingUpdates.filter(
      (item) => item.status?.toLowerCase() === "pending"
    ).length;

    const rejected = bookingUpdates.filter((item) => {
      const status = item.status?.toLowerCase();
      return status === "rejected" || status === "cancelled";
    }).length;

    return {
      total: bookingUpdates.length,
      approved,
      pending,
      rejected,
    };
  }, [bookingUpdates]);

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
    return value.slice(0, 5);
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "No timestamp";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getBookingStatusStyle = (status?: string | null) => {
    const value = status?.toLowerCase();

    if (value === "approved") {
      return {
        badge:
          "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20",
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-300" />,
        title: "Booking Approved",
      };
    }

    if (value === "pending") {
      return {
        badge: "bg-amber-500/15 text-amber-300 border border-amber-400/20",
        icon: <Clock3 className="h-5 w-5 text-amber-300" />,
        title: "Booking Pending",
      };
    }

    if (value === "rejected" || value === "cancelled") {
      return {
        badge: "bg-red-500/15 text-red-300 border border-red-400/20",
        icon: <XCircle className="h-5 w-5 text-red-300" />,
        title: "Booking Rejected / Cancelled",
      };
    }

    return {
      badge: "bg-white/10 text-white/80 border border-white/10",
      icon: <Info className="h-5 w-5 text-white/70" />,
      title: "Booking Update",
    };
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <AuroraBackground />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <AnimatedContent
          delay={0.1}
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
                Notifications / Announcements
              </h1>
              <p className="mt-2 text-sm text-white/60">
                View your booking approval updates and latest laboratory notices.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.7),0_0_60px_rgba(76,26,203,0.5)] active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh Notifications"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 p-3 transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.7),0_0_60px_rgba(76,26,203,0.5)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-5 w-5 text-white ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
        </AnimatedContent>

        {generalError && (
          <AnimatedContent
            delay={0.2}
            duration={0.9}
            distance={50}
            direction="vertical"
            scale={0.98}
          >
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {generalError}
          </div>
          </AnimatedContent>
        )}

        <AnimatedContent
          delay={0.3}
          duration={0.9}
          distance={50}
          direction="vertical"
          scale={0.98}
        >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Booking Updates"
            value={bookingCounts.total}
            subtitle="All your booking notifications"
            icon={<Bell className="h-6 w-6 text-cyan-300" />}
          />
          <SummaryCard
            title="Approved"
            value={bookingCounts.approved}
            subtitle="Bookings confirmed"
            icon={<BookCheck className="h-6 w-6 text-emerald-300" />}
          />
          <SummaryCard
            title="Pending"
            value={bookingCounts.pending}
            subtitle="Still waiting for review"
            icon={<Clock3 className="h-6 w-6 text-amber-300" />}
          />
          <SummaryCard
            title="Lab Notices"
            value={announcements.length}
            subtitle="Announcements posted"
            icon={<Megaphone className="h-6 w-6 text-pink-300" />}
          />
        </div>
        </AnimatedContent>

        <AnimatedContent
          delay={0.4}
          duration={0.9}
          distance={50}
          direction="vertical"
          scale={0.98}
        >
        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="xl:col-span-2 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-cyan-500/10 p-3">
                <Bell className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Booking Approval Updates</h2>
                <p className="text-sm text-white/50">
                  Latest status updates for your reservations
                </p>
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-white/60">
                Loading booking updates...
              </p>
            ) : bookingError ? (
              <p className="text-sm text-red-300">{bookingError}</p>
            ) : bookingUpdates.length === 0 ? (
              <EmptyState text="No booking notifications found." />
            ) : (
              <div className="space-y-4">
                {bookingUpdates.map((booking) => {
                  const statusUI = getBookingStatusStyle(booking.status);

                  return (
                    <div
                      key={booking.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex gap-3">
                          <div className="mt-1 rounded-xl bg-white/5 p-2">
                            {statusUI.icon}
                          </div>

                          <div>
                            <h3 className="text-base font-semibold text-white">
                              {statusUI.title}
                            </h3>

                            <p className="mt-1 text-sm text-white/70">
                              Computer ID: {booking.computer_id || "N/A"}
                            </p>

                            <p className="mt-1 text-sm text-white/65">
                              {formatDate(booking.date)} •{" "}
                              {formatTime(booking.start_time)} -{" "}
                              {formatTime(booking.end_time)}
                            </p>

                            <p className="mt-2 text-xs text-white/45">
                              Last update:{" "}
                              {formatDateTime(
                                booking.updated_at || booking.created_at
                              )}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium capitalize ${statusUI.badge}`}
                        >
                          {booking.status || "Unknown"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-amber-500/10 p-3">
                <AlertTriangle className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Notice Summary</h2>
                <p className="text-sm text-white/50">
                  Quick overview of your updates
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <MiniInfoCard
                title="Approved Bookings"
                value={bookingCounts.approved}
                text="Reservations that are ready for scheduled laboratory use."
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-300" />}
              />

              <MiniInfoCard
                title="Pending Requests"
                value={bookingCounts.pending}
                text="Requests still under review by the administrator."
                icon={<Clock3 className="h-4 w-4 text-amber-300" />}
              />

              <MiniInfoCard
                title="Rejected / Cancelled"
                value={bookingCounts.rejected}
                text="Bookings that were not approved or were cancelled."
                icon={<XCircle className="h-4 w-4 text-red-300" />}
              />

              <MiniInfoCard
                title="Lab Notices"
                value={announcements.length}
                text="General reminders, announcements, and laboratory notices."
                icon={<Megaphone className="h-4 w-4 text-pink-300" />}
              />
            </div>
          </section>
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
            <div className="rounded-xl bg-pink-500/10 p-3">
              <Megaphone className="h-5 w-5 text-pink-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Lab Notices</h2>
              <p className="text-sm text-white/50">
                Important updates and announcements for laboratory users
              </p>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-white/60">Loading announcements...</p>
          ) : announcementError ? (
            <p className="text-sm text-red-300">{announcementError}</p>
          ) : announcements.length === 0 ? (
            <EmptyState text="No laboratory notices found." />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {announcements.map((notice) => (
                <div
                  key={notice.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <h3 className="text-base font-semibold text-white">
                    {notice.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/65">
                    {notice.content}
                  </p>
                  <p className="mt-4 text-xs text-cyan-300">
                    Posted: {formatDate(notice.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
        </AnimatedContent>
      </div>
    </div>
  );
}

function SummaryCard({
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

function MiniInfoCard({
  title,
  value,
  text,
  icon,
}: {
  title: string;
  value: number | string;
  text: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-white/55">{text}</p>
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