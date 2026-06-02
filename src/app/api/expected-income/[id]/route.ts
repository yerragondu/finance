import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  if (body.isReceived === true) {
    const item = await prisma.expectedIncome.findUnique({ where: { id } });
    if (item && item.accountId) {
      await prisma.account.update({
        where: { id: item.accountId },
        data: { balance: { increment: item.amount } },
      });
      // Also create an actual income transaction
      await prisma.transaction.create({
        data: {
          type: "INCOME",
          amount: item.amount,
          fee: 0,
          category: item.category,
          note: `Expected income received: ${item.name}`,
          date: new Date(),
          department: item.department,
          ...(item.accountId ? { toAccount: { connect: { id: item.accountId } } } : {}),
        },
      });
    }
    await prisma.expectedIncome.update({ where: { id }, data: { isReceived: true } });
    return Response.json({ ok: true });
  }

  const updated = await prisma.expectedIncome.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.amount !== undefined ? { amount: Number(body.amount) } : {}),
      ...(body.expectedDate !== undefined ? { expectedDate: new Date(body.expectedDate) } : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
    },
    include: { account: true },
  });
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.expectedIncome.delete({ where: { id } });
  return Response.json({ ok: true });
}
