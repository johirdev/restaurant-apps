// src/app/dashboard/food/AllItems.tsx
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import DeleteModal from "@/src/app/Layout/DeleteModal/DeleteModal";
import Pagination from "@/src/app/Layout/Admin/Pagination/Pagination";
import Link from "next/link";

type Status = "active" | "inactive";
type ViewMode = "grid" | "table";

interface Category {
  _id: string;
  name: string;
  image?: string;
}

interface VariationApi {
  _id: string;
  name: string;
  sku: string;
  barcode: string;
  regularPrice: number;
  salePrice: number;
  status?: Status;
  isOpen?: boolean;
  is_default?: boolean;
  images?: { url: string; public_id: string }[];
}

interface FoodItem {
  _id: string;
  name: string;
  category_id?: string;
  category_name?: string;
  image?: string;
  status?: Status;
  variations: VariationApi[];
  createdAt?: string;
}

type StatusFilter = "all" | "active" | "inactive";

const VIEW_STORAGE_KEY = "food-items-view-mode";
const LIMIT_OPTIONS = [1,12, 24, 48, 96];

const AllItems = () => {
  const { token } = useContext(AuthContext);
  const headers = { Authorization: `Bearer ${token}` };

  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(24);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const [matchedId, setMatchedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | HTMLTableRowElement | null>>({});
  const scanBufferTime = useRef<number>(0);
  const scanModeRef = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchFoods = async (opts?: { searchTerm?: string; page?: number }) => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: opts?.page ?? page,
        limit,
        sortBy: "createdAt",
        sortOrder: "desc",
      };
      const term = opts?.searchTerm ?? searchTerm;
      if (term.trim()) params.searchTerm = term.trim();
      if (categoryFilter !== "all") params.category_id = categoryFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await axios.get(`/api/v1/foods`, { headers, params });
      const data: FoodItem[] = res.data.data || [];
      setFoods(data);
      setTotal(res.data.meta?.total ?? data.length);

      if (scanModeRef.current) {
        scanModeRef.current = false;
        if (data.length === 1) {
          setMatchedId(data[0]._id);
          toast.success(`Found: ${data[0].name}`);
          requestAnimationFrame(() => {
            itemRefs.current[data[0]._id]?.scrollIntoView({ behavior: "smooth", block: "center" });
          });
          window.setTimeout(() => setMatchedId(null), 2200);
        } else if (data.length === 0) {
          toast.error("No item matches that code");
        }
      }
    } catch {
      toast.error("Failed to load food items");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`/api/v1/categories`, { headers });
      setCategories(res.data.data || []);
    } catch {
      toast.error("Failed to load categories");
    }
  };

  useEffect(() => {
    fetchCategories();
    const savedView = window.localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode | null;
    if (savedView === "grid" || savedView === "table") setViewMode(savedView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchFoods({ page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, categoryFilter, statusFilter, page, limit]);

  const changeView = (mode: ViewMode) => {
    setViewMode(mode);
    window.localStorage.setItem(VIEW_STORAGE_KEY, mode);
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    const now = Date.now();
    const isFastInput = now - scanBufferTime.current < 40;
    scanBufferTime.current = now;
    if (isFastInput || value.length >= 8) scanModeRef.current = true;
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchInput.trim()) {
      scanModeRef.current = true;
      setSearchTerm(searchInput);
      setPage(1);
    }
  };

  const closeDeleteModal = () => {
    setModalOpen(false);
    setDeleteId(null);
  };
  const handleDeleted = () => {
    if (!deleteId) return;
    setFoods((prev) => prev.filter((f) => f._id !== deleteId));
    setTotal((t) => Math.max(0, t - 1));
    closeDeleteModal();
  };

  const priceRange = (food: FoodItem) => {
    const prices = food.variations.map((v) => v.salePrice ?? v.regularPrice ?? 0);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `৳${min}` : `৳${min} – ৳${max}`;
  };

  const statusBadge = (status?: Status) => {
    const isActive = (status || "active") === "active";
    return (
      <span
        className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
        style={{
          background: isActive ? "var(--accent-green-soft)" : "rgba(239,68,68,0.12)",
          color: isActive ? "var(--accent-green)" : "var(--accent-red)",
        }}
      >
        {isActive ? "Active" : "Inactive"}
      </span>
    );
  };

  const activeFilterCount = [searchInput, categoryFilter !== "all", statusFilter !== "all"].filter(Boolean).length;

  const goToPage = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

  return (
    <div className="admin-panel bg-app text-primary min-h-screen p-3 sm:p-5 lg:p-6">
      <style jsx global>{`
        @keyframes scanMatchPulse {
          0% {
            box-shadow: 0 0 0 0 var(--accent-blue);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }
        .scan-matched {
          animation: scanMatchPulse 1s ease-out 2;
          outline: 2px solid var(--accent-blue);
        }
      `}</style>

      {modalOpen && (
        <DeleteModal
          deleteUrl={`/api/v1/foods/${deleteId}`}
          title="Food Item"
          onDeleted={handleDeleted}
          closeModal={closeDeleteModal}
        />
      )}

      {/* ============== TOOLBAR ============== */}
      <div className="bg-card border-default rounded-xl p-3 sm:p-4 mb-4 sm:mb-5 flex flex-col gap-3">
        <div className="grid items-center md:grid-cols-2 gap-2">
          <div className="">
            <h1 className="text-base sm:text-lg font-semibold text-primary">
              All Food Items
            </h1>
          </div>
          {/* Search — full width, always first row */}
          <div className="relative">
            <svg
              className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M3 7v10M7 5v14M11 5v14M15 5v14M19 7v10" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Scan barcode or search by name / SKU..."
              className="input-field w-full h-10 sm:h-11 pl-10 pr-9 text-[13px] sm:text-[14px]"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary text-[13px]"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filters row — wraps freely on small screens */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="input-field h-9 sm:h-10 px-2.5 sm:px-3 text-[12px] sm:text-[13px] flex-1 min-w-[130px] sm:flex-none sm:w-44"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(1);
            }}
            className="input-field h-9 sm:h-10 px-2.5 sm:px-3 text-[12px] sm:text-[13px] flex-1 min-w-[110px] sm:flex-none sm:w-36"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* View toggle — icon only on mobile, icon+label from sm up */}
          <div
            className="flex items-center gap-1 p-1 rounded-lg border-default ml-auto"
            style={{ background: "var(--bg-input)" }}
          >
            <button
              type="button"
              onClick={() => changeView("grid")}
              aria-label="Grid view"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 h-7 sm:h-8 rounded-md text-[12px] font-medium transition-colors"
              style={{
                background:
                  viewMode === "grid" ? "var(--bg-card)" : "transparent",
                color:
                  viewMode === "grid"
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => changeView("table")}
              aria-label="Table view"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 h-7 sm:h-8 rounded-md text-[12px] font-medium transition-colors"
              style={{
                background:
                  viewMode === "table" ? "var(--bg-card)" : "transparent",
                color:
                  viewMode === "table"
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <rect x="3" y="4" width="18" height="4" rx="1" />
                <rect x="3" y="10" width="18" height="4" rx="1" />
                <rect x="3" y="16" width="18" height="4" rx="1" />
              </svg>
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="btn btn-outline h-9 sm:h-10 px-3 text-[12px] whitespace-nowrap"
            >
              Clear ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* ============== RESULTS ============== */}
      {loading ? (
        <div className="bg-card border-default rounded-xl p-6">
          <p className="text-secondary text-[13px] sm:text-sm">Loading...</p>
        </div>
      ) : foods.length === 0 ? (
        <div className="bg-card border-default rounded-xl px-4 py-10 text-center">
          <p className="text-secondary text-[13px] sm:text-sm">
            {total === 0 && activeFilterCount === 0
              ? "No food items yet."
              : "No items match your search or filters."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* ============== GRID VIEW ============== */
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {foods.map((food) => (
            <div
              key={food._id}
              ref={(el) => {
                itemRefs.current[food._id] = el;
              }}
              className={`bg-card border-default rounded-xl overflow-hidden flex flex-col transition-shadow ${
                matchedId === food._id ? "scan-matched" : ""
              }`}
            >
              <div
                className="relative w-full aspect-square"
                style={{ background: "var(--bg-input)" }}
              >
                {food.image ? (
                  <img
                    src={food.image}
                    alt={food.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-7 h-7 sm:w-8 sm:h-8 text-muted"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
                  {statusBadge(food.status)}
                </div>
                <div
                  className="absolute bottom-0 left-0 right-0 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-medium text-white"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.65), transparent)",
                  }}
                >
                  {food.variations.length} variation
                  {food.variations.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="p-2.5 sm:p-4 flex flex-col gap-1.5 sm:gap-2 flex-1">
                <div>
                  <h3 className="text-[12.5px] sm:text-[14px] font-medium text-primary truncate leading-tight">
                    {food.name}
                  </h3>
                  <p className="text-[11px] sm:text-[12px] text-secondary truncate">
                    {food.category_name || "No category"}
                  </p>
                </div>

                <p className="text-[13px] sm:text-[14px] font-semibold text-highlight">
                  {priceRange(food)}
                </p>

                <div className="hidden sm:flex flex-wrap gap-1.5">
                  {food.variations.slice(0, 3).map((v) => (
                    <span
                      key={v._id}
                      className="text-[10px] px-2 py-0.5 rounded-full border-default text-secondary truncate max-w-full"
                    >
                      {v.name}
                    </span>
                  ))}
                  {food.variations.length > 3 && (
                    <span className="text-[10px] text-muted">
                      +{food.variations.length - 3}
                    </span>
                  )}
                </div>

                <div className="flex gap-1.5 sm:gap-2 pt-2 mt-auto border-default-t">
                  <Link
                    href={`/dashboard/menu/food-create`}
                    className="btn btn-blue flex-1 py-1.5 text-[11px] sm:text-[12px] text-center"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(true);
                      setDeleteId(food._id);
                    }}
                    className="btn btn-danger flex-1 py-1.5 text-[11px] sm:text-[12px]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ============== TABLE VIEW ============== */
        <div className="bg-card border-default rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-[12.5px] sm:text-[13px]">
              <thead>
                <tr
                  className="border-default-b text-left"
                  style={{ background: "var(--bg-input)" }}
                >
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-secondary">
                    Item
                  </th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-secondary">
                    Category
                  </th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-secondary">
                    Variations
                  </th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-secondary">
                    Price
                  </th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-secondary">
                    Status
                  </th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-secondary text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {foods.map((food) => (
                  <tr
                    key={food._id}
                    ref={(el) => {
                      itemRefs.current[food._id] = el;
                    }}
                    className={`border-default-b last:border-b-0 transition-shadow ${
                      matchedId === food._id ? "scan-matched" : ""
                    }`}
                  >
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div
                          className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg overflow-hidden flex-shrink-0 border-default flex items-center justify-center"
                          style={{ background: "var(--bg-input)" }}
                        >
                          {food.image ? (
                            <img
                              src={food.image}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <svg
                              className="w-4 h-4 text-muted"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                            >
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <path d="M21 15l-5-5L5 21" />
                            </svg>
                          )}
                        </div>
                        <span className="font-medium text-primary truncate max-w-[140px] sm:max-w-[180px]">
                          {food.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-secondary">
                      {food.category_name || "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px] sm:max-w-[220px]">
                        {food.variations.slice(0, 2).map((v) => (
                          <span
                            key={v._id}
                            className="text-[10px] px-1.5 py-0.5 rounded-full border-default text-secondary"
                          >
                            {v.name}
                          </span>
                        ))}
                        {food.variations.length > 2 && (
                          <span className="text-[10px] text-muted self-center">
                            +{food.variations.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-highlight whitespace-nowrap">
                      {priceRange(food)}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                      {statusBadge(food.status)}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/dashboard/menu/food-create`}
                          className="btn btn-blue px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-[12px]"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setModalOpen(true);
                            setDeleteId(food._id);
                          }}
                          className="btn btn-danger px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-[12px]"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============== PAGINATION ============== */}
      {!loading && total > 0 && (
        <div className="mt-4 sm:mt-5">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={goToPage}
            total={total}
            limit={limit}
            limitOptions={LIMIT_OPTIONS}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default AllItems;