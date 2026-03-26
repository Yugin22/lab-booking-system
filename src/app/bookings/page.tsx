"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  ClipboardList,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import AnimatedContent from "@/components/AnimatedContent";

const Aurora = dynamic(() => import("@/components/Aurora"), {
  ssr: false,
});

type Booking = {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | string;
  computer_id?: string | null;
  lab_id?: number | null;
  purpose?: string | null;
  subject?: string | null;
  instructor?: string | null;
  created_at?: string | null;
};

type LabRow = {
  id: number;
  name: string;
};

export default function BookingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [labsMap, setLabsMap] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchBookings = async () => {
    try {
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setError(userError.message);
        setBookings([]);
        return;
      }

      if (!user) {
        setError("You must be logged in to view your bookings.");
        setBookings([]);
        return;
      }

      const [bookingsRes, labsRes] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            `
              id,
              user_id,
              date,
              start_time,
              end_time,
              status,
              computer_id,
              lab_id,
              purpose,
              subject,
              instructor,
              created_at
            `
          )
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .order("start_time", { ascending: false }),
      
        supabase.from("labs").select("id, name").order("name", { ascending: true }),
      ]);
      
      if (bookingsRes.error) {
        setError(bookingsRes.error.message);
        setBookings([]);
        return;
      }
      
      if (labsRes.error) {
        setError(labsRes.error.message);
        setBookings([]);
        return;
      }
      
      const labRecord: Record<string, string> = {};
      ((labsRes.data || []) as LabRow[]).forEach((lab) => {
        labRecord[String(lab.id)] = lab.name;
      });
      
      console.log("Logged in user id:", user.id);
      console.log("Bookings fetched:", bookingsRes.data);

      setLabsMap(labRecord);
      setBookings((bookingsRes.data || []) as Booking[]);
    } catch (err) {
      console.error("Fetch bookings error:", err);
      setError("Something went wrong while loading your bookings.");
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
  };

  const filteredBookings = useMemo(() => {
    if (statusFilter === "all") return bookings;
    return bookings.filter(
      (booking) => booking.status?.toLowerCase() === statusFilter
    );
  }, [bookings, statusFilter]);

  const currentBookings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return filteredBookings.filter((booking) => {
      const bookingDate = new Date(booking.date);
      bookingDate.setHours(0, 0, 0, 0);
      return bookingDate >= today;
    });
  }, [filteredBookings]);

  const pastBookings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return filteredBookings.filter((booking) => {
      const bookingDate = new Date(booking.date);
      bookingDate.setHours(0, 0, 0, 0);
      return bookingDate < today;
    });
  }, [filteredBookings]);

  const bookingStats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter(
      (booking) => booking.status?.toLowerCase() === "pending"
    ).length;
    const approved = bookings.filter(
      (booking) => booking.status?.toLowerCase() === "approved"
    ).length;
    const rejected = bookings.filter(
      (booking) => booking.status?.toLowerCase() === "rejected"
    ).length;
    const cancelled = bookings.filter(
      (booking) => booking.status?.toLowerCase() === "cancelled"
    ).length;

    return { total, pending, approved, rejected, cancelled };
  }, [bookings]);

  const getBookingLabName = (booking: Booking) => {
    if (booking.lab_id != null) {
      return labsMap[String(booking.lab_id)] || `Laboratory ID: ${booking.lab_id}`;
    }
  
    return booking.computer_id ? `Computer ID: ${booking.computer_id}` : "Booking Record";
  };

  const actionButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.7),0_0_60px_rgba(76,26,203,0.5)] active:scale-95";

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
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-cyan-300">Computer Laboratory Booking System</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">My Bookings</h1>
            <p className="mt-2 text-sm text-white/60">
              View all your current and past laboratory booking requests.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => router.push("/dashboard")}
              className={actionButtonClass}
            >
              <ClipboardList className="h-4 w-4" />
              Dashboard
            </button>

            <button
              onClick={() => router.push("/booklaboratory")}
              className={actionButtonClass}
            >
              <Plus className="h-4 w-4" />
              Book Laboratory
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh Bookings"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 p-3 transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.7),0_0_60px_rgba(76,26,203,0.5)] disabled:cursor-not-allowed disabled:opacity-60 active:scale-95"
            >
              <RefreshCw
                className={`h-5 w-5 text-white ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
        </AnimatedContent>

        <AnimatedContent
          delay={0.2}
          duration={0.9}
          distance={50}
          direction="vertical"
          scale={0.98}
        >
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total"
            value={bookingStats.total}
            icon={<ClipboardList className="h-5 w-5 text-cyan-300" />}
          />
          <StatCard
            title="Pending"
            value={bookingStats.pending}
            icon={<AlertCircle className="h-5 w-5 text-amber-300" />}
          />
          <StatCard
            title="Approved"
            value={bookingStats.approved}
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-300" />}
          />
          <StatCard
            title="Rejected"
            value={bookingStats.rejected}
            icon={<XCircle className="h-5 w-5 text-red-300" />}
          />
          <StatCard
            title="Cancelled"
            value={bookingStats.cancelled}
            icon={<XCircle className="h-5 w-5 text-pink-300" />}
          />
        </div>
        </AnimatedContent>
        
        <AnimatedContent
          delay={0.3}
          duration={0.9}
          distance={50}
          direction="vertical"
          scale={0.98}
        >
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.05] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="flex flex-wrap gap-3">
            {["all", "pending", "approved", "rejected", "cancelled"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition ${
                  statusFilter === status
                    ? "bg-gradient-to-r from-[#CB1A29] via-[#CB1AC2] to-[#4C1ACB] text-white shadow-[0_0_20px_rgba(203,26,194,0.35)]"
                    : "border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
        </AnimatedContent>

        {error ? (
          <AnimatedContent
            delay={0.4}
            duration={0.9}
            distance={50}
            direction="vertical"
            scale={0.98}
          >
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
          </AnimatedContent>
        ) : loading ? (
          <AnimatedContent
            delay={0.4}
            duration={0.9}
            distance={50}
            direction="vertical"
            scale={0.98}
          >
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/60 backdrop-blur-xl">
            Loading your bookings...
          </div>
          </AnimatedContent>
        ) : (
          <div className="space-y-8">
          <AnimatedContent
            delay={0.4}
            duration={0.9}
            distance={50}
            direction="vertical"
            scale={0.98}
          >
            <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-cyan-500/10 p-3">
                  <CalendarDays className="h-5 w-5 text-cyan-300" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Current Bookings</h2>
                  <p className="text-sm text-white/50">
                    Upcoming and active booking requests
                  </p>
                </div>
              </div>

              {currentBookings.length === 0 ? (
                <EmptyState text="No current bookings found." />
              ) : (
                <div className="space-y-4">
                  {currentBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      labsMap={labsMap}
                      onClick={() => router.push(`/bookings/${booking.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
            </AnimatedContent>

            <AnimatedContent
              delay={0.5}
              duration={0.9}
              distance={50}
              direction="vertical"
              scale={0.98}
            >
            <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-purple-500/10 p-3">
                  <Clock3 className="h-5 w-5 text-purple-300" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Past Bookings</h2>
                  <p className="text-sm text-white/50">
                    Previous booking history
                  </p>
                </div>
              </div>

              {pastBookings.length === 0 ? (
                <EmptyState text="No past bookings found." />
              ) : (
                <div className="space-y-4">
                  {pastBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      labsMap={labsMap}
                      onClick={() => router.push(`/bookings/${booking.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
            </AnimatedContent>
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  labsMap,
  onClick,
}: {
  booking: Booking;
  labsMap: Record<string, string>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition hover:border-white/20 hover:bg-white/[0.05]"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
        <h3 className="text-base font-semibold text-white">
          {booking.lab_id != null
            ? `Laboratory: ${labsMap[String(booking.lab_id)] || `Laboratory ID: ${booking.lab_id}`}`
            : booking.computer_id
            ? `Computer ID: ${booking.computer_id}`
            : "Booking Record"}
        </h3>

          <p className="text-sm text-white/75">
            {formatDate(booking.date)} • {formatTime(booking.start_time)} -{" "}
            {formatTime(booking.end_time)}
          </p>

          {booking.purpose && (
            <p className="text-sm text-white/60">
              <span className="font-medium text-white/75">Purpose:</span>{" "}
              {booking.purpose}
            </p>
          )}

          {booking.subject && (
            <p className="text-sm text-white/60">
              <span className="font-medium text-white/75">Subject:</span>{" "}
              {booking.subject}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex h-fit w-fit rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusBadge(
              booking.status
            )}`}
          >
            {booking.status}
          </span>
          <ChevronRight className="h-5 w-5 text-white/35" />
        </div>
      </div>
    </button>
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
      <div className="mb-3 flex items-center justify-between">
        <div className="rounded-2xl bg-white/5 p-3">{icon}</div>
      </div>
      <h3 className="text-sm text-white/60">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
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
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_20%,transparent_0%,transparent_55%,rgba(0,0,0,0.28)_78%,rgba(0,0,0,0.55)_100%)]" />
      </div>
    </>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "No date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "";

  const safeValue = value.length >= 5 ? value.slice(0, 5) : value;
  const [hourText, minuteText] = safeValue.split(":");

  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return safeValue;

  const period = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${normalizedHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function getStatusBadge(status?: string | null) {
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
    return "bg-pink-500/15 text-pink-300 border border-pink-400/20";
  }

  return "bg-white/10 text-white/80 border border-white/10";
}