"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Tag,
  ThumbsUp,
  X,
  Loader2,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface SearchIssue {
  id: number;
  title: string;
  description?: string;
  company?: string;
  category?: string | null;
  status?: string;
  severity?: string | null;
  created_at?: string;
}

interface NotificationItem {
  id: number;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  is_read?: boolean;
  created_at?: string;
  issue_id?: number;
}

interface TopbarProps {
  /* ============================================================
     SEARCH
  ============================================================ */

  searchValue?: string;

  onSearchChange?: (
    value: string
  ) => void;

  searchPlaceholder?: string;

  searchResults?: SearchIssue[];

  searchLoading?: boolean;

  searchError?: string;

  onSearchResultClick?: (
    issue: SearchIssue
  ) => void;

  /* ============================================================
     NOTIFICATIONS
  ============================================================ */

  unreadNotificationCount?: number;

  notifications?: NotificationItem[];

  onNotificationsClick?: () => void;

  onNotificationClick?: (
    notification: NotificationItem
  ) => void;

  /* ============================================================
     PROFILE
  ============================================================ */

  onProfileClick?: () => void;

  profile?: {
    name?: string;
  } | null;
}


/* ================================================================
   HELPERS
================================================================ */

function formatNotificationTime(
  value?: string
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = Date.now();
  const diff =
    now - date.getTime();

  const minutes = Math.floor(
    diff / 60000
  );

  const hours = Math.floor(
    diff / 3600000
  );

  const days = Math.floor(
    diff / 86400000
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString();
}


function formatIssueDate(
  value?: string
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}


function getNotificationIcon(
  notification: NotificationItem
) {
  const type =
    notification.type?.toUpperCase() ?? "";

  if (type.includes("SUPPORT")) {
    return (
      <ThumbsUp size={15} />
    );
  }

  if (
    type.includes("RESPONSE") ||
    type.includes("COMPANY")
  ) {
    return (
      <ShieldCheck size={15} />
    );
  }

  if (
    type.includes("COMMENT") ||
    type.includes("REPLY")
  ) {
    return (
      <MessageCircle size={15} />
    );
  }

  return (
    <CheckCircle2 size={15} />
  );
}


/* ================================================================
   STATUS STYLING
================================================================ */

function getStatusClasses(
  status?: string
) {
  switch (
    status?.toLowerCase()
  ) {
    case "resolved":
      return "bg-green-50 text-green-700";

    case "closed":
      return "bg-gray-100 text-gray-700";

    case "in progress":
      return "bg-blue-50 text-blue-700";

    case "open":
      return "bg-amber-50 text-amber-700";

    default:
      return "bg-gray-100 text-gray-600";
  }
}


/* ================================================================
   TOPBAR
================================================================ */

export default function Topbar({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search Issues...",

  searchResults = [],
  searchLoading = false,
  searchError = "",
  onSearchResultClick,

  unreadNotificationCount = 0,
  notifications = [],

  onNotificationsClick,
  onNotificationClick,

  onProfileClick,
  profile,
}: TopbarProps) {
  const [
    notificationOpen,
    setNotificationOpen,
  ] = useState(false);

  const [
    searchFocused,
    setSearchFocused,
  ] = useState(false);

  const notificationRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const searchRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const displayName =
    profile?.name?.trim() ||
    "User";

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

  const recentNotifications =
    useMemo(() => {
      return [...notifications]
        .sort((a, b) => {
          const aTime =
            a.created_at
              ? new Date(
                  a.created_at
                ).getTime()
              : 0;

          const bTime =
            b.created_at
              ? new Date(
                  b.created_at
                ).getTime()
              : 0;

          return bTime - aTime;
        })
        .slice(0, 5);
    }, [notifications]);

  const showSearchDropdown =
    searchFocused &&
    searchValue.trim().length > 0;


  /* ============================================================
     OUTSIDE CLICK + ESCAPE
  ============================================================ */

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      const target =
        event.target as Node;

      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          target
        )
      ) {
        setNotificationOpen(false);
      }

      if (
        searchRef.current &&
        !searchRef.current.contains(
          target
        )
      ) {
        setSearchFocused(false);
      }
    }

    function handleEscape(
      event: KeyboardEvent
    ) {
      if (
        event.key !== "Escape"
      ) {
        return;
      }

      setNotificationOpen(false);
      setSearchFocused(false);
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);


  /* ============================================================
     NOTIFICATIONS
  ============================================================ */

  function handleBellClick() {
    setNotificationOpen(
      (current) => !current
    );

    onNotificationsClick?.();
  }


  function handleNotificationClick(
    notification: NotificationItem
  ) {
    setNotificationOpen(false);

    onNotificationClick?.(
      notification
    );
  }


  /* ============================================================
     SEARCH
  ============================================================ */

  function handleSearchChange(
    value: string
  ) {
    onSearchChange?.(value);
  }


  function handleSearchFocus() {
    setSearchFocused(true);
  }


  function handleSearchResultClick(
    issue: SearchIssue
  ) {
    setSearchFocused(false);
    onSearchResultClick?.(issue);
  }


  return (
    <header className="sticky top-0 z-40 h-[72px] border-b border-[#E7E7EA] bg-white/95 backdrop-blur">
      <div className="flex h-full items-center justify-between gap-6 px-6 lg:px-8">

        {/* ======================================================
            LEFT
        ====================================================== */}

        <div className="min-w-0">
          <p className="truncate text-sm text-[#9CA3AF]">
            Consumer dashboard
          </p>
        </div>


        {/* ======================================================
            RIGHT
        ====================================================== */}

        <div className="flex shrink-0 items-center gap-3">

          {/* ====================================================
              SEARCH
          ==================================================== */}

          <div
            ref={searchRef}
            className="relative hidden w-[280px] lg:block xl:w-[320px]"
          >
            <Search
              size={18}
              strokeWidth={1.7}
              className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#9CA3AF]"
            />

            <input
              type="text"
              value={searchValue}
              onChange={(event) =>
                handleSearchChange(
                  event.target.value
                )
              }
              onFocus={
                handleSearchFocus
              }
              placeholder={
                searchPlaceholder
              }
              aria-label="Search issues"
              autoComplete="off"
              className={`h-[44px] w-full rounded-full border bg-[#FAFAFA] pl-11 pr-4 text-sm text-[#111827] outline-none transition placeholder:text-[#9CA3AF] ${
                searchFocused
                  ? "border-[#D1D5DB] bg-white shadow-sm"
                  : "border-[#E7E7EA]"
              }`}
            />


            {/* ==================================================
                SEARCH DROPDOWN
            ================================================== */}

            {showSearchDropdown && (
              <div className="absolute left-0 right-0 top-[52px] overflow-hidden rounded-[18px] border border-[#E7E7EA] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">

                {/* SEARCH HEADER */}

                <div className="border-b border-[#EEEEF0] px-4 py-3">
                  <p className="text-xs font-semibold text-[#111827]">
                    Search results
                  </p>

                  <p className="mt-0.5 text-[10px] text-[#9CA3AF]">
                    Issues matching "
                    {searchValue.trim()}
                    "
                  </p>
                </div>


                {/* LOADING */}

                {searchLoading && (
                  <div className="flex items-center gap-3 px-5 py-6">
                    <Loader2
                      size={17}
                      className="animate-spin text-[#6B7280]"
                    />

                    <span className="text-xs text-[#6B7280]">
                      Searching issues...
                    </span>
                  </div>
                )}


                {/* ERROR */}

                {!searchLoading &&
                  searchError && (
                    <div className="px-5 py-6">
                      <p className="text-xs font-medium text-red-600">
                        {searchError}
                      </p>
                    </div>
                  )}


                {/* EMPTY */}

                {!searchLoading &&
                  !searchError &&
                  searchResults.length ===
                    0 && (
                    <div className="px-5 py-7 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F7]">
                        <Search
                          size={17}
                          className="text-[#9CA3AF]"
                        />
                      </div>

                      <p className="mt-3 text-xs font-medium text-[#374151]">
                        No issues found
                      </p>

                      <p className="mt-1 text-[10px] text-[#9CA3AF]">
                        Try a different issue,
                        company, or category.
                      </p>
                    </div>
                  )}


                {/* RESULTS */}

                {!searchLoading &&
                  !searchError &&
                  searchResults.length >
                    0 && (
                    <div className="max-h-[390px] overflow-y-auto">

                      {searchResults
                        .slice(0, 8)
                        .map(
                          (issue) => (
                            <button
                              key={
                                issue.id
                              }
                              type="button"
                              onClick={() =>
                                handleSearchResultClick(
                                  issue
                                )
                              }
                              className="group flex w-full items-start gap-3 border-b border-[#F0F0F1] px-4 py-3.5 text-left transition last:border-b-0 hover:bg-[#FAFAFA]"
                            >

                              {/* ISSUE ICON */}

                              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#F5F5F7] text-[#6B7280] transition group-hover:bg-[#EFEFF1] group-hover:text-[#111827]">
                                <MessageCircle
                                  size={16}
                                />
                              </div>


                              {/* ISSUE DETAILS */}

                              <div className="min-w-0 flex-1">

                                <div className="flex items-start justify-between gap-3">
                                  <p className="line-clamp-1 text-xs font-semibold text-[#111827]">
                                    {
                                      issue.title
                                    }
                                  </p>

                                  <ArrowRight
                                    size={14}
                                    className="mt-0.5 shrink-0 text-[#C4C6CA] transition group-hover:translate-x-0.5 group-hover:text-[#6B7280]"
                                  />
                                </div>


                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">

                                  {issue.company && (
                                    <span className="flex items-center gap-1 text-[10px] text-[#6B7280]">
                                      <Building2
                                        size={11}
                                      />

                                      <span className="max-w-[110px] truncate">
                                        {
                                          issue.company
                                        }
                                      </span>
                                    </span>
                                  )}


                                  {issue.category && (
                                    <span className="flex items-center gap-1 text-[10px] text-[#6B7280]">
                                      <Tag
                                        size={11}
                                      />

                                      <span className="max-w-[100px] truncate">
                                        {
                                          issue.category
                                        }
                                      </span>
                                    </span>
                                  )}

                                </div>


                                <div className="mt-2 flex flex-wrap items-center gap-2">

                                  {issue.status && (
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${getStatusClasses(
                                        issue.status
                                      )}`}
                                    >
                                      {
                                        issue.status
                                      }
                                    </span>
                                  )}


                                  <span className="text-[9px] text-[#B0B3B8]">
                                    #
                                    {
                                      issue.id
                                    }
                                  </span>


                                  {issue.created_at && (
                                    <span className="text-[9px] text-[#B0B3B8]">
                                      {formatIssueDate(
                                        issue.created_at
                                      )}
                                    </span>
                                  )}

                                </div>

                              </div>

                            </button>
                          )
                        )}

                    </div>
                  )}

              </div>
            )}

          </div>


          {/* ====================================================
              CREATE ISSUE
          ==================================================== */}

          <Link
            href="/create-issue"
            className="flex h-[44px] items-center gap-2 rounded-full bg-[#111111] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#242424] active:scale-[0.98]"
          >
            <Plus
              size={18}
              strokeWidth={2}
            />

            <span className="hidden sm:inline">
              Create Issue
            </span>
          </Link>


          {/* ====================================================
              NOTIFICATIONS
          ==================================================== */}

          <div
            ref={notificationRef}
            className="relative"
          >
            <button
              type="button"
              onClick={
                handleBellClick
              }
              aria-label={
                safeUnreadCount > 0
                  ? `${safeUnreadCount} unread notifications`
                  : "Notifications"
              }
              className={`relative flex h-[44px] w-[44px] items-center justify-center rounded-full border transition ${
                notificationOpen
                  ? "border-[#D1D5DB] bg-[#F8F8F9] text-[#111827]"
                  : "border-[#E7E7EA] bg-white text-[#6B7280] hover:bg-[#F8F8F9] hover:text-[#111827]"
              }`}
            >
              <Bell
                size={19}
                strokeWidth={1.7}
              />

              {safeUnreadCount >
                0 && (
                <span className="absolute right-0.5 top-0.5 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#111111] px-1 text-[9px] font-semibold leading-none text-white">
                  {safeUnreadCount >
                  99
                    ? "99+"
                    : safeUnreadCount}
                </span>
              )}
            </button>


            {notificationOpen && (
              <div className="absolute right-0 top-[56px] w-[370px] overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">

                {/* HEADER */}

                <div className="flex items-center justify-between border-b border-[#EEEEF0] px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">
                      Notifications
                    </p>

                    <p className="mt-0.5 text-[11px] text-[#9CA3AF]">
                      {safeUnreadCount >
                      0
                        ? `${safeUnreadCount} unread`
                        : "You're all caught up"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setNotificationOpen(
                        false
                      )
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[#9CA3AF] transition hover:bg-[#F5F5F7] hover:text-[#111827]"
                    aria-label="Close notifications"
                  >
                    <X
                      size={15}
                    />
                  </button>
                </div>


                {/* LIST */}

                <div className="max-h-[390px] overflow-y-auto">

                  {recentNotifications.length ===
                  0 ? (
                    <div className="px-6 py-10 text-center">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#F5F5F7] text-[#9CA3AF]">
                        <Bell
                          size={18}
                        />
                      </div>

                      <p className="mt-3 text-sm font-medium text-[#374151]">
                        No notifications
                      </p>

                      <p className="mt-1 text-xs text-[#9CA3AF]">
                        New activity will
                        appear here.
                      </p>
                    </div>
                  ) : (
                    recentNotifications.map(
                      (
                        notification
                      ) => {
                        const isRead =
                          Boolean(
                            notification.read ||
                              notification.is_read
                          );

                        return (
                          <button
                            key={
                              notification.id
                            }
                            type="button"
                            onClick={() =>
                              handleNotificationClick(
                                notification
                              )
                            }
                            className={`flex w-full gap-3 border-b border-[#F0F0F1] px-5 py-4 text-left transition last:border-b-0 hover:bg-[#FAFAFA] ${
                              !isRead
                                ? "bg-[#FCFCFC]"
                                : "bg-white"
                            }`}
                          >

                            <div
                              className={`relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] ${
                                isRead
                                  ? "bg-[#F5F5F7] text-[#9CA3AF]"
                                  : "bg-[#111111] text-white"
                              }`}
                            >
                              {getNotificationIcon(
                                notification
                              )}

                              {!isRead && (
                                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#111111] ring-2 ring-white" />
                              )}
                            </div>


                            <div className="min-w-0 flex-1">

                              <div className="flex items-start justify-between gap-3">
                                <p className="truncate text-xs font-semibold text-[#111827]">
                                  {notification.title ||
                                    notification.type ||
                                    "Notification"}
                                </p>

                                {notification.created_at && (
                                  <span className="shrink-0 text-[10px] text-[#B0B3B8]">
                                    {formatNotificationTime(
                                      notification.created_at
                                    )}
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[#6B7280]">
                                {notification.message ||
                                  "You have a new notification."}
                              </p>

                            </div>

                          </button>
                        );
                      }
                    )
                  )}

                </div>


                {/* FOOTER */}

                <div className="border-t border-[#EEEEF0] bg-[#FAFAFA] px-5 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationOpen(
                        false
                      );

                      onNotificationsClick?.();
                    }}
                    className="w-full rounded-full py-2 text-xs font-semibold text-[#374151] transition hover:bg-white hover:text-[#111827]"
                  >
                    View all notifications
                  </button>
                </div>

              </div>
            )}

          </div>


          {/* ====================================================
              PROFILE
          ==================================================== */}

          <button
            type="button"
            onClick={
              onProfileClick
            }
            aria-label="Open profile"
            className="flex h-[44px] items-center gap-2 rounded-full border border-[#E7E7EA] bg-white px-2.5 transition hover:bg-[#F8F8F9]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0F1F3] text-sm font-medium text-[#4B5563]">
              {
                avatarLetter
              }
            </span>

            <ChevronDown
              size={15}
              strokeWidth={1.7}
              className="text-[#9CA3AF]"
            />
          </button>

        </div>

      </div>
    </header>
  );
}