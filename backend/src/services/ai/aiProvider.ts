/**
 * @fileoverview AI Provider Interface (Phase G)
 * 
 * Abstract interface for AI providers. This allows the system to work with
 * different AI backends (OpenAI, local LLMs, mock for testing).
 * 
 * The default implementation uses a mock provider for testing and demo purposes.
 * In production, configure with an actual AI provider API key.
 */

import { AIMessage, AIResponse, AIProviderConfig } from '../../types/ai';

/**
 * Abstract AI Provider Interface
 */
export interface IAIProvider {
  /**
   * Send a chat completion request to the AI
   * 
   * @param messages - Array of messages in the conversation
   * @param config - Optional configuration overrides
   * @returns AI response
   */
  chat(messages: AIMessage[], config?: Partial<AIProviderConfig>): Promise<AIResponse>;
  
  /**
   * Check if the provider is configured and available
   */
  isAvailable(): boolean;
}

/**
 * Mock AI Provider for testing and demo purposes
 * 
 * This provider generates deterministic responses based on input patterns.
 * It's useful for testing the AI pipeline without requiring an actual AI service.
 */
export class MockAIProvider implements IAIProvider {
  isAvailable(): boolean {
    return true;
  }
  
  async chat(messages: AIMessage[], _config?: Partial<AIProviderConfig>): Promise<AIResponse> {
    // Find the user message
    const userMessage = messages.find(m => m.role === 'user');
    if (!userMessage) {
      return { content: '{"error": "No user message provided"}' };
    }
    
    const content = userMessage.content.toLowerCase();
    
    // Detect the type of request based on content
    if (content.includes('summarize') || content.includes('summary')) {
      return this.generateMockSummary(userMessage.content);
    }
    
    if (content.includes('actionable tasks') || content.includes('extract') && content.includes('task')) {
      return this.generateMockTasks(userMessage.content);
    }
    
    if (content.includes('suggest') && content.includes('link')) {
      return this.generateMockLinkSuggestions(userMessage.content);
    }
    
    if (content.includes('answer') && content.includes('question')) {
      return this.generateMockQAResponse(userMessage.content);
    }
    
    // Default response
    return {
      content: JSON.stringify({
        message: 'Mock AI response',
        received: userMessage.content.substring(0, 100),
      }),
    };
  }
  
  private generateMockSummary(content: string): AIResponse {
    // Extract some text from the note content
    const noteMatch = content.match(/Note Content:\s*---\s*([\s\S]*?)\s*---/);
    const noteContent = noteMatch ? noteMatch[1].trim() : content;
    
    // Generate a simple summary
    const words = noteContent.split(/\s+/).filter(w => w.length > 3);
    const uniqueWords = [...new Set(words)].slice(0, 5);
    
    const summary = noteContent.length > 200
      ? noteContent.substring(0, 200).trim() + '...'
      : noteContent;
    
    return {
      content: JSON.stringify({
        summary: `This note discusses: ${summary.substring(0, 100)}...`,
        bullets: [
          'Main topic: ' + (uniqueWords[0] || 'general content'),
          'Contains key information',
          'Structured content identified',
        ],
        keyConcepts: uniqueWords.slice(0, 3).map(w => w.replace(/[^a-zA-Z]/g, '')),
      }),
    };
  }
  
  private generateMockTasks(content: string): AIResponse {
    const tasks: Array<{ title: string; description: string; confidence: number; suggestedPriority: string }> = [];
    
    // Look for common task patterns
    const lines = content.split('\n');
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('todo:') || lowerLine.includes('- [ ]')) {
        const taskText = line.replace(/todo:?/i, '').replace(/- \[ \]/g, '').trim();
        if (taskText.length > 5) {
          tasks.push({
            title: taskText.substring(0, 100),
            description: 'Extracted from note',
            confidence: 0.85,
            suggestedPriority: 'medium',
          });
        }
      }
      
