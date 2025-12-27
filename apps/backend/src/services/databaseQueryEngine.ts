/**
 * @fileoverview Database Query Engine
 * 
 * Provides a generic query engine for database operations including:
 * - Filtering (compound AND/OR conditions)
 * - Sorting (multi-property)
 * - Grouping
 * - Aggregations
 * - Pagination
 * 
 * This engine is view-agnostic and can be used by any view type.
 */

import {
  PropertyValue,
  FilterGroup,
  FilterCondition,
  FilterOperator,
  SortConfig,
  AggregationConfig,
  AggregationType,
  DatabaseQueryOptions,
  DatabaseQueryResult,
  Property,
  PropertyType,
} from '../types/database';
import { DatabaseRowBlockData } from '../types/blocks';

/**
 * Database Query Engine
 */
export class DatabaseQueryEngine {
  /**
   * Execute a query against database rows
   */
  static query(
    rows: DatabaseRowBlockData[],
    properties: Property[],
    options: DatabaseQueryOptions = {}
  ): DatabaseQueryResult {
    let filteredRows = [...rows];
    
    // Filter by archived status
    if (!options.includeArchived) {
      filteredRows = filteredRows.filter(row => !row.archived);
    }
    
    // Apply filters
    if (options.filter) {
      filteredRows = this.applyFilter(filteredRows, options.filter);
    }
    
    // Apply sorting
    if (options.sort && options.sort.length > 0) {
      filteredRows = this.applySort(filteredRows, options.sort, properties);
    }
    
    // Store total count before pagination
    const totalCount = filteredRows.length;
    
    // Compute aggregations
    const aggregations = options.aggregations
      ? this.computeAggregations(filteredRows, options.aggregations, properties)
      : undefined;
    
    // Group results if requested
    let groups;
    if (options.groupBy) {
      groups = this.groupRows(filteredRows, options.groupBy, properties);
    }
    
    // Apply pagination
    if (options.offset !== undefined) {
      filteredRows = filteredRows.slice(options.offset);
    }
    if (options.limit !== undefined) {
      filteredRows = filteredRows.slice(0, options.limit);
    }
    
    return {
      rows: filteredRows,
      totalCount,
      aggregations,
      groups,
    };
  }
  
  /**
   * Apply filter to rows
   */
  private static applyFilter(
    rows: DatabaseRowBlockData[],
    filter: FilterGroup
  ): DatabaseRowBlockData[] {
    return rows.filter(row => this.evaluateFilterGroup(row, filter));
  }
  
