"use client";

import { FormEvent, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, BookCheck } from "lucide-react";
import BorderGlow from "@/components/BorderGlow";
import AnimatedContent from "@/components/AnimatedContent";

const Aurora = dynamic(() => import("@/components/Aurora"), {
  ssr: false,
});

type ProfileAccessRow = {
  is_admin: boolean | null;
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();

      if (!trimmedEmail || !password) {
        setError("Please enter your email and password.");
        setLoading(false);
        return;
      }

      const {
        data: { user },
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (loginError) {
        setError(loginError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setError("Login failed. Please try again.");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      const accessRow = profile as ProfileAccessRow | null;

      if (accessRow?.is_admin) {
        router.replace("/admin");
        return;
      }

      router.replace("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-6 sm:px-6 sm:py-8">
      <AuroraBackground />

      <AnimatedContent
        distance={80}
        duration={1}
        delay={0.30}
        direction="vertical"
        reverse={false}
        scale={0.95}
        className="relative z-10 w-full max-w-[92vw] sm:max-w-md"
      >
        <BorderGlow
          borderRadius={24}
          glowRadius={32}
          glowIntensity={1.6}
          edgeSensitivity={14}
          coneSpread={32}
          fillOpacity={0.55}
          colors={["#22d3ee", "#6366f1", "#a855f7"]}
          className="w-full"
        >
          <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.05] shadow-[0_10px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="px-5 py-6 text-white sm:px-8 sm:py-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] sm:h-14 sm:w-14">
                <BookCheck className="h-6 w-6 text-white sm:h-8 sm:w-8" />
              </div>

              <h1 className="text-center text-xl font-semibold tracking-tight sm:text-2xl">
                PreciseBook
              </h1>

              <p className="mt-2 text-center text-xs font-light text-white/50 sm:text-sm">
                Sign in to book your preferred laboratories
              </p>
            </div>

            <div className="p-5 sm:p-8">
              <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                {error && (
                  <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <div className="relative">
                  <Mail
                    size={20}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/50 sm:size-[22px]"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    disabled={loading}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm font-medium text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60 sm:pl-12"
                  />
                </div>

                <div className="relative">
                  <Lock
                    size={20}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/50 sm:size-[22px]"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    disabled={loading}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm font-medium text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60 sm:pl-12"
                  />
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => router.push("/forgotpassword")}
                    className="text-xs font-medium text-cyan-300 transition hover:text-cyan-200 hover:underline sm:text-sm"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-[#CB1A29] via-[#CB1AC2] to-[#4C1ACB] py-3 text-sm font-semibold tracking-wide text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(203,26,194,0.45)] active:scale-95 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>

              <div className="mt-5 text-center text-xs text-white/70 sm:mt-6 sm:text-sm">
                Don’t have an account?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/register")}
                  className="font-medium text-cyan-300 transition hover:text-cyan-200 hover:underline"
                >
                  Register
                </button>
              </div>
            </div>
          </div>
        </BorderGlow>
      </AnimatedContent>
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