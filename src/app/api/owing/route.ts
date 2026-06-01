import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET() {
  const owings = await prisma.owing.findMany({
    orderBy: [{ status: "asc" }, { date: "desc" }],
  });
  return Response.json(owings);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { personName, amount, currency, department, note, date } = body;
  const owing = await prisma.owing.create({
    data: {
      personName,
      amount: Number(amount),
      currency: currency ?? "USD",
      department: department ?? "SELF",
      note: note ?? "",
      date: date ? new Date(date) : new Date(),
    },
  });
  return Response.json(owing, { status: 201 });
}
