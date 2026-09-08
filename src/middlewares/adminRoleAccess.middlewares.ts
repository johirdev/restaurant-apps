/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import {
  verifyToken,
  ADMIN_COOKIE,
  STAFF_COOKIE,
  type TokenAudience,
} from "../lib/tokens";

/* ==========================================================================
   ড্যাশবোর্ডের দরজা — দুই রকম টোকেন, দুটোই এখানে যাচাই হয়
   --------------------------------------------------------------------------
   Admin  → `access_token` কুকি, `aud: "admin"`, অ্যাডমিন চাবিতে সই
   Staff  → `staff_token`  কুকি, `aud: "staff"`, স্টাফ চাবিতে সই

   দুটো আলাদা কুকি হওয়ায় একই ব্রাউজারে মালিক আর ওয়েটার একসাথে লগইন
   থাকলেও কেউ কারোটা মুছে দেয় না। Bearer হেডারে টোকেন এলে দুই রকম
   দর্শকেই মিলিয়ে দেখা হয় — কিন্তু ভুল চাবি/ভুল `aud` হলে কখনোই পাস নয়।
   ========================================================================== */

export type AuthResult = {
  success: boolean;
  message: string;
  user?: any;
  /** টোকেনটা কোন দলের — লগ আর ডিবাগে কাজে লাগে */
  audience?: TokenAudience;
};

function bearer(req: NextRequest): string | undefined {
  return req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || undefined;
}

/**
 * টোকেন + রোল যাচাই।
 * অ্যাডমিন আর স্টাফ — দুই রকম টোকেনই গ্রহণযোগ্য; কার কী করার অনুমতি সেটা
 * `allowedRoles` ঠিক করে দেয়।
 */
export function verifyTokenAndRole(
  req: NextRequest,
  allowedRoles: string[],
): AuthResult {
  const candidates: { token?: string; aud: TokenAudience }[] = [
    { token: req.cookies.get(ADMIN_COOKIE)?.value, aud: "admin" },
    { token: req.cookies.get(STAFF_COOKIE)?.value, aud: "staff" },
    // পুরোনো কোড `token` কুকিও ব্যবহার করত — অ্যাডমিন হিসেবেই দেখি
    { token: req.cookies.get("token")?.value, aud: "admin" },
    { token: bearer(req), aud: "admin" },
    { token: bearer(req), aud: "staff" },
  ];

  let sawToken = false;
  let wrongRole: string | null = null;

  for (const { token, aud } of candidates) {
    if (!token) continue;
    sawToken = true;

    const decoded = verifyToken(token, aud);
    if (!decoded) continue; // ভুল চাবি বা ভুল aud — পরেরটা দেখি

    if (!allowedRoles.includes(decoded.role)) {
      // টোকেন আসল, কিন্তু এই কাজটা এই রোলের নয়
      wrongRole = decoded.role;
      continue;
    }

    return {
      success: true,
      message: "OK",
      user: decoded,
      audience: aud,
    };
  }

  if (wrongRole) {
    return {
      success: false,
      message: `Forbidden: a ${wrongRole} cannot do this`,
    };
  }

  return {
    success: false,
    message: sawToken
      ? "Unauthorized: Invalid token"
      : "Unauthorized: No token",
  };
}
