import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import { format } from "date-fns";

// Format amount with currency symbol (no separate currency column)
function fmtAmt(amount: number, currency: string, type: string): string {
  const sym = currency === "INR" ? "₹" : "$";
  const abs =
    currency === "INR"
      ? `${sym}${amount.toLocaleString("en-IN")}`
      : `${sym}${amount.toFixed(2)}`;
  return type === "EXPENSE" ? `-${abs}` : abs;
}

function fmtDate(d: Date | string): string {
  return format(new Date(d), "MMM d, yyyy");
}

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D2D6B" } }; // deep indigo
  row.alignment = { vertical: "middle", horizontal: "center" };
  row.height = 24;
}

export async function GET() {
  const [transactions, departments, handLoans, owings] = await Promise.all([
    prisma.transaction.findMany({
      include: { fromAccount: true, toAccount: true },
      orderBy: { date: "asc" }, // oldest → newest, like the original
    }),
    prisma.department.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.handLoan.findMany({ include: { account: true }, orderBy: { createdAt: "asc" } }),
    prisma.owing.findMany({ orderBy: { date: "asc" } }),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "FinanceOS";
  wb.created = new Date();

  // ── One sheet per department ────────────────────────────────────
  for (const dept of departments) {
    const deptTxns = transactions.filter((t) => t.department === dept.value);
    if (deptTxns.length === 0) continue;

    const ws = wb.addWorksheet(dept.label);
    const isMinistry = dept.value === "MINISTRY";

    // Columns matching the original Excel style
    const cols: Partial<ExcelJS.Column>[] = [
      { header: "Date",             key: "date",    width: 14 },
      { header: "Spent Where",      key: "where",   width: 34 },
      { header: "For What Purpose", key: "purpose", width: 24 },
      { header: "How Much",         key: "amount",  width: 16 },
      { header: "Account",          key: "account", width: 20 },
      { header: "Payback",          key: "payback", width: 14 },
    ];
    if (isMinistry) {
      cols.push({ header: "Given By", key: "givenBy", width: 16 });
    }
    ws.columns = cols;
    styleHeader(ws);

    // Track totals for summary row
    const inc: Record<string, number> = {};
    const exp: Record<string, number> = {};

    for (const t of deptTxns) {
      const currency =
        t.fromAccount?.currency ?? t.toAccount?.currency ?? "USD";
      const account =
        t.type === "EXPENSE"
          ? (t.fromAccount?.name ?? t.toAccount?.name ?? "")
          : (t.toAccount?.name ?? t.fromAccount?.name ?? "");

      const rowData: Record<string, string> = {
        date:    fmtDate(t.date),
        where:   t.note || t.category,
        purpose: t.category,
        amount:  fmtAmt(t.amount, currency, t.type),
        account,
        payback: t.paybackExpected && !t.paidBack ? "⚠ Payback" : "",
      };
      if (isMinistry) rowData.givenBy = t.givenBy ?? "";

      const addedRow = ws.addRow(rowData);

      // Row background: green tint = income, red tint = expense, blue tint = transfer
      const bg =
        t.type === "EXPENSE" ? "FFFFF0F0" :
        t.type === "INCOME"  ? "FFF0FFF4" : "FFF0F4FF";
      addedRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
      });

      // Amount cell: bold
      addedRow.getCell("amount").font = { bold: true };

      // Accumulate
      if (t.type === "INCOME")   inc[currency] = (inc[currency] ?? 0) + t.amount;
      if (t.type === "EXPENSE")  exp[currency] = (exp[currency] ?? 0) + t.amount;
    }

    // Blank separator row
    ws.addRow({});

    // Totals summary row
    const parts: string[] = [];
    for (const [cur, val] of Object.entries(inc)) {
      parts.push(`In: ${cur === "INR" ? "₹" : "$"}${cur === "INR" ? val.toLocaleString("en-IN") : val.toFixed(2)}`);
    }
    for (const [cur, val] of Object.entries(exp)) {
      parts.push(`Out: ${cur === "INR" ? "₹" : "$"}${cur === "INR" ? val.toLocaleString("en-IN") : val.toFixed(2)}`);
    }

    const totRow = ws.addRow({
      date:    "TOTALS",
      where:   "",
      purpose: "",
      amount:  parts.join("   |   "),
    });
    totRow.font = { bold: true, size: 11 };
    totRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3CD" } };
    totRow.height = 20;
  }

  // ── Lent to People sheet ────────────────────────────────────────
  if (owings.length > 0) {
    const ws = wb.addWorksheet("Lent to People");
    ws.columns = [
      { header: "Person",     key: "person",   width: 22 },
      { header: "Amount",     key: "amount",   width: 16 },
      { header: "Department", key: "dept",     width: 16 },
      { header: "Date",       key: "date",     width: 14 },
      { header: "Status",     key: "status",   width: 14 },
      { header: "Note",       key: "note",     width: 38 },
    ];
    styleHeader(ws);

    for (const o of owings) {
      const row = ws.addRow({
        person: o.personName,
        amount:
          o.currency === "INR"
            ? `₹${o.amount.toLocaleString("en-IN")}`
            : `$${o.amount.toFixed(2)}`,
        dept:   o.department,
        date:   fmtDate(o.date),
        status: o.status,
        note:   o.note,
      });
      const settled = ["SETTLED", "PAID"].includes(o.status);
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern", pattern: "solid",
          fgColor: { argb: settled ? "FFF0FFF4" : "FFFFFBEB" },
        };
      });
      row.getCell("amount").font = { bold: true };
    }
  }

  // ── Borrowed & Hand Loans sheet ─────────────────────────────────
  if (handLoans.length > 0) {
    const ws = wb.addWorksheet("Borrowed & Lent");
    ws.columns = [
      { header: "Person",     key: "person",   width: 22 },
      { header: "Type",       key: "type",     width: 12 },
      { header: "Amount",     key: "amount",   width: 16 },
      { header: "Department", key: "dept",     width: 16 },
      { header: "Account",    key: "account",  width: 20 },
      { header: "Due Date",   key: "dueDate",  width: 14 },
      { header: "Status",     key: "status",   width: 14 },
      { header: "Note",       key: "note",     width: 38 },
    ];
    styleHeader(ws);

    for (const l of handLoans) {
      const row = ws.addRow({
        person:  l.personName,
        type:    l.type,
        amount:
          l.currency === "INR"
            ? `₹${l.amount.toLocaleString("en-IN")}`
            : `$${l.amount.toFixed(2)}`,
        dept:    l.department,
        account: l.account?.name ?? "",
        dueDate: l.dueDate ? fmtDate(l.dueDate) : "",
        status:  l.status,
        note:    l.note,
      });
      const closed = ["PAID", "SETTLED", "CANCELLED"].includes(l.status);
      const bg =
        closed         ? "FFF3F4F6" :
        l.type === "LENT" ? "FFF0F9FF" : "FFFFFBEB";
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      });
      row.getCell("amount").font = { bold: true };
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="FinanceOS-${format(new Date(), "yyyy-MM-dd")}.xlsx"`,
    },
  });
}
