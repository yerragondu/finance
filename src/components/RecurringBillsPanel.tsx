"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency, CURRENCIES } from "@/lib/constants";
import { Plus, Trash2, RefreshCw, Calendar } from "lucide-react";

type Account = { id: string; name: string; currency: string };
type Dept = { value: string; label: string };
type RecurringBill = {
  id: string; name: string; amount: number; currency: string;
  department: string; category: string; dayOfMonth: number;
  isActive: boolean; note: string;
  account?: { id: string; name: string; currency: string } | null;
};

type Props = {
  bills: RecurringBill[];
  onUpdated: () => void;
  accounts?: Account[];
  departments?: Dept[];
};

const BILL_CATEGORIES = [
  "Bills & Utilities", "Rent", "Subscription", "Insurance", "Loan Payment",
  "Credit Card Payment", "Education", "Other",
];

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Days until next bill
function daysUntilNext(dayOfMonth: number) {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let targetDate = new Date(currentYear, currentMonth, dayOfMonth);
  if (targetDate <= today) {
    // Next month
    targetDate = new Date(currentYear, currentMonth + 1, dayOfMonth);
  }
  const diff = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function RecurringBillsPanel({ bills, onUpdated, accounts = [], departments = [] }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", amount: "", currency: "USD", department: "SELF",
    category: "Bills & Utilities", accountId: "", dayOfMonth: "1", note: "",
  });

  // Sort by days until next due
  const activeBills = bills.filter((b) => b.isActive)
    .sort((a, b) => daysUntilNext(a.dayOfMonth) - daysUntilNext(b.dayOfMonth));

  const totalUSD = activeBills.filter((b) => b.currency === "USD").reduce((s, b) => s + b.amount, 0);
  const totalINR = activeBills.filter((b) => b.currency === "INR").reduce((s, b) => s + b.amount, 0);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/recurring-bills", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount), dayOfMonth: Number(form.dayOfMonth), accountId: form.accountId || null }),
    });
    setLoading(false); setAddOpen(false);
    setForm({ name: "", amount: "", currency: "USD", department: "SELF", category: "Bills & Utilities", accountId: "", dayOfMonth: "1", note: "" });
    onUpdated();
  }

  async function del(id: string) {
    await fetch(`/api/recurring-bills/${id}`, { method: "DELETE" });
    onUpdated();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold text-[#D97757] uppercase tracking-widest">Recurring Bills</h2>
          {activeBills.length > 0 && (
            <p className="text-[11px] text-[#9B9088] mt-0.5">
              {[totalUSD > 0 && formatCurrency(totalUSD, "USD"), totalINR > 0 && formatCurrency(totalINR, "INR")].filter(Boolean).join(" + ")} / month
            </p>
          )}
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button size="sm" variant="outline" />}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Add Recurring Bill</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="space-y-1">
                <Label>Bill Name *</Label>
                <Input required placeholder="e.g. Netflix, Rent, Electricity" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Amount *</Label>
                  <Input required type="number" step="0.01" min="0" placeholder="0.00"
                    value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={(v) => v && setForm({ ...form, currency: v })}>
                    <SelectTrigger><SelectValue>{form.currency}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Day of Month</Label>
                  <Input type="number" min="1" max="31" placeholder="1-31"
                    value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => v && setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue>{form.category}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {BILL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Account</Label>
                  <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v ?? "" })}>
                    <SelectTrigger><SelectValue placeholder="Optional">{accounts.find((a) => a.id === form.accountId)?.name ?? "None"}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Department</Label>
                  <Select value={form.department} onValueChange={(v) => v && setForm({ ...form, department: v })}>
                    <SelectTrigger><SelectValue>{form.department}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Note</Label>
                <Input placeholder="Details..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving…" : "Add Recurring Bill"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-1.5">
        {activeBills.length === 0 && (
          <div className="py-6 text-center">
            <RefreshCw className="h-7 w-7 text-[#C4B8A8] mx-auto mb-2" />
            <p className="text-sm text-[#9B9088]">No recurring bills set up</p>
          </div>
        )}

        {activeBills.map((b) => {
          const daysLeft = daysUntilNext(b.dayOfMonth);
          const urgent = daysLeft <= 5;
          const soon = daysLeft <= 14;
          return (
            <div key={b.id} className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
              urgent ? "bg-red-50 border-red-100 hover:bg-red-100/60"
                : soon ? "bg-amber-50 border-amber-100 hover:bg-amber-100/60"
                : "bg-[#FAF9F6] border-[#EDE8DF] hover:bg-[#F5F1EA]"
            }`}>
              <div className={`p-1.5 rounded-lg shrink-0 ${urgent ? "bg-red-100" : soon ? "bg-amber-100" : "bg-[#F5F1EA]"}`}>
                <Calendar className={`h-3.5 w-3.5 ${urgent ? "text-red-600" : soon ? "text-amber-600" : "text-[#9B9088]"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-[#1A1815] truncate">{b.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                    urgent ? "bg-red-100 text-red-700 border border-red-200"
                      : soon ? "bg-amber-100 text-amber-700 border border-amber-200"
                      : "bg-[#F5F1EA] text-[#6B6360] border border-[#EDE8DF]"
                  }`}>
                    {daysLeft === 0 ? "Today!" : daysLeft === 1 ? "Tomorrow" : `${daysLeft}d`}
                  </span>
                </div>
                <p className="text-[11px] text-[#9B9088] mt-0.5">
                  {ordinal(b.dayOfMonth)} of each month
                  {b.account ? ` · ${b.account.name}` : ""}
                  {b.note ? ` · ${b.note}` : ""}
                </p>
              </div>
              <p className="text-sm font-bold text-[#1A1815] shrink-0">{formatCurrency(b.amount, b.currency)}</p>
              <Button size="icon-sm" variant="ghost" className="h-6 w-6 text-[#C4B8A8] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => del(b.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
