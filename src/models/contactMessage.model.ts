import mongoose, { Schema, Model } from "mongoose";
import {
  CONTACT_TOPICS,
  type IContactMessageDocument,
} from "../interfaces/contactMessage.interface";

/* ==========================================================================
   CONTACT MESSAGE — /contact ফর্মের বার্তা
   ========================================================================== */
const contactMessageSchema = new Schema<IContactMessageDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    phone: { type: String, default: "", trim: true, maxlength: 40 },

    topic: { type: String, enum: CONTACT_TOPICS, default: "general", index: true },
    subject: { type: String, default: "", trim: true, maxlength: 140 },
    // স্কিমার সীমা ৫০০ শব্দ; অক্ষরের এই ছাদটা তার সাথে মিলিয়ে রাখা
    message: { type: String, required: true, trim: true, maxlength: 4000 },

    status: {
      type: String,
      enum: ["new", "read", "archived"],
      default: "new",
      index: true,
    },
    handled_by: { type: String, default: "", trim: true },
    ip: { type: String, default: "" },
  },
  { timestamps: true },
);

// ইনবক্স সবসময় নতুন বার্তা আগে দেখায়, তাই এই ক্রমেই ইনডেক্স
contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ status: 1, createdAt: -1 });

/**
 * একই ঠিকানা থেকে বারবার একই বার্তা আসা ঠেকাতে সার্ভিস লেয়ার শেষ
 * বার্তার সময় দেখে — সেই খোঁজাটা যেন দ্রুত হয়।
 */
contactMessageSchema.index({ ip: 1, createdAt: -1 });

const ContactMessageModel: Model<IContactMessageDocument> =
  (mongoose.models.ContactMessage as Model<IContactMessageDocument>) ||
  mongoose.model<IContactMessageDocument>("ContactMessage", contactMessageSchema);

export default ContactMessageModel;
