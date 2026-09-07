/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";

/* ==========================================================================
   REPORT SHELL — চারটে রিপোর্ট পেজেরই সাধারণ মোড়ক
   --------------------------------------------------------------------------
   তারিখের রেঞ্জ বাছা, ডেটা আনা আর লোডিং/এরর — সব এখানে একবারেই।
   প্রতিটা পেজ শুধু নিজের টেবিলটা আঁকে।
   ========================================================================== */

export type ReportRange = "today" | "week" | "month" | "year" | "custom";

const RANGES: { value: ReportRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom" },
];

interface ReportShellProps<T> {
  title: string;
  subtitle?: string;
  /** `/api/v1/reports/sales` ইত্যাদি */
  endpoint: string;
  children: (data: T, range: ReportRange) => React.ReactNode;
}

export default function ReportShell<T>({
  title,
  subtitle,
  endpoint,
  children,
}: ReportShellProps<T>) {
  const { token } = useContext(AuthContext);

  const [range, setRange] = useState<ReportRange>("today");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        params:
          range === "custom"
            ? { range, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }
            : { range },
      });
      setData(res.data.data);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || "Could not generate this report";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token, endpoint, range, dateFrom, dateTo]);

  useEffect(() => {
    // কাস্টম রেঞ্জে দুটো তারিখ বসানোর আগেই বারবার সার্ভারে যাওয়ার মানে নেই
    if (range === "custom" && !dateFrom && !dateTo) return;
    load();
  }, [load, range, dateFrom, dateTo]);

  return (
    <div className="admin-panel bg-app text-primary min-h-screen p-4 md:p-6">
      {/* ================= হেডার ================= */}
      <div className="mb-5">
        <h1 className="text-primary text-[20px] font-semibold">{title}</h1>
        {subtitle && (
          <p className="text-secondary mt-0.5 text-[13px]">{subtitle}</p>
        )}
      </div>

      {/* ================= রেঞ্জ ================= */}
      <div className="bg-card border-default mb-5 rounded-xl p-4">
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={`role-pill px-3.5 py-1.5 text-[12.5px] font-medium ${
                range === r.value ? "active-admin" : ""
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {range === "custom" && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-secondary mb-1 block text-[12px]">From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-field h-9 px-2.5 text-[13px]"
              />
            </label>
            <label className="block">
              <span className="text-secondary mb-1 block text-[12px]">To</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-field h-9 px-2.5 text-[13px]"
              />
            </label>
            <button
              type="button"
              onClick={load}
              className="btn btn-outline px-4 py-2 text-[13px]"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* ================= বিষয়বস্তু ================= */}
      {loading ? (
        <div className="space-y-3">
          <div className="admin-skeleton h-24 rounded-xl" />
          <div className="admin-skeleton h-72 rounded-xl" />
        </div>
      ) : error ? (
        <div className="bg-card border-default rounded-xl px-6 py-16 text-center">
          <p className="text-danger text-[14px] font-medium">{error}</p>
          <button
            type="button"
            onClick={load}
            className="btn btn-outline mt-4 px-5 py-2 text-[13px]"
          >
            Try again
          </button>
        </div>
      ) : data ? (
        children(data, range)
      ) : null}
    </div>
  );
}

/* ==========================================================================
   রিপোর্ট পেজগুলোর ভাগ করা ছোট অংশ
   ========================================================================== */

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-card border-default rounded-xl px-4 py-3.5">
      <p className="text-secondary text-[12px]">{label}</p>
      <p className="text-primary mt-1 text-[20px] font-semibold">{value}</p>
      {hint && <p className="text-muted mt-0.5 text-[11.5px]">{hint}</p>}
    </div>
  );
}

/**
 * সহজ বার চার্ট — কোনো লাইব্রেরি ছাড়াই।
 * বিক্রির বাঁকটা চোখে দেখা গেলে ম্যানেজার সিদ্ধান্ত নিতে পারে, সংখ্যার
 * সারি গুনতে হয় না।
 */
export function BarChart({
  rows,
  valueFormat,
}: {
  rows: { label: string; value: number; caption?: string }[];
  valueFormat: (n: number) => string;
}) {
  if (!rows.length) {
    return (
      <p className="text-secondary px-5 py-10 text-center text-[13px]">
        Nothing in this period yet.
      </p>
    );
  }

  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="text-secondary w-24 flex-shrink-0 truncate text-[12px]">
            {row.label}
          </span>
          <div
            className="h-6 flex-1 overflow-hidden rounded"
            style={{ background: "var(--bg-elevated)" }}
          >
            <div
              className="h-full rounded"
              style={{
                width: `${Math.max(2, (row.value / max) * 100)}%`,
                background: "var(--accent-primary)",
              }}
            />
          </div>
          <span className="text-primary w-24 flex-shrink-0 text-right text-[12.5px] font-medium tabular-nums">
            {valueFormat(row.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TableCard({
  title,
  headers,
  children,
}: {
  title: string;
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border-default overflow-hidden rounded-xl">
      <div className="border-default-b px-5 py-4">
        <h2 className="text-primary text-[15px] font-medium">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="admin-table w-full text-left">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-[12px] font-medium ${
                    i > 0 ? "text-right" : ""
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
