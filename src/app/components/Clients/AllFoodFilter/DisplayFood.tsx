/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

/**
 * DisplayFood — /foods পেজের পুরো খোল
 * --------------------------------------------------------------------------
 * সব ফিল্টার URL এ থাকে (searchTerm, category_id, minPrice, sortBy …), তাই
 * লিংক শেয়ার করলে বা রিফ্রেশ করলে ঠিক একই তালিকা ফিরে আসে।
 *
 * উপরে গাঢ় 3D হিরো (আভা + ঘূর্ণায়মান রিং + কাঁচের সার্চ বার), তার নিচে
 * ক্যাটাগরির চিপ, তারপর বাঁয়ে ফিল্টার প্যানেল আর ডানে কার্ডের গ্রিড।
 * স্টাইল foods.css এ, কার্ডের স্টাইল FoodItems/foodCard.css এ।
 */

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import {
  ChefHat,
  ChevronDown,
  Search,
  SlidersHorizontal,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Pagination from "@/src/app/Layout/Admin/Pagination/Pagination";
import AllFoodFilter, {
  SORT_OPTIONS,
  SortByOption,
  SortOrderOption,
  StatusOption,
} from "./AllFoodFilter";
import FoodCard, { FoodItem } from "../FoodItems/FoodCard";

import "./foods.css";

interface Category {
  _id: string;
  name: string;
  image?: string;
}

const LIMIT_OPTIONS = [8, 12, 20, 24, 48];
const DEFAULT_LIMIT = 20;

const DisplayFood = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  // default open on desktop
  const [filterOpen, setFilterOpen] = useState(true);

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || DEFAULT_LIMIT);
  const searchTerm = searchParams.get("searchTerm") || "";
  const categoryId = searchParams.get("category_id") || "all";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const sortBy = (searchParams.get("sortBy") as SortByOption) || "createdAt";
  const sortOrder =
    (searchParams.get("sortOrder") as SortOrderOption) || "desc";
  const status = (searchParams.get("status") as StatusOption) || "active";

  const [searchInput, setSearchInput] = useState(searchTerm);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const updateParams = (
    updates: Record<string, string | number | null | undefined>,
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (
        value === null ||
        value === undefined ||
        value === "" ||
        value === "all"
      ) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const fetchFoods = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page,
        limit,
        sortBy,
        sortOrder,
      };
      if (searchTerm.trim()) params.searchTerm = searchTerm.trim();
      if (categoryId !== "all") params.category_id = categoryId;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;
      if (status !== "all") params.status = status;

      const res = await axios.get(`/api/v1/foods`, { params });
      setFoods(res.data.data || []);
      setTotal(res.data.meta?.total ?? res.data.data?.length ?? 0);
    } catch {
      toast.error("Failed to load menu items");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`/api/v1/categories`);
      setCategories(res.data.data || []);
    } catch {
      toast.error("Failed to load categories");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchFoods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    limit,
    searchTerm,
    categoryId,
    minPrice,
    maxPrice,
    sortBy,
    sortOrder,
    status,
  ]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== searchTerm) {
        updateParams({ searchTerm: searchInput, page: 1 });
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const goToPage = (p: number) =>
    updateParams({ page: Math.min(Math.max(1, p), totalPages) });

  const activeFilterCount = [
    !!searchTerm,
    categoryId !== "all",
    !!minPrice || !!maxPrice,
    status !== "active",
    sortBy !== "createdAt" || sortOrder !== "desc",
  ].filter(Boolean).length;

  const activeSortLabel =
    SORT_OPTIONS.find((o) => o.sortBy === sortBy && o.sortOrder === sortOrder)
      ?.label || "Newest First";

  const activeCategory = categories.find((c) => c._id === categoryId);

  return (
    <section className="menu-page">
      {/* ================= HERO ================= */}
      <header className="menu-hero">
        <span className="menu-hero__aurora" aria-hidden="true" />
        <span className="menu-hero__mesh" aria-hidden="true" />
        <span className="menu-hero__ring menu-hero__ring--a" aria-hidden="true" />
        <span className="menu-hero__ring menu-hero__ring--b" aria-hidden="true" />

        <div className="menu-hero__inner">
          <span className="menu-hero__eyebrow">
            <Sparkles aria-hidden="true" />
            Tasty &amp; Crunchy
          </span>

          <h1 className="menu-hero__title">
            {activeCategory ? activeCategory.name : "Our full menu"}
          </h1>

          <p className="menu-hero__sub">
            বিশ্বের সেরা শেফদের রেসিপি থেকে অনুপ্রাণিত — ক্যাটাগরি, দাম বা
            নাম দিয়ে খুঁজুন, দুই ট্যাপেই অর্ডার হয়ে যাবে।
          </p>

          {/* সার্চ */}
          <div className="menu-search">
            <Search aria-hidden="true" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search for pizza, burger, biryani…"
              aria-label="Search menu"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="menu-search__clear"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* ছোট পরিসংখ্যান */}
          <div className="menu-hero__stats">
            <span className="menu-hero__stat">
              <UtensilsCrossed aria-hidden="true" />
              <strong>{total}</strong> dishes
            </span>
            <span className="menu-hero__stat">
              <ChefHat aria-hidden="true" />
              <strong>{categories.length}</strong> categories
            </span>
            <span className="menu-hero__stat">
              <Sparkles aria-hidden="true" />
              Freshly cooked, every order
            </span>
          </div>
        </div>
      </header>

      {/* ================= ক্যাটাগরি চিপ ================= */}
      {categories.length > 0 && (
        <div className="menu-cats no-scrollbar">
          <button
            type="button"
            onClick={() => updateParams({ category_id: "all", page: 1 })}
            className={`menu-chip${categoryId === "all" ? " is-active" : ""}`}
          >
            <span className="menu-chip__dot">
              <UtensilsCrossed aria-hidden="true" />
            </span>
            All
          </button>

          {categories.map((cat) => (
            <button
              key={cat._id}
              type="button"
              onClick={() => updateParams({ category_id: cat._id, page: 1 })}
              className={`menu-chip${categoryId === cat._id ? " is-active" : ""}`}
            >
              {cat.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cat.image} alt="" />
              ) : (
                <span className="menu-chip__dot">
                  <ChefHat aria-hidden="true" />
                </span>
              )}
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* ================= লেআউট ================= */}
      <div className="menu-layout">
        <AllFoodFilter
          open={filterOpen}
          onOpenChange={setFilterOpen}
          categories={categories}
          selectedCategory={categoryId}
          onCategoryChange={(id) => updateParams({ category_id: id, page: 1 })}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onPriceApply={(min, max) =>
            updateParams({ minPrice: min, maxPrice: max, page: 1 })
          }
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          status={status}
          onStatusChange={(s) => updateParams({ status: s, page: 1 })}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(sb, so) =>
            updateParams({ sortBy: sb, sortOrder: so, page: 1 })
          }
          onClearAll={() => {
            setSearchInput("");
            router.push(pathname);
          }}
          activeFilterCount={activeFilterCount}
          showStatusFilter={false}
        />

        <div className="menu-main">
          {/* ---------- টুলবার ---------- */}
          <div className="menu-toolbar">
            <p className="menu-toolbar__count">
              {loading ? (
                "Loading dishes…"
              ) : (
                <>
                  <strong>{total}</strong> item{total === 1 ? "" : "s"}
                  {searchTerm ? (
                    <>
                      {" "}
                      for <strong>“{searchTerm}”</strong>
                    </>
                  ) : null}
                </>
              )}
            </p>

            <div className="menu-toolbar__right">
              <div className="menu-select">
                <select
                  value={activeSortLabel}
                  onChange={(e) => {
                    const opt = SORT_OPTIONS.find(
                      (o) => o.label === e.target.value,
                    );
                    if (opt)
                      updateParams({
                        sortBy: opt.sortBy,
                        sortOrder: opt.sortOrder,
                        page: 1,
                      });
                  }}
                  aria-label="Sort dishes"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown aria-hidden="true" />
              </div>

              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                className="menu-filter-btn md:hidden"
              >
                <SlidersHorizontal aria-hidden="true" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="menu-filter-btn__count">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ---------- স্কেলিটন ---------- */}
          {loading ? (
            <div className="menu-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="menu-skel">
                  <div className="menu-skel__img skeleton" />
                  <div className="menu-skel__body">
                    <div className="menu-skel__line skeleton w-1/3" />
                    <div className="menu-skel__line skeleton w-4/5" />
                    <div className="menu-skel__line skeleton w-1/2" />
                    <div className="mt-2 h-9 w-full rounded-pill skeleton" />
                  </div>
                </div>
              ))}
            </div>
          ) : foods.length === 0 ? (
            /* ---------- খালি অবস্থা ---------- */
            <div className="menu-empty">
              <span className="menu-empty__icon">
                <UtensilsCrossed aria-hidden="true" />
              </span>
              <h3>Nothing on this plate yet</h3>
              <p>
                এই ফিল্টারে কোনো খাবার পাওয়া যায়নি। সার্চটা একটু ছোট করুন বা
                ফিল্টার মুছে আবার দেখুন।
              </p>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    router.push(pathname);
                  }}
                  className="site-btn site-btn-primary h-11 px-6 text-[12.5px] uppercase tracking-wide"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            /* ---------- গ্রিড ---------- */
            <div className="menu-grid food3d-grid">
              {foods.map((food, index) => (
                <div
                  key={food._id}
                  style={{ animationDelay: `${(index % 8) * 70}ms` }}
                >
                  <FoodCard food={food} />
                </div>
              ))}
            </div>
          )}

          {/* ---------- পেজিনেশন ---------- */}
          {!loading && total > 0 && (
            <div className="mt-8">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={goToPage}
                total={total}
                limit={limit}
                limitOptions={LIMIT_OPTIONS}
                onLimitChange={(newLimit: number) =>
                  updateParams({ limit: newLimit, page: 1 })
                }
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default DisplayFood;
