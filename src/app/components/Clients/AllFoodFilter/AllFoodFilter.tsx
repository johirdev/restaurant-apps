/* eslint-disable react-hooks/set-state-in-effect */
"use client";

/**
 * AllFoodFilter — মেনু পেজের ফিল্টার প্যানেল
 * --------------------------------------------------------------------------
 * ডেস্কটপে বাঁ পাশে sticky কার্ড হয়ে বসে, বন্ধ করলে জায়গাটা ছেড়ে দিয়ে
 * সরু একটা রেল রেখে যায়; মোবাইলে বাঁ দিক থেকে ড্রয়ার হয়ে ঢোকে।
 *
 * কম্পোনেন্টটা "controlled" — নিজে কোনো URL/ফেচ জানে না, সব প্রপ দিয়ে
 * DisplayFood থেকে আসে। শুধু দামের দুটো ঘর লোকালি ধরে রাখে, কারণ ওগুলো
 * "Apply" চাপার আগে URL এ যাওয়া উচিত নয়।
 */

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import "./foods.css";

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

export const SORT_OPTIONS: {
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
      {/* ---- মোবাইলের ব্যাকড্রপ ---- */}
      {open && (
        <div
          className="filters-backdrop"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        />
      )}

      {/* ---- বন্ধ থাকলে ডেস্কটপে সরু রেল ---- */}
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="filters-rail"
          aria-label="Open filters"
        >
          <ChevronRight aria-hidden="true" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="filters__badge">{activeFilterCount}</span>
          )}
        </button>
      )}

      {/* ---- প্যানেল / ড্রয়ার ---- */}
      <aside className={`filters${open ? " is-open" : ""}`}>
        <div className="filters__panel">
          {/* হেডার */}
          <div className="filters__head">
            <h3>
              <SlidersHorizontal aria-hidden="true" />
              Filters
              {activeFilterCount > 0 && (
                <span className="filters__badge">{activeFilterCount}</span>
              )}
            </h3>

            <div className="flex items-center gap-1">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="filters__clear"
                >
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close filters"
                className="filters__close"
              >
                <X aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* সার্চ */}
          <div className="filters__group">
            <label className="filters__label">Search</label>
            <div className="filters__field filters__field--icon">
              <Search aria-hidden="true" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search food..."
              />
            </div>
          </div>

          {/* সাজানো */}
          <div className="filters__group">
            <label className="filters__label">Sort by</label>
            <div className="filters__field">
              <select
                value={activeSortLabel}
                onChange={(e) => {
                  const opt = SORT_OPTIONS.find(
                    (o) => o.label === e.target.value,
                  );
                  if (opt) onSortChange(opt.sortBy, opt.sortOrder);
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.label}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="filters__field__chev" aria-hidden="true" />
            </div>
          </div>

          {/* ক্যাটাগরি */}
          <div className="filters__group">
            <label className="filters__label">Category</label>
            <div className="filters__cats">
              <button
                type="button"
                onClick={() => onCategoryChange("all")}
                className={`filters__cat${
                  selectedCategory === "all" ? " is-active" : ""
                }`}
              >
                <i aria-hidden="true" />
                <span>All Categories</span>
              </button>

              {categories.map((cat) => {
                const isActive = selectedCategory === cat._id;
                return (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => onCategoryChange(cat._id)}
                    className={`filters__cat${isActive ? " is-active" : ""}`}
                  >
                    {cat.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cat.image} alt="" />
                    ) : (
                      <i aria-hidden="true" />
                    )}
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* দাম */}
          <div className="filters__group">
            <label className="filters__label">Price range (৳)</label>
            <div className="filters__prices">
              <div className="filters__field">
                <input
                  type="number"
                  min={0}
                  value={localMin}
                  onChange={(e) => setLocalMin(e.target.value)}
                  placeholder="Min"
                />
              </div>
              <span>—</span>
              <div className="filters__field">
                <input
                  type="number"
                  min={0}
                  value={localMax}
                  onChange={(e) => setLocalMax(e.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => onPriceApply(localMin, localMax)}
              className="site-btn btn-3d filters__apply"
            >
              Apply price
            </button>
          </div>

          {/* স্ট্যাটাস — পাবলিক মেনুতে দরকার নেই, তাই ডিফল্টে লুকোনো */}
          {showStatusFilter && (
            <div className="filters__group">
              <label className="filters__label">Status</label>
              <div className="filters__status">
                {(["all", "active", "inactive"] as StatusOption[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onStatusChange(s)}
                    className={status === s ? "is-active" : undefined}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default AllFoodFilter;
