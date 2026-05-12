import { NextResponse } from "next/server";

export type ApiErrorBody = {
  error: string;
  code: string;
  detail?: string;
};

export function jsonError(status: number, code: string, message: string, detail?: string) {
  const body: ApiErrorBody = { error: message, code };
  if (detail) body.detail = detail;
  return NextResponse.json(body, { status });
}
