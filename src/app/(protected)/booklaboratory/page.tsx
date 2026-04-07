"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  BookCheck,
  CalendarDays,
  Clock3,
  FlaskConical,
  FileText,
  GraduationCap,
  UserSquare2,
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
};

export default function BookLaboratoryPage() {
  const router = useRouter();

  const [labs, setLabs] = useState<Lab[]>([]);
  const [loadingLabs, setLoadingLabs] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedLabId, setSelectedLabId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [subject, setSubject] = useState("");
  const [instructor, setInstructor] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchLabs();
  }, []);

  const fetchLabs = async () => {
    setLoadingLabs(true);
    setError("");

    const { data, error } = await supabase
      .from("labs")
      .select("id, name, status, available_slots")
      .order("name", { ascending: true });

    if (error) {
      console.error("Labs fetch error:", error.message);
      setError(error.message);
      setLabs([]);
    } else {
      setLabs((data || []) as Lab[]);
    }

    setLoadingLabs(false);
  };

  const availableLabs = useMemo(() => {
    return labs.filter((lab) => lab.status === "available");
  }, [labs]);

  const today = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    setError("");
    setSuccess("");

    const trimmedPurpose = purpose.trim();
    const trimmedSubject = subject.trim();
    const trimmedInstructor = instructor.trim();

    if (
      !selectedLabId ||
      !date ||
      !startTime ||
      !endTime ||
      !trimmedPurpose ||
      !trimmedSubject ||
      !trimmedInstructor
    ) {
      setError("Please complete all fields.");
      return;
    }

    if (endTime <= startTime) {
      setError("End time must be later than start time.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        setError(authError.message);
        setSubmitting(false);
        return;
      }

      if (!user) {
        setError("You must be logged in to submit a booking request.");
        setSubmitting(false);
        return;
      }

      const selectedLab = labs.find((lab) => String(lab.id) === selectedLabId);

      if (!selectedLab) {
        setError("Selected laboratory was not found.");
        setSubmitting(false);
        return;
      }

      const { data: existingBookings, error: checkError } = await supabase
        .from("bookings")
        .select("id, start_time, end_time, status")
        .eq("lab_id", Number(selectedLabId))
        .eq("date", date)
        .in("status", ["pending", "approved"]);

      if (checkError) {
        setError(checkError.message);
        setSubmitting(false);
        return;
      }

      const hasConflict = (existingBookings || []).some((booking) => {
        return startTime < booking.end_time && endTime > booking.start_time;
      });

      if (hasConflict) {
        setError("This laboratory already has a booking in the selected time range.");
        setSubmitting(false);
        return;
      }

      const { error: insertError } = await supabase.from("bookings").insert([
        {
          user_id: user.id,
          lab_id: Number(selectedLabId),
          date,
          start_time: startTime,
          end_time: endTime,
          purpose: trimmedPurpose,
          subject: trimmedSubject,
          instructor: trimmedInstructor,
          status: "pending",
        },
      ]);

      if (insertError) {
        setError(insertError.message);
        setSubmitting(false);
        return;
      }

      setSuccess("Booking request submitted successfully.");
      setTimeout(() => {
        router.push("/bookings");
      }, 1500);

      setSelectedLabId("");
      setDate("");
      setStartTime("");
      setEndTime("");
      setPurpose("");
      setSubject("");
      setInstructor("");

      setSubmitting(false);
    } catch (err) {
      console.error("Booking submit error:", err);
      setError("Something went wrong while submitting your booking.");
      setSubmitting(false);
    }
  };

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
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-cyan-300">Computer Laboratory Booking System</p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
                Book Laboratory
              </h1>
              <p className="mt-2 text-sm text-white/60">
                Choose a laboratory, select the date and time, enter the purpose,
                subject, and instructor, then submit.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-gradient-to-r from-[#CB1A29] via-[#CB1AC2] to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.45)] active:scale-95"
            >
              Back to Dashboard
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-500/10 p-3">
                <BookCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Booking Request Form</h2>
                <p className="text-sm text-white/50">
                  Fill in all required booking details
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {success}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/85">
                  Choose Laboratory
                </label>

                <div className="relative">
                  <FlaskConical className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45" />
                  <select
                    value={selectedLabId}
                    onChange={(e) => setSelectedLabId(e.target.value)}
                    disabled={loadingLabs || submitting}
                    className="w-full appearance-none rounded-xl border border-white/15 bg-white/10 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-cyan-400 focus:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="" className="text-black">
                      {loadingLabs ? "Loading laboratories..." : "Select laboratory"}
                    </option>

                    {availableLabs.map((lab) => (
                      <option key={lab.id} value={lab.id} className="text-black">
                        {lab.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/85">Date</label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45" />
                    <input
                      type="date"
                      min={today}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      disabled={submitting}
                      className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-cyan-400 focus:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/85">
                    Start Time
                  </label>
                  <div className="relative">
                    <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45" />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      disabled={submitting}
                      className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-cyan-400 focus:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/85">
                    End Time
                  </label>
                  <div className="relative">
                    <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45" />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={submitting}
                      className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-cyan-400 focus:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/85">
                  Purpose
                </label>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-white/45" />
                  <textarea
                    rows={4}
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    disabled={submitting}
                    placeholder="Enter the purpose of the laboratory booking"
                    className="w-full resize-none rounded-xl border border-white/15 bg-white/10 py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-cyan-400 focus:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/85">
                    Subject
                  </label>
                  <div className="relative">
                    <GraduationCap className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45" />
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      disabled={submitting}
                      placeholder="Enter subject"
                      className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-cyan-400 focus:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/85">
                    Instructor
                  </label>
                  <div className="relative">
                    <UserSquare2 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45" />
                    <input
                      type="text"
                      value={instructor}
                      onChange={(e) => setInstructor(e.target.value)}
                      disabled={submitting}
                      placeholder="Enter instructor name"
                      className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-cyan-400 focus:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || loadingLabs}
                className="w-full rounded-xl bg-gradient-to-r from-[#CB1A29] via-[#CB1AC2] to-[#4C1ACB] py-3 text-sm font-semibold tracking-wide text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(203,26,194,0.45)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting Booking Request..." : "Submit Booking Request"}
              </button>
            </form>
          </section>

          <aside className="space-y-6">
            <AnimatedContent
              delay={0.3}
              duration={0.9}
              distance={50}
              direction="vertical"
              scale={0.98}
            >
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
              <h3 className="text-lg font-semibold text-white">Available Laboratories</h3>
              <p className="mt-2 text-sm text-white/55">
                Only laboratories marked as available can be selected.
              </p>

              <div className="mt-5 space-y-3">
                {loadingLabs ? (
                  <p className="text-sm text-white/55">Loading laboratories...</p>
                ) : availableLabs.length === 0 ? (
                  <p className="text-sm text-white/55">No available laboratories found.</p>
                ) : (
                  availableLabs.map((lab) => (
                    <div
                      key={lab.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <p className="font-medium text-white">{lab.name}</p>
                      <p className="mt-1 text-sm text-white/55">
                        Available slots: {lab.available_slots}
                      </p>
                    </div>
                  ))
                )}
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
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
              <h3 className="text-lg font-semibold text-white">Booking Notes</h3>

              <div className="mt-4 space-y-3 text-sm text-white/60">
                <p>• Choose an available laboratory before setting the schedule.</p>
                <p>• Time conflicts with existing pending or approved bookings are blocked.</p>
                <p>• Booking requests are submitted with pending status first.</p>
                <p>• Make sure the purpose, subject, and instructor are complete.</p>
              </div>
            </div>
            </AnimatedContent>
          </aside>
        </div>
        </AnimatedContent>
      </div>
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