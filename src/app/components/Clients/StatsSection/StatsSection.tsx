"use client";

/**
 * StatsSection — হোম পেজের "আমাদের গল্প সংখ্যায়" সেকশন
 * --------------------------------------------------------------------------
 * ফিক্সড ব্যাকগ্রাউন্ড ছবির উপরে চারটে কাঁচের (glass) 3D টাইল ভেসে থাকে।
 *
 *  • সেকশনটা স্ক্রিনে আসলেই সংখ্যাগুলো ০ থেকে গুনতে গুনতে উপরে ওঠে
 *    (IntersectionObserver — একবারই চলে, বারবার নয়)
 *  • মাউস নাড়লে টাইলটা মাউসের দিকে হেলে পড়ে (pointer → --rx / --ry ভ্যারিয়েবল),
 *    মাউস সরালে আবার সোজা হয়ে যায়
 *  • টাচ ডিভাইস আর `prefers-reduced-motion` এ কোনো হেলা-দোলা নেই — সেটা
 *    statusSection.css সামলায়, JS আলাদা করে কিছু জানে না
 *
 * রঙ সব globals.css এর টোকেন থেকে আসে, তাই থিম বদলালে এই সেকশনও বদলায়।
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
  /** যত পর্যন্ত গুনবে */
  value: number;
  /** সংখ্যার পরে যা বসবে — "+", "%", " yrs" ইত্যাদি */
  suffix?: string;
  label: string;
  /** লেবেলের নিচের এক লাইনের ব্যাখ্যা */
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
    caption: "প্রতিদিন ভোরে বাজার থেকে আসে",
  },
  {
    icon: UtensilsCrossed,
    value: 600,
    suffix: "+",
    label: "Guests Daily",
    caption: "প্রতিদিন এত অতিথি আমাদের টেবিলে",
  },
  {
    icon: Award,
    value: 50,
    suffix: " yrs",
    label: "Of Experience",
    caption: "তিন প্রজন্মের রান্নাঘর",
  },
  {
    icon: ChefHat,
    value: 100,
    suffix: "%",
    label: "Fresh & Halal",
    caption: "সার্টিফায়েড হালাল সাপ্লাই চেইন",
  },
];

/* ------------------------------------------------------------------ */
/* সেকশনটা একবার স্ক্রিনে এলে true হয়ে যায় — তারপর আর বদলায় না        */
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
      { rootMargin, threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, seen]);

  return { ref, seen };
}

/* ------------------------------------------------------------------ */
/* ০ থেকে target পর্যন্ত গোনা — শেষের দিকে আস্তে হয়ে থামে (easeOutExpo) */
/* ------------------------------------------------------------------ */
function useCountUp(target: number, run: boolean, duration = 1900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!run) return;

    /* মোশন কমানো থাকলে গোনা বাদ — প্রথম ফ্রেমেই সোজা শেষ সংখ্যাটা বসে */
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
/* একটা টাইল — নিজের হেলা-দোলা নিজেই সামলায়                           */
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

  /* মাউস কার্ডের কোথায় আছে সেটা −0.5…0.5 এ ম্যাপ করে CSS কে দিই */
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
      {/* মাউস যেখানে, ঠিক সেখানেই আলোটা পড়ে */}
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
/* সেকশন                                                               */
/* ------------------------------------------------------------------ */
export default function StatsSection({
  eyebrow = "Our kitchen in numbers",
  title = "Cooked with fire, served with heart",
  description = "প্রতিটা প্লেটের পেছনে বছরের পর বছরের অভ্যাস, তাজা বাজার আর একদল মানুষ — সংখ্যাগুলো সেটারই ছোট্ট হিসাব।",
  stats = DEFAULT_STATS,
}: StatsSectionProps) {
  const { ref, seen } = useInView<HTMLElement>();

  return (
    <section
      ref={ref}
      className="stats-3d section-bg2"
      aria-labelledby="stats-3d-title"
    >
      {/* ছবির উপরে পর্দা, রঙিন আভা আর হালকা গ্রিড */}
      <span className="stats-3d__veil" aria-hidden="true" />
      <span className="stats-3d__aurora" aria-hidden="true" />
      <span className="stats-3d__mesh" aria-hidden="true" />

      {/* ভেসে থাকা আলো-বিন্দু */}
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
            গড়ে <strong>২২ মিনিটে</strong> খাবার টেবিলে — দেরি হলে ডেজার্টটা
            আমাদের তরফ থেকে।
          </span>
        </p>
      </div>
    </section>
  );
}
