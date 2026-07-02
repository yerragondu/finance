import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Mark as paid back: credit the original account back
  if (body.paidBack === true) {
    const txn = await prisma.transaction.findUnique({ where: { id } });
    if (txn && !txn.paidBack) {
      // paybackAccountId: where money was received (defaults to fromAccount)
      // paybackAmount: how much was received (can differ — cross-currency payback)
      const paybackAccountId: string | null = body.paybackAccountId ?? txn.fromAccountId;
      const paybackAmount: number = body.paybackAmount != null
        ? Number(body.paybackAmount)
        : txn.amount + txn.fee;

      await prisma.$transaction(async (tx) => {
        await tx.transaction.update({ where: { id }, data: { paidBack: true } });
        if (paybackAccountId) {
          await tx.account.update({
            where: { id: paybackAccountId },
            data: { balance: { increment: paybackAmount } },
          });
        }
      });
      const updated = await prisma.transaction.findUnique({
        where: { id },
        include: { fromAccount: true, toAccount: true },
      });
      return Response.json(updated);
    }
  }

  const allowed: Record<string, unknown> = {};
  if (body.note !== undefined) allowed.note = body.note;
  if (body.paidBack !== undefined) allowed.paidBack = body.paidBack;
  if (body.department !== undefined) allowed.department = body.department;
  if (body.category !== undefined) allowed.category = body.category;
  if (body.givenBy !== undefined) allowed.givenBy = body.givenBy;

  const transaction = await prisma.transaction.update({
    where: { id },
    data: allowed,
    include: { fromAccount: true, toAccount: true },
  });
  return Response.json(transaction);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const txn = await prisma.transaction.findUnique({ where: { id } });
  if (!txn) return Response.json({ ok: true });

  await prisma.$transaction(async (tx) => {
    // Reverse the balance effects this transaction had, then delete it.
    if (txn.type === "EXPENSE" && txn.fromAccountId) {
      await tx.account.update({
        where: { id: txn.fromAccountId },
        data: { balance: { increment: txn.amount + txn.fee } },
      });
    }
    if (txn.type === "INCOME" && txn.toAccountId) {
      await tx.account.update({
        where: { id: txn.toAccountId },
        data: { balance: { decrement: txn.amount } },
      });
    }
    if (txn.type === "TRANSFER") {
      if (txn.fromAccountId) {
        await tx.account.update({
          where: { id: txn.fromAccountId },
          data: { balance: { increment: txn.amount + txn.fee } },
        });
      }
      if (txn.toAccountId) {
        const received = txn.exchangeRate ? txn.amount * txn.exchangeRate : txn.amount;
        await tx.account.update({
          where: { id: txn.toAccountId },
          data: { balance: { decrement: received } },
        });
      }
    }
    await tx.transaction.delete({ where: { id } });
  });

  return Response.json({ ok: true });
}
