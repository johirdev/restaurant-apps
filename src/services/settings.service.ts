import SettingsModel from "../models/settings.model";
import {
  DEFAULT_SETTINGS,
  PUBLIC_SETTINGS_FIELDS,
  type IRestaurantSettings,
  type RestaurantSettingsUpdate,
} from "../interfaces/settings.interface";

/**
 * ডাটাবেসের ডকুমেন্ট + ডিফল্ট মিলিয়ে একটা পূর্ণ সেটিংস অবজেক্ট।
 *
 * উপরের স্তরে সাধারণ spread যথেষ্ট, কিন্তু `socials` / `about` / `contact`
 * নিজেরাই অবজেক্ট — পুরোনো ডকুমেন্টে (এই ফিল্ডগুলো যোগ হওয়ার আগে সেভ করা)
 * এদের ভেতরের নতুন চাবিগুলো থাকে না। তাই এই তিনটেকে আলাদা করে একধাপ
 * গভীরে মিলিয়ে দিই, নইলে About পাতায় `undefined` চলে আসত।
 */
const withDefaults = (doc: Partial<IRestaurantSettings> | null): IRestaurantSettings => {
  const merged = { ...DEFAULT_SETTINGS, ...(doc || {}) };

  return {
    ...merged,
    socials: { ...DEFAULT_SETTINGS.socials, ...(doc?.socials || {}) },
    about: { ...DEFAULT_SETTINGS.about, ...(doc?.about || {}) },
    contact: { ...DEFAULT_SETTINGS.contact, ...(doc?.contact || {}) },
    // সাতটা সারি না থাকলে (পুরোনো ডকুমেন্ট) ডিফল্ট সময়সূচিই চলুক
    opening_hours: doc?.opening_hours?.length
      ? doc.opening_hours
      : DEFAULT_SETTINGS.opening_hours,
  };
};

/* ==========================================================================
   RESTAURANT SETTINGS
   --------------------------------------------------------------------------
   ডকুমেন্ট একটাই। না থাকলে প্রথম ডাকাতেই ডিফল্ট দিয়ে বানিয়ে ফেলা হয়,
   তাই ইনস্টলের পর আলাদা কোনো seed স্ক্রিপ্ট চালাতে হয় না।
   ========================================================================== */

/** প্রতি রিকোয়েস্টে DB তে না গিয়ে অল্প সময় ক্যাশে রাখি — দাম হিসাব খুব ঘন ঘন হয় */
let cache: { value: IRestaurantSettings; at: number } | null = null;
const CACHE_MS = 30_000;

const load = async (): Promise<IRestaurantSettings> => {
  const doc = await SettingsModel.findOneAndUpdate(
    { key: "restaurant" },
    { $setOnInsert: { key: "restaurant" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  return withDefaults(doc as unknown as IRestaurantSettings);
};

/** দাম হিসাবের জন্য — ক্যাশ থেকে দিলেই চলে */
const get = async (): Promise<IRestaurantSettings> => {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const value = await load();
  cache = { value, at: Date.now() };
  return value;
};

/** ড্যাশবোর্ডের সেটিংস পেজ — সবসময় টাটকা মান দেখাতে হবে */
const getFresh = async (): Promise<IRestaurantSettings> => {
  const value = await load();
  cache = { value, at: Date.now() };
  return value;
};

/** কাস্টমার সাইটের জন্য ছাঁকা সংস্করণ */
const getPublic = async () => {
  const all = await get();
  return Object.fromEntries(
    PUBLIC_SETTINGS_FIELDS.map((field) => [field, all[field]]),
  ) as Pick<IRestaurantSettings, (typeof PUBLIC_SETTINGS_FIELDS)[number]>;
};

const update = async (payload: RestaurantSettingsUpdate) => {
  /**
   * `$set: { about: {...} }` পুরো সাব-ডকুমেন্টটাই বদলে ফেলে। তাই কেউ
   * যদি About এর শুধু একটা ফিল্ড পাঠায়, বাকিগুলো মুছে যেত। সেটা ঠেকাতে
   * নেস্টেড ব্লক তিনটে আগে বর্তমান মানের সাথে মিলিয়ে নিই — PATCH যেমন
   * আচরণ করার কথা, ঠিক তেমনই।
   */
  const current = await get();

  const merged: RestaurantSettingsUpdate = {
    ...payload,
    ...(payload.socials
      ? { socials: { ...current.socials, ...payload.socials } }
      : {}),
    ...(payload.about ? { about: { ...current.about, ...payload.about } } : {}),
    ...(payload.contact
      ? { contact: { ...current.contact, ...payload.contact } }
      : {}),
  };

  const doc = await SettingsModel.findOneAndUpdate(
    { key: "restaurant" },
    { $set: merged },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();

  const value = withDefaults(doc as unknown as IRestaurantSettings);
  // বদলানোর সাথে সাথেই ক্যাশ নতুন করে বসাই, নাহলে ৩০ সেকেন্ড পুরোনো হারে দাম হবে
  cache = { value, at: Date.now() };
  return value;
};

export const SettingsService = { get, getFresh, getPublic, update };
