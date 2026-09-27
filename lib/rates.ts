/**
 * Shared contract for the rates route, used by the handler and its callers.
 * The error envelope it returns is house-wide and lives in `lib/errors.ts`.
 */

export type RateResponse = {
  base: "EUR";
  target: string;
  rate: number;
  /** ISO `YYYY-MM-DD`. Render only through `formatDate`. */
  fetchedOn: string;
};
