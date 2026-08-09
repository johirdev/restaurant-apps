"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface DropdownItem {
  label: string;
  href: string;
}

interface NavLink {
  label: string;
  href: string;
  dropdown?: DropdownItem[];
}

interface NavbarProps {
  cartCount?: number;
  navLinks?: NavLink[];
  onSearchClick?: () => void;
  onUserClick?: () => void;
  onCartClick?: () => void;
}

const DEFAULT_LINKS: NavLink[] = [
  {
    label: "Menu",
    href: "/menu",
    dropdown: [
      { label: "Restaurant", href: "/menu/restaurant" },
      { label: "Express", href: "/menu/express" },
      { label: "Cafe", href: "/menu/cafe" },
    ],
  },
  { label: "Foods", href: "/foods" },
  { label: "About", href: "/about" },
  { label: "Others", href: "/others" },
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

  return (
    <header className="sticky top-0 z-50 w-full" style={{ background: BRAND_RED }}>
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
            Catering&nbsp;&nbsp;|&nbsp;&nbsp;Party Booking&nbsp;&nbsp;|&nbsp;&nbsp;Dine-in
          </span>
        </Link>

        {/* ===== Desktop nav ===== */}
        <nav ref={navRef} className="hidden lg:flex items-center gap-9">
          {navLinks.map((link) => (
            <div key={link.label} className="relative">
              {link.dropdown ? (
                <button
                  type="button"
                  onClick={() =>
                    setDesktopDropdown((cur) => (cur === link.label ? null : link.label))
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
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
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
                      className="block px-5 py-2.5 text-[14px] text-neutral-600 hover:bg-neutral-50 hover:text-[#E5302A] transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 6h15l-1.5 9h-12L6 6Z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 6 5 3H2" strokeLinecap="round" strokeLinejoin="round" />
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
              style={{ transform: mobileOpen ? "translateY(7px) rotate(45deg)" : "none" }}
            />
            <span
              className="block h-[2px] w-6 bg-white transition-all"
              style={{ opacity: mobileOpen ? 0 : 1 }}
            />
            <span
              className="block h-[2px] w-6 bg-white transition-all"
              style={{ transform: mobileOpen ? "translateY(-7px) rotate(-45deg)" : "none" }}
            />
          </button>
        </div>
      </div>

      {/* ===== Mobile slide-down menu ===== */}
      <div
        className="lg:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out bg-white"
        style={{ maxHeight: mobileOpen ? 480 : 0 }}
      >
        <div className="px-4 py-3 sm:px-6">
          {/* search + account row, shown here since header icons are hidden below sm */}
          <div className="flex sm:hidden items-center gap-4 pb-3 mb-2 border-b border-neutral-100">
            <button
              type="button"
              onClick={onSearchClick}
              className="flex items-center gap-2 text-[13px] font-medium text-neutral-600"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.8-3.6-5-8-5Z" />
              </svg>
              Account
            </button>
          </div>

          {navLinks.map((link) => (
            <div key={link.label} className="border-b border-neutral-100 last:border-b-0">
              {link.dropdown ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setMobileAccordion((cur) => (cur === link.label ? null : link.label))
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
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <div
                    className="overflow-hidden transition-[max-height] duration-300"
                    style={{ maxHeight: mobileAccordion === link.label ? 200 : 0 }}
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