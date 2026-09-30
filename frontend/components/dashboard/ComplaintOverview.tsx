"use client";

import { BarChart3, ChevronDown } from "lucide-react";

const data = [
  { day: "Mon", value: 42 },
  { day: "Tue", value: 68 },
  { day: "Wed", value: 54 },
  { day: "Thu", value: 82 },
  { day: "Fri", value: 61 },
  { day: "Sat", value: 91 },
  { day: "Sun", value: 73 },
];

export default function ComplaintOverview() {
  const maxValue = Math.max(...data.map((item) => item.value));

  return (
    <div className="min-w-0 rounded-[20px] border border-zinc-200 bg-white p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-zinc-100 text-zinc-500">
            <BarChart3 size={18} />
          </div>

          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-900">
              Issue Overview
            </h3>

            <p className="mt-1 text-[12px] text-zinc-400">
              Issues submitted over the last 7 days
            </p>
          </div>
        </div>

        {/* Period selector */}
        <button className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-2 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-50">
          Last 7 days
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Chart */}
      <div className="mt-8">
        <div className="flex h-[190px] items-end gap-3">
          {data.map((item) => (
            <div
              key={item.day}
              className="flex h-full flex-1 items-end"
            >
              <div
                className="w-full rounded-t-[9px] bg-zinc-200 transition-all duration-300 hover:bg-zinc-300"
                style={{
                  height: `${(item.value / maxValue) * 100}%`,
                }}
              />
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="mt-3 flex gap-3">
          {data.map((item) => (
            <div
              key={item.day}
              className="flex-1 text-center text-[11px] text-zinc-400"
            >
              {item.day}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4">
        <p className="text-[11px] text-zinc-400">
          Total issues
        </p>

        <p className="text-[13px] font-semibold text-zinc-900">
          471
        </p>
      </div>
    </div>
  );
}