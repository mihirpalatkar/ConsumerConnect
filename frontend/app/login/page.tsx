"use client";

import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import Link from "next/link";
import {
  FormEvent,
  useState,
} from "react";

import { apiRequest } from "@/lib/api";

type LoginRole =
  | "Consumer"
  | "Company"
  | "Admin";


/* ============================================================
   JWT HELPERS
============================================================ */

function decodeTokenPayload(
  token: string
): any | null {
  try {
    const parts =
      token.split(".");

    if (
      parts.length !== 3
    ) {
      return null;
    }

    const payload =
      parts[1];

    const normalized =
      payload
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const padded =
      normalized +
      "=".repeat(
        (4 -
          (normalized.length % 4)) %
          4
      );

    const decoded =
      JSON.parse(
        window.atob(padded)
      );

    return decoded;
  } catch (error) {
    console.error(
      "Unable to decode login token:",
      error
    );

    return null;
  }
}


/* ============================================================
   READ ROLE
============================================================ */

function getRoleFromToken(
  token: string
): LoginRole {
  const decoded =
    decodeTokenPayload(token);

  if (!decoded) {
    return "Consumer";
  }

  const role =
    String(
      decoded?.role || ""
    )
      .trim()
      .toLowerCase();

  /*
   * Some company JWTs identify the account
   * through the subject instead of a role field.
   *
   * Example:
   * sub = "company:2"
   */
  const subject =
    String(
      decoded?.sub || ""
    ).trim();

  if (
    subject.startsWith(
      "company:"
    )
  ) {
    return "Company";
  }

  if (
    role === "admin"
  ) {
    return "Admin";
  }

  if (
    role === "company"
  ) {
    return "Company";
  }

  return "Consumer";
}


/* ============================================================
   READ COMPANY ID
============================================================ */

