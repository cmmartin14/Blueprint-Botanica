import { NextResponse } from "next/server";

interface ReminderEmailPayload {
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReminderEmailPayload;
    const to = body.to?.trim();
    const subject = body.subject?.trim() || "Blueprint Botanica reminder";
    const text = body.text?.trim();
    const html = body.html?.trim();

    if (!to) {
      return NextResponse.json({ error: "Recipient email is required." }, { status: 400 });
    }

    if (!text && !html) {
      return NextResponse.json(
        { error: "At least one of text or html is required." },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    const devBypass = process.env.EMAIL_SIMULATION === "1";

    if (devBypass) {
      console.log("[ReminderEmail] Simulated email send", { to, subject, text, html });
      return NextResponse.json({ ok: true, simulated: true });
    }

    if (!resendApiKey || !from) {
      return NextResponse.json(
        {
          error:
            "Email service not configured. Set RESEND_API_KEY and EMAIL_FROM, or set EMAIL_SIMULATION=1 for local testing.",
        },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        ...(html ? { html } : {}),
        ...(text ? { text } : {}),
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to send email.", details: data },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, id: data?.id || null });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unexpected error while sending reminder email." },
      { status: 500 }
    );
  }
}

