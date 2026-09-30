"use client";
import { Activity, AlertCircle, BarChart3, Bell, Building2, Check, CheckCircle2, ChevronDown, ChevronRight, Clock3, Eye, FileText, Hash, History, LayoutDashboard, Loader2, Lock, LogOut, Mail, Menu, Moon, MessageCircle, MessageSquare, RefreshCw, Search, Settings, ShieldAlert, ShieldCheck, Trash2, User, Users, X, } from "lucide-react";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
const STATUSES = ["Open", "In Progress", "Resolved", "Closed"] as const;
type AdminView = "overview" | "status-requests" | "community" | "users" | "companies" | "issues" | "comments" | "logs";
type Toast = {
    type: "success" | "error";
    message: string;
} | null;
type UserRow = {
    id: number;
    name: string;
    email: string;
    role: string;
    is_blocked: boolean;
    created_at?: string;
};
type CompanyRow = {
    id: number;
    name: string;
    email?: string;
    is_blocked: boolean;
    created_at?: string;
};
type IssueRow = {
    id: number;
    title: string;
    description: string;
    company: string;
    company_id?: number;
    user_id?: number;
    category?: string | null;
    severity?: string | null;
    status: string;
    support_count: number;
    comment_count: number;
    trending_score?: number;
    duplicate_score?: number | null;
    estimated_resolution_days?: number | null;
    resolution_note?: string | null;
    resolution_days?: number | null;
    resolved_at?: string | null;
    created_at?: string;
    updated_at?: string;
    is_deleted: boolean;
};
type CommentRow = {
    id: number;
    content: string;
    issue_id?: number;
    user_id?: number;
    company_id?: number;
    user_name: string;
    author_type?: string;
    parent_id?: number | null;
    is_deleted: boolean;
    created_at?: string;
};
type LogRow = {
    id: number;
    action: string;
    entity_type?: string;
    entity_id?: number;
    admin_id?: number;
    admin_name?: string;
    details?: string;
    created_at?: string;
};
type RequestRow = {
    id: number;
    issue_id: number;
    company_id: number;
    requested_status: string;
    resolution_note?: string | null;
    status: string;
    created_at?: string;
    reviewed_at?: string | null;
    reviewed_by?: number | null;
    review_note?: string | null;
    issue?: Partial<IssueRow> | null;
    company?: Partial<CompanyRow> | null;
    company_name?: string | null;
    issue_title?: string | null;
    current_status?: string | null;
    reviewer_name?: string | null;
};
type Detail = {
    type: "user" | "company" | "issue" | "comment" | "log" | "status-request";
    title: string;
    data: any;
};
type Overview = Record<string, any>;
type ChartPoint = {
    label: string;
    value: number;
};
function arr(response: any, keys: string[]) {
    for (const k of keys)
        if (Array.isArray(response?.[k]))
            return response[k];
    if (Array.isArray(response))
        return response;
    if (Array.isArray(response?.data))
        return response.data;
    return [];
}
function num(v: any, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function averageResolutionDays(items: IssueRow[]) {
    const actualValues = items.map((issue) => {
        if (issue.resolution_days != null && Number.isFinite(Number(issue.resolution_days)) && Number(issue.resolution_days) >= 0) {
            return Number(issue.resolution_days);
        }
        if (issue.resolved_at && issue.created_at) {
            const start = new Date(issue.created_at).getTime();
            const end = new Date(issue.resolved_at).getTime();
            if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
                return (end - start) / 86400000;
            }
        }
        return null;
    }).filter((value): value is number => value != null);

    if (actualValues.length) {
        return actualValues.reduce((sum, value) => sum + value, 0) / actualValues.length;
    }

    // Some issue payloads expose only the estimated resolution time.
    // Use those values as a reliable fallback instead of showing an empty dash.
    const estimatedValues = items
        .map((issue) => {
            const value = Number(issue.estimated_resolution_days);
            return Number.isFinite(value) && value >= 0 ? value : null;
        })
        .filter((value): value is number => value != null);

    if (!estimatedValues.length) return null;
    return estimatedValues.reduce((sum, value) => sum + value, 0) / estimatedValues.length;
}
function text(v: any, f = "—") { return v === null || v === undefined || String(v).trim() === "" ? f : String(v); }
function date(v?: string | null) {
    if (!v)
        return "—";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function ago(v?: string | null) {
    if (!v)
        return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime()))
        return "";
    const m = Math.floor(Math.max(0, Date.now() - d.getTime()) / 60000);
    if (m < 1)
        return "Just now";
    if (m < 60)
        return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)
        return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 7)
        return `${days}d ago`;
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
function initial(v: string) { return (v.trim().charAt(0) || "A").toUpperCase(); }
function statusClass(v?: string) {
    switch ((v || "").toLowerCase()) {
        case "resolved":
        case "approved": return "border-emerald-100 bg-emerald-50 text-emerald-700";
        case "in progress":
        case "pending": return "border-blue-100 bg-blue-50 text-blue-700";
        case "rejected":
        case "blocked": return "border-red-100 bg-red-50 text-red-700";
        case "closed": return "border-zinc-200 bg-zinc-100 text-zinc-700";
        default: return "border-amber-100 bg-amber-50 text-amber-700";
    }
}
function severityClass(v?: string | null) {
    switch ((v || "").toLowerCase()) {
        case "critical": return "border-red-100 bg-red-50 text-red-700";
        case "high": return "border-orange-100 bg-orange-50 text-orange-700";
        case "medium": return "border-amber-100 bg-amber-50 text-amber-700";
        default: return "border-slate-100 bg-slate-50 text-slate-600";
    }
}
function normalizeUser(x: any): UserRow { return { ...x, id: num(x?.id), name: text(x?.name ?? x?.full_name ?? x?.username, "Unnamed user"), email: text(x?.email, "No email"), role: text(x?.role, "User"), is_blocked: Boolean(x?.is_blocked ?? x?.blocked ?? x?.status === "Blocked"), created_at: x?.created_at }; }
function normalizeCompany(x: any): CompanyRow { return { ...x, id: num(x?.id), name: text(x?.name ?? x?.company_name, "Unnamed company"), email: x?.email ?? x?.contact_email, is_blocked: Boolean(x?.is_blocked ?? x?.blocked ?? x?.status === "Blocked"), created_at: x?.created_at }; }
function normalizeIssue(x: any): IssueRow { return { ...x, id: num(x?.id), title: text(x?.title, "Untitled issue"), description: text(x?.description, "No description"), company: text(x?.company ?? x?.company_name, "Unknown company"), company_id: x?.company_id, user_id: x?.user_id, category: x?.category ?? null, severity: x?.severity ?? null, status: text(x?.status, "Open"), support_count: num(x?.support_count ?? x?.supports), comment_count: num(x?.comment_count ?? x?.comments), trending_score: num(x?.trending_score), duplicate_score: x?.duplicate_score == null ? null : num(x?.duplicate_score), estimated_resolution_days: x?.estimated_resolution_days == null ? null : num(x?.estimated_resolution_days), resolution_note: x?.resolution_note ?? null, resolution_days: x?.resolution_days == null ? null : num(x?.resolution_days), resolved_at: x?.resolved_at ?? null, created_at: x?.created_at, updated_at: x?.updated_at, is_deleted: Boolean(x?.is_deleted ?? x?.deleted) }; }
;
function normalizeComment(x: any): CommentRow { return { ...x, id: num(x?.id), content: text(x?.content, ""), issue_id: x?.issue_id, user_id: x?.user_id, company_id: x?.company_id, user_name: text(x?.user_name ?? x?.author_name ?? x?.name ?? x?.username ?? x?.email, "Unknown"), author_type: x?.author_type, parent_id: x?.parent_id ?? null, is_deleted: Boolean(x?.is_deleted ?? x?.deleted), created_at: x?.created_at }; }
function normalizeLog(x: any): LogRow { return { ...x, id: num(x?.id), action: text(x?.action ?? x?.event, "Unknown action"), entity_type: x?.entity_type ?? x?.resource_type, entity_id: x?.entity_id ?? x?.resource_id, admin_id: x?.admin_id, admin_name: x?.admin_name ?? x?.user_name ?? x?.user?.name, details: x?.details ?? x?.message, created_at: x?.created_at }; }
function normalizeRequest(x: any): RequestRow { return { ...x, id: num(x?.id), issue_id: num(x?.issue_id ?? x?.issue?.id), company_id: num(x?.company_id ?? x?.company?.id), requested_status: text(x?.requested_status, "Open"), resolution_note: x?.resolution_note ?? null, status: text(x?.status, "Pending"), created_at: x?.created_at, reviewed_at: x?.reviewed_at ?? null, reviewed_by: x?.reviewed_by ?? null, review_note: x?.review_note ?? null, issue: x?.issue ?? null, company: x?.company ?? null, company_name: x?.company_name ?? x?.company?.name ?? null, issue_title: x?.issue_title ?? x?.issue?.title ?? null, current_status: x?.current_status ?? x?.issue?.status ?? null, reviewer_name: x?.reviewer_name ?? null }; }
function Pill({ children, className = "" }: {
    children?: ReactNode;
    className?: string;
}) { return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${className}`}>{children}</span>; }
function Metric({ icon, label, value, detail, dark = false }: {
    icon: ReactNode;
    label: string;
    value: string | number;
    detail: string;
    dark?: boolean;
}) { return <div className={`rounded-[24px] border p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] ${dark ? "border-[#111111] bg-[#111111] text-white" : "border-[#E7E8EB] bg-white text-[#111827]"}`}><div className="flex items-start justify-between gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${dark ? "bg-white/10" : "bg-[#F5F5F7] text-[#666B74]"}`}>{icon}</div><span className={`text-[10px] uppercase tracking-[0.16em] ${dark ? "text-white/45" : "text-[#A1A5AD]"}`}>Admin</span></div><p className={`mt-5 text-xs ${dark ? "text-white/50" : "text-[#9CA0A8]"}`}>{label}</p><p className="mt-1 text-[30px] font-semibold tracking-[-0.04em]">{value}</p><p className={`mt-1 text-xs ${dark ? "text-white/55" : "text-[#9CA0A8]"}`}>{detail}</p></div>; }
function Header({ title, desc, action }: {
    title: string;
    desc?: string;
    action?: ReactNode;
}) { return <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A1A5AD]">ConsumerConnect / Administration</p><h1 className="mt-1 text-[30px] font-semibold tracking-[-0.04em]">{title}</h1>{desc && <p className="mt-1 max-w-3xl text-sm text-[#8E939C]">{desc}</p>}</div>{action}</div>; }
function ProfileSettingsModal({ profile, open, settingsOpen, onClose, onSignOut, roleLabel, }: {
    profile: {
        id?: number;
        name?: string;
        email?: string;
        role?: string;
    } | null;
    open: boolean;
    settingsOpen: boolean;
    onClose: () => void;
    onSignOut: () => void;
    roleLabel: string;
}) {
    if (!open && !settingsOpen)
        return null;
    const name = text(profile?.name, roleLabel);
    const email = text(profile?.email, "Not available");
    const role = text(profile?.role, roleLabel);
    const first = initial(name);
    return (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-5 backdrop-blur-[2px]" onMouseDown={(event) => {
            if (event.target === event.currentTarget)
                onClose();
        }}>
      <div className="w-full max-w-[720px] max-h-[90vh] overflow-y-auto rounded-[28px] border border-[#E7E7EA] bg-white shadow-[0_30px_100px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between border-b border-[#EEEEF0] px-7 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#F5F5F7] text-[#6B7280]">
              {settingsOpen && !open ? <Settings size={19}/> : <User size={19}/>}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">
                {settingsOpen && !open ? "Settings" : "Profile"}
              </h2>
              <p className="mt-0.5 text-xs text-[#9CA3AF]">
                {settingsOpen && !open
            ? "Manage your dashboard preferences."
            : "Your ConsumerConnect account details."}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-[#9CA3AF] transition hover:bg-[#F5F5F7] hover:text-[#111827]">
            <X size={18}/>
          </button>
        </div>

        {settingsOpen && !open ? (<div className="space-y-3 p-7">
            {[
                [Settings, "Dashboard preferences", "Manage the way your dashboard behaves.", "Active"],
                [Bell, "Notifications", "Show complaint, response and discussion activity.", "Enabled"],
                [Search, "Global search", "Search issues from anywhere in the dashboard.", "Active"],
                [Moon, "Appearance", "Use the same light visual system across ConsumerConnect.", "Light"],
            ].map(([Icon, title, description, state]) => (<div key={String(title)} className="flex items-center justify-between rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F5F5F7] text-[#6B7280]">
                    <Icon size={18}/>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">{String(title)}</p>
                    <p className="mt-1 text-xs text-[#9CA3AF]">{String(description)}</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#F5F5F7] px-3 py-1 text-[10px] font-semibold text-[#6B7280]">
                  {String(state)}
                </span>
              </div>))}
            <div className="mt-2 flex items-center gap-3 rounded-[18px] bg-[#F8F8F9] p-5">
              <Lock size={17} className="text-emerald-500"/>
              <div>
                <p className="text-xs font-semibold text-[#374151]">Account security</p>
                <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">
                  Authenticated access is required for this workspace.
                </p>
              </div>
            </div>
          </div>) : (<div className="p-7">
            <div className="flex flex-col items-center rounded-[22px] bg-[#F8F8F9] px-6 py-8 text-center">
              <div className="flex h-[82px] w-[82px] items-center justify-center rounded-full bg-[#E7E8EA] text-2xl font-semibold text-[#4B5563]">
                {first}
              </div>
              <h3 className="mt-4 text-[20px] font-semibold text-[#111827]">{name}</h3>
              <p className="mt-1 text-sm text-[#9CA3AF]">{email}</p>
              <span className="mt-3 rounded-full bg-white px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] shadow-sm">
                {role}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-2">
                  <User size={15} className="text-[#9CA3AF]"/>
                  <p className="text-xs text-[#9CA3AF]">Name</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#111827]">{name}</p>
              </div>
              <div className="rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-2">
                  <Mail size={15} className="text-[#9CA3AF]"/>
                  <p className="text-xs text-[#9CA3AF]">Email</p>
                </div>
                <p className="mt-2 break-words text-sm font-semibold text-[#111827]">{email}</p>
              </div>
              <div className="rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className="text-[#9CA3AF]"/>
                  <p className="text-xs text-[#9CA3AF]">Account type</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#111827]">{role}</p>
              </div>
              <div className="rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-2">
                  <Hash size={15} className="text-[#9CA3AF]"/>
                  <p className="text-xs text-[#9CA3AF]">Account ID</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#111827]">{profile?.id ?? "—"}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[18px] bg-[#F8F8F9] p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck size={18} className="mt-0.5 text-emerald-500"/>
                <div>
                  <p className="text-xs font-semibold text-[#374151]">Authenticated workspace</p>
                  <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">
                    Your role controls which dashboard actions are available.
                  </p>
                </div>
              </div>
            </div>

            <button type="button" onClick={onSignOut} className="mt-5 flex w-full items-center justify-center gap-2 rounded-[16px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100">
              <LogOut size={17}/>
              Sign out
            </button>
          </div>)}
      </div>
    </div>);
}
function RoleSidebar({ role, subtitle, activeId, items, profile, unread, onNavigate, onProfile, onSettings, onSignOut, }: {
    role: string;
    subtitle: string;
    activeId: string;
    items: Array<{
        id: string;
        label: string;
        icon: ReactNode;
        badge?: number;
    }>;
    profile: {
        name?: string;
        email?: string;
    } | null;
    unread?: number;
    onNavigate: (id: any) => void;
    onProfile: () => void;
    onSettings: () => void;
    onSignOut: () => void;
}) {
    const name = text(profile?.name, role);
    return (<aside className="fixed left-0 top-0 z-40 hidden h-screen w-[294px] shrink-0 border-r border-[#E7E8EB] bg-white lg:flex lg:flex-col">
      <div className="px-6 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-[#111111] text-white shadow-[0_8px_20px_rgba(17,17,17,0.12)]">
            <ShieldCheck size={19}/>
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold tracking-[-0.01em]">ConsumerConnect</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A0A4AC]">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="px-4">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#B0B3BA]">Workspace</p>
        <nav className="space-y-1.5">
          {items.map((item) => (<button key={item.id} type="button" onClick={() => onNavigate(item.id)} className={`flex w-full items-center gap-3 rounded-[15px] px-3.5 py-3 text-left text-sm font-medium transition ${activeId === item.id
                ? "bg-[#111111] text-white shadow-[0_8px_18px_rgba(17,17,17,0.13)]"
                : "text-[#666B74] hover:bg-[#F6F6F8] hover:text-[#111827]"}`}>
              <span className="shrink-0">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge ? (<span className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[9px] font-bold ${activeId === item.id ? "bg-white text-[#111111]" : "bg-[#111111] text-white"}`}>
                  {item.badge}
                </span>) : null}
            </button>))}
        </nav>
      </div>

      <div className="mt-auto px-4 pb-5">
        <div className="rounded-[20px] border border-[#E7E8EB] bg-[#FAFAFB] p-4">
          <button type="button" onClick={onProfile} className="flex w-full items-center gap-3 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111111] text-xs font-semibold text-white">
              {initial(name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#111827]">{name}</p>
              <p className="truncate text-[10px] text-[#9DA1A9]">{text(profile?.email, "")}</p>
            </div>
            <ChevronDown size={15} className="text-[#9DA1A9]"/>
          </button>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={onSettings} className="flex items-center justify-center gap-2 rounded-xl border border-[#E5E6E9] bg-white py-2.5 text-[10px] font-semibold text-[#666B74] hover:bg-[#F6F6F8]">
              <Settings size={14}/> Settings
            </button>
            <button type="button" onClick={onSignOut} className="flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 py-2.5 text-[10px] font-semibold text-red-700 hover:bg-red-100">
              <LogOut size={14}/> Sign out
            </button>
          </div>
        </div>
      </div>
    </aside>);
}
export default function AdminDashboardPage() {
    const router = useRouter();
    const [view, setView] = useState<AdminView>("overview");
    const [overview, setOverview] = useState<Overview>({});
    const [resolutionStats, setResolutionStats] = useState<{ average_predicted_resolution_days?: number }>({});
    const [categories, setCategories] = useState<ChartPoint[]>([]);
    const [severity, setSeverity] = useState<ChartPoint[]>([]);
    const [monthly, setMonthly] = useState<ChartPoint[]>([]);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [companies, setCompanies] = useState<CompanyRow[]>([]);
    const [issues, setIssues] = useState<IssueRow[]>([]);
    const [comments, setComments] = useState<CommentRow[]>([]);
    const [logs, setLogs] = useState<LogRow[]>([]);
    const [requests, setRequests] = useState<RequestRow[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [toast, setToast] = useState<Toast>(null);
    const [detail, setDetail] = useState<Detail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [review, setReview] = useState<{
        id: number;
        decision: "approve" | "reject";
    } | null>(null);
    const [reviewNote, setReviewNote] = useState("");
    const [actionId, setActionId] = useState<number | null>(null);
    const [statusId, setStatusId] = useState<number | null>(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [globalSearch, setGlobalSearch] = useState("");
    const [globalResults, setGlobalResults] = useState<IssueRow[]>([]);
    const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
    const [communitySort, setCommunitySort] = useState<"trending" | "latest" | "supported">("trending");
    const [communitySearch, setCommunitySearch] = useState("");
    const pending = useMemo(() => requests.filter(r => r.status.toLowerCase() === "pending"), [requests]);
    const fallbackTotalIssues = issues.length;
    const fallbackOpenIssues = issues.filter((issue) => issue.status.toLowerCase() === "open" || issue.status.toLowerCase() === "in progress").length;
    const fallbackResolvedIssues = issues.filter((issue) => issue.status.toLowerCase() === "resolved").length;
    const totalIssues = num(overview.total_issues, fallbackTotalIssues);
    const openIssues = num(overview.open_issues, fallbackOpenIssues);
    const resolved = num(overview.resolved_issues, fallbackResolvedIssues);
    const blockedUsers = num(overview.blocked_users);
    const blockedCompanies = num(overview.blocked_companies);
    const derivedResolutionRate = Number.isFinite(Number(overview.resolution_rate)) && Number(overview.resolution_rate) > 0
        ? Number(overview.resolution_rate)
        : (totalIssues > 0 ? (resolved / totalIssues) * 100 : 0);
    const severityCritical = num(overview.critical_issues ?? overview.critical_severity, severity.find((item) => item.label.toLowerCase() === "critical")?.value ?? 0);
    const severityHigh = num(overview.high_severity, severity.find((item) => item.label.toLowerCase() === "high")?.value ?? 0);
    const derivedTopCategory = text(overview.top_category, categories.length ? [...categories].sort((a, b) => b.value - a.value)[0]?.label ?? "—" : "—");
    const userDashboardAverageResolution = Number(resolutionStats.average_predicted_resolution_days);
    const backendAverageResolution = [overview.average_resolution_days, overview.average_predicted_resolution_days, overview.avg_resolution_days]
        .map((value) => Number(value))
        .find((value) => Number.isFinite(value) && value > 0);
    const derivedAverageResolution = averageResolutionDays(issues);
    const averageResolution = Number.isFinite(userDashboardAverageResolution) && userDashboardAverageResolution >= 0
        ? userDashboardAverageResolution
        : (backendAverageResolution ?? derivedAverageResolution);
    const filteredUsers = useMemo(() => users.filter(u => !search || `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase())), [users, search]);
    const filteredCompanies = useMemo(() => companies.filter(c => !search || `${c.name} ${c.email ?? ""}`.toLowerCase().includes(search.toLowerCase())), [companies, search]);
    const filteredIssues = useMemo(() => issues.filter(i => (statusFilter === "All" || i.status === statusFilter) && (!search || `${i.title} ${i.description} ${i.company} ${i.category ?? ""}`.toLowerCase().includes(search.toLowerCase()))), [issues, search, statusFilter]);
    const filteredComments = useMemo(() => comments.filter(c => !search || `${c.content} ${c.user_name} ${c.issue_id ?? ""}`.toLowerCase().includes(search.toLowerCase())), [comments, search]);
    const communityIssues = useMemo(() => {
        const q = communitySearch.trim().toLowerCase();
        return [...issues]
            .filter(i => !q || `${i.title} ${i.description} ${i.company} ${i.category ?? ""}`.toLowerCase().includes(q))
            .sort((a, b) => {
            if (communitySort === "supported")
                return b.support_count - a.support_count || b.comment_count - a.comment_count;
            if (communitySort === "latest")
                return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
            return (b.support_count + b.comment_count * 0.5) - (a.support_count + a.comment_count * 0.5);
        })
            .slice(0, 20);
    }, [issues, communitySearch, communitySort]);
    const communityComments = useMemo(() => [...comments].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()).slice(0, 10), [comments]);
    const showToast = useCallback((type: "success" | "error", message: string) => { setToast({ type, message }); window.setTimeout(() => setToast(null), 3500); }, []);
    const handleError = useCallback((e: unknown, fallback: string) => {
        const err = e as any;
        if (err?.status === 401) {
            router.replace("/login");
            return;
        }
        showToast("error", err?.message || fallback);
    }, [router, showToast]);
    const points = useCallback((response: any, arrayKeys: string[], labels: string[], values: string[]) => arr(response, arrayKeys).map((x: any, i: number) => ({ label: text(labels.map(k => x?.[k]).find(v => v !== undefined && v !== null), `Item ${i + 1}`), value: num(values.map(k => x?.[k]).find(v => v !== undefined && v !== null)) })), []);
    const loadProfile = useCallback(async () => {
        try {
            const r = await apiRequest("/api/auth/profile");
            setProfile(r?.user ?? r?.profile ?? r?.data ?? r);
        }
        catch (e) {
            handleError(e, "Unable to load admin profile.");
        }
    }, [handleError]);
    const loadOverview = useCallback(async () => {
        setLoading(true);
        const endpoints: [
            string,
            (x: any) => void
        ][] = [
            ["/api/admin/dashboard/overview", r => setOverview(r?.overview ?? r?.dashboard ?? r?.data ?? r ?? {})],
            ["/api/dashboard/resolution-statistics", r => setResolutionStats(r?.data ?? r?.resolution_statistics ?? r ?? {})],
            ["/api/admin/dashboard/categories", r => setCategories(points(r, ["categories", "data"], ["category", "name", "label"], ["count", "value", "total"]))],
            ["/api/admin/dashboard/severity", r => setSeverity(points(r, ["severity", "data"], ["severity", "name", "label"], ["count", "value", "total"]))],
            ["/api/admin/dashboard/monthly-trends", r => setMonthly(points(r, ["monthly_trends", "trends", "data"], ["label", "month", "name"], ["count", "value", "total"]))],
            ["/api/admin/issues", r => setIssues(arr(r, ["issues", "data"]).map(normalizeIssue))],
        ];
        try {
            await Promise.allSettled(endpoints.map(async ([path, setter]) => { const r = await apiRequest(path); setter(r); }));
            await loadRequests(true);
        }
        catch (e) {
            handleError(e, "Unable to load admin overview.");
        }
        finally {
            setLoading(false);
        }
    }, [handleError, points]);
    const loadView = useCallback(async (v: AdminView) => {
        setLoading(true);
        try {
            if (v === "users") {
                const r = await apiRequest("/api/admin/users");
                setUsers(arr(r, ["users", "data"]).map(normalizeUser));
            }
            if (v === "companies") {
                const r = await apiRequest("/api/admin/companies");
                setCompanies(arr(r, ["companies", "data"]).map(normalizeCompany));
            }
            if (v === "issues") {
                const r = await apiRequest("/api/admin/issues");
                setIssues(arr(r, ["issues", "data"]).map(normalizeIssue));
            }
            if (v === "comments") {
                const r = await apiRequest("/api/admin/comments");
                setComments(arr(r, ["comments", "data"]).map(normalizeComment));
            }
            if (v === "logs") {
                const r = await apiRequest("/api/admin/logs");
                setLogs(arr(r, ["logs", "data"]).map(normalizeLog));
            }
            if (v === "status-requests") {
                const r = await apiRequest("/api/admin/status-requests");
                setRequests(arr(r, ["status_requests", "requests", "data"]).map(normalizeRequest));
            }
            if (v === "community") {
                const [issueR, commentR] = await Promise.allSettled([apiRequest("/api/issues/community?limit=100&sort=latest"), apiRequest("/api/admin/comments")]);
                if (issueR.status === "fulfilled")
                    setIssues(arr(issueR.value, ["issues", "data"]).map(normalizeIssue));
                if (commentR.status === "fulfilled")
                    setComments(arr(commentR.value, ["comments", "data"]).map(normalizeComment));
            }
        }
        catch (e) {
            handleError(e, `Unable to load ${v}.`);
        }
        finally {
            setLoading(false);
        }
    }, [handleError]);
    const loadRequests = useCallback(async (quiet = false) => {
        try {
            const r = await apiRequest("/api/admin/status-requests");
            setRequests(arr(r, ["status_requests", "requests", "data"]).map(normalizeRequest));
        }
        catch (e) {
            if (!quiet)
                handleError(e, "Unable to load status requests.");
        }
    }, [handleError]);
    useEffect(() => { void loadProfile(); void loadOverview(); }, [loadProfile, loadOverview]);
    useEffect(() => {
        if (view !== "overview")
            void loadView(view);
    }, [view, loadView]);
    useEffect(() => { const t = window.setInterval(() => { void loadRequests(true); }, 20000); return () => window.clearInterval(t); }, [loadRequests]);
    const signOut = useCallback(() => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("access_token");
            localStorage.removeItem("company");
        }
        router.replace("/login");
    }, [router]);
    useEffect(() => {
        const query = globalSearch.trim();
        if (query.length < 2) {
            setGlobalResults([]);
            setGlobalSearchLoading(false);
            return;
        }
        let cancelled = false;
        const timer = window.setTimeout(async () => {
            try {
                setGlobalSearchLoading(true);
                const response = await apiRequest(`/api/issues/search?search=${encodeURIComponent(query)}`);
                const rows = arr(response, ["issues", "data"]).map(normalizeIssue);
                if (!cancelled)
                    setGlobalResults(rows.slice(0, 8));
            }
            catch {
                if (!cancelled)
                    setGlobalResults([]);
            }
            finally {
                if (!cancelled)
                    setGlobalSearchLoading(false);
            }
        }, 280);
        return () => { cancelled = true; window.clearTimeout(timer); };
    }, [globalSearch]);
    async function refreshAll() { setRefreshing(true); await Promise.all([loadOverview(), view !== "overview" ? loadView(view) : Promise.resolve()]); setRefreshing(false); showToast("success", "Admin dashboard refreshed."); }
    async function action(path: string, message: string, reload: AdminView = "overview", body?: Record<string, unknown>) {
        try {
            await apiRequest(path, { method: "PATCH", body: JSON.stringify(body ?? {}) });
            showToast("success", message);
            if (reload === "overview")
                await loadOverview();
            else
                await loadView(reload);
            await loadRequests(true);
        }
        catch (e) {
            handleError(e, "Action failed.");
        }
    }
    async function openDetail(type: Detail["type"], id: number, title: string) {
        setDetailLoading(true);
        try {
            const map = { user: `/api/admin/users/${id}`, company: `/api/admin/companies/${id}`, issue: `/api/admin/issues/${id}`, comment: `/api/admin/comments/${id}`, log: `/api/admin/logs/${id}`, "status-request": `/api/admin/status-requests/${id}` };
            const r = await apiRequest(map[type]);
            setDetail({ type, title, data: r?.data ?? r?.[type] ?? r });
        }
        catch (e) {
            handleError(e, "Unable to load details.");
        }
        finally {
            setDetailLoading(false);
        }
    }
    async function reviewRequest() {
        if (!review)
            return;
        setActionId(review.id);
        try {
            await apiRequest(`/api/admin/status-requests/${review.id}/${review.decision}`, { method: "PATCH", body: JSON.stringify({ review_note: reviewNote.trim() || undefined }) });
            showToast("success", `Request ${review.decision}d successfully.`);
            setReview(null);
            setReviewNote("");
            await Promise.all([loadRequests(true), loadOverview()]);
        }
        catch (e) {
            handleError(e, "Unable to review request.");
        }
        finally {
            setActionId(null);
        }
    }
    const nav: Array<{
        id: AdminView;
        label: string;
        icon: ReactNode;
        badge?: number;
    }> = [
        { id: "overview", label: "Overview", icon: <LayoutDashboard size={17}/> },
        { id: "status-requests", label: "Status Requests", icon: <ShieldAlert size={17}/>, badge: pending.length },
        { id: "community", label: "Community", icon: <MessageCircle size={17}/> },
        { id: "users", label: "Users", icon: <Users size={17}/> },
        { id: "companies", label: "Companies", icon: <Building2 size={17}/> },
        { id: "issues", label: "Issues", icon: <FileText size={17}/> },
        { id: "comments", label: "Comments", icon: <MessageSquare size={17}/> },
        { id: "logs", label: "Audit Logs", icon: <History size={17}/> }
    ];
    const title = nav.find(x => x.id === view)?.label || "Overview";
    return <main className="min-h-screen bg-[#F5F5F7] text-[#111827]">
  <RoleSidebar role="Admin" subtitle="Administration" activeId={view} items={nav} profile={profile} unread={pending.length || undefined} onNavigate={(id) => { setView(id); setMobileNavOpen(false); }} onProfile={() => { setProfileOpen(true); setSettingsOpen(false); }} onSettings={() => { setSettingsOpen(true); setProfileOpen(false); }} onSignOut={signOut}/>

  <div className="lg:ml-[294px] min-h-screen min-w-0">
    <header className="sticky top-0 z-30 border-b border-[#E7E8EB] bg-white/90 backdrop-blur-xl">
      <div className="flex min-h-[72px] items-center gap-3 px-5 md:px-8">
        <button type="button" onClick={() => setMobileNavOpen(v => !v)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E6E7EA] bg-white text-[#666B74] lg:hidden"><Menu size={17}/></button>
        <div className="min-w-0 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A0A4AC]">ConsumerConnect</p>
          <p className="truncate text-sm font-semibold">{title}</p>
        </div>
        <div className="relative ml-auto hidden max-w-[440px] flex-1 md:block">
          <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A0A4AC]"/>
          <input value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} placeholder="Search issues…" className="h-11 w-full rounded-full border border-[#E5E6E9] bg-[#FAFAFB] pl-11 pr-4 text-xs outline-none transition focus:border-[#C9CBD0] focus:bg-white"/>
          {globalSearch.trim().length >= 2 && <div className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-[20px] border border-[#E7E8EB] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.12)]">
            {globalSearchLoading ? <div className="flex items-center gap-2 px-4 py-4 text-xs text-[#8E939C]"><Loader2 size={14} className="animate-spin"/> Searching…</div>
                : globalResults.length === 0 ? <div className="px-4 py-4 text-xs text-[#8E939C]">No matching issues found.</div>
                    : globalResults.map(item => <button key={item.id} type="button" onClick={() => { setGlobalSearch(""); setGlobalResults([]); setView("community"); void openDetail("issue", item.id, `Issue #${item.id}`); }} className="flex w-full items-start gap-3 border-b border-[#F0F0F2] px-4 py-3 text-left last:border-0 hover:bg-[#FAFAFB]"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F7] text-[#666B74]"><Search size={14}/></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">#{item.id} · {item.title}</p><p className="mt-1 truncate text-[10px] text-[#8E939C]">{item.company} · {item.category || "General"} · {item.status}</p></div></button>)}
          </div>}
        </div>
        <button onClick={refreshAll} disabled={refreshing} className="flex h-10 items-center gap-2 rounded-full border border-[#E6E7EA] bg-white px-3.5 text-xs font-semibold text-[#626771] hover:bg-[#F8F8F9] disabled:opacity-50"><RefreshCw size={15} className={refreshing ? "animate-spin" : ""}/><span className="hidden xl:inline">Refresh</span></button>
        <button type="button" onClick={() => setView("status-requests")} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#E6E7EA] bg-white text-[#646A73] hover:bg-[#F8F8F9]"><ShieldAlert size={17}/>{pending.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"/>}</button>
        <button type="button" onClick={() => { setProfileOpen(true); setSettingsOpen(false); }} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111111] text-xs font-semibold text-white">{initial(text(profile?.name, "Admin"))}</button>
      </div>
      {mobileNavOpen && <div className="border-t border-[#F0F0F2] px-4 py-3 lg:hidden"><div className="grid grid-cols-2 gap-2">{nav.map(x => <button key={x.id} type="button" onClick={() => { setView(x.id); setMobileNavOpen(false); }} className={`flex items-center gap-2 rounded-[13px] px-3 py-2.5 text-left text-xs font-semibold ${view === x.id ? "bg-[#111111] text-white" : "bg-[#F5F5F7] text-[#666B74]"}`}>{x.icon}<span className="flex-1">{x.label}</span>{x.badge ? x.badge : null}</button>)}</div></div>}
    </header>
   {toast && <div className={`fixed right-5 top-24 z-50 flex max-w-[380px] items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-sm shadow-xl ${toast.type === "success" ? "border-emerald-100 text-emerald-700" : "border-red-100 text-red-700"}`}><div className={`flex h-8 w-8 items-center justify-center rounded-full ${toast.type === "success" ? "bg-emerald-50" : "bg-red-50"}`}>{toast.type === "success" ? <Check size={15}/> : <AlertCircle size={15}/>}</div><span className="flex-1">{toast.message}</span><button onClick={() => setToast(null)}><X size={15}/></button></div>}
   <div className="px-5 py-6 md:px-8 md:py-8">
    {view === "overview" && <>
      <Header title="Command center" desc="Moderate the marketplace, review requests and monitor complaint health from one workspace." action={<Pill className="border-emerald-100 bg-emerald-50 text-emerald-700"><Activity size={11}/> Live operations</Pill>}/>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5"><Metric dark icon={<FileText size={18}/>} label="Total issues" value={totalIssues} detail={`${openIssues} open`}/><Metric icon={<CheckCircle2 size={18}/>} label="Resolved" value={resolved} detail={`${derivedResolutionRate.toFixed(0)}% resolution rate`}/><Metric icon={<Clock3 size={18}/>} label="Critical / high" value={severityCritical + severityHigh} detail="Priority complaints"/><Metric icon={<Users size={18}/>} label="Blocked users" value={blockedUsers} detail={`${num(overview.total_users)} users total`}/><Metric icon={<Building2 size={18}/>} label="Pending requests" value={pending.length} detail={`${blockedCompanies} blocked companies`}/></div>
      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_0.85fr]">
       <div className="rounded-[26px] border border-[#E7E8EB] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)]"><div className="flex items-start justify-between"><div><h2 className="text-[17px] font-semibold">Status request queue</h2><p className="mt-1 text-xs text-[#969BA4]">Companies cannot change issue status until an admin approves.</p></div><button onClick={() => setView("status-requests")} className="rounded-full border border-[#E5E6E9] px-3 py-2 text-[10px] font-semibold text-[#5F646D]">Open queue</button></div><div className="mt-4 space-y-3">{pending.slice(0, 5).map(r => <div key={r.id} className="flex flex-col gap-3 rounded-2xl border border-orange-100 bg-orange-50/40 p-4 md:flex-row md:items-center"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-orange-700"><ShieldAlert size={17}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold">#{r.issue_id} · {r.issue_title || "Issue"}</p><Pill className="border-orange-100 bg-orange-50 text-orange-700">Pending</Pill></div><p className="mt-1 text-xs text-[#777C85]">{r.company_name || "Company"} wants <span className="font-semibold">{r.requested_status}</span> · {ago(r.created_at)}</p></div><div className="flex gap-2"><button onClick={() => setReview({ id: r.id, decision: "reject" })} className="rounded-full border border-[#E0E1E5] bg-white px-3 py-2 text-[10px] font-semibold text-[#656A73]">Reject</button><button onClick={() => setReview({ id: r.id, decision: "approve" })} className="rounded-full bg-[#111111] px-3 py-2 text-[10px] font-semibold text-white">Approve</button></div></div>)}{pending.length === 0 && <div className="rounded-2xl bg-[#FAFAFB] p-8 text-center"><CheckCircle2 className="mx-auto text-emerald-500"/><p className="mt-3 text-sm font-semibold">No pending requests</p><p className="mt-1 text-xs text-[#9A9EA6]">The approval queue is clear.</p></div>}</div></div>
       <div className="rounded-[26px] border border-[#E7E8EB] bg-[#111111] p-6 text-white shadow-[0_14px_35px_rgba(17,17,17,0.14)]"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Platform pulse</p><h2 className="mt-2 text-xl font-semibold">What needs attention?</h2><div className="mt-6 space-y-4"><div className="flex items-center justify-between"><span className="text-sm text-white/60">Critical / high issues</span><span className="text-2xl font-semibold">{severityCritical + severityHigh}</span></div><div className="h-px bg-white/10"/><div className="flex items-center justify-between"><span className="text-sm text-white/60">Avg. resolution</span><span className="text-2xl font-semibold">{averageResolution == null ? "—" : `${averageResolution.toFixed(1)}d`}</span></div><div className="h-px bg-white/10"/><div className="flex items-center justify-between"><span className="text-sm text-white/60">Top category</span><span className="max-w-[150px] truncate text-sm font-semibold">{derivedTopCategory}</span></div></div><button onClick={() => setView("community")} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-[#111111]">Moderate community <ChevronRight size={14}/></button></div>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3"><div className="rounded-[26px] border border-[#E7E8EB] bg-white p-6 lg:col-span-2"><div className="flex items-center justify-between"><div><h2 className="text-[17px] font-semibold">Complaint trend</h2><p className="mt-1 text-xs text-[#999DA6]">Recent monthly volume from the analytics service.</p></div><BarChart3 size={18} className="text-[#7D828B]"/></div><div className="mt-6 flex h-48 items-end gap-3">{(monthly.length ? monthly : [{ label: "No data", value: 0 }]).slice(-12).map((p, i) => { const max = Math.max(...monthly.map(x => x.value), 1); return <div key={`${p.label}-${i}`} className="flex min-w-0 flex-1 flex-col items-center gap-2"><div className="w-full max-w-[48px] rounded-t-xl bg-[#111111]" style={{ height: `${Math.max(4, (p.value / max) * 150)}px` }}/><span className="max-w-[58px] truncate text-[10px] text-[#9CA0A8]">{p.label}</span></div>; })}</div></div><div className="rounded-[26px] border border-[#E7E8EB] bg-white p-6"><div><h2 className="text-[17px] font-semibold">Severity mix</h2><p className="mt-1 text-xs text-[#999DA6]">Current issue severity distribution.</p></div><div className="mt-5 space-y-4">{(severity.length ? severity : [{ label: "No data", value: 0 }]).slice(0, 5).map(p => { const max = Math.max(...severity.map(x => x.value), 1); return <div key={p.label}><div className="flex justify-between text-xs"><span className="font-medium">{p.label}</span><span className="text-[#999DA6]">{p.value}</span></div><div className="mt-2 h-2 rounded-full bg-[#F0F0F2]"><div className="h-full rounded-full bg-[#111111]" style={{ width: `${Math.min(100, p.value / max * 100)}%` }}/></div></div>; })}</div></div></div>
      <div className="mt-5 rounded-[26px] border border-[#E7E8EB] bg-white p-6"><div className="flex items-center justify-between"><div><h2 className="text-[17px] font-semibold">Recent activity</h2><p className="mt-1 text-xs text-[#999DA6]">The moderation surface for the platform.</p></div><button onClick={() => setView("logs")} className="text-xs font-semibold text-[#626771]">Audit logs</button></div><div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3"><button onClick={() => setView("users")} className="rounded-2xl bg-[#FAFAFB] p-4 text-left hover:bg-[#F4F4F6]"><p className="text-[10px] uppercase tracking-[0.14em] text-[#A0A4AC]">Users</p><p className="mt-1 text-xl font-semibold">{num(overview.total_users)}</p><p className="mt-1 text-xs text-[#969BA4]">Registered users</p></button><button onClick={() => setView("companies")} className="rounded-2xl bg-[#FAFAFB] p-4 text-left hover:bg-[#F4F4F6]"><p className="text-[10px] uppercase tracking-[0.14em] text-[#A0A4AC]">Companies</p><p className="mt-1 text-xl font-semibold">{num(overview.total_companies)}</p><p className="mt-1 text-xs text-[#969BA4]">Registered companies</p></button><button onClick={() => setView("comments")} className="rounded-2xl bg-[#FAFAFB] p-4 text-left hover:bg-[#F4F4F6]"><p className="text-[10px] uppercase tracking-[0.14em] text-[#A0A4AC]">Comments</p><p className="mt-1 text-xl font-semibold">{comments.length || "—"}</p><p className="mt-1 text-xs text-[#969BA4]">Moderation queue</p></button></div></div>
    </>}

    {view === "status-requests" && <><Header title="Status requests" desc="This is the approval gate for every company-requested status transition." action={<Pill className="border-orange-100 bg-orange-50 text-orange-700">{pending.length} pending</Pill>}/><div className="rounded-[26px] border border-[#E7E8EB] bg-white p-5">{pending.length === 0 ? <div className="p-12 text-center"><CheckCircle2 className="mx-auto text-emerald-500"/><p className="mt-3 text-sm font-semibold">No requests waiting for review</p></div> : pending.map(r => <div key={r.id} className="border-b border-[#EEEEF0] py-5 last:border-0"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-700"><ShieldAlert size={18}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">Issue #{r.issue_id} · {r.issue_title || "Issue"}</p><Pill className="border-orange-100 bg-orange-50 text-orange-700">Pending</Pill></div><p className="mt-1 text-xs text-[#8D929B]">{r.company_name || "Company"} · {r.current_status || "Open"} → {r.requested_status} · requested {date(r.created_at)}</p>{r.resolution_note && <p className="mt-3 rounded-2xl bg-[#FAFAFB] px-4 py-3 text-xs leading-5 text-[#666B74]">{r.resolution_note}</p>}</div><div className="flex shrink-0 gap-2"><button onClick={() => openDetail("status-request", r.id, `Status request #${r.id}`)} className="inline-flex items-center gap-2 rounded-full border border-[#E4E5E8] bg-white px-3.5 py-2.5 text-[10px] font-semibold text-[#5C616A]"><Eye size={13}/> Review</button><button onClick={() => setReview({ id: r.id, decision: "reject" })} disabled={actionId === r.id} className="rounded-full border border-[#E4E5E8] bg-white px-3.5 py-2.5 text-[10px] font-semibold text-[#666B74]">Reject</button><button onClick={() => setReview({ id: r.id, decision: "approve" })} disabled={actionId === r.id} className="rounded-full bg-[#111111] px-3.5 py-2.5 text-[10px] font-semibold text-white">Approve</button></div></div></div>)}</div><div className="mt-5 rounded-[26px] border border-[#E7E8EB] bg-white p-6"><h2 className="text-[17px] font-semibold">Request history</h2><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"><div className="rounded-2xl bg-[#FAFAFB] p-4"><p className="text-xs text-[#9A9EA6]">Pending</p><p className="mt-1 text-2xl font-semibold">{requests.filter(r => r.status.toLowerCase() === "pending").length}</p></div><div className="rounded-2xl bg-[#FAFAFB] p-4"><p className="text-xs text-[#9A9EA6]">Approved</p><p className="mt-1 text-2xl font-semibold">{requests.filter(r => r.status.toLowerCase() === "approved").length}</p></div><div className="rounded-2xl bg-[#FAFAFB] p-4"><p className="text-xs text-[#9A9EA6]">Rejected</p><p className="mt-1 text-2xl font-semibold">{requests.filter(r => r.status.toLowerCase() === "rejected").length}</p></div></div></div></>}

    {view === "community" && <>
      <Header title="Community moderation" desc="Review public issues, activity and comments using the same discovery flow as the consumer dashboard." action={<div className="flex flex-wrap gap-2">
          {(["trending", "latest", "supported"] as const).map(sort => (<button key={sort} type="button" onClick={() => setCommunitySort(sort)} className={`rounded-full px-3 py-2 text-[10px] font-semibold ${communitySort === sort ? "bg-[#111111] text-white" : "border border-[#E5E6E9] bg-white text-[#666B74]"}`}>
              {sort === "trending" ? "Trending" : sort === "latest" ? "Latest" : "Most Supported"}
            </button>))}
          <button type="button" onClick={() => void loadView("community")} className="inline-flex items-center gap-2 rounded-full border border-[#E6E7EA] bg-white px-4 py-2.5 text-xs font-semibold text-[#626771]">
            <RefreshCw size={14}/> Refresh
          </button>
        </div>}/>

      <div className="mb-5 rounded-[22px] border border-[#E7E8EB] bg-white p-4">
        <div className="relative max-w-[560px]">
          <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A0A4AC]"/>
          <input value={communitySearch} onChange={event => setCommunitySearch(event.target.value)} placeholder="Search community issues by title, company, category or description..." className="h-11 w-full rounded-full border border-[#E5E6E9] bg-[#FAFAFB] pl-11 pr-4 text-xs text-[#111827] outline-none transition focus:border-[#C9CBD0] focus:bg-white"/>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[26px] border border-[#E7E8EB] bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-semibold">
                {communitySort === "trending" ? "Trending issues" : communitySort === "latest" ? "Latest issues" : "Most supported issues"}
              </h2>
              <p className="mt-1 text-xs text-[#999DA6]">
                Open an issue to inspect its moderation record.
              </p>
            </div>
            <MessageCircle size={18} className="text-[#777C85]"/>
          </div>

          <div className="mt-5 space-y-3">
            {communityIssues.map(i => (<button key={i.id} type="button" onClick={() => openDetail("issue", i.id, `Issue #${i.id}`)} className="flex w-full items-center gap-4 rounded-2xl border border-[#EEEEF0] p-4 text-left transition hover:border-[#D9DADF] hover:bg-[#FAFAFB]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#111111] text-white">
                  <MessageSquare size={16}/>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold text-[#9CA0A8]">#{i.id}</span>
                    <p className="truncate text-sm font-semibold">{i.title}</p>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-[#969BA4]">{i.company} · {i.comment_count} comments · {i.support_count} supports · {Math.round(i.trending_score || 0)} trending</p>
                </div>
                <Pill className={statusClass(i.status)}>{i.status}</Pill>
                <ChevronRight size={15} className="text-[#B3B6BD]"/>
              </button>))}
            {communityIssues.length === 0 && <div className="p-10 text-center text-sm text-[#9A9EA6]">No community issues found.</div>}
          </div>
        </div>

        <div className="rounded-[26px] border border-[#E7E8EB] bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-semibold">Recent comments</h2>
              <p className="mt-1 text-xs text-[#999DA6]">Quick access to community moderation actions.</p>
            </div>
            <button type="button" onClick={() => setView("comments")} className="text-xs font-semibold text-[#626771]">Open all</button>
          </div>
          <div className="mt-5 space-y-3">
            {communityComments.map(c => (<button key={c.id} type="button" onClick={() => openDetail("comment", c.id, `Comment #${c.id}`)} className="w-full rounded-2xl border border-[#EEEEF0] p-4 text-left transition hover:bg-[#FAFAFB]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold">{c.user_name}</span>
                  <Pill className={c.is_deleted ? "border-red-100 bg-red-50 text-red-700" : "border-[#E7E8EB] bg-[#FAFAFB] text-[#666B74]"}>{c.is_deleted ? "Deleted" : "Visible"}</Pill>
                </div>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#656A73]">{c.content}</p>
                <p className="mt-2 text-[10px] text-[#A2A6AE]">Issue #{c.issue_id ?? "—"} · {ago(c.created_at)}</p>
              </button>))}
            {communityComments.length === 0 && <div className="p-10 text-center text-sm text-[#9A9EA6]">No comments yet.</div>}
          </div>
        </div>
      </div>
    </>}

    {view === "users" && <><Header title="Users" desc="Manage platform users and review their current access state." action={<Pill className="border-[#E6E7EA] bg-white text-[#646973]"><Users size={11}/> {users.length} loaded</Pill>}/><div className="overflow-hidden rounded-[26px] border border-[#E7E8EB] bg-white"><div className="hidden grid-cols-[1.2fr_1.2fr_0.6fr_0.6fr_1fr_36px] gap-4 border-b border-[#EEEEF0] bg-[#FAFAFB] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#A0A4AC] md:grid"><span>User</span><span>Email</span><span>Role</span><span>State</span><span>Joined</span><span /></div>{filteredUsers.map(u => <div key={u.id} className="grid grid-cols-1 gap-3 border-b border-[#EEEEF0] px-5 py-4 md:grid-cols-[1.2fr_1.2fr_0.6fr_0.6fr_1fr_36px] md:items-center"><div><p className="text-sm font-semibold">{u.name}</p><p className="text-[10px] text-[#A0A4AC]">ID {u.id}</p></div><p className="text-xs text-[#686D76]">{u.email}</p><Pill className="w-fit border-[#E6E7EA] bg-[#FAFAFB] text-[#626771]">{u.role}</Pill><Pill className={`w-fit ${statusClass(u.is_blocked ? "Blocked" : "Active")}`}>{u.is_blocked ? "Blocked" : "Active"}</Pill><p className="text-xs text-[#9297A0]">{date(u.created_at)}</p><div className="flex gap-2"><button onClick={() => openDetail("user", u.id, u.name)} className="text-[#6B7079]"><Eye size={15}/></button><button onClick={() => { setActionId(u.id); void action(`/api/admin/users/${u.id}/${u.is_blocked ? "unblock" : "block"}`, `${u.name} ${u.is_blocked ? "unblocked" : "blocked"}.`, "users").finally(() => setActionId(null)); }} disabled={actionId === u.id} className="text-[#6B7079]">{actionId === u.id ? <Loader2 size={15} className="animate-spin"/> : <ShieldCheck size={15}/>}</button></div></div>)}{filteredUsers.length === 0 && <div className="p-12 text-center text-sm text-[#9A9EA6]">No users found.</div>}</div></>}

    {view === "companies" && <><Header title="Companies" desc="Manage participating companies and platform access."/><div className="grid grid-cols-1 gap-4 md:grid-cols-3"><Metric icon={<Building2 size={18}/>} label="Companies" value={companies.length} detail="Loaded into console"/><Metric icon={<ShieldAlert size={18}/>} label="Blocked" value={companies.filter(c => c.is_blocked).length} detail="Access disabled"/><Metric icon={<CheckCircle2 size={18}/>} label="Active" value={companies.filter(c => !c.is_blocked).length} detail="Current access"/></div><div className="mt-5 overflow-hidden rounded-[26px] border border-[#E7E8EB] bg-white">{filteredCompanies.map(c => <div key={c.id} className="flex flex-col gap-3 border-b border-[#EEEEF0] px-5 py-4 md:flex-row md:items-center"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F5F7] text-[#666B74]"><Building2 size={17}/></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{c.name}</p><p className="mt-1 text-xs text-[#989DA6]">{c.email || "No email"} · Created {date(c.created_at)}</p></div><Pill className={statusClass(c.is_blocked ? "Blocked" : "Active")}>{c.is_blocked ? "Blocked" : "Active"}</Pill><button onClick={() => openDetail("company", c.id, c.name)} className="rounded-full border border-[#E5E6E9] bg-white px-3 py-2 text-[10px] font-semibold">Details</button><button onClick={() => { setActionId(c.id); void action(`/api/admin/companies/${c.id}/${c.is_blocked ? "unblock" : "block"}`, `${c.name} ${c.is_blocked ? "unblocked" : "blocked"}.`, "companies").finally(() => setActionId(null)); }} disabled={actionId === c.id} className="rounded-full bg-[#111111] px-3 py-2 text-[10px] font-semibold text-white">{actionId === c.id ? <Loader2 size={13} className="animate-spin"/> : c.is_blocked ? "Unblock" : "Block"}</button></div>)}{filteredCompanies.length === 0 && <div className="p-12 text-center text-sm text-[#9A9EA6]">No companies found.</div>}</div></>}

    {view === "issues" && <><Header title="Issues" desc="Moderate complaints, update administrative status and restore or delete records." action={<div className="flex gap-2"><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-full border border-[#E5E6E9] bg-white px-3 py-2 text-xs outline-none"><option>All</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>}/><div className="overflow-hidden rounded-[26px] border border-[#E7E8EB] bg-white">{filteredIssues.map(i => <div key={i.id} className="border-b border-[#EEEEF0] px-5 py-4 last:border-0"><div className="flex flex-col gap-4 xl:flex-row xl:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold text-[#9AA0A8]">#{i.id}</span><p className="truncate text-sm font-semibold">{i.title}</p><Pill className={statusClass(i.status)}>{i.status}</Pill><Pill className={severityClass(i.severity)}>{i.severity || "Normal"}</Pill></div><p className="mt-1 line-clamp-1 text-xs text-[#8E939C]">{i.company} · {i.category || "General"} · {i.comment_count} comments · {i.support_count} supports</p></div><div className="flex flex-wrap items-center gap-2"><select disabled={statusId === i.id} value={i.status} onChange={e => { setStatusId(i.id); void action(`/api/admin/issues/${i.id}/status`, `Issue #${i.id} moved to ${e.target.value}.`, "issues", { status: e.target.value }).finally(() => setStatusId(null)); }} className="rounded-full border border-[#E5E6E9] bg-white px-3 py-2 text-[10px] font-semibold outline-none">{STATUSES.map(s => <option key={s}>{s}</option>)}</select><button onClick={() => openDetail("issue", i.id, `Issue #${i.id}`)} className="rounded-full border border-[#E5E6E9] bg-white px-3 py-2 text-[10px] font-semibold">View</button><button onClick={() => { setActionId(i.id); void action(`/api/admin/issues/${i.id}/${i.is_deleted ? "restore" : "delete"}`, `Issue #${i.id} ${i.is_deleted ? "restored" : "deleted"}.`, "issues").finally(() => setActionId(null)); }} disabled={actionId === i.id} className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-3 py-2 text-[10px] font-semibold text-red-700">{actionId === i.id ? <Loader2 size={12} className="animate-spin"/> : <Trash2 size={12}/>} {i.is_deleted ? "Restore" : "Delete"}</button></div></div></div>)}{filteredIssues.length === 0 && <div className="p-12 text-center text-sm text-[#9A9EA6]">No issues found.</div>}</div></>}

    {view === "comments" && <><Header title="Comments" desc="Moderate community conversation without removing the surrounding issue context."/><div className="overflow-hidden rounded-[26px] border border-[#E7E8EB] bg-white">{filteredComments.map(c => <div key={c.id} className="border-b border-[#EEEEF0] p-5 last:border-0"><div className="flex flex-col gap-3 md:flex-row md:items-start"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#111111] text-[10px] font-semibold text-white">{initial(c.user_name)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{c.user_name}</p><span className="text-[10px] text-[#A1A5AD]">Issue #{c.issue_id ?? "—"}</span><Pill className={c.is_deleted ? "border-red-100 bg-red-50 text-red-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}>{c.is_deleted ? "Deleted" : "Visible"}</Pill></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5F646D]">{c.content}</p><p className="mt-2 text-[10px] text-[#A1A5AD]">{date(c.created_at)}</p></div><div className="flex gap-2"><button onClick={() => openDetail("comment", c.id, `Comment #${c.id}`)} className="rounded-full border border-[#E5E6E9] px-3 py-2 text-[10px] font-semibold">View</button><button onClick={() => { setActionId(c.id); void action(`/api/admin/comments/${c.id}/${c.is_deleted ? "restore" : "delete"}`, `Comment #${c.id} ${c.is_deleted ? "restored" : "deleted"}.`, "comments").finally(() => setActionId(null)); }} className="rounded-full bg-[#111111] px-3 py-2 text-[10px] font-semibold text-white">{c.is_deleted ? "Restore" : "Remove"}</button></div></div></div>)}{filteredComments.length === 0 && <div className="p-12 text-center text-sm text-[#9A9EA6]">No comments found.</div>}</div></>}

    {view === "logs" && <><Header title="Audit logs" desc="Track administrative actions for accountability and troubleshooting."/><div className="overflow-hidden rounded-[26px] border border-[#E7E8EB] bg-white">{logs.map(l => <div key={l.id} className="flex gap-4 border-b border-[#EEEEF0] p-5 last:border-0"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F7] text-[#666B74]"><History size={17}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{l.action}</p>{l.entity_type && <Pill className="border-[#E5E6E9] bg-[#FAFAFB] text-[#666B74]">{l.entity_type}</Pill>}</div><p className="mt-1 text-xs text-[#8E939C]">{l.admin_name || "Admin"} · {l.entity_id ? `#${l.entity_id}` : ""} · {date(l.created_at)}</p>{l.details && <p className="mt-2 text-xs leading-5 text-[#676C75]">{l.details}</p>}</div><button onClick={() => openDetail("log", l.id, `Log #${l.id}`)} className="text-[#6D727C]"><Eye size={15}/></button></div>)}{logs.length === 0 && <div className="p-12 text-center text-sm text-[#9A9EA6]">No audit logs found.</div>}</div></>}

    {loading && <div className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full border border-[#E5E6E9] bg-white px-4 py-2.5 text-xs font-semibold text-[#626771] shadow-lg"><span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> Updating workspace…</span></div>}
   </div>
 </div>

 {detail && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 backdrop-blur-[2px] md:items-center md:p-6" onMouseDown={e => {
                if (e.currentTarget === e.target)
                    setDetail(null);
            }}><div className="max-h-[88vh] w-full max-w-[720px] overflow-hidden rounded-t-[30px] bg-[#F7F7F8] shadow-2xl md:rounded-[30px]"><div className="flex items-center gap-3 border-b border-[#E9E9EC] bg-white px-5 py-4"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#111111] text-white"><Eye size={17}/></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{detail.title}</p><p className="text-[10px] uppercase tracking-[0.16em] text-[#A0A4AC]">Detailed record</p></div><button onClick={() => setDetail(null)} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E6E9] bg-white"><X size={16}/></button></div><div className="max-h-[calc(88vh-76px)] overflow-y-auto p-5 md:p-6">{detailLoading ? <div className="flex justify-center py-14"><Loader2 className="animate-spin"/></div> : <div className="space-y-3">{Object.entries(detail.data ?? {}).filter(([k, v]) => typeof v !== "object" && v !== undefined).map(([k, v]) => <div key={k} className="rounded-2xl border border-[#E8E9EC] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#A2A6AE]">{k.replaceAll("_", " ")}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-[#4E535C]">{String(v)}</p></div>)}</div>}</div></div></div>}
 {review && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-5 backdrop-blur-[2px]"><div className="w-full max-w-[520px] rounded-[28px] bg-white p-6 shadow-2xl"><div className="flex items-start gap-3"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${review.decision === "approve" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{review.decision === "approve" ? <CheckCircle2 size={19}/> : <AlertCircle size={19}/>}</div><div className="min-w-0 flex-1"><h2 className="text-lg font-semibold">{review.decision === "approve" ? "Approve status request" : "Reject status request"}</h2><p className="mt-1 text-sm text-[#8D929B]">Add an optional review note that will be recorded with the decision.</p></div><button onClick={() => setReview(null)}><X size={17}/></button></div><textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={4} className="mt-5 w-full resize-none rounded-2xl border border-[#E5E6E9] bg-[#FAFAFB] p-4 text-sm outline-none" placeholder="Write review note…"/><div className="mt-4 flex justify-end gap-2"><button onClick={() => setReview(null)} className="rounded-full border border-[#E5E6E9] px-4 py-2.5 text-xs font-semibold">Cancel</button><button onClick={() => void reviewRequest()} disabled={actionId === review.id} className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold text-white ${review.decision === "approve" ? "bg-[#111111]" : "bg-[#991B1B]"}`}>{actionId === review.id ? <Loader2 size={14} className="animate-spin"/> : review.decision === "approve" ? <Check size={14}/> : <X size={14}/>} {review.decision === "approve" ? "Approve request" : "Reject request"}</button></div></div></div>}
  <ProfileSettingsModal profile={profile} open={profileOpen} settingsOpen={settingsOpen} onClose={() => { setProfileOpen(false); setSettingsOpen(false); }} onSignOut={signOut} roleLabel="Admin"/>
 </main>;
}
