import type { MemoryBlock } from "./types";

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "i", "you", "he", "she", "it", "we", "they",
  "this", "that", "and", "or", "but", "of", "to", "in", "on", "at", "for", "with", "did",
  "does", "do", "when", "where", "what", "why", "how", "my", "me", "our", "your", "his",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function scoreMemory(memory: MemoryBlock, queryTokens: string[]): number {
  const titleTokens = tokenize(memory.title);
  const summaryTokens = tokenize(memory.summary);
  const extractedText = JSON.stringify(memory.extracted_data);
  const extractedTokens = tokenize(extractedText);
  const rawTokens = tokenize(memory.raw_conversation.slice(0, 3000)); // cap for performance

  let score = 0;
  for (const qt of queryTokens) {
    if (titleTokens.includes(qt)) score += 5;
    if (summaryTokens.includes(qt)) score += 3;
    if (extractedTokens.includes(qt)) score += 3;
    if (rawTokens.includes(qt)) score += 1;
  }

  // Mild recency boost so otherwise-tied results favor more recent work
  const ageInDays = (Date.now() - new Date(memory.created_at).getTime()) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 2 - ageInDays * 0.05);

  return score;
}

export function searchMemories(
  memories: MemoryBlock[],
  query: string,
  limit = 8
): { memory: MemoryBlock; score: number }[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    // No useful tokens (e.g. very short or all-stopword query) \u2014 return most recent
    return memories.slice(0, limit).map((memory) => ({ memory, score: 0 }));
  }

  const scored = memories
    .map((memory) => ({ memory, score: scoreMemory(memory, queryTokens) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  // If nothing scored above zero, fall back to most recent memories rather
  // than returning nothing \u2014 the AI can still say "nothing relevant found"
  if (scored.length === 0) {
    return memories.slice(0, Math.min(limit, 3)).map((memory) => ({ memory, score: 0 }));
  }

  return scored.slice(0, limit);
}