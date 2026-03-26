"use client";

import { FormEvent, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  Building2,
  GraduationCap,
  Shield,
  RefreshCw,
  Save,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import AnimatedContent from "@/components/AnimatedContent";

const Aurora = dynamic(() => import("@/components/Aurora"), {
  ssr: false,
});

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  department: string | null;
  course: string | null;
  updated_at?: string | null;
};

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profileId, setProfileId] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [course, setCourse] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchProfile = async () => {
    try {
      setRefreshing(true);
      setError("");
      setSuccess("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setError(userError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setError("You must be logged in to view your profile.");
        setLoading(false);
        return;
      }

      setProfileId(user.id);
      setEmail(user.email || "");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, email, role, department, course, updated_at")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      if (profile) {
        const row = profile as ProfileRow;
        setName(row.name || "");
        setRole(row.role || "");
        setDepartment(row.department || "");
        setCourse(row.course || "");
        if (row.email) {
          setEmail(row.email);
        }
      }
    } catch (err) {
      console.error("Fetch profile error:", err);
      setError("Something went wrong while loading your profile.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (savingProfile) return;

    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const trimmedRole = role.trim();
    const trimmedDepartment = department.trim();
    const trimmedCourse = course.trim();

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    if (!profileId) {
      setError("Profile not found.");
      return;
    }

    setSavingProfile(true);

    try {
      const { error } = await supabase.from("profiles").upsert(
        [
          {
            id: profileId,
            name: trimmedName,
            email: email.trim().toLowerCase(),
            role: trimmedRole || null,
            department: trimmedDepartment || null,
            course: trimmedCourse || null,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "id" }
      );

      if (error) {
        setError(error.message);
        setSavingProfile(false);
        return;
      }

      setSuccess("Profile information updated successfully.");
    } catch (err) {
      console.error("Save profile error:", err);
      setError("Something went wrong while saving your profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (savingPassword) return;

    setError("");
    setSuccess("");

    if (!newPassword || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSavingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setError(error.message);
        setSavingPassword(false);
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password updated successfully.");
    } catch (err) {
      console.error("Update password error:", err);
      setError("Something went wrong while updating your password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const actionButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.7),0_0_60px_rgba(76,26,203,0.5)] active:scale-95";

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <AuroraBackground />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
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
              Profile / Account Settings
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Update your profile information and password.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => router.push("/dashboard")}
              className={actionButtonClass}
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>

            <button
              onClick={fetchProfile}
              title="Refresh Profile"
              disabled={refreshing}
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
            delay={0.3}
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
            delay={0.4}
            duration={0.9}
            distance={50}
            direction="vertical"
            scale={0.98}
          >
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 text-sm text-white/60 shadow-[0_10px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            Loading profile...
          </div>
          </AnimatedContent>
        ) : (
          <AnimatedContent
            delay={0.5}
            duration={0.9}
            distance={50}
            direction="vertical"
            scale={0.98}
          >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="xl:col-span-2 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-cyan-500/10 p-3">
                  <User className="h-5 w-5 text-cyan-300" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Personal Information</h2>
                  <p className="text-sm text-white/50">
                    Update your account profile details
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InputField
                    icon={<User className="h-5 w-5 text-white/45" />}
                    label="Full Name"
                    value={name}
                    onChange={setName}
                    placeholder="Enter your full name"
                  />

                  <InputField
                    icon={<Shield className="h-5 w-5 text-white/45" />}
                    label="Role"
                    value={role}
                    onChange={setRole}
                    placeholder="Student, Instructor, Admin"
                  />

                  <InputField
                    icon={<Building2 className="h-5 w-5 text-white/45" />}
                    label="Department"
                    value={department}
                    onChange={setDepartment}
                    placeholder="Enter your department"
                  />

                  <InputField
                    icon={
                      <GraduationCap className="h-5 w-5 text-white/45" />
                    }
                    label="Course"
                    value={course}
                    onChange={setCourse}
                    placeholder="Enter your course"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#CB1A29] via-[#CB1AC2] to-[#4C1ACB] px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(203,26,194,0.45)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {savingProfile ? "Saving..." : "Save Profile"}
                </button>
              </form>
            </section>

            <section className="space-y-6">
              <AnimatedContent
                delay={0.6}
                duration={0.9}
                distance={50}
                direction="vertical"
                scale={0.98}
              >
              <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl bg-purple-500/10 p-3">
                    <Mail className="h-5 w-5 text-purple-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Email</h2>
                    <p className="text-sm text-white/50">
                      Current Account Email
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">
                    Email Address
                  </label>

                  <div className="relative">
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                      <Mail className="h-5 w-5 text-white/45" />
                    </div>

                    <input
                      type="email"
                      value={email}
                      readOnly
                      className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white/70 outline-none"
                    />
                  </div>
                </div>
              </div>
              </AnimatedContent>

              <AnimatedContent
                delay={0.7}
                duration={0.9}
                distance={50}
                direction="vertical"
                scale={0.98}
              >
              <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl bg-pink-500/10 p-3">
                    <Lock className="h-5 w-5 text-pink-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Password</h2>
                    <p className="text-sm text-white/50">
                      Change your account password
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <InputField
                    icon={<Lock className="h-5 w-5 text-white/45" />}
                    label="New Password"
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="Enter new password"
                    type="password"
                  />

                  <InputField
                    icon={<Lock className="h-5 w-5 text-white/45" />}
                    label="Confirm Password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Confirm new password"
                    type="password"
                  />

                  <button
                    type="button"
                    onClick={handleUpdatePassword}
                    disabled={savingPassword}
                    className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-gradient-to-r hover:from-[#CB1A29] hover:via-[#CB1AC2] hover:to-[#4C1ACB] hover:shadow-[0_0_30px_rgba(203,26,194,0.45)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingPassword
                      ? "Updating Password..."
                      : "Update Password"}
                  </button>
                </div>
              </div>
              </AnimatedContent>
            </section>
          </div>
          </AnimatedContent>
        )}
      </div>
    </div>
  );
}

function InputField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-white/80">{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
          {icon}
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08]"
        />
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