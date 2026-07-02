import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../lib/cn.js";

export type FieldProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export function Field({ children, className, ...props }: FieldProps) {
  return (
    <div className={cn("cmd-field", className)} {...props}>
      {children}
    </div>
  );
}

export function FieldHint({ children, className, ...props }: FieldProps) {
  return (
    <p className={cn("cmd-field__hint", className)} {...props}>
      {children}
    </p>
  );
}
