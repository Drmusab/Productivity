# Import/Export Flow Specification

## Overview

This document defines the import/export system for moving data in and out of the workspace. The system supports multiple formats while preserving structure, content, and metadata.

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           IMPORT/EXPORT SYSTEM                                   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         IMPORT PIPELINE                                  │    │
│  │                                                                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │    │
│  │  │  File       │  │  Format     │  │  Structure  │  │  Block      │     │    │
│  │  │  Parser     │  │  Detector   │  │  Mapper     │  │  Creator    │     │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         EXPORT PIPELINE                                  │    │
│  │                                                                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │    │
│  │  │  Block      │  │  Format     │  │  Content    │  │  File       │     │    │
│  │  │  Selector   │  │  Converter  │  │  Generator  │  │  Writer     │     │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Supported Formats

### 2.1 Format Matrix

| Format | Import | Export | Use Case |
|--------|--------|--------|----------|
| Markdown | ✅ | ✅ | Documents, notes, pages |
| JSON | ✅ | ✅ | Full backup, API integration |
| CSV | ✅ | ✅ | Database rows, tasks |
| HTML | ✅ | ✅ | Web content |
| PDF | ❌ | ✅ | Sharing, printing |
| Notion Export | ✅ | ❌ | Migration from Notion |

### 2.2 Format Specifications

```typescript
interface ImportFormat {
  id: string;
  name: string;
  extensions: string[];
  mimeTypes: string[];
  parser: FormatParser;
}

interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  generator: FormatGenerator;
}

const SUPPORTED_FORMATS: ImportFormat[] = [
  {
    id: 'markdown',
    name: 'Markdown',
    extensions: ['.md', '.markdown'],
    mimeTypes: ['text/markdown', 'text/x-markdown'],
    parser: new MarkdownParser(),
  },
  {
    id: 'json',
    name: 'JSON',
    extensions: ['.json'],
    mimeTypes: ['application/json'],
    parser: new JSONParser(),
  },
  {
    id: 'csv',
    name: 'CSV',
    extensions: ['.csv'],
    mimeTypes: ['text/csv'],
    parser: new CSVParser(),
  },
  {
    id: 'html',
    name: 'HTML',
    extensions: ['.html', '.htm'],
    mimeTypes: ['text/html'],
    parser: new HTMLParser(),
  },
  {
    id: 'notion',
    name: 'Notion Export',
    extensions: ['.zip'],
    mimeTypes: ['application/zip'],
    parser: new NotionParser(),
  },
];
```

---

## 3. Import Pipeline

### 3.1 Import Request

```typescript
interface ImportRequest {
  // Source file or URL
  source: {
    type: 'file' | 'url' | 'text';
    data: File | string;
  };
  
  // Target location
  target: {
    parentId?: string;          // Parent block to import into
    databaseId?: string;        // Database for row imports
  };
  
  // Format hint (auto-detect if not provided)
  format?: string;
  
  // Import options
  options: ImportOptions;
  
  // User context
  userId: string;
}

interface ImportOptions {
  // How to handle conflicts
  conflictResolution: 'skip' | 'overwrite' | 'rename' | 'merge';
  
  // Preserve original IDs (for restore)
  preserveIds: boolean;
  
  // Import metadata
  importMetadata: boolean;
  
  // Import attachments
  importAttachments: boolean;
  
  // Flatten nested structures
  flattenDepth?: number;
  
  // Property mapping (for CSV/database imports)
  propertyMapping?: Record<string, string>;
  
  // Tag extraction
  extractTags: boolean;
  
  // AI-assisted mapping
  useAIMapping: boolean;
}
```

### 3.2 Import Pipeline Implementation

