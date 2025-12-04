import { NextResponse } from "next/server";

const TREFLE_TOKEN = process.env.TREFLE_TOKEN;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const id = searchParams.get("id");

  if (!TREFLE_TOKEN) {
    console.error("Missing Trefle API token");
    return NextResponse.json({ error: "Missing Trefle API token" }, { status: 500 });
  }

  try {
    let apiUrl = "";

    if (id) {
      if (isNaN(Number(id))) {
        return NextResponse.json({ error: "Invalid plant ID" }, { status: 400 });
      }
      apiUrl = `https://trefle.io/api/v1/plants/${id}?token=${TREFLE_TOKEN}`;
    } else if (query) {
      apiUrl = `https://trefle.io/api/v1/plants/search?token=${TREFLE_TOKEN}&q=${encodeURIComponent(query)}`;
    } else {
      return NextResponse.json({ data: [] });
    }
    
    const resp = await fetch(apiUrl);

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Trefle API returned error:", text);
      return NextResponse.json({ error: `Trefle API returned ${resp.status}` }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error fetching Trefle API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
