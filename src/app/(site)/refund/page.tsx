import type { Metadata } from "next";
import { notFound } from "next/navigation";

import LegalPageView from "../../components/Clients/Legal/LegalPageView";
import {
  buildLegalMetadata,
  loadLegalPage,
} from "../../components/Clients/Legal/loadLegalPage";

/**
 * রিফান্ড নীতি — লেখাটা ড্যাশবোর্ড থেকে আসে (`legal_pages` কালেকশন)।
 * পাতাটা খসড়া অবস্থায় থাকলে সাইটে ৪০৪ দেখায়, প্রকাশিত হলে দেখা যায়।
 */

// ম্যানেজার সেভ করার সাথে সাথেই নতুন লেখা দেখা দরকার, তাই ক্যাশ নয়।
// (সার্ভিস লেয়ারে ৬০ সেকেন্ডের ছোট ক্যাশ আছে — DB প্রতি ভিজিটে ডাকা হয় না।)
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildLegalMetadata("refund");
}

export default async function RefundPolicyPage() {
  const page = await loadLegalPage("refund");
  if (!page) notFound();

  return <LegalPageView page={page} />;
}
