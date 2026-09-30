"use client";

import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);
  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");

  const passwordChecks = useMemo(
    () => ({
      length: password.length >= 8,
      match:
        confirmPassword.length > 0 &&
        password === confirmPassword,
    }),
    [password, confirmPassword]
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            password,
          }),
        }
      );

      if (!data.success) {
        throw new Error(
          data.message || "Registration failed."
        );
      }

      window.location.href = "/login";
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to create your account."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F6F8] px-5 py-8 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1180px] items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-[#E7E7EA] bg-white shadow-[0_20px_70px_rgba(17,24,39,0.06)] lg:grid-cols-[0.98fr_1.02fr]">

          {/* =====================================================
              LEFT PANEL
          ===================================================== */}

          <section className="relative hidden overflow-hidden bg-[#111111] p-10 text-white lg:flex lg:min-h-[760px] lg:flex-col lg:justify-between xl:p-14">

            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/[0.05] blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/[0.04] blur-3xl" />

            <div className="relative">

              <Link
                href="/"
                className="inline-flex items-center gap-3"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/10 bg-white text-[13px] font-bold text-[#111111]">
                  CC
                </div>

                <span className="text-[18px] font-semibold tracking-[-0.02em]">
                  ConsumerConnect
                </span>
              </Link>

              <div className="mt-24 max-w-[430px]">

                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/80">
                  <Sparkles size={14} />
                  Join the consumer community.
                </div>

                <h2 className="text-[42px] font-semibold leading-[1.05] tracking-[-0.04em] xl:text-[50px]">
                  One place for
                  <span className="block text-white/45">
                    every consumer issue.
                  </span>
                </h2>

                <p className="mt-6 max-w-[390px] text-[15px] leading-7 text-white/55">
                  Create issues, connect with your
                  community, hear from companies and
                  track everything from one account.
                </p>

              </div>
            </div>

            <div className="relative">

              <p className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-white/35">
                Built for transparency
              </p>

              <div className="space-y-3">

                <div className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.05] p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-white/10">
                    <Check size={16} />
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      Track issues in one place
                    </p>

                    <p className="mt-0.5 text-xs text-white/40">
                      Follow responses, comments and status.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.05] p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-white/10">
                    <ShieldCheck size={16} />
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      Keep your account secure
                    </p>

                    <p className="mt-0.5 text-xs text-white/40">
                      Your account keeps your activity organized.
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </section>

          {/* =====================================================
              RIGHT PANEL
          ===================================================== */}

          <section className="flex min-h-[760px] items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16">

            <div className="w-full max-w-[430px]">

              {/* Mobile brand */}
              <div className="mb-10 lg:hidden">

                <Link
                  href="/"
                  className="inline-flex items-center gap-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#111111] text-[12px] font-bold text-white">
                    CC
                  </div>

                  <span className="text-[17px] font-semibold tracking-[-0.02em] text-[#111827]">
                    ConsumerConnect
                  </span>
                </Link>

              </div>

              {/* Header */}
              <div>

                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-[15px] bg-[#F3F3F5] text-[#111827]">
                  <Sparkles size={21} />
                </div>

                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
                  Get started
                </p>

                <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.035em] text-[#111827]">
                  Create your account
                </h1>

                <p className="mt-3 max-w-[390px] text-sm leading-6 text-[#9CA3AF]">
                  Join ConsumerConnect and make your
                  consumer voice part of the conversation.
                </p>

              </div>

              {/* Error */}
              {error && (
                <div className="mt-6 rounded-[15px] border border-red-100 bg-red-50 px-4 py-3.5 text-sm leading-5 text-red-600">
                  {error}
                </div>
              )}

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className="mt-8 space-y-5"
              >

                {/* Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="text-sm font-medium text-[#374151]"
                  >
                    Full name
                  </label>

                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    placeholder="Your name"
                    autoComplete="name"
                    required
                    className="mt-2 h-13 w-full rounded-[15px] border border-[#E5E7EB] bg-[#FAFAFA] px-4 text-sm text-[#111827] outline-none transition-all placeholder:text-[#A1A1AA] hover:border-[#D9DADD] focus:border-[#111111] focus:bg-white focus:ring-4 focus:ring-[#111111]/5"
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-[#374151]"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="mt-2 h-13 w-full rounded-[15px] border border-[#E5E7EB] bg-[#FAFAFA] px-4 text-sm text-[#111827] outline-none transition-all placeholder:text-[#A1A1AA] hover:border-[#D9DADD] focus:border-[#111111] focus:bg-white focus:ring-4 focus:ring-[#111111]/5"
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-[#374151]"
                  >
                    Password
                  </label>

                  <div className="relative mt-2">

                    <input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      placeholder="Create a password"
                      autoComplete="new-password"
                      required
                      className="h-13 w-full rounded-[15px] border border-[#E5E7EB] bg-[#FAFAFA] px-4 pr-12 text-sm text-[#111827] outline-none transition-all placeholder:text-[#A1A1AA] hover:border-[#D9DADD] focus:border-[#111111] focus:bg-white focus:ring-4 focus:ring-[#111111]/5"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (current) => !current
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[10px] text-[#9CA3AF] transition hover:bg-[#F1F1F3] hover:text-[#111827]"
                    >
                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>

                  </div>

                  {/* Password requirement */}
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full ${
                        passwordChecks.length
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-[#F1F1F3] text-[#B0B3B8]"
                      }`}
                    >
                      <Check size={10} />
                    </span>

                    <span
                      className={
                        passwordChecks.length
                          ? "text-emerald-600"
                          : "text-[#9CA3AF]"
                      }
                    >
                      At least 8 characters
                    </span>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium text-[#374151]"
                  >
                    Confirm password
                  </label>

                  <div className="relative mt-2">

                    <input
                      id="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(
                          event.target.value
                        )
                      }
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      required
                      className="h-13 w-full rounded-[15px] border border-[#E5E7EB] bg-[#FAFAFA] px-4 pr-12 text-sm text-[#111827] outline-none transition-all placeholder:text-[#A1A1AA] hover:border-[#D9DADD] focus:border-[#111111] focus:bg-white focus:ring-4 focus:ring-[#111111]/5"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (current) => !current
                        )
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[10px] text-[#9CA3AF] transition hover:bg-[#F1F1F3] hover:text-[#111827]"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>

                  </div>

                  {confirmPassword.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-xs">

                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full ${
                          passwordChecks.match
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-red-100 text-red-500"
                        }`}
                      >
                        <Check size={10} />
                      </span>

                      <span
                        className={
                          passwordChecks.match
                            ? "text-emerald-600"
                            : "text-red-500"
                        }
                      >
                        {passwordChecks.match
                          ? "Passwords match"
                          : "Passwords do not match"}
                      </span>

                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group flex h-13 w-full items-center justify-center gap-2 rounded-[15px] bg-[#111111] text-sm font-semibold text-white shadow-[0_8px_20px_rgba(17,17,17,0.12)] transition-all hover:bg-[#242424] hover:shadow-[0_10px_25px_rgba(17,17,17,0.16)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight
                        size={17}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </>
                  )}
                </button>

              </form>

              {/* Login */}
              <div className="mt-8 border-t border-[#EEEEF0] pt-7">

                <p className="text-center text-sm text-[#9CA3AF]">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-[#111827] underline decoration-[#D4D4D8] underline-offset-4 transition hover:decoration-[#111827]"
                  >
                    Sign in
                  </Link>
                </p>

              </div>

              <p className="mt-8 text-center text-[11px] leading-5 text-[#B0B3B8]">
                Create an account to participate in
                ConsumerConnect's consumer community.
              </p>

            </div>

          </section>

        </div>
      </div>
    </main>
  );
}