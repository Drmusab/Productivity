/**
 * @fileoverview Tests for Markdown Link Parser
 */

import {
  parseWikilinkText,
  extractWikilinks,
  extractMarkdownLinks,
  normalizeNoteTitle,
  noteTitlesMatch,
  determineLinkType,
  validateWikilinkSyntax,
  getUniqueNoteTitles,
  countLinksByType,
} from '../src/utils/markdownLinkParser';

describe('Markdown Link Parser', () => {
  describe('parseWikilinkText', () => {
    test('parses simple wikilink', () => {
      const result = parseWikilinkText('Note Title');
      expect(result).toEqual({
        noteTitle: 'Note Title',
      });
    });
    
    test('parses heading link', () => {
      const result = parseWikilinkText('Note Title#Introduction');
      expect(result).toEqual({
        noteTitle: 'Note Title',
        heading: 'Introduction',
      });
    });
    
    test('parses block reference', () => {
      const result = parseWikilinkText('Note Title^block-123');
      expect(result).toEqual({
        noteTitle: 'Note Title',
        blockId: 'block-123',
      });
    });
    
    test('trims whitespace', () => {
      const result = parseWikilinkText('  Note Title  #  Heading  ');
      expect(result).toEqual({
        noteTitle: 'Note Title',
        heading: 'Heading',
      });
    });
  });
  
  describe('extractWikilinks', () => {
    test('extracts single wikilink', () => {
      const markdown = 'This is a [[Note Title]] in text.';
      const links = extractWikilinks(markdown);
      
      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({
        fullText: '[[Note Title]]',
        noteTitle: 'Note Title',
        position: {
          start: 10,
          end: 24,
        },
      });
    });
    
    test('extracts multiple wikilinks', () => {
      const markdown = 'See [[Note A]] and [[Note B#Section]] for details.';
      const links = extractWikilinks(markdown);
      
      expect(links).toHaveLength(2);
      expect(links[0].noteTitle).toBe('Note A');
      expect(links[1].noteTitle).toBe('Note B');
      expect(links[1].heading).toBe('Section');
    });
    
    test('extracts wikilinks with block references', () => {
      const markdown = 'Reference [[Note Title^block-id]] here.';
      const links = extractWikilinks(markdown);
      
      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({
        noteTitle: 'Note Title',
        blockId: 'block-id',
      });
    });
    
    test('handles empty markdown', () => {
      const links = extractWikilinks('');
      expect(links).toHaveLength(0);
    });
    
    test('handles markdown with no links', () => {
      const markdown = 'This is plain text with no links.';
      const links = extractWikilinks(markdown);
      expect(links).toHaveLength(0);
    });
    
    test('extracts links from multiline markdown', () => {
      const markdown = `# Heading
      
This is a note about [[Project A]].

## Details

See also:
- [[Project B]]
- [[Project C#Overview]]
`;
      const links = extractWikilinks(markdown);
      
      expect(links).toHaveLength(3);
      expect(links.map(l => l.noteTitle)).toEqual(['Project A', 'Project B', 'Project C']);
    });
  });
  
  describe('extractMarkdownLinks', () => {
    test('returns extraction result with statistics', () => {
      const markdown = 'Links: [[A]], [[B]], [[C]]';
      const result = extractMarkdownLinks(markdown);
      
      expect(result.wikilinks).toHaveLength(3);
      expect(result.totalLinks).toBe(3);
      expect(result.unresolvedCount).toBe(0);
    });
  });
  
  describe('normalizeNoteTitle', () => {
    test('normalizes title case', () => {
      expect(normalizeNoteTitle('Note Title')).toBe('note title');
      expect(normalizeNoteTitle('NOTE TITLE')).toBe('note title');
    });
    
    test('trims whitespace', () => {
      expect(normalizeNoteTitle('  Note Title  ')).toBe('note title');
    });
    
    test('normalizes multiple spaces', () => {
      expect(normalizeNoteTitle('Note    Title')).toBe('note title');
    });
  });
  
  describe('noteTitlesMatch', () => {
    test('matches case-insensitive titles', () => {
      expect(noteTitlesMatch('Note Title', 'note title')).toBe(true);
      expect(noteTitlesMatch('NOTE TITLE', 'Note Title')).toBe(true);
    });
    
    test('matches with different whitespace', () => {
      expect(noteTitlesMatch('  Note Title  ', 'Note Title')).toBe(true);
      expect(noteTitlesMatch('Note  Title', 'Note Title')).toBe(true);
    });
    
    test('does not match different titles', () => {
      expect(noteTitlesMatch('Note A', 'Note B')).toBe(false);
    });
  });
  
  describe('determineLinkType', () => {
    test('returns "wikilink" for simple link', () => {
      expect(determineLinkType({ noteTitle: 'Note' })).toBe('wikilink');
    });
    
    test('returns "heading" for heading link', () => {
      expect(determineLinkType({ noteTitle: 'Note', heading: 'Section' })).toBe('heading');
    });
    
    test('returns "block" for block reference', () => {
      expect(determineLinkType({ noteTitle: 'Note', blockId: 'block-1' })).toBe('block');
    });
    
    test('prioritizes block over heading', () => {
      expect(determineLinkType({ 
        noteTitle: 'Note', 
        heading: 'Section', 
        blockId: 'block-1' 
      })).toBe('block');
    });
  });
  
  describe('validateWikilinkSyntax', () => {
    test('validates correct syntax', () => {
      const result = validateWikilinkSyntax('Note Title');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    test('rejects empty link text', () => {
      const result = validateWikilinkSyntax('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Link text cannot be empty');
    });
    
    test('rejects nested brackets', () => {
      const result = validateWikilinkSyntax('Note [[nested]]');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Nested brackets are not allowed');
    });
    
    test('rejects multiple heading references', () => {
      const result = validateWikilinkSyntax('Note#Section1#Section2');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Only one heading reference (#) is allowed');
    });
    
    test('rejects multiple block references', () => {
      const result = validateWikilinkSyntax('Note^block1^block2');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Only one block reference (^) is allowed');
    });
    
    test('rejects both heading and block', () => {
      const result = validateWikilinkSyntax('Note#Section^block');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cannot have both heading (#) and block (^) references');
    });
  });
  
  describe('getUniqueNoteTitles', () => {
    test('returns unique note titles', () => {
      const wikilinks = [
        { fullText: '[[A]]', noteTitle: 'A', position: { start: 0, end: 5 } },
        { fullText: '[[B]]', noteTitle: 'B', position: { start: 6, end: 11 } },
        { fullText: '[[A]]', noteTitle: 'A', position: { start: 12, end: 17 } },
      ];
      
      const titles = getUniqueNoteTitles(wikilinks);
      expect(titles).toHaveLength(2);
      expect(titles).toContain('A');
      expect(titles).toContain('B');
    });
  });
  
  describe('countLinksByType', () => {
    test('counts links by type', () => {
      const wikilinks = [
        { fullText: '[[A]]', noteTitle: 'A', position: { start: 0, end: 5 } },
        { fullText: '[[B#H]]', noteTitle: 'B', heading: 'H', position: { start: 6, end: 13 } },
        { fullText: '[[C^b]]', noteTitle: 'C', blockId: 'b', position: { start: 14, end: 21 } },
        { fullText: '[[D#H2]]', noteTitle: 'D', heading: 'H2', position: { start: 22, end: 30 } },
      ];
      
      const counts = countLinksByType(wikilinks);
      expect(counts).toEqual({
        wikilink: 1,
        heading: 2,
        block: 1,
      });
    });
  });
});
