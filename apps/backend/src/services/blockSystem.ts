/**
 * @fileoverview Block System Initialization
 * 
 * Initializes the block registry with all built-in block types.
 * This should be called once during application startup.
 */

import { blockRegistry } from './blockRegistry';
import { allBlockSchemas } from './blockSchemas';

/**
 * Initialize the block registry with all built-in schemas
 */
export function initializeBlockSystem(): void {
  // Register all built-in block types
  for (const schema of allBlockSchemas) {
    try {
      blockRegistry.register(schema as any);
    } catch (error) {
      console.error(`Failed to register block schema: ${schema.type}`, error);
      throw error;
    }
  }
  
  console.log(
    `Block system initialized with ${blockRegistry.getAllTypes().length} block types`
  );
}

/**
 * Get information about registered block types
 */
export function getBlockSystemInfo() {
  const schemas = blockRegistry.getAllSchemas();
  
  return {
    totalTypes: schemas.length,
    byCategory: {
      content: blockRegistry.getSchemasByCategory('content').length,
      structure: blockRegistry.getSchemasByCategory('structure').length,
      kanban: blockRegistry.getSchemasByCategory('kanban').length,
      table: blockRegistry.getSchemasByCategory('table').length,
      ai: blockRegistry.getSchemasByCategory('ai').length,
      other: blockRegistry.getSchemasByCategory('other').length,
    },
    types: schemas.map(schema => ({
      type: schema.type,
      name: schema.name,
      description: schema.description,
      category: schema.category,
      canHaveChildren: schema.canHaveChildren,
    })),
  };
}
