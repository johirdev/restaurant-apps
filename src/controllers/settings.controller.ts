import { NextRequest } from "next/server";
import { SettingsService } from "../services/settings.service";
import { ok } from "../lib/sendResponse";
import { catchAsync, parseBody } from "../lib/apiHandler";
import { requireRole, MANAGER_UP } from "../middlewares/requireAuth";
import { updateSettingsSchema } from "../validations/settings.schema";
import { verifyTokenAndRole } from "../middlewares/adminRoleAccess.middlewares";
import { ANY_STAFF } from "../middlewares/requireAuth";

/* ==========================================================================
   GET /api/v1/settings
   --------------------------------------------------------------------------
   কাস্টমার সাইট পাবলিক অংশটুকু পায় (ভ্যাট %, ডেলিভারি ফি, দোকানের নাম…),
   আর লগ-ইন করা কর্মী পুরোটাই পায় — একই URL, দুই রকম উত্তর।
   ========================================================================== */
const getSettings = catchAsync(async (req: NextRequest) => {
  const staff = verifyTokenAndRole(req, ANY_STAFF as unknown as string[]);

  const data = staff.success
    ? await SettingsService.getFresh()
    : await SettingsService.getPublic();

  return ok("Settings fetched successfully", data);
});

/** PATCH /api/v1/settings — শুধু ম্যানেজার/অ্যাডমিন বদলাতে পারে */
const updateSettings = catchAsync(async (req: NextRequest) => {
  requireRole(req, MANAGER_UP);
  const payload = await parseBody(req, updateSettingsSchema);
  const settings = await SettingsService.update(payload);
  return ok("Settings saved successfully", settings);
});

export const SettingsController = { getSettings, updateSettings };
