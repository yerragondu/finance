"use client";

import { useRef, useState } from "react";
import { Sparkles, Loader2, ArrowRight, Undo2, Check, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/constants";

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
  defaultDepartment: string;
  onCreated: () => void;
};

export function QuickLogBar({ accounts, categories, departments, defaultDepartment, onCreated }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [logged, setLogged] = useState<{ id: string; summary: string } | null>(null);
  const [undoing, setUndoing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    setLogged(null);

    try {
      const parseRes = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, accounts, categories, departments, defaultDepartment }),
      });
      const parseData = await parseRes.json();

      if (!parseRes.ok || parseData.error) {
        const errText = String(parseData.error ?? "") + " " + String(parseData.detail ?? "");
        setError(
          errText.includes("GOOGLE_AI_API_KEY")
            ? "AI logging isn't set up — add GOOGLE_AI_API_KEY to .env, or use Add Transaction."
            : /429|quota|rate.?limit/i.test(errText)
            ? "AI is rate-limited right now (free tier quota) — wait a minute and try again, or use Add Transaction."
            : "Couldn't understand that — try e.g. \"8.45 walmart misc\", or use Add Transaction."
        );
        return;
      }

      const p: ParsedTx = parseData.parsed;
      if (!p.amount) {
        setError("Couldn't find an amount — try including a number, e.g. \"8.45 walmart misc\".");
        return;
      }

      const isExpense = p.type === "EXPENSE";
      const isIncome = p.type === "INCOME";
      const isTransfer = p.type === "TRANSFER";

      const createRes = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: p.type,
          amount: p.amount,
          fee: 0,
          category: p.category,
          note: p.note,
          date: p.date,
          department: p.department || defaultDepartment,
          fromAccountId: isExpense || isTransfer ? p.fromAccountId : null,
          toAccountId: isIncome || isTransfer ? p.toAccountId : null,
          paybackExpected: p.paybackExpected,
          givenBy: p.givenBy ?? "",
          isSplit: false,
          splits: [],
        }),
      });

      if (!createRes.ok) {
        setError("Parsed it, but couldn't save — try Add Transaction instead.");
        return;
      }

      const created = await createRes.json();
      const acc = accounts.find((a) => a.id === (p.fromAccountId ?? p.toAccountId));
      const amountStr = formatCurrency(p.amount, p.currency || acc?.currency || "USD");
      const summary = [
        (isExpense ? "−" : isIncome ? "+" : "") + amountStr,
        p.category,
        p.note,
        acc?.name,
      ].filter(Boolean).join(" · ");

      setLogged({ id: created.id, summary });
      setText("");
      onCreated();
    } catch {
      setError("Something went wrong — try again or use Add Transaction.");
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function handleUndo() {
    if (!logged) return;
    setUndoing(true);
    await fetch(`/api/transactions/${logged.id}`, { method: "DELETE" });
    setUndoing(false);
    setLogged(null);
    onCreated();
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 rounded-xl border border-[#EDE6D8] bg-white px-3 py-2 shadow-sm focus-within:border-[#C2410C] focus-within:ring-1 focus-within:ring-[#C2410C]/40 transition-colors">
        <Sparkles className="h-4 w-4 text-[#C2410C] shrink-0" />
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          placeholder='Log it like you would in Excel — "8.45 walmart misc" or "paid 500 rent from SBI"'
          disabled={busy}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#B8AFA0] disabled:opacity-60"
        />
        {busy ? (
          <Loader2 className="h-4 w-4 text-[#C2410C] animate-spin shrink-0" />
        ) : (
          text.trim() && (
            <button onClick={handleSubmit} className="shrink-0 text-[#C2410C] hover:text-[#9A3412]" title="Log it">
              <ArrowRight className="h-4 w-4" />
            </button>
          )
        )}
      </div>

      {error && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600 px-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}

      {logged && (
        <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 min-w-0">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Logged: {logged.summary}</span>
          </div>
          <button
            onClick={handleUndo}
            disabled={undoing}
            className="shrink-0 flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
          >
            <Undo2 className="h-3 w-3" /> {undoing ? "Undoing…" : "Undo"}
          </button>
        </div>
      )}
    </div>
  );
}
