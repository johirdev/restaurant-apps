import { SortOrder } from "mongoose";

/* ==========================================================================
   PAGINATION — এক পাতায় কতটুকু
   --------------------------------------------------------------------------
   `limit` সরাসরি query string থেকে আসে, তাই এখানে দুটো পাহারা বসানো:

     • **উপরের সীমা** — `?limit=999999` দিয়ে কেউ যেন এক ডাকেই পুরো
       কালেকশন টেনে সার্ভার আর ডাটাবেস দুটোকেই বসিয়ে দিতে না পারে।
       এক বছরের অর্ডার জমার পরে এটা না থাকলে একটামাত্র রিকোয়েস্টেই
       সাইট ডাউন হয়ে যেত।

     • **skip এর সীমা** — মঙ্গোতে `skip` যত বড় হয় কোয়েরি তত ধীর হয়
       (আগের সব ডকুমেন্ট গুনে তবেই বাদ দেয়)। তাই পাতার সংখ্যাও বাঁধা।

   দুটোই নীরবে ছেঁটে দেওয়া হয়, এরর দেওয়া হয় না — কারণ ভুলটা সাধারণত
   ব্যবহারকারীর নয়, আর তালিকা দেখাতেই থাকাই ভালো।
   ========================================================================== */

/** এক পাতায় সর্বোচ্চ কত সারি (POS এর পুরো মেনু লোড এর ভেতরেই ধরে) */
export const MAX_PAGE_LIMIT = 300;
/** কত নম্বর পাতা পর্যন্ত যাওয়া যাবে */
export const MAX_PAGE = 5000;

type IOptionPagination = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
};

type IOptionReturn = {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: SortOrder;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const calculationPagination = (Option: IOptionPagination): IOptionReturn => {
  const rawPage = Number(Option.page);
  const rawLimit = Number(Option.limit);

  const page = clamp(Number.isFinite(rawPage) ? Math.trunc(rawPage) : 1, 1, MAX_PAGE);
  const limit = clamp(
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.trunc(rawLimit) : 20,
    1,
    MAX_PAGE_LIMIT,
  );

  const sortOrder: SortOrder = Option.sortOrder === "asc" ? "asc" : "desc";

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    sortBy: Option.sortBy || "createdAt",
    sortOrder,
  };
};

export const HelperPagination = {
  calculationPagination,
};
