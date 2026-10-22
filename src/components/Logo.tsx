import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-gold font-display text-lg font-bold text-primary-foreground">
        T
      </span>
      <span className="font-display text-xl tracking-tight">Tapcard</span>
    </Link>
  );
}
