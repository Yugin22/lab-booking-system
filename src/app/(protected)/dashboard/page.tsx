"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  FlaskConical,
  Megaphone,
  Clock3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  User,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
import GlassIcons, { GlassIconsItem } from "@/components/GlassIcons";
import AnimatedContent from "@/components/AnimatedContent";

const Aurora = dynamic(() => import("@/components/Aurora"), {
  ssr: false,
});

type Booking = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  computer_id: string;
  lab_id?: number | null;
};

type Lab = {
  id: number;
  name: string;
  status: "available" | "occupied" | "maintenance" | "unavailable";
  available_slots: number;
  created_at: string;
};

type Announcement = {
  id: number;
  title: string;
  content: string;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [bookingsError, setBookingsError] = useState("");
  const [labsError, setLabsError] = useState("");
  const [announcementsError, setAnnouncementsError] = useState("");

  const fetchDashboardData = async () => {
    try {
      setBookingsError("");
      setLabsError("");
      setAnnouncementsError("");
  
      // ✅ GET CURRENT USER
      const {
        data: { user },
      } = await supabase.auth.getUser();
  
      if (!user) {
        router.replace("/login");
        return;
      }
  
      const [bookingsRes, labsRes, announcementsRes] = await Promise.all([
        // 👤 PERSONALIZED BOOKINGS
        supabase
          .from("bookings")
          .select(`
            id,
            date,
            start_time,
            end_time,
            status,
            computer_id,
            lab_id
          `)
          .eq("user_id", user.id) // 🔥 THIS LINE FIXES EVERYTHING
          .order("date", { ascending: true }),
  
        // 🌐 GLOBAL LABS (NO CHANGE)
        supabase
          .from("labs")
          .select("id, name, status, available_slots, created_at")
          .order("name", { ascending: true }),
  
        // 🌐 GLOBAL ANNOUNCEMENTS (NO CHANGE)
        supabase
          .from("announcements")
          .select("id, title, content, created_at")
          .order("created_at", { ascending: false }),
      ]);
  
      if (bookingsRes.error) {
        console.error("Bookings fetch error:", bookingsRes.error.message);
        setBookingsError(bookingsRes.error.message);
        setBookings([]);
      } else {
        setBookings((bookingsRes.data || []) as Booking[]);
      }
  
      if (labsRes.error) {
        console.error("Labs fetch error:", labsRes.error.message);
        setLabsError(labsRes.error.message);
        setLabs([]);
      } else {
        setLabs((labsRes.data || []) as Lab[]);
      }
  
      if (announcementsRes.error) {
        console.error(
          "Announcements fetch error:",
          announcementsRes.error.message
        );
        setAnnouncementsError(announcementsRes.error.message);
        setAnnouncements([]);
      } else {
        setAnnouncements((announcementsRes.data || []) as Announcement[]);
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      setBookingsError("Failed to load bookings.");
      setLabsError("Failed to load labs.");
      setAnnouncementsError("Failed to load announcements.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const normalizedUpcomingBookings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return bookings
      .map((booking) => ({
        ...booking,
        parsedDate: new Date(booking.date),
      }))
      .filter((booking) => !Number.isNaN(booking.parsedDate.getTime()))
      .filter((booking) => booking.parsedDate >= today)
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
      .slice(0, 5);
  }, [bookings]);

  const getBookingLabName = (booking: Booking) => {
    if (booking.lab_id != null) {
      const matchedLab = labs.find((lab) => lab.id === booking.lab_id);
      if (matchedLab?.name) return matchedLab.name;
    }
  
    return booking.computer_id || "N/A";
  };

  const bookingStats = useMemo(() => {
    const total = bookings.length;
    const approved = bookings.filter(
      (booking) => booking.status?.toLowerCase() === "approved"
    ).length;
    const pending = bookings.filter(
      (booking) => booking.status?.toLowerCase() === "pending"
    ).length;
    const cancelled = bookings.filter(
      (booking) =>
        booking.status?.toLowerCase() === "cancelled" ||
        booking.status?.toLowerCase() === "rejected"
    ).length;

    return { total, approved, pending, cancelled };
  }, [bookings]);

  const labStats = useMemo(() => {
    const totalLabs = labs.length;
    const availableLabs = labs.filter(
      (lab) => lab.status?.toLowerCase() === "available"
    ).length;
    const occupiedLabs = labs.filter(
      (lab) => lab.status?.toLowerCase() === "occupied"
    ).length;
    const unavailableLabs = labs.filter(
      (lab) =>
        lab.status?.toLowerCase() === "maintenance" ||
        lab.status?.toLowerCase() === "unavailable"
    ).length;

    return {
      totalLabs,
      availableLabs,
      occupiedLabs,
      unavailableLabs,
    };
  }, [labs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout error:", error.message);
        setLoggingOut(false);
        return;
      }

      router.replace("/login");
    } catch (error) {
      console.error("Logout unexpected error:", error);
      setLoggingOut(false);
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
  
    const safeValue = value.length >= 5 ? value.slice(0, 5) : value;
    const [hourText, minuteText] = safeValue.split(":");
  
    const hour = Number(hourText);
    const minute = Number(minuteText);
  
    if (Number.isNaN(hour) || Number.isNaN(minute)) return safeValue;
  
    const period = hour >= 12 ? "PM" : "AM";
    const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;
  
    return `${normalizedHour}:${String(minute).padStart(2, "0")} ${period}`;
  };

  const getStatusBadge = (status?: string | null) => {
    const value = status?.toLowerCase();

    if (value === "approved") {
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20";
    }

    if (value === "pending") {
      return "bg-amber-500/15 text-amber-300 border border-amber-400/20";
    }

    if (value === "cancelled" || value === "rejected") {
      return "bg-red-500/15 text-red-300 border border-red-400/20";
    }

    return "bg-white/10 text-white/80 border border-white/10";
  };

  const getLabStatusBadge = (status?: string | null) => {
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

  const actionItems: GlassIconsItem[] = [
    {
      icon: <CalendarDays size={18} />,
      color: "blue",
      label: "Laboratory Availability",
      onClick: () => router.push("/availability"),
    },
    {
      icon: <Plus size={18} />,
      color: "purple",
      label: "Book Laboratory",
      onClick: () => router.push("/booklaboratory"),
    },
    {
      icon: <ClipboardList size={18} />,
      color: "indigo",
      label: "My Bookings",
      onClick: () => router.push("/bookings"),
    },
    {
      icon: <Megaphone size={18} />,
      color: "pink",
      label: "Announcements",
      onClick: () => router.push("/announcements"),
    },
    {
      icon: <User size={18} />,
      color: "cyan",
      label: "Profile",
      onClick: () => router.push("/profile"),
    },
    {
      icon: (
        <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
      ),
      color: "orange",
      label: "Refresh",
      onClick: handleRefresh,
    },
  ];

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
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm text-cyan-300">
                  Computer Laboratory Booking System
                </p>
                <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Dashboard</h1>
                <p className="mt-2 text-sm text-white/60">
                  View booking activity, upcoming reservations, laboratory
                  availability, and latest announcements.
                </p>
              </div>

              <div className="mr-5 flex justify-center lg:justify-end">
                <GlassIcons items={actionItems} colorful={false} />
              </div>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardCard
              title="Total Bookings"
              value={bookingStats.total}
              subtitle="All recorded reservations"
              icon={<ClipboardList className="h-6 w-6 text-cyan-300" />}
            />
            <DashboardCard
              title="Approved Bookings"
              value={bookingStats.approved}
              subtitle="Confirmed laboratory use"
              icon={<CheckCircle2 className="h-6 w-6 text-emerald-300" />}
            />
            <DashboardCard
              title="Pending Bookings"
              value={bookingStats.pending}
              subtitle="Waiting for review"
              icon={<Clock3 className="h-6 w-6 text-amber-300" />}
            />
            <DashboardCard
              title="Available Labs"
              value={labStats.availableLabs}
              subtitle={`Out of ${labStats.totalLabs} laboratories`}
              icon={<FlaskConical className="h-6 w-6 text-purple-300" />}
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
          <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="xl:col-span-2 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-cyan-500/10 p-3">
                  <CalendarDays className="h-5 w-5 text-cyan-300" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Upcoming Reservations</h2>
                  <p className="text-sm text-white/50">
                    Next scheduled bookings in the laboratory
                  </p>
                </div>
              </div>

              {loading ? (
                <p className="text-sm text-white/60">
                  Loading upcoming reservations...
                </p>
              ) : bookingsError ? (
                <p className="text-sm text-red-300">{bookingsError}</p>
              ) : normalizedUpcomingBookings.length === 0 ? (
                <EmptyState text="No upcoming reservations found." />
              ) : (
                <div className="space-y-4">
                  {normalizedUpcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-white">
                            Laboratory: {getBookingLabName(booking)}
                          </h3>
                          <p className="mt-2 text-sm text-white/75">
                            {formatDate(booking.date)} {" • "}
                            {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                          </p>
                        </div>

                        <span
                          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusBadge(
                            booking.status
                          )}`}
                        >
                          {booking.status}
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
                  <h2 className="text-lg font-semibold">Lab Availability</h2>
                  <p className="text-sm text-white/50">
                    Current status of computer laboratories
                  </p>
                </div>
              </div>

              {loading ? (
                <p className="text-sm text-white/60">
                  Loading laboratory status...
                </p>
              ) : labsError ? (
                <p className="text-sm text-red-300">{labsError}</p>
              ) : labs.length === 0 ? (
                <EmptyState text="No laboratory records found." />
              ) : (
                <div className="space-y-3">
                  {labs.slice(0, 6).map((lab) => (
                    <div
                      key={lab.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div>
                        <p className="font-medium text-white">{lab.name}</p>
                        <p className="mt-1 text-sm text-white/50">
                          Available slots: {lab.available_slots}
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getLabStatusBadge(
                          lab.status
                        )}`}
                      >
                        {lab.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 grid grid-cols-3 gap-3">
                <MiniStat
                  label="Available"
                  value={labStats.availableLabs}
                  icon={<CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                />
                <MiniStat
                  label="Occupied"
                  value={labStats.occupiedLabs}
                  icon={<AlertCircle className="h-4 w-4 text-amber-300" />}
                />
                <MiniStat
                  label="Unavailable"
                  value={labStats.unavailableLabs}
                  icon={<XCircle className="h-4 w-4 text-red-300" />}
                />
              </div>
            </section>
          </div>
        </AnimatedContent>

        <AnimatedContent
          delay={0.4}
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
                <h2 className="text-lg font-semibold">Announcements</h2>
                <p className="text-sm text-white/50">
                  Latest notices for students and laboratory users
                </p>
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-white/60">Loading announcements...</p>
            ) : announcementsError ? (
              <p className="text-sm text-red-300">{announcementsError}</p>
            ) : announcements.length === 0 ? (
              <EmptyState text="No announcements found." />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {announcements.slice(0, 4).map((announcement) => (
                  <div
                    key={announcement.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <h3 className="text-base font-semibold text-white">
                      {announcement.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/65">
                      {announcement.content}
                    </p>
                    <p className="mt-4 text-xs text-cyan-300">
                      Posted: {formatDate(announcement.created_at)}
                    </p>
                  </div>
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

function DashboardCard({
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
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_20%,transparent_0%,transparent_55%,rgba(0,0,0,0.28)_78%,rgba(0,0,0,0.55)_100%)]" />
      </div>
    </>
  );
}