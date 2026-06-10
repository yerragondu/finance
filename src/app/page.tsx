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
import { TrendingDown, Download, Plus, Check, X, Landmark, CreditCard, HandCoins, Users, ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from "lucide-react";

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
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [owings, setOwings] = useState<Owing[]>([]);
  const [handLoans, setHandLoans] = useState<HandLoan[]>([]);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [expectedIncomes, setExpectedIncomes] = useState<ExpectedIncome[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [activeDept, setActiveDept] = useState("ALL");
  const [selectedCard, setSelectedCard] = useState<"banks" | "creditcards" | "loans" | "borrowed" | "lent">("banks");
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

    const [accs, allTxns, ows, cats, loans, bills, expected] = await Promise.all([
      fetch(`/api/accounts${deptParam}`).then((r) => r.json()),
      fetch(`/api/transactions?limit=100000`).then((r) => r.json()), // always ALL txns for cross-dept support
      fetch(`/api/owing${loanParam}`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.ok ? r.json() : []),
      fetch(`/api/handloans${loanParam}`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/recurring-bills${loanParam}`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/expected-income${loanParam}`).then((r) => r.ok ? r.json() : []),
    ]);

    setAccounts(Array.isArray(accs) ? accs : []);
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
  const totalDebtUSD = debtAccounts.filter(a => a.currency === "USD").reduce((s, a) => s + a.balance, 0);
  const totalDebtINR = debtAccounts.filter(a => a.currency === "INR").reduce((s, a) => s + a.balance, 0);
  const totalDebt = totalDebtUSD + totalDebtINR / 84; // unified scalar for red-flag logic
  const pendingPaybacks = (activeDept === "ALL" ? allTransactions : allTransactions.filter(t => t.department === activeDept)).filter((t) => t.paybackExpected && !t.paidBack);

  // Per-card calculations
  const bankCashAccounts = accounts.filter(a => ["BANK","CASH"].includes(a.type));
  const ccAccounts       = accounts.filter(a => a.type === "CREDIT_CARD");
  const loanDebtAccts    = accounts.filter(a => ["LOAN","DEBT"].includes(a.type));

  const bankUSD = bankCashAccounts.filter(a => a.currency==="USD").reduce((s,a) => s+a.balance,0);
  const bankINR = bankCashAccounts.filter(a => a.currency==="INR").reduce((s,a) => s+a.balance,0);

  const ccUsedUSD  = ccAccounts.filter(a => a.currency==="USD").reduce((s,a) => s+a.balance,0);
  const ccUsedINR  = ccAccounts.filter(a => a.currency==="INR").reduce((s,a) => s+a.balance,0);
  const ccLimitUSD = ccAccounts.filter(a => a.currency==="USD").reduce((s,a) => s+(a.creditLimit??0),0);
  const ccLimitINR = ccAccounts.filter(a => a.currency==="INR").reduce((s,a) => s+(a.creditLimit??0),0);

  const activeOwings = owings.filter(o => o.status !== "SETTLED" && o.status !== "PAID");

  // Only BORROWED type counts toward "Borrowed from People"; LENT type rolls into "Lent to People"
  const CLOSED = ["PAID", "SETTLED", "CANCELLED"];
  const activeBorrowed = handLoans.filter(hl => hl.type === "BORROWED" && !CLOSED.includes(hl.status));
  const activeLentHand = handLoans.filter(hl => hl.type === "LENT"     && !CLOSED.includes(hl.status));

  const borrowedUSD = activeBorrowed.filter(hl => hl.currency==="USD").reduce((s,hl) => s+hl.amount, 0);
  const borrowedINR = activeBorrowed.filter(hl => hl.currency==="INR").reduce((s,hl) => s+hl.amount, 0);

  // Lent = owings + hand-lent (both types)
  const lentUSD = activeOwings.filter(o => o.currency==="USD").reduce((s,o) => s+o.amount, 0)
                + activeLentHand.filter(hl => hl.currency==="USD").reduce((s,hl) => s+hl.amount, 0);
  const lentINR = activeOwings.filter(o => o.currency==="INR").reduce((s,o) => s+o.amount, 0)
                + activeLentHand.filter(hl => hl.currency==="INR").reduce((s,hl) => s+hl.amount, 0);

  // CC transactions = any txn where from/to account is a CC
  const ccAccountIds = new Set(ccAccounts.map(a => a.id));
  const ccTransactions = allTransactions.filter(t =>
    (t.fromAccount?.id && ccAccountIds.has(t.fromAccount.id)) ||
    (t.toAccount?.id   && ccAccountIds.has(t.toAccount.id))
  );

  // Dept-scoped transactions for display (filter from allTransactions client-side)
  const deptTransactions = activeDept === "ALL"
    ? allTransactions
    : allTransactions.filter(t => t.department === activeDept);

  // Cross-dept: txns created in OTHER dept but using THIS dept's accounts
  const deptAccountIds = new Set(accounts.map(a => a.id));
  const crossDeptTxns = activeDept === "ALL" ? [] : allTransactions.filter(t =>
    t.department !== activeDept &&
    ((t.fromAccount?.id && deptAccountIds.has(t.fromAccount.id)) ||
     (t.toAccount?.id   && deptAccountIds.has(t.toAccount.id)))
  );
  // Set for O(1) cross-dept lookup when rendering
  const crossDeptSet = new Set(crossDeptTxns.map(t => t.id));
  // Merged display list: own txns + cross-dept txns, sorted by date
  const allDeptDisplay = [...deptTransactions, ...crossDeptTxns].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Totals for current dept
  const incomeTxns  = deptTransactions.filter(t => t.type === "INCOME");
  const expenseTxns = deptTransactions.filter(t => t.type === "EXPENSE");
  const totalInUSD  = incomeTxns.filter(t  => (t.toAccount?.currency   ?? t.fromAccount?.currency) === "USD").reduce((s,t) => s+t.amount, 0);
  const totalInINR  = incomeTxns.filter(t  => (t.toAccount?.currency   ?? t.fromAccount?.currency) === "INR").reduce((s,t) => s+t.amount, 0);
  const totalOutUSD = expenseTxns.filter(t => (t.fromAccount?.currency ?? t.toAccount?.currency)   === "USD").reduce((s,t) => s+t.amount, 0);
  const totalOutINR = expenseTxns.filter(t => (t.fromAccount?.currency ?? t.toAccount?.currency)   === "INR").reduce((s,t) => s+t.amount, 0);
  const pendingPaybackUSD = pendingPaybacks
    .filter(t => (t.fromAccount?.currency ?? t.toAccount?.currency ?? "USD") === "USD")
    .reduce((s,t) => s + t.amount, 0);
  const pendingPaybackINR = pendingPaybacks
    .filter(t => (t.fromAccount?.currency ?? t.toAccount?.currency ?? "USD") === "INR")
    .reduce((s,t) => s + t.amount, 0);

  // Account type grouping
  const accountsByType = ACCOUNT_TYPE_ORDER
    .map((type) => ({ type, accounts: accounts.filter((a) => a.type === type) }))
    .filter((g) => g.accounts.length > 0);

  // Month-wise transaction groups
  const monthGroups = groupByMonth(allTransactions);

  // Upcoming recurring bills (next 7 days)
  const today = new Date();
  const urgentBills = recurringBills.filter((b) => {
    const day = b.dayOfMonth;
    const currentDay = today.getDate();
    const daysLeft = day >= currentDay ? day - currentDay : (new Date(today.getFullYear(), today.getMonth() + 1, day).getDate() + (30 - currentDay));
    return daysLeft <= 7;
  });

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #EEEEFF 0%, #F3F4FF 40%, #EFF6FF 100%)" }}>

      {/* ══ HEADER ══ */}
      <header className="px-6 h-14 flex items-center justify-between sticky top-0 z-10 shadow-lg" style={{ background: "linear-gradient(135deg, #1a1a3e 0%, #12122e 100%)" }}>
        <div className="flex items-center gap-4">
          <h1 className="text-[15px] font-bold tracking-tight shrink-0 text-white">
            Finance<span className="text-[#818CF8]">OS</span>
          </h1>

          {/* Dept tabs */}
          <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>
            {ALL_DEPTS.map((d) => (
              <button key={d.value} onClick={() => setActiveDept(d.value)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeDept === d.value
                    ? "text-white shadow-lg"
                    : "text-[#8B8FB8] hover:text-white"
                }`}
                style={activeDept === d.value ? { background: "linear-gradient(135deg, #6366F1, #8B5CF6)" } : {}}>
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
                  className="px-2 py-0.5 text-xs rounded-md border border-[#6366F1] w-24 focus:outline-none focus:ring-1 focus:ring-[#6366F1] bg-[#0F172A] text-white placeholder:text-[#475569]"
                />
                <button onClick={handleAddDept} disabled={savingDept || !newDeptName.trim()}
                  className="p-0.5 text-[#818CF8] hover:text-white disabled:opacity-40">
                  <Check className="h-3 w-3" />
                </button>
                <button onClick={() => { setAddingDept(false); setNewDeptName(""); }}
                  className="p-0.5 text-[#64748B] hover:text-white">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button onClick={openAddDept}
                className="ml-0.5 px-1.5 py-1 rounded-md text-[#64748B] hover:text-white transition-all"
                title="Add department">
                <Plus className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a href="/api/export" download
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#334155] text-[#94A3B8] hover:bg-[#334155] hover:text-white transition-colors">
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

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5">

        {/* Mobile dept selector */}
        <div className="sm:hidden flex gap-1 bg-[#1E293B] p-1 rounded-xl shadow-sm overflow-x-auto mb-4">
          {ALL_DEPTS.map((d) => (
            <button key={d.value} onClick={() => setActiveDept(d.value)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all min-w-[3rem] ${
                activeDept === d.value ? "bg-[#6366F1] text-white font-semibold" : "text-[#94A3B8]"
              }`}>{d.label}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#64748B] text-sm">Loading…</div>
        ) : (

          /* ══ MAIN GRID: [card][card][card][card][card] | [donut]
                          [   detail panel (col-span-5)  ] | [donut] */
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr)) 270px" }}
          >

            {/* ── Card 1: Banks & Cash ── */}
            <DashCard
              title="Banks & Cash" icon={<Landmark className="h-4 w-4" />}
              color="#059669" bg="#ECFDF5" border="#A7F3D0"
              active={selectedCard === "banks"}
              onClick={() => setSelectedCard("banks")}
              sub={`${bankCashAccounts.length} account${bankCashAccounts.length !== 1 ? "s" : ""}`}
            >
              {bankUSD > 0 && <p className="text-[19px] font-extrabold text-slate-800 leading-tight">{formatCurrency(bankUSD, "USD")}</p>}
              {bankINR > 0 && <p className="text-[19px] font-extrabold text-slate-800 leading-tight">{formatCurrency(bankINR, "INR")}</p>}
              {bankUSD === 0 && bankINR === 0 && <p className="text-[17px] font-bold text-slate-300">$0.00</p>}
            </DashCard>

            {/* ── Card 2: Credit Cards ── */}
            <DashCard
              title="Credit Cards" icon={<CreditCard className="h-4 w-4" />}
              color="#7C3AED" bg="#F5F3FF" border="#DDD6FE"
              active={selectedCard === "creditcards"}
              onClick={() => setSelectedCard("creditcards")}
              sub={`${ccAccounts.length} card${ccAccounts.length !== 1 ? "s" : ""}`}
            >
              {ccUsedUSD > 0 && (
                <div>
                  <p className="text-[19px] font-extrabold text-violet-700 leading-tight">{formatCurrency(ccUsedUSD, "USD")}</p>
                  {ccLimitUSD > 0 && <p className="text-[10px] text-slate-400">of {formatCurrency(ccLimitUSD, "USD")} limit</p>}
                </div>
              )}
              {ccUsedINR > 0 && (
                <div>
                  <p className="text-[19px] font-extrabold text-violet-700 leading-tight">{formatCurrency(ccUsedINR, "INR")}</p>
                  {ccLimitINR > 0 && <p className="text-[10px] text-slate-400">of {formatCurrency(ccLimitINR, "INR")} limit</p>}
                </div>
              )}
              {ccUsedUSD === 0 && ccUsedINR === 0 && <p className="text-[17px] font-bold text-slate-300">None</p>}
            </DashCard>

            {/* ── Card 3: Total Loans ── */}
            <DashCard
              title="Total Loans" icon={<TrendingDown className="h-4 w-4" />}
              color="#DC2626" bg="#FEF2F2" border="#FECACA"
              active={selectedCard === "loans"}
              onClick={() => setSelectedCard("loans")}
              sub={`${loanDebtAccts.length} account${loanDebtAccts.length !== 1 ? "s" : ""}`}
            >
              {totalDebtINR > 0 && <p className="text-[19px] font-extrabold text-red-600 leading-tight">{formatCurrency(totalDebtINR, "INR")}</p>}
              {totalDebtUSD > 0 && <p className="text-[19px] font-extrabold text-red-600 leading-tight">{formatCurrency(totalDebtUSD, "USD")}</p>}
              {totalDebt === 0 && <p className="text-[17px] font-bold text-slate-300">None</p>}
            </DashCard>

            {/* ── Card 4: Borrowed from People ── */}
            <DashCard
              title="Borrowed from People" icon={<HandCoins className="h-4 w-4" />}
              color="#D97706" bg="#FFFBEB" border="#FDE68A"
              active={selectedCard === "borrowed"}
              onClick={() => setSelectedCard("borrowed")}
              sub={`${activeBorrowed.length} active`}
            >
              {borrowedINR > 0 && <p className="text-[19px] font-extrabold text-amber-700 leading-tight">{formatCurrency(borrowedINR, "INR")}</p>}
              {borrowedUSD > 0 && <p className="text-[19px] font-extrabold text-amber-700 leading-tight">{formatCurrency(borrowedUSD, "USD")}</p>}
              {borrowedINR === 0 && borrowedUSD === 0 && <p className="text-[17px] font-bold text-slate-300">None</p>}
            </DashCard>

            {/* ── Card 5: Lent to People ── */}
            <DashCard
              title="Lent to People" icon={<Users className="h-4 w-4" />}
              color="#0284C7" bg="#F0F9FF" border="#BAE6FD"
              active={selectedCard === "lent"}
              onClick={() => setSelectedCard("lent")}
              sub={`${activeOwings.length + activeLentHand.length} pending`}
            >
              {lentINR > 0 && <p className="text-[19px] font-extrabold text-sky-700 leading-tight">{formatCurrency(lentINR, "INR")}</p>}
              {lentUSD > 0 && <p className="text-[19px] font-extrabold text-sky-700 leading-tight">{formatCurrency(lentUSD, "USD")}</p>}
              {lentINR === 0 && lentUSD === 0 && <p className="text-[17px] font-bold text-slate-300">None</p>}
            </DashCard>

            {/* ── Donut Chart — spans rows 1 & 2 ── */}
            <div className="row-span-2 bg-white rounded-2xl border border-sky-100 shadow-md p-4 flex flex-col min-h-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Spending Summary</p>
              {deptTransactions.length > 0
                ? <DonutChart transactions={deptTransactions} />
                : <div className="flex-1 flex items-center justify-center text-sm text-slate-300">No transactions yet</div>
              }
            </div>

            {/* ── Detail Panel — col-span-5 ── */}
            <div className="col-span-5 bg-white rounded-2xl border border-sky-100 shadow-md overflow-auto" style={{ maxHeight: "calc(100vh - 220px)", minHeight: "480px" }}>

              {/* Banks & Cash */}
              {selectedCard === "banks" && (
                <div className="p-5 space-y-5">

                  {/* ── Totals summary bar ── */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="rounded-xl p-3" style={{ background: "linear-gradient(135deg,#ECFDF5,#D1FAE5)" }}>
                      <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total In</p>
                      {totalInUSD > 0 && <p className="text-[15px] font-extrabold text-emerald-700 leading-tight">+{formatCurrency(totalInUSD,"USD")}</p>}
                      {totalInINR > 0 && <p className="text-[15px] font-extrabold text-emerald-700 leading-tight">+{formatCurrency(totalInINR,"INR")}</p>}
                      {totalInUSD === 0 && totalInINR === 0 && <p className="text-[13px] font-bold text-emerald-400">—</p>}
                      <p className="text-[9px] text-emerald-600 mt-0.5">{incomeTxns.length} transactions</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: "linear-gradient(135deg,#FEF2F2,#FECACA)" }}>
                      <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest mb-1">Total Out</p>
                      {totalOutUSD > 0 && <p className="text-[15px] font-extrabold text-red-600 leading-tight">−{formatCurrency(totalOutUSD,"USD")}</p>}
                      {totalOutINR > 0 && <p className="text-[15px] font-extrabold text-red-600 leading-tight">−{formatCurrency(totalOutINR,"INR")}</p>}
                      {totalOutUSD === 0 && totalOutINR === 0 && <p className="text-[13px] font-bold text-red-300">—</p>}
                      <p className="text-[9px] text-red-500 mt-0.5">{expenseTxns.length} transactions</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: "linear-gradient(135deg,#FFF7ED,#FED7AA)" }}>
                      <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">Pending Paybacks</p>
                      <p className="text-[15px] font-extrabold text-amber-700 leading-tight">{pendingPaybacks.length > 0 ? `${pendingPaybacks.length} items` : "—"}</p>
                      {pendingPaybackUSD > 0 && <p className="text-[9px] text-amber-600 mt-0.5">{formatCurrency(pendingPaybackUSD,"USD")}</p>}
                      {pendingPaybackINR > 0 && <p className="text-[9px] text-amber-600 mt-0.5">{formatCurrency(pendingPaybackINR,"INR")}</p>}
                    </div>
                    <div className="rounded-xl p-3" style={{ background: "linear-gradient(135deg,#EFF6FF,#BFDBFE)" }}>
                      <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1">Cross-Dept Txns</p>
                      <p className="text-[15px] font-extrabold text-blue-700 leading-tight">{crossDeptTxns.length > 0 ? crossDeptTxns.length : "—"}</p>
                      {crossDeptTxns.length > 0 && <p className="text-[9px] text-blue-500 mt-0.5">from other depts</p>}
                    </div>
                  </div>

                  {/* Ministry: Given By summary */}
                  {activeDept === "MINISTRY" && deptTransactions.some(t => t.type === "INCOME" && t.givenBy?.trim()) && (
                    <div>
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Given By — Ministry Income Sources</p>
                      <GivenBySummary transactions={deptTransactions} />
                    </div>
                  )}

                  {/* Accounts */}
                  {bankCashAccounts.length === 0
                    ? <p className="text-sm text-slate-400 text-center py-8">No bank or cash accounts yet</p>
                    : <div className="space-y-3">
                        {accountsByType.filter(g => ["BANK","CASH"].includes(g.type)).map(({type, accounts: a}) => (
                          <AccountTypeGroup key={type} type={type} accounts={a} onUpdated={fetchData} departments={departments} />
                        ))}
                      </div>
                  }

                  {/* Pending paybacks */}
                  {pendingPaybacks.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Pending Paybacks · {pendingPaybacks.length}</p>
                      <div className="bg-amber-50 rounded-xl border border-amber-100 px-3 divide-y divide-amber-50">
                        {pendingPaybacks.map(t => (
                          <TransactionRow key={t.id} txn={t} onUpdated={fetchData} accounts={accounts} categories={categories} departments={departments} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Money In / Money Out / Transfers split (includes cross-dept txns inline) ── */}
                  {allDeptDisplay.length > 0 && (() => {
                    const incoming  = allDeptDisplay.filter(t => t.type === "INCOME");
                    const outgoing  = allDeptDisplay.filter(t => t.type === "EXPENSE");
                    const transfers = allDeptDisplay.filter(t => t.type === "TRANSFER");
                    const inGroups  = groupByMonth(incoming);
                    const outGroups = groupByMonth(outgoing);
                    const trGroups  = groupByMonth(transfers);

                    // Render a row — cross-dept ones get a left-border + source badge
                    function TxnRow(t: Transaction) {
                      const isCross = crossDeptSet.has(t.id);
                      return (
                        <div key={t.id} className={isCross ? "-mx-3 px-3 border-l-2 border-blue-400 bg-blue-50/40" : ""}>
                          {isCross && (
                            <div className="pt-1.5">
                              <span className="inline-flex items-center gap-1 text-[8px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">
                                <ArrowLeftRight className="h-2 w-2" /> {t.department}
                              </span>
                            </div>
                          )}
                          <TransactionRow txn={t} onUpdated={fetchData} accounts={accounts} categories={categories} departments={departments} />
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
                              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Money In · {incoming.length}</p>
                            </div>
                            {incoming.length === 0
                              ? <p className="text-xs text-slate-400 py-4 text-center">No income yet</p>
                              : <div className="space-y-4">{inGroups.map(({ label, txns }) => (
                                  <div key={label}>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">{label}</p>
                                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 px-3 divide-y divide-emerald-50 overflow-hidden">
                                      {txns.map(t => TxnRow(t))}
                                    </div>
                                  </div>
                                ))}</div>
                            }
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
                              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Money Out · {outgoing.length}</p>
                            </div>
                            {outgoing.length === 0
                              ? <p className="text-xs text-slate-400 py-4 text-center">No expenses yet</p>
                              : <div className="space-y-4">{outGroups.map(({ label, txns }) => (
                                  <div key={label}>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">{label}</p>
                                    <div className="rounded-xl border border-red-100 bg-red-50/30 px-3 divide-y divide-red-50 overflow-hidden">
                                      {txns.map(t => TxnRow(t))}
                                    </div>
                                  </div>
                                ))}</div>
                            }
                          </div>
                        </div>

                        {/* Transfers (CC payments, account-to-account moves) */}
                        {transfers.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <ArrowLeftRight className="h-3.5 w-3.5 text-indigo-500" />
                              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Transfers · {transfers.length}</p>
                            </div>
                            <div className="space-y-4">{trGroups.map(({ label, txns }) => (
                              <div key={label}>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">{label}</p>
                                <div className="rounded-xl border border-indigo-100 bg-indigo-50/20 px-3 divide-y divide-indigo-50 overflow-hidden">
                                  {txns.map(t => TxnRow(t))}
                                </div>
                              </div>
                            ))}</div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                </div>
              )}

              {/* Credit Cards */}
              {selectedCard === "creditcards" && (
                <div className="p-5 space-y-5">
                  <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Credit Cards — Balances & Transactions</p>
                  {ccAccounts.length === 0
                    ? <p className="text-sm text-slate-400 text-center py-8">No credit cards yet</p>
                    : <div className="space-y-3">
                        {accountsByType.filter(g => g.type === "CREDIT_CARD").map(({type, accounts: a}) => (
                          <AccountTypeGroup key={type} type={type} accounts={a} onUpdated={fetchData} departments={departments} />
                        ))}
                      </div>
                  }
                  {ccTransactions.length > 0 && (() => {
                    const ccIn       = ccTransactions.filter(t => t.type === "INCOME");
                    const ccOut      = ccTransactions.filter(t => t.type === "EXPENSE");
                    // CC Payments = transfers where the destination is a CC account
                    const ccPayments = ccTransactions.filter(t =>
                      t.type === "TRANSFER" && t.toAccount?.id && ccAccountIds.has(t.toAccount.id)
                    );
                    const ccInGroups       = groupByMonth(ccIn);
                    const ccOutGroups      = groupByMonth(ccOut);
                    const ccPaymentGroups  = groupByMonth(ccPayments);
                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
                              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">CC Income · {ccIn.length}</p>
                            </div>
                            {ccIn.length === 0
                              ? <p className="text-xs text-slate-400 py-3 text-center">No income via CC</p>
                              : <div className="space-y-4">{ccInGroups.map(({label,txns}) => (
                                  <div key={label}>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">{label}</p>
                                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 px-3 divide-y divide-emerald-50">
                                      {txns.map(t => <TransactionRow key={t.id} txn={t} onUpdated={fetchData} accounts={accounts} categories={categories} departments={departments} />)}
                                    </div>
                                  </div>
                                ))}</div>
                            }
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <ArrowUpRight className="h-3.5 w-3.5 text-violet-500" />
                              <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">CC Charges · {ccOut.length}</p>
                            </div>
                            {ccOut.length === 0
                              ? <p className="text-xs text-slate-400 py-3 text-center">No charges yet</p>
                              : <div className="space-y-4">{ccOutGroups.map(({label,txns}) => (
                                  <div key={label}>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">{label}</p>
                                    <div className="rounded-xl border border-violet-100 bg-violet-50/30 px-3 divide-y divide-violet-50">
                                      {txns.map(t => <TransactionRow key={t.id} txn={t} onUpdated={fetchData} accounts={accounts} categories={categories} departments={departments} />)}
                                    </div>
                                  </div>
                                ))}</div>
                            }
                          </div>
                        </div>

                        {/* CC Payments (transfers from bank/cash → CC) */}
                        {ccPayments.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <ArrowLeftRight className="h-3.5 w-3.5 text-teal-500" />
                              <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">CC Payments · {ccPayments.length}</p>
                              <span className="text-[9px] text-slate-400">paid from bank / cash</span>
                            </div>
                            <div className="space-y-4">{ccPaymentGroups.map(({label,txns}) => (
                              <div key={label}>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">{label}</p>
                                <div className="rounded-xl border border-teal-200 bg-teal-50/30 px-3 divide-y divide-teal-100">
                                  {txns.map(t => <TransactionRow key={t.id} txn={t} onUpdated={fetchData} accounts={accounts} categories={categories} departments={departments} />)}
                                </div>
                              </div>
                            ))}</div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Loans */}
              {selectedCard === "loans" && (
                <div className="p-5 space-y-5">
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Loans & Debt — Total Amount</p>
                  {loanDebtAccts.length === 0
                    ? <p className="text-sm text-slate-400 text-center py-8">No loan or debt accounts</p>
                    : <div className="space-y-3">
                        {accountsByType.filter(g => ["LOAN","DEBT"].includes(g.type)).map(({type, accounts: a}) => (
                          <AccountTypeGroup key={type} type={type} accounts={a} onUpdated={fetchData} departments={departments} />
                        ))}
                      </div>
                  }
                  <RecurringBillsPanel bills={recurringBills} onUpdated={fetchData} accounts={accounts} departments={departments} />
                </div>
              )}

              {/* Borrowed from People — only BORROWED type */}
              {selectedCard === "borrowed" && (
                <div className="p-5">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-4">Money Borrowed from People</p>
                  <HandLoanPanel loans={handLoans.filter(hl => hl.type === "BORROWED")} onUpdated={fetchData} accounts={accounts} departments={departments} />
                </div>
              )}

              {/* Lent to People — owings + hand-lent */}
              {selectedCard === "lent" && (
                <div className="p-5 space-y-5">
                  <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">Money Lent to People</p>
                  <OwingPanel owings={owings} onUpdated={fetchData} departments={departments} />
                  {activeLentHand.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest mb-3">Hand Loans — Lent</p>
                      <HandLoanPanel loans={handLoans.filter(hl => hl.type === "LENT")} onUpdated={fetchData} accounts={accounts} departments={departments} />
                    </div>
                  )}
                  <ExpectedIncomePanel items={expectedIncomes} onUpdated={fetchData} accounts={accounts} departments={departments} />
                  {activeDept === "MINISTRY" && deptTransactions.some(t => t.type === "INCOME" && t.givenBy?.trim()) && (
                    <GivenBySummary transactions={deptTransactions} />
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

/* ── DashCard ── */
function DashCard({ title, icon, color, bg, border, active, onClick, sub, children }: {
  title: string; icon: React.ReactNode; color: string; bg: string; border: string;
  active: boolean; onClick: () => void; sub: string; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
      className="text-left rounded-2xl border p-4 transition-all duration-200 cursor-pointer w-full group"
      style={{
        background: active
          ? `linear-gradient(145deg, ${bg} 0%, #fff 60%)`
          : "rgba(255,255,255,0.85)",
        borderColor: active ? color : border,
        boxShadow: active
          ? `0 0 0 2px ${color}44, 0 8px 24px ${color}18`
          : "0 2px 8px rgba(99,102,241,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        backdropFilter: "blur(8px)",
      }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[9px] font-bold uppercase tracking-widest leading-tight" style={{ color: active ? color : "#94A3B8" }}>{title}</p>
        <div className="p-1.5 rounded-xl shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: color + "18" }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <div className="space-y-0.5">{children}</div>
      <p className="text-[10px] text-slate-400 mt-2 font-medium">{sub}</p>
      {active && <div className="mt-3 h-[3px] rounded-full w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />}
    </button>
  );
}

/* ── DonutChart ── */
const DONUT_COLORS: Record<string, string> = {
  "Food & Dining":"#f97316","Bills & Utilities":"#6366f1","Transport":"#3b82f6",
  "Shopping":"#ec4899","Health":"#ef4444","Education":"#8b5cf6","Ministry":"#14b8a6",
  "Rent":"#f59e0b","Loan Payment":"#dc2626","Credit Card Payment":"#7c3aed",
  "Bank Transfer":"#64748b","International Transfer":"#0ea5e9","Fee":"#94a3b8","Other":"#a8a29e",
};
const FALLBACK_COLORS = ["#D97757","#16A34A","#2563EB","#9333EA","#0891B2","#DB2777","#65A30D","#B45309"];
function donutColor(cat: string, idx: number) { return DONUT_COLORS[cat] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length]; }

function DonutChart({ transactions }: { transactions: { type: string; amount: number; category: string; fromAccount?: { currency: string } | null; toAccount?: { currency: string } | null }[] }) {
  const expenses = transactions.filter(t => t.type === "EXPENSE");
  const map: Record<string, number> = {};
  for (const t of expenses) {
    const cur = t.fromAccount?.currency ?? t.toAccount?.currency ?? "USD";
    map[t.category] = (map[t.category] ?? 0) + (cur === "USD" ? t.amount : t.amount / 84);
  }
  const cats = Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 8);
  const total = cats.reduce((s,[,v]) => s+v, 0);
  if (cats.length === 0) return <p className="text-xs text-[#C4B8A8] text-center py-4">No expenses</p>;

  const r = 52, cx = 60, cy = 60, circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-3 flex-1">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F0EBE3" strokeWidth="20" />
        {cats.map(([cat, val], idx) => {
          const dash = (val / total) * circ;
          const el = (
            <circle key={cat} cx={cx} cy={cy} r={r} fill="none"
              stroke={donutColor(cat, idx)} strokeWidth="20"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }} />
          );
          offset += dash;
          return el;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#1E293B" fontSize="10" fontWeight="700">{cats.length}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="#94A3B8" fontSize="8">categories</text>
      </svg>
      <div className="w-full space-y-1 overflow-y-auto" style={{ maxHeight: "220px" }}>
        {cats.map(([cat, val], idx) => (
          <div key={cat} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: donutColor(cat, idx) }} />
              <span className="text-[11px] text-slate-500 truncate">{cat}</span>
            </div>
            <span className="text-[11px] font-bold text-slate-700 shrink-0">{((val/total)*100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
