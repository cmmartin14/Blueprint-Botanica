import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const id = searchParams.get("id");

  const key = process.env.PERENUAL_KEY;
  const plantCache = new Map<number, any>();

  if (!key) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  let apiUrl = "";

  if (id) {
    const numericId = Number(id);

    if (plantCache.has(numericId)) {
      return NextResponse.json(plantCache.get(numericId));
    }

    apiUrl = `https://perenual.com/api/species/details/${id}?key=${key}`;

    const resp = await fetch(apiUrl);
    if (!resp.ok) {
      return NextResponse.json(
        { error: "Perenual error" },
        { status: resp.status }
      );
    }

    const data = await resp.json();
    plantCache.set(numericId, data);
    return NextResponse.json(data);
  }


  else if (query) {
    apiUrl = `https://perenual.com/api/species-list?key=${key}&q=${encodeURIComponent(
      query
    )}`;
  } else {
    return NextResponse.json({ data: [] });
  }

  try {
    const resp = await fetch(apiUrl);
    if (!resp.ok) {
      const status = resp.status;

      return NextResponse.json(
        {
          error: status === 429
            ? "Rate limit exceeded. Please wait a moment."
            : "Perenual API error"
        },
        { status }
      );
    }


    const data = await resp.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Fetch failed", err);
    return NextResponse.json(
      { error: "Server fetch failed" },
      { status: 500 }
    );
  }
}
