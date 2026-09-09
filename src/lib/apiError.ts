import { IGenericErrorMassage } from "../utils/GlobalError";

/**
 * অ্যাপ্লিকেশন-লেভেল এরর। সার্ভিস/কন্ট্রোলার থেকে throw করলে
 * `handleApiError` একে সঠিক HTTP স্ট্যাটাস সহ রেসপন্সে রূপান্তর করে।
 */
export class ApiError extends Error {
  statusCode: number;
  errorMessages: IGenericErrorMassage[];
  /**
   * এররের সাথে যাওয়া হেডার — যেমন ৪২৯ এর `Retry-After`।
   * ব্রাউজার আর আমাদের নিজেদের UI দুজনেই এটা পড়ে বুঝতে পারে
   * কতক্ষণ পরে আবার চেষ্টা করা যাবে।
   */
  headers?: Record<string, string>;

  constructor(
    statusCode: number,
    message: string,
    errorMessages: IGenericErrorMassage[] = [],
    headers?: Record<string, string>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorMessages = errorMessages;
    this.headers = headers;
    this.name = "ApiError";
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/* ------------------------------------------------------------------ *
 * বহুল ব্যবহৃত এররগুলোর শর্টহ্যান্ড — কন্ট্রোলার পড়তে সহজ হয়
 * ------------------------------------------------------------------ */
export const BadRequest = (message = "Bad request", errors?: IGenericErrorMassage[]) =>
  new ApiError(400, message, errors);

export const Unauthorized = (message = "Unauthorized") => new ApiError(401, message);

export const Forbidden = (message = "Forbidden") => new ApiError(403, message);

export const NotFound = (message = "Resource not found") => new ApiError(404, message);

export const Conflict = (message = "Resource already exists") => new ApiError(409, message);

export const TooManyRequests = (message = "Too many requests", retryAfterSeconds?: number) =>
  new ApiError(
    429,
    message,
    retryAfterSeconds ? [{ path: "rate_limit", message: String(retryAfterSeconds) }] : [],
    retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined,
  );
