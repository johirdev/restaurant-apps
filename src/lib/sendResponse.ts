import { NextResponse } from "next/server";
import { IGenericErrorMassage } from "../utils/GlobalError";

/**
 * পুরো API এর একটাই রেসপন্স খাম (envelope)।
 * ফ্রন্টএন্ড সবসময় একই শেপ পায় — success / message / meta / data / errorMessages
 */
export type ResponseMeta = {
  page: number;
  limit: number;
  total: number;
  totalPage?: number;
  totalAmount?: number;
};

type ResponseData<T> = {
  statusCode: number;
  success: boolean;
  message: string;
  meta?: ResponseMeta;
  data?: T;
  /** ফিল্ড-লেভেল ভ্যালিডেশন এরর — ফর্মে সরাসরি বসানোর জন্য */
  errorMessages?: IGenericErrorMassage[];
  /** অতিরিক্ত রেসপন্স হেডার (যেমন Set-Cookie) */
  headers?: Record<string, string>;
};

export function sendResponse<T>(payload: ResponseData<T>) {
  const body: Record<string, unknown> = {
    success: payload.success,
    message: payload.message,
  };

  // meta থাকলে totalPage অটো হিসাব হয়ে যাবে — প্রতিটা কন্ট্রোলারে আলাদা করে লিখতে হবে না
  if (payload.meta) {
    const { page, limit, total, totalPage, totalAmount } = payload.meta;
    body.meta = {
      page,
      limit,
      total,
      totalPage: totalPage ?? (limit > 0 ? Math.ceil(total / limit) : 0),
      ...(totalAmount !== undefined ? { totalAmount } : {}),
    };
  }

  if (payload.data !== undefined) body.data = payload.data;
  if (payload.errorMessages?.length) body.errorMessages = payload.errorMessages;

  return NextResponse.json(body, {
    status: payload.statusCode,
    headers: payload.headers,
  });
}

/** সফল রেসপন্সের শর্টহ্যান্ড */
export const ok = <T>(
  message: string,
  data?: T,
  meta?: ResponseMeta,
  statusCode = 200,
) => sendResponse<T>({ statusCode, success: true, message, data, meta });

/** নতুন রিসোর্স তৈরির শর্টহ্যান্ড */
export const created = <T>(message: string, data?: T) =>
  sendResponse<T>({ statusCode: 201, success: true, message, data });
