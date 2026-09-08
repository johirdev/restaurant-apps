"use client";

import { useEffect, useState } from "react";

import { openStateAt } from "@/src/lib/restaurantInfo";
import type { IOpeningHour } from "@/src/interfaces/settings.interface";

/* ==========================================================================
   "এখন খোলা আছে?" ব্যাজ
   --------------------------------------------------------------------------
   সময়টা শুধু ব্রাউজারেই দেখা হয়। সার্ভারে render করার সময় ঘড়ি দেখলে
   সার্ভারের HTML আর ব্রাউজারের HTML আলাদা হয়ে hydration ভেঙে যেত
   (সার্ভারের টাইমজোনও অতিথির টাইমজোন নয়)। তাই প্রথম render এ শুধু
   একটা নিরপেক্ষ লেখা বসে, আর মাউন্টের পরে আসল অবস্থাটা এসে বসে।

   ফুটারেও ঠিক এই কৌশলটাই ব্যবহার হয় — সেখানে rAF দিয়ে।
   ========================================================================== */

interface OpenNowBadgeProps {
  hours: IOpeningHour[];
  /** ব্যাজটা কোথায় বসছে — CSS ক্লাসটা কলার ঠিক করে দেয় */
  className?: string;
}

export default function OpenNowBadge({ hours, className }: OpenNowBadgeProps) {
  const [state, setState] = useState<{ open: boolean; label: string } | null>(
    null,
  );

  useEffect(() => {
    const tick = () => setState(openStateAt(hours, new Date()));
    tick();

    // মিনিটে একবার দেখা — বন্ধ হওয়ার সময়টা পেরিয়ে গেলে ব্যাজটা নিজেই বদলে যায়
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, [hours]);

  const classes = [
    "open-badge",
    state?.open ? "is-open" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} suppressHydrationWarning>
      <i aria-hidden="true" />
      {state ? state.label : "Opening hours"}
    </span>
  );
}
