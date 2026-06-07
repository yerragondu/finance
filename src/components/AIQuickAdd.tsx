"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, CURRENCIES } from "@/lib/constants";
import { Sparkles, Loader2, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Check, RefreshCw } from "lucide-react";

type Account = { id: string; name: string; currency: string; balance: number; department: string };
type Category = { id: string; name: string };
type Dept = { value: string; label: string };

type ParsedTx = {
  type: string; amount: number | null; currency: string; category: string;
  fromAccountId: string | null; toAccountId: string | null;
  department: string; note: string; paybackExpected: boolean;
  givenBy: string; date: string; isSplit: boolean; confidence: number;
};

type Props = {
  accounts: Account[];
  categories: Category[];
  departments: Dept[];
  defaultDepartment?: string;
  onCreated: () => void;
};

const TYPE_CONFIG = {
  EXPENSE:  { label: "Expense",  color: "#DC2626", bg: "#FEF2F2", icon: ArrowUpRight },
  INCOME:   { label: "Income",   color: "#16A34A", bg: "#F0FDF4", icon: ArrowDownLeft },
  TRANSFER: { label: "Transfer", color: "#2563EB", bg: "#EFF6FF", icon: ArrowLeftRight },
};

export function AIQuickAdd({ accounts, categories, departments, defaultDepartment = "SELF", onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedTx | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Editable parsed fields
  const [form, setForm] = useState<ParsedTx | null>(null);

  async function handleParse() {
    if (!text.trim()) return;
    setParsing(true);
    setError("");
    setParsed(null);
    setForm(null);
    setSaved(false);

    const res = await fetch("/api/ai/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        accounts,
        categories,
        departments,
        defaultDepartment,
      }),
    });

    const data = await res.json();
    setParsing(false);

    if (!res.ok || data.error) {
      setError(data.error || "Failed to parse. Check your API key.");
      return;
    }

    setParsed(data.parsed);
    setForm(data.parsed);
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);

    const isExpense = form.type === "EXPENSE";
    const isIncome = form.type === "INCOME";
    const isTransfer = form.type === "TRANSFER";

    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        amount: form.amount ?? 0,
        fee: 0,
        category: form.category,
        note: form.note,
        date: form.date,
        department: form.department,
        fromAccountId: (isExpense || isTransfer) ? form.fromAccountId : null,
        toAccountId: (isIncome || isTransfer) ? form.toAccountId : null,
        paybackExpected: form.paybackExpected,
        givenBy: form.givenBy ?? "",
        isSplit: false,
        splits: [],
      }),
    });

    setSaving(false);
    setSaved(true);
    onCreated();

    // Reset after short delay
    setTimeout(() => {
      setText("");
      setParsed(null);
      setForm(null);
      setSaved(false);
      setOpen(false);
    }, 1200);
  }

  function handleReset() {
    setText("");
    setParsed(null);
    setForm(null);
    setError("");
    setSaved(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const typeConf = form ? (TYPE_CONFIG[form.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.EXPENSE) : null;
  const TypeIcon = typeConf?.icon ?? ArrowUpRight;

  const fromAcc = accounts.find((a) => a.id === form?.fromAccountId);
  const toAcc = accounts.find((a) => a.id === form?.toAccountId);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) handleReset(); }}>
      <DialogTrigger render={<Button size="sm" className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0 shadow-sm" />}>
        <Sparkles className="h-3.5 w-3.5 mr-1.5" /> AI Add
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-violet-100">
              <Sparkles className="h-4 w-4 text-violet-600" />
            </div>
            AI Quick Add
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Natural language input */}
          <div className="space-y-1.5">
            <Label className="text-xs text-[#9B9088]">Describe the transaction in plain English</Label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                autoFocus
                placeholder="e.g. paid ₹5000 electricity bill from SBI, or received $2000 salary in Chase"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !parsing) handleParse(); }}
                className="flex-1"
                disabled={parsing || !!parsed}
              />
              {!parsed ? (
                <Button
                  onClick={handleParse}
                  disabled={parsing || !text.trim()}
                  className="shrink-0 bg-violet-500 hover:bg-violet-600 text-white"
                >
                  {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={handleReset} className="shrink-0 text-[#9B9088]">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-[10px] text-[#C4B8A8]">
              Just type naturally — AI fills type, amount, category, account, department, everything
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Parsing state */}
          {parsing && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-50 border border-violet-200">
              <Loader2 className="h-4 w-4 text-violet-500 animate-spin shrink-0" />
              <p className="text-sm text-violet-700">AI is reading your transaction…</p>
            </div>
          )}

          {/* Parsed result — editable */}
          {form && !saved && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-[#EDE8DF]" />
                <p className="text-[10px] uppercase tracking-widest text-[#9B9088] px-2">AI Filled — review & confirm</p>
                <div className="h-px flex-1 bg-[#EDE8DF]" />
              </div>

              {/* Confidence banner */}
              {parsed && parsed.confidence < 0.6 && (
                <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  ⚠ Low confidence — please review the fields below
                </div>
              )}

              {/* Type selector */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F5F1EA] rounded-xl">
                {(["EXPENSE", "INCOME", "TRANSFER"] as const).map((t) => {
                  const c = TYPE_CONFIG[t];
                  return (
                    <button key={t} type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                        form.type === t ? "text-white shadow" : "text-[#9B9088]"
                      }`}
                      style={form.type === t ? { backgroundColor: c.color } : {}}>
                      {c.label}
                    </button>
                  );
                })}
              </div>

              {/* Amount + currency */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Amount</Label>
                  <Input
                    type="number" step="0.01" min="0"
                    value={form.amount ?? ""}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className={!form.amount ? "border-amber-300 focus-visible:ring-amber-300" : ""}
                    placeholder="Enter amount"
                  />
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

              {/* Category + Dept */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => v && setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue>{form.category || "Select"}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
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

              {/* From / To account */}
              {(form.type === "EXPENSE" || form.type === "TRANSFER") && (
                <div className="space-y-1">
                  <Label>{form.type === "TRANSFER" ? "From Account" : "Account"}</Label>
                  <Select
                    value={form.fromAccountId ?? ""}
                    onValueChange={(v) => setForm({ ...form, fromAccountId: v || null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account">
                        {fromAcc ? `${fromAcc.name} (${fromAcc.currency}) — ${formatCurrency(fromAcc.balance, fromAcc.currency)}` : "Select account"}
                      </SelectValue>
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

              {(form.type === "INCOME" || form.type === "TRANSFER") && (
                <div className="space-y-1">
                  <Label>{form.type === "TRANSFER" ? "To Account" : "Account"}</Label>
                  <Select
                    value={form.toAccountId ?? ""}
                    onValueChange={(v) => setForm({ ...form, toAccountId: v || null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account">
                        {toAcc ? `${toAcc.name} (${toAcc.currency}) — ${formatCurrency(toAcc.balance, toAcc.currency)}` : "Select account"}
                      </SelectValue>
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

              {/* Note + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Note</Label>
                  <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>

              {/* Payback toggle */}
              {form.paybackExpected && (
                <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 font-medium">
                  ✓ Payback expected
                </div>
              )}

              {/* Save */}
              <Button
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
                onClick={handleSave}
                disabled={saving || !form.amount}
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
                ) : (
                  <><Check className="h-4 w-4 mr-2" /> Save Transaction</>
                )}
              </Button>
            </div>
          )}

          {/* Saved success */}
          {saved && (
            <div className="flex flex-col items-center gap-2 py-6">
              <div className="p-3 rounded-full bg-emerald-100">
                <Check className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-[#1A1815]">Transaction saved!</p>
              <p className="text-xs text-[#9B9088]">Closing in a moment…</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
