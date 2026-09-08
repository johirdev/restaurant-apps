import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Hind_Siliguri } from "next/font/google";
import "./globals.css";

/* ==========================================================================
   RESTAURANT FONT STACK — পুরো অ্যাপে একবারেই লোড হয়
   (site + dashboard দুটোই root layout এর ভিতরে, তাই সব জায়গায় পাওয়া যাবে)

   পুরো অ্যাপে একটাই ফন্ট — Plus Jakarta Sans। হেডিং আর বডির পার্থক্য
   ফন্ট বদলে নয়, ওজন (weight) আর আকার দিয়ে করা হয়।

   globals.css এ এগুলো ম্যাপ করা আছে:
     --font-body     → Plus Jakarta Sans  (পুরো অ্যাপ)
     --font-display  → --font-body        (হেডিং — একই ফন্ট, ভারী ওজন)
     --font-script   → --font-body        (eyebrow / ট্যাগলাইন)
     --font-bengali  → Hind Siliguri      (বাংলা টেক্সট ও ৳)

   আলাদা ডিসপ্লে ফন্ট আবার চাইলে এখানে সেটা লোড করে globals.css এর
   --font-display লাইনটা বদলালেই হবে — অন্য কোনো ফাইল ছুঁতে হবে না।
   ========================================================================== */

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hind",
  display: "swap",
});

const fontVariables = [jakarta.variable, hindSiliguri.variable].join(" ");

export const metadata: Metadata = {
  title: {
    default: "Spice Route — Order Fresh Food Online",
    template: "%s | Spice Route",
  },
  description:
    "Browse the menu, add your favourites to the cart and get hot food delivered to your door.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // ⚠️ পুরো অ্যাপে এটাই একমাত্র জায়গা যেখানে ব্র্যান্ড রঙটা hex হিসেবে লেখা —
  // মোবাইল ব্রাউজারের অ্যাড্রেস বার CSS ভ্যারিয়েবল পড়তে পারে না।
  // globals.css এ --color-brand বদলালে এই লাইনটাও মিলিয়ে দিন।
  themeColor: "#d70f64",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
