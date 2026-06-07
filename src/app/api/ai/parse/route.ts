import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_AI_API_KEY;

export async function POST(request: NextRequest) {
  if (!apiKey || apiKey === "your-key-here") {
    return Response.json(
      { error: "GOOGLE_AI_API_KEY not set. Add it to your .env file." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { text, accounts = [], categories = [], departments = [], defaultDepartment = "SELF" } = body;

  if (!text?.trim()) {
    return Response.json({ error: "No text provided" }, { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  const accountList = accounts
    .map((a: { id: string; name: string; currency: string; balance: number }) =>
      `- id: "${a.id}", name: "${a.name}", currency: ${a.currency}, balance: ${a.balance}`
    )
    .join("\n");

  const categoryList = categories.map((c: { name: string }) => `"${c.name}"`).join(", ");
  const deptList = departments.map((d: { value: string; label: string }) => `"${d.value}" (${d.label})`).join(", ");

  const prompt = `You are a smart financial transaction parser for a personal finance dashboard.

Parse the following natural language transaction description and extract all fields.

USER INPUT: "${text}"

AVAILABLE ACCOUNTS:
${accountList || "(none yet)"}

AVAILABLE CATEGORIES: ${categoryList || '"Other"'}

AVAILABLE DEPARTMENTS: ${deptList || `"${defaultDepartment}"`}
DEFAULT DEPARTMENT: "${defaultDepartment}"

TODAY'S DATE: ${new Date().toISOString().slice(0, 10)}

RULES:
- type: "EXPENSE" if money is going out, "INCOME" if money is coming in, "TRANSFER" if moving between accounts
- amount: extract the number (ignore currency symbols). If not mentioned, return null.
- currency: "INR" if ₹ or "rs" or "rupees" mentioned; "USD" if $ or "dollar" or "usd" mentioned; otherwise guess from account currency or default "USD"
- category: pick the BEST match from the available categories list. Use context clues:
  * food/restaurant/swiggy/zomato/lunch/dinner → "Food & Dining"
  * electricity/water/internet/phone/bill → "Bills & Utilities"
  * uber/ola/petrol/fuel/auto/cab → "Transport"
  * salary/stipend/paycheck → "Salary"
  * rent → "Rent"
  * loan/emi → "Loan Payment"
  * church/ministry/pastor/tithe/offering → "Ministry"
  * medical/hospital/medicine/doctor → "Health"
  * amazon/shopping/clothes → "Shopping"
  * school/college/course → "Education"
  * transfer/sent → "Bank Transfer"
  * If nothing matches → "Other"
- fromAccountId: account ID for EXPENSE or TRANSFER source. Match by name keywords (e.g. "chase" → Chase account). null if unclear.
- toAccountId: account ID for INCOME destination or TRANSFER target. null if unclear.
- department: match from available departments. Use "${defaultDepartment}" if unsure.
- note: clean concise description (remove amounts/account names, keep the purpose)
- paybackExpected: true ONLY if text says "will return", "pay back", "borrow", "owes me", "will pay"
- givenBy: if INCOME and a person's name is mentioned as the giver, extract it. Otherwise "".
- date: if a specific date is mentioned extract as YYYY-MM-DD. Otherwise today's date.
- isSplit: true only if "split", "shared", "we paid together" mentioned

RESPOND WITH ONLY VALID JSON. No explanation, no markdown, no code blocks. Example:
{"type":"EXPENSE","amount":500,"currency":"INR","category":"Food & Dining","fromAccountId":"clxxx","toAccountId":null,"department":"SELF","note":"Lunch at restaurant","paybackExpected":false,"givenBy":"","date":"2026-06-06","isSplit":false,"confidence":0.9}

The "confidence" field (0-1) indicates how confident you are in the parse.`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    // Strip any markdown code fences if Gemini added them
    const jsonStr = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

    const parsed = JSON.parse(jsonStr);
    return Response.json({ ok: true, parsed });
  } catch (err) {
    console.error("AI parse error:", err);
    return Response.json({ error: "Failed to parse transaction", detail: String(err) }, { status: 500 });
  }
}
