/**
 * @fileoverview Block CRUD Engine
 * 
 * Provides core CRUD operations for blocks with tree integrity preservation.
 * All operations are atomic and maintain the tree structure.
 * 
 * Operations Supported:
 * - Create: Add new blocks to the tree
 * - Read: Query and retrieve blocks
 * - Update: Modify block data and metadata
 * - Delete: Remove blocks (with or without children)
 * - Move: Relocate blocks within the tree
 * - Duplicate: Copy blocks (with or without children)
 */

import {
  Block,
  BlockType,
  BlockTree,
  CreateBlockParams,
  UpdateBlockParams,
  MoveBlockParams,
  DeleteBlockParams,
  DuplicateBlockParams,
  BlockQueryOptions,
  BlockSearchOptions,
  BlockValidationResult,
} from '../types/blocks';
import { blockRegistry } from './blockRegistry';

/**
 * Block CRUD Engine
 * Manages all block operations while preserving tree integrity
 */
export class BlockCRUDEngine {
  private blocks: Map<string, Block> = new Map();
  private roots: Set<string> = new Set();
  
  /**
   * Create a new block
   */
  create<T extends BlockType>(
    params: CreateBlockParams<T>
  ): Extract<Block, { type: T }> {
    // Validate block type is registered
    if (!blockRegistry.isRegistered(params.type)) {
      throw new Error(`Unknown block type: ${params.type}`);
    }
    
    // Validate data
    const validationResult = blockRegistry.validate(params.type, params.data);
    if (!validationResult.valid) {
      throw new Error(
        `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
      );
    }
    
    // Validate parent relationship
    if (params.parentId) {
      const parent = this.blocks.get(params.parentId);
      if (!parent) {
        throw new Error(`Parent block not found: ${params.parentId}`);
      }
      
      if (!blockRegistry.canHaveChild(parent.type, params.type)) {
        throw new Error(
          `Block type ${parent.type} cannot have child of type ${params.type}`
        );
      }
      
      if (!blockRegistry.canHaveParent(params.type, parent.type)) {
        throw new Error(
          `Block type ${params.type} cannot have parent of type ${parent.type}`
        );
      }
    }
    
    // Create the block
    const block = blockRegistry.createBlock(params);
    
    // Add to storage
    this.blocks.set(block.id, block);
    
    // Update tree structure
    if (block.parentId) {
      const parent = this.blocks.get(block.parentId)!;
      const position = params.position ?? parent.children.length;
      parent.children.splice(position, 0, block.id);
      this.updateTimestamp(parent);
    } else {
      this.roots.add(block.id);
    }
    
    return block;
  }
  
  /**
   * Get a block by ID
   */
  get(id: string): Block | undefined {
    return this.blocks.get(id);
  }
  
  /**
   * Get multiple blocks by IDs
   */
  getMany(ids: string[]): Block[] {
    return ids.map(id => this.blocks.get(id)).filter(Boolean) as Block[];
  }
  
  /**
   * Query blocks with filters
   */
  query(options: BlockQueryOptions = {}): Block[] {
    let results = Array.from(this.blocks.values());
    
    // Filter by type
    if (options.type) {
      const types = Array.isArray(options.type) ? options.type : [options.type];
      results = results.filter(block => types.includes(block.type));
    }
    
    // Filter by parent
    if (options.parentId !== undefined) {
      results = results.filter(block => block.parentId === options.parentId);
    }
    
    return results;
  }
  
  /**
   * Search blocks with text query
   */
  search(options: BlockSearchOptions): Block[] {
    let results = this.query(options);
    
    // Text search (searches in block data)
    if (options.query) {
      const searchTerm = options.query.toLowerCase();
      results = results.filter(block => {
        const dataStr = JSON.stringify(block.data).toLowerCase();
        return dataStr.includes(searchTerm);
      });
    }
    
    // Apply pagination
    if (options.offset !== undefined) {
      results = results.slice(options.offset);
    }
    
    if (options.limit !== undefined) {
      results = results.slice(0, options.limit);
    }
    
    return results;
  }
  
  /**
   * Get children of a block
   */
  getChildren(id: string, recursive: boolean = false): Block[] {
    const block = this.blocks.get(id);
    if (!block) return [];
    
    const children = this.getMany(block.children);
    
    if (recursive) {
      const descendants: Block[] = [...children];
      for (const child of children) {
        descendants.push(...this.getChildren(child.id, true));
      }
      return descendants;
    }
    
    return children;
  }
  
  /**
   * Get parent of a block
   */
  getParent(id: string): Block | undefined {
    const block = this.blocks.get(id);
    if (!block || !block.parentId) return undefined;
    return this.blocks.get(block.parentId);
  }
  
  /**
   * Get ancestors of a block (parent chain)
   */
  getAncestors(id: string): Block[] {
    const ancestors: Block[] = [];
    let current = this.blocks.get(id);
    
    while (current?.parentId) {
      const parent = this.blocks.get(current.parentId);
      if (!parent) break;
      ancestors.push(parent);
      current = parent;
    }
    
    return ancestors;
  }
  
  /**
   * Get root blocks
   */
  getRoots(): Block[] {
    return Array.from(this.roots).map(id => this.blocks.get(id)!);
  }
  
  /**
   * Update a block
   */
  update(params: UpdateBlockParams): Block {
    const block = this.blocks.get(params.id);
    if (!block) {
      throw new Error(`Block not found: ${params.id}`);
    }
    
    // Validate data if provided
    if (params.data) {
      const mergedData = { ...block.data, ...params.data };
      const validationResult = blockRegistry.validate(block.type, mergedData);
      if (!validationResult.valid) {
        throw new Error(
          `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
        );
      }
      Object.assign(block.data, params.data);
    }
    
