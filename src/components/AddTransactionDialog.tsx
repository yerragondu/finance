"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TRANSACTION_TYPES, CURRENCIES, formatCurrency } from "@/lib/constants";
import { Plus, Tag, UserCircle2, Users, Trash2 } from "lucide-react";

type Account = { id: string; name: string; currency: string; balance: number; department: string };
type Category = { id: string; name: string };
type Dept = { value: string; label: string };
type SplitPerson = { personName: string; amount: string; paybackAccountId: string };

type Props = {
  accounts: Account[];
  onCreated: () => void;
  departments?: Dept[];
  defaultAccountId?: string;
  defaultDepartment?: string;
};

const EMPTY = (defaultAccountId = "", defaultDepartment = "SELF") => ({
  type: "EXPENSE", amount: "", fee: "0", exchangeRate: "",
  category: "", note: "", givenBy: "",
  date: new Date().toISOString().slice(0, 10),
  department: defaultDepartment,
  fromAccountId: defaultAccountId,
  toAccountId: "",
  paybackExpected: false,
  isSplit: false,
});

export function AddTransactionDialog({ accounts, onCreated, departments = [], defaultAccountId, defaultDepartment = "SELF" }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY(defaultAccountId, defaultDepartment));
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [savingCat, setSavingCat] = useState(false);
  const [splits, setSplits] = useState<SplitPerson[]>([]);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY(defaultAccountId, defaultDepartment));
      setSplits([]);
    }
  }, [defaultDepartment, defaultAccountId, open]);

  useEffect(() => {
    if (open && categories.length === 0) fetchCategories();
  }, [open]);

  async function fetchCategories() {
    const res = await fetch("/api/categories");
    const data = res.ok ? await res.json() : [];
    const list: Category[] = Array.isArray(data) ? data : [];
    setCategories(list);
    if (!form.category && list.length > 0) {
      setForm((f) => ({ ...f, category: f.category || list[0].name }));
    }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    setSavingCat(true);
    const res = await fetch("/api/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName.trim() }),
    });
    if (res.ok) {
      const cat = await res.json();
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((f) => ({ ...f, category: cat.name }));
      setNewCatName(""); setAddingCat(false);
    }
    setSavingCat(false);
  }

  function addSplitPerson() {
    setSplits((prev) => [...prev, { personName: "", amount: "", paybackAccountId: "" }]);
  }

  function removeSplitPerson(idx: number) {
    setSplits((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateSplit(idx: number, field: keyof SplitPerson, value: string) {
    setSplits((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  const isTransfer = form.type === "TRANSFER";
  const isExpense = form.type === "EXPENSE";
  const isIncome = form.type === "INCOME";
  const fromAccount = accounts.find((a) => a.id === form.fromAccountId);
  const toAccount = accounts.find((a) => a.id === form.toAccountId);
  const isCrossCurrency = isTransfer && fromAccount && toAccount && fromAccount.currency !== toAccount.currency;

  const splitTotal = splits.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const myShare = form.amount ? Number(form.amount) - splitTotal : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const validSplits = splits.filter((s) => s.personName.trim() && Number(s.amount) > 0);
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: Number(form.amount),
        fee: Number(form.fee),
        exchangeRate: form.exchangeRate ? Number(form.exchangeRate) : undefined,
        fromAccountId: (isExpense || isTransfer) ? form.fromAccountId || null : null,
        toAccountId: (isIncome || isTransfer) ? form.toAccountId || null : null,
        isSplit: form.isSplit && validSplits.length > 0,
        splits: validSplits.map((s) => ({
          personName: s.personName,
          amount: Number(s.amount),
          paybackAccountId: s.paybackAccountId || null,
        })),
      }),
    });
    setLoading(false);
    setOpen(false);
    setForm(EMPTY(defaultAccountId, defaultDepartment));
    setSplits([]);
    onCreated();
  }

  const selectedFromLabel = fromAccount ? `${fromAccount.name} (${fromAccount.currency})` : undefined;
  const selectedToLabel = toAccount ? `${toAccount.name} (${toAccount.currency})` : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Plus className="h-4 w-4 mr-1" /> Add Transaction
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* type toggle */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted rounded-xl">
            {TRANSACTION_TYPES.map((t) => (
              <button key={t.value} type="button"
                className={`py-1.5 rounded-lg text-sm font-medium transition-all ${
                  form.type === t.value
                    ? t.value === "EXPENSE" ? "bg-red-500 text-white shadow"
                      : t.value === "INCOME" ? "bg-emerald-500 text-white shadow"
                      : "bg-blue-500 text-white shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => { setForm({ ...form, type: t.value, isSplit: false }); setSplits([]); }}
              >{t.label}</button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Amount *</Label>
              <Input required type="number" step="0.01" min="0" placeholder="0.00"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Fee</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00"
                value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
            </div>
          </div>

          {(isExpense || isTransfer) && (
            <div className="space-y-1">
              <Label>{isTransfer ? "From Account" : "Account"} *</Label>
              <Select value={form.fromAccountId}
                onValueChange={(v) => v !== null && setForm({ ...form, fromAccountId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account">{selectedFromLabel ?? "Select account"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.currency}) — {formatCurrency(a.balance, a.currency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(isIncome || isTransfer) && (
            <div className="space-y-1">
              <Label>{isTransfer ? "To Account" : "Account"} *</Label>
              <Select value={form.toAccountId}
                onValueChange={(v) => v !== null && setForm({ ...form, toAccountId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account">{selectedToLabel ?? "Select account"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.currency}) — {formatCurrency(a.balance, a.currency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isCrossCurrency && (
            <div className="space-y-1">
              <Label>Exchange Rate (1 {fromAccount?.currency} = ? {toAccount?.currency})</Label>
              <Input type="number" step="0.0001" min="0" placeholder="e.g. 84.5"
                value={form.exchangeRate} onChange={(e) => setForm({ ...form, exchangeRate: e.target.value })} />
              {form.exchangeRate && form.amount && (
                <p className="text-xs text-muted-foreground">
                  Recipient gets ~{formatCurrency(Number(form.amount) / Number(form.exchangeRate), toAccount!.currency)}
                </p>
              )}
            </div>
          )}

          {/* Given by — income only */}
          {isIncome && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <UserCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="flex-1 space-y-0.5">
                <label className="text-xs font-semibold text-emerald-700">Given by</label>
                <Input
                  placeholder="Who gave this income? (optional)"
                  value={form.givenBy}
                  onChange={(e) => setForm({ ...form, givenBy: e.target.value })}
                  className="border-0 bg-transparent p-0 h-auto text-sm placeholder:text-emerald-400 focus-visible:ring-0 shadow-none"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Category */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>Category</Label>
                <button type="button" onClick={() => setAddingCat((v) => !v)}
                  className="flex items-center gap-0.5 text-[10px] text-violet-500 hover:text-violet-700 transition-colors">
                  <Tag className="h-2.5 w-2.5" />
                  {addingCat ? "Cancel" : "New"}
                </button>
              </div>
              {addingCat ? (
                <div className="flex gap-1">
                  <Input autoFocus placeholder="Category name" value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } }} />
                  <Button type="button" size="sm" onClick={handleAddCategory} disabled={savingCat || !newCatName.trim()}>
                    Add
                  </Button>
                </div>
              ) : (
                <Select value={form.category} onValueChange={(v) => v && setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category">{form.category || "Select"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Department */}
            <div className="space-y-1">
              <Label>Department</Label>
              <Select value={form.department} onValueChange={(v) => v && setForm({ ...form, department: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Department">{form.department}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>

          {/* Payback toggle — expense only */}
          {isExpense && (
            <button
              type="button"
              onClick={() => setForm({ ...form, paybackExpected: !form.paybackExpected })}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                form.paybackExpected
                  ? "border-amber-500 bg-amber-500/10 text-amber-600"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-amber-400/50"
              }`}
            >
              <div className="text-left">
                <p className="text-sm font-medium">
                  {form.paybackExpected ? "Payback Expected ✓" : "Payback Expected?"}
                </p>
                <p className="text-xs opacity-70">Someone will return this money later</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                form.paybackExpected ? "border-amber-500 bg-amber-500" : "border-current"
              }`}>
                {form.paybackExpected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
              </div>
            </button>
          )}

          {/* Split toggle — expense only */}
          {isExpense && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  const next = !form.isSplit;
                  setForm({ ...form, isSplit: next });
                  if (next && splits.length === 0) addSplitPerson();
                  if (!next) setSplits([]);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                  form.isSplit
                    ? "border-violet-400 bg-violet-50 text-violet-700"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-violet-300/50"
                }`}
              >
                <div className="text-left">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {form.isSplit ? "Split Expense ✓" : "Split this expense?"}
                  </p>
                  <p className="text-xs opacity-70">Others will pay back their share</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  form.isSplit ? "border-violet-500 bg-violet-500" : "border-current"
                }`}>
                  {form.isSplit && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
              </button>

              {form.isSplit && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-violet-700">Split Participants</p>
                    <Button type="button" size="sm" variant="ghost"
                      className="h-6 text-xs text-violet-600 hover:text-violet-800"
                      onClick={addSplitPerson}>
                      <Plus className="h-3 w-3 mr-0.5" /> Add person
                    </Button>
                  </div>

                  {splits.map((s, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                      <div className="space-y-0.5">
                        {idx === 0 && <p className="text-[10px] text-violet-600">Name</p>}
                        <Input
                          placeholder="Person"
                          value={s.personName}
                          onChange={(e) => updateSplit(idx, "personName", e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-0.5">
                        {idx === 0 && <p className="text-[10px] text-violet-600">Their share</p>}
                        <Input
                          type="number" step="0.01" min="0" placeholder="0.00"
                          value={s.amount}
                          onChange={(e) => updateSplit(idx, "amount", e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-0.5">
                        {idx === 0 && <p className="text-[10px] text-violet-600">Payback account</p>}
                        <Select value={s.paybackAccountId} onValueChange={(v) => updateSplit(idx, "paybackAccountId", v ?? "")}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Optional">
                              {accounts.find((a) => a.id === s.paybackAccountId)?.name ?? "None"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {accounts.map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="button" size="icon-sm" variant="ghost"
                        className="h-7 w-7 text-[#9B9088] hover:text-red-500"
                        onClick={() => removeSplitPerson(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                  {form.amount && splits.some((s) => Number(s.amount) > 0) && (
                    <div className="flex items-center justify-between pt-1 border-t border-violet-200">
                      <p className="text-[11px] text-violet-600">Others pay: {formatCurrency(splitTotal, fromAccount?.currency ?? "USD")}</p>
                      <p className="text-[11px] text-violet-700 font-semibold">
                        Your share: {formatCurrency(Math.max(0, myShare), fromAccount?.currency ?? "USD")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label>Note</Label>
            <Textarea placeholder="What was this for?" value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving…" : "Save Transaction"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
