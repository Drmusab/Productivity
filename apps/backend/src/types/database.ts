/**
 * @fileoverview Universal Database Engine Type Definitions
 * 
 * This file defines the core types for a Universal Database Engine where
 * databases are schemas + views, not traditional SQL tables.
 * 
 * Core Principles:
 * 1. Databases are schemas, NOT tables
 * 2. Rows are blocks (type: "db_row")
 * 3. Views are NOT data - they are pure query + presentation configurations
 * 4. Changing a view never mutates data
 */

import { DatabaseRowBlockData } from './blocks';

// ===== Property Types =====

/**
 * All supported property types in a database
 */
export enum PropertyType {
  TEXT = 'text',
  NUMBER = 'number',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  DATE = 'date',
  CHECKBOX = 'checkbox',
  RELATION = 'relation',
  ROLLUP = 'rollup',
  FORMULA = 'formula',
}

/**
 * Base property definition
 */
export interface BaseProperty {
  /** Unique property identifier */
  id: string;
  
  /** Property name (column header) */
  name: string;
  
  /** Property type */
  type: PropertyType;
  
  /** Whether this is a required field */
  required?: boolean;
  
  /** Property description */
  description?: string;
}

/**
 * Text property
 */
export interface TextProperty extends BaseProperty {
  type: PropertyType.TEXT;
  config?: {
    multiline?: boolean;
    maxLength?: number;
  };
}

/**
 * Number property
 */
export interface NumberProperty extends BaseProperty {
  type: PropertyType.NUMBER;
  config?: {
    format?: 'number' | 'currency' | 'percent';
    precision?: number;
    min?: number;
    max?: number;
  };
}

/**
 * Select property (single choice)
 */
export interface SelectProperty extends BaseProperty {
  type: PropertyType.SELECT;
  config: {
    options: Array<{
      id: string;
      value: string;
      color?: string;
    }>;
  };
}

/**
 * Multi-select property (multiple choices)
 */
export interface MultiSelectProperty extends BaseProperty {
  type: PropertyType.MULTI_SELECT;
  config: {
    options: Array<{
      id: string;
      value: string;
      color?: string;
    }>;
  };
}

/**
 * Date property
 */
export interface DateProperty extends BaseProperty {
  type: PropertyType.DATE;
  config?: {
    includeTime?: boolean;
    format?: string;
  };
}

/**
 * Checkbox property
 */
export interface CheckboxProperty extends BaseProperty {
  type: PropertyType.CHECKBOX;
  config?: {
    defaultValue?: boolean;
  };
}

/**
 * Relation property (links to another database)
 */
export interface RelationProperty extends BaseProperty {
  type: PropertyType.RELATION;
  config: {
    /** Target database ID */
    databaseId: string;
    
    /** Whether this is a two-way relation */
    twoWay?: boolean;
    
    /** Property ID in target database for two-way relation */
    reversePropertyId?: string;
  };
}

/**
 * Rollup property (aggregates data from relations)
 */
export interface RollupProperty extends BaseProperty {
  type: PropertyType.ROLLUP;
  config: {
    /** Relation property to follow */
    relationPropertyId: string;
    
    /** Property in related database to aggregate */
    targetPropertyId: string;
    
    /** Aggregation function */
    aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'unique' | 'showAll';
  };
}

/**
 * Formula property (computed from other properties)
 */
export interface FormulaProperty extends BaseProperty {
  type: PropertyType.FORMULA;
  config: {
    /** Formula expression */
    formula: string;
    
    /** Return type of the formula */
    returnType: 'text' | 'number' | 'boolean' | 'date';
  };
}

/**
 * Union type of all property types
 */
export type Property =
  | TextProperty
  | NumberProperty
  | SelectProperty
  | MultiSelectProperty
  | DateProperty
  | CheckboxProperty
  | RelationProperty
  | RollupProperty
  | FormulaProperty;

// ===== Property Value Types =====

/**
 * Property value types
 */
export type PropertyValue =
  | string                          // text
  | number                          // number
  | boolean                         // checkbox
  | string                          // date (ISO string)
  | string                          // select (option ID)
  | string[]                        // multi_select (option IDs)
  | string[]                        // relation (row IDs)
  | null                            // empty value
  | undefined;                      // unset value

// ===== Database Schema =====

/**
 * Database schema definition
 * Defines properties and their configurations
 */
export interface DatabaseSchema {
  /** Database unique identifier */
  id: string;
  
  /** Database name */
  name: string;
  
  /** Database description */
  description?: string;
  
  /** Database icon */
  icon?: string;
  
