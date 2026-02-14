import { NextResponse } from "next/server";

const NO_CACHE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
};

export function jsonError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status, headers: NO_CACHE_HEADERS });
}

export function jsonSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status, headers: NO_CACHE_HEADERS });
}
