/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import DeleteModal from "@/src/app/Layout/DeleteModal/DeleteModal";
import { formatMoney } from "@/src/config/business";
import { can, MANAGEMENT } from "@/src/app/dashboard/roles";
import { getApiErrorMessage } from "@/src/lib/apiClient";
import { deleteImage, replaceImage, validateImage } from "@/src/lib/upload";
import type { TableStatus } from "@/src/interfaces/table.interface";

/* ==========================================================================
   TABLES — ফ্লোর ম্যাপ + টেবিল তৈরি/সম্পাদনা
   --------------------------------------------------------------------------
   ম্যানেজার এক নজরে দেখে কোন টেবিল খালি, কোনটায় খাওয়া চলছে, কার দায়িত্বে।
   ওয়েটার শুধু অবস্থা বদলাতে পারে; টেবিল বানানো/মোছা ম্যানেজারের কাজ।
   ========================================================================== */

interface CurrentOrder {
  _id: string;
  order_number: string;
  status: string;
  total: number;
  items_count: number;
  createdAt: string;
}

interface Table {
  _id: string;
  name: string;
  sort_order: number;
  image?: string;
  image_public_id?: string;
  capacity: number;
  zone?: string;
  status: TableStatus;
  waiter_id?: string;
  waiter_name?: string;
  notes?: string;
  is_active: boolean;
  current_order?: CurrentOrder | null;
}

interface WaitingParty {
  _id: string;
  order_number: string;
  name: string;
  phone: string;
  guests: number;
  table_name: string;
  position: number;
  waiting_minutes: number;
  estimated_wait_minutes: number;
}

interface Waitlist {
  waiting: number;
  free_tables: number;
  total_tables: number;
  average_dining_minutes: number;
  measured_from_orders: number;
  queue: WaitingParty[];
}

interface Staff {
  _id: string;
  staff_name: string;
  staff_role: string;
  status: string;
}

const STATUS_META: Record<
  TableStatus,
  { label: string; chip: string; dot: string }
> = {
  free: { label: "Free", chip: "chip-delivered", dot: "var(--accent-green)" },
  occupied: {
    label: "Occupied",
    chip: "chip-preparing",
    dot: "var(--accent-orange)",
  },
  reserved: { label: "Reserved", chip: "chip-confirmed", dot: "var(--accent-blue)" },
  cleaning: { label: "Cleaning", chip: "chip-muted", dot: "var(--text-muted)" },
};

const EMPTY_FORM = {
  name: "",
  capacity: 4,
  zone: "",
  sort_order: 0,
  waiter_id: "",
  notes: "",
  image: "",
  image_public_id: "",
  is_active: true,
};

const MAX_IMAGE_MB = 2;

