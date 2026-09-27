/**
 * The house error envelope, shared by every route handler.
 *
 * This lived in `lib/rates.ts` while the rates route was the only handler. It
 * is house-wide rather than particular to that route, and a second handler
 * returning the same shape is what proves it — leaving the checkout handler
 * importing its error type from a module named after an unrelated route would
 * be actively misleading.
 */

export type ErrorCode =
  | "MISSING_CONFIG"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_ERROR"
  | "BAD_REQUEST"
  /**
   * A cart line that is no longer sold, or no longer in stock. Separate from
   * `BAD_REQUEST` because it changes what the interface does rather than only
   * what it says: it can only be fixed on the cart page, so that rejection
   * sends the visitor there. Every other rejection is fixed where they stand.
   */
  | "ITEM_UNAVAILABLE";

export type ErrorEnvelope = {
  error: {
    code: ErrorCode;
    message: string;
  };
};

export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as ErrorEnvelope).error?.code === "string"
  );
}