```typescript
class ImportPipeline {
  async import(request: ImportRequest): Promise<ImportResult> {
    // 1. Parse source
    const rawData = await this.parseSource(request.source);
    
    // 2. Detect format
    const format = request.format || await this.detectFormat(rawData);
    
    // 3. Parse format
    const parser = this.getParser(format);
    const parsedContent = await parser.parse(rawData, request.options);
    
    // 4. Map to blocks
    const blocks = await this.mapToBlocks(parsedContent, request);
    
    // 5. Validate
    const validation = await this.validate(blocks);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }
    
    // 6. Create blocks
    const created = await this.createBlocks(blocks, request.target);
    
    // 7. Import attachments
    if (request.options.importAttachments && parsedContent.attachments) {
      await this.importAttachments(parsedContent.attachments, created);
    }
    
    return {
      success: true,
      importedCount: created.length,
      blocks: created,
      warnings: validation.warnings,
    };
  }
}
```

### 3.3 Format Parsers

#### Markdown Parser

```typescript
class MarkdownParser implements FormatParser {
  async parse(content: string, options: ImportOptions): Promise<ParsedContent> {
    const tokens = this.tokenize(content);
    const blocks: ParsedBlock[] = [];
    
    for (const token of tokens) {
      switch (token.type) {
        case 'heading':
          blocks.push({
            type: BlockType.HEADING,
            data: {
              content: token.text,
              level: token.depth,
            },
          });
          break;
          
        case 'paragraph':
          blocks.push({
            type: BlockType.TEXT,
            data: {
              content: token.text,
            },
          });
          break;
          
        case 'list':
          if (token.ordered) {
            blocks.push(this.parseOrderedList(token));
          } else {
            // Check if it's a todo list
            if (this.isTodoList(token)) {
              blocks.push(...this.parseTodoList(token));
            } else {
              blocks.push(this.parseUnorderedList(token));
            }
          }
          break;
          
        case 'code':
          blocks.push({
            type: BlockType.CODE,
            data: {
              content: token.text,
              language: token.lang,
            },
          });
          break;
          
        case 'blockquote':
          blocks.push({
            type: BlockType.QUOTE,
            data: {
              content: token.text,
            },
          });
          break;
          
        case 'hr':
          blocks.push({
            type: BlockType.DIVIDER,
            data: {},
          });
          break;
          
        case 'image':
          blocks.push({
            type: BlockType.IMAGE,
            data: {
              url: token.href,
              alt: token.text,
              caption: token.title,
            },
          });
          break;
      }
    }
    
    // Build hierarchy from heading levels
    const hierarchical = this.buildHierarchy(blocks);
    
    return {
      blocks: hierarchical,
      metadata: this.extractFrontmatter(content),
    };
  }
  
  private isTodoList(token: ListToken): boolean {
    return token.items.some(item => 
      item.text.startsWith('[ ]') || item.text.startsWith('[x]')
    );
  }
  
  private parseTodoList(token: ListToken): ParsedBlock[] {
    return token.items.map(item => ({
      type: BlockType.TODO,
      data: {
        content: item.text.replace(/^\[[ x]\]\s*/, ''),
        completed: item.text.startsWith('[x]'),
      },
    }));
  }
}
```

#### CSV Parser

```typescript
class CSVParser implements FormatParser {
  async parse(content: string, options: ImportOptions): Promise<ParsedContent> {
    const rows = this.parseCSV(content);
    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    // Detect or use provided property mapping
    const mapping = options.propertyMapping || 
      (options.useAIMapping 
        ? await this.aiPropertyMapping(headers)
        : this.autoPropertyMapping(headers));
    
    // Create database structure
    const properties = this.createProperties(headers, mapping);
    
    // Create row blocks
    const blocks: ParsedBlock[] = dataRows.map(row => ({
      type: BlockType.DB_ROW,
      data: {
        values: this.mapRowValues(row, headers, mapping),
      },
    }));
    
    return {
      blocks,
      metadata: {
        isDatabase: true,
        properties,
        columnCount: headers.length,
        rowCount: dataRows.length,
      },
    };
  }
  
  private async aiPropertyMapping(headers: string[]): Promise<Record<string, string>> {
    // Use AI to suggest property types
    const prompt = `Given these CSV column headers, suggest the appropriate property types:
      Headers: ${headers.join(', ')}
      
      Possible types: text, number, date, checkbox, select, url, email, phone
      
      Respond in JSON format: { "column_name": "property_type" }`;
    
    const response = await this.ai.complete(prompt);
    return JSON.parse(response);
  }
}
```

