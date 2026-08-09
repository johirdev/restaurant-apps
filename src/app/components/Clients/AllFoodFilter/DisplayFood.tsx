/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import Pagination from "@/src/app/Layout/Admin/Pagination/Pagination";
import AllFoodFilter, {
  SortByOption,
  SortOrderOption,
  StatusOption,
} from "./AllFoodFilter";
import FoodCard, { FoodItem } from "../FoodItems/FoodCard";

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

  return (
    <section className="max-width mx-auto px-4 sm:px-6 py-10 sm:py-12">
      {/* ---------------- PAGE HEADER ---------------- */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <span className="inline-block bg-red-600 text-white text-[11px] font-semibold px-3 py-1 rounded-sm mb-3 -skew-x-6">
            Tasty &amp; Crunchy
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Favorite Menu
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Inspired by recipes and creations of world&apos;s best chefs
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className="md:hidden inline-flex items-center gap-2 border border-gray-300 rounded-full px-4 py-2.5 text-[12px] font-semibold text-gray-700 flex-shrink-0 hover:bg-gray-50 transition-colors"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
            <circle cx="9" cy="7" r="1.8" fill="currentColor" stroke="none" />
            <circle cx="16" cy="12" r="1.8" fill="currentColor" stroke="none" />
            <circle cx="11" cy="17" r="1.8" fill="currentColor" stroke="none" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="w-4.5 h-4.5 min-w-[18px] rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
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

        <div className="flex-1 min-w-0 w-full">
          {/* ---------------- LOADING SKELETON ---------------- */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-[26px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] px-5 pt-6 pb-5 flex flex-col items-center animate-pulse"
                >
                  <div className="h-4 mb-1 w-8 bg-gray-100 rounded" />
                  <div className="w-full aspect-square bg-gray-100 rounded-xl" />
                  <div className="h-3 w-3/4 bg-gray-100 rounded mt-4" />
                  <div className="h-3 w-1/3 bg-gray-100 rounded mt-2" />
                  <div className="w-full h-9 bg-gray-100 rounded-full mt-4" />
                </div>
              ))}
            </div>
          ) : foods.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
              <p className="text-gray-400 text-sm">No items found.</p>
            </div>
          ) : (
            <>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {foods.map((food, index) => (
                  <div
                    key={food._id}
                    className="food-card-enter"
                    style={{ animationDelay: `${(index % 8) * 70}ms` }}
                  >
                    <FoodCard food={food} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ---------------- PAGINATION ---------------- */}
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
