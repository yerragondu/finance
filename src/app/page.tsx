"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AccountTypeGroup } from "@/components/AccountTypeGroup";
import { AddAccountDialog } from "@/components/AddAccountDialog";
import { AddTransactionDialog } from "@/components/AddTransactionDialog";
import { TransactionRow } from "@/components/TransactionRow";
import { OwingPanel } from "@/components/OwingPanel";
import { HandLoanPanel } from "@/components/HandLoanPanel";
import { RecurringBillsPanel } from "@/components/RecurringBillsPanel";
import { ExpectedIncomePanel } from "@/components/ExpectedIncomePanel";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { GivenBySummary } from "@/components/GivenBySummary";
import { formatCurrency } from "@/lib/constants";
import { format } from "date-fns";
import { DollarSign, IndianRupee, TrendingDown, Clock, Download, Plus, Check, X } from "lucide-react";

type Account = {
  id: string; name: string; type: string; currency: string;
  department: string; balance: number; creditLimit?: number | null; color: string;
};
type Transaction = {
  id: string; type: string; amount: number; fee: number;
  exchangeRate?: number | null; category: string; note: string;
  date: string; department: string; paybackExpected: boolean; paidBack: boolean;
  givenBy?: string; isSplit?: boolean;
  fromAccount?: { id: string; name: string; currency: string } | null;
  toAccount?: { id: string; name: string; currency: string } | null;
  splits?: Array<{
    id: string; personName: string; amount: number; currency: string;
    paidBack: boolean; note: string;
    paybackAccount?: { id: string; name: string; currency: string } | null;
  }>;
};
type Owing = {
  id: string; personName: string; amount: number; currency: string;
  department: string; note: string; date: string; status: string;
};
type HandLoan = {
  id: string; personName: string; amount: number; currency: string;
  department: string; dueDate: string | null; note: string; status: string;
  type: string; account?: { id: string; name: string; currency: string } | null;
};
type RecurringBill = {
  id: string; name: string; amount: number; currency: string;
  department: string; category: string; dayOfMonth: number;
  isActive: boolean; note: string;
  account?: { id: string; name: string; currency: string } | null;
};
type ExpectedIncome = {
  id: string; name: string; amount: number; currency: string;
  department: string; category: string; expectedDate: string;
  isReceived: boolean; note: string;
  account?: { id: string; name: string; currency: string } | null;
};
type Dept = { id: string; value: string; label: string; isDefault: boolean };

const ACCOUNT_TYPE_ORDER = ["BANK", "CASH", "CREDIT_CARD", "LOAN", "DEBT"];

