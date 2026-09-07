import axios, { AxiosError } from "axios";

/* ==========================================================================
   FRONTEND API CLIENT
   সব রিকোয়েস্ট এখান দিয়ে গেলে — বেস URL, কুকি, টাইমআউট আর এরর মেসেজ
   সব জায়গায় একরকম থাকে।
   ========================================================================== */

export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
  totalAmount?: number;
}

export interface ApiFieldError {
  path: string | number;
  message: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  meta?: ApiMeta;
  data: T;
  errorMessages?: ApiFieldError[];
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
  withCredentials: true,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

/**
 * সার্ভারের এরর খাম থেকে মানুষ-পড়ার মতো মেসেজ বের করে।
 * নেটওয়ার্ক ফেল, টাইমআউট, HTML এরর পেজ — সব ক্ষেত্রেই কাজ করে।
 */
export function getApiErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<Partial<ApiEnvelope<unknown>>>;

    if (axiosErr.code === "ECONNABORTED") return "The request timed out. Please try again.";
    if (!axiosErr.response) return "Cannot reach the server. Check your connection.";

    const body = axiosErr.response.data;
    if (body?.message) return body.message;
    if (body?.errorMessages?.length) return body.errorMessages[0].message;

    if (axiosErr.response.status === 401) return "Please log in to continue.";
    if (axiosErr.response.status === 403) return "You do not have permission to do that.";
    if (axiosErr.response.status === 404) return "Not found.";
  }

  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/** ফিল্ড-লেভেল এরর — react-hook-form এ সরাসরি বসানোর জন্য */
export function getApiFieldErrors(err: unknown): ApiFieldError[] {
  if (axios.isAxiosError(err)) {
    const body = (err as AxiosError<Partial<ApiEnvelope<unknown>>>).response?.data;
    return body?.errorMessages ?? [];
  }
  return [];
}

/* ---------------- ছোট হেল্পার — data সরাসরি ফেরত দেয় ---------------- */
export async function apiGet<T>(url: string, params?: Record<string, unknown>) {
  const res = await api.get<ApiEnvelope<T>>(url, { params });
  return res.data;
}

export async function apiPost<T>(url: string, body?: unknown) {
  const res = await api.post<ApiEnvelope<T>>(url, body);
  return res.data;
}

export async function apiPatch<T>(url: string, body?: unknown) {
  const res = await api.patch<ApiEnvelope<T>>(url, body);
  return res.data;
}

export async function apiDelete<T>(url: string) {
  const res = await api.delete<ApiEnvelope<T>>(url);
  return res.data;
}
