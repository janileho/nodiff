import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Simple offline fallback: return note
      return NextResponse.json({ text: "" });
    }

    const visionPrompt = `Poimi kuvasta matematiikan tehtävän teksti mahdollisimman tarkasti. Palauta vain varsinainen tehtävänanto LaTeX- tai tavallisena tekstinä ilman selityksiä.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: visionPrompt },
              { type: "image_url", image_url: { url: `data:${file.type};base64,${base64}` } },
            ],
          },
        ],
      }),
    });
    const json = await res.json();
    let raw: string = json.choices?.[0]?.message?.content ?? "";
    // Sanitize output: remove code fences/quotes
    raw = String(raw).replace(/^```[a-z]*\n?|```$/gim, "").trim();
    // Sometimes model returns JSON; try parse
    let text = raw;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") text = parsed;
      else if (parsed && typeof parsed.text === "string") text = parsed.text;
    } catch {}
    text = String(text).trim();
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: "Failed to extract text" }, { status: 500 });
  }
}


