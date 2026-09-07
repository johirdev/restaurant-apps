/* eslint-disable @typescript-eslint/no-explicit-any */
import dns from "node:dns";
import mongoose from "mongoose";

const MONGODB_URI = process.env.DATABASE_URL!;

if (!MONGODB_URI) throw new Error("DATABASE_URL missing in .env");

/* ==========================================================================
   SRV DNS
   --------------------------------------------------------------------------
   `mongodb+srv://` কানেকশনে মঙ্গো আগে `_mongodb._tcp.<host>` এর SRV রেকর্ড
   খোঁজে। অনেক ISP/রাউটারের DNS এই SRV প্রশ্নের উত্তর দেয় না — তখন
   `querySrv ETIMEOUT` এসে প্রতিটা রিকোয়েস্ট ৫০০ হয়ে যায়।
   নিচের রিজলভারগুলো SRV এর উত্তর দেয়।

   শুধু `dns.resolve*` (অর্থাৎ SRV/TXT লুকআপ) এর উপর প্রভাব পড়ে —
   বাকি সব কানেকশন OS এর `dns.lookup` ব্যবহার করে, সেগুলো অপরিবর্তিত থাকে।
   ========================================================================== */
const dnsServers = (process.env.DNS_SERVERS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (dnsServers.length && MONGODB_URI.startsWith("mongodb+srv://")) {
  try {
    dns.setServers(dnsServers);
  } catch {
    // ভুল IP দেওয়া থাকলে সিস্টেমের নিজের রিজলভারেই চলুক
    console.warn("[db] Invalid DNS_SERVERS, keeping the system resolver");
  }
}

// Global cache to avoid reconnecting on every request (Next.js hot reload safe)
let cached = (global as any).mongoose as {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      // ডিফল্ট ৩০ সেকেন্ড — এত সময় ধরে রিকোয়েস্ট ঝুলে থাকার চেয়ে
      // তাড়াতাড়ি এরর দেখানোই ভালো
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    // ব্যর্থ promise ক্যাশে রেখে দিলে একবার নেট কেটে গেলে সার্ভার রিস্টার্ট
    // না করা পর্যন্ত প্রতিটা রিকোয়েস্ট ওই একই এরর ফেরত দিত।
    cached.promise = null;
    cached.conn = null;
    throw err;
  }
}
