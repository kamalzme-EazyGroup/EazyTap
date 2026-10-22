import { Link } from "@tanstack/react-router";
import logo from "@/assets/eazytap-logo.png";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <img src={logo} alt="EazyTap logo" width={32} height={32} className="h-8 w-8" />
      <span className="font-brand text-xl font-semibold tracking-tight">EazyTap</span>
    </Link>
  );
}
