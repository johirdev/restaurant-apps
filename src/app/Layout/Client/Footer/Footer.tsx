"use client";

/**
 * Footer — সাইটের নিচের অংশ
 * --------------------------------------------------------------------------
 * উপরে ভেসে থাকা একটা 3D CTA কার্ড (অর্ডার / ফোন), তারপর চার কলাম:
 *
 *   ব্র্যান্ড + ঠিকানা + সোশ্যাল | Explore | Hot Menu | Opening Hours
 *
 * তারপর ভরসার স্ট্রিপ (ডেলিভারি, হালাল, পেমেন্ট) আর সবশেষে কপিরাইট বার।
 *
 * খেয়াল রাখার মতো দুটো জিনিস:
 *  • আজকের দিনটা `useEffect` এর ভেতর rAF দিয়ে সেট হয় — সার্ভারে render এর
 *    সময় দিন জানা থাকলে hydration mismatch হতো, তাই মাউন্টের পরে বসে।
 *  • খোলা/বন্ধ ব্যাজটাও ওই দিনের উপরেই চলে, আলাদা কোনো টাইমার নেই।
 *
 * রঙ, রেডিয়াস, শ্যাডো — সব globals.css এর টোকেন থেকে; footer.css এ একটাও
 * হার্ডকোড করা ব্র্যান্ড রঙ নেই।
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUp,
  BadgeCheck,
  Bike,
  ChevronRight,
  Clock3,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  UtensilsCrossed,
} from "lucide-react";

import "./footer.css";

/* ------------------------------------------------------------------ */
/* কনটেন্ট — একজায়গায়, পরে API/সেটিংস থেকে আনা সহজ হবে                */
/* ------------------------------------------------------------------ */

const RESTAURANT = {
  name: "Panpie",
  tagline: "QUALITY FOOD",
  blurb:
    "কাঠের চুলার আঁচ, রোজ ভোরের বাজার আর তিন প্রজন্মের রেসিপি — এই তিনটেই আমাদের রান্নাঘরের পুরো গল্প।",
  address: "128 6th Ave, New York, NY 10015, United States",
  phone: "+1 (212) 555-0148",
  phoneHref: "tel:+12125550148",
  email: "hello@panpie.com",
};

interface FooterLink {
  label: string;
  href: string;
}

const EXPLORE: FooterLink[] = [
  { label: "Home", href: "/" },
  { label: "All foods", href: "/foods" },
  { label: "Track your order", href: "/track-order" },
  { label: "My orders", href: "/account" },
  { label: "Cart & checkout", href: "/cart" },
];

const HOT_MENU: FooterLink[] = [
  { label: "BBQ Pizza TinTin", href: "/foods" },
  { label: "Burger Kingo", href: "/foods" },
  { label: "Cheesy Garlic Pizza", href: "/foods" },
  { label: "Chocolate Donuts", href: "/foods" },
  { label: "Grilled Chicken Sandwich", href: "/foods" },
];

interface OpeningHour {
  /** 0 = রবিবার … 6 = শনিবার (Date#getDay এর সাথে মেলানো) */
  index: number;
  day: string;
  time: string;
  closed?: boolean;
}

const OPENING_HOURS: OpeningHour[] = [
  { index: 1, day: "Mon", time: "10:00 am – 11:00 pm" },
  { index: 2, day: "Tue", time: "10:00 am – 11:00 pm" },
  { index: 3, day: "Wed", time: "10:00 am – 11:00 pm" },
  { index: 4, day: "Thu", time: "10:00 am – 11:30 pm" },
  { index: 5, day: "Fri", time: "02:00 pm – 11:30 pm" },
  { index: 6, day: "Sat", time: "09:00 am – 12:00 am" },
  { index: 0, day: "Sun", time: "", closed: true },
];

const TRUST = [
  { icon: Bike, title: "30 min delivery", note: "শহরের ভেতরে, গরম অবস্থায়" },
  { icon: BadgeCheck, title: "100% halal", note: "সার্টিফায়েড সাপ্লাই চেইন" },
  { icon: CreditCard, title: "Secure payment", note: "কার্ড, বিকাশ ও ক্যাশ" },
];

const LEGAL: FooterLink[] = [
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms of service", href: "/terms" },
  { label: "Refund policy", href: "/refund" },
];

/* ------------------------------------------------------------------ */
/* সোশ্যাল ব্র্যান্ড মার্ক — lucide তে নেই, তাই inline SVG            */
/* ------------------------------------------------------------------ */

const IconFacebook = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M13.5 21v-8.1h2.7l.4-3.2h-3.1V7.7c0-.9.25-1.55 1.57-1.55h1.68V3.3C15.9 3.2 15.03 3.15 14 3.15c-2.2 0-3.7 1.35-3.7 3.83v2.72H7.6v3.2h2.7V21h3.2Z" />
  </svg>
);

