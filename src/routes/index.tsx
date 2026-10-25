import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Mail, MapPin, Megaphone, Palette, Phone, QrCode, Smartphone, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardView } from "@/components/CardView";
import { StyledQR } from "@/components/StyledQR";
import { Logo } from "@/components/Logo";
import demoAvatar from "@/assets/demo-avatar.jpg";
import { DEFAULT_QR, type CardData } from "@/lib/card-types";
import { useSession } from "@/hooks/use-session";
import { siteSettingsQuery } from "@/lib/site.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EazyTap — Your digital business card, one scan away" },
      { name: "description", content: "Design premium digital business cards with branded QR codes. One scan saves your details straight to their phone." },
      { property: "og:title", content: "EazyTap — Your digital business card, one scan away" },
      { property: "og:description", content: "Design premium digital business cards with branded QR codes." },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: Index,
});

const DEMO: CardData = {
  slug: "demo",
  label: "Demo",
  full_name: "Kamal Sam",
  job_title: "Creative Director",
  company: "EazyTap",
  bio: "Brand strategist crafting identities for hospitality and luxury brands.",
  phone: "+94 77 123 4567",
  email: "kamal@lumen.studio",
  website: "lumen.studio",
  address: null,
  avatar_url: demoAvatar,
  cover_url: null,
  socials: { linkedin: "linkedin.com", instagram: "instagram.com", whatsapp: "+94771234567" },
  custom_fields: [],
  theme: "royal",
  font: "classic",
  qr_settings: DEFAULT_QR,
  collect_contacts: false,
  collect_fields: [],
};

function Index() {
  const { session } = useSession();
  const { data: settings } = useQuery(siteSettingsQuery);
  const cta = session ? "/dashboard" : "/auth";
  const contact = settings?.contact;
  const hasContact = !!(contact && (contact.email || contact.phone || contact.address));
  return (
    <div className="min-h-screen overflow-hidden bg-aurora grain">
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <Button asChild variant="glass" size="sm">
          <Link to={cta}>{session ? "My cards" : "Sign in"}</Link>
        </Button>
      </header>

      {settings?.announcement.enabled && settings.announcement.text && (
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div className="flex items-center justify-center gap-2 rounded-full glass px-5 py-2.5 text-sm">
            <Megaphone className="h-4 w-4 shrink-0 text-primary" />
            <span>{settings.announcement.text}</span>
            {settings.announcement.link && (
              <a
                href={/^https?:\/\//i.test(settings.announcement.link) ? settings.announcement.link : `https://${settings.announcement.link}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 font-medium text-primary hover:underline"
              >
                Learn more
              </a>
            )}
          </div>
        </div>
      )}

      <main className="relative z-10 mx-auto grid max-w-6xl items-center gap-16 px-6 pb-24 pt-10 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> The last business card you'll need
          </span>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.05] md:text-7xl">
            One scan.
            <br />
            <span className="text-gradient-gold italic">Saved forever.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Build stunning digital profiles, share them with a branded QR code, and let anyone save your
            details to their phone in a single tap.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="hero" size="lg" className="h-12 px-7">
              <Link to={cta}>
                Create your card <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="mt-12 grid max-w-md grid-cols-2 gap-4 text-sm">
            {[
              { icon: QrCode, t: "Custom QR with your logo" },
              { icon: Palette, t: "7 premium colour themes" },
              { icon: UserPlus, t: "Save-to-contacts in one tap" },
              { icon: Smartphone, t: "Unlimited profiles" },
            ].map((f) => (
              <div key={f.t} className="flex items-center gap-3 text-muted-foreground">
                <f.icon className="h-4 w-4 text-primary" /> {f.t}
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="animate-float">
            <CardView card={DEMO} compact />
          </div>
          <div className="absolute -bottom-10 -left-14 hidden rotate-[-8deg] rounded-3xl bg-card p-3 shadow-float md:block">
            <StyledQR data="https://tapcard.app" settings={DEMO.qr_settings} size={130} />
          </div>
        </div>
      </main>

      {hasContact && (
        <section className="relative z-10 border-t border-border/50">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <h2 className="text-2xl">Get in touch</h2>
            <div className="mt-6 flex flex-wrap gap-4">
              {contact!.email && (
                <a href={`mailto:${contact!.email}`} className="flex items-center gap-3 rounded-2xl glass px-5 py-4 text-sm transition hover:opacity-80">
                  <Mail className="h-4 w-4 text-primary" /> {contact!.email}
                </a>
              )}
              {contact!.phone && (
                <a href={`tel:${contact!.phone}`} className="flex items-center gap-3 rounded-2xl glass px-5 py-4 text-sm transition hover:opacity-80">
                  <Phone className="h-4 w-4 text-primary" /> {contact!.phone}
                </a>
              )}
              {contact!.address && (
                <span className="flex items-center gap-3 rounded-2xl glass px-5 py-4 text-sm">
                  <MapPin className="h-4 w-4 text-primary" /> {contact!.address}
                </span>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
