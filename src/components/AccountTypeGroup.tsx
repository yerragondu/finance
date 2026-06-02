"use client";

import { useState } from "react";
import { AccountCard } from "@/components/AccountCard";
import { formatCurrency, getAccountTypeLabel } from "@/lib/constants";
import { CreditCard, Landmark, Wallet, TrendingDown, HandCoins, ChevronDown, ChevronUp } from "lucide-react";

type Account = {
  id: string; name: string; type: string; currency: string;
  department: string; balance: number; creditLimit?: number | null; color: string;
};
type Dept = { value: string; label: string };

const TYPE_ICONS: Record<string, React.ElementType> = {
  BANK: Landmark, CREDIT_CARD: CreditCard, CASH: Wallet, DEBT: TrendingDown, LOAN: HandCoins,
};

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  BANK:        { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  CREDIT_CARD: { bg: "#FDF4FF", text: "#9333EA", border: "#E9D5FF" },
  CASH:        { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0" },
  DEBT:        { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" },
  LOAN:        { bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA" },
};

type Props = {
  type: string;
  accounts: Account[];
  onUpdated: () => void;
  departments?: Dept[];
};

export function AccountTypeGroup({ type, accounts, onUpdated, departments = [] }: Props) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TYPE_ICONS[type] ?? Wallet;
  const colors = TYPE_COLORS[type] ?? { bg: "#F9FAFB", text: "#6B7280", border: "#E5E7EB" };
  const label = getAccountTypeLabel(type);

  const usdAccounts = accounts.filter((a) => a.currency === "USD");
  const inrAccounts = accounts.filter((a) => a.currency === "INR");
  const totalUSD = usdAccounts.reduce((s, a) => s + (type === "CREDIT_CARD" ? 0 : a.balance), 0);
  const totalINR = inrAccounts.reduce((s, a) => s + (type === "CREDIT_CARD" ? 0 : a.balance), 0);

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden" style={{ borderColor: colors.border }}>
      {/* Group header — click to expand */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:opacity-90 transition-opacity"
        style={{ backgroundColor: colors.bg }}
      >
        <div className="p-2 rounded-xl" style={{ backgroundColor: colors.text + "15" }}>
          <Icon className="h-4 w-4" style={{ color: colors.text }} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold" style={{ color: colors.text }}>{label}</p>
          <p className="text-[11px] text-[#9B9088]">{accounts.length} account{accounts.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="text-right mr-2">
          {type !== "CREDIT_CARD" && type !== "DEBT" && type !== "LOAN" && (
            <>
              {totalUSD !== 0 && (
                <p className="text-sm font-bold" style={{ color: colors.text }}>{formatCurrency(totalUSD, "USD")}</p>
              )}
              {totalINR !== 0 && (
                <p className="text-sm font-bold" style={{ color: colors.text }}>{formatCurrency(totalINR, "INR")}</p>
              )}
            </>
          )}
          {(type === "DEBT" || type === "LOAN") && (
            <p className="text-sm font-bold text-red-600">
              {formatCurrency(accounts.reduce((s, a) => s + a.balance, 0), accounts[0]?.currency ?? "USD")}
            </p>
          )}
        </div>
        <div style={{ color: colors.text }}>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded accounts */}
      {expanded && (
        <div className="p-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ borderColor: colors.border }}>
          {accounts.map((a) => (
            <AccountCard key={a.id} account={a} onUpdated={onUpdated} departments={departments} />
          ))}
        </div>
      )}

      {/* Collapsed: show account names as chips */}
      {!expanded && (
        <div className="px-4 pb-3 flex gap-1.5 flex-wrap">
          {accounts.map((a) => (
            <span
              key={a.id}
              className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
              style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
            >
              {a.name} · {formatCurrency(a.balance, a.currency)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
