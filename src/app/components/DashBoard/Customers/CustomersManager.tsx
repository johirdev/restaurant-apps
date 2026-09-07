/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import DeleteModal from "@/src/app/Layout/DeleteModal/DeleteModal";
import { DateTimeBd } from "@/src/app/Layout/utils/DateTimeBd";
import { BD_DIVISIONS, BD_DIVISION_NAMES } from "@/src/config/bd-locations";

/* ==========================================================================
   কাস্টমার ম্যানেজমেন্ট — GET /api/v1/users
   --------------------------------------------------------------------------
   সার্ভারের UserFilterableFields এর সাথে ফিল্টারগুলো হুবহু মেলানো:
   searchTerm, division, district, status, favorite_dish
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
  createdAt?: string;
}

interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
}

interface Filters {
  searchTerm: string;
  division: string;
  district: string;
  status: "" | "active" | "blocked";
  favorite_dish: string;
}

const EMPTY_FILTERS: Filters = {
  searchTerm: "",
  division: "",
  district: "",
  status: "",
  favorite_dish: "",
};

const PAGE_SIZE = 12;

const initials = (c: Customer) =>
  (c.name?.trim() || c.phone)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export default function CustomersManager() {
  const { token, adminData } = useContext(AuthContext);
  const canDelete = adminData?.role === "superadmin";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  // ইনপুটে টাইপ করার সাথে সাথে সার্ভারে না গিয়ে একটু অপেক্ষা করি
  const [searchDraft, setSearchDraft] = useState("");
  const [page, setPage] = useState(1);

  const [dishOptions, setDishOptions] = useState<
    { dish: string; count: number }[]
  >([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const authHeader = { Authorization: `Bearer ${token}` };

  /* ---------------- লিস্ট ---------------- */
  const fetchCustomers = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit: PAGE_SIZE,
        sortBy: "createdAt",
        sortOrder: "desc",
      };
      // খালি ফিল্টার পাঠালে সার্ভারে `field: ""` হয়ে সব ফলাফল হারিয়ে যায়
      (Object.keys(filters) as (keyof Filters)[]).forEach((key) => {
        const value = filters[key];
        if (value) params[key] = value;
      });

      const res = await axios.get(`/api/v1/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setCustomers(res.data.data || []);
      setMeta(res.data.meta || null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [token, page, filters]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  /* ---------------- ফিল্টার ড্রপডাউনের প্রিয় খাবার ---------------- */
  useEffect(() => {
    if (!token) return;
    axios
      .get(`/api/v1/users/favorite-dishes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setDishOptions(res.data.data || []))
      .catch(() => setDishOptions([]));
  }, [token]);

  /* ---------------- সার্চ ডিবাউন্স ---------------- */
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((prev) =>
        prev.searchTerm === searchDraft.trim()
          ? prev
          : { ...prev, searchTerm: searchDraft.trim() },
      );
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value } as Filters;
      // বিভাগ বদলালে বেমানান জেলাটা রেখে দিলে ফলাফল শূন্য আসবে
      if (key === "division" && prev.district) {
        // `as const` এর কারণে ইনডেক্স করলে টাপল ইউনিয়ন আসে — readonly string[] এ
        // ধরলে includes() সাধারণ string মেনে নেয়
        const allowed: readonly string[] | null = value
          ? BD_DIVISIONS[value as keyof typeof BD_DIVISIONS]
          : null;
        if (allowed && !allowed.includes(prev.district)) next.district = "";
      }
      return next;
    });
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearchDraft("");
    setPage(1);
  };

  const districtOptions = filters.division
    ? BD_DIVISIONS[filters.division as keyof typeof BD_DIVISIONS]
    : Object.values(BD_DIVISIONS).flat().sort();

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  /* ---------------- ব্লক / আনব্লক ---------------- */
  const toggleStatus = async (customer: Customer) => {
    const next = customer.status === "active" ? "blocked" : "active";
    setBusyId(customer._id);
    try {
      const res = await axios.patch(
        `/api/v1/users/${customer._id}`,
        { status: next },
        { headers: authHeader },
      );
      setCustomers((prev) =>
        prev.map((c) => (c._id === customer._id ? { ...c, status: next } : c)),
      );
      toast.success(res.data.message);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not update status");
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleted = () => {
    if (deleteId) setCustomers((prev) => prev.filter((c) => c._id !== deleteId));
    setModalOpen(false);
    setDeleteId(null);
  };

  const totalPage = meta?.totalPage ?? 1;

  return (
    <div className="admin-panel bg-app text-primary min-h-screen p-4 md:p-6">
      {modalOpen && deleteId && (
        <DeleteModal
          deleteUrl={`/api/v1/users/${deleteId}`}
          title="Customer"
          onDeleted={handleDeleted}
          closeModal={() => {
            setModalOpen(false);
            setDeleteId(null);
          }}
        />
      )}

      {/* ================= হেডার ================= */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-primary text-[20px] font-semibold">Customers</h1>
          <p className="text-secondary mt-0.5 text-[13px]">
            {meta
              ? `${meta.total} customer${meta.total === 1 ? "" : "s"} registered`
              : "Everyone who has signed in with a phone number"}
          </p>
        </div>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="btn btn-outline px-4 py-2 text-[13px]"
          >
            Clear filters ({activeFilterCount})
          </button>
        )}
      </div>

      {/* ================= ফিল্টার ================= */}
      <div className="bg-card border-default mb-5 rounded-xl p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <label className="text-secondary mb-1.5 block text-[12px] font-medium">
              Search
            </label>
            <input
              type="text"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Name, phone, email or village…"
              className="input-field h-10 w-full px-3 text-[14px]"
            />
          </div>

          <div>
            <label className="text-secondary mb-1.5 block text-[12px] font-medium">
              Division
            </label>
            <select
              value={filters.division}
              onChange={(e) => setFilter("division", e.target.value)}
              className="input-field h-10 w-full px-3 text-[14px]"
            >
              <option value="">All divisions</option>
              {BD_DIVISION_NAMES.map((d) => (
                <option key={d} value={d} className="bg-elevated text-primary">
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-secondary mb-1.5 block text-[12px] font-medium">
              District
            </label>
            <select
              value={filters.district}
              onChange={(e) => setFilter("district", e.target.value)}
              className="input-field h-10 w-full px-3 text-[14px]"
            >
              <option value="">All districts</option>
              {districtOptions.map((d) => (
                <option key={d} value={d} className="bg-elevated text-primary">
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-secondary mb-1.5 block text-[12px] font-medium">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilter("status", e.target.value)}
              className="input-field h-10 w-full px-3 text-[14px]"
            >
              <option value="">All</option>
              <option value="active" className="bg-elevated text-primary">
                Active
              </option>
              <option value="blocked" className="bg-elevated text-primary">
                Blocked
              </option>
            </select>
          </div>
        </div>

        {/* প্রিয় খাবার — কোন পদ কে কে পছন্দ করে, অফার পাঠানোর সময় কাজে লাগে */}
        {dishOptions.length > 0 && (
          <div className="border-default-t mt-4 pt-3">
            <p className="text-secondary mb-2 text-[12px] font-medium">
              Favourite dish
            </p>
            <div className="flex flex-wrap gap-2">
              {dishOptions.slice(0, 14).map(({ dish, count }) => (
                <button
                  key={dish}
                  type="button"
                  onClick={() =>
                    setFilter(
                      "favorite_dish",
                      filters.favorite_dish === dish ? "" : dish,
                    )
                  }
                  className={`role-pill px-3 py-1.5 text-[12.5px] font-medium ${
                    filters.favorite_dish === dish ? "active-admin" : ""
                  }`}
                >
                  {dish}
                  <span className="text-muted ml-1.5">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= টেবিল ================= */}
      <div className="bg-card border-default overflow-hidden rounded-xl">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="admin-skeleton h-14 rounded-lg" />
            ))}
          </div>
        ) : !customers.length ? (
          <div className="px-6 py-16 text-center">
            <p className="text-primary text-[15px] font-medium">
              No customers found
            </p>
            <p className="text-secondary mt-1 text-[13px]">
              {activeFilterCount
                ? "Try widening or clearing the filters."
                : "Customers appear here as soon as someone logs in."}
            </p>
          </div>
        ) : (
          <>
            {/* ---------- ডেস্কটপ ---------- */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="admin-table w-full text-left">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-[12px] font-medium">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-[12px] font-medium">
                      Location
                    </th>
                    <th className="px-4 py-3 text-[12px] font-medium">
                      Favourites
                    </th>
                    <th className="px-4 py-3 text-[12px] font-medium">Joined</th>
                    <th className="px-4 py-3 text-[12px] font-medium">Status</th>
                    <th className="px-4 py-3 text-right text-[12px] font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c, i) => (
                    <tr
                      key={c._id}
                      className={`table-row-hover ${i % 2 ? "table-row-alt" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="text-highlight flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-[12px] font-medium"
                            style={{ background: "var(--accent-blue-soft)" }}
                          >
                            {c.image?.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={c.image.url}
                                alt={c.name || c.phone}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              initials(c)
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="text-primary truncate text-[14px] font-medium">
                              {c.name?.trim() || "Unnamed"}
                            </p>
                            <p className="text-secondary text-[12.5px]">
                              {c.phone}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="text-secondary px-4 py-3 text-[13px]">
                        {c.district ? (
                          <>
                            {c.district}
                            {c.division && (
                              <span className="text-muted"> · {c.division}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted">Not set</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {c.favorite_dishes?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {c.favorite_dishes.slice(0, 2).map((d) => (
                              <span
                                key={d}
                                className="chip chip-muted px-2 py-0.5 text-[11.5px]"
                              >
                                {d}
                              </span>
                            ))}
                            {c.favorite_dishes.length > 2 && (
                              <span className="text-muted text-[11.5px]">
                                +{c.favorite_dishes.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted text-[12.5px]">—</span>
                        )}
                      </td>

                      <td className="text-secondary px-4 py-3 text-[12.5px]">
                        {DateTimeBd(c.createdAt)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`chip px-2.5 py-1 text-[11.5px] ${
                            c.status === "active"
                              ? "chip-delivered"
                              : "chip-cancelled"
                          }`}
                        >
                          {c.status === "active" ? "Active" : "Blocked"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/customers/${c._id}`}
                            className="btn btn-outline px-3 py-1.5 text-[12.5px]"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => toggleStatus(c)}
                            disabled={busyId === c._id}
                            className={`btn px-3 py-1.5 text-[12.5px] ${
                              c.status === "active" ? "btn-danger" : "btn-green"
                            }`}
                          >
                            {c.status === "active" ? "Block" : "Unblock"}
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteId(c._id);
                                setModalOpen(true);
                              }}
                              className="btn btn-ghost px-3 py-1.5 text-[12.5px]"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ---------- মোবাইল ---------- */}
            <div className="border-default divide-y lg:hidden">
              {customers.map((c) => (
                <div key={c._id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className="text-highlight flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-[12px] font-medium"
                      style={{ background: "var(--accent-blue-soft)" }}
                    >
                      {c.image?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.image.url}
                          alt={c.name || c.phone}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials(c)
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-primary truncate text-[14px] font-medium">
                            {c.name?.trim() || "Unnamed"}
                          </p>
                          <p className="text-secondary text-[12.5px]">
                            {c.phone}
                          </p>
                        </div>
                        <span
                          className={`chip px-2.5 py-1 text-[11.5px] ${
                            c.status === "active"
                              ? "chip-delivered"
                              : "chip-cancelled"
                          }`}
                        >
                          {c.status === "active" ? "Active" : "Blocked"}
                        </span>
                      </div>

                      <p className="text-muted mt-1 text-[12px]">
                        {c.district || "No district"} ·{" "}
                        {DateTimeBd(c.createdAt)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/dashboard/customers/${c._id}`}
                          className="btn btn-outline px-3 py-1.5 text-[12.5px]"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleStatus(c)}
                          disabled={busyId === c._id}
                          className={`btn px-3 py-1.5 text-[12.5px] ${
                            c.status === "active" ? "btn-danger" : "btn-green"
                          }`}
                        >
                          {c.status === "active" ? "Block" : "Unblock"}
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteId(c._id);
                              setModalOpen(true);
                            }}
                            className="btn btn-ghost px-3 py-1.5 text-[12.5px]"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ================= পেজিনেশন ================= */}
      {totalPage > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-secondary text-[12.5px]">
            Page {meta?.page ?? page} of {totalPage} · {meta?.total ?? 0} total
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="btn btn-outline px-4 py-2 text-[13px]"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPage, p + 1))}
              disabled={page >= totalPage || loading}
              className="btn btn-outline px-4 py-2 text-[13px]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
