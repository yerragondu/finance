import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.department.delete({ where: { id } });
  return Response.json({ ok: true });
}
