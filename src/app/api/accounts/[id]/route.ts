import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      outgoingTransactions: {
        orderBy: { date: "desc" },
        take: 20,
        include: { toAccount: true },
      },
      incomingTransactions: {
        orderBy: { date: "desc" },
        take: 20,
        include: { fromAccount: true },
      },
    },
  });

  if (!account) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(account);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { creditLimit, balance, ...rest } = body;
  const account = await prisma.account.update({
    where: { id },
    data: {
      ...rest,
      ...(balance !== undefined ? { balance: Number(balance) } : {}),
      ...(creditLimit !== undefined
        ? { creditLimit: creditLimit !== "" && creditLimit !== null ? Number(creditLimit) : null }
        : {}),
    },
  });
  return Response.json(account);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.account.delete({ where: { id } });
  return Response.json({ ok: true });
}
