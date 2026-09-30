"use client";

import {
  LayoutDashboard,
  MessagesSquare,
  FileText,
  Bell,
  LifeBuoy,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";

type DashboardView =
  | "overview"
  | "community"
  | "issues"
  | "notifications"
  | "support";

interface SidebarProps {
  activeView: DashboardView;
  onViewChange: (
    view: DashboardView
  ) => void;

  profile?: {
    name?: string;
    email?: string;
  } | null;

  unreadNotificationCount?: number;

  onProfileClick?: () => void;
  onSettingsClick?: () => void;
}

const navigationItems = [
  {
    label: "Overview",
    view: "overview" as DashboardView,
    icon: LayoutDashboard,
  },
  {
    label: "Community",
    view: "community" as DashboardView,
    icon: MessagesSquare,
  },
  {
    label: "My Issues",
    view: "issues" as DashboardView,
    icon: FileText,
  },
  {
    label: "Notifications",
    view: "notifications" as DashboardView,
    icon: Bell,
  },
  {
    label: "Support",
    view: "support" as DashboardView,
    icon: LifeBuoy,
  },
];

export default function Sidebar({
  activeView,
  onViewChange,
  profile,
  unreadNotificationCount = 0,
  onProfileClick,
  onSettingsClick,
}: SidebarProps) {
  const displayName =
    profile?.name?.trim() ||
    "User";

  const email =
    profile?.email?.trim() ||
    "consumer@consumerconnect.com";

  const avatarLetter =
    displayName
      .charAt(0)
      .toUpperCase() || "U";

  const safeUnreadCount =
    Number.isFinite(
      unreadNotificationCount
    ) &&
    unreadNotificationCount > 0
      ? unreadNotificationCount
      : 0;

  function handleSignOut() {
    localStorage.removeItem(
      "access_token"
    );

    localStorage.removeItem(
      "refresh_token"
    );

    window.location.href = "/login";
  }

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[294px] flex-col border-r border-[#E7E7EA] bg-white">

      {/* BRAND */}
      <div className="flex h-[88px] items-center px-7">
        <div>
          <h1 className="text-[20px] font-bold tracking-[-0.03em] text-[#111111]">
            ConsumerConnect
          </h1>

          <p className="mt-1 text-[11px] text-[#A1A1AA]">
            Consumer issue platform
          </p>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-4 py-4">
        <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#B0B3B8]">
          Workspace
        </p>

        <div className="space-y-1.5">
          {navigationItems.map(
            (item) => {
              const Icon =
                item.icon;

              const active =
                activeView ===
                item.view;

              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() =>
                    onViewChange(
                      item.view
                    )
                  }
                  className={`group flex w-full items-center justify-between rounded-[14px] px-3.5 py-3 transition ${
                    active
                      ? "bg-[#111111] text-white"
                      : "text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#111827]"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      size={18}
                      strokeWidth={
                        active
                          ? 2
                          : 1.7
                      }
                    />

                    <span className="text-sm font-medium">
                      {item.label}
                    </span>
                  </span>

                  {item.view ===
                    "notifications" &&
                    safeUnreadCount >
                      0 && (
                      <span
                        className={`flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-semibold ${
                          active
                            ? "bg-white text-[#111111]"
                            : "bg-[#111111] text-white"
                        }`}
                      >
                        {safeUnreadCount >
                        99
                          ? "99+"
                          : safeUnreadCount}
                      </span>
                    )}

                  {item.view !==
                    "notifications" && (
                    <ChevronRight
                      size={14}
                      className={`opacity-0 transition group-hover:opacity-100 ${
                        active
                          ? "text-white"
                          : "text-[#B0B3B8]"
                      }`}
                    />
                  )}
                </button>
              );
            }
          )}
        </div>
      </nav>

      {/* BOTTOM */}
      <div className="border-t border-[#EEEEF0] px-4 py-4">

        {/* SETTINGS */}
        <button
          type="button"
          onClick={
            onSettingsClick
          }
          className="mb-2 flex w-full items-center gap-3 rounded-[14px] px-3.5 py-3 text-[#6B7280] transition hover:bg-[#F7F7F8] hover:text-[#111827]"
        >
          <Settings
            size={18}
            strokeWidth={1.7}
          />

          <span className="text-sm font-medium">
            Settings
          </span>
        </button>

        {/* PROFILE CARD */}
        <button
          type="button"
          onClick={
            onProfileClick
          }
          className="group flex w-full items-center gap-3 rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] p-3 text-left transition hover:bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8E9EB] text-sm font-semibold text-[#4B5563]">
            {avatarLetter}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[#111827]">
              {displayName}
            </span>

            <span className="mt-0.5 block truncate text-[11px] text-[#9CA3AF]">
              {email}
            </span>
          </span>

          <ChevronRight
            size={15}
            className="shrink-0 text-[#B4B6BA] transition group-hover:translate-x-0.5 group-hover:text-[#6B7280]"
          />
        </button>

        {/* SIGN OUT */}
        <button
          type="button"
          onClick={
            handleSignOut
          }
          className="mt-2 flex w-full items-center gap-3 rounded-[14px] px-3.5 py-3 text-[#9CA3AF] transition hover:bg-red-50 hover:text-red-600"
        >
          <LogOut
            size={17}
            strokeWidth={1.7}
          />

          <span className="text-sm font-medium">
            Sign out
          </span>
        </button>
      </div>
    </aside>
  );
}