import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { resolveUid } from "@/lib/auth-resolver";
import { getUserProviderConfig } from "@/lib/get-user-key";
import { askQuestionWithFallback } from "@/lib/providers";
import { searchMemories } from "@/lib/memory-search";
import type { MemoryBlock } from "@/lib/types";

async function assertOwnsProject(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  uid: string
) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .eq("user_id", uid)
    .single();
  if (error || !data) throw new Error("Project not found");
  return data;
}

export async function GET(request: Request) {
  try {
    const uid = await resolveUid(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });

    const supabase = createClient();
    await assertOwnsProject(supabase, projectId, uid);

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const uid = await resolveUid(request);
    const body = await request.json();
    const { project_id, question } = body;

    if (!question || !question.trim()) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    const supabase = createClient();
    const project = await assertOwnsProject(supabase, project_id, uid);

    // Save the user's message
    await supabase.from("chat_messages").insert({
      project_id,
      role: "user",
      content: question.trim(),
    });

    // Retrieve relevant memories
    const { data: allMemories } = await supabase
      .from("memory_blocks")
      .select("*")
      .eq("project_id", project_id)
      .order("created_at", { ascending: false });

    const memories = (allMemories || []) as MemoryBlock[];
    const ranked = searchMemories(memories, question, 8);
    const relevantMemories = ranked.map((r) => ({
      id: r.memory.id,
      title: r.memory.title,
      summary: r.memory.summary,
      ai_model: r.memory.ai_model,
      created_at: r.memory.created_at,
      extracted_data: r.memory.extracted_data,
    }));

    const config = await getUserProviderConfig(uid);
    const { answer, citedMemoryIds, providerUsed, degraded } = await askQuestionWithFallback(
      config,
      question.trim(),
      relevantMemories,
      project.name
    );

    // Save the assistant's reply
    const { data: savedMessage, error: saveError } = await supabase
      .from("chat_messages")
      .insert({
        project_id,
        role: "assistant",
        content: answer,
        cited_memory_ids: citedMemoryIds,
      })
      .select()
      .single();

    if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });

    return NextResponse.json({ ...savedMessage, _meta: { providerUsed, degraded } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}