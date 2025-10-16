import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // Extract ZIP code from the URL
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const zip = segments[segments.length - 1];

  console.log(`User entered ZIP code: ${zip}`); // log in terminal

  try {
    const response = await fetch(`https://plant-hardiness-zone.p.rapidapi.com/zipcodes/${zip}`, {
      method: "GET",
      headers: {
        "x-rapidapi-key": process.env.RAPIDAPI_KEY!,
        "x-rapidapi-host": "plant-hardiness-zone.p.rapidapi.com",
      },
    });

    const data = await response.json();
    console.log("RapidAPI response:", data); // log full response
    

    // Determine the correct property for the zone
    const zone = data.zone || data.hardiness_zone || data.HardinessZone || null;

    if (!zone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    return NextResponse.json({ zone });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}