export default function TablesManager() {
  const { token, adminData } = useContext(AuthContext);
  const canManage = can(adminData?.role, MANAGEMENT);

  const [tables, setTables] = useState<Table[]>([]);
  const [waitlist, setWaitlist] = useState<Waitlist | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoneFilter, setZoneFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const authHeader = { Authorization: `Bearer ${token}` };

  /* ---------------- ডেটা ---------------- */
  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [floorRes, waitRes] = await Promise.all([
        axios.get("/api/v1/tables?view=floor", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("/api/v1/tables/waitlist", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setTables(floorRes.data.data || []);
      setWaitlist(waitRes.data.data || null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not load tables");
    } finally {
      setLoading(false);
    }
  }, [token]);

  /** সারি থেকে একজনকে টেবিলে বসিয়ে অর্ডারটা কনফার্ম করে দেয় */
  const seat = async (party: WaitingParty, tableId: string) => {
    setBusyId(party._id);
    try {
      const res = await axios.post(
        `/api/v1/orders/${party._id}/seat`,
        { table_id: tableId },
        { headers: authHeader },
      );
      toast.success(res.data.message);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not seat them");
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!token || !canManage) return;
    axios
      .get("/api/v1/staffs", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setStaff(res.data.data || []))
      .catch(() => setStaff([]));
  }, [token, canManage]);

  // ব্যস্ত সময়ে ম্যানেজার স্ক্রিনটা খোলা রাখে — নিজে থেকেই তাজা থাকা দরকার
  useEffect(() => {
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  /* ---------------- হিসাব ---------------- */
  const zones = useMemo(
    () => [...new Set(tables.map((t) => t.zone).filter(Boolean))] as string[],
    [tables],
  );

  const visible = zoneFilter
    ? tables.filter((t) => t.zone === zoneFilter)
    : tables;

  const counts = useMemo(() => {
    const base = { free: 0, occupied: 0, reserved: 0, cleaning: 0 };
    tables.forEach((t) => {
      base[t.status] = (base[t.status] ?? 0) + 1;
    });
    return base;
  }, [tables]);

  /** এখন যেসব টেবিলে কেউ বসে নেই — সারি থেকে বসানোর জন্য */
  const freeTables = tables.filter((t) => !t.current_order && t.status !== "cleaning");

  const waiters = staff.filter(
    (s) => s.status === "active" && ["waiter", "manager"].includes(s.staff_role),
  );

  /* ---------------- ফর্ম ---------------- */
  const openCreate = () => {
    setForm({ ...EMPTY_FORM, sort_order: tables.length + 1 });
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (table: Table) => {
    setForm({
      name: table.name,
      capacity: table.capacity,
      zone: table.zone || "",
      sort_order: table.sort_order ?? 0,
      waiter_id: table.waiter_id || "",
      notes: table.notes || "",
      image: table.image || "",
      image_public_id: table.image_public_id || "",
      is_active: table.is_active,
    });
    setEditingId(table._id);
    setFormOpen(true);
  };

  const pickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const problem = validateImage(file, MAX_IMAGE_MB);
    if (problem) {
      toast.error(problem);
      return;
    }

    setUploading(true);
    try {
      // Cloudinary তে যায় → URL ফেরত আসে → পুরোনো ছবিটা মুছে যায়
      const uploaded = await replaceImage(file, "tables", {
        url: form.image,
        public_id: form.image_public_id,
      });
      setForm((p) => ({
        ...p,
        image: uploaded.url,
        image_public_id: uploaded.public_id,
      }));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Image upload failed"));
    } finally {
      setUploading(false);
    }
  };

  /** ছবি সরানো — Cloudinary থেকেও যাক, নাহলে ফাইলটা পড়ে থাকে */
  const removeImage = async () => {
    const publicId = form.image_public_id;
    setForm((p) => ({ ...p, image: "", image_public_id: "" }));
    await deleteImage(publicId);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Give the table a name");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim() };
      const res = editingId
        ? await axios.patch(`/api/v1/tables/${editingId}`, payload, {
            headers: authHeader,
          })
        : await axios.post("/api/v1/tables", payload, { headers: authHeader });

      toast.success(res.data.message);
      setFormOpen(false);
      setEditingId(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not save the table");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- অবস্থা বদল ---------------- */
  const setStatus = async (table: Table, status: TableStatus) => {
    setBusyId(table._id);
    try {
      const res = await axios.patch(
        `/api/v1/tables/${table._id}/status`,
        { status },
        { headers: authHeader },
      );
      toast.success(res.data.message);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not change the table");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="admin-panel bg-app text-primary min-h-screen p-4 md:p-6">
      {deleteId && (
        <DeleteModal
          deleteUrl={`/api/v1/tables/${deleteId}`}
          title="Table"
          onDeleted={() => {
            setTables((prev) => prev.filter((t) => t._id !== deleteId));
            setDeleteId(null);
          }}
          closeModal={() => setDeleteId(null)}
        />
      )}

      {/* ================= হেডার ================= */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-primary text-[20px] font-semibold">Tables</h1>
          <p className="text-secondary mt-0.5 text-[13px]">
            {counts.free} free · {counts.occupied} occupied · {counts.reserved}{" "}
            reserved · {counts.cleaning} cleaning
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="btn btn-primary px-4 py-2 text-[13px]"
          >
            + New table
          </button>
        )}
      </div>

      {/* ================= অপেক্ষমাণ সারি ================= */}
      {!!waitlist?.queue?.length && (
        <div
          className="border-default mb-5 rounded-xl p-4"
          style={{ background: "var(--accent-orange-soft)" }}
        >
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-primary text-[15px] font-medium">
              Waiting for a table ({waitlist.waiting})
            </h2>
            <p className="text-secondary text-[12px]">
              {waitlist.free_tables} free now · average{" "}
              {waitlist.average_dining_minutes} min per table
              {waitlist.measured_from_orders > 0
                ? ` (measured from ${waitlist.measured_from_orders} orders)`
                : " (estimate — not enough history yet)"}
            </p>
          </div>

          <div className="space-y-2">
            {waitlist.queue.map((party) => (
              <div
                key={party._id}
                className="bg-card border-default flex flex-wrap items-center gap-3 rounded-lg px-3.5 py-2.5"
              >
                <span className="text-highlight text-[15px] font-semibold">
                  #{party.position}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-primary truncate text-[13.5px] font-medium">
                    {party.name}
                    {party.guests ? ` · ${party.guests} guests` : ""}
                  </p>
                  <p className="text-secondary text-[12px]">
                    {party.order_number} · waiting {party.waiting_minutes} min
                    {party.table_name ? ` · wants ${party.table_name}` : ""}
                  </p>
                </div>

                {/* এক ক্লিকে টেবিল বসানো + কনফার্ম */}
                <select
                  value=""
                  disabled={busyId === party._id}
                  onChange={(e) => e.target.value && seat(party, e.target.value)}
                  className="input-field h-9 px-2.5 text-[13px]"
                >
                  <option value="">
                    {freeTables.length ? "Seat at…" : "No free table"}
                  </option>
                  {freeTables.map((t) => (
                    <option
                      key={t._id}
                      value={t._id}
                      className="bg-elevated text-primary"
                    >
                      {t.name} ({t.capacity} seats)
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= জোন ফিল্টার ================= */}
      {zones.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setZoneFilter("")}
            className={`role-pill px-3.5 py-1.5 text-[12.5px] font-medium ${
              !zoneFilter ? "active-admin" : ""
            }`}
          >
            All areas
          </button>
          {zones.map((zone) => (
            <button
              key={zone}
              type="button"
              onClick={() => setZoneFilter(zone)}
              className={`role-pill px-3.5 py-1.5 text-[12.5px] font-medium ${
                zoneFilter === zone ? "active-admin" : ""
              }`}
            >
              {zone}
            </button>
          ))}
        </div>
      )}

      {/* ================= ফ্লোর ম্যাপ ================= */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="admin-skeleton h-52 rounded-xl" />
          ))}
        </div>
      ) : !visible.length ? (
        <div className="bg-card border-default rounded-xl px-6 py-16 text-center">
          <p className="text-primary text-[15px] font-medium">No tables yet</p>
          <p className="text-secondary mx-auto mt-1.5 max-w-sm text-[13px]">
            Add your tables once — after that every dine-in order, bill and
            report can be tied to the right table.
          </p>
          {canManage && (
            <button
              type="button"
              onClick={openCreate}
              className="btn btn-primary mt-5 px-5 py-2 text-[13px]"
            >
              Add the first table
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((table) => {
            const meta = STATUS_META[table.status] ?? STATUS_META.free;
            const order = table.current_order;

            return (
              <div
                key={table._id}
                className="bg-card border-default overflow-hidden rounded-xl"
                style={{ borderColor: meta.dot }}
              >
                {/* ছবি */}
                <div
                  className="relative h-24 w-full overflow-hidden"
                  style={{ background: "var(--accent-blue-soft)" }}
                >
                  {table.image ? (
                    <img
                      src={table.image}
                      alt={table.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-muted flex h-full w-full items-center justify-center text-[12px]">
                      No photo
                    </span>
                  )}
                  <span
                    className={`chip ${meta.chip} absolute right-2 top-2 px-2.5 py-1 text-[11px]`}
                  >
                    {meta.label}
                  </span>
                </div>

                <div className="p-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-primary truncate text-[15px] font-medium">
                      {table.name}
                    </h3>
                    <span className="text-muted text-[11.5px]">
                      {table.capacity} seats
                    </span>
                  </div>

                  <p className="text-secondary mt-0.5 truncate text-[12px]">
                    {table.zone || "No area"}
                    {table.waiter_name && ` · ${table.waiter_name}`}
                  </p>

                  {/* চলতি অর্ডার */}
                  {order ? (
                    <Link
                      href={`/dashboard/pos?order=${order._id}`}
                      className="border-default mt-3 block rounded-lg px-3 py-2.5 transition-colors"
                      style={{ background: "var(--accent-orange-soft)" }}
                    >
                      <p className="text-primary text-[12.5px] font-medium">
                        {order.order_number}
                      </p>
                      <p className="text-secondary mt-0.5 text-[11.5px]">
                        {order.items_count} item
                        {order.items_count === 1 ? "" : "s"} ·{" "}
                        {formatMoney(order.total)} ·{" "}
                        {order.status.replace(/_/g, " ")}
                      </p>
                    </Link>
                  ) : (
                    <Link
                      href={`/dashboard/pos?table=${table._id}`}
                      className="btn btn-outline mt-3 w-full px-3 py-2 text-[12.5px]"
                    >
                      Take an order
                    </Link>
                  )}

                  {/* ফ্লোরের কাজ */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {(["free", "reserved", "cleaning"] as TableStatus[])
                      .filter((s) => s !== table.status && !order)
                      .map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatus(table, s)}
                          disabled={busyId === table._id}
                          className="btn btn-ghost px-2.5 py-1 text-[11.5px]"
                        >
                          {STATUS_META[s].label}
                        </button>
                      ))}

                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(table)}
                          className="btn btn-ghost px-2.5 py-1 text-[11.5px]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(table._id)}
                          className="btn btn-ghost text-danger px-2.5 py-1 text-[11.5px]"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= তৈরি / সম্পাদনা ================= */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <form
            onSubmit={submit}
            className="bg-card border-default max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl sm:rounded-2xl"
          >
            <div className="border-default-b flex items-center justify-between px-5 py-4">
              <h2 className="text-primary text-[16px] font-medium">
                {editingId ? "Edit table" : "New table"}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-secondary hover:text-primary text-[20px] leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              {/* ছবি */}
              <div className="flex items-center gap-4">
                <div
                  className="border-default h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl"
                  style={{ background: "var(--accent-blue-soft)" }}
                >
                  {form.image ? (
                    <img
                      src={form.image}
                      alt="Table"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-muted flex h-full w-full items-center justify-center text-[11px]">
                      No photo
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="btn btn-outline cursor-pointer px-4 py-2 text-[13px]">
                      {uploading
                        ? "Uploading…"
                        : form.image
                          ? "Change"
                          : "Add photo"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={pickImage}
                        className="hidden"
                      />
                    </label>

                    {form.image && (
                      <button
                        type="button"
                        onClick={removeImage}
                        className="btn btn-ghost px-3 py-2 text-[13px]"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-muted mt-1.5 text-[11.5px]">
                    Max {MAX_IMAGE_MB}MB — helps waiters find the table fast
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-primary mb-1.5 block text-[13px] font-medium">
                    Table name <span className="text-danger">*</span>
                  </span>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="T-01"
                    maxLength={40}
                    className="input-field h-10 w-full px-3 text-[14px]"
                  />
                </label>

                <label className="block">
                  <span className="text-primary mb-1.5 block text-[13px] font-medium">
                    Seats
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={form.capacity}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, capacity: Number(e.target.value) }))
                    }
                    className="input-field h-10 w-full px-3 text-[14px]"
                  />
                </label>

                <label className="block">
                  <span className="text-primary mb-1.5 block text-[13px] font-medium">
                    Area / zone
                  </span>
                  <input
                    value={form.zone}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, zone: e.target.value }))
                    }
                    placeholder="Ground floor"
                    maxLength={60}
                    className="input-field h-10 w-full px-3 text-[14px]"
                  />
                </label>

                <label className="block">
                  <span className="text-primary mb-1.5 block text-[13px] font-medium">
                    Order on the map
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        sort_order: Number(e.target.value),
                      }))
                    }
                    className="input-field h-10 w-full px-3 text-[14px]"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-primary mb-1.5 block text-[13px] font-medium">
                  Waiter in charge
                </span>
                <select
                  value={form.waiter_id}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, waiter_id: e.target.value }))
                  }
                  className="input-field h-10 w-full px-3 text-[14px]"
                >
                  <option value="">Nobody yet</option>
                  {waiters.map((w) => (
                    <option
                      key={w._id}
                      value={w._id}
                      className="bg-elevated text-primary"
                    >
                      {w.staff_name} ({w.staff_role})
                    </option>
                  ))}
                </select>
                {!waiters.length && (
                  <span className="text-muted mt-1 block text-[11.5px]">
                    Add waiters under Team → Staff first.
                  </span>
                )}
              </label>

              <label className="block">
                <span className="text-primary mb-1.5 block text-[13px] font-medium">
                  Note
                </span>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  rows={2}
                  maxLength={300}
                  placeholder="Near the window, good for families…"
                  className="input-field w-full resize-none px-3 py-2.5 text-[14px]"
                />
              </label>

              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, is_active: e.target.checked }))
                  }
                  className="h-4 w-4 cursor-pointer"
                />
                <span className="text-primary text-[13px]">
                  Table is in use (uncheck to hide it from the floor map)
                </span>
              </label>
            </div>

            <div className="border-default-t flex gap-3 px-5 py-4">
              <button
                type="submit"
                disabled={saving || uploading}
                className="btn btn-primary flex-1 px-5 py-2.5 text-[14px]"
              >
                {saving ? "Saving…" : editingId ? "Save changes" : "Create table"}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="btn btn-outline px-5 py-2.5 text-[13px]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
