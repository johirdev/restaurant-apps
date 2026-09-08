import { Document } from "mongoose";

/**
 * ==========================================================================
 * CONTACT MESSAGE — /contact ফর্ম থেকে আসা বার্তা
 * --------------------------------------------------------------------------
 * অতিথি ফর্ম ভরে পাঠায়, ম্যানেজার ড্যাশবোর্ডের ইনবক্সে সেটা পড়ে।
 * ইমেইল পাঠানোর কোনো ব্যবস্থা এখানে নেই — বার্তাটা ডাটাবেসেই জমা থাকে,
 * তাই SMTP সেট করা না থাকলেও কোনো বার্তা হারায় না।
 * ==========================================================================
 */

/** বার্তাটা কী নিয়ে — ইনবক্সে ছেঁকে দেখার জন্য */
export type ContactTopic =
  | "general"
  | "reservation"
  | "catering"
  | "feedback"
  | "complaint";

export const CONTACT_TOPICS: ContactTopic[] = [
  "general",
  "reservation",
  "catering",
  "feedback",
  "complaint",
];

/** ইনবক্সে প্রতিটা বার্তার তিনটে অবস্থা — এর বেশি দরকার হয়নি */
export type ContactStatus = "new" | "read" | "archived";

export interface IContactMessage {
  name: string;
  email: string;
  phone: string;
  topic: ContactTopic;
  subject: string;
  message: string;
  status: ContactStatus;
  /** কোন কর্মী শেষবার অবস্থা বদলেছে — জবাবদিহির জন্য */
  handled_by?: string;
  /** স্প্যামের ঢল এলে কোথা থেকে আসছে বোঝার জন্য */
  ip?: string;
}

export interface IContactMessageDocument extends IContactMessage, Document {
  createdAt: Date;
  updatedAt: Date;
}

/** ইনবক্সে দেখানোর নাম — ইংরেজিতে, বাকি ড্যাশবোর্ডের মতোই */
export const CONTACT_TOPIC_LABEL: Record<ContactTopic, string> = {
  general: "General question",
  reservation: "Table booking",
  catering: "Catering / bulk order",
  feedback: "Feedback",
  complaint: "Complaint",
};
