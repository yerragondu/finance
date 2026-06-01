export const ACCOUNT_TYPES = [
  { value: "BANK", label: "Bank Account" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "CASH", label: "Cash" },
  { value: "DEBT", label: "Debt" },
  { value: "LOAN", label: "Loan" },
] as const;

export const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "INR", label: "INR (₹)" },
] as const;

export const DEPARTMENTS = [
  { value: "HOME", label: "Home" },
  { value: "MINISTRY", label: "Ministry" },
  { value: "OFFICE", label: "Office" },
  { value: "SELF", label: "Self" },
] as const;

export const TRANSACTION_TYPES = [
  { value: "EXPENSE", label: "Expense" },
  { value: "INCOME", label: "Income" },
  { value: "TRANSFER", label: "Transfer" },
] as const;

export const CATEGORIES = [
  "Food & Dining",
  "Bills & Utilities",
  "Transport",
  "Shopping",
  "Health",
  "Education",
  "Ministry",
  "Salary",
  "Business Income",
  "Rent",
  "Loan Payment",
  "Credit Card Payment",
  "Bank Transfer",
  "International Transfer",
  "Fee",
  "Other",
] as const;

export const ACCOUNT_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#06b6d4",
];

export function formatCurrency(amount: number, currency: string) {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

export function getAccountTypeLabel(type: string) {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function getDeptLabel(dept: string) {
  return DEPARTMENTS.find((d) => d.value === dept)?.label ?? dept;
}
