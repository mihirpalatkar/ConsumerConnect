"use client";

import {
  User,
  Mail,
  ShieldCheck,
  Hash,
  X,
  Settings,
  Bell,
  Search,
  Moon,
  Lock,
} from "lucide-react";
import { useEffect } from "react";

interface ProfileData {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
}

interface ProfileSettingsModalProps {
  profile: ProfileData | null;

  openProfile: boolean;
  openSettings: boolean;

  onClose: () => void;
}

function getInitial(name?: string) {
  return (
    name
      ?.trim()
      .charAt(0)
      .toUpperCase() || "U"
  );
}

export default function ProfileSettingsModal({
  profile,
  openProfile,
  openSettings,
  onClose,
}: ProfileSettingsModalProps) {
  const visible =
    openProfile || openSettings;

  useEffect(() => {
    if (!visible) {
      return;
    }

    function handleEscape(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [
    visible,
    onClose,
  ]);

  if (!visible) {
    return null;
  }

  const displayName =
    profile?.name?.trim() ||
    "User";

  const displayEmail =
    profile?.email?.trim() ||
    "Not available";

  const displayRole =
    profile?.role?.trim() ||
    "Consumer";

  const initial =
    getInitial(
      displayName
    );

  const isSettings =
    openSettings && !openProfile;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-5 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[720px] overflow-hidden rounded-[28px] border border-[#E7E7EA] bg-white shadow-[0_30px_100px_rgba(0,0,0,0.18)]">

        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-[#EEEEF0] px-7 py-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#F5F5F7] text-[#6B7280]">
                {isSettings ? (
                  <Settings
                    size={19}
                  />
                ) : (
                  <User
                    size={19}
                  />
                )}
              </div>

              <div>
                <h2 className="text-lg font-semibold text-[#111827]">
                  {isSettings
                    ? "Settings"
                    : "Profile"}
                </h2>

                <p className="mt-0.5 text-xs text-[#9CA3AF]">
                  {isSettings
                    ? "Manage your dashboard preferences."
                    : "Your ConsumerConnect account details."}
                </p>
              </div>
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

        {/* CONTENT */}
        {isSettings ? (
          <div className="p-7">
            <div className="space-y-3">

              <div className="flex items-center justify-between rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F5F5F7] text-[#6B7280]">
                    <Bell size={18} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[#111827]">
                      Notifications
                    </p>

                    <p className="mt-1 text-xs text-[#9CA3AF]">
                      Control how notification activity is shown.
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-[#F5F5F7] px-3 py-1 text-[10px] font-semibold text-[#6B7280]">
                  Enabled
                </span>
              </div>

              <div className="flex items-center justify-between rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F5F5F7] text-[#6B7280]">
                    <Search size={18} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[#111827]">
                      Search
                    </p>

                    <p className="mt-1 text-xs text-[#9CA3AF]">
                      Search issues directly from the topbar.
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-[#F5F5F7] px-3 py-1 text-[10px] font-semibold text-[#6B7280]">
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F5F5F7] text-[#6B7280]">
                    <Moon size={18} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[#111827]">
                      Appearance
                    </p>

                    <p className="mt-1 text-xs text-[#9CA3AF]">
                      Dashboard appearance preferences.
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-[#F5F5F7] px-3 py-1 text-[10px] font-semibold text-[#6B7280]">
                  Light
                </span>
              </div>

              <div className="flex items-center justify-between rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F5F5F7] text-[#6B7280]">
                    <Lock size={18} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[#111827]">
                      Account security
                    </p>

                    <p className="mt-1 text-xs text-[#9CA3AF]">
                      Your account is protected by authenticated access.
                    </p>
                  </div>
                </div>

                <ShieldCheck
                  size={18}
                  className="text-emerald-500"
                />
              </div>

            </div>

            <div className="mt-6 rounded-[18px] bg-[#F8F8F9] p-5">
              <p className="text-xs font-semibold text-[#374151]">
                ConsumerConnect settings
              </p>

              <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">
                This panel is ready for additional preferences such as notification preferences, theme controls and account options.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-7">

            {/* PROFILE HERO */}
            <div className="flex flex-col items-center rounded-[22px] bg-[#F8F8F9] px-6 py-8 text-center">
              <div className="flex h-[82px] w-[82px] items-center justify-center rounded-full bg-[#E7E8EA] text-2xl font-semibold text-[#4B5563]">
                {initial}
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

            {/* DETAILS */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">

              <div className="rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-2">
                  <User
                    size={15}
                    className="text-[#9CA3AF]"
                  />

                  <p className="text-xs text-[#9CA3AF]">
                    Name
                  </p>
                </div>

                <p className="mt-2 text-sm font-semibold text-[#111827]">
                  {displayName}
                </p>
              </div>

              <div className="rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-2">
                  <Mail
                    size={15}
                    className="text-[#9CA3AF]"
                  />

                  <p className="text-xs text-[#9CA3AF]">
                    Email
                  </p>
                </div>

                <p className="mt-2 break-words text-sm font-semibold text-[#111827]">
                  {displayEmail}
                </p>
              </div>

              <div className="rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck
                    size={15}
                    className="text-[#9CA3AF]"
                  />

                  <p className="text-xs text-[#9CA3AF]">
                    Account type
                  </p>
                </div>

                <p className="mt-2 text-sm font-semibold text-[#111827]">
                  {displayRole}
                </p>
              </div>

              <div className="rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-2">
                  <Hash
                    size={15}
                    className="text-[#9CA3AF]"
                  />

                  <p className="text-xs text-[#9CA3AF]">
                    User ID
                  </p>
                </div>

                <p className="mt-2 text-sm font-semibold text-[#111827]">
                  {profile?.id ??
                    "—"}
                </p>
              </div>
            </div>

            {/* FOOTER */}
            <div className="mt-5 flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#242424]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}