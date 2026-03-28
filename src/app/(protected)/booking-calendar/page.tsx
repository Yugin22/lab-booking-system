"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import AnimatedContent from "@/components/AnimatedContent";

const Aurora = dynamic(() => import("@/components/Aurora"), {
  ssr: false,
});

type Lab = {
  id: number;
  name: string;
  status: "available" | "occupied" | "maintenance" | "unavailable" | string;
  available_slots: number | null;
  created_at?: string | null;
};

type Booking = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string | null;
  computer_id?: string | null;
  lab_id?: number | null;
  subject?: string | null;
  purpose?: string | null;
  created_at?: string | null;
};

type DaySummary = {
  date: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  occupiedLabs: number;
};

export default function BookingCalendarPage() {
  const router = useRouter();

  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(formatDateInput(today));

  const [labs, setLabs] = useState<Lab[]>([]);
  const [monthBookings, setMonthBookings] = useState<Booking[]>([]);
  const [selectedDayBookings, setSelectedDayBookings] = useState<Booking[]>(
    []
  );

  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingDay, setLoadingDay] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLabs();
  }, []);

  useEffect(() => {
    fetchMonthBookings(currentMonth);
  }, [currentMonth]);

  useEffect(() => {
    fetchSelectedDayBookings(selectedDate);
  }, [selectedDate]);

  const fetchLabs = async () => {
    const { data, error } = await supabase
      .from("labs")
      .select("id, name, status, available_slots, created_at")
      .order("name", { ascending: true });

    if (error) {
      setError(error.message);
      setLabs([]);
      return;
    }

    setLabs((data || []) as Lab[]);
  };

  const fetchMonthBookings = async (monthDate: Date) => {
    try {
      setLoadingMonth(true);
      setError("");

      const start = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        1
      );
      const end = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0
      );

      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, date, start_time, end_time, status, computer_id, lab_id, subject, purpose, created_at"
        )
        .gte("date", formatDateInput(start))
        .lte("date", formatDateInput(end))
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) {
        setError(error.message);
        setMonthBookings([]);
        return;
      }

      setMonthBookings((data || []) as Booking[]);
    } catch {
      setError("Failed to load booking calendar.");
      setMonthBookings([]);
    } finally {
      setLoadingMonth(false);
    }
  };

  const fetchSelectedDayBookings = async (date: string) => {
    try {
      setLoadingDay(true);
      setError("");

      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, date, start_time, end_time, status, computer_id, lab_id, subject, purpose, created_at"
        )
        .eq("date", date)
        .order("start_time", { ascending: true });

      if (error) {
        setError(error.message);
        setSelectedDayBookings([]);
        return;
      }

      setSelectedDayBookings((data || []) as Booking[]);
    } catch {
      setError("Failed to load selected date bookings.");
      setSelectedDayBookings([]);
    } finally {
      setLoadingDay(false);
    }
  };

  const labsMap = useMemo(() => {
    const map: Record<string, Lab> = {};
    labs.forEach((lab) => {
      map[String(lab.id)] = lab;
    });
    return map;
  }, [labs]);

  const monthLabel = useMemo(() => {
    return currentMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [currentMonth]);

  const daySummaryMap = useMemo(() => {
    const map: Record<string, DaySummary> = {};

    for (const booking of monthBookings) {
      const key = booking.date;
      if (!map[key]) {
        map[key] = {
          date: key,
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          occupiedLabs: 0,
        };
      }

      map[key].total += 1;

      const status = booking.status?.toLowerCase();
      if (status === "approved") map[key].approved += 1;
      else if (status === "pending") map[key].pending += 1;
      else if (status === "rejected" || status === "cancelled") {
        map[key].rejected += 1;
      }
    }

    Object.values(map).forEach((summary) => {
      const uniqueLabs = new Set(
        monthBookings
          .filter(
            (booking) => booking.date === summary.date && booking.lab_id != null
          )
          .map((booking) => String(booking.lab_id))
      );
      summary.occupiedLabs = uniqueLabs.size;
    });

    return map;
  }, [monthBookings]);

  const selectedDateSummary = useMemo(() => {
    return (
      daySummaryMap[selectedDate] || {
        date: selectedDate,
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        occupiedLabs: 0,
      }
    );
  }, [daySummaryMap, selectedDate]);

  const selectedDayLabUsage = useMemo(() => {
    const counts: Record<string, number> = {};

    selectedDayBookings.forEach((booking) => {
      const labName =
        booking.lab_id != null
          ? labsMap[String(booking.lab_id)]?.name || "Unknown Laboratory"
          : "Unassigned Laboratory";

      counts[labName] = (counts[labName] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([lab, count]) => ({ lab, count }))
      .sort((a, b) => b.count - a.count);
  }, [selectedDayBookings, labsMap]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDay = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();

    const cells: Array<{
      key: string;
      date: string | null;
      dayNumber: number | null;
      isCurrentMonth: boolean;
    }> = [];

    for (let i = 0; i < startDay; i++) {
      cells.push({
        key: `empty-start-${i}`,
        date: null,
        dayNumber: null,
        isCurrentMonth: false,
      });
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = formatDateInput(new Date(year, month, day));
      cells.push({
        key: date,
        date,
        dayNumber: day,
        isCurrentMonth: true,
      });
    }

    while (cells.length % 7 !== 0) {
      const index = cells.length;
      cells.push({
        key: `empty-end-${index}`,
        date: null,
        dayNumber: null,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [currentMonth]);

  const changeMonthBy = (offset: number) => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1)
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <AuroraBackground />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <AnimatedContent
          delay={0.1}
          duration={0.9}
          distance={50}
          direction="vertical"
          scale={0.98}
        >
          <div className="mb-6 flex flex-col gap-5 rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_10px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl md:flex-row md:items-end md:justify-between lg:mb-8 lg:p-7">
            <div>
              <p className="text-sm text-cyan-300">
                Computer Laboratory Booking System
              </p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
                Booking Calendar
              </h1>
              <p className="mt-2 text-sm text-white/60">
                Monthly calendar view of laboratory reservations connected to
                your Supabase database.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap md:justify-end">
              <button
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center justify-center gap-2 mb-5 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.7),0_0_60px_rgba(76,26,203,0.5)] active:scale-95"
              >
                Back to Dashboard
              </button>

              <button
                onClick={() => router.push("/availability")}
                className="inline-flex items-center justify-center gap-2 mb-5 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.7),0_0_60px_rgba(76,26,203,0.5)] active:scale-95"
              >
                Back to Availability
              </button>
            </div>
          </div>
        </AnimatedContent>

        {error && (
          <AnimatedContent
            delay={0.15}
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
          delay={0.2}
          duration={0.9}
          distance={50}
          direction="vertical"
          scale={0.98}
        >
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr] lg:mb-8">
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-cyan-300" />
                <h2 className="text-lg font-semibold">Selected Date</h2>
              </div>
              <p className="text-lg font-bold text-white sm:text-xl">
                {formatLongDate(selectedDate)}
              </p>
              <p className="mt-2 text-sm text-white/50">
                Click any day in the calendar to inspect reservations.
              </p>
            </div>

            <SummaryCard
              title="Total Bookings"
              value={selectedDateSummary.total}
              subtitle="All reservations for selected day"
              icon={<Clock3 className="h-5 w-5 text-cyan-300" />}
            />

            <SummaryCard
              title="Approved"
              value={selectedDateSummary.approved}
              subtitle="Approved reservations"
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-300" />}
            />

            <SummaryCard
              title="Pending"
              value={selectedDateSummary.pending}
              subtitle="Waiting for approval"
              icon={<AlertCircle className="h-5 w-5 text-amber-300" />}
            />
          </div>
        </AnimatedContent>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.85fr] xl:items-start">
          <AnimatedContent
            delay={0.3}
            duration={0.9}
            distance={50}
            direction="vertical"
            scale={0.98}
          >
            <section className="rounded-[28px] border border-white/10 bg-white/[0.05] p-4 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-5 lg:p-6">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    Monthly Reservation Calendar
                  </h2>
                  <p className="mt-1 text-sm text-white/50">
                    Days show booking activity pulled from Supabase.
                  </p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <button
                    onClick={() => changeMonthBy(-1)}
                    className="inline-flex items-center justify-center rounded-xl bg-white/10 p-3 text-white transition hover:bg-white/15"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="min-w-[150px] text-center text-sm font-semibold text-white sm:min-w-[180px]">
                    {monthLabel}
                  </div>

                  <button
                    onClick={() => changeMonthBy(1)}
                    className="inline-flex items-center justify-center rounded-xl bg-white/10 p-3 text-white transition hover:bg-white/15"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-2.5 text-xs text-white/70">
                <LegendDot color="bg-emerald-400" label="Light bookings" />
                <LegendDot color="bg-amber-400" label="Moderate bookings" />
                <LegendDot color="bg-red-400" label="Heavy bookings" />
              </div>

              <div className="overflow-x-auto pb-2 [scrollbar-width:auto] [scrollbar-color:rgba(255,255,255,0.35)_rgba(255,255,255,0.08)] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/35 [&::-webkit-scrollbar-thumb:hover]:bg-white/55">
                <div className="grid min-w-[860px] grid-cols-7 gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center text-sm font-semibold text-cyan-200"
                      >
                        {day}
                      </div>
                    )
                  )}

                  {loadingMonth ? (
                    <div className="col-span-7 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-sm text-white/60">
                      Loading calendar...
                    </div>
                  ) : (
                    calendarDays.map((cell) => {
                      if (!cell.date) {
                        return (
                          <div
                            key={cell.key}
                            className="min-h-[148px] rounded-2xl border border-white/5 bg-white/[0.02]"
                          />
                        );
                      }

                      const summary = daySummaryMap[cell.date];
                      const isSelected = selectedDate === cell.date;
                      const isToday = formatDateInput(new Date()) === cell.date;

                      return (
                        <button
                          key={cell.key}
                          onClick={() => setSelectedDate(cell.date!)}
                          className={`min-h-[148px] rounded-2xl border px-3 py-3 text-left transition-all duration-300 ${
                            isSelected
                              ? "border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.2)]"
                              : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]"
                          }`}
                        >
                          <div className="flex h-full flex-col">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-base font-semibold leading-none text-white">
                                {cell.dayNumber}
                              </span>

                              {isToday && (
                                <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[9px] font-medium text-cyan-300">
                                  Today
                                </span>
                              )}
                            </div>

                            <div className="mt-3 flex flex-1 flex-col justify-between">
                              <div className="space-y-2">
                                <p className="text-[13px] font-medium leading-4 text-white/70">
                                  {summary?.total || 0} booking
                                  {(summary?.total || 0) === 1 ? "" : "s"}
                                </p>

                                <div className="flex items-center gap-2">
                                  <span
                                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${getDayLoadColor(
                                      summary?.total || 0
                                    )}`}
                                  />
                                  <span className="truncate text-[12px] leading-4 text-white/50">
                                    {summary?.occupiedLabs || 0} occupied lab
                                    {(summary?.occupiedLabs || 0) === 1
                                      ? ""
                                      : "s"}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-1">
                                {(summary?.approved || 0) > 0 && (
                                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
                                    {summary?.approved} approved
                                  </span>
                                )}

                                {(summary?.pending || 0) > 0 && (
                                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-semibold text-amber-300">
                                    {summary?.pending} pending
                                  </span>
                                )}

                                {(summary?.rejected || 0) > 0 && (
                                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-semibold text-red-300">
                                    {summary?.rejected} rejected
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
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
            <section className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4 shadow-[0_10px_36px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-4">
              <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 shadow-inner">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-fuchsia-500/10 p-2.5">
                    <FlaskConical className="h-4 w-4 text-fuchsia-300" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold leading-5 text-white">
                      Selected Date Details
                    </h2>
                    <p className="mt-1 text-[11px] leading-4 text-white/50">
                      Reservation breakdown for {formatLongDate(selectedDate)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2">
                <MiniInfo
                  label="Occupied Labs"
                  value={selectedDateSummary.occupiedLabs}
                />
                <MiniInfo
                  label="Rejected / Cancelled"
                  value={selectedDateSummary.rejected}
                />
              </div>

              <div className="mb-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.10em] text-white/65">
                  Laboratory Usage for Selected Day
                </h3>

                {selectedDayLabUsage.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-3 text-xs leading-5 text-white/55">
                    No laboratory usage found for this date.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDayLabUsage.map((item) => (
                      <div
                        key={item.lab}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 shadow-inner"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold text-white sm:text-sm">
                            {item.lab}
                          </p>
                          <p className="text-[11px] text-white/50">
                            {item.count} booking(s)
                          </p>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-purple-500"
                            style={{
                              width: `${Math.min(
                                100,
                                (item.count /
                                  Math.max(selectedDateSummary.total || 1, 1)) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.10em] text-white/65">
                  Reservations List
                </h3>

                {loadingDay ? (
                  <p className="text-sm text-white/60">
                    Loading reservations...
                  </p>
                ) : selectedDayBookings.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-3 text-xs leading-5 text-white/55">
                    No reservations found for this date.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDayBookings.map((booking) => {
                      const labName =
                        booking.lab_id != null
                          ? labsMap[String(booking.lab_id)]?.name ||
                            "Unknown Laboratory"
                          : "Unknown Laboratory";

                      return (
                        <div
                          key={booking.id}
                          className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 shadow-inner"
                        >
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-semibold text-white sm:text-sm">
                                {labName}
                              </h4>
                              <p className="text-[11px] text-white/60">
                                {formatTime(booking.start_time)} -{" "}
                                {formatTime(booking.end_time)}
                              </p>
                              <p className="text-[11px] text-white/45">
                                Subject: {booking.subject || "N/A"}
                              </p>
                              <p className="text-[11px] text-white/45">
                                Purpose: {booking.purpose || "N/A"}
                              </p>
                            </div>

                            <span
                              className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${getStatusBadge(
                                booking.status
                              )}`}
                            >
                              {booking.status || "Unknown"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </AnimatedContent>
        </div>
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
    <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="rounded-2xl bg-white/[0.05] p-3">{icon}</div>
      </div>
      <h2 className="text-sm font-medium text-white/60">{title}</h2>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm text-white/45">{subtitle}</p>
    </div>
  );
}

function MiniInfo({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 shadow-inner">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-white sm:text-base">{value}</p>
    </div>
  );
}

function LegendDot({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/75 sm:px-3.5 sm:py-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}

function getDayLoadColor(total: number) {
  if (total >= 6) return "bg-red-400";
  if (total >= 3) return "bg-amber-400";
  return "bg-emerald-400";
}

function getStatusBadge(status?: string | null) {
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

function formatDateInput(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatLongDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "—";

  const clean = value.slice(0, 5);
  const [hourStr, minute] = clean.split(":");
  const hour = Number(hourStr);

  if (Number.isNaN(hour)) return clean;

  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return `${hour12}:${minute} ${suffix}`;
}