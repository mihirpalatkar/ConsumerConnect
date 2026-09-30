"use client";

import {
  AlertCircle,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock3,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
  MessageSquare,
  MessageSquareWarning,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:5000";

const ISSUE_STATUSES = [
  "Open",
  "In Progress",
  "Resolved",
  "Closed",
] as const;

type IssueStatus =
  (typeof ISSUE_STATUSES)[number];

type DashboardTab =
  | "overview"
  | "issues"
  | "status-requests"
  | "community"
  | "notifications";

type CommunitySort =
  | "trending"
  | "latest"
  | "supported";

type RequestReviewStatus =
  | "Pending"
  | "Approved"
  | "Rejected";

type ApiError = Error & {
  status?: number;
};

type Company = {
  id: number;
  name: string;
  email: string;
};

type Profile = {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
};

type Issue = {
  id: number;
  title: string;
  description: string;
  company: string;
  company_id?: number;
  user_id?: number;
  category: string | null;
  status: string;
  severity: string | null;
  estimated_resolution_days: number | null;
  support_count: number;
  comment_count: number;
  trending_score: number;
  duplicate_score?: number | null;
  image_url: string | null;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string;
  resolution_note?: string | null;
  rating?: number | null;
};

type CommentItem = {
  id: number;
  content: string;
  issue_id?: number;
  user_id?: number;
  company_id?: number;
  user_name: string;
  author_type?: string;
  parent_id?: number | null;
  created_at?: string;
  replies: CommentItem[];
};

type CompanyResponse = {
  id?: number;
  company?: string;
  response?: string;
  created_at?: string;
};

type NotificationItem = {
  id: number;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  is_read?: boolean;
  created_at?: string;
  issue_id?: number;
};

type StatusRequest = {
  id: number;
  issue_id: number;
  company_id: number;
  company_name?: string | null;
  issue_title?: string | null;
  current_status?: string | null;
  requested_status: IssueStatus;
  resolution_note?: string | null;
  status: RequestReviewStatus;
  created_at?: string;
  reviewed_at?: string | null;
  reviewed_by?: number | null;
  reviewer_name?: string | null;
  review_note?: string | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
} | null;

function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("access_token");
}

function readStoredCompany(): Company | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem("company");

  if (!raw) {
    return null;
  }

  try {
    const value = JSON.parse(raw);

    return {
      id: Number(value?.id ?? 0),
      name: String(value?.name ?? "Company"),
      email: String(value?.email ?? ""),
    };
  } catch {
    return null;
  }
}

function textValue(
  value: unknown,
  fallback = "—"
): string {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  return String(value);
}

