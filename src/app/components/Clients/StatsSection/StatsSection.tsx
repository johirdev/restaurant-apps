"use client";
import "./statusSection.css"
import {
  ShoppingCart,
  Sprout,
  User,
  Award,
  Heart,
  LucideIcon,
} from "lucide-react";

interface StatItem {
  icon: LucideIcon;
  value: string;
  label: string;
}

interface StatsSectionProps {
  bgImage?: string;
  cartCount?: number;
  cartTotal?: string;
  stats?: StatItem[];
}

const defaultStats: StatItem[] = [
  { icon: Sprout, value: "105", label: "Ingredients" },
  { icon: User, value: "600", label: "Clients Daily" },
  { icon: Award, value: "50", label: "Years of Experience" },
  { icon: Heart, value: "100", label: "Fresh & Halal" },
];

export default function StatsSection({

  stats = defaultStats,
}: StatsSectionProps) {
  return (
    <section className="relative w-full mt-20 section-bg2 h-[260px] md:h-[300px] lg:h-[340px] overflow-hidden">
    
      {/* Dark overlay for text contrast */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Stats row */}
      <div className="relative z-10 h-full flex items-center justify-center px-6">
        <div className="flex flex-wrap items-start justify-center gap-x-10 sm:gap-x-16 md:gap-x-24 gap-y-8 max-w-6xl w-full">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="flex flex-col items-center text-center min-w-[130px]"
              >
                <Icon
                  className="w-9 h-9 md:w-10 md:h-10 text-amber-500 mb-3"
                  strokeWidth={1.5}
                />
                <span className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-none mb-2 font-sans">
                  {stat.value}
                </span>
                <span className="text-sm md:text-base text-gray-100/90 font-medium tracking-wide">
                  {stat.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
