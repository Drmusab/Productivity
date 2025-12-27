/**
 * @fileoverview Block System Tests
 * 
 * Tests for the block-based architecture including:
 * - Block registry
 * - Block CRUD operations
 * - Tree integrity
 * - Validation
 * - Serialization
 */

import { BlockCRUDEngine } from '../src/services/blockCRUD';
import { blockRegistry } from '../src/services/blockRegistry';
import { initializeBlockSystem } from '../src/services/blockSystem';
import { BlockType } from '../src/types/blocks';

describe('Block System', () => {
  beforeAll(() => {
    // Initialize block system once
    initializeBlockSystem();
  });

  describe('Block Registry', () => {
    it('should have all block types registered', () => {
      const types = blockRegistry.getAllTypes();
      expect(types.length).toBeGreaterThan(0);
      
      // Check specific types exist
      expect(types).toContain(BlockType.TEXT);
      expect(types).toContain(BlockType.HEADING);
      expect(types).toContain(BlockType.KANBAN_BOARD);
      expect(types).toContain(BlockType.KANBAN_CARD);
      expect(types).toContain(BlockType.AI_BLOCK);
    });

    it('should return schema for registered block types', () => {
      const schema = blockRegistry.getSchema(BlockType.TEXT);
      expect(schema).toBeDefined();
      expect(schema?.type).toBe(BlockType.TEXT);
      expect(schema?.name).toBe('Text');
      expect(schema?.category).toBe('content');
    });

    it('should validate block data', () => {
      // Valid data
      const validResult = blockRegistry.validate(BlockType.TEXT, {
        content: 'Hello world'
      });
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid data (missing required field)
      const invalidResult = blockRegistry.validate(BlockType.TEXT, {});
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it('should check parent-child compatibility', () => {
      // Valid relationships
      expect(
        blockRegistry.canHaveChild(BlockType.KANBAN_BOARD, BlockType.KANBAN_COLUMN)
      ).toBe(true);
      
      expect(
        blockRegistry.canHaveChild(BlockType.KANBAN_COLUMN, BlockType.KANBAN_CARD)
      ).toBe(true);

      expect(
        blockRegistry.canHaveChild(BlockType.PAGE, BlockType.HEADING)
      ).toBe(true);

      // Invalid relationship
      expect(
        blockRegistry.canHaveChild(BlockType.TEXT, BlockType.KANBAN_BOARD)
      ).toBe(false); // TEXT cannot have children
    });

    it('should get schemas by category', () => {
      const kanbanSchemas = blockRegistry.getSchemasByCategory('kanban');
      expect(kanbanSchemas.length).toBeGreaterThan(0);
      expect(kanbanSchemas.every(s => s.category === 'kanban')).toBe(true);
      
      const aiSchemas = blockRegistry.getSchemasByCategory('ai');
      expect(aiSchemas.length).toBeGreaterThan(0);
      expect(aiSchemas.every(s => s.category === 'ai')).toBe(true);
    });
  });

  describe('Block CRUD Operations', () => {
    let engine: BlockCRUDEngine;

    beforeEach(() => {
      engine = new BlockCRUDEngine();
    });

    describe('Create', () => {
      it('should create a simple block', () => {
        const block = engine.create({
          type: BlockType.TEXT,
          data: { content: 'Hello world' }
        });

        expect(block.id).toBeDefined();
        expect(block.type).toBe(BlockType.TEXT);
        expect(block.data.content).toBe('Hello world');
        expect(block.children).toEqual([]);
        expect(block.parentId).toBeNull();
        expect(block.createdAt).toBeDefined();
        expect(block.updatedAt).toBeDefined();
        expect(block.version).toBe(1);
      });

      it('should create a block with parent', () => {
        const parent = engine.create({
          type: BlockType.PAGE,
          data: { title: 'My Page' }
        });

        const child = engine.create({
          type: BlockType.HEADING,
          data: { content: 'Section 1', level: 1 },
          parentId: parent.id
        });

        expect(child.parentId).toBe(parent.id);
        expect(parent.children).toContain(child.id);
      });

      it('should create a Kanban structure', () => {
        const board = engine.create({
          type: BlockType.KANBAN_BOARD,
          data: { name: 'Project Board' }
        });

        const column = engine.create({
          type: BlockType.KANBAN_COLUMN,
          data: { name: 'To Do', color: '#3498db' },
          parentId: board.id
        });

        const card = engine.create({
          type: BlockType.KANBAN_CARD,
          data: { title: 'Task 1', priority: 'high' },
          parentId: column.id
        });

        expect(board.children).toContain(column.id);
        expect(column.children).toContain(card.id);
        expect(card.parentId).toBe(column.id);
      });

      it('should reject invalid data', () => {
        expect(() => {
          engine.create({
            type: BlockType.TEXT,
            data: {} as any // Missing required 'content'
          });
        }).toThrow();
      });

      it('should reject invalid parent-child relationship', () => {
        const textBlock = engine.create({
          type: BlockType.TEXT,
          data: { content: 'Text' }
        });

        expect(() => {
          engine.create({
            type: BlockType.HEADING,
            data: { content: 'Heading', level: 1 },
            parentId: textBlock.id // TEXT cannot have children
          });
        }).toThrow();
      });
    });

    describe('Read', () => {
      it('should get block by ID', () => {
        const created = engine.create({
          type: BlockType.TEXT,
          data: { content: 'Test' }
        });

        const retrieved = engine.get(created.id);
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(created.id);
      });

      it('should return undefined for non-existent block', () => {
        const block = engine.get('non-existent-id');
        expect(block).toBeUndefined();
      });

      it('should get multiple blocks', () => {
        const block1 = engine.create({
          type: BlockType.TEXT,
          data: { content: 'Block 1' }
        });
        const block2 = engine.create({
          type: BlockType.TEXT,
          data: { content: 'Block 2' }
        });

        const blocks = engine.getMany([block1.id, block2.id]);
        expect(blocks).toHaveLength(2);
        expect(blocks.map(b => b.id)).toContain(block1.id);
        expect(blocks.map(b => b.id)).toContain(block2.id);
      });

      it('should query blocks by type', () => {
        engine.create({ type: BlockType.TEXT, data: { content: 'Text 1' } });
        engine.create({ type: BlockType.TEXT, data: { content: 'Text 2' } });
        engine.create({ type: BlockType.HEADING, data: { content: 'Heading', level: 1 } });

        const textBlocks = engine.query({ type: BlockType.TEXT });
        expect(textBlocks).toHaveLength(2);
        expect(textBlocks.every(b => b.type === BlockType.TEXT)).toBe(true);
      });

      it('should query blocks by parent', () => {
        const parent = engine.create({
          type: BlockType.PAGE,
          data: { title: 'Page' }
        });

        engine.create({
          type: BlockType.TEXT,
          data: { content: 'Child 1' },
          parentId: parent.id
        });
        engine.create({
          type: BlockType.TEXT,
          data: { content: 'Child 2' },
          parentId: parent.id
        });

        const children = engine.query({ parentId: parent.id });
        expect(children).toHaveLength(2);
      });

      it('should search blocks by text', () => {
        engine.create({
          type: BlockType.KANBAN_CARD,
          data: { title: 'Important task' }
        });
        engine.create({
          type: BlockType.KANBAN_CARD,
          data: { title: 'Regular task' }
        });

        const results = engine.search({ query: 'important' });
        expect(results).toHaveLength(1);
        const firstResult = results[0];
        if (firstResult.type === BlockType.KANBAN_CARD) {
          expect(firstResult.data.title).toContain('Important');
        }
      });

      it('should get children', () => {
        const parent = engine.create({
          type: BlockType.PAGE,
          data: { title: 'Page' }
        });

        const child1 = engine.create({
          type: BlockType.TEXT,
          data: { content: 'Child 1' },
          parentId: parent.id
        });

        const child2 = engine.create({
          type: BlockType.TEXT,
          data: { content: 'Child 2' },
          parentId: parent.id
        });

        const children = engine.getChildren(parent.id);
        expect(children).toHaveLength(2);
        expect(children.map(c => c.id)).toContain(child1.id);
        expect(children.map(c => c.id)).toContain(child2.id);
      });

      it('should get parent', () => {
        const parent = engine.create({
          type: BlockType.PAGE,
          data: { title: 'Page' }
        });

        const child = engine.create({
          type: BlockType.TEXT,
          data: { content: 'Child' },
          parentId: parent.id
        });

        const retrievedParent = engine.getParent(child.id);
        expect(retrievedParent).toBeDefined();
        expect(retrievedParent?.id).toBe(parent.id);
      });

      it('should get ancestors', () => {
        const grandparent = engine.create({
          type: BlockType.PAGE,
          data: { title: 'Grandparent' }
        });

        const parent = engine.create({
          type: BlockType.ROW,
          data: {},
          parentId: grandparent.id
        });

        const child = engine.create({
          type: BlockType.COLUMN,
          data: {},
          parentId: parent.id
        });

        const ancestors = engine.getAncestors(child.id);
        expect(ancestors).toHaveLength(2);
        expect(ancestors.map(a => a.id)).toContain(parent.id);
        expect(ancestors.map(a => a.id)).toContain(grandparent.id);
      });
    });

    describe('Update', () => {
      it('should update block data', () => {
        const block = engine.create({
          type: BlockType.KANBAN_CARD,
          data: { title: 'Original Title', priority: 'low' }
        });

        const updated = engine.update({
          id: block.id,
          data: { priority: 'high' }
        });

        if (updated.type === BlockType.KANBAN_CARD) {
          expect(updated.data.priority).toBe('high');
          expect(updated.data.title).toBe('Original Title'); // Unchanged
        }
      });

      it('should update block metadata', () => {
        const block = engine.create({
          type: BlockType.TEXT,
          data: { content: 'Text' }
        });

        engine.update({
          id: block.id,
          metadata: {
            aiHints: {
              isAIGenerated: true,
              aiModel: 'gpt-4',
              confidence: 0.95
            }
          }
        });

        const updated = engine.get(block.id);
        expect(updated?.metadata.aiHints?.isAIGenerated).toBe(true);
        expect(updated?.metadata.aiHints?.confidence).toBe(0.95);
      });

      it('should reject invalid updates', () => {
        const block = engine.create({
          type: BlockType.TEXT,
          data: { content: 'Text' }
        });

        expect(() => {
          engine.update({
            id: block.id,
            data: { content: '' } // Empty content is invalid
          });
        }).toThrow();
      });
    });

    describe('Move', () => {
      it('should move block to new parent', () => {
        const parent1 = engine.create({
          type: BlockType.KANBAN_COLUMN,
          data: { name: 'Column 1' }
        });

        const parent2 = engine.create({
          type: BlockType.KANBAN_COLUMN,
          data: { name: 'Column 2' }
        });

        const card = engine.create({
          type: BlockType.KANBAN_CARD,
          data: { title: 'Card' },
          parentId: parent1.id
        });

        engine.move({
          id: card.id,
          newParentId: parent2.id
        });

        const updated = engine.get(card.id);
        expect(updated?.parentId).toBe(parent2.id);
        
        const updatedParent1 = engine.get(parent1.id);
        expect(updatedParent1?.children).not.toContain(card.id);
        
        const updatedParent2 = engine.get(parent2.id);
        expect(updatedParent2?.children).toContain(card.id);
      });

      it('should prevent circular references', () => {
        const parent = engine.create({
          type: BlockType.PAGE,
          data: { title: 'Parent' }
        });

        const child = engine.create({
          type: BlockType.ROW,
          data: {},
          parentId: parent.id
        });

        // Try to make parent a child of child (circular)
        expect(() => {
          engine.move({
            id: parent.id,
            newParentId: child.id
          });
        }).toThrow();
      });
    });

    describe('Delete', () => {
      it('should delete block without children', () => {
        const block = engine.create({
          type: BlockType.TEXT,
          data: { content: 'Text' }
        });

        engine.delete({ id: block.id });
        
        const retrieved = engine.get(block.id);
        expect(retrieved).toBeUndefined();
      });

      it('should prevent deleting block with children', () => {
        const parent = engine.create({
          type: BlockType.PAGE,
          data: { title: 'Page' }
        });

        engine.create({
          type: BlockType.TEXT,
          data: { content: 'Child' },
          parentId: parent.id
        });

        expect(() => {
          engine.delete({ id: parent.id });
        }).toThrow();
      });

      it('should delete block with children recursively', () => {
        const parent = engine.create({
          type: BlockType.PAGE,
          data: { title: 'Page' }
        });

        const child = engine.create({
          type: BlockType.TEXT,
          data: { content: 'Child' },
          parentId: parent.id
        });

        engine.delete({ id: parent.id, deleteChildren: true });
        
        expect(engine.get(parent.id)).toBeUndefined();
        expect(engine.get(child.id)).toBeUndefined();
      });
    });

    describe('Duplicate', () => {
      it('should duplicate block without children', () => {
        const original = engine.create({
          type: BlockType.KANBAN_CARD,
          data: { title: 'Original', priority: 'high' }
        });

        const duplicate = engine.duplicate({ id: original.id });
        
        expect(duplicate.id).not.toBe(original.id);
        if (duplicate.type === BlockType.KANBAN_CARD) {
          expect(duplicate.data.title).toBe('Original');
          expect(duplicate.data.priority).toBe('high');
        }
      });

      it('should duplicate block with children', () => {
        const parent = engine.create({
          type: BlockType.KANBAN_CARD,
          data: { title: 'Card' }
        });

        const child1 = engine.create({
          type: BlockType.TODO,
          data: { content: 'Todo 1', completed: false },
          parentId: parent.id
        });

        const child2 = engine.create({
          type: BlockType.TODO,
          data: { content: 'Todo 2', completed: true },
          parentId: parent.id
        });

        const duplicate = engine.duplicate({
          id: parent.id,
          duplicateChildren: true
        });

        expect(duplicate.children).toHaveLength(2);
        
        const duplicatedChildren = engine.getChildren(duplicate.id);
        expect(duplicatedChildren).toHaveLength(2);
      });
    });

    describe('Tree Operations', () => {
      it('should export tree', () => {
        const page = engine.create({
          type: BlockType.PAGE,
          data: { title: 'Page' }
        });

        engine.create({
          type: BlockType.TEXT,
          data: { content: 'Child' },
          parentId: page.id
        });

        const tree = engine.exportTree();
        
        expect(tree.roots).toContain(page.id);
        expect(Object.keys(tree.blocks)).toHaveLength(2);
        expect(tree.metadata.version).toBeDefined();
      });

      it('should import tree', () => {
        const tree = {
          roots: ['root-1'],
          blocks: {
            'root-1': {
              id: 'root-1',
              type: BlockType.PAGE,
              data: { title: 'Imported Page' },
              children: [],
              parentId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              version: 1,
              metadata: {}
            } as any
          },
          metadata: {
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        };

        engine.importTree(tree);
        
        const block = engine.get('root-1');
        expect(block).toBeDefined();
        if (block && block.type === BlockType.PAGE) {
          expect(block.data.title).toBe('Imported Page');
        }
      });

      it('should clear all blocks', () => {
        engine.create({ type: BlockType.TEXT, data: { content: 'Text 1' } });
        engine.create({ type: BlockType.TEXT, data: { content: 'Text 2' } });
        
        expect(engine.count()).toBe(2);
        
        engine.clear();
        
        expect(engine.count()).toBe(0);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should create a complete Kanban board structure', () => {
      const engine = new BlockCRUDEngine();

      // Create board
      const board = engine.create({
        type: BlockType.KANBAN_BOARD,
        data: { name: 'Sprint Board', description: 'Sprint 1' }
      });

      // Create columns
      const todoCol = engine.create({
        type: BlockType.KANBAN_COLUMN,
        data: { name: 'To Do', color: '#3498db' },
        parentId: board.id
      });

      const inProgressCol = engine.create({
        type: BlockType.KANBAN_COLUMN,
        data: { name: 'In Progress', color: '#f39c12', wipLimit: 3 },
        parentId: board.id
      });

      const doneCol = engine.create({
        type: BlockType.KANBAN_COLUMN,
        data: { name: 'Done', color: '#2ecc71', isDone: true },
        parentId: board.id
      });

      // Create cards
      const card1 = engine.create({
        type: BlockType.KANBAN_CARD,
        data: {
          title: 'Implement feature X',
          description: 'Build the feature',
          priority: 'high',
          tags: ['backend', 'api']
        },
        parentId: todoCol.id
      });

      // Add subtasks
      engine.create({
        type: BlockType.TODO,
        data: { content: 'Design API', completed: true },
        parentId: card1.id
      });

      engine.create({
        type: BlockType.TODO,
        data: { content: 'Implement endpoints', completed: false },
        parentId: card1.id
      });

      // Verify structure
      expect(board.children).toHaveLength(3);
      expect(engine.getChildren(todoCol.id)).toHaveLength(1);
      expect(engine.getChildren(card1.id)).toHaveLength(2);

      // Move card to In Progress
      engine.move({
        id: card1.id,
        newParentId: inProgressCol.id
      });

      const updatedCard = engine.get(card1.id);
      expect(updatedCard?.parentId).toBe(inProgressCol.id);

      // Export the tree
      const tree = engine.exportTree();
      expect(tree.roots).toHaveLength(1);
      expect(Object.keys(tree.blocks).length).toBeGreaterThan(5);
    });
  });
});