function numberValue(
  value: unknown,
  fallback = 0
): number {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function dateValue(value?: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function relativeTime(value?: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const minutes = Math.floor(
    Math.max(0, Date.now() - date.getTime()) /
      60000
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function initial(value: string): string {
  return (
    value.trim().charAt(0).toUpperCase() ||
    "C"
  );
}

function statusClasses(status?: string): string {
  switch (
    (status ?? "").toLowerCase()
  ) {
    case "resolved":
      return "border-emerald-100 bg-emerald-50 text-emerald-700";
    case "in progress":
      return "border-blue-100 bg-blue-50 text-blue-700";
    case "closed":
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
    case "approved":
      return "border-emerald-100 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-red-100 bg-red-50 text-red-700";
    case "pending":
      return "border-amber-100 bg-amber-50 text-amber-700";
    default:
      return "border-amber-100 bg-amber-50 text-amber-700";
  }
}

function severityClasses(
  severity?: string | null
): string {
  switch ((severity ?? "").toLowerCase()) {
    case "critical":
      return "border-red-100 bg-red-50 text-red-700";
    case "high":
      return "border-orange-100 bg-orange-50 text-orange-700";
    case "medium":
      return "border-amber-100 bg-amber-50 text-amber-700";
    case "low":
      return "border-sky-100 bg-sky-50 text-sky-700";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-600";
  }
}

function arrayFromResponse(
  response: any,
  keys: string[]
): any[] {
  for (const key of keys) {
    if (Array.isArray(response?.[key])) {
      return response[key];
    }
  }

  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}

function toChartPoints(
  response: any,
  arrayKeys: string[],
  labelKeys: string[],
  valueKeys: string[]
): ChartPoint[] {
  const raw = arrayFromResponse(response, arrayKeys);

  return raw
    .map((item: any, index: number) => {
      const label = textValue(
        labelKeys
          .map((key) => item?.[key])
          .find((value) => value !== undefined && value !== null && String(value).trim() !== ''),
        `Item ${index + 1}`
      );

      const value = Number(
        valueKeys
          .map((key) => item?.[key])
          .find((rawValue) => rawValue !== undefined && rawValue !== null)
      );

      return {
        label,
        value: Number.isFinite(value) ? value : 0,
      };
    })
    .filter((item) => item.label !== '—');
}

type ChartPoint = {
  label: string;
  value: number;
};

function optionalNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function averageEstimatedResolution(issues: Issue[]): number {
  const values = issues
    .filter(
      (issue) =>
        issue.status.toLowerCase() === 'resolved' &&
        issue.estimated_resolution_days != null
    )
    .map((issue) => numberValue(issue.estimated_resolution_days))
    .filter((value) => value > 0);

  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageActualResolution(issues: Issue[]): number {
  const values = issues
    .filter(
      (issue) =>
        issue.status.toLowerCase() === 'resolved' &&
        issue.created_at &&
        issue.resolved_at
    )
    .map((issue) => {
      const start = new Date(issue.created_at as string).getTime();
      const end = new Date(issue.resolved_at as string).getTime();

      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
        return 0;
      }

      return (end - start) / 86400000;
    })
    .filter((value) => value > 0);

  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function AnalyticsBars({
  data,
  height = 150,
}: {
  data: ChartPoint[];
  height?: number;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  if (data.length === 0) {
    return (
      <div className='flex h-full min-h-[170px] items-center justify-center text-xs text-[#9CA3AF]'>
        No analytics data available.
      </div>
    );
  }

  return (
    <div className='flex min-h-[170px] items-end gap-3 overflow-x-auto pb-1'>
      {data.slice(-12).map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className='flex min-w-[48px] flex-1 flex-col items-center justify-end gap-2'
        >
          <span className='text-[10px] font-semibold text-[#777B82]'>
            {Number.isInteger(item.value) ? item.value : item.value.toFixed(1)}
          </span>
          <div
            className='flex w-full max-w-[44px] items-end rounded-[12px] bg-[#F6F6F8] p-1'
            style={{ height }}
          >
            <div
              className='w-full rounded-[9px] bg-[#111111] transition-all'
              style={{
                height: `${Math.max((item.value / max) * 100, item.value > 0 ? 8 : 0)}%`,
              }}
            />
          </div>
          <span className='max-w-[58px] truncate text-[10px] text-[#A0A3A8]'>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsList({
  data,
}: {
  data: ChartPoint[];
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  if (data.length === 0) {
    return (
      <div className='rounded-[18px] bg-[#F8F8F9] p-6 text-center text-xs text-[#9CA3AF]'>
        No breakdown available.
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {data.slice(0, 6).map((item) => (
        <div key={item.label}>
          <div className='flex items-center justify-between gap-3 text-xs'>
            <span className='truncate font-medium text-[#374151]'>{item.label}</span>
            <span className='font-semibold text-[#111827]'>
              {Number.isInteger(item.value) ? item.value : item.value.toFixed(1)}
            </span>
          </div>
          <div className='mt-2 h-2 rounded-full bg-[#F0F1F2]'>
            <div
              className='h-2 rounded-full bg-[#111111]'
              style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 7 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function normalizeIssue(item: any): Issue {
  return {
    ...item,
    id: numberValue(item?.id),
    title: textValue(item?.title, "Untitled issue"),
    description: textValue(
      item?.description,
      "No description provided."
    ),
    company: textValue(
      item?.company ?? item?.company_name,
      "Unknown company"
    ),
    company_id: item?.company_id,
    user_id: item?.user_id,
    category: item?.category ?? null,
    status: textValue(item?.status, "Open"),
    severity: item?.severity ?? null,
    estimated_resolution_days:
      item?.estimated_resolution_days == null
        ? null
        : numberValue(
            item.estimated_resolution_days
          ),
    support_count: numberValue(
      item?.support_count ?? item?.supports
    ),
    comment_count: numberValue(
      item?.comment_count ?? item?.comments
    ),
    trending_score: numberValue(
      item?.trending_score
    ),
    duplicate_score:
      item?.duplicate_score == null
        ? null
        : numberValue(item.duplicate_score),
    image_url: item?.image_url ?? null,
    created_at: item?.created_at,
    updated_at: item?.updated_at,
    resolved_at: item?.resolved_at,
    resolution_note:
      item?.resolution_note ?? null,
    rating:
      item?.rating == null
        ? item?.feedback_rating == null
          ? null
          : numberValue(item.feedback_rating)
        : numberValue(item.rating),
  };
}

function normalizeComment(
  item: any,
  fallbackParentId?: number
): CommentItem {
  const replies = Array.isArray(item?.replies)
    ? item.replies.map((reply: any) =>
        normalizeComment(
          reply,
          numberValue(item?.id)
        )
      )
    : [];

  return {
    ...item,
    id: numberValue(item?.id),
    content: textValue(item?.content, ""),
    issue_id: item?.issue_id,
    user_id: item?.user_id,
    company_id: item?.company_id,
    user_name: textValue(
      item?.user_name ??
        item?.author_name ??
        item?.name ??
        item?.username ??
        item?.email,
      "User"
    ),
    author_type: item?.author_type,
    parent_id:
      item?.parent_id ??
      fallbackParentId ??
      null,
    created_at: item?.created_at,
    replies,
  };
}

function normalizeRequest(item: any): StatusRequest {
  const requested = textValue(
    item?.requested_status,
    "Open"
  ) as IssueStatus;

  const safeRequested = ISSUE_STATUSES.includes(
    requested
  )
    ? requested
    : "Open";

  const reviewStatus = textValue(
    item?.status,
    "Pending"
  ) as RequestReviewStatus;

  return {
    ...item,
    id: numberValue(item?.id),
    issue_id: numberValue(
      item?.issue_id ?? item?.issue?.id
    ),
    company_id: numberValue(
      item?.company_id ?? item?.company?.id
    ),
    company_name:
      item?.company_name ??
      item?.company?.name ??
      null,
    issue_title:
      item?.issue_title ??
      item?.issue?.title ??
      null,
    current_status:
      item?.current_status ??
      item?.issue?.status ??
      null,
    requested_status: safeRequested,
    resolution_note:
      item?.resolution_note ?? null,
    status:
      reviewStatus === "Approved" ||
      reviewStatus === "Rejected"
        ? reviewStatus
        : "Pending",
    created_at: item?.created_at,
    reviewed_at: item?.reviewed_at ?? null,
    reviewed_by: item?.reviewed_by ?? null,
    reviewer_name: item?.reviewer_name ?? null,
    review_note: item?.review_note ?? null,
  };
}

function extractProfile(response: any): Profile {
  const user =
    response?.user ??
    response?.profile ??
    response?.data?.user ??
    response?.data?.profile ??
    response?.data ??
    response;

  return {
    id:
      typeof user?.id === "number"
        ? user.id
        : undefined,
    name: textValue(
      user?.name ??
        user?.full_name ??
        user?.username,
      "Company"
    ),
    email: textValue(user?.email, ""),
    role: textValue(user?.role, "Company"),
  };
}

function CompanyBadge({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#E7E7EA] bg-[#F8F8F9] px-2.5 py-1 text-[10px] font-semibold text-[#6B7280]">
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  dark = false,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border p-6 shadow-[0_12px_32px_rgba(15,23,42,0.04)] ${
        dark
          ? "border-[#111111] bg-[#111111] text-white"
          : "border-[#E7E7EA] bg-white text-[#111827]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${
            dark
              ? "bg-white/10 text-white"
              : "bg-[#F5F5F7] text-[#666B74]"
          }`}
        >
          {icon}
        </div>

        <span
          className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
            dark ? "text-white/45" : "text-[#A0A3AA]"
          }`}
        >
          Live
        </span>
      </div>

      <p
        className={`mt-5 text-xs ${
          dark ? "text-white/45" : "text-[#9CA0A8]"
        }`}
      >
        {label}
      </p>

      <p className="mt-1 text-[31px] font-semibold tracking-[-0.04em]">
        {value}
      </p>

      <p
        className={`mt-1 text-xs ${
          dark ? "text-white/55" : "text-[#9CA0A8]"
        }`}
      >
        {helper}
      </p>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A1A5AD]">
          {eyebrow ?? "Company workspace"}
        </p>
        <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.04em] text-[#111827]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-[760px] text-sm leading-6 text-[#8E939C]">
            {description}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[15px] bg-[#F5F5F7] text-[#A0A3AA]">
        {icon}
      </div>
      <p className="mt-4 text-sm font-semibold text-[#374151]">
        {title}
      </p>
      <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">
        {description}
      </p>
    </div>
  );
}

function ProfileSettingsModal({
  profile,
  company,
  openProfile,
  openSettings,
  onClose,
}: {
  profile: Profile | null;
  company: Company | null;
  openProfile: boolean;
  openSettings: boolean;
  onClose: () => void;
}) {
  const visible =
    openProfile || openSettings;

  useEffect(() => {
    if (!visible) {
      return;
    }

    const handleEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () =>
      document.removeEventListener(
        "keydown",
        handleEscape
      );
  }, [visible, onClose]);

  if (!visible) {
    return null;
  }

  const displayName =
    profile?.name?.trim() ||
    company?.name ||
    "Company";
  const displayEmail =
    profile?.email?.trim() ||
    company?.email ||
    "Not available";
  const displayRole =
    profile?.role?.trim() ||
    "Company";
  const displayId =
    profile?.id ?? company?.id ?? "—";
  const showingSettings =
    openSettings && !openProfile;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 p-5 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-[720px] overflow-y-auto overflow-hidden rounded-[28px] border border-[#E7E7EA] bg-white shadow-[0_30px_100px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between border-b border-[#EEEEF0] px-7 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#F5F5F7] text-[#666B74]">
              {showingSettings ? (
                <Settings size={19} />
              ) : (
                <User size={19} />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">
                {showingSettings
                  ? "Settings"
                  : "Company profile"}
              </h2>
              <p className="mt-0.5 text-xs text-[#9CA3AF]">
                {showingSettings
                  ? "Manage your ConsumerConnect workspace preferences."
                  : "Your authenticated company account details."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#9CA3AF] transition hover:bg-[#F5F5F7] hover:text-[#111827]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {showingSettings ? (
          <div className="space-y-3 p-7">
            <div className="flex items-center justify-between rounded-[18px] border border-[#E7E7EA] p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F5F5F7] text-[#666B74]">
                  <Bell size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#111827]">
                    Notifications
                  </p>
                  <p className="mt-1 text-xs text-[#9CA3AF]">
                    Issue, response and status-request activity.
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-[#F5F5F7] px-3 py-1 text-[10px] font-semibold text-[#6B7280]">
                Enabled
              </span>
            </div>

            <div className="flex items-center justify-between rounded-[18px] border border-[#E7E7EA] p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F5F5F7] text-[#666B74]">
                  <Search size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#111827]">
                    Global search
                  </p>
                  <p className="mt-1 text-xs text-[#9CA3AF]">
                    Search community issues from the dashboard topbar.
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-[#F5F5F7] px-3 py-1 text-[10px] font-semibold text-[#6B7280]">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between rounded-[18px] border border-[#E7E7EA] p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F5F5F7] text-[#666B74]">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#111827]">
                    Account security
                  </p>
                  <p className="mt-1 text-xs text-[#9CA3AF]">
                    Authenticated company access is required.
                  </p>
                </div>
              </div>
              <ShieldCheck
                size={18}
                className="text-emerald-500"
              />
            </div>

            <div className="rounded-[18px] bg-[#F8F8F9] p-5">
              <p className="text-xs font-semibold text-[#374151]">
                Company workspace
              </p>
              <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">
                Changes to issue status remain subject to administrator approval.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-7">
            <div className="flex flex-col items-center rounded-[22px] bg-[#F8F8F9] px-6 py-8 text-center">
              <div className="flex h-[82px] w-[82px] items-center justify-center rounded-full bg-[#E7E8EA] text-2xl font-semibold text-[#4B5563]">
                {initial(displayName)}
              </div>
              <h3 className="mt-4 text-[20px] font-semibold text-[#111827]">
                {displayName}
              </h3>
              <p className="mt-1 text-sm text-[#9CA3AF]">
                {displayEmail}
              </p>
              <span className="mt-3 rounded-full bg-white px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] shadow-sm">
                {displayRole}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ["Name", displayName, User],
                ["Email", displayEmail, Mail],
                ["Account type", displayRole, ShieldCheck],
                ["Company ID", displayId, Building2],
              ].map(([label, value, Icon]) => {
                const FieldIcon = Icon as typeof User;
                return (
                  <div
                    key={String(label)}
                    className="rounded-[18px] border border-[#E7E7EA] p-5"
                  >
                    <div className="flex items-center gap-2">
                      <FieldIcon
                        size={15}
                        className="text-[#9CA3AF]"
                      />
                      <p className="text-xs text-[#9CA3AF]">
                        {String(label)}
                      </p>
                    </div>
                    <p className="mt-2 break-words text-sm font-semibold text-[#111827]">
                      {String(value)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-[18px] bg-[#F8F8F9] p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={18}
                  className="mt-0.5 text-emerald-500"
                />
                <div>
                  <p className="text-xs font-semibold text-[#374151]">
                    Account information
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">
                    Your profile is loaded from the authenticated ConsumerConnect account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Topbar({
  profile,
  searchValue,
  searchResults,
  searchLoading,
  searchError,
  unreadCount,
  notifications,
  onSearchChange,
  onSearchResultClick,
  onNotificationClick,
  onProfileClick,
}: {
  profile: Profile | null;
  searchValue: string;
  searchResults: Issue[];
  searchLoading: boolean;
  searchError: string;
  unreadCount: number;
  notifications: NotificationItem[];
  onSearchChange: (value: string) => void;
  onSearchResultClick: (issue: Issue) => void;
  onNotificationClick: (notification: NotificationItem) => void;
  onProfileClick: () => void;
}) {
  const [notificationOpen, setNotificationOpen] =
    useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#E7E7EA] bg-[#F5F5F7]/95 backdrop-blur-xl">
      <div className="flex min-h-[72px] items-center gap-4 px-5 lg:px-7">
        <div className="hidden min-w-0 flex-1 lg:block">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A0A3AA]">
            ConsumerConnect / Company
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-[#111827]">
            Company workspace
          </p>
        </div>

        <div className="relative w-full max-w-[520px] flex-1 lg:flex-none">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A0A3AA]"
          />
          <input
            value={searchValue}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            placeholder="Search issues, companies, categories..."
            className="h-11 w-full rounded-full border border-[#E4E5E8] bg-white pl-11 pr-4 text-sm text-[#111827] outline-none transition placeholder:text-[#A3A6AD] focus:border-[#D3D4D8] focus:shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
          />

          {searchValue.trim() && (
            <div className="absolute left-0 right-0 top-[52px] z-[70] overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
              {searchLoading ? (
                <div className="flex items-center gap-2 px-5 py-4 text-sm text-[#8E939C]">
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                  Searching issues...
                </div>
              ) : searchError ? (
                <div className="px-5 py-4 text-sm text-red-600">
                  {searchError}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="px-5 py-5 text-center">
                  <p className="text-sm font-semibold text-[#374151]">
                    No issues found
                  </p>
                  <p className="mt-1 text-xs text-[#9CA3AF]">
                    Try a company, category or issue title.
                  </p>
                </div>
              ) : (
                <div className="max-h-[360px] overflow-y-auto p-2">
                  {searchResults.slice(0, 8).map((issue) => (
                    <button
                      key={issue.id}
                      type="button"
                      onClick={() =>
                        onSearchResultClick(issue)
                      }
                      className="w-full rounded-[16px] px-4 py-3 text-left transition hover:bg-[#F8F8F9]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#111827]">
                            {issue.title}
                          </p>
                          <p className="mt-1 truncate text-xs text-[#8E939C]">
                            {issue.company}
                            {issue.category
                              ? ` · ${issue.category}`
                              : ""}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-semibold ${statusClasses(
                            issue.status
                          )}`}
                        >
                          {issue.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setNotificationOpen(
                (value) => !value
              )
            }
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#E7E7EA] bg-white text-[#666B74] transition hover:bg-[#F8F8F9]"
            aria-label="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#111111] px-1 text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notificationOpen && (
            <div className="absolute right-0 top-[50px] z-[75] w-[360px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
              <div className="flex items-center justify-between border-b border-[#EEEEF0] px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-[#111827]">
                    Notifications
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#9CA3AF]">
                    Company activity
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotificationOpen(false)
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#9CA3AF] hover:bg-[#F5F5F7]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[390px] overflow-y-auto p-2">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-xs text-[#9CA3AF]">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 8).map((item) => {
                    const unread =
                      !item.read &&
                      !item.is_read;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setNotificationOpen(false);
                          onNotificationClick(item);
                        }}
                        className="flex w-full items-start gap-3 rounded-[16px] px-4 py-3 text-left transition hover:bg-[#F8F8F9]"
                      >
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${
                            unread
                              ? "bg-[#111111] text-white"
                              : "bg-[#F5F5F7] text-[#9CA3AF]"
                          }`}
                        >
                          <Bell size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-xs font-semibold text-[#111827]">
                              {item.title ??
                                item.type ??
                                "Notification"}
                            </p>
                            {unread && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#111111]" />
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[#6B7280]">
                            {item.message ??
                              "You have a new notification."}
                          </p>
                          <p className="mt-1 text-[10px] text-[#B0B3B8]">
                            {relativeTime(
                              item.created_at
                            )}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onProfileClick}
            className="flex items-center gap-2 rounded-full border border-[#E7E7EA] bg-white px-2 py-2 pr-3 transition hover:bg-[#F8F8F9]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111111] text-xs font-semibold text-white">
              {initial(
                profile?.name ??
                  "Company"
              )}
            </span>
            <span className="hidden max-w-[140px] truncate text-xs font-semibold text-[#374151] sm:block">
              {profile?.name ?? "Company"}
            </span>
            <ChevronDown
              size={14}
              className="hidden text-[#9CA3AF] sm:block"
            />
          </button>
        </div>
      </div>
    </header>
  );
}

function Sidebar({
  activeTab,
  company,
  profile,
  pendingCount,
  unreadCount,
  mobileOpen,
  onCloseMobile,
  onNavigate,
  onProfile,
  onSettings,
  onSignOut,
}: {
  activeTab: DashboardTab;
  company: Company | null;
  profile: Profile | null;
  pendingCount: number;
  unreadCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onNavigate: (tab: DashboardTab) => void;
  onProfile: () => void;
  onSettings: () => void;
  onSignOut: () => void;
}) {
  const items: Array<{
    id: DashboardTab;
    label: string;
    icon: ReactNode;
    badge?: number;
  }> = [
    {
      id: "overview",
      label: "Overview",
      icon: <LayoutDashboard size={18} />,
    },
    {
      id: "issues",
      label: "Company Issues",
      icon: <MessageSquareWarning size={18} />,
    },
    {
      id: "status-requests",
      label: "Status Requests",
      icon: <ShieldCheck size={18} />,
      badge: pendingCount || undefined,
    },
    {
      id: "community",
      label: "Community",
      icon: <MessageCircle size={18} />,
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell size={18} />,
      badge: unreadCount || undefined,
    },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-[85] bg-black/25 backdrop-blur-[1px] lg:hidden ${
          mobileOpen ? "block" : "hidden"
        }`}
        onClick={onCloseMobile}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-[90] flex w-[294px] flex-col border-r border-[#E7E7EA] bg-white px-5 py-5 transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#111111] text-white">
            <Building2 size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#111827]">
              ConsumerConnect
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A0A3AA]">
              Company workspace
            </p>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#9CA3AF] hover:bg-[#F5F5F7] lg:hidden"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-8 flex-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.17em] text-[#A3A6AD]">
            Workspace
          </p>

          <nav className="mt-3 space-y-1">
            {items.map((item) => {
              const active =
                activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile();
                  }}
                  className={`flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-sm font-medium transition ${
                    active
                      ? "bg-[#111111] text-white shadow-[0_8px_22px_rgba(0,0,0,0.10)]"
                      : "text-[#6B7280] hover:bg-[#F8F8F9] hover:text-[#111827]"
                  }`}
                >
                  <span className="shrink-0">
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {item.label}
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        active
                          ? "bg-white/15 text-white"
                          : "bg-[#F1F1F3] text-[#60656D]"
                      }`}
                    >
                      {item.badge > 99
                        ? "99+"
                        : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-[#EEEEF0] pt-4">
          <button
            type="button"
            onClick={onProfile}
            className="flex w-full items-center gap-3 rounded-[16px] p-3 text-left transition hover:bg-[#F8F8F9]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E7E8EA] text-sm font-semibold text-[#4B5563]">
              {initial(
                profile?.name ??
                  company?.name ??
                  "Company"
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-[#111827]">
                {profile?.name ??
                  company?.name ??
                  "Company"}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-[#9CA3AF]">
                {profile?.email ??
                  company?.email ??
                  "Company account"}
              </span>
            </span>
          </button>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onSettings}
              className="flex items-center justify-center gap-2 rounded-[12px] border border-[#E7E7EA] px-3 py-2.5 text-xs font-semibold text-[#6B7280] transition hover:bg-[#F8F8F9] hover:text-[#111827]"
            >
              <Settings size={15} />
              Settings
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center justify-center gap-2 rounded-[12px] border border-[#E7E7EA] px-3 py-2.5 text-xs font-semibold text-[#6B7280] transition hover:border-red-100 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function CommunityCard({
  issue,
  onOpen,
}: {
  issue: Issue;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-[24px] border border-[#E7E7EA] bg-white p-6 text-left transition hover:-translate-y-[1px] hover:border-[#D5D6D9] hover:shadow-[0_18px_40px_rgba(0,0,0,0.05)]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <CompanyBadge>
          {issue.company}
        </CompanyBadge>
        {issue.category && (
          <CompanyBadge>
            {issue.category}
          </CompanyBadge>
        )}
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClasses(
            issue.status
          )}`}
        >
          {issue.status}
        </span>
        {issue.severity && (
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${severityClasses(
              issue.severity
            )}`}
          >
            {issue.severity}
          </span>
        )}
      </div>

      <h2 className="mt-4 text-[19px] font-semibold tracking-[-0.015em] text-[#111827]">
        {issue.title}
      </h2>

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#6B7280]">
        {issue.description}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#EEEEF0] pt-5">
        <span className="flex items-center gap-2 text-xs text-[#6B7280]">
          <ThumbsUp size={15} />
          {issue.support_count} supports
        </span>
        <span className="flex items-center gap-2 text-xs text-[#6B7280]">
          <MessageCircle size={15} />
          {issue.comment_count} comments
        </span>
        <span className="flex items-center gap-2 text-xs text-[#6B7280]">
          <TrendingUp size={15} />
          {Math.round(issue.trending_score || 0)} trending
        </span>
        <span className="ml-auto text-[11px] text-[#B0B3B8]">
          {relativeTime(issue.updated_at ?? issue.created_at)}
        </span>
      </div>
    </button>
  );
}

function CommentThread({
  comments,
  replyTarget,
  replyText,
  replyLoading,
  expandedReplies,
  onReplyTarget,
  onReplyText,
  onSubmitReply,
  onToggleReplies,
}: {
  comments: CommentItem[];
  replyTarget: number | null;
  replyText: string;
  replyLoading: boolean;
  expandedReplies: Record<number, boolean>;
  onReplyTarget: (id: number | null) => void;
  onReplyText: (value: string) => void;
  onSubmitReply: (
    event: FormEvent,
    parentId: number
  ) => void;
  onToggleReplies: (id: number) => void;
}) {
  if (comments.length === 0) {
    return (
      <div className="mt-6 rounded-[18px] bg-[#F8F8F9] p-6 text-center text-xs text-[#9CA3AF]">
        No community comments yet.
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {comments.map((comment) => {
        const replies = comment.replies ?? [];
        const expanded =
          expandedReplies[comment.id] ??
          replies.length <= 2;

        return (
          <div
            key={comment.id}
            className="rounded-[18px] border border-[#EEEEF0] p-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#111111] text-[11px] font-semibold text-white">
                {initial(comment.user_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-[#111827]">
                    {comment.user_name}
                  </p>
                  {comment.author_type && (
                    <span className="rounded-full bg-[#F5F5F7] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#7A7F87]">
                      {comment.author_type}
                    </span>
                  )}
                  {comment.created_at && (
                    <span className="text-[10px] text-[#B0B3B8]">
                      {relativeTime(comment.created_at)}
                    </span>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#4B5563]">
                  {comment.content}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {replies.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        onToggleReplies(comment.id)
                      }
                      className="text-[11px] font-semibold text-[#6B7280] hover:text-[#111827]"
                    >
                      {expanded
                        ? "Hide replies"
                        : `View ${replies.length} replies`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      onReplyTarget(comment.id)
                    }
                    className="text-[11px] font-semibold text-[#6B7280] hover:text-[#111827]"
                  >
                    Reply
                  </button>
                </div>

                {replyTarget === comment.id && (
                  <form
                    onSubmit={(event) =>
                      onSubmitReply(
                        event,
                        comment.id
                      )
                    }
                    className="mt-4 rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] p-3"
                  >
                    <textarea
                      value={replyText}
                      onChange={(event) =>
                        onReplyText(
                          event.target.value
                        )
                      }
                      rows={3}
                      placeholder="Write a company reply..."
                      className="w-full resize-none bg-transparent text-xs leading-5 text-[#111827] outline-none placeholder:text-[#A0A3AA]"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onReplyTarget(null)
                        }
                        className="rounded-full px-4 py-2 text-[11px] font-semibold text-[#6B7280] hover:bg-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={
                          replyLoading ||
                          !replyText.trim()
                        }
                        className="flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {replyLoading && (
                          <Loader2
                            size={13}
                            className="animate-spin"
                          />
                        )}
                        Reply
                      </button>
                    </div>
                  </form>
                )}

                {expanded && replies.length > 0 && (
                  <div className="mt-4 space-y-3 border-l border-[#E7E7EA] pl-4">
                    {replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="rounded-[14px] bg-[#F8F8F9] p-4"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-[#374151]">
                            {reply.user_name}
                          </span>
                          <span className="text-[10px] text-[#B0B3B8]">
                            {relativeTime(reply.created_at)}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#5B6068]">
                          {reply.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CompanyDashboardPage() {
  const router = useRouter();

  const [company, setCompany] =
    useState<Company | null>(null);
  const [profile, setProfile] =
    useState<Profile | null>(null);
  const [activeTab, setActiveTab] =
    useState<DashboardTab>("overview");
  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [dashboard, setDashboard] =
    useState<Record<string, unknown>>({});
  const [issues, setIssues] =
    useState<Issue[]>([]);
  const [communityIssues, setCommunityIssues] =
    useState<Issue[]>([]);
  const [statusRequests, setStatusRequests] =
    useState<StatusRequest[]>([]);
  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [categoryData, setCategoryData] =
    useState<ChartPoint[]>([]);
  const [monthlyData, setMonthlyData] =
    useState<ChartPoint[]>([]);
  const [ratingData, setRatingData] =
    useState<ChartPoint[]>([]);
  const [analyticsLoading, setAnalyticsLoading] =
    useState(false);

  const [selectedIssue, setSelectedIssue] =
    useState<Issue | null>(null);
  const [comments, setComments] =
    useState<CommentItem[]>([]);
  const [responses, setResponses] =
    useState<CompanyResponse[]>([]);
  const [selectedFromCommunity, setSelectedFromCommunity] =
    useState(false);

  const [loading, setLoading] =
    useState(true);
  const [issuesLoading, setIssuesLoading] =
    useState(false);
  const [communityLoading, setCommunityLoading] =
    useState(false);
  const [statusRequestsLoading, setStatusRequestsLoading] =
    useState(false);
  const [notificationsLoading, setNotificationsLoading] =
    useState(false);
  const [detailLoading, setDetailLoading] =
    useState(false);

  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");
  const [toast, setToast] =
    useState<Toast>(null);

  const [profileOpen, setProfileOpen] =
    useState(false);
  const [settingsOpen, setSettingsOpen] =
    useState(false);

  const [globalSearch, setGlobalSearch] =
    useState("");
  const [globalSearchResults, setGlobalSearchResults] =
    useState<Issue[]>([]);
  const [globalSearchLoading, setGlobalSearchLoading] =
    useState(false);
  const [globalSearchError, setGlobalSearchError] =
    useState("");

  const [issueSearch, setIssueSearch] =
    useState("");
  const [statusFilter, setStatusFilter] =
    useState("All");
  const [severityFilter, setSeverityFilter] =
    useState("All");
  const [communitySearch, setCommunitySearch] =
    useState("");
  const [communitySort, setCommunitySort] =
    useState<CommunitySort>("trending");

  const [commentText, setCommentText] =
    useState("");
  const [replyText, setReplyText] =
    useState("");
  const [replyTarget, setReplyTarget] =
    useState<number | null>(null);
  const [replyLoadingId, setReplyLoadingId] =
    useState<number | null>(null);
  const [commentSubmitting, setCommentSubmitting] =
    useState(false);
  const [responseText, setResponseText] =
    useState("");
  const [responseSubmitting, setResponseSubmitting] =
    useState(false);
  const [requestedStatus, setRequestedStatus] =
    useState<IssueStatus | "">("");
  const [resolutionNote, setResolutionNote] =
    useState("");
  const [statusSubmitting, setStatusSubmitting] =
    useState(false);

  const [expandedReplies, setExpandedReplies] =
    useState<Record<number, boolean>>({});

  const searchTimer =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const companyRequest =
    useCallback(
      async (
        endpoint: string,
        options: RequestInit = {}
      ) => {
        const token = getToken();
        const headers = new Headers(
          options.headers
        );

        headers.set(
          "Accept",
          "application/json"
        );

        if (
          options.body &&
          !(options.body instanceof FormData) &&
          !headers.has("Content-Type")
        ) {
          headers.set(
            "Content-Type",
            "application/json"
          );
        }

        if (token) {
          headers.set(
            "Authorization",
            `Bearer ${token}`
          );
        }

        let response: Response;

        try {
          response = await fetch(
            `${API_URL}${endpoint}`,
            {
              ...options,
              headers,
              cache: "no-store",
            }
          );
        } catch {
          throw Object.assign(
            new Error(
              "Unable to connect to ConsumerConnect. Please make sure the backend is running."
            ),
            { status: 0 }
          ) as ApiError;
        }

        let data: any = {};

        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (response.status === 401) {
          throw Object.assign(
            new Error(
              "Your company session has expired. Please log in again."
            ),
            { status: 401 }
          ) as ApiError;
        }

        if (!response.ok) {
          throw Object.assign(
            new Error(
              String(
                data?.message ??
                  data?.error ??
                  "Unable to complete the request."
              )
            ),
            { status: response.status }
          ) as ApiError;
        }

        return data;
      },
      []
    );

  const pendingRequests = useMemo(
    () =>
      statusRequests.filter(
        (item) => item.status === "Pending"
      ),
    [statusRequests]
  );

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (item) =>
          !item.read &&
          !item.is_read
      ).length,
    [notifications]
  );

  const filteredIssues = useMemo(() => {
    const query = issueSearch
      .trim()
      .toLowerCase();

    return issues
      .filter((issue) => {
        const searchMatch =
          !query ||
          issue.title
            .toLowerCase()
            .includes(query) ||
          issue.description
            .toLowerCase()
            .includes(query) ||
          issue.company
            .toLowerCase()
            .includes(query) ||
          (issue.category ?? "")
            .toLowerCase()
            .includes(query);

        const statusMatch =
          statusFilter === "All" ||
          issue.status === statusFilter;

        const severityMatch =
          severityFilter === "All" ||
          issue.severity === severityFilter;

        return (
          searchMatch &&
          statusMatch &&
          severityMatch
        );
      })
      .sort(
        (a, b) =>
          new Date(
            b.updated_at ??
              b.created_at ??
              0
          ).getTime() -
          new Date(
            a.updated_at ??
              a.created_at ??
              0
          ).getTime()
      );
  }, [
    issues,
    issueSearch,
    statusFilter,
    severityFilter,
  ]);

  const sortedCommunity = useMemo(() => {
    const query = communitySearch
      .trim()
      .toLowerCase();

    const filtered = communityIssues.filter(
      (issue) =>
        !query ||
        issue.title
          .toLowerCase()
          .includes(query) ||
        issue.company
          .toLowerCase()
          .includes(query) ||
        issue.description
          .toLowerCase()
          .includes(query) ||
        (issue.category ?? "")
          .toLowerCase()
          .includes(query)
    );

    return [...filtered].sort((a, b) => {
      if (communitySort === "supported") {
        return b.support_count - a.support_count;
      }

      if (communitySort === "latest") {
        return (
          new Date(
            b.updated_at ??
              b.created_at ??
              0
          ).getTime() -
          new Date(
            a.updated_at ??
              a.created_at ??
              0
          ).getTime()
        );
      }

      return (
        b.trending_score -
        a.trending_score
      );
    });
  }, [
    communityIssues,
    communitySearch,
    communitySort,
  ]);

  const belongsToCompany = useMemo(() => {
    if (!selectedIssue || !company) {
      return false;
    }

    if (
      selectedIssue.company_id &&
      company.id
    ) {
      return (
        Number(selectedIssue.company_id) ===
        Number(company.id)
      );
    }

    return (
      selectedIssue.company
        .trim()
        .toLowerCase() ===
      company.name
        .trim()
        .toLowerCase()
    );
  }, [selectedIssue, company]);

  const pendingRequestForSelectedIssue =
    selectedIssue
      ? pendingRequests.find(
          (request) =>
            request.issue_id ===
            selectedIssue.id
        )
      : undefined;

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(
      () => setToast(null),
      3200
    );

    return () =>
      window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setCompany(readStoredCompany());
  }, [router]);

  const loadProfile = useCallback(async () => {
    try {
      const response = await apiRequest(
        "/api/auth/profile"
      );
      setProfile(extractProfile(response));
    } catch (profileError) {
      console.error(
        "Company profile error:",
        profileError
      );
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setAnalyticsLoading(true);
      setError("");

      const results = await Promise.allSettled([
        companyRequest("/api/company/dashboard"),
        companyRequest("/api/company/dashboard/issues"),
        companyRequest("/api/company/dashboard/analytics"),
        companyRequest("/api/company/dashboard/category-distribution"),
        companyRequest("/api/company/dashboard/monthly-trends"),
        companyRequest("/api/company/dashboard/rating-distribution"),
      ]);

      const fulfilled = <T,>(index: number): T | null => {
        const result = results[index];
        return result && result.status === "fulfilled"
          ? (result.value as T)
          : null;
      };

      const dashboardResponse = fulfilled<any>(0);
      const issuesResponse = fulfilled<any>(1);
      const analyticsResponse = fulfilled<any>(2);
      const categoryResponse = fulfilled<any>(3);
      const monthlyResponse = fulfilled<any>(4);
      const ratingResponse = fulfilled<any>(5);

      const dashboardPayload =
        dashboardResponse?.dashboard ??
        dashboardResponse?.data ??
        dashboardResponse ??
        {};

      const analyticsPayload =
        analyticsResponse?.analytics ??
        analyticsResponse?.dashboard ??
        analyticsResponse?.data ??
        analyticsResponse ??
        {};

      const mergedDashboard = {
        ...(typeof dashboardPayload === "object" && dashboardPayload !== null
          ? dashboardPayload
          : {}),
        ...(typeof analyticsPayload === "object" && analyticsPayload !== null
          ? analyticsPayload
          : {}),
      };

      let rawIssues = arrayFromResponse(
        issuesResponse,
        ["issues", "data"]
      );

      if (rawIssues.length === 0) {
        try {
          const fallbackResponse = await companyRequest(
            "/api/company/issues?limit=100&sort=latest"
          );
          rawIssues = arrayFromResponse(
            fallbackResponse,
            ["issues", "data"]
          );
        } catch (fallbackError) {
          console.warn(
            "Company issues fallback load skipped:",
            fallbackError
          );
        }
      }

      const normalized = rawIssues.map(normalizeIssue);

      setDashboard(mergedDashboard);
      setIssues(normalized);

      if (categoryResponse) {
        setCategoryData(
          toChartPoints(
            categoryResponse,
            ["categories", "category_distribution", "data"],
            ["category", "name", "label"],
            ["count", "issues", "value", "total"]
          )
        );
      } else {
        const fallbackCategories = new Map<string, number>();
        normalized.forEach((issue) => {
          const key = issue.category?.trim() || "Uncategorized";
          fallbackCategories.set(
            key,
            (fallbackCategories.get(key) ?? 0) + 1
          );
        });
        setCategoryData(
          Array.from(fallbackCategories.entries())
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)
        );
      }

      if (monthlyResponse) {
        setMonthlyData(
          toChartPoints(
            monthlyResponse,
            ["monthly_trends", "trends", "data"],
            ["label", "month", "name", "period"],
            ["count", "issues", "value", "total"]
          )
        );
      } else {
        const monthlyMap = new Map<string, number>();
        normalized.forEach((issue) => {
          const date = issue.created_at ? new Date(issue.created_at) : null;
          if (!date || Number.isNaN(date.getTime())) return;
          const label = date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
          monthlyMap.set(label, (monthlyMap.get(label) ?? 0) + 1);
        });
        setMonthlyData(
          Array.from(monthlyMap.entries()).map(([label, value]) => ({ label, value }))
        );
      }

      if (ratingResponse) {
        setRatingData(
          toChartPoints(
            ratingResponse,
            ["ratings", "rating_distribution", "data"],
            ["rating", "stars", "label", "name"],
            ["count", "value", "total"]
          )
        );
      } else {
        const ratingMap = new Map<string, number>();
        normalized.forEach((issue) => {
          if (issue.rating == null || issue.rating <= 0) return;
          const label = `${issue.rating} star${issue.rating === 1 ? '' : 's'}`;
          ratingMap.set(label, (ratingMap.get(label) ?? 0) + 1);
        });
        setRatingData(
          Array.from(ratingMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
            .map(([label, value]) => ({ label, value }))
        );
      }

      setCompany((current) =>
        current ?? {
          id: numberValue(
            dashboardPayload?.company?.id ?? 0
          ),
          name: textValue(
            dashboardPayload?.company?.name ??
              dashboardPayload?.company_name ??
              normalized[0]?.company,
            "Company"
          ),
          email: textValue(
            dashboardPayload?.company?.email ??
              dashboardPayload?.email,
            ""
          ),
        }
      );

      const unauthorized = results.some(
        (result) =>
          result.status === "rejected" &&
          (result.reason as ApiError)?.status === 401
      );

      if (unauthorized) {
        localStorage.removeItem("access_token");
        router.replace("/login");
        return;
      }

      const coreDashboardFailed =
        results[0]?.status === "rejected" &&
        results[1]?.status === "rejected";

      if (coreDashboardFailed) {
        setError(
          "Unable to load company dashboard data. Please check that the backend is running."
        );
      }
    } catch (loadError) {
      const currentError = loadError as ApiError;
      console.error("Company dashboard error:", loadError);
      setError(
        currentError.message ||
          "Unable to load the company dashboard."
      );

      if (currentError.status === 401) {
        localStorage.removeItem("access_token");
        router.replace("/login");
      }
    } finally {
      setLoading(false);
      setAnalyticsLoading(false);
    }
  }, [companyRequest, router]);

  const loadStatusRequests = useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) {
          setStatusRequestsLoading(true);
        }

        const response = await companyRequest(
          "/api/company/status-requests"
        );

        setStatusRequests(
          arrayFromResponse(response, [
            "status_requests",
            "requests",
            "data",
          ]).map(normalizeRequest)
        );
      } catch (loadError) {
        const currentError =
          loadError as ApiError;

        if (currentError.status !== 401) {
          console.error(
            "Status request load error:",
            loadError
          );
        }
      } finally {
        if (showLoading) {
          setStatusRequestsLoading(false);
        }
      }
    },
    [companyRequest]
  );

  const loadCommunity = useCallback(
    async (sort: CommunitySort = communitySort) => {
      try {
        setCommunityLoading(true);
        const serverSort =
          sort === "supported"
            ? "latest"
            : sort;

        const response = await companyRequest(
          `/api/issues/community?limit=100&sort=${serverSort}`
        );

        setCommunityIssues(
          arrayFromResponse(response, [
            "issues",
            "data",
          ]).map(normalizeIssue)
        );
      } catch (loadError) {
        console.error(
          "Community load error:",
          loadError
        );
        setError(
          (loadError as ApiError).message ||
            "Unable to load the community."
        );
      } finally {
        setCommunityLoading(false);
      }
    },
    [companyRequest, communitySort]
  );

  const loadNotifications = useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) {
          setNotificationsLoading(true);
        }

        const response = await companyRequest(
          "/api/notifications"
        );

        setNotifications(
          arrayFromResponse(response, [
            "notifications",
            "data",
          ]).map((item: any) => ({
            ...item,
            id: numberValue(item?.id),
          }))
        );
      } catch (loadError) {
        const currentError =
          loadError as ApiError;

        if (
          currentError.status !== 401 &&
          currentError.status !== 403
        ) {
          console.error(
            "Notification load error:",
            loadError
          );
        }
      } finally {
        if (showLoading) {
          setNotificationsLoading(false);
        }
      }
    },
    [companyRequest]
  );

  useEffect(() => {
    void loadProfile();
    void loadDashboard();
    void loadStatusRequests();
    void loadNotifications();
  }, [
    loadProfile,
    loadDashboard,
    loadStatusRequests,
    loadNotifications,
  ]);

  useEffect(() => {
    if (!company) {
      return;
    }

    const interval = window.setInterval(
      () => {
        void loadStatusRequests();
        void loadNotifications();
      },
      15000
    );

    return () =>
      window.clearInterval(interval);
  }, [
    company,
    loadStatusRequests,
    loadNotifications,
  ]);

  useEffect(() => {
    if (globalSearch.trim().length < 2) {
      setGlobalSearchResults([]);
      setGlobalSearchLoading(false);
      setGlobalSearchError("");
      return;
    }

    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    searchTimer.current = setTimeout(
      async () => {
        try {
          setGlobalSearchLoading(true);
          setGlobalSearchError("");

          const response = await companyRequest(
            `/api/issues/search?search=${encodeURIComponent(
              globalSearch.trim()
            )}`
          );

          setGlobalSearchResults(
            arrayFromResponse(response, [
              "issues",
              "data",
            ]).map(normalizeIssue)
          );
        } catch (searchError) {
          console.error(
            "Company global search error:",
            searchError
          );
          setGlobalSearchError(
            (searchError as Error).message ||
              "Search is unavailable right now."
          );
        } finally {
          setGlobalSearchLoading(false);
        }
      },
      260
    );

    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
    };
  }, [globalSearch, companyRequest]);

  const refreshAll = async () => {
    setError("");
    setSuccess("");

    await Promise.all([
      loadDashboard(),
      loadStatusRequests(true),
      loadNotifications(true),
    ]);

    if (activeTab === "community") {
      await loadCommunity();
    }

    setToast({
      type: "success",
      message: "Company dashboard refreshed.",
    });
  };

  const openIssue = async (
    issue: Issue,
    fromCommunity = false
  ) => {
    try {
      setDetailLoading(true);
      setSelectedIssue(issue);
      setSelectedFromCommunity(fromCommunity);
      setComments([]);
      setResponses([]);
      setReplyTarget(null);
      setReplyText("");
      setCommentText("");
      setResponseText("");
      setExpandedReplies({});
      setRequestedStatus("");
      setResolutionNote("");
      setError("");

      const requestsPromise = companyRequest(
        "/api/company/status-requests"
      );

      const commentsPromise = companyRequest(
        `/api/company/community/issues/${issue.id}/comments`
      );

      const issuePromise = companyRequest(
        `/api/company/issues/${issue.id}`
      ).catch(() => null);

      const [
        issueResponse,
        commentsResponse,
        statusResponse,
      ] = await Promise.all([
        issuePromise,
        commentsPromise,
        requestsPromise,
      ]);

      if (issueResponse) {
        const loadedIssue =
          issueResponse?.issue ??
          issueResponse?.data ??
          issueResponse;

        if (loadedIssue) {
          const normalized =
            normalizeIssue(loadedIssue);
          setSelectedIssue(normalized);
          setIssues((current) =>
            current.map((item) =>
              item.id === normalized.id
                ? normalized
                : item
            )
          );
        }
      }

      setComments(
        arrayFromResponse(commentsResponse, [
          "comments",
          "data",
        ]).map(normalizeComment)
      );

      setStatusRequests(
        arrayFromResponse(statusResponse, [
          "status_requests",
          "requests",
          "data",
        ]).map(normalizeRequest)
      );

      const currentIssue =
        issueResponse?.issue ??
        issueResponse?.data ??
        issueResponse ??
        issue;

      const currentCompanyMatch =
        company &&
        (Number(currentIssue?.company_id) ===
          Number(company.id) ||
          String(
            currentIssue?.company ?? ""
          )
            .trim()
            .toLowerCase() ===
            company.name
              .trim()
              .toLowerCase());

      if (currentCompanyMatch) {
        try {
          const response =
            await companyRequest(
              `/api/company/responses/${issue.id}`
            );

          setResponses(
            arrayFromResponse(response, [
              "responses",
              "data",
            ])
          );
        } catch (responseError) {
          console.warn(
            "Company response load skipped:",
            responseError
          );
        }
      }
    } catch (openError) {
      console.error(
        "Open company issue error:",
        openError
      );
      setError(
        (openError as ApiError).message ||
          "Unable to load the selected issue."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const closeIssue = () => {
    setSelectedIssue(null);
    setComments([]);
    setResponses([]);
    setReplyTarget(null);
    setReplyText("");
    setCommentText("");
    setResponseText("");
    setExpandedReplies({});
    setRequestedStatus("");
    setResolutionNote("");
  };

  const submitCompanyComment = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (
      !selectedIssue ||
      !commentText.trim()
    ) {
      return;
    }

    try {
      setCommentSubmitting(true);
      setError("");

      await companyRequest(
        "/api/company/comments",
        {
          method: "POST",
          body: JSON.stringify({
            issue_id: selectedIssue.id,
            content: commentText.trim(),
          }),
        }
      );

      setCommentText("");

      const response = await companyRequest(
        `/api/company/community/issues/${selectedIssue.id}/comments`
      );

      setComments(
        arrayFromResponse(response, [
          "comments",
          "data",
        ]).map(normalizeComment)
      );

      setSuccess(
        "Company comment posted successfully."
      );
      setToast({
        type: "success",
        message: "Comment posted successfully.",
      });
    } catch (commentError) {
      console.error(
        "Company comment error:",
        commentError
      );
      setError(
        (commentError as ApiError).message ||
          "Unable to post the company comment."
      );
    } finally {
      setCommentSubmitting(false);
    }
  };

  const submitReply = async (
    event: FormEvent,
    parentId: number
  ) => {
    event.preventDefault();

    if (
      !selectedIssue ||
      !replyText.trim()
    ) {
      return;
    }

    try {
      setReplyLoadingId(parentId);
      await companyRequest(
        "/api/company/comments/reply",
        {
          method: "POST",
          body: JSON.stringify({
            issue_id: selectedIssue.id,
            parent_id: parentId,
            content: replyText.trim(),
          }),
        }
      );

      setReplyText("");
      setReplyTarget(null);

      const response = await companyRequest(
        `/api/company/community/issues/${selectedIssue.id}/comments`
      );

      setComments(
        arrayFromResponse(response, [
          "comments",
          "data",
        ]).map(normalizeComment)
      );

      setToast({
        type: "success",
        message: "Reply posted successfully.",
      });
    } catch (replyError) {
      console.error(
        "Company reply error:",
        replyError
      );
      setError(
        (replyError as ApiError).message ||
          "Unable to post the reply."
      );
    } finally {
      setReplyLoadingId(null);
    }
  };

  const submitOfficialResponse = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (
      !selectedIssue ||
      !responseText.trim()
    ) {
      return;
    }

    try {
      setResponseSubmitting(true);
      await companyRequest(
        "/api/company/responses",
        {
          method: "POST",
          body: JSON.stringify({
            issue_id: selectedIssue.id,
            response: responseText.trim(),
          }),
        }
      );

      setResponseText("");

      const response = await companyRequest(
        `/api/company/responses/${selectedIssue.id}`
      );

      setResponses(
        arrayFromResponse(response, [
          "responses",
          "data",
        ])
      );

      setToast({
        type: "success",
        message: "Official response published.",
      });
    } catch (responseError) {
      console.error(
        "Official response error:",
        responseError
      );
      setError(
        (responseError as ApiError).message ||
          "Unable to publish the official response."
      );
    } finally {
      setResponseSubmitting(false);
    }
  };

  const submitStatusRequest = async () => {
    if (
      !selectedIssue ||
      !requestedStatus
    ) {
      return;
    }

    if (
      selectedIssue.status ===
      requestedStatus
    ) {
      setError(
        `Issue is already "${requestedStatus}".`
      );
      return;
    }

    if (pendingRequestForSelectedIssue) {
      setError(
        "A status change request is already pending for this issue."
      );
      return;
    }

    try {
      setStatusSubmitting(true);
      setError("");

      const response = await companyRequest(
        `/api/company/issues/${selectedIssue.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: requestedStatus,
            resolution_note:
              requestedStatus === "Resolved"
                ? resolutionNote.trim() || null
                : null,
          }),
        }
      );

      const newRequest =
        response?.status_request
          ? normalizeRequest(
              response.status_request
            )
          : null;

      if (newRequest) {
        setStatusRequests((current) => [
          newRequest,
          ...current.filter(
            (item) =>
              item.id !== newRequest.id
          ),
        ]);
      } else {
        await loadStatusRequests();
      }

      setRequestedStatus("");
      setResolutionNote("");
      setSuccess(
        "Status change request submitted for admin approval."
      );
      setToast({
        type: "success",
        message: "Status request submitted.",
      });
    } catch (statusError) {
      console.error(
        "Status request error:",
        statusError
      );
      setError(
        (statusError as ApiError).message ||
          "Unable to submit the status request."
      );
    } finally {
      setStatusSubmitting(false);
    }
  };

  const markNotificationRead = async (
    notification: NotificationItem
  ) => {
    if (
      notification.read ||
      notification.is_read
    ) {
      return;
    }

    try {
      await companyRequest(
        `/api/notifications/${notification.id}/read`,
        { method: "PATCH" }
      );
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                read: true,
                is_read: true,
              }
            : item
        )
      );
    } catch (readError) {
      console.error(
        "Notification read error:",
        readError
      );
    }
  };

  const markAllRead = async () => {
    if (unreadCount === 0) {
      return;
    }

    try {
      await companyRequest(
        "/api/notifications/read-all",
        { method: "PATCH" }
      );
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read: true,
          is_read: true,
        }))
      );
      setToast({
        type: "success",
        message: "All notifications marked as read.",
      });
    } catch (readError) {
      console.error(
        "Mark all read error:",
        readError
      );
      setError(
        (readError as ApiError).message ||
          "Unable to mark notifications as read."
      );
    }
  };

  const handleNotificationClick = async (
    notification: NotificationItem
  ) => {
    await markNotificationRead(notification);

    if (!notification.issue_id) {
      setActiveTab("notifications");
      return;
    }

    const ownIssue = issues.find(
      (issue) =>
        issue.id === notification.issue_id
    );

    const communityIssue =
      communityIssues.find(
        (issue) =>
          issue.id === notification.issue_id
      );

    setGlobalSearch("");

    if (ownIssue) {
      setActiveTab("issues");
      await openIssue(ownIssue);
      return;
    }

    if (communityIssue) {
      setActiveTab("community");
      await openIssue(
        communityIssue,
        true
      );
      return;
    }

    try {
      const response = await companyRequest(
        `/api/company/issues/${notification.issue_id}`
      );
      const issue = normalizeIssue(
        response?.issue ??
          response?.data ??
          response
      );
      setActiveTab("issues");
      await openIssue(issue);
    } catch {
      setActiveTab("notifications");
    }
  };

  const openSearchResult = async (
    issue: Issue
  ) => {
    setGlobalSearch("");
    setGlobalSearchResults([]);

    const owned = issues.some(
      (item) => item.id === issue.id
    );

    setActiveTab(
      owned ? "issues" : "community"
    );

    await openIssue(
      owned ?
        issues.find(
          (item) => item.id === issue.id
        ) ?? issue :
        issue,
      !owned
    );
  };

  const signOut = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("company");
    localStorage.removeItem("role");
    router.replace("/login");
  };

  const navigate = (
    tab: DashboardTab
  ) => {
    setActiveTab(tab);
    setSelectedIssue(null);
    setMobileOpen(false);
    setError("");
    setSuccess("");

    if (tab === "community") {
      void loadCommunity();
    }
  };

  const derivedMetrics = useMemo(() => {
    const statusCounts = issues.reduce(
      (acc, issue) => {
        const key = issue.status.toLowerCase();
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const fallbackTotal = issues.length;
    const fallbackResolved = statusCounts.resolved ?? 0;
    const fallbackOpen = statusCounts.open ?? 0;
    const fallbackInProgress = statusCounts['in progress'] ?? 0;
    const fallbackClosed = statusCounts.closed ?? 0;

    const total = numberValue(
      dashboard.total_issues,
      fallbackTotal
    );

    const resolved = numberValue(
      dashboard.resolved_issues,
      fallbackResolved
    );

    const open = numberValue(
      dashboard.open_issues,
      fallbackOpen
    );

    const inProgress = numberValue(
      dashboard.in_progress_issues,
      fallbackInProgress
    );

    const closed = numberValue(
      dashboard.closed_issues,
      fallbackClosed
    );

    const rawRate = optionalNumber(
      dashboard.resolution_rate
    );

    const computedRate =
      rawRate != null && rawRate > 0
        ? rawRate
        : total > 0
        ? (resolved / total) * 100
        : 0;

    const actualResolution = averageActualResolution(issues);
    const estimatedResolution = averageEstimatedResolution(issues);
    const backendAverage = optionalNumber(
      dashboard.average_resolution_days
    );

    const averageResolution =
      backendAverage != null && backendAverage > 0
        ? backendAverage
        : actualResolution > 0
        ? actualResolution
        : estimatedResolution;

    const high = optionalNumber(dashboard.high_severity);
    const critical = optionalNumber(dashboard.critical_severity);

    const highFallback = issues.filter(
      (issue) => issue.severity?.toLowerCase() === 'high'
    ).length;
    const criticalFallback = issues.filter(
      (issue) => issue.severity?.toLowerCase() === 'critical'
    ).length;

    const highCount =
      high != null
        ? high
        : highFallback;
    const criticalCount =
      critical != null
        ? critical
        : criticalFallback;

    const topCategory =
      textValue(
        dashboard.top_category,
        categoryData[0]?.label ?? "—"
      );

    return {
      total,
      resolved,
      open,
      inProgress,
      closed,
      pending: open + inProgress,
      resolutionRate: computedRate,
      averageResolution,
      high: highCount,
      critical: criticalCount,
      topCategory,
    };
  }, [dashboard, issues, categoryData]);

  const dashboardTotal = derivedMetrics.total;
  const dashboardResolved = derivedMetrics.resolved;
  const dashboardPending = derivedMetrics.pending;
  const resolutionRate = derivedMetrics.resolutionRate;

  return (
    <main className="min-h-screen bg-[#F5F5F7] text-[#111827]">
      <Sidebar
        activeTab={activeTab}
        company={company}
        profile={profile}
        pendingCount={pendingRequests.length}
        unreadCount={unreadCount}
        mobileOpen={mobileOpen}
        onCloseMobile={() =>
          setMobileOpen(false)
        }
        onNavigate={navigate}
        onProfile={() => {
          setProfileOpen(true);
          setSettingsOpen(false);
        }}
        onSettings={() => {
          setSettingsOpen(true);
          setProfileOpen(false);
        }}
        onSignOut={signOut}
      />

      <div className="min-h-screen lg:ml-[294px]">
        <Topbar
          profile={profile}
          searchValue={globalSearch}
          searchResults={globalSearchResults}
          searchLoading={globalSearchLoading}
          searchError={globalSearchError}
          unreadCount={unreadCount}
          notifications={notifications}
          onSearchChange={setGlobalSearch}
          onSearchResultClick={openSearchResult}
          onNotificationClick={handleNotificationClick}
          onProfileClick={() => {
            setProfileOpen(true);
            setSettingsOpen(false);
          }}
        />

        <div className="flex items-center justify-between border-b border-[#EEEEF0] bg-[#F5F5F7] px-5 py-3 lg:hidden">
          <button
            type="button"
            onClick={() =>
              setMobileOpen(true)
            }
            className="rounded-full bg-[#111111] px-4 py-2 text-xs font-semibold text-white"
          >
            Open menu
          </button>
          <button
            type="button"
            onClick={refreshAll}
            className="flex items-center gap-2 rounded-full border border-[#E7E7EA] bg-white px-4 py-2 text-xs font-semibold text-[#6B7280]"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        <section className="min-h-[calc(100vh-72px)]">
          <div className="mx-auto w-full max-w-[1500px] px-5 py-7 lg:px-8 lg:py-8">
            {(error || success) && (
              <div className="mb-6 space-y-2">
                {error && (
                  <div className="flex items-start gap-3 rounded-[16px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                    <AlertCircle
                      size={17}
                      className="mt-0.5 shrink-0"
                    />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div className="flex items-start gap-3 rounded-[16px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <CheckCircle2
                      size={17}
                      className="mt-0.5 shrink-0"
                    />
                    <span>{success}</span>
                  </div>
                )}
              </div>
            )}

            {activeTab === "overview" && (
              <>
                <SectionHeader
                  title="Company dashboard"
                  description="A live workspace for managing complaints, official responses, community discussions and administrator-reviewed status changes."
                  right={
                    <button
                      type="button"
                      onClick={refreshAll}
                      disabled={loading}
                      className="flex items-center gap-2 rounded-full border border-[#E7E7EA] bg-white px-4 py-2.5 text-xs font-semibold text-[#6B7280] transition hover:bg-[#F8F8F9] disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2
                          size={14}
                          className="animate-spin"
                        />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      Refresh
                    </button>
                  }
                />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="Total complaints"
                    value={
                      loading
                        ? "—"
                        : dashboardTotal
                    }
                    helper="Across your company"
                    icon={
                      <MessageSquareWarning
                        size={18}
                      />
                  }
                  />
                  <MetricCard
                    label="Resolved"
                    value={
                      loading
                        ? "—"
                        : dashboardResolved
                    }
                    helper="Successfully resolved"
                    icon={
                      <CheckCircle2
                        size={18}
                      />
                    }
                  />
                  <MetricCard
                    label="Needs attention"
                    value={
                      loading
                        ? "—"
                        : dashboardPending
                    }
                    helper="Open + in progress"
                    icon={<Clock3 size={18} />}
                  />
                  <MetricCard
                    label="Resolution rate"
                    value={
                      loading
                        ? "—"
                        : `${resolutionRate}%`
                    }
                    helper="Current platform metric"
                    icon={
                      <TrendingUp size={18} />
                    }
                    dark
                  />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_0.65fr]">
                  <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#A1A5AD]">
                          Attention queue
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-[#111827]">
                          Status requests awaiting review
                        </h2>
                        <p className="mt-1 text-xs text-[#9CA3AF]">
                          Requests are reviewed by an administrator before the issue status changes.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          navigate("status-requests")
                        }
                        className="rounded-full bg-[#111111] px-4 py-2 text-[11px] font-semibold text-white"
                      >
                        View requests
                      </button>
                    </div>

                    {pendingRequests.length === 0 ? (
                      <div className="mt-6 rounded-[18px] bg-[#F8F8F9] p-6 text-center">
                        <CheckCircle2
                          size={24}
                          className="mx-auto text-emerald-500"
                        />
                        <p className="mt-3 text-sm font-semibold text-[#374151]">
                          No pending requests
                        </p>
                        <p className="mt-1 text-xs text-[#9CA3AF]">
                          Your company has no status changes waiting for admin review.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-5 space-y-3">
                        {pendingRequests
                          .slice(0, 4)
                          .map((request) => (
                            <button
                              key={request.id}
                              type="button"
                              onClick={() =>
                                setActiveTab(
                                  "status-requests"
                                )
                              }
                              className="flex w-full items-center gap-4 rounded-[18px] border border-[#EEEEF0] p-4 text-left transition hover:bg-[#FAFAFA]"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#111111] text-white">
                                <ShieldCheck size={17} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-xs font-semibold text-[#111827]">
                                    {request.issue_title ??
                                      `Issue #${request.issue_id}`}
                                  </p>
                                  <span
                                    className={`rounded-full border px-2 py-1 text-[9px] font-semibold ${statusClasses(
                                      request.requested_status
                                    )}`}
                                  >
                                    {request.requested_status}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11px] text-[#8E939C]">
                                  Current status: {request.current_status ?? "Open"} · {relativeTime(request.created_at)}
                                </p>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#A1A5AD]">
                      Workspace health
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-[#111827]">
                      Current activity
                    </h2>

                    <div className="mt-5 space-y-3">
                      <div className="rounded-[16px] bg-[#F8F8F9] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-[#374151]">
                            Company issues
                          </span>
                          <span className="text-lg font-semibold text-[#111827]">
                            {issues.length}
                          </span>
                        </div>
                      </div>
                      <div className="rounded-[16px] bg-[#F8F8F9] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-[#374151]">
                            Pending requests
                          </span>
                          <span className="text-lg font-semibold text-[#111827]">
                            {pendingRequests.length}
                          </span>
                        </div>
                      </div>
                      <div className="rounded-[16px] bg-[#F8F8F9] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-[#374151]">
                            Unread notifications
                          </span>
                          <span className="text-lg font-semibold text-[#111827]">
                            {unreadCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[18px] border border-[#EEEEF0] p-5">
                      <div className="flex items-start gap-3">
                        <Sparkles
                          size={18}
                          className="mt-0.5 text-[#6B7280]"
                        />
                        <div>
                          <p className="text-xs font-semibold text-[#374151]">
                            Community presence
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">
                            Official company responses and respectful community replies help consumers understand how issues are being handled.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-[24px] border border-[#E7E7EA] bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#A1A5AD]">
                        Recent issues
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-[#111827]">
                        Latest complaints connected to your company
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        navigate("issues")
                      }
                      className="text-xs font-semibold text-[#6B7280] hover:text-[#111827]"
                    >
                      View all
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {issues.slice(0, 6).map((issue) => (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() =>
                          openIssue(issue)
                        }
                        className="rounded-[18px] border border-[#EEEEF0] p-4 text-left transition hover:bg-[#FAFAFA]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#111827]">
                              {issue.title}
                            </p>
                            <p className="mt-1 text-[11px] text-[#8E939C]">
                              {issue.category ?? "Uncategorized"} · {relativeTime(issue.created_at)}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-semibold ${statusClasses(
                              issue.status
                            )}`}
                          >
                            {issue.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#A1A5AD]">
                          Complaint trend
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-[#111827]">
                          Monthly complaint volume
                        </h2>
                        <p className="mt-1 text-xs text-[#9CA3AF]">
                          Live analytics for complaints connected to your company.
                        </p>
                      </div>
                      {analyticsLoading && (
                        <Loader2
                          size={16}
                          className="animate-spin text-[#9CA3AF]"
                        />
                      )}
                    </div>
                    <div className="mt-6">
                      <AnalyticsBars data={monthlyData} />
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[#111111] bg-[#111111] p-6 text-white shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-white/45">
                      Platform pulse
                    </p>
                    <h2 className="mt-1 text-xl font-semibold">
                      Company performance snapshot
                    </h2>
                    <div className="mt-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <span className="text-xs text-white/55">Critical issues</span>
                        <span className="text-lg font-semibold">{derivedMetrics.critical}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <span className="text-xs text-white/55">High issues</span>
                        <span className="text-lg font-semibold">{derivedMetrics.high}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <span className="text-xs text-white/55">Avg. resolution</span>
                        <span className="text-lg font-semibold">{derivedMetrics.averageResolution > 0 ? `${derivedMetrics.averageResolution.toFixed(1)}d` : '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/55">Top category</span>
                        <span className="max-w-[170px] truncate text-sm font-semibold">{derivedMetrics.topCategory}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#A1A5AD]">
                      Issue mix
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-[#111827]">
                      Categories
                    </h2>
                    <p className="mt-1 text-xs text-[#9CA3AF]">
                      Where your complaints are concentrated.
                    </p>
                    <div className="mt-6">
                      <AnalyticsList data={categoryData} />
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#A1A5AD]">
                      Customer ratings
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-[#111827]">
                      Rating distribution
                    </h2>
                    <p className="mt-1 text-xs text-[#9CA3AF]">
                      Current rating mix returned by the analytics service.
                    </p>
                    <div className="mt-6">
                      <AnalyticsList data={ratingData} />
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "issues" && (
              <>
                <SectionHeader
                  title="Company issues"
                  description="Search, filter and open complaints assigned to your company."
                />

                <div className="mb-5 rounded-[22px] border border-[#E7E7EA] bg-white p-4">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px]">
                    <div className="relative">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A0A3AA]"
                      />
                      <input
                        value={issueSearch}
                        onChange={(event) =>
                          setIssueSearch(
                            event.target.value
                          )
                        }
                        placeholder="Search your issues..."
                        className="h-11 w-full rounded-full border border-[#E7E7EA] bg-[#FAFAFA] pl-11 pr-4 text-sm outline-none focus:bg-white"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(
                          event.target.value
                        )
                      }
                      className="h-11 rounded-full border border-[#E7E7EA] bg-[#FAFAFA] px-4 text-sm text-[#374151] outline-none"
                    >
                      <option value="All">All statuses</option>
                      {ISSUE_STATUSES.map((status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      ))}
                    </select>
                    <select
                      value={severityFilter}
                      onChange={(event) =>
                        setSeverityFilter(
                          event.target.value
                        )
                      }
                      className="h-11 rounded-full border border-[#E7E7EA] bg-[#FAFAFA] px-4 text-sm text-[#374151] outline-none"
                    >
                      <option value="All">All severity</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                {issuesLoading ? (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {[1, 2, 3, 4].map((item) => (
                      <div
                        key={item}
                        className="h-44 animate-pulse rounded-[24px] bg-white"
                      />
                    ))}
                  </div>
                ) : filteredIssues.length === 0 ? (
                  <EmptyState
                    icon={<Search size={20} />}
                    title="No company issues found"
                    description="Try changing your search or filters."
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {filteredIssues.map((issue) => (
                      <CommunityCard
                        key={issue.id}
                        issue={issue}
                        onOpen={() =>
                          openIssue(issue)
                        }
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === "status-requests" && (
              <>
                <SectionHeader
                  title="Status requests"
                  description="Track every status change requested by your company and see what has been approved or rejected by administrators."
                  right={
                    <button
                      type="button"
                      onClick={() =>
                        loadStatusRequests(true)
                      }
                      className="flex items-center gap-2 rounded-full border border-[#E7E7EA] bg-white px-4 py-2.5 text-xs font-semibold text-[#6B7280]"
                    >
                      <RefreshCw size={14} />
                      Refresh
                    </button>
                  }
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <MetricCard
                    label="Pending"
                    value={pendingRequests.length}
                    helper="Waiting for admin review"
                    icon={<Clock3 size={18} />}
                  />
                  <MetricCard
                    label="Approved"
                    value={
                      statusRequests.filter(
                        (item) =>
                          item.status === "Approved"
                      ).length
                    }
                    helper="Accepted requests"
                    icon={<CheckCircle2 size={18} />}
                  />
                  <MetricCard
                    label="Rejected"
                    value={
                      statusRequests.filter(
                        (item) =>
                          item.status === "Rejected"
                      ).length
                    }
                    helper="Declined requests"
                    icon={<AlertCircle size={18} />}
                  />
                </div>

                <div className="mt-5 rounded-[24px] border border-[#E7E7EA] bg-white p-6">
                  {statusRequestsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((item) => (
                        <div
                          key={item}
                          className="h-24 animate-pulse rounded-[18px] bg-[#F5F5F7]"
                        />
                      ))}
                    </div>
                  ) : statusRequests.length === 0 ? (
                    <EmptyState
                      icon={
                        <ShieldCheck size={21} />
                      }
                      title="No status requests yet"
                      description="When your company asks to change an issue status, the request will appear here."
                    />
                  ) : (
                    <div className="space-y-3">
                      {statusRequests.map((request) => (
                        <div
                          key={request.id}
                          className="rounded-[20px] border border-[#EEEEF0] p-5"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#F5F5F7] text-[#666B74]">
                              <ShieldCheck size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-[#111827]">
                                  {request.issue_title ??
                                    `Issue #${request.issue_id}`}
                                </p>
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold ${statusClasses(
                                    request.status
                                  )}`}
                                >
                                  {request.status}
                                </span>
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold ${statusClasses(
                                    request.requested_status
                                  )}`}
                                >
                                  → {request.requested_status}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-[#8E939C]">
                                Current status: {request.current_status ?? "Open"} · Submitted {relativeTime(request.created_at)}
                              </p>
                              {request.resolution_note && (
                                <p className="mt-2 text-xs leading-5 text-[#6B7280]">
                                  Note: {request.resolution_note}
                                </p>
                              )}
                              {request.review_note && (
                                <p className="mt-2 text-xs leading-5 text-[#6B7280]">
                                  Admin note: {request.review_note}
                                </p>
                              )}
                            </div>
                            {request.reviewed_at && (
                              <div className="text-left lg:text-right">
                                <p className="text-[10px] uppercase tracking-[0.12em] text-[#A0A3AA]">
                                  Reviewed
                                </p>
                                <p className="mt-1 text-xs font-semibold text-[#374151]">
                                  {dateValue(request.reviewed_at)}
                                </p>
                                {request.reviewer_name && (
                                  <p className="mt-1 text-[10px] text-[#9CA3AF]">
                                    by {request.reviewer_name}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === "community" && (
              <>
                <SectionHeader
                  title="Consumer community"
                  description="Discover public issues, see how consumers are discussing them, support problems and respond as the company when appropriate."
                  right={
                    <button
                      type="button"
                      onClick={() =>
                        loadCommunity()
                      }
                      className="flex items-center gap-2 rounded-full border border-[#E7E7EA] bg-white px-4 py-2.5 text-xs font-semibold text-[#6B7280]"
                    >
                      <RefreshCw size={14} />
                      Refresh
                    </button>
                  }
                />

                <div className="mb-6 rounded-[22px] border border-[#E7E7EA] bg-white p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:max-w-[520px]">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A0A3AA]"
                      />
                      <input
                        value={communitySearch}
                        onChange={(event) =>
                          setCommunitySearch(
                            event.target.value
                          )
                        }
                        placeholder="Search community issues..."
                        className="h-11 w-full rounded-full border border-[#E7E7EA] bg-[#FAFAFA] pl-11 pr-4 text-sm outline-none focus:bg-white"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ["trending", "Trending"],
                          ["latest", "Latest"],
                          ["supported", "Most Supported"],
                        ] as Array<[
                          CommunitySort,
                          string
                        ]>
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setCommunitySort(value);
                            void loadCommunity(value);
                          }}
                          className={`rounded-full px-4 py-2.5 text-xs font-semibold transition ${
                            communitySort === value
                              ? "bg-[#111111] text-white"
                              : "border border-[#E7E7EA] bg-white text-[#6B7280] hover:bg-[#F8F8F9]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {communityLoading ? (
                  <div className="grid grid-cols-1 gap-4">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="h-48 animate-pulse rounded-[24px] bg-white"
                      />
                    ))}
                  </div>
                ) : sortedCommunity.length === 0 ? (
                  <EmptyState
                    icon={<MessageCircle size={21} />}
                    title="No community issues found"
                    description="Try another search or refresh the community feed."
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {sortedCommunity.map((issue) => (
                      <CommunityCard
                        key={issue.id}
                        issue={issue}
                        onOpen={() =>
                          openIssue(issue, true)
                        }
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === "notifications" && (
              <>
                <SectionHeader
                  title="Notifications"
                  description="Stay on top of issue activity, official responses and status-request updates."
                  right={
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          loadNotifications(true)
                        }
                        className="flex items-center gap-2 rounded-full border border-[#E7E7EA] bg-white px-4 py-2.5 text-xs font-semibold text-[#6B7280]"
                      >
                        <RefreshCw size={14} />
                        Refresh
                      </button>
                      <button
                        type="button"
                        onClick={markAllRead}
                        disabled={unreadCount === 0}
                        className="rounded-full bg-[#111111] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        Mark all read
                      </button>
                    </div>
                  }
                />

                <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-6">
                  {notificationsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((item) => (
                        <div
                          key={item}
                          className="h-20 animate-pulse rounded-[18px] bg-[#F5F5F7]"
                        />
                      ))}
                    </div>
                  ) : notifications.length === 0 ? (
                    <EmptyState
                      icon={<Bell size={21} />}
                      title="No notifications"
                      description="You are all caught up."
                    />
                  ) : (
                    <div className="divide-y divide-[#EEEEF0]">
                      {notifications.map((notification) => {
                        const unread =
                          !notification.read &&
                          !notification.is_read;

                        return (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() =>
                              handleNotificationClick(
                                notification
                              )
                            }
                            className="flex w-full items-start gap-4 py-5 text-left first:pt-0 last:pb-0"
                          >
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${
                                unread
                                  ? "bg-[#111111] text-white"
                                  : "bg-[#F5F5F7] text-[#9CA3AF]"
                              }`}
                            >
                              <Bell size={17} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-[#111827]">
                                  {notification.title ??
                                    notification.type ??
                                    "Notification"}
                                </p>
                                {unread && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#111111]" />
                                )}
                              </div>
                              <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                                {notification.message ??
                                  "You have a new notification."}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[#B0B3B8]">
                                <span>
                                  {dateValue(
                                    notification.created_at
                                  )}
                                </span>
                                {notification.issue_id && (
                                  <span className="font-semibold text-[#6B7280]">
                                    Open issue
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {selectedIssue && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeIssue();
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-[1060px] overflow-hidden rounded-[28px] border border-[#E7E7EA] bg-[#F8F8F9] shadow-[0_30px_100px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between border-b border-[#E7E7EA] bg-white px-6 py-5">
              <button
                type="button"
                onClick={closeIssue}
                className="flex items-center gap-2 text-xs font-semibold text-[#6B7280] hover:text-[#111827]"
              >
                <ChevronLeft size={16} />
                Back to dashboard
              </button>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#F5F5F7] px-3 py-1.5 text-[10px] font-semibold text-[#6B7280]">
                  Issue #{selectedIssue.id}
                </span>
                <button
                  type="button"
                  onClick={closeIssue}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#9CA3AF] hover:bg-[#F5F5F7]"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(92vh-76px)] overflow-y-auto p-5 lg:p-7">
              {detailLoading ? (
                <div className="space-y-4">
                  <div className="h-40 animate-pulse rounded-[24px] bg-white" />
                  <div className="h-52 animate-pulse rounded-[24px] bg-white" />
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-7">
                    <div className="flex flex-wrap items-center gap-2">
                      <CompanyBadge>
                        {selectedIssue.company}
                      </CompanyBadge>
                      {selectedIssue.category && (
                        <CompanyBadge>
                          {selectedIssue.category}
                        </CompanyBadge>
                      )}
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClasses(
                          selectedIssue.status
                        )}`}
                      >
                        {selectedIssue.status}
                      </span>
                      {selectedIssue.severity && (
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${severityClasses(
                            selectedIssue.severity
                          )}`}
                        >
                          {selectedIssue.severity}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-4 text-[28px] font-semibold tracking-[-0.035em] text-[#111827]">
                      {selectedIssue.title}
                    </h2>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#5B6068]">
                      {selectedIssue.description}
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        ["Supports", selectedIssue.support_count, ThumbsUp],
                        ["Comments", selectedIssue.comment_count, MessageCircle],
                        ["Trending", Math.round(selectedIssue.trending_score || 0), TrendingUp],
                        ["Created", relativeTime(selectedIssue.created_at), Clock3],
                      ].map(([label, value, Icon]) => {
                        const StatIcon = Icon as typeof Clock3;
                        return (
                          <div
                            key={String(label)}
                            className="rounded-[16px] bg-[#F8F8F9] p-4"
                          >
                            <div className="flex items-center gap-2 text-[#9CA3AF]">
                              <StatIcon size={14} />
                              <span className="text-[10px]">
                                {String(label)}
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-semibold text-[#111827]">
                              {String(value)}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {!belongsToCompany && selectedFromCommunity && (
                      <div className="mt-6 rounded-[18px] bg-[#F8F8F9] p-5">
                        <div className="flex items-start gap-3">
                          <Sparkles
                            size={18}
                            className="mt-0.5 text-[#6B7280]"
                          />
                          <div>
                            <p className="text-xs font-semibold text-[#374151]">
                              Community issue
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">
                              You can join the public discussion as the company account. Official responses and company replies should remain relevant to the issue.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {belongsToCompany && (
                    <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-7">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#F5F5F7] text-[#666B74]">
                          <Send size={19} />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-[#111827]">
                            Official company response
                          </h3>
                          <p className="mt-1 text-xs text-[#9CA3AF]">
                            Publish an official response visible in the consumer issue view.
                          </p>
                        </div>
                      </div>

                      {responses.length > 0 && (
                        <div className="mt-5 space-y-3">
                          {responses.map((response, index) => (
                            <div
                              key={`${response.id ?? index}-${response.created_at ?? index}`}
                              className="rounded-[18px] border border-[#EEEEF0] bg-[#FAFAFA] p-5"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold text-[#111827]">
                                  {response.company ?? company?.name ?? "Company"}
                                </span>
                                <span className="text-[10px] text-[#B0B3B8]">
                                  {dateValue(response.created_at)}
                                </span>
                              </div>
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#4B5563]">
                                {response.response}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      <form
                        onSubmit={submitOfficialResponse}
                        className="mt-5 rounded-[18px] border border-[#E7E7EA] bg-[#FAFAFA] p-4"
                      >
                        <textarea
                          value={responseText}
                          onChange={(event) =>
                            setResponseText(
                              event.target.value
                            )
                          }
                          rows={5}
                          placeholder="Write a clear official company response..."
                          className="w-full resize-none bg-transparent text-sm leading-6 text-[#111827] outline-none placeholder:text-[#A0A3AA]"
                        />
                        <div className="mt-3 flex justify-end">
                          <button
                            type="submit"
                            disabled={
                              responseSubmitting ||
                              !responseText.trim()
                            }
                            className="flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {responseSubmitting ? (
                              <Loader2
                                size={14}
                                className="animate-spin"
                              />
                            ) : (
                              <Send size={14} />
                            )}
                            Publish response
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-7">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#F5F5F7] text-[#666B74]">
                        <ShieldCheck size={19} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-[#111827]">
                          Status governance
                        </h3>
                        <p className="mt-1 text-xs text-[#9CA3AF]">
                          Status changes are requested by the company and finalized only after administrator approval.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A1A5AD]">
                          Requested status
                        </label>
                        <select
                          value={requestedStatus}
                          onChange={(event) =>
                            setRequestedStatus(
                              event.target.value as IssueStatus
                            )
                          }
                          disabled={
                            statusSubmitting ||
                            Boolean(
                              pendingRequestForSelectedIssue
                            )
                          }
                          className="h-11 w-full rounded-full border border-[#E7E7EA] bg-[#FAFAFA] px-4 text-sm outline-none"
                        >
                          <option value="">
                            Choose a new status
                          </option>
                          {ISSUE_STATUSES.map((status) => (
                            <option
                              key={status}
                              value={status}
                            >
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={submitStatusRequest}
                        disabled={
                          statusSubmitting ||
                          !requestedStatus ||
                          Boolean(
                            pendingRequestForSelectedIssue
                          )
                        }
                        className="h-11 rounded-full bg-[#111111] px-5 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        {statusSubmitting
                          ? "Submitting..."
                          : "Request change"}
                      </button>
                    </div>

                    {requestedStatus === "Resolved" && (
                      <textarea
                        value={resolutionNote}
                        onChange={(event) =>
                          setResolutionNote(
                            event.target.value
                          )
                        }
                        rows={3}
                        placeholder="Optional resolution note..."
                        className="mt-3 w-full resize-none rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] p-4 text-sm outline-none"
                      />
                    )}

                    {pendingRequestForSelectedIssue && (
                      <div className="mt-4 rounded-[16px] border border-amber-100 bg-amber-50 p-4">
                        <p className="text-xs font-semibold text-amber-800">
                          Pending request already exists
                        </p>
                        <p className="mt-1 text-xs leading-5 text-amber-700">
                          Requested: {pendingRequestForSelectedIssue.requested_status}. Awaiting administrator review.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-7">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#F5F5F7] text-[#666B74]">
                        <MessageCircle size={19} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-[#111827]">
                          Community discussion
                        </h3>
                        <p className="mt-1 text-xs text-[#9CA3AF]">
                          Read, reply and add an official company perspective to the discussion.
                        </p>
                      </div>
                    </div>

                    <form
                      onSubmit={submitCompanyComment}
                      className="mt-5 rounded-[18px] border border-[#EEEEF0] bg-[#FAFAFA] p-4"
                    >
                      <textarea
                        value={commentText}
                        onChange={(event) =>
                          setCommentText(
                            event.target.value
                          )
                        }
                        rows={4}
                        placeholder="Write a company comment..."
                        className="w-full resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-[#A0A3AA]"
                      />
                      <div className="mt-3 flex justify-end">
                        <button
                          type="submit"
                          disabled={
                            commentSubmitting ||
                            !commentText.trim()
                          }
                          className="flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {commentSubmitting ? (
                            <Loader2
                              size={14}
                              className="animate-spin"
                            />
                          ) : (
                            <MessageCircle size={14} />
                          )}
                          Post comment
                        </button>
                      </div>
                    </form>

                    <CommentThread
                      comments={comments}
                      replyTarget={replyTarget}
                      replyText={replyText}
                      replyLoading={
                        replyLoadingId !== null
                      }
                      expandedReplies={
                        expandedReplies
                      }
                      onReplyTarget={setReplyTarget}
                      onReplyText={setReplyText}
                      onSubmitReply={submitReply}
                      onToggleReplies={(id) =>
                        setExpandedReplies(
                          (current) => ({
                            ...current,
                            [id]: !current[id],
                          })
                        )
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[130] max-w-[360px] rounded-[16px] border border-[#E7E7EA] bg-white px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.14)]">
          <div className="flex items-start gap-3">
            {toast.type === "success" ? (
              <CheckCircle2
                size={17}
                className="mt-0.5 text-emerald-500"
              />
            ) : (
              <AlertCircle
                size={17}
                className="mt-0.5 text-red-500"
              />
            )}
            <p className="text-xs font-medium leading-5 text-[#374151]">
              {toast.message}
            </p>
          </div>
        </div>
      )}

      <ProfileSettingsModal
        profile={profile}
        company={company}
        openProfile={profileOpen}
        openSettings={settingsOpen}
        onClose={() => {
          setProfileOpen(false);
          setSettingsOpen(false);
        }}
      />
    </main>
  );
}
