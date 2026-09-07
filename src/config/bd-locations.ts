/**
 * ==========================================================================
 * বাংলাদেশের বিভাগ ও জেলা — একটাই উৎস
 * প্রোফাইল ফর্মের ড্রপডাউন, ড্যাশবোর্ডের ফিল্টার আর সার্ভারের ভ্যালিডেশন
 * তিন জায়গাতেই এই তালিকাটাই ব্যবহার হয়, তাই বানান কখনো আলাদা হয় না।
 * ==========================================================================
 */

/** বিভাগ → সেই বিভাগের জেলাগুলো (ড্রপডাউনে বিভাগ অনুযায়ী গ্রুপ হয়ে দেখায়) */
export const BD_DIVISIONS = {
  Barishal: ["Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"],
  Chattogram: [
    "Bandarban",
    "Brahmanbaria",
    "Chandpur",
    "Chattogram",
    "Cumilla",
    "Cox's Bazar",
    "Feni",
    "Khagrachhari",
    "Lakshmipur",
    "Noakhali",
    "Rangamati",
  ],
  Dhaka: [
    "Dhaka",
    "Faridpur",
    "Gazipur",
    "Gopalganj",
    "Kishoreganj",
    "Madaripur",
    "Manikganj",
    "Munshiganj",
    "Narayanganj",
    "Narsingdi",
    "Rajbari",
    "Shariatpur",
    "Tangail",
  ],
  Khulna: [
    "Bagerhat",
    "Chuadanga",
    "Jashore",
    "Jhenaidah",
    "Khulna",
    "Kushtia",
    "Magura",
    "Meherpur",
    "Narail",
    "Satkhira",
  ],
  Mymensingh: ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"],
  Rajshahi: [
    "Bogura",
    "Chapainawabganj",
    "Joypurhat",
    "Naogaon",
    "Natore",
    "Pabna",
    "Rajshahi",
    "Sirajganj",
  ],
  Rangpur: [
    "Dinajpur",
    "Gaibandha",
    "Kurigram",
    "Lalmonirhat",
    "Nilphamari",
    "Panchagarh",
    "Rangpur",
    "Thakurgaon",
  ],
  Sylhet: ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"],
} as const;

export type BdDivision = keyof typeof BD_DIVISIONS;

export const BD_DIVISION_NAMES = Object.keys(BD_DIVISIONS) as BdDivision[];

/** ৬৪ জেলার সমতল তালিকা — ভ্যালিডেশনে এটাই মিলিয়ে দেখা হয় */
export const BD_DISTRICTS: string[] = BD_DIVISION_NAMES.flatMap(
  (division) => [...BD_DIVISIONS[division]],
);

/** জেলা → বিভাগ (কেউ শুধু জেলা পাঠালে বিভাগটা আমরা নিজেরাই বসিয়ে নিই) */
export const DISTRICT_TO_DIVISION: Record<string, BdDivision> = Object.fromEntries(
  BD_DIVISION_NAMES.flatMap((division) =>
    BD_DIVISIONS[division].map((district) => [district, division] as const),
  ),
);

export const isValidDistrict = (value?: string): boolean =>
  !!value && Object.prototype.hasOwnProperty.call(DISTRICT_TO_DIVISION, value);
