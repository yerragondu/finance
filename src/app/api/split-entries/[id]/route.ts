import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  if (body.paidBack === true) {
    const entry = await prisma.splitEntry.findUnique({ where: { id } });
    if (entry?.paybackAccountId) {
      await prisma.account.update({
        where: { id: entry.paybackAccountId },
        data: { balance: { increment: entry.amount } },
      });
    }
    await prisma.splitEntry.update({
      where: { id },
      data: { paidBack: true, paidBackAt: new Date() },
    });
    return Response.json({ ok: true });
  }

  const updated = await prisma.splitEntry.update({
    where: { id },
    data: {
      ...(body.paybackAccountId !== undefined ? { paybackAccountId: body.paybackAccountId } : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
    },
  });
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.splitEntry.delete({ where: { id } });
  return Response.json({ ok: true });
}
