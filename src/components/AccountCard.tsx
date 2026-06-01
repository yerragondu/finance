"use client";

import { Card, CardContent } from "@/components/ui/card";
import { EditAccountDialog } from "@/components/EditAccountDialog";
import { formatCurrency, getAccountTypeLabel } from "@/lib/constants";
import { CreditCard, Landmark, Wallet, TrendingDown, HandCoins } from "lucide-react";

type Account = {
  id: string; name: string; type: string; currency: string;
  department: string; balance: number; creditLimit?: number | null; color: string;
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  BANK: Landmark, CREDIT_CARD: CreditCard, CASH: Wallet, DEBT: TrendingDown, LOAN: HandCoins,
};

type Dept = { value: string; label: string };
export function AccountCard({ account, onUpdated, departments = [] }: { account: Account; onUpdated?: () => void; departments?: Dept[] }) {
  const Icon = TYPE_ICONS[account.type] ?? Wallet;
  const isCC = account.type === "CREDIT_CARD";
  const isDebt = ["DEBT", "LOAN"].includes(account.type);

  const limit = account.creditLimit ?? 0;
  const available = account.balance;
  const due = limit - available;
  const overLimit = available < 0;
  const hasCreditBack = due < 0;
  const duePct = limit > 0 ? Math.min(Math.max((due / limit) * 100, 0), 100) : 0;
  const barColor = duePct > 85 ? "#DC2626" : duePct > 65 ? "#D97706" : account.color;

  return (
    <Card className="group relative bg-white border border-[#EDE8DF] shadow-sm hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[3px]" style={{ backgroundColor: account.color }} />

      <CardContent className="p-4 pt-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl" style={{ backgroundColor: account.color + "15" }}>
              <Icon className="h-4 w-4" style={{ color: account.color }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1A1815] leading-tight">{account.name}</p>
              <p className="text-[11px] text-[#9B9088] mt-0.5">
                {getAccountTypeLabel(account.type)} · {account.department}
              </p>
            </div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            {onUpdated && <EditAccountDialog account={account} onUpdated={onUpdated} departments={departments} />}
          </div>
        </div>

        {isCC ? (
          <div>
            {overLimit ? (
              <>
                <p className="text-[10px] uppercase tracking-widest text-orange-600 font-semibold mb-1">Over Limit</p>
                <p className="text-2xl font-bold tracking-tight text-orange-600">
                  +{formatCurrency(Math.abs(available), account.currency)}
                </p>
                {limit > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-[#9B9088] mb-1.5">
                      <span className="text-orange-600 font-medium">Due {formatCurrency(due, account.currency)}</span>
                      <span>Limit {formatCurrency(limit, account.currency)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-orange-100 overflow-hidden">
                      <div className="h-full rounded-full bg-orange-500" style={{ width: "100%" }} />
                    </div>
                  </div>
                )}
              </>
            ) : hasCreditBack ? (
              <>
                <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-semibold mb-1">Credit on Card</p>
                <p className="text-2xl font-bold tracking-tight text-emerald-600">
                  +{formatCurrency(Math.abs(due), account.currency)}
                </p>
                <p className="text-[11px] text-[#9B9088] mt-1">
                  Available {formatCurrency(available, account.currency)} · Limit {formatCurrency(limit, account.currency)}
                </p>
              </>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-widest text-[#9B9088] mb-1">Available</p>
                <p className={`text-2xl font-bold tracking-tight ${duePct > 85 ? "text-red-600" : duePct > 65 ? "text-orange-500" : "text-[#1A1815]"}`}>
                  {formatCurrency(available, account.currency)}
                </p>
                {limit > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-[#9B9088] mb-1.5">
                      <span>Due {formatCurrency(due, account.currency)}</span>
                      <span>Limit {formatCurrency(limit, account.currency)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#EDE8DF] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${duePct}%`, backgroundColor: barColor }} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#9B9088] mb-1">
              {isDebt ? "Outstanding" : "Balance"}
            </p>
            <p className={`text-2xl font-bold tracking-tight ${isDebt && account.balance > 0 ? "text-red-600" : "text-[#1A1815]"}`}>
              {isDebt && account.balance > 0 ? "−" : ""}
              {formatCurrency(Math.abs(account.balance), account.currency)}
            </p>
            <p className="text-[11px] text-[#9B9088] mt-0.5">{account.currency}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
