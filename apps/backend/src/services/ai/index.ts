/**
 * @fileoverview AI Services Index (Phase G)
 * 
 * Exports all AI-related services and utilities.
 */

// AI Provider
export {
  IAIProvider,
  MockAIProvider,
  HTTPAIProvider,
  getAIProvider,
  getDefaultAIProvider,
  resetAIProvider,
  setAIProvider,
} from './aiProvider';

// Prompt Templates
export {
  PROMPT_VERSIONS,
  SUMMARIZE_SYSTEM_PROMPT,
  GENERATE_TASKS_SYSTEM_PROMPT,
  SUGGEST_LINKS_SYSTEM_PROMPT,
  VAULT_QA_SYSTEM_PROMPT,
  createSummarizeUserPrompt,
  createGenerateTasksUserPrompt,
  createSuggestLinksUserPrompt,
  createVaultQAUserPrompt,
  DEFAULT_AI_CONFIG,
} from './prompts';

// Note AI Service
export {
  NoteAIService,
  noteAIService,
} from './noteAIService';
