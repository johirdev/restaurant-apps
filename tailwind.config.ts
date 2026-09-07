import type { Config } from "tailwindcss";

/**
 * ⚠️ এই প্রজেক্ট Tailwind CSS v4 ব্যবহার করে।
 *
 * v4 তে থিম (রঙ, ফন্ট, রেডিয়াস, শ্যাডো) আর এই ফাইলে লেখা হয় না —
 * সব কিছু `src/app/globals.css` এর `@theme { … }` ব্লকে আছে, এবং
 * v4 এই config ফাইলটা ততক্ষণ পড়েই না যতক্ষণ CSS এ `@config` দিয়ে
 * একে ইমপোর্ট করা না হয় (আমরা করিনি — দরকারও নেই)।
 *
 * 👉 রঙ বা ফন্ট বদলাতে চাইলে: src/app/globals.css খুলুন।
 *
 * ফাইলটা শুধু এডিটর/টুলিং এর সাথে সামঞ্জস্যের জন্য রাখা হয়েছে।
 */
const config: Config = {
  theme: {},
  plugins: [],
};

export default config;
