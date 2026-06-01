import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const department = searchParams.get("department");
  const accountId = searchParams.get("accountId");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const transactions = await prisma.transaction.findMany({
    where: {
      ...(department && department !== "ALL" ? { department } : {}),
      ...(accountId
        ? {
            OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
          }
        : {}),
    },
    include: {
      fromAccount: true,
      toAccount: true,
    },
    orderBy: { date: "desc" },
    take: limit,
  });

  return Response.json(transactions);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    type,
    amount,
    fee = 0,
    exchangeRate,
    category,
    note = "",
    date,
    department,
    fromAccountId,
    toAccountId,
    paybackExpected = false,
    givenBy = "",
  } = body;

  const parsedAmount = Number(amount);
  const parsedFee = Number(fee);

  const txn = await prisma.transaction.create({
    data: {
      type,
      amount: parsedAmount,
      fee: parsedFee,
      exchangeRate: exchangeRate ? Number(exchangeRate) : null,
      category: category ?? "",
      note: note ?? "",
      date: date ? new Date(date) : new Date(),
      department,
      ...(fromAccountId ? { fromAccount: { connect: { id: fromAccountId } } } : {}),
      ...(toAccountId   ? { toAccount:   { connect: { id: toAccountId   } } } : {}),
      paybackExpected: Boolean(paybackExpected),
      givenBy: String(givenBy ?? ""),
    },
    include: { fromAccount: true, toAccount: true },
  });

  // Update account balances
  if (type === "EXPENSE" && fromAccountId) {
    await prisma.account.update({
      where: { id: fromAccountId },
      data: { balance: { decrement: parsedAmount + parsedFee } },
    });
  }

  if (type === "INCOME" && toAccountId) {
    await prisma.account.update({
      where: { id: toAccountId },
      data: { balance: { increment: parsedAmount } },
    });
  }

  if (type === "TRANSFER") {
    if (fromAccountId) {
      await prisma.account.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: parsedAmount + parsedFee } },
      });
    }
    if (toAccountId) {
      const received = exchangeRate
        ? parsedAmount / Number(exchangeRate)
        : parsedAmount;
      await prisma.account.update({
        where: { id: toAccountId },
        data: { balance: { increment: received } },
      });
    }
  }

  return Response.json(txn, { status: 201 });
}