#### JSON Parser

```typescript
class JSONParser implements FormatParser {
  async parse(content: string, options: ImportOptions): Promise<ParsedContent> {
    const data = JSON.parse(content);
    
    // Detect JSON structure type
    if (this.isBlockTree(data)) {
      // Native block tree format
      return this.parseBlockTree(data);
    }
    
    if (this.isArrayOfObjects(data)) {
      // Array of objects → database rows
      return this.parseAsDatabase(data, options);
    }
    
    if (this.isNotionExport(data)) {
      // Notion export format
      return this.parseNotionFormat(data);
    }
    
    // Generic object → page with properties
    return this.parseAsPage(data);
  }
  
  private parseBlockTree(data: BlockTreeExport): ParsedContent {
    const blocks: ParsedBlock[] = [];
    
    for (const root of data.roots) {
      blocks.push(...this.parseBlockRecursive(root, data.blocks));
    }
    
    return { blocks, metadata: data.metadata };
  }
}
```

---

## 4. Export Pipeline

### 4.1 Export Request

```typescript
interface ExportRequest {
  // What to export
  source: {
    type: 'block' | 'page' | 'database' | 'workspace';
    ids: string[];
    includeChildren: boolean;
    depth?: number;
  };
  
  // Output format
  format: ExportFormatType;
  
  // Export options
  options: ExportOptions;
  
  // User context
  userId: string;
}

type ExportFormatType = 'markdown' | 'json' | 'csv' | 'html' | 'pdf';

interface ExportOptions {
  // Include metadata
  includeMetadata: boolean;
  
  // Include version history
  includeHistory: boolean;
  
  // Include attachments
  includeAttachments: boolean;
  
  // Flatten to single file or preserve hierarchy
  flatten: boolean;
  
  // For CSV: specific properties to export
  properties?: string[];
  
  // For PDF: styling options
  pdfOptions?: {
    pageSize: 'A4' | 'Letter';
    margins: { top: number; bottom: number; left: number; right: number };
    headerFooter: boolean;
  };
}
```

### 4.2 Export Pipeline Implementation

```typescript
class ExportPipeline {
  async export(request: ExportRequest): Promise<ExportResult> {
    // 1. Collect blocks to export
    const blocks = await this.collectBlocks(request.source);
    
    // 2. Check permissions
    const authorized = await this.checkPermissions(blocks, request.userId);
    if (!authorized.all) {
      return {
        success: false,
        error: 'Some blocks cannot be exported due to permissions',
        unauthorizedBlocks: authorized.denied,
      };
    }
    
    // 3. Get generator for format
    const generator = this.getGenerator(request.format);
    
    // 4. Generate content
    const content = await generator.generate(blocks, request.options);
    
    // 5. Handle attachments
    let attachments: Attachment[] = [];
    if (request.options.includeAttachments) {
      attachments = await this.collectAttachments(blocks);
    }
    
    // 6. Package output
    if (attachments.length > 0 || !request.options.flatten) {
      // Create ZIP file
      return this.packageAsZip(content, attachments, request);
    }
    
    // 7. Return single file
    return {
      success: true,
      file: {
        content,
        filename: this.generateFilename(request),
        mimeType: generator.mimeType,
      },
      exportedCount: blocks.length,
    };
  }
}
```

### 4.3 Format Generators

#### Markdown Generator