      if (lowerLine.includes('need to') || lowerLine.includes('must') || lowerLine.includes('should')) {
        const match = line.match(/(?:need to|must|should)\s+(.+?)(?:\.|$)/i);
        if (match && match[1].length > 5) {
          tasks.push({
            title: match[1].trim().substring(0, 100),
            description: 'Extracted action item',
            confidence: 0.7,
            suggestedPriority: lowerLine.includes('urgent') || lowerLine.includes('asap') ? 'high' : 'medium',
          });
        }
      }
    }
    
    // If no tasks found, return empty array
    return {
      content: JSON.stringify({ tasks }),
    };
  }
  
  private generateMockLinkSuggestions(content: string): AIResponse {
    // Parse candidate notes from the content
    const candidateMatches = content.matchAll(/ID: ([a-f0-9-]+), Title: "([^"]+)"/g);
    const candidates = [...candidateMatches];
    
    // Generate suggestions for first 3 candidates
    const suggestions = candidates.slice(0, 3).map((match, index) => ({
      targetNoteId: match[1],
      reason: `Related topic based on content similarity with "${match[2]}"`,
      confidence: Math.max(0.5, 0.9 - (index * 0.15)),
    }));
    
    return {
      content: JSON.stringify({ suggestions }),
    };
  }
  
  private generateMockQAResponse(content: string): AIResponse {
    // Extract the question
    const questionMatch = content.match(/Question:\s*(.+?)(?:\n|$)/);
    const question = questionMatch ? questionMatch[1].trim() : '';
    
    // Extract notes context
    const notesMatch = content.match(/My Notes:([\s\S]+?)(?:Instructions:|$)/);
    const notesContext = notesMatch ? notesMatch[1].trim() : '';
    
    if (!notesContext || notesContext.length < 50) {
      return {
        content: JSON.stringify({
          answer: 'Not found in your notes',
          sources: [],
          foundInVault: false,
        }),
      };
    }
    
    // Extract note info
    const noteInfoMatches = notesContext.matchAll(/--- Note \d+: "([^"]+)" \(ID: ([^)]+)\) ---\s*([\s\S]*?)(?=--- Note|\z)/g);
    const notes = [...noteInfoMatches];
    
    if (notes.length === 0) {
      return {
        content: JSON.stringify({
          answer: 'Not found in your notes',
          sources: [],
          foundInVault: false,
        }),
      };
    }
    
    // Generate a mock answer based on the first note
    const firstNote = notes[0];
    const excerpt = firstNote[3].trim().substring(0, 200);
    
    return {
      content: JSON.stringify({
        answer: `Based on your notes: ${excerpt}...`,
        sources: notes.slice(0, 2).map(n => ({
          noteId: n[2],
          title: n[1],
          excerpt: n[3].trim().substring(0, 100),
        })),
        foundInVault: true,
      }),
    };
  }
}

/**
 * HTTP-based AI Provider for external AI services
 * 
 * Supports OpenAI-compatible APIs. Configure via environment variables:
 * - AI_API_KEY: API key for the service
 * - AI_BASE_URL: Base URL (defaults to OpenAI)
 * - AI_MODEL: Model to use (defaults to gpt-3.5-turbo)
 */
export class HTTPAIProvider implements IAIProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  
  constructor(config?: AIProviderConfig) {
    this.apiKey = config?.apiKey || process.env.AI_API_KEY || '';
    this.baseUrl = config?.baseUrl || process.env.AI_BASE_URL || 'https://api.openai.com/v1';
    this.model = config?.model || process.env.AI_MODEL || 'gpt-3.5-turbo';
  }
  
  isAvailable(): boolean {
    return !!this.apiKey;
  }
  
  async chat(messages: AIMessage[], config?: Partial<AIProviderConfig>): Promise<AIResponse> {
    if (!this.isAvailable()) {
      throw new Error('AI provider not configured. Set AI_API_KEY environment variable.');
    }
    
    const temperature = config?.temperature ?? 0.3;
    const maxTokens = config?.maxTokens ?? 1000;
    
    try {
      // Use dynamic import for axios to avoid issues in test environment
      const axios = await import('axios');
      
      const response = await axios.default.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          temperature,
          max_tokens: maxTokens,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const choice = response.data.choices?.[0];
      if (!choice?.message?.content) {
        throw new Error('Invalid response from AI provider');
      }
      
      return {
        content: choice.message.content,
        usage: response.data.usage ? {
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens,
        } : undefined,
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid AI API key');
      }
      if (error.response?.status === 429) {
        throw new Error('AI API rate limit exceeded');
      }
      throw new Error(`AI provider error: ${error.message}`);
    }
  }
}

/**
 * Get the configured AI provider
 * 
 * Returns HTTPAIProvider if AI_API_KEY is set, otherwise MockAIProvider.
 */
export function getAIProvider(): IAIProvider {
  const apiKey = process.env.AI_API_KEY;
  
  if (apiKey) {
    return new HTTPAIProvider({ apiKey });
  }
  
  // Default to mock provider for testing/demo
  return new MockAIProvider();
}

// Export singleton instance
let _aiProvider: IAIProvider | null = null;

export function getDefaultAIProvider(): IAIProvider {
  if (!_aiProvider) {
    _aiProvider = getAIProvider();
  }
  return _aiProvider;
}

/**
 * Reset the AI provider (useful for testing)
 */
export function resetAIProvider(): void {
  _aiProvider = null;
}

/**
 * Set a custom AI provider (useful for testing)
 */
export function setAIProvider(provider: IAIProvider): void {
  _aiProvider = provider;
}
