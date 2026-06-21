import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { encrypt, decrypt, maskKey } from "@/lib/crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function getUid(request: Request): Promise<string> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing auth token");
  const token = authHeader.split("Bearer ")[1];
  const decoded = await verifyFirebaseToken(token);
  return decoded.uid;
}

export async function GET(request: Request) {
  try {
    const uid = await getUid(request);
    const supabase = createClient();

    const { data } = await supabase
      .from("user_settings")
      .select("encrypted_gemini_key")
      .eq("user_id", uid)
      .maybeSingle();

    if (!data?.encrypted_gemini_key) {
      return NextResponse.json({ hasKey: false, maskedKey: null });
    }

    const decrypted = decrypt(data.encrypted_gemini_key);
    return NextResponse.json({ hasKey: true, maskedKey: maskKey(decrypted) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const uid = await getUid(request);
    const body = await request.json();
    const apiKey = (body.apiKey || "").trim();

    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    // Validate the key actually works before saving it
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      await model.generateContent("Say 'ok' and nothing else.");
    } catch {
      return NextResponse.json(
        { error: "This API key didn't work. Double check it's correct and has Gemini API access enabled." },
        { status: 400 }
      );
    }

    const encrypted = encrypt(apiKey);
    const supabase = createClient();

    const { data: existing } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", uid)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("user_settings")
        .update({ encrypted_gemini_key: encrypted, updated_at: new Date().toISOString() })
        .eq("user_id", uid);
    } else {
      await supabase.from("user_settings").insert({ user_id: uid, encrypted_gemini_key: encrypted });
    }

    return NextResponse.json({ hasKey: true, maskedKey: maskKey(apiKey) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const uid = await getUid(request);
    const supabase = createClient();
    await supabase.from("user_settings").delete().eq("user_id", uid);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}