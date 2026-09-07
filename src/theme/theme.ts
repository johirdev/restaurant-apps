/**
 * ==========================================================================
 * THEME BRIDGE — CSS টোকেনগুলোর TypeScript মিরর
 * --------------------------------------------------------------------------
 * globals.css এর @theme ব্লকই আসল সোর্স। এই ফাইলটা শুধু সেই টোকেনগুলোকে
 * JS/TSX এর `style={{ ... }}` এ ব্যবহার করার সুবিধা দেয়।
 *
 * এখানে কোনো hex লেখা নেই — সব `var(--color-…)`। তাই globals.css এ
 * একটা hex বদলালেই এখান দিয়ে যাওয়া প্রতিটা রঙও বদলে যাবে।
 *
 * ব্যবহার:
 *   import { BRAND } from "@/src/theme/theme";
 *   <div style={{ background: BRAND.primary }} />
 *   <div style={{ background: alpha(BRAND.primaryRgb, 0.12) }} />
 * ==========================================================================
 */

export const BRAND = {
  /** প্রাইমারি — CTA, active state, link */
  primary: "var(--color-brand)",
  primaryDark: "var(--color-brand-dark)",
  primaryDarker: "var(--color-brand-darker)",
  primarySoft: "var(--color-brand-soft)",
  primaryTint: "var(--color-brand-tint)",

  saffron: "var(--color-saffron)",
  saffronDark: "var(--color-saffron-dark)",
  saffronSoft: "var(--color-saffron-soft)",

  herb: "var(--color-herb)",
  herbDark: "var(--color-herb-dark)",
  herbSoft: "var(--color-herb-soft)",

  chili: "var(--color-chili)",
  chiliDark: "var(--color-chili-dark)",
  chiliSoft: "var(--color-chili-soft)",

  info: "var(--color-info)",
  infoSoft: "var(--color-info-soft)",
} as const;

export const SURFACE = {
  background: "var(--color-background)",
  canvas: "var(--color-canvas)",
  surface: "var(--color-surface)",
  surfaceSoft: "var(--color-surface-soft)",
  border: "var(--color-border)",
  borderStrong: "var(--color-border-strong)",
} as const;

export const INK = {
  base: "var(--color-ink)",
  soft: "var(--color-ink-soft)",
  faint: "var(--color-ink-faint)",
  invert: "var(--color-ink-invert)",
} as const;

export const ADMIN = {
  bg: "var(--color-admin-bg)",
  sidebar: "var(--color-admin-sidebar)",
  card: "var(--color-admin-card)",
  elevated: "var(--color-admin-elevated)",
  input: "var(--color-admin-input)",
  hover: "var(--color-admin-hover)",
  border: "var(--color-admin-border)",
  borderStrong: "var(--color-admin-border-strong)",
  ink: "var(--color-admin-ink)",
  inkSoft: "var(--color-admin-ink-soft)",
  inkFaint: "var(--color-admin-ink-faint)",
} as const;

export const RADIUS = {
  xs: "var(--radius-xs)",
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
  pill: "var(--radius-pill)",
} as const;

export const SHADOW = {
  flat: "var(--shadow-flat)",
  raised: "var(--shadow-raised)",
  float: "var(--shadow-float)",
  lifted: "var(--shadow-lifted)",
  brand: "var(--shadow-brand)",
} as const;

export const FONT = {
  display: "var(--font-display)",
  body: "var(--font-body)",
  script: "var(--font-script)",
  bengali: "var(--font-bengali)",
} as const;

export const EASE = {
  outSoft: "var(--ease-out-soft)",
  spring: "var(--ease-spring)",
} as const;

/**
 * `color-mix` দিয়ে যেকোনো টোকেনের স্বচ্ছ ভার্সন বানায় —
 * rgba() হার্ডকোড না করেই টোকেনের সাথে সিঙ্কে থাকে।
 *
 *   alpha(BRAND.primary, 0.12)  →  color-mix(in srgb, var(--color-brand) 12%, transparent)
 */
export const alpha = (token: string, amount: number) =>
  `color-mix(in srgb, ${token} ${Math.round(amount * 100)}%, transparent)`;

/** অর্ডার স্ট্যাটাস → রঙ। ড্যাশবোর্ড আর ট্র্যাকিং পেজ দুটোই এটা ব্যবহার করে। */
export const ORDER_STATUS_TONE = {
  pending: { fg: BRAND.saffronDark, bg: BRAND.saffronSoft, label: "Pending" },
  confirmed: { fg: BRAND.info, bg: BRAND.infoSoft, label: "Confirmed" },
  preparing: { fg: BRAND.saffronDark, bg: BRAND.saffronSoft, label: "Preparing" },
  ready: { fg: BRAND.info, bg: BRAND.infoSoft, label: "Ready" },
  out_for_delivery: { fg: BRAND.primary, bg: BRAND.primarySoft, label: "Out for delivery" },
  delivered: { fg: BRAND.herbDark, bg: BRAND.herbSoft, label: "Delivered" },
  cancelled: { fg: BRAND.chiliDark, bg: BRAND.chiliSoft, label: "Cancelled" },
} as const;
