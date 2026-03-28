"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  ClipboardList,
  RefreshCw,
  XCircle,
  UserSquare2,
  GraduationCap,
  FileText,
  Monitor,
  Building2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import AnimatedContent from "@/components/AnimatedContent";

const Aurora = dynamic(() => import("@/components/Aurora"), {
  ssr: false,
});

type BookingDetails = {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | string;
  computer_id?: string | null;
  lab_id?: number | null;
  lab_name?: string | null;
  purpose?: string | null;
  subject?: string | null;
  instructor?: string | null;
  created_at?: string | null;
};

export default function BookingDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const bookingId = params?.id;

  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const isFetchingRef = useRef(false);

  const fetchBookingDetails = async () => {
    if (isFetchingRef.current) return;
  
    isFetchingRef.current = true;
  
    try {
      setLoading(true);
      setError("");
      setSuccess("");
  
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
  
      if (sessionError) {
        setError(sessionError.message);
        setBooking(null);
        return;
      }
  
      const user = session?.user;
  
      if (!user) {
        setError("You must be logged in to view this booking.");
        setBooking(null);
        return;
      }
  
      if (!bookingId || typeof bookingId !== "string") {
        setError("Invalid booking ID.");
        setBooking(null);
        return;
      }
  
      const { data, error } = await supabase
        .from("bookings")
        .select(`
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
        `)
        .eq("id", bookingId)
        .eq("user_id", user.id)
        .single();
  
      if (error) {
        setError("Booking not found or you do not have access to it.");
        setBooking(null);
        return;
      }
  
      let resolvedLabName: string | null = null;
  
      if (data?.lab_id != null) {
        const { data: labData, error: labError } = await supabase
          .from("labs")
          .select("name")
          .eq("id", data.lab_id)
          .maybeSingle();
  
        if (labError) {
          console.error("Lab fetch error:", labError.message);
        }
  
        if (labData?.name) {
          resolvedLabName = labData.name;
        }
      }
  
      setBooking({
        ...(data as BookingDetails),
        lab_name: resolvedLabName,
      });
    } catch (err) {
      console.error("Fetch booking details error:", err);
      setError("Something went wrong while loading booking details.");
      setBooking(null);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const canCancel = useMemo(() => {
    if (!booking) return false;
    const status = booking.status?.toLowerCase();
    return status === "pending" || status === "approved";
  }, [booking]);

  const handleCancelBooking = async () => {
    if (!booking || !canCancel || cancelling) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) return;

    try {
      setCancelling(true);
      setError("");
      setSuccess("");

      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", booking.id)
        .eq("user_id", booking.user_id);

      if (error) {
        setError(error.message);
        setCancelling(false);
        return;
      }

      setBooking((prev) =>
        prev ? { ...prev, status: "cancelled" } : prev
      );
      setSuccess("Booking cancelled successfully.");
    } catch (err) {
      console.error("Cancel booking error:", err);
      setError("Something went wrong while cancelling the booking.");
    } finally {
      setCancelling(false);
    }
  };

  const actionButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.7),0_0_60px_rgba(76,26,203,0.5)] active:scale-95";

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <AuroraBackground />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <AnimatedContent
          delay={0.1}
          duration={0.9}
          distance={50}
          direction="vertical"
          scale={0.98}
        >
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-cyan-300">
              Computer Laboratory Booking System
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              Booking Details
            </h1>
            <p className="mt-2 text-sm text-white/60">
              View full reservation details and cancel the booking if allowed.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => router.push("/bookings")}
              className={actionButtonClass}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to My Bookings
            </button>

            <button
              onClick={fetchBookingDetails}
              title="Refresh Details"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 p-3 transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.7),0_0_60px_rgba(76,26,203,0.5)] active:scale-95"
            >
              <RefreshCw className={`h-5 w-5 text-white ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        </AnimatedContent>

        {error && (
          <AnimatedContent
            delay={0.2}
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

        {success && (
          <AnimatedContent
            delay={0.2}
            duration={0.9}
            distance={50}
            direction="vertical"
            scale={0.98}
          >
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
          </AnimatedContent>
        )}

        {loading ? (
          <AnimatedContent
            delay={0.2}
            duration={0.9}
            distance={50}
            direction="vertical"
            scale={0.98}
          >
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 text-sm text-white/60 shadow-[0_10px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            Loading booking details...
          </div>
          </AnimatedContent>
        ) : !booking ? (
          <AnimatedContent
            delay={0.3}
            duration={0.9}
            distance={50}
            direction="vertical"
            scale={0.98}
          >
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 text-sm text-white/60 shadow-[0_10px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            No booking details available.
          </div>
          </AnimatedContent>
        ) : (
          <div className="space-y-6">
            <AnimatedContent
              delay={0.2}
              duration={0.9}
              distance={50}
              direction="vertical"
              scale={0.98}
            >
            <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-cyan-500/10 p-3">
                    <ClipboardList className="h-5 w-5 text-cyan-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Reservation Info</h2>
                    <p className="text-sm text-white/50">
                      Full reservation details for this booking
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusBadge(
                    booking.status
                  )}`}
                >
                  {booking.status}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DetailsCard
                  icon={<Building2 className="h-5 w-5 text-purple-300" />}
                  label="Laboratory Name"
                  value={booking.lab_name || "N/A"}
                />

                <DetailsCard
                  icon={<CalendarDays className="h-5 w-5 text-cyan-300" />}
                  label="Date"
                  value={formatDate(booking.date)}
                />

                <DetailsCard
                  icon={<Clock3 className="h-5 w-5 text-amber-300" />}
                  label="Time"
                  value={`${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`}
                />

                <DetailsCard
                  icon={<Building2 className="h-5 w-5 text-purple-300" />}
                  label="Laboratory ID"
                  value={booking.lab_id ? String(booking.lab_id) : "N/A"}
                />

                <DetailsCard
                  icon={<Monitor className="h-5 w-5 text-blue-300" />}
                  label="Booking ID"
                  value={booking.id || "N/A"}
                />

                <DetailsCard
                  icon={<CalendarDays className="h-5 w-5 text-white/80" />}
                  label="Requested At"
                  value={formatDateTime(booking.created_at)}
                />
              </div>
            </section>
            </AnimatedContent>

            <AnimatedContent
              delay={0.3}
              duration={0.9}
              distance={50}
              direction="vertical"
              scale={0.98}
            >
            <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-pink-500/10 p-3">
                  <FileText className="h-5 w-5 text-pink-300" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Additional Details</h2>
                  <p className="text-sm text-white/50">
                    Purpose, subject, and instructor information
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <DetailsCard
                  icon={<FileText className="h-5 w-5 text-pink-300" />}
                  label="Purpose"
                  value={booking.purpose || "N/A"}
                />

                <DetailsCard
                  icon={<GraduationCap className="h-5 w-5 text-purple-300" />}
                  label="Subject"
                  value={booking.subject || "N/A"}
                />

                <DetailsCard
                  icon={<UserSquare2 className="h-5 w-5 text-cyan-300" />}
                  label="Instructor"
                  value={booking.instructor || "N/A"}
                />
              </div>
            </section>
            </AnimatedContent>

            <AnimatedContent
              delay={0.4}
              duration={0.9}
              distance={50}
              direction="vertical"
              scale={0.98}
            >
            <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-red-500/10 p-3">
                  <XCircle className="h-5 w-5 text-red-300" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Booking Actions</h2>
                  <p className="text-sm text-white/50">
                    Cancel this reservation if it is still allowed
                  </p>
                </div>
              </div>

              {canCancel ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-white/60">
                    This booking can still be cancelled because its status is{" "}
                    <span className="font-medium capitalize text-white">
                      {booking.status}
                    </span>.
                  </p>

                  <button
                    onClick={handleCancelBooking}
                    disabled={cancelling}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#CB1A29] via-[#CB1AC2] to-[#4C1ACB] px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(203,26,194,0.45)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <XCircle className="h-4 w-4" />
                    {cancelling ? "Cancelling..." : "Cancel Booking"}
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                  This booking cannot be cancelled because its status is{" "}
                  <span className="font-medium capitalize text-white">
                    {booking.status}
                  </span>.
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

function DetailsCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-xl bg-white/5 p-2">{icon}</div>
        <p className="text-sm text-white/55">{label}</p>
      </div>
      <p className="break-words text-sm font-medium text-white">{value}</p>
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
  if (!value) return "N/A";

  const trimmed = value.trim();

  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    const temp = new Date();
    temp.setHours(hours, minutes, 0, 0);

    return temp.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return value;
}

function formatDateTime(value?: string | null) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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