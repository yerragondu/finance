import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const department = searchParams.get("department");

  const bills = await prisma.recurringBill.findMany({
    where: { ...(department && department !== "ALL" ? { department } : {}), isActive: true },
    include: { account: true },
    orderBy: { dayOfMonth: "asc" },
  });
  return Response.json(bills);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, amount, currency = "USD", department = "SELF", category = "Bills & Utilities", accountId, dayOfMonth = 1, note = "" } = body;

  const bill = await prisma.recurringBill.create({
    data: {
      name,
      amount: Number(amount),
      currency,
      department,
      category,
      ...(accountId ? { account: { connect: { id: accountId } } } : {}),
      dayOfMonth: Number(dayOfMonth),
      note,
    },
    include: { account: true },
  });
  return Response.json(bill, { status: 201 });
}
