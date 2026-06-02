"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency, CURRENCIES } from "@/lib/constants";
import { format, differenceInDays } from "date-fns";
import { Plus, Check, Trash2, Banknote, AlertCircle } from "lucide-react";

type Account = { id: string; name: string; currency: string };
type Dept = { value: string; label: string };
type HandLoan = {
  id: string; personName: string; amount: number; currency: string;
  department: string; dueDate: string | null; note: string; status: string;
  type: string; account?: { id: string; name: string; currency: string } | null;
};

type Props = {
  loans: HandLoan[];
  onUpdated: () => void;
  accounts?: Account[];
  departments?: Dept[];
};

export function HandLoanPanel({ loans, onUpdated, accounts = [], departments = [] }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    personName: "", amount: "", currency: "USD", department: "SELF",
    type: "BORROWED", accountId: "", dueDate: "", note: "",
  });

  const pending = loans.filter((l) => l.status === "PENDING");
  const returned = loans.filter((l) => l.status === "RETURNED");

  const borrowed = pending.filter((l) => l.type === "BORROWED");
  const lent = pending.filter((l) => l.type === "LENT");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/handloans", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount), accountId: form.accountId || null }),
    });
    setLoading(false); setAddOpen(false);
    setForm({ personName: "", amount: "", currency: "USD", department: "SELF", type: "BORROWED", accountId: "", dueDate: "", note: "" });
    onUpdated();
  }

  async function markReturned(id: string) {
    await fetch(`/api/handloans/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RETURNED" }),
    });
    onUpdated();
  }

  async function del(id: string) {
    await fetch(`/api/handloans/${id}`, { method: "DELETE" });
    onUpdated();
  }

  function daysInfo(dueDate: string | null) {
    if (!dueDate) return null;
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) return { label: `${Math.abs(days)}d overdue`, red: true };
    if (days === 0) return { label: "Due today", red: true };
    if (days <= 7) return { label: `${days}d left`, red: true };
    return { label: `${days}d left`, red: false };
  }

  function LoanRow({ loan }: { loan: HandLoan }) {
    const due = daysInfo(loan.dueDate);
    const isBorrowed = loan.type === "BORROWED";
    return (
      <div className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
        isBorrowed ? "bg-red-50 border-red-100 hover:bg-red-100/60" : "bg-blue-50 border-blue-100 hover:bg-blue-100/60"
      }`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-semibold text-[#1A1815]">{loan.personName}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              isBorrowed ? "bg-red-100 text-red-700 border border-red-200" : "bg-blue-100 text-blue-700 border border-blue-200"
            }`}>{isBorrowed ? "Borrowed" : "Lent"}</span>
            {due && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 ${
                due.red ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-[#F5F1EA] text-[#6B6360] border border-[#EDE8DF]"
              }`}>
                {due.red && <AlertCircle className="h-2.5 w-2.5" />}{due.label}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#9B9088] mt-0.5">
            {loan.dueDate ? format(new Date(loan.dueDate), "MMM d, yyyy") : "No due date"}
            {loan.account ? ` · ${loan.account.name}` : ""}
            {loan.note ? ` · ${loan.note}` : ""}
          </p>
        </div>
        <p className={`text-sm font-bold shrink-0 ${isBorrowed ? "text-red-700" : "text-blue-700"}`}>
          {formatCurrency(loan.amount, loan.currency)}
        </p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon-sm" variant="ghost" className="h-6 w-6 text-emerald-600 hover:text-emerald-700"
            onClick={() => markReturned(loan.id)} title="Mark returned">
            <Check className="h-3 w-3" />
          </Button>
          <Button size="icon-sm" variant="ghost" className="h-6 w-6 text-[#9B9088] hover:text-red-500"
            onClick={() => del(loan.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold text-[#D97757] uppercase tracking-widest">Hand Loans</h2>
          {pending.length > 0 && (
            <p className="text-[11px] text-[#9B9088] mt-0.5">
              {borrowed.length > 0 && `${borrowed.length} borrowed`}
              {borrowed.length > 0 && lent.length > 0 && " · "}
              {lent.length > 0 && `${lent.length} lent`}
            </p>
          )}
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button size="sm" variant="outline" />}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Add Hand Loan</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-3">
              {/* Borrowed / Lent toggle */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F5F1EA] rounded-xl">
                {(["BORROWED", "LENT"] as const).map((t) => (
                  <button key={t} type="button"
                    onClick={() => setForm({ ...form, type: t })}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                      form.type === t
                        ? t === "BORROWED" ? "bg-red-500 text-white shadow" : "bg-blue-500 text-white shadow"
                        : "text-[#9B9088] hover:text-[#1A1815]"
                    }`}>
                    {t === "BORROWED" ? "I Borrowed" : "I Lent"}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <Label>{form.type === "BORROWED" ? "Borrowed from" : "Lent to"} *</Label>
                <Input required placeholder="Person name" value={form.personName}
                  onChange={(e) => setForm({ ...form, personName: e.target.value })} />
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
                  <Label>Account</Label>
                  <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v ?? "" })}>
                    <SelectTrigger><SelectValue placeholder="Optional">{accounts.find((a) => a.id === form.accountId)?.name ?? "None"}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Due Date</Label>
                  <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
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
              <div className="space-y-1">
                <Label>Note</Label>
                <Input placeholder="What for?" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving…" : "Record Loan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-1.5">
        {pending.length === 0 && returned.length === 0 && (
          <div className="py-6 text-center">
            <Banknote className="h-7 w-7 text-[#C4B8A8] mx-auto mb-2" />
            <p className="text-sm text-[#9B9088]">No hand loans recorded</p>
          </div>
        )}

        {borrowed.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-red-400 px-1">I Owe</p>
            {borrowed.map((l) => <LoanRow key={l.id} loan={l} />)}
          </div>
        )}

        {lent.length > 0 && (
          <div className="space-y-1.5 mt-2">
            <p className="text-[10px] uppercase tracking-widest text-blue-400 px-1">Owed to Me</p>
            {lent.map((l) => <LoanRow key={l.id} loan={l} />)}
          </div>
        )}

        {returned.length > 0 && (
          <div className="mt-2">
            <p className="text-[10px] uppercase tracking-widest text-[#C4B8A8] mb-1.5 px-1">Settled ({returned.length})</p>
            {returned.slice(0, 3).map((l) => (
              <div key={l.id} className="group flex items-center gap-3 px-3 py-2 rounded-xl opacity-50 hover:opacity-70 transition-opacity">
                <div className="flex-1">
                  <p className="text-sm text-[#6B6360] line-through">{l.personName}</p>
                </div>
                <p className="text-sm text-emerald-600 line-through">{formatCurrency(l.amount, l.currency)}</p>
                <Button size="icon-sm" variant="ghost" className="h-6 w-6 text-[#C4B8A8] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => del(l.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
