import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const user = await prisma.users.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" });
    }

    const isValid = password === user.password;
    if (!isValid) {
      return NextResponse.json({ success: false, message: "Invalid password" });
    }

    return NextResponse.json({ success: true, message: "Login successful" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: "Server error" });
  }
}
