import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../lib/cn.js";

export type BadgeProps = PropsWithChildren<
  HTMLAttributes<HTMLSpanElement> & {
    tone?: "neutral" | "success" | "warning" | "danger";
  }
>;

export function Badge({
  children,
  className,
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span className={cn("cmd-badge", `cmd-badge--${tone}`, className)} {...props}>
      {children}
    </span>
  );
}
