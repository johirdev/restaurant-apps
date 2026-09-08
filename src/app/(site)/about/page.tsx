import type { Metadata } from "next";

import AboutPageView from "../../components/Clients/About/AboutPageView";
import { loadRestaurant } from "../../components/Clients/Shared/loadRestaurant";
import { restaurantJsonLd } from "../../components/Clients/Shared/restaurantJsonLd";

/**
 * আমাদের কথা — লেখা, ছবি, সংখ্যা সবই ড্যাশবোর্ডের রেস্টুরেন্ট সেটিংস
 * থেকে আসে (Settings → About page)। কোড ছুঁয়ে কিছু বদলাতে হয় না।
 */

// ম্যানেজার সেভ করার সাথে সাথেই নতুন লেখা দেখা দরকার, তাই ক্যাশ নয়।
// (সার্ভিস লেয়ারে ৩০ সেকেন্ডের ছোট ক্যাশ আছে — DB প্রতি ভিজিটে ডাকা হয় না।)
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadRestaurant();

  const title = `About ${settings.restaurant_name}`;
  const description =
    settings.about.intro.trim() ||
    `${settings.restaurant_name} — our story, our kitchen and the people behind every plate.`;

  return {
    title,
    description,
    alternates: { canonical: "/about" },
    openGraph: {
      type: "article",
      title,
      description,
      url: "/about",
      ...(settings.about.cover_image
        ? { images: [{ url: settings.about.cover_image }] }
        : {}),
    },
    robots: { index: true, follow: true },
  };
}

export default async function AboutPage() {
  const settings = await loadRestaurant();

  return (
    <>
      {/* গুগল যেন দোকানটাকে একটা রেস্টুরেন্ট হিসেবেই চেনে — ঠিকানা,
          ফোন, খোলার সময় আর সোশ্যাল প্রোফাইল সবই কাঠামোবদ্ধ ডাটায়।
          `<` কে < করা হয় স্ক্রিপ্ট-ইনজেকশন ঠেকাতে (Next.js এর
          নিজের JSON-LD গাইড যেভাবে বলে)। */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(restaurantJsonLd(settings, "/about")).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />

      <AboutPageView settings={settings} />
    </>
  );
}
