export type LeadRow = {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  answers: Record<string, string>;
  created_at: string;
};

function csvCell(value: string) {
  const v = value ?? "";
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function leadsToCsv(leads: LeadRow[], customLabels: string[]) {
  const header = ["Date", "Name", "Email", "Phone", "Company", "Message", ...customLabels];
  const lines = leads.map((l) =>
    [
      new Date(l.created_at).toISOString(),
      l.name,
      l.email,
      l.phone,
      l.company,
      l.message,
      ...customLabels.map((label) => l.answers?.[label] ?? ""),
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.map(csvCell).join(","), ...lines].join("\r\n");
}
