"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/constants";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowUpRight, ArrowDownLeft, X } from "lucide-react";

type Transaction = {
  id: string;
  type: string; amount: number; category: string; note: string; date: string;
  fromAccount?: { currency: string; name: string } | null;
  toAccount?: { currency: string; name: string } | null;
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
  const [selectedCategory, setSelectedCategory] = useState<{ name: string; type: string } | null>(null);

  const expenses = transactions.filter((t) => t.type === "EXPENSE");
  const income = transactions.filter((t) => t.type === "INCOME");

  function groupByCat(txns: Transaction[]) {
    const map: Record<string, { usd: number; inr: number; count: number }> = {};
    for (const t of txns) {
      const cur = t.fromAccount?.currency ?? t.toAccount?.currency ?? "USD";
      if (!map[t.category]) map[t.category] = { usd: 0, inr: 0, count: 0 };
      if (cur === "USD") map[t.category].usd += t.amount;
      else map[t.category].inr += t.amount;
      map[t.category].count += 1;
    }
    return Object.entries(map)
      .sort((a, b) => (b[1].usd + b[1].inr / 84) - (a[1].usd + a[1].inr / 84));
  }

  const expenseGroups = groupByCat(expenses);
  const incomeGroups = groupByCat(income);

  if (expenseGroups.length === 0 && incomeGroups.length === 0) return null;

  // Transactions for selected category dialog
  const dialogTxns = selectedCategory
    ? transactions.filter((t) => t.category === selectedCategory.name && t.type === selectedCategory.type)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  return (
    <>
      <div className="space-y-3">
        {expenseGroups.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-red-500 uppercase tracking-widest mb-2">Expenses by Category</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {expenseGroups.map(([cat, totals]) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory({ name: cat, type: "EXPENSE" })}
                  className="shrink-0 rounded-xl border border-[#EDE8DF] bg-[#FAF9F6] px-3 py-2 min-w-[120px] text-left hover:border-[#D97757] hover:bg-[#FDF4EE] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorFor(cat) }} />
                    <p className="text-[10px] text-[#9B9088] truncate max-w-[90px] group-hover:text-[#D97757]">{cat}</p>
                  </div>
                  {totals.usd > 0 && <p className="text-sm font-bold text-[#1A1815]">{formatCurrency(totals.usd, "USD")}</p>}
                  {totals.inr > 0 && <p className="text-sm font-bold text-[#1A1815]">{formatCurrency(totals.inr, "INR")}</p>}
                  <p className="text-[10px] text-[#C4B8A8] mt-0.5">{totals.count} txn{totals.count !== 1 ? "s" : ""}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {incomeGroups.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest mb-2">Income by Category</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {incomeGroups.map(([cat, totals]) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory({ name: cat, type: "INCOME" })}
                  className="shrink-0 rounded-xl border border-emerald-100 bg-[#F0FDF4] px-3 py-2 min-w-[120px] text-left hover:border-emerald-300 hover:bg-emerald-100/60 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorFor(cat) }} />
                    <p className="text-[10px] text-[#9B9088] truncate max-w-[90px] group-hover:text-emerald-700">{cat}</p>
                  </div>
                  {totals.usd > 0 && <p className="text-sm font-bold text-emerald-700">{formatCurrency(totals.usd, "USD")}</p>}
                  {totals.inr > 0 && <p className="text-sm font-bold text-emerald-700">{formatCurrency(totals.inr, "INR")}</p>}
                  <p className="text-[10px] text-[#C4B8A8] mt-0.5">{totals.count} txn{totals.count !== 1 ? "s" : ""}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Category drill-down dialog */}
      <Dialog open={!!selectedCategory} onOpenChange={(open) => { if (!open) setSelectedCategory(null); }}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedCategory ? colorFor(selectedCategory.name) : "#D97757" }} />
              {selectedCategory?.name}
              <span className={`ml-1 text-xs font-normal px-1.5 py-0.5 rounded-full ${
                selectedCategory?.type === "EXPENSE" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
              }`}>{selectedCategory?.type}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 space-y-0 mt-2">
            {dialogTxns.length === 0 ? (
              <p className="text-sm text-[#9B9088] text-center py-6">No transactions</p>
            ) : (
              dialogTxns.map((t) => {
                const currency = t.fromAccount?.currency ?? t.toAccount?.currency ?? "USD";
                const isExpense = t.type === "EXPENSE";
                return (
                  <div key={t.id} className="flex items-start gap-3 py-2.5 border-b border-[#F5F1EA] last:border-0">
                    <div className={`shrink-0 mt-0.5 p-1.5 rounded-lg ${isExpense ? "bg-red-50" : "bg-emerald-50"}`}>
                      {isExpense
                        ? <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
                        : <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#9B9088]">{format(new Date(t.date), "MMM d, yyyy")}</p>
                      {t.fromAccount && <p className="text-[11px] text-[#9B9088]">{t.fromAccount.name}</p>}
                      {t.toAccount && <p className="text-[11px] text-[#9B9088]">{t.toAccount.name}</p>}
                      {t.note && <p className="text-[11px] text-[#9B9088] italic mt-0.5">"{t.note}"</p>}
                    </div>
                    <p className={`text-sm font-semibold shrink-0 ${isExpense ? "text-red-600" : "text-emerald-600"}`}>
                      {isExpense ? "−" : "+"}{formatCurrency(t.amount, currency)}
                    </p>
                  </div>
                );
              })
            )}
          </div>
          {/* Summary footer */}
          {dialogTxns.length > 0 && (() => {
            const usd = dialogTxns.filter((t) => (t.fromAccount?.currency ?? t.toAccount?.currency ?? "USD") === "USD").reduce((s, t) => s + t.amount, 0);
            const inr = dialogTxns.filter((t) => (t.fromAccount?.currency ?? t.toAccount?.currency) === "INR").reduce((s, t) => s + t.amount, 0);
            return (
              <div className="pt-2 mt-2 border-t border-[#EDE8DF] flex items-center justify-between">
                <p className="text-xs text-[#9B9088]">{dialogTxns.length} transactions</p>
                <div className="text-right">
                  {usd > 0 && <p className="text-sm font-bold text-[#1A1815]">{formatCurrency(usd, "USD")}</p>}
                  {inr > 0 && <p className="text-sm font-bold text-[#1A1815]">{formatCurrency(inr, "INR")}</p>}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
