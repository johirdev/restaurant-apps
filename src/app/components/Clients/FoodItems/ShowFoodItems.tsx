"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X, ArrowRight } from "lucide-react";
import { toast } from "react-hot-toast";
import FoodCard, { FoodItem } from "./FoodCard";
import { apiGet, getApiErrorMessage } from "@/src/lib/apiClient";

const LIMIT = 12;

interface ShowFoodItemsProps {
  /**
   * সার্ভারে রেন্ডার হওয়ার সময়েই তোলা খাবারের তালিকা।
   * থাকলে প্রথম HTML এ খাবারগুলোর নাম, দাম আর ছবি চলে যায় — গুগল
   * আর সোশ্যাল প্রিভিউ দুজনেই সেগুলো দেখতে পায়, আর ভিজিটরকে
   * JavaScript লোড হওয়ার জন্য বসে থাকতে হয় না।
   */
  initialFoods?: FoodItem[];
}

const ShowFoodItems = ({ initialFoods }: ShowFoodItemsProps = {}) => {
  const [foods, setFoods] = useState<FoodItem[]>(initialFoods ?? []);
  const [loading, setLoading] = useState(!initialFoods?.length);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // সার্চ ডিবাউন্স — টাইমারের ভেতরে state বসানো ইফেক্টের সিঙ্ক্রোনাস
  // রেন্ডার-চেইন তৈরি করে না
  useEffect(() => {
    if (searchInput === searchTerm) return;
    const t = setTimeout(() => {
      setLoading(true);
      setSearchTerm(searchInput);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput, searchTerm]);

  // searchTerm বদলালেই নতুন করে আনা হয়; পুরনো রিকোয়েস্টের উত্তর এলে
  // cancelled ফ্ল্যাগ সেটা ফেলে দেয়
  // সার্ভারের দেওয়া প্রথম তালিকাটা আবার আনার দরকার নেই; সার্চ করলে
  // তবেই নতুন করে ডাকা হয়
  const servedFromServer = useRef(!!initialFoods?.length);

  useEffect(() => {
    if (servedFromServer.current && !searchTerm.trim()) {
      servedFromServer.current = false;
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const params: Record<string, unknown> = {
          page: 1,
          limit: LIMIT,
          sortBy: "createdAt",
          sortOrder: "desc",
          status: "active",
        };
        if (searchTerm.trim()) params.searchTerm = searchTerm.trim();

        const res = await apiGet<FoodItem[]>("/api/v1/foods", params);
        if (!cancelled) setFoods(res.data || []);
      } catch (err) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(err, "Failed to load menu items"));
          setFoods([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchTerm]);

  return (
    <section className="max-width px-4 py-14 sm:px-6">
      {/* ---------------- HEADER ---------------- */}
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="site-eyebrow">Tasty &amp; crunchy</p>
          <h2 className="mt-1 font-display text-3xl font-extrabold text-ink sm:text-4xl">
            Favourite menu
          </h2>
          <p className="mt-1.5 text-[14px] text-ink-soft">
            Freshly cooked, generously portioned, delivered hot.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search for a dish…"
            aria-label="Search food"
            className="site-input h-12 rounded-pill pl-11 pr-11 text-[14px]"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint transition-colors hover:text-ink"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ---------------- CONTENT ---------------- */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-border">
              <div className="skeleton aspect-[4/3] w-full" />
              <div className="flex flex-col gap-2 p-3.5">
                <div className="skeleton h-3 w-1/3 rounded-xs" />
                <div className="skeleton h-4 w-3/4 rounded-xs" />
                <div className="skeleton h-3 w-1/2 rounded-xs" />
                <div className="skeleton mt-2 h-9 w-full rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      ) : foods.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="font-display text-xl font-bold text-ink">
            {searchTerm ? `Nothing matched “${searchTerm}”` : "No dishes yet"}
          </p>
          <p className="text-[13.5px] text-ink-soft">
            {searchTerm
              ? "Try a different word, or browse the whole menu."
              : "The kitchen is still setting up. Check back shortly."}
          </p>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="site-btn site-btn-outline h-10 px-5 text-[13px]"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {foods.map((food) => (
              <FoodCard key={food._id} food={food} />
            ))}
          </div>

          <div className="mt-9 flex justify-center">
            <Link href="/foods" className="site-btn site-btn-outline h-12 px-8 text-[13.5px]">
              See the full menu <ArrowRight size={16} />
            </Link>
          </div>
        </>
      )}
    </section>
  );
};

export default ShowFoodItems;
