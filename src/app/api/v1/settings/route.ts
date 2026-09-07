import { NextRequest } from "next/server";
import { SettingsController } from "@/src/controllers/settings.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — পাবলিক অংশ, স্টাফ হলে পুরোটা */
export async function GET(req: NextRequest) {
  return SettingsController.getSettings(req);
}

/** PATCH — ম্যানেজার/অ্যাডমিন দোকানের নিয়ম বদলায় */
export async function PATCH(req: NextRequest) {
  return SettingsController.updateSettings(req);
}
