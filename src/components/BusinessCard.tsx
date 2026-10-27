import { StyledQR } from "@/components/StyledQR";
import { useMemo } from "react";
import { DEFAULT_QR, type QrSettings } from "@/lib/card-types";
import type { TemplateDesign } from "@/lib/template-types";
import { cn } from "@/lib/utils";

export function BusinessCard({ design, qrSettings = DEFAULT_QR, onQrRendered }: {
  design: TemplateDesign;
  qrSettings?: QrSettings;
  onQrRendered?: () => void;
}) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const templateQr = useMemo(() => ({ ...qrSettings, bg: DEFAULT_QR.bg }), [qrSettings]);
  return (
    <div
      data-card-theme={design.theme}
      data-card-font={design.font}
      className={cn("business-card", `business-card-${design.layout}`)}
    >
      <div className="business-card-identity">
        {design.avatar && (
          <img src={design.avatar} alt="Portrait" className="business-card-avatar" />
        )}
        <h2 className="business-card-name">{design.fullName || "Your name"}</h2>
        {design.title && <p className="business-card-title">{design.title}</p>}
        {design.company && <p className="business-card-company">{design.company}</p>}
        {design.companyAddress && <p className="business-card-address">{design.companyAddress}</p>}
        <div className="business-card-contact">
          {[design.phone, design.email, design.website].filter(Boolean).map((v, i) => (
            <p key={i}>{v}</p>
          ))}
        </div>
        {design.tagline && <p className="business-card-tagline">{design.tagline}</p>}
      </div>
      <div className="business-card-details">
        {design.cardSlug && (
          <div className="business-card-qr">
            <StyledQR
              data={`${origin}/c/${design.cardSlug}`}
              settings={templateQr}
              size={160}
              margin={2}
              onRendered={onQrRendered}
            />
          </div>
        )}
      </div>
    </div>
  );
}
