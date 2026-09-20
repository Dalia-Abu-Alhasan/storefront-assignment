/** Shared contract for the rates route, used by the handler and its callers. */

export type ErrorCode = "MISSING_CONFIG" | "UPSTREAM_TIMEOUT" | "UPSTREAM_ERROR" | "BAD_REQUEST";

export type ErrorEnvelope = {
  error: {
    code: ErrorCode;
    message: string;
  };
};

export type RateResponse = {
  base: "EUR";
  target: string;
  rate: number;
  /** ISO `YYYY-MM-DD`. Render only through `formatDate`. */
  fetchedOn: string;
};

export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as ErrorEnvelope).error?.code === "string"
  );
}
