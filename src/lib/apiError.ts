import { IGenericErrorMassage } from "../utils/GlobalError";

/**
 * অ্যাপ্লিকেশন-লেভেল এরর। সার্ভিস/কন্ট্রোলার থেকে throw করলে
 * `handleApiError` একে সঠিক HTTP স্ট্যাটাস সহ রেসপন্সে রূপান্তর করে।
 */
export class ApiError extends Error {
  statusCode: number;
  errorMessages: IGenericErrorMassage[];

  constructor(
    statusCode: number,
    message: string,
    errorMessages: IGenericErrorMassage[] = [],
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorMessages = errorMessages;
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

export const TooManyRequests = (message = "Too many requests") =>
  new ApiError(429, message);
