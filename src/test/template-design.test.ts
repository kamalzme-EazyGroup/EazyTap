import { describe, expect, it } from "vitest";
import { linkedQrSettings, templateDesignSchema } from "@/lib/template-types";
import { DEFAULT_QR } from "@/lib/card-types";

describe("Template company details", () => {
  it("preserves the company address when a saved design is reopened", () => {
    const saved = templateDesignSchema.parse({ company: "EazyTap", companyAddress: "12 Lake Road, Colombo" });
    expect(templateDesignSchema.parse(JSON.parse(JSON.stringify(saved))).companyAddress).toBe("12 Lake Road, Colombo");
  });
  it("opens older templates without an address", () => {
    expect(templateDesignSchema.parse({ fullName: "Kamal Sam" }).companyAddress).toBe("");
  });
});

describe("Linked template QR", () => {
  it("uses the linked profile's customized colours, shapes and logo", () => {
    const settings = { ...DEFAULT_QR, fg: "#123456", bg: "#f0f8ff", cornerColor: "#228855", dotsType: "dots" as const, cornerType: "dot" as const, logo: "data:image/png;base64,logo", logoSize: 0.4 };
    expect(linkedQrSettings(settings)).toEqual(settings);
  });
  it("fills defaults only for settings missing on older profiles", () => {
    expect(linkedQrSettings({ cornerColor: "#228855" })).toEqual({ ...DEFAULT_QR, cornerColor: "#228855" });
  });
});