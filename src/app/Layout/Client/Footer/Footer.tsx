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
 * নাম, ঠিকানা, ফোন, সোশ্যাল লিংক আর খোলার সময় — সবই রেস্টুরেন্ট
 * সেটিংস থেকে আসে, ঠিক যেমন About আর Contact পাতা। সেটিংসে যেটা এখনো
 * ভরা হয়নি, সেটার জায়গায় নিচের FALLBACK এর লেখাটা বসে, তাই নতুন
 * ইনস্টলেও ফুটার ফাঁকা দেখায় না।
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

import { useSettings } from "@/src/store/settings.store";
import { openingRows, socialLinks, telHref } from "@/src/lib/restaurantInfo";
import SocialIcon from "@/src/app/components/Clients/Shared/SocialIcons";

import "./footer.css";

/* ------------------------------------------------------------------ */
/* সেটিংস ফাঁকা থাকলে যা দেখানো হবে                                    */
/* ------------------------------------------------------------------ */

const FALLBACK = {
  name: "Panpie",
  tagline: "QUALITY FOOD",
  blurb:
    "কাঠের চুলার আঁচ, রোজ ভোরের বাজার আর তিন প্রজন্মের রেসিপি — এই তিনটেই আমাদের রান্নাঘরের পুরো গল্প।",
  address: "128 6th Ave, New York, NY 10015, United States",
  phone: "+1 (212) 555-0148",
  email: "hello@panpie.com",
};

interface FooterLink {
  label: string;
  href: string;
}

const EXPLORE: FooterLink[] = [
  { label: "Home", href: "/" },
  { label: "All foods", href: "/foods" },
  { label: "About us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Track your order", href: "/track-order" },
  { label: "My orders", href: "/account" },
];

const HOT_MENU: FooterLink[] = [
  { label: "BBQ Pizza TinTin", href: "/foods" },
  { label: "Burger Kingo", href: "/foods" },
  { label: "Cheesy Garlic Pizza", href: "/foods" },
  { label: "Chocolate Donuts", href: "/foods" },
  { label: "Grilled Chicken Sandwich", href: "/foods" },
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
  const settings = useSettings();

  /* সার্ভার আর ক্লায়েন্টের HTML যাতে এক থাকে, তাই দিনটা মাউন্টের পরে বসে */
  const [today, setToday] = useState<number | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setToday(new Date().getDay()));
    return () => cancelAnimationFrame(frame);
  }, []);

  /* সেটিংসে যা আছে সেটাই আগে, না থাকলে FALLBACK এর লেখা */
  const name = settings.restaurant_name || FALLBACK.name;
  const tagline = settings.tagline || FALLBACK.tagline;
  const blurb = settings.about.intro || FALLBACK.blurb;
  const address = settings.address || FALLBACK.address;
  const phone = settings.phone || FALLBACK.phone;
  const email = settings.email || FALLBACK.email;

  const hours = openingRows(settings.opening_hours);
  const socials = socialLinks(settings.socials);

  const todayRow = hours.find((row) => row.day === today);
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
              href={telHref(phone)}
              className="footer-cta__btn footer-cta__btn--ghost"
            >
              <Phone aria-hidden="true" />
              {phone}
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
                <span className="site-footer__name">{name}</span>
                <span className="site-footer__tagline">{tagline}</span>
              </span>
            </Link>

            <p className="site-footer__blurb">{blurb}</p>

            <ul className="footer-contact">
              <li>
                <MapPin aria-hidden="true" />
                <span>{address}</span>
              </li>
              <li>
                <Phone aria-hidden="true" />
                <a href={telHref(phone)}>{phone}</a>
              </li>
              <li>
                <Mail aria-hidden="true" />
                <a href={`mailto:${email}`}>{email}</a>
              </li>
            </ul>

            {/* সেটিংসে একটাও সোশ্যাল লিংক না থাকলে সারিটাই দেখানো হয় না —
                আগে এখানে চারটে মরা `#` লিংক বসে থাকত */}
            {socials.length > 0 && (
              <div className="footer-socials">
                {socials.map((social) => (
                  <a
                    key={social.platform}
                    href={social.href}
                    aria-label={social.label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-socials__link"
                  >
                    <SocialIcon platform={social.platform} />
                  </a>
                ))}
              </div>
            )}
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
              {hours.map((row) => (
                <li
                  key={row.day}
                  className={row.day === today ? "is-today" : undefined}
                  suppressHydrationWarning
                >
                  <span className="footer-hours__day">{row.short}</span>
                  <span className="footer-hours__dots" aria-hidden="true" />
                  {row.closed ? (
                    <span className="footer-hours__closed">Closed</span>
                  ) : (
                    <span className="footer-hours__time">{row.range}</span>
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
            © {new Date().getFullYear()} {name}. All rights
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
