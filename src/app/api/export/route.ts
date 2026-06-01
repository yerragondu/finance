import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

const DEPARTMENTS = ["HOME", "MINISTRY", "OFFICE", "SELF"] as const;
const DEPT_LABELS: Record<string, string> = {
  HOME: "Home", MINISTRY: "Ministry", OFFICE: "Office", SELF: "Self",
};

export async function GET() {
  const transactions = await prisma.transaction.findMany({
    include: { fromAccount: true, toAccount: true },
    orderBy: { date: "desc" },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "FinanceOS";
  wb.created = new Date();

  // ── Summary sheet ────────────────────────────────────────────
  const summarySheet = wb.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Department", key: "dept", width: 15 },
    { header: "Category", key: "category", width: 22 },
    { header: "Type", key: "type", width: 12 },
    { header: "Total (USD)", key: "totalUSD", width: 14 },
    { header: "Total (INR)", key: "totalINR", width: 14 },
    { header: "Count", key: "count", width: 8 },
  ];
  styleHeader(summarySheet);

  // Build summary map
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

  for (const dept of DEPARTMENTS) {
    if (!summaryMap[dept]) continue;
    for (const key of Object.keys(summaryMap[dept])) {
      const [, category] = key.split("__");
      const d = summaryMap[dept][key];
      summarySheet.addRow({
        dept: DEPT_LABELS[dept],
        category,
        type: d.type,
        totalUSD: d.usd > 0 ? d.usd : "",
        totalINR: d.inr > 0 ? d.inr : "",
        count: d.count,
      });
    }
  }

  // ── One sheet per department ─────────────────────────────────
  for (const dept of DEPARTMENTS) {
    const deptTxns = transactions.filter((t) => t.department === dept);
    const ws = wb.addWorksheet(DEPT_LABELS[dept]);

    ws.columns = [
      { header: "Date", key: "date", width: 13 },
      { header: "Type", key: "type", width: 10 },
      { header: "Category", key: "category", width: 22 },
      { header: "Amount", key: "amount", width: 14 },
      { header: "Fee", key: "fee", width: 10 },
      { header: "Currency", key: "currency", width: 10 },
      { header: "From Account", key: "from", width: 18 },
      { header: "To Account", key: "to", width: 18 },
      { header: "Note", key: "note", width: 30 },
      { header: "Payback Expected", key: "payback", width: 18 },
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
        note: t.note,
        payback: t.paybackExpected ? "Yes" : "",
      });
    }

    // Colour rows by type
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
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C3AED" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 22;
}