// Group transactions by month label
function groupByMonth(transactions: Transaction[]): { label: string; txns: Transaction[] }[] {
  const map = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const label = format(new Date(t.date), "MMMM yyyy");
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(t);
  }
  return Array.from(map.entries()).map(([label, txns]) => ({ label, txns }));
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [owings, setOwings] = useState<Owing[]>([]);
  const [handLoans, setHandLoans] = useState<HandLoan[]>([]);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [expectedIncomes, setExpectedIncomes] = useState<ExpectedIncome[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [activeDept, setActiveDept] = useState("ALL");
  const [activeTab, setActiveTab] = useState<"accounts" | "transactions" | "owing" | "loans" | "bills">("accounts");
  const [loading, setLoading] = useState(true);

  const [addingDept, setAddingDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [savingDept, setSavingDept] = useState(false);
  const deptInputRef = useRef<HTMLInputElement>(null);

  const fetchDepartments = useCallback(async () => {
    const res = await fetch("/api/departments");
    const data = res.ok ? await res.json() : [];
    setDepartments(Array.isArray(data) ? data : []);
  }, []);

  const fetchData = useCallback(async () => {
    const deptParam = activeDept !== "ALL" ? `?department=${activeDept}` : "";
    const sep = deptParam ? "&" : "?";
    const loanParam = activeDept !== "ALL" ? `?department=${activeDept}` : "";

    const [accs, txns, allTxns, ows, cats, loans, bills, expected] = await Promise.all([
      fetch(`/api/accounts${deptParam}`).then((r) => r.json()),
      fetch(`/api/transactions${deptParam}${sep}limit=100`).then((r) => r.json()),
      fetch(`/api/transactions${deptParam}${sep}limit=10000`).then((r) => r.json()),
      fetch("/api/owing").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.ok ? r.json() : []),
      fetch(`/api/handloans${loanParam}`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/recurring-bills${loanParam}`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/expected-income${loanParam}`).then((r) => r.ok ? r.json() : []),
    ]);

    setAccounts(Array.isArray(accs) ? accs : []);
    setTransactions(Array.isArray(txns) ? txns : []);
    setAllTransactions(Array.isArray(allTxns) ? allTxns : []);
    setOwings(Array.isArray(ows) ? ows : []);
    setCategories(Array.isArray(cats) ? cats : []);
    setHandLoans(Array.isArray(loans) ? loans : []);
    setRecurringBills(Array.isArray(bills) ? bills : []);
    setExpectedIncomes(Array.isArray(expected) ? expected : []);
    setLoading(false);
  }, [activeDept]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  async function handleAddDept() {
    if (!newDeptName.trim()) return;
    setSavingDept(true);
    await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newDeptName.trim() }),
    });
    setSavingDept(false);
    setNewDeptName("");
    setAddingDept(false);
    fetchDepartments();
  }

  function openAddDept() {
    setAddingDept(true);
    setTimeout(() => deptInputRef.current?.focus(), 50);
  }

  const ALL_DEPTS = [{ value: "ALL", label: "All" }, ...departments];

  // Summary stats
  const liquidTypes = ["BANK", "CASH"];
  const debtAccounts = accounts.filter((a) => ["DEBT", "LOAN"].includes(a.type));
  const usdBalance = accounts.filter((a) => liquidTypes.includes(a.type) && a.currency === "USD").reduce((s, a) => s + a.balance, 0);
  const inrBalance = accounts.filter((a) => liquidTypes.includes(a.type) && a.currency === "INR").reduce((s, a) => s + a.balance, 0);
  const totalDebt = debtAccounts.reduce((s, a) => s + a.balance, 0);
  const pendingPaybacks = transactions.filter((t) => t.paybackExpected && !t.paidBack);

  // Account type grouping
  const accountsByType = ACCOUNT_TYPE_ORDER
    .map((type) => ({ type, accounts: accounts.filter((a) => a.type === type) }))
    .filter((g) => g.accounts.length > 0);

  // Month-wise transaction groups
  const monthGroups = groupByMonth(transactions);

  // Upcoming recurring bills (next 7 days)
  const today = new Date();
  const urgentBills = recurringBills.filter((b) => {
    const day = b.dayOfMonth;
    const currentDay = today.getDate();
    const daysLeft = day >= currentDay ? day - currentDay : (new Date(today.getFullYear(), today.getMonth() + 1, day).getDate() + (30 - currentDay));
    return daysLeft <= 7;
  });

  return (
    <div className="min-h-screen bg-[#FAF9F6]">

      {/* ── Header ── */}
      <header className="bg-white border-b border-[#EDE8DF] px-6 h-14 flex items-center justify-between sticky top-0 z-10 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-bold tracking-tight shrink-0" style={{ background: "linear-gradient(135deg, #D97757, #C4613F)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            FinanceOS
          </h1>

          {/* Dept tabs */}
          <div className="hidden sm:flex items-center gap-0.5 bg-[#F5F1EA] p-0.5 rounded-lg border border-[#EDE8DF]">
            {ALL_DEPTS.map((d) => (
              <button key={d.value} onClick={() => setActiveDept(d.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  activeDept === d.value
                    ? "bg-white text-[#D97757] shadow-sm font-semibold border border-[#EDE8DF]"
                    : "text-[#9B9088] hover:text-[#D97757]"
                }`}>
                {d.label}
              </button>
            ))}

            {addingDept ? (
              <div className="flex items-center gap-1 ml-1">
                <input
                  ref={deptInputRef}
                  placeholder="Dept name"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleAddDept(); }
                    if (e.key === "Escape") { setAddingDept(false); setNewDeptName(""); }
                  }}
                  className="px-2 py-0.5 text-xs rounded-md border border-[#D97757] w-24 focus:outline-none focus:ring-1 focus:ring-[#D97757] bg-white text-[#1A1815]"
                />
                <button onClick={handleAddDept} disabled={savingDept || !newDeptName.trim()}
                  className="p-0.5 text-[#D97757] hover:text-[#C4613F] disabled:opacity-40">
                  <Check className="h-3 w-3" />
                </button>
                <button onClick={() => { setAddingDept(false); setNewDeptName(""); }}
                  className="p-0.5 text-[#9B9088] hover:text-[#6B6360]">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button onClick={openAddDept}
                className="ml-0.5 px-1.5 py-1 rounded-md text-[#9B9088] hover:text-[#D97757] transition-all"
                title="Add department">
                <Plus className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a href="/api/export" download
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#EDE8DF] text-[#6B6360] hover:bg-[#F5F1EA] hover:text-[#D97757] transition-colors">
            <Download className="h-3.5 w-3.5" /> Export
          </a>
          <AddTransactionDialog
            accounts={accounts}
            departments={departments}
            onCreated={fetchData}
            defaultDepartment={activeDept !== "ALL" ? activeDept : "SELF"}
          />
          <AddAccountDialog onCreated={fetchData} departments={departments} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "USD Balance", value: formatCurrency(usdBalance, "USD"), icon: DollarSign, color: "#D97757", bg: "#FDF4EE", sub: "Bank & Cash only" },
            { label: "INR Balance", value: formatCurrency(inrBalance, "INR"), icon: IndianRupee, color: "#16A34A", bg: "#F0FDF4", sub: "Bank & Cash only" },
            { label: "Total Debt", value: formatCurrency(totalDebt, "USD"), icon: TrendingDown, color: "#DC2626", bg: "#FEF2F2", sub: `${debtAccounts.length} loans/debts`, red: true },
            { label: "Pending Paybacks", value: pendingPaybacks.length > 0 ? `${pendingPaybacks.length} pending` : "All clear", icon: Clock, color: "#D97706", bg: "#FFFBEB", sub: "To be returned" },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-[#EDE8DF] bg-white p-4 shadow-sm overflow-hidden"
              style={{ background: `linear-gradient(140deg, ${c.bg} 0%, #ffffff 60%)` }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-[#9B9088]">{c.label}</p>
                <div className="p-1.5 rounded-xl" style={{ backgroundColor: c.color + "18" }}>
                  <c.icon className="h-3.5 w-3.5" style={{ color: c.color }} />
                </div>
              </div>
              <p className={`text-xl font-bold tracking-tight ${c.red && totalDebt > 0 ? "text-[#DC2626]" : "text-[#1A1815]"}`}>
                {c.value}
              </p>
              <p className="text-[11px] text-[#9B9088] mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* mobile dept selector */}
        <div className="sm:hidden space-y-2">
          <div className="flex gap-1 bg-white border border-[#EDE8DF] p-1 rounded-xl shadow-sm flex-wrap">
            {ALL_DEPTS.map((d) => (
              <button key={d.value} onClick={() => setActiveDept(d.value)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all min-w-[3rem] ${
                  activeDept === d.value ? "bg-[#D97757] text-white font-semibold" : "text-[#9B9088]"
                }`}>
                {d.label}
              </button>
            ))}
          </div>
          {addingDept ? (
            <div className="flex items-center gap-2 bg-white border border-[#EDE8DF] p-2 rounded-xl shadow-sm">
              <input
                placeholder="New department name"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddDept();
                  if (e.key === "Escape") { setAddingDept(false); setNewDeptName(""); }
                }}
                className="flex-1 text-xs px-2 py-1 border border-[#EDE8DF] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D97757] bg-white text-[#1A1815]"
              />
              <button onClick={handleAddDept} disabled={savingDept || !newDeptName.trim()}
                className="text-xs px-2 py-1 bg-[#D97757] text-white rounded-lg disabled:opacity-40 font-medium">
                Add
              </button>
              <button onClick={() => { setAddingDept(false); setNewDeptName(""); }}
                className="text-xs text-[#9B9088] px-1">✕</button>
            </div>
          ) : (
            <button onClick={openAddDept}
              className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-[#9B9088] bg-white border border-dashed border-[#EDE8DF] rounded-xl hover:border-[#D97757] hover:text-[#D97757] transition-colors">
              <Plus className="h-3 w-3" /> Add Department
            </button>
          )}
        </div>

        {/* ── Category breakdown (clickable) ── */}
        {!loading && allTransactions.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#EDE8DF] shadow-sm p-4">
            <CategoryBreakdown transactions={allTransactions} />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#9B9088] text-sm">Loading…</div>
        ) : (
          <>
            {/* mobile tab switcher */}
            <div className="flex lg:hidden gap-1 bg-white border border-[#EDE8DF] p-1 rounded-xl shadow-sm overflow-x-auto">
              {(["accounts", "transactions", "owing", "loans", "bills"] as const).map((t) => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`flex-1 min-w-[4.5rem] py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    activeTab === t ? "bg-[#D97757] text-white" : "text-[#9B9088] hover:text-[#D97757]"
                  }`}>{t}</button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

              {/* ── Left: Accounts panel ── */}
              <div className={`lg:col-span-3 space-y-4 ${activeTab !== "accounts" ? "hidden lg:block" : ""}`}>

                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-[#D97757] uppercase tracking-widest">Accounts</h2>
                  <span className="text-xs text-[#9B9088]">{accounts.length} total</span>
                </div>

                {accounts.length === 0 ? (
                  <div className="bg-white rounded-2xl border-2 border-dashed border-[#EDE8DF] py-16 text-center">
                    <p className="text-sm text-[#9B9088] font-medium">No accounts yet</p>
                    <p className="text-xs text-[#C4B8A8] mt-1">Click "Add Account" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accountsByType.map(({ type, accounts: typeAccounts }) => (
                      <AccountTypeGroup
                        key={type}
                        type={type}
                        accounts={typeAccounts}
                        onUpdated={fetchData}
                        departments={departments}
                      />
                    ))}
                  </div>
                )}

                {pendingPaybacks.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-[#D97706] uppercase tracking-widest mb-2">
                      Pending Paybacks · {pendingPaybacks.length}
                    </h3>
                    <div className="bg-white rounded-2xl border border-[#F5D99B] shadow-sm divide-y divide-[#FEF9EE] px-3">
                      {pendingPaybacks.map((t) => (
                        <TransactionRow key={t.id} txn={t} onUpdated={fetchData} accounts={accounts} categories={categories} departments={departments} />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Expected Income (left col, desktop) ── */}
                <div className="hidden lg:block bg-white rounded-2xl border border-[#EDE8DF] shadow-sm p-4">
                  <ExpectedIncomePanel items={expectedIncomes} onUpdated={fetchData} accounts={accounts} departments={departments} />
                </div>
              </div>

              {/* ── Right column ── */}
              <div className={`lg:col-span-2 space-y-5 ${activeTab === "accounts" ? "hidden lg:block" : ""}`}>

                {/* Transactions with month groups */}
                <div className={activeTab === "owing" || activeTab === "loans" || activeTab === "bills" ? "hidden lg:block" : ""}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-semibold text-[#D97757] uppercase tracking-widest">Transactions</h2>
                    <span className="text-xs text-[#9B9088]">{transactions.length} shown</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-[#EDE8DF] shadow-sm overflow-hidden">
                    {transactions.length === 0 ? (
                      <div className="py-12 text-center text-[#9B9088] text-sm">No transactions yet</div>
                    ) : (
                      <div className="px-3">
                        {monthGroups.map(({ label, txns }) => (
                          <div key={label}>
                            <div className="sticky top-0 z-[1] py-2 -mx-3 px-3 bg-[#FAF9F6] border-b border-[#EDE8DF]">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9B9088]">{label}</p>
                                <div className="flex gap-3 text-[10px]">
                                  {(() => {
                                    const inc = txns.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
                                    const exp = txns.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
                                    const currency = txns[0]?.fromAccount?.currency ?? txns[0]?.toAccount?.currency ?? "USD";
                                    return (
                                      <>
                                        {inc > 0 && <span className="text-emerald-600 font-medium">+{formatCurrency(inc, currency)}</span>}
                                        {exp > 0 && <span className="text-red-500 font-medium">−{formatCurrency(exp, currency)}</span>}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                            {txns.map((t) => (
                              <TransactionRow key={t.id} txn={t} onUpdated={fetchData} accounts={accounts} categories={categories} departments={departments} />
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Owing panel */}
                <div className={`bg-white rounded-2xl border border-[#EDE8DF] shadow-sm p-4 ${activeTab === "transactions" ? "hidden lg:block" : ""} ${activeTab === "loans" || activeTab === "bills" ? "hidden lg:block" : ""}`}>
                  <OwingPanel owings={owings} onUpdated={fetchData} departments={departments} />
                </div>

                {/* Hand Loans panel */}
                <div className={`bg-white rounded-2xl border border-[#EDE8DF] shadow-sm p-4 ${activeTab !== "loans" ? "hidden lg:block" : ""}`}>
                  <HandLoanPanel loans={handLoans} onUpdated={fetchData} accounts={accounts} departments={departments} />
                </div>

                {/* Recurring Bills panel */}
                <div className={`bg-white rounded-2xl border border-[#EDE8DF] shadow-sm p-4 ${activeTab !== "bills" ? "hidden lg:block" : ""}`}>
                  <RecurringBillsPanel bills={recurringBills} onUpdated={fetchData} accounts={accounts} departments={departments} />
                </div>

                {/* Expected Income (mobile / right col) */}
                <div className={`bg-white rounded-2xl border border-[#EDE8DF] shadow-sm p-4 lg:hidden ${activeTab !== "accounts" ? "" : "hidden"}`}>
                  <ExpectedIncomePanel items={expectedIncomes} onUpdated={fetchData} accounts={accounts} departments={departments} />
                </div>

                {/* Given By Summary */}
                {allTransactions.some((t) => t.type === "INCOME" && t.givenBy?.trim()) && (
                  <div className={`bg-white rounded-2xl border border-[#EDE8DF] shadow-sm p-4 ${activeTab === "loans" || activeTab === "bills" ? "hidden lg:block" : ""}`}>
                    <GivenBySummary transactions={allTransactions} />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
