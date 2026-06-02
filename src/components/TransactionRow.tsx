"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/constants";
import { format } from "date-fns";
import {
  ArrowUpRight, ArrowDownLeft, ArrowLeftRight,
  Pencil, Check, X, Trash2, RotateCcw, UserCircle2, Users,
} from "lucide-react";

type Account = { id: string; name: string; currency: string };
type Category = { id: string; name: string };
type SplitEntry = {
  id: string; personName: string; amount: number; currency: string;
  paidBack: boolean; paybackAccount?: { id: string; name: string; currency: string } | null;
  note: string;
};

type Transaction = {
  id: string; type: string; amount: number; fee: number;
  exchangeRate?: number | null; category: string; note: string; givenBy?: string;
  date: string; department: string; paybackExpected: boolean; paidBack: boolean; isSplit?: boolean;
  fromAccount?: { id: string; name: string; currency: string } | null;
  toAccount?: { id: string; name: string; currency: string } | null;
  splits?: SplitEntry[];
};

type Dept = { value: string; label: string };
type Props = {
  txn: Transaction;
  onUpdated: () => void;
  accounts?: Account[];
  categories?: Category[];
  departments?: Dept[];
};

export function TransactionRow({ txn, onUpdated, accounts = [], categories = [], departments = [] }: Props) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(txn.note);
  const [department, setDepartment] = useState(txn.department);
  const [category, setCategory] = useState(txn.category);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [paybackOpen, setPaybackOpen] = useState(false);
  const [paybackAccountId, setPaybackAccountId] = useState(txn.fromAccount?.id ?? "");
  const [paybackAmount, setPaybackAmount] = useState(String(txn.amount + txn.fee));
  const [paybackSaving, setPaybackSaving] = useState(false);

  const [splitsOpen, setSplitsOpen] = useState(false);

  const currency = txn.fromAccount?.currency ?? txn.toAccount?.currency ?? "USD";
  const pendingSplits = (txn.splits ?? []).filter((s) => !s.paidBack);
  const paidSplits = (txn.splits ?? []).filter((s) => s.paidBack);

  async function saveEdits() {
    setSaving(true);
    await fetch(`/api/transactions/${txn.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note, department, category }),
    });
    setSaving(false); setEditing(false); onUpdated();
  }

  function cancelEdit() {
    setEditing(false);
    setNote(txn.note);
    setDepartment(txn.department);
    setCategory(txn.category);
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await fetch(`/api/transactions/${txn.id}`, { method: "DELETE" });
    onUpdated();
  }

  async function confirmPayback() {
    setPaybackSaving(true);
    await fetch(`/api/transactions/${txn.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paidBack: true,
        paybackAccountId: paybackAccountId || null,
        paybackAmount: Number(paybackAmount),
      }),
    });
    setPaybackSaving(false); setPaybackOpen(false); onUpdated();
  }

  async function markSplitPaidBack(splitId: string, paybackAccountId?: string) {
    await fetch(`/api/split-entries/${splitId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paidBack: true, ...(paybackAccountId ? { paybackAccountId } : {}) }),
    });
    onUpdated();
  }

  const cfg = {
    EXPENSE:  { icon: ArrowUpRight,   color: "#DC2626", bg: "#FEF2F2" },
    INCOME:   { icon: ArrowDownLeft,  color: "#16A34A", bg: "#F0FDF4" },
    TRANSFER: { icon: ArrowLeftRight, color: "#2563EB", bg: "#EFF6FF" },
  }[txn.type] ?? { icon: ArrowLeftRight, color: "#6B7280", bg: "#F9FAFB" };

  const Icon = cfg.icon;
  const sign = txn.type === "INCOME" ? "+" : txn.type === "EXPENSE" ? "−" : "";
  const paybackAccount = accounts.find((a) => a.id === paybackAccountId);

  return (
    <div className={`group flex items-start gap-3 py-3 border-b border-[#F5F1EA] last:border-0 ${txn.paidBack ? "opacity-40" : ""}`}>
      <div className="shrink-0 mt-0.5 p-1.5 rounded-lg" style={{ backgroundColor: cfg.bg }}>
        <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-medium text-[#1A1815] truncate">{txn.category}</p>
              {txn.paybackExpected && !txn.paidBack && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                  PAYBACK EXPECTED
                </span>
              )}
              {txn.paidBack && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                  PAID BACK
                </span>
              )}
              {txn.isSplit && (
                <button
                  onClick={() => setSplitsOpen((v) => !v)}
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200 transition-colors flex items-center gap-0.5"
                >
                  <Users className="h-2.5 w-2.5" />
                  SPLIT {pendingSplits.length > 0 ? `· ${pendingSplits.length} pending` : "✓"}
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#9B9088] mt-0.5 flex items-center gap-1 flex-wrap">
              <span>{format(new Date(txn.date), "MMM d, yyyy")}</span>
              {txn.fromAccount && <span>· {txn.fromAccount.name}</span>}
              {txn.toAccount && txn.type === "TRANSFER" && <span>→ {txn.toAccount.name}</span>}
              {txn.fee > 0 && <span>· fee {formatCurrency(txn.fee, currency)}</span>}
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#FDF4EE] border border-[#F5D5C4] text-[#D97757]">{txn.department}</span>
            </p>
          </div>
          <p className="text-sm font-semibold shrink-0" style={{ color: cfg.color }}>
            {sign}{formatCurrency(txn.amount, currency)}
          </p>
        </div>

        {/* ── Income extras ── */}
        {txn.type === "INCOME" && (
          <div className="mt-1.5 space-y-1">
            {txn.givenBy && (
              <div className="flex items-center gap-1.5">
                <UserCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                <span className="text-[11px] text-emerald-700 font-medium">Given by {txn.givenBy}</span>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFFBEB] border border-amber-200 text-amber-700">
                20% → {formatCurrency(txn.amount * 0.2, currency)}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFFBEB] border border-amber-200 text-amber-700">
                10% → {formatCurrency(txn.amount * 0.1, currency)}
              </span>
            </div>
          </div>
        )}

        {/* ── Split entries ── */}
        {txn.isSplit && splitsOpen && (txn.splits ?? []).length > 0 && (
          <div className="mt-2 p-3 rounded-xl bg-violet-50 border border-violet-200 space-y-1.5">
            <p className="text-[11px] font-semibold text-violet-700 mb-1">Split Participants</p>
            {(txn.splits ?? []).map((s) => (
              <div key={s.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${s.paidBack ? "opacity-50" : "bg-white border border-violet-100"}`}>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${s.paidBack ? "line-through text-[#9B9088]" : "text-[#1A1815]"}`}>{s.personName}</p>
                  {s.paybackAccount && (
                    <p className="text-[10px] text-[#9B9088]">→ {s.paybackAccount.name}</p>
                  )}
                </div>
                <p className={`text-xs font-bold shrink-0 ${s.paidBack ? "text-emerald-600 line-through" : "text-violet-700"}`}>
                  {formatCurrency(s.amount, s.currency)}
                </p>
                {!s.paidBack && (
                  <Button size="icon-sm" variant="ghost"
                    className="h-5 w-5 text-emerald-600 hover:text-emerald-700 shrink-0"
                    onClick={() => markSplitPaidBack(s.id, s.paybackAccount?.id)}
                    title="Mark paid back">
                    <Check className="h-2.5 w-2.5" />
                  </Button>
                )}
                {s.paidBack && <Check className="h-3 w-3 text-emerald-500 shrink-0" />}
              </div>
            ))}
          </div>
        )}

        {/* ── Edit mode ── */}
        {editing && (
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <p className="text-[10px] text-[#9B9088]">Department</p>
                <Select value={department} onValueChange={(v) => v && setDepartment(v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue>{department}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-[#9B9088]">Category</p>
                <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue>{category}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                className="text-xs" placeholder="Add a note…" />
              <div className="flex flex-col gap-1">
                <Button size="icon-sm" variant="ghost" onClick={saveEdits} disabled={saving}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={cancelEdit}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Payback form ── */}
        {paybackOpen && (
          <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
            <p className="text-[11px] font-semibold text-amber-700">Mark Paid Back — where did you receive?</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <p className="text-[10px] text-[#9B9088]">Received into account</p>
                <Select value={paybackAccountId} onValueChange={(v) => v && setPaybackAccountId(v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue>
                      {paybackAccount ? `${paybackAccount.name} (${paybackAccount.currency})` : "Select account"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-[#9B9088]">
                  Amount received{paybackAccount ? ` (${paybackAccount.currency})` : ""}
                </p>
                <Input type="number" step="0.01" min="0" className="h-7 text-xs"
                  value={paybackAmount} onChange={(e) => setPaybackAmount(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                onClick={confirmPayback} disabled={paybackSaving || !paybackAccountId}>
                {paybackSaving ? "Saving…" : "Confirm Payback"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPaybackOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!editing && !paybackOpen && note && (
          <p className="text-[11px] text-[#9B9088] italic mt-1">"{note}"</p>
        )}
      </div>

      {!editing && !paybackOpen && (
        <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {txn.paybackExpected && !txn.paidBack && (
            <Button size="icon-sm" variant="ghost" className="h-6 w-6 text-amber-500 hover:text-amber-600"
              onClick={() => {
                setPaybackAccountId(txn.fromAccount?.id ?? "");
                setPaybackAmount(String(txn.amount + txn.fee));
                setPaybackOpen(true);
              }} title="Mark as paid back">
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
          <Button size="icon-sm" variant="ghost" className="h-6 w-6 text-[#9B9088] hover:text-[#6B6360]"
            onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="icon-sm" variant="ghost"
            className={`h-6 w-6 ${confirmDelete ? "text-red-600 bg-red-50" : "text-[#9B9088] hover:text-red-500"}`}
            onClick={handleDelete} disabled={deleting}
            title={confirmDelete ? "Click again to confirm" : "Delete"}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
