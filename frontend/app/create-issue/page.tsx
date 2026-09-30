"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  Loader2,
  Send,
  Tag,
  UploadCloud,
  X,
} from "lucide-react";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:5000";

interface DuplicateIssue {
  id: number;
  title: string;
  similarity: number;
  description?: string;
  company?: string;
  category?: string | null;
  status?: string;
  severity?: string | null;
  created_at?: string;
}

function formatDate(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusClasses(status?: string) {
  switch (status?.toLowerCase()) {
    case "resolved":
      return "bg-emerald-50 text-emerald-700";

    case "closed":
      return "bg-gray-100 text-gray-700";

    case "in progress":
      return "bg-blue-50 text-blue-700";

    default:
      return "bg-amber-50 text-amber-700";
  }
}

function truncateText(
  value: string | undefined,
  maxLength: number
) {
  if (!value) {
    return "";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

export default function CreateIssuePage() {
  const router = useRouter();

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const duplicateSectionRef =
    useRef<HTMLDivElement | null>(null);

  const [company, setCompany] =
    useState("");

  const [title, setTitle] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [image, setImage] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [duplicateIssue, setDuplicateIssue] =
    useState<DuplicateIssue | null>(null);

  const [duplicateLoading, setDuplicateLoading] =
    useState(false);

  const [duplicateOpenLoading, setDuplicateOpenLoading] =
    useState(false);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  useEffect(() => {
    if (!duplicateIssue) {
      return;
    }

    const timer = window.setTimeout(() => {
      duplicateSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);

    return () => {
      window.clearTimeout(timer);
    };
  }, [duplicateIssue]);

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Please upload a PNG, JPG, or JPEG image."
      );
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Image size must be 5 MB or less."
      );
      event.target.value = "";
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setError("");
    setDuplicateIssue(null);
    setImage(file);
    setImagePreview(
      URL.createObjectURL(file)
    );
  }

  function removeImage() {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImage(null);
    setImagePreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function resetForm() {
    setCompany("");
    setTitle("");
    setCategory("");
    setDescription("");
    setError("");
    setSuccess("");
    setDuplicateIssue(null);
    removeImage();
  }

  async function loadDuplicateIssue(
    duplicateData: {
      id?: number | string;
      title?: string;
      similarity?: number | string;
    } | null
  ) {
    if (!duplicateData?.id) {
      setError(
        "A similar issue was found, but its details could not be loaded."
      );
      return;
    }

    const duplicateId =
      Number(duplicateData.id);

    if (
      !Number.isFinite(duplicateId) ||
      duplicateId <= 0
    ) {
      setError(
        "The similar issue has an invalid ID."
      );
      return;
    }

    setDuplicateIssue({
      id: duplicateId,
      title:
        duplicateData.title ||
        "Similar existing issue",
      similarity:
        Number(
          duplicateData.similarity ?? 0
        ),
    });

    const token =
      localStorage.getItem(
        "access_token"
      );

    if (!token) {
      return;
    }

    try {
      setDuplicateLoading(true);

      const response = await fetch(
        `${API_URL}/api/issues/${duplicateId}`,
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      let data: any = {};

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        data =
          await response.json();
      } else {
        await response.text();
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to load the similar issue."
        );
      }

      const issue =
        data?.data ??
        data?.issue ??
        null;

      if (!issue) {
        return;
      }

      setDuplicateIssue({
        id: Number(
          issue.id ?? duplicateId
        ),
        title:
          issue.title ||
          duplicateData.title ||
          "Similar existing issue",
        similarity:
          Number(
            duplicateData.similarity ?? 0
          ),
        description:
          issue.description || "",
        company:
          issue.company || "",
        category:
          issue.category ?? null,
        status:
          issue.status || "Open",
        severity:
          issue.severity ?? null,
        created_at:
          issue.created_at || undefined,
      });
    } catch (loadError) {
      console.error(
        "Duplicate issue loading error:",
        loadError
      );
    } finally {
      setDuplicateLoading(false);
    }
  }

  async function openDuplicateIssue() {
    if (!duplicateIssue?.id) {
      return;
    }

    const token =
      localStorage.getItem(
        "access_token"
      );

    if (!token) {
      setError(
        "Your session has expired. Please log in again."
      );
      return;
    }

    try {
      setDuplicateOpenLoading(true);
      setError("");

      /*
       * Save the exact issue ID.
       * The dashboard will read this after redirect.
       */
      localStorage.setItem(
        "cc_open_issue_id",
        String(duplicateIssue.id)
      );

      router.replace("/");
    } catch (openError) {
      console.error(
        "Duplicate issue navigation error:",
        openError
      );

      setError(
        openError instanceof Error
          ? openError.message
          : "Unable to open the existing issue."
      );

      setDuplicateOpenLoading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setSuccess("");
    setDuplicateIssue(null);

    const token =
      localStorage.getItem(
        "access_token"
      );

    if (!token) {
      setError(
        "Your session has expired. Please log in again."
      );
      return;
    }

    const cleanCompany =
      company.trim();

    const cleanTitle =
      title.trim();

    const cleanDescription =
      description.trim();

    const cleanCategory =
      category.trim();

    if (!cleanCompany) {
      setError(
        "Please enter the company name."
      );
      return;
    }

    if (!cleanTitle) {
      setError(
        "Please enter an issue title."
      );
      return;
    }

    if (!cleanDescription) {
      setError(
        "Please describe your issue."
      );
      return;
    }

    if (cleanTitle.length > 160) {
      setError(
        "Issue title must be 160 characters or less."
      );
      return;
    }

    if (cleanDescription.length > 5000) {
      setError(
        "Issue description must be 5000 characters or less."
      );
      return;
    }

    setLoading(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "company",
        cleanCompany
      );

      formData.append(
        "title",
        cleanTitle
      );

      formData.append(
        "description",
        cleanDescription
      );

      if (cleanCategory) {
        formData.append(
          "category",
          cleanCategory
        );
      }

      if (image) {
        formData.append(
          "image",
          image
        );
      }

      const response = await fetch(
        `${API_URL}/api/issues`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
          body: formData,
        }
      );

      let data: any = {};

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        data =
          await response.json();
      } else {
        const text =
          await response.text();

        data = {
          message: text,
        };
      }

      if (
        response.status === 401 ||
        response.status === 422
      ) {
        localStorage.removeItem(
          "access_token"
        );

        localStorage.removeItem(
          "refresh_token"
        );

        setError(
          "Your session has expired. Please log in again."
        );

        return;
      }

      /*
       * DUPLICATE
       *
       * Stay on Create Issue page.
       * Do not redirect.
       */
      if (
        response.status === 409 ||
        data?.duplicate_found === true
      ) {
        const duplicateData =
          data?.duplicate_issue ??
          null;

        if (duplicateData?.id) {
          await loadDuplicateIssue(
            duplicateData
          );
        } else {
          setError(
            data?.message ||
              "A similar issue already exists."
          );
        }

        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            `Unable to create issue (${response.status}).`
        );
      }

      const createdIssueId =
        Number(
          data?.issue?.id ??
            data?.data?.id ??
            0
        );

      if (
        data?.success === true &&
        createdIssueId > 0
      ) {
        setSuccess(
          "Issue created successfully. Redirecting to your dashboard..."
        );

        window.setTimeout(() => {
          router.replace("/");
          router.refresh();
        }, 700);

        return;
      }

      if (createdIssueId > 0) {
        setSuccess(
          "Issue created successfully. Redirecting to your dashboard..."
        );

        window.setTimeout(() => {
          router.replace("/");
          router.refresh();
        }, 700);

        return;
      }

      throw new Error(
        data?.message ||
          "The issue could not be created."
      );
    } catch (submitError) {
      console.error(
        "Create issue error:",
        submitError
      );

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong while creating the issue."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F5F7]">

      <header className="border-b border-[#E7E7EA] bg-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-4 lg:px-8">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-sm font-medium text-[#6B7280] transition hover:text-[#111827]"
          >
            <ArrowLeft
              size={17}
              className="transition-transform group-hover:-translate-x-0.5"
            />

            Back to dashboard
          </Link>

          <div className="text-sm font-semibold text-[#111827]">
            ConsumerConnect
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[900px] px-6 py-10 lg:px-8 lg:py-14">

        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E7E7EA] bg-white px-3 py-1.5 text-xs font-medium text-[#6B7280]">
            <Send size={13} />
            Consumer complaint
          </div>

          <h1 className="text-[34px] font-semibold tracking-[-0.03em] text-[#111827] sm:text-[38px]">
            Create a new issue
          </h1>

          <p className="mt-2 max-w-[650px] text-[15px] leading-7 text-[#8B8D93]">
            Tell us what happened. ConsumerConnect will
            analyze your complaint and help categorize
            its severity.
          </p>
        </div>

        {duplicateIssue && (
          <div
            ref={duplicateSectionRef}
            className="mb-7 scroll-mt-24"
          >
            <div className="overflow-hidden rounded-[24px] border border-amber-200 bg-white shadow-[0_12px_35px_rgba(245,158,11,0.10)]">

              <div className="border-b border-amber-100 bg-amber-50/70 px-6 py-5 sm:px-7">
                <div className="flex items-start gap-4">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-amber-100 text-amber-700">
                    <AlertTriangle size={19} />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-[16px] font-semibold text-[#111827]">
                      A similar issue already exists
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-[#6B7280]">
                      We found an existing complaint that looks
                      similar to the issue you are trying to submit.
                      You can open it and join the existing discussion
                      instead of creating another duplicate.
                    </p>
                  </div>

                </div>
              </div>

              <div className="px-6 py-6 sm:px-7">

                <div className="mb-5 flex flex-wrap items-center gap-3">

                  <div className="rounded-full bg-[#111111] px-3 py-1.5 text-xs font-semibold text-white">
                    {Math.round(
                      Math.min(
                        Math.max(
                          duplicateIssue.similarity *
                            100,
                          0
                        ),
                        100
                      )
                    )}
                    % similar
                  </div>

                  <span className="text-xs text-[#9CA3AF]">
                    Existing issue #{duplicateIssue.id}
                  </span>

                </div>

                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A1A1AA]">
                  Issue
                </p>

                <h3 className="mt-1 text-[18px] font-semibold leading-7 text-[#111827]">
                  {duplicateIssue.title}
                </h3>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">

                  {duplicateIssue.company && (
                    <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                      <Building2
                        size={14}
                        className="text-[#9CA3AF]"
                      />

                      {duplicateIssue.company}
                    </div>
                  )}

                  {duplicateIssue.category && (
                    <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                      <Tag
                        size={14}
                        className="text-[#9CA3AF]"
                      />

                      {duplicateIssue.category}
                    </div>
                  )}

                  {duplicateIssue.status && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${getStatusClasses(
                        duplicateIssue.status
                      )}`}
                    >
                      {duplicateIssue.status}
                    </span>
                  )}

                  {duplicateIssue.created_at && (
                    <span className="text-xs text-[#9CA3AF]">
                      {formatDate(
                        duplicateIssue.created_at
                      )}
                    </span>
                  )}

                </div>

                {duplicateIssue.severity && (
                  <div className="mt-4">
                    <span className="rounded-full bg-[#F5F5F7] px-2.5 py-1 text-[10px] font-semibold text-[#6B7280]">
                      Severity:{" "}
                      {duplicateIssue.severity}
                    </span>
                  </div>
                )}

                {duplicateLoading ? (
                  <div className="mt-5 flex items-center gap-2 rounded-[14px] bg-[#F8F8F9] px-4 py-3 text-xs text-[#9CA3AF]">
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                    Loading existing issue details...
                  </div>
                ) : duplicateIssue.description ? (
                  <div className="mt-5 rounded-[16px] bg-[#F8F8F9] px-4 py-4">

                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A1A1AA]">
                      Brief description
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                      {truncateText(
                        duplicateIssue.description,
                        360
                      )}
                    </p>

                  </div>
                ) : null}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">

                  <button
                    type="button"
                    onClick={
                      openDuplicateIssue
                    }
                    disabled={
                      duplicateOpenLoading
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {duplicateOpenLoading ? (
                      <>
                        <Loader2
                          size={15}
                          className="animate-spin"
                        />

                        Opening issue...
                      </>
                    ) : (
                      <>
                        <ExternalLink
                          size={15}
                        />

                        View existing issue
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDuplicateIssue(
                        null
                      )
                    }
                    disabled={
                      loading ||
                      duplicateOpenLoading
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E0E1E4] bg-white px-5 py-2.5 text-sm font-medium text-[#4B5563] transition hover:bg-[#F4F4F5] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continue editing
                  </button>

                </div>

              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-[28px] border border-[#E7E7EA] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
        >

          <div className="border-b border-[#EEEEF0] px-6 py-6 sm:px-8">
            <div className="flex items-start gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#F4F4F5] text-[#55575D]">
                <Send size={19} />
              </div>

              <div>
                <h2 className="text-[16px] font-semibold text-[#111827]">
                  Complaint details
                </h2>

                <p className="mt-1 text-sm text-[#9CA3AF]">
                  Fields marked with an asterisk are required.
                </p>
              </div>

            </div>
          </div>

          <div className="px-6 py-7 sm:px-8 sm:py-8">

            {error && (
              <div
                role="alert"
                className="mb-6 rounded-[16px] border border-red-100 bg-red-50 px-4 py-3.5 text-sm text-red-700"
              >
                <div className="flex items-start gap-3">

                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold text-red-600">
                    !
                  </div>

                  <p className="leading-6">
                    {error}
                  </p>

                </div>
              </div>
            )}

            {success && (
              <div
                role="status"
                className="mb-6 rounded-[16px] border border-emerald-100 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-700"
              >
                <div className="flex items-center gap-3">

                  <CheckCircle2
                    size={18}
                    className="shrink-0"
                  />

                  <p>
                    {success}
                  </p>

                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="company"
                className="text-sm font-semibold text-[#374151]"
              >
                Company
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                id="company"
                name="company"
                type="text"
                value={company}
                onChange={(event) =>
                  setCompany(
                    event.target.value
                  )
                }
                placeholder="e.g. Airtel, Amazon, HDFC Bank"
                disabled={loading}
                required
                className="mt-2 h-12 w-full rounded-[14px] border border-[#E2E3E6] bg-[#FAFAFA] px-4 text-sm text-[#111827] outline-none transition placeholder:text-[#A1A1AA] hover:border-[#D5D6DA] focus:border-[#111111] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div className="mt-6">
              <label
                htmlFor="title"
                className="text-sm font-semibold text-[#374151]"
              >
                Issue title
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                id="title"
                name="title"
                type="text"
                maxLength={160}
                value={title}
                onChange={(event) => {
                  setTitle(
                    event.target.value
                  );

                  if (duplicateIssue) {
                    setDuplicateIssue(
                      null
                    );
                  }
                }}
                placeholder="Briefly describe your complaint"
                disabled={loading}
                required
                className="mt-2 h-12 w-full rounded-[14px] border border-[#E2E3E6] bg-[#FAFAFA] px-4 text-sm text-[#111827] outline-none transition placeholder:text-[#A1A1AA] hover:border-[#D5D6DA] focus:border-[#111111] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              />

              <div className="mt-2 flex justify-end">
                <span className="text-xs text-[#A1A1AA]">
                  {title.length}/160
                </span>
              </div>
            </div>

            <div className="mt-4">
              <label
                htmlFor="category"
                className="text-sm font-semibold text-[#374151]"
              >
                Category
              </label>

              <select
                id="category"
                name="category"
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value
                  )
                }
                disabled={loading}
                className="mt-2 h-12 w-full rounded-[14px] border border-[#E2E3E6] bg-[#FAFAFA] px-4 text-sm text-[#374151] outline-none transition hover:border-[#D5D6DA] focus:border-[#111111] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  Let AI determine the category
                </option>

                <option value="Telecom">
                  Telecom
                </option>

                <option value="Banking">
                  Banking
                </option>

                <option value="E-commerce">
                  E-commerce
                </option>

                <option value="Travel">
                  Travel
                </option>

                <option value="Food & Delivery">
                  Food & Delivery
                </option>

                <option value="Other">
                  Other
                </option>
              </select>

              <p className="mt-2 text-xs leading-5 text-[#9CA3AF]">
                Leave this empty and ConsumerConnect AI will
                predict the most suitable category.
              </p>
            </div>

            <div className="mt-6">

              <div className="flex items-center justify-between gap-4">

                <label
                  htmlFor="description"
                  className="text-sm font-semibold text-[#374151]"
                >
                  Describe your issue
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <span className="hidden text-xs text-[#A1A1AA] sm:block">
                  Be specific
                </span>

              </div>

              <textarea
                id="description"
                name="description"
                rows={8}
                maxLength={5000}
                value={description}
                onChange={(event) => {
                  setDescription(
                    event.target.value
                  );

                  if (duplicateIssue) {
                    setDuplicateIssue(
                      null
                    );
                  }
                }}
                placeholder="Explain what happened, when it happened, what you were charged or promised, and what resolution you expect."
                disabled={loading}
                required
                className="mt-2 w-full resize-y rounded-[16px] border border-[#E2E3E6] bg-[#FAFAFA] p-4 text-sm leading-7 text-[#111827] outline-none transition placeholder:text-[#A1A1AA] hover:border-[#D5D6DA] focus:border-[#111111] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              />

              <div className="mt-2 flex justify-end">
                <span className="text-xs text-[#A1A1AA]">
                  {description.length}/5000
                </span>
              </div>

            </div>

            <div className="mt-7">

              <p className="text-sm font-semibold text-[#374151]">
                Supporting evidence
              </p>

              <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">
                Upload a screenshot, receipt, bill, or other
                useful evidence. PNG, JPG and JPEG up to 5 MB.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,.png,.jpg,.jpeg"
                onChange={handleImageChange}
                disabled={loading}
                className="hidden"
              />

              {!image ? (
                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={loading}
                  className="mt-4 flex w-full flex-col items-center justify-center rounded-[18px] border border-dashed border-[#D5D6DA] bg-[#FBFBFC] px-6 py-8 text-center transition hover:border-[#BFC1C5] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#6B7280] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                    <UploadCloud size={19} />
                  </div>

                  <p className="mt-3 text-sm font-medium text-[#4B5563]">
                    Upload supporting evidence
                  </p>

                  <p className="mt-1 text-xs text-[#9CA3AF]">
                    Click to browse your files
                  </p>
                </button>
              ) : (
                <div className="mt-4 overflow-hidden rounded-[18px] border border-[#E2E3E6] bg-[#FAFAFA]">

                  <div className="flex items-center gap-4 p-3">

                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Selected supporting evidence"
                        className="h-[76px] w-[76px] shrink-0 rounded-[12px] object-cover"
                      />
                    ) : (
                      <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-[12px] bg-[#F0F0F1] text-[#9CA3AF]">
                        <ImagePlus size={20} />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">

                      <p className="truncate text-sm font-medium text-[#374151]">
                        {image.name}
                      </p>

                      <p className="mt-1 text-xs text-[#9CA3AF]">
                        {(image.size / 1024 / 1024).toFixed(
                          2
                        )}{" "}
                        MB
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                        disabled={loading}
                        className="mt-2 text-xs font-medium text-[#4B5563] underline underline-offset-2 transition hover:text-[#111827] disabled:opacity-50"
                      >
                        Replace image
                      </button>

                    </div>

                    <button
                      type="button"
                      onClick={removeImage}
                      disabled={loading}
                      aria-label="Remove image"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#9CA3AF] transition hover:bg-white hover:text-[#111827] disabled:opacity-50"
                    >
                      <X size={17} />
                    </button>

                  </div>

                </div>
              )}

            </div>

          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[#EEEEF0] bg-[#FCFCFC] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">

            <div className="text-xs leading-5 text-[#9CA3AF]">
              Your complaint will be analyzed by
              ConsumerConnect AI.
            </div>

            <div className="flex items-center justify-end gap-3">

              <button
                type="button"
                onClick={() => {
                  if (!loading) {
                    resetForm();
                  }
                }}
                disabled={loading}
                className="rounded-full px-5 py-2.5 text-sm font-medium text-[#6B7280] transition hover:bg-[#F0F0F1] hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>

              <Link
                href="/"
                className="rounded-full border border-[#E0E1E4] bg-white px-5 py-2.5 text-sm font-medium text-[#4B5563] transition hover:bg-[#F4F4F5]"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#242424] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Analyzing issue...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Submit issue
                  </>
                )}
              </button>

            </div>
          </div>

        </form>

        <div className="mt-5 flex items-start gap-3 px-1">

          <CheckCircle2
            size={16}
            className="mt-0.5 shrink-0 text-[#A1A1AA]"
          />

          <p className="text-xs leading-5 text-[#9CA3AF]">
            After submission, you can track your issue,
            view company responses, receive notifications,
            and manage its status from your dashboard.
          </p>

        </div>

      </div>
    </main>
  );
}