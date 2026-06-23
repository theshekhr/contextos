import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { resolveUid } from "@/lib/auth-resolver";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const uid = await resolveUid(request);
    const { id } = await params;
    const supabase = createClient();

    // Verify the memory belongs to a project owned by this user before deleting
    const { data: memory } = await supabase
      .from("memory_blocks")
      .select("id, project_id")
      .eq("id", id)
      .single();

    if (!memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", memory.project_id)
      .eq("user_id", uid)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Not authorized to delete this memory" }, { status: 403 });
    }

    const { error } = await supabase.from("memory_blocks").delete().eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}