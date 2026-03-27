"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MonitorCog,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import AnimatedContent from "@/components/AnimatedContent";

const Aurora = dynamic(() => import("@/components/Aurora"), {
  ssr: false,
});

type Lab = {
  id: number;
  name: string;
  status: "available" | "occupied" | "maintenance" | "unavailable";
  available_slots: number;
  created_at: string;
};

type Booking = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  computer_id?: string | null;
  lab_id?: number | null;
};

type ScheduleCell = {
  isOccupied: boolean;
  booking?: Booking;
};

export default function AvailabilityPage() {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [labs, setLabs] = useState<Lab[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [labsError, setLabsError] = useState("");
  const [bookingsError, setBookingsError] = useState("");

  const timeSlots = useMemo(
    () => [
      "07:00",
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
      "18:00",
      "19:00",
      "20:00",
      "21:00", // ✅ added (9 PM)
    ],
    []
  );

  useEffect(() => {
    fetchAvailabilityData(selectedDate);
  }, [selectedDate]);

  const fetchAvailabilityData = async (date: string) => {
    try {
      setLoading(true);
      setLabsError("");
      setBookingsError("");

      const [labsRes, bookingsRes] = await Promise.all([
        supabase
          .from("labs")
          .select("id, name, status, available_slots, created_at")
          .order("name", { ascending: true }),

        supabase
          .from("bookings")
          .select("id, date, start_time, end_time, status, computer_id, lab_id")
          .eq("date", date)
          .in("status", ["pending", "approved"])
          .order("start_time", { ascending: true }),
      ]);

      if (labsRes.error) {
        console.error("Labs fetch error:", labsRes.error.message);
        setLabsError(labsRes.error.message);
        setLabs([]);
      } else {
        setLabs((labsRes.data || []) as Lab[]);
      }

      if (bookingsRes.error) {
        console.error("Bookings fetch error:", bookingsRes.error.message);
        setBookingsError(bookingsRes.error.message);
        setBookings([]);
      } else {
        setBookings((bookingsRes.data || []) as Booking[]);
      }
    } catch (error) {
      console.error("Availability fetch error:", error);
      setLabsError("Failed to load labs.");
      setBookingsError("Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  const activeLabs = useMemo(() => {
    return labs.filter(
      (lab) => lab.status === "available" || lab.status === "occupied"
    );
  }, [labs]);

  const scheduleMap = useMemo(() => {
    const map: Record<string, Record<string, ScheduleCell>> = {};

    for (const lab of activeLabs) {
      map[String(lab.id)] = {};

      for (const slot of timeSlots) {
        const matchedBooking = bookings.find((booking) => {
          if (booking.lab_id == null) return false;
          if (String(booking.lab_id) !== String(lab.id)) return false;

          return isTimeSlotCovered(
            slot,
            booking.start_time.slice(0, 5),
            booking.end_time.slice(0, 5)
          );
        });

        map[String(lab.id)][slot] = {
          isOccupied: Boolean(matchedBooking),
          booking: matchedBooking,
        };
      }
    }

    return map;
  }, [activeLabs, bookings, timeSlots]);

  const summary = useMemo(() => {
    let freeCount = 0;
    let occupiedCount = 0;

    activeLabs.forEach((lab) => {
      timeSlots.forEach((slot) => {
        const cell = scheduleMap[String(lab.id)]?.[slot];
        if (cell?.isOccupied) occupiedCount += 1;
        else freeCount += 1;
      });
    });

    return { freeCount, occupiedCount };
  }, [activeLabs, scheduleMap, timeSlots]);

  const changeDateBy = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(formatDateInput(current));
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
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-cyan-300">
              Computer Laboratory Booking System
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              Availability / Schedule
            </h1>
            <p className="mt-2 text-sm text-white/60">
              View the schedule and see which laboratories are free or occupied.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center justify-center border border-white/15 bg-white/10 gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.7),0_0_60px_rgba(76,26,203,0.5)] active:scale-95"
            >
              Back to Dashboard
            </button>

            <button
              onClick={() => router.push("/booklaboratory")}
              className="inline-flex items-center justify-center border border-white/15 bg-white/10 gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.7),0_0_60px_rgba(76,26,203,0.5)] active:scale-95"
            >
              Book Laboratory
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
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-cyan-300" />
              <h2 className="text-lg font-semibold">Choose Date</h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={() => changeDateBy(-1)}
                className="inline-flex items-center justify-center rounded-xl bg-white/10 p-3 text-white transition hover:bg-white/15"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 focus:bg-white/15"
              />

              <button
                onClick={() => changeDateBy(1)}
                className="inline-flex items-center justify-center rounded-xl bg-white/10 p-3 text-white transition hover:bg-white/15"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-sm text-white/55">
              Schedule for {formatLongDate(selectedDate)}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2">
              <MonitorCog className="h-5 w-5 text-emerald-300" />
              <h2 className="text-lg font-semibold">Free Slots</h2>
            </div>
            <p className="text-3xl font-bold text-white">{summary.freeCount}</p>
            <p className="mt-2 text-sm text-white/50">
              Total available timetable cells
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-amber-300" />
              <h2 className="text-lg font-semibold">Occupied Slots</h2>
            </div>
            <p className="text-3xl font-bold text-white">
              {summary.occupiedCount}
            </p>
            <p className="mt-2 text-sm text-white/50">
              Reserved timetable cells
            </p>
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
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/75">
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            Free
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/75">
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            Occupied
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/75">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            Not Available
          </div>
        </div>
        </AnimatedContent>

        <AnimatedContent
          delay={0.4}
          duration={0.9}
          distance={50}
          direction="vertical"
          scale={0.98}
        >
        <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-4 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Laboratory Timetable</h2>
            <p className="mt-1 text-sm text-white/50">
              See which laboratories are free or occupied by time slot.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-white/60">Loading schedule...</p>
          ) : labsError || bookingsError ? (
            <div className="space-y-2">
              {labsError && <p className="text-sm text-red-300">{labsError}</p>}
              {bookingsError && (
                <p className="text-sm text-red-300">{bookingsError}</p>
              )}
            </div>
          ) : activeLabs.length === 0 ? (
            <EmptyState text="No active laboratories found." />
          ) : (
              <div className="overflow-x-auto pb-4 scroll-smooth [scrollbar-width:auto] [scrollbar-color:rgba(255,255,255,0.45)_rgba(255,255,255,0.10)] [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/40 [&::-webkit-scrollbar-thumb:hover]:bg-white/60">
                <div className="min-w-[1600px]">
                  <div
                    className="grid gap-3"
                    style={{
                      gridTemplateColumns: `260px repeat(${timeSlots.length}, minmax(90px, 1fr))`,
                    }}
                  >
                <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] px-3 py-4 text-center text-xs font-semibold text-cyan-200 shadow-inner">
                  Laboratory
                </div>

                  {timeSlots.map((slot) => (
                    <div
                      key={slot}
                      className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] px-3 py-4 text-center text-xs font-semibold text-cyan-200 shadow-inner"
                    >
                      {formatHour12(slot)}
                    </div>
                  ))}

                  {activeLabs.map((lab) => (
                    <ScheduleRow
                      key={lab.id}
                      lab={lab}
                      timeSlots={timeSlots}
                      rowMap={scheduleMap[String(lab.id)] || {}}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
        </AnimatedContent>
      </div>
    </div>
  );
}

function ScheduleRow({
  lab,
  timeSlots,
  rowMap,
}: {
  lab: Lab;
  timeSlots: string[];
  rowMap: Record<string, ScheduleCell>;
}) {
  return (
    <>
      <div className="sticky left-0 z-20 flex flex-col justify-center rounded-2xl border border-white/10 bg-black/60 px-4 py-4 backdrop-blur-xl shadow-inner">
        <p className="font-semibold text-white">{lab.name}</p>
        <p className="mt-1 text-xs text-white/50">
          Capacity: {lab.available_slots}
        </p>
      </div>

      {timeSlots.map((slot) => {
        const cell = rowMap[slot];
        const isBlocked =
          lab.status === "maintenance" || lab.status === "unavailable";

        if (isBlocked) {
          return (
            <div
              key={`${lab.id}-${slot}`}
              className="rounded-2xl border border-red-400/20 bg-gradient-to-br from-red-500/20 to-red-400/10 px-2 py-5 text-center text-xs font-semibold text-red-200"
              title={`Lab status: ${lab.status}`}
            >
              N/A
            </div>
          );
        }

        if (cell?.isOccupied) {
          return (
            <div
              key={`${lab.id}-${slot}`}
              className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/20 to-amber-400/10 px-2 py-5 text-center text-xs font-semibold text-amber-200 transition hover:scale-[1.03]"
              title={`${formatHour12(cell.booking?.start_time?.slice(0, 5) || "")} - ${formatHour12(cell.booking?.end_time?.slice(0, 5) || "")} (${cell.booking?.status})`}
            >
              Occupied
            </div>
          );
        }

        return (
          <div
            key={`${lab.id}-${slot}`}
            className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 px-2 py-5 text-center text-xs font-semibold text-emerald-200 transition hover:scale-[1.03]"
            title="Free"
          >
            Free
          </div>
        );
      })}
    </>
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

function getTodayString() {
  return formatDateInput(new Date());
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

function formatHour12(value: string) {
  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;

  const suffix = hours >= 12 ? "PM" : "AM";
  const normalizedHour = hours % 12 === 0 ? 12 : hours % 12;

  return `${normalizedHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function isTimeSlotCovered(
  slotStart: string,
  bookingStart: string,
  bookingEnd: string
) {
  const slotStartMinutes = toMinutes(slotStart);
  const slotEndMinutes = slotStartMinutes + 60;

  const bookingStartMinutes = toMinutes(bookingStart);
  const bookingEndMinutes = toMinutes(bookingEnd);

  return (
    slotStartMinutes < bookingEndMinutes &&
    slotEndMinutes > bookingStartMinutes
  );
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}