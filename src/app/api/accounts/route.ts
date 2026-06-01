import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const department = searchParams.get("department");

  const accounts = await prisma.account.findMany({
    where: department && department !== "ALL" ? { department } : undefined,
    include: {
      outgoingTransactions: { orderBy: { date: "desc" }, take: 5 },
      incomingTransactions: { orderBy: { date: "desc" }, take: 5 },
    },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(accounts);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, type, currency, department, balance, color, creditLimit } = body;

  const account = await prisma.account.create({
    data: {
      name,
      type,
      currency,
      department,
      balance: Number(balance),
      color,
      creditLimit: creditLimit != null ? Number(creditLimit) : null,
    },
  });

  return Response.json(account, { status: 201 });
}
