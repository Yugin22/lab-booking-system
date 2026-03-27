"use client";

import { FormEvent, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, ArrowLeft, CheckCircle2, BookCheck } from "lucide-react";
import BorderGlow from "@/components/BorderGlow";
import AnimatedContent from "@/components/AnimatedContent";

const Aurora = dynamic(() => import("@/components/Aurora"), {
  ssr: false,
});

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [validLink, setValidLink] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const checkRecoverySession = async () => {
      try {
        const hash = window.location.hash;
        const search = new URLSearchParams(hash.replace("#", ""));
        const accessToken = search.get("access_token");
        const refreshToken = search.get("refresh_token");
        const type = search.get("type");

        if (type === "recovery" && accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            setError("Invalid or expired reset link.");
            setValidLink(false);
          } else {
            setValidLink(true);
          }
        } else {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            setValidLink(true);
          } else {
            setError("Invalid or expired reset link.");
            setValidLink(false);
          }
        }
      } catch (err) {
        console.error("Recovery session error:", err);
        setError("Unable to verify reset link.");
        setValidLink(false);
      } finally {
        setCheckingLink(false);
      }
    };

    checkRecoverySession();
  }, []);

  const handleUpdatePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");

    if (!password || !confirmPassword) {
      setError("Please fill in both password fields.");
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
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setSuccess("Password updated successfully. Redirecting to login...");

      setTimeout(async () => {
        await supabase.auth.signOut();
        router.replace("/login");
      }, 2000);
    } catch (err) {
      console.error("Update password error:", err);
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
        delay={0.3}
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
                Reset Password
              </h1>

              <p className="mt-2 text-center text-xs font-light text-white/50 sm:text-sm">
                Create your new password
              </p>
            </div>

            <div className="p-5 sm:p-8">
              {checkingLink ? (
                <div className="text-center text-sm text-white/70">
                  Verifying reset link...
                </div>
              ) : !validLink ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error || "Invalid or expired reset link."}
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push("/forgotpassword")}
                    className="w-full rounded-xl bg-gradient-to-r from-[#CB1A29] via-[#CB1AC2] to-[#4C1ACB] py-3 text-sm font-semibold tracking-wide text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(203,26,194,0.45)] active:scale-95 active:shadow-none"
                  >
                    Request New Reset Link
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleUpdatePassword}
                  className="space-y-4 sm:space-y-5"
                >
                  {error && (
                    <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                      <CheckCircle2 className="h-4 w-4" />
                      {success}
                    </div>
                  )}

                  <div className="relative">
                    <Lock
                      size={20}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/50 sm:size-[22px]"
                    />
                    <input
                      type="password"
                      placeholder="New Password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
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
                      placeholder="Confirm New Password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError("");
                      }}
                      disabled={loading}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm font-medium text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-cyan-400/70 focus:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60 sm:pl-12"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-[#CB1A29] via-[#CB1AC2] to-[#4C1ACB] py-3 text-sm font-semibold tracking-wide text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(203,26,194,0.45)] active:scale-95 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
                  >
                    {loading ? "Updating..." : "Update Password"}
                  </button>

                  <div className="text-center text-xs text-white/70 sm:text-sm">
                    <button
                      type="button"
                      onClick={() => router.push("/login")}
                      className="inline-flex items-center gap-2 font-medium text-cyan-300 transition hover:text-cyan-200 hover:underline"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Login
                    </button>
                  </div>
                </form>
              )}
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