    // Update metadata if provided
    if (params.metadata) {
      block.metadata = {
        ...block.metadata,
        ...params.metadata,
        permissions: {
          ...block.metadata.permissions,
          ...params.metadata.permissions,
        },
      };
    }
    
    this.updateTimestamp(block);
    
    return block;
  }
  
  /**
   * Move a block to a new parent
   */
  move(params: MoveBlockParams): Block {
    const block = this.blocks.get(params.id);
    if (!block) {
      throw new Error(`Block not found: ${params.id}`);
    }
    
    // Validate new parent
    if (params.newParentId) {
      const newParent = this.blocks.get(params.newParentId);
      if (!newParent) {
        throw new Error(`New parent not found: ${params.newParentId}`);
      }
      
      // Prevent circular references
      if (this.wouldCreateCycle(params.id, params.newParentId)) {
        throw new Error('Move would create circular reference');
      }
      
      // Validate parent-child relationship
      if (!blockRegistry.canHaveChild(newParent.type, block.type)) {
        throw new Error(
          `Block type ${newParent.type} cannot have child of type ${block.type}`
        );
      }
    }
    
    // Remove from old parent
    if (block.parentId) {
      const oldParent = this.blocks.get(block.parentId)!;
      const index = oldParent.children.indexOf(block.id);
      if (index !== -1) {
        oldParent.children.splice(index, 1);
        this.updateTimestamp(oldParent);
      }
    } else {
      this.roots.delete(block.id);
    }
    
    // Add to new parent
    block.parentId = params.newParentId ?? null;
    
    if (params.newParentId) {
      const newParent = this.blocks.get(params.newParentId)!;
      const position = params.position ?? newParent.children.length;
      newParent.children.splice(position, 0, block.id);
      this.updateTimestamp(newParent);
    } else {
      this.roots.add(block.id);
    }
    
    this.updateTimestamp(block);
    
    return block;
  }
  
  /**
   * Delete a block
   */
  delete(params: DeleteBlockParams): void {
    const block = this.blocks.get(params.id);
    if (!block) {
      throw new Error(`Block not found: ${params.id}`);
    }
    
    // Handle children
    if (block.children.length > 0) {
      if (params.deleteChildren) {
        // Recursively delete all children
        for (const childId of [...block.children]) {
          this.delete({ id: childId, deleteChildren: true });
        }
      } else {
        throw new Error(
          `Cannot delete block with children. Set deleteChildren: true or remove children first.`
        );
      }
    }
    
    // Remove from parent
    if (block.parentId) {
      const parent = this.blocks.get(block.parentId)!;
      const index = parent.children.indexOf(block.id);
      if (index !== -1) {
        parent.children.splice(index, 1);
        this.updateTimestamp(parent);
      }
    } else {
      this.roots.delete(block.id);
    }
    
    // Remove from storage
    this.blocks.delete(params.id);
  }
  
  /**
   * Duplicate a block
   */
  duplicate(params: DuplicateBlockParams): Block {
    const original = this.blocks.get(params.id);
    if (!original) {
      throw new Error(`Block not found: ${params.id}`);
    }
    
    // Create duplicate (without adding to parent's children yet if we're duplicating recursively)
    const duplicate = this.create({
      type: original.type as any,
      data: { ...original.data },
      parentId: params.duplicateChildren ? null : original.parentId,
      metadata: { ...original.metadata },
    });
    
    // Duplicate children if requested
    if (params.duplicateChildren && original.children.length > 0) {
      for (const childId of original.children) {
        const childDuplicate = this.duplicate({
          id: childId,
          duplicateChildren: true,
        });
        // Update parent reference and add to children
        childDuplicate.parentId = duplicate.id;
        duplicate.children.push(childDuplicate.id);
      }
      
      // Now set the parent if there was one
      if (original.parentId) {
        duplicate.parentId = original.parentId;
        const parent = this.blocks.get(original.parentId);
        if (parent) {
          parent.children.push(duplicate.id);
          this.updateTimestamp(parent);
        }
      } else {
        this.roots.add(duplicate.id);
      }
    }
    
    return duplicate;
  }
  
  /**
   * Export the entire block tree
   */
  exportTree(): BlockTree {
    const blocksObj: Record<string, Block> = {};
    for (const [id, block] of this.blocks.entries()) {
      blocksObj[id] = block;
    }
    
    return {
      roots: Array.from(this.roots),
      blocks: blocksObj,
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }
  
  /**
   * Import a block tree
   */
  importTree(tree: BlockTree): void {
    // Clear existing blocks
    this.blocks.clear();
    this.roots.clear();
    
    // Import blocks
    for (const [id, block] of Object.entries(tree.blocks)) {
      this.blocks.set(id, block);
      
      // Add roots
      if (!block.parentId) {
        this.roots.add(id);
      }
    }
  }
  
  /**
   * Clear all blocks
   */
  clear(): void {
    this.blocks.clear();
    this.roots.clear();
  }
  
  /**
   * Get total block count
   */
  count(): number {
    return this.blocks.size;
  }
  
  // ===== Private Helper Methods =====
  
  /**
   * Update block timestamp
   */
  private updateTimestamp(block: Block): void {
    block.updatedAt = new Date().toISOString();
  }
  
  /**
   * Check if moving a block would create a cycle
   */
  private wouldCreateCycle(blockId: string, newParentId: string): boolean {
    let current = this.blocks.get(newParentId);
    while (current) {
      if (current.id === blockId) return true;
      current = current.parentId ? this.blocks.get(current.parentId) : undefined;
    }
    return false;
  }
}
