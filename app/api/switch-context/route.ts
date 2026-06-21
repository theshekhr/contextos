import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { generateSwitchContext } from "@/lib/gemini";
import { getUserGeminiKey, NoApiKeyError } from "@/lib/get-user-key";

async function getUid(request: Request): Promise<string> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing auth token");
  const token = authHeader.split("Bearer ")[1];
  const decoded = await verifyFirebaseToken(token);
  return decoded.uid;
}

export async function POST(request: Request) {
  try {
    const uid = await getUid(request);
    const body = await request.json();

    const supabase = createClient();

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", body.project_id)
      .eq("user_id", uid)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    let apiKey: string;
    try {
      apiKey = await getUserGeminiKey(uid);
    } catch (err) {
      if (err instanceof NoApiKeyError) {
        return NextResponse.json({ error: err.message, code: "NO_API_KEY" }, { status: 402 });
      }
      throw err;
    }

    const { data: memories, error: memoriesError } = await supabase
      .from("memory_blocks")
      .select("*")
      .eq("project_id", body.project_id)
      .order("created_at", { ascending: true });

    if (memoriesError) {
      return NextResponse.json({ error: memoriesError.message }, { status: 500 });
    }

    const contextDoc = await generateSwitchContext(
      apiKey,
      project.name,
      project.description || "",
      memories || []
    );

    return NextResponse.json({ context: contextDoc });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}