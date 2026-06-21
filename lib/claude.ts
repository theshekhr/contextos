import { GoogleGenerativeAI } from '@google/generative-ai'
import { ExtractedData } from './types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

export async function extractKnowledgeFromConversation(
  rawConversation: string
): Promise<{ title: string; summary: string; extracted: ExtractedData }> {
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
    "code_snippets": ["important code patterns mentioned"],
    "todos": ["action items and todos"],
    "ideas": ["ideas discussed"],
    "architecture": ["architecture decisions"],
    "research": ["research findings"],
    "questions": ["open questions"]
  }
}

CONVERSATION:
${rawConversation}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const cleaned = text.replace(/```json|```/g, '').trim()
  return JSON.parse(cleaned)
}

export async function generateSwitchContext(
  projectName: string,
  projectDescription: string,
  memoryBlocks: Array<{
    title: string
    summary: string
    extracted_data: ExtractedData
    ai_model: string
    created_at: string
  }>
): Promise<string> {
  const memorySummary = memoryBlocks
    .map(
      m => `[${m.ai_model} - ${new Date(m.created_at).toLocaleDateString()}]
Title: ${m.title}
Summary: ${m.summary}
Decisions: ${m.extracted_data.decisions?.join(', ') || 'none'}
Features: ${m.extracted_data.features?.join(', ') || 'none'}
Todos: ${m.extracted_data.todos?.join(', ') || 'none'}`
    )
    .join('\n\n')

  const prompt = `You are a context compression AI. Generate a clean, AI-optimized context document from this project history.

The document will be pasted into a new AI conversation so the AI can instantly understand the full project context.

PROJECT: ${projectName}
DESCRIPTION: ${projectDescription}

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

Be concise but complete. Format it clearly so an AI can immediately understand the full project state.`

  const result = await model.generateContent(prompt)
  return result.response.text()
}