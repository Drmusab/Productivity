/**
 * @fileoverview Block Registry Service
 * 
 * Provides a centralized registry for managing block types, their schemas,
 * validators, and renderers. This enables extensibility without modifying core logic.
 * 
 * Design Pattern: Registry Pattern + Factory Pattern
 * - Maps block types to their configurations
 * - Provides factory methods for creating blocks
 * - Supports dynamic registration of new block types
 */

import { randomUUID } from 'crypto';
import {
  Block,
  BlockType,
  BaseBlock,
  BlockMetadata,
  BlockValidationResult,
  BlockValidationError,
  CreateBlockParams,
} from '../types/blocks';

/**
 * Schema definition for a block type
 */
export interface BlockSchema<T extends BlockType> {
  /** Block type identifier */
  type: T;
  
  /** Human-readable name */
  name: string;
  
  /** Description of the block type */
  description: string;
  
  /** Category for grouping block types */
  category: 'content' | 'structure' | 'kanban' | 'table' | 'ai' | 'other';
  
  /** Whether this block can have children */
  canHaveChildren: boolean;
  
  /** Allowed parent block types (undefined = any) */
  allowedParents?: BlockType[];
  
  /** Allowed child block types (undefined = any) */
  allowedChildren?: BlockType[];
  
  /** Default data for new blocks */
  defaultData: Extract<Block, { type: T }>['data'];
  
  /** Validation function */
  validate: (data: any) => BlockValidationResult;
}

/**
 * Block Registry - Central registry for all block types
 */
export class BlockRegistry {
  private schemas: Map<BlockType, BlockSchema<any>> = new Map();
  
  /**
   * Register a new block type
   */
  register<T extends BlockType>(schema: BlockSchema<T>): void {
    if (this.schemas.has(schema.type)) {
      throw new Error(`Block type ${schema.type} is already registered`);
    }
    this.schemas.set(schema.type, schema);
  }
  
  /**
   * Unregister a block type
   */
  unregister(type: BlockType): void {
    this.schemas.delete(type);
  }
  
  /**
   * Get schema for a block type
   */
  getSchema<T extends BlockType>(type: T): BlockSchema<T> | undefined {
    return this.schemas.get(type);
  }
  
  /**
   * Get all registered block types
   */
  getAllTypes(): BlockType[] {
    return Array.from(this.schemas.keys());
  }
  
  /**
   * Get all schemas
   */
  getAllSchemas(): BlockSchema<any>[] {
    return Array.from(this.schemas.values());
  }
  
  /**
   * Get schemas by category
   */
  getSchemasByCategory(category: BlockSchema<any>['category']): BlockSchema<any>[] {
    return Array.from(this.schemas.values()).filter(
      schema => schema.category === category
    );
  }
  
  /**
   * Check if a block type is registered
   */
  isRegistered(type: BlockType): boolean {
    return this.schemas.has(type);
  }
  
  /**
   * Validate block data against its schema
   */
  validate(type: BlockType, data: any): BlockValidationResult {
    const schema = this.getSchema(type);
    if (!schema) {
      return {
        valid: false,
        errors: [{
          field: 'type',
          message: `Unknown block type: ${type}`,
          code: 'UNKNOWN_BLOCK_TYPE',
        }],
      };
    }
    
    return schema.validate(data);
  }
  
  /**
   * Check if parent-child relationship is allowed
   */
  canHaveParent(childType: BlockType, parentType: BlockType): boolean {
    const childSchema = this.getSchema(childType);
    if (!childSchema) return false;
    
    // If no restrictions, allow any parent
    if (!childSchema.allowedParents) return true;
    
    return childSchema.allowedParents.includes(parentType);
  }
  
  /**
   * Check if a block type can have children
   */
  canHaveChildren(type: BlockType): boolean {
    const schema = this.getSchema(type);
    return schema?.canHaveChildren ?? false;
  }
  
  /**
   * Check if child type is allowed for parent type
   */
  canHaveChild(parentType: BlockType, childType: BlockType): boolean {
    const parentSchema = this.getSchema(parentType);
    if (!parentSchema || !parentSchema.canHaveChildren) return false;
    
    // If no restrictions, allow any child
    if (!parentSchema.allowedChildren) return true;
    
    return parentSchema.allowedChildren.includes(childType);
  }
  
