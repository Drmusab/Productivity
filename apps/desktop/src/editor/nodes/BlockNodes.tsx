// @ts-nocheck
/**
 * @fileoverview Custom Lexical Nodes for Block-Based Architecture
 * 
 * This file defines custom Lexical nodes that map to our Block model.
 * Each node type corresponds to a BlockType from the backend.
 */

import {
  DecoratorNode,
  ElementNode,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';

// Type imports from backend (we'll need to create type definitions or use these directly)
export interface Block {
  id: string;
  type: string;
  data: any;
  children: string[];
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  metadata: any;
}

export interface KanbanCardBlockData {
  title: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  description?: string;
  dueDate?: string | null;
}

export interface TodoBlockData {
  content: string;
  completed: boolean;
}

export interface HeadingBlockData {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
}

// ===== Base Block Node Interface =====

export interface BlockNodeInterface {
  getBlockId(): string;
  toBlock(): Partial<Block>;
}

// ===== Kanban Card Node =====

export type SerializedKanbanCardNode = Spread<
  {
    blockId: string;
    title: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    tags: string[];
    description?: string;
    dueDate?: string | null;
    type: 'kanban-card';
    version: 1;
  },
  SerializedLexicalNode
>;

export class KanbanCardNode extends DecoratorNode<JSX.Element> implements BlockNodeInterface {
  __blockId: string;
  __title: string;
  __priority: 'low' | 'medium' | 'high' | 'critical';
  __tags: string[];
  __description?: string;
  __dueDate?: string | null;

  static getType(): string {
    return 'kanban-card';
  }

  static clone(node: KanbanCardNode): KanbanCardNode {
    return new KanbanCardNode(
      node.__blockId,
      node.__title,
      node.__priority,
      node.__tags,
      node.__description,
      node.__dueDate,
      node.__key
    );
  }

  constructor(
    blockId: string,
    title: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    tags: string[] = [],
    description?: string,
    dueDate?: string | null,
    key?: NodeKey
  ) {
    super(key);
    this.__blockId = blockId;
    this.__title = title;
    this.__priority = priority;
    this.__tags = tags;
    this.__description = description;
    this.__dueDate = dueDate;
  }

  getBlockId(): string {
    return this.__blockId;
  }

  exportJSON(): SerializedKanbanCardNode {
    return {
      blockId: this.__blockId,
      title: this.__title,
      priority: this.__priority,
      tags: this.__tags,
      description: this.__description,
      dueDate: this.__dueDate,
      type: 'kanban-card',
      version: 1,
    };
  }

  static importJSON(serializedNode: SerializedKanbanCardNode): KanbanCardNode {
    return new KanbanCardNode(
      serializedNode.blockId,
      serializedNode.title,
      serializedNode.priority,
      serializedNode.tags,
      serializedNode.description,
      serializedNode.dueDate
    );
  }

  toBlock(): Partial<Block> {
    return {
      id: this.__blockId,
      type: 'kanban_card',
      data: {
        title: this.__title,
        priority: this.__priority,
        tags: this.__tags,
        description: this.__description,
        dueDate: this.__dueDate,
      } as KanbanCardBlockData,
    };
  }

  static fromBlock(block: Block): KanbanCardNode {
    const data = block.data as KanbanCardBlockData;
    return new KanbanCardNode(
      block.id,
      data.title,
      data.priority || 'medium',
      data.tags || [],
      data.description,
      data.dueDate
    );
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'kanban-card-node';
    return div;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    // Will be implemented by React component
    return null as any;
  }
}

// ===== Todo/Checkbox Node =====

export type SerializedTodoNode = Spread<
  {
    blockId: string;
    content: string;
    completed: boolean;
    type: 'todo';
    version: 1;
  },
  SerializedLexicalNode
>;

export class TodoNode extends DecoratorNode<JSX.Element> implements BlockNodeInterface {
  __blockId: string;
  __content: string;
  __completed: boolean;

  static getType(): string {
    return 'todo';
  }

  static clone(node: TodoNode): TodoNode {
    return new TodoNode(
      node.__blockId,
      node.__content,
      node.__completed,
      node.__key
    );
  }

  constructor(
    blockId: string,
    content: string,
    completed: boolean = false,
    key?: NodeKey
  ) {
    super(key);
    this.__blockId = blockId;
    this.__content = content;
    this.__completed = completed;
  }

  getBlockId(): string {
    return this.__blockId;
  }

  toggleCompleted(): void {
    const writable = this.getWritable();
    writable.__completed = !writable.__completed;
  }

  exportJSON(): SerializedTodoNode {
    return {
      blockId: this.__blockId,
      content: this.__content,
      completed: this.__completed,
      type: 'todo',
      version: 1,
    };
  }

  static importJSON(serializedNode: SerializedTodoNode): TodoNode {
    return new TodoNode(
      serializedNode.blockId,
      serializedNode.content,
      serializedNode.completed
    );
  }

  toBlock(): Partial<Block> {
    return {
      id: this.__blockId,
      type: 'todo',
      data: {
        content: this.__content,
        completed: this.__completed,
      } as TodoBlockData,
    };
  }

  static fromBlock(block: Block): TodoNode {
    const data = block.data as TodoBlockData;
    return new TodoNode(
      block.id,
      data.content,
      data.completed
    );
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'todo-node';
    return div;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    // Will be implemented by React component
    return null as any;
  }
}

// ===== Heading Node Extension =====

export type SerializedHeadingBlockNode = Spread<
  {
    blockId: string;
    level: 1 | 2 | 3 | 4 | 5 | 6;
    text: string;
    type: 'heading';
    version: 1;
  },
  SerializedLexicalNode
>;

export class HeadingBlockNode extends ElementNode implements BlockNodeInterface {
  __blockId: string;
  __level: 1 | 2 | 3 | 4 | 5 | 6;

  static getType(): string {
    return 'heading-block';
  }

  static clone(node: HeadingBlockNode): HeadingBlockNode {
    return new HeadingBlockNode(
      node.__blockId,
      node.__level,
      node.__key
    );
  }

  constructor(
    blockId: string,
    level: 1 | 2 | 3 | 4 | 5 | 6 = 1,
    key?: NodeKey
  ) {
    super(key);
    this.__blockId = blockId;
    this.__level = level;
  }

  getBlockId(): string {
    return this.__blockId;
  }

  getLevel(): 1 | 2 | 3 | 4 | 5 | 6 {
    return this.__level;
  }

  exportJSON(): SerializedHeadingBlockNode {
    return {
      blockId: this.__blockId,
      level: this.__level,
      text: this.getTextContent(),
      type: 'heading',
      version: 1,
    };
  }

  static importJSON(serializedNode: SerializedHeadingBlockNode): HeadingBlockNode {
    return new HeadingBlockNode(
      serializedNode.blockId,
      serializedNode.level
    );
  }

  toBlock(): Partial<Block> {
    return {
      id: this.__blockId,
      type: 'heading',
      data: {
        level: this.__level,
        text: this.getTextContent(),
      } as HeadingBlockData,
    };
  }

  static fromBlock(block: Block): HeadingBlockNode {
    const data = block.data as HeadingBlockData;
    return new HeadingBlockNode(
      block.id,
      data.level
    );
  }

  createDOM(): HTMLElement {
    const tag = `h${this.__level}`;
    const element = document.createElement(tag);
    element.className = 'heading-block-node';
    return element;
  }

  updateDOM(prevNode: HeadingBlockNode): boolean {
    return prevNode.__level !== this.__level;
  }

  canBeEmpty(): boolean {
    return false;
  }

  isInline(): boolean {
    return false;
  }
}

// Export all custom nodes
export const CUSTOM_NODES = [
  KanbanCardNode,
  TodoNode,
  HeadingBlockNode,
];
