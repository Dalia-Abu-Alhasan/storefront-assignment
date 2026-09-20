import { NextResponse } from "next/server";

import type { ErrorCode, ErrorEnvelope, RateResponse } from "@/lib/rates";

const UPSTREAM_TIMEOUT_MS = 5_000;
const CACHE_SECONDS = 3_600;
const CURRENCY_CODE = /^[A-Z]{3}$/;

function errorResponse(code: ErrorCode, message: string, status: number) {
  const body: ErrorEnvelope = { error: { code, message } };
  return NextResponse.json(body, { status });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const target = (new URL(request.url).searchParams.get("to") ?? "USD").toUpperCase();

  if (!CURRENCY_CODE.test(target)) {
    return errorResponse("BAD_REQUEST", "Target currency must be a three-letter ISO code.", 400);
  }

  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) {
    return errorResponse(
      "MISSING_CONFIG",
      "Currency conversion is not configured on this deployment.",
      503,
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/EUR`, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      next: { revalidate: CACHE_SECONDS },
    });
  } catch (cause) {
    const timedOut = cause instanceof DOMException && cause.name === "TimeoutError";
    return timedOut
      ? errorResponse("UPSTREAM_TIMEOUT", "The currency service did not respond in time.", 504)
      : errorResponse("UPSTREAM_ERROR", "The currency service could not be reached.", 502);
  }

  if (!upstream.ok) {
    return errorResponse("UPSTREAM_ERROR", "The currency service returned an error.", 502);
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch {
    return errorResponse("UPSTREAM_ERROR", "The currency service returned an unreadable response.", 502);
  }

  const rates = (payload as { conversion_rates?: Record<string, unknown> })?.conversion_rates;
  const rate = rates?.[target];

  if (typeof rate !== "number" || !Number.isFinite(rate)) {
    return errorResponse("UPSTREAM_ERROR", `No conversion rate is available for ${target}.`, 502);
  }

  const body: RateResponse = { base: "EUR", target, rate, fetchedOn: today() };
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": `s-maxage=${CACHE_SECONDS}, stale-while-revalidate` },
  });
}
