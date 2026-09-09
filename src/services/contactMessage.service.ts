import ContactMessageModel from "../models/contactMessage.model";
import { HelperPagination } from "../lib/paginationHelper";
import { TooManyRequests } from "../lib/apiError";
import type {
  ContactStatus,
  ContactTopic,
  IContactMessage,
} from "../interfaces/contactMessage.interface";

/* ==========================================================================
   CONTACT MESSAGES
   --------------------------------------------------------------------------
   অতিথি পাঠায় (পাবলিক), ম্যানেজার পড়ে (স্টাফ-only)।
   ========================================================================== */

/**
 * একই আইপি থেকে পরপর বার্তা পাঠানোর মাঝে অন্তত এতটা সময় থাকতে হবে।
 * ক্যাপচা বসানোর চেয়ে এটা অতিথির জন্য অনেক কম বিরক্তিকর, অথচ একটা
 * স্ক্রিপ্টকে ইনবক্স ভরিয়ে ফেলা থেকে ঠেকায়।
 */
const THROTTLE_MS = 60_000;

const create = async (payload: Omit<IContactMessage, "status">) => {
  if (payload.ip && payload.ip !== "0.0.0.0") {
    const since = new Date(Date.now() - THROTTLE_MS);
    const recent = await ContactMessageModel.exists({
      ip: payload.ip,
      createdAt: { $gte: since },
    });

    if (recent) {
      throw TooManyRequests(
        "Thanks — we already have your message. Give us a minute before sending another.",
      );
    }
  }

  return ContactMessageModel.create({ ...payload, status: "new" });
};

/** ড্যাশবোর্ড ইনবক্স — অবস্থা/বিষয় ধরে ছাঁকা যায়, নতুনগুলো আগে */
const getAll = async (
  filters: { status?: string; topic?: string; searchTerm?: string },
  paginationOption: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  },
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    HelperPagination.calculationPagination(paginationOption);

  const where: Record<string, unknown> = {};

  if (filters.status) where.status = filters.status;
  if (filters.topic) where.topic = filters.topic;

  if (filters.searchTerm) {
    // নাম, ইমেইল আর বার্তা — তিনটেতেই খোঁজা হয়, তাই "01712" দিয়েও পাওয়া যায়
    const rx = new RegExp(filters.searchTerm.trim(), "i");
    where.$or = [{ name: rx }, { email: rx }, { phone: rx }, { message: rx }];
  }

  const [data, total, unread] = await Promise.all([
    ContactMessageModel.find(where)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    ContactMessageModel.countDocuments(where),
    // সাইডবারের ব্যাজে কতগুলো নতুন — ছাঁকনি যাই হোক, এই সংখ্যাটা সবসময় মোট
    ContactMessageModel.countDocuments({ status: "new" }),
  ]);

  return { meta: { page, limit, total }, data, unread };
};

const updateStatus = async (
  id: string,
  status: ContactStatus,
  handledBy: string,
) =>
  ContactMessageModel.findByIdAndUpdate(
    id,
    { $set: { status, handled_by: handledBy } },
    { new: true },
  ).lean();

const remove = async (id: string) =>
  ContactMessageModel.findByIdAndDelete(id).lean();

/**
 * ইনবক্সে চেকবক্স দিয়ে বেছে নেওয়া বার্তাগুলো একসাথে মোছা।
 *
 * একটা একটা করে DELETE ডাকলে ২০টা বার্তা মুছতে ২০টা রাউন্ড-ট্রিপ আর
 * ২০টা DB কানেকশন লাগত; এখানে সেটা একটাই `deleteMany`।
 *
 * ইতিমধ্যে মুছে যাওয়া আইডি থাকলে কাজ থামে না — বাকিগুলো মুছে যায়, আর
 * `deleted` সংখ্যাটা সত্যি কতগুলো গেল সেটাই বলে (ট্যাব খোলা রেখে দুজন
 * ম্যানেজার একসাথে কাজ করলে এটাই স্বাভাবিক)।
 */
const removeMany = async (ids: string[]) => {
  const res = await ContactMessageModel.deleteMany({ _id: { $in: ids } });
  const deleted = res.deletedCount ?? 0;

  return { requested: ids.length, deleted, missing: ids.length - deleted };
};

export const ContactMessageService = {
  create,
  getAll,
  updateStatus,
  remove,
  removeMany,
};

export type { ContactTopic };
