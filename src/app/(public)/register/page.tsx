"use client";

import { FormEvent, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Mail,
  Lock,
  BookCheck,
  User,
  IdCard,
  Briefcase,
  ShieldCheck,
  CalendarDays,
  FlaskConical,
} from "lucide-react";
import BorderGlow from "@/components/BorderGlow";
import AnimatedContent from "@/components/AnimatedContent";

const Aurora = dynamic(() => import("@/components/Aurora"), {
  ssr: false,
});

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");

    const trimmedName = fullName.trim();
    const trimmedId = idNumber.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedRole = role.trim().toLowerCase();

    if (
      !trimmedName ||
      !trimmedId ||
      !trimmedEmail ||
      !trimmedRole ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill in all fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!/^\d+$/.test(trimmedId)) {
      setError("ID number must contain numbers only.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              name: trimmedName,
              role: trimmedRole,
              id_number: trimmedId,
            },
          },
        });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const user = signUpData.user;

      if (!user) {
        setError("User creation failed.");
        return;
      }

      const commonUserData = {
        id: user.id,
        name: trimmedName,
        email: trimmedEmail,
        role: trimmedRole,
        id_number: trimmedId,
        is_admin: false,
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert([commonUserData], { onConflict: "id" });

      if (profileError) {
        setError(`Profiles table error: ${profileError.message}`);
        return;
      }

      const { error: usersError } = await supabase
        .from("users")
        .upsert([commonUserData], { onConflict: "id" });

      if (usersError) {
        setError(`Users table error: ${usersError.message}`);
        return;
      }

      setSuccess("Account created successfully! Redirecting to login...");

      setFullName("");
      setIdNumber("");
      setRole("student");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      await supabase.auth.signOut();

      setTimeout(() => {
        router.replace("/login");
      }, 1500);
    } catch (err) {
      console.error("Register error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <AuroraBackground />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl items-center px-4 py-6 sm:px-6 lg:px-8">
        <AnimatedContent
          distance={80}
          duration={1}
          delay={0.30}
          direction="vertical"
          reverse={false}
          scale={0.95}
        >
        <BorderGlow
          borderRadius={28}
          glowRadius={30}
          glowIntensity={1.4}
          edgeSensitivity={12}
          coneSpread={30}
          fillOpacity={0.5}
          colors={["#22d3ee", "#6366f1", "#a855f7"]}
          className="w-full"
        >
          <div className="grid overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05] shadow-[0_10px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl lg:grid-cols-[0.9fr_1fr]">
            <div className="border-b border-white/10 p-5 sm:p-6 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                  <BookCheck className="h-6 w-6 text-white" />
                </div>

                <div>
                  <p className="text-xs text-cyan-300">
                    Laboratory Booking System
                  </p>
                  <h1 className="mt-1 text-xl font-bold sm:text-2xl">
                    Create account
                  </h1>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-white/60">
                Access schedules, request bookings, and manage your
                reservations in one place.
              </p>

              <div className="mt-6 space-y-3">
                <InfoCard
                  icon={<CalendarDays className="h-4 w-4 text-cyan-300" />}
                  title="Simple booking"
                  text="Reserve labs easily"
                />

                <InfoCard
                  icon={<FlaskConical className="h-4 w-4 text-purple-300" />}
                  title="Check availability"
                  text="See available labs instantly"
                />

                <InfoCard
                  icon={<ShieldCheck className="h-4 w-4 text-emerald-300" />}
                  title="Secure access"
                  text="Manage your account safely"
                />
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold sm:text-xl">Register</h2>
                <p className="mt-1 text-xs text-white/55">
                  Fill in your details to create a new account.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-200">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200">
                    {success}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3.5">
                  <GlassInput
                    icon={<User size={18} className="text-white/50" />}
                    type="text"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(value) => {
                      setFullName(value);
                      if (error) setError("");
                    }}
                    disabled={loading}
                  />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <GlassInput
                      icon={<IdCard size={18} className="text-white/50" />}
                      type="text"
                      placeholder="ID Number"
                      value={idNumber}
                      onChange={(value) => {
                        setIdNumber(value);
                        if (error) setError("");
                      }}
                      disabled={loading}
                    />

                    <GlassSelect
                      icon={<Briefcase size={18} className="text-white/50" />}
                      value={role}
                      onChange={(value) => {
                        setRole(value);
                        if (error) setError("");
                      }}
                      disabled={loading}
                      options={[
                        { value: "student", label: "Student" },
                        { value: "faculty", label: "Faculty" },
                        { value: "staff", label: "Staff" },
                      ]}
                    />
                  </div>

                  <GlassInput
                    icon={<Mail size={18} className="text-white/50" />}
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(value) => {
                      setEmail(value);
                      if (error) setError("");
                    }}
                    disabled={loading}
                    autoComplete="email"
                  />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <GlassInput
                      icon={<Lock size={18} className="text-white/50" />}
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(value) => {
                        setPassword(value);
                        if (error) setError("");
                      }}
                      disabled={loading}
                      autoComplete="new-password"
                    />

                    <GlassInput
                      icon={<Lock size={18} className="text-white/50" />}
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(value) => {
                        setConfirmPassword(value);
                        if (error) setError("");
                      }}
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-32 w-full rounded-xl bg-gradient-to-r from-[#CB1A29] via-[#CB1AC2] to-[#4C1ACB] py-3 text-sm font-semibold text-white transition-all hover:shadow-[0_0_25px_rgba(203,26,194,0.45)] active:scale-95 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </form>

              <div className="mt-4 text-center text-xs text-white/70 sm:text-sm">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="font-medium text-cyan-300 transition hover:text-cyan-200 hover:underline"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        </BorderGlow>
        </AnimatedContent>
      </div>
    </div>
  );
}

function GlassInput({
  icon,
  type,
  placeholder,
  value,
  onChange,
  disabled,
  autoComplete,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
        {icon}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-2.5 pl-11 pr-4 text-sm font-medium text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}

function GlassSelect({
  icon,
  value,
  onChange,
  disabled,
  options,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2">
        {icon}
      </div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.05] py-2.5 pl-11 pr-10 text-sm font-medium text-white outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-slate-900 text-white"
          >
            {option.label}
          </option>
        ))}
      </select>

      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
        ▼
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/5">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-white/55">{text}</p>
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