"use client";

import {
  AlertTriangle,
  BrainCircuit,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Tag,
  Timer,
} from "lucide-react";
import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";

interface OverviewData {
  total_issues: number;
  open_issues: number;
  in_progress_issues: number;
  resolved_issues: number;
  closed_issues: number;
  high_severity: number;
  critical_severity: number;
  average_resolution_days: number;
  top_company: string | null;
  top_category: string | null;
}

interface CategoryData {
  category: string | null;
  count: number;
}

interface SeverityData {
  severity: string | null;
  count: number;
}

function getSafeNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : fallback;
}

function getSafeString(
  value: unknown,
  fallback = "No data"
): string {
  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : fallback;
}

export default function AIInsightCard() {
  const [overview, setOverview] =
    useState<OverviewData | null>(null);

  const [topCategory, setTopCategory] =
    useState<CategoryData | null>(null);

  const [topSeverity, setTopSeverity] =
    useState<SeverityData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInsights() {
      try {
        setLoading(true);
        setError("");

        const [
          overviewResponse,
          categoryResponse,
          severityResponse,
        ] = await Promise.all([
          apiRequest("/api/dashboard/overview"),
          apiRequest(
            "/api/dashboard/category-distribution"
          ),
          apiRequest(
            "/api/dashboard/severity-distribution"
          ),
        ]);

        if (cancelled) {
          return;
        }

        const overviewData =
          overviewResponse?.data ??
          overviewResponse ??
          null;

        const categoryData =
          Array.isArray(categoryResponse?.data)
            ? categoryResponse.data
            : Array.isArray(categoryResponse)
              ? categoryResponse
              : [];

        const severityData =
          Array.isArray(severityResponse?.data)
            ? severityResponse.data
            : Array.isArray(severityResponse)
              ? severityResponse
              : [];

        setOverview(overviewData);

        setTopCategory(
          categoryData.length > 0
            ? categoryData[0]
            : null
        );

        setTopSeverity(
          severityData.length > 0
            ? severityData[0]
            : null
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "AI insights loading error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load insights."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInsights();

    return () => {
      cancelled = true;
    };
  }, []);

  const category = getSafeString(
    topCategory?.category ??
      overview?.top_category,
    "No data"
  );

  const severity = getSafeString(
    topSeverity?.severity,
    "No data"
  );

  const highSeverity = getSafeNumber(
    overview?.high_severity
  );

  const criticalSeverity = getSafeNumber(
    overview?.critical_severity
  );

  const averageResolutionDays =
    getSafeNumber(
      overview?.average_resolution_days
    );

  const summary = loading
    ? "Analyzing your issue data..."
    : error
      ? "Unable to load the latest issue insights."
      : overview
        ? `${category} is currently the most common issue category. ${highSeverity} high-severity and ${criticalSeverity} critical issues are currently recorded.`
        : "No issue data available yet.";

  return (
    <div className="min-h-[500px] rounded-[24px] border border-[#E7E7EA] bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex h-full min-h-[446px] flex-col">

        {/* =======================================================
            HEADER
        ======================================================= */}

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#F5F5F7] text-[#6B7280]">
              <BrainCircuit
                size={20}
                strokeWidth={1.7}
              />
            </div>

            <div>
              <h2 className="text-[16px] font-semibold text-[#111827]">
                AI Insights
              </h2>

              <p className="mt-1 text-sm text-[#9CA3AF]">
                Automated issue analysis
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="View AI insights"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#9CA3AF] transition hover:bg-[#F5F5F7] hover:text-[#111827]"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* =======================================================
            SUMMARY
        ======================================================= */}

        <div className="mt-7 rounded-[18px] border border-[#EEEEF0] bg-[#F8F8F9] p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-white text-[#6B7280]">
              <Sparkles size={14} />
            </div>

            <span className="text-[12px] font-semibold text-[#4B5563]">
              AI Summary
            </span>
          </div>

          <p className="mt-3 text-[13px] leading-6 text-[#6B7280]">
            {summary}
          </p>
        </div>

        {/* =======================================================
            METRICS
        ======================================================= */}

        <div className="mt-4 grid grid-cols-2 gap-3">

          {/* Top Category */}

          <div className="rounded-[17px] border border-[#EEEEF0] bg-white p-4">
            <div className="flex items-center gap-2">
              <Tag
                size={14}
                strokeWidth={1.7}
                className="text-[#9CA3AF]"
              />

              <span className="text-[11px] text-[#9CA3AF]">
                Top Category
              </span>
            </div>

            <p className="mt-3 truncate text-[15px] font-semibold text-[#111827]">
              {loading ? "—" : category}
            </p>
          </div>

          {/* Top Severity */}

          <div className="rounded-[17px] border border-[#EEEEF0] bg-white p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert
                size={14}
                strokeWidth={1.7}
                className="text-[#9CA3AF]"
              />

              <span className="text-[11px] text-[#9CA3AF]">
                Top Severity
              </span>
            </div>

            <p className="mt-3 truncate text-[15px] font-semibold text-[#111827]">
              {loading ? "—" : severity}
            </p>
          </div>

          {/* High Severity */}

          <div className="rounded-[17px] border border-[#EEEEF0] bg-white p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle
                size={14}
                strokeWidth={1.7}
                className="text-[#9CA3AF]"
              />

              <span className="text-[11px] text-[#9CA3AF]">
                High Severity
              </span>
            </div>

            <p className="mt-3 text-[15px] font-semibold text-[#111827]">
              {loading
                ? "—"
                : highSeverity}
            </p>
          </div>

          {/* Average Resolution */}

          <div className="rounded-[17px] border border-[#EEEEF0] bg-white p-4">
            <div className="flex items-center gap-2">
              <Timer
                size={14}
                strokeWidth={1.7}
                className="text-[#9CA3AF]"
              />

              <span className="text-[11px] text-[#9CA3AF]">
                Avg. Resolution
              </span>
            </div>

            <p className="mt-3 truncate text-[15px] font-semibold text-[#111827]">
              {loading
                ? "—"
                : `${averageResolutionDays} days`}
            </p>
          </div>
        </div>

        {/* =======================================================
            FOOTER
        ======================================================= */}

        <div className="mt-auto flex items-center justify-between border-t border-[#EEEEF0] pt-5">
          <span className="text-[11px] text-[#9CA3AF]">
            ConsumerConnect AI
          </span>

          <span className="flex items-center gap-2 text-[11px] font-medium text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

            {loading
              ? "Analyzing"
              : error
                ? "Unavailable"
                : "Analysis ready"}
          </span>
        </div>

      </div>
    </div>
  );
}