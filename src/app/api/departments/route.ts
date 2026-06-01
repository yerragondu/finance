import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

const DEFAULT_DEPARTMENTS = [
  { value: "HOME",     label: "Home"     },
  { value: "MINISTRY", label: "Ministry" },
  { value: "OFFICE",   label: "Office"   },
  { value: "SELF",     label: "Self"     },
];

export async function GET() {
  try {
    const count = await prisma.department.count();
    if (count === 0) {
      for (const d of DEFAULT_DEPARTMENTS) {
        await prisma.department.upsert({
          where:  { value: d.value },
          create: { ...d, isDefault: true },
          update: {},
        });
      }
    }
    const departments = await prisma.department.findMany({ orderBy: { createdAt: "asc" } });
    return Response.json(departments);
  } catch (err) {
    console.error("[departments GET]", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { label } = await request.json();
    if (!label?.trim()) return Response.json({ error: "label required" }, { status: 400 });

    const value = label.trim().toUpperCase().replace(/\s+/g, "_");
    const dept = await prisma.department.upsert({
      where:  { value },
      create: { value, label: label.trim() },
      update: {},
    });
    return Response.json(dept, { status: 201 });
  } catch (err) {
    console.error("[departments POST]", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
