import { NextResponse } from "next/server";

type ResponseData<T> = {
  statusCode: number;
  success: boolean;
  message: string;
  data?: T;
};

export function sendResponse<T>(payload: ResponseData<T>) {
  return NextResponse.json(
    {
      success: payload.success,
      message: payload.message,
      data: payload.data,
    },
    { status: payload.statusCode },
  );
}
