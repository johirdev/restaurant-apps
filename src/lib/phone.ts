/**
 * বাংলাদেশি মোবাইল নম্বর একটাই চেহারায় আনে — 01XXXXXXXXX।
 * কাস্টমার +8801…, 8801…, ০১… যেভাবেই লিখুক, ডাটাবেসে একই রকম জমা হয়,
 * তাই পরে ট্র্যাক করার সময় নম্বর মিলতে সমস্যা হয় না।
 */
export function normalizeBdPhone(input: string): string {
  const digits = String(input || "")
    // বাংলা অঙ্ক থাকলে ইংরেজিতে বদলে নিই
    .replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))
    .replace(/\D/g, "");

  if (digits.startsWith("880")) return `0${digits.slice(3)}`;
  if (digits.startsWith("88")) return digits.slice(2);
  if (digits.length === 10 && digits.startsWith("1")) return `0${digits}`;
  return digits;
}

/** একই নম্বরের যত রকম লেখা হতে পারে — পুরোনো অর্ডারও যেন খুঁজে পাওয়া যায় */
export function phoneVariants(input: string): string[] {
  const local = normalizeBdPhone(input);
  const raw = String(input || "").trim();
  const bare = local.replace(/^0/, "");
  return [...new Set([raw, local, `88${local}`, `+88${local}`, bare])].filter(Boolean);
}
