import { NextRequest } from "next/server";

import { ContactMessageService } from "../services/contactMessage.service";
import { ok } from "../lib/sendResponse";
import { NotFound } from "../lib/apiError";
import {
  assertObjectId,
  catchAsync,
  parseBody,
  splitQuery,
} from "../lib/apiHandler";
import { requireRole, MANAGER_UP, ANY_STAFF } from "../middlewares/requireAuth";
import { getClientIp } from "../lib/getClientIp";
import { limitByIp, RATE_RULES } from "../lib/rateLimit";
import {
  createContactMessageSchema,
  updateContactMessageSchema,
} from "../validations/contactMessage.schema";
import { bulkDeleteSchema } from "../validations/bulkDelete.schema";
import type { ContactTopic } from "../interfaces/contactMessage.interface";

/* ==========================================================================
   POST /api/v1/contact
   --------------------------------------------------------------------------
   পাবলিক — যে কেউ পাঠাতে পারে, লগ-ইন লাগে না। স্প্যাম ঠেকাতে দুটো
   ব্যবস্থা: ফর্মের অদৃশ্য honeypot মাঠ (স্কিমায়) আর আইপি ধরে এক
   মিনিটের থ্রটল (সার্ভিসে)।
   ========================================================================== */
const createMessage = catchAsync(async (req: NextRequest) => {
  // honeypot আর এক মিনিটের থ্রটল আগে থেকেই আছে; এটা তার উপরে
  // ঘণ্টার হিসাব, তাই ধীর গতির স্প্যাম বটও ইনবক্স ভরাতে পারে না
  await limitByIp(
    RATE_RULES.contact,
    req,
    "You have already sent us a few messages. Please give us a little time to reply.",
  );

  const body = await parseBody(req, createContactMessageSchema);

  await ContactMessageService.create({
    name: body.name,
    email: body.email,
    phone: body.phone || "",
    topic: body.topic as ContactTopic,
    subject: body.subject || "",
    message: body.message,
    ip: getClientIp(req),
  });

  // বার্তার আইডি বা কোনো তথ্য ফেরত পাঠাই না — পাঠানোর পর অতিথির
  // সেটা লাগে না, আর কম তথ্য বাইরে গেলে অপব্যবহারের সুযোগও কম
  return ok("Thank you — your message has reached us. We will get back soon.");
});

/** GET /api/v1/contact — ড্যাশবোর্ড ইনবক্স, লগ-ইন করা কর্মীর জন্য */
const getMessages = catchAsync(async (req: NextRequest) => {
  requireRole(req, ANY_STAFF);

  const { filters, pagination } = splitQuery(req, [
    "status",
    "topic",
    "searchTerm",
  ]);

  const result = await ContactMessageService.getAll(filters, pagination);

  return ok("Messages fetched successfully", result.data, {
    ...result.meta,
    // ইনবক্সের ব্যাজে কতগুলো এখনো পড়া হয়নি
    totalAmount: result.unread,
  });
});

/** PATCH /api/v1/contact/[id] — পড়া / আর্কাইভ করা */
const updateMessageStatus = catchAsync<{ params: Promise<{ id: string }> }>(
  async (req, ctx) => {
    const staff = requireRole(req, MANAGER_UP);
    const { id } = await ctx.params;
    assertObjectId(id, "message id");

    const { status } = await parseBody(req, updateContactMessageSchema);

    const updated = await ContactMessageService.updateStatus(
      id,
      status,
      staff.name || staff.email || "",
    );
    if (!updated) throw NotFound("That message is no longer here");

    return ok("Message updated", updated);
  },
);

/** DELETE /api/v1/contact/[id] — স্থায়ীভাবে মুছে ফেলা */
const deleteMessage = catchAsync<{ params: Promise<{ id: string }> }>(
  async (req, ctx) => {
    requireRole(req, MANAGER_UP);
    const { id } = await ctx.params;
    assertObjectId(id, "message id");

    const deleted = await ContactMessageService.remove(id);
    if (!deleted) throw NotFound("That message is no longer here");

    return ok("Message deleted");
  },
);

/* ==========================================================================
   POST /api/v1/contact/bulk-delete   { "ids": ["...", "..."] }
   --------------------------------------------------------------------------
   ইনবক্সে চেকবক্স দিয়ে বাছা বার্তাগুলো একসাথে মুছে ফেলা। স্প্যাম
   সাধারণত থোকায় থোকায় আসে, তাই একটা একটা করে মোছার চেয়ে এটাই
   বাস্তব। অনুমতি একটা বার্তা মোছার মতোই — ম্যানেজার বা তার উপরে।
   ========================================================================== */
const bulkDeleteMessages = catchAsync(async (req: NextRequest) => {
  requireRole(req, MANAGER_UP);

  const { ids } = await parseBody(req, bulkDeleteSchema);
  const result = await ContactMessageService.removeMany(ids);

  return ok(
    result.deleted
      ? `${result.deleted} message${result.deleted === 1 ? "" : "s"} deleted`
      : "None of those messages are here any more",
    result,
  );
});

export const ContactMessageController = {
  createMessage,
  getMessages,
  updateMessageStatus,
  deleteMessage,
  bulkDeleteMessages,
};
