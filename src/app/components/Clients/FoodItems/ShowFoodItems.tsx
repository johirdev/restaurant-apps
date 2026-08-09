/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import FoodCard, { FoodItem } from "./FoodCard";

const LIMIT = 20;

const ShowFoodItems = () => {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchFoods = async (term: string) => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: 1,
        limit: LIMIT,
        sortBy: "createdAt",
        sortOrder: "desc",
        status: "active",
      };
      if (term.trim()) params.searchTerm = term.trim();

      const res = await axios.get(`/api/v1/foods`, { params });
      setFoods(res.data.data || []);
    } catch {
      toast.error("Failed to load menu items");
    } finally {
      setLoading(false);
    }
  };

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchFoods(searchTerm);
     
  }, [searchTerm]);

  return (
    <section className="max-width mx-auto px-4 sm:px-6 py-12">
      {/* ---------------- HEADER ---------------- */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
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

        <div className="relative w-full md:w-72">
          <svg
            className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search food..."
            className="w-full h-11 pl-10 pr-4 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ---------------- LOADING SKELETON ---------------- */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-[26px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] px-5 pt-6 pb-5 flex flex-col items-center animate-pulse"
            >
              <div className="w-full aspect-square bg-gray-100 rounded-xl" />
              <div className="h-3 w-3/4 bg-gray-100 rounded mt-4" />
              <div className="h-3 w-1/3 bg-gray-100 rounded mt-2" />
              <div className="w-full h-9 bg-gray-100 rounded-full mt-4" />
            </div>
          ))}
        </div>
      ) : foods.length === 0 ? (
        <p className="text-center text-gray-400 py-16 text-sm">
          No items found.
        </p>
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
    </section>
  );
};

export default ShowFoodItems;
