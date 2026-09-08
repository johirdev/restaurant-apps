import LegalPageModel from "../models/legal.model";
import { NotFound } from "../lib/apiError";
import { sanitizeHtml } from "../lib/sanitizeHtml";
import { DEFAULT_LEGAL_PAGES } from "../config/legalContent";
import {
  LEGAL_SLUGS,
  type ILegalPage,
  type ILegalPageUpdate,
  type ILegalSection,
  type LegalSlug,
} from "../interfaces/legal.interface";

/* ==========================================================================
   আইনি পাতা — সার্ভিস স্তর
   --------------------------------------------------------------------------
   দুটো কাজ এখানে হয়, আর কোথাও নয়:

   ১. না থাকলে বানিয়ে দেওয়া। প্রথমবার পাতাটা খুললেই ডিফল্ট খসড়া
      (config/legalContent.ts) দিয়ে ডকুমেন্টটা তৈরি হয়ে যায় — আলাদা কোনো
      seed স্ক্রিপ্ট চালাতে হয় না, আর সাইটে কখনো ফাঁকা পাতা দেখা যায় না।

   ২. HTML ছেঁকে নেওয়া। `intro` আর প্রতিটা সেকশনের `body` এডিটর থেকে HTML
      হয়ে আসে; ডাটাবেসে বসার ঠিক আগে সেটা sanitizeHtml দিয়ে যায়। ফলে
      ডাটাবেসে যা আছে তা সবসময়ই নিরাপদ — পড়ার সময় আর কিছু করতে হয় না।
   ========================================================================== */

/** সাইটের পাতা প্রতি রিকোয়েস্টে DB না ডেকে অল্প সময় ক্যাশে থাকে */
const cache = new Map<LegalSlug, { value: ILegalPage; at: number }>();
const CACHE_MS = 60_000;

const clearCache = (slug?: LegalSlug) => {
  if (slug) cache.delete(slug);
  else cache.clear();
};

/* ------------------------------------------------------------------ */
/* HTML ছাঁকা                                                          */
/* ------------------------------------------------------------------ */

const cleanLocalizedHtml = (value?: { en?: string; bn?: string }) => ({
  en: sanitizeHtml(value?.en || ""),
  bn: sanitizeHtml(value?.bn || ""),
});

/** যে ফিল্ডগুলোতে HTML থাকে, শুধু সেগুলো ছেঁকে দেওয়া হয় */
const withCleanHtml = (payload: ILegalPageUpdate): ILegalPageUpdate => {
  const next: ILegalPageUpdate = { ...payload };

  if (payload.intro) next.intro = cleanLocalizedHtml(payload.intro);

  if (payload.sections) {
    next.sections = payload.sections.map((section) => ({
      ...section,
      body: cleanLocalizedHtml(section.body),
    })) as ILegalSection[];
  }

  return next;
};

/* ------------------------------------------------------------------ */
/* পড়া                                                                 */
/* ------------------------------------------------------------------ */

/** ডকুমেন্টটা তুলে আনে, না থাকলে ডিফল্ট খসড়া দিয়ে বানিয়ে দেয় */
const load = async (slug: LegalSlug): Promise<ILegalPage> => {
  const existing = await LegalPageModel.findOne({ slug }).lean();
  if (existing) return existing as unknown as ILegalPage;

  const seed = DEFAULT_LEGAL_PAGES[slug];
  const created = await LegalPageModel.findOneAndUpdate(
    { slug },
    { $setOnInsert: { ...withCleanHtml(seed), slug } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  return created as unknown as ILegalPage;
};

/** ড্যাশবোর্ডের এডিটর — সবসময় টাটকা মান, খসড়া পাতাও দেখা যায় */
const getForEditor = async (slug: LegalSlug): Promise<ILegalPage> => {
  const value = await load(slug);
  cache.set(slug, { value, at: Date.now() });
  return value;
};

/**
 * সাইটের পাতা।
 * খসড়া (draft) হলে কিছুই ফেরে না — তখন Next.js নিজে 404 দেখায়।
 * লুকানো সেকশনগুলোও এখানেই ছেঁকে ফেলা হয়, ক্লায়েন্টে যায় না।
 */
const getPublicPage = async (slug: LegalSlug): Promise<ILegalPage | null> => {
  const hit = cache.get(slug);
  const page = hit && Date.now() - hit.at < CACHE_MS ? hit.value : await load(slug);

  if (!hit || Date.now() - hit.at >= CACHE_MS) {
    cache.set(slug, { value: page, at: Date.now() });
  }

  if (page.status !== "published") return null;

  return {
    ...page,
    sections: (page.sections || []).filter((s) => s.status !== "hidden"),
  };
};

/** ড্যাশবোর্ডের তালিকা — তিনটে পাতার হালচাল একসাথে */
const getAllForEditor = async () => {
  const pages = await Promise.all(LEGAL_SLUGS.map((slug) => load(slug)));
  return pages;
};

/* ------------------------------------------------------------------ */
/* লেখা                                                                */
/* ------------------------------------------------------------------ */

const updatePage = async (slug: LegalSlug, payload: ILegalPageUpdate) => {
  const page = await LegalPageModel.findOneAndUpdate(
    { slug },
    { $set: withCleanHtml(payload) },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();

  if (!page) throw NotFound("That page does not exist");

  const value = page as unknown as ILegalPage;
  cache.set(slug, { value, at: Date.now() });
  return value;
};

/**
 * পাতাটা আবার শুরুর খসড়ায় ফিরিয়ে নেওয়া।
 * ম্যানেজার সাজাতে গিয়ে লেখা এলোমেলো করে ফেললে এটাই একমাত্র ফেরার পথ,
 * তাই কন্ট্রোলারে এটা মালিক পর্যায়ের অনুমতিতে বাঁধা।
 */
const resetPage = async (slug: LegalSlug) => {
  const seed = DEFAULT_LEGAL_PAGES[slug];
  const page = await LegalPageModel.findOneAndUpdate(
    { slug },
    { $set: { ...withCleanHtml(seed), slug } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();

  const value = page as unknown as ILegalPage;
  cache.set(slug, { value, at: Date.now() });
  return value;
};

export const LegalService = {
  getForEditor,
  getAllForEditor,
  getPublicPage,
  updatePage,
  resetPage,
  clearCache,
};
