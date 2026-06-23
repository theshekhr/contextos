"use client";

import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "@/lib/api-client";
import type { ChatMessage, MemoryBlock } from "@/lib/types";

export default function ChatTab({
  projectId,
  memories,
}: {
  projectId: string;
  memories: MemoryBlock[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet(`/api/chat?project_id=${projectId}`);
        setMessages(data);
      } catch {
        // empty history is fine
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || sending) return;

    setSending(true);
    setError("");
    setInput("");

    // Optimistically show the user's message right away
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      project_id: projectId,
      role: "user",
      content: question,
      cited_memory_ids: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const reply = await apiPost("/api/chat", { project_id: projectId, question });
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get an answer");
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      setInput(question);
    } finally {
      setSending(false);
    }
  }

  function findMemoryTitle(memoryId: string): string | null {
    return memories.find((m) => m.id === memoryId)?.title || null;
  }

  const suggestions = [
    "What decisions have I made so far?",
    "What's still pending?",
    "Summarize this project's progress",
  ];

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
        {loading && <p className="text-[13px] text-[var(--text3)]">Loading conversation...</p>}

        {!loading && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="max-w-sm text-[13px] leading-relaxed text-[var(--text3)]">
              Ask anything about this project. I'll search your saved memories and answer using
              what you've actually worked on.
            </p>
            <div className="flex flex-col gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--text2)] hover:border-[var(--border2)] hover:bg-[var(--bg3)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-[10px] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[var(--accent)] text-[var(--bg)]"
                    : "border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)]"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {msg.role === "assistant" && msg.cited_memory_ids.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-2">
                    {msg.cited_memory_ids.map((id) => {
                      const title = findMemoryTitle(id);
                      if (!title) return null;
                      return (
                        <span
                          key={id}
                          className="rounded-full border border-[var(--border2)] px-2 py-[2px] font-mono text-[10px] text-[var(--text3)]"
                          title={title}
                        >
                          {title.length > 24 ? title.slice(0, 24) + "..." : title}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-3.5 py-2.5 text-[13px] text-[var(--text3)]">
                Searching memories...
              </div>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-[12px] text-[var(--red)]">{error}</p>}
      </div>

      <form
        onSubmit={handleSend}
        className="flex-shrink-0 border-t border-[var(--border)] px-5 py-3"
      >
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this project..."
            disabled={sending}
            className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--border2)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex-shrink-0 rounded-md bg-[var(--accent)] px-4 py-2 text-[12px] font-semibold text-[var(--bg)] hover:opacity-90 disabled:opacity-50"
          >
            Ask
          </button>
        </div>
      </form>
    </div>
  );
}