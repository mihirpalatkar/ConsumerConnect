import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: ReactNode;
  comparisonText?: string;
}

export default function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  comparisonText = "vs. previous period",
}: StatCardProps) {
  const changeStyles = {
    positive: "text-emerald-600",
    negative: "text-red-500",
    neutral: "text-[#6B7280]",
  };

  const safeValue =
    value?.trim() || "—";

  return (
    <div className="min-h-[168px] rounded-[22px] border border-[#E7E7EA] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]">

      {/* =========================================================
          HEADER
      ========================================================= */}

      <div className="flex items-start justify-between gap-4">
        <p className="min-w-0 truncate text-[14px] font-medium text-[#6B7280]">
          {title}
        </p>

        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#F5F5F7] text-[#6B7280]">
            {icon}
          </div>
        )}
      </div>

      {/* =========================================================
          VALUE + CHANGE
      ========================================================= */}

      <div className="mt-8 flex items-end justify-between gap-4">
        <h2 className="min-w-0 truncate text-[36px] font-semibold leading-none tracking-[-0.035em] text-[#111827]">
          {safeValue}
        </h2>

        {change && (
          <span
            className={`mb-1 shrink-0 text-[13px] font-medium ${changeStyles[changeType]}`}
          >
            {change}
          </span>
        )}
      </div>

      {/* =========================================================
          COMPARISON
      ========================================================= */}

      {comparisonText && (
        <p className="mt-3 truncate text-xs text-[#9CA3AF]">
          {comparisonText}
        </p>
      )}
    </div>
  );
}