function getCompanyIdFromToken(
  token: string
): number | null {
  const decoded =
    decodeTokenPayload(token);

  if (!decoded) {
    return null;
  }

  const subject =
    String(
      decoded?.sub || ""
    ).trim();

  if (
    !subject.startsWith(
      "company:"
    )
  ) {
    return null;
  }

  const rawId =
    subject.split(
      ":",
      2
    )[1];

  const id =
    Number(rawId);

  if (
    !Number.isFinite(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}


/* ============================================================
   LOGIN PAGE
============================================================ */

export default function LoginPage() {
  const [role, setRole] =
    useState<LoginRole>(
      "Consumer"
    );

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  /* ==========================================================
     LOGIN
  ========================================================== */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanEmail =
      email.trim();

    if (
      !cleanEmail ||
      !password
    ) {
      setError(
        "Please enter your email and password."
      );

      return;
    }

    setLoading(true);

    try {
      const endpoint =
        role === "Company"
          ? "/api/company/login"
          : "/api/auth/login";

      const data =
        await apiRequest(
          endpoint,
          {
            method: "POST",
            body: JSON.stringify({
              email:
                cleanEmail,
              password,
            }),
          }
        );

      if (
        !data?.success ||
        !data?.access_token
      ) {
        throw new Error(
          data?.message ||
            "Unable to sign in."
        );
      }

      const token =
        data.access_token;

      /*
       * The backend is the authority on the
       * actual account role.
       */
      const actualRole =
        getRoleFromToken(
          token
        );

      /*
       * Prevent selecting Company/Admin/Consumer
       * while attempting to use another account type.
       */
      if (
        actualRole !== role
      ) {
        throw new Error(
          `This account is registered as a ${actualRole}. Please select "${actualRole}" and sign in again.`
        );
      }


      /* --------------------------------------------------------
         SAVE ACCESS TOKEN
      -------------------------------------------------------- */

      localStorage.setItem(
        "access_token",
        token
      );


      /* --------------------------------------------------------
         SAVE COMPANY SESSION DATA
      -------------------------------------------------------- */

      if (
        actualRole === "Company"
      ) {
        const responseCompany =
          data?.company &&
          typeof data.company ===
            "object"
            ? data.company
            : {};

        const tokenCompanyId =
          getCompanyIdFromToken(
            token
          );

        const responseCompanyId =
          Number(
            responseCompany?.id ??
              data?.company_id ??
              0
          );

        const companyId =
          Number.isFinite(
            responseCompanyId
          ) &&
          responseCompanyId > 0
            ? responseCompanyId
            : tokenCompanyId;

        const companyName =
          String(
            responseCompany?.name ??
              data?.company_name ??
              data?.name ??
              cleanEmail
          ).trim();

        const companyEmail =
          String(
            responseCompany?.email ??
              data?.email ??
              cleanEmail
          ).trim();

        localStorage.setItem(
          "company",
          JSON.stringify({
            id:
              companyId ?? 0,
            name:
              companyName ||
              cleanEmail,
            email:
              companyEmail ||
              cleanEmail,
          })
        );

        window.location.href =
          "/company/dashboard";

        return;
      }


      /* --------------------------------------------------------
         ADMIN
      -------------------------------------------------------- */

      if (
        actualRole === "Admin"
      ) {
        window.location.href =
          "/admin/dashboard";

        return;
      }


      /* --------------------------------------------------------
         CONSUMER
      -------------------------------------------------------- */

      window.location.href =
        "/";
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }


  /* ============================================================
     UI
  ============================================================ */

  return (
    <main className="min-h-screen bg-[#F6F6F8] px-5 py-8 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1180px] items-center justify-center">

        <div className="grid w-full overflow-hidden rounded-[32px] border border-[#E7E7EA] bg-white shadow-[0_20px_70px_rgba(17,24,39,0.06)] lg:grid-cols-[1.02fr_0.98fr]">

          {/* =====================================================
              LEFT PANEL
          ===================================================== */}

          <section className="relative hidden overflow-hidden bg-[#111111] p-10 text-white lg:flex lg:min-h-[700px] lg:flex-col lg:justify-between xl:p-14">

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


              <div className="mt-28 max-w-[430px]">

                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/80">

                  <Sparkles size={14} />

                  {role === "Consumer"
                    ? "Your consumer voice, connected."
                    : role === "Company"
                    ? "Company portal."
                    : "Platform administration."
                  }

                </div>


                <h2 className="text-[42px] font-semibold leading-[1.05] tracking-[-0.04em] xl:text-[50px]">

                  {role === "Consumer" ? (
                    <>
                      Turn consumer
                      <span className="block text-white/45">
                        problems into action.
                      </span>
                    </>
                  ) : role === "Company" ? (
                    <>
                      Respond to
                      <span className="block text-white/45">
                        your customers.
                      </span>
                    </>
                  ) : (
                    <>
                      Keep the platform
                      <span className="block text-white/45">
                        trusted and organized.
                      </span>
                    </>
                  )}

                </h2>


                <p className="mt-6 max-w-[390px] text-[15px] leading-7 text-white/55">

                  {role === "Consumer"
                    ? "Track complaints, hear from companies, and connect with people facing the same problems."
                    : role === "Company"
                    ? "Manage complaints, respond officially, update issue statuses, and participate in the community."
                    : "Monitor complaints, manage companies and users, moderate community activity, and oversee platform operations."
                  }

                </p>

              </div>

            </div>


            <div className="relative grid max-w-[500px] grid-cols-2 gap-3">

              <div className="rounded-[20px] border border-white/10 bg-white/[0.05] p-5">

                <ShieldCheck
                  size={19}
                  className="text-white/75"
                />

                <p className="mt-4 text-sm font-medium">
                  Verified activity
                </p>

                <p className="mt-1 text-xs leading-5 text-white/40">
                  Keep every issue, response and update connected.
                </p>

              </div>


              <div className="rounded-[20px] border border-white/10 bg-white/[0.05] p-5">

                {role === "Consumer" ? (
                  <Sparkles
                    size={19}
                    className="text-white/75"
                  />
                ) : role === "Company" ? (
                  <Building2
                    size={19}
                    className="text-white/75"
                  />
                ) : (
                  <ShieldCheck
                    size={19}
                    className="text-white/75"
                  />
                )}

                <p className="mt-4 text-sm font-medium">

                  {role === "Consumer"
                    ? "AI-powered insights"
                    : role === "Company"
                    ? "Direct responses"
                    : "Platform controls"
                  }

                </p>

                <p className="mt-1 text-xs leading-5 text-white/40">

                  {role === "Consumer"
                    ? "Get smarter issue analysis and duplicate detection."
                    : role === "Company"
                    ? "Keep customers updated with official company responses."
                    : "Manage and monitor the ConsumerConnect platform."
                  }

                </p>

              </div>

            </div>

          </section>


          {/* =====================================================
              RIGHT PANEL
          ===================================================== */}

          <section className="flex min-h-[700px] items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16">

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

                  {role === "Consumer" ? (
                    <UserRound size={21} />
                  ) : role === "Company" ? (
                    <Building2 size={21} />
                  ) : (
                    <ShieldCheck size={21} />
                  )}

                </div>


                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
                  Welcome back
                </p>


                <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.035em] text-[#111827]">
                  Sign in to your account
                </h1>


                <p className="mt-3 max-w-[390px] text-sm leading-6 text-[#9CA3AF]">
                  Choose your account type and
                  sign in to ConsumerConnect.
                </p>

              </div>


              {/* =================================================
                  ROLE SELECTOR
              ================================================= */}

              <div className="mt-7">

                <p className="mb-2.5 text-sm font-medium text-[#374151]">
                  Sign in as
                </p>


                <div className="grid grid-cols-3 gap-2 rounded-[16px] bg-[#F5F5F7] p-1">

                  <button
                    type="button"
                    onClick={() =>
                      setRole(
                        "Consumer"
                      )
                    }
                    className={`flex h-11 items-center justify-center gap-1.5 rounded-[12px] text-xs font-semibold transition ${
                      role === "Consumer"
                        ? "bg-white text-[#111827] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                        : "text-[#8B8D93] hover:text-[#374151]"
                    }`}
                  >

                    <UserRound
                      size={15}
                    />

                    Consumer

                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      setRole(
                        "Company"
                      )
                    }
                    className={`flex h-11 items-center justify-center gap-1.5 rounded-[12px] text-xs font-semibold transition ${
                      role === "Company"
                        ? "bg-white text-[#111827] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                        : "text-[#8B8D93] hover:text-[#374151]"
                    }`}
                  >

                    <Building2
                      size={15}
                    />

                    Company

                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      setRole(
                        "Admin"
                      )
                    }
                    className={`flex h-11 items-center justify-center gap-1.5 rounded-[12px] text-xs font-semibold transition ${
                      role === "Admin"
                        ? "bg-white text-[#111827] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                        : "text-[#8B8D93] hover:text-[#374151]"
                    }`}
                  >

                    <ShieldCheck
                      size={15}
                    />

                    Admin

                  </button>

                </div>

              </div>


              {/* Error */}

              {error && (
                <div className="mt-6 rounded-[15px] border border-red-100 bg-red-50 px-4 py-3.5 text-sm leading-5 text-red-600">
                  {error}
                </div>
              )}


              {/* Form */}

              <form
                onSubmit={
                  handleSubmit
                }
                className="mt-8 space-y-5"
              >

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
                    onChange={(
                      event
                    ) =>
                      setEmail(
                        event.target
                          .value
                      )
                    }
                    placeholder={
                      role ===
                      "Company"
                        ? "company@example.com"
                        : "you@example.com"
                    }
                    autoComplete="email"
                    required
                    className="mt-2 h-13 w-full rounded-[15px] border border-[#E5E7EB] bg-[#FAFAFA] px-4 text-sm text-[#111827] outline-none transition-all placeholder:text-[#A1A1AA] hover:border-[#D9DADD] focus:border-[#111111] focus:bg-white focus:ring-4 focus:ring-[#111111]/5"
                  />

                </div>


                {/* Password */}

                <div>

                  <div className="flex items-center justify-between">

                    <label
                      htmlFor="password"
                      className="text-sm font-medium text-[#374151]"
                    >
                      Password
                    </label>

                  </div>


                  <div className="relative mt-2">

                    <input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        password
                      }
                      onChange={(
                        event
                      ) =>
                        setPassword(
                          event.target
                            .value
                        )
                      }
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      className="h-13 w-full rounded-[15px] border border-[#E5E7EB] bg-[#FAFAFA] px-4 pr-12 text-sm text-[#111827] outline-none transition-all placeholder:text-[#A1A1AA] hover:border-[#D9DADD] focus:border-[#111111] focus:bg-white focus:ring-4 focus:ring-[#111111]/5"
                    />


                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (
                            current
                          ) =>
                            !current
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
                        <EyeOff
                          size={17}
                        />
                      ) : (
                        <Eye
                          size={17}
                        />
                      )}

                    </button>

                  </div>

                </div>


                {/* Submit */}

                <button
                  type="submit"
                  disabled={
                    loading
                  }
                  className="group flex h-13 w-full items-center justify-center gap-2 rounded-[15px] bg-[#111111] text-sm font-semibold text-white shadow-[0_8px_20px_rgba(17,17,17,0.12)] transition-all hover:bg-[#242424] hover:shadow-[0_10px_25px_rgba(17,17,17,0.16)] disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {loading ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />

                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in

                      <ArrowRight
                        size={17}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </>
                  )}

                </button>

              </form>


              {/* Register */}

              {role ===
                "Consumer" && (
                <div className="mt-8 border-t border-[#EEEEF0] pt-7">

                  <p className="text-center text-sm text-[#9CA3AF]">

                    New to ConsumerConnect?{" "}

                    <Link
                      href="/register"
                      className="font-semibold text-[#111827] underline decoration-[#D4D4D8] underline-offset-4 transition hover:decoration-[#111827]"
                    >
                      Create an account
                    </Link>

                  </p>

                </div>
              )}


              {role ===
                "Company" && (
                <div className="mt-8 border-t border-[#EEEEF0] pt-7">

                  <p className="text-center text-sm text-[#9CA3AF]">

                    Need a company account?{" "}

                    <Link
                      href="/company/register"
                      className="font-semibold text-[#111827] underline decoration-[#D4D4D8] underline-offset-4 transition hover:decoration-[#111827]"
                    >
                      Register company
                    </Link>

                  </p>

                </div>
              )}


              {role ===
                "Admin" && (
                <div className="mt-8 border-t border-[#EEEEF0] pt-7">

                  <p className="text-center text-xs leading-5 text-[#9CA3AF]">
                    Administrative access is restricted
                    to authorized ConsumerConnect administrators.
                  </p>

                </div>
              )}


              <p className="mt-8 text-center text-[11px] leading-5 text-[#B0B3B8]">
                By continuing, you agree to use
                ConsumerConnect responsibly.
              </p>

            </div>

          </section>

        </div>

      </div>
    </main>
  );
}