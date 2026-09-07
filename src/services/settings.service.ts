import SettingsModel from "../models/settings.model";
import {
  DEFAULT_SETTINGS,
  PUBLIC_SETTINGS_FIELDS,
  type IRestaurantSettings,
} from "../interfaces/settings.interface";

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

  return { ...DEFAULT_SETTINGS, ...(doc as unknown as IRestaurantSettings) };
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

const update = async (payload: Partial<IRestaurantSettings>) => {
  const doc = await SettingsModel.findOneAndUpdate(
    { key: "restaurant" },
    { $set: payload },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();

  const value = { ...DEFAULT_SETTINGS, ...(doc as unknown as IRestaurantSettings) };
  // বদলানোর সাথে সাথেই ক্যাশ নতুন করে বসাই, নাহলে ৩০ সেকেন্ড পুরোনো হারে দাম হবে
  cache = { value, at: Date.now() };
  return value;
};

export const SettingsService = { get, getFresh, getPublic, update };
