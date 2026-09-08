import {
  WEEKDAYS,
  type IOpeningHour,
  type ISocialLinks,
  type SocialPlatform,
} from "../interfaces/settings.interface";

/* ==========================================================================
   দোকানের তথ্য — দেখানোর উপযোগী করে সাজানো
   --------------------------------------------------------------------------
   সেটিংসে যা আছে সেটা কাঁচা: "23:00", একটা হোয়াটসঅ্যাপ নম্বর, ফাঁকা
   সোশ্যাল ফিল্ড। ফুটার, About আর Contact — তিন জায়গাতেই সেই একই জিনিস
   সাজিয়ে দেখাতে হয়, তাই সাজানোর নিয়মগুলো এখানে একবারই লেখা।

   ফাইলটা ইচ্ছে করেই ফ্রেমওয়ার্ক-নিরপেক্ষ (কোনো "use client"/React নেই),
   তাই সার্ভার কম্পোনেন্ট আর ক্লায়েন্ট কম্পোনেন্ট দুজনেই ডাকতে পারে।
   ========================================================================== */

/* ------------------------------------------------------------------ */
/* ফোন ও হোয়াটসঅ্যাপ                                                  */
/* ------------------------------------------------------------------ */

/** `tel:` লিংকে ফাঁকা জায়গা, ড্যাশ বা বন্ধনী থাকতে পারে না */
export const telHref = (phone: string): string =>
  `tel:${(phone || "").replace(/[^\d+]/g, "")}`;

/**
 * wa.me আন্তর্জাতিক ফরম্যাট চায়, কিন্তু ম্যানেজার সাধারণত "01712345678"
 * লিখে রাখে। তাই ০ দিয়ে শুরু ১১ সংখ্যার বাংলাদেশি নম্বরটা নিজে থেকেই
 * 880 বসিয়ে ঠিক করে নিই; অন্য দেশের নম্বর হলে যেমন আছে তেমনই যায়।
 */
export const whatsappHref = (value: string): string => {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return "";

  const international =
    digits.length === 11 && digits.startsWith("0")
      ? `880${digits.slice(1)}`
      : digits;

  return `https://wa.me/${international}`;
};

/* ------------------------------------------------------------------ */
/* সোশ্যাল লিংক                                                        */
/* ------------------------------------------------------------------ */

export interface SocialLink {
  platform: SocialPlatform;
  label: string;
  href: string;
}

const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  x: "X",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
};

/**
 * সেটিংসে যেগুলো ভরা আছে শুধু সেগুলোই ফেরত আসে — তাই দোকান যে দুটো
 * প্ল্যাটফর্ম চালায়, সাইটে ঠিক সেই দুটো আইকনই ওঠে, মরা লিংক নয়।
 * ক্রমটা সবখানে এক রাখতে SOCIAL_LABELS এর ধারা মেনেই সাজানো হয়।
 */
export const socialLinks = (socials?: Partial<ISocialLinks>): SocialLink[] => {
  if (!socials) return [];

  return (Object.keys(SOCIAL_LABELS) as SocialPlatform[])
    .map((platform) => {
      const raw = (socials[platform] || "").trim();
      if (!raw) return null;

      const href = platform === "whatsapp" ? whatsappHref(raw) : raw;
      if (!href) return null;

      return { platform, label: SOCIAL_LABELS[platform], href };
    })
    .filter((link): link is SocialLink => link !== null);
};

/* ------------------------------------------------------------------ */
/* খোলার সময়                                                          */
/* ------------------------------------------------------------------ */

/** "23:00" → "11:00 pm" (তালিকায় ১২-ঘণ্টা পড়তে সহজ) */
export const formatTime = (value: string): string => {
  const [rawHour, rawMinute] = (value || "").split(":");
  const hour = Number(rawHour);
  const minute = rawMinute ?? "00";

  if (Number.isNaN(hour)) return value || "";

  const suffix = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return `${hour12}:${minute} ${suffix}`;
};

export interface OpeningRow {
  /** 0 = রবিবার … 6 = শনিবার */
  day: number;
  short: string;
  long: string;
  closed: boolean;
  /** "10:00 am – 11:00 pm", বন্ধ থাকলে ফাঁকা */
  range: string;
}

/**
 * সাতটা সারি সোমবার থেকে শুরু করে সাজানো।
 *
 * ডাটাবেসে `day` রাখা হয় `Date#getDay()` এর নিয়মে (0 = রবিবার), কারণ
 * "আজ কোন সারি" মেলানোটা তাতেই সহজ। কিন্তু সপ্তাহ দেখানোর সময় সোমবার
 * দিয়ে শুরু করাই স্বাভাবিক — তাই দেখানোর ক্রমটা এখানে বদলে দেওয়া হয়,
 * ডাটার ক্রম নয়।
 */
