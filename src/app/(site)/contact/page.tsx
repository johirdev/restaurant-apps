import type { Metadata } from "next";

import ContactPageView from "../../components/Clients/Contact/ContactPageView";
import { loadRestaurant } from "../../components/Clients/Shared/loadRestaurant";
import { restaurantJsonLd } from "../../components/Clients/Shared/restaurantJsonLd";

/**
 * যোগাযোগ — ঠিকানা, ফোন, খোলার সময়, সোশ্যাল আর গুগল ম্যাপ, সবই
 * ড্যাশবোর্ডের রেস্টুরেন্ট সেটিংস থেকে। ফর্মের বার্তা `contact_messages`
 * কালেকশনে জমা হয়, ম্যানেজার ইনবক্সে পড়ে।
 */

// ঠিকানা বা সময়সূচি বদলানোর সাথে সাথেই সাইটে দেখা দরকার, তাই ক্যাশ নয়।
// (সার্ভিস লেয়ারে ৩০ সেকেন্ডের ছোট ক্যাশ আছে — DB প্রতি ভিজিটে ডাকা হয় না।)
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadRestaurant();

  const title = `Contact ${settings.restaurant_name}`;
  const description =
    settings.contact.intro.trim() ||
    [
      `Get in touch with ${settings.restaurant_name}`,
      settings.address,
      settings.phone,
    ]
      .filter(Boolean)
      .join(" · ");

  return {
    title,
    description,
    alternates: { canonical: "/contact" },
    openGraph: {
      type: "website",
      title,
      description,
      url: "/contact",
    },
    robots: { index: true, follow: true },
  };
}

export default async function ContactPage() {
  const settings = await loadRestaurant();

  return (
    <>
      {/* About পাতার মতোই কাঠামোবদ্ধ ডাটা — গুগল যেন ঠিকানা, ফোন আর
          খোলার সময় সরাসরি পড়তে পারে। `<` কে < করা হয়
          স্ক্রিপ্ট-ইনজেকশন ঠেকাতে (Next.js এর JSON-LD গাইড অনুযায়ী)। */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            restaurantJsonLd(settings, "/contact"),
          ).replace(/</g, "\\u003c"),
        }}
      />

      <ContactPageView settings={settings} />
    </>
  );
}
