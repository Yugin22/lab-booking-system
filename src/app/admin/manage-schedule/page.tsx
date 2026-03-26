"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  LogOut,
  Clock3,
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Wrench,
  CalendarX2,
  Search,
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

type ScheduleRuleRow = {
  id: number;
  title: string;
  rule_type: "time_slot" | "maintenance" | "holiday" | "unavailable";
  date_from: string | null;
  date_to: string | null;
  time_start: string | null;
  time_end: string | null;
  applies_to: string | null;
  notes: string | null;
  is_active: boolean | null;
  created_at?: string | null;
};

type RuleFormState = {
  title: string;
  rule_type: "time_slot" | "maintenance" | "holiday" | "unavailable";
  date_from: string;
  date_to: string;
  time_start: string;
  time_end: string;
  applies_to: string;
  notes: string;
  is_active: boolean;
};

const defaultForm: RuleFormState = {
  title: "",
  rule_type: "time_slot",
  date_from: "",
  date_to: "",
  time_start: "08:00",
  time_end: "17:00",
  applies_to: "all",
  notes: "",
  is_active: true,
};

export default function ManageSchedulePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [savingRule, setSavingRule] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState<number | null>(null);

  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [rules, setRules] = useState<ScheduleRuleRow[]>([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accessDenied, setAccessDenied] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [form, setForm] = useState<RuleFormState>(defaultForm);

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
        setAccessDenied("You must be logged in to access manage schedule.");
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

      const { data: rulesData, error: rulesError } = await supabase
        .from("schedule_rules")
        .select(
          "id, title, rule_type, date_from, date_to, time_start, time_end, applies_to, notes, is_active, created_at"
        )
        .order("created_at", { ascending: false });

      if (rulesError) {
        setError(rulesError.message);
        return;
      }

      setRules((rulesData || []) as ScheduleRuleRow[]);
    } catch {
      setError("Something went wrong while loading schedule rules.");
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

  const resetForm = () => {
    setForm(defaultForm);
    setEditingRuleId(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const openEditForm = (rule: ScheduleRuleRow) => {
    setForm({
      title: rule.title || "",
      rule_type: rule.rule_type,
      date_from: rule.date_from || "",
      date_to: rule.date_to || "",
      time_start: rule.time_start || "08:00",
      time_end: rule.time_end || "17:00",
      applies_to: rule.applies_to || "all",
      notes: rule.notes || "",
      is_active: rule.is_active ?? true,
    });
    setEditingRuleId(rule.id);
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return false;
    }

    if (!form.rule_type) {
      setError("Rule type is required.");
      return false;
    }

    if (
      (form.rule_type === "maintenance" ||
        form.rule_type === "holiday" ||
        form.rule_type === "unavailable") &&
      !form.date_from
    ) {
      setError("Start date is required for this rule type.");
      return false;
    }

    if (form.date_from && form.date_to && form.date_from > form.date_to) {
      setError("End date cannot be earlier than start date.");
      return false;
    }

    if (form.rule_type === "time_slot") {
      if (!form.time_start || !form.time_end) {
        setError("Start and end time are required for time slots.");
        return false;
      }

      if (form.time_start >= form.time_end) {
        setError("End time must be later than start time.");
        return false;
      }
    }

    return true;
  };

  const handleSaveRule = async () => {
    if (savingRule) return;

    setError("");
    setSuccess("");

    if (!validateForm()) return;

    setSavingRule(true);

    const payload = {
      title: form.title.trim(),
      rule_type: form.rule_type,
      date_from: form.date_from || null,
      date_to: form.date_to || null,
      time_start: form.rule_type === "time_slot" ? form.time_start || null : null,
      time_end: form.rule_type === "time_slot" ? form.time_end || null : null,
      applies_to: form.applies_to.trim() || "all",
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    };

    try {
      if (editingRuleId !== null) {
        const { data, error } = await supabase
          .from("schedule_rules")
          .update(payload)
          .eq("id", editingRuleId)
          .select(
            "id, title, rule_type, date_from, date_to, time_start, time_end, applies_to, notes, is_active, created_at"
          )
          .single();

        if (error) {
          setError(error.message);
          setSavingRule(false);
          return;
        }

        setRules((prev) =>
          prev.map((item) =>
            item.id === editingRuleId ? (data as ScheduleRuleRow) : item
          )
        );

        setSuccess("Schedule rule updated successfully.");
      } else {
        const { data, error } = await supabase
          .from("schedule_rules")
          .insert(payload)
          .select(
            "id, title, rule_type, date_from, date_to, time_start, time_end, applies_to, notes, is_active, created_at"
          )
          .single();

        if (error) {
          setError(error.message);
          setSavingRule(false);
          return;
        }

        setRules((prev) => [data as ScheduleRuleRow, ...prev]);
        setSuccess("Schedule rule added successfully.");
      }

      resetForm();
      setShowForm(false);
    } catch {
      setError("Something went wrong while saving the schedule rule.");
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this schedule rule?"
    );
    if (!confirmed) return;

    setDeletingRuleId(ruleId);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase
        .from("schedule_rules")
        .delete()
        .eq("id", ruleId);

      if (error) {
        setError(error.message);
        setDeletingRuleId(null);
        return;
      }

      setRules((prev) => prev.filter((item) => item.id !== ruleId));
      setSuccess("Schedule rule deleted successfully.");
    } catch {
      setError("Something went wrong while deleting the schedule rule.");
    } finally {
      setDeletingRuleId(null);
    }
  };

  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      const haystack =
        `${rule.title} ${rule.rule_type} ${rule.applies_to || ""} ${rule.notes || ""}`.toLowerCase();

      const matchesSearch = search
        ? haystack.includes(search.toLowerCase())
        : true;

      const matchesType =
        typeFilter === "all"
          ? true
          : rule.rule_type.toLowerCase() === typeFilter.toLowerCase();

      return matchesSearch && matchesType;
    });
  }, [rules, search, typeFilter]);

  const stats = useMemo(() => {
    const total = rules.length;
    const timeSlots = rules.filter((r) => r.rule_type === "time_slot").length;
    const maintenance = rules.filter((r) => r.rule_type === "maintenance").length;
    const holidays = rules.filter((r) => r.rule_type === "holiday").length;
    const unavailable = rules.filter((r) => r.rule_type === "unavailable").length;

    return { total, timeSlots, maintenance, holidays, unavailable };
  }, [rules]);

  const getTypeBadge = (type: ScheduleRuleRow["rule_type"]) => {
    if (type === "time_slot") {
      return "bg-cyan-500/15 text-cyan-300 border border-cyan-400/20";
    }
    if (type === "maintenance") {
      return "bg-amber-500/15 text-amber-300 border border-amber-400/20";
    }
    if (type === "holiday") {
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20";
    }
    if (type === "unavailable") {
      return "bg-red-500/15 text-red-300 border border-red-400/20";
    }
    return "bg-white/10 text-white/80 border border-white/10";
  };

  const getStatusBadge = (isActive?: boolean | null) => {
    return isActive ?? true
      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20"
      : "bg-slate-500/15 text-slate-300 border border-slate-400/20";
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
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
            Loading schedules...
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
                Admin / Manage Schedules
              </h1>
              <p className="mt-2 text-xs text-white/60">
                Configure available booking times, block maintenance dates, holidays.
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
                {refreshing ? "Refreshing..." : "Refresh Schedules"}
              </button>

              <button
                onClick={openAddForm}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.7),0_0_60px_rgba(76,26,203,0.5)] active:scale-95"
              >
                <Plus className="h-5 w-5" />
                Add Schedule Rule
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
            title="Total Rules"
            value={stats.total}
            icon={<CalendarDays className="h-6 w-6 text-cyan-300" />}
          />
          <StatCard
            title="Time Slots"
            value={stats.timeSlots}
            icon={<Clock3 className="h-6 w-6 text-cyan-300" />}
          />
          <StatCard
            title="Maintenance"
            value={stats.maintenance}
            icon={<Wrench className="h-6 w-6 text-amber-300" />}
          />
          <StatCard
            title="Holidays"
            value={stats.holidays}
            icon={<CheckCircle2 className="h-6 w-6 text-emerald-300" />}
          />
          <StatCard
            title="Unavailable"
            value={stats.unavailable}
            icon={<CalendarX2 className="h-6 w-6 text-red-300" />}
          />
        </div>
        </AnimatedContent>

        {showForm && (
          <AnimatedContent
            delay={0.5}
            duration={0.9}
            distance={50}
            direction="vertical"
            scale={0.98}
          >
          <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingRuleId !== null ? "Edit Schedule Rule" : "Add Schedule Rule"}
                </h2>
                <p className="text-sm text-white/50">
                  Configure time slots, maintenance blocks, holidays, or unavailable periods
                </p>
              </div>

              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Title" icon={<CalendarDays className="h-4 w-4 text-white/45" />}>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Example: Regular Weekday Booking"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
                />
              </Field>

              <Field label="Rule Type" icon={<AlertCircle className="h-4 w-4 text-white/45" />}>
                <select
                  value={form.rule_type}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      rule_type: e.target.value as RuleFormState["rule_type"],
                    }))
                  }
                  className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
                >
                  <option value="time_slot" className="bg-slate-900">
                    Time Slot
                  </option>
                  <option value="maintenance" className="bg-slate-900">
                    Maintenance
                  </option>
                  <option value="holiday" className="bg-slate-900">
                    Holiday
                  </option>
                  <option value="unavailable" className="bg-slate-900">
                    Unavailable Period
                  </option>
                </select>
              </Field>

              <Field label="Applies To" icon={<CalendarDays className="h-4 w-4 text-white/45" />}>
                <input
                  type="text"
                  value={form.applies_to}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, applies_to: e.target.value }))
                  }
                  placeholder="all or specific lab"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
                />
              </Field>

              <Field label="Start Date" icon={<CalendarDays className="h-4 w-4 text-white/45" />}>
                <input
                  type="date"
                  value={form.date_from}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, date_from: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
                />
              </Field>

              <Field label="End Date" icon={<CalendarDays className="h-4 w-4 text-white/45" />}>
                <input
                  type="date"
                  value={form.date_to}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, date_to: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
                />
              </Field>

              <Field label="Active" icon={<CheckCircle2 className="h-4 w-4 text-white/45" />}>
                <select
                  value={form.is_active ? "true" : "false"}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      is_active: e.target.value === "true",
                    }))
                  }
                  className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
                >
                  <option value="true" className="bg-slate-900">
                    Active
                  </option>
                  <option value="false" className="bg-slate-900">
                    Inactive
                  </option>
                </select>
              </Field>

              <Field label="Start Time" icon={<Clock3 className="h-4 w-4 text-white/45" />}>
                <input
                  type="time"
                  value={form.time_start}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, time_start: e.target.value }))
                  }
                  disabled={form.rule_type !== "time_slot"}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08] disabled:opacity-50"
                />
              </Field>

              <Field label="End Time" icon={<Clock3 className="h-4 w-4 text-white/45" />}>
                <input
                  type="time"
                  value={form.time_end}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, time_end: e.target.value }))
                  }
                  disabled={form.rule_type !== "time_slot"}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08] disabled:opacity-50"
                />
              </Field>

              <div className="md:col-span-2 xl:col-span-3">
                <Field label="Notes" icon={<AlertCircle className="h-4 w-4 text-white/45" />}>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Optional notes about this schedule rule"
                    rows={4}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
                  />
                </Field>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleSaveRule}
                disabled={savingRule}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition-all duration-300 hover:bg-emerald-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {savingRule
                  ? editingRuleId !== null
                    ? "Updating..."
                    : "Saving..."
                  : editingRuleId !== null
                  ? "Update Rule"
                  : "Save Rule"}
              </button>

              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-95"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </section>
          </AnimatedContent>
        )}

        <AnimatedContent
          delay={0.6}
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
              <h2 className="text-lg font-semibold">Filter Schedule Rules</h2>
              <p className="text-sm text-white/50">
                Search by title, notes, or applies-to and filter by rule type
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Search" icon={<Search className="h-4 w-4 text-white/45" />}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, notes, applies-to"
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
              />
            </Field>

            <Field label="Rule Type" icon={<AlertCircle className="h-4 w-4 text-white/45" />}>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
              >
                <option value="all" className="bg-slate-900">
                  All Types
                </option>
                <option value="time_slot" className="bg-slate-900">
                  Time Slot
                </option>
                <option value="maintenance" className="bg-slate-900">
                  Maintenance
                </option>
                <option value="holiday" className="bg-slate-900">
                  Holiday
                </option>
                <option value="unavailable" className="bg-slate-900">
                  Unavailable Period
                </option>
              </select>
            </Field>
          </div>
        </section>
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
            <div className="rounded-xl bg-purple-500/10 p-3">
              <CalendarDays className="h-5 w-5 text-purple-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Schedule Rules</h2>
              <p className="text-sm text-white/50">
                Manage available booking times and blocked periods
              </p>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-white/60">Loading schedule rules...</p>
          ) : filteredRules.length === 0 ? (
            <EmptyState text="No schedule rules matched your filters." />
          ) : (
            <div className="space-y-4">
              {filteredRules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-semibold text-white">
                          {rule.title}
                        </h3>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getTypeBadge(
                            rule.rule_type
                          )}`}
                        >
                          {rule.rule_type.replace("_", " ")}
                        </span>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadge(
                            rule.is_active
                          )}`}
                        >
                          {(rule.is_active ?? true) ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-sm text-white/65 sm:grid-cols-2">
                        <p>
                          <span className="font-medium text-white/80">
                            Start Date:
                          </span>{" "}
                          {formatDate(rule.date_from)}
                        </p>
                        <p>
                          <span className="font-medium text-white/80">
                            End Date:
                          </span>{" "}
                          {formatDate(rule.date_to)}
                        </p>
                        <p>
                          <span className="font-medium text-white/80">
                            Time:
                          </span>{" "}
                          {rule.time_start || "—"} - {rule.time_end || "—"}
                        </p>
                        <p>
                          <span className="font-medium text-white/80">
                            Applies To:
                          </span>{" "}
                          {rule.applies_to || "all"}
                        </p>
                      </div>

                      {rule.notes && (
                        <p className="text-sm text-white/55">
                          <span className="font-medium text-white/75">Notes:</span>{" "}
                          {rule.notes}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:min-w-[260px]">
                      <button
                        onClick={() => openEditForm(rule)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100 transition-all duration-300 hover:bg-amber-500/20 active:scale-95"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        disabled={deletingRuleId === rule.id}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 transition-all duration-300 hover:bg-red-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingRuleId === rule.id ? "Deleting..." : "Delete"}
                      </button>
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