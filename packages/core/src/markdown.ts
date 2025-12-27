import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import { parse as parseYaml } from 'yaml';
import type { Root, Content } from 'mdast';
import type { Wikilink, Frontmatter } from './types';

/**
 * Markdown Parser with Obsidian-style wikilinks support
 * Uses unified/remark for AST manipulation
 */

// Regular expression to match [[wikilinks]] and [[wikilinks|alias]]
const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Parses wikilinks from markdown text
 */
export function parseWikilinks(text: string): Wikilink[] {
  const wikilinks: Wikilink[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  WIKILINK_REGEX.lastIndex = 0;

  while ((match = WIKILINK_REGEX.exec(text)) !== null) {
    const [fullMatch, target, alias] = match;
    
    // Check for block references (e.g., [[Note#^block-id]])
    const blockRefMatch = target.match(/^([^#]+)#\^(.+)$/);
    
    wikilinks.push({
      text: fullMatch,
      target: blockRefMatch ? blockRefMatch[1].trim() : target.trim(),
      alias: alias?.trim(),
      blockRef: blockRefMatch ? blockRefMatch[2].trim() : undefined,
    });
  }

  return wikilinks;
}

/**
 * Extracts frontmatter from markdown content
 */
export function parseFrontmatter(content: string): Frontmatter | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  
  if (!frontmatterMatch) {
    return null;
  }

  try {
    const yaml = frontmatterMatch[1];
    const parsed = parseYaml(yaml);
    return parsed as Frontmatter;
  } catch (error) {
    console.error('Failed to parse frontmatter:', error);
    return null;
  }
}

/**
 * Removes frontmatter from markdown content
 */
export function removeFrontmatter(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n?/, '');
}

/**
 * Adds or updates frontmatter in markdown content
 */
export function updateFrontmatter(content: string, frontmatter: Frontmatter): string {
  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}:\n${value.map((v) => `  - ${v}`).join('\n')}`;
      }
      return `${key}: ${value}`;
    })
    .join('\n');

  const contentWithoutFrontmatter = removeFrontmatter(content);
  return `---\n${yaml}\n---\n${contentWithoutFrontmatter}`;
}

/**
 * Parses markdown to AST using unified/remark
 */
export async function parseMarkdown(content: string): Promise<Root> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkGfm);

  const ast = processor.parse(content);
  return ast as Root;
}

/**
 * Converts AST back to markdown
 */
export async function stringifyMarkdown(ast: Root): Promise<string> {
  const processor = unified()
    .use(remarkStringify)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkGfm);

  const result = processor.stringify(ast);
  return String(result);
}

/**
 * Extracts all headings from markdown content
 */
export async function extractHeadings(content: string): Promise<Array<{ level: number; text: string; id: string }>> {
  const ast = await parseMarkdown(content);
  const headings: Array<{ level: number; text: string; id: string }> = [];

  function visit(node: Content): void {
    if (node.type === 'heading') {
      const text = node.children
        .filter((child) => child.type === 'text')
        .map((child) => ('value' in child ? child.value : ''))
        .join('');

      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      headings.push({
        level: node.depth,
        text,
        id,
      });
    }

    if ('children' in node && Array.isArray(node.children)) {
      node.children.forEach(visit);
    }
  }

  ast.children.forEach(visit);
  return headings;
}

/**
 * Replaces wikilinks with standard markdown links
 */
export function replaceWikilinks(
  content: string,
  resolver: (target: string) => string
): string {
  return content.replace(WIKILINK_REGEX, (_match, target, alias) => {
    const resolvedUrl = resolver(target.trim());
    const linkText = alias?.trim() || target.trim();
    return `[${linkText}](${resolvedUrl})`;
  });
}

/**
 * Extracts tags from content (both #hashtags and frontmatter tags)
 */
export function extractTags(content: string, frontmatter: Frontmatter | null): string[] {
  const tags = new Set<string>();

  // Add frontmatter tags
  if (frontmatter?.tags) {
    frontmatter.tags.forEach((tag) => tags.add(tag));
  }

  // Extract hashtags from content
  const hashtagRegex = /#([a-zA-Z0-9_-]+)/g;
  let match: RegExpExecArray | null;

  while ((match = hashtagRegex.exec(content)) !== null) {
    tags.add(match[1]);
  }

  return Array.from(tags);
}

/**
 * Creates a table of contents from markdown content
 */
export async function generateTOC(content: string, maxLevel = 3): Promise<string> {
  const headings = await extractHeadings(content);
  const filteredHeadings = headings.filter((h) => h.level <= maxLevel);

  return filteredHeadings
    .map((heading) => {
      const indent = '  '.repeat(heading.level - 1);
      return `${indent}- [${heading.text}](#${heading.id})`;
    })
    .join('\n');
}

/**
 * Validates markdown structure and returns errors
 */
export async function validateMarkdown(content: string): Promise<string[]> {
  const errors: string[] = [];

  try {
    await parseMarkdown(content);
  } catch (error) {
    errors.push(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Check for broken wikilinks (optional, requires context)
  const wikilinks = parseWikilinks(content);
  const duplicateTargets = wikilinks
    .map((w) => w.target)
    .filter((target, index, array) => array.indexOf(target) !== index);

  if (duplicateTargets.length > 0) {
    errors.push(`Duplicate wikilinks found: ${duplicateTargets.join(', ')}`);
  }

  return errors;
}

export const markdownParser = {
  parseWikilinks,
  parseFrontmatter,
  removeFrontmatter,
  updateFrontmatter,
  parseMarkdown,
  stringifyMarkdown,
  extractHeadings,
  replaceWikilinks,
  extractTags,
  generateTOC,
  validateMarkdown,
};
