"use client";

/**
 * Footer
 * -------------------------------
 * Dark themed site footer with:
 *  - Brand logo + address + social icons
 *  - "Hot Menu" quick links list
 *  - "Opening Hours" schedule
 *  - Bottom copyright strip
 *
 * Decorative line-art doodles (cow / hand / taco) are simple inline SVGs
 * standing in for the illustration assets in the reference design —
 * swap the <DoodleXxx /> components for real illustration assets/images
 * whenever you have them.
 */

import Link from "next/link";

interface HotMenuItem {
  label: string;
  href?: string;
}

interface OpeningHour {
  day: string;
  time: string;
  closed?: boolean;
}

const HOT_MENU: HotMenuItem[] = [
  { label: "BBQ Pizza TinTin" },
  { label: "Burger Kingo" },
  { label: "Chessey Pizza" },
  { label: "Chocolate Donuts" },
  { label: "Chicken Sandwich" },
];

const OPENING_HOURS: OpeningHour[] = [
  { day: "Monday", time: "10.00am - 05.00pm" },
  { day: "Tuesday", time: "10.20am - 05.30pm" },
  { day: "Wednesday", time: "10.30am - 05.50pm" },
  { day: "Thursday", time: "11.00am - 07.10pm" },
  { day: "Friday", time: "", closed: true },
];

/* ------------------------------------------------------------------ */
/* Social icons (brand marks not in lucide-react, so inline SVGs)     */
/* ------------------------------------------------------------------ */

const IconFacebook = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M13.5 21v-8.1h2.7l.4-3.2h-3.1V7.7c0-.9.25-1.55 1.57-1.55h1.68V3.3C15.9 3.2 15.03 3.15 14 3.15c-2.2 0-3.7 1.35-3.7 3.83v2.72H7.6v3.2h2.7V21h3.2Z" />
  </svg>
);

const IconX = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M17.5 3h3l-6.6 7.5L21.5 21h-6.1l-4.8-6.3L4.9 21H2l7.1-8.1L2.6 3h6.3l4.3 5.8L17.5 3Zm-1.1 16.2h1.7L7.7 4.7H5.9l10.5 14.5Z" />
  </svg>
);

const IconLinkedIn = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3.5a1.96 1.96 0 1 0 0 3.92 1.96 1.96 0 0 0 0-3.92ZM20.44 20h-3.37v-5.6c0-1.34-.03-3.06-1.87-3.06-1.87 0-2.15 1.46-2.15 2.96V20H9.68V8.5h3.24v1.57h.05c.45-.86 1.56-1.77 3.21-1.77 3.43 0 4.26 2.26 4.26 5.19V20Z" />
  </svg>
);

const IconPinterest = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M12 2.5c-5.25 0-9.5 4.02-9.5 8.98 0 3.7 2.24 6.87 5.42 8.24-.07-.7-.14-1.78.03-2.55.15-.7 1-4.47 1-4.47s-.26-.51-.26-1.27c0-1.19.7-2.08 1.56-2.08.74 0 1.1.55 1.1 1.2 0 .74-.47 1.83-.71 2.85-.2.86.44 1.56 1.31 1.56 1.57 0 2.78-1.63 2.78-3.99 0-2.09-1.53-3.55-3.71-3.55-2.53 0-4.01 1.87-4.01 3.8 0 .75.29 1.55.66 1.99a.27.27 0 0 1 .06.25c-.07.27-.21.85-.24.97-.04.15-.13.19-.3.11-1.1-.5-1.79-2.08-1.79-3.35 0-2.73 1.99-5.24 5.73-5.24 3.01 0 5.35 2.13 5.35 4.97 0 2.97-1.87 5.35-4.47 5.35-.87 0-1.7-.45-1.98-.99l-.54 2.03c-.19.73-.72 1.65-1.07 2.2.81.25 1.66.38 2.55.38 5.25 0 9.5-4.02 9.5-8.98S17.25 2.5 12 2.5Z" />
  </svg>
);

const SOCIALS = [
  { icon: <IconFacebook />, label: "Facebook", href: "#" },
  { icon: <IconX />, label: "X", href: "#" },
  { icon: <IconLinkedIn />, label: "LinkedIn", href: "#" },
  { icon: <IconPinterest />, label: "Pinterest", href: "#" },
];

/* ------------------------------------------------------------------ */
/* Decorative line-art doodles                                        */
/* ------------------------------------------------------------------ */