```typescript
class MarkdownGenerator implements FormatGenerator {
  mimeType = 'text/markdown';
  
  async generate(blocks: Block[], options: ExportOptions): Promise<string> {
    const lines: string[] = [];
    
    // Add frontmatter if metadata included
    if (options.includeMetadata) {
      lines.push('---');
      lines.push(this.generateFrontmatter(blocks[0]));
      lines.push('---');
      lines.push('');
    }
    
    // Generate content
    for (const block of blocks) {
      lines.push(...this.blockToMarkdown(block, 0));
    }
    
    return lines.join('\n');
  }
  
  private blockToMarkdown(block: Block, depth: number): string[] {
    const lines: string[] = [];
    
    switch (block.type) {
      case BlockType.HEADING:
        const prefix = '#'.repeat(block.data.level);
        lines.push(`${prefix} ${block.data.content}`);
        lines.push('');
        break;
        
      case BlockType.TEXT:
        lines.push(block.data.content);
        lines.push('');
        break;
        
      case BlockType.TODO:
        const checkbox = block.data.completed ? '[x]' : '[ ]';
        lines.push(`- ${checkbox} ${block.data.content}`);
        break;
        
      case BlockType.CODE:
        lines.push('```' + (block.data.language || ''));
        lines.push(block.data.content);
        lines.push('```');
        lines.push('');
        break;
        
      case BlockType.QUOTE:
        const quotedLines = block.data.content.split('\n');
        lines.push(...quotedLines.map(l => `> ${l}`));
        lines.push('');
        break;
        
      case BlockType.DIVIDER:
        lines.push('---');
        lines.push('');
        break;
        
      case BlockType.IMAGE:
        lines.push(`![${block.data.alt || ''}](${block.data.url})`);
        if (block.data.caption) {
          lines.push(`*${block.data.caption}*`);
        }
        lines.push('');
        break;
        
      case BlockType.LIST:
        lines.push(...this.listToMarkdown(block));
        lines.push('');
        break;
        
      case BlockType.KANBAN_CARD:
        lines.push(`### ${block.data.title}`);
        if (block.data.description) {
          lines.push(block.data.description);
        }
        if (block.data.priority) {
          lines.push(`Priority: ${block.data.priority}`);
        }
        if (block.data.dueDate) {
          lines.push(`Due: ${block.data.dueDate}`);
        }
        lines.push('');
        break;
    }
    
    // Process children
    if (block.children && block.children.length > 0) {
      for (const childId of block.children) {
        const child = await this.blockStore.get(childId);
        lines.push(...this.blockToMarkdown(child, depth + 1));
      }
    }
    
    return lines;
  }
}
```

#### CSV Generator

```typescript
class CSVGenerator implements FormatGenerator {
  mimeType = 'text/csv';
  
  async generate(blocks: Block[], options: ExportOptions): Promise<string> {
    // Filter to DB rows only
    const rows = blocks.filter(b => b.type === BlockType.DB_ROW);
    if (rows.length === 0) {
      // Convert other blocks to simple rows
      return this.blocksToCSV(blocks);
    }
    
    // Get database schema
    const database = await this.getDatabaseForRows(rows);
    const properties = options.properties || database.properties.map(p => p.id);
    
    // Build header row
    const headers = properties.map(propId => {
      const prop = database.properties.find(p => p.id === propId);
      return prop?.name || propId;
    });
    
    // Build data rows
    const dataRows = rows.map(row => {
      const values = JSON.parse(row.data.values);
      return properties.map(propId => this.formatValue(values[propId]));
    });
    
    // Generate CSV
    const allRows = [headers, ...dataRows];
    return allRows.map(row => 
      row.map(cell => this.escapeCSV(cell)).join(',')
    ).join('\n');
  }
  
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
```

#### JSON Generator

```typescript
class JSONGenerator implements FormatGenerator {
  mimeType = 'application/json';
  
  async generate(blocks: Block[], options: ExportOptions): Promise<string> {
    const exportData: BlockTreeExport = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      roots: [],
      blocks: {},
    };
    
    // Build block map and identify roots
    for (const block of blocks) {
      const exportBlock = this.blockToExport(block, options);
      exportData.blocks[block.id] = exportBlock;
      
      if (!block.parentId || !blocks.find(b => b.id === block.parentId)) {
        exportData.roots.push(block.id);
      }
    }
    
    // Add history if requested
    if (options.includeHistory) {
      exportData.history = await this.collectHistory(blocks);
    }
    
