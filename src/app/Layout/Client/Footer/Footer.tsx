"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "#about" },
  { label: "Portfolio", href: "#Content" },
  { label: "Why Choose Me", href: "#why-choose-me" },
  { label: "FAQ", href: "#faq" },
];

const work = [
  { label: "Acting", href: "#Content" },
  { label: "Modeling", href: "#Content" },
  { label: "Fashion Shoots", href: "#Content" },
  { label: "Brand Campaigns", href: "#Content" },
];

const socials = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/t_a_s_p_i?igsh=anU3NzZrZTBjbWZr",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="w-4 h-4"
      >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@jannatultaspi?_r=1&_t=ZS-97y6sERIONs",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M16.6 2h-3.2v13.6a3 3 0 1 1-2.6-2.97v-3.26A6.27 6.27 0 1 0 16.6 15.9V8.36a7.9 7.9 0 0 0 4.4 1.34V6.5a4.85 4.85 0 0 1-4.4-4.5z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@taspi-r4m?si=5IBOpKuF2KxjTtDa",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
        <polygon
          points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"
          fill="white"
        />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/share/1ARQWN5byt/",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    label: "Email",
    href: "mailto:taspi0149@gamail.com",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="w-4 h-4"
      >
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 6-10 7L2 6" />
      </svg>
    ),
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="w-full bg-[var(--bg-base)]"
      style={{ fontFamily: "var(--font-primary)" }}
    >
      {/* ── Top CTA strip ── */}
      <div
        className="border-b px-6 md:px-10 py-10"
        style={{
          borderColor: "var(--border-card)",
          background: "var(--bg-card)",
        }}
      ></div>

      {/* ── Main footer grid ── */}
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Col 1 — Brand */}
        <div className="flex flex-col gap-5 sm:col-span-2 lg:col-span-1">
          <Link
            href="/"
            className=" tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            <Image width={200} height={160} src="/jannatul-taspi.png" alt="" />
          </Link>

          <p
            className="text-[13px] leading-relaxed max-w-[220px]"
            style={{ color: "var(--text-secondary)" }}
          >
            Actress, model & content creator — open to brand collabs, editorial
            shoots and campaign work.
          </p>

          {/* Socials */}
          <div className="flex items-center gap-2 flex-wrap">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target={s.href.startsWith("mailto:") ? undefined : "_blank"}
                rel={s.href.startsWith("mailto:") ? undefined : "noreferrer"}
                aria-label={s.label}
                className="group w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-200"
                style={{
                  borderColor: "var(--border-card)",
                  background: "var(--bg-card)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--brand-cyan-glow)";
                  e.currentTarget.style.borderColor = "var(--border-focus)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--bg-card)";
                  e.currentTarget.style.borderColor = "var(--border-card)";
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>{s.icon}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Col 2 — Navigation */}
        <div className="flex flex-col gap-4">
          <p
            className="text-[11px] font-bold tracking-[0.13em] uppercase"
            style={{ color: "var(--text-primary)" }}
          >
            Navigation
          </p>
          <ul className="flex flex-col gap-2.5">
            {navLinks.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  className="text-[13px] transition-colors duration-150 flex items-center gap-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span
                    className="w-1 h-1 rounded-full shrink-0"
                    style={{ background: "var(--brand-cyan)" }}
                  />
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3 — Work */}
        <div className="flex flex-col gap-4">
          <p
            className="text-[11px] font-bold tracking-[0.13em] uppercase"
            style={{ color: "var(--text-primary)" }}
          >
            Work
          </p>
          <ul className="flex flex-col gap-2.5">
            {work.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  className="text-[13px] transition-colors duration-150 flex items-center gap-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span
                    className="w-1 h-1 rounded-full shrink-0"
                    style={{ background: "var(--brand-cyan)" }}
                  />
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 4 — Availability */}
        <div className="flex flex-col gap-4">
          <p
            className="text-[11px] font-bold tracking-[0.13em] uppercase"
            style={{ color: "var(--text-primary)" }}
          >
            Availability
          </p>
          <div className="flex flex-col gap-3">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold w-fit"
              style={{
                background: "var(--brand-cyan-glow)",
                borderColor: "var(--border-card)",
                color: "var(--brand-cyan)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
              Open for bookings
            </div>

            <p
              className="text-[13px] leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Currently accepting brand campaigns, shoots and ambassador deals.
            </p>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div
        className="border-t px-6 md:px-10 py-5"
        style={{
          borderColor: "var(--border-card)",
          background: "var(--bg-card)",
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
            © {year} Jannatul Taspi. All rights reserved.
          </p>

          <Link
            href="https://coders24.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] transition-colors hover:text-white"
            style={{ color: "var(--text-secondary)" }}
          >
            Profile crafted by{" "}
            <span className="font-semibold text-blue-500">Coders24</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
