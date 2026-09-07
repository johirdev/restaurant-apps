/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import DeleteModal from "@/src/app/Layout/DeleteModal/DeleteModal";
import { DateTimeBd } from "@/src/app/Layout/utils/DateTimeBd";
import { formatMoney } from "@/src/config/business";

/* ==========================================================================
   একজন কাস্টমারের বিস্তারিত — GET /api/v1/users/:id
   --------------------------------------------------------------------------
   সার্ভার একই কলে প্রোফাইল, খরচের হিসাব, চালু ব্লক আর শেষ ১০টা অর্ডার
   পাঠায়, তাই এই পেজে একটাই রিকোয়েস্ট লাগে।
   ========================================================================== */

interface Customer {
  _id: string;
  phone: string;
  name?: string;
  email?: string;
  image?: { url?: string };
  division?: string;
  district?: string;
  village?: string;
  address?: string;
  favorite_dishes: string[];
  status: "active" | "blocked";
  phone_verified: boolean;
  last_login_at?: string | null;
  last_login_ip?: string;
  known_ips: string[];
  notes?: string;
  createdAt?: string;
}

interface AuthBlock {
  _id: string;
  key: string;
  type: "phone" | "ip";
  reason: string;
  blocked_until: string;
}

interface RecentOrder {
  _id: string;
  order_number: string;
  status: string;
  createdAt: string;
  pricing: { total: number };
  items: { name: string; quantity: number }[];
}

interface Details {
  user: Customer;
  stats: { orders: number; spent: number };
  blocks: AuthBlock[];
  recentOrders: RecentOrder[];
}

const STATUS_CHIP: Record<string, string> = {
  pending: "chip-pending",
  confirmed: "chip-confirmed",
  preparing: "chip-preparing",
  ready: "chip-ready",
  out_for_delivery: "chip-out_for_delivery",
  delivered: "chip-delivered",
  cancelled: "chip-cancelled",
};

