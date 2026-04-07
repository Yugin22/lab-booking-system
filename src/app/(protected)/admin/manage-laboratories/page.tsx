"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  LogOut,
  FlaskConical,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Users,
  Clock3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wrench,
  Save,
  X,
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

type LabRow = {
  id: number;
  name: string;
  status: string | null;
  available_slots: number | null;
  capacity?: number | null;
  location?: string | null;
  available_from?: string | null;
  available_to?: string | null;
  created_at?: string | null;
};

type LabFormState = {
  name: string;
  capacity: string;
  location: string;
  available_from: string;
  available_to: string;
  status: string;
};

const defaultForm: LabFormState = {
  name: "",
  capacity: "",
  location: "",
  available_from: "07:00",
  available_to: "17:00",
  status: "available",
};

export default function ManageLaboratoriesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [labs, setLabs] = useState<LabRow[]>([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accessDenied, setAccessDenied] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingLabId, setEditingLabId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingLabId, setDeletingLabId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [form, setForm] = useState<LabFormState>(defaultForm);

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
        setAccessDenied("You must be logged in to access manage laboratories.");
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

      const { data: labsData, error: labsError } = await supabase
        .from("labs")
        .select(
          "id, name, status, available_slots, capacity, location, available_from, available_to, created_at"
        )
        .order("name", { ascending: true });

      if (labsError) {
        setError(labsError.message);
        return;
      }

      setLabs((labsData || []) as LabRow[]);
    } catch {
      setError("Something went wrong while loading laboratories.");
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
    setIsEditing(false);
    setEditingLabId(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const openEditForm = (lab: LabRow) => {
    setForm({
      name: lab.name || "",
      capacity: String(lab.capacity ?? lab.available_slots ?? 0),
      location: lab.location || "",
      available_from: lab.available_from || "07:00",
      available_to: lab.available_to || "17:00",
      status: lab.status || "available",
    });
    setIsEditing(true);
    setEditingLabId(lab.id);
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const handleSaveLab = async () => {
    if (saving) return;

    const trimmedName = form.name.trim();
    const trimmedLocation = form.location.trim();
    const capacityNumber = Number(form.capacity);

    if (!trimmedName) {
      setError("Laboratory name is required.");
      return;
    }

    if (!form.capacity || Number.isNaN(capacityNumber) || capacityNumber < 0) {
      setError("Capacity must be a valid number.");
      return;
    }

    if (!trimmedLocation) {
      setError("Location is required.");
      return;
    }

    if (!form.available_from || !form.available_to) {
      setError("Availability hours are required.");
      return;
    }

    if (form.available_from >= form.available_to) {
      setError("Availability end time must be later than start time.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      name: trimmedName,
      capacity: capacityNumber,
      available_slots: capacityNumber,
      location: trimmedLocation,
      available_from: form.available_from,
      available_to: form.available_to,
      status: form.status,
    };

    try {
      if (isEditing && editingLabId !== null) {
        const { data, error } = await supabase
          .from("labs")
          .update(payload)
          .eq("id", editingLabId)
          .select()
          .single();

        if (error) {
          setError(error.message);
          setSaving(false);
          return;
        }

        setLabs((prev) =>
          prev.map((lab) => (lab.id === editingLabId ? (data as LabRow) : lab))
        );

        setSuccess("Laboratory updated successfully.");
      } else {
        const { data, error } = await supabase
          .from("labs")
          .insert(payload)
          .select()
          .single();

        if (error) {
          setError(error.message);
          setSaving(false);
          return;
        }

        setLabs((prev) =>
          [...prev, data as LabRow].sort((a, b) => a.name.localeCompare(b.name))
        );

        setSuccess("Laboratory added successfully.");
      }

      resetForm();
      setShowForm(false);
    } catch {
      setError("Something went wrong while saving the laboratory.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLab = async (labId: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this laboratory?"
    );

    if (!confirmed) return;

    setDeletingLabId(labId);
    setError("");
    setSuccess("");

    try {
      // 🔍 Check if lab has bookings
      const { data: bookings, error: checkError } = await supabase
      .from("bookings")
      .select("id")
      .eq("lab_id", labId)
      .limit(1);

      if (checkError) {
      setError(checkError.message);
      setDeletingLabId(null);
      return;
      }

      if (bookings && bookings.length > 0) {
      setError("Cannot delete this lab because it has existing bookings.");
      setDeletingLabId(null);
      return;
      }

      // ✅ Safe to delete
      const { error } = await supabase.from("labs").delete().eq("id", labId);

      if (error) {
        setError(error.message);
        setDeletingLabId(null);
        return;
      }

      setLabs((prev) => prev.filter((lab) => lab.id !== labId));
      setSuccess("Laboratory deleted successfully.");
    } catch {
      setError("Something went wrong while deleting the laboratory.");
    } finally {
      setDeletingLabId(null);
    }
  };

  const filteredLabs = useMemo(() => {
    return labs.filter((lab) => {
      const matchesSearch = search
        ? `${lab.name} ${lab.location || ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;

      const matchesStatus =
        statusFilter === "all"
          ? true
          : (lab.status || "").toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [labs, search, statusFilter]);

  const stats = useMemo(() => {
    const total = labs.length;
    const available = labs.filter(
      (lab) => lab.status?.toLowerCase() === "available"
    ).length;
    const occupied = labs.filter(
      (lab) => lab.status?.toLowerCase() === "occupied"
    ).length;
    const maintenance = labs.filter(
      (lab) =>
        lab.status?.toLowerCase() === "maintenance" ||
        lab.status?.toLowerCase() === "unavailable"
    ).length;

    return { total, available, occupied, maintenance };
  }, [labs]);

  const getStatusBadge = (status?: string | null) => {
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

  const formatTime = (time?: string | null) => {
    if (!time) return "—";
  
    const [hour, minute] = time.split(":").map(Number);
  
    const suffix = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
  
    return `${formattedHour}:${minute.toString().padStart(2, "0")} ${suffix}`;
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
            Loading laboratories...
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
                Admin / Manage Laboratories
              </h1>
              <p className="mt-2 text-xs text-white/60">
                Add, edit, and delete computer labs. Set capacity, location, and
                availability hours.
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
                {refreshing ? "Refreshing..." : "Refresh Laboratories"}
              </button>

              <button
                onClick={openAddForm}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.7),0_0_60px_rgba(76,26,203,0.5)] active:scale-95"
              >
                <Plus className="h-5 w-5" />
                Add Laboratory
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Laboratories"
            value={stats.total}
            icon={<FlaskConical className="h-6 w-6 text-cyan-300" />}
          />
          <StatCard
            title="Available"
            value={stats.available}
            icon={<CheckCircle2 className="h-6 w-6 text-emerald-300" />}
          />
          <StatCard
            title="Occupied"
            value={stats.occupied}
            icon={<AlertCircle className="h-6 w-6 text-amber-300" />}
          />
          <StatCard
            title="Maintenance"
            value={stats.maintenance}
            icon={<Wrench className="h-6 w-6 text-red-300" />}
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
                  {isEditing ? "Edit Laboratory" : "Add Laboratory"}
                </h2>
                <p className="text-sm text-white/50">
                  Fill in the laboratory details below
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
              <Field label="Laboratory Name" icon={<FlaskConical className="h-4 w-4 text-white/45" />}>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Example: Computer Lab 1"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
                />
              </Field>

              <Field label="Capacity" icon={<Users className="h-4 w-4 text-white/45" />}>
                <input
                  type="number"
                  min="0"
                  value={form.capacity}
                  onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))}
                  placeholder="Number of computers"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
                />
              </Field>

              <Field label="Location" icon={<MapPin className="h-4 w-4 text-white/45" />}>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Example: 2nd Floor, Main Building"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
                />
              </Field>

              <Field label="Available From" icon={<Clock3 className="h-4 w-4 text-white/45" />}>
                <input
                  type="time"
                  value={form.available_from}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, available_from: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
                />
              </Field>

              <Field label="Available To" icon={<Clock3 className="h-4 w-4 text-white/45" />}>
                <input
                  type="time"
                  value={form.available_to}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, available_to: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
                />
              </Field>

              <Field label="Status" icon={<CheckCircle2 className="h-4 w-4 text-white/45" />}>
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
                >
                  <option value="available" className="bg-slate-900">
                    Available
                  </option>
                  <option value="occupied" className="bg-slate-900">
                    Occupied
                  </option>
                  <option value="maintenance" className="bg-slate-900">
                    Maintenance
                  </option>
                  <option value="unavailable" className="bg-slate-900">
                    Unavailable
                  </option>
                </select>
              </Field>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleSaveLab}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition-all duration-300 hover:bg-emerald-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving
                  ? isEditing
                    ? "Updating..."
                    : "Saving..."
                  : isEditing
                  ? "Update Laboratory"
                  : "Save Laboratory"}
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
              <FlaskConical className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Laboratory Filters</h2>
              <p className="text-sm text-white/50">
                Search laboratories by name or location and filter by status
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Search" icon={<FlaskConical className="h-4 w-4 text-white/45" />}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or location"
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
              />
            </Field>

            <Field label="Status" icon={<CheckCircle2 className="h-4 w-4 text-white/45" />}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
              >
                <option value="all" className="bg-slate-900">
                  All Statuses
                </option>
                <option value="available" className="bg-slate-900">
                  Available
                </option>
                <option value="occupied" className="bg-slate-900">
                  Occupied
                </option>
                <option value="maintenance" className="bg-slate-900">
                  Maintenance
                </option>
                <option value="unavailable" className="bg-slate-900">
                  Unavailable
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
              <FlaskConical className="h-5 w-5 text-purple-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Laboratory List</h2>
              <p className="text-sm text-white/50">
                Manage all computer laboratories from one place
              </p>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-white/60">Loading laboratories...</p>
          ) : filteredLabs.length === 0 ? (
            <EmptyState text="No laboratories matched your filters." />
          ) : (
            <div className="space-y-4">
              {filteredLabs.map((lab) => (
                <div
                  key={lab.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-semibold text-white">
                          {lab.name}
                        </h3>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusBadge(
                            lab.status
                          )}`}
                        >
                          {lab.status || "Unknown"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-sm text-white/65 sm:grid-cols-2">
                        <p>
                          <span className="font-medium text-white/80">Capacity:</span>{" "}
                          {lab.capacity ?? lab.available_slots ?? 0}
                        </p>

                        <p>
                          <span className="font-medium text-white/80">Availability:</span>{" "}
                          {formatTime(lab.available_from)} - {formatTime(lab.available_to)}
                        </p>

                        <p>
                          <span className="font-medium text-white/80">Location:</span>{" "}
                          {lab.location || "—"}
                        </p>

                        <p>
                          <span className="font-medium text-white/80">Available Slots:</span>{" "}
                          {lab.available_slots ?? 0}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:min-w-[260px]">
                      <button
                        onClick={() => openEditForm(lab)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100 transition-all duration-300 hover:bg-amber-500/20 active:scale-95"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteLab(lab.id)}
                        disabled={deletingLabId === lab.id}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 transition-all duration-300 hover:bg-red-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingLabId === lab.id ? "Deleting..." : "Delete"}
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