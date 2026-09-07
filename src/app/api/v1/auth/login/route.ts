// src/app/api/v1/auth/login/route.ts
//
// এই রুটটা প্রজেক্টের শুরুর দিকের একটা অবশিষ্টাংশ — এটা `@/controllers/auth.controller`
// ইমপোর্ট করত, যেটা কোনোদিন তৈরিই হয়নি, ফলে পুরো বিল্ড ভেঙে যেত।
//
// আসল লগইন এন্ডপয়েন্ট দুটো:
//     POST /api/v1/admins/login   — অ্যাডমিন
//     POST /api/v1/staffs/login   — স্টাফ / ওয়েটার
//
// পুরোনো কোনো ক্লায়েন্ট যেন চুপচাপ ফেল না করে, তাই এখানে পরিষ্কার একটা
// 410 Gone ফেরত দেওয়া হয়। এই ফোল্ডারটা নিশ্চিন্তে মুছে ফেলতে পারেন।
import { sendResponse } from "@/src/lib/sendResponse";

export const runtime = "nodejs";

export async function POST() {
  return sendResponse({
    statusCode: 410,
    success: false,
    message:
      "This endpoint has moved. Use POST /api/v1/admins/login or POST /api/v1/staffs/login.",
  });
}
