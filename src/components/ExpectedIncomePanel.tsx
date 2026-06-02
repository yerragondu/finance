"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency, CURRENCIES } from "@/lib/constants";
import { format, differenceInDays } from "date-fns";
import { Plus, Check, Trash2, TrendingUp } from "lucide-react";

type Account = { id: string; name: string; currency: string };
type Dept = { value: string; label: string };
type ExpectedIncome = {
  id: string; name: string; amount: number; currency: string;
  department: string; category: string; expectedDate: string;
  isReceived: boolean; note: string;
  account?: { id: string; name: string; currency: string } | null;
};

type Props = {
  items: ExpectedIncome[];
  onUpdated: () => void;
  accounts?: Account[];
  departments?: Dept[];
};

const INCOME_CATEGORIES = ["Salary", "Business Income", "Freelance", "Investment", "Rental", "Ministry", "Other"];

export function ExpectedIncomePanel({ items, onUpdated, accounts = [], departments = [] }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", amount: "", currency: "USD", department: "SELF",
    category: "Salary", accountId: "", expectedDate: "", note: "",
  });

  // Show only next 30 days
  const today = new Date();
  const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
  const upcoming = items.filter((i) => !i.isReceived && new Date(i.expectedDate) <= in30)
    .sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());

  const totalUSD = upcoming.filter((i) => i.currency === "USD").reduce((s, i) => s + i.amount, 0);
  const totalINR = upcoming.filter((i) => i.currency === "INR").reduce((s, i) => s + i.amount, 0);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/expected-income", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount), accountId: form.accountId || null }),
    });
    setLoading(false); setAddOpen(false);
    setForm({ name: "", amount: "", currency: "USD", department: "SELF", category: "Salary", accountId: "", expectedDate: "", note: "" });
    onUpdated();
  }

  async function markReceived(id: string) {
    await fetch(`/api/expected-income/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isReceived: true }),
    });
    onUpdated();
  }

  async function del(id: string) {
    await fetch(`/api/expected-income/${id}`, { method: "DELETE" });
    onUpdated();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold text-[#D97757] uppercase tracking-widest">Expected Income</h2>
          {upcoming.length > 0 && (
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {[totalUSD > 0 && formatCurrency(totalUSD, "USD"), totalINR > 0 && formatCurrency(totalINR, "INR")].filter(Boolean).join(" + ")} in 30 days
            </p>
          )}
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button size="sm" variant="outline" />}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Expected Income</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input required placeholder="e.g. June Salary, Client Payment" value={form.name}
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
                  <Label>Expected Date *</Label>
                  <Input required type="date" value={form.expectedDate}
                    onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => v && setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue>{form.category}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {INCOME_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Account (goes to)</Label>
                  <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v ?? "" })}>
                    <SelectTrigger><SelectValue placeholder="Optional">{accounts.find((a) => a.id === form.accountId)?.name ?? "None"}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>)}
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
                {loading ? "Saving…" : "Add Expected Income"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-1.5">
        {upcoming.length === 0 && (
          <div className="py-6 text-center">
            <TrendingUp className="h-7 w-7 text-[#C4B8A8] mx-auto mb-2" />
            <p className="text-sm text-[#9B9088]">No expected income in next 30 days</p>
          </div>
        )}

        {upcoming.map((item) => {
          const days = differenceInDays(new Date(item.expectedDate), new Date());
          const overdue = days < 0;
          const today = days === 0;
          return (
            <div key={item.id} className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
              overdue ? "bg-red-50 border-red-100" : today ? "bg-emerald-50 border-emerald-200" : "bg-[#F0FDF4] border-emerald-100 hover:bg-emerald-100/60"
            }`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold text-[#1A1815]">{item.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    overdue ? "bg-red-100 text-red-700 border border-red-200"
                      : today ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-[#F5F1EA] text-[#6B6360] border border-[#EDE8DF]"
                  }`}>
                    {overdue ? `${Math.abs(days)}d overdue` : today ? "Today" : `in ${days}d`}
                  </span>
                </div>
                <p className="text-[11px] text-[#9B9088] mt-0.5">
                  {format(new Date(item.expectedDate), "MMM d, yyyy")}
                  {item.account ? ` → ${item.account.name}` : ""}
                  {item.note ? ` · ${item.note}` : ""}
                </p>
              </div>
              <p className="text-sm font-bold text-emerald-700 shrink-0">{formatCurrency(item.amount, item.currency)}</p>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon-sm" variant="ghost" className="h-6 w-6 text-emerald-600 hover:text-emerald-700"
                  onClick={() => markReceived(item.id)} title="Mark received">
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="icon-sm" variant="ghost" className="h-6 w-6 text-[#9B9088] hover:text-red-500"
                  onClick={() => del(item.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
