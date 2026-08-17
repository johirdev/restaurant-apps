"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";

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

interface NavLink {
  label: string;
  href: string;
  dropdown?: DropdownItem[];
  isCategoryMenu?: boolean; // marks the "Food Menu" style dynamic dropdown
}

interface NavbarProps {
  cartCount?: number;
  navLinks?: NavLink[];
  onSearchClick?: () => void;
  onUserClick?: () => void;
  onCartClick?: () => void;
}

const DEFAULT_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  {
    label: "Food Menu",
    href: "/menu",
    isCategoryMenu: true,
  },
  { label: "Foods", href: "/foods" },
  { label: "About", href: "/about" },
  { label: "career", href: "/career" },
];

const BRAND_RED = "#fff";
const CART_PINK = "#EB4468";
const BADGE_YELLOW = "#F5B93D";

const Navbar = ({
  cartCount = 0,
  navLinks = DEFAULT_LINKS,
  onSearchClick,
  onUserClick,
  onCartClick,
}: NavbarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopDropdown, setDesktopDropdown] = useState<string | null>(null);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState(false);

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

  // close the desktop dropdown when clicking outside it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setDesktopDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // lock body scroll while the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

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

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{ background: BRAND_RED }}
    >
      <div className="mx-auto flex h-[64px] max-width items-center justify-between px-4 sm:h-[72px] sm:px-6 lg:h-[80px] lg:px-10">
        {/* ===== Logo ===== */}
        <Link href="/" className="flex flex-col leading-none flex-shrink-0">
          <span className="flex items-baseline gap-[1px] text-[22px] sm:text-[26px] lg:text-[28px] font-extrabold italic tracking-tight">
            <span className="text-black">AL</span>
            <span
              className="inline-flex items-center justify-center bg-black text-black px-[3px] -skew-x-6"
              style={{ fontStyle: "normal" }}
            >
              K
            </span>
            <span className="text-black">ADERIA</span>
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
                  className="flex items-center gap-1 text-[13px] font-bold uppercase tracking-wide text-black hover:text-black/80 transition-colors"
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

              {/* ---- static dropdown ---- */}
              {link.dropdown && desktopDropdown === link.label && (
                <div className="absolute left-0 top-full mt-3 w-52 rounded-md bg-white py-2 shadow-xl">
                  {link.dropdown.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setDesktopDropdown(null)}
                      className="block px-5 py-2.5 text-[14px] text-neutral-600 hover:bg-neutral-50 hover:text-[#E5302A] transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}

              {/* ---- dynamic category dropdown (Food Menu) ---- */}
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
                          href={`/menu/${cat.slug ?? cat._id}`}
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
                          <span className="text-[12.5px] font-semibold text-neutral-700 group-hover:text-[#E5302A]">
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
            onClick={onSearchClick}
            aria-label="Search"
            className="hidden sm:flex text-black hover:text-black/80 transition-colors"
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
            className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-black transition-transform hover:scale-105"
            style={{ background: CART_PINK }}
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
            <span
              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-black"
              style={{ background: BADGE_YELLOW }}
            >
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          </button>

          {/* hamburger — mobile/tablet only */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
            className="flex lg:hidden flex-col items-center justify-center gap-[5px] w-8 h-8 flex-shrink-0"
          >
            <span
              className="block h-[2px] w-6 bg-white transition-all"
              style={{
                transform: mobileOpen
                  ? "translateY(7px) rotate(45deg)"
                  : "none",
              }}
            />
            <span
              className="block h-[2px] w-6 bg-white transition-all"
              style={{ opacity: mobileOpen ? 0 : 1 }}
            />
            <span
              className="block h-[2px] w-6 bg-white transition-all"
              style={{
                transform: mobileOpen
                  ? "translateY(-7px) rotate(-45deg)"
                  : "none",
              }}
            />
          </button>
        </div>
      </div>

      {/* ===== Mobile slide-down menu ===== */}
      <div
        className="lg:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out bg-white"
        style={{ maxHeight: mobileOpen ? 520 : 0 }}
      >
        <div className="px-4 py-3 sm:px-6 max-h-[70vh] overflow-y-auto">
          {/* search + account row, shown here since header icons are hidden below sm */}
          <div className="flex sm:hidden items-center gap-4 pb-3 mb-2 border-b border-neutral-100">
            <button
              type="button"
              onClick={onSearchClick}
              className="flex items-center gap-2 text-[13px] font-medium text-neutral-600"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
              </svg>
              Search
            </button>
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

                  {/* static dropdown items */}
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

                  {/* dynamic category items (Food Menu) */}
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
