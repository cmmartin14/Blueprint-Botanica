import { NextResponse } from "next/server";

const plantCache = new Map<number, any>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const id = searchParams.get("id");

  const key = process.env.PERENUAL_KEY;

  if (!key) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  try {

    if (id) {
      const numericId = Number(id);

      if (plantCache.has(numericId)) {
        return NextResponse.json(plantCache.get(numericId));
      }

      const apiUrl = `https://perenual.com/api/species/details/${numericId}?key=${key}`;
      const resp = await fetch(apiUrl);

      if (!resp.ok) {
        return NextResponse.json(
          { error: "Perenual API error" },
          { status: resp.status }
        );
      }

      const data = await resp.json();
      plantCache.set(numericId, data);

      return NextResponse.json(data);
    }

    if (query) {
      const apiUrl = `https://perenual.com/api/species-list?key=${key}&q=${encodeURIComponent(
        query
      )}`;

      const resp = await fetch(apiUrl);

      if (!resp.ok) {
        const status = resp.status;

        return NextResponse.json(
          {
            error:
              status === 429
                ? "Rate limit exceeded. Please wait a moment."
                : "Perenual API error",
          },
          { status }
        );
      }

      const data = await resp.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ data: [] });

  } catch (err) {
    console.error("Perenual fetch failed:", err);

    return NextResponse.json(
      { error: "Server fetch failed" },
      { status: 500 }
    );
  }
}
