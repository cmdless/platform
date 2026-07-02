import type { LabelHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../lib/cn.js";

export type LabelProps = PropsWithChildren<LabelHTMLAttributes<HTMLLabelElement>>;

export function Label({ children, className, ...props }: LabelProps) {
  return (
    <label className={cn("cmd-label", className)} {...props}>
      {children}
    </label>
  );
}
