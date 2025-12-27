/**
 * @fileoverview Markdown Link Parser for Obsidian-style Wikilinks
 * 
 * This utility parses markdown content to extract Obsidian-style wikilinks:
 * - [[Note Title]] - Basic wikilink
 * - [[Note Title#Heading]] - Link to a heading within a note
 * - [[Note Title^blockId]] - Link to a specific block
 * 
 * The parser handles edge cases like escaped brackets, nested links, and
 * malformed syntax gracefully.
 */

import { ParsedWikilink, MarkdownLinkExtractionResult } from '../types/notes';

/**
 * Regular expression for matching Obsidian-style wikilinks
 * Matches: [[Note Title]], [[Note Title#Heading]], [[Note Title^blockId]]
 * 
 * Pattern breakdown:
 * \[\[ - Opening double brackets (escaped)
 * ([^\]]+) - Capture group: one or more characters that are not ]
 * \]\] - Closing double brackets (escaped)
 */
const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g;

/**
 * Parse a single wikilink text to extract components
 * 
 * Examples:
 * - "Note Title" -> { noteTitle: "Note Title" }
 * - "Note Title#Introduction" -> { noteTitle: "Note Title", heading: "Introduction" }
 * - "Note Title^block-123" -> { noteTitle: "Note Title", blockId: "block-123" }
 * 
 * @param linkText - The text inside [[ ]]
 * @returns Parsed components of the wikilink
 */
export function parseWikilinkText(linkText: string): {
  noteTitle: string;
  heading?: string;
  blockId?: string;
} {
  // Trim whitespace
  const trimmed = linkText.trim();
  
  // Check for block reference (^blockId)
  const blockMatch = trimmed.match(/^(.+)\^(.+)$/);
  if (blockMatch) {
    return {
      noteTitle: blockMatch[1].trim(),
      blockId: blockMatch[2].trim(),
    };
  }
  
  // Check for heading reference (#heading)
  const headingMatch = trimmed.match(/^(.+)#(.+)$/);
  if (headingMatch) {
    return {
      noteTitle: headingMatch[1].trim(),
      heading: headingMatch[2].trim(),
    };
  }
  
  // Plain wikilink
  return {
    noteTitle: trimmed,
  };
}

/**
 * Extract all wikilinks from markdown content
 * 
 * This function scans the entire markdown content and extracts all wikilinks,
 * including their positions and parsed components.
 * 
 * @param markdown - The markdown content to parse
 * @returns Array of parsed wikilinks with positions
 */
export function extractWikilinks(markdown: string): ParsedWikilink[] {
  const links: ParsedWikilink[] = [];
  
  // Reset regex lastIndex to ensure we start from the beginning
  WIKILINK_REGEX.lastIndex = 0;
  
  let match: RegExpExecArray | null;
  
  // Find all matches in the markdown
  while ((match = WIKILINK_REGEX.exec(markdown)) !== null) {
    const fullText = match[0]; // e.g., "[[Note Title#Heading]]"
    const linkText = match[1]; // e.g., "Note Title#Heading"
    const startPos = match.index;
    const endPos = startPos + fullText.length;
    
    // Parse the link text to extract components
    const parsed = parseWikilinkText(linkText);
    
    links.push({
      fullText,
      noteTitle: parsed.noteTitle,
      heading: parsed.heading,
      blockId: parsed.blockId,
      position: {
        start: startPos,
        end: endPos,
      },
    });
  }
  
  return links;
}

/**
 * Extract all wikilinks with statistics
 * 
 * This is a convenience function that returns both the links and
 * useful statistics about them.
 * 
 * @param markdown - The markdown content to parse
 * @returns Extraction result with links and statistics
 */
export function extractMarkdownLinks(markdown: string): MarkdownLinkExtractionResult {
  const wikilinks = extractWikilinks(markdown);
  
  return {
    wikilinks,
    totalLinks: wikilinks.length,
    unresolvedCount: 0, // Will be determined when resolving links
  };
}

/**
 * Normalize a note title for matching
 * 
 * This function normalizes note titles to enable case-insensitive and
 * whitespace-insensitive matching, similar to Obsidian's behavior.
 * 
 * @param title - The note title to normalize
 * @returns Normalized title
 */
export function normalizeNoteTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Replace multiple spaces with single space
}

/**
 * Check if two note titles match (case-insensitive)
 * 
 * @param title1 - First title
 * @param title2 - Second title
 * @returns true if titles match
 */
export function noteTitlesMatch(title1: string, title2: string): boolean {
  return normalizeNoteTitle(title1) === normalizeNoteTitle(title2);
}

/**
 * Determine the link type based on parsed components
 * 
 * @param parsed - Parsed wikilink components
 * @returns Link type string
 */
export function determineLinkType(parsed: {
  noteTitle: string;
  heading?: string;
  blockId?: string;
}): 'wikilink' | 'heading' | 'block' {
  if (parsed.blockId) {
    return 'block';
  }
  if (parsed.heading) {
    return 'heading';
  }
  return 'wikilink';
}

/**
 * Validate wikilink syntax
 * 
 * Checks if a wikilink has valid syntax and returns validation errors if any.
 * 
 * @param linkText - The text inside [[ ]]
 * @returns Validation result
 */
export function validateWikilinkSyntax(linkText: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!linkText || linkText.trim().length === 0) {
    errors.push('Link text cannot be empty');
  }
  
  if (linkText.includes('[[') || linkText.includes(']]')) {
    errors.push('Nested brackets are not allowed');
  }
  
  // Check for multiple # or ^ symbols
  const hashCount = (linkText.match(/#/g) || []).length;
  const caretCount = (linkText.match(/\^/g) || []).length;
  
  if (hashCount > 1) {
    errors.push('Only one heading reference (#) is allowed');
  }
  
  if (caretCount > 1) {
    errors.push('Only one block reference (^) is allowed');
  }
  
  if (hashCount > 0 && caretCount > 0) {
    errors.push('Cannot have both heading (#) and block (^) references');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extract unique note titles from wikilinks
 * 
 * This is useful for determining which notes are referenced in a document.
 * 
 * @param wikilinks - Array of parsed wikilinks
 * @returns Array of unique note titles
 */
export function getUniqueNoteTitles(wikilinks: ParsedWikilink[]): string[] {
  const titles = new Set<string>();
  
  for (const link of wikilinks) {
    titles.add(link.noteTitle);
  }
  
  return Array.from(titles);
}

/**
 * Count links by type
 * 
 * @param wikilinks - Array of parsed wikilinks
 * @returns Count of each link type
 */
export function countLinksByType(wikilinks: ParsedWikilink[]): {
  wikilink: number;
  heading: number;
  block: number;
} {
  const counts = {
    wikilink: 0,
    heading: 0,
    block: 0,
  };
  
  for (const link of wikilinks) {
    const type = determineLinkType(link);
    counts[type]++;
  }
  
  return counts;
}
