"use client";

/**
 * StatsSection — home page "Our story in numbers" section
 * --------------------------------------------------------------------------
 * A fixed background image with four floating glass 3D tiles on top.
 *
 *  • Numbers count up from 0 once the section enters the viewport
 *    (IntersectionObserver — runs once only, never repeats)
 *  • On mouse move, each tile tilts toward the pointer (--rx / --ry CSS vars),
 *    and settles back flat when the pointer leaves
 *  • Touch devices and `prefers-reduced-motion` get no tilt at all — that's
 *    handled entirely in statusSection.css, the JS doesn't know about it
 *
 * All colors come from globals.css design tokens, so this section follows
 * the active theme automatically.
 */

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  Award,
  ChefHat,
  Leaf,
  Timer,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import "./statusSection.css";

export interface StatItem {
  icon: LucideIcon;
  /** Counts up to this number */
  value: number;
  /** Appended after the number — "+", "%", " yrs" etc */
  suffix?: string;
  label: string;
  /** One-line explanation under the label */
  caption?: string;
}

interface StatsSectionProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  stats?: StatItem[];
}

const DEFAULT_STATS: StatItem[] = [
  {
    icon: Leaf,
    value: 105,
    suffix: "+",
    label: "Fresh Ingredients",
    caption: "Sourced from the market every morning",
  },
  {
    icon: UtensilsCrossed,
    value: 600,
    suffix: "+",
    label: "Guests Daily",
    caption: "That many guests at our tables every day",
  },
  {
    icon: Award,
    value: 50,
    suffix: " yrs",
    label: "Of Experience",
    caption: "Three generations in the kitchen",
  },
  {
    icon: ChefHat,
    value: 100,
    suffix: "%",
    label: "Fresh & Halal",
    caption: "Certified halal supply chain",
  },
];

/* ------------------------------------------------------------------ */
/* Turns true the first time the section enters view — never resets    */
/* ------------------------------------------------------------------ */
function useInView<T extends HTMLElement>(rootMargin = "-12% 0px") {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || seen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, seen]);

  return { ref, seen };
}

/* ------------------------------------------------------------------ */
/* Counts 0 → target, easing out near the end (easeOutExpo)            */
/* ------------------------------------------------------------------ */
function useCountUp(target: number, run: boolean, duration = 1900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!run) return;

    /* Reduced-motion users skip the count — the final number appears at once */
    const span = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : duration;

    let frame = 0;
    let start: number | null = null;

    const tick = (now: number) => {
      if (start === null) start = now;
      const progress = span === 0 ? 1 : Math.min((now - start) / span, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, run, duration]);

  return value;
}

/* ------------------------------------------------------------------ */
/* One tile — handles its own tilt                                     */
/* ------------------------------------------------------------------ */
function StatTile({
  stat,
  index,
  run,
}: {
  stat: StatItem;
  index: number;
  run: boolean;
}) {
  const Icon = stat.icon;
  const count = useCountUp(stat.value, run);

  /* Maps the pointer position within the card to −0.5…0.5 for CSS */
  const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;

    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;

    card.style.setProperty("--rx", `${(-py * 12).toFixed(2)}deg`);
    card.style.setProperty("--ry", `${(px * 14).toFixed(2)}deg`);
    card.style.setProperty("--mx", `${((px + 0.5) * 100).toFixed(1)}%`);
    card.style.setProperty("--my", `${((py + 0.5) * 100).toFixed(1)}%`);
  };

  const handleLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    const card = event.currentTarget;
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--mx", "50%");
    card.style.setProperty("--my", "50%");
  };

  return (
    <div
      className={`stat-tile${run ? " is-in" : ""}`}
      style={{ animationDelay: `${index * 110}ms` }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      {/* Light follows the pointer exactly */}
      <span className="stat-tile__sheen" aria-hidden="true" />

      <span className="stat-tile__icon">
        <Icon strokeWidth={1.6} aria-hidden="true" />
      </span>

      <p className="stat-tile__value">
        <span className="stat-tile__number">{count}</span>
        {stat.suffix ? (
          <span className="stat-tile__suffix">{stat.suffix}</span>
        ) : null}
      </p>

      <p className="stat-tile__label">{stat.label}</p>

      {stat.caption ? (
        <p className="stat-tile__caption">{stat.caption}</p>
      ) : null}

      <span className="stat-tile__rule" aria-hidden="true" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                              */
/* ------------------------------------------------------------------ */
export default function StatsSection({
  eyebrow = "Our kitchen in numbers",
  title = "Cooked with fire, served with heart",
  description = "Behind every plate is years of practice, fresh markets, and a team that cares — these numbers are the short version of that story.",
  stats = DEFAULT_STATS,
}: StatsSectionProps) {
  const { ref, seen } = useInView<HTMLElement>();

  return (
    <section
      ref={ref}
      className="stats-3d section-bg2"
      aria-labelledby="stats-3d-title"
    >
      {/* Veil, color glow and subtle grid over the image */}
      <span className="stats-3d__veil" aria-hidden="true" />
      <span className="stats-3d__aurora" aria-hidden="true" />
      <span className="stats-3d__mesh" aria-hidden="true" />

      {/* Floating light orbs */}
      <span className="stats-3d__orb stats-3d__orb--a" aria-hidden="true" />
      <span className="stats-3d__orb stats-3d__orb--b" aria-hidden="true" />

      <div className="stats-3d__inner">
        <header className={`stats-3d__head${seen ? " is-in" : ""}`}>
          <span className="stats-3d__eyebrow">{eyebrow}</span>
          <h2 id="stats-3d-title" className="stats-3d__title">
            {title}
          </h2>
          <p className="stats-3d__desc">{description}</p>
        </header>

        <div className="stats-3d__tiles">
          {stats.map((stat, index) => (
            <StatTile key={stat.label} stat={stat} index={index} run={seen} />
          ))}
        </div>

        <p className={`stats-3d__foot${seen ? " is-in" : ""}`}>
          <Timer aria-hidden="true" />
          <span>
            On average, food reaches the table in <strong>22 minutes</strong> —
            if we{"'"}re late, dessert is on us.
          </span>
        </p>
      </div>
    </section>
  );
}