  /**
   * Evaluate a filter group against a row
   */
  private static evaluateFilterGroup(
    row: DatabaseRowBlockData,
    group: FilterGroup
  ): boolean {
    const results = group.conditions.map(condition => {
      if ('operator' in condition && condition.operator === 'AND' || condition.operator === 'OR') {
        // Nested filter group
        return this.evaluateFilterGroup(row, condition as FilterGroup);
      } else {
        // Filter condition
        return this.evaluateFilterCondition(row, condition as FilterCondition);
      }
    });
    
    if (group.operator === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }
  
  /**
   * Evaluate a single filter condition against a row
   */
  private static evaluateFilterCondition(
    row: DatabaseRowBlockData,
    condition: FilterCondition
  ): boolean {
    const values = JSON.parse(row.values) as Record<string, PropertyValue>;
    const value = values[condition.propertyId];
    const filterValue = condition.value;
    
    switch (condition.operator) {
      // Text operators
      case FilterOperator.EQUALS:
        return value === filterValue;
      case FilterOperator.NOT_EQUALS:
        return value !== filterValue;
      case FilterOperator.CONTAINS:
        return typeof value === 'string' && typeof filterValue === 'string' &&
               value.toLowerCase().includes(filterValue.toLowerCase());
      case FilterOperator.NOT_CONTAINS:
        return typeof value === 'string' && typeof filterValue === 'string' &&
               !value.toLowerCase().includes(filterValue.toLowerCase());
      case FilterOperator.STARTS_WITH:
        return typeof value === 'string' && typeof filterValue === 'string' &&
               value.toLowerCase().startsWith(filterValue.toLowerCase());
      case FilterOperator.ENDS_WITH:
        return typeof value === 'string' && typeof filterValue === 'string' &&
               value.toLowerCase().endsWith(filterValue.toLowerCase());
      case FilterOperator.IS_EMPTY:
        return value === null || value === undefined || value === '';
      case FilterOperator.IS_NOT_EMPTY:
        return value !== null && value !== undefined && value !== '';
      
      // Number operators
      case FilterOperator.GREATER_THAN:
        return typeof value === 'number' && typeof filterValue === 'number' &&
               value > filterValue;
      case FilterOperator.GREATER_THAN_OR_EQUAL:
        return typeof value === 'number' && typeof filterValue === 'number' &&
               value >= filterValue;
      case FilterOperator.LESS_THAN:
        return typeof value === 'number' && typeof filterValue === 'number' &&
               value < filterValue;
      case FilterOperator.LESS_THAN_OR_EQUAL:
        return typeof value === 'number' && typeof filterValue === 'number' &&
               value <= filterValue;
      
      // Date operators
      case FilterOperator.DATE_EQUALS:
        return this.compareDates(value as string, filterValue as string) === 0;
      case FilterOperator.DATE_BEFORE:
        return this.compareDates(value as string, filterValue as string) < 0;
      case FilterOperator.DATE_AFTER:
        return this.compareDates(value as string, filterValue as string) > 0;
      case FilterOperator.DATE_ON_OR_BEFORE:
        return this.compareDates(value as string, filterValue as string) <= 0;
      case FilterOperator.DATE_ON_OR_AFTER:
        return this.compareDates(value as string, filterValue as string) >= 0;
      
      // Checkbox operators
      case FilterOperator.IS_CHECKED:
        return value === true;
      case FilterOperator.IS_NOT_CHECKED:
        return value !== true;
      
      // Select operators
      case FilterOperator.SELECT_EQUALS:
        return value === filterValue;
      case FilterOperator.SELECT_NOT_EQUALS:
        return value !== filterValue;
      case FilterOperator.SELECT_IS_EMPTY:
        return value === null || value === undefined;
      case FilterOperator.SELECT_IS_NOT_EMPTY:
        return value !== null && value !== undefined;
      
      // Multi-select operators
      case FilterOperator.MULTI_SELECT_CONTAINS:
        return Array.isArray(value) && value.includes(filterValue as string);
      case FilterOperator.MULTI_SELECT_NOT_CONTAINS:
        return !Array.isArray(value) || !value.includes(filterValue as string);
      
      default:
        return false;
    }
  }
  
  /**
   * Compare two date strings
   */
  private static compareDates(date1: string, date2: string): number {
    const d1 = new Date(date1).getTime();
    const d2 = new Date(date2).getTime();
    if (isNaN(d1) || isNaN(d2)) return 0;
    return d1 - d2;
  }
  
  /**
   * Apply sorting to rows
   */
  private static applySort(
    rows: DatabaseRowBlockData[],
    sortConfigs: SortConfig[],
    properties: Property[]
  ): DatabaseRowBlockData[] {
    return [...rows].sort((a, b) => {
      for (const sortConfig of sortConfigs) {
        const aValues = JSON.parse(a.values) as Record<string, PropertyValue>;
        const bValues = JSON.parse(b.values) as Record<string, PropertyValue>;
        const aValue = aValues[sortConfig.propertyId];
        const bValue = bValues[sortConfig.propertyId];
        
        const property = properties.find(p => p.id === sortConfig.propertyId);
        const comparison = this.compareValues(aValue, bValue, property?.type);
        
        if (comparison !== 0) {
          return sortConfig.direction === 'ASC' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }
  
  /**
   * Compare two property values
   */
  private static compareValues(
    a: PropertyValue,
    b: PropertyValue,
    propertyType?: PropertyType
  ): number {
    // Handle null/undefined
    if (a === null || a === undefined) return b === null || b === undefined ? 0 : -1;
    if (b === null || b === undefined) return 1;
    
    // Handle different types
    if (propertyType === PropertyType.NUMBER) {
      return (a as number) - (b as number);
    } else if (propertyType === PropertyType.DATE) {
      return this.compareDates(a as string, b as string);
    } else if (propertyType === PropertyType.CHECKBOX) {
      return (a === b) ? 0 : (a ? 1 : -1);
    } else {
      // String comparison
      const aStr = String(a).toLowerCase();
      const bStr = String(b).toLowerCase();
      return aStr.localeCompare(bStr);
    }
  }
  
  /**
   * Group rows by a property
   */
  private static groupRows(
    rows: DatabaseRowBlockData[],
    propertyId: string,
    properties: Property[]
  ): Array<{
    key: string;
    value: PropertyValue;
    rows: DatabaseRowBlockData[];
    count: number;
  }> {
    const groups = new Map<string, {
      value: PropertyValue;
      rows: DatabaseRowBlockData[];
    }>();
    
    for (const row of rows) {
      const values = JSON.parse(row.values) as Record<string, PropertyValue>;
      const value = values[propertyId];
      const key = String(value ?? '__empty__');
      
      if (!groups.has(key)) {
        groups.set(key, { value, rows: [] });
      }
      groups.get(key)!.rows.push(row);
    }
    
    return Array.from(groups.entries()).map(([key, data]) => ({
      key,
      value: data.value,
      rows: data.rows,
      count: data.rows.length,
    }));
  }
  
  /**
   * Compute aggregations
   */
  private static computeAggregations(
    rows: DatabaseRowBlockData[],
    aggregations: AggregationConfig[],
    properties: Property[]
  ): Record<string, any> {
    const results: Record<string, any> = {};
    
    for (const agg of aggregations) {
      const key = `${agg.propertyId}_${agg.type}`;
      results[key] = this.computeAggregation(rows, agg, properties);
    }
    
    return results;
  }
  
  /**
   * Compute a single aggregation
   */
  private static computeAggregation(
    rows: DatabaseRowBlockData[],
    agg: AggregationConfig,
    properties: Property[]
  ): any {
    const values = rows.map(row => {
      const rowValues = JSON.parse(row.values) as Record<string, PropertyValue>;
      return rowValues[agg.propertyId];
    });
    
    switch (agg.type) {
      case AggregationType.COUNT:
        return rows.length;
      
      case AggregationType.COUNT_VALUES:
        return values.filter(v => v !== null && v !== undefined).length;
      
      case AggregationType.COUNT_UNIQUE:
        return new Set(values.filter(v => v !== null && v !== undefined)).size;
      
      case AggregationType.COUNT_EMPTY:
        return values.filter(v => v === null || v === undefined || v === '').length;
      
      case AggregationType.COUNT_NOT_EMPTY:
        return values.filter(v => v !== null && v !== undefined && v !== '').length;
      
      case AggregationType.PERCENT_EMPTY:
        const emptyCount = values.filter(v => v === null || v === undefined || v === '').length;
        return rows.length > 0 ? (emptyCount / rows.length) * 100 : 0;
      
      case AggregationType.PERCENT_NOT_EMPTY:
        const notEmptyCount = values.filter(v => v !== null && v !== undefined && v !== '').length;
        return rows.length > 0 ? (notEmptyCount / rows.length) * 100 : 0;
      
      case AggregationType.SUM:
        return values
          .filter(v => typeof v === 'number')
          .reduce((sum, v) => sum + (v as number), 0);
      
      case AggregationType.AVG:
        const numericValues = values.filter(v => typeof v === 'number') as number[];
        return numericValues.length > 0
          ? numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length
          : 0;
      
      case AggregationType.MIN:
        const minValues = values.filter(v => typeof v === 'number') as number[];
        return minValues.length > 0 ? Math.min(...minValues) : null;
      
      case AggregationType.MAX:
        const maxValues = values.filter(v => typeof v === 'number') as number[];
        return maxValues.length > 0 ? Math.max(...maxValues) : null;
      
      case AggregationType.MEDIAN:
        const sortedValues = (values.filter(v => typeof v === 'number') as number[]).sort((a, b) => a - b);
        if (sortedValues.length === 0) return null;
        const mid = Math.floor(sortedValues.length / 2);
        return sortedValues.length % 2 === 0
          ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
          : sortedValues[mid];
      
      case AggregationType.RANGE:
        const rangeValues = values.filter(v => typeof v === 'number') as number[];
        if (rangeValues.length === 0) return null;
        return Math.max(...rangeValues) - Math.min(...rangeValues);
      
      default:
        return null;
    }
  }
}
