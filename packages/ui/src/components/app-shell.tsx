import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../lib/cn.js";

export type AppShellProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export function AppShell({ children, className, ...props }: AppShellProps) {
  return (
    <div className={cn("cmd-app-shell", className)} {...props}>
      {children}
    </div>
  );
}

export function AppHeader({ children, className, ...props }: AppShellProps) {
  return (
    <header className={cn("cmd-app-header", className)} {...props}>
      {children}
    </header>
  );
}

export function AppSection({ children, className, ...props }: AppShellProps) {
  return (
    <section className={cn("cmd-app-section", className)} {...props}>
      {children}
    </section>
  );
}
