import type { ReactNode } from "react";

/**
 * Shared presentation for the non-success states: empty, error and loading.
 * Every use supplies guidance — what the reader can do next — not just a label.
 */
export function StateMessage({
  tone,
  title,
  guidance,
  action,
}: {
  tone: "empty" | "error" | "loading";
  title: string;
  guidance: string;
  action?: ReactNode;
}) {
  return (
    <div className={`state state--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <p className="state__title">{title}</p>
      <p className="state__guidance">{guidance}</p>
      {action ? <div className="state__action">{action}</div> : null}
    </div>
  );
}
