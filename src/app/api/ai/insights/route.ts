import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_AI_API_KEY;

export async function POST(request: NextRequest) {
  if (!apiKey || apiKey === "your-key-here") {
    return Response.json({ error: "GOOGLE_AI_API_KEY not set" }, { status: 503 });
  }

  const body = await request.json();
  const { transactions = [], accounts = [], owings = [], handLoans = [], recurringBills = [], department = "ALL" } = body;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  // Build a compact summary for the prompt (avoid token overload)
  const recentTxns = transactions.slice(0, 80);

  // Spend by category
  const catMap: Record<string, number> = {};
  for (const t of recentTxns) {
    if (t.type === "EXPENSE") {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    }
  }
  const topCats = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([cat, amt]) => `${cat}: ${amt.toFixed(0)}`)
    .join(", ");

  // Monthly spend
  const monthMap: Record<string, { income: number; expense: number }> = {};
  for (const t of recentTxns) {
    const m = t.date.slice(0, 7);
    if (!monthMap[m]) monthMap[m] = { income: 0, expense: 0 };
    if (t.type === "INCOME") monthMap[m].income += t.amount;
    if (t.type === "EXPENSE") monthMap[m].expense += t.amount;
  }
  const monthSummary = Object.entries(monthMap)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 3)
    .map(([m, d]) => `${m}: income ${d.income.toFixed(0)}, expense ${d.expense.toFixed(0)}`)
    .join(" | ");

  const totalBalance = accounts.reduce((s: number, a: { balance: number }) => s + a.balance, 0);
  const pendingOwing = owings.filter((o: { status: string }) => o.status === "PENDING").length;
  const activeLoan = handLoans.filter((l: { status: string }) => l.status === "PENDING").length;
  const upcomingBills = recurringBills.filter((b: { isActive: boolean }) => b.isActive).length;

  const prompt = `You are a friendly personal finance AI advisor. Analyze this financial data and give 4-5 short, actionable insights.

FILTER: ${department === "ALL" ? "All departments" : department}
TOTAL ACCOUNT BALANCE: ${totalBalance.toFixed(0)}
TOP EXPENSE CATEGORIES: ${topCats || "No expenses yet"}
MONTHLY SUMMARY (last 3 months): ${monthSummary || "No data"}
PENDING MONEY OWED TO ME: ${pendingOwing} items
ACTIVE HAND LOANS: ${activeLoan} items
UPCOMING RECURRING BILLS: ${upcomingBills} bills

TODAY: ${new Date().toISOString().slice(0, 10)}

RULES:
- Be specific with numbers when you have them
- Keep each insight under 20 words
- Be encouraging, not alarming
- Focus on patterns, anomalies, or actionable tips
- If data is sparse, give general setup tips

Respond ONLY with a JSON array of insight objects. No markdown, no explanation:
[
  {"icon": "trending-down", "title": "Short title", "detail": "One sentence insight.", "color": "red"},
  ...
]

icon options: "trending-up", "trending-down", "alert", "check", "info", "calendar", "piggy-bank", "zap"
color options: "green", "red", "amber", "blue", "violet", "orange"`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const jsonStr = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const insights = JSON.parse(jsonStr);
    return Response.json({ ok: true, insights });
  } catch (err) {
    console.error("AI insights error:", err);
    return Response.json({ error: "Failed to generate insights", detail: String(err) }, { status: 500 });
  }
}
