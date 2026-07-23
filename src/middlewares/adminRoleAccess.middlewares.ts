/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export function verifyTokenAndRole(
  req: NextRequest,
  allowedRoles: string[],
): { success: boolean; message: string; user?: any } {
  const token =
    req.cookies.get("token")?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return { success: false, message: "Unauthorized: No token" };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (!allowedRoles.includes(decoded.role)) {
      return { success: false, message: "Forbidden: Insufficient role" };
    }

    return { success: true, message: "OK", user: decoded };
  } catch {
    return { success: false, message: "Unauthorized: Invalid token" };
  }
}
