/**
 * @fileoverview Daily Notes Service - Phase F
 * 
 * This service implements the daily notes workflow similar to Obsidian.
 * It provides:
 * - Automatic daily note creation with templates
 * - Template variable substitution
 * - Idempotent "open or create" logic
 * 
 * Daily notes serve as the entry point for:
 * - Journaling
 * - Task planning
 * - Habit tracking
 * - Knowledge linking
 */

import { noteService } from './noteService';
import { DailyNoteTemplate, TemplateVariables, NoteFrontmatter } from '../types/notes';

/**
 * Default daily note template
 */
const DEFAULT_DAILY_TEMPLATE: DailyNoteTemplate = {
  content: `## 📝 Tasks Today
- [ ] 

## 🔁 Habits
- [ ] Sleep 7–8h
- [ ] Exercise
- [ ] Study
- [ ] Journal

## 💭 Reflection
-

## 🔗 Linked Projects
- [[Project A]]
- [[Project B]]
`,
  frontmatter: {
    type: 'daily',
  },
};

/**
 * Daily Notes Service Class
 */
export class DailyNotesService {
  private template: DailyNoteTemplate = DEFAULT_DAILY_TEMPLATE;
  
  /**
   * Get or create a daily note for the specified date
   * 
   * This method is idempotent - it will return the existing note if it exists,
   * or create a new one from the template if it doesn't.
   * 
   * Note: Uses case-insensitive title lookup which requires O(n) scan.
   * This is acceptable for daily notes since it's called once per request
   * and note counts are typically <100k.
   * 
   * @param date - Date in YYYY-MM-DD format (defaults to today)
   * @returns Note ID of the daily note
   */
  async getOrCreateDailyNote(date?: string): Promise<string> {
    const noteDate = date || this.getTodayDate();
    
    // Validate date format
    if (!this.isValidDate(noteDate)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }
    
    // Check if note already exists
    const existingNote = await noteService.getNoteByTitle(noteDate);
    if (existingNote) {
      return existingNote.id;
    }
    
    // Create new daily note from template
    const variables = this.getTemplateVariables(noteDate);
    const content = this.substituteVariables(this.template.content, variables);
    
    // Merge template frontmatter with daily-specific frontmatter
    const frontmatter: NoteFrontmatter = {
      ...this.template.frontmatter,
      type: 'daily',
      date: noteDate,
    };
    
    const noteId = await noteService.createNote({
      title: noteDate,
      folderPath: 'Daily',
      contentMarkdown: content,
      frontmatter,
    });
    
    // Auto-resolve any links created in the daily note
    await noteService.resolveLinksForNewNote(noteId);
    
    return noteId;
  }
  
  /**
   * Get the current daily note template
   * 
   * @returns Current template
   */
  getTemplate(): DailyNoteTemplate {
    return { ...this.template };
  }
  
  /**
   * Update the daily note template
   * 
   * @param template - New template
   */
  setTemplate(template: DailyNoteTemplate): void {
    this.template = template;
  }
  
  /**
   * Reset template to default
   */
  resetTemplate(): void {
    this.template = DEFAULT_DAILY_TEMPLATE;
  }
  
  /**
   * Get today's date in YYYY-MM-DD format
   * 
   * @returns Date string
   */
  private getTodayDate(): string {
    const now = new Date();
    return this.formatDate(now);
  }
  
  /**
   * Format date as YYYY-MM-DD
   * 
   * @param date - Date object
   * @returns Formatted date string
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  /**
   * Validate date format (YYYY-MM-DD)
   * 
   * @param dateStr - Date string to validate
   * @returns True if valid
   */
  private isValidDate(dateStr: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) {
      return false;
    }
    
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  }
  
  /**
   * Get template variables for a given date
   * 
   * @param dateStr - Date in YYYY-MM-DD format
   * @returns Template variables
   */
  private getTemplateVariables(dateStr: string): TemplateVariables {
    const date = new Date(dateStr);
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return {
      date: dateStr,
      weekday: weekdays[date.getDay()],
    };
  }
  
  /**
   * Substitute template variables in content
   * 
   * Supports:
   * - {{date}} - YYYY-MM-DD
   * - {{weekday}} - Day of week name
   * - {{key}} - Any custom variable
   * 
   * @param content - Template content
   * @param variables - Variable values
   * @returns Content with variables substituted
   */
  private substituteVariables(content: string, variables: TemplateVariables): string {
    let result = content;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
    
    return result;
  }
}

// Export singleton instance
export const dailyNotesService = new DailyNotesService();
