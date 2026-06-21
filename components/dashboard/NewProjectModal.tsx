"use client";

import { useState } from "react";

export default function NewProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onCreate(name.trim(), description.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[#2A2A3A] bg-[#13131A] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[#E8E8F0]">New project</h2>
        <p className="mt-1 text-sm text-[#8888A0]">
          Give your project a name and a short description.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <input
            autoFocus
            required
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-[#2A2A3A] bg-[#0A0A0F] px-3 py-2.5 text-sm text-[#E8E8F0] outline-none focus:border-[#7C6FF7]"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="resize-none rounded-lg border border-[#2A2A3A] bg-[#0A0A0F] px-3 py-2.5 text-sm text-[#E8E8F0] outline-none focus:border-[#7C6FF7]"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-[#8888A0] hover:text-[#E8E8F0]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#7C6FF7] px-4 py-2 text-sm font-medium text-white hover:bg-[#6C5FE7] disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}