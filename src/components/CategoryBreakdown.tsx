"use client";

import { formatCurrency } from "@/lib/constants";

type Transaction = {
  type: string; amount: number; category: string;
  fromAccount?: { currency: string } | null;
  toAccount?: { currency: string } | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "#f97316",
  "Bills & Utilities": "#6366f1",
  "Transport": "#3b82f6",
  "Shopping": "#ec4899",
  "Health": "#ef4444",
  "Education": "#8b5cf6",
  "Ministry": "#14b8a6",
  "Salary": "#22c55e",
  "Business Income": "#10b981",
  "Rent": "#f59e0b",
  "Loan Payment": "#dc2626",
  "Credit Card Payment": "#7c3aed",
  "Bank Transfer": "#64748b",
  "International Transfer": "#0ea5e9",
  "Fee": "#94a3b8",
  "Other": "#a8a29e",
};

function colorFor(cat: string) {
  return CATEGORY_COLORS[cat] ?? "#D97757";
}

export function CategoryBreakdown({ transactions }: { transactions: Transaction[] }) {
  const expenses = transactions.filter((t) => t.type === "EXPENSE");
  const income = transactions.filter((t) => t.type === "INCOME");

  function groupByCat(txns: Transaction[]) {
    const map: Record<string, { usd: number; inr: number }> = {};
    for (const t of txns) {
      const cur = t.fromAccount?.currency ?? t.toAccount?.currency ?? "USD";
      if (!map[t.category]) map[t.category] = { usd: 0, inr: 0 };
      if (cur === "USD") map[t.category].usd += t.amount;
      else map[t.category].inr += t.amount;
    }
    return Object.entries(map)
      .sort((a, b) => (b[1].usd + b[1].inr / 84) - (a[1].usd + a[1].inr / 84));
  }

  const expenseGroups = groupByCat(expenses);
  const incomeGroups = groupByCat(income);

  if (expenseGroups.length === 0 && incomeGroups.length === 0) return null;

  return (
    <div className="space-y-3">
      {expenseGroups.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-red-500 uppercase tracking-widest mb-2">Expenses by Category</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {expenseGroups.map(([cat, totals]) => (
              <div key={cat} className="shrink-0 rounded-xl border border-[#EDE8DF] bg-[#FAF9F6] px-3 py-2 min-w-[120px]">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorFor(cat) }} />
                  <p className="text-[10px] text-[#9B9088] truncate max-w-[90px]">{cat}</p>
                </div>
                {totals.usd > 0 && <p className="text-sm font-bold text-[#1A1815]">{formatCurrency(totals.usd, "USD")}</p>}
                {totals.inr > 0 && <p className="text-sm font-bold text-[#1A1815]">{formatCurrency(totals.inr, "INR")}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {incomeGroups.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest mb-2">Income by Category</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {incomeGroups.map(([cat, totals]) => (
              <div key={cat} className="shrink-0 rounded-xl border border-emerald-100 bg-[#F0FDF4] px-3 py-2 min-w-[120px]">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorFor(cat) }} />
                  <p className="text-[10px] text-[#9B9088] truncate max-w-[90px]">{cat}</p>
                </div>
                {totals.usd > 0 && <p className="text-sm font-bold text-emerald-700">{formatCurrency(totals.usd, "USD")}</p>}
                {totals.inr > 0 && <p className="text-sm font-bold text-emerald-700">{formatCurrency(totals.inr, "INR")}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
