"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency, CURRENCIES } from "@/lib/constants";
import { format } from "date-fns";
import { Plus, Check, Trash2, UserCheck } from "lucide-react";

type Owing = {
  id: string; personName: string; amount: number; currency: string;
  department: string; note: string; date: string; status: string;
};

type Dept = { value: string; label: string };
export function OwingPanel({ owings, onUpdated, departments = [] }: { owings: Owing[]; onUpdated: () => void; departments?: Dept[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    personName: "", amount: "", currency: "USD", department: "SELF", note: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const pending = owings.filter((o) => o.status === "PENDING");
  const returned = owings.filter((o) => o.status === "RETURNED");
  const totalUSD = pending.filter((o) => o.currency === "USD").reduce((s, o) => s + o.amount, 0);
  const totalINR = pending.filter((o) => o.currency === "INR").reduce((s, o) => s + o.amount, 0);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/owing", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    setLoading(false); setAddOpen(false);
    setForm({ personName: "", amount: "", currency: "USD", department: "SELF", note: "", date: new Date().toISOString().slice(0, 10) });
    onUpdated();
  }

  async function markReturned(id: string) {
    await fetch(`/api/owing/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RETURNED" }),
    });
    onUpdated();
  }

  async function del(id: string) {
    await fetch(`/api/owing/${id}`, { method: "DELETE" });
    onUpdated();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold text-[#D97757] uppercase tracking-widest">Money Owed to Me</h2>
          {pending.length > 0 && (
            <p className="text-[11px] text-amber-600 font-medium mt-0.5">
              {[totalUSD > 0 && formatCurrency(totalUSD, "USD"), totalINR > 0 && formatCurrency(totalINR, "INR")].filter(Boolean).join(" + ")} pending
            </p>
          )}
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button size="sm" variant="outline" />}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Money I Gave</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="space-y-1">
                <Label>Person Name *</Label>
                <Input required placeholder="e.g. John" value={form.personName}
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
                  <Label>Department</Label>
                  <Select value={form.department} onValueChange={(v) => v && setForm({ ...form, department: v })}>
                    <SelectTrigger><SelectValue>{form.department}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Note</Label>
                <Input placeholder="What for?" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving…" : "Record Owing"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-1.5">
        {pending.length === 0 && returned.length === 0 && (
          <div className="py-8 text-center">
            <UserCheck className="h-7 w-7 text-[#C4B8A8] mx-auto mb-2" />
            <p className="text-sm text-[#9B9088]">No outstanding amounts</p>
          </div>
        )}

        {pending.map((o) => (
          <div key={o.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100/60 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-[#1A1815]">{o.personName}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FDF4EE] border border-[#F5D5C4] text-[#D97757]">{o.department}</span>
              </div>
              <p className="text-[11px] text-[#9B9088] mt-0.5">
                {format(new Date(o.date), "MMM d, yyyy")}{o.note ? ` · ${o.note}` : ""}
              </p>
            </div>
            <p className="text-sm font-bold text-amber-700">{formatCurrency(o.amount, o.currency)}</p>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon-sm" variant="ghost" className="h-6 w-6 text-emerald-600 hover:text-emerald-700"
                onClick={() => markReturned(o.id)} title="Mark returned">
                <Check className="h-3 w-3" />
              </Button>
              <Button size="icon-sm" variant="ghost" className="h-6 w-6 text-[#9B9088] hover:text-red-500"
                onClick={() => del(o.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}

        {returned.length > 0 && (
          <div className="mt-2">
            <p className="text-[10px] uppercase tracking-widest text-[#C4B8A8] mb-1.5 px-1">Returned</p>
            {returned.slice(0, 5).map((o) => (
              <div key={o.id} className="group flex items-center gap-3 px-3 py-2 rounded-xl opacity-50 hover:opacity-70 transition-opacity">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#6B6360] line-through">{o.personName}</p>
                  <p className="text-[11px] text-[#9B9088]">{format(new Date(o.date), "MMM d, yyyy")}</p>
                </div>
                <p className="text-sm text-emerald-600 line-through">{formatCurrency(o.amount, o.currency)}</p>
                <Button size="icon-sm" variant="ghost" className="h-6 w-6 text-[#C4B8A8] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => del(o.id)}>
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