const IconInstagram = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.8 3.8 0 0 1-1.38-.9 3.8 3.8 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2Zm0 1.98c-3.14 0-3.5.01-4.74.07-1.14.05-1.76.24-2.17.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.41-.35 1.03-.4 2.17-.06 1.24-.07 1.6-.07 4.74s.01 3.5.07 4.74c.05 1.14.24 1.76.4 2.17.21.55.47.94.88 1.35.41.41.8.67 1.35.88.41.16 1.03.35 2.17.4 1.24.06 1.6.07 4.74.07s3.5-.01 4.74-.07c1.14-.05 1.76-.24 2.17-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.41.35-1.03.4-2.17.06-1.24.07-1.6.07-4.74s-.01-3.5-.07-4.74c-.05-1.14-.24-1.76-.4-2.17a3.6 3.6 0 0 0-.88-1.35 3.6 3.6 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.17-.4-1.24-.06-1.6-.07-4.74-.07Zm0 3.37a5.45 5.45 0 1 1 0 10.9 5.45 5.45 0 0 1 0-10.9Zm0 1.98a3.47 3.47 0 1 0 0 6.94 3.47 3.47 0 0 0 0-6.94Zm5.67-3.5a1.27 1.27 0 1 1 0 2.54 1.27 1.27 0 0 1 0-2.54Z" />
  </svg>
);

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.5 3h3l-6.6 7.5L21.5 21h-6.1l-4.8-6.3L4.9 21H2l7.1-8.1L2.6 3h6.3l4.3 5.8L17.5 3Zm-1.1 16.2h1.7L7.7 4.7H5.9l10.5 14.5Z" />
  </svg>
);

const IconYouTube = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15.2V8.8L15.5 12 10 15.2Z" />
  </svg>
);

const SOCIALS = [
  { label: "Facebook", href: "#", icon: <IconFacebook /> },
  { label: "Instagram", href: "#", icon: <IconInstagram /> },
  { label: "X", href: "#", icon: <IconX /> },
  { label: "YouTube", href: "#", icon: <IconYouTube /> },
];

/* ------------------------------------------------------------------ */
/* ব্র্যান্ড মার্ক                                                     */
/* ------------------------------------------------------------------ */

const BrandMark = () => (
  <span className="site-footer__mark" aria-hidden="true">
    <svg viewBox="0 0 40 40" fill="none">
      <path
        d="M8 24 C8 14 24 6 32 12 C28 8 12 6 8 24 Z"
        fill="var(--color-saffron)"
      />
      <path d="M10 26 L30 26 L20 36 Z" fill="var(--color-saffron)" />
      <circle cx="16" cy="28" r="1.6" fill="var(--color-chili-dark)" />
      <circle cx="22" cy="30" r="1.6" fill="var(--color-chili-dark)" />
      <circle cx="19" cy="25" r="1.6" fill="var(--color-chili-dark)" />
    </svg>
  </span>
);

