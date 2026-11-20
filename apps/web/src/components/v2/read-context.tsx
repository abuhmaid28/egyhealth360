import type { ComponentPropsWithoutRef } from "react";
import styles from "./read-context.module.css";

/** Display only: callers own permitted content, labels and navigation. */
export function ReadContextCard({
  as: Element = "section",
  className = "",
  ...props
}: ComponentPropsWithoutRef<"section"> & { as?: "section" | "header" }) {
  return (
    <Element
      {...props}
      className={`${styles.card} ${className}`}
      data-read-context
    />
  );
}

/** A static text label, never a live announcement or an authority decision. */
export function ReadStatusLabel({
  className = "",
  ...props
}: ComponentPropsWithoutRef<"span">) {
  return <span {...props} className={`${styles.status} ${className}`} />;
}
