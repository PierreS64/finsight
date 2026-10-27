function minorUnits(value: string): bigint | null {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return null;
  const amount = BigInt(match[2]) * 100n + BigInt((match[3] || "").padEnd(2, "0") || "0");
  return match[1] ? -amount : amount;
}

export function sumBalances(values: string[]): string {
  const total = values.reduce((sum, value) => sum + (minorUnits(value) ?? 0n), 0n);
  const sign = total < 0n ? "-" : "";
  const absolute = total < 0n ? -total : total;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}

export function formatVnd(value: string): string {
  const amount = minorUnits(value);
  if (amount === null) return `${value} VND`;
  const sign = amount < 0n ? "-" : "";
  const absolute = amount < 0n ? -amount : amount;
  const integer = String(absolute / 100n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const cents = absolute % 100n;
  return `${sign}${integer}${cents ? `,${String(cents).padStart(2, "0").replace(/0$/, "")}` : ""} ₫`;
}