/* সাজের লাইন-আর্ট — খুব হালকা, পড়ার পথে আসে না */
const DoodlePlate = () => (
  <svg
    className="site-footer__doodle site-footer__doodle--plate"
    viewBox="0 0 200 200"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="100" cy="100" r="78" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="100" cy="100" r="58" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M42 44 L42 96 M34 44 L34 70 M50 44 L50 70"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M158 44 C168 54 168 74 158 84 L158 156"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const DoodleLeaf = () => (
  <svg
    className="site-footer__doodle site-footer__doodle--leaf"
    viewBox="0 0 180 180"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M20 160 C20 80 80 20 160 20 C160 100 100 160 20 160 Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path d="M20 160 L160 20" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M60 120 L60 78 M100 80 L100 40 M78 100 L118 100 M40 140 L40 118"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  </svg>
);

/* ------------------------------------------------------------------ */

const Footer = () => {
  /* সার্ভার আর ক্লায়েন্টের HTML যাতে এক থাকে, তাই দিনটা মাউন্টের পরে বসে */
  const [today, setToday] = useState<number | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setToday(new Date().getDay()));
    return () => cancelAnimationFrame(frame);
  }, []);

  const todayRow = OPENING_HOURS.find((row) => row.index === today);
  const isOpenToday = todayRow ? !todayRow.closed : false;

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="site-footer">
      {/* সাজসজ্জা — আলাদা মোড়কে, কারণ ফুটারের overflow খোলা রাখতে হয়
          (CTA কার্ডটা উপরের দিকে বেরিয়ে থাকে) */}
      <div className="site-footer__decor" aria-hidden="true">
        <span className="site-footer__glow site-footer__glow--a" />
        <span className="site-footer__glow site-footer__glow--b" />
        <span className="site-footer__mesh" />
        <DoodlePlate />
        <DoodleLeaf />
      </div>

      <div className="site-footer__inner">
        {/* ------------------------------------------------ */}
        {/* উপরে ভেসে থাকা CTA কার্ড                          */}
        {/* ------------------------------------------------ */}
        <div className="footer-cta">
          <div className="footer-cta__text">
            <span className="footer-cta__eyebrow">Hungry already?</span>
            <h2 className="footer-cta__title">
              আজকের রান্না চুলায়, আপনার প্লেটটাই শুধু বাকি
            </h2>
            <p className="footer-cta__note">
              অনলাইনে অর্ডার করুন, নয়তো এক ফোনেই টেবিল বুক করে ফেলুন।
            </p>
          </div>

          <div className="footer-cta__actions">
            <Link href="/foods" className="footer-cta__btn footer-cta__btn--solid">
              <UtensilsCrossed aria-hidden="true" />
              Order online
            </Link>
            <a
              href={RESTAURANT.phoneHref}
              className="footer-cta__btn footer-cta__btn--ghost"
            >
              <Phone aria-hidden="true" />
              {RESTAURANT.phone}
            </a>
          </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* মূল চার কলাম                                      */}
        {/* ------------------------------------------------ */}
        <div className="site-footer__grid">
          {/* ব্র্যান্ড */}
          <div className="footer-col footer-col--brand">
            <Link href="/" className="site-footer__brand">
              <BrandMark />
              <span>
                <span className="site-footer__name">{RESTAURANT.name}</span>
                <span className="site-footer__tagline">
                  {RESTAURANT.tagline}
                </span>
              </span>
            </Link>

            <p className="site-footer__blurb">{RESTAURANT.blurb}</p>

            <ul className="footer-contact">
              <li>
                <MapPin aria-hidden="true" />
                <span>{RESTAURANT.address}</span>
              </li>
              <li>
                <Phone aria-hidden="true" />
                <a href={RESTAURANT.phoneHref}>{RESTAURANT.phone}</a>
              </li>
              <li>
                <Mail aria-hidden="true" />
                <a href={`mailto:${RESTAURANT.email}`}>{RESTAURANT.email}</a>
              </li>
            </ul>

            <div className="footer-socials">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="footer-socials__link"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div className="footer-col">
            <h3 className="footer-col__title">Explore</h3>
            <ul className="footer-links">
              {EXPLORE.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}>
                    <ChevronRight aria-hidden="true" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Hot menu */}
          <div className="footer-col">
            <h3 className="footer-col__title">Hot Menu</h3>
            <ul className="footer-links">
              {HOT_MENU.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}>
                    <ChevronRight aria-hidden="true" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Opening hours */}
          <div className="footer-col">
            <h3 className="footer-col__title">Opening Hours</h3>

            <span
              className={`footer-status${isOpenToday ? " is-open" : ""}`}
              suppressHydrationWarning
            >
              <i aria-hidden="true" />
              {today === null
                ? "Weekly schedule"
                : isOpenToday
                  ? "Open today"
                  : "Closed today"}
            </span>

            <ul className="footer-hours">
              {OPENING_HOURS.map((row) => (
                <li
                  key={row.day}
                  className={row.index === today ? "is-today" : undefined}
                  suppressHydrationWarning
                >
                  <span className="footer-hours__day">{row.day}</span>
                  <span className="footer-hours__dots" aria-hidden="true" />
                  {row.closed ? (
                    <span className="footer-hours__closed">Closed</span>
                  ) : (
                    <span className="footer-hours__time">{row.time}</span>
                  )}
                </li>
              ))}
            </ul>

            <p className="footer-hours__note">
              <Clock3 aria-hidden="true" />
              ছুটির দিনে রান্নাঘর ১ ঘণ্টা বেশি খোলা থাকে।
            </p>
          </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* ভরসার স্ট্রিপ                                     */}
        {/* ------------------------------------------------ */}
        <ul className="footer-trust">
          {TRUST.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="footer-trust__item">
                <span className="footer-trust__icon">
                  <Icon aria-hidden="true" />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <span>{item.note}</span>
                </span>
              </li>
            );
          })}
        </ul>

        {/* ------------------------------------------------ */}
        {/* নিচের বার                                         */}
        {/* ------------------------------------------------ */}
        <div className="footer-bottom">
          <p className="footer-bottom__copy">
            © {new Date().getFullYear()} {RESTAURANT.name}. All rights
            reserved.
          </p>

          <ul className="footer-bottom__legal">
            {LEGAL.map((link) => (
              <li key={link.label}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={scrollTop}
            className="footer-bottom__top"
            aria-label="Back to top"
          >
            <ArrowUp aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
