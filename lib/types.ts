export type Project = {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
}

export type MemoryBlock = {
  id: string
  project_id: string
  ai_model: string
  raw_conversation: string
  title: string
  summary: string
  extracted_data: ExtractedData
  created_at: string
}

export type ExtractedData = {
  decisions: string[]
  features: string[]
  bugs: string[]
  bugfixes: string[]
  code_snippets: string[]
  todos: string[]
  ideas: string[]
  architecture: string[]
  research: string[]
  questions: string[]
}

export type KnowledgeGraph = {
  id: string
  project_id: string
  data: KnowledgeData
  updated_at: string
}

export type KnowledgeData = {
  purpose: string[]
  tech_stack: string[]
  decisions: string[]
  completed: string[]
  pending: string[]
  blockers: string[]
  ideas: string[]
  architecture: string[]
}