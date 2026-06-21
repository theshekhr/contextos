import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { verifyFirebaseToken } from "@/lib/firebase-admin";

async function getUid(request: Request): Promise<string> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing auth token");
  }
  const token = authHeader.split("Bearer ")[1];
  const decoded = await verifyFirebaseToken(token);
  return decoded.uid;
}

export async function GET(request: Request) {
  try {
    const uid = await getUid(request);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const uid = await getUid(request);
    const body = await request.json();
    const supabase = createClient();

    const { data, error } = await supabase
      .from("projects")
      .insert({ name: body.name, description: body.description, user_id: uid })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}