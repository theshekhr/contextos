"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import type { Project } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet("/api/projects");
        setProjects(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load projects");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[var(--bg)]">
      <div className="border-b border-[var(--border)] px-6 py-4">
        <h1 className="text-[15px] font-semibold text-[var(--text)]">All projects</h1>
        <p className="mt-0.5 text-[12px] text-[var(--text3)]">
          Your institutional memory, organized by project
        </p>
      </div>

      <div className="px-6 py-5">
        {loading && <p className="text-[13px] text-[var(--text2)]">Loading...</p>}
        {error && <p className="text-[13px] text-[var(--red)]">{error}</p>}

        {!loading && !error && projects.length === 0 && (
          <p className="text-[13px] text-[var(--text2)]">
            No projects yet — create one from the sidebar.
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => router.push(`/project/${project.id}`)}
              className="rounded-md border border-[var(--border)] bg-[var(--bg2)] p-4 text-left transition hover:border-[var(--border2)]"
            >
              <h3 className="text-[14px] font-medium text-[var(--text)]">{project.name}</h3>
              <p className="mt-1 line-clamp-2 text-[12px] text-[var(--text2)]">
                {project.description || "No description"}
              </p>
              <p className="mt-3 font-mono text-[11px] text-[var(--text3)]">
                {new Date(project.created_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}