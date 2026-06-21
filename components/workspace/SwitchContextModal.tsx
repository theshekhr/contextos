"use client";

import { useEffect, useState } from "react";
import { apiPost } from "@/lib/api-client";

export default function SwitchContextModal({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function generate() {
      try {
        const res = await apiPost("/api/switch-context", { project_id: projectId });
        setContext(res.context);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate context");
      } finally {
        setLoading(false);
      }
    }
    generate();
  }, [projectId]);

  async function handleCopy() {
    await navigator.clipboard.writeText(context);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-[10px] border border-[var(--border2)] bg-[var(--bg2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 pb-4 pt-[18px]">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--text)]">Switch Context</h2>
            <p className="mt-0.5 text-[12px] text-[var(--text2)]">
              Copy this AI-optimized context document and paste it into any AI model to instantly
              continue your project — no re-explaining needed.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-1 text-lg leading-none text-[var(--text3)] hover:text-[var(--text2)]"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-[18px]">
          {loading && (
            <p className="text-[13px] text-[var(--text2)]">Generating context document...</p>
          )}
          {error && <p className="text-[13px] text-[var(--red)]">{error}</p>}
          {!loading && !error && (
            <pre className="whitespace-pre-wrap rounded-md border border-[var(--border)] bg-[var(--bg)] p-3.5 font-mono text-[11px] leading-relaxed text-[var(--text2)]">
              {context}
            </pre>
          )}
        </div>

        {!loading && !error && (
          <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-[14px]">
            <button
              onClick={onClose}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--text2)] hover:bg-[var(--bg3)]"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-[var(--bg)] hover:opacity-90"
            >
              <svg width="12" height="12" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="1" y="3" width="8" height="9" rx="1.5" />
                <path d="M4 3V2a1 1 0 011-1h6a1 1 0 011 1v8a1 1 0 01-1 1h-1" />
              </svg>
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}