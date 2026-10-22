import { useEffect, useRef } from "react";
import type { QrSettings } from "@/lib/card-types";

type QRInstance = {
  append: (el: HTMLElement) => void;
  update: (o: object) => void;
  download: (o: { name: string; extension: "png" | "svg" }) => Promise<void>;
};

function buildOptions(data: string, s: QrSettings, size: number) {
  return {
    width: size,
    height: size,
    type: "canvas",
    data,
    margin: 8,
    image: s.logo || undefined,
    qrOptions: { errorCorrectionLevel: "H" },
    dotsOptions: { color: s.fg, type: s.dotsType },
    backgroundOptions: { color: s.bg },
    cornersSquareOptions: { color: s.cornerColor, type: s.cornerType },
    cornersDotOptions: { color: s.cornerColor, type: s.cornerType === "square" ? "square" : "dot" },
    imageOptions: { crossOrigin: "anonymous", margin: 4, imageSize: s.logoSize, hideBackgroundDots: true },
  };
}

export function StyledQR({
  data,
  settings,
  size = 240,
  onReady,
  className,
}: {
  data: string;
  settings: QrSettings;
  size?: number;
  onReady?: (qr: QRInstance) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRInstance | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (cancelled || !ref.current) return;
      if (!qrRef.current) {
        const qr = new QRCodeStyling(buildOptions(data, settings, size) as never) as unknown as QRInstance;
        ref.current.innerHTML = "";
        qr.append(ref.current);
        qrRef.current = qr;
        onReady?.(qr);
      } else {
        qrRef.current.update(buildOptions(data, settings, size));
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, settings, size]);

  return <div ref={ref} className={className} style={{ width: size, height: size }} />;
}

export type { QRInstance };
