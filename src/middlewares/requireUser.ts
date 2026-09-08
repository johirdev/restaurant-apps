import { NextRequest } from "next/server";
import { verifyToken, USER_COOKIE as USER_COOKIE_NAME } from "../lib/tokens";
import { ApiError } from "../lib/apiError";
import { IUserTokenPayload } from "../interfaces/user.interfaces";

/** কাস্টমারের টোকেন এই কুকিতে থাকে (httpOnly — জাভাস্ক্রিপ্ট পড়তে পারে না) */
export const USER_COOKIE = USER_COOKIE_NAME;

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

/** টোকেন না থাকলে/ভুল হলে null — গেস্টও যেসব রুট ব্যবহার করতে পারে সেগুলোর জন্য */
export function optionalUser(req: NextRequest): IUserTokenPayload | null {
  const token = readToken(req);
  if (!token) return null;

  const decoded = verifyToken(token, "customer");
  if (decoded?.role !== "user") return null;
  return decoded as unknown as IUserTokenPayload;
}

/** লগইন বাধ্যতামূলক — না থাকলে সরাসরি 401 */
export function requireUser(req: NextRequest): IUserTokenPayload {
  const token = readToken(req);
  if (!token) throw new ApiError(401, "Please log in to continue");

  const decoded = verifyToken(token, "customer");
  if (!decoded) {
    throw new ApiError(401, "Your session has expired. Please log in again.");
  }
  if (decoded.role !== "user") {
    throw new ApiError(403, "This area is for customer accounts only");
  }
  return decoded as unknown as IUserTokenPayload;
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
