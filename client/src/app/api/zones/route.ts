import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const allZones = await prisma.zones.findMany({
      orderBy: { id: "asc" },
    });
    return NextResponse.json(allZones);
  } catch (error) {
    console.error("Error fetching zones:", error);
    return NextResponse.json(
      { error: "Failed to fetch zones" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