export default function CustomerDetails({ id }: { id: string }) {
  const { token, adminData } = useContext(AuthContext);
  const canDelete = adminData?.role === "superadmin";
  const router = useRouter();

  const [details, setDetails] = useState<Details | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState("");

  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`/api/v1/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: Details = res.data.data;
      setDetails(data);
      setNotes(data.user.notes || "");
      setNotFound("");
    } catch (err: any) {
      setNotFound(
        err?.response?.data?.message || "Could not load this customer",
      );
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    load();
  }, [load]);

  const authHeader = { Authorization: `Bearer ${token}` };

  /* ---------------- অ্যাকাউন্ট ব্লক / আনব্লক ---------------- */
  const toggleStatus = async () => {
    if (!details) return;
    const next = details.user.status === "active" ? "blocked" : "active";
    setBusy(true);
    try {
      const res = await axios.patch(
        `/api/v1/users/${id}`,
        { status: next },
        { headers: authHeader },
      );
      setDetails((prev) =>
        prev ? { ...prev, user: { ...prev.user, status: next } } : prev,
      );
      toast.success(res.data.message);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not update status");
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- OTP/লগইন ব্লক তুলে দেওয়া ---------------- */
  const removeLoginBlock = async () => {
    setBusy(true);
    try {
      const res = await axios.post(
        `/api/v1/users/${id}/unblock`,
        {},
        { headers: authHeader },
      );
      toast.success(res.data.message);
      // ব্লকের তালিকাটা সার্ভার থেকেই আবার নিই — কয়টা মুছল সেটাও তখন মিলবে
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not remove the block");
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- নোট ---------------- */
  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await axios.patch(
        `/api/v1/users/${id}`,
        { notes: notes.trim() },
        { headers: authHeader },
      );
      setDetails((prev) =>
        prev
          ? { ...prev, user: { ...prev.user, notes: notes.trim() } }
          : prev,
      );
      toast.success(res.data.message);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not save the note");
    } finally {
      setSavingNotes(false);
    }
  };

  /* ---------------- স্টেট ---------------- */
  if (loading) {
    return (
      <div className="admin-panel bg-app text-primary min-h-screen space-y-3 p-4 md:p-6">
        <div className="admin-skeleton h-28 rounded-xl" />
        <div className="admin-skeleton h-64 rounded-xl" />
      </div>
    );
  }

  if (notFound || !details) {
    return (
      <div className="admin-panel bg-app text-primary min-h-screen p-4 md:p-6">
        <div className="bg-card border-default rounded-xl px-6 py-16 text-center">
          <p className="text-danger text-[15px] font-medium">
            {notFound || "Customer not found"}
          </p>
          <Link
            href="/dashboard/customers"
            className="btn btn-outline mt-4 inline-flex px-5 py-2 text-[13px]"
          >
            Back to customers
          </Link>
        </div>
      </div>
    );
  }

  const { user, stats, blocks, recentOrders } = details;
  const initials =
    (user.name?.trim() || user.phone)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

  return (
    <div className="admin-panel bg-app text-primary min-h-screen p-4 md:p-6">
      {modalOpen && (
        <DeleteModal
          deleteUrl={`/api/v1/users/${id}`}
          title="Customer"
          onDeleted={() => router.push("/dashboard/customers")}
          closeModal={() => setModalOpen(false)}
        />
      )}

      <Link
        href="/dashboard/customers"
        className="text-secondary hover:text-highlight mb-4 inline-flex items-center gap-1.5 text-[13px] transition-colors"
      >
        ← Back to customers
      </Link>

      {/* ================= প্রোফাইল হেডার ================= */}
      <div className="bg-card border-default mb-5 rounded-xl p-5 md:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <span
            className="text-highlight flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-[18px] font-medium"
            style={{ background: "var(--accent-blue-soft)" }}
          >
            {user.image?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image.url}
                alt={user.name || user.phone}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-primary text-[19px] font-semibold">
                {user.name?.trim() || "Unnamed customer"}
              </h1>
              <span
                className={`chip px-2.5 py-1 text-[11.5px] ${
                  user.status === "active" ? "chip-delivered" : "chip-cancelled"
                }`}
              >
                {user.status === "active" ? "Active" : "Blocked"}
              </span>
              {user.phone_verified && (
                <span className="chip chip-confirmed px-2.5 py-1 text-[11.5px]">
                  Phone verified
                </span>
              )}
            </div>

            <p className="text-secondary mt-1 text-[13.5px]">
              {user.phone}
              {user.email && <span className="text-muted"> · {user.email}</span>}
            </p>
            <p className="text-muted mt-0.5 text-[12.5px]">
              Joined {DateTimeBd(user.createdAt)}
              {user.last_login_at &&
                ` · last login ${DateTimeBd(user.last_login_at)}`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleStatus}
              disabled={busy}
              className={`btn px-4 py-2 text-[13px] ${
                user.status === "active" ? "btn-danger" : "btn-green"
              }`}
            >
              {user.status === "active" ? "Block account" : "Unblock account"}
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="btn btn-ghost px-4 py-2 text-[13px]"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================= পরিসংখ্যান ================= */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Orders" value={String(stats.orders)} />
        <Stat label="Total spent" value={formatMoney(stats.spent)} />
        <Stat
          label="Avg. order"
          value={formatMoney(stats.orders ? stats.spent / stats.orders : 0)}
        />
        <Stat
          label="Known devices"
          value={String(user.known_ips?.length || 0)}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
        {/* ================= বাঁ পাশ ================= */}
        <div className="space-y-5">
          {/* ---------- চালু ব্লক ---------- */}
          {blocks.length > 0 && (
            <div
              className="border-default rounded-xl p-5"
              style={{ background: "var(--accent-red-soft)" }}
            >
              <h2 className="text-primary text-[15px] font-medium">
                Login is blocked
              </h2>
              <p className="text-secondary mt-1 text-[13px]">
                Too many OTP requests or wrong codes. Removing the block lets
                this customer log in again straight away.
              </p>

              <ul className="mt-3 space-y-2">
                {blocks.map((b) => (
                  <li
                    key={b._id}
                    className="bg-card border-default rounded-lg px-3.5 py-2.5"
                  >
                    <p className="text-primary text-[13px] font-medium">
                      {b.type === "phone" ? "This number" : "This device"} ·
                      until {DateTimeBd(b.blocked_until)}
                    </p>
                    <p className="text-secondary mt-0.5 text-[12.5px]">
                      {b.reason}
                    </p>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={removeLoginBlock}
                disabled={busy}
                className="btn btn-green mt-4 px-4 py-2 text-[13px]"
              >
                Remove login block
              </button>
            </div>
          )}

          {/* ---------- সাম্প্রতিক অর্ডার ---------- */}
          <div className="bg-card border-default overflow-hidden rounded-xl">
            <div className="border-default-b px-5 py-4">
              <h2 className="text-primary text-[15px] font-medium">
                Recent orders
              </h2>
              <p className="text-secondary mt-0.5 text-[12.5px]">
                Last {recentOrders.length} order
                {recentOrders.length === 1 ? "" : "s"} from this customer
              </p>
            </div>

            {recentOrders.length ? (
              <div className="border-default divide-y">
                {recentOrders.map((o) => (
                  <div
                    key={o._id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-primary text-[13.5px] font-medium">
                        {o.order_number}
                      </p>
                      <p className="text-secondary mt-0.5 truncate text-[12.5px]">
                        {o.items
                          .map((i) => `${i.quantity}× ${i.name}`)
                          .join(", ")}
                      </p>
                    </div>
                    <span
                      className={`chip px-2.5 py-1 text-[11.5px] ${
                        STATUS_CHIP[o.status] || "chip-muted"
                      }`}
                    >
                      {o.status.replace(/_/g, " ")}
                    </span>
                    <div className="text-right">
                      <p className="text-primary text-[13.5px] font-medium">
                        {formatMoney(o.pricing.total)}
                      </p>
                      <p className="text-muted text-[11.5px]">
                        {DateTimeBd(o.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary px-5 py-10 text-center text-[13px]">
                This customer has not ordered yet.
              </p>
            )}
          </div>
        </div>

        {/* ================= ডান পাশ ================= */}
        <div className="space-y-5">
          {/* ---------- ঠিকানা ---------- */}
          <div className="bg-card border-default rounded-xl p-5">
            <h2 className="text-primary text-[15px] font-medium">
              Delivery details
            </h2>
            <dl className="mt-3 space-y-2.5">
              <Row label="Division" value={user.division} />
              <Row label="District" value={user.district} />
              <Row label="Village / area" value={user.village} />
              <Row label="Address" value={user.address} />
            </dl>
          </div>

          {/* ---------- প্রিয় খাবার ---------- */}
          <div className="bg-card border-default rounded-xl p-5">
            <h2 className="text-primary text-[15px] font-medium">
              Favourite dishes
            </h2>
            {user.favorite_dishes?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {user.favorite_dishes.map((d) => (
                  <span
                    key={d}
                    className="chip chip-muted px-2.5 py-1 text-[12px]"
                  >
                    {d}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted mt-2 text-[12.5px]">
                Nothing saved yet.
              </p>
            )}
          </div>

          {/* ---------- অভ্যন্তরীণ নোট ---------- */}
          <div className="bg-card border-default rounded-xl p-5">
            <h2 className="text-primary text-[15px] font-medium">
              Internal note
            </h2>
            <p className="text-secondary mt-1 text-[12.5px]">
              Only staff can see this — the customer never does.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="e.g. Always asks for extra salad, calls before delivery…"
              className="input-field mt-3 w-full resize-none px-3 py-2.5 text-[13.5px]"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted text-[11.5px]">
                {notes.length}/500
              </span>
              <button
                type="button"
                onClick={saveNotes}
                disabled={savingNotes || notes === (user.notes || "")}
                className="btn btn-primary px-4 py-2 text-[13px]"
              >
                {savingNotes ? "Saving…" : "Save note"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- ছোট প্রেজেন্টেশন হেল্পার ---------- */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border-default rounded-xl px-4 py-3.5">
      <p className="text-secondary text-[12px]">{label}</p>
      <p className="text-primary mt-1 text-[19px] font-semibold">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex gap-3">
      <dt className="text-secondary w-[110px] flex-shrink-0 text-[12.5px]">
        {label}
      </dt>
      <dd className="text-primary flex-1 text-[13px]">
        {value?.trim() || <span className="text-muted">Not set</span>}
      </dd>
    </div>
  );
}