export const openingRows = (hours?: IOpeningHour[]): OpeningRow[] => {
  const source = hours?.length ? hours : [];
  const mondayFirst = [1, 2, 3, 4, 5, 6, 0];

  return mondayFirst
    .map((day): OpeningRow | null => {
      const row = source.find((entry) => entry.day === day);
      if (!row) return null;

      return {
        day,
        short: WEEKDAYS[day].short,
        long: WEEKDAYS[day].long,
        closed: row.closed,
        range: row.closed
          ? ""
          : `${formatTime(row.open)} – ${formatTime(row.close)}`,
      };
    })
    .filter((row): row is OpeningRow => row !== null);
};

export interface OpenState {
  open: boolean;
  /** ব্যাজে যা লেখা থাকবে — "Open until 11:00 pm" / "Closed today" */
  label: string;
}

/**
 * এখন দোকান খোলা কিনা।
 *
 * `now` বাইরে থেকে নিতে হয় — সার্ভারে render করার সময় ঘড়ি দেখলে
 * সার্ভার আর ব্রাউজারের HTML আলাদা হয়ে hydration ভেঙে যেত। তাই যে
 * কম্পোনেন্ট এটা ডাকে, সে মাউন্টের পরে নিজের ঘড়ি পাঠায়।
 *
 * মাঝরাত পেরোনো সময়ও (14:00 → 00:30) ঠিকমতো ধরা পড়ে — সেক্ষেত্রে
 * বন্ধের সময়টা পরের দিনে গিয়ে পড়ে।
 */
export const openStateAt = (
  hours: IOpeningHour[] | undefined,
  now: Date,
): OpenState => {
  const rows = hours?.length ? hours : [];
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  const toMinutes = (value: string) => {
    const [h, m] = (value || "").split(":").map(Number);
    return Number.isNaN(h) ? null : h * 60 + (m || 0);
  };

  /** একটা সারির ভেতরে এখনকার সময়টা পড়ে কিনা */
  const covers = (row: IOpeningHour | undefined, minutes: number) => {
    if (!row || row.closed) return null;

    const open = toMinutes(row.open);
    const close = toMinutes(row.close);
    if (open === null || close === null) return null;

    // রাত পেরিয়ে যাওয়া সময় — বন্ধের ঘড়ি খোলার ঘড়ির চেয়ে ছোট
    const overnight = close <= open;
    const inside = overnight
      ? minutes >= open || minutes < close
      : minutes >= open && minutes < close;

    return inside ? row : null;
  };

  /**
   * গতকালের সময়সীমা মাঝরাত পেরিয়ে আজও চলছে কিনা।
   *
   * শুধু মাঝরাত-পেরোনো সারিই (বন্ধের ঘড়ি খোলার ঘড়ির চেয়ে ছোট) আজকের
   * ভোরে গড়াতে পারে, আর সেটাও কেবল বন্ধের সময়টুকু পর্যন্ত। এটা আলাদা
   * করে না দেখলে "কাল রাত ১২:৩০ পর্যন্ত খোলা" সারিটা আজ সন্ধ্যা ৭টাতেও
   * দোকান খোলা বলে দেখাত।
   */
  const spillsIntoToday = (row: IOpeningHour | undefined, minutes: number) => {
    if (!row || row.closed) return null;

    const open = toMinutes(row.open);
    const close = toMinutes(row.close);
    if (open === null || close === null || close > open) return null;

    return minutes < close ? row : null;
  };

  const today = rows.find((row) => row.day === now.getDay());
  const openNow = covers(today, minutesNow);

  if (openNow) {
    return { open: true, label: `Open until ${formatTime(openNow.close)}` };
  }

  // গতকাল রাতের সময়টা এখনো চলতে পারে (যেমন কাল রাত ২টা পর্যন্ত খোলা)
  const yesterday = rows.find((row) => row.day === (now.getDay() + 6) % 7);
  const stillOpen = spillsIntoToday(yesterday, minutesNow);
  if (stillOpen) {
    return { open: true, label: `Open until ${formatTime(stillOpen.close)}` };
  }

  // আজ পরে খুলবে কিনা — খুললে কখন সেটা বলাই বেশি কাজের
  if (today && !today.closed) {
    const open = toMinutes(today.open);
    if (open !== null && minutesNow < open) {
      return { open: false, label: `Opens at ${formatTime(today.open)}` };
    }
  }

  return { open: false, label: today?.closed ? "Closed today" : "Closed now" };
};

/* ------------------------------------------------------------------ */
/* ম্যাপ                                                               */
/* ------------------------------------------------------------------ */

/**
 * "Get directions" এর লিংক।
 * ম্যানেজার আলাদা করে কিছু না দিলে ঠিকানাটা দিয়েই গুগল ম্যাপ সার্চ
 * বানিয়ে দিই — বেশিরভাগ ক্ষেত্রে সেটাই যথেষ্ট।
 */
export const directionsHref = (mapLink: string, address: string): string => {
  if (mapLink?.trim()) return mapLink.trim();
  if (!address?.trim()) return "";

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address.trim(),
  )}`;
};

/** গল্পের লেখা অনুচ্ছেদে ভাগ করা — খালি লাইনই সীমানা */
export const toParagraphs = (text: string): string[] =>
  (text || "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
