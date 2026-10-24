import { describe, expect, it } from "vitest";
import { leadsToCsv } from "@/lib/leads-csv";

describe("leadsToCsv", () => {
  it("includes custom field columns and escapes commas, quotes and newlines", () => {
    const csv = leadsToCsv(
      [
        {
          name: 'Perera, "Kamal"',
          email: "kamal@example.com",
          phone: "+94 77 123 4567",
          company: "EazyTap",
          message: "Line one\nLine two",
          answers: { "How did we meet?": "At a conference, Colombo" },
          created_at: "2026-10-24T09:00:00.000Z",
        },
      ],
      ["How did we meet?"],
    );
    const [header, row] = csv.split("\r\n");
    expect(header).toBe("Date,Name,Email,Phone,Company,Message,How did we meet?");
    expect(row).toContain('"Perera, ""Kamal"""');
    expect(row).toContain('"Line one\nLine two"');
    expect(row).toContain('"At a conference, Colombo"');
    expect(row).toContain("2026-10-24T09:00:00.000Z");
  });

  it("fills missing custom answers with empty cells", () => {
    const csv = leadsToCsv(
      [
        {
          name: "A",
          email: "",
          phone: "",
          company: "",
          message: "",
          answers: {},
          created_at: "2026-10-24T09:00:00.000Z",
        },
      ],
      ["Budget"],
    );
    expect(csv.split("\r\n")[1].endsWith(",")).toBe(true);
  });
});
