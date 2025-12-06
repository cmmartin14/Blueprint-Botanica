import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const id = searchParams.get("id");

  const token = process.env.TREFLE_TOKEN;

  const errorResponse = (msg: string, status = 500) =>
    NextResponse.json({ error: msg }, { status });

  if (!token) return errorResponse("Server misconfigured");

  if (id && isNaN(Number(id))) return errorResponse("Invalid plant ID", 400);

  let apiUrl = "";
  if (id) {
    apiUrl = `https://trefle.io/api/v1/plants/${id}?token=${token}`;
  } else if (query) {
    // Swap parameter order so `q` comes first
    apiUrl = `https://trefle.io/api/v1/plants/search?q=${encodeURIComponent(query)}&token=${token}`;
  } else {
    return NextResponse.json({ data: [] });
  }

  try {
    const resp = await fetch(apiUrl);

    if (!resp.ok) return errorResponse("Trefle API error");

    const data = await resp.json();
    return NextResponse.json(data);
  } catch {
    return errorResponse("Server fetch failed");
  }
}
