"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  LogOut,
  Users,
  Search,
  UserCheck,
  UserX,
  GraduationCap,
  Briefcase,
  Shield,
  Save,
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

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  is_admin: boolean | null;
  department?: string | null;
  course?: string | null;
  is_active?: boolean | null;
};

export default function ManageUsersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accessDenied, setAccessDenied] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

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
        setAccessDenied("You must be logged in to access manage users.");
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

      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, name, email, role, is_admin, department, course, is_active")
        .order("email", { ascending: true });

      if (usersError) {
        setError(usersError.message);
        return;
      }

      setUsers((usersData || []) as UserRow[]);
    } catch {
      setError("Something went wrong while loading users.");
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

  const updateUser = async (
    userId: string,
    updates: Partial<Pick<UserRow, "role" | "is_admin" | "is_active">>
  ) => {
    if (savingUserId) return;

    setSavingUserId(userId);
    setError("");
    setSuccess("");

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select("id, name, email, role, is_admin, department, course, is_active")
        .single();

      if (error) {
        setError(error.message);
        setSavingUserId(null);
        return;
      }

      setUsers((prev) =>
        prev.map((item) => (item.id === userId ? (data as UserRow) : item))
      );

      setSuccess("User updated successfully.");
    } catch {
      setError("Something went wrong while updating the user.");
    } finally {
      setSavingUserId(null);
    }
  };

  const handleRoleChange = async (user: UserRow, nextRole: string) => {
    const normalizedRole = nextRole.toLowerCase();
    const nextIsAdmin = normalizedRole === "admin";

    await updateUser(user.id, {
      role: nextRole,
      is_admin: nextIsAdmin,
    });
  };

  const handleToggleActive = async (user: UserRow) => {
    await updateUser(user.id, {
      is_active: !(user.is_active ?? true),
    });
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const text = `${user.name || ""} ${user.email || ""} ${user.department || ""} ${user.course || ""} ${user.role || ""}`;

      const matchesSearch = search
        ? text.toLowerCase().includes(search.toLowerCase())
        : true;

      const effectiveRole = (user.role || "").toLowerCase();

      const matchesRole =
        roleFilter === "all"
          ? true
          : effectiveRole === roleFilter.toLowerCase();

      const activeValue = user.is_active ?? true;
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? activeValue === true
          : activeValue === false;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const students = users.filter(
      (user) => (user.role || "").toLowerCase() === "student"
    ).length;
    const faculty = users.filter(
      (user) => (user.role || "").toLowerCase() === "faculty"
    ).length;
    const admins = users.filter(
      (user) => (user.role || "").toLowerCase() === "admin" || user.is_admin
    ).length;
    const active = users.filter((user) => (user.is_active ?? true) === true)
      .length;

    return { total, students, faculty, admins, active };
  }, [users]);

  const getRoleBadge = (role?: string | null, isAdmin?: boolean | null) => {
    const value = (role || "").toLowerCase();

    if (value === "admin" || isAdmin) {
      return "bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-400/20";
    }

    if (value === "faculty") {
      return "bg-amber-500/15 text-amber-300 border border-amber-400/20";
    }

    if (value === "student") {
      return "bg-cyan-500/15 text-cyan-300 border border-cyan-400/20";
    }

    return "bg-white/10 text-white/80 border border-white/10";
  };

  const getStatusBadge = (isActive?: boolean | null) => {
    if ((isActive ?? true) === true) {
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20";
    }

    return "bg-red-500/15 text-red-300 border border-red-400/20";
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
            Loading users...
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
                Admin / Manage Users
              </h1>
              <p className="mt-2 text-sm text-white/60">
                View students, faculty, and admins. Assign roles and activate or
                deactivate accounts.
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
                {refreshing ? "Refreshing..." : "Refresh Users"}
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
            title="Total Users"
            value={stats.total}
            icon={<Users className="h-6 w-6 text-cyan-300" />}
          />
          <StatCard
            title="Students"
            value={stats.students}
            icon={<GraduationCap className="h-6 w-6 text-cyan-300" />}
          />
          <StatCard
            title="Faculty"
            value={stats.faculty}
            icon={<Briefcase className="h-6 w-6 text-amber-300" />}
          />
          <StatCard
            title="Admins"
            value={stats.admins}
            icon={<Shield className="h-6 w-6 text-fuchsia-300" />}
          />
          <StatCard
            title="Active Accounts"
            value={stats.active}
            icon={<UserCheck className="h-6 w-6 text-emerald-300" />}
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
              <h2 className="text-lg font-semibold">Filter Users</h2>
              <p className="text-sm text-white/50">
                Search users and filter them by role and account status
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Search" icon={<Search className="h-4 w-4 text-white/45" />}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, email, department, course"
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
              />
            </Field>

            <Field label="Role" icon={<Shield className="h-4 w-4 text-white/45" />}>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
              >
                <option value="all" className="bg-slate-900">
                  All Roles
                </option>
                <option value="student" className="bg-slate-900">
                  Student
                </option>
                <option value="faculty" className="bg-slate-900">
                  Faculty
                </option>
                <option value="admin" className="bg-slate-900">
                  Admin
                </option>
              </select>
            </Field>

            <Field label="Account Status" icon={<UserCheck className="h-4 w-4 text-white/45" />}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
              >
                <option value="all" className="bg-slate-900">
                  All Accounts
                </option>
                <option value="active" className="bg-slate-900">
                  Active
                </option>
                <option value="inactive" className="bg-slate-900">
                  Inactive
                </option>
              </select>
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
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-purple-500/10 p-3">
              <Users className="h-5 w-5 text-purple-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">User List</h2>
              <p className="text-sm text-white/50">
                Assign roles and activate or deactivate user accounts
              </p>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-white/60">Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <EmptyState text="No users matched your filters." />
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => {
                const activeValue = user.is_active ?? true;
                const isSaving = savingUserId === user.id;

                return (
                  <div
                    key={user.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-base font-semibold text-white">
                            {user.name || "No name"}
                          </h3>

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getRoleBadge(
                              user.role,
                              user.is_admin
                            )}`}
                          >
                            {user.role || (user.is_admin ? "admin" : "user")}
                          </span>

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadge(
                              activeValue
                            )}`}
                          >
                            {activeValue ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2 text-sm text-white/65 sm:grid-cols-2">
                          <p>
                            <span className="font-medium text-white/80">
                              Email:
                            </span>{" "}
                            {user.email || "No email"}
                          </p>
                          <p>
                            <span className="font-medium text-white/80">
                              Department:
                            </span>{" "}
                            {user.department || "—"}
                          </p>
                          <p>
                            <span className="font-medium text-white/80">
                              Course:
                            </span>{" "}
                            {user.course || "—"}
                          </p>
                          <p>
                            <span className="font-medium text-white/80">
                              Admin Access:
                            </span>{" "}
                            {user.is_admin ? "Yes" : "No"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                        <div className="space-y-2">
                          <label className="text-xs font-medium uppercase tracking-wide text-white/55">
                            Assign Role
                          </label>

                          <div className="flex gap-2">
                            <select
                              defaultValue={user.role || "student"}
                              disabled={isSaving}
                              onChange={(e) => handleRoleChange(user, e.target.value)}
                              className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <option value="student" className="bg-slate-900">
                                Student
                              </option>
                              <option value="faculty" className="bg-slate-900">
                                Faculty
                              </option>
                              <option value="admin" className="bg-slate-900">
                                Admin
                              </option>
                            </select>

                            <div className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 text-white/60">
                              <Save className="h-4 w-4" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-medium uppercase tracking-wide text-white/55">
                            Account Status
                          </label>

                          <button
                            onClick={() => handleToggleActive(user)}
                            disabled={isSaving}
                            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                              activeValue
                                ? "border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                                : "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                            }`}
                          >
                            {activeValue ? (
                              <>
                                <UserX className="h-4 w-4" />
                                {isSaving ? "Updating..." : "Deactivate Account"}
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4" />
                                {isSaving ? "Updating..." : "Activate Account"}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        /</AnimatedContent>

        <AnimatedContent
          delay={0.7}
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