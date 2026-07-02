import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../lib/cn.js";

export type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: "primary" | "secondary" | "ghost";
  }
>;

export function Button({
  children,
  className,
  tone = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn("cmd-button", `cmd-button--${tone}`, className)}
      {...props}
    >
      {children}
    </button>
  );
}
