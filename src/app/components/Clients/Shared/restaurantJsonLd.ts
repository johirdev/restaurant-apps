import type { IRestaurantSettings } from "@/src/interfaces/settings.interface";
import { WEEKDAYS } from "@/src/interfaces/settings.interface";
import { socialLinks, whatsappHref } from "@/src/lib/restaurantInfo";

/* ==========================================================================
   STRUCTURED DATA — গুগলের জন্য দোকানের পরিচয়
   --------------------------------------------------------------------------
   About আর Contact দুটো পাতাতেই একই তথ্য যায়, তাই অবজেক্টটা একবারই
   বানানো হয়। ফল: সার্চ ফলাফলে ঠিকানা, ফোন আর খোলার সময় দেখা যেতে পারে,
   আর গুগল ম্যাপ/নলেজ প্যানেল দোকানটাকে চিনতে পারে।

   ফাঁকা ফিল্ড ইচ্ছে করেই বাদ দেওয়া হয় — অসম্পূর্ণ তথ্য পাঠানোর চেয়ে
   না পাঠানোই ভালো, নাহলে গুগল ভুল ডাটা দেখাতে পারে।
   ========================================================================== */

/** schema.org খোলার সময় "Monday" এভাবেই চায় */
const dayName = (day: number) => `https://schema.org/${WEEKDAYS[day].long}`;

export function restaurantJsonLd(
  settings: IRestaurantSettings,
  path: "/about" | "/contact",
) {
  const socials = socialLinks(settings.socials).map((link) => link.href);

  // হোয়াটসঅ্যাপ নম্বরটা sameAs তালিকায় ঢোকে না, ওটা যোগাযোগের উপায়
  const whatsapp = whatsappHref(settings.socials.whatsapp || "");

  /* দোকান কীভাবে খাবার পৌঁছায় — schema.org এর নির্ধারিত নামেই */
  const deliveryMethods = [
    settings.order_types.includes("delivery")
      ? "https://schema.org/OwnDelivery"
      : "",
    settings.order_types.includes("pickup")
      ? "https://schema.org/OnSitePickup"
      : "",
  ].filter(Boolean);

  const openingHours = settings.opening_hours
    .filter((row) => !row.closed)
    .map((row) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: dayName(row.day),
      opens: row.open,
      closes: row.close,
    }));

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: settings.restaurant_name,
    url: path,
    ...(settings.logo ? { image: settings.logo, logo: settings.logo } : {}),
    ...(settings.about.intro ? { description: settings.about.intro } : {}),
    ...(settings.phone ? { telephone: settings.phone } : {}),
    ...(settings.email ? { email: settings.email } : {}),
    ...(settings.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: settings.address,
          },
        }
      : {}),
    ...(settings.currency_code
      ? { currenciesAccepted: settings.currency_code }
      : {}),
    ...(openingHours.length ? { openingHoursSpecification: openingHours } : {}),
    ...(socials.length || whatsapp
      ? { sameAs: whatsapp ? [...socials, whatsapp] : socials }
      : {}),
    // ডেলিভারি/পিকআপ — সেটিংসে যা চালু, ঠিক সেটাই
    ...(deliveryMethods.length ? { hasDeliveryMethod: deliveryMethods } : {}),
    acceptsReservations: settings.order_types.includes("dine_in"),
  };
}
