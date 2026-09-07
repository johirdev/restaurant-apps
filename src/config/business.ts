/**
 * ==========================================================================
 * PRICING — দোকানের নিয়মকানুন এখন ডাটাবেসে (Settings), কোডে নয়।
 * --------------------------------------------------------------------------
 * এই ফাইলটা শুধু হিসাবটা রাখে। মানগুলো আসে:
 *   সার্ভারে  → SettingsService.get()
 *   ক্লায়েন্টে → useSettingsStore (GET /api/v1/settings)
 *
 * সেটিংস লোড হওয়ার আগে বা একদম নতুন ইনস্টলে DEFAULT_SETTINGS চলে,
 * তাই কোথাও কিছু ভেঙে পড়ে না।
 * ==========================================================================
 */
import {
  DEFAULT_SETTINGS,
  type IRestaurantSettings,
} from "../interfaces/settings.interface";

export { DEFAULT_SETTINGS };
export type { IRestaurantSettings };

export type PricingOrderType = "delivery" | "pickup" | "dine_in";

/** অর্ডারে জমা হওয়া হিসাব — ইনভয়েস এই ভাঙা-হিসাবটাই ছাপে */
export interface OrderPricing {
  subtotal: number;
  discount: number;
  service_charge: number;
  vat: number;
  delivery_fee: number;
  total: number;
  /** হিসাব করার সময় যে হারগুলো চলছিল — পরে সেটিংস বদলালেও পুরোনো ইনভয়েস ঠিক থাকে */
  vat_percent: number;
  service_charge_percent: number;
  tax_mode: IRestaurantSettings["tax_mode"];
}

/** পয়সার ঘর পর্যন্ত — ভাসমান দশমিকের ভুল যোগফল ঠেকায় */
const money = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * টাকার চিহ্ন সেটিংসে বদলানো যায়, অথচ `formatMoney` অ্যাপের প্রায় প্রতিটা
 * কম্পোনেন্টে ডাকা হয়। প্রতিটাতে হুক বসানোর বদলে সেটিংস লোড হওয়ার সময়
 * একবার এখানে চিহ্নটা বসিয়ে দেওয়া হয় (settings.store → setActiveCurrency)।
 *
 * সার্ভারে এই মান কখনো বদলায় না — সার্ভারের কোডে চিহ্ন লাগলে সরাসরি
 * `settings.currency` ব্যবহার করা হয়, তাই দুই রিকোয়েস্টে মান মিশে যাওয়ার
 * ঝুঁকি নেই।
 */
let activeCurrency: string = DEFAULT_SETTINGS.currency;

export const setActiveCurrency = (currency: string) => {
  if (currency) activeCurrency = currency;
};

/** টাকার অঙ্ক দেখানোর একক ফরম্যাট — পুরো অ্যাপ এটাই ব্যবহার করে */
export const formatMoney = (amount: number, currency: string = activeCurrency) =>
  `${currency}${Number(amount || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

/**
 * অর্ডারের মোট হিসাব। ক্লায়েন্ট আর সার্ভার একই ফাংশন ব্যবহার করে,
 * তাই চেকআউটে দেখানো টোটাল আর ইনভয়েসের টোটাল কখনো আলাদা হয় না।
 *
 * exclusive — মেনুর দামের উপরে যোগ হয়:
 *     সার্ভিস চার্জ = (সাবটোটাল − ডিসকাউন্ট) × SC%
 *     ভ্যাট        = (সাবটোটাল − ডিসকাউন্ট + সার্ভিস চার্জ) × VAT%
 *     টোটাল        = ঐ সব + ডেলিভারি ফি
 *
 * inclusive — মেনুর দামেই ভ্যাট ধরা আছে:
 *     টোটাল  = সাবটোটাল − ডিসকাউন্ট + সার্ভিস চার্জ + ডেলিভারি ফি
 *     ভ্যাট   = ঐ দামের ভেতরে যতটুকু ভ্যাট আছে (শুধু ইনভয়েসে দেখানোর জন্য,
 *              কাস্টমারের কাছ থেকে বাড়তি কিছু নেওয়া হয় না)
 */
export function calcOrderPricing(
  input: {
    subtotal: number;
    orderType: PricingOrderType;
    discount?: number;
  },
  settings: IRestaurantSettings = DEFAULT_SETTINGS,
): OrderPricing {
  const subtotal = money(Math.max(0, input.subtotal));
  const discount = money(Math.min(subtotal, Math.max(0, input.discount || 0)));
  const taxable = money(subtotal - discount);

  const delivery_fee =
    input.orderType === "delivery" && subtotal < settings.free_delivery_above
      ? money(settings.delivery_fee)
      : 0;

  // সার্ভিস চার্জ সাধারণত টেবিলে বসে খেলেই নেওয়া হয় — সেটিংস থেকেই ঠিক হয়
  const chargesService =
    settings.service_charge_percent > 0 &&
    (!settings.service_charge_dine_in_only || input.orderType === "dine_in");

  const service_charge = chargesService
    ? money((taxable * settings.service_charge_percent) / 100)
    : 0;

  const gross = money(taxable + service_charge);

  let vat: number;
  let total: number;

  if (settings.tax_mode === "inclusive") {
    // দামের ভেতরে থাকা ভ্যাটের অংশটা বের করি — যোগ করি না
    vat = money(gross - gross / (1 + settings.vat_percent / 100));
    total = money(gross + delivery_fee);
  } else {
    vat = money((gross * settings.vat_percent) / 100);
    total = money(gross + vat + delivery_fee);
  }

  return {
    subtotal,
    discount,
    service_charge,
    vat,
    delivery_fee,
    total,
    vat_percent: settings.vat_percent,
    service_charge_percent: chargesService ? settings.service_charge_percent : 0,
    tax_mode: settings.tax_mode,
  };
}
