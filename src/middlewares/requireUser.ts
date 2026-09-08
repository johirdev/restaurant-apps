import { NextRequest } from "next/server";
import { verifyToken, USER_COOKIE as USER_COOKIE_NAME } from "../lib/tokens";
import { ApiError } from "../lib/apiError";
import UserModel from "../models/user.model";
import { IUserTokenPayload } from "../interfaces/user.interfaces";

/** কাস্টমারের টোকেন এই কুকিতে থাকে (httpOnly — জাভাস্ক্রিপ্ট পড়তে পারে না) */
export const USER_COOKIE = USER_COOKIE_NAME;

/* ==========================================================================
   কাস্টমারের সেশন যাচাই
   --------------------------------------------------------------------------
   দুই ধাপ, দুটোই দরকার:

     ১. JWT — সইটা ঠিক আছে কিনা, মেয়াদ আছে কিনা, `aud` মিলছে কিনা।
              এটুকু ডাটাবেস ছাড়াই হয়ে যায়।

     ২. অ্যাকাউন্টটা — টোকেন সই হওয়ার পরে অ্যাকাউন্টে কিছু বদলে গেছে
              কিনা। এখানে একটাই ছোট (`_id` ইনডেক্সে) কোয়েরি লাগে, আর
              সেটা ছাড়া দুটো ফাঁক থেকে যায়:

              • পাসওয়ার্ড রিসেট করার পরেও চুরি যাওয়া পুরোনো টোকেন
                ৩০ দিন পর্যন্ত চলত। এখন রিসেটে `token_version` বাড়ে,
                তাই পুরোনো টোকেনের `tv` আর মেলে না — সব যন্ত্রের সেশন
                সাথে সাথেই অচল।
              • অ্যাডমিন কাউকে ব্লক করলেও তার হাতে থাকা টোকেন চলতেই
                থাকত। এখন ব্লক করা মাত্রই থেমে যায়।

   `catchAsync` প্রতিটা রুটের আগে `connectDB()` ডেকে রাখে, তাই এখানে
   আলাদা করে কানেকশন নিয়ে ভাবতে হয় না।
   ========================================================================== */

/**
 * অ্যাডমিনের টোকেন আলাদা কুকিতে (`access_token`) থাকে, তাই একই ব্রাউজারে
 * একজন অ্যাডমিন আর একজন কাস্টমার একসাথে লগইন থাকলেও কেউ কারো জায়গায় ঢুকে পড়ে না।
 */
function readToken(req: NextRequest): string | undefined {
  return (
    req.cookies.get(USER_COOKIE)?.value ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    undefined
  );
}

/** JWT টুকু — ডাটাবেস ছোঁয়া হয় না */
function decode(req: NextRequest): IUserTokenPayload | null {
  const token = readToken(req);
  if (!token) return null;

  const decoded = verifyToken(token, "customer");
  if (decoded?.role !== "user") return null;
  return decoded as unknown as IUserTokenPayload;
}

type SessionCheck =
  | { ok: true; auth: IUserTokenPayload }
  | { ok: false; reason: "gone" | "blocked" | "stale" };

/** অ্যাকাউন্টটা এখনো এই টোকেনকে চেনে কিনা */
async function checkAccount(auth: IUserTokenPayload): Promise<SessionCheck> {
  const account = await UserModel.findById(auth.id)
    .select("status token_version")
    .lean();

  if (!account) return { ok: false, reason: "gone" };
  if (account.status === "blocked") return { ok: false, reason: "blocked" };

  // পুরোনো টোকেনে `tv` নেই আর পুরোনো ডকুমেন্টে `token_version` নেই —
  // দুদিকেই অনুপস্থিত মানে ০, তাই আগের সেশনগুলো এমনিতেই বৈধ থাকে
  if ((auth.tv ?? 0) !== (account.token_version ?? 0)) {
    return { ok: false, reason: "stale" };
  }

  return { ok: true, auth };
}

/** টোকেন না থাকলে/ভুল হলে null — গেস্টও যেসব রুট ব্যবহার করতে পারে সেগুলোর জন্য */
export async function optionalUser(
  req: NextRequest,
): Promise<IUserTokenPayload | null> {
  const auth = decode(req);
  if (!auth) return null;

  const checked = await checkAccount(auth);
  return checked.ok ? checked.auth : null;
}

/** লগইন বাধ্যতামূলক — না থাকলে সরাসরি 401 */
export async function requireUser(req: NextRequest): Promise<IUserTokenPayload> {
  const token = readToken(req);
  if (!token) throw new ApiError(401, "Please log in to continue");

  const decoded = verifyToken(token, "customer");
  if (!decoded) {
    throw new ApiError(401, "Your session has expired. Please log in again.");
  }
  if (decoded.role !== "user") {
    throw new ApiError(403, "This area is for customer accounts only");
  }

  const checked = await checkAccount(decoded as unknown as IUserTokenPayload);
  if (checked.ok) return checked.auth;

  if (checked.reason === "blocked") {
    throw new ApiError(403, "This account has been blocked. Please contact support.");
  }
  // "stale" মানে পাসওয়ার্ড বদলেছে — নতুনটা দিয়ে আবার লগইন করলেই হবে
  throw new ApiError(
    401,
    checked.reason === "stale"
      ? "Your password was changed. Please log in again."
      : "Your session has expired. Please log in again.",
  );
}

/** লগইন/লগআউটে ব্যবহার হওয়া কুকির অপশন */
export const userCookie = (token: string, maxAgeDays = 30) => {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${USER_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax;${secure} Max-Age=${
    maxAgeDays * 24 * 60 * 60
  }`;
};

export const clearUserCookie = () =>
  `${USER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
