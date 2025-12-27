/**
 * @fileoverview Database Query Engine Tests
 * 
 * Tests for the database query engine including filtering, sorting,
 * grouping, and aggregations.
 */

import { DatabaseQueryEngine } from '../src/services/databaseQueryEngine';
import { DatabaseRowBlockData } from '../src/types/blocks';
import {
  Property,
  PropertyType,
  FilterOperator,
  AggregationType,
} from '../src/types/database';

describe('DatabaseQueryEngine', () => {
  // Sample properties
  const properties: Property[] = [
    {
      id: 'title',
      name: 'Title',
      type: PropertyType.TEXT,
    },
    {
      id: 'status',
      name: 'Status',
      type: PropertyType.SELECT,
      config: {
        options: [
          { id: 'todo', value: 'To Do', color: '#gray' },
          { id: 'inprogress', value: 'In Progress', color: '#blue' },
          { id: 'done', value: 'Done', color: '#green' },
        ],
      },
    },
    {
      id: 'priority',
      name: 'Priority',
      type: PropertyType.NUMBER,
    },
    {
      id: 'duedate',
      name: 'Due Date',
      type: PropertyType.DATE,
    },
    {
      id: 'completed',
      name: 'Completed',
      type: PropertyType.CHECKBOX,
    },
  ];
  
  // Sample rows
  const rows: DatabaseRowBlockData[] = [
    {
      databaseId: 'db1',
      values: JSON.stringify({
        title: 'Task 1',
        status: 'todo',
        priority: 3,
        duedate: '2025-01-15',
        completed: false,
      }),
    },
    {
      databaseId: 'db1',
      values: JSON.stringify({
        title: 'Task 2',
        status: 'inprogress',
        priority: 1,
        duedate: '2025-01-10',
        completed: false,
      }),
    },
    {
      databaseId: 'db1',
      values: JSON.stringify({
        title: 'Task 3',
        status: 'done',
        priority: 2,
        duedate: '2025-01-05',
        completed: true,
      }),
    },
    {
      databaseId: 'db1',
      values: JSON.stringify({
        title: 'Task 4',
        status: 'inprogress',
        priority: 2,
        duedate: '2025-01-20',
        completed: false,
      }),
    },
  ];
  
  describe('Filtering', () => {
    test('should filter by text equals', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        filter: {
          operator: 'AND',
          conditions: [
            {
              propertyId: 'title',
              operator: FilterOperator.EQUALS,
              value: 'Task 1',
            },
          ],
        },
      });
      
      expect(result.totalCount).toBe(1);
      const values = JSON.parse(result.rows[0].values);
      expect(values.title).toBe('Task 1');
    });
    
    test('should filter by text contains', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        filter: {
          operator: 'AND',
          conditions: [
            {
              propertyId: 'title',
              operator: FilterOperator.CONTAINS,
              value: 'Task',
            },
          ],
        },
      });
      
      expect(result.totalCount).toBe(4);
    });
    
    test('should filter by select equals', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        filter: {
          operator: 'AND',
          conditions: [
            {
              propertyId: 'status',
              operator: FilterOperator.SELECT_EQUALS,
              value: 'inprogress',
            },
          ],
        },
      });
      
      expect(result.totalCount).toBe(2);
    });
    
    test('should filter by number greater than', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        filter: {
          operator: 'AND',
          conditions: [
            {
              propertyId: 'priority',
              operator: FilterOperator.GREATER_THAN,
              value: 1,
            },
          ],
        },
      });
      
      expect(result.totalCount).toBe(3);
    });
    
    test('should filter by checkbox is checked', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        filter: {
          operator: 'AND',
          conditions: [
            {
              propertyId: 'completed',
              operator: FilterOperator.IS_CHECKED,
            },
          ],
        },
      });
      
      expect(result.totalCount).toBe(1);
      const values = JSON.parse(result.rows[0].values);
      expect(values.completed).toBe(true);
    });
    
    test('should filter with compound AND conditions', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        filter: {
          operator: 'AND',
          conditions: [
            {
              propertyId: 'status',
              operator: FilterOperator.SELECT_EQUALS,
              value: 'inprogress',
            },
            {
              propertyId: 'priority',
              operator: FilterOperator.GREATER_THAN,
              value: 1,
            },
          ],
        },
      });
      
      expect(result.totalCount).toBe(1);
    });
    
    test('should filter with OR conditions', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        filter: {
          operator: 'OR',
          conditions: [
            {
              propertyId: 'status',
              operator: FilterOperator.SELECT_EQUALS,
              value: 'todo',
            },
            {
              propertyId: 'status',
              operator: FilterOperator.SELECT_EQUALS,
              value: 'done',
            },
          ],
        },
      });
      
      expect(result.totalCount).toBe(2);
    });
  });
  
  describe('Sorting', () => {
    test('should sort by number ascending', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        sort: [
          { propertyId: 'priority', direction: 'ASC' },
        ],
      });
      
      expect(result.totalCount).toBe(4);
      const priorities = result.rows.map(r => JSON.parse(r.values).priority);
      expect(priorities).toEqual([1, 2, 2, 3]);
    });
    
    test('should sort by number descending', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        sort: [
          { propertyId: 'priority', direction: 'DESC' },
        ],
      });
      
      expect(result.totalCount).toBe(4);
      const priorities = result.rows.map(r => JSON.parse(r.values).priority);
      expect(priorities).toEqual([3, 2, 2, 1]);
    });
    
    test('should sort by date', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        sort: [
          { propertyId: 'duedate', direction: 'ASC' },
        ],
      });
      
      expect(result.totalCount).toBe(4);
      const dates = result.rows.map(r => JSON.parse(r.values).duedate);
      expect(dates).toEqual(['2025-01-05', '2025-01-10', '2025-01-15', '2025-01-20']);
    });
    
    test('should sort by multiple properties', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        sort: [
          { propertyId: 'priority', direction: 'ASC' },
          { propertyId: 'duedate', direction: 'ASC' },
        ],
      });
      
      expect(result.totalCount).toBe(4);
      // Should sort by priority first, then by date for ties
      const values = result.rows.map(r => JSON.parse(r.values));
      expect(values[0].priority).toBe(1);
      expect(values[1].priority).toBe(2);
      expect(values[1].duedate).toBe('2025-01-05'); // Earlier date first
      expect(values[2].priority).toBe(2);
      expect(values[2].duedate).toBe('2025-01-20');
    });
  });
  
  describe('Grouping', () => {
    test('should group by status', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        groupBy: 'status',
      });
      
      expect(result.groups).toBeDefined();
      expect(result.groups?.length).toBe(3);
      
      const todoGroup = result.groups?.find(g => g.value === 'todo');
      expect(todoGroup?.count).toBe(1);
      
      const inProgressGroup = result.groups?.find(g => g.value === 'inprogress');
      expect(inProgressGroup?.count).toBe(2);
      
      const doneGroup = result.groups?.find(g => g.value === 'done');
      expect(doneGroup?.count).toBe(1);
    });
  });
  
  describe('Aggregations', () => {
    test('should count all rows', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        aggregations: [
          { propertyId: 'status', type: AggregationType.COUNT },
        ],
      });
      
      expect(result.aggregations).toBeDefined();
      expect(result.aggregations?.['status_count']).toBe(4);
    });
    
    test('should sum numbers', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        aggregations: [
          { propertyId: 'priority', type: AggregationType.SUM },
        ],
      });
      
      expect(result.aggregations?.['priority_sum']).toBe(8); // 3+1+2+2
    });
    
    test('should calculate average', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        aggregations: [
          { propertyId: 'priority', type: AggregationType.AVG },
        ],
      });
      
      expect(result.aggregations?.['priority_avg']).toBe(2); // (3+1+2+2)/4
    });
    
    test('should find min and max', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        aggregations: [
          { propertyId: 'priority', type: AggregationType.MIN },
          { propertyId: 'priority', type: AggregationType.MAX },
        ],
      });
      
      expect(result.aggregations?.['priority_min']).toBe(1);
      expect(result.aggregations?.['priority_max']).toBe(3);
    });
    
    test('should count empty and non-empty', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        aggregations: [
          { propertyId: 'title', type: AggregationType.COUNT_NOT_EMPTY },
          { propertyId: 'title', type: AggregationType.COUNT_EMPTY },
        ],
      });
      
      expect(result.aggregations?.['title_count_not_empty']).toBe(4);
      expect(result.aggregations?.['title_count_empty']).toBe(0);
    });
  });
  
  describe('Pagination', () => {
    test('should limit results', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        limit: 2,
      });
      
      expect(result.rows.length).toBe(2);
      expect(result.totalCount).toBe(4);
    });
    
    test('should offset results', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        offset: 2,
      });
      
      expect(result.rows.length).toBe(2);
      expect(result.totalCount).toBe(4);
    });
    
    test('should combine limit and offset', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        limit: 1,
        offset: 1,
      });
      
      expect(result.rows.length).toBe(1);
      expect(result.totalCount).toBe(4);
      const values = JSON.parse(result.rows[0].values);
      expect(values.title).toBe('Task 2');
    });
  });
  
  describe('Complex queries', () => {
    test('should combine filter, sort, and pagination', () => {
      const result = DatabaseQueryEngine.query(rows, properties, {
        filter: {
          operator: 'AND',
          conditions: [
            {
              propertyId: 'completed',
              operator: FilterOperator.IS_NOT_CHECKED,
            },
          ],
        },
        sort: [
          { propertyId: 'priority', direction: 'DESC' },
        ],
        limit: 2,
      });
      
      expect(result.totalCount).toBe(3); // 3 not completed
      expect(result.rows.length).toBe(2); // Limited to 2
      const values = result.rows.map(r => JSON.parse(r.values));
      expect(values[0].priority).toBeGreaterThanOrEqual(values[1].priority);
    });
  });
});