  /** List of properties (columns) */
  properties: Property[];
  
  /** Default view ID */
  defaultViewId?: string;
  
  /** Created timestamp */
  createdAt: string;
  
  /** Updated timestamp */
  updatedAt: string;
}

// ===== View Types =====

/**
 * All supported view types
 */
export enum ViewType {
  TABLE = 'table',
  BOARD = 'board',
  CALENDAR = 'calendar',
  TIMELINE = 'timeline',
  GALLERY = 'gallery',
}

/**
 * Base view configuration
 */
export interface BaseView {
  /** View unique identifier */
  id: string;
  
  /** View name */
  name: string;
  
  /** View type */
  type: ViewType;
  
  /** Database this view belongs to */
  databaseId: string;
  
  /** Filter configuration */
  filter?: FilterGroup;
  
  /** Sort configuration */
  sort?: SortConfig[];
  
  /** Visible properties */
  visibleProperties?: string[];
  
  /** Hidden properties */
  hiddenProperties?: string[];
  
  /** Created timestamp */
  createdAt: string;
  
  /** Updated timestamp */
  updatedAt: string;
}

/**
 * Table view configuration
 */
export interface TableView extends BaseView {
  type: ViewType.TABLE;
  config?: {
    /** Property widths */
    propertyWidths?: Record<string, number>;
    
    /** Frozen columns */
    frozenColumns?: number;
    
    /** Row height */
    rowHeight?: 'compact' | 'normal' | 'tall';
  };
}

/**
 * Board (Kanban) view configuration
 */
export interface BoardView extends BaseView {
  type: ViewType.BOARD;
  config: {
    /** Property to group by (must be select, multi_select, or status) */
    groupByPropertyId: string;
    
    /** Hidden groups */
    hiddenGroups?: string[];
    
    /** Card properties to show */
    cardProperties?: string[];
    
    /** Card cover property */
    cardCoverPropertyId?: string;
  };
}

/**
 * Calendar view configuration
 */
export interface CalendarView extends BaseView {
  type: ViewType.CALENDAR;
  config: {
    /** Date property for calendar positioning */
    datePropertyId: string;
    
    /** Layout mode */
    layout?: 'month' | 'week' | 'day';
    
    /** Show weekends */
    showWeekends?: boolean;
  };
}

/**
 * Timeline view configuration
 */
export interface TimelineView extends BaseView {
  type: ViewType.TIMELINE;
  config: {
    /** Start date property */
    startDatePropertyId: string;
    
    /** End date property */
    endDatePropertyId: string;
    
    /** Zoom level */
    zoom?: 'day' | 'week' | 'month' | 'quarter' | 'year';
    
    /** Show today marker */
    showToday?: boolean;
  };
}

/**
 * Gallery view configuration
 */
export interface GalleryView extends BaseView {
  type: ViewType.GALLERY;
  config: {
    /** Cover image property */
    coverPropertyId?: string;
    
    /** Card size */
    cardSize?: 'small' | 'medium' | 'large';
    
    /** Properties to preview */
    previewProperties?: string[];
  };
}

/**
 * Union type of all view types
 */
export type DatabaseView =
  | TableView
  | BoardView
  | CalendarView
  | TimelineView
  | GalleryView;

// ===== Query & Filter Types =====

/**
 * Filter operator types
 */
export enum FilterOperator {
  // Text operators
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
  
  // Number operators
  GREATER_THAN = 'greater_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN = 'less_than',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  
  // Date operators
  DATE_EQUALS = 'date_equals',
  DATE_BEFORE = 'date_before',
  DATE_AFTER = 'date_after',
  DATE_ON_OR_BEFORE = 'date_on_or_before',
  DATE_ON_OR_AFTER = 'date_on_or_after',
  
  // Checkbox operators
  IS_CHECKED = 'is_checked',
  IS_NOT_CHECKED = 'is_not_checked',
  
  // Select operators
  SELECT_EQUALS = 'select_equals',
  SELECT_NOT_EQUALS = 'select_not_equals',
  SELECT_IS_EMPTY = 'select_is_empty',
  SELECT_IS_NOT_EMPTY = 'select_is_not_empty',
  
  // Multi-select operators
  MULTI_SELECT_CONTAINS = 'multi_select_contains',
  MULTI_SELECT_NOT_CONTAINS = 'multi_select_not_contains',
}

/**
 * Single filter condition
 */
export interface FilterCondition {
  /** Property to filter on */
  propertyId: string;
  
  /** Filter operator */
  operator: FilterOperator;
  
