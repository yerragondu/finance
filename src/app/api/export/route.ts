import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET() {
  const [transactions, departments, handLoans, recurringBills, owings] = await Promise.all([
    prisma.transaction.findMany({
      include: { fromAccount: true, toAccount: true, splits: true },
      orderBy: { date: "desc" },
    }),
    prisma.department.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.handLoan.findMany({ include: { account: true }, orderBy: { createdAt: "desc" } }),
    prisma.recurringBill.findMany({ include: { account: true }, orderBy: { dayOfMonth: "asc" } }),
    prisma.owing.findMany({ orderBy: { date: "desc" } }),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "FinanceOS";
  wb.created = new Date();

  // ── Summary sheet ────────────────────────────────────────────
  const summarySheet = wb.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Department", key: "dept",     width: 15 },
    { header: "Category",   key: "category", width: 22 },
    { header: "Type",       key: "type",     width: 12 },
    { header: "Total (USD)",key: "totalUSD", width: 14 },
    { header: "Total (INR)",key: "totalINR", width: 14 },
    { header: "Count",      key: "count",    width: 8  },
  ];
  styleHeader(summarySheet);

  const summaryMap: Record<string, Record<string, { usd: number; inr: number; count: number; type: string }>> = {};
  for (const t of transactions) {
    const currency = t.fromAccount?.currency ?? t.toAccount?.currency ?? "USD";
    const key = `${t.department}__${t.category}__${t.type}`;
    if (!summaryMap[t.department]) summaryMap[t.department] = {};
    if (!summaryMap[t.department][key]) {
      summaryMap[t.department][key] = { usd: 0, inr: 0, count: 0, type: t.type };
    }
    summaryMap[t.department][key].count += 1;
    if (currency === "USD") summaryMap[t.department][key].usd += t.amount;
    else summaryMap[t.department][key].inr += t.amount;
  }

  for (const dept of departments) {
    if (!summaryMap[dept.value]) continue;
    for (const key of Object.keys(summaryMap[dept.value])) {
      const [, category] = key.split("__");
      const d = summaryMap[dept.value][key];
      summarySheet.addRow({
        dept: dept.label, category, type: d.type,
        totalUSD: d.usd > 0 ? d.usd : "",
        totalINR: d.inr > 0 ? d.inr : "",
        count: d.count,
      });
    }
  }

  // ── One sheet per department ─────────────────────────────────
  for (const dept of departments) {
    const deptTxns = transactions.filter((t) => t.department === dept.value);
    const ws = wb.addWorksheet(dept.label);

    ws.columns = [
      { header: "Date",             key: "date",    width: 13 },
      { header: "Type",             key: "type",    width: 10 },
      { header: "Category",         key: "category",width: 22 },
      { header: "Amount",           key: "amount",  width: 14 },
      { header: "Fee",              key: "fee",     width: 10 },
      { header: "Currency",         key: "currency",width: 10 },
      { header: "From Account",     key: "from",    width: 18 },
      { header: "To Account",       key: "to",      width: 18 },
      { header: "Given By",         key: "givenBy", width: 15 },
      { header: "Note",             key: "note",    width: 30 },
      { header: "Payback Expected", key: "payback", width: 18 },
      { header: "Split",            key: "split",   width: 8  },
    ];
    styleHeader(ws);

    for (const t of deptTxns) {
      const currency = t.fromAccount?.currency ?? t.toAccount?.currency ?? "USD";
      ws.addRow({
        date: new Date(t.date).toLocaleDateString("en-US"),
        type: t.type,
        category: t.category,
        amount: t.amount,
        fee: t.fee || "",
        currency,
        from: t.fromAccount?.name ?? "",
        to: t.toAccount?.name ?? "",
        givenBy: t.givenBy || "",
        note: t.note,
        payback: t.paybackExpected ? "Yes" : "",
        split: t.isSplit ? "Yes" : "",
      });
    }

    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const type = row.getCell("type").value as string;
      const fill: ExcelJS.Fill = {
        type: "pattern", pattern: "solid",
        fgColor: { argb: type === "EXPENSE" ? "FFFEF2F2" : type === "INCOME" ? "FFECFDF5" : "FFEFF6FF" },
      };
      row.eachCell((cell) => { cell.fill = fill; });
    });
  }

  // ── Hand Loans sheet ─────────────────────────────────────────
  const loansSheet = wb.addWorksheet("Hand Loans");
  loansSheet.columns = [
    { header: "Person",     key: "person",   width: 18 },
    { header: "Type",       key: "type",     width: 12 },
    { header: "Amount",     key: "amount",   width: 14 },
    { header: "Currency",   key: "currency", width: 10 },
    { header: "Department", key: "dept",     width: 14 },
    { header: "Account",    key: "account",  width: 18 },
    { header: "Due Date",   key: "dueDate",  width: 13 },
    { header: "Status",     key: "status",   width: 12 },
    { header: "Note",       key: "note",     width: 30 },
  ];
  styleHeader(loansSheet);
  for (const l of handLoans) {
    loansSheet.addRow({
      person: l.personName, type: l.type, amount: l.amount, currency: l.currency,
      dept: l.department, account: l.account?.name ?? "",
      dueDate: l.dueDate ? new Date(l.dueDate).toLocaleDateString("en-US") : "",
      status: l.status, note: l.note,
    });
  }

  // ── Recurring Bills sheet ─────────────────────────────────────
  const billsSheet = wb.addWorksheet("Recurring Bills");
  billsSheet.columns = [
    { header: "Name",        key: "name",     width: 22 },
    { header: "Amount",      key: "amount",   width: 14 },
    { header: "Currency",    key: "currency", width: 10 },
    { header: "Department",  key: "dept",     width: 14 },
    { header: "Category",    key: "category", width: 18 },
    { header: "Account",     key: "account",  width: 18 },
    { header: "Day of Month",key: "day",      width: 14 },
    { header: "Note",        key: "note",     width: 30 },
  ];
  styleHeader(billsSheet);
  for (const b of recurringBills) {
    billsSheet.addRow({
      name: b.name, amount: b.amount, currency: b.currency,
      dept: b.department, category: b.category, account: b.account?.name ?? "",
      day: b.dayOfMonth, note: b.note,
    });
  }

  // ── Owing sheet ───────────────────────────────────────────────
  const owingSheet = wb.addWorksheet("Money Owed");
  owingSheet.columns = [
    { header: "Person",     key: "person",   width: 18 },
    { header: "Amount",     key: "amount",   width: 14 },
    { header: "Currency",   key: "currency", width: 10 },
    { header: "Department", key: "dept",     width: 14 },
    { header: "Date",       key: "date",     width: 13 },
    { header: "Status",     key: "status",   width: 12 },
    { header: "Note",       key: "note",     width: 30 },
  ];
  styleHeader(owingSheet);
  for (const o of owings) {
    owingSheet.addRow({
      person: o.personName, amount: o.amount, currency: o.currency,
      dept: o.department, date: new Date(o.date).toLocaleDateString("en-US"),
      status: o.status, note: o.note,
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="financeos-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}

function styleHeader(ws: ExcelJS.Worksheet) {
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD97757" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 22;
}
