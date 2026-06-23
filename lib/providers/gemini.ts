import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AiProvider, ExtractionResult, KnowledgeGraphData } from "./types";

function getModel(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

function safeParseJson(text: string) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

export const geminiProvider: AiProvider = {
  name: "Gemini",

  async testKey(apiKey: string) {
    const model = getModel(apiKey);
    await model.generateContent("Say 'ok' and nothing else.");

  },
  async askQuestion(apiKey, question, relevantMemories, projectName) {
    const model = getModel(apiKey);

    if (relevantMemories.length === 0) {
      return {
        answer: `I don't have any saved memories for "${projectName}" yet that relate to this question. Save some AI conversations first, then ask again.`,
        citedMemoryIds: [],
      };
    }

    const memoryContext = relevantMemories
      .map(
        (m) => `[MEMORY ID: ${m.id}]
Date: ${new Date(m.created_at).toLocaleString()}
AI used: ${m.ai_model}
Title: ${m.title}
Summary: ${m.summary}
Decisions: ${m.extracted_data.decisions?.join("; ") || "none"}
Features: ${m.extracted_data.features?.join("; ") || "none"}
Bugs: ${m.extracted_data.bugs?.join("; ") || "none"}
Fixes: ${m.extracted_data.bugfixes?.join("; ") || "none"}
Code: ${m.extracted_data.code_snippets?.join("; ") || "none"}`
      )
      .join("\n\n");

    const prompt = `You are a helpful assistant answering questions about the project "${projectName}" using only the memories provided below. These are saved AI conversations from the user's past work sessions.

MEMORIES:
${memoryContext}

QUESTION: ${question}

Answer the question directly and specifically using only information found in these memories. If the memories mention dates or relative timing (e.g. "yesterday", a date), use that to answer "when" questions precisely. If the answer isn't in these memories, say so honestly rather than guessing.

Return ONLY valid JSON, no markdown backticks, no other text:
{
  "answer": "your direct answer to the question, 2-4 sentences, conversational tone",
  "citedMemoryIds": ["the MEMORY ID values you actually used to answer, e.g. the literal ids from the brackets above"]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      answer: parsed.answer || "I couldn't generate an answer from the available memories.",
      citedMemoryIds: parsed.citedMemoryIds || [],
    };
  },

  async extractKnowledge(apiKey, rawConversation, aiModel) {
    const model = getModel(apiKey);

    const prompt = `You are a knowledge extraction AI. Analyze this AI conversation and extract structured information.

Return ONLY valid JSON with this exact structure, no other text, no markdown backticks:
{
  "title": "short descriptive title of what was accomplished (max 10 words)",
  "summary": "2-3 sentence summary of the conversation",
  "formatted_conversation": "the conversation rewritten as clean turns, one per line, formatted exactly as 'User: ...' and '${aiModel}: ...' alternating. Strip out any page noise, UI labels, timestamps, sidebar content, or unrelated browser extension text. Preserve the actual dialogue's wording faithfully \u2014 do not summarize it, just clean it up.",
  "extracted": {
    "decisions": ["list of decisions made"],
    "features": ["list of features discussed or built"],
    "bugs": ["list of bugs discovered"],
    "bugfixes": ["list of bugs fixed"],
    "code_snippets": ["important code patterns mentioned, described briefly"],
    "todos": ["action items and todos"],
    "ideas": ["ideas discussed"],
    "architecture": ["architecture decisions"],
    "research": ["research findings"],
    "questions": ["open questions"]
  }
}

If a category has nothing relevant, return an empty array for it. Never omit a key.

CONVERSATION:
${rawConversation}`;

    const result = await model.generateContent(prompt);
    const parsed = safeParseJson(result.response.text());

    return {
      title: parsed.title || "Untitled session",
      summary: parsed.summary || "",
      formatted_conversation: parsed.formatted_conversation || rawConversation,
      extracted: {
        decisions: parsed.extracted?.decisions || [],
        features: parsed.extracted?.features || [],
        bugs: parsed.extracted?.bugs || [],
        bugfixes: parsed.extracted?.bugfixes || [],
        code_snippets: parsed.extracted?.code_snippets || [],
        todos: parsed.extracted?.todos || [],
        ideas: parsed.extracted?.ideas || [],
        architecture: parsed.extracted?.architecture || [],
        research: parsed.extracted?.research || [],
        questions: parsed.extracted?.questions || [],
      },
    } satisfies ExtractionResult;
  },

  async generateSwitchContext(apiKey, projectName, projectDescription, memoryBlocks) {
    if (memoryBlocks.length === 0) {
      return `PROJECT: ${projectName}\n${
        projectDescription ? `DESCRIPTION: ${projectDescription}\n` : ""
      }\nNo sessions have been saved yet.`;
    }

    const model = getModel(apiKey);
    const memorySummary = memoryBlocks
      .map(
        (m) => `[${m.ai_model} - ${new Date(m.created_at).toLocaleDateString()}]
Title: ${m.title}
Summary: ${m.summary}
Decisions: ${m.extracted_data.decisions?.join(", ") || "none"}
Features: ${m.extracted_data.features?.join(", ") || "none"}
Bugs: ${m.extracted_data.bugs?.join(", ") || "none"}
Todos: ${m.extracted_data.todos?.join(", ") || "none"}`
      )
      .join("\n\n");

    const prompt = `You are a context compression AI. Generate a clean, AI-optimized context document from this project history.

PROJECT: ${projectName}
DESCRIPTION: ${projectDescription || "No description provided"}

CONVERSATION HISTORY:
${memorySummary}

Generate a context document with: Project overview, Tech stack and constraints, Key decisions made, Completed work, Pending work and next steps, Known issues, Important code patterns.

Be concise but complete. Remove duplicate information.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  },

  async updateKnowledgeGraph(apiKey, existingData, newMemory) {
    const model = getModel(apiKey);

    const prompt = `You maintain a project's living knowledge graph. Merge new information into the existing knowledge, removing duplicates and outdated items.

EXISTING KNOWLEDGE:
${JSON.stringify(existingData, null, 2)}

NEW SESSION:
Title: ${newMemory.title}
Summary: ${newMemory.summary}
Decisions: ${newMemory.extracted_data.decisions?.join(", ") || "none"}
Features: ${newMemory.extracted_data.features?.join(", ") || "none"}
Bugs found: ${newMemory.extracted_data.bugs?.join(", ") || "none"}
Bugs fixed: ${newMemory.extracted_data.bugfixes?.join(", ") || "none"}
Todos: ${newMemory.extracted_data.todos?.join(", ") || "none"}
Architecture: ${newMemory.extracted_data.architecture?.join(", ") || "none"}

Return ONLY valid JSON, no markdown backticks, matching this exact structure:
{
  "purpose": ["concise statements of what this project is for"],
  "tech_stack": ["technologies in use"],
  "decisions": ["key decisions made, deduplicated"],
  "completed": ["work that is done"],
  "pending": ["work still to do"],
  "blockers": ["current blockers, remove if resolved"],
  "ideas": ["ideas under consideration"],
  "architecture": ["architecture choices"]
}`;

    const result = await model.generateContent(prompt);
    return safeParseJson(result.response.text()) as KnowledgeGraphData;
  },
};