    return JSON.stringify(exportData, null, 2);
  }
  
  private blockToExport(block: Block, options: ExportOptions): ExportBlock {
    const exportBlock: ExportBlock = {
      id: block.id,
      type: block.type,
      data: block.data,
      children: block.children,
      parentId: block.parentId,
      createdAt: block.createdAt,
      updatedAt: block.updatedAt,
    };
    
    if (options.includeMetadata) {
      exportBlock.metadata = block.metadata;
    }
    
    return exportBlock;
  }
}
```

---

## 5. Property Mapping

### 5.1 Intelligent Mapping

```typescript
interface PropertyMapper {
  // Map source properties to block/database properties
  map(
    sourceProperties: Record<string, any>,
    targetSchema: Property[],
    options: MappingOptions
  ): MappedProperties;
}

class IntelligentPropertyMapper implements PropertyMapper {
  async map(
    sourceProperties: Record<string, any>,
    targetSchema: Property[],
    options: MappingOptions
  ): Promise<MappedProperties> {
    const mappings: Record<string, string> = {};
    const unmapped: string[] = [];
    
    for (const [sourceKey, sourceValue] of Object.entries(sourceProperties)) {
      // Try exact match
      const exactMatch = targetSchema.find(p => 
        p.name.toLowerCase() === sourceKey.toLowerCase()
      );
      
      if (exactMatch) {
        mappings[sourceKey] = exactMatch.id;
        continue;
      }
      
      // Try type-based match
      const sourceType = this.detectType(sourceValue);
      const typeMatches = targetSchema.filter(p => p.type === sourceType);
      
      if (typeMatches.length === 1) {
        mappings[sourceKey] = typeMatches[0].id;
        continue;
      }
      
      // Try AI-assisted match
      if (options.useAI) {
        const aiMatch = await this.aiMatch(sourceKey, sourceValue, targetSchema);
        if (aiMatch) {
          mappings[sourceKey] = aiMatch.id;
          continue;
        }
      }
      
      // Unmapped property
      unmapped.push(sourceKey);
    }
    
    return { mappings, unmapped };
  }
  
  private detectType(value: any): PropertyType {
    if (typeof value === 'number') return PropertyType.NUMBER;
    if (typeof value === 'boolean') return PropertyType.CHECKBOX;
    if (this.isDate(value)) return PropertyType.DATE;
    if (this.isUrl(value)) return PropertyType.URL;
    if (this.isEmail(value)) return PropertyType.EMAIL;
    return PropertyType.TEXT;
  }
}
```

---

## 6. Error Handling

### 6.1 Import Errors

```typescript
interface ImportError {
  type: 'parse' | 'validation' | 'permission' | 'conflict' | 'limit';
  message: string;
  details?: {
    line?: number;
    column?: number;
    blockId?: string;
    property?: string;
  };
  recoverable: boolean;
}

class ImportErrorHandler {
  handleParseError(error: Error, format: string): ImportError {
    return {
      type: 'parse',
      message: `Failed to parse ${format} content: ${error.message}`,
      recoverable: false,
    };
  }
  
  handleValidationError(block: ParsedBlock, errors: string[]): ImportError {
    return {
      type: 'validation',
      message: `Invalid block data: ${errors.join(', ')}`,
      details: { blockId: block.id },
      recoverable: true,
    };
  }
  
  handleConflict(existingId: string, resolution: string): ImportError {
    return {
      type: 'conflict',
      message: `Block ${existingId} already exists`,
      details: { blockId: existingId },
      recoverable: true,
    };
  }
}
```

---

## 7. Batch Operations

### 7.1 Batch Import

```typescript
interface BatchImportRequest {
  files: File[];
  options: ImportOptions & {
    // How to handle multiple files
    batchStrategy: 'merge' | 'separate' | 'folder';
    
    // Progress callback
    onProgress?: (progress: BatchProgress) => void;
  };
}

