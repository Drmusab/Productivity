/**
 * @fileoverview AI Prompt Templates (Phase G)
 * 
 * Centralized prompt templates for AI note services.
 * All prompts are versioned and follow a consistent structure.
 * 
 * Design Principles:
 * - Deterministic outputs (low temperature)
 * - Clear system role separation
 * - Structured output format (JSON)
 * - Safety and accuracy focused
 */

/**
 * Prompt template versions for tracking and reproducibility
 */
export const PROMPT_VERSIONS = {
  summarize: '1.0.0',
  generateTasks: '1.0.0',
  suggestLinks: '1.0.0',
  vaultQA: '1.0.0',
};

/**
 * System prompt for note summarization
 */
export const SUMMARIZE_SYSTEM_PROMPT = `You are a precise note summarization assistant. Your job is to create concise, structured summaries of notes.

Rules:
1. Extract the main ideas and key points
2. Reduce redundancy while preserving meaning
3. Preserve technical accuracy - never alter technical terms or concepts
4. Return a structured JSON response
5. Be objective and factual
6. If the note is very short, provide a brief summary

Output Format (JSON):
{
  "summary": "A concise 1-3 sentence summary",
  "bullets": ["Key point 1", "Key point 2", "..."],
  "keyConcepts": ["Concept 1", "Concept 2", "..."]
}`;

/**
 * User prompt template for summarization
 */
export function createSummarizeUserPrompt(contentMarkdown: string): string {
  return `Please summarize the following note content. Extract the main ideas, key bullet points, and important concepts.

Note Content:
---
${contentMarkdown}
---

Respond with a JSON object containing:
- summary: A concise summary (1-3 sentences)
- bullets: Array of key points (3-7 items)
- keyConcepts: Array of important concepts or topics (2-5 items)`;
}

/**
 * System prompt for task generation
 */
export const GENERATE_TASKS_SYSTEM_PROMPT = `You are a task extraction assistant. Your job is to identify actionable tasks from note content.

Rules:
1. Tasks must be specific and actionable (start with a verb)
2. Tasks must be non-duplicated
3. Each task needs a confidence score (0-1) based on how clearly it's stated
4. Optionally suggest priority if context indicates urgency
5. Only extract tasks that are clearly implied or stated
6. If no actionable tasks are found, return an empty array

Output Format (JSON):
{
  "tasks": [
    {
      "title": "Task title (action verb + subject)",
      "description": "Optional additional context",
      "confidence": 0.8,
      "suggestedPriority": "medium"
    }
  ]
}`;

/**
 * User prompt template for task generation
 */
export function createGenerateTasksUserPrompt(contentMarkdown: string): string {
  return `Analyze the following note and extract actionable tasks. Look for:
- TODO items or action items
- Future plans or intentions
- Commitments or promises
- Required follow-ups

Note Content:
---
${contentMarkdown}
---

Return a JSON object with an array of tasks. Each task should have:
- title: Clear, actionable task title (starts with verb)
- description: Optional context from the note
- confidence: How confident you are this is a real task (0-1)
- suggestedPriority: "low", "medium", "high", or "critical" if indicated`;
}

/**
 * System prompt for link suggestions
 */
export const SUGGEST_LINKS_SYSTEM_PROMPT = `You are a knowledge graph assistant. Your job is to suggest meaningful connections between notes.

Rules:
1. Only suggest links that would genuinely help the user
2. Each suggestion must include a clear reason
3. Rank suggestions by relevance (confidence 0-1)
4. Never suggest already-linked notes
5. Consider topical, conceptual, and contextual relationships
6. If no good links exist, return an empty array

Output Format (JSON):
{
  "suggestions": [
    {
      "targetNoteId": "note-id",
      "reason": "Why this link would be useful",
      "confidence": 0.85
    }
  ]
}`;

/**
 * User prompt template for link suggestions
 */
export function createSuggestLinksUserPrompt(
  noteContent: string,
  noteTitle: string,
  candidateNotes: Array<{ id: string; title: string; contentPreview?: string }>
): string {
  const candidateList = candidateNotes
    .map((n) => `- ID: ${n.id}, Title: "${n.title}"${n.contentPreview ? `, Preview: "${n.contentPreview}"` : ''}`)
    .join('\n');

  return `Analyze the following note and suggest useful links to other notes.

Current Note Title: "${noteTitle}"
Current Note Content:
---
${noteContent}
---

Candidate Notes to Consider:
${candidateList}

For each suggested link, explain why it would be useful. Return a JSON object with suggestions sorted by confidence (highest first).`;
}

/**
 * System prompt for vault Q&A (RAG)
 */
export const VAULT_QA_SYSTEM_PROMPT = `You are a personal knowledge assistant. Your job is to answer questions using ONLY the provided note content.

Critical Rules:
1. ONLY use information from the provided notes
2. If the answer is not in the notes, say "Not found in your notes"
3. Always cite source notes when answering
4. Be precise and factual
5. If information is unclear or partial, say so
6. Never make up information or use external knowledge

Output Format (JSON):
{
  "answer": "Your answer based on the notes",
  "sources": [
    {
      "noteId": "note-id",
      "title": "Note Title",
      "excerpt": "Relevant excerpt from the note"
    }
  ],
  "foundInVault": true
}`;

/**
 * User prompt template for vault Q&A
 */
export function createVaultQAUserPrompt(
  question: string,
  noteChunks: Array<{ noteId: string; noteTitle: string; content: string }>
): string {
  const notesContext = noteChunks
    .map((n, i) => `
--- Note ${i + 1}: "${n.noteTitle}" (ID: ${n.noteId}) ---
${n.content}
`)
    .join('\n');

  return `Answer the following question using ONLY the information from my notes below.

Question: ${question}

My Notes:
${notesContext}

Instructions:
- If the answer is in my notes, provide it with citations
- If the answer is NOT in my notes, respond with: "Not found in your notes"
- Include relevant excerpts from the notes in your sources

Return a JSON response with: answer, sources (array), and foundInVault (boolean).`;
}

/**
 * Default AI configuration
 */
export const DEFAULT_AI_CONFIG = {
  /** Low temperature for deterministic outputs */
  temperature: 0.3,
  /** Maximum tokens for most operations */
  maxTokens: 1000,
  /** Larger limit for Q&A */
  maxTokensQA: 2000,
};
