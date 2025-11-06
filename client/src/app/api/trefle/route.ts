import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const token = process.env.TREFLE_TOKEN;

  if (!token) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://trefle.io/api/v1/plants/search?q=${encodeURIComponent(query)}&token=${token}`
    );

    if (!res.ok) {
      // Read body as text only once
      const errorText = await res.text();
      console.error("Trefle returned non-OK:", res.status, errorText);
      return NextResponse.json({ error: "Trefle API error" }, { status: 500 });
    }

    // Read body as JSON once
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Trefle fetch error:", error);
    return NextResponse.json({ error: "Server fetch failed" }, { status: 500 });
  }
}
