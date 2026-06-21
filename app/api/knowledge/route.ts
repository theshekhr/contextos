import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { verifyFirebaseToken } from "@/lib/firebase-admin";

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
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });

    const supabase = createClient();

    // Confirm ownership via the project row
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", uid)
      .single();

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("knowledge_graph")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    console.log("Knowledge graph GET result:", { data, error });

    if (error || !data) {
      return NextResponse.json({ error: "No knowledge graph yet" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}