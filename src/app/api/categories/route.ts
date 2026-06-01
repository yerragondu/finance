import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

const DEFAULT_CATEGORIES = [
  "Food & Dining", "Bills & Utilities", "Transport", "Shopping", "Health",
  "Education", "Ministry", "Salary", "Business Income", "Rent",
  "Loan Payment", "Credit Card Payment", "Bank Transfer",
  "International Transfer", "Fee", "Other",
];

export async function GET() {
  try {
    // Auto-seed defaults if table is empty
    const count = await prisma.category.count();
    if (count === 0) {
      for (const name of DEFAULT_CATEGORIES) {
        await prisma.category.upsert({
          where: { name },
          create: { name, isDefault: true },
          update: {},
        });
      }
    }
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    return Response.json(categories);
  } catch (err) {
    console.error("[categories GET]", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { name } = await request.json();
  if (!name?.trim()) return Response.json({ error: "Name required" }, { status: 400 });
  const category = await prisma.category.create({ data: { name: name.trim() } });
  return Response.json(category, { status: 201 });
}
