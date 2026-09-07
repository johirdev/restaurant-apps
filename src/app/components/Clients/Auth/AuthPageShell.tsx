import type { ReactNode } from "react";
import { Clock, HeartHandshake, Truck } from "lucide-react";

/* ==========================================================================
   লগইন / রেজিস্ট্রেশন পেজের মোড়ক — দুটো পেজেই একই ফ্রেম, শুধু ভেতরের
   ফর্মটা আলাদা। ডানপাশে অ্যাকাউন্ট খোলার সুবিধাগুলো দেখানো হয়।
   ========================================================================== */

const PERKS = [
  {
    icon: Truck,
    title: "Track every order",
    text: "See exactly where your food is, from kitchen to door.",
  },
  {
    icon: Clock,
    title: "Reorder in one tap",
    text: "Your past dishes stay saved, so a repeat order takes seconds.",
  },
  {
    icon: HeartHandshake,
    title: "Review what you ate",
    text: "Rate the dishes you have actually ordered and help others choose.",
  },
];

export default function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <section className="bg-canvas py-10 sm:py-14">
      <div className="max-width">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_440px] lg:gap-14">
          {/* ---------- বাঁ পাশ: কেন অ্যাকাউন্ট (মোবাইলে ফর্মের নিচে) ---------- */}
          <div className="order-2 lg:order-1">
            <span className="site-eyebrow">Your account</span>
            <h2 className="mt-1 font-display text-[28px] font-bold leading-tight text-ink sm:text-[36px]">
              One number is all we need
            </h2>
            <p className="mt-3 max-w-[460px] text-[14px] leading-relaxed text-ink-soft">
              No passwords, no long forms. We text you a code, you type it in,
              and you are in — on any device.
            </p>

            <ul className="mt-7 space-y-4">
              {PERKS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3.5">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
                    <Icon size={18} />
                  </span>
                  <div>
                    <p className="text-[14px] font-bold text-ink">{title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">
                      {text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* ---------- ডান পাশ: ফর্ম ---------- */}
          <div className="order-1 lg:order-2">{children}</div>
        </div>
      </div>
    </section>
  );
}
