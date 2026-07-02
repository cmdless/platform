import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../lib/cn.js";

export type CardProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export function Card({ children, className, ...props }: CardProps) {
  return (
    <section className={cn("cmd-card", className)} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <header className={cn("cmd-card__header", className)} {...props}>
      {children}
    </header>
  );
}

export function CardTitle({ children, className, ...props }: CardProps) {
  return (
    <div className={cn("cmd-card__title", className)} {...props}>
      {children}
    </div>
  );
}

export function CardDescription({ children, className, ...props }: CardProps) {
  return (
    <p className={cn("cmd-card__description", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className, ...props }: CardProps) {
  return (
    <div className={cn("cmd-card__content", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: CardProps) {
  return (
    <footer className={cn("cmd-card__footer", className)} {...props}>
      {children}
    </footer>
  );
}
