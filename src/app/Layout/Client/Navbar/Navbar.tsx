/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast"; // adjust to your existing toast import

interface DropdownItem {
  label: string;
  href: string;
}

interface SubTitle {
  en?: string;
  bn?: string;
  [key: string]: string | undefined;
}

interface Category {
  _id: string;
  image?: string;
  name: string;
  sub_title?: SubTitle;
  slug?: string;
  sort_order?: number;
  status?: "active" | "inactive";
}

interface FoodVariation {
  _id: string;
  name?: string;
  regularPrice?: number;
  salePrice?: number;
  discountType?: "flat" | "percentage";
  discountValue?: number;
  is_default?: boolean;
  status?: "active" | "inactive";
  images?: { url?: string; [key: string]: any }[];
}

interface Food {
  _id: string;
  name: string;
  image?: string;
  category_id?: string;
  category_name?: string;
  status?: "active" | "inactive";
  variations?: FoodVariation[];
}

interface NavLink {
  label: string;
  href: string;
  dropdown?: DropdownItem[];
  isCategoryMenu?: boolean;
}

interface NavbarProps {
  cartCount?: number;
  navLinks?: NavLink[];
  onUserClick?: () => void;
  onCartClick?: () => void;
}

const DEFAULT_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Menu", href: "/menu", isCategoryMenu: true },
  { label: "Foods", href: "/foods" },
  { label: "About", href: "/about" },
  { label: "career", href: "/career" },
];

const BRAND_RED = "#fff";
const CART_PINK = "#E21B70";
const BADGE_YELLOW = "#fff";
const SEARCH_DEBOUNCE_MS = 3000;

