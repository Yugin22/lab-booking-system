"use client";

import { FormEvent, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Mail, ArrowLeft, KeyRound, BookCheck } from "lucide-react";
import BorderGlow from "@/components/BorderGlow";

const Aurora = dynamic(() => import("@/components/Aurora"), {
  ssr: false,
});

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleForgotPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();

      if (!trimmedEmail) {
        setError("Please enter your email address.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/resetpassword`,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setSuccess("Password reset link has been sent to your email.");
      setEmail("");
      setLoading(false);
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-6 sm:px-6 sm:py-8">
      <AuroraBackground />

      <BorderGlow
        borderRadius={24}
        glowRadius={46}
        glowIntensity={2.8}
        edgeSensitivity={18}
        coneSpread={38}
        fillOpacity={0.9}
        colors={["#22d3ee", "#6366f1", "#a855f7"]}
        className="relative z-10 w-full max-w-[92vw] sm:max-w-md"
      >
        <div className="relative overflow-hidden rounded-[24px] border border-white/20 bg-white/[0.08] shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          <div className="border-b border-white/10 bg-white/5 px-5 py-6 text-white sm:px-8 sm:py-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 backdrop-blur-md sm:h-14 sm:w-14">
              <BookCheck className="h-6 w-6 text-white sm:h-8 sm:w-8" />
            </div>

            <h1 className="text-center text-xl font-semibold tracking-tight sm:text-2xl">
              Forgot Password
            </h1>

            <p className="mt-2 text-center text-xs font-light text-white/50 sm:text-sm">
              Enter your email to receive a password reset link
            </p>
          </div>

          <div className="p-5 sm:p-8">
            <form onSubmit={handleForgotPassword} className="space-y-4 sm:space-y-5">
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
                    if (success) setSuccess("");
                  }}
                  disabled={loading}
                  className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pl-11 pr-4 text-sm font-medium text-white placeholder:text-white/45 outline-none transition focus:border-cyan-400 focus:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60 sm:pl-12"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 py-3 text-sm font-semibold tracking-wide text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.85)] active:scale-95 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
              >
                <KeyRound className="h-4 w-4" />
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>

            <div className="mt-5 text-center text-xs text-white/70 sm:mt-6 sm:text-sm">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="inline-flex items-center gap-2 font-medium text-cyan-300 transition hover:text-cyan-200 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </BorderGlow>
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