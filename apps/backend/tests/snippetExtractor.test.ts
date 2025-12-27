/**
 * @fileoverview Tests for Snippet Extractor
 */

import {
  extractSnippet,
  extractWikilinkSnippet,
  extractSearchSnippet,
  extractMultipleSnippets,
  highlightTermInSnippet,
  cleanMarkdownFromSnippet,
} from '../src/utils/snippetExtractor';

describe('Snippet Extractor', () => {
  describe('extractSnippet', () => {
    test('extracts snippet with context around target', () => {
      const text = 'This is a long piece of text with important information in the middle and more content at the end.';
      const targetPos = text.indexOf('important');
      const targetLen = 'important'.length;
      
      const snippet = extractSnippet(text, targetPos, targetLen, 20);
      
      expect(snippet).toContain('important');
      expect(snippet.length).toBeGreaterThan('important'.length);
      expect(snippet.length).toBeLessThan(100);
    });
    
    test('adds ellipsis when not at start/end', () => {
      const text = 'A very long text that goes on and on with lots of content before and after the target word which is somewhere in the middle of this sentence.';
      const targetPos = text.indexOf('target');
      const targetLen = 'target'.length;
      
      const snippet = extractSnippet(text, targetPos, targetLen, 20);
      
      expect(snippet).toMatch(/^\.\.\./);
      expect(snippet).toMatch(/\.\.\.$/);
    });
    
    test('does not add ellipsis at start if target is near beginning', () => {
      const text = 'Target word at the beginning of a long text';
      const targetPos = 0;
      const targetLen = 'Target'.length;
      
      const snippet = extractSnippet(text, targetPos, targetLen, 20);
      
      expect(snippet).not.toMatch(/^\.\.\./);
    });
    
    test('cleans up whitespace', () => {
      const text = 'Text with\nmultiple\n\nlines and   spaces';
      const targetPos = text.indexOf('multiple');
      const targetLen = 'multiple'.length;
      
      const snippet = extractSnippet(text, targetPos, targetLen, 20);
      
      expect(snippet).not.toContain('\n');
      expect(snippet).not.toMatch(/  +/);
    });
  });
  
  describe('extractWikilinkSnippet', () => {
    test('finds wikilink and extracts context', () => {
      const markdown = 'Here is some text before [[Target Note]] and some text after.';
      const snippet = extractWikilinkSnippet(markdown, 'Target Note', 'Fallback');
      
      expect(snippet).toContain('[[Target Note]]');
      expect(snippet).toContain('before');
      expect(snippet).toContain('after');
    });
    
    test('returns fallback when wikilink not found', () => {
      const markdown = 'This text does not contain the wikilink.';
      const snippet = extractWikilinkSnippet(markdown, 'Missing Note', 'Fallback Title');
      
      expect(snippet).toBe('Fallback Title');
    });
    
    test('handles wikilink with heading', () => {
      const markdown = 'Check [[Note#Section]] for details.';
      const snippet = extractWikilinkSnippet(markdown, 'Note#Section', 'Fallback');
      
      expect(snippet).toContain('[[Note#Section]]');
    });
  });
  
  describe('extractSearchSnippet', () => {
    test('finds search term and extracts context', () => {
      const text = 'This is a document with the search term somewhere in the middle.';
      const snippet = extractSearchSnippet(text, 'search term');
      
      expect(snippet.toLowerCase()).toContain('search term');
    });
    
    test('is case-insensitive', () => {
      const text = 'This contains SEARCH TERM in uppercase.';
      const snippet = extractSearchSnippet(text, 'search term');
      
      expect(snippet).toContain('SEARCH TERM');
    });
    
    test('returns beginning of text when term not found', () => {
      const text = 'This is a long text without the target word anywhere in it at all.';
      const snippet = extractSearchSnippet(text, 'missing');
      
      expect(snippet).toContain('This is');
      expect(snippet).toMatch(/\.\.\.$/);
    });
  });
  
  describe('extractMultipleSnippets', () => {
    test('finds multiple occurrences', () => {
      const text = 'The word appears here and the word appears again and the word is here too.';
      const snippets = extractMultipleSnippets(text, 'word', 3);
      
      expect(snippets).toHaveLength(3);
      snippets.forEach(snippet => {
        expect(snippet.toLowerCase()).toContain('word');
      });
    });
    
    test('respects maxSnippets limit', () => {
      const text = 'one two one two one two one two';
      const snippets = extractMultipleSnippets(text, 'one', 2);
      
      expect(snippets.length).toBeLessThanOrEqual(2);
    });
    
    test('returns fewer snippets if term appears less than max', () => {
      const text = 'The term appears only once.';
      const snippets = extractMultipleSnippets(text, 'term', 5);
      
      expect(snippets).toHaveLength(1);
    });
  });
  
  describe('highlightTermInSnippet', () => {
    test('highlights term with markers', () => {
      const snippet = 'This is a snippet with target word.';
      const highlighted = highlightTermInSnippet(snippet, 'target');
      
      expect(highlighted).toContain('**target**');
    });
    
    test('is case-insensitive', () => {
      const snippet = 'This has TARGET in caps.';
      const highlighted = highlightTermInSnippet(snippet, 'target');
      
      expect(highlighted).toContain('**TARGET**');
    });
    
    test('uses custom markers', () => {
      const snippet = 'Highlight this word.';
      const highlighted = highlightTermInSnippet(snippet, 'this', '<mark>', '</mark>');
      
      expect(highlighted).toContain('<mark>this</mark>');
    });
  });
  
  describe('cleanMarkdownFromSnippet', () => {
    test('removes heading markers', () => {
      const snippet = '# Heading';
      const cleaned = cleanMarkdownFromSnippet(snippet);
      
      expect(cleaned).toBe('Heading');
      expect(cleaned).not.toContain('#');
    });
    
    test('removes bold/italic markers', () => {
      const snippet = 'This is **bold** and *italic* text.';
      const cleaned = cleanMarkdownFromSnippet(snippet);
      
      expect(cleaned).toContain('bold');
      expect(cleaned).toContain('italic');
      expect(cleaned).not.toContain('**');
      expect(cleaned).not.toContain('*');
    });
    
    test('removes wikilinks but keeps text', () => {
      const snippet = 'See [[Note Title]] for more.';
      const cleaned = cleanMarkdownFromSnippet(snippet);
      
      expect(cleaned).toContain('Note Title');
      expect(cleaned).not.toContain('[[');
      expect(cleaned).not.toContain(']]');
    });
    
    test('removes markdown links but keeps link text', () => {
      const snippet = 'Check [this link](https://example.com) out.';
      const cleaned = cleanMarkdownFromSnippet(snippet);
      
      expect(cleaned).toContain('this link');
      expect(cleaned).not.toContain('https://');
      expect(cleaned).not.toContain('[');
      expect(cleaned).not.toContain(']');
    });
    
    test('removes code markers', () => {
      const snippet = 'Use `code` here.';
      const cleaned = cleanMarkdownFromSnippet(snippet);
      
      expect(cleaned).toContain('code');
      expect(cleaned).not.toContain('`');
    });
  });
});
