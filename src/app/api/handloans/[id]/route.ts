import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  if (body.status === "RETURNED") {
    const loan = await prisma.handLoan.findUnique({ where: { id } });
    if (loan && loan.accountId) {
      // Reverse: if BORROWED → decrement, if LENT → increment
      if (loan.type === "BORROWED") {
        await prisma.account.update({
          where: { id: loan.accountId },
          data: { balance: { decrement: loan.amount } },
        });
      } else {
        await prisma.account.update({
          where: { id: loan.accountId },
          data: { balance: { increment: loan.amount } },
        });
      }
    }
    await prisma.handLoan.update({ where: { id }, data: { status: "RETURNED" } });
    return Response.json({ ok: true });
  }

  const updated = await prisma.handLoan.update({
    where: { id },
    data: {
      ...(body.note !== undefined ? { note: body.note } : {}),
      ...(body.dueDate !== undefined ? { dueDate: body.dueDate ? new Date(body.dueDate) : null } : {}),
    },
    include: { account: true },
  });
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.handLoan.delete({ where: { id } });
  return Response.json({ ok: true });
}
