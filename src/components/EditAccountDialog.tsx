"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACCOUNT_TYPES,
  CURRENCIES,
  ACCOUNT_COLORS,
} from "@/lib/constants";
import { Pencil, Trash2 } from "lucide-react";

type Account = {
  id: string;
  name: string;
  type: string;
  currency: string;
  department: string;
  balance: number;
  creditLimit?: number | null;
  color: string;
};

type Dept = { value: string; label: string };
type Props = {
  account: Account;
  onUpdated: () => void;
  departments?: Dept[];
};

export function EditAccountDialog({ account, onUpdated, departments = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    name: account.name,
    type: account.type,
    currency: account.currency,
    department: account.department,
    balance: String(account.balance),
    creditLimit: account.creditLimit != null ? String(account.creditLimit) : "",
    color: account.color,
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: account.name,
        type: account.type,
        currency: account.currency,
        department: account.department,
        balance: String(account.balance),
        creditLimit: account.creditLimit != null ? String(account.creditLimit) : "",
        color: account.color,
      });
      setConfirmDelete(false);
    }
  }, [open, account]);

  const isCC = form.type === "CREDIT_CARD";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        balance: Number(form.balance),
        creditLimit: isCC && form.creditLimit ? Number(form.creditLimit) : null,
      }),
    });
    setLoading(false);
    setOpen(false);
    onUpdated();
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
    setDeleting(false);
    setOpen(false);
    onUpdated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button className="p-1.5 rounded-lg hover:bg-black/8 transition-colors text-muted-foreground hover:text-foreground" />}>
        <Pencil className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Account Name</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => v && setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Department</Label>
              <Select value={form.department} onValueChange={(v) => v && setForm({ ...form, department: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isCC && (
              <div className="space-y-1">
                <Label>Balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.balance}
                  onChange={(e) => setForm({ ...form, balance: e.target.value })}
                />
              </div>
            )}
          </div>

          {isCC && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Total Limit</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 5000"
                    value={form.creditLimit}
                    onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Available Limit</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 2000"
                    value={form.balance}
                    onChange={(e) => setForm({ ...form, balance: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-violet-50 border border-violet-100">
                <span className="text-xs text-violet-600 font-medium">Due (auto)</span>
                <span className="text-sm font-bold text-slate-800">
                  {form.creditLimit && form.balance
                    ? (Number(form.creditLimit) - Number(form.balance)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : "—"}
                </span>
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {ACCOUNT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: form.color === c ? "#000" : "transparent" }}
                  onClick={() => setForm({ ...form, color: c })}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant={confirmDelete ? "destructive" : "outline"}
              disabled={deleting}
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {confirmDelete ? "Confirm" : "Delete"}
            </Button>
          </div>
          {confirmDelete && (
            <p className="text-xs text-destructive text-center -mt-2">
              Click Confirm to permanently delete this account.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