  /** Filter value (for operators that need a value) */
  value?: PropertyValue;
}

/**
 * Filter group (AND/OR)
 */
export interface FilterGroup {
  /** Logical operator */
  operator: 'AND' | 'OR';
  
  /** List of conditions or nested groups */
  conditions: Array<FilterCondition | FilterGroup>;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  /** Property to sort by */
  propertyId: string;
  
  /** Sort direction */
  direction: 'ASC' | 'DESC';
}

/**
 * Aggregation functions
 */
export enum AggregationType {
  COUNT = 'count',
  COUNT_VALUES = 'count_values',
  COUNT_UNIQUE = 'count_unique',
  COUNT_EMPTY = 'count_empty',
  COUNT_NOT_EMPTY = 'count_not_empty',
  PERCENT_EMPTY = 'percent_empty',
  PERCENT_NOT_EMPTY = 'percent_not_empty',
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  MEDIAN = 'median',
  RANGE = 'range',
}

/**
 * Aggregation configuration
 */
export interface AggregationConfig {
  /** Property to aggregate */
  propertyId: string;
  
  /** Aggregation type */
  type: AggregationType;
}

/**
 * Query options for database queries
 */
export interface DatabaseQueryOptions {
  /** Filter conditions */
  filter?: FilterGroup;
  
  /** Sort configuration */
  sort?: SortConfig[];
  
  /** Group by property */
  groupBy?: string;
  
  /** Aggregations to compute */
  aggregations?: AggregationConfig[];
  
  /** Pagination - limit */
  limit?: number;
  
  /** Pagination - offset */
  offset?: number;
  
  /** Include archived rows */
  includeArchived?: boolean;
}

/**
 * Query result
 */
export interface DatabaseQueryResult {
  /** Matching rows */
  rows: DatabaseRowBlockData[];
  
  /** Total count (before pagination) */
  totalCount: number;
  
  /** Aggregation results */
  aggregations?: Record<string, any>;
  
  /** Grouped results (if groupBy was specified) */
  groups?: Array<{
    key: string;
    value: PropertyValue;
    rows: DatabaseRowBlockData[];
    count: number;
  }>;
}

// ===== Permissions =====

/**
 * Database-level permissions
 */
export interface DatabasePermissions {
  /** Can view database */
  canView: boolean;
  
  /** Can edit database schema */
  canEditSchema: boolean;
  
  /** Can create rows */
  canCreateRows: boolean;
  
  /** Can edit rows */
  canEditRows: boolean;
  
  /** Can delete rows */
  canDeleteRows: boolean;
  
  /** Can create views */
  canCreateViews: boolean;
  
  /** Can edit views */
  canEditViews: boolean;
  
  /** Can delete views */
  canDeleteViews: boolean;
  
  /** Can share database */
  canShare: boolean;
}

/**
 * Row-level permissions
 */
export interface RowPermissions {
  /** Can view row */
  canView: boolean;
  
  /** Can edit row */
  canEdit: boolean;
  
  /** Can delete row */
  canDelete: boolean;
  
  /** Can move row */
  canMove: boolean;
}

/**
 * User role in database
 */
export enum DatabaseRole {
  OWNER = 'owner',
  EDITOR = 'editor',
  COMMENTER = 'commenter',
  VIEWER = 'viewer',
}

/**
 * Role-based permissions mapping
 */
export const DATABASE_ROLE_PERMISSIONS: Record<DatabaseRole, DatabasePermissions> = {
  [DatabaseRole.OWNER]: {
    canView: true,
    canEditSchema: true,
    canCreateRows: true,
    canEditRows: true,
    canDeleteRows: true,
    canCreateViews: true,
    canEditViews: true,
    canDeleteViews: true,
    canShare: true,
  },
  [DatabaseRole.EDITOR]: {
    canView: true,
    canEditSchema: false,
    canCreateRows: true,
    canEditRows: true,
    canDeleteRows: true,
    canCreateViews: true,
    canEditViews: true,
    canDeleteViews: false,
    canShare: false,
  },
  [DatabaseRole.COMMENTER]: {
    canView: true,
    canEditSchema: false,
    canCreateRows: false,
    canEditRows: false,
    canDeleteRows: false,
    canCreateViews: false,
    canEditViews: false,
    canDeleteViews: false,
    canShare: false,
  },
  [DatabaseRole.VIEWER]: {
    canView: true,
    canEditSchema: false,
    canCreateRows: false,
    canEditRows: false,
    canDeleteRows: false,
    canCreateViews: false,
    canEditViews: false,
    canDeleteViews: false,
    canShare: false,
  },
};
