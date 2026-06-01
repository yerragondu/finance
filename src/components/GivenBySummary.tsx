"use client";

import { formatCurrency } from "@/lib/constants";
import { UserCircle2 } from "lucide-react";

type Transaction = {
  type: string;
  amount: number;
  givenBy?: string | null;
  fromAccount?: { currency: string } | null;
  toAccount?: { currency: string } | null;
};

export function GivenBySummary({ transactions }: { transactions: Transaction[] }) {
  const relevant = transactions.filter(
    (t) => t.type === "INCOME" && t.givenBy?.trim()
  );

  if (relevant.length === 0) return null;

  const map: Record<string, { usd: number; inr: number; count: number }> = {};
  for (const t of relevant) {
    const name = t.givenBy!.trim();
    const currency = t.toAccount?.currency ?? t.fromAccount?.currency ?? "USD";
    if (!map[name]) map[name] = { usd: 0, inr: 0, count: 0 };
    map[name].count += 1;
    if (currency === "INR") map[name].inr += t.amount;
    else map[name].usd += t.amount;
  }

  const entries = Object.entries(map).sort(
    (a, b) => (b[1].usd + b[1].inr / 84) - (a[1].usd + a[1].inr / 84)
  );

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold text-[#D97757] uppercase tracking-widest">
        Given By
      </h2>
      <div className="space-y-1.5">
        {entries.map(([name, totals]) => (
          <div key={name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#F0FDF4] border border-emerald-100">
            <div className="p-1.5 rounded-lg bg-emerald-100">
              <UserCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1A1815] truncate">{name}</p>
              <p className="text-[10px] text-[#9B9088]">
                {totals.count} {totals.count === 1 ? "transaction" : "transactions"}
              </p>
            </div>
            <div className="text-right shrink-0">
              {totals.usd > 0 && <p className="text-sm font-bold text-emerald-700">{formatCurrency(totals.usd, "USD")}</p>}
              {totals.inr > 0 && <p className="text-sm font-bold text-emerald-700">{formatCurrency(totals.inr, "INR")}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