  /**
   * Create a new block with default values
   */
  createBlock<T extends BlockType>(
    params: CreateBlockParams<T>
  ): Extract<Block, { type: T }> {
    const schema = this.getSchema(params.type);
    if (!schema) {
      throw new Error(`Cannot create block: unknown type ${params.type}`);
    }
    
    const now = new Date().toISOString();
    
    const block: BaseBlock = {
      id: randomUUID(),
      type: params.type,
      children: [],
      parentId: params.parentId ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      metadata: {
        permissions: {
          canEdit: true,
          canDelete: true,
          canMove: true,
          canShare: true,
        },
        ...params.metadata,
      },
    };
    
    // Merge provided data with defaults
    const data = {
      ...schema.defaultData,
      ...params.data,
    };
    
    return {
      ...block,
      data,
    } as Extract<Block, { type: T }>;
  }
}

// ===== Validation Helpers =====

/**
 * Helper to create validation results
 */
export function createValidationResult(
  errors: BlockValidationError[] = []
): BlockValidationResult {
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Helper to create validation errors
 */
export function createValidationError(
  field: string,
  message: string,
  code: string = 'VALIDATION_ERROR'
): BlockValidationError {
  return { field, message, code };
}

/**
 * Validate required string field
 */
export function validateRequired(
  value: any,
  fieldName: string
): BlockValidationError | null {
  if (value === undefined || value === null || value === '') {
    return createValidationError(
      fieldName,
      `${fieldName} is required`,
      'REQUIRED_FIELD'
    );
  }
  return null;
}

/**
 * Validate string field
 */
export function validateString(
  value: any,
  fieldName: string,
  options: { maxLength?: number; minLength?: number; pattern?: RegExp } = {}
): BlockValidationError | null {
  if (typeof value !== 'string') {
    return createValidationError(
      fieldName,
      `${fieldName} must be a string`,
      'INVALID_TYPE'
    );
  }
  
  if (options.minLength !== undefined && value.length < options.minLength) {
    return createValidationError(
      fieldName,
      `${fieldName} must be at least ${options.minLength} characters`,
      'MIN_LENGTH'
    );
  }
  
  if (options.maxLength !== undefined && value.length > options.maxLength) {
    return createValidationError(
      fieldName,
      `${fieldName} must not exceed ${options.maxLength} characters`,
      'MAX_LENGTH'
    );
  }
  
  if (options.pattern && !options.pattern.test(value)) {
    return createValidationError(
      fieldName,
      `${fieldName} does not match required pattern`,
      'INVALID_FORMAT'
    );
  }
  
  return null;
}

/**
 * Validate number field
 */
export function validateNumber(
  value: any,
  fieldName: string,
  options: { min?: number; max?: number; integer?: boolean } = {}
): BlockValidationError | null {
  if (typeof value !== 'number' || isNaN(value)) {
    return createValidationError(
      fieldName,
      `${fieldName} must be a number`,
      'INVALID_TYPE'
    );
  }
  
  if (options.integer && !Number.isInteger(value)) {
    return createValidationError(
      fieldName,
      `${fieldName} must be an integer`,
      'INVALID_TYPE'
    );
  }
  
  if (options.min !== undefined && value < options.min) {
    return createValidationError(
      fieldName,
      `${fieldName} must be at least ${options.min}`,
      'MIN_VALUE'
    );
  }
  
  if (options.max !== undefined && value > options.max) {
    return createValidationError(
      fieldName,
      `${fieldName} must not exceed ${options.max}`,
      'MAX_VALUE'
    );
  }
  
  return null;
}

/**
 * Validate boolean field
 */
export function validateBoolean(
  value: any,
  fieldName: string
): BlockValidationError | null {
  if (typeof value !== 'boolean') {
    return createValidationError(
      fieldName,
      `${fieldName} must be a boolean`,
      'INVALID_TYPE'
    );
  }
  return null;
}

/**
 * Validate enum field
 */
export function validateEnum<T>(
  value: any,
  fieldName: string,
  allowedValues: T[]
): BlockValidationError | null {
  if (!allowedValues.includes(value)) {
    return createValidationError(
      fieldName,
      `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      'INVALID_ENUM'
    );
  }
  return null;
}

// ===== Global Registry Instance =====

/**
 * Global block registry instance
 */
export const blockRegistry = new BlockRegistry();
