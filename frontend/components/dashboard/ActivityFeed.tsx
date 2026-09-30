"use client";

import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  MessageSquare,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

import { apiRequest } from "@/lib/api";

interface Issue {
  id: number;
  title: string;
  company: string;
  category: string | null;
  status: string;
  severity: string | null;
  estimated_resolution_days: number | null;
  support_count: number;
  comment_count: number;
  trending_score: number;
  image_url: string | null;
  created_at?: string;
  updated_at?: string;
}

interface IssuesResponse {
  success?: boolean;
  page?: number;
  limit?: number;
  count?: number;
  total?: number;
  data?: Issue[];
}

function getStatusIcon(status: string) {
  switch (status.trim().toLowerCase()) {
    case "resolved":
      return CheckCircle2;

    case "in progress":
      return Clock3;

    case "closed":
    case "open":
    default:
      return MessageSquare;
  }
}

function getStatusLabel(status: string) {
  switch (status.trim().toLowerCase()) {
    case "resolved":
      return "Issue resolved";

    case "in progress":
      return "Issue moved to In Progress";

    case "closed":
      return "Issue closed";

    default:
      return "Issue submitted";
  }
}

function getStatusStyles(status: string) {
  switch (status.trim().toLowerCase()) {
    case "resolved":
      return "bg-emerald-50 text-emerald-600";

    case "in progress":
      return "bg-amber-50 text-amber-600";

    case "closed":
      return "bg-zinc-100 text-zinc-600";

    case "open":
    default:
      return "bg-zinc-100 text-zinc-600";
  }
}

export default function ActivityFeed() {
  const [issues, setIssues] =
    useState<Issue[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRecentIssues() {
      try {
        setLoading(true);
        setError("");

        const response: IssuesResponse =
          await apiRequest(
            "/api/issues?limit=4&sort=latest"
          );

        if (cancelled) {
          return;
        }

        const data = Array.isArray(response?.data)
          ? response.data
          : [];

        setIssues(data);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Recent issues loading error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load recent issues."
        );

        setIssues([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRecentIssues();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">

      {/* =======================================================
          HEADER
      ======================================================= */}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-[#111827]">
            Recent Issues
          </h2>

          <p className="mt-1 text-sm text-[#9CA3AF]">
            Latest issues across ConsumerConnect
          </p>
        </div>

        <Link
          href="/my-issues"
          className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-sm font-medium text-[#6B7280] transition hover:bg-[#F5F5F7] hover:text-[#111827]"
        >
          View all
          <ChevronRight size={15} />
        </Link>
      </div>

      {/* =======================================================
          LOADING
      ======================================================= */}

      {loading && (
        <div className="mt-6 space-y-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="flex items-center gap-4 py-4 first:pt-0"
            >
              <div className="h-11 w-11 shrink-0 animate-pulse rounded-[13px] bg-[#F0F0F2]" />

              <div className="min-w-0 flex-1">
                <div className="h-4 w-1/2 animate-pulse rounded bg-[#F0F0F2]" />

                <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-[#F4F4F5]" />
              </div>

              <div className="h-3 w-16 animate-pulse rounded bg-[#F0F0F2]" />
            </div>
          ))}
        </div>
      )}

      {/* =======================================================
          ERROR
      ======================================================= */}

      {!loading && error && (
        <div className="mt-6 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* =======================================================
          EMPTY
      ======================================================= */}

      {!loading &&
        !error &&
        issues.length === 0 && (
          <div className="mt-6 rounded-[16px] bg-[#F8F8F9] px-5 py-8 text-center">
            <p className="text-sm font-medium text-[#374151]">
              No recent issues
            </p>

            <p className="mt-1 text-xs text-[#9CA3AF]">
              New issues will appear here.
            </p>
          </div>
        )}

      {/* =======================================================
          ISSUES
      ======================================================= */}

      {!loading &&
        !error &&
        issues.length > 0 && (
          <div className="mt-6 divide-y divide-[#EEEEF0]">
            {issues.map((issue) => {
              const Icon =
                getStatusIcon(issue.status);

              return (
                <div
                  key={issue.id}
                  className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                >
                  {/* Icon */}

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#F5F5F7] text-[#6B7280]">
                    <Icon
                      size={18}
                      strokeWidth={1.7}
                    />
                  </div>

                  {/* Content */}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium leading-5 text-[#111827]">
                      {getStatusLabel(issue.status)}
                    </p>

                    <p className="mt-1 truncate text-xs text-[#9CA3AF]">
                      {issue.company} · {issue.title}
                    </p>
                  </div>

                  {/* Status */}

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusStyles(
                      issue.status
                    )}`}
                  >
                    {issue.status || "Open"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}