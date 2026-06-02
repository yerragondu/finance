import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const department = searchParams.get("department");

  const incomes = await prisma.expectedIncome.findMany({
    where: { ...(department && department !== "ALL" ? { department } : {}), isReceived: false },
    include: { account: true },
    orderBy: { expectedDate: "asc" },
  });
  return Response.json(incomes);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, amount, currency = "USD", department = "SELF", category = "Salary", accountId, expectedDate, note = "" } = body;

  const income = await prisma.expectedIncome.create({
    data: {
      name,
      amount: Number(amount),
      currency,
      department,
      category,
      ...(accountId ? { account: { connect: { id: accountId } } } : {}),
      expectedDate: new Date(expectedDate),
      note,
    },
    include: { account: true },
  });
  return Response.json(income, { status: 201 });
}
