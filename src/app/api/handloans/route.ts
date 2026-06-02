import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const department = searchParams.get("department");

  const loans = await prisma.handLoan.findMany({
    where: { ...(department && department !== "ALL" ? { department } : {}) },
    include: { account: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });
  return Response.json(loans);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { personName, amount, currency = "USD", department = "SELF", accountId, dueDate, note = "", type = "BORROWED" } = body;

  const loan = await prisma.handLoan.create({
    data: {
      personName,
      amount: Number(amount),
      currency,
      department,
      ...(accountId ? { account: { connect: { id: accountId } } } : {}),
      dueDate: dueDate ? new Date(dueDate) : null,
      note,
      type,
    },
    include: { account: true },
  });

  // If BORROWED, increment account balance
  if (type === "BORROWED" && accountId) {
    await prisma.account.update({
      where: { id: accountId },
      data: { balance: { increment: Number(amount) } },
    });
  }
  // If LENT, decrement account balance
  if (type === "LENT" && accountId) {
    await prisma.account.update({
      where: { id: accountId },
      data: { balance: { decrement: Number(amount) } },
    });
  }

  return Response.json(loan, { status: 201 });
}
