import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  context: { params: Promise<{ zone: string }> } 
) {
  const { zone } = await context.params; 

  try {
    const zoneData = await prisma.zones.findUnique({
      where: { zone },
    });

    if (!zoneData) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    return NextResponse.json(zoneData);
  } catch (error) {
    console.error("Error fetching zone:", error);
    return NextResponse.json(
      { error: "Failed to fetch zone" },
      { status: 500 }
    );
  }
}
