"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { Sora, Playfair_Display } from "next/font/google";
import Image from "next/image";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-sora",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About Me", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Content", href: "#Content" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
];

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`navbar ${scrolled ? "navbar--scrolled" : ""} navbar--light`}
    >
      <div className="max-width flex w-full items-center justify-between px-4 py-3 md:px-8">
        {/* Logo — left */}
        <Link href="/" className="navbar__logo flex">
          <Image width={180} height={160} src="/jannatul-taspi.png" alt="" />
        </Link>
        <ul className="navbar__links !static !translate-x-0 hidden md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="navbar__link">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        {/* Nav links + Hire Me — right (desktop) */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="#contact" className="navbar__hire-btn">
            Hire Me
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="navbar__mobile-toggle md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="navbar__mobile-menu">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="navbar__mobile-link"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          <Link
            href="#contact"
            className="navbar__hire-btn navbar__hire-btn--mobile"
            onClick={() => setMenuOpen(false)}
          >
            Hire Me
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
