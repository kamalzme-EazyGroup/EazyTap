import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { siteSettingsQuery } from "@/lib/site.functions";
import logo from "@/assets/eazytap-logo.png";

export function Logo() {
  const { data: settings } = useQuery(siteSettingsQuery);
  return (
    <Link to="/" className="flex items-center gap-2">
      <img
        src={settings?.logo_url ?? logo}
        alt={`${settings?.site_name ?? "EazyTap"} logo`}
        width={32}
        height={32}
        className="h-8 w-8 rounded-lg object-contain"
      />
      <span className="font-brand text-xl font-semibold tracking-tight">
        {settings?.site_name ?? "EazyTap"}
      </span>
    </Link>
  );
}
