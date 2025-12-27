/**
 * @fileoverview Snippet Extractor for Backlinks and Search
 * 
 * This utility extracts context snippets around links and search matches
 * without re-parsing markdown. It follows the rules from Phase C:
 * - Extract ~40-80 characters around the target
 * - Highlight the target (for display purposes, we mark positions)
 * - Fall back to note title if snippet fails
 */

/**
 * Extract a context snippet around a specific position in text
 * 
 * @param text - The full text to extract from
 * @param targetPosition - The start position of the target text
 * @param targetLength - The length of the target text
 * @param contextChars - Number of characters to include on each side (default: 40)
 * @returns Context snippet with the target text included
 */
export function extractSnippet(
  text: string,
  targetPosition: number,
  targetLength: number,
  contextChars: number = 40
): string {
  // Calculate start and end positions for the snippet
  const snippetStart = Math.max(0, targetPosition - contextChars);
  const snippetEnd = Math.min(text.length, targetPosition + targetLength + contextChars);
  
  // Extract the snippet
  let snippet = text.substring(snippetStart, snippetEnd);
  
  // Add ellipsis if we're not at the start/end
  if (snippetStart > 0) {
    snippet = '...' + snippet;
  }
  if (snippetEnd < text.length) {
    snippet = snippet + '...';
  }
  
  // Clean up whitespace (replace multiple spaces/newlines with single space)
  snippet = snippet.replace(/\s+/g, ' ').trim();
  
  return snippet;
}

/**
 * Extract a snippet around a wikilink in markdown content
 * 
 * This finds the wikilink pattern and extracts context around it.
 * 
 * @param markdown - The markdown content
 * @param linkText - The text inside the wikilink (e.g., "Note Title")
 * @param fallbackTitle - Title to use if extraction fails
 * @returns Context snippet or fallback
 */
export function extractWikilinkSnippet(
  markdown: string,
  linkText: string,
  fallbackTitle: string
): string {
  // Find the first occurrence of [[linkText]]
  const pattern = `[[${linkText}]]`;
  const position = markdown.indexOf(pattern);
  
  if (position !== -1) {
    return extractSnippet(markdown, position, pattern.length);
  }
  
  // Try to find the link text with heading or block reference
  const headingPattern = `[[${linkText}#`;
  const headingPos = markdown.indexOf(headingPattern);
  if (headingPos !== -1) {
    // Find the end of this wikilink
    const endPos = markdown.indexOf(']]', headingPos);
    if (endPos !== -1) {
      return extractSnippet(markdown, headingPos, endPos - headingPos + 2);
    }
  }
  
  const blockPattern = `[[${linkText}^`;
  const blockPos = markdown.indexOf(blockPattern);
  if (blockPos !== -1) {
    // Find the end of this wikilink
    const endPos = markdown.indexOf(']]', blockPos);
    if (endPos !== -1) {
      return extractSnippet(markdown, blockPos, endPos - blockPos + 2);
    }
  }
  
  // If we can't find the exact wikilink pattern, use fallback
  return fallbackTitle;
}

/**
 * Extract snippet around a search term
 * 
 * @param text - The text to search in
 * @param searchTerm - The term to find
 * @param contextChars - Number of characters on each side
 * @returns Snippet with the search term in context
 */
export function extractSearchSnippet(
  text: string,
  searchTerm: string,
  contextChars: number = 40
): string {
  // Case-insensitive search
  const lowerText = text.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();
  const position = lowerText.indexOf(lowerTerm);
  
  if (position === -1) {
    // Term not found, return beginning of text
    return text.substring(0, Math.min(80, text.length)).replace(/\s+/g, ' ').trim() + '...';
  }
  
  return extractSnippet(text, position, searchTerm.length, contextChars);
}

/**
 * Extract multiple snippets for multiple occurrences of a term
 * 
 * @param text - The text to search in
 * @param searchTerm - The term to find
 * @param maxSnippets - Maximum number of snippets to return
 * @param contextChars - Characters on each side of match
 * @returns Array of snippets
 */
export function extractMultipleSnippets(
  text: string,
  searchTerm: string,
  maxSnippets: number = 3,
  contextChars: number = 40
): string[] {
  const snippets: string[] = [];
  const lowerText = text.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();
  
  let position = 0;
  while (snippets.length < maxSnippets) {
    position = lowerText.indexOf(lowerTerm, position);
    if (position === -1) break;
    
    snippets.push(extractSnippet(text, position, searchTerm.length, contextChars));
    position += searchTerm.length;
  }
  
  return snippets;
}

/**
 * Highlight a term in a snippet (for display purposes)
 * 
 * This wraps the term with markers that can be used for highlighting.
 * 
 * @param snippet - The snippet text
 * @param term - The term to highlight
 * @param startMarker - Start marker (default: "**")
 * @param endMarker - End marker (default: "**")
 * @returns Snippet with term highlighted
 */
export function highlightTermInSnippet(
  snippet: string,
  term: string,
  startMarker: string = '**',
  endMarker: string = '**'
): string {
  // Case-insensitive replace, preserving original case
  const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
  return snippet.replace(regex, `${startMarker}$1${endMarker}`);
}

/**
 * Escape special regex characters
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Clean markdown formatting from snippet for display
 * 
 * Removes common markdown syntax to make snippets more readable.
 * 
 * @param snippet - The snippet with markdown
 * @returns Cleaned snippet
 */
export function cleanMarkdownFromSnippet(snippet: string): string {
  let cleaned = snippet;
  
  // Remove heading markers
  cleaned = cleaned.replace(/^#+\s+/gm, '');
  
  // Remove bold/italic markers but keep the text
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*(.+?)\*/g, '$1');
  cleaned = cleaned.replace(/__(.+?)__/g, '$1');
  cleaned = cleaned.replace(/_(.+?)_/g, '$1');
  
  // Remove code markers
  cleaned = cleaned.replace(/`(.+?)`/g, '$1');
  
  // Remove links but keep link text
  cleaned = cleaned.replace(/\[(.+?)\]\(.+?\)/g, '$1');
  
  // Remove wikilinks but keep the text
  cleaned = cleaned.replace(/\[\[(.+?)\]\]/g, '$1');
  
  return cleaned.trim();
}
