/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";

interface Category {
  _id: string;
  name: string;
  image?: string;
}

export type SortByOption = "createdAt" | "name" | "salePrice";
export type SortOrderOption = "asc" | "desc";
export type StatusOption = "all" | "active" | "inactive";

interface AllFoodFilterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  minPrice: string;
  maxPrice: string;
  onPriceApply: (min: string, max: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  status: StatusOption;
  onStatusChange: (status: StatusOption) => void;
  sortBy: SortByOption;
  sortOrder: SortOrderOption;
  onSortChange: (sortBy: SortByOption, sortOrder: SortOrderOption) => void;
  onClearAll: () => void;
  activeFilterCount: number;
  showStatusFilter?: boolean;
}

const SORT_OPTIONS: {
  label: string;
  sortBy: SortByOption;
  sortOrder: SortOrderOption;
}[] = [
  { label: "Newest First", sortBy: "createdAt", sortOrder: "desc" },
  { label: "Oldest First", sortBy: "createdAt", sortOrder: "asc" },
  { label: "Price: Low to High", sortBy: "salePrice", sortOrder: "asc" },
  { label: "Price: High to Low", sortBy: "salePrice", sortOrder: "desc" },
  { label: "Name: A to Z", sortBy: "name", sortOrder: "asc" },
  { label: "Name: Z to A", sortBy: "name", sortOrder: "desc" },
];

const AllFoodFilter = ({
  open,
  onOpenChange,
  categories,
  selectedCategory,
  onCategoryChange,
  minPrice,
  maxPrice,
  onPriceApply,
  searchValue,
  onSearchChange,
  status,
  onStatusChange,
  sortBy,
  sortOrder,
  onSortChange,
  onClearAll,
  activeFilterCount,
  showStatusFilter = false,
}: AllFoodFilterProps) => {
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);

  useEffect(() => setLocalMin(minPrice), [minPrice]);
  useEffect(() => setLocalMax(maxPrice), [maxPrice]);

  const activeSortLabel =
    SORT_OPTIONS.find((o) => o.sortBy === sortBy && o.sortOrder === sortOrder)
      ?.label || "Newest First";

  return (
    <>
      {/* ---- mobile backdrop ---- */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* ---- collapsed desktop rail: thin re-open tab ---- */}
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="hidden md:flex flex-col items-center gap-2 w-10 py-5 rounded-2xl bg-white border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.04)] text-gray-400 hover:text-gray-800 hover:border-gray-200 sticky top-6 flex-shrink-0 transition-all"
          aria-label="Open filters"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 6 15 12 9 18" />
          </svg>
          {activeFilterCount > 0 && (
            <span className="w-4.5 h-4.5 min-w-[18px] rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      )}

      {/* ---- sidebar / drawer ---- */}
      <aside
        className={`
          fixed md:sticky top-0 md:top-6 left-0 h-full md:h-auto z-50 md:z-auto
          bg-white
          transition-[transform,width,opacity,margin] duration-300 ease-out
          flex-shrink-0
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${open ? "md:w-72" : "md:w-0 md:opacity-0 md:pointer-events-none md:overflow-hidden"}
        `}
      >
        <div
          className={`
            h-full md:h-auto w-[300px] md:w-72
            rounded-none md:rounded-2xl
            border-0 md:border border-gray-100
            shadow-none md:shadow-[0_2px_16px_rgba(0,0,0,0.05)]
            overflow-y-auto
            p-5 sm:p-6
          `}
        >
          {/* header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-800"
              >
                <polygon points="4 4 20 4 14 12 14 19 10 21 10 12 4 4" />
              </svg>
              <h3 className="text-[15px] font-bold text-gray-900">Filters</h3>
              {activeFilterCount > 0 && (
                <span className="w-4.5 h-4.5 min-w-[18px] rounded-full bg-red-50 text-red-600 text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-[11px] font-semibold text-red-600 hover:underline mr-1"
                >
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close filters"
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* search */}
          <div className="mb-6">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              Search
            </label>
            <div className="relative">
              <svg
                className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search food..."
                className="w-full h-10 pl-10 pr-9 rounded-full bg-gray-50 border border-gray-100 text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-200 focus:bg-white transition-colors"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="h-px bg-gray-100 mb-6" />

          {/* sort by */}
          <div className="mb-6">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3 block">
              Sort By
            </label>
            <div className="relative">
              <select
                value={activeSortLabel}
                onChange={(e) => {
                  const opt = SORT_OPTIONS.find(
                    (o) => o.label === e.target.value,
                  );
                  if (opt) onSortChange(opt.sortBy, opt.sortOrder);
                }}
                className="w-full h-10 pl-3.5 pr-9 rounded-xl bg-gray-50 border border-gray-100 text-[13px] text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-200 focus:bg-white transition-colors"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.label}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <svg
                className="w-3.5 h-3.5 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>

          <div className="h-px bg-gray-100 mb-6" />

          {/* category */}
          <div className="mb-6">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3 block">
              Category
            </label>
            <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1 -mr-1">
              <button
                type="button"
                onClick={() => onCategoryChange("all")}
                className={`text-left px-3 py-2.5 rounded-xl text-[13px] transition-colors ${
                  selectedCategory === "all"
                    ? "bg-red-50 text-red-600 font-semibold"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => {
                const isActive = selectedCategory === cat._id;
                return (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => onCategoryChange(cat._id)}
                    className={`flex items-center gap-2.5 text-left px-3 py-2.5 rounded-xl text-[13px] transition-colors ${
                      isActive
                        ? "bg-red-50 text-red-600 font-semibold"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-gray-100"
                      />
                    ) : (
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          isActive ? "bg-red-500" : "bg-gray-300"
                        }`}
                      />
                    )}
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-gray-100 mb-6" />

          {/* price */}
          <div className={showStatusFilter ? "mb-6" : ""}>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3 block">
              Price Range (৳)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={localMin}
                onChange={(e) => setLocalMin(e.target.value)}
                placeholder="Min"
                className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-100 text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-200 focus:bg-white transition-colors"
              />
              <span className="text-gray-300 text-[13px] flex-shrink-0">—</span>
              <input
                type="number"
                min={0}
                value={localMax}
                onChange={(e) => setLocalMax(e.target.value)}
                placeholder="Max"
                className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-100 text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-200 focus:bg-white transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={() => onPriceApply(localMin, localMax)}
              className="w-full mt-3 h-10 rounded-full bg-gray-900 text-white text-[12px] font-semibold hover:bg-gray-800 active:scale-[0.98] transition-all"
            >
              Apply Price
            </button>
          </div>

          {/* status — hidden by default (client menu shows only active items) */}
          {showStatusFilter && (
            <>
              <div className="h-px bg-gray-100 mb-6" />
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3 block">
                  Status
                </label>
                <div className="flex gap-2">
                  {(["all", "active", "inactive"] as StatusOption[]).map(
                    (s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => onStatusChange(s)}
                        className={`flex-1 h-9 rounded-full text-[12px] font-semibold capitalize transition-colors ${
                          status === s
                            ? "bg-gray-900 text-white"
                            : "bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100"
                        }`}
                      >
                        {s}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default AllFoodFilter;