const DoodleTaco = () => (
  <svg
    viewBox="0 0 160 140"
    className="pointer-events-none absolute right-0 top-0 h-[130px] w-[150px] text-white/10 md:h-[150px] md:w-[170px]"
    fill="none"
    aria-hidden="true"
  >
    {/* sparkle */}
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 8 L18 22" />
      <path d="M6 20 L16 26" />
      <path d="M30 16 L20 24" />
    </g>
    {/* taco shell */}
    <path
      d="M40 70 C40 45 65 30 90 30 C115 30 135 45 135 70"
      stroke="currentColor"
      strokeWidth="2.5"
    />
    <path
      d="M35 70 C35 100 60 118 88 118 C116 118 138 100 140 72"
      stroke="currentColor"
      strokeWidth="2.5"
    />
    <path d="M45 66 Q88 40 132 66" stroke="currentColor" strokeWidth="2" />
    <path d="M50 78 Q90 100 128 78" stroke="currentColor" strokeWidth="2" />
    <path d="M58 90 Q90 108 118 90" stroke="currentColor" strokeWidth="2" />
    <circle cx="70" cy="60" r="2.4" fill="currentColor" />
    <circle cx="95" cy="55" r="2.4" fill="currentColor" />
    <circle cx="110" cy="66" r="2.4" fill="currentColor" />
    <circle cx="80" cy="72" r="2.4" fill="currentColor" />
  </svg>
);

const DoodleCow = () => (
  <svg
    viewBox="0 0 200 180"
    className="pointer-events-none absolute -left-6 bottom-0 h-[170px] w-[190px] text-white/[0.06] md:h-[220px] md:w-[240px]"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M30 90 C10 90 5 70 20 60 C15 45 35 35 50 42 C60 25 90 22 105 38 C125 30 150 45 145 65 C165 68 168 92 148 98 C150 120 130 140 105 138 C100 155 70 158 60 142 C35 148 15 130 22 108 C15 105 22 92 30 90 Z"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="70" cy="80" r="3" fill="currentColor" />
    <circle cx="115" cy="78" r="3" fill="currentColor" />
    <path d="M85 95 Q95 102 105 95" stroke="currentColor" strokeWidth="2" />
    <path d="M45 55 L35 40" stroke="currentColor" strokeWidth="2" />
    <path d="M130 50 L142 36" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const DoodleHand = () => (
  <svg
    viewBox="0 0 160 200"
    className="pointer-events-none absolute -right-4 bottom-0 h-[180px] w-[150px] text-white/[0.06] md:h-[220px] md:w-[180px]"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M55 190 C40 190 30 175 30 155 L30 110 C30 105 34 101 39 101 C44 101 48 105 48 110 L48 60 C48 54 53 49 59 49 C65 49 70 54 70 60 L70 45 C70 39 75 34 81 34 C87 34 92 39 92 45 L92 55 C92 49 97 44 103 44 C109 44 114 49 114 55 L114 130 L120 100 C122 92 130 87 138 90 C145 93 148 101 145 108 L130 150 C122 175 100 190 78 190 Z"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

const Footer = () => {
  return (
    <footer className="relative overflow-hidden bg-[var(--color-ink)] px-6 py-16 text-white sm:px-10 lg:px-20">
      {/* background doodles */}
      <DoodleCow />
      <DoodleHand />

      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 gap-12 md:grid-cols-3">
        {/* -------------------------------------------------- */}
        {/* Brand column */}
        {/* -------------------------------------------------- */}
        <div>
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 via-red-500 to-yellow-400">
              <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
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
            <span>
              <span className="block font-serif text-2xl italic font-bold leading-tight text-white">
                Panpie
              </span>
              <span className="block text-[10px] font-semibold tracking-[0.25em] text-gray-400">
                QUALITY FOOD
              </span>
            </span>
          </Link>

          <p className="mt-6 max-w-[240px] text-sm leading-relaxed text-gray-400">
            128 6th Ave, New York, NY 10015 United States, Dcca-1212
          </p>

          <div className="mt-6 flex items-center gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-white hover:bg-white hover:text-black"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* -------------------------------------------------- */}
        {/* Hot Menu column */}
        {/* -------------------------------------------------- */}
        <div className="relative">
          <DoodleTaco />
          <h3 className="text-xl font-bold text-white">Hot Menu</h3>
          <ul className="mt-6 space-y-4">
            {HOT_MENU.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href ?? "#"}
                  className="group flex items-center gap-2 text-sm text-gray-300 transition hover:text-white"
                >
                  <span className="text-[10px] text-orange-400 transition group-hover:translate-x-0.5">
                    ▶
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* -------------------------------------------------- */}
        {/* Opening Hours column */}
        {/* -------------------------------------------------- */}
        <div>
          <h3 className="text-xl font-bold text-white">Opening Hours</h3>
          <ul className="mt-6 space-y-4 text-sm">
            {OPENING_HOURS.map((row) => (
              <li
                key={row.day}
                className="flex items-center gap-1.5 text-gray-300"
              >
                <span className="w-[76px] flex-shrink-0">{row.day}</span>
                <span>:</span>
                {row.closed ? (
                  <span className="font-semibold text-orange-400">Closed</span>
                ) : (
                  <span className="font-semibold text-white">{row.time}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* Bottom strip */}
      {/* -------------------------------------------------- */}
      <div className="relative mx-auto mt-14 grid max-w-[1400px] grid-cols-1 items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div className="h-px bg-white/10" />
        <p className="whitespace-nowrap text-center text-xs text-gray-400">
          © 2026 panpie. All Rights Reserved by Restaurant app
        </p>
        <div className="h-px bg-white/10" />
      </div>
    </footer>
  );
};

export default Footer;
