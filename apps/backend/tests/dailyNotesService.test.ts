/**
 * @fileoverview Tests for Daily Notes Service (Phase F)
 */

// @ts-nocheck
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';

import { initDatabase, clearDatabase } from '../src/utils/database';
import { NoteService } from '../src/services/noteService';
import { DailyNotesService } from '../src/services/dailyNotesService';

describe('Daily Notes Service - Phase F', () => {
  let noteService: NoteService;
  let dailyNotesService: DailyNotesService;
  
  beforeAll(async () => {
    await initDatabase();
  });
  
  beforeEach(async () => {
    await clearDatabase();
    await initDatabase();
    noteService = new NoteService();
    dailyNotesService = new DailyNotesService();
  });
  
  describe('Daily Note Creation', () => {
    test('creates daily note for today', async () => {
      const noteId = await dailyNotesService.getOrCreateDailyNote();
      
      expect(noteId).toBeDefined();
      
      const note = await noteService.getNote(noteId);
      expect(note).toBeDefined();
      expect(note?.title).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(note?.folderPath).toBe('Daily');
      
      // Check frontmatter
      const frontmatter = JSON.parse(note!.frontmatter!);
      expect(frontmatter.type).toBe('daily');
      expect(frontmatter.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
    
    test('creates daily note for specific date', async () => {
      const date = '2024-01-15';
      const noteId = await dailyNotesService.getOrCreateDailyNote(date);
      
      const note = await noteService.getNote(noteId);
      expect(note?.title).toBe(date);
      
      const frontmatter = JSON.parse(note!.frontmatter!);
      expect(frontmatter.date).toBe(date);
    });
    
    test('is idempotent - returns existing note if already created', async () => {
      const date = '2024-01-15';
      
      const noteId1 = await dailyNotesService.getOrCreateDailyNote(date);
      const noteId2 = await dailyNotesService.getOrCreateDailyNote(date);
      
      expect(noteId1).toBe(noteId2);
      
      // Verify only one note exists
      const notes = await noteService.listNotes();
      const dailyNotes = notes.filter(n => n.title === date);
      expect(dailyNotes).toHaveLength(1);
    });
    
    test('applies template on creation', async () => {
      const noteId = await dailyNotesService.getOrCreateDailyNote();
      
      const note = await noteService.getNote(noteId);
      expect(note?.contentMarkdown).toContain('📝 Tasks Today');
      expect(note?.contentMarkdown).toContain('🔁 Habits');
      expect(note?.contentMarkdown).toContain('💭 Reflection');
      expect(note?.contentMarkdown).toContain('🔗 Linked Projects');
    });
    
    test('rejects invalid date format', async () => {
      await expect(dailyNotesService.getOrCreateDailyNote('invalid-date'))
        .rejects.toThrow('Invalid date format');
      
      await expect(dailyNotesService.getOrCreateDailyNote('2024-13-01'))
        .rejects.toThrow('Invalid date format');
      
      await expect(dailyNotesService.getOrCreateDailyNote('2024-01-32'))
        .rejects.toThrow('Invalid date format');
    });
  });
  
  describe('Template Management', () => {
    test('gets current template', () => {
      const template = dailyNotesService.getTemplate();
      
      expect(template).toBeDefined();
      expect(template.content).toBeDefined();
      expect(template.frontmatter).toBeDefined();
    });
    
    test('updates template', async () => {
      const customTemplate = {
        content: 'Custom daily note content\n## {{date}}\n{{weekday}}',
        frontmatter: {
          type: 'daily',
          custom: 'value',
        },
      };
      
      dailyNotesService.setTemplate(customTemplate);
      
      const noteId = await dailyNotesService.getOrCreateDailyNote('2024-01-15');
      const note = await noteService.getNote(noteId);
      
      expect(note?.contentMarkdown).toContain('Custom daily note content');
      expect(note?.contentMarkdown).toContain('2024-01-15');
      expect(note?.contentMarkdown).toContain('Monday');
      
      const frontmatter = JSON.parse(note!.frontmatter!);
      expect(frontmatter.custom).toBe('value');
    });
    
    test('resets template to default', async () => {
      // Set custom template
      dailyNotesService.setTemplate({
        content: 'Custom template',
        frontmatter: {},
      });
      
      // Reset to default
      dailyNotesService.resetTemplate();
      
      const noteId = await dailyNotesService.getOrCreateDailyNote();
      const note = await noteService.getNote(noteId);
      
      expect(note?.contentMarkdown).toContain('📝 Tasks Today');
    });
  });
  
  describe('Template Variable Substitution', () => {
    test('substitutes {{date}} variable', async () => {
      const customTemplate = {
        content: 'Date: {{date}}',
        frontmatter: {},
      };
      
      dailyNotesService.setTemplate(customTemplate);
      
      const noteId = await dailyNotesService.getOrCreateDailyNote('2024-03-15');
      const note = await noteService.getNote(noteId);
      
      expect(note?.contentMarkdown).toBe('Date: 2024-03-15');
    });
    
    test('substitutes {{weekday}} variable', async () => {
      const customTemplate = {
        content: 'Day: {{weekday}}',
        frontmatter: {},
      };
      
      dailyNotesService.setTemplate(customTemplate);
      
      // 2024-01-15 is a Monday
      const noteId = await dailyNotesService.getOrCreateDailyNote('2024-01-15');
      const note = await noteService.getNote(noteId);
      
      expect(note?.contentMarkdown).toBe('Day: Monday');
    });
    
    test('substitutes multiple variables', async () => {
      const customTemplate = {
        content: '# {{date}} - {{weekday}}\n\nToday is {{weekday}}, {{date}}',
        frontmatter: {},
      };
      
      dailyNotesService.setTemplate(customTemplate);
      
      const noteId = await dailyNotesService.getOrCreateDailyNote('2024-01-15');
      const note = await noteService.getNote(noteId);
      
      expect(note?.contentMarkdown).toContain('2024-01-15');
      expect(note?.contentMarkdown).toContain('Monday');
      expect(note?.contentMarkdown).toMatch(/Monday.*2024-01-15/);
    });
  });
  
  describe('Link Integration', () => {
    test('wikilinks in daily notes are parsed', async () => {
      const customTemplate = {
        content: '[[Project A]]\n[[Project B]]',
        frontmatter: {},
      };
      
      dailyNotesService.setTemplate(customTemplate);
      
      const noteId = await dailyNotesService.getOrCreateDailyNote('2024-01-15');
      
      // Check that links were created
      const links = await noteService.getOutgoingLinks(noteId);
      expect(links).toHaveLength(2);
      expect(links.map(l => l.unresolvedTarget).sort()).toEqual(['Project A', 'Project B']);
    });
    
    test('daily notes participate in backlinks', async () => {
      // Create a project note
      const projectId = await noteService.createNote({
        title: 'Project A',
        contentMarkdown: 'Project details',
      });
      
      // Create daily note that links to project
      const customTemplate = {
        content: '[[Project A]]',
        frontmatter: {},
      };
      
      dailyNotesService.setTemplate(customTemplate);
      await dailyNotesService.getOrCreateDailyNote('2024-01-15');
      
      // Check backlinks
      const backlinks = await noteService.getBacklinks(projectId);
      expect(backlinks).toHaveLength(1);
      expect(backlinks[0].noteTitle).toBe('2024-01-15');
    });
    
    test('creating project note resolves daily note links', async () => {
      // Create daily note with unresolved link
      const customTemplate = {
        content: '[[Future Project]]',
        frontmatter: {},
      };
      
      dailyNotesService.setTemplate(customTemplate);
      const dailyNoteId = await dailyNotesService.getOrCreateDailyNote('2024-01-15');
      
      // Verify link is unresolved
      let links = await noteService.getOutgoingLinks(dailyNoteId);
      expect(links[0].unresolvedTarget).toBe('Future Project');
      
      // Create the project note
      const projectId = await noteService.createNote({
        title: 'Future Project',
        contentMarkdown: 'Project content',
      });
      
      await noteService.resolveLinksForNewNote(projectId);
      
      // Verify link is now resolved
      links = await noteService.getOutgoingLinks(dailyNoteId);
      expect(links[0].targetNoteId).toBe(projectId);
      expect(links[0].unresolvedTarget).toBeUndefined();
    });
  });
  
  describe('Duplicate Prevention', () => {
    test('prevents duplicate daily notes for same date', async () => {
      const date = '2024-01-15';
      
      // Create note multiple times
      const id1 = await dailyNotesService.getOrCreateDailyNote(date);
      const id2 = await dailyNotesService.getOrCreateDailyNote(date);
      const id3 = await dailyNotesService.getOrCreateDailyNote(date);
      
      expect(id1).toBe(id2);
      expect(id2).toBe(id3);
      
      // Verify only one note exists for this date
      const allNotes = await noteService.listNotes();
      const dailyNotes = allNotes.filter(n => n.title === date);
      expect(dailyNotes).toHaveLength(1);
    });
  });
  
  describe('Edge Cases', () => {
    test('handles different days of week correctly', async () => {
      const testCases = [
        { date: '2024-01-14', weekday: 'Sunday' },
        { date: '2024-01-15', weekday: 'Monday' },
        { date: '2024-01-16', weekday: 'Tuesday' },
        { date: '2024-01-17', weekday: 'Wednesday' },
        { date: '2024-01-18', weekday: 'Thursday' },
        { date: '2024-01-19', weekday: 'Friday' },
        { date: '2024-01-20', weekday: 'Saturday' },
      ];
      
      const customTemplate = {
        content: '{{weekday}}',
        frontmatter: {},
      };
      
      dailyNotesService.setTemplate(customTemplate);
      
      for (const testCase of testCases) {
        const noteId = await dailyNotesService.getOrCreateDailyNote(testCase.date);
        const note = await noteService.getNote(noteId);
        expect(note?.contentMarkdown).toBe(testCase.weekday);
      }
    });
    
    test('handles leap year dates', async () => {
      const date = '2024-02-29'; // 2024 is a leap year
      const noteId = await dailyNotesService.getOrCreateDailyNote(date);
      
      const note = await noteService.getNote(noteId);
      expect(note?.title).toBe(date);
    });
  });
});