class BatchImportService {
  async importBatch(request: BatchImportRequest): Promise<BatchImportResult> {
    const results: ImportResult[] = [];
    let processed = 0;
    
    for (const file of request.files) {
      try {
        const result = await this.importSingle(file, request.options);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          file: file.name,
          error: error.message,
        });
      }
      
      processed++;
      request.options.onProgress?.({
        processed,
        total: request.files.length,
        current: file.name,
      });
    }
    
    return {
      success: results.every(r => r.success),
      results,
      summary: {
        total: request.files.length,
        succeeded: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    };
  }
}
```

---

## 8. Streaming Export

### 8.1 Large Export Handling

```typescript
interface StreamingExportRequest extends ExportRequest {
  streaming: {
    enabled: true;
    chunkSize: number;
    onChunk: (chunk: Uint8Array, progress: number) => void;
  };
}

class StreamingExporter {
  async *exportStream(request: StreamingExportRequest): AsyncGenerator<Uint8Array> {
    const blocks = await this.collectBlocks(request.source);
    const generator = this.getGenerator(request.format);
    
    // Stream in chunks
    let currentChunk: Block[] = [];
    let processedCount = 0;
    
    for (const block of blocks) {
      currentChunk.push(block);
      
      if (currentChunk.length >= request.streaming.chunkSize) {
        const content = await generator.generate(currentChunk, request.options);
        yield new TextEncoder().encode(content);
        
        processedCount += currentChunk.length;
        currentChunk = [];
        
        request.streaming.onChunk?.(new Uint8Array(), processedCount / blocks.length);
      }
    }
    
    // Final chunk
    if (currentChunk.length > 0) {
      const content = await generator.generate(currentChunk, request.options);
      yield new TextEncoder().encode(content);
    }
  }
}
```

---

## 9. Migration Support

### 9.1 Notion Import

```typescript
class NotionImporter implements FormatParser {
  async parse(zipFile: File): Promise<ParsedContent> {
    const zip = await this.unzip(zipFile);
    const blocks: ParsedBlock[] = [];
    
    // Process each exported page
    for (const file of zip.files) {
      if (file.name.endsWith('.md')) {
        const content = await file.async('string');
        const pageBlocks = await this.parseNotionMarkdown(content, file.name);
        blocks.push(...pageBlocks);
      }
      
      if (file.name.endsWith('.csv')) {
        const content = await file.async('string');
        const dbBlocks = await this.parseNotionDatabase(content, file.name);
        blocks.push(...dbBlocks);
      }
    }
    
    return {
      blocks,
      metadata: {
        source: 'notion',
        importedAt: new Date().toISOString(),
      },
    };
  }
  
  private async parseNotionMarkdown(content: string, filename: string): Promise<ParsedBlock[]> {
    // Handle Notion-specific markdown extensions
    // - Callouts
    // - Toggles
    // - Databases embedded in pages
    // - Page links
    
    const blocks = await this.markdownParser.parse(content);
    
    // Convert Notion callouts to quote blocks
    blocks.forEach(block => {
      if (this.isNotionCallout(block)) {
        block.type = BlockType.QUOTE;
      }
    });
    
    return blocks;
  }
}
```

---

## 10. Configuration

### 10.1 Import/Export Settings

```typescript
interface ImportExportConfig {
  // Maximum file size
  maxFileSizeMB: number;           // Default: 50
  
  // Maximum blocks per import
  maxBlocksPerImport: number;      // Default: 10000
  
  // Timeout for large operations
  timeoutMs: number;               // Default: 300000 (5 min)
  
  // Temporary storage for processing
  tempStoragePath: string;
  
  // Cleanup temp files after (hours)
  tempFileRetentionHours: number;  // Default: 24
  
  // AI-assisted features
  aiAssisted: {
    propertyMapping: boolean;
    contentEnhancement: boolean;
    structureDetection: boolean;
  };
}
```

---

## References

- [AI Native Architecture](./AI_NATIVE_ARCHITECTURE.md)
- [Block Architecture](./BLOCK_ARCHITECTURE.md)
- [Database Engine](./DATABASE_ENGINE.md)
