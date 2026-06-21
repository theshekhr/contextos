import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ExtractedData } from "./types";

function getModel(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

function safeParseJson(text: string) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

export async function extractKnowledgeFromConversation(
  apiKey: string,
  rawConversation: string
): Promise<{ title: string; summary: string; extracted: ExtractedData }> {
  const model = getModel(apiKey);

  const prompt = `You are a knowledge extraction AI. Analyze this AI conversation and extract structured information.

Return ONLY valid JSON with this exact structure, no other text, no markdown backticks:
{
  "title": "short descriptive title of what was accomplished (max 10 words)",
  "summary": "2-3 sentence summary of the conversation",
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
  const text = result.response.text();
  const parsed = safeParseJson(text);

  return {
    title: parsed.title || "Untitled session",
    summary: parsed.summary || "",
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
  };
}

export async function generateSwitchContext(
  apiKey: string,
  projectName: string,
  projectDescription: string,
  memoryBlocks: Array<{
    title: string;
    summary: string;
    extracted_data: ExtractedData;
    ai_model: string;
    created_at: string;
  }>
): Promise<string> {
  if (memoryBlocks.length === 0) {
    return `PROJECT: ${projectName}\n${
      projectDescription ? `DESCRIPTION: ${projectDescription}\n` : ""
    }\nNo sessions have been saved yet. Start using an AI tool and save the conversation to build up this project's context.`;
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

The document will be pasted into a new AI conversation so the AI can instantly understand the full project context.

PROJECT: ${projectName}
DESCRIPTION: ${projectDescription || "No description provided"}

CONVERSATION HISTORY:
${memorySummary}

Generate a context document with these sections:
- Project overview
- Tech stack and constraints
- Key decisions made
- Completed work
- Pending work and next steps
- Known issues
- Important code patterns

Be concise but complete. Remove duplicate information. Format it clearly so an AI can immediately understand the full project state and continue working without re-explanation.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function updateKnowledgeGraph(
  apiKey: string,
  existingData: {
    purpose: string[];
    tech_stack: string[];
    decisions: string[];
    completed: string[];
    pending: string[];
    blockers: string[];
    ideas: string[];
    architecture: string[];
  },
  newMemory: { title: string; summary: string; extracted_data: ExtractedData }
) {
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
  return safeParseJson(result.response.text());
}