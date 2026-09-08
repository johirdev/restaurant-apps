/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast"; // adjust to your existing toast import
import {
  useCartStore,
  useCartHydrated,
  selectItemCount,
} from "@/src/store/cart.store";
import AccountMenu from "@/src/app/components/Clients/Auth/AccountMenu";

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
  navLinks?: NavLink[];
}

const DEFAULT_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Menu", href: "/menu", isCategoryMenu: true },
  { label: "Foods", href: "/foods" },
  { label: "Track order", href: "/track-order" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

// রঙ globals.css এর টোকেন থেকে আসে — এখানে কোনো hex নেই,
// তাই থিম বদলালে নেভবারও নিজে থেকেই বদলে যায়।
const SEARCH_DEBOUNCE_MS = 400;

const Navbar = ({ navLinks = DEFAULT_LINKS }: NavbarProps) => {
  const router = useRouter();

  // ===== cart (global zustand store) =====
  const cartCount = useCartStore(selectItemCount);
  const openCart = useCartStore((s) => s.openCart);
  const lastAddedKey = useCartStore((s) => s.lastAddedKey);
  const cartHydrated = useCartHydrated();
  const [bump, setBump] = useState(false);

  // কার্টে নতুন কিছু যোগ হলে ব্যাজটা একবার লাফ দেয়
  useEffect(() => {
    if (!lastAddedKey) return;
    setBump(true);
    const t = setTimeout(() => setBump(false), 450);
    return () => clearTimeout(t);
  }, [lastAddedKey, cartCount]);

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
    router.push(`/foods/${id}`);
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
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-[64px] max-width items-center justify-between px-4 sm:h-[72px] sm:px-6 lg:h-[80px] lg:px-10">
        {/* ===== Logo ===== */}
        <Link href="/" className="flex flex-col leading-none flex-shrink-0">
          <span className="flex items-baseline gap-[2px] font-display text-[22px] sm:text-[26px] lg:text-[28px] font-extrabold tracking-tight">
            <span className="text-ink">My</span>
            <span className="text-brand">Restaurants</span>
            <sup className="text-[9px] text-ink-faint not-italic">®</sup>
          </span>
          <span className="hidden sm:block text-[9px] lg:text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-faint mt-0.5">
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
                  className="flex items-center gap-1 text-[13px] cursor-pointer font-bold uppercase tracking-wide text-ink hover:text-ink-soft transition-colors"
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
                  className="text-[13px] font-bold uppercase tracking-wide text-ink hover:text-ink-soft transition-colors"
                >
                  {link.label}
                </Link>
              )}

              {link.dropdown && desktopDropdown === link.label && (
                <div className="absolute left-0 top-full mt-3 w-52 rounded-md bg-surface py-2 shadow-xl">
                  {link.dropdown.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setDesktopDropdown(null)}
                      className="block px-5 py-2.5 text-[14px] text-ink-soft hover:bg-surface-soft hover:text-brand transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}

              {link.isCategoryMenu && desktopDropdown === link.label && (
                <div className="absolute left-1/2 top-full mt-3 w-[560px] -translate-x-1/2 rounded-lg bg-surface p-4 shadow-xl">
                  {catLoading ? (
                    <div className="grid grid-cols-4 gap-4">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex flex-col items-center gap-2"
                        >
                          <div className="h-16 w-16 animate-pulse rounded-full bg-surface-soft" />
                          <div className="h-3 w-14 animate-pulse rounded bg-surface-soft" />
                        </div>
                      ))}
                    </div>
                  ) : catError ? (
                    <p className="py-4 text-center text-[13px] text-ink-faint">
                      Failed to load categories.
                    </p>
                  ) : categories.length === 0 ? (
                    <p className="py-4 text-center text-[13px] text-ink-faint">
                      No categories found.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-4">
                      {categories.map((cat) => (
                        <Link
                          key={cat._id}
                          href={`/foods/${cat.slug ?? cat._id}`}
                          onClick={() => setDesktopDropdown(null)}
                          className="group flex flex-col items-center gap-2 rounded-md p-2 text-center transition-colors hover:bg-surface-soft"
                        >
                          <span className="h-16 w-16 overflow-hidden rounded-full bg-surface-soft">
                            {cat.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={cat.image}
                                alt={cat.name}
                                className="h-full w-full object-cover transition-transform group-hover:scale-110"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-[11px] text-ink-faint">
                                No image
                              </span>
                            )}
                          </span>
                          <span className="text-[12.5px] font-semibold text-ink group-hover:text-brand">
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
            className={`flex text-ink transition-colors ${searchOpen ? "text-brand" : "hover:text-ink-soft"}`}
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

          {/* লগইন থাকলে অ্যাভাটার + মেনু, না থাকলে "Log in" — নিজেই ঠিক করে নেয় */}
          <AccountMenu />

          <button
            type="button"
            onClick={openCart}
            aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-brand text-ink-invert shadow-[var(--shadow-brand)] transition-transform hover:scale-105 active:scale-95 sm:h-10 sm:w-10"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
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

            {/* hydration শেষ হওয়ার আগে সংখ্যা দেখাই না — নাহলে server/client মিসম্যাচ */}
            {cartHydrated && cartCount > 0 && (
              <span
                className={`absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-surface bg-ink px-1 text-[10px] font-extrabold text-ink-invert ${
                  bump ? "cart-bump" : ""
                }`}
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
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
              className="block h-[2px] w-6 bg-ink transition-all"
              style={{
                transform: mobileOpen
                  ? "translateY(7px) rotate(45deg)"
                  : "none",
              }}
            />
            <span
              className="block h-[2px] w-6 bg-ink transition-all"
              style={{ opacity: mobileOpen ? 0 : 1 }}
            />
            <span
              className="block h-[2px] w-6 bg-ink transition-all"
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
        className="overflow-hidden border-t border-border bg-surface shadow-lg transition-[max-height,opacity] duration-300 ease-in-out"
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
              className="absolute left-3 text-ink-faint"
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
              className="w-full rounded-full border border-border bg-surface-soft py-2.5 pl-10 pr-10 text-[14px] text-ink outline-none transition-colors focus:border-brand focus:bg-surface"
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
              className="absolute right-3 text-ink-faint hover:text-ink"
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
                    <div className="aspect-square w-full animate-pulse rounded-lg bg-surface-soft" />
                    <div className="h-3 w-3/4 animate-pulse rounded bg-surface-soft" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-surface-soft" />
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
                      <span className="aspect-square w-full overflow-hidden rounded-lg bg-surface-soft">
                        {food.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={food.image}
                            alt={food.name}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[11px] text-ink-faint">
                            No image
                          </span>
                        )}
                      </span>
                      <span className="mt-2 line-clamp-2 text-[13px] font-semibold text-ink group-hover:text-brand">
                        {food.name}
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        {hasDiscount ? (
                          <>
                            <span className="text-[13px] font-bold text-brand">
                              ৳{discount}
                            </span>
                            <span className="text-[12px] text-ink-faint line-through">
                              ৳{regular}
                            </span>
                          </>
                        ) : (
                          <span className="text-[13px] font-bold text-ink">
                            ৳{regular}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : foodSearched ? (
              <p className="py-6 text-center text-[13px] text-ink-faint">
                No food items found for {`"${searchTerm}"`}.
              </p>
            ) : searchTerm.trim() ? (
              <p className="py-6 text-center text-[13px] text-ink-faint">
                Searching in 3s...
              </p>
            ) : (
              <p className="py-6 text-center text-[13px] text-ink-faint">
                Start typing to search food items.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===== Mobile slide-down menu ===== */}
      <div
        className="lg:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out bg-surface"
        style={{ maxHeight: mobileOpen ? 520 : 0 }}
      >
        <div className="px-4 py-3 sm:px-6 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-4 pb-3 mb-2 border-b border-border">
            <AccountMenu
              variant="mobile"
              onNavigate={() => setMobileOpen(false)}
            />
          </div>

          {navLinks.map((link) => (
            <div
              key={link.label}
              className="border-b border-border last:border-b-0"
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
                    className="flex w-full items-center justify-between py-3.5 text-[14px] font-bold uppercase tracking-wide text-ink"
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
                          className="block py-2.5 pl-4 text-[13.5px] text-ink-faint"
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
                              <div className="h-12 w-12 animate-pulse rounded-full bg-surface-soft" />
                              <div className="h-2.5 w-10 animate-pulse rounded bg-surface-soft" />
                            </div>
                          ))}
                        </div>
                      ) : catError ? (
                        <p className="py-3 pl-4 text-[13px] text-ink-faint">
                          Failed to load categories.
                        </p>
                      ) : categories.length === 0 ? (
                        <p className="py-3 pl-4 text-[13px] text-ink-faint">
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
                              <span className="h-12 w-12 overflow-hidden rounded-full bg-surface-soft">
                                {cat.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={cat.image}
                                    alt={cat.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center text-[9px] text-ink-faint">
                                    N/A
                                  </span>
                                )}
                              </span>
                              <span className="text-[11px] font-semibold leading-tight text-ink">
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
                  className="block py-3.5 text-[14px] font-bold uppercase tracking-wide text-ink"
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
