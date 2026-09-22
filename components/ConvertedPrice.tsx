"use client";

import { useCallback, useEffect, useState } from "react";

import { formatMoney } from "@/lib/format";
import { isErrorEnvelope, type RateResponse } from "@/lib/rates";

type Status =
  | { kind: "loading" }
  | { kind: "success"; rate: RateResponse }
  | { kind: "error"; message: string };

async function readRate(target: string): Promise<Status> {
  try {
    const response = await fetch(`/api/rates?to=${target}`);
    const payload: unknown = await response.json();

    if (!response.ok || isErrorEnvelope(payload)) {
      return {
        kind: "error",
        message: isErrorEnvelope(payload)
          ? payload.error.message
          : "The currency service is unavailable.",
      };
    }

    return { kind: "success", rate: payload as RateResponse };
  } catch {
    return { kind: "error", message: "The currency service could not be reached." };
  }
}

/**
 * Reads our own `/api/rates` handler — the external call itself happens
 * server-side, inside that route. Degrades to EUR-only when no rate is
 * available, so the price is never missing.
 */
export function ConvertedPrice({
  priceEur,
  target,
  className = "detail__converted",
}: {
  priceEur: number;
  target: string;
  /** The cart reuses this for its subtotal, where the item-detail class is wrong. */
  className?: string;
}) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    void readRate(target).then((next) => {
      if (active) setStatus(next);
    });
    return () => {
      active = false;
    };
  }, [target]);

  const retry = useCallback(() => {
    setStatus({ kind: "loading" });
    void readRate(target).then(setStatus);
  }, [target]);

  if (status.kind === "loading") {
    return (
      <p className={className} aria-live="polite">
        <span className="skeleton skeleton--line" style={{ width: "9rem", display: "inline-block" }} />
      </p>
    );
  }

  if (status.kind === "error") {
    return (
      <p className={className} role="status">
        <span>Priced in EUR only — {status.message}</span>{" "}
        <button type="button" className="button button--quiet" onClick={retry}>
          Retry
        </button>
      </p>
    );
  }

  return (
    <p className={className}>
      About {formatMoney(priceEur * status.rate.rate, status.rate.target)} at today&rsquo;s rate.
    </p>
  );
}
