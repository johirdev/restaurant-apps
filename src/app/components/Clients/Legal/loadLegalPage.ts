import type { Metadata } from "next";

import { connectDB } from "@/src/config/db";
import { LegalService } from "@/src/services/legal.service";
import { htmlToText } from "@/src/lib/sanitizeHtml";
import {
  LEGAL_PAGE_LABEL,
  LEGAL_PAGE_PATH,
  type ILegalPage,
  type LegalSlug,
} from "@/src/interfaces/legal.interface";

/* ==========================================================================
   আইনি পাতা সার্ভারে তুলে আনা
   --------------------------------------------------------------------------
   /privacy, /terms, /refund — তিনটেই সার্ভার কম্পোনেন্ট, তাই লেখাটা
   সরাসরি সার্ভিস লেয়ার থেকে নেওয়া হয়, নিজের API তে HTTP রিকোয়েস্ট করে নয়।
   দুটো লাভ: একটা রাউন্ড-ট্রিপ কম, আর গুগল প্রথম HTML এই পুরো লেখাটা পায়।

   API রুট নিজে `catchAsync` এর ভেতরে DB ধরে নেয়; এখানে সেই মোড়ক নেই,
   তাই connectDB() নিজেদেরই ডাকতে হয়।
   ========================================================================== */

/** পাতাটা প্রকাশিত হলে ফেরত দেয়, নাহলে null — কলার তখন notFound() ডাকে */
export async function loadLegalPage(slug: LegalSlug): Promise<ILegalPage | null> {
  await connectDB();
  return LegalService.getPublicPage(slug);
}

/**
 * তিনটে পাতার metadata একই ছাঁচে তৈরি হয়।
 * SEO ফিল্ড ফাঁকা থাকলে পাতার নিজের শিরোনাম আর ভূমিকার লেখা থেকেই
 * বর্ণনাটা বানিয়ে নেওয়া হয় — ম্যানেজারকে আলাদা করে কিছু লিখতে হয় না।
 */
export async function buildLegalMetadata(slug: LegalSlug): Promise<Metadata> {
  const fallback = LEGAL_PAGE_LABEL[slug].en;

  let page: ILegalPage | null = null;
  try {
    page = await loadLegalPage(slug);
  } catch {
    // ডাটাবেস নাগালে না থাকলেও পাতার একটা নাম থাকা দরকার
  }

  if (!page) return { title: fallback };

  const title = (page.seo?.meta_title?.en || page.title?.en || fallback).trim();
  const description = (
    page.seo?.meta_description?.en ||
    page.subtitle?.en ||
    htmlToText(page.intro?.en || "", 160)
  ).trim();

  return {
    title,
    description,
    alternates: { canonical: LEGAL_PAGE_PATH[slug] },
    openGraph: {
      type: "article",
      title,
      description,
      url: LEGAL_PAGE_PATH[slug],
    },
    // আইনি পাতা গুগলে থাকুক, কিন্তু সার্চ ফলাফলে এগুলোই যেন আগে না আসে
    robots: { index: true, follow: true },
  };
}