const Navbar = ({
  cartCount = 0,
  navLinks = DEFAULT_LINKS,
  onUserClick,
  onCartClick,
}: NavbarProps) => {
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopDropdown, setDesktopDropdown] = useState<string | null>(null);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState(false);

  // ===== search state =====
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [foods, setFoods] = useState<Food[]>([]);
  const [foodLoading, setFoodLoading] = useState(false);
  const [foodSearched, setFoodSearched] = useState(false);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ===== fetch categories =====
  useEffect(() => {
    let cancelled = false;
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`/api/v1/categories`);
        const data: Category[] = res.data?.data || [];
        if (cancelled) return;
        setCategories(
          data
            .filter((c) => c.status !== "inactive")
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
        );
      } catch (err) {
        console.error("Failed to load categories:", err);
        if (!cancelled) setCatError(true);
      } finally {
        if (!cancelled) setCatLoading(false);
      }
    };
    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  // close desktop dropdown on outside click, close search panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setDesktopDropdown(null);
      }
      if (
        searchPanelRef.current &&
        !searchPanelRef.current.contains(e.target as Node)
      ) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // lock body scroll while mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // focus input when search panel opens
  useEffect(() => {
    if (searchOpen) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 200);
      return () => clearTimeout(t);
    } else {
      setSearchTerm("");
      setFoods([]);
      setFoodSearched(false);
    }
  }, [searchOpen]);

  // ===== debounced fetch (3s after typing stops) =====
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!searchTerm.trim()) {
      setFoods([]);
      setFoodSearched(false);
      setFoodLoading(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      fetchFoods(searchTerm.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchTerm]);

  const fetchFoods = async (term: string) => {
    try {
      setFoodLoading(true);
      const params: Record<string, any> = {
        page: 1,
        limit: 12,
        sortBy: "createdAt",
        sortOrder: "desc",
        searchTerm: term,
      };
      const res = await axios.get(`/api/v1/foods`, { params });
      setFoods(res.data.data || []);
    } catch {
      toast.error("Failed to load menu items");
      setFoods([]);
    } finally {
      setFoodLoading(false);
      setFoodSearched(true);
    }
  };

  const openDropdown = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setDesktopDropdown(label);
  };

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setDesktopDropdown(null), 150);
  };

  const hasDropdown = (link: NavLink) =>
    !!link.dropdown || !!link.isCategoryMenu;

  const handleSearchToggle = () => {
    setSearchOpen((o) => !o);
    setMobileOpen(false);
    setDesktopDropdown(null);
  };

  const goToFood = (id: string) => {
    setSearchOpen(false);
    router.push(`/food/${id}`);
  };

  // pick the default variation, fallback to first active one, then first one
  const getVariation = (f: Food): FoodVariation | undefined => {
    if (!f.variations || f.variations.length === 0) return undefined;
    return (
      f.variations.find((v) => v.is_default) ??
      f.variations.find((v) => v.status === "active") ??
      f.variations[0]
    );
  };

  const priceOf = (f: Food) => getVariation(f)?.regularPrice ?? 0;

  const discountOf = (f: Food) => {
    const v = getVariation(f);
    if (!v) return undefined;
    if (typeof v.salePrice === "number") return v.salePrice;
    if (v.discountType && v.discountValue) {
      const regular = v.regularPrice ?? 0;
      return v.discountType === "flat"
        ? regular - v.discountValue
        : Math.round(regular - (regular * v.discountValue) / 100);
    }
    return undefined;
  };

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{ background: BRAND_RED }}
    >
      <div className="mx-auto flex h-[64px] max-width items-center justify-between px-4 sm:h-[72px] sm:px-6 lg:h-[80px] lg:px-10">
        {/* ===== Logo ===== */}
        <Link href="/" className="flex flex-col leading-none flex-shrink-0">
          <span className="flex items-baseline gap-[1px] text-[22px] sm:text-[26px] lg:text-[28px] font-extrabold italic tracking-tight">
            <span className="text-black">My</span>

            <span className="text-[#E21B70]"> Restaurants</span>
            <sup className="text-[9px] text-black/80 not-italic">®</sup>
          </span>
          <span className="hidden sm:block text-[9px] lg:text-[10px] font-medium uppercase tracking-[0.15em] text-black/85 mt-0.5">
            Catering&nbsp;&nbsp;|&nbsp;&nbsp;Party
            Booking&nbsp;&nbsp;|&nbsp;&nbsp;Dine-in
          </span>
        </Link>

        {/* ===== Desktop nav ===== */}
        <nav ref={navRef} className="hidden lg:flex items-center gap-9">
          {navLinks.map((link) => (
            <div
              key={link.label}
              className="relative"
              onMouseEnter={() => hasDropdown(link) && openDropdown(link.label)}
              onMouseLeave={() => hasDropdown(link) && scheduleClose()}
            >
              {hasDropdown(link) ? (
                <button
                  type="button"
                  onClick={() =>
                    setDesktopDropdown((cur) =>
                      cur === link.label ? null : link.label,
                    )
                  }
                  className="flex items-center gap-1 text-[13px] cursor-pointer font-bold uppercase tracking-wide text-black hover:text-black/80 transition-colors"
                >
                  {link.label}
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    className={`transition-transform ${desktopDropdown === link.label ? "rotate-180" : ""}`}
                  >
                    <path
                      d="M6 9l6 6 6-6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : (
                <Link
                  href={link.href}
                  className="text-[13px] font-bold uppercase tracking-wide text-black hover:text-black/80 transition-colors"
                >
                  {link.label}
                </Link>
              )}

              {link.dropdown && desktopDropdown === link.label && (
                <div className="absolute left-0 top-full mt-3 w-52 rounded-md bg-white py-2 shadow-xl">
                  {link.dropdown.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setDesktopDropdown(null)}
                      className="block px-5 py-2.5 text-[14px] text-neutral-600 hover:bg-neutral-50 hover:text-[#E21B70] transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}

              {link.isCategoryMenu && desktopDropdown === link.label && (
                <div className="absolute left-1/2 top-full mt-3 w-[560px] -translate-x-1/2 rounded-lg bg-white p-4 shadow-xl">
                  {catLoading ? (
                    <div className="grid grid-cols-4 gap-4">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex flex-col items-center gap-2"
                        >
                          <div className="h-16 w-16 animate-pulse rounded-full bg-neutral-200" />
                          <div className="h-3 w-14 animate-pulse rounded bg-neutral-200" />
                        </div>
                      ))}
                    </div>
                  ) : catError ? (
                    <p className="py-4 text-center text-[13px] text-neutral-500">
                      Failed to load categories.
                    </p>
                  ) : categories.length === 0 ? (
                    <p className="py-4 text-center text-[13px] text-neutral-500">
                      No categories found.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-4">
                      {categories.map((cat) => (
                        <Link
                          key={cat._id}
                          href={`/foods/${cat.slug ?? cat._id}`}
                          onClick={() => setDesktopDropdown(null)}
                          className="group flex flex-col items-center gap-2 rounded-md p-2 text-center transition-colors hover:bg-neutral-50"
                        >
                          <span className="h-16 w-16 overflow-hidden rounded-full bg-neutral-100">
                            {cat.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={cat.image}
                                alt={cat.name}
                                className="h-full w-full object-cover transition-transform group-hover:scale-110"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-[11px] text-neutral-400">
                                No image
                              </span>
                            )}
                          </span>
                          <span className="text-[12.5px] font-semibold text-neutral-700 group-hover:text-[#E21B70]">
                            {cat.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* ===== Right icons ===== */}
        <div className="flex items-center gap-3 sm:gap-4 lg:gap-5 flex-shrink-0">
          <button
            type="button"
            onClick={handleSearchToggle}
            aria-label="Search"
            className={`flex text-black transition-colors ${searchOpen ? "text-[#E21B70]" : "hover:text-black/80"}`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onUserClick}
            aria-label="Account"
            className="hidden sm:flex text-black hover:text-black/80 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.8-3.6-5-8-5Z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onCartClick}
            aria-label="Cart"
            className="relative cursor-pointer flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-black transition-transform hover:scale-105"
            style={{ background: CART_PINK }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="text-white"
            >
              <path
                d="M6 6h15l-1.5 9h-12L6 6Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 6 5 3H2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="20" r="1.4" />
              <circle cx="18" cy="20" r="1.4" />
            </svg>
            <span
              className="absolute -top-1 border border-[#E21B70] -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-[#E21B70]"
              style={{ background: BADGE_YELLOW }}
            >
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileOpen((o) => !o);
              setSearchOpen(false);
            }}
            aria-label="Toggle menu"
            className="flex lg:hidden flex-col items-center justify-center gap-[5px] w-8 h-8 flex-shrink-0"
          >
            <span
              className="block h-[2px] w-6 bg-black transition-all"
              style={{
                transform: mobileOpen
                  ? "translateY(7px) rotate(45deg)"
                  : "none",
              }}
            />
            <span
              className="block h-[2px] w-6 bg-black transition-all"
              style={{ opacity: mobileOpen ? 0 : 1 }}
            />
            <span
              className="block h-[2px] w-6 bg-black transition-all"
              style={{
                transform: mobileOpen
                  ? "translateY(-7px) rotate(-45deg)"
                  : "none",
              }}
            />
          </button>
        </div>
      </div>

      {/* ===== Animated search panel ===== */}
      <div
        ref={searchPanelRef}
        className="overflow-hidden border-t border-neutral-100 bg-white shadow-lg transition-[max-height,opacity] duration-300 ease-in-out"
        style={{
          maxHeight: searchOpen ? 640 : 0,
          opacity: searchOpen ? 1 : 0,
        }}
      >
        <div className="mx-auto max-width px-4 py-4 max-w-[600px] sm:px-6 lg:px-10">
          <div className="relative flex items-center w-full sm:w-[600px] mx-auto">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="absolute left-3 text-neutral-400"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search food items..."
              className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-10 text-[14px] text-neutral-800 outline-none transition-colors focus:border-[#E21B70] focus:bg-white"
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
              className="absolute right-3 text-neutral-400 hover:text-neutral-700"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* results */}
          <div className="mt-4 max-h-[420px] overflow-y-auto">
            {foodLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="aspect-square w-full animate-pulse rounded-lg bg-neutral-200" />
                    <div className="h-3 w-3/4 animate-pulse rounded bg-neutral-200" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-200" />
                  </div>
                ))}
              </div>
            ) : foods.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {foods.map((food) => {
                  const regular = priceOf(food);
                  const discount = discountOf(food);
                  const hasDiscount = !!discount && discount < regular;
                  return (
                    <button
                      key={food._id}
                      type="button"
                      onClick={() => goToFood(food._id)}
                      className="group flex flex-col items-start text-left"
                    >
                      <span className="aspect-square w-full overflow-hidden rounded-lg bg-neutral-100">
                        {food.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={food.image}
                            alt={food.name}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[11px] text-neutral-400">
                            No image
                          </span>
                        )}
                      </span>
                      <span className="mt-2 line-clamp-2 text-[13px] font-semibold text-neutral-800 group-hover:text-[#E21B70]">
                        {food.name}
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        {hasDiscount ? (
                          <>
                            <span className="text-[13px] font-bold text-[#E21B70]">
                              ৳{discount}
                            </span>
                            <span className="text-[12px] text-neutral-400 line-through">
                              ৳{regular}
                            </span>
                          </>
                        ) : (
                          <span className="text-[13px] font-bold text-neutral-800">
                            ৳{regular}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : foodSearched ? (
              <p className="py-6 text-center text-[13px] text-neutral-500">
                No food items found for {`"${searchTerm}"`}.
              </p>
            ) : searchTerm.trim() ? (
              <p className="py-6 text-center text-[13px] text-neutral-400">
                Searching in 3s...
              </p>
            ) : (
              <p className="py-6 text-center text-[13px] text-neutral-400">
                Start typing to search food items.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===== Mobile slide-down menu ===== */}
      <div
        className="lg:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out bg-white"
        style={{ maxHeight: mobileOpen ? 520 : 0 }}
      >
        <div className="px-4 py-3 sm:px-6 max-h-[70vh] overflow-y-auto">
          <div className="flex sm:hidden items-center gap-4 pb-3 mb-2 border-b border-neutral-100">
            <button
              type="button"
              onClick={onUserClick}
              className="flex items-center gap-2 text-[13px] font-medium text-neutral-600"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.8-3.6-5-8-5Z" />
              </svg>
              Account
            </button>
          </div>

          {navLinks.map((link) => (
            <div
              key={link.label}
              className="border-b border-neutral-100 last:border-b-0"
            >
              {hasDropdown(link) ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setMobileAccordion((cur) =>
                        cur === link.label ? null : link.label,
                      )
                    }
                    className="flex w-full items-center justify-between py-3.5 text-[14px] font-bold uppercase tracking-wide text-neutral-800"
                  >
                    {link.label}
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      className={`transition-transform ${mobileAccordion === link.label ? "rotate-180" : ""}`}
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {link.dropdown && (
                    <div
                      className="overflow-hidden transition-[max-height] duration-300"
                      style={{
                        maxHeight: mobileAccordion === link.label ? 200 : 0,
                      }}
                    >
                      {link.dropdown.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className="block py-2.5 pl-4 text-[13.5px] text-neutral-500"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}

                  {link.isCategoryMenu && (
                    <div
                      className="overflow-hidden transition-[max-height] duration-300"
                      style={{
                        maxHeight: mobileAccordion === link.label ? 400 : 0,
                      }}
                    >
                      {catLoading ? (
                        <div className="grid grid-cols-4 gap-3 py-3 pl-2">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div
                              key={i}
                              className="flex flex-col items-center gap-1.5"
                            >
                              <div className="h-12 w-12 animate-pulse rounded-full bg-neutral-200" />
                              <div className="h-2.5 w-10 animate-pulse rounded bg-neutral-200" />
                            </div>
                          ))}
                        </div>
                      ) : catError ? (
                        <p className="py-3 pl-4 text-[13px] text-neutral-500">
                          Failed to load categories.
                        </p>
                      ) : categories.length === 0 ? (
                        <p className="py-3 pl-4 text-[13px] text-neutral-500">
                          No categories found.
                        </p>
                      ) : (
                        <div className="grid grid-cols-4 gap-3 py-3 pl-2">
                          {categories.map((cat) => (
                            <Link
                              key={cat._id}
                              href={`/menu/${cat.slug ?? cat._id}`}
                              onClick={() => setMobileOpen(false)}
                              className="flex flex-col items-center gap-1.5 text-center"
                            >
                              <span className="h-12 w-12 overflow-hidden rounded-full bg-neutral-100">
                                {cat.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={cat.image}
                                    alt={cat.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center text-[9px] text-neutral-400">
                                    N/A
                                  </span>
                                )}
                              </span>
                              <span className="text-[11px] font-semibold leading-tight text-neutral-700">
                                {cat.name}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-3.5 text-[14px] font-bold uppercase tracking-wide text-neutral-800"
                >
                  {link.label}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
